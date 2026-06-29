import type { Metadata, Viewport } from "next";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://onlinegame-red.vercel.app",
  ),
  applicationName: "KruEIonline",
  title: "KruEIonline",
  description: "ร่วมกันตอบ ทำคะแนนสูงสุดเพื่อทีม",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KruEIonline",
  },
  openGraph: {
    title: "KruEIonline",
    description: "ร่วมกันตอบ ทำคะแนนสูงสุดเพื่อทีม",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KruEIonline Realtime Quiz Game",
      },
    ],
    siteName: "KruEIonline",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KruEIonline",
    description: "ร่วมกันตอบ ทำคะแนนสูงสุดเพื่อทีม",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#050716",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
