/* ═══════════════════════════════════════════════════════════
   VENT — Shared JavaScript
   Clean rebuild. No dead code. No duplicates.
   Requires: NOTES{}, NOTES_MCQ{}, NOTE_ORDER[], NOTE_NAMES{}
   defined per-page before this script loads.
═══════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════
   REVEAL ANIMATION
══════════════════════════════════════════════════════════ */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ══════════════════════════════════════════════════════════
   DISCIPLINE FILTER TABS (OB/GYN only, safe if absent)
══════════════════════════════════════════════════════════ */
document.querySelectorAll('.dtab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dtab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const filter = btn.dataset.filter;
    document.querySelectorAll('#notes-grid .nc').forEach(card => {
      card.classList.toggle('hidden', filter !== 'all' && card.dataset.disc !== filter);
    });
  });
});


/* ══════════════════════════════════════════════════════════
   HIGHLIGHT SYSTEM
══════════════════════════════════════════════════════════ */
let hlHistory = {};
let _savedRange = null;
let _popupVisible = false;

function showHlPopup(rect) {
  const popup = document.getElementById('hl-popup');
  if (!popup) return;
  const popW = 210;
  let x = rect.left + rect.width / 2 - popW / 2;
  let y = rect.top - 54;
  x = Math.max(8, Math.min(x, window.innerWidth - popW - 8));
  if (y < 8) y = rect.bottom + 8;
  popup.style.left = x + 'px';
  popup.style.top  = y + 'px';
  popup.classList.add('show');
  _popupVisible = true;
}

function hideHlPopup() {
  const popup = document.getElementById('hl-popup');
  if (popup) popup.classList.remove('show');
  _popupVisible = false;
}

function applyHlColor(color) {
  if (!_savedRange) { hideHlPopup(); return; }
  const container = document.getElementById('mcontent');
  if (!container) { hideHlPopup(); return; }
  if (!hlHistory[currentNote]) hlHistory[currentNote] = [];
  hlHistory[currentNote].push(container.innerHTML);
  const range = _savedRange;
  const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const toWrap = [];
  let node;
  while ((node = walk.nextNode())) {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) >= 0) continue;
    if (range.compareBoundaryPoints(Range.START_TO_END, nodeRange) <= 0) continue;
    const start = (node === range.startContainer) ? range.startOffset : 0;
    const end   = (node === range.endContainer)   ? range.endOffset   : node.length;
    if (start >= end) continue;
    toWrap.push({ node, start, end });
  }
  toWrap.forEach(({ node, start, end }) => {
    try {
      if (end < node.length) node.splitText(end);
      const targetNode = (start > 0) ? node.splitText(start) : node;
      const mark = document.createElement('mark');
      mark.className = 'vent-hl';
      mark.dataset.color = color;
      mark.addEventListener('click', function(e){ e.stopPropagation(); removeHighlight(this); });
      targetNode.parentNode.insertBefore(mark, targetNode);
      mark.appendChild(targetNode);
    } catch(e) {}
  });
  window.getSelection().removeAllRanges();
  _savedRange = null;
  hideHlPopup();
  saveHighlights();
}

function removeHighlight(markEl) {
  if (!hlHistory[currentNote]) hlHistory[currentNote] = [];
  hlHistory[currentNote].push(document.getElementById('mcontent').innerHTML);
  const p = markEl.parentNode;
  while (markEl.firstChild) p.insertBefore(markEl.firstChild, markEl);
  p.removeChild(markEl);
  saveHighlights();
}

function undoHighlight() {
  if (!hlHistory[currentNote] || !hlHistory[currentNote].length) return;
  document.getElementById('mcontent').innerHTML = hlHistory[currentNote].pop();
  reAttachMarkHandlers();
  saveHighlights();
  hideHlPopup();
}

function clearAllHighlights() {
  const c = document.getElementById('mcontent');
  if (!c) return;
  if (!hlHistory[currentNote]) hlHistory[currentNote] = [];
  hlHistory[currentNote].push(c.innerHTML);
  c.querySelectorAll('mark.vent-hl').forEach(m => {
    const p = m.parentNode;
    while (m.firstChild) p.insertBefore(m.firstChild, m);
    p.removeChild(m);
  });
  saveHighlights();
  hideHlPopup();
}

function reAttachMarkHandlers() {
  document.querySelectorAll('#mcontent mark.vent-hl').forEach(m => {
    m.addEventListener('click', function(e){ e.stopPropagation(); removeHighlight(this); });
  });
}

function saveHighlights() {
  try {
    const c = document.getElementById('mcontent');
    if (!c) return;
    const marks = {};
    c.querySelectorAll('mark.vent-hl').forEach(m => {
      marks[m.dataset.color] = marks[m.dataset.color] || [];
      marks[m.dataset.color].push(m.textContent);
    });
    localStorage.setItem('vent-hl-v2-' + currentNote, JSON.stringify(marks));
  } catch(e) {}
}

function loadHighlights(noteId) {
  try {
    const raw = localStorage.getItem('vent-hl-v2-' + noteId);
    if (!raw) return;
    // We store the full innerHTML snapshot for easy restore
    const snapKey = 'vent-hl-snap-' + noteId;
    const snap = localStorage.getItem(snapKey);
    if (snap) {
      const c = document.getElementById('mcontent');
      if (c) { c.innerHTML = snap; reAttachMarkHandlers(); }
    }
  } catch(e) {}
}

// Selection → popup
document.addEventListener('mouseup', e => {
  const container = document.getElementById('mcontent');
  if (!container) return;
  const popup = document.getElementById('hl-popup');
  if (popup && popup.contains(e.target)) return;
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hideHlPopup(); return; }
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) { hideHlPopup(); return; }
    if (sel.toString().trim().length < 2) { hideHlPopup(); return; }
    _savedRange = range.cloneRange();
    showHlPopup(range.getBoundingClientRect());
  }, 10);
});
document.addEventListener('mousedown', e => {
  const popup = document.getElementById('hl-popup');
  if (popup && !popup.contains(e.target)) hideHlPopup();
});


/* ══════════════════════════════════════════════════════════
   FONT SIZE
══════════════════════════════════════════════════════════ */
let _fontSize = 16;
const FONT_MIN = 13, FONT_MAX = 22;

function applyFontSize() {
  const modal = document.querySelector('.note-modal');
  if (modal) modal.style.fontSize = _fontSize + 'px';
  const disp = document.getElementById('font-size-val');
  if (disp) disp.textContent = _fontSize + 'px';
}

function changeFontSize(dir) {
  _fontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, _fontSize + dir));
  applyFontSize();
  try { localStorage.setItem('vent-fontsize', _fontSize); } catch(e) {}
}

function loadFontSize() {
  try {
    const saved = parseInt(localStorage.getItem('vent-fontsize'));
    if (saved && saved >= FONT_MIN && saved <= FONT_MAX) _fontSize = saved;
  } catch(e) {}
  applyFontSize();
}


/* ══════════════════════════════════════════════════════════
   NOTE NAVIGATION (modal bar prev/next)
══════════════════════════════════════════════════════════ */
function updateNavLabel() {
  const el = document.getElementById('mnav-label');
  if (!el || !currentNote) return;
  const idx = NOTE_ORDER.indexOf(currentNote);
  el.textContent = (idx + 1) + ' / ' + NOTE_ORDER.length;
}

function prevNote() {
  const idx = NOTE_ORDER.indexOf(currentNote);
  if (idx > 0) openNote(NOTE_ORDER[idx - 1]);
}

function nextNote() {
  const idx = NOTE_ORDER.indexOf(currentNote);
  if (idx < NOTE_ORDER.length - 1) openNote(NOTE_ORDER[idx + 1]);
}

function showNoteNav() {
  const n = document.getElementById('mbar-note-nav');
  if (n) n.classList.add('visible');
}

function hideNoteNav() {
  const n = document.getElementById('mbar-note-nav');
  if (n) n.classList.remove('visible');
}


/* ══════════════════════════════════════════════════════════
   BREATHE MODE — PREFS
══════════════════════════════════════════════════════════ */
const PREFS = { inhale: 4, hold: 2, exhale: 6, cycles: 1 };
const BCIRC = 2 * Math.PI * 34; // circumference for r=34

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem('vent-breathe-prefs') || '{}');
    if (p.inhale) PREFS.inhale = p.inhale;
    if (p.hold   !== undefined) PREFS.hold   = p.hold;
    if (p.exhale) PREFS.exhale = p.exhale;
    if (p.cycles) PREFS.cycles = p.cycles;
  } catch(e) {}
}

function syncPrefsDisplay() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('pref-inhale', PREFS.inhale + 's');
  set('pref-hold',   PREFS.hold + 's');
  set('pref-exhale', PREFS.exhale + 's');
  set('pref-cycles', PREFS.cycles);
}

function prefAdj(key, delta) {
  const min = { inhale:1, hold:0, exhale:1, cycles:1 };
  const max = { inhale:10, hold:8, exhale:12, cycles:4 };
  PREFS[key] = Math.max(min[key], Math.min(max[key], PREFS[key] + delta));
  syncPrefsDisplay();
  savePrefs();
}

function savePrefs() {
  try { localStorage.setItem('vent-breathe-prefs', JSON.stringify(PREFS)); } catch(e) {}
}

function openPrefs() {
  syncPrefsDisplay();
  const o = document.getElementById('prefs-overlay');
  if (o) o.classList.add('on');
}

function closePrefs() {
  const o = document.getElementById('prefs-overlay');
  if (o) o.classList.remove('on');
}


/* ══════════════════════════════════════════════════════════
   VENTILATION LOG — STORAGE
══════════════════════════════════════════════════════════ */
function bLoadHistory()  { try { return JSON.parse(localStorage.getItem('vent-breathe-history') || '[]'); } catch(e) { return []; } }
function bSaveHistory(a) { try { localStorage.setItem('vent-breathe-history', JSON.stringify(a)); } catch(e) {} }
function bAddSession(s)  { const a = bLoadHistory(); a.unshift(s); if (a.length > 120) a.pop(); bSaveHistory(a); }
function bGetTodaySessions() { const t = new Date().toDateString(); return bLoadHistory().filter(s => new Date(s.date).toDateString() === t); }

function bFmtDur(s)   { if (s < 60) return s + 's'; const m = Math.floor(s/60), r = s % 60; return r ? m + 'm ' + r + 's' : m + 'm'; }
function bFmtTotal(s) { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h > 0 ? h + 'h ' + m + 'm' : (m || 0) + ' min'; }
function bTimeAgo(d)  { const diff = Date.now() - new Date(d).getTime(), mi = Math.floor(diff/60000), h = Math.floor(mi/60), dy = Math.floor(h/24); if (dy > 0) return dy === 1 ? 'Yesterday' : dy + 'd ago'; if (h > 0) return h + 'h ago'; if (mi > 0) return mi + 'm ago'; return 'Just now'; }

/* ── Missed questions ── */
function vlLoadMissed()   { try { return JSON.parse(localStorage.getItem('vent-missed-q') || '[]'); } catch(e) { return []; } }
function vlSaveMissed(a)  { try { localStorage.setItem('vent-missed-q', JSON.stringify(a.slice(0, 80))); } catch(e) {} }

function vlAddMissed(noteId, noteName, questions) {
  const arr = vlLoadMissed();
  const now = new Date().toISOString();
  questions.forEach(item => {
    if (!arr.some(x => x.q === item.q && x.noteId === noteId)) {
      arr.unshift({ id: Date.now() + Math.random(), noteId, noteName, q: item.q, a: item.a, exp: item.exp || '', date: now });
    }
  });
  vlSaveMissed(arr);
}

function vlDismissMissed(id) {
  vlSaveMissed(vlLoadMissed().filter(m => m.id !== id));
  vlRenderMissed();
  vlUpdateBadge();
}

function vlClearMissed() {
  vlSaveMissed([]);
  vlRenderMissed();
  vlUpdateBadge();
}

function vlUpdateBadge() {
  const el = document.getElementById('vl-missed-count');
  if (el) el.textContent = vlLoadMissed().length;
}

/* ── Log panel rendering ── */
function bOpenHistory()  { vlRender(); const o = document.getElementById('vl-overlay'); if (o) o.classList.add('open'); }
function bCloseHistory(e) { if (e && e.target !== document.getElementById('vl-overlay')) return; const o = document.getElementById('vl-overlay'); if (o) o.classList.remove('open'); }

function vlSwitchTab(tab) {
  document.querySelectorAll('.vl-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
  document.querySelectorAll('.vl-pane').forEach(p => p.classList.toggle('on', p.id === 'vl-pane-' + tab));
}

function vlRenderStrength() {
  const el = document.getElementById('vl-pane-strength');
  if (!el) return;
  const scores = {};
  try { Object.assign(scores, JSON.parse(localStorage.getItem('vent-topic-scores') || '{}')); } catch(e) {}
  const entries = Object.values(scores);
  if (!entries.length) { el.innerHTML = `<div class="vl-strength-empty">Complete some MCQs<br>to see your strength map.</div>`; return; }
  const sorted = entries.sort((a,b) => { const pa = a.got/(a.got+a.missed||1); const pb = b.got/(b.got+b.missed||1); return pa-pb; });
  const renderRow = e => {
    const pct = Math.round(e.got / (e.got + e.missed || 1) * 100);
    const cls = pct >= 75 ? 'strong' : pct >= 50 ? 'mid' : 'weak';
    return `<div class="vl-topic-row"><div class="vl-topic-name">${e.noteName||e.noteId}</div><div class="vl-topic-bar-wrap"><div class="vl-topic-bar ${cls}" style="width:${pct}%"></div></div><div class="vl-topic-pct ${cls}">${pct}%</div></div>`;
  };
  const renderTier = (arr, label, cls) => arr.length ? `<div class="vl-strength-title">${label}</div>${arr.map(renderRow).join('')}` : '';
  const weak   = sorted.filter(e => { const p = e.got/(e.got+e.missed||1); return p < .5; });
  const mid    = sorted.filter(e => { const p = e.got/(e.got+e.missed||1); return p >= .5 && p < .75; });
  const strong = sorted.filter(e => { const p = e.got/(e.got+e.missed||1); return p >= .75; });
  el.innerHTML = renderTier(weak,'Needs work','weak') + renderTier(mid,'Getting there','mid') + renderTier(strong,'Solid recall','strong');
}

function vlRenderHeatmap(sessions) {
  const heatEl  = document.getElementById('vl-heatmap');
  const monthEl = document.getElementById('vl-hm-months');
  if (!heatEl || !monthEl) return;
  const WEEKS = 12;
  const today = new Date(); today.setHours(23,59,59,999);
  const countMap = {};
  sessions.forEach(s => {
    if (!s.date) return;
    const d = new Date(s.date);
    const key = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
    countMap[key] = (countMap[key] || 0) + 1;
  });
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS*7 - 1));
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const cols = [];
  const monthPositions = {};
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w*7 + d);
      const key = date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
      const count = countMap[key] || 0;
      const isToday  = date.toDateString() === new Date().toDateString();
      const isFuture = date > today;
      col.push({ count, isToday, isFuture });
      if ((date.getDate() === 1 || (w===0&&d===0)) && !Object.values(monthPositions).includes(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()])) {
        monthPositions[w] = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()];
      }
    }
    cols.push(col);
  }
  monthEl.innerHTML = cols.map((col,w) => `<div class="vl-hm-month-lbl" style="width:14px">${monthPositions[w]||''}</div>`).join('');
  heatEl.innerHTML  = cols.map(col => {
    const cells = col.map(({ count, isToday, isFuture }) => {
      if (isFuture) return `<div class="vl-hm-cell" style="opacity:.3"></div>`;
      const lvl = count===0?'':count===1?'l1':count===2?'l2':count===3?'l3':'l4';
      return `<div class="vl-hm-cell ${lvl}${isToday?' today':''}"></div>`;
    }).join('');
    return `<div class="vl-hm-col">${cells}</div>`;
  }).join('');
}

function vlRender() {
  const sessions   = bLoadHistory();
  const todaySess  = bGetTodaySessions();
  const totalSec   = sessions.reduce((a,s) => a + (s.duration||0), 0);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('vl-stat-time',  bFmtTotal(totalSec));
  set('vl-stat-today', todaySess.length);
  set('vl-stat-total', sessions.length);
  vlRenderHeatmap(sessions);
  let streak = 0, checkStreak = true;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const has = sessions.some(s => new Date(s.date).toDateString() === d.toDateString());
    if (i===0&&!has) { checkStreak = false; }
    if (checkStreak) { if (has) streak++; else break; }
  }
  set('vl-streak-lbl', streak >= 2 ? streak + ' day streak 🔥' : todaySess.length > 0 ? 'Active today' : 'Start your streak');
  const _vb = document.getElementById('vl-burnout');
  if (_vb) _vb.classList.toggle('show', todaySess.length >= 3);
  set('vl-today-count',  todaySess.length);
  set('vl-missed-count', vlLoadMissed().length);
  vlRenderToday(todaySess);
  vlRenderMissed();
  vlRenderStrength();
  vlRenderAll(sessions);
  vlUpdateBadge();
}

function vlRenderToday(todaySess) {
  const el = document.getElementById('vl-pane-today');
  if (!el) return;
  if (!todaySess.length) {
    el.innerHTML = `<div class="vl-empty"><div class="vl-empty-icon">🌬</div><div class="vl-empty-text">Nothing breathed today yet.<br>Open a note and start.</div></div>`;
    return;
  }
  const checkSvg = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5l2.5 2.5 3.5-4" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  el.innerHTML = todaySess.map(s => `<div class="vl-today-note"><div class="vl-tn-check">${checkSvg}</div><div class="vl-tn-body"><div class="vl-tn-name">${s.topic||'Unknown'}</div><div class="vl-tn-meta">${bFmtDur(s.duration||0)} &nbsp;·&nbsp; ${s.sections||0} sections</div></div><div class="vl-tn-time">${bTimeAgo(s.date)}</div></div>`).join('');
}

function vlRenderMissed() {
  const el = document.getElementById('vl-pane-missed');
  if (!el) return;
  const missed = vlLoadMissed();
  if (!missed.length) {
    el.innerHTML = `<div class="vl-empty"><div class="vl-empty-icon">✓</div><div class="vl-empty-text">No missed questions.<br>Looking strong.</div></div>`;
    return;
  }
  el.innerHTML = missed.map(m => `<div class="vl-mq-card" id="vl-mq-${m.id}"><div class="vl-mq-note">${m.noteName||m.noteId}</div><div class="vl-mq-q">${m.q}</div><div class="vl-mq-ans" id="vl-mqans-${m.id}"><div class="vl-mq-ans-lbl">Answer</div><div class="vl-mq-ans-text">${m.a}</div>${m.exp?`<div class="vl-mq-ans-exp">${m.exp}</div>`:''}</div><div class="vl-mq-actions"><button class="vl-mq-reveal" id="vl-mqbtn-${m.id}" onclick="vlRevealMQ('${m.id}')">Reveal answer</button><button class="vl-mq-dismiss" onclick="vlDismissMissed(${m.id})">Got it ×</button></div></div>`).join('')
    + `<button class="vl-mq-clear-all" onclick="vlClearMissed()">Clear all missed questions</button>`;
}

function vlRevealMQ(id) {
  const ans = document.getElementById('vl-mqans-' + id);
  const btn = document.getElementById('vl-mqbtn-' + id);
  if (ans) ans.classList.add('open');
  if (btn) btn.style.display = 'none';
}

function vlRenderAll(sessions) {
  const el = document.getElementById('vl-pane-all');
  if (!el) return;
  if (!sessions.length) {
    el.innerHTML = `<div class="vl-empty"><div class="vl-empty-icon">🌬</div><div class="vl-empty-text">No sessions yet.<br>Start breathing.</div></div>`;
    return;
  }
  const waveSvg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 11 C2 11 3 8 5 8 C6.5 8 6.5 9.5 8 9.5 C9.5 9.5 9.5 8 11 8 C13 8 14 11 14 11" stroke="rgba(200,69,42,.7)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  el.innerHTML = sessions.map(s => `<div class="vl-sess-item"><div class="vl-sess-icon">${waveSvg}</div><div class="vl-sess-body"><div class="vl-sess-topic">${s.topic||'Unknown'}</div><div class="vl-sess-meta">${bFmtDur(s.duration||0)} &nbsp;·&nbsp; ${s.sections||0} sections</div></div><div class="vl-sess-when">${bTimeAgo(s.date)}</div></div>`).join('');
}

function bClearHistory() {
  if (!confirm('Clear all ventilation data?')) return;
  localStorage.removeItem('vent-breathe-history');
  localStorage.removeItem('vent-missed-q');
  vlUpdateBadge();
  vlRender();
}


/* ══════════════════════════════════════════════════════════
   BREATHE MODE — STATE
══════════════════════════════════════════════════════════ */
let breatheOn = false;
let bStart = null, bPaused = false;
let bCurIdx = 0, bCyclesDone = 0;
let bPhase = 'inhale';
let bPhTimer = null, bRafId = null;
let bSections = [], bTotal = 0;
let bAtLast = false, bNextShown = false, bSessionSections = 0;
let bScrollUnlocked = false, bScrollProgress = 0;
let bScrollHandler = null;

function bPhaseDur(p) {
  if (p === 'inhale') return PREFS.inhale * 1000;
  if (p === 'hold')   return PREFS.hold   * 1000;
  return PREFS.exhale * 1000;
}

/* ── Scroll unlock ── */
function bReadKey(noteId)   { return 'vent-read-v1-' + noteId; }
function bCheckReadMemory(noteId)  { try { return !!localStorage.getItem(bReadKey(noteId)); } catch(e) { return false; } }
function bMarkNoteRead(noteId)     { try { localStorage.setItem(bReadKey(noteId), '1'); } catch(e) {} }

function bAttachScrollTracker() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  if (bScrollHandler) modal.removeEventListener('scroll', bScrollHandler);
  bScrollHandler = function() {
    if (bScrollUnlocked) return;
    const scrolled = modal.scrollTop;
    const total    = modal.scrollHeight - modal.clientHeight;
    if (total <= 0) return;
    const pct = Math.min(scrolled / total, 1);
    bScrollProgress = pct;
    bUpdateScrollLock(pct);
    if (pct >= 0.92) {
      bScrollUnlocked = true;
      bMarkNoteRead(currentNote);
      bUnlockBreathe();
    }
  };
  modal.addEventListener('scroll', bScrollHandler, { passive: true });
}

function bUpdateScrollLock(pct) {
  const btn  = document.getElementById('btn-breathe');
  const fill = document.getElementById('breathe-btn-fill');
  const lbl  = document.getElementById('breathe-btn-label');
  if (!btn || bScrollUnlocked || breatheOn) return;
  if (fill) fill.style.width = (pct * 100) + '%';
  if (pct > 0.04) {
    btn.classList.add('b-unlocking');
    btn.classList.remove('b-locked');
    if (lbl && lbl.textContent !== 'Keep reading…') lbl.textContent = 'Keep reading…';
  }
}

function bUnlockBreathe(silent) {
  const btn  = document.getElementById('btn-breathe');
  const fill = document.getElementById('breathe-btn-fill');
  const lbl  = document.getElementById('breathe-btn-label');
  if (!btn) return;
  btn.classList.remove('b-locked', 'b-unlocking');
  btn.style.pointerEvents = '';
  if (fill) { fill.style.width = '100%'; setTimeout(() => { fill.style.transition = 'width .5s ease'; fill.style.width = '0%'; }, 350); }
  if (lbl) lbl.textContent = 'Breathe';
  if (!silent) {
    btn.classList.add('b-just-unlocked', 'b-ready');
    setTimeout(() => btn.classList.remove('b-just-unlocked'), 750);
  } else {
    btn.classList.add('b-ready');
  }
}

function toggleBreathe() {
  if (!bScrollUnlocked && !breatheOn) return;
  if (!breatheOn) { vsResetSession(); bStart_(); }
  else bStop(true);
}

function bStart_() {
  const heroEl  = document.querySelector('#mcontent .n-hero-new');
  const sectEls = Array.from(document.querySelectorAll('#mcontent .n-section'));
  bSections = heroEl ? [heroEl, ...sectEls] : sectEls;
  bTotal = bSections.length;
  if (!bTotal) return;

  breatheOn = true; bStart = Date.now(); bPaused = false;
  bCurIdx = 0; bCyclesDone = 0; bAtLast = false; bNextShown = false; bSessionSections = 0;

  document.getElementById('modal').classList.add('focus-mode', 'breathe-active');
  const btn = document.getElementById('btn-breathe');
  if (btn) { btn.classList.add('breathe-on'); btn.classList.remove('b-ready'); }
  const lbl = document.getElementById('breathe-btn-label');
  if (lbl) lbl.textContent = 'Breathing';
  const ring = document.getElementById('b-ring-wrap');
  if (ring) ring.classList.add('visible');
  const rbar = document.getElementById('b-reading-bar');
  if (rbar) rbar.style.display = 'block';
  const nav = document.getElementById('b-nav');
  if (nav) nav.classList.add('visible');
  const spine = document.getElementById('b-spine');
  if (spine) { spine.classList.add('visible'); spine.innerHTML = ''; bSections.forEach((_,i) => { const d = document.createElement('div'); d.className = 'b-sdot'; d.onclick = () => { if (breatheOn) bJumpTo(i); }; spine.appendChild(d); }); }
  showNoteNav(); updateNavLabel();
  bActivate(0); bStartPhase('inhale');

  const hint = document.getElementById('b-kbd-hint');
  if (hint) { hint.classList.add('visible'); setTimeout(() => hint.classList.remove('visible'), 4000); }
}

function bStop(showSummary = false) {
  const elapsed = bStart ? Math.round((Date.now() - bStart) / 1000) : 0;
  breatheOn = false;
  clearTimeout(bPhTimer); cancelAnimationFrame(bRafId);

  document.getElementById('modal').classList.remove('breathe-active', 'b-at-last');
  setTimeout(() => document.getElementById('modal').classList.remove('focus-mode'), 400);

  const btn = document.getElementById('btn-breathe');
  if (btn) { btn.classList.remove('breathe-on'); }
  const lbl = document.getElementById('breathe-btn-label');
  if (lbl) lbl.textContent = 'Breathe';
  if (bScrollUnlocked && btn) btn.classList.add('b-ready');

  const ring = document.getElementById('b-ring-wrap');
  if (ring) ring.classList.remove('visible');
  const rbar = document.getElementById('b-reading-bar');
  const rfill = document.getElementById('b-reading-fill');
  if (rbar)  rbar.style.display = 'none';
  if (rfill) rfill.style.width  = '0%';
  const nav = document.getElementById('b-nav');
  if (nav) nav.classList.remove('visible');
  const spine = document.getElementById('b-spine');
  if (spine) spine.classList.remove('visible');
  const nextBar = document.getElementById('b-next-bar');
  if (nextBar) nextBar.classList.remove('visible');
  const hint = document.getElementById('b-kbd-hint');
  if (hint) hint.classList.remove('visible');
  hideNoteNav();

  bSections.forEach(s => s.classList.remove('b-active', 'b-was', 'b-hold'));
  bAtLast = false; bNextShown = false;
  document.getElementById('modal').classList.remove('b-at-last');

  const _bStart = bStart;
  bStart = null;
  if (_bStart && elapsed > 0) {
    const noteName = NOTE_NAMES[currentNote] || currentNote;
    const sess = { id: Date.now(), noteId: currentNote, topic: noteName, duration: elapsed, sections: bSessionSections, date: new Date().toISOString() };
    bAddSession(sess);
    if (showSummary) setTimeout(() => bShowSummary(sess), 600);
  }
}

/* ── Section activation ── */
function bActivate(idx) {
  if (idx < 0 || idx >= bSections.length) return;
  bSections.forEach((s,i) => { s.classList.remove('b-active','b-was','b-hold'); if (i < idx) s.classList.add('b-was'); });
  bSections[idx].classList.add('b-active');
  const modal = document.getElementById('modal');
  if (modal) {
    const mbar    = modal.querySelector('.mbar');
    const mbarH   = mbar ? mbar.offsetHeight : 58;
    const el      = bSections[idx];
    const elH     = el.offsetHeight;
    const availH  = modal.clientHeight - mbarH;
    const margin  = 32;
    const elTopInModal = el.getBoundingClientRect().top - modal.getBoundingClientRect().top - mbarH;
    let scrollTop;
    if (elH <= availH - margin*2) {
      scrollTop = modal.scrollTop + elTopInModal - Math.floor((availH - elH) / 2);
    } else {
      scrollTop = modal.scrollTop + elTopInModal - margin;
    }
    modal.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
    modal.classList.toggle('b-at-last', idx === bTotal - 1);
  }
  document.querySelectorAll('#b-spine .b-sdot').forEach((d,i) => {
    d.className = 'b-sdot' + (i < idx ? ' b-done' : i === idx ? ' b-active' : '');
  });
  const fill = document.getElementById('b-reading-fill');
  if (fill) fill.style.width = (bTotal > 1 ? (idx/(bTotal-1))*100 : 100) + '%';
  bCyclesDone = 0;
  bSessionSections = Math.max(bSessionSections, idx + 1);
  bAtLast = (idx === bTotal - 1);
}

function bJumpTo(idx) { clearTimeout(bPhTimer); cancelAnimationFrame(bRafId); bCurIdx = idx; bActivate(idx); bStartPhase('inhale'); }
function bSkipFwd()   { if (!breatheOn||bPaused) return; clearTimeout(bPhTimer); cancelAnimationFrame(bRafId); bSections[bCurIdx]?.classList.remove('b-hold'); bAdvance(); }
function bSkipBack()  { if (!breatheOn||bPaused) return; clearTimeout(bPhTimer); cancelAnimationFrame(bRafId); bSections[bCurIdx]?.classList.remove('b-hold'); bCurIdx = Math.max(0, bCurIdx-1); bActivate(bCurIdx); bStartPhase('inhale'); }

function bAdvance() {
  if (bCurIdx + 1 >= bTotal) { bOnLast(); return; }
  bCurIdx++;
  bActivate(bCurIdx);
  bStartPhase('inhale');
}

function bOnLast() {
  bAtLast = true; bCyclesDone = 0; bStartPhase('inhale');
  const bar = document.getElementById('b-next-bar');
  if (!bar) return;
  const idx    = NOTE_ORDER.indexOf(currentNote);
  const nextId = idx < NOTE_ORDER.length - 1 ? NOTE_ORDER[idx+1] : null;
  const titleEl = document.getElementById('b-next-title');
  const goBtn   = bar.querySelector('.b-next-go');
  if (nextId) {
    if (titleEl) titleEl.textContent = NOTE_NAMES[nextId] || nextId;
    if (goBtn)   { goBtn.textContent = 'Continue →'; goBtn.style.display = ''; }
  } else {
    if (titleEl) titleEl.textContent = 'Last note — you are done.';
    if (goBtn)   goBtn.style.display = 'none';
  }
  bar.dataset.nextId = nextId || '';
  bar.classList.add('visible');
  bNextShown = true;
  const navEl = document.getElementById('b-nav');
  if (navEl) navEl.classList.remove('visible');
  setTimeout(() => { const m = document.getElementById('modal'); if (m) m.scrollTo({ top: m.scrollHeight, behavior: 'smooth' }); }, 100);
}

function bGoNextNote() {
  const nextId = document.getElementById('b-next-bar').dataset.nextId;
  document.getElementById('b-next-bar').classList.remove('visible');
  if (bStart) {
    const noteId   = currentNote;
    const noteName = NOTE_NAMES[noteId] || noteId;
    const mcqs     = NOTES_MCQ[noteId] || [];
    const noteCards = vsPickCards(mcqs, noteId, noteName);
    vsSessionNotes.push({ noteId, noteName, cards: noteCards });
  }
  bStop(false);
  if (nextId) openNote(nextId);
  if (nextId) setTimeout(() => bStart_(), 400);
}

function bDismissNextNote() {
  document.getElementById('b-next-bar').classList.remove('visible');
  const nav = document.getElementById('b-nav');
  if (nav) nav.classList.add('visible');
}

/* ── Phase engine ── */
function bStartPhase(p) {
  if (!breatheOn) return;
  bPhase = p;
  const lbl = document.getElementById('b-phase-label');
  if (lbl) lbl.textContent = p;
  if (p === 'hold') bSections[bCurIdx]?.classList.add('b-hold');
  else              bSections[bCurIdx]?.classList.remove('b-hold');
  const dur = bPhaseDur(p);
  bAnimateArc(p, dur);
  if (dur === 0) { bNextPhase(); return; }
  bPhTimer = setTimeout(() => { if (!breatheOn || bPaused) return; bNextPhase(); }, dur);
}

function bNextPhase() {
  if (bPhase === 'inhale')     bStartPhase('hold');
  else if (bPhase === 'hold')  bStartPhase('exhale');
  else {
    bCyclesDone++;
    if (bCyclesDone >= PREFS.cycles) { if (!bNextShown) bAdvance(); else bStartPhase('inhale'); }
    else bStartPhase('inhale');
  }
}

function bAnimateArc(p, dur) {
  cancelAnimationFrame(bRafId);
  const arc   = document.getElementById('b-r-arc');
  const secEl = document.getElementById('b-core-sec');
  if (!arc) return;
  const start = performance.now();
  function frame(now) {
    if (!breatheOn || bPaused) return;
    const elapsed = now - start;
    const t = Math.min(elapsed / Math.max(dur, 1), 1);
    let offset;
    if (p === 'inhale')    offset = BCIRC * (1 - t);
    else if (p === 'hold') offset = 0;
    else                   offset = BCIRC * t;
    arc.style.strokeDashoffset = offset;
    arc.style.transition = 'none';
    if (secEl) secEl.textContent = Math.max(1, Math.ceil((dur - elapsed) / 1000));
    if (t < 1) bRafId = requestAnimationFrame(frame);
  }
  bRafId = requestAnimationFrame(frame);
}

function bTogglePause() {
  if (!breatheOn) return;
  bPaused = !bPaused;
  const lbl = document.getElementById('b-pause-lbl');
  if (bPaused) {
    clearTimeout(bPhTimer); cancelAnimationFrame(bRafId);
    if (lbl) lbl.textContent = '▶';
    const pl = document.getElementById('b-phase-label');
    if (pl) pl.textContent = 'paused';
  } else {
    if (lbl) lbl.textContent = '⏸';
    bStartPhase(bPhase);
  }
}

function bStop_noSummary() { bStop(false); }


/* ══════════════════════════════════════════════════════════
   VENTILATION SUMMARY (post-breathe questions)
══════════════════════════════════════════════════════════ */
let vsCurrentSess = null, vsCards = [], vsCurIdx = 0, vsMarks = [], vsAnswerShown = false;
let vsSessionNotes = [];
const vsNoteSeenMap = {};

function bShowSummary(sess) {
  vsCurrentSess = sess;
  const noteId   = sess.noteId || sess.topic;
  const noteName = NOTE_NAMES[noteId] || sess.topic || noteId;
  const mcqs     = NOTES_MCQ[noteId] || [];
  const noteCards = vsPickCards(mcqs, noteId, noteName);
  vsSessionNotes.push({ noteId, noteName, cards: noteCards });
  let allCards = [];
  vsSessionNotes.forEach(n => allCards = allCards.concat(n.cards));
  for (let i = allCards.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [allCards[i],allCards[j]] = [allCards[j],allCards[i]]; }
  vsCards = allCards;
  vsCurIdx = 0; vsMarks = vsCards.map(() => null); vsAnswerShown = false;

  const dur = bFmtDur(sess.duration || 0);
  const noteCount = vsSessionNotes.length;
  const titleEl = document.getElementById('vs-title');
  const metaEl  = document.getElementById('vs-meta');
  if (titleEl) titleEl.innerHTML = 'Test your <em>recall.</em>';
  if (metaEl)  metaEl.innerHTML  = noteCount > 1
    ? `<span class="vs-meta-note">${noteCount} notes studied</span><span class="vs-meta-dot"></span>${vsCards.length} questions`
    : `<span class="vs-meta-note">${noteName}</span><span class="vs-meta-dot"></span>${dur}<span class="vs-meta-dot"></span>${sess.sections||0} sections`;

  const finEl = document.getElementById('vs-finish');
  const qEl   = document.getElementById('vs-question-view');
  const introEl = document.getElementById('vs-intro');
  const introSubEl = document.getElementById('vs-intro-sub');
  const progEl = document.getElementById('vs-progress');
  if (finEl)   finEl.classList.remove('show');
  if (qEl)     qEl.style.display = 'none';
  if (introSubEl) introSubEl.textContent = vsCards.length + ' questions across ' + vsSessionNotes.length + (vsSessionNotes.length===1?' note':' notes') + ' — one at a time, randomised.';
  if (introEl) introEl.classList.add('show');
  if (progEl)  progEl.style.display = 'none';
  document.getElementById('breathe-summary').classList.add('show');
}

function vsStartQuestions() {
  document.getElementById('vs-intro').classList.remove('show');
  document.getElementById('vs-question-view').style.display = '';
  document.getElementById('vs-progress').style.display = '';
  vsRenderProgress();
  vsShowQuestion(0);
}

function vsResetSession() {
  vsSessionNotes = [];
  Object.keys(vsNoteSeenMap).forEach(k => { if (vsNoteSeenMap[k]) vsNoteSeenMap[k].clear(); });
  const intro = document.getElementById('vs-intro');
  if (intro) intro.classList.remove('show');
}

function vsPickCards(mcqs, noteId, noteName) {
  if (!mcqs || !mcqs.length) return [
    { noteId, noteName, q:'What is the key concept from this note?',         a:'Review the key section.',           exp:'' },
    { noteId, noteName, q:'What is the classic exam presentation?',           a:'Review the classic pattern section.', exp:'' },
    { noteId, noteName, q:'What is the most important clinical trap here?',   a:'Review the trap zone section.',     exp:'' }
  ];
  if (!vsNoteSeenMap[noteId]) vsNoteSeenMap[noteId] = new Set();
  const seen = vsNoteSeenMap[noteId];
  if (seen.size >= mcqs.length) seen.clear();
  const available = mcqs.map((m,i) => i).filter(i => !seen.has(i));
  const shuffled  = available.sort(() => Math.random() - .5);
  const picked    = shuffled.slice(0, Math.min(5, shuffled.length));
  picked.forEach(i => seen.add(i));
  return picked.map(i => ({ ...mcqs[i], noteId, noteName }));
}

function vsRenderProgress() {
  const el = document.getElementById('vs-progress');
  if (!el) return;
  el.innerHTML = vsCards.map((_,i) => `<div class="vs-pip ${i < vsCurIdx ? 'done' : i === vsCurIdx ? 'active' : ''}"></div>`).join('');
}

function vsUpdatePips() {
  document.querySelectorAll('.vs-pip').forEach((p,i) => {
    p.className = 'vs-pip' + (i < vsCurIdx ? ' done' : i === vsCurIdx ? ' active' : '');
  });
}

function vsFormatAnswer(c) {
  if (c.opts && c.ans !== undefined) {
    const letters = ['A','B','C','D','E'];
    return `<div class="vs-ans-list">${c.opts.map((o,i) => `<div class="vs-ans-item"><span class="vs-ans-n">${i===c.ans?'✓':letters[i]}</span><span class="vs-ans-text" style="${i===c.ans?'color:#f4f0e8;font-weight:600':''}">${o}</span></div>`).join('')}</div>${c.exp?`<div class="vs-ans-prose">${c.exp}</div>`:''}`;
  }
  return `<div class="vs-ans-text">${c.a||''}</div>${c.exp?`<div class="vs-ans-prose">${c.exp}</div>`:''}`;
}

function vsShowQuestion(idx) {
  vsCurIdx = idx; vsAnswerShown = false;
  const c = vsCards[idx];
  const qEl    = document.getElementById('vs-q-num');
  const qtEl   = document.getElementById('vs-q-text');
  const ansEl  = document.getElementById('vs-answer-area');
  const ansLbl = document.getElementById('vs-ans-lbl');
  const ansIn  = document.getElementById('vs-ans-inner');
  if (qEl)   qEl.textContent   = 'Question ' + (idx+1) + ' of ' + vsCards.length;
  if (qtEl)  qtEl.textContent  = c.q;
  if (ansEl) { ansEl.classList.remove('open'); }
  if (ansIn) ansIn.innerHTML = vsFormatAnswer(c);
  vsRenderControls();
  vsUpdatePips();
}

function vsRenderControls() {
  const revBtn  = document.getElementById('vs-btn-reveal');
  const gotBtn  = document.getElementById('vs-btn-got');
  const missBtn = document.getElementById('vs-btn-miss');
  if (!revBtn) return;
  if (!vsAnswerShown) {
    revBtn.style.display  = '';
    if (gotBtn)  gotBtn.style.display  = 'none';
    if (missBtn) missBtn.style.display = 'none';
  } else {
    revBtn.style.display  = 'none';
    if (gotBtn)  gotBtn.style.display  = '';
    if (missBtn) missBtn.style.display = '';
  }
}

function vsReveal() {
  vsAnswerShown = true;
  const ansEl = document.getElementById('vs-answer-area');
  if (ansEl) ansEl.classList.add('open');
  vsRenderControls();
}

function vsMark(result) {
  vsMarks[vsCurIdx] = result;
  if (result === 'missed') {
    const c = vsCards[vsCurIdx];
    vlAddMissed(c.noteId, c.noteName, [{ q: c.q, a: c.a || (c.opts?c.opts[c.ans]:''), exp: c.exp || '' }]);
  }
  vsNext();
}

function vsNext() {
  if (vsCurIdx + 1 < vsCards.length) vsShowQuestion(vsCurIdx + 1);
  else vsFinish();
}

function vsFinish() {
  const got    = vsMarks.filter(m => m === 'got').length;
  const missed = vsMarks.filter(m => m === 'missed').length;
  const total  = vsCards.length;
  const pct    = total > 0 ? Math.round(got / total * 100) : 0;

  vsTrackTopicScore(vsCards, vsMarks);
  vlUpdateBadge();

  const finEl = document.getElementById('vs-finish');
  const qEl   = document.getElementById('vs-question-view');
  const progEl = document.getElementById('vs-progress');
  if (qEl)   qEl.style.display = 'none';
  if (progEl) progEl.style.display = 'none';
  if (finEl) {
    const scoreEl  = finEl.querySelector('.vs-finish-score');
    const labelEl  = finEl.querySelector('.vs-finish-label');
    const missedEl = finEl.querySelector('.vs-finish-missed');
    if (scoreEl)  scoreEl.textContent = pct + '%';
    if (labelEl)  labelEl.textContent = pct===100?'Perfect.':pct>=80?'Well ventilated.':pct>=60?'Getting there.':'Back to the note.';
    if (missedEl && missed > 0) { missedEl.textContent = missed + ' question' + (missed>1?'s':'') + ' added to your missed list.'; }
    else if (missedEl) { missedEl.textContent = 'Clean sweep. No missed questions.'; }
    finEl.classList.add('show');
  }
}

function vsTrackTopicScore(cards, marks) {
  try {
    const scores = JSON.parse(localStorage.getItem('vent-topic-scores') || '{}');
    const byNote = {};
    cards.forEach((c,i) => {
      if (!byNote[c.noteId]) byNote[c.noteId] = { noteId: c.noteId, noteName: c.noteName, got: 0, missed: 0, sessions: 0 };
      if (marks[i] === 'got') byNote[c.noteId].got++;
      else if (marks[i] === 'missed') byNote[c.noteId].missed++;
    });
    Object.values(byNote).forEach(({ noteId, noteName, got, missed }) => {
      if (!scores[noteId]) scores[noteId] = { noteId, noteName, got: 0, missed: 0, sessions: 0 };
      scores[noteId].got += got;
      scores[noteId].missed += missed;
      scores[noteId].sessions += 1;
      scores[noteId].noteName = noteName;
    });
    localStorage.setItem('vent-topic-scores', JSON.stringify(scores));
  } catch(e) {}
}

function vsConfirmClose() { const el = document.getElementById('vs-confirm'); if (el) el.classList.add('show'); }
function vsCancelClose()  { const el = document.getElementById('vs-confirm'); if (el) el.classList.remove('show'); }
function vsDoClose()      { dismissBreatheSummary(); }

function vsBackToNotes() {
  dismissBreatheSummary();
  closeModal();
}

function dismissBreatheSummary() {
  document.getElementById('breathe-summary').classList.remove('show');
}

function bShareSession() {
  const arr  = bLoadHistory();
  const sess = arr[0];
  if (!sess) return;
  const text = 'Just breathed through "' + (NOTE_NAMES[sess.topic]||sess.topic) + '" — ' + bFmtDur(sess.duration) + ', ' + sess.sections + ' sections 🌬\n\nVENT — study like you breathe.';
  if (navigator.share) { navigator.share({ text, url: window.location.href }).catch(() => {}); }
  else { navigator.clipboard.writeText(text).catch(() => { prompt('Copy to share:', text); }); }
}


/* ══════════════════════════════════════════════════════════
   FULLSCREEN
══════════════════════════════════════════════════════════ */
let isFullscreen = false;
function toggleFullscreen() {
  const overlay = document.getElementById('overlay');
  const btn     = document.getElementById('btn-fullscreen');
  isFullscreen  = !isFullscreen;
  overlay.classList.toggle('fullscreen', isFullscreen);
  btn.innerHTML = isFullscreen
    ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 1v4H1M13 5h-4V1M9 13V9h4M1 9h4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}


/* ══════════════════════════════════════════════════════════
   MCQ ROOM (classic end-of-note quiz)
══════════════════════════════════════════════════════════ */
const mcqState = {};

function showVentPopup() {
  document.getElementById('vent-popup').classList.add('show');
  document.getElementById('vent-backdrop').classList.add('show');
}
function dismissVentPopup() {
  const pp = document.getElementById('vent-popup');
  const pb = document.getElementById('vent-backdrop');
  if (pp) pp.classList.remove('show');
  if (pb) pb.classList.remove('show');
}

function startMCQ() {
  dismissVentPopup();
  if (!NOTES_MCQ[currentNote] || !NOTES_MCQ[currentNote].length) return;
  if (!mcqState[currentNote]) {
    mcqState[currentNote] = { current: 0, answers: Array(NOTES_MCQ[currentNote].length).fill(null) };
  }
  document.getElementById('page-note').style.display  = 'none';
  document.getElementById('page-mcq').style.display   = 'block';
  document.getElementById('mcq-inner').innerHTML      = renderQuestion(currentNote);
  document.getElementById('modal').scrollTop          = 0;
  document.getElementById('mbar-note-tools').style.visibility = 'hidden';
}

function backToNote() {
  document.getElementById('page-mcq').style.display  = 'none';
  document.getElementById('page-note').style.display = 'block';
  document.getElementById('modal').scrollTop         = 0;
  document.getElementById('mbar-note-tools').style.visibility = 'visible';
}

function renderQuestion(noteId) {
  const state   = mcqState[noteId];
  const mcqs    = NOTES_MCQ[noteId];
  const qi      = state.current;
  const total   = mcqs.length;
  const q       = mcqs[qi];
  const letters = ['A','B','C','D','E'];
  const pct     = Math.round((qi / total) * 100);
  let dots = '';
  for (let i = 0; i < total; i++) dots += `<div class="mcq-dot ${i<qi?'done':i===qi?'current':''}"></div>`;
  return `<div class="mcq-room-header">
    <span class="mcq-room-label">// Test yourself</span>
    <div style="display:flex;align-items:center;gap:16px;">
      <span class="mcq-room-note-title">${qi+1} of ${total}</span>
      <button onclick="backToNote()" style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,.3);background:none;border:1px solid rgba(255,255,255,.1);padding:5px 12px;cursor:pointer;transition:all .2s;" onmouseover="this.style.color='rgba(255,255,255,.7)'" onmouseout="this.style.color='rgba(255,255,255,.3)'">← Note</button>
    </div>
  </div>
  <div class="mcq-progress-strip"><div class="mcq-progress-fill" style="width:${pct}%"></div></div>
  <div class="mcq-body">
    <div class="mcq-counter"><span class="mcq-counter-q">Question ${qi+1} of ${total}</span><div class="mcq-counter-dots">${dots}</div></div>
    <div class="mcq-q-wrap"><div class="mcq-q-num">Question ${qi+1}</div><div class="mcq-q-text">${q.q}</div></div>
    <div class="mcq-opts-list" id="opts-${noteId}">
      ${q.opts.map((o,i) => `<button class="mcq-opt-btn" onclick="selectOpt('${noteId}',${i})"><span class="mcq-opt-ltr">${letters[i]}</span><span class="mcq-opt-txt">${o}</span></button>`).join('')}
    </div>
    <div class="mcq-next-wrap"><button class="mcq-next-btn" id="next-${noteId}" onclick="nextQuestion('${noteId}')" disabled>${qi+1<total?'Next &rarr;':'See results &rarr;'}</button></div>
  </div>`;
}

function selectOpt(noteId, oi) {
  const state = mcqState[noteId];
  if (state.answers[state.current] !== null) return;
  state.answers[state.current] = oi;
  document.querySelectorAll(`#opts-${noteId} .mcq-opt-btn`).forEach((b,i) => {
    b.classList.add('answered');
    if (i === oi) b.classList.add('selected');
  });
  document.getElementById(`next-${noteId}`).disabled = false;
}

function nextQuestion(noteId) {
  const state = mcqState[noteId];
  if (state.current + 1 < NOTES_MCQ[noteId].length) {
    state.current++;
    document.getElementById('mcq-inner').innerHTML = renderQuestion(noteId);
  } else {
    showResults(noteId);
  }
}

function showResults(noteId) {
  const state   = mcqState[noteId];
  const mcqs    = NOTES_MCQ[noteId];
  const letters = ['A','B','C','D','E'];
  let correct = 0, missedTopics = [];
  mcqs.forEach((q,i) => { if (state.answers[i] === q.ans) correct++; else missedTopics.push(q.focus || 'Review this topic'); });
  const pct = Math.round((correct / mcqs.length) * 100);
  const gc  = pct >= 80 ? '#4db87a' : pct >= 60 ? '#c8a040' : '#e05a5a';
  const gl  = pct===100?'Perfect score.':pct>=80?'Well ventilated.':pct>=60?'Getting there.':'Back to the note.';
  const gs  = pct===100?'Every concept landed.':pct>=80?'Solid. Review what you missed.':pct>=60?'Good base. Some gaps to close.':"That's okay. Read the note again, then retry.";
  let html = `<div class="mcq-room-header"><span class="mcq-room-label">// Results</span><div style="display:flex;align-items:center;gap:16px;"><span class="mcq-room-note-title">${correct}/${mcqs.length} correct</span><button onclick="backToNote()" style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,.3);background:none;border:1px solid rgba(255,255,255,.1);padding:5px 12px;cursor:pointer;">← Note</button></div></div>
  <div class="mcq-progress-strip"><div class="mcq-progress-fill" style="width:${pct}%"></div></div>
  <div class="res-hero"><div class="res-circle" style="border-color:${gc}"><div class="res-circle-num" style="color:${gc}">${correct}/${mcqs.length}</div><div class="res-circle-pct" style="color:${gc}">${pct}%</div></div><div><div class="res-hero-grade">${gl}</div><div class="res-hero-sub">${gs}</div></div></div>
  <div class="res-body">`;
  if (missedTopics.length) { const u = [...new Set(missedTopics)]; html += `<div class="res-section-lbl">Focus on</div><div class="res-focus-box">${u.map(m=>`<div class="res-focus-item">${m}</div>`).join('')}</div>`; }
  html += `<div class="res-section-lbl">Full breakdown</div><div class="res-qlist">`;
  mcqs.forEach((q,i) => {
    const ch = state.answers[i], ok = ch === q.ans;
    html += `<div class="res-qblock ${ok?'res-right':'res-wrong'}"><div class="res-qblock-header"><span class="res-qbadge ${ok?'right':'wrong'}">${ok?'✓ Correct':'✗ Incorrect'}</span><span class="res-qblock-num">Q${i+1}</span></div><div class="res-qblock-q">${q.q}</div><div class="res-opts-wrap">${q.opts.map((o,oi)=>`<div class="res-opt${oi===q.ans?' correct':oi===ch?' chosen-wrong':''}"><span class="res-opt-ltr">${letters[oi]}</span><span>${o}${oi===q.ans?' ✓':oi===ch?' ✗':''}</span></div>`).join('')}</div><div class="res-explain-block"><div class="res-explain-lbl">Why</div><div class="res-explain-txt">${q.exp}</div></div></div>`;
  });
  html += `</div><div class="res-actions"><button class="res-btn-retry" onclick="retryMCQ('${noteId}')">↻ Retry</button><button class="res-btn-back" onclick="backToNote()">← Back to note</button></div></div>`;
  document.getElementById('mcq-inner').innerHTML = html;
}

function retryMCQ(noteId) {
  mcqState[noteId] = { current: 0, answers: Array(NOTES_MCQ[noteId].length).fill(null) };
  document.getElementById('mcq-inner').innerHTML = renderQuestion(noteId);
}


/* ══════════════════════════════════════════════════════════
   MODAL OPEN / CLOSE
══════════════════════════════════════════════════════════ */
let currentNote = null;

function openNote(id) {
  currentNote = id;
  const html = NOTES[id] ? NOTES[id]() : `<div class="n-page" style="padding-top:80px;text-align:center"><p style="font-family:'Instrument Serif',serif;font-size:28px;font-style:italic;color:var(--n-ink4);">Coming soon.</p></div>`;
  document.getElementById('mcontent').innerHTML = html;

  // Tag key content for breathe-mode highlight
  document.querySelectorAll('#mcontent .n-mech-cause, #mcontent .n-section-title, #mcontent .n-pearl-num, #mcontent .n-exam-statement').forEach(el => {
    if (!el.querySelector('.b-key')) el.innerHTML = '<span class="b-key">' + el.innerHTML + '</span>';
  });
  document.querySelectorAll('#mcontent .n-mech-text strong, #mcontent .n-algo-body strong, #mcontent .n-flag-text strong, #mcontent .n-pearl-body strong, #mcontent .n-diag-content strong').forEach(el => el.classList.add('b-key'));

  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('modal').scrollTop = 0;

  // Scroll-unlock / breathe state
  const alreadyRead = bCheckReadMemory(id);
  bScrollUnlocked   = alreadyRead;
  bScrollProgress   = alreadyRead ? 1 : 0;
  const btn  = document.getElementById('btn-breathe');
  const lbl  = document.getElementById('breathe-btn-label');
  const fill = document.getElementById('breathe-btn-fill');
  if (btn)  btn.classList.remove('b-locked','b-unlocking','b-just-unlocked','b-ready');
  if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
  if (alreadyRead) {
    if (btn)  { btn.style.pointerEvents = ''; btn.classList.add('b-ready'); }
    if (lbl)  lbl.textContent = 'Breathe';
  } else {
    if (btn)  { btn.classList.add('b-locked'); btn.style.pointerEvents = ''; }
    if (lbl)  lbl.textContent = 'Breathe';
  }
  bAttachScrollTracker();

  // MCQ page state
  document.getElementById('page-note').style.display  = 'block';
  document.getElementById('page-mcq').style.display   = 'none';
  document.getElementById('mbar-note-tools').style.visibility = 'visible';

  loadHighlights(id);
  dismissVentPopup();

  // If breathe was already on, re-initialise for new note
  if (breatheOn) {
    setTimeout(() => {
      const heroEl  = document.querySelector('#mcontent .n-hero-new');
      const sectEls = Array.from(document.querySelectorAll('#mcontent .n-section'));
      bSections = heroEl ? [heroEl, ...sectEls] : sectEls;
      bTotal = bSections.length;
      bCurIdx = 0; bCyclesDone = 0; bAtLast = false; bNextShown = false; bSessionSections = 0;
      document.getElementById('b-next-bar').classList.remove('visible');
      const nav = document.getElementById('b-nav');
      if (nav) nav.classList.add('visible');
      const spine = document.getElementById('b-spine');
      if (spine) { spine.innerHTML = ''; bSections.forEach((_,i) => { const d = document.createElement('div'); d.className='b-sdot'; d.onclick=()=>{if(breatheOn)bJumpTo(i);}; spine.appendChild(d); }); }
      bActivate(0); bStartPhase('inhale');
    }, 50);
    showNoteNav(); updateNavLabel();
  }
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open','fullscreen');
  document.body.style.overflow = '';
  isFullscreen = false;
  const btn = document.getElementById('btn-fullscreen');
  if (btn) btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  dismissVentPopup();
  if (breatheOn) bStop(false);
  const tools = document.getElementById('mbar-note-tools');
  if (tools) tools.style.visibility = 'visible';
  hideHlPopup();
}

function closeBg(e) { if (e.target === document.getElementById('overlay')) closeModal(); }


/* ══════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const prefs = document.getElementById('prefs-overlay');
    if (prefs && prefs.classList.contains('on')) { closePrefs(); return; }
    closeModal();
    return;
  }
  if (!breatheOn) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); bSkipFwd(); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); bSkipBack(); }
  if (e.key === 'p' || e.key === 'P') bTogglePause();
});


/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadFontSize();
  loadPrefs();
  vlUpdateBadge();
});
