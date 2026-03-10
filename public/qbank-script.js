// ═══════════════════════════════════════════════════════════════
//  VENT Q-BANK — CLINICAL WORKSPACE SCRIPT v2
//  Features: highlight system, annotations, proper sidebar,
//  topic/time breakdown results, flagging, Supabase sync
// ═══════════════════════════════════════════════════════════════

// ─── SUPABASE CONFIG ───────────────────────────────────────────
const PROJ = 'vwotkstjgzwjjutzjjph';
const SUPA_KEY = 'sb_publishable_bIKimcSjTZWahxZ_5epT3A_s4LGlFUj';

function getToken() {
  try {
    return JSON.parse(localStorage.getItem('sb-' + PROJ + '-auth-token'))?.access_token || null;
  } catch(e) { return null; }
}

async function supaFetch(path, opts = {}) {
  const token = getToken();
  if(!token) return null;
  try {
    const res = await fetch(`https://${PROJ}.supabase.co/rest/v1/${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + token,
        'Prefer': 'return=minimal',
        ...(opts.headers || {})
      }
    });
    if(!res.ok) return null;
    if(res.status === 204) return true;
    return res.json().catch(() => null);
  } catch(e) { return null; }
}

// ─── SESSION STATE ─────────────────────────────────────────────
const LTR = ['A','B','C','D'];

const S = {
  sys:        'all',
  mode:       'normal',
  queue:      [],
  ci:         0,
  answers:    [],
  skipped:    [],
  flags:      [],
  sel:        null,
  confirmed:  false,
  startTimes: [],  // timestamp when each question was first seen
  timeSpent:  [],  // seconds spent per question
  // per-question data keyed by QB index
  annotations: {},  // qbIdx -> string note
  highlights:  {},  // qbIdx -> array of {start,end,color} (stored as serialized ranges)
  _notesLoaded: false,
  _hlLoaded: false,
};

// ─── HELPERS ───────────────────────────────────────────────────
function shuffle(a) {
  const b = [...a];
  for(let i=b.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [b[i],b[j]] = [b[j],b[i]];
  }
  return b;
}

function show(id) {
  ['screen-launcher','screen-session','screen-results'].forEach(s => {
    document.getElementById(s).style.display = s===id ? 'block' : 'none';
  });
  window.scrollTo(0,0);
}

function qbIdx(q) { return QB.indexOf(q); }

// ─── LAUNCH / SESSION MANAGEMENT ──────────────────────────────
function selectSys(sys, btn) {
  document.querySelectorAll('.sys-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  S.sys = sys;
  updateSummary();
}

function selectMode(mode, btn) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  S.mode = mode;
  updateSummary();
}

function clampCount() {
  const el = document.getElementById('count-input');
  let v = parseInt(el.value) || 10;
  if(v < 5) v = 5;
  el.value = v;
  updateSummary();
}

function updateSummary() {
  const pool = QB.filter(q => S.sys === 'all' || q.sys === S.sys);
  const n = Math.min(parseInt(document.getElementById('count-input').value) || 10, pool.length);
  const syslbl = {all:'All Systems', obgyn:'OB / GYN', ophtho:'Ophthalmology'}[S.sys] || 'All Systems';
  const el = document.getElementById('launch-summary');
  if(el) el.innerHTML = `<strong>${n}</strong> questions &nbsp;·&nbsp; <strong>${syslbl}</strong> &nbsp;·&nbsp; <strong>${S.mode === 'normal' ? 'Normal' : 'Exam'}</strong>`;

  const sc = document.getElementById('sc-all');
  if(sc) sc.textContent = QB.length + ' questions';
  const so = document.getElementById('sc-obgyn');
  if(so) so.textContent = QB.filter(q=>q.sys==='obgyn').length + ' questions';
  const sp = document.getElementById('sc-ophtho');
  if(sp) sp.textContent = QB.filter(q=>q.sys==='ophtho').length + ' questions';

  // show focus banner
  try {
    const wRaw = localStorage.getItem('vent_weak_topics');
    const fb = document.getElementById('focus-banner');
    if(wRaw && fb) {
      const w = JSON.parse(wRaw);
      const age = Date.now() - (w.ts||0);
      if(age < 7*24*60*60*1000 && w.topics?.length) {
        fb.style.display = 'flex';
        const tl = document.getElementById('focus-topics-list');
        if(tl) tl.textContent = w.topics.join(', ');
      } else { fb.style.display = 'none'; }
    }
  } catch(e) {}

  // Load recent performance
  loadRecentPerf();
}

async function loadRecentPerf() {
  const token = getToken();
  if(!token) {
    // Show placeholder from localStorage
    try {
      const hist = JSON.parse(localStorage.getItem('vent_qbank_history') || '[]');
      renderPerfStrip(hist);
    } catch(e) {}
    return;
  }
  // Could fetch from Supabase qbank_results table in future; use localStorage for now
  try {
    const hist = JSON.parse(localStorage.getItem('vent_qbank_history') || '[]');
    renderPerfStrip(hist);
  } catch(e) {}
}

function renderPerfStrip(hist) {
  const strip = document.getElementById('l-perf-strip');
  if(!strip) return;
  if(!hist.length) {
    strip.innerHTML = `
      <div class="l-perf-block">
        <div class="l-perf-label">Sessions</div>
        <div class="l-perf-val">—</div>
        <div class="l-perf-sub">No sessions yet</div>
      </div>
      <div class="l-perf-block">
        <div class="l-perf-label">Avg score</div>
        <div class="l-perf-val">—</div>
        <div class="l-perf-sub">Complete a session</div>
      </div>
      <div class="l-perf-block">
        <div class="l-perf-label">Questions done</div>
        <div class="l-perf-val">—</div>
        <div class="l-perf-sub">across all sessions</div>
      </div>
    `;
    return;
  }
  const sessions = hist.length;
  const avgPct = Math.round(hist.reduce((s,h) => s + h.pct, 0) / sessions);
  const totalQ = hist.reduce((s,h) => s + h.total, 0);
  const pctCls = avgPct >= 80 ? 'ok' : avgPct >= 60 ? 'warn' : 'bad';
  const last = hist[hist.length-1];
  strip.innerHTML = `
    <div class="l-perf-block">
      <div class="l-perf-label">Sessions</div>
      <div class="l-perf-val">${sessions}</div>
      <div class="l-perf-sub">completed</div>
    </div>
    <div class="l-perf-block">
      <div class="l-perf-label">Avg score</div>
      <div class="l-perf-val ${pctCls}">${avgPct}%</div>
      <div class="l-perf-sub">across sessions</div>
    </div>
    <div class="l-perf-block">
      <div class="l-perf-label">Questions done</div>
      <div class="l-perf-val">${totalQ}</div>
      <div class="l-perf-sub">total answered</div>
    </div>
    <div class="l-perf-block">
      <div class="l-perf-label">Last session</div>
      <div class="l-perf-val ${last.pct>=80?'ok':last.pct>=60?'warn':'bad'}">${last.pct}%</div>
      <div class="l-perf-sub">${last.total} questions</div>
    </div>
  `;
}

function saveHistory(pct, total, topicStats) {
  try {
    const hist = JSON.parse(localStorage.getItem('vent_qbank_history') || '[]');
    hist.push({ pct, total, ts: Date.now(), topicStats });
    // keep last 50
    if(hist.length > 50) hist.splice(0, hist.length - 50);
    localStorage.setItem('vent_qbank_history', JSON.stringify(hist));
  } catch(e) {}
}

function launch() {
  clampCount();
  const count = Math.max(5, parseInt(document.getElementById('count-input').value) || 10);
  const pool = QB.filter(q => S.sys === 'all' || q.sys === S.sys);
  S.queue = shuffle(pool).slice(0, Math.min(count, pool.length));
  S.ci = 0;
  S.answers   = Array(S.queue.length).fill(null);
  S.skipped   = Array(S.queue.length).fill(false);
  S.flags     = Array(S.queue.length).fill(false);
  S.startTimes = Array(S.queue.length).fill(null);
  S.timeSpent  = Array(S.queue.length).fill(0);
  S.sel = null; S.confirmed = false;
  saveSession();
  loadUserData();  // load highlights & annotations from Supabase
  show('screen-session'); buildSidebar(); renderQ();
}

// ─── SESSION PERSISTENCE ────────────────────────────────────────
function saveSession() {
  try {
    localStorage.setItem('vent_qbank_session', JSON.stringify({
      sys: S.sys, mode: S.mode,
      queue: S.queue.map(q => QB.indexOf(q)),
      ci: S.ci, answers: S.answers,
      skipped: S.skipped, flags: S.flags,
      startTimes: S.startTimes, timeSpent: S.timeSpent,
    }));
  } catch(e) {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem('vent_qbank_session');
    if(!raw) return false;
    const d = JSON.parse(raw);
    if(!d.queue?.length) return false;
    const queue = d.queue.map(i => QB[i]).filter(Boolean);
    if(queue.length !== d.queue.length) return false;
    S.sys      = d.sys || 'all';
    S.mode     = d.mode || 'normal';
    S.queue    = queue;
    S.ci       = d.ci || 0;
    S.answers  = d.answers || Array(queue.length).fill(null);
    S.skipped  = d.skipped || Array(queue.length).fill(false);
    S.flags    = d.flags || Array(queue.length).fill(false);
    S.startTimes = d.startTimes || Array(queue.length).fill(null);
    S.timeSpent  = d.timeSpent || Array(queue.length).fill(0);
    S.sel = null; S.confirmed = false;
    return true;
  } catch(e) { return false; }
}

function clearSession() {
  try { localStorage.removeItem('vent_qbank_session'); } catch(e) {}
}

// ─── USER DATA: HIGHLIGHTS + ANNOTATIONS ──────────────────────
async function loadUserData() {
  const token = getToken();
  if(!token) {
    // fall back to localStorage
    try {
      S.annotations = JSON.parse(localStorage.getItem('vent_qbank_notes') || '{}');
      S.highlights  = JSON.parse(localStorage.getItem('vent_qbank_highlights') || '{}');
    } catch(e) {}
    return;
  }
  // Try Supabase qbank_user_data table
  const data = await supaFetch(`qbank_user_data?select=key,value`, {
    headers: { 'Range': '0-1000' }
  });
  if(data && Array.isArray(data)) {
    data.forEach(row => {
      try {
        if(row.key === 'annotations') S.annotations = JSON.parse(row.value);
        if(row.key === 'highlights')  S.highlights  = JSON.parse(row.value);
      } catch(e) {}
    });
  } else {
    // table doesn't exist yet, use localStorage
    try {
      S.annotations = JSON.parse(localStorage.getItem('vent_qbank_notes') || '{}');
      S.highlights  = JSON.parse(localStorage.getItem('vent_qbank_highlights') || '{}');
    } catch(e) {}
  }
}

async function saveAnnotations() {
  // always save to localStorage as fallback
  try { localStorage.setItem('vent_qbank_notes', JSON.stringify(S.annotations)); } catch(e) {}
  // try Supabase upsert
  const token = getToken();
  if(!token) return;
  await supaFetch(`qbank_user_data?on_conflict=key`, {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'annotations', value: JSON.stringify(S.annotations) })
  });
}

async function saveHighlights() {
  try { localStorage.setItem('vent_qbank_highlights', JSON.stringify(S.highlights)); } catch(e) {}
  const token = getToken();
  if(!token) return;
  await supaFetch(`qbank_user_data?on_conflict=key`, {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'highlights', value: JSON.stringify(S.highlights) })
  });
}

// ─── SIDEBAR ──────────────────────────────────────────────────
function buildSidebar() {
  if(!S.flags) S.flags = Array(S.queue.length).fill(false);
  updateSidebar();
}

function updateSidebar() {
  const total = S.queue.length;
  const answered = S.answers.filter(a => a !== null).length;
  const pct = Math.round((answered/total)*100);

  // progress fill
  const fill = document.getElementById('sb-bar-fill');
  if(fill) fill.style.width = pct + '%';

  // head count
  const hc = document.getElementById('sb-head-count');
  if(hc) hc.textContent = `${answered} / ${total}`;

  // nav dots
  const nav = document.getElementById('sb-nav');
  if(nav) {
    nav.innerHTML = '';
    for(let i=0; i<total; i++) {
      const dot = document.createElement('button');
      dot.className = 'sb-dot';
      dot.onclick = () => jumpToQ(i);

      const ans = S.answers[i];
      const isCurrent = i === S.ci;
      if(isCurrent) dot.classList.add('current');
      else if(S.skipped[i]) dot.classList.add('skipped');
      else if(ans !== null) {
        dot.classList.add(ans === S.queue[i].ans ? 'answered' : 'wrong');
      }
      if(S.flags[i]) dot.classList.add('flagged');

      const flagHtml = S.flags[i] ? '<span class="sb-flag-icon">⚑</span>' : '';
      dot.innerHTML = `<span style="font-size:10px;">${i+1}</span>${flagHtml}`;

      nav.appendChild(dot);
    }
    // scroll current into view
    const cur = nav.querySelector('.sb-dot.current');
    if(cur) cur.scrollIntoView({block:'nearest',behavior:'smooth'});
  }

  // flag button state
  const fb = document.getElementById('sb-flag-btn');
  if(fb) {
    const flagged = S.flags[S.ci];
    fb.classList.toggle('flag-active', !!flagged);
    fb.textContent = flagged ? '⚑ Flagged' : '⚑ Flag for review';
  }

  // mobile bar
  const mf = document.getElementById('mob-prog-fill');
  const mt = document.getElementById('mob-prog-txt');
  const mm = document.getElementById('mob-prog-mode');
  if(mf) mf.style.width = Math.round((S.ci/total)*100)+'%';
  if(mt) mt.textContent = `Q${S.ci+1} / ${total}`;
  if(mm) mm.textContent = S.queue[S.ci]?.topic || '';

  saveSession();
}

function jumpToQ(i) {
  if(i === S.ci) return;
  // commit current time
  tickTime();
  S.ci = i;
  S.sel = null; S.confirmed = false;
  const ans = S.answers[i];
  renderQ();
  if(ans !== null && ans !== -1) {
    // re-show revealed state
    setTimeout(() => revealAnswerDisplay(i), 0);
  }
}

function tickTime() {
  if(S.startTimes[S.ci] !== null) {
    S.timeSpent[S.ci] += Math.round((Date.now() - S.startTimes[S.ci]) / 1000);
  }
  S.startTimes[S.ci] = null;
}

// ─── QUESTION RENDER ──────────────────────────────────────────
function renderQ() {
  const q = S.queue[S.ci];
  S.sel = null; S.confirmed = false;
  S.startTimes[S.ci] = Date.now();
  updateSidebar();

  const isLast = S.ci === S.queue.length - 1;
  const diff = q.diff || 'core';
  const diffLabel = {foundation:'Foundation', core:'Core', advanced:'Advanced'}[diff] || 'Core';
  const isFlagged = S.flags[S.ci];
  const hasNote = !!(S.annotations[qbIdx(q)]?.trim());
  const idx = qbIdx(q);

  const optsHtml = q.opts.map((o,i) => `
    <button class="opt" id="opt-${i}" onclick="selectOpt(${i})">
      <span class="opt-ltr">${LTR[i]}</span>
      <span class="opt-txt">${o}</span>
    </button>`).join('');

  const confirmBarHtml = S.mode === 'exam' ? `
    <div class="confirm-bar" id="confirm-bar">
      <span class="confirm-hint"><kbd style="background:var(--bg2);border:1px solid var(--border);padding:2px 6px;font-family:'JetBrains Mono',monospace;font-size:9px;border-radius:2px;">↵</kbd> confirm</span>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="skip-btn" onclick="skipQ()">Skip</button>
        <button class="confirm-btn" onclick="confirmAnswer()">Confirm →</button>
      </div>
    </div>` : `<div class="confirm-bar" id="confirm-bar" style="display:none"></div>`;

  const existingNote = S.annotations[idx] || '';

  document.getElementById('q-area').innerHTML = `
    <div class="q-inner">
      <div class="q-meta">
        <span class="q-num">Q${S.ci+1} / ${S.queue.length}</span>
        <span class="q-sep q-meta-reveal" style="display:none"></span>
        <span class="q-topic q-meta-reveal" style="display:none">${q.topic}</span>
        <span class="q-sep q-meta-reveal" style="display:none"></span>
        <span class="diff-badge ${diff} q-meta-reveal" style="display:none">${diffLabel}</span>
        <div class="q-tools">
          <button class="q-tool-btn${isFlagged?' flag-on':''}" id="flag-btn-top" onclick="toggleFlag()">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1h8v6H1V1zM1 1v11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${isFlagged ? 'Flagged' : 'Flag'}
          </button>
          <button class="q-tool-btn${hasNote?' note-on':''}" id="note-btn-top" onclick="toggleNotePanel()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3.5 4.5h5M3.5 6.5h5M3.5 8.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            Note${hasNote?' ●':''}
          </button>
        </div>
      </div>

      <div class="vignette" id="vignette-block">
        <div class="vig-label">Clinical Scenario</div>
        <div class="vig-text" id="vig-text" onmouseup="onVigMouseUp(event)">${q.vig}</div>
      </div>

      <div class="q-stem">${q.stem}</div>

      <div class="opts">${optsHtml}</div>

      ${S.mode === 'normal' ? `
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
          <button class="skip-btn" id="skip-btn-inline" onclick="skipQ()">Skip →</button>
        </div>` : confirmBarHtml}

      <div class="q-kbd-hint" id="kbd-hint">
        <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> select</span>
        <span><kbd>F</kbd> flag</span>
        <span><kbd>N</kbd> note</span>
        ${S.mode === 'exam' ? '<span><kbd>↵</kbd> confirm</span>' : ''}
        <span><kbd>→</kbd> next</span>
      </div>

      <div class="note-panel" id="note-panel"${hasNote?' style="display:block"':''}>
        <div class="note-panel-label">Your note</div>
        <textarea class="note-textarea" id="note-textarea" placeholder="What did you miss? A mnemonic? Write it here…">${existingNote}</textarea>
        <button class="note-save-btn" onclick="saveNote()">Save note</button>
        ${hasNote ? `<button onclick="clearNote()" style="margin-top:8px;margin-left:8px;background:none;border:1px solid var(--border);color:var(--ink5);font-family:'JetBrains Mono',monospace;font-size:9px;padding:7px 14px;cursor:pointer;">Clear</button>` : ''}
      </div>

      <div class="exp-block" id="exp-block"></div>

      <div class="next-wrap">
        <button class="next-btn" id="next-btn" onclick="nextQ()">
          ${isLast ? 'See results' : 'Next question'} →
        </button>
      </div>
    </div>
  `;

  // Apply user highlights for this question
  applyHighlights(idx);
  // Auto-highlight critical clinical words
  autoHighlightClinicalWords(idx);
}

// ─── AUTO-HIGHLIGHT CRITICAL CLINICAL WORDS ───────────────────
// Patterns that represent key clinical data points
const CLINICAL_PATTERNS = [
  // Age
  /\b\d{1,3}-year-old\b/g,
  // Vitals
  /\bBP\s+\d+\/\d+\b/g,
  /\bHR\s+\d+\b/g,
  /\bSaO2\s+\d+%?\b/gi,
  /\bGCS\s+\d+\b/gi,
  /\bRR\s+\d+\b/gi,
  /\bTemp\s+[\d.]+\b/gi,
  // Obstetric
  /\bG\d+P\d+\b/g,
  /\b\d+\s*weeks?\b/gi,
  // Labs
  /\bHbA1c\s+[\d.]+\b/gi,
  /\bβhCG\s+[\d,]+\b/gi,
  /\bESR\s+[\d.]+\b/gi,
  /\bCRP\s+[\d.]+\b/gi,
  /\bEBL\s+[\d,]+\s*m?L\b/gi,
  // Existing strong tags (already bolded by author)
  // We won't double-highlight those
];

function autoHighlightClinicalWords(qIdx) {
  const vigEl = document.getElementById('vig-text');
  if(!vigEl) return;
  const plainText = vigEl.textContent;

  // Only auto-highlight if user hasn't set any highlights for this Q yet
  if(S.highlights[qIdx] && S.highlights[qIdx].length > 0) return;

  const ranges = [];
  CLINICAL_PATTERNS.forEach(pattern => {
    pattern.lastIndex = 0;
    let m;
    while((m = pattern.exec(plainText)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, color: 'yellow', auto: true });
    }
  });

  if(!ranges.length) return;

  // Merge overlaps, mark as auto
  ranges.sort((a,b) => a.start - b.start);
  const merged = [];
  for(const r of ranges) {
    const last = merged[merged.length - 1];
    if(last && r.start < last.end) { last.end = Math.max(last.end, r.end); }
    else merged.push({...r});
  }

  // Store as auto highlights (prefixed so undo works)
  if(!S.highlights[qIdx]) S.highlights[qIdx] = [];
  // Add only if no manual highlights exist
  merged.forEach(r => S.highlights[qIdx].push(r));
  applyHighlights(qIdx);
  // Don't saveHighlights() for auto — they regenerate each time
}

function onVigMouseUp(e) {
  const sel = window.getSelection();

  // Click on an existing highlight mark = remove it immediately
  if(e.target && e.target.tagName === 'MARK') {
    const vigEl = document.getElementById('vig-text');
    if(!vigEl) return;
    const mark = e.target;
    // Count chars before this mark by walking all text nodes
    let offset = 0;
    const walker = document.createTreeWalker(vigEl, NodeFilter.SHOW_TEXT);
    let node;
    while((node = walker.nextNode())) {
      if(mark.contains(node)) break;
      offset += node.textContent.length;
    }
    const start = offset;
    const end = start + mark.textContent.length;
    const idx = qbIdx(S.queue[S.ci]);
    if(!_hlUndo[idx]) _hlUndo[idx] = [];
    _hlUndo[idx].push(JSON.parse(JSON.stringify(S.highlights[idx] || [])));
    S.highlights[idx] = (S.highlights[idx] || []).filter(h => h.end <= start || h.start >= end);
    applyHighlights(idx);
    saveHighlights();
    if(sel) sel.removeAllRanges();
    return;
  }

  if(!sel || sel.isCollapsed) { hideHlToolbar(); return; }
  const range = sel.getRangeAt(0);
  const vigEl = document.getElementById('vig-text');
  if(!vigEl || !vigEl.contains(range.commonAncestorContainer)) { hideHlToolbar(); return; }
  // Show toolbar near selection
  const rect = range.getBoundingClientRect();
  showHlToolbar(rect.left + rect.width/2, rect.top + window.scrollY - 44);
}

// highlight undo stack per question
const _hlUndo = {};

function showHlToolbar(x, y) {
  let tb = document.getElementById('hl-toolbar');
  if(!tb) {
    tb = document.createElement('div');
    tb.className = 'hl-toolbar';
    tb.id = 'hl-toolbar';
    tb.innerHTML = `
      <button class="hl-btn yellow" title="Yellow" onclick="applyHl('yellow')"></button>
      <button class="hl-btn green"  title="Green"  onclick="applyHl('green')"></button>
      <button class="hl-btn red"    title="Red"    onclick="applyHl('red')"></button>
      <button class="hl-btn clear"  title="Remove" onclick="removeHl()">✕</button>
      <button class="hl-btn undo"   title="Undo"   onclick="undoHl()">↩</button>
    `;
    document.body.appendChild(tb);
  }
  tb.style.left = Math.max(8, x - 70) + 'px';
  tb.style.top  = y + 'px';
  tb.classList.add('show');
}

function hideHlToolbar() {
  const tb = document.getElementById('hl-toolbar');
  if(tb) tb.classList.remove('show');
}

function undoHl() {
  const idx = qbIdx(S.queue[S.ci]);
  if(!_hlUndo[idx] || !_hlUndo[idx].length) { hideHlToolbar(); return; }
  S.highlights[idx] = _hlUndo[idx].pop();
  hideHlToolbar();
  applyHighlights(idx);
  saveHighlights();
}

function applyHl(color) {
  const sel = window.getSelection();
  if(!sel || sel.isCollapsed) { hideHlToolbar(); return; }
  const vigEl = document.getElementById('vig-text');
  if(!vigEl) return;
  const range = sel.getRangeAt(0);

  // Get text offsets within vig-text
  const fullText = vigEl.textContent;
  const preRange = document.createRange();
  preRange.setStart(vigEl, 0);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  const selectedText = range.toString();
  const end = start + selectedText.length;

  if(end <= start) { hideHlToolbar(); return; }

  const idx = qbIdx(S.queue[S.ci]);
  if(!S.highlights[idx]) S.highlights[idx] = [];
  // Save undo snapshot
  if(!_hlUndo[idx]) _hlUndo[idx] = [];
  _hlUndo[idx].push(JSON.parse(JSON.stringify(S.highlights[idx])));
  if(_hlUndo[idx].length > 20) _hlUndo[idx].shift();
  // Remove overlapping highlights in this range
  S.highlights[idx] = S.highlights[idx].filter(h => h.end <= start || h.start >= end);
  S.highlights[idx].push({ start, end, color });
  S.highlights[idx].sort((a,b) => a.start - b.start);

  sel.removeAllRanges();
  hideHlToolbar();
  applyHighlights(idx);
  saveHighlights();
}

function removeHl() {
  const sel = window.getSelection();
  if(!sel || sel.isCollapsed) { hideHlToolbar(); return; }
  const vigEl = document.getElementById('vig-text');
  if(!vigEl) return;
  const range = sel.getRangeAt(0);

  const preRange = document.createRange();
  preRange.setStart(vigEl, 0);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  const end = start + range.toString().length;

  const idx = qbIdx(S.queue[S.ci]);
  if(!S.highlights[idx]) { hideHlToolbar(); return; }
  // Remove highlights that overlap
  S.highlights[idx] = S.highlights[idx].filter(h => h.end <= start || h.start >= end);
  sel.removeAllRanges();
  hideHlToolbar();
  applyHighlights(idx);
  saveHighlights();
}

function applyHighlights(qIdx) {
  const vigEl = document.getElementById('vig-text');
  if(!vigEl) return;
  const hl = S.highlights[qIdx];
  if(!hl || !hl.length) return;

  // Re-render the vig-text with highlights inserted as <mark> spans
  const raw = S.queue[S.ci].vig;
  // We need to work with the HTML string, not just text.
  // Strategy: render via a temp div, extract text positions, then reinsert marks.
  // Simple approach: work with plain text content, insert marks, then restore HTML tags.

  // Build a text-level annotation layer using a simplified re-render:
  const temp = document.createElement('div');
  temp.innerHTML = raw;
  const plainText = temp.textContent;

  // Build segments
  const segments = [];
  let pos = 0;
  const sorted = [...hl].sort((a,b) => a.start - b.start);
  for(const h of sorted) {
    if(h.start > pos) segments.push({ text: plainText.slice(pos, h.start), color: null });
    segments.push({ text: plainText.slice(h.start, h.end), color: h.color });
    pos = h.end;
  }
  if(pos < plainText.length) segments.push({ text: plainText.slice(pos), color: null });

  vigEl.innerHTML = segments.map(seg => {
    const esc = seg.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return seg.color ? `<mark class="hl-${seg.color}">${esc}</mark>` : esc;
  }).join('');
}

// ─── ANNOTATION ───────────────────────────────────────────────
function toggleNotePanel() {
  const p = document.getElementById('note-panel');
  if(!p) return;
  const isOpen = p.style.display !== 'none' && p.style.display !== '';
  p.style.display = isOpen ? 'none' : 'block';
  if(!isOpen) { const ta = document.getElementById('note-textarea'); if(ta) ta.focus(); }
}

async function saveNote() {
  const ta = document.getElementById('note-textarea');
  if(!ta) return;
  const note = ta.value.trim();
  const idx = qbIdx(S.queue[S.ci]);
  if(note) S.annotations[idx] = note;
  else delete S.annotations[idx];
  await saveAnnotations();
  // update note button indicator
  const nb = document.getElementById('note-btn-top');
  if(nb) {
    nb.classList.toggle('note-on', !!note);
    nb.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <path d="M3.5 4.5h5M3.5 6.5h5M3.5 8.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      Note${note?' ●':''}
    `;
  }
  // show brief saved indicator
  const btn = document.querySelector('.note-save-btn');
  if(btn) { btn.textContent = 'Saved ✓'; setTimeout(() => { btn.textContent = 'Save note'; }, 1200); }
}

async function clearNote() {
  const idx = qbIdx(S.queue[S.ci]);
  delete S.annotations[idx];
  await saveAnnotations();
  const ta = document.getElementById('note-textarea');
  if(ta) ta.value = '';
  const panel = document.getElementById('note-panel');
  if(panel) panel.style.display = 'none';
  const nb = document.getElementById('note-btn-top');
  if(nb) { nb.classList.remove('note-on'); nb.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 4.5h5M3.5 6.5h5M3.5 8.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Note`; }
}

// ─── SELECT / CONFIRM ─────────────────────────────────────────
function selectOpt(i) {
  if(S.confirmed) return;
  S.sel = i;
  document.querySelectorAll('.opt').forEach((el, idx) => el.classList.toggle('sel', idx === i));
  if(S.mode === 'normal') {
    confirmAnswer();
  } else {
    const bar = document.getElementById('confirm-bar');
    if(bar) bar.classList.add('show');
  }
}

function confirmAnswer() {
  if(S.sel === null) return;
  tickTime();
  S.confirmed = true;
  S.answers[S.ci] = S.sel;

  const q = S.queue[S.ci];
  const sel = S.sel, correct = q.ans;
  const isOk = sel === correct;

  document.querySelectorAll('.opt').forEach((el, i) => {
    el.classList.add('locked'); el.classList.remove('sel');
    if(i === correct)    el.classList.add('rev-ok');
    else if(i === sel)   el.classList.add('rev-bad');
    else                 el.classList.add('rev-dim');
  });

  const cb = document.getElementById('confirm-bar');
  if(cb) cb.classList.remove('show');

  buildExplanation(q, isOk, sel, correct, S.mode === 'normal');

  const nb = document.getElementById('next-btn');
  if(nb) nb.classList.add('show');

  const skipInline = document.getElementById('skip-btn-inline');
  if(skipInline) skipInline.style.display = 'none';
  const kbdHint = document.getElementById('kbd-hint');
  if(kbdHint) kbdHint.style.display = 'none';
  // Reveal topic + difficulty badge after answering
  document.querySelectorAll('.q-meta-reveal').forEach(el => { el.style.display = ''; });

  updateSidebar();
}

function revealAnswerDisplay(qi) {
  // Called when jumping to an already-answered question
  const q = S.queue[qi];
  const sel = S.answers[qi];
  if(sel === null || sel === -1) return;
  const correct = q.ans;
  const isOk = sel === correct;

  document.querySelectorAll('.opt').forEach((el, i) => {
    el.classList.add('locked');
    if(i === correct)  el.classList.add('rev-ok');
    else if(i === sel) el.classList.add('rev-bad');
    else               el.classList.add('rev-dim');
  });

  S.sel = sel; S.confirmed = true;
  buildExplanation(q, isOk, sel, correct, true);

  const nb = document.getElementById('next-btn');
  if(nb) nb.classList.add('show');
  const si = document.getElementById('skip-btn-inline');
  if(si) si.style.display = 'none';
  // Reveal topic + difficulty
  document.querySelectorAll('.q-meta-reveal').forEach(el => { el.style.display = ''; });
}

function buildExplanation(q, isOk, sel, correct, full) {
  const block = document.getElementById('exp-block');
  if(!block) return;

  if(full) {
    const optRows = q.opts.map((o, i) => {
      const isC = i === correct;
      const txt = q.oe?.[i] || (isC ? q.lo || '' : '');
      return `<div class="exp-opt-row ${isC?'is-correct':''}">
        <span class="exp-opt-ltr ${isC?'ok':'dim'}">${LTR[i]}</span>
        <div class="exp-opt-body">${txt}</div>
      </div>`;
    }).join('');

    block.innerHTML = `
      <div class="exp-verdict">
        <span class="exp-badge ${isOk?'ok':'bad'}">${isOk?'✓ Correct':'✗ Incorrect'}</span>
        <span class="exp-correct-label">Correct: ${LTR[correct]}</span>
      </div>
      <div class="exp-divider"></div>
      <div class="exp-opts">${optRows}</div>
      <div class="exp-lo">
        <div class="exp-lo-label">Learning objective</div>
        <div class="exp-lo-text">${q.lo}</div>
      </div>`;
  } else {
    block.innerHTML = `
      <div class="exp-verdict">
        <span class="exp-badge ${isOk?'ok':'bad'}">${isOk?'✓ Correct':'✗ Incorrect'}</span>
        <span class="exp-correct-label">Correct: ${LTR[correct]}</span>
      </div>
      <div class="exp-divider"></div>
      <p style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink5);line-height:1.7;">Full breakdown shown at end of session.</p>`;
  }

  block.classList.add('show');
}

// ─── FLAG / SKIP / NEXT ───────────────────────────────────────
function toggleFlag() {
  if(!S.flags) S.flags = Array(S.queue.length).fill(false);
  S.flags[S.ci] = !S.flags[S.ci];
  const isFlagged = S.flags[S.ci];

  // update top button
  const fb = document.getElementById('flag-btn-top');
  if(fb) {
    fb.classList.toggle('flag-on', isFlagged);
    fb.innerHTML = `
      <svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1h8v6H1V1zM1 1v11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${isFlagged ? 'Flagged' : 'Flag'}
    `;
  }
  updateSidebar();
}

function skipQ() {
  if(S.confirmed) return;
  tickTime();
  S.skipped[S.ci] = true;
  S.answers[S.ci] = -1;
  updateSidebar();
  if(S.ci + 1 < S.queue.length) { S.ci++; renderQ(); window.scrollTo(0,0); }
  else { clearSession(); showResults(); }
}

function nextQ() {
  if(S.ci + 1 < S.queue.length) {
    tickTime();
    S.ci++; renderQ(); window.scrollTo(0,0);
  } else {
    tickTime();
    clearSession(); showResults();
  }
}

function exitSession() {
  if(confirm('Exit this session? Progress will be saved.')) {
    saveSession();
    show('screen-launcher');
    updateSummary();
  }
}

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────
document.addEventListener('keydown', e => {
  if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const screen = document.getElementById('screen-session');
  if(!screen || screen.style.display === 'none') return;

  if(e.key.toLowerCase() === 'f') { toggleFlag(); return; }
  if(e.key.toLowerCase() === 'n') { toggleNotePanel(); return; }

  const num = parseInt(e.key);
  if(num >= 1 && num <= 4 && !isNaN(num)) {
    if(!S.confirmed) selectOpt(num-1);
    return;
  }
  if(e.key === 'Enter') {
    if(!S.confirmed && S.sel !== null && S.mode === 'exam') { confirmAnswer(); return; }
    if(S.confirmed) {
      const nb = document.getElementById('next-btn');
      if(nb?.classList.contains('show')) nextQ();
    }
    return;
  }
  if((e.key === 'ArrowRight' || e.key === ' ') && S.confirmed) {
    e.preventDefault();
    const nb = document.getElementById('next-btn');
    if(nb?.classList.contains('show')) nextQ();
  }
});

// close highlight toolbar on outside click
document.addEventListener('mousedown', e => {
  const tb = document.getElementById('hl-toolbar');
  if(tb && !tb.contains(e.target) && e.target.id !== 'vig-text') {
    hideHlToolbar();
  }
});

// ─── RESULTS ──────────────────────────────────────────────────
function showResults() {
  const total = S.queue.length;
  let correct = 0, skippedCount = 0, flaggedCount = 0;
  S.queue.forEach((q,i) => {
    if(S.answers[i] === -1) skippedCount++;
    else if(S.answers[i] === q.ans) correct++;
    if(S.flags[i]) flaggedCount++;
  });
  const answered = total - skippedCount;
  const pct = answered > 0 ? Math.round((correct/answered)*100) : 0;

  // Store weak topics
  const missed = S.queue
    .filter((q,i) => S.answers[i] !== -1 && S.answers[i] !== q.ans)
    .map(q => q.topic);
  const uniqueMissed = [...new Set(missed)];
  if(uniqueMissed.length) {
    try { localStorage.setItem('vent_weak_topics', JSON.stringify({topics:uniqueMissed, sys:S.sys, ts:Date.now()})); } catch(e) {}
  }

  // Topic breakdown
  const topicMap = {};
  S.queue.forEach((q,i) => {
    if(!topicMap[q.topic]) topicMap[q.topic] = {correct:0, total:0, missed:false};
    if(S.answers[i] === -1) return;
    topicMap[q.topic].total++;
    if(S.answers[i] === q.ans) topicMap[q.topic].correct++;
    else topicMap[q.topic].missed = true;
  });

  // Save to history
  saveHistory(pct, answered, topicMap);

  // Score ring
  const r=54, circ=2*Math.PI*r, dash=(pct/100)*circ;
  const gc = pct>=80?'#2a6642':pct>=60?'#c8962a':'#c8452a';
  const gl = pct===100?'Perfect.':pct>=80?`${correct} of ${total}.`:pct>=60?'Getting there.':'Review and retry.';
  const gs = pct===100?'Every concept locked in.':pct>=80?'Solid. Look at what you missed.':pct>=60?'Good base. Gaps to close.':'Go back to the notes, then return.';

  // Topic cards HTML
  const topicCardsHtml = Object.entries(topicMap).map(([topic, stat]) => {
    const tPct = stat.total > 0 ? Math.round((stat.correct/stat.total)*100) : 0;
    const barCls = tPct>=80?'ok':tPct>=60?'warn':'bad';
    const noteLink = getNoteLink(topic);
    return `<div class="topic-card">
      <div class="topic-card-name">${topic}</div>
      <div class="topic-bar-wrap"><div class="topic-bar-fill ${barCls}" style="width:${tPct}%"></div></div>
      <div class="topic-score"><span>${stat.correct}/${stat.total} correct</span><span class="pct">${tPct}%</span></div>
      ${noteLink ? `<a href="${noteLink}" class="topic-note-link" target="_blank">→ Review notes</a>` : ''}
    </div>`;
  }).join('');

  // Time chart HTML
  const maxTime = Math.max(...S.timeSpent.filter(t=>t>0), 1);
  const timeChartHtml = S.queue.map((q,i) => {
    const t = S.timeSpent[i] || 0;
    const h = Math.max(4, Math.round((t/maxTime)*80));
    const slow = t > 90;
    const ok = S.answers[i] === q.ans;
    return `<div class="time-bar-wrap">
      <div class="time-bar ${slow?'slow':ok?'ok':''}" style="height:${h}px" title="Q${i+1}: ${t}s"></div>
      <div class="time-bar-q">${i+1}</div>
    </div>`;
  }).join('');

  // Question cards HTML
  const qBlocks = S.queue.map((q,i) => {
    const ans = S.answers[i];
    const isSkipped = ans === -1;
    const isOk = !isSkipped && ans === q.ans;
    const isFlagged = S.flags[i];
    const note = S.annotations[qbIdx(q)];
    const cls = isSkipped ? 'skip' : isOk ? 'ok' : 'bad';

    const optRows = q.opts.map((o,oi) => {
      const isC = oi === q.ans;
      const isA = oi === ans && !isSkipped;
      let cls2 = isC ? 'rk' : (isA && !isOk) ? 'rw' : '';
      return `<div class="res-opt ${cls2}"><span class="res-opt-ltr">${LTR[oi]}</span><span>${o}</span></div>`;
    }).join('');

    const expRows = q.opts.map((o,oi) => {
      const isC = oi === q.ans;
      const txt = q.oe?.[oi] || (isC ? q.lo||'' : '');
      if(!txt) return '';
      return `<div class="exp-opt-row ${isC?'is-correct':''}">
        <span class="exp-opt-ltr ${isC?'ok':'dim'}">${LTR[oi]}</span>
        <div class="exp-opt-body">${txt}</div>
      </div>`;
    }).join('');

    const timeStr = S.timeSpent[i] ? `${S.timeSpent[i]}s` : '';

    return `<div class="res-q ${cls}" data-ok="${isOk?1:0}" data-skipped="${isSkipped?1:0}" data-flagged="${isFlagged?1:0}">
      <div class="res-q-hdr" onclick="toggleResQ(this)">
        <span class="res-q-badge ${cls}">${isSkipped?'— Skipped':isOk?'✓ Correct':'✗ Incorrect'}</span>
        <span class="res-q-topic">${q.topic}</span>
        ${timeStr ? `<span class="res-q-time">${timeStr}</span>` : ''}
        ${isFlagged ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--red);">⚑</span>' : ''}
        <span class="res-q-toggle">›</span>
      </div>
      <div class="res-q-body">
        <div class="res-vig">${q.vig}</div>
        <div class="res-stem">${q.stem}</div>
        <div class="res-opts">${optRows}</div>
        <div class="res-exp-wrap">
          <div class="res-exp-opts">${expRows}</div>
          <div class="res-exp-lo-label">Learning objective</div>
          <div class="res-exp-lo-text">${q.lo}</div>
        </div>
        ${note ? `<div class="res-note"><span class="res-note-label">Your note</span><span class="res-note-text">${note.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span></div>` : ''}
      </div>
    </div>`;
  }).join('');

  const incorrectCount = total - correct - skippedCount;

  document.getElementById('screen-results').innerHTML = `
    <div class="results">
      <div class="res-top">
        <div class="score-ring">
          <svg width="128" height="128">
            <circle cx="64" cy="64" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="8"/>
            <circle cx="64" cy="64" r="${r}" fill="none" stroke="${gc}" stroke-width="8"
              stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
              style="transition:stroke-dasharray .8s cubic-bezier(.16,1,.3,1)"/>
          </svg>
          <div class="score-inner">
            <div class="score-n">${pct}%</div>
            <div class="score-pct">${correct}/${answered}</div>
          </div>
        </div>
        <div>
          <div class="res-grade">${gl.replace(/\.$/, '<em>.</em>')}</div>
          <div class="res-sub">${gs}</div>
          <div class="res-tally">
            <span><span class="td ok"></span>${correct} correct</span>
            <span><span class="td bad"></span>${incorrectCount} incorrect</span>
            ${skippedCount ? `<span><span class="td" style="background:var(--ink4)"></span>${skippedCount} skipped</span>` : ''}
            ${flaggedCount ? `<span><span class="td" style="background:var(--red);border-radius:0;width:6px;height:6px;"></span>${flaggedCount} flagged</span>` : ''}
          </div>
        </div>
      </div>

      <!-- TABS -->
      <div class="res-tabs">
        <button class="res-tab active" onclick="switchResTab('breakdown',this)">By Topic</button>
        <button class="res-tab" onclick="switchResTab('time',this)">Time</button>
        <button class="res-tab" onclick="switchResTab('all',this)">All Questions</button>
        ${flaggedCount ? `<button class="res-tab" onclick="switchResTab('flagged',this)">Flagged (${flaggedCount})</button>` : ''}
        ${incorrectCount ? `<button class="res-tab" onclick="switchResTab('missed',this)">Missed (${incorrectCount})</button>` : ''}
        ${Object.keys(S.annotations).length ? `<button class="res-tab" onclick="switchResTab('notes',this)">Notes</button>` : ''}
      </div>

      <!-- BREAKDOWN TAB -->
      <div class="res-panel active" id="rp-breakdown">
        <div class="res-section-label">Performance by topic</div>
        <div class="topic-grid">${topicCardsHtml}</div>
        ${uniqueMissed.length ? `
          <div class="res-section-label">Weak areas</div>
          <div class="focus-chips">${uniqueMissed.map(t=>`<div class="focus-chip">${t}</div>`).join('')}</div>
        ` : ''}
      </div>

      <!-- TIME TAB -->
      <div class="res-panel" id="rp-time">
        <div class="res-section-label">Time per question (seconds)</div>
        <div style="margin-bottom:12px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink5);">
          <span style="color:var(--red)">■</span> &gt;90s (slow) &nbsp;
          <span style="color:var(--green)">■</span> correct &nbsp;
          <span style="color:var(--ink5)">■</span> incorrect
        </div>
        <div class="time-grid" style="min-height:100px;">${timeChartHtml}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink5);margin-top:16px;">
          Avg: ${Math.round(S.timeSpent.filter(t=>t>0).reduce((a,b)=>a+b,0) / (S.timeSpent.filter(t=>t>0).length||1))}s per question
        </div>
      </div>

      <!-- ALL QUESTIONS TAB -->
      <div class="res-panel" id="rp-all">
        <div class="res-filter-bar">
          <button class="res-filter-btn active" onclick="filterResults('all',this)">All (${total})</button>
          <button class="res-filter-btn" onclick="filterResults('incorrect',this)">Incorrect (${incorrectCount})</button>
          ${flaggedCount ? `<button class="res-filter-btn" onclick="filterResults('flagged',this)">Flagged (${flaggedCount})</button>` : ''}
          ${skippedCount ? `<button class="res-filter-btn" onclick="filterResults('skipped',this)">Skipped (${skippedCount})</button>` : ''}
          <button class="res-filter-btn" style="margin-left:auto;" onclick="expandAllResults()">Expand all</button>
        </div>
        <div class="res-list" id="res-list">${qBlocks}</div>
      </div>

      <!-- FLAGGED TAB -->
      ${flaggedCount ? `
      <div class="res-panel" id="rp-flagged">
        <div class="res-list">${S.queue.map((q,i) => {
          if(!S.flags[i]) return '';
          const ans = S.answers[i]; const isOk = ans === q.ans;
          const note = S.annotations[qbIdx(q)];
          const optRows = q.opts.map((o,oi) => {
            const isC = oi === q.ans; const isA = oi === ans && ans !== -1;
            return `<div class="res-opt ${isC?'rk':isA&&!isOk?'rw':''}"><span class="res-opt-ltr">${LTR[oi]}</span><span>${o}</span></div>`;
          }).join('');
          return `<div class="res-q ${isOk?'ok':ans===-1?'skip':'bad'}">
            <div class="res-q-hdr" onclick="toggleResQ(this)">
              <span class="res-q-badge ${isOk?'ok':'bad'}">${ans===-1?'— Skipped':isOk?'✓ Correct':'✗ Incorrect'}</span>
              <span class="res-q-topic">${q.topic}</span>
              <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--red);">⚑</span>
              <span class="res-q-toggle">›</span>
            </div>
            <div class="res-q-body">
              <div class="res-vig">${q.vig}</div>
              <div class="res-stem">${q.stem}</div>
              <div class="res-opts">${optRows}</div>
              <div class="res-exp-wrap">
                <div class="res-exp-lo-label">Learning objective</div>
                <div class="res-exp-lo-text">${q.lo}</div>
              </div>
              ${note ? `<div class="res-note"><span class="res-note-label">Your note</span><span class="res-note-text">${note}</span></div>` : ''}
            </div>
          </div>`;
        }).join('')}</div>
      </div>` : ''}

      <!-- MISSED TAB -->
      ${incorrectCount ? `
      <div class="res-panel" id="rp-missed">
        <div class="res-list">${S.queue.map((q,i) => {
          const ans = S.answers[i];
          if(ans === -1 || ans === q.ans) return '';
          const note = S.annotations[qbIdx(q)];
          const optRows = q.opts.map((o,oi) => {
            const isC = oi === q.ans; const isA = oi === ans;
            return `<div class="res-opt ${isC?'rk':isA?'rw':''}"><span class="res-opt-ltr">${LTR[oi]}</span><span>${o}</span></div>`;
          }).join('');
          return `<div class="res-q bad">
            <div class="res-q-hdr" onclick="toggleResQ(this)">
              <span class="res-q-badge bad">✗ Incorrect</span>
              <span class="res-q-topic">${q.topic}</span>
              <span class="res-q-toggle">›</span>
            </div>
            <div class="res-q-body">
              <div class="res-vig">${q.vig}</div>
              <div class="res-stem">${q.stem}</div>
              <div class="res-opts">${optRows}</div>
              <div class="res-exp-wrap">
                <div class="res-exp-lo-label">Learning objective</div>
                <div class="res-exp-lo-text">${q.lo}</div>
              </div>
              ${note ? `<div class="res-note"><span class="res-note-label">Your note</span><span class="res-note-text">${note}</span></div>` : ''}
            </div>
          </div>`;
        }).join('')}</div>
      </div>` : ''}

      <!-- NOTES TAB -->
      ${Object.keys(S.annotations).length ? `
      <div class="res-panel" id="rp-notes">
        <div class="res-list">${S.queue.map((q,i) => {
          const idx = qbIdx(q);
          const note = S.annotations[idx];
          if(!note) return '';
          return `<div class="res-q ok" style="border-left-color:var(--green)">
            <div class="res-q-hdr" onclick="toggleResQ(this)">
              <span class="res-q-badge ok">✎ Note</span>
              <span class="res-q-topic">${q.topic}</span>
              <span class="res-q-toggle">›</span>
            </div>
            <div class="res-q-body">
              <div class="res-stem">${q.stem}</div>
              <div class="res-note" style="margin:0;border:none;">
                <span class="res-note-label">Your note</span>
                <span class="res-note-text">${note.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>
              </div>
            </div>
          </div>`;
        }).join('')}</div>
      </div>` : ''}

      <div style="margin-top:52px;">
        <div class="res-actions">
          <button class="ra-retry" onclick="retrySession()">↺ &nbsp;Retry same questions</button>
          <button class="ra-new" onclick="show('screen-launcher');updateSummary()">New session →</button>
        </div>
      </div>
    </div>
  `;

  show('screen-results');
}

// ─── RESULTS UI HELPERS ───────────────────────────────────────
function switchResTab(name, btn) {
  document.querySelectorAll('.res-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const panels = {
    breakdown: 'rp-breakdown', time: 'rp-time', all: 'rp-all',
    flagged: 'rp-flagged', missed: 'rp-missed', notes: 'rp-notes'
  };
  document.querySelectorAll('.res-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(panels[name]);
  if(target) target.classList.add('active');
}

function toggleResQ(hdr) {
  hdr.closest('.res-q').classList.toggle('expanded');
}

function expandAllResults() {
  document.querySelectorAll('#res-list .res-q').forEach(c => c.classList.add('expanded'));
}

function filterResults(type, btn) {
  document.querySelectorAll('.res-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#res-list .res-q').forEach(card => {
    const ok      = card.dataset.ok === '1';
    const skipped = card.dataset.skipped === '1';
    const flagged = card.dataset.flagged === '1';
    let show = true;
    if(type==='incorrect') show = !ok && !skipped;
    else if(type==='flagged') show = flagged;
    else if(type==='skipped') show = skipped;
    card.style.display = show ? '' : 'none';
  });
}

function retrySession() {
  S.ci=0; S.answers=Array(S.queue.length).fill(null);
  S.skipped=Array(S.queue.length).fill(false);
  S.flags=Array(S.queue.length).fill(false);
  S.startTimes=Array(S.queue.length).fill(null);
  S.timeSpent=Array(S.queue.length).fill(0);
  S.sel=null; S.confirmed=false;
  saveSession();
  show('screen-session'); buildSidebar(); renderQ();
}

// ─── NOTE LINKS — map topic to relevant note ──────────────────
function getNoteLink(topic) {
  const map = {
    'PPH': '/obgyn/',
    'Postpartum Haemorrhage': '/obgyn/',
    'Preeclampsia': '/obgyn/',
    'Ectopic Pregnancy': '/obgyn/',
    'Antepartum Haemorrhage': '/obgyn/',
    'Pre-eclampsia': '/obgyn/',
    'Diabetic Retinopathy': '/ophtho/',
    'Retinal Detachment': '/ophtho/',
    'Glaucoma': '/ophtho/',
    'Cataract': '/ophtho/',
    'Uveitis': '/ophtho/',
    'Cornea': '/ophtho/',
    'Neuro-ophthalmology': '/ophtho/',
    'Thyroid Eye Disease': '/ophtho/',
  };
  return map[topic] || null;
}

// ─── FOCUS MODE ───────────────────────────────────────────────
function launchFocusSession() {
  try {
    const w = JSON.parse(localStorage.getItem('vent_weak_topics') || '{}');
    if(!w.topics?.length) { launch(); return; }
    clampCount();
    const count = Math.max(5, parseInt(document.getElementById('count-input').value) || 10);
    let pool = QB.filter(q => w.topics.includes(q.topic));
    if(pool.length < 5) pool = QB;
    S.sys = w.sys || 'all';
    S.queue = shuffle(pool).slice(0, Math.min(count, pool.length));
    S.ci = 0;
    S.answers    = Array(S.queue.length).fill(null);
    S.skipped    = Array(S.queue.length).fill(false);
    S.flags      = Array(S.queue.length).fill(false);
    S.startTimes = Array(S.queue.length).fill(null);
    S.timeSpent  = Array(S.queue.length).fill(0);
    S.sel = null; S.confirmed = false;
    saveSession();
    loadUserData();
    show('screen-session'); buildSidebar(); renderQ();
  } catch(e) { launch(); }
}

function dismissFocusBanner() {
  try { localStorage.removeItem('vent_weak_topics'); } catch(e) {}
  const b = document.getElementById('focus-banner');
  if(b) b.style.display = 'none';
}

// ─── RESUME BANNER ────────────────────────────────────────────
(function checkResume() {
  try {
    const raw = localStorage.getItem('vent_qbank_session');
    if(!raw) return;
    const d = JSON.parse(raw);
    if(!d.queue?.length) return;
    const answered = (d.answers||[]).filter(a=>a!==null).length;
    if(answered === 0) return;
    const banner = document.createElement('div');
    banner.id = 'resume-banner';
    banner.style.cssText = 'background:var(--ink);color:var(--bg);padding:14px 24px;display:flex;align-items:center;gap:16px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.5px;border-bottom:1px solid rgba(255,255,255,.1);';
    banner.innerHTML = `
      <span style="color:var(--red);">●</span>
      <span>Session in progress — Q${d.ci+1} of ${d.queue.length} · ${answered} answered</span>
      <button onclick="resumeSession()" style="margin-left:auto;background:var(--red);color:white;border:none;padding:7px 18px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">Resume →</button>
      <button onclick="this.parentElement.remove();clearSession();" style="background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.4);padding:7px 12px;font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;">Discard</button>
    `;
    const launcher = document.getElementById('screen-launcher');
    if(launcher) launcher.insertBefore(banner, launcher.firstChild);
  } catch(e) {}
})();

function resumeSession() {
  if(loadSession()) {
    const banner = document.getElementById('resume-banner');
    if(banner) banner.remove();
    loadUserData();
    show('screen-session'); buildSidebar(); renderQ();
  }
}

// ─── INIT ─────────────────────────────────────────────────────
updateSummary();
