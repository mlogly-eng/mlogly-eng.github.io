'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const SPECIALTIES = [
  {
    id: 'ophtho',
    name: 'Ophthalmology',
    href: '/ophtho/index.html',
    notes: 19,
    tag: 'Anterior · Posterior · Neuro',
    desc: 'From the red eye to the optic nerve. The whole eye in 19 notes.',
  },
  {
    id: 'obgyn',
    name: 'OB/GYN',
    href: '/obgyn/index.html',
    notes: 27,
    tag: 'Obstetrics · Gynaecology',
    desc: 'PPH to ectopic. The high-stakes conditions that define the specialty.',
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [stats, setStats]             = useState({ today: 0, total: 0, streak: 0, mcqAvg: null })
  const [progress, setProgress]       = useState({})
  const [lastNote, setLastNote]       = useState(null)
  const [weaknesses, setWeaknesses]   = useState([])
  const [strengths, setStrengths]     = useState([])
  const [scoreTrend, setScoreTrend]   = useState([])
  const [untested, setUntested]       = useState([])
  const [topicBreakdown, setTopicBreakdown] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/signin'); return }
      setUser(data.user)
      loadProgress(data.user.id)
    })
  }, [])

  async function loadProgress(userId) {
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error || !data) { setLoading(false); return }

    const today = new Date().toISOString().slice(0, 10)
    const byDate = {}
    let totalSessions = 0
    let todayCount = 0
    let mcqScores = []
    const progressMap = {}
    let latestNote = null

    // Topic-level MCQ tracking: { [topic]: { got: number, total: number } }
    const topicMap = {}
    // Note-level: opened notes per specialty
    const openedNotes = {}

    data.forEach(row => {
      const date = row.created_at.slice(0, 10)
      if (!byDate[date]) byDate[date] = 0
      byDate[date]++
      totalSessions++
      if (date === today) todayCount++

      if (!progressMap[row.specialty]) progressMap[row.specialty] = { opened: new Set(), completed: new Set() }
      if (row.event === 'opened') {
        progressMap[row.specialty].opened.add(row.note_id)
        if (!openedNotes[row.specialty]) openedNotes[row.specialty] = new Set()
        openedNotes[row.specialty].add(row.note_id)
      }
      if (row.event === 'completed') progressMap[row.specialty].completed.add(row.note_id)

      if (row.event === 'mcq_done' && row.metadata?.score_pct != null) {
        mcqScores.push({
          note: row.note_id,
          noteName: row.note_name || row.note_id,
          specialty: row.specialty,
          pct: row.metadata.score_pct,
          got: row.metadata.score_got,
          total: row.metadata.score_total,
          date: row.created_at,
        })

        // Topic breakdown from metadata (if topic stored) or use note_name as proxy
        const topicKey = row.note_name || row.note_id
        if (!topicMap[topicKey]) topicMap[topicKey] = { name: topicKey, specialty: row.specialty, scores: [] }
        topicMap[topicKey].scores.push(row.metadata.score_pct)
      }

      if (!latestNote && (row.event === 'opened' || row.event === 'completed')) {
        latestNote = { specialty: row.specialty, noteId: row.note_id, noteName: row.metadata?.note_name || row.note_id }
      }
    })

    // Streak
    let streak = 0
    for (let i = 0; i < 60; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      if (byDate[key]) streak++
      else if (i > 0) break
    }

    // MCQ avg
    const mcqAvg = mcqScores.length > 0
      ? Math.round(mcqScores.reduce((a, b) => a + b.pct, 0) / mcqScores.length)
      : null

    // Weaknesses — notes with MCQ score < 60%, lowest first
    const weak = mcqScores
      .filter(s => s.pct < 60)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3)

    // Score trend — last 8 MCQ sessions (oldest to newest for chart)
    const trend = [...mcqScores].reverse().slice(-8)

    // Topic breakdown — avg score per topic, sorted
    const breakdown = Object.values(topicMap).map(t => ({
      name: t.name,
      specialty: t.specialty,
      avg: Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length),
      attempts: t.scores.length,
    })).sort((a, b) => a.avg - b.avg)

    // Strengths — topics consistently above 80%
    const strong = breakdown.filter(t => t.avg >= 80).sort((a, b) => b.avg - a.avg).slice(0, 4)

    // Untested — notes opened but no MCQ done
    const testedNoteIds = new Set(mcqScores.map(s => s.note))
    const untestedList = []
    Object.entries(openedNotes).forEach(([spec, noteSet]) => {
      noteSet.forEach(noteId => {
        if (!testedNoteIds.has(noteId)) {
          untestedList.push({ noteId, specialty: spec })
        }
      })
    })

    setStats({ today: todayCount, total: totalSessions, streak, mcqAvg })
    setProgress(progressMap)
    setLastNote(latestNote)
    setWeaknesses(weak)
    setStrengths(strong)
    setScoreTrend(trend)
    setTopicBreakdown(breakdown)
    setUntested(untestedList.slice(0, 5))
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  function getCompletionPct(specialtyId, totalNotes) {
    const p = progress[specialtyId]
    if (!p) return 0
    return Math.round((p.completed.size / totalNotes) * 100)
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#f4f0e8',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'10px',letterSpacing:'3px',color:'#a89e88',textTransform:'uppercase'}}>Loading…</div>
    </div>
  )

  const trendMax = Math.max(...scoreTrend.map(s => s.pct), 1)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Syne',sans-serif;background:#f4f0e8;color:#18140e;-webkit-font-smoothing:antialiased;min-height:100vh;}
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:9999;}

        .db-nav{display:flex;justify-content:space-between;align-items:center;padding:24px 64px;border-bottom:1px solid #d4cfc0;background:rgba(244,240,232,.95);backdrop-filter:blur(16px);position:sticky;top:0;z-index:100;}
        .db-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
        .db-logo-name{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;letter-spacing:5px;color:#18140e;text-transform:uppercase;}
        .db-nav-r{display:flex;align-items:center;gap:16px;}
        .db-user-name{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;color:#a89e88;}
        .db-signout{background:none;border:1px solid #d4cfc0;padding:8px 16px;border-radius:100px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#5a5140;cursor:pointer;transition:all .2s;}
        .db-signout:hover{border-color:#c8452a;color:#c8452a;}

        .db-body{max-width:1200px;margin:0 auto;padding:64px 64px 120px;}

        .db-greeting-kicker{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#a89e88;margin-bottom:12px;display:flex;align-items:center;gap:10px;}
        .db-greeting-kicker::before{content:'';width:16px;height:1px;background:#a89e88;}
        .db-greeting{font-family:'Instrument Serif',serif;font-size:clamp(36px,5vw,56px);font-weight:400;color:#18140e;line-height:1;margin-bottom:48px;}
        .db-greeting em{font-style:italic;color:#c8452a;}

        .db-stats{display:flex;gap:0;border:1px solid #d4cfc0;background:#faf7f0;margin-bottom:56px;overflow:hidden;}
        .db-stat{flex:1;padding:24px 28px;border-right:1px solid #d4cfc0;}
        .db-stat:last-child{border-right:none;}
        .db-stat-v{font-family:'Instrument Serif',serif;font-size:40px;font-style:italic;color:#c8452a;line-height:1;margin-bottom:4px;}
        .db-stat-v.good{color:#2a6642;}
        .db-stat-v.warn{color:#c8452a;}
        .db-stat-l{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a89e88;}

        .db-sec-hdr{display:flex;align-items:baseline;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #d4cfc0;}
        .db-sec-title{font-family:'Instrument Serif',serif;font-size:24px;font-weight:400;color:#18140e;}
        .db-sec-title em{font-style:italic;color:#c8452a;}
        .db-sec-sub{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a89e88;}

        .db-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:56px;}
        .db-card{background:#faf7f0;border:1px solid #d4cfc0;padding:32px;cursor:pointer;position:relative;overflow:hidden;transition:border-color .25s,transform .2s,box-shadow .25s;text-decoration:none;display:block;}
        .db-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:rgba(200,69,42,.2);transition:background .25s;}
        .db-card:hover{border-color:#a89e88;transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.06);}
        .db-card:hover::before{background:#c8452a;}
        .db-card-tag{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#a89e88;margin-bottom:16px;}
        .db-card-name{font-family:'Instrument Serif',serif;font-size:28px;font-weight:400;color:#18140e;line-height:1;margin-bottom:8px;}
        .db-card-desc{font-size:13px;color:#5a5140;line-height:1.7;margin-bottom:24px;}
        .db-card-footer{display:flex;align-items:center;justify-content:space-between;}
        .db-card-notes{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;color:#a89e88;}
        .db-card-arrow{font-size:18px;color:#c8452a;transition:transform .2s;}
        .db-card:hover .db-card-arrow{transform:translate(3px,-3px);}
        .db-card-progress{height:2px;background:#ece7dc;margin-bottom:16px;overflow:hidden;}
        .db-card-progress-fill{height:100%;background:#c8452a;transition:width .6s cubic-bezier(.16,1,.3,1);}
        .db-card-pct{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;color:#c8452a;}

        .db-continue{background:#18140e;padding:32px;display:flex;align-items:center;justify-content:space-between;gap:24px;text-decoration:none;transition:background .2s;margin-bottom:56px;}
        .db-continue:hover{background:#2a201a;}
        .db-continue-kicker{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(250,247,240,.3);margin-bottom:8px;}
        .db-continue-title{font-family:'Instrument Serif',serif;font-size:22px;font-weight:400;color:#faf7f0;line-height:1.2;}
        .db-continue-title em{font-style:italic;color:#e05a3a;}
        .db-continue-arrow{font-size:24px;color:#c8452a;flex-shrink:0;}

        .db-weak{display:flex;flex-direction:column;gap:12px;margin-bottom:56px;}
        .db-weak-item{background:#faf7f0;border:1px solid #d4cfc0;border-left:3px solid #c8452a;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;}
        .db-weak-name{font-family:'Syne',sans-serif;font-size:13px;font-weight:600;color:#18140e;}
        .db-weak-spec{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;color:#a89e88;margin-top:2px;}
        .db-weak-score{font-family:'Instrument Serif',serif;font-size:24px;font-style:italic;color:#c8452a;}
        .db-empty{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;color:#a89e88;padding:24px 0;}

        /* ── ANALYTICS ── */
        .db-analytics{margin-bottom:56px;}

        /* Score trend chart */
        .trend-chart{display:flex;align-items:flex-end;gap:6px;height:80px;background:#faf7f0;border:1px solid #d4cfc0;padding:16px 20px 12px;margin-bottom:8px;}
        .trend-bar-wrap{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;}
        .trend-bar{width:100%;border-radius:1px;transition:height .4s cubic-bezier(.16,1,.3,1);min-height:3px;}
        .trend-bar.good{background:#2a6642;}
        .trend-bar.ok{background:#c8962a;}
        .trend-bar.bad{background:#c8452a;}
        .trend-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:#a89e88;white-space:nowrap;}
        .trend-caption{font-family:'JetBrains Mono',monospace;font-size:9px;color:#a89e88;letter-spacing:1px;margin-bottom:32px;}

        /* Two-col analytics grid */
        .analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}

        /* Strength / topic card */
        .analytics-panel{background:#faf7f0;border:1px solid #d4cfc0;padding:24px;}
        .analytics-panel-title{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#a89e88;margin-bottom:20px;display:flex;align-items:center;gap:10px;}
        .analytics-panel-title::after{content:'';flex:1;height:1px;background:#ece7dc;}

        .topic-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
        .topic-row:last-child{margin-bottom:0;}
        .topic-name{font-size:12px;font-weight:600;color:#18140e;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .topic-bar-bg{flex:2;height:4px;background:#ece7dc;border-radius:2px;overflow:hidden;}
        .topic-bar-fill{height:100%;border-radius:2px;transition:width .5s cubic-bezier(.16,1,.3,1);}
        .topic-bar-fill.good{background:#2a6642;}
        .topic-bar-fill.ok{background:#c8962a;}
        .topic-bar-fill.bad{background:#c8452a;}
        .topic-pct{font-family:'Instrument Serif',serif;font-size:16px;font-style:italic;min-width:36px;text-align:right;}
        .topic-pct.good{color:#2a6642;}
        .topic-pct.ok{color:#c8962a;}
        .topic-pct.bad{color:#c8452a;}
        .topic-attempts{font-family:'JetBrains Mono',monospace;font-size:8px;color:#a89e88;min-width:24px;text-align:right;}

        /* Untested */
        .untested-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ece7dc;}
        .untested-item:last-child{border-bottom:none;}
        .untested-name{font-size:12px;font-weight:600;color:#18140e;}
        .untested-spec{font-family:'JetBrains Mono',monospace;font-size:8px;color:#a89e88;margin-top:2px;}
        .untested-badge{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1px;color:#c8452a;background:#fdf0ed;border:1px solid rgba(200,69,42,.2);padding:3px 8px;}

        @media(max-width:768px){
          .db-nav,.db-body{padding-left:24px;padding-right:24px;}
          .db-cards{grid-template-columns:1fr;}
          .db-stats{flex-direction:column;}
          .db-stat{border-right:none;border-bottom:1px solid #d4cfc0;}
          .db-stat:last-child{border-bottom:none;}
          .analytics-grid{grid-template-columns:1fr;}
        }
      `}</style>

      <nav className="db-nav">
        <a href="/" className="db-logo">
          <svg viewBox="0 0 44 44" fill="none" width="32" height="32">
            <circle cx="22" cy="22" r="21" stroke="#18140e" strokeWidth="1.5"/>
            <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 30 Q22 36 34 30" stroke="#18140e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
          </svg>
          <span className="db-logo-name">Vent</span>
        </a>
        <div className="db-nav-r">
          <span className="db-user-name">{user?.email}</span>
          {user?.id === '20dbd05b-45c5-446a-8028-0b45b687f4ae' && (
            <a href="/admin" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',color:'#c8452a',textDecoration:'none',border:'1px solid rgba(200,69,42,.3)',padding:'8px 16px',borderRadius:'100px',transition:'all .2s'}}>Admin</a>
          )}
          <button className="db-signout" onClick={handleSignOut}>Sign out</button>
        </div>
      </nav>

      <div className="db-body">

        <div className="db-greeting-kicker">Dashboard</div>
        <h1 className="db-greeting">{greeting},<br/><em>{displayName}.</em></h1>

        <div className="db-stats">
          <div className="db-stat">
            <div className="db-stat-v">{stats.today}</div>
            <div className="db-stat-l">Sessions today</div>
          </div>
          <div className="db-stat">
            <div className="db-stat-v">{stats.total}</div>
            <div className="db-stat-l">All-time sessions</div>
          </div>
          <div className="db-stat">
            <div className="db-stat-v">{stats.streak}</div>
            <div className="db-stat-l">Day streak</div>
          </div>
          <div className="db-stat">
            <div className={`db-stat-v ${stats.mcqAvg >= 70 ? 'good' : stats.mcqAvg !== null ? 'warn' : ''}`}>
              {stats.mcqAvg !== null ? `${stats.mcqAvg}%` : '—'}
            </div>
            <div className="db-stat-l">MCQ average</div>
          </div>
        </div>

        <div className="db-sec-hdr">
          <div className="db-sec-title">Your <em>specialties</em></div>
          <div className="db-sec-sub">{SPECIALTIES.length} available</div>
        </div>

        <div className="db-cards">
          {SPECIALTIES.map(s => {
            const pct = getCompletionPct(s.id, s.notes)
            const opened = progress[s.id]?.opened.size || 0
            return (
              <a key={s.id} href={s.href} className="db-card">
                <div className="db-card-tag">{s.tag}</div>
                <div className="db-card-progress">
                  <div className="db-card-progress-fill" style={{width: `${pct}%`}}/>
                </div>
                <div className="db-card-name">{s.name}</div>
                <div className="db-card-desc">{s.desc}</div>
                <div className="db-card-footer">
                  <span className="db-card-notes">{opened} / {s.notes} notes opened</span>
                  <span className="db-card-pct">{pct}% done</span>
                  <span className="db-card-arrow">↗</span>
                </div>
              </a>
            )
          })}
        </div>

        {lastNote && (
          <>
            <div className="db-sec-hdr">
              <div className="db-sec-title">Continue where you <em>left off</em></div>
            </div>
            <a href={`/${lastNote.specialty}/index.html`} className="db-continue">
              <div>
                <div className="db-continue-kicker">Last active · {lastNote.specialty === 'obgyn' ? 'OB/GYN' : 'Ophthalmology'}</div>
                <div className="db-continue-title">Pick up from<br/><em>{lastNote.noteName}</em></div>
              </div>
              <div className="db-continue-arrow">→</div>
            </a>
          </>
        )}

        <div className="db-sec-hdr">
          <div className="db-sec-title">Areas to <em>revisit</em></div>
          <div className="db-sec-sub">Based on MCQ scores</div>
        </div>

        {weaknesses.length === 0 ? (
          <div className="db-empty">Complete some MCQs and your weak areas will appear here.</div>
        ) : (
          <div className="db-weak">
            {weaknesses.map((w, i) => (
              <div key={i} className="db-weak-item">
                <div>
                  <div className="db-weak-name">{w.noteName || w.note}</div>
                  <div className="db-weak-spec">{w.specialty === 'obgyn' ? 'OB/GYN' : w.specialty === 'qbank' ? 'Q-Bank' : 'Ophthalmology'}</div>
                </div>
                <div className="db-weak-score">{w.pct}%</div>
              </div>
            ))}
          </div>
        )}

        {/* ── PERFORMANCE ANALYTICS ── */}
        {scoreTrend.length > 0 && (
          <div className="db-analytics">
            <div className="db-sec-hdr">
              <div className="db-sec-title">Performance <em>analytics</em></div>
              <div className="db-sec-sub">{scoreTrend.length} sessions tracked</div>
            </div>

            {/* Score trend chart */}
            <div className="trend-chart">
              {scoreTrend.map((s, i) => {
                const h = Math.max(6, Math.round((s.pct / 100) * 52))
                const cls = s.pct >= 80 ? 'good' : s.pct >= 60 ? 'ok' : 'bad'
                return (
                  <div key={i} className="trend-bar-wrap" title={`${s.pct}% — ${s.noteName || s.note}`}>
                    <div className={`trend-bar ${cls}`} style={{height: `${h}px`}}/>
                    <div className="trend-label">{s.pct}%</div>
                  </div>
                )
              })}
            </div>
            <div className="trend-caption">MCQ score trend — last {scoreTrend.length} sessions</div>

            <div className="analytics-grid">

              {/* Topic breakdown — weak first */}
              {topicBreakdown.length > 0 && (
                <div className="analytics-panel">
                  <div className="analytics-panel-title">All topics</div>
                  {topicBreakdown.slice(0, 6).map((t, i) => {
                    const cls = t.avg >= 80 ? 'good' : t.avg >= 60 ? 'ok' : 'bad'
                    return (
                      <div key={i} className="topic-row">
                        <div className="topic-name" title={t.name}>{t.name}</div>
                        <div className="topic-bar-bg">
                          <div className={`topic-bar-fill ${cls}`} style={{width: `${t.avg}%`}}/>
                        </div>
                        <div className={`topic-pct ${cls}`}>{t.avg}%</div>
                        <div className="topic-attempts">{t.attempts}×</div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{display:'flex',flexDirection:'column',gap:20}}>

                {/* Strengths */}
                {strengths.length > 0 && (
                  <div className="analytics-panel">
                    <div className="analytics-panel-title">Strong areas</div>
                    {strengths.map((t, i) => (
                      <div key={i} className="topic-row">
                        <div className="topic-name" title={t.name}>{t.name}</div>
                        <div className="topic-bar-bg">
                          <div className="topic-bar-fill good" style={{width: `${t.avg}%`}}/>
                        </div>
                        <div className="topic-pct good">{t.avg}%</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Untested notes */}
                {untested.length > 0 && (
                  <div className="analytics-panel">
                    <div className="analytics-panel-title">Opened — never tested</div>
                    {untested.map((u, i) => (
                      <div key={i} className="untested-item">
                        <div>
                          <div className="untested-name">{u.noteId}</div>
                          <div className="untested-spec">{u.specialty === 'obgyn' ? 'OB/GYN' : 'Ophthalmology'}</div>
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
