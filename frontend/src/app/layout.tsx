import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CoachFit — Endurance Training OS",
    template: "%s — CoachFit",
  },
  description:
    "CoachFit is your endurance training OS — track activities, plan workouts, analyze fitness trends.",
  keywords: ["endurance", "training", "cycling", "running", "fitness", "coach"],
  authors: [{ name: "CoachFit" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CoachFit",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Default dark mode; toggled via data-theme attr by UI store
      className={`${inter.variable} h-full`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="h-full antialiased">
        {children}
      </body>
    </html>
  );
}
