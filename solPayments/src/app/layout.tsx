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
        {videoCdn && (
          <>
            <link rel="preconnect" href={videoCdn} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={videoCdn} />
          </>
        )}
        <Script
          crossOrigin="anonymous"
          src="//unpkg.com/same-runtime/dist/index.global.js"
        />
      </head>
      <body suppressHydrationWarning className="antialiased" style={{ backgroundColor: '#FFFBF3' }}>
        <div className="min-h-screen" style={{ backgroundColor: '#FFFBF3' }}>
          <ClientBody>{children}</ClientBody>
        </div>
      </body>
    </html>
  );
}
