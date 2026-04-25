/* ═══════════════════════════════════════════════════════════════════════
 * PhishFilter — content.js
 *
 * Injected into Gmail via content script. Watches for email opens,
 * injects scan buttons, communicates with PhishFilter API, and
 * displays inline verdict badges.
 * ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Config ───────────────────────────────────────────────────────────

  const API_BASE = "http://localhost:3000"; // Change to deployed URL in production
  const MAX_STORED_RESULTS = 5;
  const SCAN_BTN_ID_PREFIX = "phishfilter-scan-";
  const BADGE_ID_PREFIX = "phishfilter-badge-";

  // Track which email containers have already been processed
  const processedEmails = new WeakSet();
  let scanCounter = 0;

  // ── Verdict Config ───────────────────────────────────────────────────

  const VERDICT_MAP = {
    HIGH_RISK: {
      cssClass: "high-risk",
      icon: "🚨",
      label: "PHISHING DETECTED",
    },
    MEDIUM_RISK: {
      cssClass: "medium-risk",
      icon: "⚠️",
      label: "SUSPICIOUS EMAIL",
    },
    SAFE: {
      cssClass: "safe",
      icon: "✅",
      label: "EMAIL APPEARS SAFE",
    },
  };

  // ── Utility: Extract text from email ─────────────────────────────────

  function extractEmailContent(emailContainer) {
    // Try to get full email source with headers
    let content = "";

    // 1. Check for "Show original" data (if previously loaded)
    const headerEls = document.querySelectorAll(".gE.iv.gt");
    if (headerEls.length > 0) {
      headerEls.forEach((el) => {
        content += el.textContent + "\n";
      });
    }

    // 2. Get visible header info
    const fromEl = document.querySelector('[data-hovercard-id]') ||
                   document.querySelector('.gD');
    const subjectEl = document.querySelector('.hP');

    if (fromEl) {
      const fromEmail = fromEl.getAttribute("email") || fromEl.getAttribute("data-hovercard-id") || fromEl.textContent;
      content += "From: " + fromEmail + "\n";
    }

    if (subjectEl) {
      content += "Subject: " + subjectEl.textContent + "\n";
    }

    // 3. Try to get Received / authentication headers from the DOM
    const headerRows = document.querySelectorAll(".ajx, .ajA");
    headerRows.forEach((row) => {
      content += row.textContent + "\n";
    });

    // 4. Get full email body
    content += "\n---EMAIL BODY---\n";
    content += emailContainer.innerHTML;

    // Also extract plain text for better parsing
    content += "\n---PLAIN TEXT---\n";
    content += emailContainer.innerText;

    return content;
  }

  // ── Utility: Get notification preferences ────────────────────────────

  async function getNotifyPrefs() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["userEmail", "userPhone"], (data) => {
        resolve({
          userEmail: data.userEmail || undefined,
          userPhone: data.userPhone || undefined,
        });
      });
    });
  }

  // ── Utility: Store scan result ───────────────────────────────────────

  async function storeScanResult(result) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["scanHistory"], (data) => {
        const history = data.scanHistory || [];

        history.unshift({
          timestamp: new Date().toISOString(),
          verdict: result.analysis?.verdict || "UNKNOWN",
          score: result.analysis?.overallScore || 0,
          subject: result.parsed?.subject || "Unknown Subject",
          from: result.parsed?.from || "Unknown Sender",
          signalCount: result.analysis?.signals?.length || 0,
        });

        // Keep only the last N results
        const trimmed = history.slice(0, MAX_STORED_RESULTS);

        chrome.storage.local.set({ scanHistory: trimmed }, () => {
          resolve(trimmed);
        });
      });
    });
  }

  // ── Create: Scan Button ──────────────────────────────────────────────

  function createScanButton(emailContainer) {
    const id = SCAN_BTN_ID_PREFIX + (++scanCounter);

    const btn = document.createElement("button");
    btn.id = id;
    btn.className = "phishfilter-scan-btn";
    btn.innerHTML = '<span class="phishfilter-icon">🛡️</span> Scan with PhishFilter';

    btn.addEventListener("click", () => handleScan(emailContainer, btn));

    return btn;
  }

  // ── Create: Loading State ────────────────────────────────────────────

  function showLoadingState(btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="phishfilter-spinner"></span> Scanning...';

    // Also show loading status below the button
    const loading = document.createElement("div");
    loading.className = "phishfilter-loading";
    loading.id = "phishfilter-loading-status";

    const messages = [
      "Parsing email headers...",
      "Scanning URLs with VirusTotal...",
      "Checking for homograph attacks...",
      "Fetching safe previews...",
      "Generating forensic report...",
    ];

    let msgIndex = 0;
    loading.innerHTML = '<span class="phishfilter-spinner"></span><span class="loading-text">' + messages[0] + '</span>';

    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      const textEl = loading.querySelector(".loading-text");
      if (textEl) {
        textEl.textContent = messages[msgIndex];
      }
    }, 2200);

    loading.dataset.intervalId = String(interval);

    btn.parentNode.insertBefore(loading, btn.nextSibling);
  }

  // ── Create: Result Badge ─────────────────────────────────────────────

  function createResultBadge(result, emailContainer) {
    const analysis = result.analysis || {};
    const verdict = analysis.verdict || "SAFE";
    const config = VERDICT_MAP[verdict] || VERDICT_MAP.SAFE;
    const score = analysis.overallScore || 0;
    const signals = analysis.signals || [];

    // Get top 3 most critical signals
    const topSignals = [...signals]
      .sort((a, b) => {
        const order = { FAIL: 0, WARN: 1, PASS: 2 };
        return (order[a.status] || 2) - (order[b.status] || 2);
      })
      .slice(0, 3);

    const badgeId = BADGE_ID_PREFIX + scanCounter;

    // Remove any existing badge
    const existingBadge = document.getElementById(badgeId);
    if (existingBadge) existingBadge.remove();

    const badge = document.createElement("div");
    badge.id = badgeId;
    badge.className = "phishfilter-badge " + config.cssClass;

    // Build badge HTML
    let signalsHtml = "";
    if (topSignals.length > 0) {
      signalsHtml = '<ul class="phishfilter-signals">';
      topSignals.forEach((s) => {
        const icon = s.status === "FAIL" ? "✗" : s.status === "WARN" ? "⚠" : "✓";
        signalsHtml += `
          <li>
            <span class="signal-icon">${icon}</span>
            <span class="signal-text"><strong>${s.check}:</strong> ${s.detail}</span>
          </li>`;
      });
      signalsHtml += "</ul>";
    }

    badge.innerHTML = `
      <div class="phishfilter-badge-header">
        <span class="verdict-icon">${config.icon}</span>
        <span class="verdict-text">${config.label}</span>
        <span class="verdict-score">${score}/100</span>
      </div>
      ${signalsHtml}
      <div class="phishfilter-badge-actions">
        <a href="${API_BASE}" target="_blank" rel="noopener noreferrer">
          🔍 View Full Report
        </a>
        <button class="dismiss-btn" title="Dismiss">✕ Dismiss</button>
      </div>
    `;

    // Dismiss handler
    badge.querySelector(".dismiss-btn").addEventListener("click", () => {
      badge.style.animation = "none";
      badge.style.transition = "all 0.25s ease";
      badge.style.opacity = "0";
      badge.style.transform = "translateY(-8px)";
      setTimeout(() => badge.remove(), 250);
    });

    // Insert badge above the email body
    emailContainer.parentNode.insertBefore(badge, emailContainer);

    return badge;
  }

  // ── Handle: Scan Action ──────────────────────────────────────────────

  async function handleScan(emailContainer, btn) {
    showLoadingState(btn);

    try {
      // Extract email content
      const emailContent = extractEmailContent(emailContainer);

      // Get notification preferences
      const prefs = await getNotifyPrefs();

      // Call PhishFilter API
      const response = await fetch(API_BASE + "/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailContent,
          userEmail: prefs.userEmail,
          userPhone: prefs.userPhone,
        }),
      });

      if (!response.ok) {
        throw new Error("API returned " + response.status);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      // Clear loading state
      const loadingEl = document.getElementById("phishfilter-loading-status");
      if (loadingEl) {
        clearInterval(Number(loadingEl.dataset.intervalId));
        loadingEl.remove();
      }

      // Reset button
      btn.disabled = false;
      btn.innerHTML = '<span class="phishfilter-icon">🛡️</span> Re-scan';

      // Show result badge
      createResultBadge(result, emailContainer);

      // Store result in history
      await storeScanResult(result);

    } catch (error) {
      console.error("[PhishFilter] Scan failed:", error);

      // Clear loading
      const loadingEl = document.getElementById("phishfilter-loading-status");
      if (loadingEl) {
        clearInterval(Number(loadingEl.dataset.intervalId));
        loadingEl.remove();
      }

      // Reset button with error state
      btn.disabled = false;
      btn.innerHTML = '<span class="phishfilter-icon">⚠️</span> Scan Failed — Retry';
      btn.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";

      // Reset button style after 3 seconds
      setTimeout(() => {
        btn.style.background = "";
        btn.innerHTML = '<span class="phishfilter-icon">🛡️</span> Scan with PhishFilter';
      }, 3000);
    }
  }

  // ── Inject: Button into Gmail email ──────────────────────────────────

  function injectScanButton(emailContainer) {
    if (processedEmails.has(emailContainer)) return;
    processedEmails.add(emailContainer);

    // Find the action bar area above the email body
    // Gmail uses .ade for the email action toolbar
    const emailParent = emailContainer.closest(".h7") ||
                        emailContainer.closest(".gs") ||
                        emailContainer.parentElement;

    if (!emailParent) return;

    // Check if button already exists in this parent
    if (emailParent.querySelector(".phishfilter-scan-btn")) return;

    const btn = createScanButton(emailContainer);

    // Try to insert near the email actions (reply, forward, etc.)
    const actionsBar = emailParent.querySelector(".amn") || // Gmail action bar
                       emailParent.querySelector('[role="toolbar"]');

    if (actionsBar) {
      actionsBar.appendChild(btn);
    } else {
      // Fallback: insert just above the email body
      emailContainer.parentNode.insertBefore(btn, emailContainer);
    }
  }

  // ── Observer: Watch for Gmail email opens ────────────────────────────

  function scanForEmails() {
    // Gmail email body container selector
    const emailBodies = document.querySelectorAll(".a3s.aiL");

    emailBodies.forEach((emailContainer) => {
      injectScanButton(emailContainer);
    });
  }

  // Initial scan
  scanForEmails();

  // Watch for dynamic Gmail navigation (email opens, thread expansion)
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }

    if (shouldScan) {
      // Debounce — Gmail does a lot of DOM updates
      clearTimeout(observer._debounceTimer);
      observer._debounceTimer = setTimeout(scanForEmails, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // ── Message Listener: Communication with popup ───────────────────────

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "scanCurrentEmail") {
      const emailContainer = document.querySelector(".a3s.aiL");
      if (emailContainer) {
        // Find or create the scan button
        let btn = emailContainer.closest(".gs")?.querySelector(".phishfilter-scan-btn") ||
                  emailContainer.parentElement?.querySelector(".phishfilter-scan-btn");

        if (!btn) {
          injectScanButton(emailContainer);
          btn = emailContainer.parentElement?.querySelector(".phishfilter-scan-btn");
        }

        if (btn) {
          btn.click();
          sendResponse({ success: true, message: "Scan initiated" });
        } else {
          sendResponse({ success: false, message: "Could not find scan button" });
        }
      } else {
        sendResponse({ success: false, message: "No email is currently open" });
      }
    }

    return true; // Keep the message channel open for async response
  });

  console.log("[PhishFilter] Content script loaded — watching for emails");
})();
