'use client'

import { useEffect } from 'react'
import Head from 'next/head'
import './home.css'

export default function Home() {
  useEffect(() => {
    // Waitlist handler
    window.handleWaitlist = async function() {
      const email = document.getElementById("ei").value.trim()
      const year = document.getElementById("yr").value
      const errEl = document.getElementById("cerr")
      const btn = document.getElementById("sb")
      errEl.classList.remove("show")
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){
        errEl.textContent="Please enter a valid email address."
        errEl.classList.add("show")
        return
      }
      btn.disabled=true
      btn.textContent="Submitting..."
      await fetch("/api/waitlist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,year})})
      document.getElementById("fc").innerHTML='<div style="padding:48px 0"><div style="font-family:\'Instrument Serif\',serif;font-size:52px;color:#e85d3f;font-style:italic;line-height:1;margin-bottom:20px">You\'re in.</div><p style="color:rgba(245,242,235,.65);font-size:16px;line-height:1.75">We\'ll reach out when Vent opens.<br>Until then — breathe.</p></div>'
    }

    // Notify me handler
    window.notifyMe = function(btn, specialty) {
      btn.textContent = '✓ Noted'
      btn.disabled = true
      const t = document.getElementById('toast')
      t.textContent = "we'll tell you when " + specialty + " drops."
      t.classList.add('show')
      setTimeout(() => t.classList.remove('show'), 3600)
    }

    // Custom cursor
    if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
      const dot = document.getElementById('cdot')
      const ring = document.getElementById('cring')
      let mx=0,my=0,rx=0,ry=0
      document.addEventListener('mousemove', e => {
        mx=e.clientX; my=e.clientY
        dot.style.left=mx+'px'; dot.style.top=my+'px'
      })
      ;(function loop(){
        rx+=(mx-rx)*.1; ry+=(my-ry)*.1
        ring.style.left=rx+'px'; ring.style.top=ry+'px'
        requestAnimationFrame(loop)
      })()
      document.querySelectorAll('a,button,.sc').forEach(el => {
        el.addEventListener('mouseenter',()=>{dot.style.transform='translate(-50%,-50%) scale(2.2)';ring.style.width='52px';ring.style.height='52px';ring.style.borderColor='rgba(200,69,42,.65)'})
        el.addEventListener('mouseleave',()=>{dot.style.transform='translate(-50%,-50%)';ring.style.width='36px';ring.style.height='36px';ring.style.borderColor='rgba(200,69,42,.35)'})
      })
    }

    // Hamburger menu
    const hbg = document.getElementById('hbg')
    const drawer = document.getElementById('drawer')
    hbg.addEventListener('click', () => {
      const opening = !hbg.classList.contains('open')
      hbg.classList.toggle('open')
      if(opening){drawer.style.display='flex';requestAnimationFrame(()=>drawer.classList.add('open'));document.body.style.overflow='hidden'}
      else{drawer.classList.remove('open');setTimeout(()=>{drawer.style.display='none'},300);document.body.style.overflow=''}
    })
    document.querySelectorAll('.drawer-link').forEach(l => l.addEventListener('click', () => {
      hbg.classList.remove('open'); drawer.classList.remove('open')
      setTimeout(()=>{drawer.style.display='none'},300); document.body.style.overflow=''
    }))

    // Reveal on scroll
    const obs = new IntersectionObserver(e => {
      e.forEach(x => { if(x.isIntersecting) x.target.classList.add('visible') })
    },{threshold:.08,rootMargin:'0px 0px -32px 0px'})
    document.querySelectorAll('.reveal').forEach(el => {
      const p = el.closest('.spec-grid,.s-right,.w-rows')
      if(p){const i=Array.from(p.children).indexOf(el);if(i>-1)el.style.transitionDelay=i*.1+'s'}
      obs.observe(el)
    })
  }, [])

  return (
    <>      <Head>
        <meta name="description" content="Your medical learning companion" />
        <meta property="og:description" content="Your medical learning companion" />
        <meta property="og:title" content="vent.med" />
        <meta name="twitter:description" content="Your medical learning companion" />
      </Head>
      <div id="cdot"></div>
      <div id="cring"></div>
      <div id="toast" className="toast"></div>

      <nav>
        <a href="/" className="logo">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="21" stroke="#1a1510" strokeWidth="1.5"/>
            <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 30 Q22 36 34 30" stroke="#1a1510" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
            <path d="M14 22 Q10 26 10 30" stroke="#c8452a" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
            <path d="M30 22 Q34 26 34 30" stroke="#c8452a" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
          </svg>
          <span className="logo-name">Vent</span>
        </a>
        <div className="nav-links">
          <a href="#specialties">Specialties</a>
          <a href="#story">Our story</a>
          <a href="/qbank">Q-Bank</a>
          <a href="#waitlist">Early access</a>
        </div>
        <a href="#waitlist" className="nav-pill">Join waitlist</a>
        <button className="nav-hamburger" id="hbg" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
      </nav>

      <div className="nav-drawer" id="drawer">
        <a href="#specialties" className="drawer-link">Specialties</a>
        <a href="#story" className="drawer-link">Our story</a>
        <a href="/qbank" className="drawer-link">Q-Bank</a>
        <a href="#waitlist" className="drawer-link drawer-pill">Join waitlist</a>
      </div>

      <section className="hero">
        <div className="hero-l">
          <div className="hero-kick">2026 — Early access</div>
          <h1 className="hero-hl">Finally,<br/><em>breathe.</em></h1>
          <p className="hero-body">Medical school gives you <strong>10,000 pages</strong> when you need ten minutes. Vent gives you the framework — so you can finally understand, not just memorise.</p>
          <div className="hero-ctas">
            <a href="#specialties" className="btn-p">Browse notes</a>
            <a href="#story" className="btn-g">Read the story →</a>
          </div>
        </div>
        <div className="hero-r">
          <div className="particle" style={{left:'20%',animationDuration:'6s',animationDelay:'0s'}}></div>
          <div className="particle" style={{left:'45%',animationDuration:'8s',animationDelay:'1.5s',width:'5px',height:'5px'}}></div>
          <div className="particle" style={{left:'68%',animationDuration:'5s',animationDelay:'.8s'}}></div>
          <div className="particle" style={{left:'82%',animationDuration:'9s',animationDelay:'3s'}}></div>
          <div className="hero-glow"></div>
          <div className="hero-brand-panel">
            <div className="hbp-logo">
              <svg width="120" height="120" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="21" stroke="rgba(245,242,235,0.07)" strokeWidth="1.5"/>
                <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M10 30 Q22 36 34 30" stroke="rgba(245,242,235,0.22)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
                <circle cx="22" cy="10" r="5" fill="#c8452a" opacity="0.15">
                  <animate attributeName="r" values="2.5;10;2.5" dur="3s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite"/>
                </circle>
                <path d="M14 22 Q10 26 10 30" stroke="#c8452a" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
                <path d="M30 22 Q34 26 34 30" stroke="#c8452a" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
              </svg>
            </div>
            <div className="hbp-name">VENT</div>
            <div className="hbp-sub">ventilate · vent · breathe</div>
            <div className="hbp-manifesto">
              <div className="hbp-m-line">Clinical notes that teach.</div>
              <div className="hbp-m-line">Questions that test what matters.</div>
              <div className="hbp-m-line hbp-m-accent">Built to make you understand.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="specs" id="specialties">
        <div className="reveal">
          <div className="sec-kick">// Clinical notes</div>
          <h2 className="sec-hl">Choose your<br/><em>specialty</em></h2>
          <p className="sec-desc">Every note built to the same standard — integrated visuals, clinical reasoning frameworks, and the insight no textbook gives you.</p>
        </div>
        <div className="spec-grid">
          <a href="/ophtho" className="sc reveal">
            <div className="sc-icon">👁</div>
            <div className="sc-num">01 — Ophthalmology</div>
            <div className="sc-title">Eye &amp; Vision</div>
            <p className="sc-desc">Lens anatomy, cataracts and their types, corneal infections, retinal anatomy, diabetic retinopathy, hypertensive retinopathy.</p>
            <div className="sc-foot" style={{flexDirection:'column',alignItems:'flex-start',gap:'8px'}}>
              <div className="breathing-badge"><span className="breathing-dot"></span>Test yourself — 5 MCQs per note</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%'}}>
                <div className="sc-meta">6 notes · 5 MCQs each · Live</div>
                <div className="sc-arr">↗</div>
              </div>
            </div>
          </a>
          <a href="/obgyn" className="sc reveal">
            <div className="sc-icon">🩺</div>
            <div className="sc-num">02 — OB/GYN</div>
            <div className="sc-title">Obstetrics &amp; Gynaecology</div>
            <p className="sc-desc">PPH, preeclampsia, ectopic pregnancy, placenta praevia, gestational diabetes, shoulder dystocia — and 21 more.</p>
            <div className="sc-foot" style={{flexDirection:'column',alignItems:'flex-start',gap:'8px'}}>
              <div className="breathing-badge"><span className="breathing-dot"></span>Test yourself — MCQs per note</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%'}}>
                <div className="sc-meta">27 notes · Live</div>
                <div className="sc-arr">↗</div>
              </div>
            </div>
          </a>
          {[
            {icon:'🫀',num:'03 — Internal Medicine',title:'Internal Med',desc:'Heart failure, ACS, pneumonia, COPD, sepsis, AKI, liver disease.',specialty:'Internal Medicine'},
            {icon:'🩻',num:'04 — Surgery',title:'Surgery',desc:'Appendicitis, bowel obstruction, hernias, acute abdomen, perioperative care.',specialty:'Surgery'},
            {icon:'🧠',num:'05 — Neurology',title:'Neurology',desc:'Stroke, seizures, meningitis, Parkinson\'s, MS.',specialty:'Neurology'},
            {icon:'👶',num:'06 — Paediatrics',title:'Paediatrics',desc:'Paediatric sepsis, bronchiolitis, febrile convulsions, developmental milestones.',specialty:'Paediatrics'},
          ].map(s => (
            <div key={s.num} className="sc soon reveal">
              <div className="soon-tag">Coming soon</div>
              <div className="sc-icon">{s.icon}</div>
              <div className="sc-num">{s.num}</div>
              <div className="sc-title">{s.title}</div>
              <p className="sc-desc">{s.desc}</p>
              <div className="sc-foot">
                <div className="sc-meta">In progress</div>
                <button className="sc-notify" onClick={(e) => window.notifyMe && window.notifyMe(e.currentTarget, s.specialty)}>Notify me →</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="qbank-entry">
        <div className="qbank-entry-in reveal">
          <div className="qbe-left">
            <div className="qbe-tag">// Q-Bank</div>
            <h2 className="qbe-hl">Test yourself.<br/><em>No notes allowed.</em></h2>
            <p className="qbe-body">Pure recall. Choose a specialty, set your mode, pick your count. Clinical questions written from the notes — so they test exactly what matters. Growing towards 1,000+.</p>
            <a href="/qbank" className="qbe-btn">Enter Q-Bank <span>↗</span></a>
          </div>
          <div className="qbe-right">
            <div className="qbe-stat">
              <div className="qbe-stat-n">1,000+</div>
              <div className="qbe-stat-l">Questions — the goal</div>
            </div>
            <div className="qbe-divider"></div>
            <div className="qbe-modes">
              <div className="qbe-mode"><span className="qbe-mode-dot"></span>Normal — feedback after each</div>
              <div className="qbe-mode"><span className="qbe-mode-dot exam"></span>Exam — results at the end</div>
            </div>
          </div>
        </div>
      </section>

      <section className="story" id="story">
        <div className="story-in">
          <div className="s-eye">The story behind Vent</div>
          <div className="s-grid">
            <div className="s-left reveal">
              <h2 className="s-hl">One word.<br/><em>Two truths.</em></h2>
              <div className="mb">
                <div className="mb-t">// What &quot;Vent&quot; means</div>
                <div className="mb-r">
                  <div className="mb-ico">🫁</div>
                  <div><div className="mb-w">Ventilate</div><div className="mb-d">To supply fresh air. In medicine — keeping someone alive when they can&apos;t breathe alone.</div></div>
                </div>
                <div className="mb-r">
                  <div className="mb-ico">💬</div>
                  <div><div className="mb-w">To Vent</div><div className="mb-d">To release. To express what&apos;s suffocating you. Med school is overwhelming — you need somewhere to exhale.</div></div>
                </div>
                <div className="mb-r">
                  <div className="mb-ico">⚡</div>
                  <div><div className="mb-w">The Logo</div><div className="mb-d">A V tracing the bronchial tree. A breath entering, branching. Relief made into a mark.</div></div>
                </div>
              </div>
            </div>
            <div className="s-right">
              <div className="ch reveal">
                <div className="ch-n">Chapter 01 — The problem</div>
                <div className="ch-t">I was suffocating in my own curriculum.</div>
                <p className="ch-b">Final year. Every week a new mountain of material. <strong>No one tells you which 20% actually matters.</strong></p>
              </div>
              <div className="ch reveal">
                <div className="ch-n">Chapter 02 — The realization</div>
                <div className="ch-t">The best students weren&apos;t reading more.</div>
                <p className="ch-b">They had frameworks. They knew <strong>what to look for, not everything there is to see.</strong></p>
              </div>
              <div className="ch reveal">
                <div className="ch-n">Chapter 03 — The answer</div>
                <div className="ch-t">So I built what I needed.</div>
                <p className="ch-b">Not a database. Not a question bank. <strong>A breathing room</strong> — where content earns its place or gets cut.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="what">
        <div className="w-hdr reveal">
          <h2 className="w-hl">What Vent<br/><em>actually is</em></h2>
          <p className="w-note">Notes. MCQs. A full Q-Bank. In one place. Nothing you do not need.</p>
        </div>
        <div className="w-rows">
          <div className="wr reveal">
            <div className="wrn">1</div>
            <div className="wrm"><h3>Concept-driven visual notes</h3><p>Every condition with integrated diagrams that teach, not just label.</p></div>
            <div className="wrx"><div className="wrxl">Format</div><div className="wrxv">Premium SVG diagrams built into the text flow. Not appended — integrated.</div></div>
          </div>
          <div className="wr reveal">
            <div className="wrn">2</div>
            <div className="wrm"><h3>Clinical reasoning frameworks</h3><p>Here&apos;s how to think through it when the patient is in front of you at 3am.</p></div>
            <div className="wrx"><div className="wrxl">The differentiator</div><div className="wrxv">Every note ends with &quot;what everyone gets wrong&quot; — the insight no textbook includes.</div></div>
          </div>
          <div className="wr reveal">
            <div className="wrn">3</div>
            <div className="wrm"><h3>A full Q-Bank — standalone, not an afterthought</h3><p>Clinical questions across specialties, growing towards 1,000+.</p></div>
            <div className="wrx"><div className="wrxl">Two modes</div><div className="wrxv">Normal: per-question feedback. Exam: no feedback until the end.</div></div>
          </div>
          <div className="wr reveal">
            <div className="wrn">4</div>
            <div className="wrm"><h3>Test yourself — built in, not bolted on</h3><p>5 clinical MCQs at the end of every note. Right there, in the same breath.</p></div>
            <div className="wrx"><div className="wrxl">How it works</div><div className="wrxv">Finish reading. One tap. Questions written from the note. Immediate results.</div></div>
          </div>
        </div>
      </section>

      <section className="breathe">
        <div className="bring"></div><div className="bring"></div><div className="bring"></div><div className="bring"></div>
        <div className="bc">
          <h2>You can<br/><em>breathe now.</em></h2>
          <p>Medicine is already the hardest thing you&apos;ll ever do. Your notes shouldn&apos;t be.</p>
          <a href="#waitlist" className="bc-cta">Get early access →</a>
        </div>
      </section>

      <section className="cta" id="waitlist">
        <div className="ctabg">Breathe.</div>
        <div className="cta-in">
          <div className="reveal">
            <h2 className="c-hl">Time to<br/><em>exhale.</em></h2>
            <p className="c-body">Vent is in early access. Join the waitlist and be first through the door. No spam. No filler. Just the signal.</p>
          </div>
          <div className="c-form reveal" id="fc">
            <input type="email" className="c-field" placeholder="your@email.com" id="ei" autoComplete="email"/>
            <select className="c-field" id="yr" defaultValue="">
              <option value="" disabled>What year are you in?</option>
              <option value="MS1">MS1</option>
              <option value="MS2">MS2</option>
              <option value="MS3">MS3</option>
              <option value="MS4">MS4</option>
              <option value="Resident">Resident</option>
              <option value="Other">Other</option>
            </select>
            <p className="c-err" id="cerr">Please enter a valid email address.</p>
            <button className="c-btn" id="sb" onClick={() => window.handleWaitlist && window.handleWaitlist()}>Join the waitlist →</button>
            <p className="c-note">// no spam. no filler. just vent.</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="f-in">
          <div>
            <div className="f-logo">
              <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="21" stroke="rgba(245,242,235,0.2)" strokeWidth="1.5"/>
                <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M10 30 Q22 36 34 30" stroke="rgba(245,242,235,0.3)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
              </svg>
              <span className="f-name">VENT</span>
            </div>
            <p className="f-tag">Finally. Just what you need.<br/>Beta · 2026</p>
          </div>
          <div className="f-links">
            <a href="#story">Story</a>
            <a href="#specialties">Specialties</a>
            <a href="#waitlist">Early access</a>
            <a href="#">Privacy</a>
          </div>
          <div className="f-right">
            <div className="f-social"><a href="#">Instagram</a><a href="#">X / Twitter</a></div>
            <div className="f-copy">© 2026 Vent. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </>
  )
}
