import "./globals.css";

export const viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  title: "ScamRadar India | Community Fraud Defense Hub",
  description: "Real-time community scam radar, incident reporting, and fraud defense for India. Check if a phone number, UPI ID, or link is a known scam.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ScamRadar",
  },
  openGraph: {
    title: "ScamRadar India",
    description: "Community Scam Map & Fraud Defense Hub for India",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ScamRadar" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="msapplication-TileColor" content="#0A0A0A" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[#F7F7F2] text-[#0A0A0A] min-h-screen antialiased selection:bg-[#23E000] selection:text-[#0A0A0A]"
      >
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
