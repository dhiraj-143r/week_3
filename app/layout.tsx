import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground min-h-screen`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#111111",
              color: "#ffffff",
              border: "1px solid #1e1e1e",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
