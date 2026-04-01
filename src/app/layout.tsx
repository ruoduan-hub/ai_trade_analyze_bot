import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { LocaleProvider } from "@/contexts/LocaleContext";
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

// Sets data-theme from localStorage before React hydrates so CSS variables
// take effect immediately — no theme flash.  Uses next/script with
// beforeInteractive to avoid the "script tag inside React component" warning.
const themeScript = `(function(){try{
  var s=localStorage.getItem('theme');
  var t=s||(window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');
  document.documentElement.setAttribute('data-theme',t);
}catch(e){}})()`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the locale cookie server-side so the SSR output is already in the
  // user's preferred language.  LocaleProvider receives this as initialLocale,
  // meaning both server render and client hydration start with the same value —
  // no hydration mismatch, no flash.
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const initialLocale = localeCookie === "en" ? "en" : "zh";

  return (
    // suppressHydrationWarning on <html> because themeScript may change
    // data-theme before React hydrates.
    <html
      lang={initialLocale}
      data-theme="dark"
      data-locale={initialLocale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* beforeInteractive runs before hydration and avoids the "script tag
            inside React component" console warning */}
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <LocaleProvider initialLocale={initialLocale}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
