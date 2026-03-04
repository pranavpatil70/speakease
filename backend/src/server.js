/**
 * SpeakEase Backend Server
 * Handles WebSocket connections for OpenAI Realtime Speech API
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({ service: 'SpeakEase API', status: 'running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Analysis endpoint for interview/daily-challenge feedback
app.post('/api/analyze-interview', (req, res) => {
  const { frameData, transcript, duration } = req.body;
  const analysis = analyzeSession(frameData, transcript || '', duration || 0);
  res.json(analysis);
});

// Generate interview questions via OpenRouter (cheap LLM, avoids burning OpenAI Realtime credits)
app.post('/api/generate-questions', async (req, res) => {
  const { field, experience, difficulty, count } = req.body;

  if (!field || !experience || !difficulty || !count) {
    return res.status(400).json({ error: 'Missing required fields: field, experience, difficulty, count' });
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured in backend/.env' });
  }

  const userPrompt = `Generate exactly ${count} interview questions for a ${experience}-level candidate applying for a ${field} role. Difficulty level: ${difficulty}.

Return ONLY a valid JSON array of question strings. No markdown, no code blocks, no explanation. Just the raw JSON array.
Example format: ["Question one?","Question two?","Question three?"]`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://speakease.app',
        'X-Title': 'SpeakEase'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.7,
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', errText);
      return res.status(502).json({ error: 'Question generation failed. Check your OpenRouter API key.' });
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content.trim();

    // Strip markdown code fences if LLM wraps output in ```json ... ```
    const jsonString = rawContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const questions = JSON.parse(jsonString);

    if (!Array.isArray(questions)) {
      throw new Error('Response is not a JSON array');
    }

    res.json({ questions: questions.slice(0, count) });
  } catch (err) {
    console.error('Failed to generate questions:', err);
    res.status(500).json({ error: 'Failed to parse questions from AI response' });
  }
});

/**
 * Analyze a session honestly using real transcript and frame data.
 * Only scores metrics we can actually compute — no random padding.
 */
function analyzeSession(frameData, transcript, durationMs) {
  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const hasTranscript = wordCount > 5;

  // ── No speech detected ──────────────────────────────────────────────────────
  if (!hasTranscript) {
    return {
      scores: {},
      confidenceScore: 0,
      improvementTips: [
        'No speech was detected in this session. Make sure your microphone is unmuted and speak clearly during the session.',
      ],
      summary: 'No speech was detected. Unmute your mic and try again — the AI listens automatically.',
      noSpeechDetected: true,
    };
  }

  const scores = {};

  // ── Filler word analysis ────────────────────────────────────────────────────
  // Counts common spoken fillers in the transcript
  const fillerPattern = /\b(um+|uh+|like|you know|basically|literally|right\b|so\b|actually|kind of|sort of|i mean|you see)\b/gi;
  const fillerMatches = transcript.match(fillerPattern) || [];
  const fillerCount = fillerMatches.length;
  const fillerRate = fillerCount / wordCount; // fillers per word

  // Score: 0% fillers → 5.0, ≥12% fillers → 2.0 (linear interpolation)
  const fillerScore = clamp(+(5.0 - fillerRate * 25).toFixed(1), 2.0, 5.0);
  scores.fillerWords = fillerScore;

  // ── Speaking pace (words per minute) ───────────────────────────────────────
  const durationMinutes = durationMs / 60000;
  const wpm = durationMinutes > 0 ? wordCount / durationMinutes : 0;

  // Ideal interview pace: 120-160 WPM. Penalty for being far outside that range.
  let paceScore;
  if (wpm >= 120 && wpm <= 160) paceScore = 5.0;
  else if ((wpm >= 100 && wpm < 120) || (wpm > 160 && wpm <= 185)) paceScore = 4.0;
  else if ((wpm >= 80 && wpm < 100) || (wpm > 185 && wpm <= 210)) paceScore = 3.0;
  else paceScore = 2.0;
  scores.speakingPace = paceScore;

  // ── Camera-based scores (interview mode only) ───────────────────────────────
  const frameCount = frameData?.frameCount || 0;
  if (frameCount > 10) {
    const faceDetectedRatio = frameData.faceDetectedRatio ?? 0;

    // Eye contact proxy: ratio of frames where face was detected, centered in frame
    // 100% face detected → 5.0, 0% → 2.0
    const eyeScore = clamp(+(2 + faceDetectedRatio * 3).toFixed(1), 2.0, 5.0);
    scores.eyeContact = eyeScore;

    // Head stability proxy: how centered the face X position is
    // avgFaceX of 0.5 = perfectly centered → 5.0; deviation → lower score
    const avgFaceX = frameData.averageFaceX ?? 0.5;
    const deviation = Math.abs(avgFaceX - 0.5); // 0 = centered, 0.5 = edge
    const headScore = clamp(+(5 - deviation * 8).toFixed(1), 2.0, 5.0);
    scores.headStability = headScore;
  }

  // ── Overall confidence score ────────────────────────────────────────────────
  const scoreValues = Object.values(scores);
  const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  const confidenceScore = clamp(+(avgScore * 2).toFixed(1), 2.0, 10.0);

  // ── Honest improvement tips ─────────────────────────────────────────────────
  const tips = [];

  if (fillerScore < 3.5) {
    const pct = Math.round(fillerRate * 100);
    tips.push(`You used ${fillerCount} filler word${fillerCount === 1 ? '' : 's'} (${pct}% of words spoken). Practice pausing silently instead of saying "um" or "uh" — silence sounds more confident than a filler.`);
  }

  if (paceScore < 3.5) {
    if (wpm > 0 && wpm < 100) {
      tips.push(`Your speaking pace was slow (~${Math.round(wpm)} WPM). Aim for 120-160 words per minute — it projects clarity and confidence without sounding rushed.`);
    } else if (wpm > 185) {
      tips.push(`Your speaking pace was fast (~${Math.round(wpm)} WPM). Slow down to 120-160 WPM so interviewers can follow and absorb your answers.`);
    }
  }

  if (scores.eyeContact !== undefined && scores.eyeContact < 3.5) {
    tips.push('Keep your face visible and look toward the camera more often — it signals engagement and confidence to the interviewer.');
  }

  if (scores.headStability !== undefined && scores.headStability < 3.5) {
    tips.push('Try to stay centered in the frame. Excessive movement or being off-center can be distracting in a video interview.');
  }

  if (tips.length === 0) {
    // All metrics are solid — give a constructive tip on content
    if (wordCount < 60) {
      tips.push('Your delivery was clean, but your answers were brief. In interviews, aim for 1-2 minute responses with a clear structure: Situation → Action → Result.');
    } else {
      tips.push('Solid delivery! To stand out further, make sure each answer ends with a concrete result or takeaway that shows your impact.');
    }
  }

  return {
    scores,
    confidenceScore,
    improvementTips: tips.slice(0, 3),
    summary: generateSummary(confidenceScore, wordCount),
  };
}

function generateSummary(score, wordCount) {
  if (wordCount < 30) {
    return 'Your answers were very brief. Try to elaborate more — interviewers want to understand how you think and what you did.';
  }
  if (score >= 8.5) {
    return 'Strong performance. Your delivery was clear, well-paced, and minimal on filler words.';
  } else if (score >= 6.5) {
    return 'Good session. A few small areas to polish — check the tips below.';
  } else if (score >= 4.5) {
    return 'You\'re building the habit. Focus on the areas flagged below and you\'ll improve quickly.';
  } else {
    return 'Keep practicing — each session sharpens your delivery. Focus on one tip at a time.';
  }
}

// System prompts for different modes
const SYSTEM_PROMPTS = {
  casual: `You are a friendly English conversation partner for college students. 
Your goal is to help them practice speaking English naturally and build confidence.
- Be warm, encouraging, and patient
- Keep conversations light and engaging (topics: hobbies, movies, food, travel, daily life)
- Don't correct grammar harshly - only gently rephrase if needed
- If they speak Hindi or Marathi, respond in simple English and encourage them to try in English
- Keep responses short and conversational (1-3 sentences)
- Ask follow-up questions to keep the conversation flowing
- Celebrate their efforts and progress`,

  office: `You are a professional English coach helping college students prepare for workplace communication.
Your goal is to help them sound professional and confident in office settings.
- Use professional but friendly tone
- Practice scenarios: emails, meetings, presentations, phone calls, client interactions
- Gently rephrase informal language into professional alternatives
- If they speak Hindi or Marathi, respond in simple professional English
- Keep responses concise and business-appropriate
- Provide examples of professional phrases
- Encourage formal vocabulary without being stiff`,

  interview: `You are a senior hiring manager conducting a real job interview. Your job is to evaluate the candidate objectively — not to coach, encourage, or validate them.

Behavioural rules:
- Ask one question at a time. Wait for the candidate's full response before reacting.
- Do NOT praise every answer with phrases like "Great!", "That's wonderful!", "Excellent point!" — only acknowledge when genuinely warranted.
- If the answer is vague, too short, or unconvincing, ask a pointed follow-up. Examples: "Can you be more specific?", "What was the actual outcome?", "How did you measure that?", "Walk me through the steps you took."
- If the candidate goes off-topic or rambles for too long, cut in and redirect: "Let's stay focused — what was the result?", "I'll stop you there. The question was about X."
- If the candidate goes silent or gives an "I don't know" response, briefly acknowledge it and move to the next question without dwelling on it: "Alright, let's move on."
- Never provide hints, tips, or coaching during the interview.
- Keep your own responses short and direct — you are asking questions, not giving feedback.
- If they speak Hindi or Marathi, say once: "Please respond in English for this interview."
- Cover: self-introduction, strengths and weaknesses (push for specifics), motivation for the role, a situational or behavioural scenario, and career goals.
- End the interview naturally when all topics are covered. Close with exactly: "Thank you for your time. The interview is now complete."`,

  daily: `You are a speaking coach running a focused 2-3 minute confidence drill. You will receive a specific scenario and system prompt — follow it exactly. Keep the session short: one focused question, one follow-up maximum, then brief honest feedback on delivery. End with exactly: "The challenge is complete." Do not praise every response with filler phrases. React like a real coach or interviewer. If they speak Hindi or Marathi, ask them to answer in English.`
};

// Handle WebSocket connections
wss.on('connection', (clientWs, req) => {
  console.log('Client connected');
  
  // Extract mode from query params
  const url = new URL(req.url, `http://${req.headers.host}`);
  const mode = url.searchParams.get('mode') || 'casual';

  console.log(`Mode: ${mode}`);

  // Build effective system prompt — for interview mode, inject pre-generated questions if provided
  let effectivePrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS['casual'];

  if (mode === 'interview') {
    const encodedSetup = url.searchParams.get('q');
    if (encodedSetup) {
      try {
        const setup = JSON.parse(Buffer.from(encodedSetup, 'base64').toString('utf-8'));
        const { field, experience, difficulty, questions } = setup;
        if (Array.isArray(questions) && questions.length > 0) {
          const questionList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
          effectivePrompt = `You are a senior hiring manager conducting a real job interview for a ${field || 'general'} role (${experience || 'entry'} level, ${difficulty || 'medium'} difficulty). Your job is to evaluate the candidate objectively — not to coach, encourage, or validate them.

You have ${questions.length} prepared questions listed below. Work through them in order.

Behavioural rules:
- Ask one question at a time from the list. Do not add extra questions beyond what is listed.
- Do NOT praise every answer with filler phrases like "Great!", "That's wonderful!", or "Excellent!" — only acknowledge when the answer genuinely warrants it.
- If the answer is vague, too short, or unconvincing, ask one focused follow-up before moving on. Examples: "Can you give a specific example?", "What was the actual outcome?", "How did you handle that exactly?"
- If the candidate rambles or goes off-topic, interrupt and redirect: "Let's stay focused — what was the result?", "I'll stop you there. The question was about X."
- If the candidate goes silent, says "I don't know", or gives a non-answer, briefly acknowledge and move to the next question: "Alright, let's move on."
- Never provide hints, tips, or coaching mid-interview.
- Keep your own responses short and direct.
- If they speak Hindi or Marathi, say once: "Please respond in English for this interview."
- After all ${questions.length} questions are covered (including any follow-ups), close the interview with exactly this phrase: "The interview is now complete."

Questions to ask (in order):
${questionList}`;
        }
      } catch (err) {
        console.error('Failed to decode interview setup from WS URL, using default prompt:', err.message);
      }
    }
  }

  if (mode === 'daily') {
    const encodedScenario = url.searchParams.get('q');
    if (encodedScenario) {
      try {
        const { systemPrompt } = JSON.parse(Buffer.from(encodedScenario, 'base64').toString('utf-8'));
        if (systemPrompt) {
          effectivePrompt = systemPrompt;
        }
      } catch (err) {
        console.error('Failed to decode daily scenario from WS URL, using default daily prompt:', err.message);
      }
    }
  }
  
  let openaiWs = null;
  let isConnected = false;
  let responseInProgress = false;
  let currentResponseId = null;
  
  // Helper to safely create a new response, canceling any in-progress one first
  const createResponse = (options = {}) => {
    if (openaiWs?.readyState !== WebSocket.OPEN) return;
    
    if (responseInProgress && currentResponseId) {
      console.log('Canceling in-progress response:', currentResponseId);
      openaiWs.send(JSON.stringify({
        type: 'response.cancel'
      }));
    }
    
    openaiWs.send(JSON.stringify({
      type: 'response.create',
      ...options
    }));
  };
  
  // Connect to OpenAI Realtime API
  const connectToOpenAI = () => {
    openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });
    
    openaiWs.on('open', () => {
      console.log('Connected to OpenAI Realtime API');
      isConnected = true;
      
      // Configure the session
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: effectivePrompt,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        }
      };
      
      openaiWs.send(JSON.stringify(sessionConfig));
      
      // Notify client that connection is ready
      clientWs.send(JSON.stringify({ type: 'connection.ready' }));
    });
    
    openaiWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Forward relevant events to client
        switch (message.type) {
          case 'session.created':
          case 'session.updated':
            clientWs.send(JSON.stringify({ 
              type: 'session.status', 
              status: 'ready' 
            }));
            break;
            
          case 'response.audio.delta':
            // Forward audio chunks to client
            clientWs.send(JSON.stringify({
              type: 'audio.delta',
              delta: message.delta
            }));
            break;
            
          case 'response.audio.done':
            clientWs.send(JSON.stringify({ type: 'audio.done' }));
            break;
            
          case 'response.audio_transcript.delta':
            clientWs.send(JSON.stringify({
              type: 'transcript.delta',
              delta: message.delta
            }));
            break;
            
          case 'response.audio_transcript.done':
            clientWs.send(JSON.stringify({
              type: 'transcript.done',
              transcript: message.transcript
            }));
            break;
            
          case 'input_audio_buffer.speech_started':
            console.log('User started speaking');
            clientWs.send(JSON.stringify({ type: 'user.speaking.started' }));
            break;
            
          case 'input_audio_buffer.speech_stopped':
            console.log('User stopped speaking');
            clientWs.send(JSON.stringify({ type: 'user.speaking.stopped' }));
            break;
            
          case 'input_audio_buffer.committed':
            console.log('Audio buffer committed');
            break;
            
          case 'conversation.item.input_audio_transcription.completed':
            // User's speech transcription
            console.log('User transcription:', message.transcript);
            clientWs.send(JSON.stringify({
              type: 'user.transcript',
              transcript: message.transcript
            }));
            break;
            
          case 'response.created':
            console.log('Response created:', message.response?.id);
            responseInProgress = true;
            currentResponseId = message.response?.id || null;
            break;
            
          case 'response.done':
            console.log('Response complete:', message.response?.id);
            responseInProgress = false;
            currentResponseId = null;
            clientWs.send(JSON.stringify({ type: 'response.complete' }));
            break;
            
          case 'response.cancelled':
            console.log('Response cancelled:', message.response_id);
            responseInProgress = false;
            currentResponseId = null;
            break;
            
          case 'error':
            console.error('OpenAI error:', message.error);
            clientWs.send(JSON.stringify({ 
              type: 'error', 
              message: message.error?.message || 'Unknown error' 
            }));
            break;
        }
      } catch (err) {
        console.error('Error parsing OpenAI message:', err);
      }
    });
    
    openaiWs.on('error', (error) => {
      console.error('OpenAI WebSocket error:', error);
      clientWs.send(JSON.stringify({ 
        type: 'error', 
        message: 'Connection error. Please try again.' 
      }));
    });
    
    openaiWs.on('close', () => {
      console.log('OpenAI connection closed');
      isConnected = false;
    });
  };
  
  // Connect to OpenAI when client connects
  if (OPENAI_API_KEY) {
    connectToOpenAI();
  } else {
    console.error('OPENAI_API_KEY not set');
    clientWs.send(JSON.stringify({ 
      type: 'error', 
      message: 'Server configuration error' 
    }));
  }
  
  // Handle messages from client
  clientWs.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (!isConnected || !openaiWs) {
        clientWs.send(JSON.stringify({ 
          type: 'error', 
          message: 'Not connected to AI service' 
        }));
        return;
      }
      
      switch (message.type) {
        case 'audio.append':
          // Forward audio data to OpenAI
          if (openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: message.audio
            }));
          }
          break;
          
        case 'audio.commit':
          // Commit audio buffer - server_vad will auto-create response
          console.log('Committing audio buffer');
          if (openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.commit'
            }));
            // Note: With server_vad enabled, response is auto-created after speech ends
            // Do NOT send explicit response.create here to avoid conflict
          }
          break;
          
        case 'conversation.start':
          // Start the conversation with a greeting
          createResponse({
            response: {
              modalities: ['text', 'audio'],
              instructions: 'Start with a brief, warm greeting appropriate for the mode.'
            }
          });
          break;
          
        case 'interview.end':
          // Signal end of interview
          createResponse({
            response: {
              modalities: ['text', 'audio'],
              instructions: 'Thank the candidate and conclude the interview professionally.'
            }
          });
          break;
      }
    } catch (err) {
      console.error('Error handling client message:', err);
    }
  });
  
  // Clean up on client disconnect
  clientWs.on('close', () => {
    console.log('Client disconnected');
    if (openaiWs) {
      openaiWs.close();
    }
  });
  
  clientWs.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    if (openaiWs) {
      openaiWs.close();
    }
  });
});

server.listen(PORT, () => {
  console.log(`SpeakEase server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
