import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'JS-to-WP Scaffolder — WordPress plugins for JS developers',
  description:
    'Generate modern, OOP WordPress plugins from a JSON config. PSR-4 autoloading, React settings pages, REST API controllers — all in patterns you already know from Node.',
  openGraph: {
    title: 'JS-to-WP Scaffolder',
    description: 'WordPress plugins for JS developers. Zero PHP spaghetti.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JS-to-WP Scaffolder',
    description: 'WordPress plugins for JS developers. Zero PHP spaghetti.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-zinc-950 text-zinc-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
