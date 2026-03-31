import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CryptoAdvisor AI",
  description: "AI-powered crypto investment intelligence",
};

// Runs synchronously as the first <body> child — before any content is painted.
// Just sets the data-theme attribute; CSS [data-theme] selectors handle all colours.
// This prevents FOUC without triggering body's background-color transition.
const themeScript = `(function(){try{
  var s=localStorage.getItem('theme');
  var t=s||(window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');
  document.documentElement.setAttribute('data-theme',t);
}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme="dark" is the SSR default; suppressHydrationWarning because
    // the inline script may change the attribute before React hydrates.
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
