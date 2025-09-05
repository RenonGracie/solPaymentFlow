import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sol Health Payments",
  description: "Payments for Sol Health",
};
 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const videoCdn = process.env.NEXT_PUBLIC_VIDEO_BASE_URL;
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" 
        />
        {/* Preload critical fonts to prevent rendering issues */}
        <link 
          rel="preload" 
          href="/VeryVogue-Text.otf" 
          as="font" 
          type="font/otf"
          crossOrigin="anonymous" 
        />
        {/* Preload critical assets */}
        <link rel="preload" href="/sol-health-logo.svg" as="image" />
        <link rel="preload" href="/onboarding-banner.jpg" as="image" />
        
        {videoCdn && (
          <>
            <link rel="preconnect" href={videoCdn} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={videoCdn} />
          </>
        )}
        {/* <Script
          crossOrigin="anonymous"
          src="//unpkg.com/same-runtime/dist/index.global.js"
        /> */}
      </head>
      <body suppressHydrationWarning className="antialiased">
        <div className="min-h-screen" style={{ height: '100dvh', maxHeight: '100dvh' }}>
          <ClientBody>{children}</ClientBody>
        </div>
      </body>
    </html>
  );
}
