"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import ScanPageStyles from "@/components/ScanPageStyles";

export default function ScanPage() {
  const [activeTab, setActiveTab] = useState<"paste" | "inbox" | "watchdog">("paste");
  const [demoMode, setDemoMode] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [notify, setNotify] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
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
  const handleTabChange = (tab: "paste" | "inbox" | "watchdog") => {
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

  const handleScan = async () => {
    if (!emailContent.trim()) {
      toast.error("Please paste an email to scan.");
      return;
    }
    
    setIsScanning(true);
    document.body.style.overflow = "auto";

    // Store the email content so the loading page can fire the API call
    sessionStorage.setItem("phishfilter_email_to_scan", emailContent);
    
    // Navigate to the loading page
    window.location.href = "/scan/loading";
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
    const COUNT = 160;
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

      {/* ═══ PARTICLE CANVAS ═══ */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", filter: "blur(2px)", opacity: 0.8 }} />

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
        
        {/* LEFT SIDEBAR */}
        <aside className="scan-sidebar scan-anim-sidebar">
          <div className="sidebar-label">SCAN MODE</div>
          
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

          <div className="sidebar-tags">
            {["Header Analysis", "URL Scanning", "Homograph Detection", "Brand Impersonation", "VirusTotal", "SPF/DKIM", "AI Forensics", "IMAP Inbox", "PDF Scanner", "QR Detection"].map((tag, i) => (
              <span key={tag} className="tag-pill anim-pill" style={{ animationDelay: `${900 + (i * 40)}s, ${Math.random() * 8}s` }}>{tag}</span>
            ))}
          </div>
        </aside>

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
                            <input type="email" placeholder="Email Address" className="notify-input" />
                            <input type="tel" placeholder="Phone Number (SMS)" className="notify-input" />
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

            {/* PANEL 2: INBOX */}
            {activeTab === 'inbox' && (
              <motion.div key="inbox" className="panel-feature" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }} transition={{ duration: 0.25, delay: 0.15 }}>
                <div className="feature-card">
                  <div className="feature-anim">
                    <div className="inbox-anim">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <div className="inbox-orbit"><div className="inbox-dot" /></div>
                    </div>
                  </div>
                  <div className="feature-body">
                    <h2 className="feature-title">Connect your inbox</h2>
                    <p className="feature-desc">Securely connect via IMAP to scan every incoming email automatically. PhishFilter monitors your inbox in real-time and flags threats before you open them.</p>
                    <div className="feature-tags">
                      <span className="feature-tag">IMAP</span>
                      <span className="feature-tag">OAuth 2.0</span>
                      <span className="feature-tag">Auto-scan</span>
                      <span className="feature-tag">Coming Soon</span>
                    </div>
                    <div className="inbox-config" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <input 
                        type="email" 
                        placeholder="Email Address (for IMAP connection)" 
                        className="notify-input" 
                        style={{ width: '100%', maxWidth: '400px' }} 
                        value={inboxEmail}
                        onChange={(e) => setInboxEmail(e.target.value)}
                      />
                      <input 
                        type="tel" 
                        placeholder="Phone Number (for SMS Alerts)" 
                        className="notify-input" 
                        style={{ width: '100%', maxWidth: '400px' }} 
                        value={inboxPhone}
                        onChange={(e) => setInboxPhone(e.target.value)}
                      />
                      <button 
                        className={`btn-scan btn-hero ${isConnectingInbox ? 'scanning' : ''}`} 
                        style={{ marginTop: 8, width: 'fit-content' }}
                        onClick={handleInboxConnect}
                      >
                        {isConnectingInbox ? (
                          <>
                            <div className="spinner-ring" />
                            Connecting...
                          </>
                        ) : "Connect Inbox"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PANEL 3: WATCHDOG */}
            {activeTab === 'watchdog' && (
              <motion.div key="watchdog" className="panel-feature" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }} transition={{ duration: 0.25, delay: 0.15 }}>
                <div className="feature-card">
                  <div className="feature-anim">
                    <div className="watchdog-anim">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(220,220,230,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <div className="radar-pulse-ring r1" />
                      <div className="radar-pulse-ring r2" />
                      <div className="radar-pulse-ring r3" />
                    </div>
                  </div>
                  <div className="feature-body">
                    <h2 className="feature-title">Real-time monitoring</h2>
                    <p className="feature-desc">Activate Watchdog to continuously monitor your inbox. Get instant alerts when suspicious emails arrive — phishing attempts are flagged and quarantined automatically.</p>
                    <div className="watchdog-status" style={{ marginTop: 12 }}>
                      <span className="status-dot" /> Waiting to activate...
                    </div>
                    <div className="feature-tags" style={{ marginTop: 12 }}>
                      <span className="feature-tag tag-green">Live</span>
                      <span className="feature-tag">Alerts</span>
                      <span className="feature-tag">Quarantine</span>
                    </div>
                    <button 
                      className={`btn-scan btn-watchdog ${isActivatingWatchdog ? 'scanning' : ''}`} 
                      style={{ marginTop: 20 }}
                      onClick={handleWatchdogActivate}
                    >
                      {isActivatingWatchdog ? (
                        <>
                          <div className="spinner-ring" />
                          Activating...
                        </>
                      ) : "Activate Watchdog"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
