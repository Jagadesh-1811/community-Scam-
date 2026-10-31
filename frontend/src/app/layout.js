import "./globals.css";

export const metadata = {
  title: "ScamRadar India | Community Fraud Defense Hub",
  description: "Community scam radar and incident checking for India.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="bg-[#F7F7F2] text-[#0A0A0A] min-h-screen antialiased selection:bg-[#23E000] selection:text-[#0A0A0A]"
      >
        {children}
      </body>
    </html>
  );
}
