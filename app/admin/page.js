'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const ADMIN_USER_ID = '20dbd05b-45c5-446a-8028-0b45b687f4ae'

export default function AdminPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [data, setData]             = useState(null)
  const [expanded, setExpanded]     = useState({})
  const [inactiveDays, setInactiveDays] = useState(7)
  const [activeTab, setActiveTab]   = useState('users')
  const [now, setNow]               = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    supabase.auth.getUser().then(({ data: auth }) => {
      if (!auth.user || auth.user.id !== ADMIN_USER_ID) { router.push('/'); return }
      setAuthorized(true)
      loadAdminData()
    })
    return () => clearInterval(tick)
  }, [])

  async function loadAdminData() {
    const { data: rows, error } = await supabase
      .from('progress')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !rows) { setLoading(false); return }

    const userIds = [...new Set(rows.map(r => r.user_id))]
    const userMap = {}
    userIds.forEach(id => {
      userMap[id] = { id, sessions:0, lastActive:null, mcqScores:[], mcqSessions:[], openedNotes:new Set(), specialties:new Set(), firstSeen:null }
    })

    const notePopularity = {}
    rows.forEach(row => {
      const u = userMap[row.user_id]
      if (!u) return
      u.sessions++
      if (!u.lastActive || row.created_at > u.lastActive) u.lastActive = row.created_at
      if (!u.firstSeen  || row.created_at < u.firstSeen)  u.firstSeen  = row.created_at
      u.specialties.add(row.specialty)
      if (row.event === 'opened') {
        u.openedNotes.add(`${row.specialty}:${row.note_id}`)
        const key = `${row.specialty}::${row.note_name || row.note_id}`
        notePopularity[key] = (notePopularity[key] || 0) + 1
      }
      if (row.event === 'mcq_done' && row.metadata?.score_pct != null) {
        u.mcqScores.push(row.metadata.score_pct)
        u.mcqSessions.push({ note:row.note_name||row.note_id, specialty:row.specialty, pct:row.metadata.score_pct, got:row.metadata.score_got, total:row.metadata.score_total, date:row.created_at })
      }
    })

    const today   = new Date().toISOString().slice(0,10)
    const weekAgo = new Date(Date.now()-7*86400000).toISOString()
    const todaySessions = rows.filter(r => r.created_at.slice(0,10)===today).length
    const weekSessions  = rows.filter(r => r.created_at>=weekAgo).length
    const allMcq = rows.filter(r => r.event==='mcq_done' && r.metadata?.score_pct!=null).map(r => r.metadata.score_pct)
    const platformAvg = allMcq.length>0 ? Math.round(allMcq.reduce((a,b)=>a+b,0)/allMcq.length) : null

    const users = Object.values(userMap).sort((a,b) => new Date(b.lastActive)-new Date(a.lastActive)).map(u => ({
      ...u,
      mcqAvg: u.mcqScores.length>0 ? Math.round(u.mcqScores.reduce((a,b)=>a+b,0)/u.mcqScores.length) : null,
      openedNotes: u.openedNotes.size,
      specialties: [...u.specialties],
      daysSinceActive: u.lastActive ? Math.floor((Date.now()-new Date(u.lastActive))/86400000) : 999,
    }))

    const topNotes = Object.entries(notePopularity)
      .map(([key,count]) => { const [specialty,name]=key.split('::'); return {specialty,name,count} })
      .sort((a,b)=>b.count-a.count).slice(0,10)

    setData({ users, topNotes, todaySessions, weekSessions, platformAvg, totalRows:rows.length })
    setLoading(false)
  }

  function toggleExpand(id) { setExpanded(prev=>({...prev,[id]:!prev[id]})) }
  function formatDate(iso) { if(!iso) return '—'; return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) }
  function daysSince(iso) { if(!iso) return '—'; const d=Math.floor((Date.now()-new Date(iso))/86400000); if(d===0) return 'Today'; if(d===1) return 'Yesterday'; return `${d}d ago` }
  function specLabel(s) { if(s==='obgyn') return 'OB/GYN'; if(s==='ophtho') return 'Ophtho'; if(s==='qbank') return 'Q-Bank'; return s }

  if (loading || !authorized) return (
    <div style={{minHeight:'100vh',background:'#070604',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'20px'}}>
      <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
        <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M10 30 Q22 36 34 30" stroke="rgba(245,242,235,0.15)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
      </svg>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'8px',letterSpacing:'5px',color:'rgba(232,228,220,.25)',textTransform:'uppercase',animation:'pulse 2s ease infinite'}}>
        {loading ? 'Loading…' : 'Unauthorized'}
      </div>
    </div>
  )

  const inactiveUsers = data.users.filter(u => u.daysSinceActive >= inactiveDays)
  const activeUsers   = data.users.filter(u => u.daysSinceActive < inactiveDays)
  const retentionRate = data.users.length>0 ? Math.round((activeUsers.length/data.users.length)*100) : 0
  const timeStr = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  const dateStr = now.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;500;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{font-family:'Syne',sans-serif;background:#070604;color:#e2ddd4;-webkit-font-smoothing:antialiased;min-height:100vh;}

        /* Grain */
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");pointer-events:none;z-index:9998;}

        @keyframes pulse{0%,100%{opacity:.3;}50%{opacity:1;}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}
        @keyframes barGrow{from{width:0;}to{width:var(--w);}}
        @keyframes countUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes ringDraw{from{stroke-dashoffset:201;}to{stroke-dashoffset:var(--offset);}}

        /* ── NAV ── */
        .nav{
          display:flex;align-items:center;justify-content:space-between;
          height:56px;padding:0 48px;
          background:rgba(7,6,4,.85);
          backdrop-filter:blur(20px) saturate(1.8);
          border-bottom:1px solid rgba(255,255,255,.04);
          position:sticky;top:0;z-index:200;
        }
        .nav-left{display:flex;align-items:center;gap:16px;}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
        .nav-wordmark{font-family:'Syne',sans-serif;font-size:14px;font-weight:800;letter-spacing:6px;color:#e2ddd4;text-transform:uppercase;}
        .nav-pill{
          font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:3px;
          color:#c8452a;background:rgba(200,69,42,.1);
          border:1px solid rgba(200,69,42,.25);
          padding:3px 9px;text-transform:uppercase;border-radius:2px;
        }
        .nav-right{display:flex;align-items:center;gap:20px;}
        .nav-clock{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(232,228,220,.18);letter-spacing:2px;line-height:1.6;text-align:right;}
        .nav-back{
          font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;
          color:rgba(232,228,220,.25);text-decoration:none;text-transform:uppercase;
          transition:color .2s;display:flex;align-items:center;gap:6px;
        }
        .nav-back:hover{color:rgba(232,228,220,.7);}

        /* ── HERO ── */
        .hero{
          padding:64px 48px 52px;
          border-bottom:1px solid rgba(255,255,255,.04);
          position:relative;overflow:hidden;
          background:linear-gradient(180deg,rgba(200,69,42,.03) 0%,transparent 60%);
        }
        .hero-bg{
          position:absolute;right:0;top:0;bottom:0;width:55%;
          background:radial-gradient(ellipse 70% 80% at 80% 50%,rgba(200,69,42,.055),transparent 65%);
          pointer-events:none;
        }
        .hero-watermark{
          position:absolute;right:40px;top:50%;transform:translateY(-50%);
          font-family:'Instrument Serif',serif;font-size:200px;font-style:italic;
          color:transparent;-webkit-text-stroke:1px rgba(200,69,42,.035);
          line-height:1;pointer-events:none;user-select:none;letter-spacing:-8px;
        }
        .hero-eyebrow{
          font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:5px;
          color:rgba(200,69,42,.7);text-transform:uppercase;margin-bottom:14px;
          display:flex;align-items:center;gap:12px;
        }
        .hero-eyebrow::before{content:'';width:20px;height:1px;background:rgba(200,69,42,.5);}
        .hero-h1{
          font-family:'Instrument Serif',serif;
          font-size:clamp(44px,5.5vw,72px);
          font-weight:400;color:#e8e4dc;line-height:.88;
          letter-spacing:-2px;
          animation:fadeUp .7s cubic-bezier(.16,1,.3,1) forwards;
        }
        .hero-h1 em{font-style:italic;color:#c8452a;}

        /* ── STATS STRIP ── */
        .stats-strip{
          display:grid;grid-template-columns:repeat(6,1fr);
          border-bottom:1px solid rgba(255,255,255,.04);
        }
        .stat{
          padding:28px 24px;
          border-right:1px solid rgba(255,255,255,.04);
          position:relative;overflow:hidden;
          transition:background .2s;
          animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both;
        }
        .stat:last-child{border-right:none;}
        .stat:nth-child(1){animation-delay:.05s;}
        .stat:nth-child(2){animation-delay:.1s;}
        .stat:nth-child(3){animation-delay:.15s;}
        .stat:nth-child(4){animation-delay:.2s;}
        .stat:nth-child(5){animation-delay:.25s;}
        .stat:nth-child(6){animation-delay:.3s;}
        .stat:hover{background:rgba(255,255,255,.018);}
        .stat::after{
          content:'';position:absolute;top:0;left:0;right:0;height:1px;
          background:transparent;transition:background .3s;
        }
        .stat:hover::after{background:linear-gradient(90deg,transparent,rgba(200,69,42,.35),transparent);}
        .stat-v{
          font-family:'Instrument Serif',serif;font-size:44px;
          font-style:italic;line-height:1;margin-bottom:6px;
          animation:countUp .6s cubic-bezier(.16,1,.3,1) both;
        }
        .stat-v.red{color:#c8452a;}
        .stat-v.green{color:#4a9465;}
        .stat-v.amber{color:#c89030;}
        .stat-v.white{color:#e8e4dc;}
        .stat-l{font-family:'JetBrains Mono',monospace;font-size:7.5px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(232,228,220,.22);}
        .stat-sub{font-family:'JetBrains Mono',monospace;font-size:7.5px;color:rgba(200,69,42,.45);margin-top:5px;letter-spacing:.5px;}

        /* ── TABS ── */
        .tabs{
          display:flex;padding:0 48px;
          border-bottom:1px solid rgba(255,255,255,.04);
          position:sticky;top:56px;z-index:100;
          background:rgba(7,6,4,.92);backdrop-filter:blur(20px);
        }
        .tab{
          font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2.5px;
          text-transform:uppercase;padding:16px 20px;
          border:none;background:none;cursor:pointer;
          color:rgba(232,228,220,.25);
          border-bottom:1px solid transparent;margin-bottom:-1px;
          transition:all .15s;display:flex;align-items:center;gap:8px;
        }
        .tab:hover{color:rgba(232,228,220,.55);}
        .tab.active{color:#e8e4dc;border-bottom-color:#c8452a;}
        .tab-badge{
          background:rgba(200,69,42,.18);color:#c8452a;
          font-size:7px;padding:1px 6px;border-radius:99px;
          border:1px solid rgba(200,69,42,.2);
        }

        /* ── BODY ── */
        .body{padding:48px;max-width:1440px;}

        /* ── SECTION ── */
        .sec{margin-bottom:56px;animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both;}
        .sec-hdr{
          display:flex;align-items:center;justify-content:space-between;
          margin-bottom:20px;padding-bottom:14px;
          border-bottom:1px solid rgba(255,255,255,.04);
          position:relative;
        }
        .sec-hdr::before{content:'';position:absolute;bottom:-1px;left:0;width:32px;height:1px;background:#c8452a;}
        .sec-title{font-family:'Instrument Serif',serif;font-size:26px;color:#e8e4dc;letter-spacing:-.3px;}
        .sec-title em{font-style:italic;color:#c8452a;}
        .sec-meta{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.5px;color:rgba(232,228,220,.2);text-transform:uppercase;}

        /* ── TABLE ── */
        .tbl-wrap{overflow-x:auto;}
        .tbl{width:100%;border-collapse:collapse;}
        .th{
          font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:2.5px;
          text-transform:uppercase;color:rgba(232,228,220,.18);
          padding:10px 14px;text-align:left;
          border-bottom:1px solid rgba(255,255,255,.05);
          white-space:nowrap;
        }
        .tr{border-bottom:1px solid rgba(255,255,255,.025);cursor:pointer;transition:background .12s;}
        .tr:hover{background:rgba(255,255,255,.022);}
        .tr.dim .td{opacity:.38;}
        .td{padding:14px;font-size:12px;color:#e2ddd4;vertical-align:middle;white-space:nowrap;}
        .td.mono{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:rgba(232,228,220,.35);}

        /* Activity dot */
        .dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0;}
        .dot.green{background:#4a9465;box-shadow:0 0 7px rgba(74,148,101,.5);}
        .dot.amber{background:#c89030;box-shadow:0 0 5px rgba(200,144,48,.3);}
        .dot.gray{background:rgba(232,228,220,.12);}

        /* Score */
        .score{font-family:'Instrument Serif',serif;font-size:20px;font-style:italic;}
        .score.good{color:#4a9465;}
        .score.ok{color:#c89030;}
        .score.bad{color:#c8452a;}
        .score.none{font-family:'JetBrains Mono',monospace;font-size:11px;font-style:normal;color:rgba(232,228,220,.2);}

        /* Spec chip */
        .chip{
          display:inline-block;font-family:'JetBrains Mono',monospace;font-size:7px;
          letter-spacing:1px;padding:2px 7px;margin-right:4px;
          border:1px solid rgba(255,255,255,.07);color:rgba(232,228,220,.3);
          text-transform:uppercase;border-radius:2px;
        }
        .chip.ophtho{border-color:rgba(74,148,101,.3);color:rgba(74,148,101,.7);}
        .chip.obgyn{border-color:rgba(200,69,42,.3);color:rgba(200,69,42,.6);}
        .chip.qbank{border-color:rgba(200,144,48,.3);color:rgba(200,144,48,.6);}
        .chip.forensic{border-color:rgba(120,90,200,.3);color:rgba(120,90,200,.6);}
        .chip.pathology{border-color:rgba(80,140,200,.3);color:rgba(80,140,200,.6);}

        /* Expand */
        .chevron{font-size:11px;color:rgba(232,228,220,.18);transition:transform .22s;display:inline-block;}
        .chevron.open{transform:rotate(90deg);color:#c8452a;}
        .expand-row{background:rgba(200,69,42,.025);border-bottom:1px solid rgba(255,255,255,.025);}
        .expand-inner{padding:18px 14px 22px;border-left:2px solid rgba(200,69,42,.18);margin:0 14px;}
        .expand-hdr{
          font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:3px;
          text-transform:uppercase;color:rgba(232,228,220,.22);
          margin-bottom:12px;display:flex;align-items:center;gap:10px;
        }
        .expand-hdr::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.04);}
        .mcq-row{
          display:grid;grid-template-columns:1fr 90px 56px 60px 110px;
          gap:14px;padding:9px 0;
          border-bottom:1px solid rgba(255,255,255,.035);
          align-items:center;
        }
        .mcq-row:last-child{border-bottom:none;}
        .mcq-note{font-size:11.5px;font-weight:500;color:rgba(232,228,220,.75);}
        .mcq-spec{font-family:'JetBrains Mono',monospace;font-size:7.5px;color:rgba(232,228,220,.22);text-transform:uppercase;letter-spacing:1px;}
        .mcq-pct{font-family:'Instrument Serif',serif;font-size:19px;font-style:italic;}
        .mcq-frac{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(232,228,220,.25);}
        .mcq-date{font-family:'JetBrains Mono',monospace;font-size:7.5px;color:rgba(232,228,220,.22);text-align:right;}

        /* ── INACTIVE ── */
        .threshold-row{display:flex;align-items:center;gap:8px;}
        .threshold-label{font-family:'JetBrains Mono',monospace;font-size:7.5px;color:rgba(232,228,220,.25);letter-spacing:1px;text-transform:uppercase;}
        .threshold-btn{
          background:none;border:1px solid rgba(255,255,255,.07);
          color:rgba(232,228,220,.28);font-family:'JetBrains Mono',monospace;
          font-size:8.5px;letter-spacing:1px;padding:4px 11px;cursor:pointer;
          transition:all .12s;border-radius:2px;
        }
        .threshold-btn:hover{border-color:rgba(200,69,42,.3);color:rgba(232,228,220,.6);}
        .threshold-btn.on{border-color:#c8452a;color:#c8452a;background:rgba(200,69,42,.08);}

        /* Retention card */
        .retention-card{
          display:flex;align-items:center;gap:28px;
          padding:24px 28px;
          border:1px solid rgba(255,255,255,.05);
          background:rgba(255,255,255,.014);
          margin-bottom:28px;
        }
        .ring{position:relative;width:76px;height:76px;flex-shrink:0;}
        .ring svg{transform:rotate(-90deg);}
        .ring-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .ring-pct{font-family:'Instrument Serif',serif;font-size:19px;font-style:italic;color:#e8e4dc;line-height:1;}
        .ring-sub{font-family:'JetBrains Mono',monospace;font-size:6.5px;color:rgba(232,228,220,.28);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;}
        .retention-info-title{font-family:'Instrument Serif',serif;font-size:17px;color:#e8e4dc;margin-bottom:5px;}
        .retention-info-sub{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(232,228,220,.28);line-height:1.75;}

        .inactive-card{
          display:flex;align-items:center;justify-content:space-between;
          padding:16px 20px;
          border:1px solid rgba(255,255,255,.04);
          border-left:2px solid rgba(200,69,42,.25);
          background:rgba(200,69,42,.025);
          margin-bottom:6px;
          transition:all .12s;
        }
        .inactive-card:hover{background:rgba(200,69,42,.05);border-left-color:#c8452a;}
        .inactive-id{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:rgba(232,228,220,.5);margin-bottom:3px;}
        .inactive-meta{font-family:'JetBrains Mono',monospace;font-size:7.5px;color:rgba(232,228,220,.22);letter-spacing:.3px;}
        .inactive-days{font-family:'Instrument Serif',serif;font-size:30px;font-style:italic;color:#c8452a;line-height:1;}
        .inactive-days-lbl{font-family:'JetBrains Mono',monospace;font-size:6.5px;color:rgba(200,69,42,.4);letter-spacing:2px;text-transform:uppercase;text-align:right;margin-top:2px;}

        /* ── TOP NOTES ── */
        .note-row{
          display:grid;grid-template-columns:32px 1fr 88px 180px 52px;
          align-items:center;gap:14px;
          padding:13px 0;
          border-bottom:1px solid rgba(255,255,255,.035);
          transition:background .12s;
        }
        .note-row:hover{background:rgba(255,255,255,.018);}
        .note-row:last-child{border-bottom:none;}
        .note-rank{font-family:'Instrument Serif',serif;font-size:20px;font-style:italic;color:rgba(232,228,220,.1);}
        .note-name{font-size:12.5px;font-weight:500;color:rgba(232,228,220,.75);}
        .note-spec{font-family:'JetBrains Mono',monospace;font-size:7.5px;color:rgba(232,228,220,.28);text-transform:uppercase;letter-spacing:1px;}
        .bar-bg{height:2px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden;}
        .bar-fill{height:100%;background:linear-gradient(90deg,#c8452a,rgba(200,69,42,.3));border-radius:2px;animation:barGrow .7s cubic-bezier(.16,1,.3,1) both;animation-delay:.3s;}
        .note-count{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:rgba(232,228,220,.32);text-align:right;}

        .empty{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(232,228,220,.16);padding:20px 0;letter-spacing:1px;}

        @media(max-width:1024px){
          .nav,.hero,.body,.tabs{padding-left:24px;padding-right:24px;}
          .stats-strip{grid-template-columns:repeat(3,1fr);}
        }
        @media(max-width:640px){
          .stats-strip{grid-template-columns:repeat(2,1fr);}
          .mcq-row{grid-template-columns:1fr 56px 56px;}
          .note-row{grid-template-columns:28px 1fr 80px 40px;}
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-left">
          <a href="/" className="nav-logo">
            <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
              <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M10 30 Q22 36 34 30" stroke="rgba(245,242,235,0.12)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
            </svg>
            <span className="nav-wordmark">Vent</span>
          </a>
          <div className="nav-pill">// Admin</div>
        </div>
        <div className="nav-right">
          <div className="nav-clock">
            <div>{timeStr}</div>
            <div>{dateStr}</div>
          </div>
          <a href="/dashboard" className="nav-back">← Dashboard</a>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-bg"/>
        <div className="hero-watermark">Admin</div>
        <div className="hero-eyebrow">Owner view · Live data</div>
        <h1 className="hero-h1">Platform<br/><em>overview.</em></h1>
      </div>

      {/* STATS */}
      <div className="stats-strip">
        {[
          {v:data.users.length, l:'Total users', cls:'red'},
          {v:activeUsers.length, l:'Active (7d)', cls:'white', sub:`${retentionRate}% retained`},
          {v:data.todaySessions, l:'Sessions today', cls:'white'},
          {v:data.weekSessions, l:'This week', cls:'white'},
          {v:data.totalRows.toLocaleString(), l:'Total events', cls:'white'},
          {v:data.platformAvg!==null?`${data.platformAvg}%`:'—', l:'MCQ average', cls: data.platformAvg>=70?'green':data.platformAvg>=50?'amber':'red'},
        ].map((s,i)=>(
          <div key={i} className="stat" style={{animationDelay:`${i*.06}s`}}>
            <div className={`stat-v ${s.cls}`}>{s.v}</div>
            <div className="stat-l">{s.l}</div>
            {s.sub && <div className="stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="tabs">
        {[['users','Users'],['inactive','Inactive'],['notes','Top Notes']].map(([id,label])=>(
          <button key={id} className={`tab ${activeTab===id?'active':''}`} onClick={()=>setActiveTab(id)}>
            {label}
            {id==='inactive' && inactiveUsers.length>0 && (
              <span className="tab-badge">{inactiveUsers.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div className="body">

        {/* USERS */}
        {activeTab==='users' && (
          <div className="sec">
            <div className="sec-hdr">
              <div className="sec-title">All <em>users</em></div>
              <div className="sec-meta">{data.users.length} accounts · click to expand</div>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    {['','User ID','Specialties','Sessions','Notes','MCQ avg','MCQ sessions','First seen','Last active',''].map((h,i)=>(
                      <th key={i} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(u=>{
                    const isExp = expanded[u.id]
                    const sc = u.mcqAvg===null?'none':u.mcqAvg>=80?'good':u.mcqAvg>=60?'ok':'bad'
                    const dc = u.daysSinceActive===0?'green':u.daysSinceActive<=3?'amber':'gray'
                    return (
                      <>
                        <tr key={u.id} className={`tr ${u.daysSinceActive>=inactiveDays?'dim':''}`} onClick={()=>toggleExpand(u.id)}>
                          <td className="td" style={{paddingRight:0,width:28}}><span className={`dot ${dc}`}/></td>
                          <td className="td mono">{u.id.slice(0,8)}…</td>
                          <td className="td">{u.specialties.map(s=><span key={s} className={`chip ${s}`}>{specLabel(s)}</span>)}</td>
                          <td className="td mono">{u.sessions}</td>
                          <td className="td mono">{u.openedNotes}</td>
                          <td className="td"><span className={`score ${sc}`}>{u.mcqAvg!==null?`${u.mcqAvg}%`:'—'}</span></td>
                          <td className="td mono">{u.mcqSessions.length}</td>
                          <td className="td mono">{formatDate(u.firstSeen)}</td>
                          <td className="td mono">{daysSince(u.lastActive)}</td>
                          <td className="td"><span className={`chevron ${isExp?'open':''}`}>›</span></td>
                        </tr>
                        {isExp && (
                          <tr key={`${u.id}-exp`} className="expand-row">
                            <td colSpan={10} style={{padding:'0 14px'}}>
                              <div className="expand-inner">
                                {u.mcqSessions.length===0
                                  ? <div className="empty">// No MCQ sessions recorded yet.</div>
                                  : <>
                                    <div className="expand-hdr">MCQ sessions — {u.mcqSessions.length} total</div>
                                    {u.mcqSessions.map((s,i)=>{
                                      const c=s.pct>=80?'#4a9465':s.pct>=60?'#c89030':'#c8452a'
                                      return (
                                        <div key={i} className="mcq-row">
                                          <div className="mcq-note">{s.note}<div className="mcq-spec">{specLabel(s.specialty)}</div></div>
                                          <div/>
                                          <div className="mcq-pct" style={{color:c}}>{s.pct}%</div>
                                          <div className="mcq-frac">{s.got!=null?`${s.got}/${s.total}`:''}</div>
                                          <div className="mcq-date">{formatDate(s.date)}</div>
                                        </div>
                                      )
                                    })}
                                  </>
                                }
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INACTIVE */}
        {activeTab==='inactive' && (
          <div className="sec">
            <div className="sec-hdr">
              <div className="sec-title">Inactive <em>users</em></div>
              <div className="threshold-row">
                <span className="threshold-label">Threshold</span>
                {[3,7,14,30].map(d=>(
                  <button key={d} className={`threshold-btn ${inactiveDays===d?'on':''}`} onClick={()=>setInactiveDays(d)}>{d}d</button>
                ))}
              </div>
            </div>

            <div className="retention-card">
              <div className="ring">
                <svg width="76" height="76" viewBox="0 0 76 76">
                  <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="3.5"/>
                  <circle cx="38" cy="38" r="32" fill="none" stroke="#c8452a" strokeWidth="3.5"
                    strokeDasharray={`${2*Math.PI*32}`}
                    strokeDashoffset={`${2*Math.PI*32*(1-retentionRate/100)}`}
                    strokeLinecap="round"
                    style={{transition:'stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)'}}
                  />
                </svg>
                <div className="ring-label">
                  <div className="ring-pct">{retentionRate}%</div>
                  <div className="ring-sub">active</div>
                </div>
              </div>
              <div>
                <div className="retention-info-title">{activeUsers.length} of {data.users.length} users active in last {inactiveDays}d</div>
                <div className="retention-info-sub">
                  {inactiveUsers.length} user{inactiveUsers.length!==1?'s':''} haven't returned in {inactiveDays}+ days.<br/>
                  <span style={{color:'#4a9465'}}>●</span> Today &nbsp;
                  <span style={{color:'#c89030'}}>●</span> Within 3d &nbsp;
                  <span style={{color:'rgba(232,228,220,.18)'}}>●</span> Stale
                </div>
              </div>
            </div>

            {inactiveUsers.length===0
              ? <div className="empty">// No users inactive for {inactiveDays}+ days. 🔥</div>
              : inactiveUsers.map(u=>(
                <div key={u.id} className="inactive-card">
                  <div>
                    <div className="inactive-id">{u.id.slice(0,8)}…{u.id.slice(-4)}</div>
                    <div className="inactive-meta">
                      {u.sessions} sessions · {u.openedNotes} notes · MCQ {u.mcqAvg!==null?`${u.mcqAvg}%`:'none'} · {u.specialties.map(specLabel).join(', ')}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className="inactive-days">{u.daysSinceActive}d</div>
                    <div className="inactive-days-lbl">inactive</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* TOP NOTES */}
        {activeTab==='notes' && (
          <div className="sec">
            <div className="sec-hdr">
              <div className="sec-title">Most <em>opened</em></div>
              <div className="sec-meta">Top {data.topNotes.length} across all users</div>
            </div>
            {data.topNotes.length===0
              ? <div className="empty">// No note opens recorded yet.</div>
              : data.topNotes.map((n,i)=>(
                <div key={i} className="note-row" style={{animationDelay:`${i*.04}s`}}>
                  <div className="note-rank">{i+1}</div>
                  <div>
                    <div className="note-name">{n.name}</div>
                    <div className="note-spec">{specLabel(n.specialty)}</div>
                  </div>
                  <div/>
                  <div className="bar-bg">
                    <div className="bar-fill" style={{'--w':`${Math.round((n.count/data.topNotes[0].count)*100)}%`,width:`${Math.round((n.count/data.topNotes[0].count)*100)}%`}}/>
                  </div>
                  <div className="note-count">{n.count}×</div>
                </div>
              ))
            }
          </div>
        )}

      </div>
    </>
  )
}
