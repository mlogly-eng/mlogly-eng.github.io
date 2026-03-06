'use client'

import { useEffect } from 'react'
import './obgyn.css'

export default function ObGyn() {
  useEffect(() => {
    // Supabase integration
    const initSupabase = async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        'https://vwotkstjgzwjjutzjjph.supabase.co',
        'sb_publishable_bIKimcSjTZWahxZ_5epT3A_s4LGlFUj'
      )

      async function getUser() {
        const { data: { user } } = await supabase.auth.getUser()
        return user
      }

      window.saveNoteProgress = async function(noteId) {
        const user = await getUser()
        if (!user) return
        const { data: existing } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('note_id', noteId)
          .single()
        if (existing) {
          await supabase.from('progress').update({
            last_viewed: new Date().toISOString(),
            view_count: (existing.view_count || 0) + 1
          }).eq('id', existing.id)
        } else {
          await supabase.from('progress').insert({
            user_id: user.id,
            note_id: noteId,
            specialty: 'obgyn',
            last_viewed: new Date().toISOString(),
            view_count: 1
          })
        }
      }
    }

    initSupabase()

    // ── Main script (all original JS from vent-obgyn.html) ──
    const script = document.createElement('script')
    script.textContent = OBGYN_SCRIPT
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <>
      {/* OVERLAY & MODAL */}
      <div className="overlay" id="overlay" onClick={(e) => window.closeBg && window.closeBg(e)}>
        <div className="note-modal" id="modal">
          <div className="mbar">
            <div className="mbar-l">
              <div className="mpulse"></div>
              <span className="mbc" id="mbar-title">OB/GYN — VENT</span>
            </div>
            <div className="mbar-center" id="mbar-note-nav">
              <button className="mnav-btn" id="btn-prev-note" onClick={() => window.prevNote && window.prevNote()} title="Previous note">←</button>
              <span className="mnav-label" id="mnav-label"></span>
              <button className="mnav-btn" id="btn-next-note" onClick={() => window.nextNote && window.nextNote()} title="Next note">→</button>
            </div>
            <div className="mbar-r" id="mbar-note-tools">
              <button className="mtool-btn" onClick={() => window.changeFontSize && window.changeFontSize(-1)} title="Decrease font size">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
              <span className="font-size-display" id="font-size-display">100%</span>
              <button className="mtool-btn" onClick={() => window.changeFontSize && window.changeFontSize(1)} title="Increase font size">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2v7M2 5.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
              <div className="mbar-divider"></div>
              <button className="b-hist-btn" id="b-hist-btn" onClick={() => window.bOpenHistory && window.bOpenHistory()} title="Ventilation log">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 4.5h4M4 6h4M4 7.5h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                Log
                <span className="b-log-badge" id="b-log-badge"></span>
              </button>
              <div className="mbar-divider"></div>
              <button className="b-prefs-trigger" id="btn-prefs" onClick={() => window.openPrefs && window.openPrefs()} title="Adjust breathing rhythm">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M6.5 1v1.2M6.5 10.8V12M12 6.5h-1.2M2.2 6.5H1M10.3 2.7l-.85.85M3.55 9.45l-.85.85M10.3 10.3l-.85-.85M3.55 3.55l-.85-.85" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
              </button>
              <button className="breathe-toggle-btn b-locked" id="btn-breathe" onClick={() => window.toggleBreathe && window.toggleBreathe()} title="Read through the note to unlock breathing mode">
                <span className="breathe-btn-fill" id="breathe-btn-fill"></span>
                <span className="breathe-btn-dot" id="breathe-btn-dot"></span>
                <span className="breathe-btn-label" id="breathe-btn-label">Breathe</span>
              </button>
              <div className="mbar-divider"></div>
              <button className="mfull" id="btn-fullscreen" onClick={() => window.toggleFullscreen && window.toggleFullscreen()} title="Full screen">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="mclose" onClick={() => window.closeModal && window.closeModal()}>✕</button>
            </div>
          </div>
          <div id="page-note-ob">
            <div id="mcontent"></div>
            <div className="b-reading-bar" id="b-reading-bar" style={{display:'none'}}>
              <div className="b-reading-fill" id="b-reading-fill"></div>
            </div>
            <div className="b-ring-wrap" id="b-ring-wrap">
              <div className="b-ring-stage">
                <div className="b-ring-outer"></div>
                <div className="b-ring-inner"></div>
                <svg className="b-ring-svg" viewBox="0 0 96 96">
                  <circle className="b-r-track" cx="48" cy="48" r="42"/>
                  <circle className="b-r-arc" id="b-r-arc" cx="48" cy="48" r="42"/>
                </svg>
                <div className="b-ring-core" id="b-ring-core">
                  <div className="b-core-sec" id="b-core-sec">4</div>
                </div>
              </div>
              <div className="b-phase-label" id="b-phase-label">inhale</div>
            </div>
          </div>
          <div id="page-mcq-ob" style={{display:'none'}}><div id="mcq-inner-ob"></div></div>
        </div>
      </div>

      {/* VENTILATE POPUP */}
      <div id="vent-popup" className="vent-popup">
        <div className="vent-popup-inner">
          <div className="vent-popup-glow"></div>
          <div className="vent-popup-tag">// End of note</div>
          <div className="vent-popup-title">Are you<br/><em>ventilating?</em></div>
          <div className="vent-popup-sub">Test whether this note actually landed. 5 questions. No pressure.</div>
          <div className="vent-popup-btns">
            <button className="vent-yes" onClick={() => window.startMCQ && window.startMCQ()}>Let&apos;s find out →</button>
            <button className="vent-no" onClick={() => window.dismissVentPopup && window.dismissVentPopup()}>Not now</button>
          </div>
        </div>
      </div>
      <div id="vent-backdrop" className="vent-backdrop" onClick={() => window.dismissVentPopup && window.dismissVentPopup()}></div>

      {/* HIGHLIGHT POPUP */}
      <div className="hl-popup" id="hl-popup">
        <div className="hl-pop-swatch hl-yellow" onClick={() => window.applyHlColor && window.applyHlColor('yellow')} title="Yellow"></div>
        <div className="hl-pop-swatch hl-green"  onClick={() => window.applyHlColor && window.applyHlColor('green')}  title="Green"></div>
        <div className="hl-pop-swatch hl-blue"   onClick={() => window.applyHlColor && window.applyHlColor('blue')}   title="Blue"></div>
        <div className="hl-pop-swatch hl-pink"   onClick={() => window.applyHlColor && window.applyHlColor('pink')}   title="Pink"></div>
        <div className="hl-pop-divider"></div>
        <button className="hl-pop-undo" onClick={() => window.undoHighlight && window.undoHighlight()} title="Undo">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 4h4a2.5 2.5 0 010 5H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M3.2 2L1.5 4l1.7 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className="hl-pop-clear" onClick={() => window.clearAllHighlights && window.clearAllHighlights()}>Clear all</button>
      </div>

      {/* BREATHE SPINE DOTS */}
      <div className="b-spine" id="b-spine"></div>
      <div className="b-kbd-hint" id="b-kbd-hint">← → navigate · space pause · esc exit</div>

      {/* BREATHE NAV */}
      <div className="b-nav" id="b-nav">
        <button className="b-nav-btn b-nav-pause" id="b-nav-pause-btn" onClick={() => window.bTogglePause && window.bTogglePause()}>
          <span id="b-pause-lbl">⏸</span> Pause <span className="b-kbd">space</span>
        </button>
        <button className="b-nav-btn b-nav-skip" onClick={() => window.bSkipFwd && window.bSkipFwd()}>
          Skip → <span className="b-kbd">→</span>
        </button>
      </div>

      {/* BREATHE PREFS PANEL */}
      <div className="prefs-overlay" id="prefs-overlay" onClick={(e) => { if(e.target===e.currentTarget && window.closePrefs) window.closePrefs() }}>
        <div className="prefs-panel">
          <div className="prefs-tag">// Breathe settings</div>
          <div className="prefs-hdr">
            <div className="prefs-title">Your <em>rhythm.</em></div>
            <button className="prefs-close" onClick={() => window.closePrefs && window.closePrefs()}>✕</button>
          </div>
          {[['inhale','Inhale','seconds'],['hold','Hold','after inhale'],['exhale','Exhale','seconds'],['cycles','Cycles per section','before moving on']].map(([key,label,hint]) => (
            <div className="prefs-row" key={key}>
              <div><div className="prefs-label">{label}</div><div className="prefs-hint">{hint}</div></div>
              <div className="prefs-ctrl">
                <button className="prefs-btn" onClick={() => window.prefAdj && window.prefAdj(key,-1)}>−</button>
                <div className="prefs-num" id={`ps-${key}-display`}>{key==='cycles'?2:key==='exhale'?3:key==='hold'?3:4}</div>
                <input type="hidden" id={`ps-${key}`} defaultValue={key==='cycles'?2:key==='exhale'?3:key==='hold'?3:4}/>
                <button className="prefs-btn" onClick={() => window.prefAdj && window.prefAdj(key,1)}>+</button>
              </div>
            </div>
          ))}
          <button className="prefs-save" onClick={() => { window.savePrefs && window.savePrefs(); window.closePrefs && window.closePrefs() }}>Save rhythm</button>
        </div>
      </div>

      {/* VENTILATION LOG PANEL */}
      <div className="b-hist-overlay" id="b-hist-overlay" onClick={(e) => window.bCloseHistory && window.bCloseHistory(e)}>
        <div className="b-hist-panel">
          <div className="vl-hdr">
            <div className="vl-hdr-top">
              <div className="vl-hdr-left">
                <div className="vl-tag">// Vent</div>
                <div className="vl-title">Ventilation <em>Log</em></div>
              </div>
              <button className="b-hist-close" onClick={() => window.bCloseHistory && window.bCloseHistory()}>✕</button>
            </div>
            <div className="vl-stats">
              <div className="vl-stat"><div className="vl-stat-val" id="vl-stat-time">—</div><div className="vl-stat-lbl">Breathed</div></div>
              <div className="vl-stat"><div className="vl-stat-val" id="vl-stat-today">0</div><div className="vl-stat-lbl">Today</div></div>
              <div className="vl-stat"><div className="vl-stat-val" id="vl-stat-total">0</div><div className="vl-stat-lbl">All time</div></div>
            </div>
          </div>
          <div className="vl-streak">
            <div className="vl-streak-meta">
              <div className="vl-streak-lbl" id="vl-streak-lbl">—</div>
              <div className="vl-streak-sub" id="vl-streak-sub">16 weeks</div>
            </div>
            <div className="vl-hm-wrap">
              <div className="vl-hm-daylbl">
                <span></span><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span>
              </div>
              <div>
                <div className="vl-hm-month-row" id="vl-hm-months"></div>
                <div className="vl-heatmap" id="vl-heatmap"></div>
              </div>
            </div>
            <div className="vl-hm-legend">
              <div className="vl-hm-leg-lbl">Less</div>
              <div className="vl-hm-leg-cell" style={{background:'rgba(255,255,255,.05)'}}></div>
              <div className="vl-hm-leg-cell" style={{background:'rgba(200,69,42,.2)'}}></div>
              <div className="vl-hm-leg-cell" style={{background:'rgba(200,69,42,.4)'}}></div>
              <div className="vl-hm-leg-cell" style={{background:'rgba(200,69,42,.65)'}}></div>
              <div className="vl-hm-leg-cell" style={{background:'#c8452a'}}></div>
              <div className="vl-hm-leg-lbl">More</div>
            </div>
          </div>
          <div className="vl-burnout" id="vl-burnout">
            <p>3+ sessions today. <strong>Let it consolidate.</strong> Rest is part of learning.</p>
          </div>
          <div className="vl-tabs">
            <button className="vl-tab active" id="vl-tab-today" onClick={() => window.vlSwitchTab && window.vlSwitchTab('today')}>Today <span className="vl-tab-count" id="vl-today-count">0</span></button>
            <button className="vl-tab" id="vl-tab-missed" onClick={() => window.vlSwitchTab && window.vlSwitchTab('missed')}>Missed <span className="vl-tab-count" id="vl-missed-count">0</span></button>
            <button className="vl-tab" id="vl-tab-all" onClick={() => window.vlSwitchTab && window.vlSwitchTab('all')}>All</button>
            <button className="vl-tab" id="vl-tab-strength" onClick={() => window.vlSwitchTab && window.vlSwitchTab('strength')}>Topics</button>
          </div>
          <div className="vl-body">
            <div className="vl-pane active" id="vl-pane-today"></div>
            <div className="vl-pane" id="vl-pane-missed"></div>
            <div className="vl-pane" id="vl-pane-all"></div>
            <div className="vl-pane" id="vl-pane-strength"></div>
          </div>
          <div className="vl-footer">
            <button className="vl-footer-clear" onClick={() => window.bClearHistory && window.bClearHistory()}>Clear all data</button>
          </div>
          <div id="b-ht-time" style={{display:'none'}}></div>
          <div id="b-ht-count" style={{display:'none'}}></div>
          <div id="b-hs-dots" style={{display:'none'}}></div>
          <div id="b-hs-lbl" style={{display:'none'}}></div>
          <div id="b-hist-burnout" style={{display:'none'}}></div>
          <div id="b-hist-list" style={{display:'none'}}></div>
        </div>
      </div>

      {/* BREATHE SUMMARY */}
      <div className="vs-overlay" id="breathe-summary">
        <div className="vs-panel" id="vs-panel">
          <button className="vs-close-btn" onClick={() => window.vsConfirmClose && window.vsConfirmClose()} title="Close">✕</button>
          <div className="vs-confirm" id="vs-confirm">
            <div className="vs-confirm-q">Leave the recall check?</div>
            <div className="vs-confirm-sub">Your progress matters — gaps stay hidden if you skip.</div>
            <div className="vs-confirm-btns">
              <button className="vs-confirm-yes" onClick={() => window.vsDoClose && window.vsDoClose()}>Yes, exit</button>
              <button className="vs-confirm-no" onClick={() => window.vsCancelClose && window.vsCancelClose()}>Keep going</button>
            </div>
          </div>
          <div className="vs-header">
            <div className="vs-tag">// Ventilation Check</div>
            <div className="vs-title" id="vs-title">Test your <em>recall.</em></div>
            <div className="vs-meta" id="vs-meta"></div>
          </div>
          <div className="vs-progress" id="vs-progress"></div>
          <div className="vs-intro" id="vs-intro">
            <div className="vs-intro-icon">🌬</div>
            <div className="vs-intro-h">You just <em>ventilated.</em></div>
            <div className="vs-intro-sub" id="vs-intro-sub"></div>
            <div className="vs-intro-btns">
              <button className="vs-intro-primary" onClick={() => window.vsStartQuestions && window.vsStartQuestions()}>Test my recall →</button>
              <button className="vs-intro-secondary" onClick={() => window.vsBackToNotes && window.vsBackToNotes()}>Back to notes</button>
            </div>
          </div>
          <div id="vs-question-view" style={{display:'none'}}>
            <div className="vs-q-area">
              <div className="vs-q-num" id="vs-q-num">Question 1 of 3</div>
              <div className="vs-q-text" id="vs-q-text"></div>
            </div>
            <div className="vs-answer-area" id="vs-answer-area">
              <div className="vs-ans-lbl">Answer</div>
              <div className="vs-ans-text" id="vs-ans-text"></div>
              <div className="vs-ans-exp" id="vs-ans-exp"></div>
            </div>
            <div className="vs-self-lbl" id="vs-self-lbl" style={{display:'none'}}>Did you get it?</div>
            <div className="vs-controls" id="vs-controls"></div>
          </div>
          <div className="vs-finish" id="vs-finish">
            <div className="vs-finish-icon">🌬</div>
            <div className="vs-finish-h" id="vs-finish-h">Well <em>ventilated.</em></div>
            <div className="vs-finish-sub" id="vs-finish-sub"></div>
            <div className="vs-finish-btns">
              <button className="vs-finish-primary" onClick={() => window.vsKeepVentilating && window.vsKeepVentilating()}>Keep ventilating →</button>
              <button className="vs-finish-secondary" onClick={() => window.vsBackToNotes && window.vsBackToNotes()}>Back to notes</button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN PAGE */}
      <div id="main-page">
        <nav>
          <a href="/" className="logo">
            <svg className="logo-mark" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="21" stroke="#1a1510" strokeWidth="1.5"/>
              <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M10 30 Q22 36 34 30" stroke="#1a1510" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
            </svg>
            <span className="logo-name">Vent</span>
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); history.back() }} className="nav-back">← All specialties</a>
          <a href="/#waitlist" className="nav-pill">Join waitlist</a>
        </nav>

        <section className="shero">
          <div className="shero-orb"></div>
          <div className="shero-kicker">Clinical Notes</div>
          <h1 className="shero-h1">Obstetrics &amp;<br/><em>Gynaecology</em></h1>
          <p className="shero-desc">Twenty-seven conditions across obstetrics and gynaecology. Built to make you understand — not memorise. The mechanism, the clinical framing, and the insight your textbook left out.</p>
          <div className="shero-stats">
            <div className="shero-stat"><div className="sv">27</div><div className="sl">Notes</div></div>
            <div className="shero-stat"><div className="sv">OB / GYN</div><div className="sl">Toggle</div></div>
            <div className="shero-stat"><div className="sv">5 min</div><div className="sl">Per note</div></div>
          </div>
        </section>

        <section className="notes-sec">
          <div className="ns-hdr reveal">
            <div className="ns-hdr-left">
              <div className="ns-discipline-label">OB/GYN Clinical Notes</div>
              <h2 className="ns-h2">All <em>notes</em></h2>
            </div>
            <div className="disc-toggle">
              <button className="dtab on" data-filter="all">All <span className="dtab-count">27</span></button>
              <button className="dtab" data-filter="ob">Obstetrics <span className="dtab-count">12</span></button>
              <button className="dtab" data-filter="gyn">Gynaecology <span className="dtab-count">15</span></button>
            </div>
          </div>

          <div className="notes-grid" id="notes-grid">
            {/* OB NOTES */}
            {[
              {id:'pph',disc:'ob',num:'OB 01',type:'Emergency · OB',diff:3,title:'Postpartum Haemorrhage',preview:'The leading cause of maternal mortality. The 4 Ts, why BP is a late sign, and how to escalate without hesitation.',meta:'4 Ts · Atony · Emergency'},
              {id:'preeclampsia',disc:'ob',num:'OB 02',type:'Antenatal · OB',diff:3,title:'Preeclampsia',preview:'Not a blood pressure problem. A disease of the placenta that raises BP. The distinction changes how you manage it entirely.',meta:'HTN · HELLP · Magnesium'},
              {id:'ectopic',disc:'ob',num:'OB 03',type:'Emergency · OB',diff:3,title:'Ectopic Pregnancy',preview:'Ectopic until proven otherwise. What the triad is, the discriminatory zone, and what negative urine hCG actually rules out.',meta:'hCG · Rupture · Ultrasound'},
              {id:'placenta',disc:'ob',num:'OB 04',type:'Antenatal · OB',diff:3,title:'Placenta Praevia',preview:'Painless bright red bleeding in the third trimester. Why placental position determines route of delivery — and why you never do a VE.',meta:'APH · Accreta · Caesarean'},
              {id:'gdm',disc:'ob',num:'OB 05',type:'Antenatal · OB',diff:3,title:'Gestational Diabetes',preview:'Why hyperglycaemia in pregnancy endangers both mother and baby. The OGTT, thresholds, and why macrosomia is not just a big baby.',meta:'OGTT · Macrosomia · Insulin'},
              {id:'shoulder',disc:'ob',num:'OB 06',type:'Emergency · OB',diff:3,title:'Shoulder Dystocia',preview:'The head delivers. The shoulders don\'t follow. Five minutes. HELPERR must be automatic — not recalled under pressure.',meta:'HELPERR · McRoberts · Drill'},
              {id:'pretermlabour',disc:'ob',num:'OB 07',type:'Emergency · OB',diff:3,title:'Preterm Labour',preview:'Labour before 37 weeks. Why you give steroids before tocolysis, and why magnesium at 28 weeks is not about seizures.',meta:'Tocolysis · Steroids · Neuroprotection'},
              {id:'miscarriage',disc:'ob',num:'OB 08',type:'Early Pregnancy · OB',diff:3,title:'Miscarriage',preview:'Pregnancy loss before 24 weeks. The types, what the ultrasound tells you, and why management is a shared decision — not a protocol.',meta:'ERPC · Misoprostol · Anti-D'},
              {id:'cordprolapse',disc:'ob',num:'OB 09',type:'Emergency · OB',diff:3,title:'Cord Prolapse',preview:'The cord delivers before the baby. Every second of cord compression is fetal hypoxia. Position before anything else.',meta:'Category 1 CS · Decompression · Position'},
              {id:'abruption',disc:'ob',num:'OB 10',type:'Emergency · OB',diff:3,title:'Placental Abruption',preview:'Painful dark bleeding — but 20% of abruptions have no visible bleeding at all. The concealed abruption is the one that kills.',meta:'APH · Coagulopathy · DIC'},
              {id:'iol',disc:'ob',num:'OB 11',type:'Intrapartum · OB',diff:3,title:'Induction of Labour',preview:'One in three labours is induced. The Bishop score, the methods, and why uterine hyperstimulation is a clinical emergency not a monitor alarm.',meta:'Bishop Score · Prostaglandins · Oxytocin'},
              {id:'obstetriccholestasis',disc:'ob',num:'OB 12',type:'Antenatal · OB',diff:3,title:'Obstetric Cholestasis',preview:'Intense pruritus, no rash, abnormal LFTs in the third trimester. The risk is not to the mother — it is sudden unexplained fetal death.',meta:'Bile Acids · Pruritus · IOL'},
              // GYN NOTES
              {id:'ovarycyst',disc:'gyn',num:'GYN 01',type:'Gynaecology · GYN',diff:3,title:'Ovarian Cysts',preview:'Not all cysts are equal. Functional vs pathological, the IOTA rules, and when a cyst stops being a cyst and becomes a torsion.',meta:'IOTA · Torsion · CA-125'},
              {id:'cervicalcancer',disc:'gyn',num:'GYN 02',type:'Oncology · GYN',diff:3,title:'Cervical Cancer',preview:'HPV drives almost every case. The screening programme, the CIN progression model, and why the vaccine does not replace the smear.',meta:'HPV · CIN · Colposcopy'},
              {id:'endometriosis',disc:'gyn',num:'GYN 03',type:'Gynaecology · GYN',diff:3,title:'Endometriosis',preview:'Endometrium outside the uterus. Why it takes 7–10 years to diagnose, and why pain severity does not predict disease stage.',meta:'Dysmenorrhoea · Laparoscopy · Fertility'},
              {id:'pcos',disc:'gyn',num:'GYN 04',type:'Endocrine · GYN',diff:3,title:'PCOS',preview:'The most common endocrine disorder in women of reproductive age. Rotterdam criteria, the metabolic risk hiding behind the cycle problem.',meta:'Rotterdam · Insulin Resistance · Anovulation'},
              {id:'fibroids',disc:'gyn',num:'GYN 05',type:'Gynaecology · GYN',diff:3,title:'Uterine Fibroids',preview:'Benign smooth muscle tumours. Why location matters more than size, and the management ladder from GnRH to hysterectomy.',meta:'FIGO Classification · HMB · Myomectomy'},
              {id:'pid',disc:'gyn',num:'GYN 06',type:'Infectious · GYN',diff:3,title:'Pelvic Inflammatory Disease',preview:'Ascending infection of the upper genital tract. Chlamydia leads, but the sequelae — infertility, ectopic, chronic pain — outlast the infection.',meta:'Chlamydia · Fitz-Hugh-Curtis · Sequelae'},
              {id:'menopause',disc:'gyn',num:'GYN 07',type:'Endocrine · GYN',diff:3,title:'Menopause & HRT',preview:'Not just hot flushes. The systemic consequences of oestrogen withdrawal — and why the risks of HRT were overstated for a generation.',meta:'HRT · Bone · Cardiovascular · MHT'},
              {id:'vulvalconditions',disc:'gyn',num:'GYN 08',type:'Gynaecology · GYN',diff:3,title:'Vulval Conditions',preview:'Lichen sclerosus, vulvodynia, VIN. Why the diagnosis is frequently delayed — and why lichen sclerosus is not just a skin condition.',meta:'Lichen Sclerosus · Vulvodynia · VIN'},
              {id:'ovariancancer',disc:'gyn',num:'GYN 09',type:'Oncology · GYN',diff:3,title:'Ovarian Cancer',preview:'The silent killer that isn\'t silent — the symptoms are there, they\'re just vague. What they are, and why stage at diagnosis determines everything.',meta:'CA-125 · FIGO · BRCA · Debulking'},
              {id:'subfertility',disc:'gyn',num:'GYN 10',type:'Reproductive · GYN',diff:3,title:'Subfertility',preview:'One in seven couples. The structured investigation, when to start, and why IVF is the end of the pathway — not the beginning.',meta:'Semen Analysis · IVF · Tubal · Anovulation'},
              {id:'endometrialcancer',disc:'gyn',num:'GYN 11',type:'Oncology · GYN',diff:3,title:'Endometrial Cancer',preview:'The most common gynaecological cancer. Postmenopausal bleeding is the alarm symptom — and 90% of women present because of it. Early by design.',meta:'PMB · Type I/II · Hysterectomy'},
              {id:'urinaryincontinence',disc:'gyn',num:'GYN 12',type:'Urogynaecology · GYN',diff:3,title:'Urinary Incontinence',preview:'Stress vs urgency — the mechanism, the investigation, and why surgery before conservative treatment is always the wrong sequence.',meta:'Urodynamics · TVT · Bladder Training'},
              {id:'contraception',disc:'gyn',num:'GYN 13',type:'Reproductive · GYN',diff:3,title:'Contraception',preview:'Pearl index, UKMEC, reversibility. Why the most effective methods are the ones least frequently offered first.',meta:'LARC · UKMEC · Emergency'},
              {id:'sexuallytransmitted',disc:'gyn',num:'GYN 14',type:'Infectious · GYN',diff:3,title:'STIs',preview:'Chlamydia, gonorrhoea, syphilis, herpes. The presentations, the tests, the treatments — and why partner notification is part of the prescription.',meta:'NAAT · Syphilis · Herpes · Contact Tracing'},
              {id:'acutegynae',disc:'gyn',num:'GYN 15',type:'Emergency · GYN',diff:3,title:'Acute Gynaecology',preview:'Ovarian torsion, TOA, acute vulval haematoma. The time-critical diagnoses — and the clinical details that make the difference between ovary saved and ovary lost.',meta:'Torsion · TOA · Bartholin\'s'},
            ].map(note => (
              <div key={note.id} className="nc reveal" data-disc={note.disc} onClick={() => window.openNote && window.openNote(note.id)}>
                <div className="nc-type">{note.type}</div>
                <div className="nc-num">{note.num}</div>
                <div className="diff">
                  {[...Array(3)].map((_,i) => <div key={i} className={`dd${i < note.diff ? ' on' : ''}`}></div>)}
                </div>
                <div className="nc-title">{note.title}</div>
                <p className="nc-preview">{note.preview}</p>
                <div className="nc-foot">
                  <div className="nc-meta">{note.meta}</div>
                  <div className="nc-arr">↗</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
