# PhishFilter — AI Email Security Agent

> Machine-readable skill descriptor for AI agent discovery.
> This service is available for programmatic use via REST API with USDC payments via Locus Checkout.

## Service Identity

- **Name**: PhishFilter
- **Type**: Security-as-a-Service
- **Category**: Email Security / Phishing Detection
- **Version**: 1.0.0
- **Payment**: USDC on Base (via Locus Checkout)

## What PhishFilter Does

PhishFilter is an AI-powered email security analysis engine that performs deep forensic inspection of emails to detect phishing, spoofing, and social engineering attacks.

### Capabilities

1. **Email Phishing Scan** — Full forensic analysis of raw email content
   - SPF / DKIM / DMARC authentication validation
   - URL scanning via VirusTotal (70+ engines)
   - Homograph attack detection (Unicode lookalikes)
   - IP geolocation and hop tracing
   - Grok AI forensic analysis with threat scoring
   - Output: Structured threat report (score 0-100, verdict, red flags)

2. **URL Safety Check** — Scan individual URLs against VirusTotal
3. **Header Analysis** — Parse and validate email authentication records

## Pricing

| Plan | Price | Credits | Best For |
|------|-------|---------|----------|
| Free Tier | $0 | 3/day | Testing and evaluation |
| Single Scan | 0.50 USDC | 1 | One-off checks |
| Scan Pack | 5.00 USDC | 15 | Regular scanning |
| Pro Monthly | 20.00 USDC | Unlimited | High-volume agents |

## API Quick Start

### Step 1: Discover Services
```
GET /api/agent/services
```
Returns full service catalog, capabilities, and pricing.

### Step 2: Purchase Credits (optional — 3 free scans/day)
```
POST /api/agent/purchase
Content-Type: application/json

{ "planId": "single_scan", "agentId": "your-agent-id" }
```
Returns a Locus Checkout URL. Complete USDC payment to receive credits.

### Step 3: Scan an Email
```
POST /api/agent/scan
Content-Type: application/json
x-credit-token: your-credit-token

{ "emailContent": "From: sender@example.com\nSubject: Urgent\n\nClick here..." }
```

### Response Format
```json
{
  "success": true,
  "threat": {
    "score": 85,
    "verdict": "DANGEROUS",
    "summary": "High-confidence phishing attempt detected...",
    "confidence": "high"
  },
  "authentication": { "spf": "fail", "dkim": "none", "dmarc": "fail" },
  "indicators": { "urls": ["http://evil.com/phish"], "suspiciousPatterns": [...] },
  "credits": { "remaining": 14 }
}
```

## Payment Protocol

- **Currency**: USDC on Base network
- **Provider**: Locus Checkout (machine-readable)
- **402 Protocol**: Scan endpoint returns HTTP 402 with purchase instructions when credits are exhausted
- **Agent-to-Agent**: Other agents can discover, purchase, and use PhishFilter programmatically

## Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/agent/services` | No | Service catalog & pricing |
| GET | `/api/agent/purchase` | No | Available plans |
| POST | `/api/agent/purchase` | No | Create checkout session |
| POST | `/api/agent/scan` | Yes | Submit email for analysis |
| GET | `/api/credits` | Yes | Check credit balance |

## Discovery Files

- Skill file: `/skill.md` (this file)
- AI Plugin: `/.well-known/ai-plugin.json`
- Service catalog: `/api/agent/services`
