/* ═══════════════════════════════════════════════════════════════════════
 * PhishFilter — popup.js
 *
 * Controls the extension popup:
 *  - Scan current email via content script
 *  - Display scan history from chrome.storage
 *  - Manage notification settings
 * ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM Elements ─────────────────────────────────────────────────────

  const scanBtn = document.getElementById("scanCurrentBtn");
  const scanStatus = document.getElementById("scanStatus");
  const historyList = document.getElementById("historyList");
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsArrow = document.getElementById("settingsArrow");
  const settingsForm = document.getElementById("settingsForm");
  const userEmailInput = document.getElementById("userEmail");
  const userPhoneInput = document.getElementById("userPhone");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");

  // ── Verdict Config ───────────────────────────────────────────────────

  const VERDICT_CLASS = {
    HIGH_RISK: "high-risk",
    MEDIUM_RISK: "medium-risk",
    SAFE: "safe",
  };

  const VERDICT_LABEL = {
    HIGH_RISK: "High Risk",
    MEDIUM_RISK: "Suspicious",
    SAFE: "Safe",
  };

  // ── Load Scan History ────────────────────────────────────────────────

  function loadHistory() {
    chrome.storage.local.get(["scanHistory"], (data) => {
      const history = data.scanHistory || [];

      if (history.length === 0) {
        historyList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            No scans yet — open an email and click scan
          </div>
        `;
        return;
      }

      historyList.innerHTML = "";

      history.forEach((item) => {
        const verdictClass = VERDICT_CLASS[item.verdict] || "safe";
        const verdictLabel = VERDICT_LABEL[item.verdict] || "Unknown";
        const timeAgo = getTimeAgo(item.timestamp);

        const el = document.createElement("div");
        el.className = "history-item";
        el.innerHTML = `
          <div class="history-verdict ${verdictClass}"></div>
          <div class="history-info">
            <div class="history-subject">${escapeHtml(item.subject)}</div>
            <div class="history-meta">${escapeHtml(item.from)} · ${timeAgo}</div>
          </div>
          <div class="history-score ${verdictClass}">${item.score}</div>
        `;

        historyList.appendChild(el);
      });
    });
  }

  // ── Load Settings ────────────────────────────────────────────────────

  function loadSettings() {
    chrome.storage.local.get(["userEmail", "userPhone"], (data) => {
      if (data.userEmail) userEmailInput.value = data.userEmail;
      if (data.userPhone) userPhoneInput.value = data.userPhone;
    });
  }

  // ── Save Settings ────────────────────────────────────────────────────

  function saveSettings() {
    const email = userEmailInput.value.trim();
    const phone = userPhoneInput.value.trim();

    chrome.storage.local.set(
      {
        userEmail: email || "",
        userPhone: phone || "",
      },
      () => {
        saveSettingsBtn.textContent = "✓ Saved";
        saveSettingsBtn.classList.add("saved");

        setTimeout(() => {
          saveSettingsBtn.textContent = "Save Settings";
          saveSettingsBtn.classList.remove("saved");
        }, 2000);
      }
    );
  }

  // ── Scan Current Email ───────────────────────────────────────────────

  async function scanCurrentEmail() {
    scanBtn.disabled = true;
    scanBtn.innerHTML = '<span class="icon">⏳</span> Scanning...';
    scanStatus.textContent = "";
    scanStatus.className = "scan-status";

    try {
      // Get the active Gmail tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url || !tab.url.includes("mail.google.com")) {
        throw new Error("Please open Gmail first");
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "scanCurrentEmail",
      });

      if (response && response.success) {
        scanStatus.textContent = "✓ Scan initiated — check your email";
        scanStatus.className = "scan-status success";
      } else {
        throw new Error(response?.message || "No email is currently open");
      }
    } catch (error) {
      scanStatus.textContent = error.message || "Scan failed";
      scanStatus.className = "scan-status error";
    } finally {
      scanBtn.disabled = false;
      scanBtn.innerHTML = '<span class="icon">🛡️</span> Scan Current Email';

      // Refresh history after a delay (to catch the new result)
      setTimeout(loadHistory, 3000);
    }
  }

  // ── Toggle Settings ──────────────────────────────────────────────────

  function toggleSettings() {
    const isOpen = settingsForm.classList.contains("open");
    settingsForm.classList.toggle("open");
    settingsArrow.classList.toggle("open");
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  function getTimeAgo(timestamp) {
    if (!timestamp) return "Unknown";

    const now = new Date();
    const then = new Date(timestamp);
    const diff = now - then;

    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return mins + "m ago";
    if (hours < 24) return hours + "h ago";
    if (days < 7) return days + "d ago";
    return then.toLocaleDateString();
  }

  // ── Event Listeners ──────────────────────────────────────────────────

  scanBtn.addEventListener("click", scanCurrentEmail);
  settingsToggle.addEventListener("click", toggleSettings);
  saveSettingsBtn.addEventListener("click", saveSettings);

  // ── Initialize ───────────────────────────────────────────────────────

  loadHistory();
  loadSettings();
})();
