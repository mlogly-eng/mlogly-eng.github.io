'use client'

import { useEffect } from 'react'
import './obgyn.css'

export default function ObGyn() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/obgyn-script.js'
    script.async = true
    document.body.appendChild(script)
    return () => { if (document.body.contains(script)) document.body.removeChild(script) }
  }, [])

  return (
    <>
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
                Log <span className="b-log-badge" id="b-log-badge"></span>
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

      <div className="hl-popup" id="hl-popup">
        <div className="hl-pop-swatch hl-yellow" onClick={() => window.applyHlColor && window.applyHlColor('yellow')} title="Yellow"></div>
        <div className="hl-pop-swatch hl-green" onClick={() => window.applyHlColor && window.applyHlColor('green')} title="Green"></div>
        <div className="hl-pop-swatch hl-blue" onClick={() => window.applyHlColor && window.applyHlColor('blue')} title="Blue"></div>
        <div className="hl-pop-swatch hl-pink" onClick={() => window.applyHlColor && window.applyHlColor('pink')} title="Pink"></div>
        <div className="hl-pop-divider"></div>
        <button className="hl-pop-undo" onClick={() => window.undoHighlight && window.undoHighlight()} title="Undo">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 4h4a2.5 2.5 0 010 5H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M3.2 2L1.5 4l1.7 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className="hl-pop-clear" onClick={() => window.clearAllHighlights && window.clearAllHighlights()}>Clear all</button>
      </div>

      <div className="b-spine" id="b-spine"></div>
      <div className="b-kbd-hint" id="b-kbd-hint">← → navigate · space pause · esc exit</div>

      <div className="b-nav" id="b-nav">
        <button className="b-nav-btn b-nav-pause" id="b-nav-pause-btn" onClick={() => window.bTogglePause && window.bTogglePause()}>
          <span id="b-pause-lbl">⏸</span> Pause <span className="b-kbd">space</span>
        </button>
        <button className="b-nav-btn b-nav-skip" onClick={() => window.bSkipFwd && window.bSkipFwd()}>
          Skip → <span className="b-kbd">→</span>
        </button>
      </div>

      <div className="prefs-overlay" id="prefs-overlay" onClick={(e) => { if(e.target===e.currentTarget) window.closePrefs && window.closePrefs() }}>
        <div className="prefs-panel">
          <div className="prefs-tag">// Breathe settings</div>
          <div className="prefs-hdr">
            <div className="prefs-title">Your <em>rhythm.</em></div>
            <button className="prefs-close" onClick={() => window.closePrefs && window.closePrefs()}>✕</button>
          </div>
          {[
            {label:'Inhale',hint:'seconds',id:'inhale',def:4},
            {label:'Hold',hint:'after inhale',id:'hold',def:3},
            {label:'Exhale',hint:'seconds',id:'exhale',def:3},
            {label:'Cycles per section',hint:'before moving on',id:'cycles',def:2},
          ].map(p => (
            <div key={p.id} className="prefs-row">
              <div><div className="prefs-label">{p.label}</div><div className="prefs-hint">{p.hint}</div></div>
              <div className="prefs-ctrl">
                <button className="prefs-btn" onClick={() => window.prefAdj && window.prefAdj(p.id,-1)}>−</button>
                <div className="prefs-num" id={`ps-${p.id}-display`}>{p.def}</div>
                <input type="hidden" id={`ps-${p.id}`} defaultValue={p.def}/>
                <button className="prefs-btn" onClick={() => window.prefAdj && window.prefAdj(p.id,1)}>+</button>
              </div>
            </div>
          ))}
          <button className="prefs-save" onClick={() => { window.savePrefs && window.savePrefs(); window.closePrefs && window.closePrefs() }}>Save rhythm</button>
        </div>
      </div>

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
              <div className="vl-hm-daylbl"><span></span><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span></div>
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
          <p className="shero-desc">Twenty-seven conditions across obstetrics and gynaecology. Built to make you understand — not memorise.</p>
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
            {[
              {disc:'ob',num:'OB 01',title:'Postpartum Haemorrhage',type:'Emergency · OB',preview:'The leading cause of maternal mortality. The 4 Ts, why BP is a late sign, and how to escalate without hesitation.',meta:'4 Ts · Atony · Emergency',id:'pph'},
              {disc:'ob',num:'OB 02',title:'Preeclampsia',type:'Antenatal · OB',preview:'Not a blood pressure problem. A disease of the placenta that raises BP. The distinction changes how you manage it entirely.',meta:'HTN · HELLP · Magnesium',id:'preeclampsia'},
              {disc:'ob',num:'OB 03',title:'Ectopic Pregnancy',type:'Emergency · OB',preview:'Ectopic until proven otherwise. What the triad is, the discriminatory zone, and what negative urine hCG actually rules out.',meta:'hCG · Rupture · Ultrasound',id:'ectopic'},
              {disc:'ob',num:'OB 04',title:'Placenta Praevia',type:'Antenatal · OB',preview:'Painless bright red bleeding in the third trimester. Why placental position determines route of delivery.',meta:'APH · Accreta · Caesarean',id:'placenta'},
              {disc:'ob',num:'OB 05',title:'Gestational Diabetes',type:'Antenatal · OB',preview:'Why hyperglycaemia in pregnancy endangers both mother and baby. The OGTT, thresholds, and why macrosomia is not just a big baby.',meta:'OGTT · Macrosomia · Insulin',id:'gdm'},
              {disc:'ob',num:'OB 06',title:'Shoulder Dystocia',type:'Emergency · OB',preview:'The head delivers. The shoulders don\'t follow. Five minutes. HELPERR must be automatic — not recalled under pressure.',meta:'HELPERR · McRoberts · Drill',id:'shoulder'},
              {disc:'ob',num:'OB 07',title:'Preterm Labour',type:'Emergency · OB',preview:'Labour before 37 weeks. Why you give steroids before tocolysis, and why magnesium at 28 weeks is not about seizures.',meta:'Tocolysis · Steroids · Neuroprotection',id:'pretermlabour'},
              {disc:'ob',num:'OB 08',title:'Miscarriage',type:'Early Pregnancy · OB',preview:'Pregnancy loss before 24 weeks. The types, what the ultrasound tells you, and why management is a shared decision.',meta:'ERPC · Misoprostol · Anti-D',id:'miscarriage'},
              {disc:'ob',num:'OB 09',title:'Cord Prolapse',type:'Emergency · OB',preview:'The cord delivers before the baby. Every second of cord compression is fetal hypoxia. Position before anything else.',meta:'Category 1 CS · Decompression · Position',id:'cordprolapse'},
              {disc:'ob',num:'OB 10',title:'Placental Abruption',type:'Emergency · OB',preview:'Painful dark bleeding — but 20% of abruptions have no visible bleeding at all. The concealed abruption is the one that kills.',meta:'APH · Coagulopathy · DIC',id:'abruption'},
              {disc:'ob',num:'OB 11',title:'Induction of Labour',type:'Intrapartum · OB',preview:'One in three labours is induced. The Bishop score, the methods, and why uterine hyperstimulation is a clinical emergency.',meta:'Bishop Score · Prostaglandins · Oxytocin',id:'iol'},
              {disc:'ob',num:'OB 12',title:'Obstetric Cholestasis',type:'Antenatal · OB',preview:'Intense pruritus, no rash, abnormal LFTs in the third trimester. The risk is sudden unexplained fetal death.',meta:'Bile Acids · Pruritus · IOL',id:'obstetriccholestasis'},
              {disc:'gyn',num:'GYN 01',title:'Ovarian Cysts',type:'Gynaecology · GYN',preview:'Not all cysts are equal. Functional vs pathological, the IOTA rules, and when a cyst stops being a cyst and becomes a torsion.',meta:'IOTA · Torsion · CA-125',id:'ovarycyst'},
              {disc:'gyn',num:'GYN 02',title:'Cervical Cancer',type:'Oncology · GYN',preview:'HPV drives almost every case. The screening programme, the CIN progression model, and why the vaccine does not replace the smear.',meta:'HPV · CIN · Colposcopy',id:'cervicalcancer'},
              {disc:'gyn',num:'GYN 03',title:'Endometriosis',type:'Gynaecology · GYN',preview:'Endometrium outside the uterus. Why it takes 7–10 years to diagnose, and why pain severity does not predict disease stage.',meta:'Dysmenorrhoea · Laparoscopy · Fertility',id:'endometriosis'},
              {disc:'gyn',num:'GYN 04',title:'PCOS',type:'Endocrine · GYN',preview:'The most common endocrine disorder in women of reproductive age. Rotterdam criteria, the metabolic risk hiding behind the cycle problem.',meta:'Rotterdam · Insulin Resistance · Anovulation',id:'pcos'},
              {disc:'gyn',num:'GYN 05',title:'Uterine Fibroids',type:'Gynaecology · GYN',preview:'Benign smooth muscle tumours. Why location matters more than size, and the management ladder from GnRH to hysterectomy.',meta:'FIGO Classification · HMB · Myomectomy',id:'fibroids'},
              {disc:'gyn',num:'GYN 06',title:'Pelvic Inflammatory Disease',type:'Infectious · GYN',preview:'Ascending infection of the upper genital tract. Chlamydia leads, but the sequelae — infertility, ectopic, chronic pain — outlast the infection.',meta:'Chlamydia · Fitz-Hugh-Curtis · Sequelae',id:'pid'},
              {disc:'gyn',num:'GYN 07',title:'Menopause & HRT',type:'Endocrine · GYN',preview:'Not just hot flushes. The systemic consequences of oestrogen withdrawal — and why the risks of HRT were overstated for a generation.',meta:'HRT · Bone · Cardiovascular · MHT',id:'menopause'},
              {disc:'gyn',num:'GYN 08',title:'Vulval Conditions',type:'Gynaecology · GYN',preview:'Lichen sclerosus, vulvodynia, VIN. Why the diagnosis is frequently delayed — and why lichen sclerosus is not just a skin condition.',meta:'Lichen Sclerosus · Vulvodynia · VIN',id:'vulvalconditions'},
              {disc:'gyn',num:'GYN 09',title:'Ovarian Cancer',type:'Oncology · GYN',preview:'The silent killer that isn\'t silent — the symptoms are there, they\'re just vague. Stage at diagnosis determines everything.',meta:'CA-125 · FIGO · BRCA · Debulking',id:'ovariancancer'},
              {disc:'gyn',num:'GYN 10',title:'Subfertility',type:'Reproductive · GYN',preview:'One in seven couples. The structured investigation, when to start, and why IVF is the end of the pathway — not the beginning.',meta:'Semen Analysis · IVF · Tubal · Anovulation',id:'subfertility'},
              {disc:'gyn',num:'GYN 11',title:'Endometrial Cancer',type:'Oncology · GYN',preview:'The most common gynaecological cancer. Postmenopausal bleeding is the alarm symptom — and 90% of women present because of it.',meta:'PMB · Type I/II · Hysterectomy',id:'endometrialcancer'},
              {disc:'gyn',num:'GYN 12',title:'Urinary Incontinence',type:'Urogynaecology · GYN',preview:'Stress vs urgency — the mechanism, the investigation, and why surgery before conservative treatment is always the wrong sequence.',meta:'Urodynamics · TVT · Bladder Training',id:'urinaryincontinence'},
              {disc:'gyn',num:'GYN 13',title:'Contraception',type:'Reproductive · GYN',preview:'Pearl index, UKMEC, reversibility. Why the most effective methods are the ones least frequently offered first.',meta:'LARC · UKMEC · Emergency',id:'contraception'},
              {disc:'gyn',num:'GYN 14',title:'STIs',type:'Infectious · GYN',preview:'Chlamydia, gonorrhoea, syphilis, herpes. The presentations, the tests, the treatments — and why partner notification is part of the prescription.',meta:'NAAT · Syphilis · Herpes · Contact Tracing',id:'sexuallytransmitted'},
              {disc:'gyn',num:'GYN 15',title:'Acute Gynaecology',type:'Emergency · GYN',preview:'Ovarian torsion, TOA, acute vulval haematoma. The time-critical diagnoses — and the clinical details that make the difference.',meta:'Torsion · TOA · Bartholin\'s',id:'acutegynae'},
            ].map(n => (
              <div key={n.id} className="nc reveal" data-disc={n.disc} onClick={() => window.openNote && window.openNote(n.id)}>
                <div className="nc-type">{n.type}</div>
                <div className="nc-num">{n.num}</div>
                <div className="diff"><div className="dd on"></div><div className="dd on"></div><div className="dd on"></div></div>
                <div className="nc-title">{n.title}</div>
                <p className="nc-preview">{n.preview}</p>
                <div className="nc-foot"><div className="nc-meta">{n.meta}</div><div className="nc-arr">↗</div></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="b-next-bar" id="b-next-bar">
        <div className="b-next-body">
          <div className="b-next-tag">// You&apos;ve reached the end</div>
          <div className="b-next-title" id="b-next-title">Next note</div>
        </div>
        <div className="b-next-actions">
          <button className="b-next-btn b-next-go" onClick={() => window.bGoNextNote && window.bGoNextNote()}>Continue →</button>
          <button className="b-next-btn b-next-stay" onClick={() => window.bDismissNextNote && window.bDismissNextNote()}>Linger here</button>
          <button className="b-next-stop" onClick={() => window.bStop && window.bStop(true)}>Done</button>
        </div>
      </div>
    </>
  )
}
