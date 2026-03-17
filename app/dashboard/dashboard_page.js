'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const ADMIN_ID = '20dbd05b-45c5-446a-8028-0b45b687f4ae'

const SPECIALTIES = [
  { id:'ophtho',  name:'Ophthalmology', href:'/ophtho/index.html',  notes:19, tag:'Anterior · Posterior · Neuro', desc:'From the red eye to the optic nerve. The whole eye in 19 notes.' },
  { id:'obgyn',   name:'OB/GYN',        href:'/obgyn/index.html',   notes:27, tag:'Obstetrics · Gynaecology',    desc:'PPH to ectopic. The high-stakes conditions that define the specialty.' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user,           setUser]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [stats,          setStats]          = useState({ today:0, total:0, streak:0, mcqAvg:null })
  const [progress,       setProgress]       = useState({})
  const [lastNote,       setLastNote]       = useState(null)
  const [weaknesses,     setWeaknesses]     = useState([])
  const [strengths,      setStrengths]      = useState([])
  const [scoreTrend,     setScoreTrend]     = useState([])
  const [topicBreakdown, setTopicBreakdown] = useState([])
  const [untested,       setUntested]       = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/signin'); return }
      setUser(data.user)
      loadProgress(data.user.id)
    })
  }, [])

  async function loadProgress(userId) {
    const { data, error } = await supabase.from('progress').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error || !data) { setLoading(false); return }

    const today = new Date().toISOString().slice(0,10)
    const byDate = {}; let total=0, todayCount=0
    const mcqScores=[]; const progressMap={}; const topicMap={}; const openedNotes={}
    let latestNote=null

    data.forEach(row => {
      const date = row.created_at.slice(0,10)
      byDate[date] = (byDate[date]||0)+1
      total++
      if(date===today) todayCount++
      if(!progressMap[row.specialty]) progressMap[row.specialty]={opened:new Set(),completed:new Set()}
      if(row.event==='opened'){
        progressMap[row.specialty].opened.add(row.note_id)
        if(!openedNotes[row.specialty]) openedNotes[row.specialty]=new Set()
        openedNotes[row.specialty].add(row.note_id)
      }
      if(row.event==='completed') progressMap[row.specialty].completed.add(row.note_id)
      if(row.event==='mcq_done' && row.metadata?.score_pct!=null){
        mcqScores.push({note:row.note_id,noteName:row.note_name||row.note_id,specialty:row.specialty,pct:row.metadata.score_pct,got:row.metadata.score_got,total:row.metadata.score_total,date:row.created_at})
        const tk=row.note_name||row.note_id
        if(!topicMap[tk]) topicMap[tk]={name:tk,specialty:row.specialty,scores:[]}
        topicMap[tk].scores.push(row.metadata.score_pct)
      }
      if(!latestNote && (row.event==='opened'||row.event==='completed')){
        latestNote={specialty:row.specialty,noteId:row.note_id,noteName:row.metadata?.note_name||row.note_id}
      }
    })

    let streak=0
    for(let i=0;i<60;i++){
      const d=new Date(); d.setDate(d.getDate()-i)
      const k=d.toISOString().slice(0,10)
      if(byDate[k]) streak++; else if(i>0) break
    }

    const mcqAvg = mcqScores.length>0 ? Math.round(mcqScores.reduce((a,b)=>a+b.pct,0)/mcqScores.length) : null
    const weak = mcqScores.filter(s=>s.pct<60).sort((a,b)=>a.pct-b.pct).slice(0,3)
    const trend = [...mcqScores].reverse().slice(-8)
    const breakdown = Object.values(topicMap).map(t=>({name:t.name,specialty:t.specialty,avg:Math.round(t.scores.reduce((a,b)=>a+b,0)/t.scores.length),attempts:t.scores.length})).sort((a,b)=>a.avg-b.avg)
    const strong = breakdown.filter(t=>t.avg>=80).sort((a,b)=>b.avg-a.avg).slice(0,4)
    const tested = new Set(mcqScores.map(s=>s.note))
    const untestedList=[]
    Object.entries(openedNotes).forEach(([spec,noteSet])=>{
      noteSet.forEach(noteId=>{ if(!tested.has(noteId)) untestedList.push({noteId,specialty:spec}) })
    })

    setStats({today:todayCount,total,streak,mcqAvg})
    setProgress(progressMap); setLastNote(latestNote); setWeaknesses(weak)
    setStrengths(strong); setScoreTrend(trend); setTopicBreakdown(breakdown)
    setUntested(untestedList.slice(0,5)); setLoading(false)
  }

  async function handleSignOut() { await supabase.auth.signOut(); router.push('/signin') }

  function getCompletionPct(id, total) {
    const p=progress[id]; if(!p) return 0
    return Math.round((p.completed.size/total)*100)
  }

  function specLabel(s) { return s==='obgyn'?'OB/GYN':s==='ophtho'?'Ophthalmology':s==='qbank'?'Q-Bank':s }

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
  const h = new Date().getHours()
  const greeting = h<12?'Good morning':h<18?'Good afternoon':'Good evening'

  if(loading) return (
    <div style={{minHeight:'100vh',background:'#f2ede4',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px'}}>
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
        <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M10 30 Q22 36 34 30" stroke="rgba(24,20,14,.2)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
      </svg>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',letterSpacing:'5px',color:'#b0a890',textTransform:'uppercase'}}>Loading…</div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;500;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Syne',sans-serif;background:#f2ede4;color:#18140e;-webkit-font-smoothing:antialiased;min-height:100vh;}
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.032'/%3E%3C/svg%3E");pointer-events:none;z-index:9999;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes barIn{from{width:0;}to{width:var(--w);}}
        @keyframes lineIn{from{stroke-dashoffset:var(--len);}to{stroke-dashoffset:0;}}

        /* ── NAV ── */
        .nav{
          display:flex;align-items:center;justify-content:space-between;
          height:60px;padding:0 56px;
          background:rgba(242,237,228,.92);
          backdrop-filter:blur(20px);
          border-bottom:1px solid rgba(24,20,14,.08);
          position:sticky;top:0;z-index:100;
        }
        .nav-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
        .nav-wordmark{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;letter-spacing:5px;color:#18140e;text-transform:uppercase;}
        .nav-right{display:flex;align-items:center;gap:12px;}
        .nav-email{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:#b0a890;letter-spacing:.5px;}
        .nav-admin{
          font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;
          color:#c8452a;background:rgba(200,69,42,.08);
          border:1px solid rgba(200,69,42,.25);
          padding:5px 12px;text-decoration:none;text-transform:uppercase;
          transition:all .2s;
        }
        .nav-admin:hover{background:rgba(200,69,42,.15);}
        .nav-signout{
          background:none;border:1px solid rgba(24,20,14,.14);
          padding:7px 16px;font-family:'JetBrains Mono',monospace;
          font-size:8px;letter-spacing:2px;text-transform:uppercase;
          color:#5a5140;cursor:pointer;transition:all .2s;
        }
        .nav-signout:hover{border-color:#c8452a;color:#c8452a;}

        /* ── HERO ── */
        .hero{
          padding:60px 56px 52px;
          border-bottom:1px solid rgba(24,20,14,.07);
          position:relative;overflow:hidden;
        }
        .hero::after{
          content:'';position:absolute;right:0;top:0;bottom:0;width:45%;
          background:radial-gradient(ellipse 70% 70% at 80% 50%,rgba(200,69,42,.06),transparent 70%);
          pointer-events:none;
        }
        .hero-kicker{
          font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:5px;
          text-transform:uppercase;color:rgba(200,69,42,.6);
          margin-bottom:14px;display:flex;align-items:center;gap:12px;
        }
        .hero-kicker::before{content:'';width:18px;height:1px;background:rgba(200,69,42,.5);}
        .hero-h1{
          font-family:'Instrument Serif',serif;
          font-size:clamp(38px,5vw,64px);
          font-weight:400;color:#18140e;line-height:.9;letter-spacing:-2px;
          animation:fadeUp .7s cubic-bezier(.16,1,.3,1) forwards;
          margin-bottom:0;
        }
        .hero-h1 em{font-style:italic;color:#c8452a;}

        /* ── STATS BAR ── */
        .stats{
          display:grid;grid-template-columns:repeat(4,1fr);
          border-bottom:1px solid rgba(24,20,14,.07);
        }
        .stat{
          padding:26px 28px;
          border-right:1px solid rgba(24,20,14,.07);
          transition:background .18s;
          animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both;
        }
        .stat:last-child{border-right:none;}
        .stat:nth-child(1){animation-delay:.06s;}
        .stat:nth-child(2){animation-delay:.12s;}
        .stat:nth-child(3){animation-delay:.18s;}
        .stat:nth-child(4){animation-delay:.24s;}
        .stat:hover{background:rgba(24,20,14,.022);}
        .stat-v{
          font-family:'Instrument Serif',serif;
          font-size:44px;font-style:italic;
          color:#c8452a;line-height:1;margin-bottom:5px;
        }
        .stat-v.neutral{color:#18140e;}
        .stat-v.good{color:#2d6e4a;}
        .stat-l{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#b0a890;}

        /* ── BODY ── */
        .body{max-width:1240px;margin:0 auto;padding:56px 56px 120px;}

        /* ── SECTION ── */
        .sec{margin-bottom:52px;}
        .sec-hdr{
          display:flex;align-items:baseline;gap:14px;
          margin-bottom:22px;padding-bottom:14px;
          border-bottom:1px solid rgba(24,20,14,.07);
          position:relative;
        }
        .sec-hdr::before{content:'';position:absolute;bottom:-1px;left:0;width:28px;height:1px;background:#c8452a;}
        .sec-title{font-family:'Instrument Serif',serif;font-size:24px;color:#18140e;letter-spacing:-.3px;}
        .sec-title em{font-style:italic;color:#c8452a;}
        .sec-meta{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;color:#b0a890;text-transform:uppercase;}

        /* ── SPECIALTY CARDS ── */
        .cards{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
        .card{
          background:#f8f4ec;border:1px solid rgba(24,20,14,.1);
          padding:28px;cursor:pointer;position:relative;
          overflow:hidden;transition:all .22s;
          text-decoration:none;display:block;
        }
        .card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:rgba(200,69,42,.18);transition:background .22s;}
        .card:hover{border-color:rgba(24,20,14,.22);transform:translateY(-2px);box-shadow:0 10px 40px rgba(0,0,0,.07);}
        .card:hover::before{background:#c8452a;}
        .card-tag{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:2px;text-transform:uppercase;color:#b0a890;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;}
        .card-prog{height:2px;background:#e8e2d8;margin-bottom:14px;overflow:hidden;}
        .card-prog-fill{height:100%;background:#c8452a;transition:width .6s cubic-bezier(.16,1,.3,1);}
        .card-name{font-family:'Instrument Serif',serif;font-size:28px;color:#18140e;line-height:1;margin-bottom:7px;}
        .card-desc{font-size:12.5px;color:#5a5140;line-height:1.7;margin-bottom:22px;}
        .card-footer{display:flex;align-items:center;justify-content:space-between;}
        .card-progress-txt{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:#b0a890;}
        .card-pct{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:#c8452a;}
        .card-arrow{font-size:16px;color:#c8452a;transition:transform .2s;}
        .card:hover .card-arrow{transform:translate(2px,-2px);}

        /* ── CONTINUE BANNER ── */
        .continue{
          background:#18140e;padding:28px 32px;
          display:flex;align-items:center;justify-content:space-between;gap:20px;
          text-decoration:none;transition:background .2s;
          border-left:3px solid #c8452a;
        }
        .continue:hover{background:#221c15;}
        .continue-kicker{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(250,247,240,.28);margin-bottom:7px;}
        .continue-title{font-family:'Instrument Serif',serif;font-size:21px;color:#f8f4ec;line-height:1.2;}
        .continue-title em{font-style:italic;color:#e05a3a;}
        .continue-arrow{font-size:22px;color:#c8452a;flex-shrink:0;}

        /* ── WEAKNESSES ── */
        .weak-list{display:flex;flex-direction:column;gap:10px;}
        .weak-item{
          background:#f8f4ec;border:1px solid rgba(24,20,14,.09);
          border-left:3px solid #c8452a;
          padding:14px 18px;
          display:flex;align-items:center;justify-content:space-between;
          transition:background .15s;
        }
        .weak-item:hover{background:#f4f0e6;}
        .weak-name{font-size:12.5px;font-weight:600;color:#18140e;}
        .weak-spec{font-family:'JetBrains Mono',monospace;font-size:8px;color:#b0a890;letter-spacing:.5px;margin-top:2px;}
        .weak-score{font-family:'Instrument Serif',serif;font-size:26px;font-style:italic;color:#c8452a;}
        .empty{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;color:#b0a890;padding:20px 0;}

        /* ── TREND CHART ── */
        .trend-wrap{
          background:#f8f4ec;border:1px solid rgba(24,20,14,.09);
          padding:24px;margin-bottom:8px;
        }
        .trend-bars{display:flex;align-items:flex-end;gap:8px;height:72px;margin-bottom:12px;}
        .trend-col{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1;}
        .trend-bar{width:100%;border-radius:1px;min-height:4px;transition:height .4s cubic-bezier(.16,1,.3,1);}
        .trend-bar.good{background:#2d6e4a;}
        .trend-bar.ok{background:#c8962a;}
        .trend-bar.bad{background:#c8452a;}
        .trend-val{font-family:'JetBrains Mono',monospace;font-size:8px;color:#b0a890;white-space:nowrap;}
        .trend-caption{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:#b0a890;letter-spacing:1px;}

        /* ── ANALYTICS GRID ── */
        .analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .panel{background:#f8f4ec;border:1px solid rgba(24,20,14,.09);padding:22px;}
        .panel-title{
          font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:3px;
          text-transform:uppercase;color:#b0a890;
          margin-bottom:18px;display:flex;align-items:center;gap:10px;
        }
        .panel-title::after{content:'';flex:1;height:1px;background:rgba(24,20,14,.07);}

        .topic-row{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
        .topic-row:last-child{margin-bottom:0;}
        .topic-name{font-size:11.5px;font-weight:500;color:#18140e;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .topic-bar-bg{flex:2;height:3px;background:#e8e2d8;border-radius:2px;overflow:hidden;}
        .topic-bar-fill{height:100%;border-radius:2px;transition:width .5s cubic-bezier(.16,1,.3,1);}
        .topic-bar-fill.good{background:#2d6e4a;}
        .topic-bar-fill.ok{background:#c8962a;}
        .topic-bar-fill.bad{background:#c8452a;}
        .topic-pct{font-family:'Instrument Serif',serif;font-size:15px;font-style:italic;min-width:34px;text-align:right;}
        .topic-pct.good{color:#2d6e4a;}
        .topic-pct.ok{color:#c8962a;}
        .topic-pct.bad{color:#c8452a;}
        .topic-tries{font-family:'JetBrains Mono',monospace;font-size:7.5px;color:#b0a890;min-width:18px;text-align:right;}

        .untested-item{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(24,20,14,.06);}
        .untested-item:last-child{border-bottom:none;}
        .untested-name{font-size:11.5px;font-weight:500;color:#18140e;}
        .untested-spec{font-family:'JetBrains Mono',monospace;font-size:7.5px;color:#b0a890;margin-top:2px;}
        .untested-badge{font-family:'JetBrains Mono',monospace;font-size:7.5px;letter-spacing:1px;color:#c8452a;background:rgba(200,69,42,.07);border:1px solid rgba(200,69,42,.18);padding:3px 8px;}

        @media(max-width:768px){
          .nav,.body{padding-left:20px;padding-right:20px;}
          .hero{padding:48px 20px 40px;}
          .stats{grid-template-columns:repeat(2,1fr);}
          .stat:nth-child(2){border-right:none;}
          .stat:nth-child(1),.stat:nth-child(2){border-bottom:1px solid rgba(24,20,14,.07);}
          .cards{grid-template-columns:1fr;}
          .analytics-grid{grid-template-columns:1fr;}
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <svg viewBox="0 0 44 44" fill="none" width="30" height="30">
            <circle cx="22" cy="22" r="21" stroke="rgba(24,20,14,.2)" strokeWidth="1.2"/>
            <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 30 Q22 36 34 30" stroke="rgba(24,20,14,.25)" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
            <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
          </svg>
          <span className="nav-wordmark">Vent</span>
        </a>
        <div className="nav-right">
          <span className="nav-email">{user?.email}</span>
          {user?.id===ADMIN_ID && <a href="/admin" className="nav-admin">Admin</a>}
          <button className="nav-signout" onClick={handleSignOut}>Sign out</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-kicker">Dashboard</div>
        <h1 className="hero-h1">{greeting},<br/><em>{name}.</em></h1>
      </div>

      {/* STATS */}
      <div className="stats">
        {[
          {v:stats.today,   l:'Sessions today', cls:'neutral'},
          {v:stats.total,   l:'All-time',        cls:'neutral'},
          {v:stats.streak,  l:'Day streak',      cls:stats.streak>=7?'good':'neutral'},
          {v:stats.mcqAvg!==null?`${stats.mcqAvg}%`:'—', l:'MCQ average', cls:stats.mcqAvg>=70?'good':stats.mcqAvg!==null?'':'' },
        ].map((s,i)=>(
          <div key={i} className="stat" style={{animationDelay:`${i*.07}s`}}>
            <div className={`stat-v ${s.cls}`}>{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* BODY */}
      <div className="body">

        {/* SPECIALTIES */}
        <div className="sec">
          <div className="sec-hdr">
            <div className="sec-title">Your <em>specialties</em></div>
            <div className="sec-meta">{SPECIALTIES.length} available</div>
          </div>
          <div className="cards">
            {SPECIALTIES.map(s=>{
              const pct = getCompletionPct(s.id, s.notes)
              const opened = progress[s.id]?.opened.size||0
              return (
                <a key={s.id} href={s.href} className="card">
                  <div className="card-tag">
                    <span>{s.tag}</span>
                    {pct>0 && <span className="card-pct">{pct}%</span>}
                  </div>
                  <div className="card-prog">
                    <div className="card-prog-fill" style={{width:`${pct}%`}}/>
                  </div>
                  <div className="card-name">{s.name}</div>
                  <div className="card-desc">{s.desc}</div>
                  <div className="card-footer">
                    <span className="card-progress-txt">{opened} / {s.notes} notes opened</span>
                    <span className="card-arrow">↗</span>
                  </div>
                </a>
              )
            })}
          </div>
        </div>

        {/* CONTINUE */}
        {lastNote && (
          <div className="sec">
            <div className="sec-hdr">
              <div className="sec-title">Continue where you <em>left off</em></div>
            </div>
            <a href={`/${lastNote.specialty}/index.html`} className="continue">
              <div>
                <div className="continue-kicker">Last active · {specLabel(lastNote.specialty)}</div>
                <div className="continue-title">Pick up from<br/><em>{lastNote.noteName}</em></div>
              </div>
              <div className="continue-arrow">→</div>
            </a>
          </div>
        )}

        {/* WEAK AREAS */}
        <div className="sec">
          <div className="sec-hdr">
            <div className="sec-title">Areas to <em>revisit</em></div>
            <div className="sec-meta">Based on MCQ scores</div>
          </div>
          {weaknesses.length===0
            ? <div className="empty">Complete some MCQs and your weak areas will appear here.</div>
            : <div className="weak-list">
                {weaknesses.map((w,i)=>(
                  <div key={i} className="weak-item">
                    <div>
                      <div className="weak-name">{w.noteName||w.note}</div>
                      <div className="weak-spec">{specLabel(w.specialty)}</div>
                    </div>
                    <div className="weak-score">{w.pct}%</div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* ANALYTICS */}
        {scoreTrend.length>0 && (
          <div className="sec">
            <div className="sec-hdr">
              <div className="sec-title">Performance <em>analytics</em></div>
              <div className="sec-meta">{scoreTrend.length} sessions tracked</div>
            </div>

            {/* Trend bars */}
            <div className="trend-wrap">
              <div className="trend-bars">
                {scoreTrend.map((s,i)=>{
                  const barH = Math.max(5, Math.round((s.pct/100)*56))
                  const cls = s.pct>=80?'good':s.pct>=60?'ok':'bad'
                  return (
                    <div key={i} className="trend-col" title={`${s.pct}% — ${s.noteName||s.note}`}>
                      <div className={`trend-bar ${cls}`} style={{height:`${barH}px`}}/>
                      <div className="trend-val">{s.pct}%</div>
                    </div>
                  )
                })}
              </div>
              <div className="trend-caption">MCQ score trend — last {scoreTrend.length} sessions</div>
            </div>

            <div className="analytics-grid" style={{marginTop:16}}>

              {/* Topic breakdown */}
              {topicBreakdown.length>0 && (
                <div className="panel">
                  <div className="panel-title">All topics</div>
                  {topicBreakdown.slice(0,6).map((t,i)=>{
                    const cls=t.avg>=80?'good':t.avg>=60?'ok':'bad'
                    return (
                      <div key={i} className="topic-row">
                        <div className="topic-name" title={t.name}>{t.name}</div>
                        <div className="topic-bar-bg">
                          <div className={`topic-bar-fill ${cls}`} style={{width:`${t.avg}%`}}/>
                        </div>
                        <div className={`topic-pct ${cls}`}>{t.avg}%</div>
                        <div className="topic-tries">{t.attempts}×</div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{display:'flex',flexDirection:'column',gap:16}}>

                {/* Strengths */}
                {strengths.length>0 && (
                  <div className="panel">
                    <div className="panel-title">Strong areas</div>
                    {strengths.map((t,i)=>(
                      <div key={i} className="topic-row">
                        <div className="topic-name" title={t.name}>{t.name}</div>
                        <div className="topic-bar-bg">
                          <div className="topic-bar-fill good" style={{width:`${t.avg}%`}}/>
                        </div>
                        <div className="topic-pct good">{t.avg}%</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Untested */}
                {untested.length>0 && (
                  <div className="panel">
                    <div className="panel-title">Opened — never tested</div>
                    {untested.map((u,i)=>(
                      <div key={i} className="untested-item">
                        <div>
                          <div className="untested-name">{u.noteId}</div>
                          <div className="untested-spec">{specLabel(u.specialty)}</div>
                        </div>
                        <div className="untested-badge">No MCQ</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
