"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import ScanPageStyles from "@/components/ScanPageStyles";
import InboxScanner from "@/components/InboxScanner";
import EmailWatchdog from "@/components/EmailWatchdog";
import LinkSandbox from "@/components/LinkSandbox";

export default function ScanPage() {
  const [activeTab, setActiveTab] = useState<"paste" | "inbox" | "watchdog" | "sandbox">("paste");
  const [demoMode, setDemoMode] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [notify, setNotify] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  
  // Inbox states
  const [inboxEmail, setInboxEmail] = useState("");
  const [inboxPhone, setInboxPhone] = useState("");
  const [isConnectingInbox, setIsConnectingInbox] = useState(false);
  const [isActivatingWatchdog, setIsActivatingWatchdog] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Typewriter placeholder state
  const [placeholder, setPlaceholder] = useState("");
  const fullPlaceholder = "Paste your suspicious email here — headers, body, everything...";
  const placeholderRef = useRef(0);

  // For cursor glow
  const cursorRef = useRef<HTMLDivElement>(null);
  const targetCursor = useRef({ x: 0, y: 0 });
  const currentCursor = useRef({ x: 0, y: 0 });

  // Tab change handler
  const handleTabChange = (tab: "paste" | "inbox" | "watchdog" | "sandbox") => {
    setActiveTab(tab);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEmailContent(val);
    setCharCount(val.length);
  };

  const handleInboxConnect = async () => {
    if (!inboxEmail.trim()) {
      toast.error("Please enter your email address for IMAP.");
      return;
    }
    setIsConnectingInbox(true);
    const connectToast = toast.loading("Establishing secure IMAP connection...");
    
    // Simulate connection delay
    setTimeout(() => {
      setIsConnectingInbox(false);
      toast.success("Inbox connected securely! Auto-scan active.", { id: connectToast });
    }, 2500);
  };

  const handleWatchdogActivate = async () => {
    setIsActivatingWatchdog(true);
    const watchdogToast = toast.loading("Initializing real-time Watchdog agent...");
    
    // Simulate connection delay
    setTimeout(() => {
      setIsActivatingWatchdog(false);
      toast.success("Watchdog is now active and monitoring your inbox.", { id: watchdogToast });
    }, 2500);
  };

  const router = useRouter();

  const handleScan = async () => {
    if (!emailContent.trim()) {
      toast.error("Please paste an email to scan.");
      return;
    }
    
    setIsScanning(true);
    document.body.style.overflow = "auto";

    // Store the email content so the loading page can fire the API call
    try {
      sessionStorage.setItem("phishfilter_email_to_scan", emailContent);
      
      // Store notification preferences if enabled
      if (notify) {
        if (notifyEmail.trim()) sessionStorage.setItem("phishfilter_notify_email", notifyEmail.trim());
        if (notifyPhone.trim()) sessionStorage.setItem("phishfilter_notify_phone", notifyPhone.trim());
      }

      // Verify storage worked
      const stored = sessionStorage.getItem("phishfilter_email_to_scan");
      if (!stored) {
        toast.error("Failed to store email. Try disabling private/incognito mode.");
        setIsScanning(false);
        return;
      }
    } catch (e) {
      toast.error("sessionStorage is blocked. Please disable private browsing.");
      setIsScanning(false);
      return;
    }
    
    // Navigate to the loading page (client-side to preserve sessionStorage)
    router.push("/scan/loading");
  };

  useEffect(() => {
    // Lock body scroll
    document.body.style.overflow = "hidden";
    
    // Ambient Cursor Glow animation loop (lerp)
    const renderLoop = () => {
      currentCursor.current.x += (targetCursor.current.x - currentCursor.current.x) * 0.12;
      currentCursor.current.y += (targetCursor.current.y - currentCursor.current.y) * 0.12;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${currentCursor.current.x - 100}px, ${currentCursor.current.y - 100}px)`;
      }
      requestAnimationFrame(renderLoop);
    };
    const reqId = requestAnimationFrame(renderLoop);

    const onMouseMove = (e: MouseEvent) => {
      targetCursor.current.x = e.clientX;
      targetCursor.current.y = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    // Document title toggle
    const titleInterval = setInterval(() => {
      document.title = document.title === "🛡️ PhishFilter" ? "⚡ Scan Ready" : "🛡️ PhishFilter";
    }, 3000);

    // Typewriter effect for placeholder
    const typePlaceholder = () => {
      if (placeholderRef.current < fullPlaceholder.length) {
        setPlaceholder(fullPlaceholder.slice(0, placeholderRef.current + 1));
        placeholderRef.current++;
        setTimeout(typePlaceholder, 40);
      }
    };
    // Delay placeholder typing
    const typingTimer = setTimeout(typePlaceholder, 1200);

    // ⌘+Enter shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        handleScan();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "auto";
      cancelAnimationFrame(reqId);
      window.removeEventListener("mousemove", onMouseMove);
      clearInterval(titleInterval);
      clearTimeout(typingTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.title = "PhishFilter";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Particle Field ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let mouse = { x: -999, y: -999 };
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener("mousemove", onMove);
    const COUNT = 400;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.8;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
        p.vx *= 0.98; p.vy *= 0.98;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,220,230,${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMove); };
  }, []);

  return (
    <div className="scan-layout page-booting" suppressHydrationWarning>
      <ScanPageStyles />

      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", filter: "blur(0px)", opacity: 0.8 }} />

      {/* ═══ AMBIENT EFFECTS ═══ */}
      <div className="scanline-overlay"></div>
      <div className="vignette-overlay"></div>
      <div className="cursor-glow" ref={cursorRef}></div>



      {/* ═══ ZONE 1: NAVBAR ═══ */}
      <nav className="scan-navbar scan-anim-nav">
        <Link href="/" className="scan-logo logo-glitch">
          <span className="scan-logo-phish">Phish</span>
          <span className="scan-logo-filter">Filter</span>
        </Link>
        <div className="scan-nav-right">
          <Link href="/#how">How it works</Link>
          <Link href="/#capabilities">Features</Link>
          <button className="scan-live-btn" onClick={() => setDemoMode(!demoMode)}>
            <span className={`scan-live-dot ${demoMode ? 'demo' : ''}`}></span>
            {demoMode ? "Demo" : "Live"}
          </button>
        </div>
      </nav>

      {/* ═══ ZONE 2: HEADER ═══ */}
      <header className="scan-header">
        <Link href="/" className="scan-back scan-anim-back">
          <span className="arrow">←</span> Back to home
        </Link>
        <div className="scan-label scan-anim-label">SCANNER</div>
        <h1 className="scan-headline">
          <span className="word-wrap"><span className="word" style={{ animationDelay: "300ms" }}>Choose</span></span>
          <span className="word-wrap"><span className="word" style={{ animationDelay: "380ms" }}>your</span></span>
          <span className="word-wrap"><span className="word" style={{ animationDelay: "460ms" }}>scan</span></span>
          <span className="word-wrap"><span className="word" style={{ animationDelay: "540ms" }}>mode.</span></span>
        </h1>
        <p className="scan-subtitle scan-anim-subtitle">Paste an email, connect your inbox, or activate real-time monitoring.</p>
      </header>

      {/* ═══ ZONE 3: MAIN PANEL ═══ */}
      <main className="scan-main-panel">
        
        {/* TABS ROW */}
        <nav className="scan-tabs scan-anim-sidebar">
          <button className={`sidebar-btn ${activeTab === 'paste' ? 'active' : ''}`} onClick={() => handleTabChange('paste')}>
            <span className="btn-icon">📋</span>
            <div className="btn-text">
              <div className="btn-title">Paste Email</div>
              <div className="btn-sub">Raw email source</div>
            </div>
          </button>
          
          <button className={`sidebar-btn ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => handleTabChange('inbox')}>
            <span className="btn-icon">📬</span>
            <div className="btn-text">
              <div className="btn-title">Inbox Scanner</div>
              <div className="btn-sub">Connect via IMAP</div>
            </div>
          </button>
          
          <button className={`sidebar-btn ${activeTab === 'watchdog' ? 'active' : ''}`} onClick={() => handleTabChange('watchdog')}>
            <span className="btn-icon">👁️</span>
            <div className="btn-text">
              <div className="btn-title">Watchdog <span className="watchdog-badge">LIVE<span className="radar-ring"></span></span></div>
              <div className="btn-sub">Real-time monitoring</div>
            </div>
          </button>
          <button className={`sidebar-btn ${activeTab === 'sandbox' ? 'active' : ''}`} onClick={() => handleTabChange('sandbox')}>
            <span className="btn-icon">🔗</span>
            <div className="btn-text">
              <div className="btn-title">Link Sandbox</div>
              <div className="btn-sub">Safe URL checker</div>
            </div>
          </button>
        </nav>

        {/* RIGHT CONTENT AREA */}
        <section className="scan-content-area scan-anim-content">
          <AnimatePresence mode="wait">
            
            {/* PANEL 1: PASTE EMAIL */}
            {activeTab === 'paste' && (
              <motion.div key="paste" className="panel-paste" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }} transition={{ duration: 0.25, delay: 0.15 }}>
                <div className="paste-card">
                  <div className="paste-header anim-paste-header">
                    <div className="paste-header-left">
                      <svg className="envelope-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <span className="title typewriter-title">
                        {"Email Analysis".split('').map((char, i) => (
                          <span key={i} className="type-char" style={{ animationDelay: `${800 + (i * 30)}ms` }}>{char === " " ? "\u00A0" : char}</span>
                        ))}
                      </span>
                      <span className="sub">Paste raw email source including headers</span>
                    </div>
                    <div className="paste-header-right">
                      <span className={`char-counter ${charCount > 0 ? 'pop' : ''}`} style={{ color: charCount >= 500 ? 'rgba(34,197,94,0.8)' : charCount >= 200 ? 'rgba(234,179,8,0.8)' : 'rgba(255,255,255,0.25)' }}>
                        {charCount} chars
                      </span>
                    </div>
                  </div>

                  <textarea 
                    className="paste-textarea" 
                    placeholder={placeholder}
                    value={emailContent}
                    onChange={handleInput}
                  />

                  <div className="paste-attach">
                    <svg className="marching-ants" width="100%" height="100%" preserveAspectRatio="none"><rect width="100%" height="100%" rx="8" /></svg>
                    <div className="attach-content">
                      <span className="attach-icon">📎</span> Attach suspicious PDFs, images, or HTML files (optional)
                    </div>
                  </div>

                  <div className={`paste-notify-container ${notify ? 'expanded' : ''}`}>
                    <div className={`paste-notify ${notify ? 'notify-on' : ''}`}>
                      <div className="notify-left">
                        <span className={`bell-icon ${notify ? 'ringing' : ''}`}>🔔</span> Optional: Get notified about results
                      </div>
                      <div className={`notify-toggle ${notify ? 'on' : ''}`} onClick={() => setNotify(!notify)}>
                        <div className="toggle-thumb" />
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {notify && (
                        <motion.div 
                          className="notify-inputs"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="notify-input-group">
                            <input type="email" placeholder="Email Address" className="notify-input" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} />
                            <input type="tel" placeholder="Phone Number (WhatsApp)" className="notify-input" value={notifyPhone} onChange={(e) => setNotifyPhone(e.target.value)} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="paste-action anim-paste-action">
                    <div className="action-hint">
                      ⌘ + <kbd className="kbd-hint">Enter</kbd> to scan
                    </div>
                    <button className={`btn-scan btn-hero ${isScanning ? 'scanning' : ''}`} onClick={handleScan}>
                      {!isScanning ? (
                        <>
                          <svg className="shield-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          </svg>
                          Scan Email
                        </>
                      ) : (
                        <>
                          <div className="spinner-ring" />
                          Scanning...
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PANEL 2: INBOX — Full InboxScanner Component */}
            {activeTab === 'inbox' && (
              <motion.div key="inbox" className="panel-inbox-full" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }} transition={{ duration: 0.25, delay: 0.15 }} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                <InboxScanner />
              </motion.div>
            )}

            {/* PANEL 3: WATCHDOG — Animation + Full EmailWatchdog Component */}
            {activeTab === 'watchdog' && (
              <motion.div key="watchdog" className="panel-inbox-full" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }} transition={{ duration: 0.25, delay: 0.15 }} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                <div className="flex justify-center pt-12 lg:pt-20">
                  <div className="w-full">
                    <EmailWatchdog />
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* PANEL 4: LINK SANDBOX — Safe URL Checker */}
            {activeTab === 'sandbox' && (
              <motion.div key="sandbox" className="panel-inbox-full" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }} transition={{ duration: 0.25, delay: 0.15 }} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                <div className="pt-8 lg:pt-12">
                  <LinkSandbox />
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
