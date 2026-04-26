import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "PhishFilter — AI Phishing Detection",
  description: "Paste any suspicious email. AI tears it apart instantly. Advanced phishing detection with URL scanning, homograph attack detection, and forensic analysis.",
  keywords: ["phishing detection", "email security", "AI forensics", "threat detection", "VirusTotal", "homograph attack", "brand impersonation"],
  openGraph: {
    title: "PhishFilter — AI Phishing Detection",
    description: "Paste any suspicious email. AI tears it apart instantly.",
    type: "website",
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#161616",
              color: "#f5f5f5",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              fontSize: "13px",
              fontFamily: "'Inter', system-ui, sans-serif",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
