import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Bookmarker",
  description: "Bookmark manager built with Next.js, Drizzle and Cloudflare D1"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var key = "bookmark-theme";
                var saved = localStorage.getItem(key);
                var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                var theme = (saved === "light" || saved === "dark")
                  ? saved
                  : (prefersDark ? "dark" : "light");
                if (theme === "dark") {
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              } catch (_error) {}
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
