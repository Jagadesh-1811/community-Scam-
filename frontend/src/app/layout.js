import "./globals.css";
import { Orbitron, JetBrains_Mono, Newsreader } from "next/font/google";
import PwaManager from "@/components/PwaManager";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  title: "ScamRadar India // National Cyber Threat Radar & Verification Hub",
  description: "Real-time community scam radar, incident reporting, entity verification, and citizen fraud defense platform for India.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ScamRadar",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "ScamRadar India",
    description: "Community Scam Map & Fraud Defense Hub for India",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${orbitron.variable} ${jetbrainsMono.variable} ${newsreader.variable} h-full`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ScamRadar" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col antialiased bg-[#F7F7F2] text-[#0A0A0A] selection:bg-[#23E000] selection:text-[#0A0A0A]"
      >
        <PwaManager />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('[ScamRadar PWA] SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.log('[ScamRadar PWA] SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
