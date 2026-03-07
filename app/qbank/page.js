'use client'

import { useEffect } from 'react'
import './qbank.css'

export default function QBank() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/qbank-script.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script)
    }
  }, [])

  return (
    <>
  
      <nav>
        <a href="/" className="logo">
          <svg width="34" height="34" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="21" stroke="#0d0b08" strokeWidth="1.5"/>
            <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 30 Q22 36 34 30" stroke="#0d0b08" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
          </svg>
          <span className="logo-name">Vent</span>
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); history.back() }} className="nav-back">← Home</a>
        <div className="nav-label">Q-Bank</div>
      </nav>

      {/* LAUNCHER */}
      <div id="screen-launcher">
        <div className="launcher">
          <div className="l-eyebrow">Q-Bank</div>
          <h1 className="l-h1">Cases.<br/><em>No notes.</em></h1>
          <p className="l-sub">Clinical vignettes. Hard questions. Real reasoning required. Choose your system and go.</p>

          <div className="focus-banner" id="focus-banner" style={{display:'none'}}>
            <div className="focus-banner-text">
              <strong>Last session: weak areas detected</strong><br/>
              <span id="focus-topics-list"></span>
            </div>
            <button className="focus-banner-btn" onClick={() => window.launchFocusSession && window.launchFocusSession()}>Practice weak areas →</button>
            <button className="focus-banner-close" onClick={() => window.dismissFocusBanner && window.dismissFocusBanner()}>✕</button>
          </div>

          <div className="cfg">
            <div className="cfg-label">System</div>
            <div className="sys-grid">
              <button className="sys-btn on" data-sys="all" onClick={(e) => window.pickSys && window.pickSys(e.currentTarget, 'all')}>
                <div className="sn">Everything</div>
                <div className="ss" id="sc-all">— questions</div>
              </button>
              <button className="sys-btn" data-sys="obgyn" onClick={(e) => window.pickSys && window.pickSys(e.currentTarget, 'obgyn')}>
                <div className="sn">OB / GYN</div>
                <div className="ss" id="sc-obgyn">— questions</div>
              </button>
              <button className="sys-btn" data-sys="ophtho" onClick={(e) => window.pickSys && window.pickSys(e.currentTarget, 'ophtho')}>
                <div className="sn">Ophthalmology</div>
                <div className="ss" id="sc-ophtho">— questions</div>
              </button>
              <div className="sys-btn soon">
                <div className="sn">Internal Med</div>
                <div className="ss">Coming soon</div>
              </div>
              <div className="sys-btn soon">
                <div className="sn">Surgery</div>
                <div className="ss">Coming soon</div>
              </div>
              <div className="sys-btn soon">
                <div className="sn">Neurology</div>
                <div className="ss">Coming soon</div>
              </div>
              <div className="sys-btn soon">
                <div className="sn">Paediatrics</div>
                <div className="ss">Coming soon</div>
              </div>
            </div>
          </div>

          <div className="cfg">
            <div className="cfg-label">Questions</div>
            <div className="count-row">
              <input type="number" id="count-input" className="count-input" defaultValue="10" min="5" max="40"
                onChange={() => window.clampCount && window.clampCount()}
                onInput={() => window.updateSummary && window.updateSummary()}
              />
              <div className="count-note">questions per session<br/>minimum 5</div>
            </div>
          </div>

          <div className="cfg">
            <div className="cfg-label">Mode</div>
            <div className="mode-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <button className="mode-btn on" onClick={(e) => window.pickMode && window.pickMode(e.currentTarget, 'normal')}>
                <div className="mn">Normal</div>
                <div className="md">Answer, get immediate feedback, move on.</div>
              </button>
              <button className="mode-btn" onClick={(e) => window.pickMode && window.pickMode(e.currentTarget, 'exam')}>
                <div className="mn">Exam</div>
                <div className="md">No feedback until the session ends.</div>
              </button>
            </div>
          </div>

          <div className="launch-row">
            <div className="launch-summary" id="launch-summary"></div>
            <button className="launch-btn" onClick={() => window.launch && window.launch()}>
              Begin <span className="launch-arr">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* SESSION */}
      <div id="screen-session">
        <div className="mobile-progress" id="mobile-progress">
          <div className="mob-prog-bar"><div className="mob-prog-fill" id="mob-prog-fill" style={{width:'0%'}}></div></div>
          <span className="mob-prog-txt" id="mob-prog-txt">Q1 / —</span>
          <span className="mob-prog-mode" id="mob-prog-mode">Normal</span>
          <button style={{background:'none',border:'none',fontFamily:"'JetBrains Mono',monospace",fontSize:'10px',color:'var(--ink4)',cursor:'pointer',padding:'0 0 0 8px'}} onClick={() => window.exitSession && window.exitSession()}>✕</button>
        </div>
        <div className="session">
          <div className="sidebar" id="sidebar">
            <div className="sb-head">
              <span className="sb-head-label">Questions</span>
              <span className="sb-head-count" id="sb-head-count">0 / —</span>
            </div>
            <div className="sb-bar"><div className="sb-bar-fill" id="sb-bar-fill" style={{width:'0%'}}></div></div>
            <div className="sb-q-list" id="sb-q-list"></div>
            <div className="sb-footer">
              <button className="sb-flag-btn" id="sb-flag-btn" onClick={() => window.toggleFlag && window.toggleFlag()} title="Flag (F)">⚑</button>
              <button className="sb-exit" onClick={() => window.exitSession && window.exitSession()} title="Exit">✕</button>
            </div>
            <div id="sb-dots" style={{display:'none'}}></div>
            <div id="sb-prog-lbl" style={{display:'none'}}></div>
            <div id="sb-mode-txt" style={{display:'none'}}></div>
            <div id="sb-total" style={{display:'none'}}></div>
            <div id="sb-big" style={{display:'none'}}></div>
            <div id="sb-mode-pill" style={{display:'none'}}></div>
          </div>
          <div className="q-area" id="q-area"></div>
        </div>
      </div>

      {/* RESULTS */}
      <div id="screen-results">
        <div className="results">
          <div id="res-content"></div>
        </div>
      </div>
    </>
  )
}
