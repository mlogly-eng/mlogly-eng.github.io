'use client'

import { useEffect } from 'react'
import './ophtho.css'

export default function Ophtho() {
  useEffect(() => {
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
          .from('progress').select('*')
          .eq('user_id', user.id).eq('note_id', noteId).single()
        if (existing) {
          await supabase.from('progress').update({
            last_viewed: new Date().toISOString(),
            view_count: (existing.view_count || 0) + 1
          }).eq('id', existing.id)
        } else {
          await supabase.from('progress').insert({
            user_id: user.id, note_id: noteId, specialty: 'ophtho',
            last_viewed: new Date().toISOString(), view_count: 1
          })
        }
      }
    }
    initSupabase()

    const script = document.createElement('script')
    script.src = '/ophtho-script.js'
    script.async = true
    document.body.appendChild(script)
    return () => { if (document.body.contains(script)) document.body.removeChild(script) }
  }, [])

  return (
    <>
      {/* OVERLAY & MODAL */}
      <div className="overlay" id="overlay" onClick={(e) => window.closeBg && window.closeBg(e)}>
        <div className="note-modal" id="modal">
          <div className="mbar">
            <div className="mbar-l">
              <div className="mpulse"></div>
              <span className="mbc" id="mbar-title">OPHTHO — VENT</span>
            </div>
            <div className="mbar-center" id="mbar-note-nav">
              <button className="mnav-btn" id="btn-prev-note" onClick={() => window.prevNote && window.prevNote()}>←</button>
              <span className="mnav-label" id="mnav-label"></span>
              <button className="mnav-btn" id="btn-next-note" onClick={() => window.nextNote && window.nextNote()}>→</button>
            </div>
            <div className="mbar-r" id="mbar-note-tools">
              <button className="mtool-btn" onClick={() => window.changeFontSize && window.changeFontSize(-1)}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
              <span className="font-size-display" id="font-size-display">100%</span>
              <button className="mtool-btn" onClick={() => window.changeFontSize && window.changeFontSize(1)}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2v7M2 5.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
              <div className="mbar-divider"></div>
              <button className="b-hist-btn" id="b-hist-btn" onClick={() => window.bOpenHistory && window.bOpenHistory()}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 4.5h4M4 6h4M4 7.5h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                Log<span className="b-log-badge" id="b-log-badge"></span>
              </button>
              <div className="mbar-divider"></div>
              <button className="b-prefs-trigger" id="btn-prefs" onClick={() => window.openPrefs && window.openPrefs()}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M6.5 1v1.2M6.5 10.8V12M12 6.5h-1.2M2.2 6.5H1M10.3 2.7l-.85.85M3.55 9.45l-.85.85M10.3 10.3l-.85-.85M3.55 3.55l-.85-.85" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
              </button>
              <button className="breathe-toggle-btn b-locked" id="btn-breathe" onClick={() => window.toggleBreathe && window.toggleBreathe()}>
                <span className="breathe-btn-fill" id="breathe-btn-fill"></span>
                <span className="breathe-btn-dot" id="breathe-btn-dot"></span>
                <span className="breathe-btn-label" id="breathe-btn-label">Breathe</span>
              </button>
              <div className="mbar-divider"></div>
              <button className="mfull" id="btn-fullscreen" onClick={() => window.toggleFullscreen && window.toggleFullscreen()}>
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
        <div className="hl-pop-swatch hl-yellow" onClick={() => window.applyHlColor && window.applyHlColor('yellow')}></div>
        <div className="hl-pop-swatch hl-green"  onClick={() => window.applyHlColor && window.applyHlColor('green')}></div>
        <div className="hl-pop-swatch hl-blue"   onClick={() => window.applyHlColor && window.applyHlColor('blue')}></div>
        <div className="hl-pop-swatch hl-pink"   onClick={() => window.applyHlColor && window.applyHlColor('pink')}></div>
        <div className="hl-pop-divider"></div>
        <button className="hl-pop-undo" onClick={() => window.undoHighlight && window.undoHighlight()}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 4h4a2.5 2.5 0 010 5H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M3.2 2L1.5 4l1.7 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className="hl-pop-clear" onClick={() => window.clearAllHighlights && window.clearAllHighlights()}>Clear all</button>
      </div>

      {/* BREATHE NEXT BAR */}
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

      {/* BREATHE SPINE & HINTS */}
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

      {/* BREATHE PREFS */}
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

      {/* VENTILATION LOG */}
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

      {/* BREATHE SUMMARY / RECALL CHECK */}
      <div className="vs-overlay" id="breathe-summary">
        <div className="vs-panel" id="vs-panel">
          <button className="vs-close-btn" onClick={() => window.vsConfirmClose && window.vsConfirmClose()}>✕</button>
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
            <svg className="logo-mark" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="34" height="34" rx="6" fill="#18140e"/>
              <path d="M9 25L17 9L25 25" stroke="#c8452a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11.5 20H22.5" stroke="#c8452a" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
            </svg>
            <span className="logo-name">Vent</span>
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); history.back() }} className="nav-back">← All specialties</a>
          <a href="/#waitlist" className="nav-pill">Join waitlist</a>
        </nav>

        <section className="shero">
          <div className="shero-orb"></div>
          <div className="shero-kicker">Clinical Notes</div>
          <h1 className="shero-h1">Ophthal<em>mology</em></h1>
          <p className="shero-desc">Eighteen conditions across anterior segment, posterior segment, and neuro-ophthalmology. Built to make you understand — not memorise. The mechanism, the clinical framing, and the insight your textbook left out.</p>
          <div className="shero-stats">
            <div className="shero-stat"><div className="sv">18</div><div className="sl">Notes</div></div>
            <div className="shero-stat"><div className="sv">Ant / Post / Neuro</div><div className="sl">Toggle</div></div>
            <div className="shero-stat"><div className="sv">5 min</div><div className="sl">Per note</div></div>
          </div>
        </section>

        <section className="notes-sec">
          <div className="ns-hdr reveal">
            <div className="ns-hdr-left">
              <div className="ns-discipline-label">Ophthalmology Clinical Notes</div>
              <h2 className="ns-h2">All <em>notes</em></h2>
            </div>
            <div className="disc-toggle">
              <button className="dtab on" data-filter="all">All <span className="dtab-count">18</span></button>
              <button className="dtab" data-filter="anterior">Anterior <span className="dtab-count">7</span></button>
              <button className="dtab" data-filter="posterior">Posterior <span className="dtab-count">6</span></button>
              <button className="dtab" data-filter="neuro">Neuro <span className="dtab-count">5</span></button>
            </div>
          </div>

          <div className="notes-grid" id="notes-grid">
            {[
              {id:'cataract',disc:'anterior',num:'ANT 01',type:'Anterior · Lens',diff:2,title:'Cataract',preview:'The lens clouds and light scatters. Why nuclear sclerosis causes myopic shift, and why the red reflex is your most important clinical sign.',meta:'Nuclear Sclerosis · Phaco · Red Reflex'},
              {id:'cornea',disc:'anterior',num:'ANT 02',type:'Anterior · Cornea',diff:3,title:'Corneal Disease',preview:'From keratoconus to bullous keratopathy. Why the cornea is avascular, why it still gets inflamed, and when a slit lamp changes everything.',meta:'Keratoconus · Fuchs · Keratitis · PK'},
              {id:'glaucoma',disc:'anterior',num:'ANT 03',type:'Anterior · Glaucoma',diff:3,title:'Glaucoma',preview:'The optic nerve dies quietly. IOP is a risk factor, not a disease — and half of glaucoma patients have normal pressure.',meta:'IOP · Cup:Disc · VF Defect · Trabeculectomy'},
              {id:'redeye',disc:'anterior',num:'ANT 04',type:'Anterior · Acute',diff:3,title:'The Red Eye',preview:'Six diagnoses that all look the same at a glance. The features that separate a corneal ulcer from a closed-angle attack before the vision is gone.',meta:'Keratitis · AAG · Scleritis · Corneal Ulcer'},
              {id:'conjunctiva',disc:'anterior',num:'ANT 05',type:'Anterior · Conjunctiva',diff:1,title:'Conjunctivitis',preview:'Bacterial, viral, allergic — the discharge, the injection pattern, the follicles. Why you never patch a red eye before ruling out the dangerous causes.',meta:'Discharge · Follicles · Chlamydia · Trachoma'},
              {id:'eyelids',disc:'anterior',num:'ANT 06',type:'Anterior · Adnexa',diff:2,title:'Eyelid Disorders',preview:'Ptosis, entropion, ectropion, chalazion. Why a painless lid lump needs a biopsy and why you never ignore a recurrent chalazion in an older patient.',meta:'Ptosis · Entropion · BCC · Chalazion'},
              {id:'lacrimal',disc:'anterior',num:'ANT 07',type:'Anterior · Lacrimal',diff:2,title:'Lacrimal System',preview:'Watering eyes, dacryocystitis, dry eye syndrome. The anatomy of the nasolacrimal duct and why DCR works when probing does not.',meta:'DCR · Dacryocystitis · Dry Eye · Schirmer'},
              {id:'retina',disc:'posterior',num:'POST 01',type:'Posterior · Retina',diff:3,title:'Diabetic Retinopathy',preview:'The most common cause of blindness in working-age adults. Why NPDR becomes PDR, and what new vessels on the disc mean for the next 48 hours.',meta:'NPDR · PDR · Anti-VEGF · PRP'},
              {id:'amd',disc:'posterior',num:'POST 02',type:'Posterior · Macula',diff:3,title:'Age-Related Macular Degeneration',preview:'Dry and wet — same disease, different tempo. Why drusen matter, what geographic atrophy means for the patient, and when anti-VEGF saves vision.',meta:'Drusen · CNV · Anti-VEGF · Amsler'},
              {id:'retdetach',disc:'posterior',num:'POST 03',type:'Posterior · Emergency',diff:3,title:'Retinal Detachment',preview:'The curtain descending across vision is a surgical emergency. Rhegmatogenous vs tractional vs exudative — the mechanism determines the operation.',meta:'Rhegmatogenous · Vitrectomy · Buckle · Flashes'},
              {id:'vascular',disc:'posterior',num:'POST 04',type:'Posterior · Vascular',diff:3,title:'Retinal Vascular Occlusion',preview:'CRVO and CRAO — the stroke of the eye. Why CRAO is managed like a stroke, and why a BRVO with macular oedema needs anti-VEGF not observation.',meta:'CRVO · CRAO · GCA · Anti-VEGF'},
              {id:'uveitis',disc:'posterior',num:'POST 05',type:'Posterior · Inflammation',diff:3,title:'Uveitis',preview:'Anterior, intermediate, posterior — the anatomy tells you the aetiology. Why HLA-B27 matters, and why a quiet eye can still be destroying vision.',meta:'HLA-B27 · AC Cells · CMO · Sarcoid'},
              {id:'opticnerve',disc:'neuro',num:'NEURO 01',type:'Neuro · Optic Nerve',diff:3,title:'Optic Nerve Disease',preview:'RAPD is the single most important sign in neuro-ophthalmology. Why optic neuritis recovers but leaves an RAPD, and what papilloedema tells you about the brain.',meta:'RAPD · Papilloedema · Neuritis · AION'},
              {id:'strabismus',disc:'neuro',num:'NEURO 02',type:'Neuro · Motility',diff:3,title:'Strabismus & Diplopia',preview:'The cover test in three moves. How to localise a cranial nerve palsy from the diplopia pattern alone — and why a CN III palsy with pain is an aneurysm until proven otherwise.',meta:'CN III · CN VI · Cover Test · Amblyopia'},
              {id:'orbit',disc:'neuro',num:'NEURO 03',type:'Neuro · Orbit',diff:3,title:'Orbital Disease',preview:'Proptosis, TED, preseptal vs orbital cellulitis. The clinical signs that separate a periorbital swelling that needs antibiotics from one that needs same-day surgery.',meta:'TED · Proptosis · Cellulitis · Blow-out'},
              {id:'refraction',disc:'neuro',num:'NEURO 04',type:'Neuro · Refraction',diff:1,title:'Refractive Errors',preview:'Myopia, hyperopia, astigmatism, presbyopia. Why a young hyperope has worse near than distance, and what happens to the lens after 40.',meta:'Myopia · Astigmatism · Presbyopia · LASIK'},
              {id:'tumours',disc:'neuro',num:'NEURO 05',type:'Neuro · Oncology',diff:3,title:'Ocular Tumours',preview:'Retinoblastoma, uveal melanoma, leukocoria. Why leukocoria in a child is retinoblastoma until proven otherwise — and why the red reflex saves lives at the 6-week check.',meta:'Retinoblastoma · Melanoma · Leukocoria · RB1'},
              {id:'pharmacology',disc:'neuro',num:'NEURO 06',type:'Neuro · Pharmacology',diff:2,title:'Ophthalmic Pharmacology',preview:'Glaucoma drops, mydriatics, anti-VEGF, ocular steroids. The mechanism of each class, the side-effects that matter clinically, and what the drug tells you about the diagnosis.',meta:'Prostaglandins · Beta-blockers · Anti-VEGF · Steroids'},
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
