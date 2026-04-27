# 🛡️ PhishFilter × Locus — AI Security-as-a-Service

> **Paste any suspicious email. AI tears it apart. Pay per scan with USDC.**

PhishFilter is a monetized AI email security platform that combines multi-engine forensic analysis with **Locus Checkout** for pay-per-scan USDC payments. Built for the **Paygentic Hackathon Week 3** — one integration that works for both humans and AI agents.

![PhishFilter](https://img.shields.io/badge/PhishFilter-v2.0.0-5934FF?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs)
![Locus](https://img.shields.io/badge/Locus-USDC-4101F6?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)

---

## 🏆 Hackathon Submission — Paygentic Week 3

### The Problem
Email phishing causes **$17.4B in losses annually**. Existing tools are enterprise-locked, expensive, and not accessible to individuals, small businesses, or AI agents.

### The Solution
PhishFilter monetizes email security analysis using **Locus Checkout** for USDC payments on Base:
- **Humans** paste emails → get instant forensic reports → pay per scan
- **AI Agents** discover the service via `skill.md` → purchase credits programmatically → call the scan API
- **x402 Protocol** — scan endpoint returns HTTP 402 with inline purchase instructions when credits run out

### Why Locus?
- ✅ Machine-readable checkout pages → agents can discover and pay programmatically
- ✅ USDC on Base → fast, cheap, borderless payments
- ✅ One integration for both human and agent buyers
- ✅ Webhook-driven credit issuance → seamless post-payment flow

---

## 💰 Business Model

| Plan | Price | Credits | Target |
|------|-------|---------|--------|
| **Free Tier** | $0 | 3/day | Trial users |
| **Single Scan** | 0.50 USDC | 1 | One-off checks |
| **Scan Pack** | 5.00 USDC | 15 | Regular users |
| **Pro Monthly** | 20.00 USDC | Unlimited | Power users & agents |

**Revenue model**: Pay-per-scan with USDC via Locus Checkout on Base network.

---

## ✨ Features

### 🔍 Core Analysis Engine
- **Multi-AI Verdict** — Gemini + Claude + Grok AI analyze email content with threat scoring (0-100)
- **VirusTotal Scanning** — Every URL scanned against 70+ antivirus engines
- **Homograph Detection** — 80+ Unicode lookalike mappings detect IDN homograph attacks
- **URL Unshortening** — Firecrawl resolves shortened links to reveal true destinations
- **Brand Impersonation** — Detects impersonation of 40+ major brands
- **SPF/DKIM/DMARC** — Email authentication validation
- **Header Hop Analysis** — Traces email's geographic path with IP geolocation

### 💳 Locus Checkout Integration
- **3 Pricing Tiers** — Single scan, pack, and pro plans
- **USDC Payments** — On-chain payments on Base network
- **Webhook Handler** — HMAC-verified, auto-credits on payment confirmation
- **Credit Gating** — HTTP 402 when credits exhausted → redirect to checkout
- **Live Credit Badge** — Real-time credit count in navbar

### 🤖 Agent-Readable API
- **Service Catalog** — `GET /api/agent/services` — full capabilities, pricing, endpoints
- **Programmatic Purchase** — `POST /api/agent/purchase` — creates Locus Checkout sessions
- **Agent Scan** — `POST /api/agent/scan` — structured threat reports
- **x402 Protocol** — HTTP 402 with inline purchase instructions
- **Discovery Files** — `skill.md`, `ai-plugin.json`, `openapi.json`

### 📊 Premium UI
- **Glassmorphism Pricing Page** — 3-tier cards with particle field background
- **Payment Success Page** — Confetti animation + on-chain confirmation details
- **Smart Scan Button** — Shows credit count, redirects when exhausted
- **Forensic Dashboard** — Interactive world map, expandable signal cards, PDF export
- **Voice Verdict** — Bilingual TTS (English + Hindi) via Sarvam AI

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router, TypeScript) |
| **Payments** | Locus Checkout SDK (USDC on Base) |
| **AI Engine** | Gemini 2.0 Flash → Claude 3.5 → Grok 3 (waterfall) |
| **URL Scanning** | VirusTotal (70+ engines) |
| **URL Scraping** | Firecrawl API |
| **Voice TTS** | Sarvam AI (English + Hindi) |
| **Styling** | Vanilla CSS + Framer Motion |
| **PDF Export** | jsPDF |
| **Map** | react-simple-maps |

---

## 🤖 Agent API — Quick Start

AI agents can discover, purchase, and use PhishFilter programmatically:

### 1. Discover Services
```bash
curl https://your-app.com/api/agent/services
```

### 2. Purchase Credits
```bash
curl -X POST https://your-app.com/api/agent/purchase \
  -H "Content-Type: application/json" \
  -d '{"planId": "single_scan", "agentId": "my-agent"}'
```
→ Returns Locus Checkout URL + credit token

### 3. Scan an Email
```bash
curl -X POST https://your-app.com/api/agent/scan \
  -H "Content-Type: application/json" \
  -H "x-credit-token: YOUR_TOKEN" \
  -d '{"emailContent": "From: phisher@evil.com\nSubject: Urgent\n\nClick here..."}'
```
→ Returns structured threat report:
```json
{
  "threat": { "score": 92, "verdict": "DANGEROUS", "summary": "..." },
  "authentication": { "spf": "fail", "dkim": "none", "dmarc": "fail" },
  "credits": { "remaining": 14 }
}
```

### 4. When Credits Run Out → HTTP 402
```json
{
  "error": "NO_CREDITS",
  "purchase": { "endpoint": "/api/agent/purchase", "currency": "USDC" },
  "x402": { "paymentRequired": true }
}
```

---

## 📁 Project Structure

```
phishfilter/
├── app/
│   ├── api/
│   │   ├── agent/
│   │   │   ├── services/route.ts   # Agent service catalog
│   │   │   ├── purchase/route.ts   # Agent checkout sessions
│   │   │   └── scan/route.ts       # Agent scan endpoint
│   │   ├── analyze/route.ts        # Main analysis pipeline (credit-gated)
│   │   ├── checkout/create/route.ts # Locus session creation
│   │   ├── webhooks/locus/route.ts # Payment webhook handler
│   │   └── credits/route.ts        # Credit balance API
│   ├── pricing/page.tsx            # Glassmorphism pricing page
│   ├── success/page.tsx            # Payment success + confetti
│   ├── cancel/page.tsx             # Cancellation page
│   ├── scan/page.tsx               # Scanner with credit badge
│   └── page.tsx                    # Landing page
├── lib/
│   ├── locus-checkout.ts           # Locus Checkout SDK wrapper
│   ├── credits.ts                  # Credit management system
│   ├── grok.ts                     # Multi-AI analysis (Gemini/Claude/Grok)
│   ├── parser.ts                   # Email header parser (RFC 2822)
│   └── homograph.ts                # Unicode attack detection
├── public/
│   ├── skill.md                    # Agent skill descriptor
│   └── .well-known/
│       ├── ai-plugin.json          # Plugin manifest
│       └── openapi.json            # OpenAPI 3.1 spec
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env.local`:
```env
LOCUS_API_KEY=your_locus_api_key
LOCUS_WEBHOOK_SECRET=your_webhook_secret
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
GROK_API_KEY=your_grok_key
FIRECRAWL_API_KEY=your_firecrawl_key
SARVAM_API_KEY=your_sarvam_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production
```bash
npm run build  # ✅ Verified — compiles clean
```

---

## 🔗 API Endpoints

### Human-Facing
| Endpoint | Method | Description |
|---|---|---|
| `/api/analyze` | POST | Main scan pipeline (credit-gated) |
| `/api/checkout/create` | POST | Create Locus Checkout session |
| `/api/webhooks/locus` | POST | Locus payment webhook |
| `/api/credits` | GET | Check credit balance |

### Agent-Facing
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/agent/services` | GET | No | Service catalog & pricing |
| `/api/agent/purchase` | POST | No | Create checkout session |
| `/api/agent/scan` | POST | Token | Submit email for analysis |
| `/skill.md` | GET | No | Machine-readable skill descriptor |
| `/.well-known/ai-plugin.json` | GET | No | Plugin manifest |
| `/.well-known/openapi.json` | GET | No | OpenAPI 3.1 spec |

---

## 🔄 Payment Flow

```
Human Flow:
  Paste email → Scan → 402 (no credits) → /pricing → Locus Checkout → USDC payment
  → Webhook → Credits added → Scan succeeds → Forensic report

Agent Flow:
  GET /api/agent/services → discover capabilities
  POST /api/agent/purchase → get checkout URL
  Complete USDC payment → webhook → credits added
  POST /api/agent/scan → structured threat report
  402 when exhausted → purchase more
```

---

## 👥 Team

**Dhiraj Rathod** — Full-stack development, AI integration, Locus Checkout implementation

---

## 📄 License

Built for the Paygentic Hackathon Week 3. All rights reserved.

---

<p align="center">
  <strong>PhishFilter × Locus</strong> — Security-as-a-Service, powered by USDC. 🛡️💰
</p>
