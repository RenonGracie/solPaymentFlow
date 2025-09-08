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
  title: "Sol Health Onboarding",
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
        <link rel="icon" href="/Favicon.png" />
        
        {videoCdn && (
          <>
            <link rel="preconnect" href={videoCdn} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={videoCdn} />
          </>
        )}
        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1020640882653434');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{display: 'none'}}
            src="https://www.facebook.com/tr?id=1020640882653434&ev=PageView&noscript=1"
          />
        </noscript>
      </head>
      <body suppressHydrationWarning className="antialiased">
        <div className="min-h-screen" style={{ height: '100dvh', maxHeight: '100dvh' }}>
          <ClientBody>{children}</ClientBody>
        </div>
      </body>
    </html>
  );
}
