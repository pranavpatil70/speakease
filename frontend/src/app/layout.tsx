import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SpeakEase - Practice English Speaking',
  description: 'Build confidence in spoken English with AI-powered conversation practice',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <main className="min-h-screen gradient-calm">
          {children}
        </main>
      </body>
    </html>
  );
}
