import './globals.css';
import { Bangers, Space_Grotesk } from 'next/font/google';

const display = Bangers({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const body = Space_Grotesk({ subsets: ['latin'], variable: '--font-body' });

export const metadata = { title: 'POW! Progress Tracker' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
