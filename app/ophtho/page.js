'use client'

import { useEffect } from 'react'
import './ophtho.css'

export default function Ophtho() {
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
            specialty: 'ophtho',
            last_viewed: new Date().toISOString(),
            view_count: 1
          })
        }
      }
    }

    initSupabase()

    // Inject main script
    const script = document.createElement('script')
    script.textContent = OPHTHO_SCRIPT
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <>
      {/* OVERLAY */}
      <div className="overlay" id="overlay" onClick={(e) => window.closeBg && window.closeBg(e)}>
        <div className="note-modal" id="modal">
          <div className="mbar">
            <div className="mbar-l">
              <div className="mpulse"></div>
              <span className="mbc">OPHTHALMOLOGY — VENT</span>
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
              <button className="mfull" id="btn-fullscreen" onClick={() => window.toggleFullscreen && window.toggleFullscreen()} title="Fullscreen">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="mclose" onClick={() => window.closeModal && window.closeModal()}>✕</button>
            </div>
          </div>
          <div id="page-note">
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
          <div id="page-mcq" style={{display:'none'}}><div id="mcq-inner"></div></div>
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
      <nav>
        <a href="/" className="logo">
          <svg width="40" height="40" viewBox="0 0 44 44" fill="none">
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
        <div className="shero-glow"></div>
        <div className="shero-kick">Clinical Notes</div>
        <h1 className="shero-h1">Ophthal&shy;<em>mology</em></h1>
        <p className="shero-desc">Nineteen high-yield ophthalmology notes. The anatomy that makes the pathology make sense. The clinical framing your textbook left out.</p>
        <div className="shero-stats">
          <div><div className="stat-n">19</div><div className="stat-l">notes</div></div>
          <div><div className="stat-n">95+</div><div className="stat-l">MCQs</div></div>
          <div><div className="stat-n">EN</div><div className="stat-l">language</div></div>
        </div>
      </section>

      <section className="notes-sec">
        <div className="nsec-hdr reveal"><h2 className="nsec-h2">All <em>ophtho</em> notes</h2></div>
        <div className="notes-grid">
          {[
            {id:'intro',num:'OP 01',type:'Foundations',title:'Intro to Ophthalmology',preview:'Anatomy, history-taking, and examination. The framework everything else hangs from.',meta:'Anatomy · Examination'},
            {id:'eyelids',num:'OP 02',type:'Adnexa',title:'Eyelids',preview:'Chalazion vs hordeolum, blepharitis, ptosis, entropion, ectropion. The eyelid history tells you the diagnosis.',meta:'Ptosis · Inflammation'},
            {id:'lacrimal',num:'OP 03',type:'Adnexa',title:'Lacrimal Apparatus',preview:'Dry eye, dacryocystitis, nasolacrimal duct obstruction. Why a watery eye and a dry eye are often the same problem.',meta:'Dry Eye · Dacryocystitis'},
            {id:'conjunctiva',num:'OP 04',type:'Anterior Segment',title:'Conjunctiva',preview:'Bacterial, viral, allergic conjunctivitis. The red eye differential. Subconjunctival haemorrhage and episcleritis.',meta:'Red Eye · Differential'},
            {id:'lens',num:'OP 05',type:'Anatomy',title:'The Lens',preview:'Structure, transparency, accommodation. Why the lens has no blood supply and what that means for disease.',meta:'Anatomy · Accommodation'},
            {id:'cataract',num:'OP 06',type:'Lens Pathology',title:'Cataracts',preview:'Nuclear, cortical, posterior subcapsular. The type tells you the cause. The location tells you the symptoms.',meta:'Types · Surgery'},
            {id:'cornea',num:'OP 07',type:'Anterior Segment',title:'Corneal Infections',preview:'Bacterial, viral, fungal, Acanthamoeba keratitis. Contact lens wear is the red flag. A white corneal spot is a corneal ulcer until proven otherwise.',meta:'Keratitis · Emergency'},
            {id:'retina',num:'OP 08',type:'Posterior Segment',title:'The Retina',preview:'Layers, blood supply, the fovea. Understanding structure is how you explain every retinal disease that follows.',meta:'Anatomy · Blood Supply'},
            {id:'dr',num:'OP 09',type:'Retinal Disease',title:'Diabetic Retinopathy',preview:'NPDR to PDR. The ETDRS grading, macular oedema, and why laser is not the first-line anymore.',meta:'Staging · Anti-VEGF'},
            {id:'hr',num:'OP 10',type:'Retinal Disease',title:'Hypertensive Retinopathy',preview:'Keith-Wagener-Barker grades I–IV. What each finding means and when it becomes a hypertensive emergency.',meta:'KWB · Emergency'},
            {id:'glaucoma',num:'OP 11',type:'Glaucoma',title:'Glaucoma',preview:'POAG vs acute angle-closure. Silent thief of sight vs the emergency. IOP, optic disc cupping, and when to act fast.',meta:'POAG · Emergency'},
            {id:'amd',num:'OP 12',type:'Macular Disease',title:'Age-Related Macular Degeneration',preview:'Dry vs wet. Drusen to geographic atrophy. Anti-VEGF for wet AMD. The most common cause of blindness in the developed world.',meta:'Dry/Wet · Anti-VEGF'},
            {id:'rd',num:'OP 13',type:'Retinal Disease',title:'Retinal Detachment',preview:'Flashes, floaters, curtain. Rhegmatogenous vs tractional vs exudative. The symptoms that should never be missed.',meta:'Emergency · Surgery'},
            {id:'redeye',num:'OP 14',type:'Clinical Framework',title:'The Red Eye',preview:'The differential in one framework. Conjunctivitis vs keratitis vs uveitis vs angle-closure. How to never miss the dangerous one.',meta:'Differential · Framework'},
            {id:'uveitis',num:'OP 15',type:'Inflammation',title:'Uveitis',preview:'Anterior, intermediate, posterior. The systemic associations you must know. HLA-B27, sarcoid, TB — the eye as a window.',meta:'HLA-B27 · Associations'},
            {id:'rvo',num:'OP 16',type:'Retinal Vascular',title:'Retinal Vascular Occlusions',preview:'CRAO vs CRVO. Cherry red spot vs stormy sunset. Both are stroke equivalents demanding same-day vascular work-up.',meta:'CRAO · CRVO'},
            {id:'on',num:'OP 17',type:'Neuro-ophthalmology',title:'Optic Neuritis',preview:'Painful loss of vision in a young adult. The MS connection. RAPD, colour desaturation, and what the MRI will show.',meta:'MS · RAPD'},
            {id:'strabismus',num:'OP 18',type:'Paediatric',title:'Strabismus & Amblyopia',preview:'Squint types, cover test, amblyopia. The critical period for visual development. Why patching works and why timing matters.',meta:'Cover Test · Amblyopia'},
            {id:'refraction',num:'OP 19',type:'Optics',title:'Refractive Errors',preview:'Myopia, hyperopia, astigmatism, presbyopia. What each means optically, how each is corrected, and which lens does what.',meta:'Myopia · Correction'},
          ].map(note => (
            <div key={note.id} className="nc reveal" onClick={() => window.openNote && window.openNote(note.id)}>
              <div className="nc-type">{note.type}</div>
              <div className="nc-num">{note.num}</div>
              <div className="diff">
                <div className="dd on"></div><div className="dd on"></div><div className="dd on"></div>
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
    </>
  )
}
