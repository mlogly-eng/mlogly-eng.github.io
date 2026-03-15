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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: auth }) => {
      if (!auth.user || auth.user.id !== ADMIN_USER_ID) {
        router.push('/')
        return
      }
      setAuthorized(true)
      loadAdminData()
    })
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
      userMap[id] = {
        id, sessions: 0, lastActive: null,
        mcqScores: [], mcqSessions: [],
        openedNotes: new Set(), specialties: new Set(), firstSeen: null,
      }
    })

    const notePopularity = {}
    rows.forEach(row => {
      const u = userMap[row.user_id]
      if (!u) return
      u.sessions++
      if (!u.lastActive || row.created_at > u.lastActive) u.lastActive = row.created_at
      if (!u.firstSeen || row.created_at < u.firstSeen) u.firstSeen = row.created_at
      u.specialties.add(row.specialty)
      if (row.event === 'opened') {
        u.openedNotes.add(`${row.specialty}:${row.note_id}`)
        const key = `${row.specialty}::${row.note_name || row.note_id}`
        notePopularity[key] = (notePopularity[key] || 0) + 1
      }
      if (row.event === 'mcq_done' && row.metadata?.score_pct != null) {
        u.mcqScores.push(row.metadata.score_pct)
        u.mcqSessions.push({
          note: row.note_name || row.note_id,
          specialty: row.specialty,
          pct: row.metadata.score_pct,
          got: row.metadata.score_got,
          total: row.metadata.score_total,
          date: row.created_at,
        })
      }
    })

    const today   = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const todaySessions = rows.filter(r => r.created_at.slice(0, 10) === today).length
    const weekSessions  = rows.filter(r => r.created_at >= weekAgo).length
    const allMcqScores  = rows.filter(r => r.event === 'mcq_done' && r.metadata?.score_pct != null).map(r => r.metadata.score_pct)
    const platformAvg   = allMcqScores.length > 0 ? Math.round(allMcqScores.reduce((a,b) => a+b,0) / allMcqScores.length) : null

    const users = Object.values(userMap).sort((a,b) =>
      new Date(b.lastActive) - new Date(a.lastActive)
    ).map(u => ({
      ...u,
      mcqAvg: u.mcqScores.length > 0 ? Math.round(u.mcqScores.reduce((a,b) => a+b,0) / u.mcqScores.length) : null,
      openedNotes: u.openedNotes.size,
      specialties: [...u.specialties],
      daysSinceActive: u.lastActive ? Math.floor((Date.now() - new Date(u.lastActive)) / 86400000) : 999,
    }))

    const topNotes = Object.entries(notePopularity)
      .map(([key, count]) => { const [specialty, name] = key.split('::'); return { specialty, name, count } })
      .sort((a,b) => b.count - a.count).slice(0, 10)

    setData({ users, topNotes, todaySessions, weekSessions, platformAvg, totalRows: rows.length })
    setLoading(false)
  }

  function toggleExpand(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })) }

  function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function daysSince(iso) {
    if (!iso) return '—'
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  function specLabel(s) {
    if (s === 'obgyn') return 'OB/GYN'
    if (s === 'ophtho') return 'Ophtho'
    if (s === 'qbank') return 'Q-Bank'
    return s
  }

  if (loading || !authorized) return (
    <div style={{minHeight:'100vh',background:'#080705',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px'}}>
      <svg width="40" height="40" viewBox="0 0 44 44" fill="none">
        <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M10 30 Q22 36 34 30" stroke="rgba(245,242,235,0.2)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
      </svg>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'9px',letterSpacing:'4px',color:'#3a3530',textTransform:'uppercase',animation:'pulse 2s ease infinite'}}>
        {loading ? 'Loading data…' : 'Unauthorized'}
      </div>
    </div>
  )

  const inactiveUsers = data.users.filter(u => u.daysSinceActive >= inactiveDays)
  const activeUsers   = data.users.filter(u => u.daysSinceActive < inactiveDays)
  const retentionRate = data.users.length > 0 ? Math.round((activeUsers.length / data.users.length) * 100) : 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{font-family:'Syne',sans-serif;background:#080705;color:#e8e4dc;-webkit-font-smoothing:antialiased;min-height:100vh;}

        /* Grain overlay */
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");pointer-events:none;z-index:9998;}

        @keyframes pulse{0%,100%{opacity:.4;}50%{opacity:1;}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}

        /* NAV */
        .adm-nav{
          display:flex;justify-content:space-between;align-items:center;
          padding:0 56px;height:64px;
          position:sticky;top:0;z-index:100;
          background:rgba(8,7,5,.9);
          backdrop-filter:blur(24px) saturate(1.5);
          border-bottom:1px solid rgba(255,255,255,.05);
        }
        .adm-nav-left{display:flex;align-items:center;gap:20px;}
        .adm-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
        .adm-logo-name{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;letter-spacing:5px;color:#e8e4dc;}
        .adm-badge{
          font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:3px;
          color:#c8452a;background:rgba(200,69,42,.1);
          border:1px solid rgba(200,69,42,.3);padding:3px 10px;
          text-transform:uppercase;
        }
        .adm-back{
          font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;
          color:rgba(232,228,220,.25);text-decoration:none;
          transition:color .2s;display:flex;align-items:center;gap:6px;
        }
        .adm-back:hover{color:rgba(232,228,220,.7);}
        .adm-time{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(232,228,220,.2);letter-spacing:1px;}

        /* HERO */
        .adm-hero{
          padding:72px 56px 56px;
          border-bottom:1px solid rgba(255,255,255,.05);
          position:relative;overflow:hidden;
        }
        .adm-hero::before{
          content:'';position:absolute;inset:0;
          background:radial-gradient(ellipse 60% 80% at 90% 50%,rgba(200,69,42,.06),transparent 60%);
          pointer-events:none;
        }
        .adm-hero-ghost{
          position:absolute;right:-20px;top:50%;transform:translateY(-50%);
          font-family:'Instrument Serif',serif;font-size:220px;font-style:italic;
          color:transparent;-webkit-text-stroke:1px rgba(200,69,42,.04);
          line-height:1;pointer-events:none;user-select:none;letter-spacing:-8px;
        }
        .adm-eyebrow{
          font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:5px;
          color:#c8452a;text-transform:uppercase;margin-bottom:16px;
          display:flex;align-items:center;gap:14px;
        }
        .adm-eyebrow::before{content:'';width:24px;height:1px;background:#c8452a;}
        .adm-h1{
          font-family:'Instrument Serif',serif;
          font-size:clamp(48px,6vw,80px);
          font-weight:400;color:#e8e4dc;line-height:.9;
          letter-spacing:-2px;margin-bottom:0;
          animation:fadeUp .8s cubic-bezier(.16,1,.3,1) forwards;
        }
        .adm-h1 em{font-style:italic;color:#c8452a;}

        /* STATS GRID */
        .adm-stats-wrap{padding:48px 56px;border-bottom:1px solid rgba(255,255,255,.05);}
        .adm-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:1px;background:rgba(255,255,255,.05);}
        .adm-stat{
          background:#080705;padding:28px 24px;
          position:relative;overflow:hidden;
          transition:background .2s;
        }
        .adm-stat:hover{background:rgba(255,255,255,.02);}
        .adm-stat::after{
          content:'';position:absolute;top:0;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,rgba(200,69,42,0),transparent);
          transition:background .3s;
        }
        .adm-stat:hover::after{background:linear-gradient(90deg,transparent,rgba(200,69,42,.4),transparent);}
        .adm-stat-v{
          font-family:'Instrument Serif',serif;font-size:42px;font-style:italic;
          color:#e8e4dc;line-height:1;margin-bottom:6px;
        }
        .adm-stat-v.accent{color:#c8452a;}
        .adm-stat-v.green{color:#3a7a52;}
        .adm-stat-v.amber{color:#c89030;}
        .adm-stat-l{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(232,228,220,.25);}
        .adm-stat-sub{font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(200,69,42,.5);margin-top:4px;}

        /* TABS */
        .adm-tabs-wrap{padding:0 56px;border-bottom:1px solid rgba(255,255,255,.05);display:flex;gap:0;}
        .adm-tab{
          font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;
          text-transform:uppercase;padding:18px 24px;
          border:none;background:none;cursor:pointer;
          color:rgba(232,228,220,.3);
          border-bottom:2px solid transparent;margin-bottom:-1px;
          transition:all .15s;
        }
        .adm-tab:hover{color:rgba(232,228,220,.6);}
        .adm-tab.active{color:#e8e4dc;border-bottom-color:#c8452a;}

        /* BODY */
        .adm-body{padding:48px 56px 120px;max-width:1400px;}

        /* SECTION */
        .adm-sec{margin-bottom:64px;animation:fadeUp .6s cubic-bezier(.16,1,.3,1) forwards;}
        .adm-sec-hdr{
          display:flex;align-items:baseline;justify-content:space-between;
          gap:16px;margin-bottom:24px;padding-bottom:16px;
          border-bottom:1px solid rgba(255,255,255,.05);
          position:relative;
        }
        .adm-sec-hdr::before{content:'';position:absolute;bottom:-1px;left:0;width:40px;height:1px;background:#c8452a;}
        .adm-sec-title{font-family:'Instrument Serif',serif;font-size:28px;font-weight:400;color:#e8e4dc;letter-spacing:-.5px;}
        .adm-sec-title em{font-style:italic;color:#c8452a;}
        .adm-sec-meta{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.5px;color:rgba(232,228,220,.25);text-transform:uppercase;}

        /* TABLE */
        .adm-table-wrap{overflow-x:auto;}
        .adm-table{width:100%;border-collapse:collapse;}
        .adm-th{
          font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:2.5px;
          text-transform:uppercase;color:rgba(232,228,220,.2);
          padding:10px 16px;text-align:left;
          border-bottom:1px solid rgba(255,255,255,.05);
          white-space:nowrap;
        }
        .adm-tr{
          border-bottom:1px solid rgba(255,255,255,.03);
          cursor:pointer;transition:background .15s;
        }
        .adm-tr:hover{background:rgba(255,255,255,.025);}
        .adm-tr.inactive-row .adm-td{opacity:.4;}
        .adm-td{padding:16px;font-size:12px;color:#e8e4dc;vertical-align:middle;white-space:nowrap;}
        .adm-td.mono{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(232,228,220,.4);}

        /* Score pill */
        .score-pill{
          display:inline-flex;align-items:center;justify-content:center;
          font-family:'Instrument Serif',serif;font-size:18px;font-style:italic;
          min-width:52px;padding:2px 10px;
        }
        .score-pill.good{color:#3a7a52;}
        .score-pill.ok{color:#c89030;}
        .score-pill.bad{color:#c8452a;}
        .score-pill.none{color:rgba(232,228,220,.2);font-size:14px;font-style:normal;font-family:'JetBrains Mono',monospace;}

        /* Activity indicator */
        .activity-dot{
          width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:8px;flex-shrink:0;
        }
        .activity-dot.active{background:#3a7a52;box-shadow:0 0 6px rgba(58,122,82,.6);}
        .activity-dot.recent{background:#c89030;}
        .activity-dot.stale{background:rgba(232,228,220,.15);}

        /* Spec chips */
        .spec-chip{
          display:inline-block;font-family:'JetBrains Mono',monospace;font-size:7px;
          letter-spacing:1px;padding:2px 7px;
          border:1px solid rgba(255,255,255,.08);color:rgba(232,228,220,.35);
          margin-right:4px;text-transform:uppercase;
        }
        .spec-chip.obgyn{border-color:rgba(200,69,42,.25);color:rgba(200,69,42,.6);}
        .spec-chip.ophtho{border-color:rgba(58,122,82,.25);color:rgba(58,122,82,.6);}
        .spec-chip.forensic{border-color:rgba(200,144,48,.25);color:rgba(200,144,48,.6);}
        .spec-chip.pathology{border-color:rgba(100,80,180,.25);color:rgba(100,80,180,.6);}

        /* Expand row */
        .adm-expand-row{background:rgba(200,69,42,.03);}
        .adm-expand-inner{padding:20px 16px 24px 16px;border-left:2px solid rgba(200,69,42,.2);}
        .adm-expand-title{
          font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:3px;
          text-transform:uppercase;color:rgba(232,228,220,.25);margin-bottom:14px;
          display:flex;align-items:center;gap:10px;
        }
        .adm-expand-title::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.04);}
        .adm-session-row{
          display:grid;grid-template-columns:1fr 80px 60px 60px 100px;
          align-items:center;gap:16px;
          padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);
        }
        .adm-session-row:last-child{border-bottom:none;}
        .adm-session-note{font-size:12px;font-weight:600;color:rgba(232,228,220,.8);}
        .adm-session-spec{font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(232,228,220,.25);text-transform:uppercase;letter-spacing:1px;}
        .adm-session-score{font-family:'Instrument Serif',serif;font-size:20px;font-style:italic;}
        .adm-session-frac{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(232,228,220,.3);}
        .adm-session-date{font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(232,228,220,.25);text-align:right;}

        .adm-chevron{font-size:11px;color:rgba(232,228,220,.2);transition:transform .25s;display:inline-block;line-height:1;}
        .adm-chevron.open{transform:rotate(90deg);color:#c8452a;}

        /* Inactive users */
        .adm-threshold{display:flex;align-items:center;gap:8px;}
        .adm-threshold-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(232,228,220,.3);letter-spacing:1px;text-transform:uppercase;}
        .adm-threshold-btn{
          background:none;border:1px solid rgba(255,255,255,.07);
          color:rgba(232,228,220,.3);font-family:'JetBrains Mono',monospace;
          font-size:9px;letter-spacing:1px;padding:5px 12px;cursor:pointer;
          transition:all .15s;
        }
        .adm-threshold-btn:hover{border-color:rgba(200,69,42,.3);color:rgba(232,228,220,.6);}
        .adm-threshold-btn.on{border-color:#c8452a;color:#c8452a;background:rgba(200,69,42,.08);}

        .adm-inactive-card{
          display:flex;align-items:center;justify-content:space-between;
          padding:18px 20px;
          border:1px solid rgba(255,255,255,.05);
          border-left:2px solid rgba(200,69,42,.3);
          background:rgba(200,69,42,.03);
          margin-bottom:8px;
          transition:all .15s;
        }
        .adm-inactive-card:hover{background:rgba(200,69,42,.06);border-left-color:#c8452a;}
        .adm-inactive-id{font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(232,228,220,.5);margin-bottom:4px;}
        .adm-inactive-meta{font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(232,228,220,.25);letter-spacing:.5px;}
        .adm-inactive-days{font-family:'Instrument Serif',serif;font-size:32px;font-style:italic;color:#c8452a;line-height:1;}
        .adm-inactive-days-label{font-family:'JetBrains Mono',monospace;font-size:7px;color:rgba(200,69,42,.4);letter-spacing:2px;text-transform:uppercase;text-align:right;margin-top:2px;}

        /* Top notes */
        .adm-note-row{
          display:grid;grid-template-columns:36px 1fr 90px 160px 56px;
          align-items:center;gap:16px;
          padding:14px 0;border-bottom:1px solid rgba(255,255,255,.04);
          transition:background .15s;
        }
        .adm-note-row:last-child{border-bottom:none;}
        .adm-note-row:hover{background:rgba(255,255,255,.02);}
        .adm-note-rank{font-family:'Instrument Serif',serif;font-size:22px;font-style:italic;color:rgba(232,228,220,.12);}
        .adm-note-name{font-size:13px;font-weight:600;color:rgba(232,228,220,.8);}
        .adm-note-spec{font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(232,228,220,.3);text-transform:uppercase;letter-spacing:1px;}
        .adm-note-bar-bg{height:2px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden;}
        .adm-note-bar-fill{height:100%;background:linear-gradient(90deg,#c8452a,rgba(200,69,42,.4));border-radius:2px;transition:width .6s cubic-bezier(.16,1,.3,1);}
        .adm-note-count{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(232,228,220,.35);text-align:right;}

        .adm-empty{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(232,228,220,.18);padding:24px 0;letter-spacing:1px;}

        /* Retention ring */
        .retention-ring{position:relative;width:80px;height:80px;flex-shrink:0;}
        .retention-ring svg{transform:rotate(-90deg);}
        .retention-ring-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .retention-ring-pct{font-family:'Instrument Serif',serif;font-size:20px;font-style:italic;color:#e8e4dc;line-height:1;}
        .retention-ring-sub{font-family:'JetBrains Mono',monospace;font-size:7px;color:rgba(232,228,220,.3);letter-spacing:1px;margin-top:1px;}

        .adm-retention-card{
          display:flex;align-items:center;gap:24px;
          padding:24px;border:1px solid rgba(255,255,255,.06);
          background:rgba(255,255,255,.015);margin-bottom:32px;
        }
        .adm-retention-info{}
        .adm-retention-title{font-family:'Instrument Serif',serif;font-size:18px;color:#e8e4dc;margin-bottom:4px;}
        .adm-retention-sub{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(232,228,220,.3);line-height:1.7;}

        @media(max-width:1024px){
          .adm-nav,.adm-hero,.adm-stats-wrap,.adm-tabs-wrap,.adm-body{padding-left:24px;padding-right:24px;}
          .adm-stats{grid-template-columns:repeat(3,1fr);}
        }
        @media(max-width:640px){
          .adm-stats{grid-template-columns:repeat(2,1fr);}
          .adm-session-row{grid-template-columns:1fr 60px 60px;}
          .adm-note-row{grid-template-columns:28px 1fr 80px 40px;}
        }
      `}</style>

      {/* NAV */}
      <nav className="adm-nav">
        <div className="adm-nav-left">
          <a href="/" className="adm-logo">
            <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
              <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M10 30 Q22 36 34 30" stroke="rgba(245,242,235,0.15)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
            </svg>
            <span className="adm-logo-name">Vent</span>
          </a>
          <div className="adm-badge">// Admin</div>
        </div>
        <a href="/dashboard" className="adm-back">← Dashboard</a>
      </nav>

      {/* HERO */}
      <div className="adm-hero">
        <div className="adm-hero-ghost">Admin</div>
        <div className="adm-eyebrow">Owner view</div>
        <h1 className="adm-h1">Platform<br/><em>overview.</em></h1>
      </div>

      {/* STATS */}
      <div className="adm-stats-wrap">
        <div className="adm-stats">
          <div className="adm-stat">
            <div className="adm-stat-v accent">{data.users.length}</div>
            <div className="adm-stat-l">Total users</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat-v">{activeUsers.length}</div>
            <div className="adm-stat-l">Active (7d)</div>
            <div className="adm-stat-sub">{retentionRate}% retention</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat-v">{data.todaySessions}</div>
            <div className="adm-stat-l">Sessions today</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat-v">{data.weekSessions}</div>
            <div className="adm-stat-l">Sessions this week</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat-v">{data.totalRows.toLocaleString()}</div>
            <div className="adm-stat-l">Total events</div>
          </div>
          <div className="adm-stat">
            <div className={`adm-stat-v ${data.platformAvg >= 70 ? 'green' : data.platformAvg >= 50 ? 'amber' : 'accent'}`}>
              {data.platformAvg !== null ? `${data.platformAvg}%` : '—'}
            </div>
            <div className="adm-stat-l">MCQ avg</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="adm-tabs-wrap">
        {[['users','Users'],['inactive','Inactive'],['notes','Top Notes']].map(([id,label]) => (
          <button key={id} className={`adm-tab ${activeTab===id?'active':''}`} onClick={() => setActiveTab(id)}>
            {label}
            {id==='inactive' && inactiveUsers.length > 0 && (
              <span style={{marginLeft:'8px',background:'rgba(200,69,42,.2)',color:'#c8452a',fontSize:'8px',padding:'1px 6px',borderRadius:'99px'}}>{inactiveUsers.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div className="adm-body">

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="adm-sec">
            <div className="adm-sec-hdr">
              <div className="adm-sec-title">All <em>users</em></div>
              <div className="adm-sec-meta">{data.users.length} accounts · click row to expand</div>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th className="adm-th"></th>
                    <th className="adm-th">User ID</th>
                    <th className="adm-th">Specialties</th>
                    <th className="adm-th">Sessions</th>
                    <th className="adm-th">Notes</th>
                    <th className="adm-th">MCQ avg</th>
                    <th className="adm-th">MCQ sessions</th>
                    <th className="adm-th">First seen</th>
                    <th className="adm-th">Last active</th>
                    <th className="adm-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(u => {
                    const isExp = expanded[u.id]
                    const scoreClass = u.mcqAvg === null ? 'none' : u.mcqAvg >= 80 ? 'good' : u.mcqAvg >= 60 ? 'ok' : 'bad'
                    const dotClass = u.daysSinceActive === 0 ? 'active' : u.daysSinceActive <= 3 ? 'recent' : 'stale'
                    return (
                      <>
                        <tr key={u.id} className={`adm-tr ${u.daysSinceActive >= inactiveDays ? 'inactive-row' : ''}`} onClick={() => toggleExpand(u.id)}>
                          <td className="adm-td" style={{paddingRight:0}}>
                            <span className={`activity-dot ${dotClass}`}/>
                          </td>
                          <td className="adm-td mono">{u.id.slice(0,8)}…</td>
                          <td className="adm-td">
                            {u.specialties.map(s => (
                              <span key={s} className={`spec-chip ${s}`}>{specLabel(s)}</span>
                            ))}
                          </td>
                          <td className="adm-td mono">{u.sessions}</td>
                          <td className="adm-td mono">{u.openedNotes}</td>
                          <td className="adm-td">
                            <span className={`score-pill ${scoreClass}`}>
                              {u.mcqAvg !== null ? `${u.mcqAvg}%` : '—'}
                            </span>
                          </td>
                          <td className="adm-td mono">{u.mcqSessions.length}</td>
                          <td className="adm-td mono">{formatDate(u.firstSeen)}</td>
                          <td className="adm-td mono">{daysSince(u.lastActive)}</td>
                          <td className="adm-td">
                            <span className={`adm-chevron ${isExp ? 'open' : ''}`}>›</span>
                          </td>
                        </tr>
                        {isExp && (
                          <tr key={`${u.id}-exp`} className="adm-expand-row">
                            <td colSpan={10} className="adm-td" style={{padding:'0 16px'}}>
                              <div className="adm-expand-inner">
                                {u.mcqSessions.length === 0 ? (
                                  <div className="adm-empty">// No MCQ sessions yet.</div>
                                ) : (
                                  <>
                                    <div className="adm-expand-title">MCQ sessions — {u.mcqSessions.length} total</div>
                                    {u.mcqSessions.map((s, i) => {
                                      const sc = s.pct >= 80 ? '#3a7a52' : s.pct >= 60 ? '#c89030' : '#c8452a'
                                      return (
                                        <div key={i} className="adm-session-row">
                                          <div className="adm-session-note">{s.note}</div>
                                          <div className="adm-session-spec">{specLabel(s.specialty)}</div>
                                          <div className="adm-session-score" style={{color:sc}}>{s.pct}%</div>
                                          <div className="adm-session-frac">{s.got != null ? `${s.got}/${s.total}` : ''}</div>
                                          <div className="adm-session-date">{formatDate(s.date)}</div>
                                        </div>
                                      )
                                    })}
                                  </>
                                )}
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

        {/* INACTIVE TAB */}
        {activeTab === 'inactive' && (
          <div className="adm-sec">
            <div className="adm-sec-hdr">
              <div className="adm-sec-title">Inactive <em>users</em></div>
              <div className="adm-threshold">
                <span className="adm-threshold-label">Threshold</span>
                {[3,7,14,30].map(d => (
                  <button key={d} className={`adm-threshold-btn ${inactiveDays===d?'on':''}`} onClick={() => setInactiveDays(d)}>{d}d</button>
                ))}
              </div>
            </div>

            <div className="adm-retention-card">
              <div className="retention-ring">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="4"/>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#c8452a" strokeWidth="4"
                    strokeDasharray={`${2*Math.PI*32}`}
                    strokeDashoffset={`${2*Math.PI*32*(1-retentionRate/100)}`}
                    strokeLinecap="round"
                    style={{transition:'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)'}}
                  />
                </svg>
                <div className="retention-ring-label">
                  <div className="retention-ring-pct">{retentionRate}%</div>
                  <div className="retention-ring-sub">active</div>
                </div>
              </div>
              <div className="adm-retention-info">
                <div className="adm-retention-title">{activeUsers.length} of {data.users.length} users active in last {inactiveDays} days</div>
                <div className="adm-retention-sub">
                  {inactiveUsers.length} user{inactiveUsers.length !== 1 ? 's' : ''} have not returned in {inactiveDays}+ days.<br/>
                  Green dot = active today · Amber = active within 3 days · Grey = stale
                </div>
              </div>
            </div>

            {inactiveUsers.length === 0 ? (
              <div className="adm-empty">// No users inactive for {inactiveDays}+ days. Good.</div>
            ) : (
              inactiveUsers.map(u => (
                <div key={u.id} className="adm-inactive-card">
                  <div>
                    <div className="adm-inactive-id">{u.id.slice(0,8)}…{u.id.slice(-4)}</div>
                    <div className="adm-inactive-meta">
                      {u.sessions} sessions · {u.openedNotes} notes opened · MCQ avg {u.mcqAvg !== null ? `${u.mcqAvg}%` : 'none'} · {u.specialties.map(specLabel).join(', ')}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className="adm-inactive-days">{u.daysSinceActive}d</div>
                    <div className="adm-inactive-days-label">inactive</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TOP NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="adm-sec">
            <div className="adm-sec-hdr">
              <div className="adm-sec-title">Most <em>opened notes</em></div>
              <div className="adm-sec-meta">Across all users · top {data.topNotes.length}</div>
            </div>
            {data.topNotes.length === 0 ? (
              <div className="adm-empty">// No note opens recorded yet.</div>
            ) : (
              data.topNotes.map((n, i) => (
                <div key={i} className="adm-note-row">
                  <div className="adm-note-rank">{i+1}</div>
                  <div className="adm-note-name">{n.name}</div>
                  <div className="adm-note-spec">{specLabel(n.specialty)}</div>
                  <div className="adm-note-bar-bg">
                    <div className="adm-note-bar-fill" style={{width:`${Math.round((n.count/data.topNotes[0].count)*100)}%`}}/>
                  </div>
                  <div className="adm-note-count">{n.count}×</div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </>
  )
}
