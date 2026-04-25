/**
 * Sample phishing email and mock report data for demo mode.
 */

export const SAMPLE_PHISHING_EMAIL = `Delivered-To: victim@gmail.com
Received: by 2002:a05:7300:478a:b0:d2:3f1e:8a2c with SMTP id dj10csp1234567dyb;
        Mon, 21 Apr 2026 03:14:22 -0700 (PDT)
Received: from mail-suspicious.example.net (unknown [185.234.72.19])
        by mx.google.com with ESMTP id a1234567890;
        Mon, 21 Apr 2026 03:14:21 -0700 (PDT)
Received: from unknown (HELO paypaI-security.com) (91.215.85.42)
        by 0 with SMTP; 21 Apr 2026 10:14:19 -0000
Authentication-Results: mx.google.com;
       dkim=fail header.i=@paypaI-security.com header.s=selector1;
       spf=softfail (google.com: domain of noreply@paypaI-security.com does not designate 91.215.85.42 as permitted sender) smtp.mailfrom=noreply@paypaI-security.com;
       dmarc=fail (p=NONE sp=NONE dis=NONE) header.from=paypaI-security.com
Return-Path: <bounce-134872@mail-suspicious.example.net>
From: "PayPal Security Team" <noreply@paypaI-security.com>
Reply-To: support-verify@paypaI-security.com
To: victim@gmail.com
Subject: [URGENT] Your PayPal account has been limited - Verify Now
Date: Mon, 21 Apr 2026 10:14:19 +0000
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"
X-Mailer: PHPMailer 6.5.0

Dear Customer,

We've noticed unusual activity on your PayPal account. Your account access has been temporarily limited until you verify your identity.

Click the link below to restore your account access immediately:

https://paypaI-security.com/verify?token=eyJhbGciOiJIUzI1NiJ9.dXNlcj12aWN0aW1AZ21haWwuY29t

If you don't verify within 24 hours, your account will be permanently suspended and all funds will be frozen.

You can also verify through our secure portal:
https://bit.ly/3xR9kPa

For additional support, contact us at:
https://paypaI-security.com/support

Best regards,
PayPal Security Team
© 2026 PayPal, Inc. All rights reserved.
This is an automated message from PayPal — please do not reply directly.

PayPal Inc., 2211 N First Street, San Jose, CA 95131
Unsubscribe: https://paypaI-security.com/unsubscribe`;


export const MOCK_REPORT = {
  success: true,
  timestamp: new Date().toISOString(),
  analysis: {
    verdict: "HIGH_RISK" as const,
    overallScore: 92,
    signals: [
      {
        check: "Sender Domain Mismatch",
        status: "FAIL" as const,
        severity: "HIGH" as const,
        detail: "From domain 'paypaI-security.com' does not match Return-Path domain 'mail-suspicious.example.net'",
        technical: "From: noreply@paypaI-security.com | Return-Path: bounce-134872@mail-suspicious.example.net — these should match for legitimate senders.",
      },
      {
        check: "Homograph Attack Detected",
        status: "FAIL" as const,
        severity: "HIGH" as const,
        detail: "Domain 'paypaI-security.com' uses a capital I instead of lowercase L to impersonate PayPal",
        technical: "Unicode analysis: character at position 5 is Latin capital I (U+0049) instead of lowercase L (U+006C). Normalized domain resolves to 'paypal-security.com' — a known impersonation pattern.",
      },
      {
        check: "SPF Authentication",
        status: "FAIL" as const,
        severity: "HIGH" as const,
        detail: "SPF check returned 'softfail' — the sending server 91.215.85.42 is not authorized for this domain",
        technical: "spf=softfail (google.com: domain of noreply@paypaI-security.com does not designate 91.215.85.42 as permitted sender)",
      },
      {
        check: "DKIM Authentication",
        status: "FAIL" as const,
        severity: "HIGH" as const,
        detail: "DKIM signature verification failed — email integrity cannot be confirmed",
        technical: "dkim=fail header.i=@paypaI-security.com header.s=selector1",
      },
      {
        check: "DMARC Policy",
        status: "FAIL" as const,
        severity: "HIGH" as const,
        detail: "DMARC check failed with p=NONE policy — domain has no enforcement against spoofing",
        technical: "dmarc=fail (p=NONE sp=NONE dis=NONE) header.from=paypaI-security.com",
      },
      {
        check: "URL Reputation",
        status: "FAIL" as const,
        severity: "HIGH" as const,
        detail: "Primary URL flagged by 12 out of 70 antivirus engines on VirusTotal as phishing/malware",
        technical: "VirusTotal scan of paypaI-security.com/verify: 12/70 engines flagged as malicious. Categories: phishing (8), malware (3), suspicious (1).",
      },
      {
        check: "Urgency Manipulation",
        status: "FAIL" as const,
        severity: "MEDIUM" as const,
        detail: "Email uses urgency tactics: 'URGENT', '24 hours', 'permanently suspended', 'funds will be frozen'",
        technical: "Social engineering score: HIGH. Detected 4 urgency keywords and 2 threat phrases commonly used in phishing campaigns.",
      },
      {
        check: "URL Shortener Detected",
        status: "WARN" as const,
        severity: "MEDIUM" as const,
        detail: "URL shortener bit.ly detected — commonly used to hide malicious destinations",
        technical: "bit.ly/3xR9kPa was found in email body. URL shorteners obscure the true destination and are frequently used in phishing attacks.",
      },
      {
        check: "Suspicious Origin IP",
        status: "WARN" as const,
        severity: "MEDIUM" as const,
        detail: "Originating IP 91.215.85.42 geolocated to Eastern Europe — inconsistent with claimed PayPal origin",
        technical: "IP 91.215.85.42: Country=Ukraine, ASN=AS49505, Org=Deltahost. PayPal typically sends from US-based infrastructure.",
      },
      {
        check: "Brand Impersonation",
        status: "FAIL" as const,
        severity: "HIGH" as const,
        detail: "Email content closely mimics PayPal's official notification format with similar styling and language",
        technical: "Brand match score: 87% similarity to official PayPal security notifications. Logo, layout, and language patterns match known PayPal templates.",
      },
    ],
    senderAnalysis: {
      fromDomain: "paypaI-security.com",
      returnPathDomain: "mail-suspicious.example.net",
      mismatch: true,
      explanation: "Critical mismatch between sender domain and return path. The email claims to be from PayPal but the return path points to a completely different server, which is a strong indicator of email spoofing.",
    },
    urlAnalysis: [
      {
        original: "https://paypaI-security.com/verify?token=eyJhbGciOiJIUzI1NiJ9.dXNlcj12aWN0aW1AZ21haWwuY29t",
        unshortened: "https://paypaI-security.com/verify?token=eyJhbGciOiJIUzI1NiJ9.dXNlcj12aWN0aW1AZ21haWwuY29t",
        isSuspicious: true,
        reason: "Homograph domain + VT flagged",
        virusTotalScore: "12/70",
        screenshotUrl: "",
      },
      {
        original: "https://bit.ly/3xR9kPa",
        unshortened: "https://paypaI-security.com/portal/verify-identity",
        isSuspicious: true,
        reason: "Shortened URL redirecting to phishing domain",
        virusTotalScore: "8/70",
        screenshotUrl: "",
      },
      {
        original: "https://paypaI-security.com/support",
        unshortened: "https://paypaI-security.com/support",
        isSuspicious: true,
        reason: "Homograph phishing domain",
        virusTotalScore: "12/70",
        screenshotUrl: "",
      },
    ],
    homographAnalysis: {
      detected: true,
      domains: ["paypaI-security.com"],
      explanation: "The domain 'paypaI-security.com' uses a capital letter I (Unicode U+0049) instead of a lowercase L to visually impersonate 'paypal-security.com'. This is a classic IDN homograph attack targeting PayPal users.",
    },
    headerAnalysis: {
      hops: 3,
      suspiciousHops: ["91.215.85.42 (Ukraine, Deltahost)"],
      explanation: "Email traversed 3 hops. The originating server 91.215.85.42 is located in Ukraine and associated with hosting provider Deltahost, which has been linked to previous phishing campaigns.",
    },
    replicaDetection: {
      targetBrand: "PayPal",
      similarityScore: 87,
      explanation: "The email closely replicates PayPal's security notification template, including their standard language, formatting patterns, and footer structure.",
    },
    summary: "This email is a sophisticated phishing attempt impersonating PayPal. It uses a homograph attack (capital I instead of lowercase L in the domain), spoofed sender headers, urgency manipulation, and links to a malicious website flagged by multiple antivirus engines. All authentication checks (SPF, DKIM, DMARC) have failed.",
    technicalSummary: "FROM: noreply@paypaI-security.com (homograph domain)\nRETURN-PATH: bounce-134872@mail-suspicious.example.net (MISMATCH)\nORIGINATING IP: 91.215.85.42 (UA, Deltahost AS49505)\nSPF: softfail | DKIM: fail | DMARC: fail\nURLs FOUND: 4 (3 flagged malicious)\nHOMOGRAPH: paypaI → paypal (capital I vs lowercase L)\nVT DETECTION: 12/70 engines flagged primary URL\nBRAND IMPERSONATION: PayPal (87% match)\nURGENCY INDICATORS: 4 keywords, 2 threat phrases\nRISK ASSESSMENT: HIGH (92/100)",
  },
  enrichment: {
    firecrawl: {},
    virusTotal: {},
    ipInfo: {},
    screenshot: {
      url: null,
      screenshotUrl: null,
    },
  },
  parsed: {
    from: "PayPal Security Team <noreply@paypaI-security.com>",
    returnPath: "bounce-134872@mail-suspicious.example.net",
    replyTo: "support-verify@paypaI-security.com",
    subject: "[URGENT] Your PayPal account has been limited - Verify Now",
    senderDomain: "paypaI-security.com",
    urls: [
      "https://paypaI-security.com/verify?token=eyJhbGciOiJIUzI1NiJ9.dXNlcj12aWN0aW1AZ21haWwuY29t",
      "https://bit.ly/3xR9kPa",
      "https://paypaI-security.com/support",
      "https://paypaI-security.com/unsubscribe",
    ],
    ipAddresses: ["185.234.72.19", "91.215.85.42"],
    hops: [],
    spf: "softfail",
    dkim: "fail",
    dmarc: "fail",
  },
  timings: {
    parsing: 12,
    firecrawl: 0,
    virusTotal: 0,
    ipInfo: 0,
    screenshot: 0,
    grokAnalysis: 0,
    total: 1847,
  },
};
