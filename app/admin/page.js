'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

const ADMIN_USER_ID = '20dbd05b-45c5-446a-8028-0b45b687f4ae'

export default function AdminPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [data, setData]             = useState(null)
  const [expanded, setExpanded]     = useState({})
  const [inactiveDays, setInactiveDays] = useState(7)

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
    // Fetch all progress rows
    const { data: rows, error } = await supabase
      .from('progress')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !rows) { setLoading(false); return }

    // Fetch all users from auth (via progress user_ids — we don't have direct auth.users access from client)
    const userIds = [...new Set(rows.map(r => r.user_id))]

    // Build per-user stats
    const userMap = {}
    userIds.forEach(id => {
      userMap[id] = {
        id,
        sessions: 0,
        lastActive: null,
        mcqScores: [],
        mcqSessions: [],
        openedNotes: new Set(),
        specialties: new Set(),
        firstSeen: null,
      }
    })

    // Note popularity
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

    // Platform totals
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const todaySessions = rows.filter(r => r.created_at.slice(0, 10) === today).length
    const weekSessions  = rows.filter(r => r.created_at >= weekAgo).length
    const allMcqScores  = rows.filter(r => r.event === 'mcq_done' && r.metadata?.score_pct != null).map(r => r.metadata.score_pct)
    const platformAvg   = allMcqScores.length > 0 ? Math.round(allMcqScores.reduce((a,b) => a+b,0) / allMcqScores.length) : null

    // Signup trend — users by week
    const signupByWeek = {}
    userIds.forEach(id => {
      const u = userMap[id]
      if (!u.firstSeen) return
      const weekStart = new Date(u.firstSeen)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const key = weekStart.toISOString().slice(0, 10)
      signupByWeek[key] = (signupByWeek[key] || 0) + 1
    })

    // Sorted user list
    const users = Object.values(userMap).sort((a, b) =>
      new Date(b.lastActive) - new Date(a.lastActive)
    ).map(u => ({
      ...u,
      mcqAvg: u.mcqScores.length > 0 ? Math.round(u.mcqScores.reduce((a,b) => a+b,0) / u.mcqScores.length) : null,
      openedNotes: u.openedNotes.size,
      specialties: [...u.specialties],
      daysSinceActive: u.lastActive ? Math.floor((Date.now() - new Date(u.lastActive)) / 86400000) : 999,
    }))

    // Top notes
    const topNotes = Object.entries(notePopularity)
      .map(([key, count]) => {
        const [specialty, name] = key.split('::')
        return { specialty, name, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    setData({ users, topNotes, todaySessions, weekSessions, platformAvg, totalRows: rows.length, signupByWeek })
    setLoading(false)
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function formatDate(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function daysSince(iso) {
    if (!iso) return '—'
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  if (loading || !authorized) return (
    <div style={{minHeight:'100vh',background:'#0d0b08',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'10px',letterSpacing:'3px',color:'#4a4540',textTransform:'uppercase'}}>
        {loading ? 'Loading…' : 'Unauthorized'}
      </div>
    </div>
  )

  const inactiveUsers = data.users.filter(u => u.daysSinceActive >= inactiveDays)
  const activeUsers   = data.users.filter(u => u.daysSinceActive < inactiveDays)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Syne',sans-serif;background:#0d0b08;color:#e8e4dc;-webkit-font-smoothing:antialiased;min-height:100vh;}

        .adm-nav{display:flex;justify-content:space-between;align-items:center;padding:20px 48px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(13,11,8,.95);position:sticky;top:0;z-index:100;backdrop-filter:blur(12px);}
        .adm-logo{font-family:'Syne',sans-serif;font-size:14px;font-weight:800;letter-spacing:5px;color:#e8e4dc;text-transform:uppercase;text-decoration:none;}
        .adm-badge{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;color:#c8452a;background:rgba(200,69,42,.12);border:1px solid rgba(200,69,42,.25);padding:4px 10px;}
        .adm-nav-back{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;color:rgba(232,228,220,.3);text-decoration:none;transition:color .2s;}
        .adm-nav-back:hover{color:#e8e4dc;}

        .adm-body{max-width:1300px;margin:0 auto;padding:56px 48px 120px;}

        .adm-eyebrow{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#c8452a;margin-bottom:12px;display:flex;align-items:center;gap:12px;}
        .adm-eyebrow::before{content:'';width:20px;height:1px;background:#c8452a;}
        .adm-h1{font-family:'Instrument Serif',serif;font-size:clamp(40px,5vw,64px);font-weight:400;color:#e8e4dc;line-height:.95;margin-bottom:56px;}
        .adm-h1 em{font-style:italic;color:#c8452a;}

        /* Platform stats */
        .adm-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.06);margin-bottom:56px;}
        .adm-stat{background:#0d0b08;padding:24px 20px;}
        .adm-stat-v{font-family:'Instrument Serif',serif;font-size:36px;font-style:italic;color:#c8452a;line-height:1;margin-bottom:4px;}
        .adm-stat-v.good{color:#2a6642;}
        .adm-stat-l{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(232,228,220,.3);}

        /* Section */
        .adm-sec{margin-bottom:56px;}
        .adm-sec-hdr{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.06);}
        .adm-sec-title{font-family:'Instrument Serif',serif;font-size:22px;color:#e8e4dc;}
        .adm-sec-title em{font-style:italic;color:#c8452a;}
        .adm-sec-sub{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;color:rgba(232,228,220,.3);}

        /* User table */
        .adm-table{width:100%;border-collapse:collapse;}
        .adm-th{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(232,228,220,.25);padding:10px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,.06);}
        .adm-tr{border-bottom:1px solid rgba(255,255,255,.04);transition:background .15s;cursor:pointer;}
        .adm-tr:hover{background:rgba(255,255,255,.02);}
        .adm-tr.inactive-row{opacity:.5;}
        .adm-td{padding:14px;font-size:12px;color:#e8e4dc;vertical-align:top;}
        .adm-td.mono{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(232,228,220,.5);}
        .adm-td.score{font-family:'Instrument Serif',serif;font-size:20px;font-style:italic;}
        .adm-td.score.good{color:#2a6642;}
        .adm-td.score.ok{color:#c8962a;}
        .adm-td.score.bad{color:#c8452a;}
        .adm-td.score.none{color:rgba(232,228,220,.2);}

        .adm-expand-row{background:rgba(255,255,255,.015);}
        .adm-expand-inner{padding:16px 14px 20px 14px;}
        .adm-expand-title{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(232,228,220,.3);margin-bottom:12px;}
        .adm-session-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);}
        .adm-session-row:last-child{border-bottom:none;}
        .adm-session-note{font-size:12px;font-weight:600;color:#e8e4dc;flex:1;}
        .adm-session-spec{font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(232,228,220,.3);min-width:60px;}
        .adm-session-score{font-family:'Instrument Serif',serif;font-size:18px;font-style:italic;}
        .adm-session-date{font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(232,228,220,.3);min-width:80px;text-align:right;}

        .adm-chevron{font-size:10px;color:rgba(232,228,220,.2);transition:transform .2s;display:inline-block;}
        .adm-chevron.open{transform:rotate(90deg);}

        /* Inactive threshold */
        .adm-threshold{display:flex;align-items:center;gap:12px;}
        .adm-threshold-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(232,228,220,.4);}
        .adm-threshold-btn{background:none;border:1px solid rgba(255,255,255,.1);color:rgba(232,228,220,.5);font-family:'JetBrains Mono',monospace;font-size:9px;padding:4px 10px;cursor:pointer;transition:all .15s;}
        .adm-threshold-btn.on{border-color:#c8452a;color:#c8452a;background:rgba(200,69,42,.08);}

        /* Top notes */
        .adm-note-row{display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04);}
        .adm-note-row:last-child{border-bottom:none;}
        .adm-note-rank{font-family:'Instrument Serif',serif;font-size:20px;font-style:italic;color:rgba(232,228,220,.15);min-width:28px;}
        .adm-note-name{font-size:13px;font-weight:600;color:#e8e4dc;flex:1;}
        .adm-note-spec{font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(232,228,220,.3);min-width:80px;}
        .adm-note-bar-bg{flex:2;height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;}
        .adm-note-bar-fill{height:100%;background:#c8452a;border-radius:2px;}
        .adm-note-count{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(232,228,220,.4);min-width:40px;text-align:right;}

        /* Inactive alert */
        .adm-inactive-alert{background:rgba(200,69,42,.06);border:1px solid rgba(200,69,42,.15);border-left:3px solid #c8452a;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .adm-inactive-name{font-size:13px;font-weight:600;color:#e8e4dc;}
        .adm-inactive-meta{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(232,228,220,.4);margin-top:3px;}
        .adm-inactive-days{font-family:'Instrument Serif',serif;font-size:22px;font-style:italic;color:#c8452a;}

        .adm-empty{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(232,228,220,.2);padding:20px 0;}

        .spec-chip{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:1px;padding:2px 6px;border:1px solid rgba(255,255,255,.08);color:rgba(232,228,220,.4);margin-right:4px;}

        @media(max-width:900px){
          .adm-nav,.adm-body{padding-left:24px;padding-right:24px;}
          .adm-stats{grid-template-columns:repeat(2,1fr);}
        }
      `}</style>

      <nav className="adm-nav">
        <a href="/" className="adm-logo">Vent</a>
        <div className="adm-badge">Admin</div>
        <a href="/dashboard" className="adm-nav-back">← Dashboard</a>
      </nav>

      <div className="adm-body">

        <div className="adm-eyebrow">Owner view</div>
        <h1 className="adm-h1">Platform <em>overview.</em></h1>

        {/* Platform stats */}
        <div className="adm-stats">
          <div className="adm-stat">
            <div className="adm-stat-v">{data.users.length}</div>
            <div className="adm-stat-l">Total users</div>
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
            <div className="adm-stat-v">{data.totalRows}</div>
            <div className="adm-stat-l">Total events</div>
          </div>
          <div className="adm-stat">
            <div className={`adm-stat-v ${data.platformAvg >= 70 ? 'good' : ''}`}>
              {data.platformAvg !== null ? `${data.platformAvg}%` : '—'}
            </div>
            <div className="adm-stat-l">Platform MCQ avg</div>
          </div>
        </div>

        {/* All users */}
        <div className="adm-sec">
          <div className="adm-sec-hdr">
            <div className="adm-sec-title">All <em>users</em></div>
            <div className="adm-sec-sub">{data.users.length} accounts · click to expand</div>
          </div>
          <table className="adm-table">
            <thead>
              <tr>
                <th className="adm-th">User ID</th>
                <th className="adm-th">Specialties</th>
                <th className="adm-th">Sessions</th>
                <th className="adm-th">Notes opened</th>
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
                return (
                  <>
                    <tr key={u.id} className={`adm-tr ${u.daysSinceActive >= inactiveDays ? 'inactive-row' : ''}`} onClick={() => toggleExpand(u.id)}>
                      <td className="adm-td mono">{u.id.slice(0, 8)}…</td>
                      <td className="adm-td">
                        {u.specialties.map(s => (
                          <span key={s} className="spec-chip">{s === 'obgyn' ? 'OB/GYN' : s === 'ophtho' ? 'Ophtho' : s}</span>
                        ))}
                      </td>
                      <td className="adm-td mono">{u.sessions}</td>
                      <td className="adm-td mono">{u.openedNotes}</td>
                      <td className={`adm-td score ${scoreClass}`}>{u.mcqAvg !== null ? `${u.mcqAvg}%` : '—'}</td>
                      <td className="adm-td mono">{u.mcqSessions.length}</td>
                      <td className="adm-td mono">{formatDate(u.firstSeen)}</td>
                      <td className="adm-td mono">{daysSince(u.lastActive)}</td>
                      <td className="adm-td"><span className={`adm-chevron ${isExp ? 'open' : ''}`}>›</span></td>
                    </tr>
                    {isExp && (
                      <tr key={`${u.id}-exp`} className="adm-expand-row">
                        <td colSpan={9} className="adm-td">
                          <div className="adm-expand-inner">
                            {u.mcqSessions.length === 0 ? (
                              <div className="adm-empty">No MCQ sessions yet.</div>
                            ) : (
                              <>
                                <div className="adm-expand-title">MCQ sessions — {u.mcqSessions.length} total</div>
                                {u.mcqSessions.map((s, i) => {
                                  const sc = s.pct >= 80 ? '#2a6642' : s.pct >= 60 ? '#c8962a' : '#c8452a'
                                  return (
                                    <div key={i} className="adm-session-row">
                                      <div className="adm-session-note">{s.note}</div>
                                      <div className="adm-session-spec">{s.specialty === 'obgyn' ? 'OB/GYN' : s.specialty === 'qbank' ? 'Q-Bank' : 'Ophtho'}</div>
                                      <div className="adm-session-score" style={{color: sc}}>{s.pct}%</div>
                                      {s.got != null && <div className="adm-session-spec">{s.got}/{s.total}</div>}
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

        {/* Inactive users */}
        <div className="adm-sec">
          <div className="adm-sec-hdr">
            <div className="adm-sec-title">Inactive <em>users</em></div>
            <div className="adm-threshold">
              <span className="adm-threshold-label">Threshold:</span>
              {[3, 7, 14, 30].map(d => (
                <button key={d} className={`adm-threshold-btn ${inactiveDays === d ? 'on' : ''}`} onClick={() => setInactiveDays(d)}>{d}d</button>
              ))}
            </div>
          </div>
          {inactiveUsers.length === 0 ? (
            <div className="adm-empty">No users inactive for {inactiveDays}+ days.</div>
          ) : (
            inactiveUsers.map(u => (
              <div key={u.id} className="adm-inactive-alert">
                <div>
                  <div className="adm-inactive-name">{u.id.slice(0, 8)}…{u.id.slice(-4)}</div>
                  <div className="adm-inactive-meta">{u.sessions} sessions · {u.openedNotes} notes · MCQ avg {u.mcqAvg !== null ? `${u.mcqAvg}%` : 'none'}</div>
                </div>
                <div className="adm-inactive-days">{u.daysSinceActive}d inactive</div>
              </div>
            ))
          )}
        </div>

        {/* Top notes */}
        <div className="adm-sec">
          <div className="adm-sec-hdr">
            <div className="adm-sec-title">Most <em>opened notes</em></div>
            <div className="adm-sec-sub">Across all users</div>
          </div>
          {data.topNotes.length === 0 ? (
            <div className="adm-empty">No note opens recorded yet.</div>
          ) : (
            data.topNotes.map((n, i) => (
              <div key={i} className="adm-note-row">
                <div className="adm-note-rank">{i + 1}</div>
                <div className="adm-note-name">{n.name}</div>
                <div className="adm-note-spec">{n.specialty === 'obgyn' ? 'OB/GYN' : n.specialty === 'ophtho' ? 'Ophtho' : n.specialty}</div>
                <div className="adm-note-bar-bg">
                  <div className="adm-note-bar-fill" style={{width: `${Math.round((n.count / data.topNotes[0].count) * 100)}%`}}/>
                </div>
                <div className="adm-note-count">{n.count}×</div>
              </div>
            ))
          )}
        </div>

      </div>
    </>
  )
}
