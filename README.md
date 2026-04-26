# 🛡️ PhishFilter — AI-Powered Phishing Detection

> **Paste any suspicious email. AI tears it apart instantly.**

PhishFilter is an advanced email forensics platform that combines multiple AI engines and security tools to detect phishing attacks, brand impersonation, homograph abuse, and malicious URLs — all in real-time.

![PhishFilter](https://img.shields.io/badge/PhishFilter-v1.0.0-6366f1?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)

---

## ✨ Features

### 🔍 Core Analysis Engine
- **AI-Powered Verdict** — Grok AI (xAI) analyzes email content and returns HIGH_RISK / MEDIUM_RISK / SAFE verdict with confidence score
- **URL Scanning** — VirusTotal integration scans every URL against 70+ antivirus engines
- **Homograph Detection** — 80+ Unicode lookalike character mappings detect IDN homograph attacks (e.g., `paypaI.com` impersonating `paypal.com`)
- **URL Unshortening** — Firecrawl resolves bit.ly/tinyurl links to reveal true destinations
- **Brand Impersonation** — Detects impersonation of 40+ major brands (Google, PayPal, Microsoft, etc.)
- **SPF/DKIM/DMARC Validation** — Extracts and displays email authentication results
- **Header Hop Analysis** — Traces email's journey through mail servers with IP geolocation

### 📊 Forensic Dashboard
- **Verdict Banner** — Animated score ring with pulse effects
- **Security Signals Grid** — Expandable cards showing each detection with technical details
- **URL Analysis Table** — Original vs unshortened URLs with VirusTotal scores
- **Screenshot Preview** — Safe preview of suspicious landing pages
- **Header Hop Map** — Interactive world map showing email's geographic path
- **Sender Analysis** — From vs Return-Path domain mismatch detection

### 🔊 Voice Verdict
- **Bilingual TTS** — Sarvam AI generates voice verdicts in English and Hindi
- **Auto-play** — Speaks the verdict automatically when report loads
- **Audio Visualizer** — Animated equalizer bars during playback

### 📄 PDF Export
- **4-Page Professional Report** — Downloadable forensic analysis PDF
  - Page 1: Verdict, score, executive summary, authentication results
  - Page 2: Full signals table with severity levels
  - Page 3: URL analysis, homograph report, header hops
  - Page 4: Technical summary, raw data, legal disclaimer

### 📱 Notifications
- **Email Reports** — HTML-formatted forensic report via AgentMail
- **WhatsApp Alerts** — Instant verdict notification to your phone
- **Fire-and-forget** — Notifications run in background, don't delay the response

### 🧩 Chrome Extension
- **Gmail Integration** — "Scan with PhishFilter" button injected into every email
- **Inline Badges** — RED/AMBER/GREEN verdict badges displayed above email body
- **Scan History** — Last 5 scans accessible from the popup dashboard
- **Notification Settings** — Save email/phone preferences for alerts

### 🕐 Session Features
- **Threat Timeline** — Session history of all analyzed emails with verdict badges
- **Demo Mode** — One-click toggle for instant mock HIGH_RISK report (no API calls)
- **Sample Email** — Pre-loaded realistic phishing email for live demos
- **Skeleton Loading** — Professional loading states instead of spinners

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router, TypeScript) |
| **Styling** | Tailwind CSS + Framer Motion animations |
| **AI Engine** | xAI Grok (grok-3-beta / grok-2) |
| **URL Scanning** | VirusTotal via Locus API |
| **URL Scraping** | Firecrawl API |
| **IP Geolocation** | IPinfo via Locus API |
| **Screenshots** | ScreenshotOne via Locus API |
| **Voice TTS** | Sarvam AI (English + Hindi) |
| **Email Notifications** | AgentMail via Locus API |
| **PDF Generation** | jsPDF |
| **Map Visualization** | react-simple-maps |
| **Notifications** | react-hot-toast |
| **Extension** | Chrome Manifest V3 |

---

## 📁 Project Structure

```
phishfilter/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    # Main analysis pipeline
│   │   ├── notify/route.ts     # Email + WhatsApp notifications
│   │   ├── tts/route.ts        # Sarvam AI TTS proxy
│   │   ├── ipinfo/route.ts     # IP geolocation
│   │   ├── screenshot/route.ts # URL screenshot
│   │   └── virustotal/route.ts # VirusTotal scanning
│   ├── page.tsx                # Main app page
│   ├── layout.tsx              # Root layout + SEO
│   └── globals.css             # Design system
├── components/
│   ├── EmailInput.tsx           # Email paste interface
│   ├── ForensicReport.tsx       # Full report dashboard
│   ├── HeaderHopMap.tsx         # Interactive world map
│   ├── ThreatTimeline.tsx       # Session analysis history
│   ├── VoiceVerdict.tsx         # TTS audio player
│   ├── PDFExport.tsx            # PDF report generator
│   ├── RiskBadge.tsx            # Verdict badge component
│   ├── ScreenshotPreview.tsx    # Safe URL preview
│   └── ErrorBoundary.tsx        # Error handling wrapper
├── lib/
│   ├── parser.ts                # Email header parser (RFC 2822)
│   ├── grok.ts                  # Grok AI analysis
│   ├── firecrawl.ts             # URL scraping
│   ├── locus.ts                 # Locus API (VT, IP, Screenshot)
│   ├── homograph.ts             # Unicode attack detection
│   └── demo-data.ts             # Sample email + mock report
├── extension/
│   ├── manifest.json            # Chrome extension manifest v3
│   ├── content.js               # Gmail content script
│   ├── content.css              # Injected styles
│   ├── popup.html               # Extension popup UI
│   ├── popup.js                 # Popup logic
│   └── icon.png                 # Extension icon
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Chrome browser (for extension)

### 1. Install Dependencies
```bash
cd phishfilter
npm install
```

### 2. Configure Environment
Create `.env.local` with your API keys:
```env
GROK_API_KEY=your_xai_api_key
FIRECRAWL_API_KEY=your_firecrawl_key
LOCUS_API_KEY=your_locus_key
GEMINI_API_KEY=your_gemini_key
SARVAM_API_KEY=your_sarvam_key
GUMLOOP_WEBHOOK_URL=your_gumloop_webhook
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 4. Install Chrome Extension
1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Open Gmail — look for the "🛡️ Scan with PhishFilter" button

### 5. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```
Add all environment variables in the Vercel dashboard under Settings → Environment Variables.

After deployment, update `extension/content.js` and `extension/popup.html` with your production URL.

---

## 🎮 Demo Mode

For hackathon presentations when APIs may be slow:

1. Click the **"Demo"** toggle in the navbar
2. Click **"Load Sample Phishing Email"** to pre-fill a realistic phishing email
3. Click **"Scan Email"** — instant mock HIGH_RISK report appears in ~2 seconds

---

## 🔗 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/analyze` | POST | Main analysis pipeline |
| `/api/notify` | POST | Send email/WhatsApp notifications |
| `/api/tts` | POST | Text-to-speech via Sarvam AI |
| `/api/virustotal` | POST | VirusTotal URL scanning |
| `/api/ipinfo` | GET | IP geolocation lookup |
| `/api/screenshot` | GET | URL screenshot capture |

---

## 🎥 Demo Video

> _[Insert demo video link here]_

---

## 👥 Team

> _[Insert team details here]_

---

## 📄 License

Built for hackathon purposes. All rights reserved.

---

<p align="center">
  <strong>PhishFilter</strong> — Because every email deserves a second look. 🛡️
</p>
# Phish_filter
