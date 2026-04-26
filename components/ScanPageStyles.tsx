"use client";

export default function ScanPageStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      /* ═══ OVERALL LAYOUT ═══ */
      html, body {
        height: 100%; overflow: hidden; background: #0a0a0a; margin: 0; padding: 0;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .scan-layout {
        display: flex; flex-direction: column; height: 100vh;
        background: #0a0a0a; position: relative; overflow: hidden;
      }

      /* ═══ AMBIENT EFFECTS ═══ */
      .scanline-overlay {
        position: fixed; inset: 0; z-index: 100; pointer-events: none; opacity: 0.4;
        background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
      }
      .vignette-overlay {
        position: fixed; inset: 0; z-index: 1; pointer-events: none;
        background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
      }
      .cursor-glow {
        position: fixed; top: 0; left: 0; width: 200px; height: 200px;
        background: radial-gradient(100px circle, rgba(220,220,230,0.04), transparent);
        pointer-events: none; z-index: 0; border-radius: 50%;
        will-change: transform;
      }

      /* ═══ BACKGROUND CIRCUIT ═══ */
      .circuit-bg { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; opacity: 0.06; }
      .circuit-line { stroke: rgba(220,220,230,0.7); stroke-width: 0.5; }
      .circuit-node { fill: rgba(220,220,230,0.7); animation: nodePulse ease infinite; }
      .circuit-node-ripple { fill: none; stroke: rgba(220,220,230,0.7); stroke-width: 0.5; animation: nodeRipple ease-out infinite; opacity: 0; }
      .circuit-pad { stroke: rgba(220,220,230,0.7); stroke-width: 1; fill: none; }
      .circuit-chip { stroke: rgba(220,220,230,0.7); stroke-width: 0.8; fill: none; }
      
      .circuit-trace { stroke: rgba(220,220,230,0.7); stroke-width: 0.8; fill: none; stroke-dasharray: 200; stroke-dashoffset: 200; opacity: 0; }
      .draw-trace-1 { animation: traceBoot 800ms ease-in-out forwards; animation-delay: 200ms; }
      .draw-trace-2 { animation: traceBoot 800ms ease-in-out forwards; animation-delay: 600ms; }
      .draw-trace-3 { animation: traceBoot 800ms ease-in-out forwards; animation-delay: 1000ms; }

      @keyframes nodePulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      @keyframes nodeRipple { 0% { r: 2.5; opacity: 0.4; } 100% { r: 10; opacity: 0; } }
      @keyframes traceBoot { 0% { stroke-dashoffset: 200; opacity: 0; } 10% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 1; } }

      /* ═══ PAGE ENTRANCE ANIMATIONS ═══ */
      .scan-anim-nav { animation: navSlideDown 400ms ease-out forwards; }
      .scan-anim-back { opacity: 0; animation: backFadeIn 350ms ease-out 100ms forwards; }
      .scan-anim-label { opacity: 0; animation: labelFadeIn 500ms ease-out 200ms forwards; }
      .word-wrap { display: inline-block; overflow: hidden; vertical-align: bottom; margin-right: 0.25em; }
      .word { 
        display: inline-block; transform: translateY(110%); opacity: 0; 
        animation: wordReveal 600ms cubic-bezier(0.16,1,0.3,1) forwards; 
        background: linear-gradient(90deg, #fff, rgba(255,255,255,0.65));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .scan-anim-subtitle { opacity: 0; animation: subFadeIn 400ms ease-out 500ms forwards; }
      .scan-anim-sidebar { opacity: 0; animation: sidebarSlide 500ms ease-out 650ms forwards; }
      .scan-anim-content { opacity: 0; animation: contentSlide 500ms ease-out 750ms forwards; }

      @keyframes navSlideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes backFadeIn { from { transform: translateX(-16px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes labelFadeIn { from { letter-spacing: 0.05em; opacity: 0; } to { letter-spacing: 0.2em; opacity: 1; } }
      @keyframes wordReveal { from { transform: translateY(110%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes subFadeIn { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes sidebarSlide { from { transform: translateX(-24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes contentSlide { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

      /* ═══ ZONE 1: NAVBAR ═══ */
      .scan-navbar {
        height: 52px; flex-shrink: 0; background: rgba(10,10,10,0.9);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 220px;
        display: flex; align-items: center; justify-content: space-between; z-index: 10; position: relative;
      }
      .scan-logo { text-decoration: none; display: flex; align-items: center; gap: 4px; font-size: 18px; }
      .scan-logo-phish { font-family: 'Playfair Display', Georgia, serif; font-style: italic; color: #fff; transition: 0.2s; }
      .logo-glitch:hover .scan-logo-phish { animation: textGlitch 200ms ease-in-out; }
      @keyframes textGlitch { 0%,100%{color:#fff} 33%{color:rgba(220,220,230,1)} 66%{color:#fff} }
      .scan-logo-filter { font-weight: 700; color: rgba(255,255,255,0.5); }
      .scan-nav-right { display: flex; align-items: center; gap: 16px; }
      .scan-nav-right a { font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; transition: 0.2s; }
      .scan-nav-right a:hover { color: #fff; }
      .scan-live-btn {
        background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px;
        font-size: 13px; color: rgba(255,255,255,0.4); transition: 0.2s;
      }
      .scan-live-btn:hover { color: #fff; }
      .scan-live-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(220,220,230,0.7); animation: livePulse 2s infinite; }
      .scan-live-dot.demo { background: #eab308; }

      /* ═══ ZONE 2: HEADER ═══ */
      .scan-header { padding: 28px 80px 20px; flex-shrink: 0; position: relative; z-index: 2; border-bottom: none; display: flex; flex-direction: column; align-items: center; text-align: center; }
      .scan-back { position: absolute; left: 80px; top: 28px; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: rgba(255,255,255,0.3); text-decoration: none; margin-bottom: 16px; transition: 0.2s; }
      .scan-back .arrow { transition: transform 0.2s ease; }
      .scan-back:hover { color: rgba(255,255,255,0.65); }
      .scan-back:hover .arrow { transform: translateX(-4px); }
      .scan-label { font-size: 10px; letter-spacing: 0.2em; color: rgba(255,255,255,0.3); margin-bottom: 8px; font-weight: 600; transition: letter-spacing 300ms ease; cursor: default; }
      .scan-label:hover { letter-spacing: 0.3em; }
      .scan-headline {
        font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-weight: 700;
        font-size: clamp(28px, 3.5vw, 46px); margin: 0;
        color: #fff;
      }
      .scan-subtitle { font-size: 14px; color: rgba(255,255,255,0.4); margin: 8px 0 0 0; line-height: 1.5; }

      /* ═══ ZONE 3: MAIN PANEL ═══ */
      .scan-main-panel { flex: 1; overflow: hidden; display: flex; flex-direction: column; align-items: center; z-index: 2; position: relative; padding: 0 80px; }

      /* ── Tabs (formerly Sidebar) ── */
      .scan-tabs { display: flex; flex-direction: row; justify-content: center; gap: 16px; width: 100%; max-width: 100%; padding: 12px 0 24px 0; }
      .sidebar-label { display: none; }
      .sidebar-btn {
        flex: 1; max-width: 280px; padding: 14px 16px; border-radius: 12px; border: 1px solid transparent;
        background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.45); cursor: pointer; text-align: left;
        display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s ease;
        border-color: rgba(255,255,255,0.06); position: relative; overflow: hidden;
      }
      .sidebar-btn::after {
        content: ''; position: absolute; left: 0; right: 0; height: 2px;
        background: rgba(255,255,255,0.06); transform: translateY(-100%);
      }
      .sidebar-btn:hover:not(.active)::after { animation: btnScanline 600ms ease; }
      @keyframes btnScanline { from { transform: translateY(-100%); } to { transform: translateY(5000%); } }

      .sidebar-btn .btn-icon { opacity: 0.5; font-size: 16px; transition: transform 400ms ease, opacity 200ms; }
      .sidebar-btn .btn-text { display: flex; flex-direction: column; gap: 2px; }
      .sidebar-btn .btn-title { font-size: 14px; font-weight: 500; }
      .sidebar-btn .btn-sub { font-size: 11px; color: rgba(255,255,255,0.3); transition: transform 200ms; }
      
      .sidebar-btn:hover:not(.active) { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
      .sidebar-btn:hover:not(.active) .btn-sub { transform: translateX(4px); }
      
      .sidebar-btn.active {
        background: rgba(220,220,230,0.08); color: #fff;
        border-color: rgba(220,220,230,0.25);
        box-shadow: inset 0 0 20px rgba(220,220,230,0.04), 0 0 0 1px rgba(220,220,230,0.2);
      }
      .sidebar-btn.active::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: rgba(220,220,230,0.6);
        transform-origin: top; animation: scaleYIn 300ms ease-out forwards;
      }
      @keyframes scaleYIn { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      .sidebar-btn.active .btn-icon { opacity: 1; transform: rotate(360deg); }

      .watchdog-badge {
        font-size: 9px; color: #22c55e; padding: 2px 5px; margin-left: 6px;
        animation: livePulseText 2s infinite; font-weight: 700; position: relative;
      }
      .radar-ring {
        position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
        width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(34,197,94,0.5);
        animation: radarPing 2s ease-out infinite; pointer-events: none;
      }
      @keyframes livePulseText { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.6; transform:scale(1.05)} }
      @keyframes radarPing { 0% { width: 10px; height: 10px; opacity: 1; } 100% { width: 30px; height: 30px; opacity: 0; } }

      /* Tags */
      .sidebar-tags { margin-top: auto; display: flex; flex-wrap: wrap; gap: 6px; padding-top: 24px; }
      .tag-pill {
        font-size: 10px; padding: 4px 8px; border-radius: 999px;
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.35);
        transition: all 0.2s; cursor: default;
      }
      .anim-pill { opacity: 0; transform: scale(0.8); animation: pillPop 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, shimmerCycle 8s linear infinite; }
      @keyframes pillPop { to { opacity: 1; transform: scale(1); } }
      @keyframes shimmerCycle { 0%, 95%, 100% { background: rgba(255,255,255,0.04); } 97% { background: rgba(220,220,230,0.15); border-color: rgba(220,220,230,0.4); } }
      .tag-pill:hover { border-color: rgba(220,220,230,0.4); background: rgba(220,220,230,0.06); transform: translateY(-2px); }

      /* ── Right Content Area ── */
      .scan-content-area { flex: 1; padding: 0 0 40px 0; display: flex; flex-direction: column; overflow-y: auto; width: 100%; max-width: 1100px; margin: 0 auto; }
      .panel-paste, .panel-placeholder { height: 100%; display: flex; flex-direction: column; }
      
      .panel-placeholder { align-items: center; justify-content: center; text-align: center; }
      .placeholder-icon { font-size: 48px; margin-bottom: 16px; }
      .placeholder-title { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 20px; color: #fff; margin: 0 0 8px 0; }
      .placeholder-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin: 0; }
      .watchdog-pulse { animation: pulse 3s infinite; }
      @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
      .watchdog-status { margin-top: 16px; font-size: 12px; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 8px; }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(220,220,230,0.7); animation: livePulse 2s infinite; }

      /* ═══ FEATURE CARDS (Inbox / Watchdog) ═══ */
      .panel-feature { height: 100%; display: flex; flex-direction: column; }
      .feature-card {
        flex: 1; display: flex; gap: 40px; align-items: center;
        background: rgba(17,17,17,0.6); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 14px; padding: 40px; position: relative; overflow: hidden;
      }
      .feature-card::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
        background: linear-gradient(180deg, transparent 0%, rgba(220,220,230,0.4) 40%, rgba(255,255,255,0.5) 60%, transparent 100%);
      }
      .feature-anim { flex-shrink: 0; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; position: relative; }
      .feature-body { flex: 1; }
      .feature-title { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 22px; color: #fff; margin: 0 0 12px; }
      .feature-desc { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.7; margin: 0; }
      .feature-tags { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
      .feature-tag { font-size: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em; }
      .feature-tag.tag-green { background: rgba(220,220,230,0.08); border-color: rgba(220,220,230,0.3); color: rgba(220,220,230,0.8); }

      /* Inbox animation: orbiting dot */
      .inbox-anim { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
      .inbox-orbit { position: absolute; inset: -10px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 50%; animation: orbitSpin 6s linear infinite; }
      .inbox-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(220,220,230,0.6); box-shadow: 0 0 8px rgba(220,220,230,0.4); position: absolute; top: -3px; left: 50%; margin-left: -3px; }
      @keyframes orbitSpin { to { transform: rotate(360deg); } }

      /* Watchdog animation: radar pulse */
      .watchdog-anim { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
      .radar-pulse-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(220,220,230,0.25); animation: radarExpand 3s ease-out infinite; }
      .radar-pulse-ring.r1 { width: 50px; height: 50px; animation-delay: 0s; }
      .radar-pulse-ring.r2 { width: 50px; height: 50px; animation-delay: 1s; }
      .radar-pulse-ring.r3 { width: 50px; height: 50px; animation-delay: 2s; }
      @keyframes radarExpand { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.5); opacity: 0; } }

      /* Paste Card */
      .paste-card {
        background: #111111; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
        display: flex; flex-direction: column; flex: 1; overflow: hidden; transition: 0.3s ease;
        position: relative;
      }
      .paste-card::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
        background: linear-gradient(180deg, transparent 0%, rgba(220,220,230,0.5) 40%, rgba(255,255,255,0.6) 60%, transparent 100%);
        background-size: 100% 200%;
        animation: borderTravel 3s ease infinite, scaleYIn 600ms ease-out 800ms forwards;
        transform-origin: top; transform: scaleY(0); z-index: 10;
      }
      @keyframes borderTravel { 0% { background-position: 0% 0% } 100% { background-position: 0% 200% } }

      .paste-card:focus-within {
        animation: cardPulse 600ms ease;
      }
      .paste-card:focus-within .paste-textarea { background-image: repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.04) 27px, rgba(255,255,255,0.04) 28px); }
      @keyframes cardPulse { 0% { box-shadow: 0 0 0 0 rgba(220,220,230,0); } 50% { box-shadow: 0 0 0 4px rgba(220,220,230,0.1); border-color: rgba(220,220,230,0.3); } 100% { box-shadow: 0 0 0 3px rgba(220,220,230,0.05); border-color: rgba(220,220,230,0.3); } }

      .paste-header { background: #161616; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; }
      .anim-paste-header { transform: translateY(-100%); animation: slideDownClip 400ms ease-out 750ms forwards; }
      @keyframes slideDownClip { from { transform: translateY(-100%); } to { transform: translateY(0); } }
      .envelope-icon { animation: bounceRot 500ms ease 1000ms forwards; transform-origin: center; }
      @keyframes bounceRot { 0% { transform: rotate(-8deg); } 50% { transform: rotate(4deg); } 100% { transform: rotate(0); } }

      .paste-header-left { display: flex; align-items: center; gap: 8px; }
      .paste-header-left .title { font-size: 13px; font-weight: 600; color: #fff; }
      .type-char { opacity: 0; animation: fadeChar 10ms forwards; }
      @keyframes fadeChar { to { opacity: 1; } }
      .paste-header-left .sub { font-size: 11px; color: rgba(255,255,255,0.3); margin-left: 4px; }
      .paste-header-right { font-size: 12px; font-family: monospace; }
      .char-counter { transition: color 300ms ease, transform 200ms; display: inline-block; }
      .char-counter.pop { animation: popScale 200ms ease; }
      @keyframes popScale { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }

      .paste-textarea {
        flex: 1; width: 100%; resize: none; background: transparent; border: none; outline: none; padding: 16px 18px;
        font-size: 13px; font-family: monospace; color: rgba(255,255,255,0.7); line-height: 1.7; caret-color: rgba(220,220,230,0.8);
        background-image: repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.025) 27px, rgba(255,255,255,0.025) 28px);
      }
      .paste-textarea::placeholder { color: rgba(255,255,255,0.18); }

      .paste-attach {
        position: relative; margin: 0 16px 10px; height: 38px; border-radius: 8px;
        font-size: 12px; color: rgba(255,255,255,0.28); transition: 0.2s; cursor: pointer;
      }
      .marching-ants { position: absolute; inset: 0; pointer-events: none; }
      .marching-ants rect { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 1.5; stroke-dasharray: 8 4; transition: 0.2s; }
      .attach-content { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px; }
      .attach-icon { transition: transform 0.2s; }
      .paste-attach:hover .marching-ants rect { stroke: rgba(220,220,230,0.35); stroke-dashoffset: 0; animation: march 2s linear infinite; }
      .paste-attach:hover { background: rgba(220,220,230,0.04); color: rgba(255,255,255,0.5); }
      .paste-attach:hover .attach-icon { transform: translateY(-2px); }
      @keyframes march { to { stroke-dashoffset: -100; } }

      .paste-notify-container { border-top: 1px solid rgba(255,255,255,0.06); transition: background 400ms; }
      .paste-notify-container.expanded { background: rgba(220,220,230,0.02); }
      .paste-notify { padding: 10px 18px; display: flex; justify-content: space-between; align-items: center; }
      .paste-notify.notify-on { background: rgba(34,197,94,0.04); }
      .notify-left { font-size: 12px; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 6px; }
      .bell-icon { display: inline-block; }
      .bell-icon.ringing { animation: bellShake 500ms ease; }
      @keyframes bellShake { 0%,100%{transform:rotate(0)} 20%{transform:rotate(-15deg)} 40%{transform:rotate(15deg)} 60%{transform:rotate(-10deg)} 80%{transform:rotate(10deg)} }
      
      .notify-inputs { overflow: hidden; }
      .notify-input-group { padding: 0 18px 16px; display: flex; gap: 12px; }
      .notify-input { 
        flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); 
        padding: 10px 14px; border-radius: 8px; font-size: 13px; color: rgba(255,255,255,0.8);
        transition: 0.2s;
      }
      .notify-input:focus { outline: none; border-color: rgba(220,220,230,0.3); background: rgba(0,0,0,0.4); }
      .notify-input::placeholder { color: rgba(255,255,255,0.2); }

      .notify-toggle { width: 36px; height: 20px; border-radius: 999px; background: rgba(255,255,255,0.1); cursor: pointer; transition: 0.2s; position: relative; }
      .notify-toggle.on { background: rgba(220,220,230,0.5); }
      .toggle-thumb { width: 16px; height: 16px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1); }
      .notify-toggle.on .toggle-thumb { transform: translateX(16px); }

      .paste-action { border-top: 1px solid rgba(255,255,255,0.07); background: #0f0f0f; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; }
      .anim-paste-action { transform: translateY(100%); animation: slideUpAction 400ms ease-out 900ms forwards; }
      @keyframes slideUpAction { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .action-hint { font-size: 11px; color: rgba(255,255,255,0.3); }
      .action-hint kbd { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; padding: 2px 7px; font-family: monospace; box-shadow: 0 2px 0 rgba(0,0,0,0.4); margin: 0 4px; display: inline-block; }
      .kbd-hint { animation: kbdBounce 300ms ease 1500ms; }
      @keyframes kbdBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }

      .btn-scan {
        height: 42px; padding: 0 24px; border-radius: 9px; color: #fff; font-size: 14px; font-weight: 600; border: none;
        display: flex; align-items: center; gap: 8px; cursor: pointer; position: relative; overflow: hidden; transition: 0.2s;
      }
      .btn-hero { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); animation: none; }
      @keyframes idleHue { 0%,100%{filter:hue-rotate(0deg)} 50%{filter:hue-rotate(20deg)} }
      .shield-icon { animation: shieldBreathe 3s infinite; transition: transform 300ms; }
      @keyframes shieldBreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      
      .btn-scan:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255,255,255,0.08); }
      .btn-scan:active { transform: scale(0.96); transition: 100ms; }
      .btn-scan:active::before {
        content: ''; position: absolute; inset: -2px; border: 2px solid rgba(220,220,230,0.4); border-radius: 12px;
        animation: clickRipple 500ms ease-out;
      }
      @keyframes clickRipple { from { transform: scale(0); opacity: 1; } to { transform: scale(3); opacity: 0; } }

      .btn-scan::after {
        content: ''; position: absolute; top: 0; left: -200%; width: 200%; height: 100%;
        background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
        transition: 0.5s ease;
      }
      .btn-scan:hover::after { left: 200%; }
      .btn-scan:hover .shield-icon { transform: rotate(-15deg); }
      
      .btn-scan.scanning { pointer-events: none; animation: pulseBrightness 1.5s infinite; }
      @keyframes pulseBrightness { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.2)} }
      .spinner-ring {
        width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);
        border-top-color: #fff; animation: spin 800ms linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .btn-watchdog { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); }
      .btn-watchdog:hover { background: rgba(255,255,255,0.12); box-shadow: 0 8px 20px rgba(255,255,255,0.06); }

      /* PREF REDUCED MOTION */
      @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }

      /* ═══ RESPONSIVE ═══ */
      @media (max-width: 1024px) {
        .scan-header { padding: 20px 40px; }
        .scan-back { left: 40px; top: 20px; }
        .scan-main-panel { padding: 0 40px; }
      }
      @media (max-width: 768px) {
        html, body { overflow: auto; height: auto; }
        .scan-layout { height: auto; display: block; overflow: auto; }
        .circuit-bg { opacity: 0.04; }
        .scan-header { padding: 20px 24px; align-items: flex-start; text-align: left; }
        .scan-back { position: relative; left: 0; top: 0; }
        .scan-navbar { padding: 0 24px; }
        .scan-main-panel { flex-direction: column; padding: 0 24px; align-items: stretch; }
        .scan-tabs { flex-direction: row; overflow-x: auto; white-space: nowrap; gap: 12px; justify-content: flex-start; padding: 16px 0; }
        .sidebar-btn { width: auto; flex-shrink: 0; padding: 10px 16px; flex: none; }
        .sidebar-btn .btn-sub { display: none; }
        .scan-content-area { padding: 24px 0; }
        .paste-card { height: 500px; }
        .paste-header-left .sub { display: none; }
      }
    `}} />
  );
}
