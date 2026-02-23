# SpeakEase - English Speaking Practice App

A production-ready MVP web application for college students to practice English speaking in real-time using AI-powered speech-to-speech conversation.

## Features

### 🎯 Three Practice Modes

1. **Casual Talk Mode**
   - Friendly AI conversation partner
   - No pressure, no harsh corrections
   - Perfect for building confidence

2. **Office English Mode**
   - Professional communication practice
   - Workplace scenarios and phrases
   - Gentle rephrasing suggestions

3. **Interview Mode**
   - Simulated HR interviews
   - Camera-based body language analysis
   - Post-interview feedback with scores

### 🔊 Real-Time Speech AI
- Powered by OpenAI Realtime Speech API
- Low-latency speech-to-speech interaction
- Supports English, Hindi, and Marathi input
- AI always responds in simple English

### 📸 Interview Analysis (After Interview)
- Eye contact scoring
- Head stability assessment
- Posture evaluation
- Speaking pace analysis
- Filler word detection
- Confidence score (1-10)
- Actionable improvement tips

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket (ws)
- **Audio**: Web Audio API for recording and playback
- **Video**: WebRTC for camera access
- **AI**: OpenAI Realtime Speech API

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key with access to Realtime API

## Quick Start

### 1. Clone and Setup

```bash
cd speakease
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-api-key-here

# Start the server
npm run dev
```

The backend will start on `http://localhost:3001`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Create environment file (optional for development)
cp .env.example .env.local

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:3000`

### 4. Open the App

Visit `http://localhost:3000` in your browser.

## Environment Variables

### Backend (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | Your OpenAI API key |
| `PORT` | No | 3001 | Server port |

### Frontend (`.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_WS_URL` | No | ws://localhost:3001 | Backend WebSocket URL |
| `NEXT_PUBLIC_API_URL` | No | http://localhost:3001 | Backend REST API URL |

## Project Structure

```
speakease/
├── backend/
│   ├── src/
│   │   └── server.js        # Main server with WebSocket handling
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   │   ├── page.tsx           # Welcome screen
│   │   │   ├── mode-select/       # Mode selection
│   │   │   ├── casual/            # Casual talk mode
│   │   │   ├── office/            # Office English mode
│   │   │   ├── interview/         # Interview mode
│   │   │   └── feedback/          # Interview feedback
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # Utilities and state management
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## How It Works

### Speech Flow
1. User presses and holds the mic button
2. Audio is captured and converted to PCM16 format
3. Audio chunks are streamed to backend via WebSocket
4. Backend relays to OpenAI Realtime API
5. AI response audio streams back in real-time
6. Audio is played to user immediately

### Interview Analysis
1. Camera captures video during interview (not stored)
2. Frames are analyzed locally for basic metrics
3. On interview end, metrics are sent to backend
4. Backend generates feedback scores
5. Results displayed on feedback screen

## Browser Support

- Chrome 80+ (recommended)
- Firefox 78+
- Safari 14+
- Edge 80+

> Note: Requires HTTPS in production for camera/microphone access

## Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Configure CORS for your frontend domain
4. Use WSS (WebSocket Secure) in production

### Frontend
```bash
npm run build
npm run start
```

Or deploy to Vercel, Netlify, etc.

## Privacy & Security

- **No user accounts** - Session-based only
- **No recordings saved** - Audio/video processed in real-time
- **No data persistence** - Nothing stored beyond browser session
- **Session storage only** - Cleared when browser closes

## Troubleshooting

### Microphone not working
- Check browser permissions
- Ensure HTTPS in production
- Try a different browser

### Connection errors
- Verify OpenAI API key is valid
- Check backend is running
- Ensure WebSocket URL is correct

### Audio playback issues
- Click anywhere in the app first (browser autoplay policy)
- Check speaker/headphone connection

## License

MIT License - Feel free to use and modify for your projects.

## Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ for English learners everywhere
