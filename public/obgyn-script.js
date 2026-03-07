// REVEAL ANIMATION
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ══════════════════════════════════════════════
// HIGHLIGHT SYSTEM — popup appears on text select
// ══════════════════════════════════════════════
let hlHistory = {};
let _savedRange = null;
let _popupVisible = false;

function showHlPopup(rect) {
  const popup = document.getElementById('hl-popup');
  const popW = 210; // approximate popup width
  let x = rect.left + rect.width / 2 - popW / 2;
  let y = rect.top - 54;
  // keep inside viewport
  x = Math.max(8, Math.min(x, window.innerWidth - popW - 8));
  if (y < 8) y = rect.bottom + 8; // flip below if too close to top
  popup.style.left = x + 'px';
  popup.style.top  = y + 'px';
  popup.classList.add('show');
  _popupVisible = true;
}

function hideHlPopup() {
  document.getElementById('hl-popup').classList.remove('show');
  _popupVisible = false;
}

function applyHlColor(color) {
  if (!_savedRange) { hideHlPopup(); return; }
  const container = document.getElementById('mcontent');
  if (!container) { hideHlPopup(); return; }

  // Snapshot for undo BEFORE mutating DOM
  if (!hlHistory[currentNote]) hlHistory[currentNote] = [];
  hlHistory[currentNote].push(container.innerHTML);

  const range = _savedRange;

  // Walk every text node inside the container
  // For each one, check if it overlaps the selection and wrap only the overlapping slice
  const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const toWrap = []; // collect first, wrap after (don't mutate while walking)
  let node;
  while ((node = walk.nextNode())) {
    // Does this text node overlap the selection range?
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) >= 0) continue; // range ends before node
    if (range.compareBoundaryPoints(Range.START_TO_END, nodeRange) <= 0) continue; // range starts after node
    // Compute the exact slice within this text node
    const start = (node === range.startContainer) ? range.startOffset : 0;
    const end   = (node === range.endContainer)   ? range.endOffset   : node.length;
    if (start >= end) continue;
    toWrap.push({ node, start, end });
  }

  toWrap.forEach(({ node, start, end }) => {
    try {
      // Split the text node so we get exactly the selected slice as its own node
      // node.splitText(end) splits at `end`, leaving [0..end] in `node`
      // then splitText(start) splits again, leaving [start..end] in the middle part
      if (end < node.length) node.splitText(end);
      const targetNode = (start > 0) ? node.splitText(start) : node;
      // Now targetNode contains exactly the selected text — wrap it
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
    const all = JSON.parse(localStorage.getItem('vent-highlights') || '{}');
    all[currentNote] = document.getElementById('mcontent').innerHTML;
    localStorage.setItem('vent-highlights', JSON.stringify(all));
  } catch(e) {}
}

function loadHighlights(noteId) {
  try {
    const all = JSON.parse(localStorage.getItem('vent-highlights') || '{}');
    if (all[noteId]) {
      document.getElementById('mcontent').innerHTML = all[noteId];
      reAttachMarkHandlers();
    }
  } catch(e) {}
}

// mouseup → check selection → show popup
document.addEventListener('mouseup', function(e) {
  if (e.target.closest('#hl-popup')) return; // click inside popup, ignore
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hideHlPopup(); return; }
    const range = sel.getRangeAt(0);
    if (range.toString().trim() === '') { hideHlPopup(); return; }
    const container = document.getElementById('mcontent');
    if (!container || !container.contains(range.commonAncestorContainer)) { hideHlPopup(); return; }
    // hide when MCQ is open
    const notePage = document.getElementById('page-note-ob');
    if (notePage && notePage.style.display === 'none') { hideHlPopup(); return; }
    _savedRange = range.cloneRange();
    showHlPopup(range.getBoundingClientRect());
  }, 20);
});

// click outside popup → dismiss (use click not mousedown to avoid race with mouseup)
document.addEventListener('click', function(e) {
  if (_popupVisible && !e.target.closest('#hl-popup')) hideHlPopup();
});

// ══════════════════════════════════════════════
// FONT SIZE SYSTEM
// ══════════════════════════════════════════════
const FONT_STEPS = [85, 92, 100, 108, 116, 126, 138];
let fontStepIndex = 2;

function applyFontSize() {
  const pct = FONT_STEPS[fontStepIndex];
  document.getElementById('modal').style.fontSize = pct + '%';
  document.getElementById('font-size-display').textContent = pct + '%';
  try { localStorage.setItem('vent-fontsize', fontStepIndex); } catch(e) {}
}
function changeFontSize(dir) {
  fontStepIndex = Math.max(0, Math.min(FONT_STEPS.length - 1, fontStepIndex + dir));
  applyFontSize();
}
function loadFontSize() {
  try { const s = localStorage.getItem('vent-fontsize'); if (s !== null) fontStepIndex = parseInt(s); } catch(e) {}
  applyFontSize();
}


// ══════════════════════════════════════════════════════════════
// NOTE ORDER & NAV (required by breathe + modal nav)
// ══════════════════════════════════════════════════════════════
const NOTE_ORDER = ['pph','preeclampsia','ectopic','placenta','gdm','shoulder','pretermlabour','miscarriage','cordprolapse','abruption','iol','obstetriccholestasis','ovarycyst','cervicalcancer','endometriosis','pcos','fibroids','pid','menopause','vulvalconditions','ovariancancer','subfertility','endometrialcancer','urinaryincontinence','contraception','sexuallytransmitted','acutegynae'];
const NOTE_NAMES_NAV = {pph:'PPH',preeclampsia:'Preeclampsia',ectopic:'Ectopic',placenta:'Placenta Praevia',gdm:'GDM',shoulder:'Shoulder Dystocia',pretermlabour:'Preterm Labour',miscarriage:'Miscarriage',cordprolapse:'Cord Prolapse',abruption:'Abruption',iol:'IOL',obstetriccholestasis:'Obstetric Cholestasis',ovarycyst:'Ovarian Cysts',cervicalcancer:'Cervical Cancer',endometriosis:'Endometriosis',pcos:'PCOS',fibroids:'Fibroids',pid:'PID',menopause:'Menopause',vulvalconditions:'Vulval',ovariancancer:'Ovarian Ca.',subfertility:'Subfertility',endometrialcancer:'Endometrial Ca.',urinaryincontinence:'Urinary Incont.',contraception:'Contraception',sexuallytransmitted:'STIs',acutegynae:'Acute Gynae'};

function updateNavLabel(){
  const idx = NOTE_ORDER.indexOf(currentNote);
  const label = document.getElementById('mnav-label');
  if(label) label.textContent = (idx+1)+' / '+NOTE_ORDER.length+' · '+(NOTE_NAMES_NAV[currentNote]||currentNote);
  const prev = document.getElementById('btn-prev-note');
  const next = document.getElementById('btn-next-note');
  if(prev) prev.style.opacity = idx===0 ? '0.25' : '1';
  if(next) next.style.opacity = idx===NOTE_ORDER.length-1 ? '0.25' : '1';
}
function prevNote(){ const idx=NOTE_ORDER.indexOf(currentNote); if(idx>0) openNote(NOTE_ORDER[idx-1]); }
function nextNote(){ const idx=NOTE_ORDER.indexOf(currentNote); if(idx<NOTE_ORDER.length-1) openNote(NOTE_ORDER[idx+1]); }
function showNoteNav(){ const n=document.getElementById('mbar-note-nav'); if(n) n.classList.add('visible'); }
function hideNoteNav(){ const n=document.getElementById('mbar-note-nav'); if(n) n.classList.remove('visible'); }

// ── Breathe prefs ──
let PREFS = { inhale:4, hold:3, exhale:3, cycles:2 };
function loadPrefs(){
  try{ const s=localStorage.getItem('vent-breathe-prefs'); if(s) PREFS={...PREFS,...JSON.parse(s)}; }catch(e){}
  syncPrefsDisplay();
}
function syncPrefsDisplay(){
  ['inhale','hold','exhale','cycles'].forEach(k=>{
    const el=document.getElementById('ps-'+k); if(el) el.value=PREFS[k];
    const d=document.getElementById('ps-'+k+'-display'); if(d) d.textContent=PREFS[k];
  });
}
const PMIN={inhale:1,hold:0,exhale:1,cycles:1};
const PMAX={inhale:12,hold:12,exhale:12,cycles:6};
function prefAdj(key, delta){
  PREFS[key]=Math.max(PMIN[key], Math.min(PMAX[key], (PREFS[key]||0)+delta));
  const el=document.getElementById('ps-'+key); if(el) el.value=PREFS[key];
  const d=document.getElementById('ps-'+key+'-display'); if(d) d.textContent=PREFS[key];
}
function savePrefs(){
  PREFS.inhale=+document.getElementById('ps-inhale').value;
  PREFS.hold=+document.getElementById('ps-hold').value;
  PREFS.exhale=+document.getElementById('ps-exhale').value;
  PREFS.cycles=+document.getElementById('ps-cycles').value;
  try{ localStorage.setItem('vent-breathe-prefs',JSON.stringify(PREFS)); }catch(e){}
}
function openPrefs(){ syncPrefsDisplay(); const o=document.getElementById('prefs-overlay'); if(o) o.classList.add('on'); }
function closePrefs(){ const o=document.getElementById('prefs-overlay'); if(o) o.classList.remove('on'); }
loadPrefs();

// ══════════════════════════════════════════════════════════════
// BREATHE MODE v3 — full section engine
// ══════════════════════════════════════════════════════════════


// ── History panel ──
function bLoadHistory(){ try{ return JSON.parse(localStorage.getItem('vent-breathe-history')||'[]'); }catch(e){ return []; } }
function bSaveHistory(arr){ try{ localStorage.setItem('vent-breathe-history',JSON.stringify(arr)); }catch(e){} }
function bAddSession(sess){ const arr=bLoadHistory(); arr.unshift(sess); if(arr.length>120)arr.pop(); bSaveHistory(arr); }
function bGetTodaySessions(){ const t=new Date().toDateString(); return bLoadHistory().filter(s=>new Date(s.date).toDateString()===t); }
function bFmtDur(s){ if(s<60)return s+'s'; const m=Math.floor(s/60),r=s%60; return r?m+'m '+r+'s':m+'m'; }
function bFmtTotal(s){ const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?h+'h '+m+'m':(m||0)+' min'; }
function bTimeAgo(d){ const diff=Date.now()-new Date(d).getTime(),mi=Math.floor(diff/60000),h=Math.floor(mi/60),dy=Math.floor(h/24); if(dy>0)return dy===1?'Yesterday':dy+'d ago'; if(h>0)return h+'h ago'; if(mi>0)return mi+'m ago'; return 'Just now'; }
function bFmtDate(d){ return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }

// ── Missed questions storage ──
function vlLoadMissed(){ try{ return JSON.parse(localStorage.getItem('vent-missed-q')||'[]'); }catch(e){ return []; } }
function vlSaveMissed(arr){ try{ localStorage.setItem('vent-missed-q',JSON.stringify(arr.slice(0,80))); }catch(e){} }
function vlAddMissed(noteId, noteName, questions){
  // questions: [{q, a, exp}]
  const arr=vlLoadMissed();
  const now=new Date().toISOString();
  questions.forEach(item=>{
    // avoid exact duplicates
    if(!arr.some(x=>x.q===item.q && x.noteId===noteId)){
      arr.unshift({id:Date.now()+Math.random(), noteId, noteName, q:item.q, a:item.a, exp:item.exp||'', date:now});
    }
  });
  vlSaveMissed(arr);
  vlUpdateBadge();
}
function vlDismissMissed(id){
  const arr=vlLoadMissed().filter(x=>x.id!==id);
  vlSaveMissed(arr);
  vlUpdateBadge();
  // re-render missed pane if open
  const _vpm=document.getElementById('vl-pane-missed'); if(_vpm && _vpm.classList.contains('active')) vlRenderMissed();
}
function vlClearMissed(){
  localStorage.removeItem('vent-missed-q');
  vlUpdateBadge();
  vlRenderMissed();
}
function vlUpdateBadge(){
  const n=vlLoadMissed().length;
  const badge=document.getElementById('b-log-badge');
  if(badge){ badge.textContent=n>9?'9+':n; badge.classList.toggle('show',n>0); }
}

// ── Ventilation Log panel ──
let vlCurrentTab='today';
function bOpenHistory(){ vlRender(); document.getElementById('b-hist-overlay').classList.add('open'); }
function bCloseHistory(e){ if(e && e.target!==document.getElementById('b-hist-overlay')) return; document.getElementById('b-hist-overlay').classList.remove('open'); }

function vlSwitchTab(tab){
  ['today','missed','all','strength'].forEach(t=>{
    const btn=document.getElementById('vl-tab-'+t);
    const pane=document.getElementById('vl-pane-'+t);
    if(btn) btn.classList.toggle('active',t===tab);
    if(pane) pane.classList.toggle('active',t===tab);
  });
  if(tab==='strength') vlRenderStrength();
}


function vlRenderStrength(){
  const el=document.getElementById('vl-pane-strength');
  if(!el) return;
  let scores={};
  try{ scores=JSON.parse(localStorage.getItem('vent-topic-scores')||'{}'); }catch(e){}
  const entries=Object.values(scores).filter(s=>(s.got||0)+(s.missed||0)>0);
  if(!entries.length){
    el.innerHTML=`<div class="vl-strength-empty">Complete a recall session first.<br>Your topic breakdown will appear here.</div>`;
    return;
  }
  entries.forEach(e=>{ e.total=(e.got||0)+(e.missed||0); e.pct=Math.round((e.got||0)/e.total*100); });
  const strong=entries.filter(e=>e.pct>=75).sort((a,b)=>b.pct-a.pct);
  const mid=entries.filter(e=>e.pct>=50&&e.pct<75).sort((a,b)=>b.pct-a.pct);
  const weak=entries.filter(e=>e.pct<50).sort((a,b)=>a.pct-b.pct);

  const pill=(n,t,cls)=>n?`<div class="vl-ts-pill ${cls}">${n} ${t}</div>`:'';
  const summary=`<div class="vl-topics-header"><div class="vl-topics-summary">
    ${pill(weak.length,'needs work','weak')}
    ${pill(mid.length,'in progress','mid')}
    ${pill(strong.length,'strong','strong')}
  </div></div>`;

  function renderRow(e){
    const tier=e.pct>=75?'strong':e.pct>=50?'mid':'weak';
    return `<div class="vl-topic-row">
      <div class="vl-topic-dot ${tier}"></div>
      <div class="vl-topic-name">${e.noteName||e.noteId}</div>
      <div class="vl-topic-bar-wrap"><div class="vl-topic-bar ${tier}" style="width:${e.pct}%"></div></div>
      <div class="vl-topic-pct ${tier}">${e.pct}%</div>
      <div class="vl-topic-sessions">${e.sessions||1}×</div>
    </div>`;
  }
  function renderTier(arr,label,cls){
    if(!arr.length) return '';
    return `<div class="vl-tier-section">
      <div class="vl-tier-hdr"><div class="vl-tier-label ${cls}">${label}</div><div class="vl-tier-line"></div></div>
      ${arr.map(renderRow).join('')}
    </div>`;
  }

  el.innerHTML = summary
    + renderTier(weak,'Needs work','weak')
    + renderTier(mid,'Getting there','mid')
    + renderTier(strong,'Solid recall','strong');
}
function vlRenderHeatmap(sessions){
  const heatEl=document.getElementById('vl-heatmap');
  const monthEl=document.getElementById('vl-hm-months');
  if(!heatEl||!monthEl) return;

  const WEEKS=12;
  const today=new Date();
  today.setHours(23,59,59,999);

  // Build a map: dateStr → session count
  const countMap={};
  sessions.forEach(s=>{
    if(!s.date) return;
    const d=new Date(s.date);
    const key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    countMap[key]=(countMap[key]||0)+1;
  });

  // Find the Sunday that starts our grid (WEEKS*7 days ago, snapped to Sunday)
  const startDate=new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS*7 - 1));
  // Snap back to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Build columns (each column = one week, Sun→Sat)
  const cols=[];
  const monthPositions={}; // weekIdx → month label
  for(let w=0;w<WEEKS;w++){
    const col=[];
    for(let d=0;d<7;d++){
      const date=new Date(startDate);
      date.setDate(startDate.getDate() + w*7 + d);
      const key=date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();
      const count=countMap[key]||0;
      const isToday=date.toDateString()===new Date().toDateString();
      const isFuture=date>today;
      col.push({date,count,isToday,isFuture,key});
      // Track month label for first week that contains 1st of month
      if(date.getDate()===1||(w===0&&d===0)){
        const mLabel=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()];
        if(!Object.values(monthPositions).includes(mLabel)) monthPositions[w]=mLabel;
      }
    }
    cols.push(col);
  }

  // Render month labels row
  monthEl.innerHTML=cols.map((col,w)=>{
    const lbl=monthPositions[w]||'';
    return `<div class="vl-hm-month-lbl" style="width:14px">${lbl}</div>`;
  }).join('');

  // Render heatmap columns
  heatEl.innerHTML=cols.map(col=>{
    const cells=col.map(({count,isToday,isFuture})=>{
      if(isFuture) return `<div class="vl-hm-cell" style="opacity:.3"></div>`;
      const lvl=count===0?'':count===1?'l1':count===2?'l2':count===3?'l3':'l4';
      return `<div class="vl-hm-cell ${lvl}${isToday?' today':''}"></div>`;
    }).join('');
    return `<div class="vl-hm-col">${cells}</div>`;
  }).join('');
}

function vlRender(){
  const sessions=bLoadHistory();
  const todaySess=bGetTodaySessions();
  const totalSec=sessions.reduce((a,s)=>a+(s.duration||0),0);
  // stats
  document.getElementById('vl-stat-time').textContent=bFmtTotal(totalSec);
  document.getElementById('vl-stat-today').textContent=todaySess.length;
  document.getElementById('vl-stat-total').textContent=sessions.length;
  // Heatmap (16 weeks)
  vlRenderHeatmap(sessions);
  // Streak count
  let streak=0, checkStreak=true;
  for(let i=0;i<30;i++){
    const d=new Date(); d.setDate(d.getDate()-i);
    const has=sessions.some(s=>new Date(s.date).toDateString()===d.toDateString());
    if(i===0&&!has){ checkStreak=false; }
    if(checkStreak){ if(has) streak++; else break; }
  }
  const streakLbl=streak>=2?streak+' day streak 🔥':todaySess.length>0?'Active today':'Start your streak';
  document.getElementById('vl-streak-lbl').textContent=streakLbl;
  const _vb=document.getElementById('vl-burnout'); if(_vb) _vb.classList.toggle('show',todaySess.length>=3);
  // tab counts
  const missed=vlLoadMissed();
  document.getElementById('vl-today-count').textContent=todaySess.length;
  document.getElementById('vl-missed-count').textContent=missed.length;
  // panes
  vlRenderToday(todaySess);
  vlRenderMissed();
  vlRenderAll(sessions);
  vlUpdateBadge();
}

function vlRenderToday(todaySess){
  const el=document.getElementById('vl-pane-today');
  if(!todaySess.length){
    el.innerHTML=`<div class="vl-empty"><div class="vl-empty-icon">🌬</div><div class="vl-empty-text">Nothing breathed today yet.<br>Open a note and start.</div></div>`;
    return;
  }
  const checkSvg=`<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5l2.5 2.5 3.5-4" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  el.innerHTML=todaySess.map(s=>`
    <div class="vl-today-note">
      <div class="vl-tn-check">${checkSvg}</div>
      <div class="vl-tn-body">
        <div class="vl-tn-name">${s.topic||'Unknown'}</div>
        <div class="vl-tn-meta">${bFmtDur(s.duration||0)} &nbsp;·&nbsp; ${s.sections||0} sections</div>
      </div>
      <div class="vl-tn-time">${bTimeAgo(s.date)}</div>
    </div>`).join('');
}

function vlRenderMissed(){
  const el=document.getElementById('vl-pane-missed');
  const missed=vlLoadMissed();
  if(!missed.length){
    el.innerHTML=`<div class="vl-empty"><div class="vl-empty-icon">✓</div><div class="vl-empty-text">No missed questions.<br>Looking strong.</div></div>`;
    return;
  }
  el.innerHTML=missed.map((m,i)=>`
    <div class="vl-mq-card" id="vl-mq-${m.id}">
      <div class="vl-mq-note">${m.noteName||m.noteId}</div>
      <div class="vl-mq-q">${m.q}</div>
      <div class="vl-mq-ans" id="vl-mqans-${m.id}">
        <div class="vl-mq-ans-lbl">Answer</div>
        <div class="vl-mq-ans-text">${m.a}</div>
        ${m.exp?`<div class="vl-mq-ans-exp">${m.exp}</div>`:''}
      </div>
      <div class="vl-mq-actions">
        <button class="vl-mq-reveal" id="vl-mqbtn-${m.id}" onclick="vlRevealMQ('${m.id}')">Reveal answer</button>
        <button class="vl-mq-dismiss" onclick="vlDismissMissed(${m.id})">Got it ×</button>
      </div>
    </div>`).join('')
  + `<button class="vl-mq-clear-all" onclick="vlClearMissed()">Clear all missed questions</button>`;
}

function vlRevealMQ(id){
  const ans=document.getElementById('vl-mqans-'+id);
  const btn=document.getElementById('vl-mqbtn-'+id);
  if(ans){ ans.classList.add('open'); }
  if(btn){ btn.style.display='none'; }
}

function vlRenderAll(sessions){
  const el=document.getElementById('vl-pane-all');
  if(!sessions.length){
    el.innerHTML=`<div class="vl-empty"><div class="vl-empty-icon">🌬</div><div class="vl-empty-text">No sessions yet.<br>Start breathing.</div></div>`;
    return;
  }
  const waveSvg=`<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 11 C2 11 3 8 5 8 C6.5 8 6.5 9.5 8 9.5 C9.5 9.5 9.5 8 11 8 C13 8 14 11 14 11" stroke="rgba(200,69,42,.7)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M4 13 C4 13 5 11 8 11 C11 11 12 13 12 13" stroke="rgba(200,69,42,.4)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M5 7 C5 7 5.5 5 8 5 C10.5 5 11 7 11 7" stroke="rgba(200,69,42,.4)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  el.innerHTML=sessions.map(s=>`
    <div class="vl-sess-item">
      <div class="vl-sess-icon">${waveSvg}</div>
      <div class="vl-sess-body">
        <div class="vl-sess-topic">${s.topic||'Unknown'}</div>
        <div class="vl-sess-meta">${bFmtDur(s.duration||0)} &nbsp;·&nbsp; ${s.sections||0} sections</div>
      </div>
      <div class="vl-sess-when">${bTimeAgo(s.date)}</div>
    </div>`).join('');
}

function bClearHistory(){
  if(!confirm('Clear all ventilation data?')) return;
  localStorage.removeItem('vent-breathe-history');
  localStorage.removeItem('vent-missed-q');
  vlUpdateBadge();
  vlRender();
}

// ── Breathe state ──
// ── State ──
let breatheOn = false;
let bStart = null;
let bPaused = false;
let bCurIdx = 0;
let bCyclesDone = 0;
let bPhase = 'inhale';
let bPhTimer = null;
let bRafId = null;
let bSections = [];   // live .n-section NodeList for current note
let bTotal = 0;
let bAtLast = false;
let bNextShown = false;
let bSessionSections = 0;
const BCIRC = 263.9;

// Prefs (re-use existing PREFS from above)
function bPhaseDur(p){ if(p==='inhale')return PREFS.inhale*1000; if(p==='hold')return PREFS.hold*1000; return PREFS.exhale*1000; }

// ── Toggle ──
// ── Scroll-unlock system ──
let bScrollUnlocked = false;
let bScrollProgress = 0;
let bScrollHandler = null;

function bReadKey(noteId){ return 'vent-read-v1-'+noteId; }

function bCheckReadMemory(noteId){
  try{ return !!localStorage.getItem(bReadKey(noteId)); }catch(e){ return false; }
}

function bMarkNoteRead(noteId){
  try{ localStorage.setItem(bReadKey(noteId),'1'); }catch(e){}
}

function bAttachScrollTracker(){
  const modal = document.getElementById('modal');
  if(!modal) return;
  if(bScrollHandler) modal.removeEventListener('scroll', bScrollHandler);
  bScrollHandler = function(){
    if(bScrollUnlocked) return;
    const scrolled = modal.scrollTop;
    const total = modal.scrollHeight - modal.clientHeight;
    if(total <= 0) return;
    const pct = Math.min(scrolled / total, 1);
    bScrollProgress = pct;
    bUpdateScrollLock(pct);
    if(pct >= 0.92){
      bScrollUnlocked = true;
      bMarkNoteRead(currentNote);
      bUnlockBreathe();
    }
  };
  modal.addEventListener('scroll', bScrollHandler, {passive:true});
}

function bUpdateScrollLock(pct){
  const btn = document.getElementById('btn-breathe');
  const fill = document.getElementById('breathe-btn-fill');
  const lbl = document.getElementById('breathe-btn-label');
  if(!btn || bScrollUnlocked || breatheOn) return;
  if(fill) fill.style.width = (pct * 100) + '%';
  if(pct > 0.04){
    btn.classList.add('b-unlocking');
    btn.classList.remove('b-locked');
    if(lbl && lbl.textContent !== 'Keep reading\u2026') lbl.textContent = 'Keep reading\u2026';
    btn.title = 'Keep reading to unlock';
  }
}

function bUnlockBreathe(silent){
  const btn = document.getElementById('btn-breathe');
  const fill = document.getElementById('breathe-btn-fill');
  const lbl = document.getElementById('breathe-btn-label');
  if(!btn) return;
  btn.classList.remove('b-locked','b-unlocking');
  btn.style.pointerEvents = '';
  if(fill){ fill.style.width='100%'; setTimeout(()=>{ fill.style.transition='width .5s ease'; fill.style.width='0%'; },350); }
  if(lbl) lbl.textContent = 'Breathe';
  btn.title = 'Breathing mode';
  if(!silent){
    btn.classList.add('b-just-unlocked','b-ready');
    setTimeout(()=>{ btn.classList.remove('b-just-unlocked'); }, 750);
  } else {
    btn.classList.add('b-ready');
  }
}


function toggleBreathe(){
  if(!bScrollUnlocked && !breatheOn) return; // still locked
  if(!breatheOn){ vsResetSession(); bStart_(); }
  else bStop(true);
}

function bStart_(){
  // Grab live sections from current note
  const _heroEl=document.querySelector('#mcontent .n-hero-new');
  const _sectEls=Array.from(document.querySelectorAll('#mcontent .n-section'));
  bSections=_heroEl?[_heroEl,..._sectEls]:_sectEls;
  bTotal = bSections.length;
  if(bTotal === 0) return;

  breatheOn = true; bStart = Date.now(); bPaused = false;
  bCurIdx = 0; bCyclesDone = 0; bAtLast = false; bNextShown = false; bSessionSections = 0;

  document.getElementById('modal').classList.add('focus-mode');
  document.getElementById('modal').classList.add('breathe-active');
  document.getElementById('btn-breathe').classList.add('breathe-on');
  document.getElementById('breathe-btn-label').textContent = 'Breathing';
  document.getElementById('btn-breathe').classList.remove('b-ready');
  document.getElementById('b-ring-wrap').classList.add('visible');
  document.getElementById('b-reading-bar').style.display = 'block';
  document.getElementById('b-nav').classList.add('visible');
  document.getElementById('b-spine').classList.add('visible');
  showNoteNav(); updateNavLabel();

  // Build spine dots
  const spine = document.getElementById('b-spine');
  spine.innerHTML = '';
  bSections.forEach((_,i)=>{
    const d=document.createElement('div');
    d.className='b-sdot';
    d.onclick=()=>{ if(breatheOn) bJumpTo(i); };
    spine.appendChild(d);
  });

  bActivate(0);
  bStartPhase('inhale');

  // Kbd hint
  const hint = document.getElementById('b-kbd-hint');
  if(hint){ hint.classList.add('visible'); setTimeout(()=>hint.classList.remove('visible'), 4000); }
}

function bStop(showSummary=false){
  const elapsed = bStart ? Math.round((Date.now()-bStart)/1000) : 0;
  breatheOn = false;
  clearTimeout(bPhTimer); cancelAnimationFrame(bRafId);

  document.getElementById('modal').classList.remove('breathe-active','b-at-last');
  setTimeout(()=>{ document.getElementById('modal').classList.remove('focus-mode'); }, 400);
  document.getElementById('btn-breathe').classList.remove('breathe-on');
  document.getElementById('breathe-btn-label').textContent = 'Breathe';
  if(bScrollUnlocked){ document.getElementById('btn-breathe').classList.add('b-ready'); }
  document.getElementById('b-ring-wrap').classList.remove('visible');
  document.getElementById('b-reading-bar').style.display = 'none';
  document.getElementById('b-reading-fill').style.width = '0%';
  document.getElementById('b-nav').classList.remove('visible');
  document.getElementById('b-spine').classList.remove('visible');
  document.getElementById('b-next-bar').classList.remove('visible');
  const _kbdHint=document.getElementById('b-kbd-hint'); if(_kbdHint) _kbdHint.classList.remove('visible');
  hideNoteNav();

  // Clean up section classes
  bSections.forEach(s=>s.classList.remove('b-active','b-was','b-hold'));
  bAtLast = false; bNextShown = false;
  document.getElementById('modal').classList.remove('b-at-last');

  const _bStart=bStart;
  bStart = null;
  if(_bStart && elapsed > 0){
    const noteNames={pph:'Postpartum Haemorrhage',preeclampsia:'Pre-eclampsia',ectopic:'Ectopic Pregnancy',placenta:'Placenta Praevia',gdm:'Gestational Diabetes',shoulder:'Shoulder Dystocia',pretermlabour:'Preterm Labour',miscarriage:'Miscarriage',cordprolapse:'Cord Prolapse',abruption:'Placental Abruption',iol:'Induction of Labour',obstetriccholestasis:'Obstetric Cholestasis',ovarycyst:'Ovarian Cysts',cervicalcancer:'Cervical Cancer',endometriosis:'Endometriosis',pcos:'PCOS',fibroids:'Uterine Fibroids',pid:'Pelvic Inflammatory Disease',menopause:'Menopause',vulvalconditions:'Vulval Conditions',ovariancancer:'Ovarian Cancer',subfertility:'Subfertility',endometrialcancer:'Endometrial Cancer',urinaryincontinence:'Urinary Incontinence',contraception:'Contraception',sexuallytransmitted:'STIs',acutegynae:'Acute Gynaecology'};
    const sess={ id:Date.now(), noteId:currentNote, topic:noteNames[currentNote]||currentNote, duration:elapsed, sections:bSessionSections, feeling:null, date:new Date().toISOString() };
    bAddSession(sess);
    // Save breathe session to Supabase
    if(typeof saveBreatheSession === 'function') saveBreatheSession(currentNote);
    if(showSummary) setTimeout(()=>bShowSummary(sess), 600);
  }
}

// ── Smart scroll — fully reveal section ──
function bActivate(idx){
  if(idx<0||idx>=bSections.length) return;
  bSections.forEach((s,i)=>{ s.classList.remove('b-active','b-was','b-hold'); if(i<idx) s.classList.add('b-was'); });
  bSections[idx].classList.add('b-active');
  const modal = document.getElementById('modal');
  if(modal){
    // Scroll within modal — account for sticky mbar at top
    const mbar    = modal.querySelector('.mbar');
    const mbarH   = mbar ? mbar.offsetHeight : 58;
    const el      = bSections[idx];
    const modalRect = modal.getBoundingClientRect();
    const elRect  = el.getBoundingClientRect();
    const elH     = el.offsetHeight;
    const availH  = modal.clientHeight - mbarH;
    const margin  = 32;
    const elTopInModal = elRect.top - modalRect.top - mbarH;
    let scrollTop;
    if(elH <= availH - margin*2){
      scrollTop = modal.scrollTop + elTopInModal - Math.floor((availH - elH)/2);
    } else {
      scrollTop = modal.scrollTop + elTopInModal - margin;
    }
    modal.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
    modal.classList.toggle('b-at-last', (idx === bTotal-1));
  }
  // Spine + progress
  document.querySelectorAll('#b-spine .b-sdot').forEach((d,i)=>{
    d.className='b-sdot'+(i<idx?' b-done':i===idx?' b-active':'');
  });
  const fill = document.getElementById('b-reading-fill');
  if(fill) fill.style.width = (bTotal > 1 ? (idx/(bTotal-1))*100 : 100)+'%';
  bCyclesDone = 0;
  bSessionSections = Math.max(bSessionSections, idx+1);
  bAtLast = (idx === bTotal-1);
}

function bJumpTo(idx){
  clearTimeout(bPhTimer); cancelAnimationFrame(bRafId);
  bCurIdx=idx; bActivate(idx); bStartPhase('inhale');
}

function bSkipFwd(){
  if(!breatheOn||bPaused) return;
  clearTimeout(bPhTimer); cancelAnimationFrame(bRafId);
  bSections[bCurIdx]?.classList.remove('b-hold');
  bAdvance();
}
function bSkipBack(){
  if(!breatheOn||bPaused) return;
  clearTimeout(bPhTimer); cancelAnimationFrame(bRafId);
  bSections[bCurIdx]?.classList.remove('b-hold');
  bCurIdx=Math.max(0,bCurIdx-1);
  bActivate(bCurIdx); bStartPhase('inhale');
}

function bAdvance(){
  if(bCurIdx+1 >= bTotal){
    bOnLast(); return;
  }
  bCurIdx++;
  bActivate(bCurIdx);
  bStartPhase('inhale');
}

function bOnLast(){
  bAtLast=true; bCyclesDone=0; bStartPhase('inhale');
  const bar=document.getElementById('b-next-bar');
  if(!bar) return;
  const idx=NOTE_ORDER.indexOf(currentNote);
  const nextId=idx<NOTE_ORDER.length-1?NOTE_ORDER[idx+1]:null;
  const nextName=nextId?(NOTE_NAMES_NAV[nextId]||nextId):null;
  const goBtn=bar.querySelector('.b-next-go');
  const titleEl=document.getElementById('b-next-title');
  if(nextName){
    if(titleEl) titleEl.textContent=nextName;
    if(goBtn){ goBtn.textContent='Continue →'; goBtn.style.display=''; }
  } else {
    if(titleEl) titleEl.textContent='Last note — you are done.';
    if(goBtn) goBtn.style.display='none';
  }
  bar.dataset.nextId=nextId||'';
  bar.classList.add('visible');
  bNextShown=true;
  const navEl=document.getElementById('b-nav');
  if(navEl) navEl.classList.remove('visible');
  setTimeout(()=>{
    const modal=document.getElementById('modal');
    if(modal) modal.scrollTo({top:modal.scrollHeight,behavior:'smooth'});
  },100);
}

function bGoNextNote(){
  const nextId = document.getElementById('b-next-bar').dataset.nextId;
  document.getElementById('b-next-bar').classList.remove('visible');
  // Save this note's cards into session BEFORE stopping
  if(bStart){
    const noteId=currentNote;
    const noteName=(VS_NOTE_NAMES[noteId]||NOTE_NAMES_NAV[noteId]||noteId);
    const mcqs=(NOTES_MCQ[noteId]||[]);
    const noteCards=vsPickCards(mcqs,noteId,noteName);
    vsSessionNotes.push({noteId,noteName,cards:noteCards});
  }
  bStop(false); // stop without showing summary
  if(nextId) openNote(nextId);
  if(nextId) setTimeout(()=>{ bStart_(); }, 400); // continue session, no reset
}
function bDismissNextNote(){
  document.getElementById('b-next-bar').classList.remove('visible');
  document.getElementById('b-nav').classList.add('visible');
}

// ── Phase engine ──
function bStartPhase(p){
  if(!breatheOn) return;
  bPhase = p;
  const dur = bPhaseDur(p);
  const phaseLabels = {inhale:'inhale',hold:'hold',exhale:'exhale'};
  const lbl = document.getElementById('b-phase-label');
  if(lbl) lbl.textContent = phaseLabels[p] || p;

  if(p==='hold') bSections[bCurIdx]?.classList.add('b-hold');
  else           bSections[bCurIdx]?.classList.remove('b-hold');

  bAnimateArc(p, dur);
  if(dur===0){ bNextPhase(); return; }
  bPhTimer = setTimeout(()=>{ if(!breatheOn||bPaused)return; bNextPhase(); }, dur);
}

function bNextPhase(){
  if(bPhase==='inhale')      bStartPhase('hold');
  else if(bPhase==='hold')   bStartPhase('exhale');
  else {
    bCyclesDone++;
    if(bCyclesDone >= PREFS.cycles){
      if(!bNextShown) bAdvance();
      else bStartPhase('inhale');
    } else {
      bStartPhase('inhale');
    }
  }
}

// ── Arc animation + countdown ──
function bAnimateArc(p, dur){
  cancelAnimationFrame(bRafId);
  const arc   = document.getElementById('b-r-arc');
  const secEl = document.getElementById('b-core-sec');
  const start = performance.now();

  function frame(now){
    if(!breatheOn||bPaused) return;
    const elapsed = now - start;
    const t = Math.min(elapsed/Math.max(dur,1), 1);
    let offset;
    if(p==='inhale')    offset = BCIRC*(1-t);
    else if(p==='hold') offset = 0;
    else                offset = BCIRC*t;
    arc.style.strokeDashoffset = offset;
    arc.style.transition = 'none';
    secEl.textContent = Math.max(1, Math.ceil((dur-elapsed)/1000));
    if(t<1) bRafId = requestAnimationFrame(frame);
  }
  bRafId = requestAnimationFrame(frame);
}

// ── Pause ──
function bTogglePause(){
  if(!breatheOn) return;
  bPaused = !bPaused;
  const lbl = document.getElementById('b-pause-lbl');
  if(bPaused){
    clearTimeout(bPhTimer); cancelAnimationFrame(bRafId);
    lbl.textContent = '▶';
    const pl = document.getElementById('b-phase-label');
    if(pl) pl.textContent = 'paused';
  } else {
    lbl.textContent = '⏸';
    bStartPhase(bPhase);
  }
}

// ── Summary ──
const VS_NOTE_NAMES={pph:'Postpartum Haemorrhage',preeclampsia:'Pre-eclampsia',ectopic:'Ectopic Pregnancy',placenta:'Placenta Praevia',gdm:'Gestational Diabetes',shoulder:'Shoulder Dystocia',pretermlabour:'Preterm Labour',miscarriage:'Miscarriage',cordprolapse:'Cord Prolapse',abruption:'Placental Abruption',iol:'Induction of Labour',obstetriccholestasis:'Obstetric Cholestasis',ovarycyst:'Ovarian Cysts',cervicalcancer:'Cervical Cancer',endometriosis:'Endometriosis',pcos:'PCOS',fibroids:'Uterine Fibroids',pid:'Pelvic Inflammatory Disease',menopause:'Menopause',vulvalconditions:'Vulval Conditions',ovariancancer:'Ovarian Cancer',subfertility:'Subfertility',endometrialcancer:'Endometrial Cancer',urinaryincontinence:'Urinary Incontinence',contraception:'Contraception',sexuallytransmitted:'STIs',acutegynae:'Acute Gynaecology'};

// ── Ventilation Summary ──
let vsCurrentSess=null, vsCards=[], vsCurIdx=0, vsMarks=[], vsAnswerShown=false;
let vsSessionNotes=[]; // accumulates all notes studied in one breathing session

function bShowSummary(sess){
  vsCurrentSess=sess;
  const noteId=sess.noteId||sess.topic;
  const noteName=(VS_NOTE_NAMES[noteId]||NOTE_NAMES_NAV[noteId]||sess.topic||noteId);
  const mcqs=(NOTES_MCQ[noteId]||[]);
  const noteCards=vsPickCards(mcqs,noteId,noteName);
  vsSessionNotes.push({noteId,noteName,cards:noteCards});
  // Flatten all session note cards and shuffle randomly
  let allCards=[];
  vsSessionNotes.forEach(n=>allCards=allCards.concat(n.cards));
  for(let i=allCards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[allCards[i],allCards[j]]=[allCards[j],allCards[i]];}
  vsCards=allCards;
  vsCurIdx=0; vsMarks=vsCards.map(()=>null); vsAnswerShown=false;
  const dur=bFmtDur(sess.duration||0);
  const noteCount=vsSessionNotes.length;
  document.getElementById('vs-title').innerHTML='Test your <em>recall.</em>';
  document.getElementById('vs-meta').innerHTML=
    noteCount>1
      ? `<span class="vs-meta-note">${noteCount} notes studied</span><span class="vs-meta-dot"></span>${vsCards.length} questions`
      : `<span class="vs-meta-note">${noteName}</span><span class="vs-meta-dot"></span>${dur}<span class="vs-meta-dot"></span>${sess.sections||0} sections`;
  // Show intro screen first — let user choose to test or go back
  document.getElementById('vs-finish').classList.remove('show');
  document.getElementById('vs-question-view').style.display='none';
  // Update intro sub text
  const introSub=document.getElementById('vs-intro-sub');
  if(introSub) introSub.textContent=vsCards.length+' questions across '+vsSessionNotes.length+(vsSessionNotes.length===1?' note':' notes')+' — one at a time, randomised.';
  document.getElementById('vs-intro').classList.add('show');
  document.getElementById('vs-progress').style.display='none';
  document.getElementById('breathe-summary').classList.add('show');
}

function vsStartQuestions(){
  document.getElementById('vs-intro').classList.remove('show');
  document.getElementById('vs-question-view').style.display='';
  document.getElementById('vs-progress').style.display='';
  vsRenderProgress();
  vsShowQuestion(0);
}

function vsResetSession(){
  vsSessionNotes=[];
  // Clear rotation tracking so fresh session gets varied questions
  Object.keys(vsNoteSeenMap).forEach(k=>{ if(vsNoteSeenMap[k]) vsNoteSeenMap[k].clear(); });
  const intro=document.getElementById('vs-intro');
  if(intro) intro.classList.remove('show');
}

// Track which MCQ indices have been used per note for rotation
const vsNoteSeenMap={}; // { noteId: Set of used indices }

function vsPickCards(mcqs,noteId,noteName){
  if(!mcqs||!mcqs.length) return [
    {noteId,noteName,q:'What is the key concept from this note?',a:'Review the key section.',exp:''},
    {noteId,noteName,q:'What is the classic exam presentation for this topic?',a:'Review the classic pattern section.',exp:''},
    {noteId,noteName,q:'What is the most important clinical trap here?',a:'Review the trap zone section.',exp:''}
  ];

  // Rotation logic: track seen questions per note
  if(!vsNoteSeenMap[noteId]) vsNoteSeenMap[noteId]=new Set();
  const seen=vsNoteSeenMap[noteId];

  // If we've used ≥ all MCQs (or ≥ 4 cycles worth), reset
  if(seen.size>=mcqs.length) seen.clear();

  // Get unseen questions
  const unseen=mcqs.map((m,i)=>i).filter(i=>!seen.has(i));

  // Classify unseen questions
  function classify(m){
    const t=(m.focus||m.q).toLowerCase();
    if(/mechanism|pathophysi|why does|receptor|enzyme|cascade|pharmacol|inhibit/.test(t)) return 'hard';
    if(/definition|what is|first.line|most common|classic|enumerate|name the|list the/.test(t)) return 'easy';
    return 'medium';
  }
  const sh=a=>[...a].sort(()=>Math.random()-.5);
  const buckets={easy:[],medium:[],hard:[]};
  unseen.forEach(i=>buckets[classify(mcqs[i])].push(i));
  const eS=sh(buckets.easy),mS=sh(buckets.medium),hS=sh(buckets.hard),aS=sh(unseen);
  const picked=[];
  const take=pool=>{for(const i of pool){if(!picked.includes(i)&&picked.length<3){picked.push(i);return;}}};
  take(eS);take(mS);take(hS);
  if(picked.length<3) for(const i of aS){if(!picked.includes(i)&&picked.length<3) picked.push(i);}

  // Mark as seen
  picked.forEach(i=>seen.add(i));

  return picked.map(i=>({
    noteId,noteName,
    q:vsMakeQuestion(mcqs[i]),
    a:mcqs[i].opts[mcqs[i].ans],
    exp:mcqs[i].exp?mcqs[i].exp.replace(/<[^>]+>/g,''):'',
    rawA:mcqs[i].opts[mcqs[i].ans]
  }));
}

function vsMakeQuestion(m){
  // Use the full MCQ question — the scenario IS the context
  const q=(m.q||'').trim();
  return q.endsWith('?')?q:q+'?';
}

function vsRenderProgress(){
  const el=document.getElementById('vs-progress');
  el.innerHTML=vsCards.map((_,i)=>`<div class="vs-pip ${i<vsCurIdx?'done':i===vsCurIdx?'active':''}" id="vs-pip-${i}"></div>`).join('');
}

function vsUpdatePips(){
  vsCards.forEach((_,i)=>{
    const p=document.getElementById('vs-pip-'+i);
    if(p) p.className='vs-pip '+(i<vsCurIdx?'done':i===vsCurIdx?'active':'');
  });
}

function vsFormatAnswer(c){
  // Strip all HTML tags from exp
  const stripHtml=s=>(s||'').replace(/<[^>]+>/g,' ').replace(/\s{2,}/g,' ').trim();
  const exp=stripHtml(c.exp);
  const ans=(c.a||'').trim();

  if(!exp && !ans) return '<span style="opacity:.35;font-style:italic">No answer recorded.</span>';

  // exp contains the full clinical explanation — it's the real answer
  // Try to extract list items from it

  // Strategy 1: explicit numbered list "1. X 2. Y" or "(1) X (2) Y"
  const numMatch=exp.match(/(?:(?:^|\.\s+|\:\s+)(?:\d+[.)]\s+|\(\d+\)\s*))(.+?)(?=(?:\s+\d+[.)]\s|\s+\(\d+\))|$)/gs);
  if(numMatch && numMatch.length>=2){
    const items=numMatch.map(s=>s.replace(/^[\s\d.)(:]+/,'').trim()).filter(s=>s.length>3);
    if(items.length>=2){
      return renderList(ans,items,'numbered');
    }
  }

  // Strategy 2: colon then items (e.g. "The 4 Ts: Tone, Trauma, Tissue, Thrombin")
  const colonIdx=exp.indexOf(':');
  if(colonIdx>0 && colonIdx<80){
    const before=exp.slice(0,colonIdx).trim();
    const after=exp.slice(colonIdx+1).trim();
    // Comma-separated short items
    const commas=after.split(/,\s+/);
    if(commas.length>=3 && commas.every(s=>s.split(' ').length<=6)){
      return renderList(before+':',commas,'comma');
    }
  }

  // Strategy 3: sentences separated by full stops that each contain a distinct point
  // Only if exp is long enough and has 3+ sentences
  const sentences=exp.split(/(?<=\.)\s+/).map(s=>s.trim()).filter(s=>s.length>10&&s.length<200);
  if(sentences.length>=3 && exp.length>150){
    return renderList(ans,sentences,'sentences');
  }

  // Fallback: show exp as clean prose with answer headline
  const headline=ans&&ans.length<100?
    `<div style="font-weight:600;color:#f4f0e8;margin-bottom:8px;font-size:14px;">${ans}</div>`:'';
  return `${headline}<div style="font-size:13px;color:rgba(244,240,232,.82);line-height:1.7;">${exp}</div>`;

  function renderList(headline,items,type){
    const hl=headline&&headline.length<100?
      `<div style="font-weight:600;color:#f4f0e8;margin-bottom:10px;font-size:14px;">${headline}</div>`:'';
    const rows=items.map((it,i)=>{
      const num=type==='numbered'||type==='sentences'?
        `<span class="vs-ans-n">${i+1}</span>`:
        `<span class="vs-ans-n">·</span>`;
      return `<div class="vs-ans-item">${num}<span>${it.replace(/\.$/,'')}</span></div>`;
    }).join('');
    return `${hl}<div class="vs-ans-list">${rows}</div>`;
  }
}

function vsShowQuestion(idx){
  vsCurIdx=idx; vsAnswerShown=false;
  const c=vsCards[idx];
  document.getElementById('vs-q-num').textContent=`${idx+1} / ${vsCards.length}`;
  document.getElementById('vs-q-text').textContent=c.q;
  const aa=document.getElementById('vs-answer-area');
  aa.classList.remove('open');
  document.getElementById('vs-ans-text').innerHTML=vsFormatAnswer(c);
  document.getElementById('vs-ans-exp').style.display='none';
  document.getElementById('vs-self-lbl').style.display='none';
  vsUpdatePips();
  vsRenderControls();
}

function vsRenderControls(){
  const el=document.getElementById('vs-controls');
  const isLast=(vsCurIdx===vsCards.length-1);
  if(!vsAnswerShown){
    el.innerHTML=`<button class="vs-btn-reveal" onclick="vsReveal()">Reveal answer</button>`;
  } else {
    // After reveal: mark got/missed + next
    const markHtml=`
      <div class="vs-eval-row" style="flex:1;display:flex;gap:6px;">
        <button class="vs-mark-btn got ${vsMarks[vsCurIdx]==='got'?'sel':''}" onclick="vsMark('got')">✓ Got it</button>
        <button class="vs-mark-btn missed ${vsMarks[vsCurIdx]==='missed'?'sel':''}" onclick="vsMark('missed')">✗ Missed</button>
      </div>
      <button class="vs-btn-next" onclick="${isLast?'vsFinish()':'vsNext()'}">${isLast?'Finish':'Next →'}</button>`;
    el.innerHTML=markHtml;
  }
}

function vsReveal(){
  vsAnswerShown=true;
  document.getElementById('vs-answer-area').classList.add('open');
  document.getElementById('vs-self-lbl').style.display='block';
  vsRenderControls();
}

function vsMark(result){
  vsMarks[vsCurIdx]=result;
  // update button sel state
  document.querySelectorAll('.vs-mark-btn').forEach(b=>{
    b.classList.toggle('sel', b.classList.contains(result));
  });
}

function vsNext(){
  if(vsCurIdx<vsCards.length-1) vsShowQuestion(vsCurIdx+1);
}

function vsFinish(){
  const noteId=vsCurrentSess?.noteId||vsCurrentSess?.topic;
  const noteName=(typeof VS_NOTE_NAMES!=='undefined'?VS_NOTE_NAMES[noteId]:null)
    ||(typeof NOTE_NAMES_NAV!=='undefined'?NOTE_NAMES_NAV[noteId]:null)
    ||(typeof NOTE_NAMES!=='undefined'?NOTE_NAMES[noteId]:null)
    ||vsCurrentSess?.topic||noteId;
  const missedCards=vsCards.filter((_,i)=>vsMarks[i]==='missed');
  const gotCards=vsCards.filter((_,i)=>vsMarks[i]==='got');
  if(missedCards.length) vlAddMissed(noteId,noteName,missedCards.map(c=>({q:c.q,a:c.a,exp:c.exp})));
  vlUpdateBadge();

  // Track per-topic performance for the log
  vsTrackTopicScore(vsCards, vsMarks);

  const got=gotCards.length;
  const total=vsCards.length;
  const msgs=[
    {h:'Well <em>ventilated.</em>',s:'Every answer landed. Your memory is holding.'},
    {h:'Getting <em>there.</em>',s:'Some gaps — the missed questions are saved in your Log.'},
    {h:'Back to the <em>note.</em>',s:'Missed questions saved. Read once more, then retry.'}
  ];
  const msg=got===total?msgs[0]:got>=total/2?msgs[1]:msgs[2];
  document.getElementById('vs-finish-h').innerHTML=msg.h;
  document.getElementById('vs-finish-sub').textContent=`${got} of ${total} recalled · ${missedCards.length?missedCards.length+' saved to your Log':'Nothing missed'}`;
  document.getElementById('vs-question-view').style.display='none';
  document.getElementById('vs-finish').classList.add('show');
}

function vsTrackTopicScore(cards, marks){
  try{
    const raw=localStorage.getItem('vent-topic-scores');
    const scores=raw?JSON.parse(raw):{};
    // Group by noteId
    const byNote={};
    cards.forEach((c,i)=>{
      if(!byNote[c.noteId]) byNote[c.noteId]={noteId:c.noteId,noteName:c.noteName,got:0,missed:0};
      if(marks[i]==='got') byNote[c.noteId].got++;
      else if(marks[i]==='missed') byNote[c.noteId].missed++;
    });
    Object.values(byNote).forEach(({noteId,noteName,got,missed})=>{
      if(!scores[noteId]) scores[noteId]={noteId,noteName,got:0,missed:0,sessions:0};
      scores[noteId].got+=got;
      scores[noteId].missed+=missed;
      scores[noteId].sessions+=1;
      scores[noteId].noteName=noteName; // keep fresh
    });
    localStorage.setItem('vent-topic-scores',JSON.stringify(scores));
  }catch(e){}
}

function vsKeepVentilating(){
  document.getElementById('breathe-summary').classList.remove('show');
  // Don't reset session — user continues studying. Restart breathing mode on current note.
  setTimeout(()=>{ if(!breatheOn) bStart_(); }, 300);
}

function vsConfirmClose(){
  document.getElementById('vs-confirm').classList.add('show');
}
function vsCancelClose(){
  document.getElementById('vs-confirm').classList.remove('show');
}
function vsDoClose(){
  document.getElementById('vs-confirm').classList.remove('show');
  document.getElementById('breathe-summary').classList.remove('show');
  vsResetSession();
}

function vsBackToNotes(){
  const overlay=document.getElementById('breathe-summary');
  overlay.classList.remove('show');
  vsResetSession(); // clear session on done
  // smooth: just close summary — modal is still behind it
}

function dismissBreatheSummary(){
  document.getElementById('breathe-summary').classList.remove('show');
  vlUpdateBadge();
}
function bPickFeeling(btn,val){}
function bShareSession(){ const arr=bLoadHistory();const sess=arr[0];if(!sess)return;const text='Just breathed through "'+(VS_NOTE_NAMES[sess.topic]||sess.topic)+'" — '+bFmtDur(sess.duration)+', '+sess.sections+' sections 🌬\n\nVENT — study like you breathe.';if(navigator.share){navigator.share({text,url:window.location.href}).catch(()=>{});}else{navigator.clipboard.writeText(text).catch(()=>{prompt('Copy to share:',text);});} }

document.addEventListener('DOMContentLoaded',()=>vlUpdateBadge());

// ── Keyboard ──
document.addEventListener('keydown', e=>{
  if(!breatheOn) return;
  if(document.getElementById('prefs-overlay')?.classList.contains('on')) return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown'){ e.preventDefault(); bSkipFwd(); }
  else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){ e.preventDefault(); bSkipBack(); }
  else if(e.key===' '){ e.preventDefault(); bTogglePause(); }
  else if(e.key==='Escape'){ e.preventDefault(); bStop(true); }
});

// Restore breathe on note switch (already handled in openNote below)


let currentNote = null;
let lang = 'en';

function setLang(l) {
  lang = l;
  document.body.classList.toggle('ar-mode', l === 'ar');
  ['btn-en','btn-en2'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.toggle('on', l==='en'); });
  ['btn-ar','btn-ar2'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.toggle('on', l==='ar'); });
}

// DISC TOGGLE
document.querySelectorAll('.dtab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dtab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const filter = btn.dataset.filter;
    document.querySelectorAll('#notes-grid .nc').forEach(card => {
      if (filter === 'all' || card.dataset.disc === filter) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

// FULLSCREEN
let isFullscreen = false;
function toggleFullscreen() {
  const overlay = document.getElementById('overlay');
  const btn = document.getElementById('btn-fullscreen');
  isFullscreen = !isFullscreen;
  overlay.classList.toggle('fullscreen', isFullscreen);
  btn.innerHTML = isFullscreen
    ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 1v4H1M13 5h-4V1M9 13V9h4M1 9h4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

const mcqState={};

function stub(id){return `<div class="n-hero"><div class="n-tag">${id}</div><div class="n-title">Coming soon</div><div class="n-oneliner">This note is in progress.</div></div>`;}

function openNote(id){
  currentNote=id;
  // Save progress to Supabase
  if(typeof saveNoteProgress === 'function') saveNoteProgress(id);
  const html=NOTES[id]?NOTES[id]():stub(id);
  document.getElementById('mcontent').innerHTML=html;
  // Auto-tag key content for breathe mode highlight
  document.querySelectorAll('#mcontent .n-mech-cause, #mcontent .n-section-title, #mcontent .n-pearl-num, #mcontent .n-exam-statement').forEach(el=>{
    if(!el.querySelector('.b-key')) el.innerHTML='<span class="b-key">'+el.innerHTML+'</span>';
  });
  // Wrap strong tags inside section text for highlight
  document.querySelectorAll('#mcontent .n-mech-text strong, #mcontent .n-algo-body strong, #mcontent .n-flag-text strong, #mcontent .n-pearl-body strong, #mcontent .n-diag-content strong').forEach(el=>{
    el.classList.add('b-key');
  });
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow='hidden';
  document.getElementById('modal').scrollTop=0;
  // Check if user has already read this note before
  const alreadyRead = bCheckReadMemory(id);
  bScrollUnlocked = alreadyRead;
  bScrollProgress = alreadyRead ? 1 : 0;
  const _bb = document.getElementById('btn-breathe');
  const _bl = document.getElementById('breathe-btn-label');
  const _bf = document.getElementById('breathe-btn-fill');
  if(_bb){ _bb.classList.remove('b-locked','b-unlocking','b-just-unlocked','b-ready'); }
  if(_bf){ _bf.style.transition='none'; _bf.style.width='0%'; }
  if(alreadyRead){
    if(_bb){ _bb.style.pointerEvents=''; _bb.classList.add('b-ready'); }
    if(_bl) _bl.textContent='Breathe';
  } else {
    if(_bb){ _bb.classList.add('b-locked'); _bb.style.pointerEvents=''; }
    if(_bl) _bl.textContent='Breathe';
  }
  bAttachScrollTracker();
  setLang('en');
  document.getElementById('page-note-ob').style.display='block';
  document.getElementById('page-mcq-ob').style.display='none';
  document.getElementById('mbar-note-tools').style.visibility='visible';
  // Load saved highlights
  loadHighlights(id);
  dismissVentPopup();
  // Restore breathe state on note switch — re-grab sections for new note
  if(breatheOn){
    // Re-init sections for the new note content
    setTimeout(()=>{
      const _heroEl=document.querySelector('#mcontent .n-hero-new');
  const _sectEls=Array.from(document.querySelectorAll('#mcontent .n-section'));
  bSections=_heroEl?[_heroEl,..._sectEls]:_sectEls;
      bTotal = bSections.length;
      bCurIdx = 0; bCyclesDone = 0; bAtLast = false; bNextShown = false; bSessionSections = 0;
      bAtLast = false;
      document.getElementById('b-next-bar').classList.remove('visible');
      document.getElementById('b-nav').classList.add('visible');
      // Rebuild spine
      const spine = document.getElementById('b-spine');
      spine.innerHTML = '';
      bSections.forEach((_,i)=>{ const d=document.createElement('div'); d.className='b-sdot'; d.onclick=()=>{ if(breatheOn) bJumpTo(i); }; spine.appendChild(d); });
      bActivate(0); bStartPhase('inhale');
    }, 50);
    showNoteNav(); updateNavLabel();
  }
}

// Load font size once on page ready
document.addEventListener('DOMContentLoaded', loadFontSize);
function closeModal(){
  document.getElementById('overlay').classList.remove('open','fullscreen');
  document.body.style.overflow='';
  isFullscreen=false;
  const btn=document.getElementById('btn-fullscreen');
  if(btn) btn.innerHTML='<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  dismissVentPopup();
  // Stop breathe if active
  if(breatheOn) bStop(false);
  // Restore toolbar visibility
  const tools = document.getElementById('mbar-note-tools');
  if(tools) tools.style.visibility='visible';
  hideHlPopup();
}
function closeBg(e){if(e.target===document.getElementById('overlay'))closeModal();}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

function showVentPopup(){
  document.getElementById('vent-popup').classList.add('show');
  document.getElementById('vent-backdrop').classList.add('show');
}
function dismissVentPopup(){
  document.getElementById('vent-popup').classList.remove('show');
  document.getElementById('vent-backdrop').classList.remove('show');
}
function startMCQ(){
  dismissVentPopup();
  if(!NOTES_MCQ[currentNote]||NOTES_MCQ[currentNote].length===0){return;}
  if(!mcqState[currentNote]){
    mcqState[currentNote]={current:0,answers:Array(NOTES_MCQ[currentNote].length).fill(null)};
  }
  document.getElementById('page-note-ob').style.display='none';
  document.getElementById('page-mcq-ob').style.display='block';
  document.getElementById('mcq-inner-ob').innerHTML=renderQuestion(currentNote);
  document.getElementById('modal').scrollTop=0;
  // Hide note toolbar when MCQ is open
  document.getElementById('mbar-note-tools').style.visibility='hidden';
}
function backToNote(){
  document.getElementById('page-mcq-ob').style.display='none';
  document.getElementById('page-note-ob').style.display='block';
  document.getElementById('modal').scrollTop=0;
  document.getElementById('mbar-note-tools').style.visibility='visible';
}
function renderQuestion(noteId){
  const state=mcqState[noteId];
  const mcqs=NOTES_MCQ[noteId];
  const qi=state.current,total=mcqs.length,q=mcqs[qi];
  const letters=['A','B','C','D','E'];
  const pct=Math.round((qi/total)*100);
  let dots='';
  for(let i=0;i<total;i++) dots+=`<div class="mcq-dot ${i<qi?'done':i===qi?'current':''}"></div>`;
  return `<div class="mcq-room-header">
    <span class="mcq-room-label">// Test yourself</span>
    <div style="display:flex;align-items:center;gap:16px;"><span class="mcq-room-note-title">${qi+1} of ${total}</span><button onclick="backToNote()" style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,.3);background:none;border:1px solid rgba(255,255,255,.1);padding:5px 12px;cursor:pointer;transition:all .2s;" onmouseover="this.style.color='rgba(255,255,255,.7)';this.style.borderColor='rgba(255,255,255,.3)';" onmouseout="this.style.color='rgba(255,255,255,.3)';this.style.borderColor='rgba(255,255,255,.1)';">&#8592; Note</button></div>
  </div>
  <div class="mcq-progress-strip"><div class="mcq-progress-fill" style="width:${pct}%"></div></div>
  <div class="mcq-body">
    <div class="mcq-counter">
      <span class="mcq-counter-q">Question ${qi+1} of ${total}</span>
      <div class="mcq-counter-dots">${dots}</div>
    </div>
    <div class="mcq-q-wrap">
      <div class="mcq-q-num">Question ${qi+1}</div>
      <div class="mcq-q-text">${q.q}</div>
    </div>
    <div class="mcq-opts-list" id="ob-opts-${noteId}">
      ${q.opts.map((o,i)=>`<button class="mcq-opt-btn" onclick="selectOpt('${noteId}',${i})">
        <span class="mcq-opt-ltr">${letters[i]}</span><span class="mcq-opt-txt">${o}</span>
      </button>`).join('')}
    </div>
    <div class="mcq-next-wrap">
      <button class="mcq-next-btn" id="ob-next-${noteId}" onclick="nextQuestion('${noteId}')" disabled>
        ${qi+1<total?'Next &rarr;':'See results &rarr;'}
      </button>
    </div>
  </div>`;
}
function selectOpt(noteId,oi){
  const state=mcqState[noteId];
  if(state.answers[state.current]!==null)return;
  state.answers[state.current]=oi;
  document.querySelectorAll(`#ob-opts-${noteId} .mcq-opt-btn`).forEach((b,i)=>{
    b.classList.add('answered');
    if(i===oi)b.classList.add('selected');
  });
  document.getElementById(`ob-next-${noteId}`).disabled=false;
}
function nextQuestion(noteId){
  const state=mcqState[noteId];
  if(state.current+1<NOTES_MCQ[noteId].length){state.current++;document.getElementById('mcq-inner-ob').innerHTML=renderQuestion(noteId);}
  else showResults(noteId);
}
function showResults(noteId){
  const state=mcqState[noteId],mcqs=NOTES_MCQ[noteId],letters=['A','B','C','D','E'];
  let correct=0,missed=[];
  mcqs.forEach((q,i)=>{if(state.answers[i]===q.ans)correct++;else missed.push(q.focus||'Review this topic');});
  const pct=Math.round((correct/mcqs.length)*100);
  const gc=pct>=80?'#4db87a':pct>=60?'#c8a040':'#e05a5a';
  const gl=pct===100?'Perfect score.':pct>=80?'Well ventilated.':pct>=60?'Getting there.':'Back to the note.';
  const gs=pct===100?'Every concept landed.':pct>=80?'Solid. Review what you missed.':pct>=60?'Good base. Some gaps to close.':"That's okay. Read the note again, then retry.";
  let html=`<div class="mcq-room-header"><span class="mcq-room-label">// Results</span><div style="display:flex;align-items:center;gap:16px;"><span class="mcq-room-note-title">${correct}/${mcqs.length} correct</span><button onclick="backToNote()" style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,.3);background:none;border:1px solid rgba(255,255,255,.1);padding:5px 12px;cursor:pointer;transition:all .2s;" onmouseover="this.style.color='rgba(255,255,255,.7)';this.style.borderColor='rgba(255,255,255,.3)';" onmouseout="this.style.color='rgba(255,255,255,.3)';this.style.borderColor='rgba(255,255,255,.1)';">&#8592; Note</button></div></div>
  <div class="mcq-progress-strip"><div class="mcq-progress-fill" style="width:${pct}%"></div></div>
  <div class="res-hero">
    <div class="res-circle" style="border-color:${gc}">
      <div class="res-circle-num" style="color:${gc}">${correct}/${mcqs.length}</div>
      <div class="res-circle-pct" style="color:${gc}">${pct}%</div>
    </div>
    <div><div class="res-hero-grade">${gl}</div><div class="res-hero-sub">${gs}</div></div>
  </div>
  <div class="res-body">`;
  if(missed.length){const u=[...new Set(missed)];html+=`<div class="res-section-lbl">Focus on</div><div class="res-focus-box">${u.map(m=>`<div class="res-focus-item">${m}</div>`).join('')}</div>`;}
  html+=`<div class="res-section-lbl">Full breakdown</div><div class="res-qlist">`;
  mcqs.forEach((q,i)=>{
    const ch=state.answers[i],ok=ch===q.ans;
    html+=`<div class="res-qblock ${ok?'res-right':'res-wrong'}">
      <div class="res-qblock-header"><span class="res-qbadge ${ok?'right':'wrong'}">${ok?'&#10003; Correct':'&#10007; Incorrect'}</span><span class="res-qblock-num">Q${i+1}</span></div>
      <div class="res-qblock-q">${q.q}</div>
      <div class="res-opts-wrap">${q.opts.map((o,oi)=>`<div class="res-opt${oi===q.ans?' correct':oi===ch?' chosen-wrong':''}"><span class="res-opt-ltr">${letters[oi]}</span><span>${o}${oi===q.ans?' &#10003;':oi===ch?' &#10007;':''}</span></div>`).join('')}</div>
      <div class="res-explain-block"><div class="res-explain-lbl">Why</div><div class="res-explain-txt">${q.exp}</div></div>
    </div>`;
  });
  html+=`</div><div class="res-actions">
    <button class="res-btn-retry" onclick="retryMCQ('${noteId}')">&#8635; Retry</button>
    <button class="res-btn-back" onclick="backToNote()">&#8592; Back to note</button>
  </div></div>`;
  document.getElementById('mcq-inner-ob').innerHTML=html;
}
function retryMCQ(noteId){
  mcqState[noteId]={current:0,answers:Array(NOTES_MCQ[noteId].length).fill(null)};
  document.getElementById('mcq-inner-ob').innerHTML=renderQuestion(noteId);
}

const NOTES={};

const NOTES_MCQ={};
NOTES.pph=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Emergency</div>
  <div class="n-hero-title">Postpartum<br><em>Haemorrhage</em></div>
  <div class="n-hero-sub">PPH &nbsp;·&nbsp; ICD O72 &nbsp;·&nbsp; Leading cause of maternal mortality worldwide</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Blood loss <strong>&gt;500 mL</strong> after vaginal delivery or <strong>&gt;1000 mL</strong> after caesarean within 24 hours. Severe: &gt;1000 mL with haemodynamic compromise.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">1 in 10 deliveries. Risk spikes with <strong>grand multiparity, overdistension</strong> (twins, polyhydramnios), prolonged labour, operative delivery, prior uterine surgery.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Kills <strong>~70,000 women/year</strong> globally. Most are preventable. Death occurs within hours — early recognition and the 4 Ts are everything.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The 4 Ts Framework</span><span class="n-section-tag">cause = treatment</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">The 4 Ts — bar width = incidence</span>
      <span class="n-viz-sub">Assess all four simultaneously</span>
    </div>
    <svg viewBox="0 0 760 190" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="320" height="190" rx="2" fill="#c8452a"/>
      <text x="160" y="44" font-family="Syne,sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="800">TONE</text>
      <rect x="30" y="54" width="260" height="18" rx="9" fill="rgba(255,255,255,.18)"/>
      <text x="160" y="67" font-family="JetBrains Mono,monospace" font-size="10" fill="white" text-anchor="middle" font-weight="700">70% of all PPH</text>
      <text x="160" y="102" font-family="JetBrains Mono,monospace" font-size="12" fill="rgba(255,255,255,.82)" text-anchor="middle">Uterine atony</text>
      <text x="160" y="122" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.58)" text-anchor="middle">Soft, boggy, non-contracting uterus</text>
      <text x="160" y="158" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.32)" text-anchor="middle">Feel the fundus first. Always.</text>
      <rect x="328" y="22" width="188" height="168" rx="2" fill="#8a2818"/>
      <text x="422" y="58" font-family="Syne,sans-serif" font-size="22" fill="white" text-anchor="middle" font-weight="800">TRAUMA</text>
      <text x="422" y="78" font-family="JetBrains Mono,monospace" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle">20%</text>
      <text x="422" y="108" font-family="JetBrains Mono,monospace" font-size="11" fill="rgba(255,255,255,.8)" text-anchor="middle">Lacerations</text>
      <text x="422" y="126" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle">Uterine rupture</text>
      <text x="422" y="166" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.32)" text-anchor="middle">Uterus firm → still bleeding</text>
      <rect x="524" y="48" width="116" height="142" rx="2" fill="#5a1810"/>
      <text x="582" y="84" font-family="Syne,sans-serif" font-size="18" fill="white" text-anchor="middle" font-weight="800">TISSUE</text>
      <text x="582" y="104" font-family="JetBrains Mono,monospace" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle">9%</text>
      <text x="582" y="130" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.72)" text-anchor="middle">Retained</text>
      <text x="582" y="148" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.72)" text-anchor="middle">placenta</text>
      <text x="582" y="175" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.3)" text-anchor="middle">Incomplete on inspection</text>
      <rect x="648" y="78" width="112" height="112" rx="2" fill="#1a1510" stroke="#c8452a" stroke-width="1.5"/>
      <text x="704" y="108" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800">THROMBIN</text>
      <text x="704" y="128" font-family="JetBrains Mono,monospace" font-size="12" fill="rgba(200,69,42,.9)" text-anchor="middle">1%</text>
      <text x="704" y="152" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">DIC · HELLP</text>
      <text x="704" y="168" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.28)" text-anchor="middle">No clot at IV site</text>
    </svg>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">The Mechanism</span><span class="n-section-tag">5 causal steps</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Tone failure</div><div class="n-mech-text">Placenta separates → myometrium must contract to compress open spiral arteries → <strong>if atony, sinusoids stay open</strong> → torrential haemorrhage from the placental bed. Accounts for <strong>70% of PPH</strong>.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Trauma</div><div class="n-mech-text">Instrumented or precipitate delivery → lacerations of cervix, vagina, or perineum → <strong>brisk arterial bleeding on a firm uterus</strong>. Also includes uterine rupture and broad ligament haematoma.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Tissue retained</div><div class="n-mech-text">Retained cotyledon prevents full myometrial retraction → <strong>placental bed cannot close</strong> → persistent ooze despite uterotonics. Clue: boggy on palpation despite treatment.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Thrombin — coagulopathy</div><div class="n-mech-text">Massive haemorrhage → dilutional coagulopathy → clotting factors depleted → <strong>blood at IV sites won't clot</strong> → DIC. Also: pre-existing HELLP, abruption, amniotic fluid embolism.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d5">05</div><div class="n-mech-body"><div class="n-mech-cause">Decompensation</div><div class="n-mech-text">Young women <strong>compensate late and crash fast</strong> → normal BP masks 30% blood volume loss → when BP drops, severe shock is already established. Don't wait for hypotension to act.</div></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Soft boggy uterus + heavy bleeding after delivery → think <em>atonic PPH</em> → bimanual compression + oxytocin simultaneously.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Firm contracted uterus + heavy bleeding</strong> → this is NOT atony. Think <strong>trauma or retained products</strong>. Uterotonics will do nothing here — inspect, explore, or image.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Normal BP does not mean safe.</strong> Pregnant women compensate until 30–40% blood loss — by the time BP drops, they are already in severe haemorrhagic shock.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Placenta accreta spectrum</strong> — if placenta won't separate at LSCS, do not pull. Hysterectomy en-bloc. Manual removal causes catastrophic haemorrhage.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>TXA must be given within 3 hours.</strong> After that, the WOMAN trial shows no mortality benefit. Every minute counts.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>IV oxytocin bolus is dangerous.</strong> Rapid bolus → profound vasodilation → cardiovascular collapse. Always infusion, never IV bolus push.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Underestimating blood loss.</strong> Visual estimation is off by up to 50%. Use gravimetric measurement where possible.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Delayed escalation.</strong> Failure to call senior or activate massive transfusion protocol early is the most common preventable system failure.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Differentials</span><span class="n-section-tag">side by side</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this"><div class="n-diff-card-tag">Primary / most common</div><div class="n-diff-card-name">Uterine Atony — 70%</div><div class="n-diff-card-key"><strong>Soft, boggy uterus.</strong> Responds to bimanual compression. Uterotonics work.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag" style="color:#a03820">Differentiate by</div><div class="n-diff-card-name">Genital Tract Trauma — 20%</div><div class="n-diff-card-key"><strong>Firm uterus.</strong> Brisk visible bleeding from laceration. Uterotonics fail.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag" style="color:#6b4fa8">Differentiate by</div><div class="n-diff-card-name">Retained Placenta — 9%</div><div class="n-diff-card-key"><strong>Incomplete placenta</strong> on inspection. Soft uterus, uterotonics partially effective.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag" style="color:#2a5aa8">Differentiate by</div><div class="n-diff-card-name">Coagulopathy / DIC — 1%</div><div class="n-diff-card-key"><strong>Ooze from all sites.</strong> Blood won't clot at IV. Preceded by massive haemorrhage.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Diagnostic Strategy</span><span class="n-section-tag">step by step</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label ">Step 1</div><div class="n-diag-content"><strong>Palpate the uterus.</strong> Firm or soft? This single finding separates atony (70%) from the other 3 Ts instantly.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Step 2</div><div class="n-diag-content"><strong>Inspect the placenta for completeness.</strong> Missing cotyledon = retained tissue. If uncertain → bedside ultrasound.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Step 3</div><div class="n-diag-content"><strong>Visualise the genital tract</strong> — cervix, vagina, perineum. Good light. If uterus is firm and bleeding continues, a laceration is the diagnosis.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Gold Standard</div><div class="n-diag-content"><strong>EUA (Examination Under Anaesthesia)</strong> for suspected trauma or retained products when bedside exam is inadequate.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Common Mistake</div><div class="n-diag-content">Ordering CT before securing haemostasis. Stabilise first, image if stable. The bleeding diagnosis is clinical, not radiological.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Management</span><span class="n-section-tag">escalation ladder</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">First line</div>
  <div class="n-algo-body"><strong>Bimanual uterine compression + oxytocin infusion simultaneously.</strong> Call for help. IV access × 2, bloods (FBC, clotting, crossmatch, fibrinogen), catheterise, warm fluids.<span class="n-involve">Midwife + Obstetric registrar immediately</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">If atony persists</div>
  <div class="n-algo-body"><strong>Ergometrine IM</strong> (not in hypertension), then <strong>carboprost IM</strong> (not in asthma). Add misoprostol PR/sublingual. Give <strong>tranexamic acid 1g IV</strong> — do not delay past 3 hours.<span class="n-involve">Consultant obstetrician + anaesthetist</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">If surgical</div>
  <div class="n-algo-body"><strong>Intrauterine balloon tamponade</strong> (Bakri) — quick, reversible, 80% success. If fails: B-Lynch compression suture → bilateral uterine artery ligation.<span class="n-involve">Consultant surgeon + interventional radiology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Last resort</div>
  <div class="n-algo-body dark-body"><strong>Peripartum hysterectomy.</strong> Activate <strong>massive transfusion protocol</strong> — 1:1:1 (red cells : FFP : platelets). Target fibrinogen &gt;2 g/L.<span class="n-involve">Haematology + ICU + senior consultant</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">08</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>TXA within 3 hours.</strong> The WOMAN trial (20,000 women) showed TXA reduces PPH death by 31% when given within 3 hours of birth. After 3 hours: no benefit. Give it early.<span class="n-pearl-exam">Exam loves this: time-sensitive drug most candidates forget.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Balloon tamponade before surgery.</strong> The Bakri balloon is the bridge between uterotonics and laparotomy. If it controls the bleeding, you've avoided a B-Lynch.<span class="n-pearl-exam">Exam loves this: candidates jump straight to B-Lynch or hysterectomy.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Fibrinogen is the first factor to fall.</strong> Fibrinogen &lt;2 g/L predicts severe PPH with high sensitivity. Order it early. Treat with cryoprecipitate — FFP alone is insufficient.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Placenta accreta = do not pull.</strong> Any placenta that won't deliver with gentle traction at LSCS → call senior, prepare for hysterectomy. The attempt to deliver it manually is the catastrophe.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">09</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">The uterus is firm — keep escalating uterotonics.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>A firm uterus means atony is not the problem.</strong> Adding more uterotonics won't stop a laceration. Reassess all 4 Ts before escalating pharmacotherapy.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">BP is 110/70 — she looks okay, we have more time.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Young women compensate brilliantly until they don't.</strong> Normal BP in ongoing haemorrhage is not reassurance — it's the calm before collapse. Act on blood loss, not vital signs.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Hold TXA until coagulopathy is confirmed on labs.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Give TXA early and universally.</strong> It does not cause pathological clotting at therapeutic doses. Waiting for coagulopathy to develop is waiting too long.</div></div>
</div>
  </div>
</div><div class="n-anchor"><div class="n-anchor-text">The uterus is either <em>soft</em> or it isn't —<br>everything else follows from that one finding.</div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.preeclampsia=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Antenatal</div>
  <div class="n-hero-title">Pre-<br><em>Eclampsia</em></div>
  <div class="n-hero-sub">PET &nbsp;·&nbsp; ICD O14 &nbsp;·&nbsp; A disease of the placenta, not the blood pressure</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text"><strong>New-onset hypertension ≥140/90</strong> after 20 weeks + proteinuria or end-organ dysfunction. Severe: ≥160/110 or any end-organ feature.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">2–8% of pregnancies. Risk factors: nulliparity, prior PET, BMI &gt;35, <strong>multiples, CKD, APS, diabetes</strong>. Aspirin from 12 weeks reduces risk.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Leading cause of maternal and fetal morbidity. Eclampsia (seizures), HELLP, abruption, and fetal growth restriction are all on this spectrum.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Mechanism</span><span class="n-section-tag">placenta first</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Failed trophoblast invasion</div><div class="n-mech-text">Normally, trophoblast remodels spiral arteries into wide, low-resistance vessels. In PET, <strong>remodelling fails</strong> → high-resistance uteroplacental blood flow → placental ischaemia.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Placental factors released</div><div class="n-mech-text">Ischaemic placenta releases sFlt-1 and other anti-angiogenic factors into maternal circulation → <strong>endothelial dysfunction throughout the body</strong>.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Systemic endothelial damage</div><div class="n-mech-text">Damaged endothelium → <strong>hypertension</strong> (vasoconstriction), <strong>proteinuria</strong> (glomerular injury), <strong>thrombocytopaenia</strong> (platelet activation), <strong>hepatic capsule distension</strong> (liver swelling).</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Eclampsia / HELLP</div><div class="n-mech-text">Cerebral endothelial dysfunction → <strong>eclamptic seizures</strong>. Hepatic involvement + haemolysis + platelet consumption → <strong>HELLP syndrome</strong>. Both are end-stage manifestations.</div></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">BP ≥140/90 after 20 weeks + headache + epigastric pain → think <em>severe PET</em> → MgSO₄ + antihypertensive + deliver.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Proteinuria without hypertension</strong> is NOT preeclampsia. The diagnosis requires hypertension. Proteinuria alone may have other causes — don't treat as PET without the BP criterion.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Epigastric or RUQ pain = hepatic involvement.</strong> This is a sign of severe PET — not indigestion. Urgent assessment, consider delivery.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Headache + visual disturbance = cerebral involvement.</strong> Eclampsia is the next step. Give MgSO₄ now, do not wait for seizure.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Systolic ≥160 must be treated within 15 minutes.</strong> NICE mandates urgent antihypertensive. Labetalol IV, hydralazine IV, or nifedipine PO are first-line.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>HELLP can present without hypertension or proteinuria.</strong> Malaise + nausea + RUQ pain in pregnancy must prompt LFTs and FBC regardless of BP.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>MgSO₄ is not optional in severe PET.</strong> It reduces eclampsia risk by 58% (Magpie trial). Every unit must have it stocked.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Management</span><span class="n-section-tag">stepwise</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Mild PET</div>
  <div class="n-algo-body"><strong>BP &lt;160/110 without severe features.</strong> Antihypertensive (labetalol, nifedipine, methyldopa). Monitor: BP 4-hourly, urinalysis, bloods twice weekly. Consider timing of delivery at 37 weeks.<span class="n-involve">Joint obstetric + midwifery monitoring</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Severe PET</div>
  <div class="n-algo-body"><strong>IV labetalol or oral nifedipine</strong> to bring BP &lt;150/100. <strong>MgSO₄</strong> loading dose 4g IV over 20 min + maintenance 1g/hr. Fluid restrict to 80 mL/hr.<span class="n-involve">Senior obstetrician + anaesthetist + HDU</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Eclampsia</div>
  <div class="n-algo-body"><strong>MgSO₄ bolus 4g IV</strong> to terminate seizure. Left lateral. Airway. Oxygen. Deliver within 24–48 hours regardless of gestation.<span class="n-involve">Senior obstetric consultant + HDU</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">HELLP</div>
  <div class="n-algo-body dark-body">Platelets &lt;100 = delivery. <strong>Dexamethasone</strong> may temporise. Transfuse platelets if &lt;50 before invasive procedures. Do not delay delivery.<span class="n-involve">Haematology + ICU + senior consultant</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>MgSO₄ for seizure prevention, not control of BP.</strong> It does not lower blood pressure. It prevents eclampsia. The antihypertensive is separate.<span class="n-pearl-exam">Exam loves this: candidates confuse the roles.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Delivery cures preeclampsia — the placenta is the source.</strong> After delivery, most features resolve within 48–72 hours, though BP may worsen in the first 24 hours postpartum.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Aspirin 75–150 mg from 12 weeks</strong> reduces preeclampsia risk by 10–20% in high-risk women (prior PET, CKD, antiphospholipid syndrome, diabetes, multiple pregnancy, BMI &gt;35).</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>HELLP triad: Haemolysis, Elevated Liver enzymes, Low Platelets.</strong> Platelets fall first — check FBC if any suspicion. Can occur postpartum.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">BP is 145/95 but she feels well — continue monitoring.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Feeling well is not a criterion for safety.</strong> BP ≥140/90 after 20 weeks with proteinuria is PET regardless of symptoms. Assess for end-organ features.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Give fluids generously — she's hypertensive and might be dehydrated.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Fluid overload kills in PET.</strong> Pulmonary oedema is a leading cause of maternal death. Restrict fluids to 80 mL/hr total unless haemorrhaging.</div></div>
</div>
  </div>
</div><div class="n-anchor"><div class="n-anchor-text">The BP is the <em>symptom.</em><br>The placenta is the <em>disease.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.ectopic=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Emergency</div>
  <div class="n-hero-title">Ectopic<br><em>Pregnancy</em></div>
  <div class="n-hero-sub">ICD O00 &nbsp;·&nbsp; Ectopic until proven otherwise</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Implantation outside the uterine cavity. <strong>95% in the fallopian tube.</strong> Other sites: ovary, cervix, cornual, abdominal — all rarer, all dangerous.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">1 in 90 pregnancies. Risk: <strong>previous ectopic, PID, tubal surgery, IVF, IUCD in situ</strong>. IVF increases risk of heterotopic pregnancy.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Leading cause of maternal death in the first trimester. Rupture → haemoperitoneum → cardiovascular collapse within minutes.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Triad</span><span class="n-section-tag">classic but unreliable</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Amenorrhoea</div><div class="n-mech-text">History of missed period + positive pregnancy test. The trophoblast produces hCG regardless of implantation site. <strong>A positive test in a woman with pain = ectopic until proven otherwise.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Abdominal pain</div><div class="n-mech-text">Unilateral initially as the tube distends. Becomes generalised with rupture → haemoperitoneum → <strong>peritonism, shoulder tip pain</strong> (diaphragmatic irritation from blood). Pain does not always precede rupture.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Vaginal bleeding</div><div class="n-mech-text">Usually scanty, dark, irregular — from decidual shedding. <strong>Heavy bright bleeding suggests intrauterine pathology more than ectopic.</strong> Some women have no bleeding at all until collapse.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">The discriminatory zone</div><div class="n-mech-text">hCG ≥1500 IU/L = intrauterine pregnancy should be visible on transvaginal USS. If hCG ≥1500 and uterus is empty → <strong>ectopic until proven otherwise</strong>. Below 1500 = repeat hCG in 48 hours.</div></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Positive pregnancy test + unilateral pelvic pain + empty uterus on USS → think <em>ectopic</em> → hCG + urgent EPAU review.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>A negative urine hCG does not exclude ectopic.</strong> Urine tests require ~50 IU/L. Early ectopics can have hCG below this threshold. Use serum hCG when clinical suspicion is high.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Haemodynamic instability = ruptured ectopic until proven otherwise.</strong> Tachycardia + hypotension + peritonism after positive pregnancy test → emergency theatre immediately.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Shoulder tip pain</strong> = haemoperitoneum irritating the diaphragm. Blood under the diaphragm is referred as shoulder pain. This is a rupture sign.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Serial hCG doubling rule:</strong> Normal intrauterine pregnancy hCG rises ≥66% in 48 hours. A rise &lt;66% or a plateau = likely ectopic or non-viable IUP.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>IUCD does not prevent ectopic.</strong> It prevents intrauterine implantation — ectopic rate is paradoxically higher with IUCD because most IUPs are prevented. Positive hCG + IUCD = high ectopic suspicion.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Management</span><span class="n-section-tag">by stability and size</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Expectant</div>
  <div class="n-algo-body"><strong>hCG &lt;1000 and falling, no pain, small mass.</strong> Monitor hCG twice weekly until &lt;20 IU/L. Requires reliable follow-up. 50–70% success.<span class="n-involve">EPAU close follow-up</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Methotrexate</div>
  <div class="n-algo-body"><strong>hCG &lt;5000, unruptured, mass &lt;3.5 cm, no fetal heartbeat.</strong> IM methotrexate — inhibits trophoblast DNA synthesis. Avoid folic acid. Monitor hCG days 4 and 7.<span class="n-involve">EPAU + haematology monitoring</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Surgery — laparoscopic</div>
  <div class="n-algo-body"><strong>Salpingotomy</strong> (if contralateral tube damaged) or <strong>salpingectomy</strong> (standard). Laparoscopic approach preferred if haemodynamically stable.<span class="n-involve">Gynaecology registrar + anaesthetist</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Ruptured — emergency</div>
  <div class="n-algo-body dark-body"><strong>Immediate laparotomy.</strong> IV access, group and crossmatch, activate MTP if needed. The priority is stopping haemorrhage — the tube can wait.<span class="n-involve">Consultant + theatre team + blood bank</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Heterotopic pregnancy:</strong> simultaneous intrauterine and ectopic. Rare spontaneously (1:30,000) but 1:100 with IVF. Finding an IUP on USS does not exclude co-existing ectopic in IVF patients.<span class="n-pearl-exam">Exam loves this: rare but guaranteed to appear.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>After salpingectomy for ectopic, future IVF outcomes are not significantly worse</strong> if the other tube is normal. Salpingotomy risks persistent trophoblast — monitor hCG after.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Give anti-D to all Rh-negative women</strong> with ectopic pregnancy, regardless of management method. Sensitisation risk is real.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">We found an intrauterine pregnancy on the scan — it's not ectopic.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Heterotopic pregnancy.</strong> In IVF patients especially, always scan thoroughly. An IUP does not exclude a co-existing ectopic.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">hCG is only 400 — too low for ectopic to be dangerous yet.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Rupture can occur at any hCG level.</strong> Low hCG ≠ early and safe. If the tube is already compromised, it can rupture before hCG rises.</div></div>
</div>
  </div>
</div><div class="n-anchor"><div class="n-anchor-text">Positive test + pain + empty uterus —<br>it's <em>ectopic</em> until you prove otherwise.</div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.placenta=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Antenatal</div>
  <div class="n-hero-title">Placenta<br><em>Praevia</em></div>
  <div class="n-hero-sub">ICD O44 &nbsp;·&nbsp; Painless. Bright red. Third trimester.</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Placenta implanted in the lower uterine segment, <strong>partially or completely covering the internal cervical os.</strong> Major praevia = covers the os entirely.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Prior LSCS or uterine surgery (greatest risk), multiparity, advanced maternal age, previous praevia, <strong>IVF</strong>. Smoking.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Causes antepartum haemorrhage, placenta accreta spectrum, and is an absolute contraindication to vaginal delivery. Un-anticipated praevia at LSCS can be catastrophic.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Mechanism</span><span class="n-section-tag">why it bleeds</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Lower segment development</div><div class="n-mech-text">From 28 weeks, the lower uterine segment develops and elongates. A placenta implanted here is <strong>sheared away from its attachment</strong> as the segment stretches and the os dilates.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Painless haemorrhage</div><div class="n-mech-text">Unlike abruption (painful, dark, concealed), praevia causes <strong>painless, bright red haemorrhage</strong>. It is maternal — not fetal. The first bleed is usually a warning bleed, not catastrophic.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Accreta risk</div><div class="n-mech-text">A uterus with a caesarean scar invites abnormal placental invasion at the scar site. When praevia occurs over a scar: <strong>accreta, increta, percreta</strong> — progressively deeper invasion, progressively more dangerous.</div></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Painless bright red PV bleeding in third trimester → think <em>placenta praevia</em> → USS before any vaginal examination.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Never perform a vaginal examination before placenta location is confirmed.</strong> If the placenta covers the os and a VE is performed, catastrophic haemorrhage can be triggered. USS first, always.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>VE is absolutely contraindicated</strong> until placental site is confirmed by USS. Even in the emergency setting — scan first.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Praevia over a previous caesarean scar</strong> = highest risk of accreta spectrum. MRI should be requested. Senior MDT planning is mandatory.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Any antepartum haemorrhage with suspected praevia</strong> must be admitted and Rh status checked. Anti-D if Rh negative.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Low-lying placenta on 20-week USS</strong> requires a repeat USS at 32–36 weeks. Do not discharge without follow-up.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Management</span><span class="n-section-tag">delivery planning</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Asymptomatic</div>
  <div class="n-algo-body"><strong>USS confirmation at 32 and 36 weeks.</strong> Most low-lying placentas migrate away from the os as the lower segment grows — not all praevia persist.<span class="n-involve">Obstetric outpatient + sonographer</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Major praevia confirmed</div>
  <div class="n-algo-body"><strong>Planned LSCS at 36–37 weeks</strong> (before onset of labour). Admit from 34 weeks if any bleeding. Crossmatch blood pre-operatively. Senior surgeon.<span class="n-involve">Consultant-led care + anaesthetics</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Antepartum haemorrhage</div>
  <div class="n-algo-body">Admit. IV access. Crossmatch. Fetal monitoring. <strong>Do not perform VE.</strong> Steroids if preterm. Delivery if haemodynamically unstable or fetal compromise.<span class="n-involve">Consultant obstetrician + theatre standby</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Accreta at LSCS</div>
  <div class="n-algo-body dark-body">Do not attempt manual placental removal. <strong>En-bloc hysterectomy</strong> if required. Cell salvage, MTP activated. Pre-planned with interventional radiology.<span class="n-involve">Senior MDT: surgery, IR, haematology, ICU</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>The warning bleed.</strong> The first haemorrhage in praevia is usually moderate and self-limiting. It is a warning — do not be falsely reassured. The next bleed can be catastrophic.<span class="n-pearl-exam">Exam loves this: candidates say 'she's stable now' and wait.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Vasa praevia</strong> is different: fetal vessels overlie the os without placental coverage. When membranes rupture, fetal exsanguination can occur within minutes. Sinusoidal CTG + bleeding = fetal emergency.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>1 previous LSCS + anterior low-lying placenta</strong> = accreta must be excluded. Colour Doppler + MRI if USS equivocal. This combination can occur in 15–25% of cases.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Low-lying placenta found at 20 weeks — plan caesarean.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Most will resolve.</strong> The lower segment grows, and the relative placental position often changes. Rescan at 32 and 36 weeks before making delivery plans.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Patient is Rh negative with praevia — no APH has occurred, no need for anti-D yet.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Give anti-D after any APH event</strong> — including small warning bleeds. Sensitisation can occur even with small feto-maternal haemorrhage.</div></div>
</div>
  </div>
</div><div class="n-anchor"><div class="n-anchor-text"><em>Painless. Bright red. Third trimester.</em><br>Scan before you touch.</div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.gdm=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Antenatal</div>
  <div class="n-hero-title">Gestational<br><em>Diabetes</em></div>
  <div class="n-hero-sub">GDM &nbsp;·&nbsp; ICD O24 &nbsp;·&nbsp; Glucose intolerance first detected in pregnancy</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Insulin resistance that overwhelms β-cell reserve in pregnancy. Human placental lactogen, progesterone, and cortisol all antagonise insulin signalling.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">BMI &gt;30, previous GDM, macrosomic baby (&gt;4.5kg), first-degree relative with T2DM, <strong>South Asian / Black / Middle Eastern</strong> ethnicity.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">The fetus swims in maternal glucose it cannot regulate itself. The consequences: macrosomia, shoulder dystocia, neonatal hypoglycaemia, stillbirth.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Mechanism</span><span class="n-section-tag">Pedersen hypothesis</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Physiological insulin resistance</div><div class="n-mech-text">Pregnancy is physiologically insulin-resistant by design — ensures glucose availability for the fetus. In GDM, this overwhelms β-cell reserve. <strong>Maternal glucose rises.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Fetal hyperglycaemia</div><div class="n-mech-text">Glucose crosses the placenta freely. <strong>Maternal insulin does not cross.</strong> The fetus, flooded with glucose, secretes its own insulin in excess — fetal hyperinsulinaemia.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Fetal hyperinsulinaemia</div><div class="n-mech-text">Excess fetal insulin drives anabolic growth: <strong>macrosomia, hepatomegaly, cardiomegaly</strong>. The distribution is asymmetric — shoulders grow disproportionately (shoulder dystocia risk).</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Neonatal hypoglycaemia</div><div class="n-mech-text">At birth, the glucose supply stops instantly. <strong>The high fetal insulin does not stop.</strong> Result: neonatal hypoglycaemia within minutes of delivery — the most immediate neonatal consequence.</div></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Diagnosis</span><span class="n-section-tag">OGTT and why HbA1c fails</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label ">75g OGTT</div><div class="n-diag-content"><strong>Gold standard.</strong> Offered at 24–28 weeks to all with risk factors. Fasting overnight, 75g glucose drink, blood at 0 and 2 hours.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">NICE thresholds</div><div class="n-diag-content"><strong>Fasting ≥5.6 mmol/L</strong> OR <strong>2-hour ≥7.8 mmol/L</strong> = GDM. Either threshold alone is sufficient for diagnosis.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Why HbA1c fails</div><div class="n-diag-content">Pregnancy increases red cell turnover → HbA1c reflects a shorter period → <strong>systematically underestimates</strong> glucose levels. Use OGTT, not HbA1c for GDM diagnosis.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Early OGTT</div><div class="n-diag-content">Women with <strong>previous GDM</strong> should be offered OGTT from the first antenatal appointment — not at 24–28 weeks. GDM recurs in up to 50% of subsequent pregnancies.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Fasting glucose ≥5.6 on OGTT → <em>GDM</em> → start diet advice, self-monitoring, and escalate if targets not met in 1–2 weeks.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>HbA1c is used at booking for pre-existing T2DM screening</strong> (threshold ≥48 mmol/mol), but it cannot replace the OGTT for GDM diagnosis mid-pregnancy. These are different tests for different purposes.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Management</span><span class="n-section-tag">diet first then escalate</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Diet + lifestyle</div>
  <div class="n-algo-body">Low GI diet, distribute carbs, moderate exercise. <strong>Self-monitor glucose 4×/day</strong> (fasting + 1h post-meals). Effective in ~70% of GDM women without medication.<span class="n-involve">Dietitian + diabetes midwife</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Metformin</div>
  <div class="n-algo-body"><strong>First pharmacological step</strong> when diet fails after 1–2 weeks. Reduces hepatic glucose output. Crosses placenta — long-term studies show no harm. Start low, titrate.<span class="n-involve">Diabetes clinic + obstetric team</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Insulin</div>
  <div class="n-algo-body">When metformin is insufficient or fasting glucose &gt;7 mmol/L. <strong>Isophane insulin</strong> (NPH) at night for fasting hyperglycaemia. Short-acting with meals for post-prandial.<span class="n-involve">Specialist diabetes obstetric team</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Delivery timing</div>
  <div class="n-algo-body dark-body">Diet-controlled: offer induction at <strong>40+6</strong>. Metformin/insulin: <strong>38–39 weeks</strong>. Poorly controlled/macrosomic: earlier. GDM women are not low-risk postdates.<span class="n-involve">Senior obstetric consultant</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Fasting glucose &gt;7 mmol/L at diagnosis = insulin from the outset.</strong> Metformin alone is insufficient. Do not start diet and wait.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Neonatal hypoglycaemia is an expectation, not a complication.</strong> Check blood glucose within 1–2 hours of birth and before each feed for 24 hours.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Stop insulin and metformin immediately after delivery.</strong> GDM-related insulin resistance resolves within hours of delivering the placenta. Continuing causes maternal hypoglycaemia.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>75g OGTT at 6–13 weeks postpartum</strong> to rule out persistent T2DM. If normal: annual HbA1c indefinitely. 50% lifetime risk of T2DM.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Glucose targets in pregnancy are tighter than outside pregnancy.</strong> Fasting ≤5.3, 1h post-meal ≤7.8, 2h post-meal ≤6.4 — because even modest hyperglycaemia drives fetal hyperinsulinaemia.<span class="n-pearl-exam">Exam loves this: candidates use non-pregnant thresholds.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Macrosomia is not just a big baby.</strong> The shoulder and trunk grow disproportionately (asymmetric growth from hyperinsulinaemia). This is why shoulder dystocia is the obstetric risk — not just size alone.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>GDM is a metabolic stress test.</strong> A woman who develops GDM has revealed β-cell insufficiency under physiological stress. She carries that susceptibility for life.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">HbA1c came back normal at booking — she doesn't have GDM risk.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>HbA1c at booking screens for pre-existing T2DM only.</strong> It does not screen for GDM. Still perform OGTT at 24–28 weeks if risk factors are present.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">She's diet-controlled GDM — no need to deliver early.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Diet-controlled GDM still requires induction by 40+6</strong> at the latest. Waiting for spontaneous labour increases stillbirth risk. GDM women are not standard low-risk.</div></div>
</div>
  </div>
</div><div class="n-anchor"><div class="n-anchor-text">You are not managing a glucose number.<br>You are managing a fetus that eats <em>everything its mother eats.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.shoulder=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Emergency Drill</div>
  <div class="n-hero-title">Shoulder<br><em>Dystocia</em></div>
  <div class="n-hero-sub">ICD O66.0 &nbsp;·&nbsp; The head delivers. The shoulders don't follow.</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Failure of the shoulders to deliver with normal downward traction following delivery of the head. The anterior shoulder is impacted behind the pubic symphysis.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Macrosomia, previous shoulder dystocia, diabetes, prolonged second stage, operative vaginal delivery. <strong>50% occur with no risk factors at all.</strong></div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Five minutes to deliver or permanent brachial plexus injury, hypoxic brain damage, or fetal death. HELPERR must be automatic.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">HELPERR Drill</span><span class="n-section-tag">in order, no hesitation</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">H</div><div class="n-mech-body"><div class="n-mech-cause">Call for Help</div><div class="n-mech-text">Senior obstetrician, extra midwives, paediatrician, anaesthetist. State clearly: <strong>"Shoulder dystocia — call the team now."</strong> Note the time. Document every step.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">E</div><div class="n-mech-body"><div class="n-mech-cause">Evaluate for Episiotomy</div><div class="n-mech-text">Episiotomy does not release a bony impaction — it creates soft tissue space for manoeuvres. <strong>Only cut if you need room for internal manoeuvres.</strong> Do not cut routinely.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">L</div><div class="n-mech-body"><div class="n-mech-cause">Legs — McRoberts' Manoeuvre</div><div class="n-mech-text">Hyperflexion of the maternal thighs onto the abdomen. <strong>Rotates the pubic symphysis superiorly</strong>, increasing the functional AP diameter of the pelvis. With suprapubic pressure: resolves 90% of cases.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">P</div><div class="n-mech-body"><div class="n-mech-cause">Suprapubic Pressure</div><div class="n-mech-text">Directed downward and laterally by an assistant to dislodge the anterior shoulder from behind the pubic symphysis. <strong>Never fundal pressure</strong> — this worsens impaction.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d5">E</div><div class="n-mech-body"><div class="n-mech-cause">Enter — Internal Manoeuvres</div><div class="n-mech-text"><strong>Rubin II:</strong> pressure on the posterior aspect of the anterior shoulder to rotate it. <strong>Wood's screw:</strong> counter-pressure on anterior aspect of posterior shoulder. Deliver the posterior arm directly if all else fails.</div></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Head delivers then retracts against perineum (turtle sign) → think <em>shoulder dystocia</em> → call help + McRoberts' + suprapubic pressure simultaneously.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Do not apply fundal pressure.</strong> It is reflex to push down on the fundus — but this forces the shoulder further into the pubis. Suprapubic pressure only, directed laterally.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Turtle sign = call for help immediately.</strong> The head retracting after delivery is pathognomonic. Don't wait to confirm — act.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>No traction on the fetal head</strong> — this risks Erb's palsy (brachial plexus injury). Manoeuvres, not traction.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Zavanelli manoeuvre</strong> (cephalic replacement + caesarean) is a last resort if all else fails. Requires GA and full theatre team immediately.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Document time of head delivery</strong> and every subsequent step with timestamps. Shoulder dystocia is a medico-legal red flag — complete documentation is mandatory.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>50% of shoulder dystocia occurs with no antenatal risk factors.</strong> It cannot be reliably predicted. All delivery room staff must be trained, every delivery.<span class="n-pearl-exam">Exam loves this: candidates list risk factors as if they predict it.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>McRoberts' + suprapubic pressure resolves ~90% of cases.</strong> Internal manoeuvres are rarely needed if the first two steps are applied correctly and simultaneously.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Posterior arm delivery</strong> is highly effective and underused. Reaching for the posterior arm and sweeping it across the chest delivers the shoulder and significantly reduces the AP diameter.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Apply strong downward traction — the shoulders will come.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Traction worsens impaction and causes brachial plexus injury.</strong> McRoberts' changes the geometry; traction pulls against a fixed bone.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Episiotomy will release the shoulder — cut immediately.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Episiotomy relieves soft tissue, not bony impaction.</strong> It buys room for your hands. It does not free the shoulder. McRoberts' first.</div></div>
</div>
  </div>
</div><div class="n-anchor"><div class="n-anchor-text">McRoberts. Suprapubic pressure.<br><em>Help. Immediately.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.miscarriage=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Early Pregnancy</div>
  <div class="n-hero-title">Early Pregnancy<br><em>Loss</em></div>
  <div class="n-hero-sub">ICD O02–O03 &nbsp;·&nbsp; The most common complication of early pregnancy</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Loss of pregnancy before 24 weeks. Early (before 12 weeks) accounts for 75%. Most caused by chromosomal abnormality — not maternal behaviour.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">15–20% of recognised pregnancies. Risk rises steeply with maternal age. Three consecutive losses (recurrent miscarriage) = 1% of couples.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Significant psychological impact. Missed diagnoses (incomplete, septic miscarriage) carry serious morbidity. Recurrent loss requires systematic investigation.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classification</span><span class="n-section-tag">the types matter for management</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label ">Threatened</div><div class="n-diag-content">Bleeding + closed os + fetal heart seen on USS. <strong>Pregnancy remains viable.</strong> No intervention changes outcome — reassure and rescan.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Missed (silent)</div><div class="n-diag-content">No fetal heart. Products retained. Empty sac (&gt;25mm) or CRL &gt;7mm without cardiac activity. Often asymptomatic — found on USS.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Incomplete</div><div class="n-diag-content">Products partially expelled. Os open. Bleeding ongoing. <strong>Requires completion — expectant, medical, or surgical.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Complete</div><div class="n-diag-content">All products expelled. Os closed. Bleeding settling. Confirm by USS.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Inevitable</div><div class="n-diag-content">Os open, products not yet expelled — passage is imminent.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Septic</div><div class="n-diag-content">Any type + signs of infection (pyrexia, uterine tenderness, offensive discharge). <strong>Obstetric emergency.</strong></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Bleeding + open cervical os + products not yet expelled → <em>inevitable miscarriage</em> → assess vitals, IV access, manage expectantly or surgically.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Threatened miscarriage with fetal heart visible does not guarantee viability.</strong> The pregnancy may still be lost — reassurance is appropriate, false certainty is not. Rescan at 2 weeks.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management</span><span class="n-section-tag">three pathways</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Expectant</div>
  <div class="n-algo-body"><strong>Await natural passage.</strong> Suitable for incomplete/missed miscarriage in stable, counselled patient. Success ~50% at 2 weeks. Must have reliable access to EPAU if complications.<span class="n-involve">EPAU follow-up + clear safety-net advice</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Medical</div>
  <div class="n-algo-body"><strong>Misoprostol</strong> (prostaglandin E1 analogue). Causes uterine contractions. Given vaginally or sublingually. Success ~80%. Expect pain and bleeding.<span class="n-involve">EPAU + gynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Surgical (ERPC)</div>
  <div class="n-algo-body"><strong>Evacuation of Retained Products of Conception</strong> — suction curettage. Fastest and most complete. Required urgently in: haemodynamic instability, septic miscarriage, patient preference.<span class="n-involve">Gynaecology theatre team</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Septic miscarriage</div>
  <div class="n-algo-body dark-body"><strong>IV antibiotics first</strong> (broad-spectrum, anaerobe cover). <strong>Then</strong> surgical evacuation. Delay in evacuation worsens sepsis. Treat like septic shock.<span class="n-involve">Senior gynaecologist + microbiology + ITU</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Septic miscarriage</strong> — pyrexia + uterine tenderness + PV discharge. IV antibiotics and urgent ERPC. This can progress to overwhelming sepsis rapidly.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Give anti-D to all Rh-negative women</strong> with pregnancy loss after 12 weeks, and after surgical management at any gestation.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Recurrent miscarriage (≥3 losses)</strong> warrants investigation: karyotype (both partners), antiphospholipid antibodies, uterine anatomy (HSG/hysteroscopy), thyroid function.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>80% of miscarriages are caused by chromosomal abnormality</strong> — most commonly trisomy. Reassure patients that this is not caused by activity, stress, or diet.<span class="n-pearl-exam">Exam loves this: candidates confuse with preventable causes.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Antiphospholipid syndrome</strong> is the most important treatable cause of recurrent miscarriage. Screen with lupus anticoagulant and anticardiolipin antibodies on two occasions 12 weeks apart.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>IUCD insertion at ERPC</strong> is an option for appropriate patients and reduces the risk of intrauterine adhesions (Asherman's syndrome) postoperatively.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">She's emotionally distressed — avoid discussing recurrence risk.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Clear, honest counselling is part of care.</strong> Women with a threatened or complete miscarriage need to know the real risk of recurrence (15–20%) and that support is available.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">The miscarriage was incomplete — give misoprostol and discharge.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Safety-net is essential.</strong> What happens if bleeding is heavy at home? EPAU must be accessible 24/7. Discharge without a safety plan is unsafe.</div></div>
</div>
  </div>
</div><div class="n-anchor"><div class="n-anchor-text">Most early losses are chromosomal.<br>That's not her fault — <em>and she needs to hear that.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.cordprolapse=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Emergency</div>
  <div class="n-hero-title">Cord<br><em>Prolapse</em></div>
  <div class="n-hero-sub">ICD O69.0 &nbsp;·&nbsp; The cord is out. The clock has started.</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Umbilical cord descends below the presenting part after membrane rupture. Every contraction compresses the cord → fetal hypoxia.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Malpresentation (breech, transverse lie), preterm, polyhydramnios, artificial rupture of membranes with high presenting part, <strong>multiparous, cord presentation</strong>.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Perinatal mortality without immediate intervention is very high. Intact cord + immediate action → good outcomes. Every minute of compression matters.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Cord felt on VE or visible at vulva after membrane rupture → <em>cord prolapse</em> → call emergency team + manual elevation immediately.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Do not pull on the cord or allow it to dry out.</strong> Handling causes vasospasm. If cord is outside, cover with a warm moist pad. Do not clamp or cut. Keep it warm and do not manipulate.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Immediate Actions</span><span class="n-section-tag">in parallel</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Manual elevation</div>
  <div class="n-algo-body"><strong>Examiner's fingers remain in vagina</strong> and manually elevate the presenting part off the cord. This must be maintained until caesarean. Do not remove fingers.<span class="n-involve">Whoever detects it — do not step back</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Positioning</div>
  <div class="n-algo-body"><strong>Knee-chest position</strong> or exaggerated Sims. Elevates the presenting part with gravity. Call for help.<span class="n-involve">Midwife + bleep team</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Bladder filling</div>
  <div class="n-algo-body">If delay is anticipated: fill bladder with 500 mL saline via catheter to lift presenting part. Reduces compression.<span class="n-involve">Midwifery team + obstetric registrar</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Emergency LSCS</div>
  <div class="n-algo-body dark-body"><strong>Category 1 caesarean</strong> — aim for delivery within 30 minutes. All manual elevation measures maintained until uterine incision.<span class="n-involve">Full theatre team — declared emergency</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Do not remove fingers from the vagina</strong> until the baby is delivered. Removing pressure even briefly causes immediate cord compression.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Do not attempt to replace the cord.</strong> This is not a manoeuvre — it causes vasospasm and worsens compression.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Tocolysis (terbutaline SC 0.25 mg)</strong> can be used to reduce contractions and relieve intermittent compression while awaiting delivery.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Document time of cord diagnosis precisely.</strong> The decision-to-delivery interval is audited in all cases of cord prolapse.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Artificial rupture of membranes (ARM) with an unengaged or high presenting part is a cord prolapse risk.</strong> Always check presenting part position and station before ARM.<span class="n-pearl-exam">Exam loves this: causes of iatrogenic cord prolapse.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Cord presentation</strong> (cord below presenting part but membranes intact) → plan caesarean before labour. Do not permit vaginal delivery or ARM.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Vaginal delivery may be appropriate</strong> if the cervix is fully dilated and delivery is imminent. Senior obstetrician at bedside, instrumental delivery preferred.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">The CTG looks reassuring, so cord prolapse can be managed conservatively.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>There is no conservative management of cord prolapse with fetal compromise.</strong> A reassuring CTG buys minutes, not time for watchful waiting. The moment cord compression occurs, category 1 CS or immediate assisted delivery is the only answer.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">The cord is pulsating — that means the baby is fine.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>A pulsating cord confirms fetal circulation, but cord compression can become complete within seconds.</strong> Do not interpret pulsation as safety. Keep the presenting part elevated at all times until delivery.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">In a footling breech with cord prolapse, vaginal delivery is safer than CS.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Category 1 CS is the default for cord prolapse unless vaginal delivery is imminent.</strong> Footling breech does not make vaginal delivery safer — it makes cord compression more likely.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Fingers in. Presenting part up.<br><em>Don't let go until delivery.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.endometriosis=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Chronic</div>
  <div class="n-hero-title">Endo-<br><em>metriosis</em></div>
  <div class="n-hero-sub">ICD N80 &nbsp;·&nbsp; Endometrial-like tissue outside the uterus</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Endometrial-like tissue implants outside the uterine cavity, responding to oestrogen — causing inflammation, fibrosis, and pain with every cycle.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">10% of women of reproductive age. Average <strong>diagnostic delay: 7–8 years.</strong> Common sites: ovaries (endometriomas), pouch of Douglas, uterosacral ligaments.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Causes chronic pelvic pain, dysmenorrhoea, dyspareunia, and is a major cause of subfertility. The disease persists and progresses until the menopause.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Dysmenorrhoea + dyspareunia + subfertility in a woman of reproductive age → think <em>endometriosis</em> → laparoscopy is the only definitive diagnosis.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Normal USS does not exclude endometriosis.</strong> Peritoneal deposits are invisible on ultrasound. USS only detects endometriomas. Clinical diagnosis is valid and appropriate for starting empirical medical treatment.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Endometrioma (chocolate cyst)</strong> on USS in a woman trying to conceive — refer to specialist. Endometriomas impair ovarian reserve.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Deeply infiltrating endometriosis</strong> (rectovaginal, bladder, ureteral) causes bowel or urinary symptoms — cyclical rectal bleeding, dysuria at menstruation. Needs specialist surgical team.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Empirical medical treatment</strong> (COCP, progestins) is appropriate without laparoscopy when history is classic. Do not wait for surgical confirmation to start treatment.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Diagnostic delay of 7–8 years</strong> is common and causes harm. Take cyclical pain and dyspareunia seriously from first presentation.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management</span><span class="n-section-tag">medical then surgical</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Medical — first line</div>
  <div class="n-algo-body"><strong>COCP</strong> (continuous, not cyclical) or <strong>progestins</strong> (norethisterone, DMPA, LNG-IUS) to suppress menstruation and oestrogen drive. Effective for pain in 70–80%.<span class="n-involve">GP / outpatient gynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">GnRH analogues</div>
  <div class="n-algo-body"><strong>Medical menopause</strong> — suppress oestrogen completely. Very effective for pain. Add-back HRT to prevent bone loss. Usually limited to 6 months.<span class="n-involve">Gynaecology specialist</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Laparoscopic surgery</div>
  <div class="n-algo-body"><strong>Excision or ablation of deposits.</strong> Cystectomy for endometriomas. Adhesiolysis. Most effective for pain and subfertility.<span class="n-involve">Specialist gynaecological surgeon</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">IVF / fertility</div>
  <div class="n-algo-body dark-body">If laparoscopic surgery fails to restore fertility or disease is severe: <strong>IVF is appropriate.</strong> Endometriomas may reduce ovarian response.<span class="n-involve">Reproductive medicine specialist</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Laparoscopy is the gold standard for diagnosis</strong> — but clinical diagnosis is sufficient to start treatment. NICE and ESHRE both support empirical treatment without histological confirmation.<span class="n-pearl-exam">Exam loves this: candidates refuse to treat without 'proof'.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>CA-125 is not a diagnostic test for endometriosis.</strong> It is elevated in endometriosis but also in ovarian cancer, fibroids, and PID. It has no role in diagnosis but may be used to monitor disease activity.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Endometriosis is oestrogen-dependent.</strong> It does not progress after menopause (without exogenous oestrogen). Progestins and GnRH agonists work by suppressing oestrogen.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal USS rules out endometriosis.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Ultrasound cannot detect peritoneal endometriosis deposits.</strong> A normal USS only excludes endometriomas. Peritoneal disease — which causes the most pain — is invisible on imaging. Diagnosis is clinical or laparoscopic.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">CA-125 is elevated, so this must be endometriosis.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CA-125 is non-specific — it rises in endometriosis, but also in ovarian cancer, PID, fibroids, and even menstruation.</strong> It has no role in diagnosing endometriosis. In a woman over 40 with elevated CA-125 and pelvic pain, ovarian malignancy must be excluded first.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Hysterectomy cures endometriosis.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Hysterectomy alone does not cure endometriosis.</strong> Disease outside the uterus — on bowel, peritoneum, bladder — is unaffected. BSO reduces oestrogen drive and improves outcomes, but excision of deposits at the time of surgery is required for lasting relief.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Seven years of pain before a diagnosis.<br>The first step is <em>taking the symptoms seriously.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.pcos=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Endocrine</div>
  <div class="n-hero-title">Polycystic Ovary<br><em>Syndrome</em></div>
  <div class="n-hero-sub">PCOS &nbsp;·&nbsp; ICD E28.2 &nbsp;·&nbsp; A metabolic disorder, not just a gynaecological one</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">A syndrome of hyperandrogenism + ovulatory dysfunction, often with polycystic ovarian morphology on USS. Defined by <strong>2 of 3 Rotterdam criteria</strong>.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">5–10% of women of reproductive age. Strong hereditary component. Insulin resistance in 70%, regardless of BMI.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Leading cause of anovulatory subfertility. Long-term risks: T2DM, endometrial cancer, metabolic syndrome, cardiovascular disease.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Rotterdam Criteria</span><span class="n-section-tag">2 of 3</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label ">Criterion 1</div><div class="n-diag-content"><strong>Oligomenorrhoea / anovulation</strong> — cycles &gt;35 days or fewer than 8 cycles/year. Confirmed by mid-luteal progesterone &lt;10 nmol/L.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Criterion 2</div><div class="n-diag-content"><strong>Clinical or biochemical hyperandrogenism</strong> — acne, hirsutism, male-pattern baldness. Biochemical: elevated free testosterone or DHEA-S.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Criterion 3</div><div class="n-diag-content"><strong>Polycystic ovarian morphology on USS</strong> — ≥20 follicles per ovary (3–10 mm) or ovarian volume &gt;10 mL. In absence of dominant follicle.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Exclusions</div><div class="n-diag-content">Always exclude: <strong>thyroid dysfunction, hyperprolactinaemia, congenital adrenal hyperplasia, Cushing's syndrome</strong> before diagnosing PCOS. These can mimic it.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Irregular cycles + hirsutism + elevated LH:FSH ratio → think <em>PCOS</em> → confirm 2 of 3 Rotterdam criteria + exclude thyroid and prolactin.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>LH:FSH ratio &gt;2.5 is characteristic but not a diagnostic criterion.</strong> Rotterdam criteria are the diagnostic standard. Do not diagnose on LH:FSH alone or USS alone.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management by presenting complaint</span><span class="n-section-tag">targeted</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Irregular cycles / no fertility wish</div>
  <div class="n-algo-body"><strong>COCP</strong> — regulates cycles, treats hyperandrogenism, provides endometrial protection. <strong>Lifestyle:</strong> even 5–10% weight loss in overweight women restores ovulation in 80%.<span class="n-involve">GP / outpatient gynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Subfertility</div>
  <div class="n-algo-body"><strong>Letrozole first-line</strong> (supersedes clomifene — higher live birth rates, lower multiple pregnancy rate). Metformin as adjunct. All cycles need USS monitoring.<span class="n-involve">Reproductive medicine / EPAU</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Metformin</div>
  <div class="n-algo-body">Improves insulin sensitivity, improves cycle regularity, reduces T2DM risk. Particularly useful in insulin-resistant patients. Not sufficient alone for ovulation induction.<span class="n-involve">Specialist outpatient clinic</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Endometrial protection</div>
  <div class="n-algo-body dark-body">Women with PCOS who do not menstruate for &gt;3 months: <strong>give progestogen to induce withdrawal bleed.</strong> Chronic anovulation without cycles → endometrial hyperplasia → cancer risk.<span class="n-involve">Annual review: gynaecology</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Endometrial cancer risk</strong> — chronic anovulation with unopposed oestrogen drives endometrial hyperplasia. Women with PCOS who go more than 3–4 months without a bleed need progestogen.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Screen for T2DM and metabolic syndrome annually</strong> in all women with PCOS — fasting glucose or HbA1c + lipid profile + BP.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Rapid-onset virilisation</strong> (clitoromegaly, deep voice, rapid hair growth) = not PCOS. This suggests androgen-secreting tumour. Urgent referral.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Letrozole has replaced clomifene as first-line for ovulation induction in PCOS.</strong> It achieves higher live birth rates and lower multiple pregnancy rates. NICE now recommends letrozole.<span class="n-pearl-exam">Exam loves this: candidates still say clomifene first.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Insulin resistance occurs in 70% of PCOS women regardless of BMI.</strong> Lean women with PCOS are not protected. Metabolic screening applies to all.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>PCOS does not resolve at menopause.</strong> The metabolic risks (diabetes, cardiovascular disease) persist. Long-term follow-up is needed throughout life.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal periods exclude PCOS.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Up to 20–30% of women with PCOS have regular cycles.</strong> Ovulatory dysfunction can be intermittent. Rotterdam requires only 2 of 3 criteria — a woman can have polycystic morphology and hyperandrogenaemia with normal cycles and still meet the diagnosis.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A positive pregnancy test means PCOS-related anovulation is resolved.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>PCOS does not resolve in pregnancy.</strong> It increases risk of GDM, hypertension, preterm birth, and miscarriage. Women with PCOS require closer antenatal surveillance regardless of how conception occurred.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Metformin is the first-line treatment for ovulation induction in PCOS.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Metformin alone is insufficient for ovulation induction.</strong> It improves insulin sensitivity and cycle regularity but does not reliably induce ovulation. First-line is letrozole; metformin is an adjunct, not a replacement.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">PCOS is not just about the ovaries.<br>It's a <em>metabolic condition</em> that happens to affect reproduction.</div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.fibroids=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Benign</div>
  <div class="n-hero-title">Uterine<br><em>Fibroids</em></div>
  <div class="n-hero-sub">Leiomyomata &nbsp;·&nbsp; ICD D25 &nbsp;·&nbsp; Most common benign tumour in women</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Benign smooth muscle tumours of the myometrium. Oestrogen-dependent — grow during reproductive years, regress after menopause.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">20–50% of women over 30. Three times more common and more symptomatic in <strong>Black women</strong>. Family history, nulliparity, obesity, early menarche.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Cause HMB, pressure symptoms, subfertility (submucosal type), pregnancy complications. Most are asymptomatic and found incidentally.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Types and Symptoms</span><span class="n-section-tag">location drives symptoms</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Submucosal</div><div class="n-diag-content">Distorts the endometrial cavity. <strong>Most symptomatic: HMB, subfertility, recurrent miscarriage.</strong> Even small submucosal fibroids cause significant bleeding.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Intramural</div><div class="n-diag-content">Within the myometrium. Can enlarge significantly. Causes HMB, dysmenorrhoea, pressure symptoms. Most common type.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Subserosal</div><div class="n-diag-content">Grows outward from uterus. Pressure on bladder (urinary frequency) or bowel (constipation). <strong>Least impact on fertility.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Pedunculated</div><div class="n-diag-content">On a stalk — can be submucosal or subserosal. Risk of torsion if pedunculated and subserosal.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Cervical</div><div class="n-diag-content">Rare. Distorts cervix, may obstruct labour or cause urinary symptoms.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Heavy menstrual bleeding + enlarged irregular uterus on examination → think <em>fibroids</em> → pelvic USS to confirm size, number, and type.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Rapid growth of a fibroid</strong> — especially after menopause — should raise concern for <strong>uterine sarcoma</strong> (leiomyosarcoma). Malignant transformation of a fibroid is very rare, but rapidly growing post-menopausal fibroids need investigation.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management</span><span class="n-section-tag">symptom-driven</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Medical — HMB</div>
  <div class="n-algo-body"><strong>LNG-IUS</strong> (Mirena): most effective medical option for HMB. Tranexamic acid + NSAIDs: symptom relief. COCP: cycle control. All only control symptoms — do not shrink fibroids.<span class="n-involve">GP / outpatient gynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">GnRH agonists (short-term)</div>
  <div class="n-algo-body">Pre-operative shrinkage of fibroids before surgery. <strong>Reduce size by ~30–40%.</strong> Maximum 3–6 months. Can cause hypoestrogenic side effects — add-back therapy.<span class="n-involve">Specialist gynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Surgical — uterus-sparing</div>
  <div class="n-algo-body"><strong>Myomectomy:</strong> laparoscopic or open. Preserves fertility. Recurrence rate 25–50% within 5 years.<span class="n-involve">Specialist gynaecological surgeon</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Hysterectomy / UAE</div>
  <div class="n-algo-body dark-body"><strong>Hysterectomy:</strong> definitive, no recurrence. <strong>Uterine Artery Embolisation (UAE):</strong> minimally invasive, 80–90% effective for symptoms, <strong>not recommended if future pregnancy desired.</strong><span class="n-involve">Consultant gynaecology + interventional radiology</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>LNG-IUS is first-line medical treatment for HMB from fibroids</strong> (if the cavity is not significantly distorted). Reduces blood loss by 86–97%.<span class="n-pearl-exam">Exam loves this: candidates skip to surgery.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Submucosal fibroids impair implantation.</strong> Hysteroscopic resection improves IVF outcomes. In women with subfertility + submucosal fibroid: resect before IVF.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>UAE is contraindicated in women wanting future pregnancy</strong> — uterine blood supply alteration may compromise placentation. Myomectomy is the fertility-sparing alternative.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A large fibroid causing no symptoms needs treatment.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Asymptomatic fibroids do not require treatment regardless of size.</strong> The indication for intervention is symptoms — HMB, pressure, subfertility — not size on imaging. Incidental large fibroids in asymptomatic women are managed expectantly.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Fibroids always shrink after menopause.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Most fibroids regress after menopause, but not all.</strong> Women on HRT may have oestrogen-driven continued growth. A fibroid that grows post-menopause requires investigation to exclude uterine sarcoma.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Myomectomy cures fibroids permanently.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Myomectomy removes existing fibroids but does not prevent recurrence.</strong> Up to 25% of women require further intervention within 10 years. Women who want definitive treatment and have completed their family should be counselled about hysterectomy.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Location matters more than size.<br>A 5 mm <em>submucosal</em> fibroid causes more harm than a 5 cm subserosal one.</div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.pid=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Infection</div>
  <div class="n-hero-title">Pelvic Inflammatory<br><em>Disease</em></div>
  <div class="n-hero-sub">PID &nbsp;·&nbsp; ICD N73 &nbsp;·&nbsp; Ascending infection with permanent consequences</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Ascending infection from the lower genital tract to the uterus, fallopian tubes, and ovaries. Most commonly STI-associated — <em>Chlamydia, Gonorrhoea,</em> anaerobes.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Sexually active women &lt;25. Multiple partners, new partner, no barrier contraception. Preceding instrumentation (IUCD insertion, ERPC, hysteroscopy) increases risk.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Tubal damage → ectopic pregnancy risk × 6–10. Infertility after 3 episodes = 50%. Tubo-ovarian abscess = surgical emergency.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Lower abdominal pain + cervical motion tenderness + adnexal tenderness in a sexually active woman → think <em>PID</em> → treat empirically, do not wait for swab results.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Negative swabs do not exclude PID.</strong> Chlamydia PCR sensitivity is ~90% — 10% of cases are missed. If clinical picture fits, treat. Delayed treatment increases tubal damage risk.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Diagnosis</span><span class="n-section-tag">clinical, not microbiological</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label ">Minimum criteria</div><div class="n-diag-content">Lower abdominal pain + <strong>cervical motion tenderness (CMT)</strong> or uterine/adnexal tenderness. All three not required — any combination that fits warrants treatment.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Swabs</div><div class="n-diag-content">Endocervical swab for Chlamydia, gonorrhoea. High vaginal swab for anaerobes. Urine NAAT. <strong>Treat before results return.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Bloods</div><div class="n-diag-content">CRP, WBC — to assess severity. Elevated in most, but normal does not exclude PID.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">USS</div><div class="n-diag-content"><strong>Tubo-ovarian abscess (TOA)</strong> = complex adnexal mass on USS. This changes management — requires IV antibiotics ± drainage.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Laparoscopy</div><div class="n-diag-content">Gold standard for diagnosis but not routine. Reserve for diagnostic uncertainty or failure to respond to treatment.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management</span><span class="n-section-tag">treat promptly and broadly</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Outpatient (mild PID)</div>
  <div class="n-algo-body"><strong>Ceftriaxone 500 mg IM stat + doxycycline 100 mg BD × 14 days + metronidazole 400 mg BD × 14 days.</strong> BASHH guidelines. Review at 72 hours — if not improving, admit.<span class="n-involve">GP / sexual health clinic</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Inpatient (moderate–severe)</div>
  <div class="n-algo-body">IV cefoxitin + doxycycline, then oral doxycycline + metronidazole to complete 14 days. Admit if: TOA, severe symptoms, pregnancy, surgical abdomen, failed outpatient.<span class="n-involve">Gynaecology ward</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">TOA — IV antibiotics</div>
  <div class="n-algo-body">Most TOAs respond to IV antibiotics alone (60–80%). Image-guided drainage if no improvement at 48–72 hours, or if abscess &gt;8 cm.<span class="n-involve">Interventional radiology + gynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">TOA — surgical drainage</div>
  <div class="n-algo-body dark-body">Laparoscopic drainage or salpingo-oophorectomy if: ruptured TOA, septic shock, failure of medical + radiological management. Treat like surgical sepsis.<span class="n-involve">Consultant gynaecologist + HDU</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Treat PID empirically before swab results.</strong> Every day of delay increases tubal damage. The Fallopian tube does not recover well from inflammation — even sub-clinical PID causes scarring.<span class="n-pearl-exam">Exam loves this: candidates wait for the lab.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Partner notification is mandatory.</strong> All sexual contacts within the preceding 6 months must be assessed and treated. This prevents re-infection and breaks transmission chains.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>IUCD in situ during PID:</strong> If the IUCD was inserted within the preceding 3 weeks, remove it. If longstanding, leave it in — removal does not improve outcomes and risks losing contraception.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Wait for swab results before starting antibiotics for suspected PID.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Do not wait for microbiology before treating suspected PID.</strong> NICE explicitly recommends empirical antibiotics based on clinical diagnosis. Delay risks tubal damage, adhesion formation, and long-term subfertility. Swabs guide de-escalation, not initiation.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Negative chlamydia NAAT rules out PID.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>PID is polymicrobial.</strong> Chlamydia is only identified in 40–50% of cases. Gonorrhoea, anaerobes, and Mycoplasma genitalium cause PID independently. A negative chlamydia test does not exclude PID if the clinical picture fits.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">An IUCD should be removed immediately if PID is diagnosed.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>IUCD removal is not mandatory in mild-to-moderate PID.</strong> If the woman wishes to retain the device and responds to antibiotics, it can stay in situ. Remove only if there is no improvement within 72 hours or if the infection is severe.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Treat first. The swab result<br>confirms what you <em>already suspected</em>.</div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.pretermlabour=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Antenatal</div>
  <div class="n-hero-title">Preterm<br><em>Labour</em></div>
  <div class="n-hero-sub">ICD O60 &nbsp;·&nbsp; Before 37 weeks — and before the lungs are ready</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Regular uterine contractions causing progressive cervical change before 37 weeks. Threatening preterm labour: contractions but no cervical change yet.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Previous preterm birth (strongest risk factor), infection/inflammation, multiple pregnancy, <strong>short cervix (&lt;25mm at 20–24 weeks)</strong>, social deprivation.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Leading cause of neonatal mortality and morbidity. Prematurity = underdeveloped lungs (RDS), brain (IVH), gut (NEC). Every week in utero matters.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Contractions + cervical change before 37 weeks → think <em>preterm labour</em> → fFN or cervical length, steroids, MgSO₄ (if &lt;30 weeks), tocolysis, transfer.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Fetal fibronectin (fFN) is most useful when negative.</strong> A negative fFN has &gt;95% negative predictive value for delivery within 7 days — it is the most useful test to rule out preterm labour and safely discharge patients.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Management priorities</span><span class="n-section-tag">in order</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Corticosteroids</div>
  <div class="n-algo-body"><strong>Betamethasone 12 mg IM × 2 doses (24 hours apart)</strong> — promotes lung maturation, reduces RDS, IVH, NEC. Given between 24–34+6 weeks. Single course only.<span class="n-involve">Obstetric team immediately</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Magnesium sulphate</div>
  <div class="n-algo-body"><strong>If &lt;30 weeks: MgSO₄ 4g IV loading then 1g/hr</strong> for fetal neuroprotection. Reduces cerebral palsy risk by 30–40%. Distinct from its eclampsia use.<span class="n-involve">Obstetric + neonatal team</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Tocolysis</div>
  <div class="n-algo-body"><strong>Nifedipine or atosiban</strong> — delay delivery 24–48 hours to allow steroids to work. Tocolysis does not improve perinatal outcomes by itself; it buys time for steroids.<span class="n-involve">Senior obstetrician</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Neonatal transfer</div>
  <div class="n-algo-body dark-body"><strong>Transfer to a unit with appropriate NICU level</strong> before delivery if at all possible. In-utero transfer is safer than postnatal transfer.<span class="n-involve">Neonatology + neonatal network</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Infection drives preterm labour.</strong> Check for UTI, group B Strep, bacterial vaginosis, chorioamnionitis. Treat the infection — do not just tocolyse over it.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Steroids need 24 hours to achieve maximum effect.</strong> Give them as soon as preterm labour is suspected — do not wait for confirmation of cervical change.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>MgSO₄ for neuroprotection must be given before 30 weeks.</strong> This is separate from its use in eclampsia — same drug, different indication.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Group B Streptococcus:</strong> if GBS colonisation is known or suspected, IV penicillin intrapartum to prevent neonatal early-onset GBS sepsis.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Tocolysis alone does not improve perinatal outcomes.</strong> Its value is buying 24–48 hours for steroids. If delivery is inevitable, do not obsess over tocolysis — ensure steroids and MgSO₄ are given.<span class="n-pearl-exam">Exam loves this: candidates tocolyse without giving steroids.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Cervical cerclage</strong> reduces preterm birth in women with prior spontaneous preterm birth &lt;34 weeks AND short cervix &lt;25mm in current pregnancy. NICE recommends Shirodkar or McDonald technique.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Progesterone (vaginal)</strong> — reduces preterm birth in singleton pregnancies with short cervix (&lt;25mm) at 24 weeks. Given from 24 to 36+6 weeks.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">08</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Give tocolysis first to buy time for steroids.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Steroids and tocolysis should be given simultaneously — not sequentially.</strong> The goal of tocolysis is to allow steroid administration, not to delay delivery indefinitely. Start both together. Tocolysis beyond 48 hours has limited evidence.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Magnesium sulphate at 28 weeks is given to stop contractions.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Magnesium at &lt;30 weeks is neuroprotective, not tocolytic.</strong> It reduces rates of cerebral palsy in preterm neonates by ~30%. It is given in addition to tocolysis, not instead of it. The distinction matters on every exam.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Preterm labour with intact membranes can be safely monitored at home.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Confirmed preterm labour requires inpatient management.</strong> Fetal fibronectin negativity can support outpatient monitoring of threatened preterm labour — but once labour is confirmed on clinical or USS criteria, admission and treatment are mandatory.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Every week in utero<br>is a week the NICU <em>doesn't have to be.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.ovarycyst=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Assessment</div>
  <div class="n-hero-title">Ovarian<br><em>Cyst</em></div>
  <div class="n-hero-sub">ICD N83 &nbsp;·&nbsp; Most are benign. The challenge is identifying which aren't.</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">A fluid-filled structure on or in the ovary. Can be functional (follicular, corpus luteal) or pathological (dermoid, endometrioma, mucinous, serous cystadenoma, malignant).</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Very common. Functional cysts: any woman of reproductive age. Dermoids: peak 20–40. Malignant: risk rises sharply after 50. BRCA1/2: significantly elevated risk.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Ovarian torsion is a surgical emergency. Malignancy must not be missed. Cyst rupture and haemorrhage can mimic ectopic pregnancy.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Risk of Malignancy Index (RMI)</span><span class="n-section-tag">the key number</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label ">RMI formula</div><div class="n-diag-content"><strong>RMI = USS score × menopausal status × CA-125</strong>. USS features scored 0/1/3 based on number of malignant features.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">USS features</div><div class="n-diag-content">Multilocularity, solid elements, bilateral, ascites, intraperitoneal metastases — each adds to USS score.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">RMI &lt;25</div><div class="n-diag-content">Low risk — manage in general gynaecology. Most likely benign. If premenopausal and simple: rescan in 3 months.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">RMI 25–250</div><div class="n-diag-content">Moderate risk — review at specialist MDT. Further imaging (MRI) and discussion.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">RMI &gt;250</div><div class="n-diag-content">High risk — <strong>urgent referral to gynaecological oncology.</strong> Do not perform surgery outside a cancer centre.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Sudden onset severe unilateral pelvic pain + ovarian cyst on USS → think <em>torsion</em> → emergency laparoscopy. Don't wait for Doppler to be normal — torsion can have preserved flow.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Normal Doppler does not exclude torsion.</strong> Blood flow can be intermittent in partial torsion, or preserved in early torsion. Clinical suspicion + USS evidence of cyst + pain = diagnostic laparoscopy, not imaging reassurance.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management by type</span><span class="n-section-tag">size and features guide decisions</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Simple cyst — premenopausal</div>
  <div class="n-algo-body">&lt;5 cm: likely functional, resolve spontaneously. <strong>Rescan in 8–12 weeks.</strong> 5–7 cm: annual USS. &gt;7 cm: MRI or consider surgery.<span class="n-involve">GP / outpatient gynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Simple cyst — postmenopausal</div>
  <div class="n-algo-body">Any simple cyst: USS + CA-125. &lt;5 cm with normal CA-125: 4-monthly USS for 1 year. Any complex features → oncology referral.<span class="n-involve">Gynaecology specialist</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Dermoid (teratoma)</div>
  <div class="n-algo-body">Surgical removal — <strong>laparoscopic cystectomy.</strong> Risk of torsion and chemical peritonitis if rupture. Preserve as much ovarian tissue as possible.<span class="n-involve">Gynaecological surgeon</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Torsion</div>
  <div class="n-algo-body dark-body">Emergency laparoscopy. <strong>De-torsion first</strong> — even if the ovary looks ischaemic, it may recover. Oophorectomy only if clearly non-viable at 10 minutes post de-torsion.<span class="n-involve">Emergency gynaecology + theatre</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Torsion can occur in a normal ovary</strong> (especially in children and adolescents) or with a cyst. Unilateral pain + ovarian enlargement = torsion until proven otherwise regardless of cyst size.<span class="n-pearl-exam">Exam loves this: candidates look for a large cyst before suspecting torsion.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>CA-125 is not a screening test for ovarian cancer.</strong> It is only useful as part of RMI in symptomatic women with a pelvic mass. Low sensitivity and specificity in isolation.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>BRCA1/2 carriers:</strong> risk-reducing bilateral salpingo-oophorectomy recommended after completion of family (typically 35–40 for BRCA1, 40–45 for BRCA2). This dramatically reduces ovarian cancer risk.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal blood flow on Doppler excludes ovarian torsion.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Present Doppler flow does not exclude torsion.</strong> Partial torsion with preserved flow is well documented. The clinical diagnosis — acute onset unilateral pain, nausea, ovarian mass — should drive management. Normal Doppler should never be used to dismiss the diagnosis.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A functional cyst in a premenopausal woman can be watched for 12 weeks without action.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Re-imaging at 6–8 weeks is appropriate for simple cysts &lt;5cm in premenopausal women, not 12 weeks.</strong> Any cyst with complex features, symptoms, or in a postmenopausal woman requires RMI calculation and consideration of 2WW referral.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">CA-125 is the best test for diagnosing a malignant ovarian cyst.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CA-125 alone is insufficient — use the Risk of Malignancy Index (RMI) which combines USS score, menopausal status, and CA-125.</strong> CA-125 can be elevated in benign conditions and is normal in up to 50% of early ovarian cancers.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Sudden onset pain + ovarian cyst =<br><em>torsion until you've looked inside.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.cervicalcancer=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Oncology</div>
  <div class="n-hero-title">Cervical<br><em>Cancer</em></div>
  <div class="n-hero-sub">ICD C53 &nbsp;·&nbsp; Almost entirely preventable. Almost entirely caused by HPV.</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Malignancy of the cervix, predominantly <strong>squamous cell carcinoma (75%)</strong> or adenocarcinoma. HPV 16 and 18 drive 70% of cases.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Peak incidence 30–45. Risk: early sexual debut, multiple partners, HPV high-risk subtypes, smoking, immunosuppression, non-attendance at screening.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Screening detects pre-cancer (CIN). Vaccination prevents it. But when invasive — prognosis depends critically on stage at diagnosis.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Pathogenesis</span><span class="n-section-tag">HPV to cancer</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">HPV infection</div><div class="n-mech-text">High-risk HPV (16, 18, 31, 33) infects the transformation zone. Usually cleared by immune system. <strong>Persistent infection = risk of transformation.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">CIN (cervical intraepithelial neoplasia)</div><div class="n-mech-text">Pre-invasive changes. CIN1 (mild dysplasia), CIN2, CIN3 (severe dysplasia/carcinoma in situ). <strong>CIN3 left untreated → invasive cancer in ~30%</strong> over 10 years.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Invasion</div><div class="n-mech-text">Basement membrane breached → invasive cancer. Lymphovascular invasion → spread to parametria, bladder, rectum (direct), and iliac/para-aortic nodes (lymphatic).</div></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Post-coital bleeding + irregular vaginal bleeding in a woman of reproductive age → think <em>cervical cancer</em> → urgent colposcopy, do not wait for next smear.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>A normal smear does not exclude cervical cancer.</strong> Smears screen for pre-cancer — but invasive cancer can bleed and be missed if sampling is inadequate. Clinical symptoms warrant direct examination regardless of smear result.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Screening pathway UK</span><span class="n-section-tag">smear to treatment</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label ">Smear (25–64)</div><div class="n-diag-content">HPV primary screening. If HPV-positive: cytology added. HPV-negative: routine 5-yearly recall.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Colposcopy</div><div class="n-diag-content">If HPV+/high-grade cytology. Direct visualisation of transformation zone, aceto-white areas, and abnormal vasculature.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">LLETZ</div><div class="n-diag-content"><strong>Large Loop Excision of the Transformation Zone</strong> — treatment for CIN2/3. Outpatient, local anaesthetic. Curative in most cases.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Staging</div><div class="n-diag-content">FIGO staging: <strong>1A = microscopic</strong>, 1B = visible/&gt;5mm, 2 = extends beyond cervix, 3 = pelvic wall/lower vagina/hydronephrosis, 4 = bladder/rectum/distant.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Management</span><span class="n-section-tag">stage-dependent</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">IA1 (microinvasive)</div>
  <div class="n-algo-body"><strong>LLETZ or cone biopsy</strong> if fertility desired. Simple hysterectomy if not. Excellent prognosis: &gt;99% 5-year survival.<span class="n-involve">Gynaecological oncology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">IB1 (small invasive)</div>
  <div class="n-algo-body"><strong>Radical hysterectomy + pelvic lymphadenectomy</strong> or chemo-radiotherapy. Equivalent outcomes. Surgery preferred in younger women to preserve ovarian function.<span class="n-involve">Specialist MDT: gynaecological oncology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">IB2–IIA (larger tumour)</div>
  <div class="n-algo-body"><strong>Concurrent chemoradiotherapy</strong> (cisplatin + external beam + brachytherapy). Surgery has higher morbidity at this stage.<span class="n-involve">Clinical oncology + gynaecological oncology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">IIB–IV (advanced)</div>
  <div class="n-algo-body dark-body"><strong>Chemoradiotherapy ± brachytherapy.</strong> Palliative in Stage IV. Bevacizumab added in recurrent/metastatic disease improves survival.<span class="n-involve">Palliative care + oncology MDT</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>HPV vaccination</strong> (Gardasil 9): offered to girls and boys aged 12–13 in the UK. Protects against HPV 6, 11, 16, 18 and 5 additional high-risk types. Expected to eliminate &gt;90% of cervical cancers.<span class="n-pearl-exam">Exam loves this: vaccination + screening together are a near-elimination strategy.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Post-coital bleeding = urgent colposcopy</strong> regardless of smear result. This is a NICE 2WW (two-week wait) referral criterion. Do not reassure with a normal smear.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Fertility-sparing surgery</strong> (radical trachelectomy) is an option for carefully selected stage 1A–1B1 women who wish to preserve their uterus. Cervix removed, uterus retained with a cerclage.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Post-coital bleeding in a young woman is almost certainly cervical ectropion.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Post-coital bleeding requires speculum examination and urgent 2WW referral if no benign cause is immediately apparent.</strong> Ectropion is common and often responsible, but cervical cancer must be excluded. Do not reassure without examination.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A recent normal smear means cervical cancer is very unlikely.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Cervical screening reduces risk but does not eliminate it.</strong> Interval cancers occur. A symptomatic woman with a recent normal smear still requires clinical assessment — symptoms take precedence over screening history.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Stage IB cervical cancer always requires hysterectomy.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Stage IA1–IB1 can be managed with radical trachelectomy in women who wish to preserve fertility.</strong> Radical hysterectomy is the standard, but fertility-sparing surgery is an established option in selected cases at specialist centres.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">A vaccine. A smear programme.<br>This cancer is almost <em>entirely preventable.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.abruption=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Emergency</div>
  <div class="n-hero-title">Placental<br><em>Abruption</em></div>
  <div class="n-hero-sub">ICD O45 &nbsp;·&nbsp; Painful APH — but 20% have no visible bleeding at all</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Premature separation of the placenta from the uterine wall before delivery. Bleeding can be revealed (visible), concealed (trapped behind placenta), or mixed.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text"><strong>Hypertension</strong> (greatest risk), smoking, cocaine use, previous abruption, abdominal trauma, polyhydramnios, multiparity, chorioamnionitis.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Causes fetal hypoxia, fetal death, and DIC in the mother. Concealed abruption is the most dangerous — the size of the bleed is invisible.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Painful PV bleeding in the third trimester with a hard, woody uterus → think <em>abruption</em> → FHR monitoring immediately, bloods for DIC, IV access.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>20% of abruptions are concealed — no visible bleeding.</strong> The uterus is hard and tender, the mother is in pain, but there's no blood. Don't be falsely reassured by absence of PV bleeding.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Praevia vs Abruption</span><span class="n-section-tag">the exam loves this</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this"><div class="n-diff-card-tag">Abruption</div><div class="n-diff-card-name">Painful APH</div><div class="n-diff-card-key"><strong>Dark blood.</strong> Uterine tenderness. Hard/woody uterus. Fetal distress common. Concealment possible.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag">Placenta Praevia</div><div class="n-diff-card-name">Painless APH</div><div class="n-diff-card-key"><strong>Bright red blood.</strong> Uterus soft. No tenderness. Fetal condition often preserved initially. No VE.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>DIC is a direct consequence of severe abruption.</strong> Check fibrinogen, FBC, coagulation. Fibrinogen &lt;2 g/L = give cryoprecipitate immediately.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Concealed abruption can be catastrophic without any visible blood.</strong> Tender, hard uterus + fetal distress = emergency delivery regardless of external bleeding.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Continuous CTG is mandatory.</strong> Fetal compromise may be the first sign. Late decelerations, bradycardia, or sinusoidal pattern = emergency LSCS.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Antihypertensive treatment must not be delayed</strong> if hypertension is present — abruption + uncontrolled BP is a compounding emergency.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>The Couvelaire uterus</strong> (uteroplacental apoplexy): extravasated blood infiltrates the uterine muscle, turning it blue-purple. Rarely causes contractile failure — hysterectomy rarely needed but may be.<span class="n-pearl-exam">Exam loves this: rare but high-yield term.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Kleihauer-Betke test</strong> quantifies feto-maternal haemorrhage — guides anti-D dosing in Rh-negative women. Standard dose if &lt;4 mL FMH; additional doses if more.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>After abruption, risk of recurrence is 10× baseline</strong> in future pregnancies. Aspirin from 12 weeks and closer surveillance are recommended.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Placental abruption always presents with heavy vaginal bleeding.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>20% of abruptions are concealed — there is no external bleeding.</strong> The blood collects behind the placenta. A rigid, tender uterus with fetal distress and haemodynamic instability without visible bleeding is a concealed abruption until proven otherwise.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A normal CTG after abruption confirms fetal wellbeing.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CTG can be deceptively normal in early abruption.</strong> The fetal heart rate pattern may only deteriorate once significant placental separation has occurred. Continuous CTG is mandatory, and deterioration can be sudden.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Abruption-associated coagulopathy is managed with FFP alone.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Abruption causes consumptive coagulopathy — DIC.</strong> Management requires cryoprecipitate (for fibrinogen), platelets, and FFP in a 1:1:1 ratio alongside red cells. Fibrinogen &lt;2 g/L is a critical threshold — replace it specifically.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">No visible blood<br>doesn't mean <em>no bleeding.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.iol=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Intrapartum</div>
  <div class="n-hero-title">Induction of<br><em>Labour</em></div>
  <div class="n-hero-sub">IOL &nbsp;·&nbsp; ICD O61 &nbsp;·&nbsp; Initiating labour artificially before it starts spontaneously</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Artificial initiation of uterine contractions leading to delivery. Indications: post-dates, medical complication, IUFD, maternal choice, PPROM.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why we do it</div><div class="n-snap-text"><strong>Post-dates (41–42 weeks): stillbirth risk rises.</strong> NICE recommends offering IOL at 41 weeks. GDM, PET, IUGR, cholestasis — all may shorten the ideal gestation.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Done wrong: uterine hyperstimulation → fetal hypoxia. Done right: reduces stillbirth and avoids emergency caesarean.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Bishop Score</span><span class="n-section-tag">readiness for induction</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label ">Dilatation</div><div class="n-diag-content">0=0cm, 1=1-2cm, 2=3-4cm, 3=≥5cm</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Effacement</div><div class="n-diag-content">0=0-30%, 1=40-50%, 2=60-70%, 3=≥80%</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Station</div><div class="n-diag-content">0=-3, 1=-2, 2=-1/0, 3=+1/+2</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Consistency</div><div class="n-diag-content">0=firm, 1=medium, 2=soft</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Position</div><div class="n-diag-content">0=posterior, 1=mid, 2=anterior</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Interpretation</div><div class="n-diag-content"><strong>Bishop ≥8 = cervix favourable → ARM ± oxytocin.</strong> Bishop &lt;8 → cervical ripening first.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">IOL Pathway</span><span class="n-section-tag">step by step</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Cervical ripening</div>
  <div class="n-algo-body"><strong>Dinoprostone (PGE2) gel or pessary</strong>, or <strong>mechanical (balloon catheter / Cook catheter)</strong>. Balloon preferred if previous CS (reduces hyperstimulation risk). Reassess Bishop after 6 hours.<span class="n-involve">Obstetric team + midwifery</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">ARM (amniotomy)</div>
  <div class="n-algo-body">Once Bishop ≥6–8: <strong>artificial rupture of membranes</strong>. Assess fetal head position and presentation first. Continuous CTG after ARM.<span class="n-involve">Senior midwife or obstetrician</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Oxytocin infusion</div>
  <div class="n-algo-body"><strong>Syntocinon infusion</strong> — titrated to contractions. Continuous CTG mandatory. Target: 3–4 contractions per 10 minutes. Stop if hyperstimulation or CTG abnormality.<span class="n-involve">Obstetric-led ward</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Failed IOL</div>
  <div class="n-algo-body dark-body">No cervical change after complete IOL pathway → <strong>caesarean section.</strong> Reassess indication — if not urgent, short rest and re-evaluation.<span class="n-involve">Senior obstetrician</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Uterine hyperstimulation</strong> — &gt;5 contractions in 10 minutes or contractions lasting &gt;90 seconds. Stop oxytocin immediately. Tocolysis (terbutaline SC) if fetal compromise.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Previous uterine scar:</strong> prostaglandins increase uterine rupture risk. Use mechanical methods. If proceeding with oxytocin, use lower doses and close monitoring.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Decision-to-delivery interval matters</strong> — document time of decision, ARM, and oxytocin start. Audit standards apply to IOL labours.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Informed consent must cover failed induction and caesarean risk.</strong> IOL doubles caesarean risk in some groups if cervix is unfavourable.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Offering IOL at 41 weeks reduces stillbirth without increasing caesarean rate</strong> (Hannah Post-term trial, SWEPIS trial). Waiting for 42 weeks increases risk.<span class="n-pearl-exam">Exam loves this: the evidence shifted from 'wait' to 'offer'.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Misoprostol (PGE1) is not licensed in the UK for IOL</strong> but is used in low-resource settings and for IUFD. More potent and cheaper than dinoprostone. Higher hyperstimulation risk.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Balloon catheter is preferred over prostaglandins for previous caesarean IOL</strong> — lower uterine rupture risk. Transcervical Foley catheter inflated in the lower segment.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">08</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A Bishop score of 6 means induction will succeed.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Bishop score predicts likelihood of successful induction — it does not guarantee it.</strong> A score ≥8 is favourable; even then, failed induction occurs. Inform women that induction may result in emergency CS, especially in nulliparous women with an unfavourable cervix.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Oxytocin can be started immediately after membrane rupture if the cervix is unfavourable.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Oxytocin requires cervical ripening first if the Bishop score is &lt;6.</strong> Starting oxytocin on an unripe cervix in a multiparous woman risks uterine hyperstimulation. The sequence matters: ripen → rupture membranes → oxytocin.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Uterine hyperstimulation during induction just means the CTG needs closer watching.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Hyperstimulation (contractions &gt;5 in 10 minutes or contractions lasting &gt;2 minutes) requires immediate action:</strong> stop oxytocin, left lateral position, tocolysis if fetal compromise present. It is a clinical emergency, not a monitoring footnote.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Induction is a process, not an event.<br>The cervix decides <em>how long it takes.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.menopause=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Endocrine</div>
  <div class="n-hero-title">Meno-<br><em>pause</em></div>
  <div class="n-hero-sub">ICD N95 &nbsp;·&nbsp; 12 months of amenorrhoea — the end of oestrogen</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Permanent cessation of menstruation due to loss of ovarian follicular activity. Average age 51 in UK. <strong>Premature ovarian insufficiency (POI): before age 40.</strong></div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Every woman who lives long enough. Earlier in: smokers, chemotherapy/radiotherapy, bilateral oophorectomy, family history of early menopause.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Oestrogen withdrawal causes vasomotor symptoms, urogenital atrophy, osteoporosis, cardiovascular risk. HRT is highly effective when started early.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Hot flushes + amenorrhoea + elevated FSH in a woman over 45 → think <em>menopause</em> → clinical diagnosis, no blood tests required. Under 45 → FSH to confirm.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>FSH and LH are NOT needed to diagnose menopause in women over 45.</strong> NICE 2015: clinical diagnosis is sufficient. Blood tests are only required for women under 45 (where alternative diagnoses must be excluded) and for POI (&lt;40).</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">HRT — indications and choices</span><span class="n-section-tag">most important treatment</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Combined HRT (uterus intact)</div>
  <div class="n-algo-body"><strong>Oestrogen + progestogen.</strong> Progestogen protects the endometrium from oestrogen-driven hyperplasia. Sequential (bleed monthly) or continuous (no bleed, recommended &gt;1 year post-menopause).<span class="n-involve">GP / menopause clinic</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Oestrogen-only HRT (post-hysterectomy)</div>
  <div class="n-algo-body">No endometrium = no progestogen needed. <strong>Oestrogen alone is safer</strong> — lower breast cancer risk than combined HRT.<span class="n-involve">GP / menopause clinic</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Topical oestrogen</div>
  <div class="n-algo-body">For urogenital symptoms only (dryness, dyspareunia, recurrent UTI). <strong>No systemic absorption — no HRT systemic risks.</strong> Can be used indefinitely.<span class="n-involve">GP</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">POI — high-dose HRT</div>
  <div class="n-algo-body dark-body">Women with POI need HRT until at least age 51 to protect bones and cardiovascular system. <strong>Oral contraceptive pill can substitute</strong> while contraception is also needed.<span class="n-involve">Specialist POI / menopause clinic</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Postmenopausal bleeding = endometrial cancer until proven otherwise.</strong> Urgent 2WW referral. Even if on HRT — investigate all unexpected bleeding.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>POI before age 40</strong> requires urgent investigation: FSH × 2 (6 weeks apart), karyotype (Turner syndrome), autoimmune screen. Do not dismiss irregular periods in young women.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>HRT does not increase cardiovascular risk when started within 10 years of menopause</strong> (the 'timing hypothesis'). Fear of cardiovascular risk should not prevent HRT in appropriate women.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>HRT breast cancer risk:</strong> combined HRT carries a small increased risk (~4 extra cases per 1000 women over 5 years). Oestrogen-only has less risk. Absolute risk is small.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Transdermal (patch/gel) HRT has lower thrombotic risk than oral HRT.</strong> Oral oestrogen undergoes first-pass hepatic metabolism → clotting factor effects. Transdermal bypasses this. Prefer transdermal in women with VTE risk factors.<span class="n-pearl-exam">Exam loves this: candidates prescribe oral to everyone.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Micronised progesterone (Utrogestan)</strong> is the safest progestogen — lower breast cancer risk, no cardiovascular effect. Preferred over synthetic progestogens (norethisterone, medroxyprogesterone acetate).</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>HRT can be prescribed by GPs</strong> — no specialist referral required for straightforward cases. Refer if: POI, HRT failure, uncertainty about risk, or complex co-morbidities.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">HRT cannot be prescribed to women with a family history of breast cancer.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Family history of breast cancer is not a contraindication to HRT.</strong> Personal history of oestrogen-receptor positive breast cancer is a relative contraindication — discuss with oncology. Family history alone should not deny a woman effective treatment for severe menopausal symptoms.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Vaginal oestrogen is systemic HRT and carries the same risks.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Vaginal oestrogen is local therapy with negligible systemic absorption.</strong> It does not increase VTE or breast cancer risk. It is safe in almost all women including breast cancer survivors (with specialist guidance) and does not require progestogen to protect the endometrium.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">HRT should be stopped at age 60.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>There is no arbitrary age limit for HRT.</strong> The decision to continue is based on individual benefit-risk assessment. For women with severe symptoms or osteoporosis, the benefits often continue to outweigh risks well beyond 60. Annual review — not automatic cessation — is appropriate.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Menopause is not a disease.<br>But undertreated oestrogen deficiency <em>causes one.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.vulvalconditions=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Dermatology</div>
  <div class="n-hero-title">Vulval<br><em>Conditions</em></div>
  <div class="n-hero-sub">Lichen sclerosus · VIN · Bartholin's &nbsp;·&nbsp; The ones that get missed</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">A group of distinct vulval pathologies: <strong>lichen sclerosus (autoimmune atrophy), VIN (pre-cancer), Bartholin's cyst/abscess</strong>. Each requires different management.</div></div><div class="n-snap-cell"><div class="n-snap-label">Lichen sclerosus</div><div class="n-snap-text">White, atrophic, wrinkled skin ('cigarette paper'). Intense pruritus. Affects labia and peri-anal skin. Autoimmune — associated with thyroid disease and vitiligo.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Untreated lichen sclerosus → architectural distortion, phimosis of the clitoris, fused labia. 4–5% risk of squamous cell carcinoma of the vulva.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">White atrophic vulval skin + severe pruritus + figure-of-8 distribution (vulva + peri-anal) → think <em>lichen sclerosus</em> → potent topical steroid (clobetasol propionate).</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Lichen sclerosus is not a sexually transmitted infection.</strong> Patients are often wrongly told this. It is autoimmune. Sexual partners do not need treatment. Reassurance and correct diagnosis matter enormously for this group.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">The Main Vulval Conditions</span><span class="n-section-tag">side by side</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this"><div class="n-diff-card-tag">Autoimmune atrophy</div><div class="n-diff-card-name">Lichen Sclerosus</div><div class="n-diff-card-key">White, wrinkled, 'cigarette paper' skin. Severe itch. Figure-of-8 pattern. <strong>Clobetasol propionate</strong> ointment. Annual review for SCC.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag" style="color:#a03820">Inflammatory dermatosis</div><div class="n-diff-card-name">Lichen Planus</div><div class="n-diff-card-key">Erosive, glazed, red. Wickham's striae. Can involve vagina (causing scarring). Steroid cream ± vaginal steroid.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag" style="color:#6b4fa8">Pre-cancer</div><div class="n-diff-card-name">VIN (Vulval Intraepithelial Neoplasia)</div><div class="n-diff-card-key">Raised, thickened, erythematous or white lesions. Often multifocal. HPV-related or differentiated (from LS). <strong>Biopsy all suspicious lesions.</strong></div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag" style="color:#2a5aa8">Blocked duct</div><div class="n-diff-card-name">Bartholin's Cyst / Abscess</div><div class="n-diff-card-key">Cyst: painless, posterior labia. Abscess: acute onset, exquisitely tender swelling. Treat cyst if symptomatic; abscess needs <strong>marsupialisation or Word catheter</strong>.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Any suspicious vulval lesion must be biopsied.</strong> VIN and early vulval SCC are missed by appearance alone. Low threshold for biopsy in outpatients.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Lichen sclerosus without regular follow-up</strong> — annual review is required for life to detect malignant transformation. 4–5% SCC risk.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Bartholin's abscess in a postmenopausal woman</strong> — Bartholin's glands normally atrophy after menopause. A new swelling in this location = biopsy to exclude Bartholin's gland carcinoma.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Clobetasol propionate (0.05% ointment) is first-line for lichen sclerosus.</strong> Use nightly for 4 weeks, then alternate nights for 4 weeks, then twice weekly for maintenance. Do not underdose.<span class="n-pearl-exam">Exam loves this: candidates prescribe weak steroids.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>VIN is associated with high-risk HPV in younger women</strong> but with lichen sclerosus (differentiated VIN) in older women. The two types have different behaviours — differentiated VIN has higher malignant potential.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Word catheter</strong> for Bartholin's abscess: insert catheter, inflate balloon, leave in situ for 4–6 weeks to create an epithelialised tract. Preferable to simple incision and drainage which has high recurrence.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Lichen sclerosus is a skin condition — it can be managed by the GP indefinitely without review.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Lichen sclerosus requires annual specialist review indefinitely.</strong> The 4–5% lifetime risk of vulval SCC means ongoing surveillance is mandatory. Any non-healing area, induration, or failure to respond to clobetasol requires urgent biopsy.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Vulvodynia is a psychosomatic condition caused by anxiety.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Vulvodynia is a recognised chronic pain condition driven by peripheral and central sensitisation — not psychological illness.</strong> Dismissing it as anxiety delays treatment and causes harm. It requires a structured multidisciplinary approach: neuropathic analgesia, physio, and psychological support in combination.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Topical oestrogen is the first-line treatment for lichen sclerosus.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Topical oestrogen has no role in lichen sclerosus.</strong> First-line is clobetasol propionate 0.05% applied using the 3-month tapering regimen. Topical oestrogen treats vulvovaginal atrophy — a completely different condition.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">White skin. Itch. Figure-of-8.<br>Biopsy what you're not sure about. <em>Every time.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.ovariancancer=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Oncology</div>
  <div class="n-hero-title">Ovarian<br><em>Cancer</em></div>
  <div class="n-hero-sub">ICD C56 &nbsp;·&nbsp; The silent killer — late diagnosis, late symptoms</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Malignancy of the ovary. <strong>High-grade serous carcinoma (HGSC)</strong> is most common and most aggressive — 70% of cases. Also: clear cell, endometrioid, mucinous, low-grade serous.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Lifetime risk 1.7%. Risk: BRCA1/2 (40–60%), Lynch syndrome, nulliparity, endometriosis, HRT &gt;10 years. <strong>COCP reduces risk by 50% across 5 years of use.</strong></div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">5-year survival for Stage III–IV = &lt;30%. Most present at advanced stage. Debulking surgery + chemotherapy are the mainstays — but stage determines prognosis entirely.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Persistent bloating + early satiety + pelvic/abdominal mass in a postmenopausal woman → think <em>ovarian cancer</em> → USS + CA-125 → calculate RMI.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>The symptoms of ovarian cancer are non-specific and mimic IBS.</strong> Persistent bloating, change in bowel habit, and urinary frequency in a woman over 50 warrant USS — not a GI referral. NICE NG12: test CA-125 if any of these symptoms occur &gt;12 times/month.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Management</span><span class="n-section-tag">surgery + chemotherapy</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Primary debulking surgery</div>
  <div class="n-algo-body"><strong>Total abdominal hysterectomy + bilateral salpingo-oophorectomy + omentectomy</strong> + peritoneal sampling + pelvic/para-aortic lymphadenectomy. The more complete the cytoreduction, the better the survival.<span class="n-involve">Specialist gynaecological oncology MDT</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Chemotherapy</div>
  <div class="n-algo-body"><strong>Carboplatin + paclitaxel × 6 cycles</strong> — standard first-line. PARP inhibitors (olaparib, niraparib) as maintenance in BRCA-mutated or HRD tumours.<span class="n-involve">Clinical oncology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Neoadjuvant (bulky disease)</div>
  <div class="n-algo-body">If primary surgery not feasible: <strong>3 cycles carboplatin/paclitaxel → interval debulking surgery → 3 further cycles.</strong> Equivalent overall survival to primary surgery in selected cases.<span class="n-involve">MDT decision</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Recurrence</div>
  <div class="n-algo-body dark-body">Platinum-sensitive (&gt;6 months): repeat platinum + PARP inhibitor. Platinum-resistant: single-agent chemotherapy ± bevacizumab. Median survival 12–18 months.<span class="n-involve">Palliative + oncology</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>PARP inhibitors work by synthetic lethality in BRCA-mutated tumours.</strong> BRCA-mutated cells rely on PARP for DNA repair — inhibiting PARP causes irreparable DNA damage and cell death. Olaparib dramatically improves PFS as maintenance.<span class="n-pearl-exam">Exam loves this: mechanism question.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>COCP protects against ovarian cancer.</strong> 5 years of use = ~50% risk reduction. This protective effect persists for decades after stopping. The most powerful modifiable protective factor.<span class="n-pearl-exam">Exam loves this: protection in a contraceptive.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>CA-125 is used to monitor treatment response and detect recurrence</strong> — not as a screening test. A rising CA-125 during remission often predicts clinical recurrence by 3–6 months.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>BRCA1/2 carriers should be referred to clinical genetics.</strong> Risk-reducing PBSO reduces ovarian cancer risk by 80%. Timing depends on variant (BRCA1: 35–40; BRCA2: 40–45).</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>All high-grade ovarian cancer should have BRCA testing</strong> — for treatment decisions (PARP inhibitors) and family implications. This is standard of care.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">CA-125 is normal, so ovarian cancer is excluded.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CA-125 is normal in up to 50% of stage I ovarian cancers.</strong> A normal result does not exclude malignancy. In a woman with persistent symptoms (≥12 times/month), normal CA-125 should prompt USS, not reassurance.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Ovarian cancer is rare in women under 50 and can be deprioritised in younger patients.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>20% of ovarian cancers occur in women under 50, including BRCA carriers.</strong> Younger women are more likely to be diagnosed late because the diagnosis is not considered. BRCA testing should be offered to all women diagnosed with ovarian cancer regardless of age.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Ascites with an ovarian mass is probably benign — it's common with large cysts.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Ascites with an ovarian mass is ovarian cancer until proven otherwise.</strong> Direct urgent referral without waiting for CA-125 or USS is indicated. Do not attribute ascites to a benign cyst.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Persistent bloating in a woman over 50<br>is not IBS until you've done a <em>CA-125 and an ultrasound.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.subfertility=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Reproductive</div>
  <div class="n-hero-title">Sub-<br><em>fertility</em></div>
  <div class="n-hero-sub">ICD N97 &nbsp;·&nbsp; Failure to conceive after 12 months — investigate both partners</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Failure to conceive after 12 months of regular unprotected intercourse (or 6 months if woman &gt;35 or known risk factor). 1 in 7 couples affected.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Equal male and female causes. <strong>Male factor: ~30%</strong>. Female ovulatory: ~25%. Tubal: ~20%. Unexplained: ~25%. Both: ~10%. Never investigate one partner without the other.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Investigation is time-sensitive (especially with age). Many causes are treatable — ovulatory dysfunction responds well to induction. Tubal disease may require IVF.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Initial Investigation</span><span class="n-section-tag">at first consultation — both partners</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label ">Semen analysis</div><div class="n-diag-content"><strong>First test. Always.</strong> WHO criteria: volume &gt;1.5 mL, sperm count &gt;16 million/mL, motility &gt;42%, morphology &gt;4% (strict criteria). Two analyses if abnormal.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Ovulation</div><div class="n-diag-content">Mid-luteal progesterone: &gt;30 nmol/L confirms ovulation in a 28-day cycle (taken day 21). FSH, LH, AMH (ovarian reserve), prolactin, TFT.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Tubal patency</div><div class="n-diag-content"><strong>HyCoSy</strong> (hysterosalpingo-contrast sonography) or <strong>laparoscopy and dye test</strong>. Hysterosalpingography (HSG) is alternative.</div></div>
    <div class="n-diag-row"><div class="n-diag-label ">Uterine cavity</div><div class="n-diag-content">USS, or SIS (saline infusion sonography) for intrauterine pathology (polyps, fibroids, adhesions).</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Common mistake</div><div class="n-diag-content">Investigating only the woman at first appointment. Male factor accounts for 30% — semen analysis should be requested simultaneously.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">12 months of trying + oligomenorrhoea + elevated LH:FSH → think <em>PCOS</em> → letrozole for ovulation induction after confirming both partners investigated.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Hydrosalpinx halves IVF success rates.</strong> A hydrosalpinx found before IVF must be treated with salpingectomy (not drainage — it refills). Do not proceed to IVF cycles with a known hydrosalpinx.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management by cause</span><span class="n-section-tag">matched to diagnosis</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Ovulatory dysfunction (PCOS)</div>
  <div class="n-algo-body"><strong>Letrozole first-line</strong> for ovulation induction (NICE). Metformin as adjunct in insulin-resistant women. All cycles require USS monitoring. FSH injections if letrozole fails.<span class="n-involve">Reproductive medicine clinic</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Tubal factor</div>
  <div class="n-algo-body"><strong>IVF is first-line</strong> for tubal disease. Tubal surgery may be appropriate for mild distal disease in specialist hands — but IVF is usually more effective and faster.<span class="n-involve">Reproductive medicine clinic</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Male factor</div>
  <div class="n-algo-body">Mild–moderate: <strong>IUI</strong> (intrauterine insemination). Severe oligospermia or azoospermia: <strong>ICSI (intracytoplasmic sperm injection)</strong> — a single sperm injected directly into the egg.<span class="n-involve">Reproductive medicine</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Unexplained subfertility</div>
  <div class="n-algo-body dark-body">Expectant management if &lt;35 with normal investigations. <strong>IUI × 3 cycles</strong> then IVF if not successful. Risk of delay increases with maternal age.<span class="n-involve">Reproductive medicine</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Letrozole has replaced clomifene as first-line ovulation induction in PCOS.</strong> Higher live birth rates, lower multiple pregnancy risk, no anti-oestrogenic endometrial effect.<span class="n-pearl-exam">Exam loves this: candidates say clomifene.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>AMH (anti-Müllerian hormone) predicts ovarian reserve</strong> — guides IVF stimulation protocol. Low AMH = fewer eggs = higher dose FSH. It does not predict fertility in natural conception.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>OHSS (ovarian hyperstimulation syndrome)</strong> — risk with FSH injections. Mild: bloating, mild pain. Severe: massive ascites, thromboembolism, renal failure. Prevent with agonist trigger, cycle cancellation, or embryo freeze-all strategy.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">The woman's investigations are normal, so male factor is unlikely.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Male factor contributes to 30% of subfertility cases — it is the single most common identifiable cause.</strong> Semen analysis must be requested at the first consultation, not after female investigations are complete. Investigating sequentially wastes months.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A day 21 progesterone of 28 nmol/L in a 28-day cycle indicates anovulation.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Day 21 progesterone of 28 nmol/L is borderline, not definitively anovulatory.</strong> Values &gt;30 nmol/L confirm ovulation. Values 16–30 require repeat testing in a subsequent cycle before concluding anovulation. A single borderline result should not drive treatment decisions.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">IVF is the appropriate next step after 6 months of unexplained subfertility.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>IVF is the end of the pathway, not the first response to unexplained subfertility.</strong> After completing investigation, expectant management for up to 2 years (in women under 35 with no identified cause) is appropriate. Ovulation induction and IUI precede IVF in most pathways.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Never investigate one partner<br><em>without investigating both.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES_MCQ.pph=[
  {q:"A woman delivers vaginally and loses 1200ml. The uterus is soft and boggy. What is the most likely cause?",opts:["Retained placenta","Uterine atony","Genital tract trauma","Coagulopathy"],ans:1,focus:"4 Ts — Tone as most common cause",exp:"<strong>Uterine atony</strong> causes 70–80% of PPH. A soft boggy uterus that fails to contract is the classic sign. The 4 Ts: <strong>Tone</strong> (most common), Trauma, Tissue, Thrombin. First steps: bimanual massage + oxytocin immediately."},
  {q:"First-line uterotonic for PPH prevention and treatment is:",opts:["Ergometrine","Carboprost","Tranexamic acid","Oxytocin"],ans:3,focus:"Uterotonic drug hierarchy",exp:"<strong>Oxytocin</strong> is first-line for both prevention (active management of third stage) and PPH treatment. Ergometrine is second-line (contraindicated in hypertension). Carboprost (PGF2α) when both fail. Tranexamic acid is an antifibrinolytic — not a uterotonic, give within 3 hours."},
  {q:"The WOMAN trial showed tranexamic acid reduces PPH mortality when given within:",opts:["1 hour of delivery","3 hours of PPH onset","6 hours of PPH onset","Only with confirmed coagulopathy"],ans:1,focus:"WOMAN trial — tranexamic acid timing",exp:"The <strong>WOMAN trial</strong>: tranexamic acid reduces PPH-related death when given within <strong>3 hours of onset</strong>. Benefit drops sharply after 3 hours. Dose: 1g IV over 10 min, repeat after 30 min if still bleeding."},
  {q:"After oxytocin and ergometrine fail in PPH, the next pharmacological step is:",opts:["Misoprostol PR","Carboprost IM","IV tranexamic acid","B-Lynch suture"],ans:1,focus:"Uterotonic escalation ladder",exp:"<strong>Carboprost (15-methyl PGF2α)</strong> is third-line after oxytocin and ergometrine. Give 250mcg IM, repeat every 15 min, max 8 doses. <strong>Contraindicated in asthma</strong> — causes bronchospasm. B-Lynch is a surgical intervention, not pharmacological."},
  {q:"Shock Index >1 in PPH indicates:",opts:["Normal haemodynamics","Mild blood loss only","Significant haemodynamic compromise requiring action","Coagulopathy confirmed"],ans:2,focus:"Shock Index in haemorrhage assessment",exp:"<strong>Shock Index = HR ÷ Systolic BP.</strong> Normal: 0.5–0.7. Value <strong>>1.0</strong> = significant haemodynamic compromise, predicts need for massive transfusion. Detects shock earlier than HR or BP alone because compensation maintains BP while perfusion is critically impaired."}
];
NOTES_MCQ.shoulder=[
  {q:"Shoulder dystocia is diagnosed when:",opts:["Head delivers but shoulders take >60 seconds","Gentle axial traction fails to deliver the shoulders after head delivery","CTG shows late decels in second stage","Estimated fetal weight exceeds 4.5kg"],ans:1,focus:"Definition of shoulder dystocia",exp:"<strong>Shoulder dystocia</strong> = gentle axial traction fails to deliver the shoulders after head delivery. It is <strong>not time-based</strong>. The anterior shoulder is impacted behind the pubic symphysis. An obstetric emergency with risk of brachial plexus injury and neonatal asphyxia."},
  {q:"In the HELPERR mnemonic, what does 'H' stand for?",opts:["Head delivery first","Hyperflexion (McRoberts)","Help — call for it immediately","Hydrostatic reduction"],ans:2,focus:"HELPERR — sequence and meaning",exp:"<strong>H = Call for Help.</strong> HELPERR: <strong>H</strong>elp, <strong>E</strong>pisiotomy if needed, <strong>L</strong>egs (McRoberts), <strong>P</strong>ressure (suprapubic), <strong>E</strong>nter (internal manoeuvres), <strong>R</strong>emove posterior arm, <strong>R</strong>oll to all-fours. Help is always first — you need senior obstetrics, anaesthetics, and neonatology."},
  {q:"The McRoberts manoeuvre resolves shoulder dystocia by:",opts:["Widening the true conjugate of the pelvis","Flattening lumbar lordosis and rotating the symphysis superiorly","Directly dislodging the impacted shoulder","Increasing uterine contraction strength"],ans:1,focus:"McRoberts mechanism",exp:"<strong>McRoberts</strong>: maternal thighs hyperflexed onto abdomen. This flattens lumbar lordosis and rotates the pubic symphysis <strong>superiorly</strong>, increasing the relative AP outlet diameter. Resolves ~40% of cases when combined with suprapubic pressure."},
  {q:"Suprapubic pressure in shoulder dystocia should be directed:",opts:["Straight down on the fundus","Laterally onto the posterior aspect of the anterior shoulder toward the fetal face","Upward to push the shoulder above the inlet","Circumferentially around the fundus"],ans:1,focus:"Suprapubic pressure technique",exp:"Suprapubic pressure is applied <strong>laterally downward</strong> onto the posterior aspect of the anterior shoulder, adducting it toward the fetal face to reduce the shoulder-to-shoulder diameter. <strong>Not fundal pressure</strong> — fundal pressure worsens impaction. Use a rocking motion."},
  {q:"Excessive lateral traction on the head during shoulder dystocia causes:",opts:["Clavicle fracture","Erb's palsy (C5-C6 brachial plexus injury)","Hypoxic-ischaemic encephalopathy","Uterine rupture"],ans:1,focus:"Erb's palsy — mechanism and prevention",exp:"<strong>Erb's palsy</strong> (C5-C6) results from excessive lateral traction stretching the brachial plexus. Classic posture: arm adducted, internally rotated, elbow extended. This is why <strong>axial traction only</strong> is allowed — never lateral. ~10% have permanent injury."}
];
NOTES_MCQ.preeclampsia=[
  {q:"Preeclampsia is defined as new hypertension after 20 weeks with:",opts:["Headache and visual disturbance","Proteinuria or end-organ dysfunction","Facial and hand oedema","BP >140 on a single reading"],ans:1,focus:"Diagnostic criteria for preeclampsia",exp:"<strong>Preeclampsia</strong> = new hypertension (≥140/90) after 20 weeks + <strong>proteinuria OR end-organ dysfunction</strong> (renal, hepatic, neurological, haematological, uteroplacental). Oedema alone is not diagnostic. BP must be on two readings ≥4 hours apart unless severe."},
  {q:"First-line treatment for severe hypertension (≥160/110) in pregnancy:",opts:["Methyldopa","Atenolol","Labetalol IV or oral nifedipine","Ramipril"],ans:2,focus:"Antihypertensives safe in pregnancy",exp:"<strong>Labetalol IV</strong> or <strong>oral nifedipine</strong> for acute severe hypertension. ACE inhibitors (ramipril) are <strong>absolutely contraindicated</strong> — cause fetal renal agenesis and oligohydramnios. Atenolol causes fetal growth restriction. Methyldopa is safe but too slow for acute control."},
  {q:"Magnesium sulphate is given in eclampsia to:",opts:["Lower blood pressure urgently","Prevent and treat seizures","Accelerate fetal lung maturity","Reverse coagulopathy"],ans:1,focus:"Role and mechanism of magnesium sulphate",exp:"<strong>MgSO₄</strong> prevents and treats eclamptic seizures — it is <strong>not antihypertensive</strong>. Blocks NMDA receptors and reduces cerebral vasospasm. Loading: 4g IV over 5–15 min. Maintenance: 1g/hr. Toxicity signs: loss of patellar reflexes → respiratory depression → cardiac arrest. Antidote: <strong>calcium gluconate</strong>."},
  {q:"HELLP syndrome is characterised by:",opts:["Haemolysis, Elevated Liver enzymes, Low Platelets","Hypertension, Encephalopathy, Liver failure, Low Pressure","Haematuria, Elevated LDH, Low Protein","Haemolysis, Elevated LDH, Low Pulse"],ans:0,focus:"HELLP syndrome — definition and features",exp:"<strong>HELLP</strong>: Haemolysis + Elevated Liver enzymes + Low Platelets. Severe variant of preeclampsia. Key labs: schistocytes on film, AST/ALT >70 IU/L, platelets <100×10⁹/L. Can occur without hypertension or proteinuria. Only definitive treatment is delivery."},
  {q:"The only definitive treatment for preeclampsia is:",opts:["Magnesium sulphate","Corticosteroids","Delivery","Antihypertensive therapy"],ans:2,focus:"Delivery as the only cure",exp:"<strong>Delivery</strong> is the only cure — the placenta is the cause. All other treatments are supportive. Decision timing: ≥37 weeks → deliver. <37 weeks → balance prematurity vs maternal risk. Severe disease or HELLP → deliver regardless of gestation. Corticosteroids given for lung maturity if <34 weeks."}
];


NOTES_MCQ.ectopic=[
  {q:"A woman presents with 7 weeks amenorrhoea, left iliac fossa pain, and light vaginal bleeding. Urine βhCG is positive. First investigation:",opts:["Transvaginal ultrasound","Diagnostic laparoscopy","Serum progesterone","CT abdomen"],ans:0,focus:"Ectopic pregnancy investigation sequence",exp:"<strong>Transvaginal ultrasound (TVUS)</strong> is first-line. It can identify an intrauterine pregnancy, an adnexal mass, and free fluid. Laparoscopy is diagnostic and therapeutic but not first-line without imaging. The goal of TVUS is to locate the pregnancy — an empty uterus with a positive hCG and adnexal mass = ectopic until proven otherwise."},
  {q:"The discriminatory zone in ectopic pregnancy refers to:",opts:["βhCG level above which TVUS should always detect an IUP","The zone of uterine pain on examination","Serum progesterone threshold","Gestational age at which ectopic is most common"],ans:0,focus:"Discriminatory zone concept",exp:"The <strong>discriminatory zone</strong> is the βhCG level above which a normal intrauterine pregnancy should be visible on TVUS — typically <strong>1500–2000 IU/L</strong>. If βhCG exceeds this and TVUS shows an empty uterus → ectopic or failed IUP. Below this threshold, a normal early IUP may not yet be visible."},
  {q:"A haemodynamically unstable patient with suspected ruptured ectopic pregnancy. Correct management:",opts:["Serial βhCG measurements","Methotrexate IM","Emergency laparoscopy or laparotomy","Transvaginal ultrasound to confirm diagnosis first"],ans:2,focus:"Ruptured ectopic — immediate surgical management",exp:"Haemodynamic instability from ruptured ectopic = <strong>immediate surgical intervention</strong>. No time for serial bloods or imaging. Two large-bore IVs, blood products, call theatre. Laparoscopy is preferred if skill available; laparotomy if unstable. Methotrexate is only for unruptured, stable, haemodynamically normal patients."},
  {q:"Methotrexate for ectopic pregnancy is contraindicated in:",opts:["βhCG of 800 IU/L","Adnexal mass of 25mm","Fetal cardiac activity present on USS","Previous PID"],ans:2,focus:"Methotrexate contraindications",exp:"<strong>Fetal cardiac activity</strong> is an absolute contraindication to methotrexate. Other contraindications: βhCG >5000, mass >35mm, haemodynamic instability, immunodeficiency, liver/renal disease, breastfeeding. The presence of cardiac activity indicates a more advanced ectopic with higher risk of failure from medical management."},
  {q:"Which βhCG pattern is most reassuring for a viable intrauterine pregnancy?",opts:["Plateau over 48 hours","Rise of 15% over 48 hours","Rise of ≥66% over 48 hours","Any positive result on serial testing"],ans:2,focus:"Serial βhCG interpretation",exp:"In a viable IUP, βhCG should rise by <strong>≥66% every 48 hours</strong> in early pregnancy. A rise &lt;66% suggests failing IUP or ectopic. A plateau or fall suggests non-viable pregnancy. Note: a falling hCG does not always mean safe — ectopics can have falling hCG and still rupture."}
];
NOTES_MCQ.placenta=[
  {q:"A woman at 32 weeks presents with painless, bright red vaginal bleeding. She has had two previous caesarean sections. Most likely diagnosis:",opts:["Placental abruption","Placenta praevia","Show","Vasa praevia"],ans:1,focus:"Placenta praevia — classic presentation",exp:"<strong>Placenta praevia</strong> = painless, bright red bleeding in the third trimester. Previous uterine surgery is a major risk factor. Placental abruption causes painful, dark bleeding with a tender woody uterus. Vasa praevia presents at rupture of membranes. The painless nature and previous CS scars make praevia the diagnosis here."},
  {q:"In suspected placenta praevia, vaginal examination is:",opts:["Helpful to assess cervical dilation","Contraindicated — can precipitate catastrophic haemorrhage","Indicated only if the patient is haemodynamically stable","Replaced by rectal examination"],ans:1,focus:"Never perform VE in placenta praevia",exp:"<strong>Never perform a vaginal examination</strong> in placenta praevia. The examining finger can disrupt the placenta overlying the cervical os and cause massive, uncontrollable haemorrhage. Diagnosis is by ultrasound — ideally transvaginal (paradoxically safer than transabdominal for posterior praevia). This is an absolute rule."},
  {q:"A placenta praevia is classified as major when:",opts:["Placental edge within 20mm of internal os","Placenta reaches but does not cover the os","Placenta covers the internal os","Any placenta in the lower segment"],ans:2,focus:"Classification of placenta praevia",exp:"<strong>Major praevia</strong>: placenta covers the internal os. <strong>Minor praevia</strong>: placental edge within 20mm of the os but not covering it. Major praevia mandates caesarean section. Minor praevia may allow vaginal birth depending on the exact distance — decision made on case-by-case basis with senior input."},
  {q:"The primary risk of placenta praevia accreta in a patient with two prior CS scars is:",opts:["Preterm labour","Abnormal placental attachment requiring hysterectomy","Postpartum depression","Cord prolapse"],ans:1,focus:"Placenta accreta spectrum",exp:"Prior CS scars create uterine scarring. When placenta praevia overlies a CS scar, trophoblast can invade abnormally deeply — <strong>placenta accreta spectrum (PAS)</strong>. Accreta: invades myometrium. Increta: through myometrium. Percreta: through serosa. PAS often requires <strong>caesarean hysterectomy</strong> — plan delivery at a centre with multidisciplinary haematology, urology, and interventional radiology support."},
  {q:"Antepartum haemorrhage due to placenta praevia at 34 weeks, mother stable, baby well. Correct management:",opts:["Emergency caesarean section","Expectant management with steroids, crossmatch, and senior review","Induce labour to expedite delivery","Methotrexate to reduce placental vascularity"],ans:1,focus:"Expectant management of placenta praevia",exp:"At 34 weeks with a stable mother and fetus, <strong>expectant management</strong> is appropriate. Give <strong>corticosteroids</strong> for fetal lung maturity, crossmatch blood, admit for monitoring, senior obstetric review. Aim to reach 36–37 weeks before planned caesarean if no further bleeds. Emergency CS only if haemodynamic compromise, fetal compromise, or uncontrolled haemorrhage."}
];
NOTES_MCQ.gdm=[
  {q:"The diagnostic test for gestational diabetes mellitus (GDM) is:",opts:["Random blood glucose >11.1","Fasting glucose on two occasions","75g oral glucose tolerance test (OGTT) at 24–28 weeks","HbA1c >48 mmol/mol"],ans:2,focus:"GDM diagnosis — OGTT",exp:"The <strong>75g OGTT at 24–28 weeks</strong> is the gold standard for GDM diagnosis. GDM is diagnosed if: fasting glucose ≥5.6 mmol/L OR 2-hour glucose ≥7.8 mmol/L (NICE thresholds). HbA1c is unreliable in pregnancy due to increased red cell turnover. Random glucose and fasting alone are insufficient."},
  {q:"Which fetal complication is most directly caused by maternal hyperglycaemia in GDM?",opts:["Intrauterine growth restriction","Macrosomia","Neural tube defect","Renal agenesis"],ans:1,focus:"Macrosomia — mechanism in GDM",exp:"Maternal glucose crosses the placenta; fetal insulin does not. Fetal hyperglycaemia → <strong>fetal hyperinsulinaemia</strong> → excess anabolic drive → <strong>macrosomia</strong> (birthweight >4kg or >90th centile). Macrosomia increases risk of shoulder dystocia, operative delivery, and birth trauma. IUGR occurs in pre-existing diabetes with vascular disease, not typically GDM."},
  {q:"A woman with GDM fails dietary management. First pharmacological step:",opts:["Insulin","Metformin","Glibenclamide","Acarbose"],ans:1,focus:"GDM pharmacological management",exp:"<strong>Metformin</strong> is first-line pharmacological treatment when diet and exercise fail. It crosses the placenta (which has been studied — no demonstrated harm) and is effective. If metformin is insufficient or not tolerated, <strong>insulin</strong> is added. Glibenclamide is second-line in some guidelines. Acarbose is rarely used in pregnancy."},
  {q:"The most important neonatal complication to monitor for immediately after delivery in GDM:",opts:["Jaundice","Hypoglycaemia","Polycythaemia","Respiratory distress syndrome"],ans:1,focus:"Neonatal hypoglycaemia in GDM",exp:"<strong>Neonatal hypoglycaemia</strong> is the priority. In utero, the fetus was exposed to high glucose → high insulin. At birth, the glucose supply stops abruptly but insulin levels remain high → hypoglycaemia within minutes to hours. Monitor blood glucose within 1–2 hours of birth. Feed early. Thresholds vary by unit — typically BG <2.0–2.6 mmol/L requires intervention."},
  {q:"A woman who had GDM should be tested postpartum with:",opts:["Urine dipstick at 6-week check","75g OGTT at 6–13 weeks postpartum","Annual HbA1c for 5 years only","No follow-up needed if delivery glucose was normal"],ans:1,focus:"Postpartum GDM follow-up",exp:"Women with GDM have a <strong>50% lifetime risk of developing type 2 diabetes</strong>. NICE recommends a <strong>75g OGTT at 6–13 weeks postpartum</strong> to rule out persistent diabetes, then annual HbA1c indefinitely. Many women who appear normal at discharge are in fact glucose-impaired. Lifelong surveillance is essential — this is not a condition that ends at delivery."}
];
NOTES_MCQ.pretermlabour=[
  {q:"A woman at 29 weeks presents in confirmed preterm labour. What is the single most important intervention to improve neonatal outcome?",opts:["Start tocolysis immediately","Give corticosteroids immediately","Transfer to a tertiary NICU","Perform an emergency caesarean section"],ans:1,focus:"Corticosteroids — priority over tocolysis",exp:"<strong>Corticosteroids (betamethasone 12mg IM ×2)</strong> are the most impactful intervention. They reduce RDS, IVH, NEC, and neonatal mortality. Tocolysis is used to buy time for steroids and transfer — it does not improve outcome directly. Give steroids first, then tocolyse. Transfer is important but steroids take priority."},
  {q:"Magnesium sulphate given to a woman in preterm labour at 28 weeks is primarily indicated for:",opts:["Seizure prophylaxis","Tocolysis — to delay delivery","Neonatal neuroprotection against cerebral palsy","Fetal lung maturation"],ans:2,focus:"MgSO₄ for neuroprotection — not seizures in preterm labour",exp:"In <strong>preterm labour &lt;30 weeks</strong>, MgSO₄ is given for <strong>neonatal neuroprotection</strong> — reducing the risk of cerebral palsy by ~30%. It stabilises oligodendrocyte precursors and reduces periventricular white matter injury. This is distinct from its use in preeclampsia (seizure prevention). Fetal lung maturation = betamethasone."},
  {q:"Fetal fibronectin (fFN) is most clinically useful when the result is:",opts:["Positive — confirms preterm labour","Negative — rules out delivery within 7 days","Elevated above 200 ng/mL — mandates delivery","Any result — it guides tocolytic choice"],ans:1,focus:"fFN — clinical utility of negative result",exp:"The most clinically useful result of fFN is <strong>negative (&lt;10 ng/mL)</strong>. A negative result has &gt;95% negative predictive value for delivery within 7 days — safely avoids unnecessary hospitalisation, tocolysis, and steroids. A positive result has poor positive predictive value (many positive results do not deliver within 7 days) — it prompts action but doesn't confirm imminent delivery."},
  {q:"A woman at 31 weeks with PPROM should receive which antibiotic?",opts:["Co-amoxiclav (Augmentin)","Erythromycin","Metronidazole","Amoxicillin alone"],ans:1,focus:"PPROM antibiotics — erythromycin, not co-amoxiclav",exp:"<strong>Erythromycin</strong> 250mg QDS for 10 days (ORACLE trial). It delays delivery and reduces maternal and neonatal infection. <strong>Co-amoxiclav is contraindicated</strong> in PPROM — the ORACLE trial showed significantly increased risk of <strong>necrotising enterocolitis</strong> in neonates exposed to co-amoxiclav. This is a critical distinction that comes up in exams and in practice."},
  {q:"Tocolysis is contraindicated in which of the following situations?",opts:["Cervix 2cm dilated at 30 weeks","Singleton pregnancy at 27 weeks with intact membranes","PPROM with maternal fever and uterine tenderness","Fetal fibronectin positive at 29 weeks"],ans:2,focus:"Tocolysis contraindications — chorioamnionitis",exp:"<strong>Signs of chorioamnionitis</strong> (maternal fever, uterine tenderness, fetal tachycardia, offensive liquor) are an absolute contraindication to tocolysis. Continuing pregnancy risks maternal sepsis and fetal death. Deliver promptly with appropriate antibiotics and senior involvement. Tocolysis in chorioamnionitis is harmful, not helpful."}
];
NOTES_MCQ.ovarycyst=[
  {q:"A 26-year-old is found to have a 4cm unilocular, thin-walled, anechoic ovarian cyst on USS. CA-125 is normal. Most appropriate management:",opts:["Urgent 2-week-wait referral","Laparoscopic cystectomy","Repeat USS in 6–8 weeks","Commence COCP to resolve the cyst"],ans:2,focus:"Simple unilocular cyst — conservative management",exp:"A <strong>simple unilocular anechoic cyst</strong> with no concerning features (no solid areas, no Doppler flow, no septations) in a premenopausal woman is almost certainly benign and functional. <strong>Repeat USS in 6–8 weeks</strong> is appropriate to confirm resolution. COCP does not accelerate resolution of existing cysts. Surgery is not indicated without symptoms or concerning features."},
  {q:"According to the IOTA simple rules, which finding is classified as an M-feature (likely malignant)?",opts:["Unilocular cyst","Acoustic shadowing","Ascites","Smooth thin-walled multilocular cyst &lt;100mm"],ans:2,focus:"IOTA M-features — malignant risk stratification",exp:"<strong>Ascites</strong> is an IOTA M-feature (along with irregular solid tumour, ≥4 papillary projections, irregular multilocular solid &gt;100mm, and very strong Doppler flow). Acoustic shadowing and unilocular cysts are B-features (benign). Any M-feature present with no B-features = likely malignant → urgent referral. B-features only = likely benign."},
  {q:"A 24-year-old with sudden severe right iliac fossa pain and vomiting has a 6cm right ovarian dermoid on USS. Doppler shows preserved flow. Most likely diagnosis:",opts:["Appendicitis","Ruptured ovarian cyst","Ovarian torsion","Pelvic inflammatory disease"],ans:2,focus:"Ovarian torsion — Doppler does not exclude it",exp:"<strong>Ovarian torsion</strong> — the classic presentation: sudden severe unilateral pelvic pain, nausea/vomiting, ovarian cyst acting as a fulcrum. <strong>Preserved Doppler flow does NOT exclude torsion</strong> — partial torsion maintains flow. Proceed to diagnostic laparoscopy regardless of Doppler. Dermoid cysts have high torsion risk (weight + mobility). Early untwisting in situ can save the ovary."},
  {q:"An endometrioma is best described on ultrasound as:",opts:["Unilocular anechoic cyst with thin walls","Ground-glass echogenicity with uniform low-level internal echoes","Complex cyst with multiple solid papillary projections","Hyperechoic cyst with posterior acoustic shadowing"],ans:1,focus:"Endometrioma — USS appearance",exp:"<strong>Endometrioma</strong> has characteristic <strong>ground-glass echogenicity</strong> — uniform low-level internal echoes from old haemorrhagic fluid. This is essentially pathognomonic. Acoustic shadowing = dermoid. Papillary projections = concerning for malignancy. Anechoic = functional/serous cystadenoma. CA-125 is often elevated in endometrioma — this does not indicate malignancy in this context."},
  {q:"In a woman planning IVF who has a 4cm endometrioma, the best advice regarding surgical removal prior to IVF is:",opts:["Always remove — improves IVF success rates","Remove only if symptomatic — surgery may reduce ovarian reserve without improving IVF outcomes","Always leave — surgery is too risky","Remove if &gt;3cm to prevent torsion"],ans:1,focus:"Endometrioma and IVF — surgical decision",exp:"Surgical removal of endometriomas <strong>does not consistently improve IVF outcomes</strong> and may reduce them by damaging ovarian reserve — the excision inevitably removes some normal ovarian cortex. Current evidence supports <strong>expectant management</strong> unless the cyst is symptomatic, rapidly enlarging, or causing access problems for egg collection. This is a nuanced shared decision — refer to specialist for individualised advice."}
];
NOTES_MCQ.cervicalcancer=[
  {q:"The primary mechanism by which high-risk HPV causes cervical carcinoma is:",opts:["Direct invasion of cervical stroma","Integration of E6/E7 oncoproteins inactivating p53 and Rb","Stimulation of oestrogen receptors","Inhibition of cervical mucus production"],ans:1,focus:"HPV oncogenesis — E6/E7 mechanism",exp:"HPV <strong>E6 and E7 oncoproteins</strong> are the molecular drivers of carcinogenesis. E6 binds and degrades <strong>p53</strong> (tumour suppressor). E7 inactivates <strong>Rb</strong> (retinoblastoma protein — cell cycle brake). Loss of both controls leads to unregulated proliferation. This is why persistent high-risk HPV infection (not transient) drives malignant transformation — integration into host DNA is required."},
  {q:"A 32-year-old has a cervical smear showing HPV positive with normal cytology. Correct management:",opts:["Immediate colposcopy referral","Repeat HPV test and cytology in 12 months","Treat with topical imiquimod","Reassure — no follow-up needed for 5 years"],ans:1,focus:"HPV positive, normal cytology — management pathway",exp:"In the UK primary HPV testing programme: <strong>HPV positive + normal cytology → repeat in 12 months</strong>. If still HPV positive at 12 months → colposcopy. If HPV negative at 12 months → return to routine recall. Only abnormal cytology (with HPV positive) triggers immediate colposcopy. This pathway is designed to avoid overreferring women whose HPV will clear spontaneously."},
  {q:"CIN 3 differs from CIN 1 in that:",opts:["It always presents with symptoms","Full-thickness epithelial dysplasia is present and treatment is mandatory","It is caused by low-risk HPV types","It has the same rate of spontaneous regression"],ans:1,focus:"CIN grading — clinical significance of CIN3",exp:"<strong>CIN 3 (carcinoma in situ)</strong>: full-thickness dysplasia of the squamous epithelium without basement membrane breach. <strong>30–50% progress to invasion within 10 years without treatment.</strong> Treatment (LLETZ) is mandatory. CIN 1: mild dysplasia, 60% regress — treat with observation only. CIN 3 is asymptomatic and screen-detected. Low-risk HPV causes warts, not CIN/cancer."},
  {q:"The most classic presenting symptom of early invasive cervical cancer is:",opts:["Pelvic pain","Postcoital bleeding","Urinary frequency","Vaginal discharge only"],ans:1,focus:"Cervical cancer symptoms — postcoital bleeding",exp:"<strong>Postcoital bleeding (PCB)</strong> is the hallmark symptom of cervical cancer — bleeding after sexual intercourse caused by a friable, vascular tumour on the cervix. Any woman with unexplained PCB requires a <strong>speculum examination regardless of recent normal smear</strong> — a normal smear does not exclude invasive cancer. Pelvic pain = late disease (parametrial involvement). Early disease is often asymptomatic."},
  {q:"A 28-year-old with stage 1B1 cervical cancer (&lt;2cm) wishes to preserve fertility. The appropriate surgical option is:",opts:["Radical hysterectomy","Simple trachelectomy","Radical trachelectomy with pelvic lymph node dissection","Cone biopsy alone"],ans:2,focus:"Trachelectomy — fertility-sparing surgery for early cervical cancer",exp:"<strong>Radical trachelectomy</strong> (removal of the cervix, parametrium, and upper vagina with uterine preservation) is the fertility-sparing option for stage 1A2–1B1 with tumour &lt;2cm. Pelvic lymph node dissection or sentinel node biopsy is performed simultaneously. Post-operative pregnancy rates ~50–70%, with increased preterm birth risk. Must be discussed at MDT before any treatment begins — once a radical hysterectomy is performed, fertility cannot be restored."}
];
NOTES_MCQ.miscarriage=[
  {q:"A TVUS shows a crown-rump length of 8mm with no fetal heartbeat. The correct next step is:",opts:["Arrange ERPC immediately","Prescribe misoprostol","Repeat the scan with a second operator or in 7–14 days","Reassure — CRL is too small to assess"],ans:2,focus:"Missed miscarriage — confirm before acting",exp:"A CRL of ≥7mm with no heartbeat is highly suggestive of missed miscarriage — but <strong>must be confirmed on a second scan</strong> by a different operator or after 7–14 days before any management. The consequences of a false positive diagnosis are irreversible. Never manage on a single scan finding."},
  {q:"A haemodynamically stable woman at 9 weeks has incomplete miscarriage confirmed on USS. She has no fever. Best management approach:",opts:["Emergency ERPC under GA","Expectant management only","Discuss all three options — expectant, misoprostol, or surgical","IV antibiotics first then ERPC"],ans:2,focus:"Incomplete miscarriage — shared decision making",exp:"For a stable woman with no infection, all three options (expectant, medical misoprostol, surgical ERPC) have equivalent success and safety profiles. <strong>Shared decision-making is the correct approach</strong>. Only haemodynamic instability or infection mandate immediate surgical management."},
  {q:"Anti-D immunoglobulin is required in which scenario?",opts:["Threatened miscarriage at 8 weeks with light spotting in Rh-negative woman","Missed miscarriage at 10 weeks managed expectantly in Rh-negative woman","Surgical ERPC for miscarriage at 7 weeks in Rh-negative woman","Complete miscarriage at 6 weeks in Rh-negative woman"],ans:2,focus:"Anti-D in miscarriage — indications",exp:"Anti-D is required for all Rh-negative women having <strong>surgical management at any gestation</strong>, and for all Rh-negative women with miscarriage at ≥12 weeks. For threatened or expectant management &lt;12 weeks without heavy bleeding, Anti-D is not routinely required."},
  {q:"Recurrent miscarriage is defined as:",opts:["Any two consecutive losses","Three or more consecutive pregnancy losses","Two or more losses after 12 weeks","Three or more losses in any order"],ans:1,focus:"Recurrent miscarriage — definition",exp:"Recurrent miscarriage is defined as <strong>3 or more consecutive pregnancy losses</strong> before 24 weeks. Investigations include parental karyotype, antiphospholipid antibodies, pelvic USS, thyroid function, and blood glucose. In &gt;50% of cases no cause is found — but prognosis for subsequent pregnancy is still ~60–70%."},
  {q:"Antiphospholipid syndrome is identified in a woman with recurrent miscarriage. Treatment in next pregnancy:",opts:["LMWH alone","Aspirin alone","Low-dose aspirin plus LMWH from positive pregnancy test","Warfarin throughout pregnancy"],ans:2,focus:"APS and recurrent miscarriage — treatment",exp:"<strong>Low-dose aspirin (75mg) plus LMWH</strong> from positive pregnancy test until 34 weeks improves live birth rate from ~10% to ~70% in APS. This is the RCOG-recommended regimen. Warfarin is teratogenic in the first trimester. LMWH alone is less effective than combination therapy for APS."}
];
NOTES_MCQ.cordprolapse=[
  {q:"Cord prolapse is identified at vaginal examination. The very first action is:",opts:["Prepare theatre for category 1 CS","Push the cord back above the presenting part","Position to relieve compression and call for help simultaneously","Apply fetal scalp electrode to assess CTG"],ans:2,focus:"Cord prolapse — immediate response",exp:"The <strong>simultaneous first steps</strong> are: call for help AND position the woman (knee-chest or left lateral Trendelenburg). This requires no equipment and relieves cord compression immediately while theatre is prepared. Never attempt to replace the cord — this causes vasospasm."},
  {q:"Manual elevation of the presenting part in cord prolapse requires:",opts:["Grasping and elevating the cord","Two fingers vaginally elevating the presenting part off the cord","Applying fundal pressure to keep the head high","Balloon a Foley catheter against the presenting part"],ans:1,focus:"Manual decompression — technique",exp:"<strong>Two fingers inserted vaginally to manually elevate the presenting part off the cord</strong>. The hand remains in place continuously — through transfer, through theatre prep — until the obstetrician delivers the baby. Do not handle the cord itself — manipulation causes vasospasm."},
  {q:"The most common iatrogenic trigger for cord prolapse is:",opts:["External cephalic version","Fetal scalp electrode insertion","ARM with an unengaged presenting part","Epidural anaesthesia"],ans:2,focus:"Cord prolapse — iatrogenic risk",exp:"<strong>ARM with a high or unengaged presenting part</strong> is the most common iatrogenic cause. Always confirm the presenting part is well-applied before ARM. When the head is not engaged, the cord can descend through the cervix as liquor rushes out."},
  {q:"Bladder filling with 500–750mL saline in cord prolapse works by:",opts:["Inducing uterine relaxation","Elevating the presenting part passively","Improving cord blood flow","Slowing labour to allow theatre prep"],ans:1,focus:"Bladder filling — mechanism",exp:"A distended bladder <strong>physically elevates the presenting part</strong> passively, reducing cord compression. It is useful during transfer or when theatre is delayed. Leave the catheter in and empty it immediately before the caesarean incision."},
  {q:"The target decision-to-delivery interval for cord prolapse is:",opts:["Under 75 minutes","Under 45 minutes","Under 30 minutes","Under 15 minutes"],ans:2,focus:"Category 1 CS — DDI target",exp:"Cord prolapse is a <strong>Category 1 CS</strong>. Target decision-to-delivery interval: <strong>≤30 minutes</strong>, ideally ≤20. If the cervix is fully dilated and the head is low, instrumental delivery may be faster — requires immediate senior decision."}
];
NOTES_MCQ.endometriosis=[
  {q:"The average time from symptom onset to diagnosis of endometriosis is:",opts:["1–2 years","3–4 years","7–10 years","Less than 6 months"],ans:2,focus:"Diagnostic delay in endometriosis",exp:"The average time from symptom onset to diagnosis is <strong>7–10 years</strong>. This reflects normalisation of period pain, diagnostic difficulty, and absence of reliable non-invasive biomarkers. Laparoscopy with histological confirmation is the gold standard but empirical treatment is appropriate when clinical suspicion is high."},
  {q:"A woman with stage IV endometriosis reports minimal pain. A woman with stage I has debilitating dysmenorrhoea. The correct interpretation is:",opts:["The stage IV diagnosis must be wrong","Stage correlates poorly with symptom severity","The stage I pain is likely psychogenic","Re-staging required before treatment"],ans:1,focus:"Endometriosis staging vs symptom severity",exp:"<strong>Stage correlates poorly with symptom severity.</strong> Minimal disease can cause severe pain through inflammatory mediators and central sensitisation. Stage IV disease may be relatively asymptomatic. Treat the patient's symptoms, not the laparoscopy report."},
  {q:"First-line medical management of endometriosis-associated pain is:",opts:["GnRH analogue (leuprorelin)","Laparoscopic excision","COCP or progestogen-only pill plus NSAIDs","Danazol"],ans:2,focus:"Endometriosis — first-line treatment",exp:"<strong>NSAIDs plus hormonal suppression (COCP or progestogen-only pill/LNG-IUS)</strong> are first-line. GnRH analogues are second-line — effective but cause menopausal side effects and bone loss. Laparoscopy is for diagnostic confirmation or when medical treatment fails."},
  {q:"Endometrioma is best treated surgically by:",opts:["Drainage and sclerotherapy","Oophorectomy","Laparoscopic cystectomy (excision of cyst wall)","Alcohol ablation"],ans:2,focus:"Endometrioma — surgical management",exp:"<strong>Laparoscopic cystectomy</strong> has lower recurrence rates than drainage or ablation. However it removes some normal ovarian cortex, reducing reserve — weigh carefully in women with bilateral endometriomas or reduced reserve. Drainage alone has ~75% recurrence at 2 years."},
  {q:"GnRH analogues for endometriosis beyond 6 months without add-back HRT cause:",opts:["Loss of analogue efficacy","Endometrial cancer risk","Progressive bone density loss","Ovarian hyperstimulation"],ans:2,focus:"GnRH analogues — bone loss and add-back",exp:"GnRH analogues suppress oestrogen to menopausal levels causing <strong>progressive bone density loss</strong>. Beyond 6 months, <strong>add-back HRT</strong> (low-dose oestrogen ± progestogen) is required to protect bone without significantly reducing analogue efficacy."}
];
NOTES_MCQ.pcos=[
  {q:"The Rotterdam criteria diagnose PCOS when a woman has at least 2 of which 3 features?",opts:["Obesity + anovulation + elevated LH","Oligo/anovulation + hyperandrogenism + polycystic ovary morphology","Elevated LH:FSH + acne + irregular periods","Insulin resistance + hirsutism + elevated prolactin"],ans:1,focus:"Rotterdam criteria",exp:"<strong>Rotterdam criteria (2 of 3 required):</strong> (1) Oligo- or anovulation, (2) clinical or biochemical hyperandrogenism, (3) polycystic ovary morphology on USS (≥20 follicles/ovary OR volume &gt;10mL). After exclusion of other causes. LH:FSH ratio and insulin resistance are associated features but not diagnostic criteria."},
  {q:"A woman with PCOS has had no period for 5 months. Why is endometrial protection required?",opts:["Progesterone deficiency causes atrophy","Prolonged anovulation → unopposed oestrogen → endometrial hyperplasia risk","LH excess stimulates endometrial growth independently","Insulin resistance damages the endometrium directly"],ans:1,focus:"Endometrial protection in PCOS",exp:"In PCOS with anovulation, <strong>no corpus luteum forms → no progesterone</strong>. Unopposed oestrogen drives endometrial proliferation → hyperplasia → carcinoma risk over years. Women with amenorrhoea &gt;3–4 months require a withdrawal bleed via cyclic progestogen or COCP at minimum every 3 months."},
  {q:"First-line pharmacological ovulation induction in PCOS is currently:",opts:["Clomifene citrate","FSH injections","Letrozole","Metformin alone"],ans:2,focus:"Ovulation induction — letrozole vs clomifene",exp:"<strong>Letrozole (aromatase inhibitor)</strong> is now first-line, having superseded clomifene. It achieves higher live birth rates with a lower multiple pregnancy rate. Metformin improves cycle regularity but is insufficient alone for ovulation induction. FSH injections are second/third-line."},
  {q:"The most important long-term risk to screen for in all women with PCOS at diagnosis is:",opts:["Thyroid cancer","Type 2 diabetes and dyslipidaemia","Adrenal insufficiency","Premature ovarian insufficiency"],ans:1,focus:"PCOS metabolic risk",exp:"Women with PCOS have a <strong>5–10× increased risk of type 2 diabetes</strong> and elevated cardiovascular risk. Screen with fasting glucose/HbA1c and fasting lipids at diagnosis and every 1–3 years. Weight loss of 5–10% dramatically reduces these risks."},
  {q:"A woman with PCOS and BMI 32 wants to improve her symptoms. Most evidence-based initial recommendation:",opts:["Bariatric surgery","GnRH analogue while she diets","Lifestyle modification — diet and exercise","Orlistat plus metformin from the outset"],ans:2,focus:"PCOS — lifestyle as primary intervention",exp:"<strong>Lifestyle modification</strong> is first-line. Weight loss of 5–10% restores ovulation in up to 55%, reduces insulin resistance and androgen levels. More powerful than any pharmacological intervention. Metformin is a useful adjunct but should accompany, not replace, lifestyle advice."}
];
NOTES_MCQ.fibroids=[
  {q:"Which fibroid type causes the heaviest menstrual bleeding and most significantly impacts fertility?",opts:["Subserosal (FIGO 5–7)","Intramural (FIGO 3–4)","Submucosal (FIGO 0–2)","Cervical fibroid"],ans:2,focus:"Fibroid location and clinical impact",exp:"<strong>Submucosal fibroids (FIGO 0–2)</strong> distort the uterine cavity, impair endometrial haemostasis, and are most strongly associated with heavy menstrual bleeding and subfertility. Subserosal fibroids cause bulk symptoms with minimal bleeding effect."},
  {q:"GnRH analogues pre-operatively for fibroids aim to:",opts:["Permanently shrink the fibroids","Prevent recurrence after surgery","Reduce size 35–50% and correct anaemia before surgery","Sterilise the patient prior to hysterectomy"],ans:2,focus:"GnRH analogues — pre-operative role",exp:"GnRH analogues shrink fibroids by <strong>35–50%</strong>, reduce intraoperative blood loss, may convert open to laparoscopic surgery, and allow time to correct anaemia. <strong>Fibroids regrow on cessation</strong> — not a long-term treatment. Used for maximum 3–6 months pre-operatively."},
  {q:"A woman with a 9cm intramural fibroid, Hb 78 g/L, and flooding periods declines surgery. Most appropriate immediate step:",opts:["Book urgent hysterectomy","Start GnRH analogue and correct anaemia, then rediscuss","Insert Mirena IUS immediately","Tranexamic acid alone and review in 6 months"],ans:1,focus:"Fibroid management — anaemia correction first",exp:"<strong>Correct the iron deficiency anaemia first</strong> — GnRH analogue stops periods and allows haemoglobin recovery while also shrinking the fibroid pre-operatively. Operating on Hb 78 g/L carries significantly higher risk. Mirena is less effective with a distorted cavity."},
  {q:"Uterine artery embolisation is contraindicated in a patient who:",opts:["Has multiple intramural fibroids","Is postmenopausal","Wishes to conceive in the future","Had a previous myomectomy"],ans:2,focus:"UAE — contraindication in future fertility",exp:"UAE is <strong>not appropriate for women who wish future pregnancy</strong>. It reduces ovarian reserve via collateral vessel embolisation and is associated with abnormal placentation and preterm birth. Excellent option for women with completed family who want uterine preservation without surgery."},
  {q:"A pedunculated subserosal fibroid causes sudden severe pelvic pain and nausea. The diagnosis is:",opts:["Red degeneration","Fibroid torsion","Uterine rupture","Endometrioma rupture"],ans:1,focus:"Pedunculated fibroid — torsion",exp:"<strong>Pedunculated fibroid torsion</strong> — rotation on its vascular pedicle causes ischaemia. Sudden severe unilateral pelvic pain with nausea, mimicking ovarian torsion. USS confirms pedunculated morphology. Treatment: laparoscopic myomectomy. Red degeneration occurs in pregnancy."}
];
NOTES_MCQ.pid=[
  {q:"The minimum criterion to start empirical treatment for PID is:",opts:["Positive chlamydia NAAT","CRP elevated plus vaginal discharge","Uterine, adnexal, or cervical motion tenderness on examination","Fever >38°C plus lower abdominal pain"],ans:2,focus:"PID — minimum clinical criteria",exp:"BASHH: empirical treatment should start with <strong>uterine, adnexal, or cervical motion tenderness</strong> in a sexually active young woman with pelvic pain, in the absence of another diagnosis. Positive STI test and fever increase certainty but are not required. The low threshold is intentional — missed PID causes infertility."},
  {q:"The standard outpatient BASHH PID regimen covers which organisms?",opts:["Chlamydia only","Gonorrhoea and chlamydia only","Gonorrhoea, chlamydia, and anaerobes","Gonorrhoea only"],ans:2,focus:"PID antibiotics — polymicrobial cover",exp:"PID is polymicrobial. Standard regimen — <strong>IM ceftriaxone + doxycycline 14 days + metronidazole 14 days</strong> — covers gonorrhoea (ceftriaxone), chlamydia (doxycycline), and anaerobes (metronidazole). All three components are required. 14 days is the minimum."},
  {q:"Fitz-Hugh-Curtis syndrome is:",opts:["Bilateral tubo-ovarian abscess","Perihepatic inflammation causing right upper quadrant pain as a complication of PID","Gonorrhoeal septic arthritis","Ovarian torsion in the context of PID"],ans:1,focus:"Fitz-Hugh-Curtis syndrome",exp:"<strong>Fitz-Hugh-Curtis</strong>: perihepatitis caused by spread of PID organisms to the liver capsule via the paracolic gutters. Presents as RUQ pain — often mistaken for cholecystitis. LFTs are normal. 'Violin-string' adhesions on laparoscopy. Treat with the same PID antibiotic regimen."},
  {q:"One episode of PID changes ectopic pregnancy risk by approximately:",opts:["No significant change","Doubles the risk","Reduces risk due to scarring","10-fold increase"],ans:1,focus:"PID sequelae — ectopic risk",exp:"One episode of PID <strong>doubles the risk of ectopic pregnancy</strong>. Three episodes → ~75% tubal factor infertility. Tubal scarring narrows the lumen and destroys cilia, preventing embryo transport. This is why early empirical treatment and partner notification matter so much."},
  {q:"In a woman with PID who has an IUD in situ, the IUD should be removed:",opts:["Immediately on diagnosis","Only if failure to respond after 72hrs antibiotics, or tubo-ovarian abscess present","Never — removal worsens prognosis","Always if infection is chlamydial"],ans:1,focus:"IUD management in PID",exp:"The IUD does <strong>not need to be removed routinely</strong>. Remove if: failure to respond to antibiotics after 72 hours, or tubo-ovarian abscess present. Routine removal in mild/moderate PID responding to treatment is not necessary and reduces contraceptive cover immediately."}
];
NOTES_MCQ.abruption=[
  {q:"A woman at 32 weeks has sudden severe continuous abdominal pain, a rigid uterus, and fetal bradycardia. There is only minimal vaginal bleeding. The most likely diagnosis is:",opts:["Placenta praevia","Concealed placental abruption","Uterine rupture","Vasa praevia"],ans:1,focus:"Concealed abruption — absent visible bleeding",exp:"<strong>Concealed placental abruption</strong> — 20% of abruptions have no visible external bleeding. The blood is trapped behind the placenta. The clinical signs are: rigid woody uterus, severe continuous pain, fetal compromise, and maternal haemodynamic instability — all disproportionate to the visible blood loss. This is more dangerous than revealed abruption precisely because blood loss is underestimated."},
  {q:"In massive placental abruption with DIC, which laboratory marker is the most sensitive early indicator?",opts:["Prolonged PT","Prolonged APTT","Falling fibrinogen","Thrombocytopaenia"],ans:2,focus:"DIC in abruption — fibrinogen falls first",exp:"<strong>Fibrinogen is the earliest and most sensitive marker of DIC in abruption.</strong> Normal pregnancy fibrinogen is 4–6g/L. A value &lt;2g/L is critically low. PT and APTT prolong later. Fibrinogen &lt;1.5g/L → give cryoprecipitate immediately. Do not wait for PT/APTT to become abnormal if fibrinogen is falling rapidly."},
  {q:"Which is the single most common risk factor for placental abruption?",opts:["Multiparity","Pre-eclampsia and hypertension","Cocaine use","Previous caesarean section"],ans:1,focus:"Abruption risk factors — HTN most common",exp:"<strong>Pre-eclampsia and hypertension</strong> are the most common risk factors for abruption, present in up to 40% of cases. Cocaine causes acute severe vasoconstriction and is a potent trigger. Direct abdominal trauma, smoking, PPROM, previous abruption (10× recurrence risk), and thrombophilia are also significant. Previous CS is the main risk factor for praevia, not abruption."},
  {q:"The key clinical distinction between placental abruption and placenta praevia is:",opts:["Volume of blood loss","Fetal presentation","Painful vs painless bleeding + uterine tone","Gestation at presentation"],ans:2,focus:"Abruption vs praevia — distinguishing features",exp:"<strong>Abruption: painful, dark blood, tense/woody uterus.</strong> <strong>Praevia: painless, bright red blood, soft uterus.</strong> Both can present with fetal compromise. Never perform a VE in either case until praevia is excluded. The uterine tone is the most reliable distinguishing clinical sign."},
  {q:"In a woman with suspected abruption and a fetal bradycardia, the correct management priority is:",opts:["Urgent ultrasound to confirm abruption before delivery","Maternal resuscitation and delivery — route and urgency based on fetal condition and gestation","Wait for the CTG to return to normal before deciding","Tocolysis to relax the uterus and improve placental blood flow"],ans:1,focus:"Abruption management — deliver, treat mother simultaneously",exp:"<strong>Maternal resuscitation and delivery</strong> — simultaneously. Two large-bore IV cannulae. FBC, clotting, crossmatch. IV fluids. Senior review immediately. Fetal bradycardia with abruption = Category 1 CS unless delivery is imminent vaginally. Tocolysis is absolutely contraindicated — the uterus must contract to tamponade the bleeding. Ultrasound does not change management if the clinical picture is clear."}
];
NOTES_MCQ.iol=[
  {q:"A Bishop score of 4 means the cervix is:",opts:["Favourable — proceed to ARM","Unfavourable — cervical ripening required first","Borderline — oxytocin can be started immediately","Irrelevant — ultrasound assessment is required instead"],ans:1,focus:"Bishop score — favourable vs unfavourable cervix",exp:"<strong>Bishop score &lt;6 = unfavourable cervix → cervical ripening required before ARM or oxytocin.</strong> Score ≥8 = favourable cervix → ARM alone may initiate labour. A score of 4 requires ripening (prostaglandins or balloon catheter) before proceeding to ARM. Attempting ARM on an unfavourable cervix risks failed induction and increased operative delivery."},
  {q:"Misoprostol (PGE1) is contraindicated for cervical ripening in which situation?",opts:["Post-dates pregnancy at 41 weeks","GDM requiring induction at 38 weeks","Previous caesarean section","Bishop score of 3"],ans:2,focus:"Misoprostol — contraindicated with uterine scar",exp:"<strong>Misoprostol is contraindicated in women with a previous uterine scar</strong> (including previous caesarean section) due to significantly increased risk of uterine rupture. Dinoprostone (PGE2) at the standard dose is used with caution; mechanical ripening (balloon catheter) is preferred for VBAC candidates."},
  {q:"Uterine hyperstimulation during oxytocin induction is defined as:",opts:["Contractions every 3 minutes lasting 45 seconds","More than 5 contractions in 10 minutes or contractions lasting >2 minutes","Fetal heart rate decelerations during any contraction","Oxytocin infusion rate >20 mU/min"],ans:1,focus:"Hyperstimulation — definition and recognition",exp:"<strong>Hyperstimulation (tachysystole): &gt;5 contractions in 10 minutes, or contractions lasting &gt;2 minutes.</strong> Causes fetal hypoxia through impaired uteroplacental perfusion. Immediate management: stop the oxytocin infusion, position left lateral, if CTG abnormal and persists → terbutaline 250mcg SC. Do not reduce the rate — stop it entirely."},
  {q:"Immediately after ARM, the most important clinical check is:",opts:["Maternal BP and pulse","Urine output","Fetal heart rate for 15–20 minutes to exclude cord prolapse","Colour and volume of liquor only"],ans:2,focus:"Post-ARM assessment — exclude cord prolapse",exp:"<strong>Continuous fetal heart rate monitoring for 15–20 minutes post-ARM to exclude cord prolapse.</strong> ARM with a high or unengaged presenting part is a risk factor for cord prolapse. Liquor colour (meconium vs clear) is also important. Maternal observations are routine but the fetal heart check is the most immediately critical safety step."},
  {q:"The most appropriate method for cervical ripening in a woman with a previous caesarean section is:",opts:["Misoprostol 25mcg vaginally","Dinoprostone pessary (standard dose)","Mechanical balloon catheter","Oxytocin infusion alone"],ans:2,focus:"Cervical ripening in VBAC — mechanical preferred",exp:"<strong>Balloon catheter (mechanical ripening)</strong> is preferred in women with a previous uterine scar. It does not carry the risk of uterine hyperstimulation associated with prostaglandins. Misoprostol is contraindicated. Dinoprostone can be used with caution at lower doses in some protocols but mechanical ripening is the safest option. Oxytocin cannot ripen an unfavourable cervix."}
];
NOTES_MCQ.menopause=[
  {q:"Which HRT formulation carries the lowest risk of VTE?",opts:["Oral conjugated equine oestrogen","Transdermal oestrogen (patch or gel)","Oral oestradiol valerate","Subcutaneous oestrogen implant"],ans:1,focus:"Transdermal oestrogen — no VTE risk increase",exp:"<strong>Transdermal oestrogen</strong> (patch, gel, spray) does not undergo first-pass hepatic metabolism and does not increase VTE risk — unlike oral oestrogen, which increases hepatic clotting factor synthesis. This is clinically significant for women with BMI &gt;30, personal or family history of VTE, or thrombophilia — transdermal is the preferred route for all of these."},
  {q:"A woman with a uterus starts oestrogen-only HRT. The risk this creates is:",opts:["Increased breast cancer risk","Endometrial hyperplasia and cancer from unopposed oestrogen","Increased cardiovascular disease","Osteoporosis acceleration"],ans:1,focus:"Unopposed oestrogen — endometrial risk",exp:"<strong>Unopposed oestrogen (without progestogen) causes endometrial hyperplasia and significantly increases endometrial carcinoma risk</strong> in women with a uterus. Any woman with a uterus must have progestogen added to HRT. Women who have had a hysterectomy can take oestrogen-only HRT safely. Micronised progesterone (Utrogestan) is associated with the lowest breast cancer and VTE risk among progestogen options."},
  {q:"Premature ovarian insufficiency (POI) is diagnosed in a 32-year-old. Regarding HRT:",opts:["HRT should be avoided — breast cancer risk is too high","HRT is recommended until at least the average age of natural menopause (~51)","Only vaginal oestrogen should be used","HRT should be started only if symptoms are severe"],ans:1,focus:"POI — HRT is mandatory treatment",exp:"In POI, <strong>HRT is not optional — it is hormone replacement for oestrogen the body should still be producing.</strong> Without it, risks of cardiovascular disease, osteoporosis, dementia, and premature mortality are substantially elevated. HRT should be continued until at least age 51. The breast cancer risk associated with HRT in POI is negligible — it simply replaces what was lost prematurely."},
  {q:"The main reason the 2002 WHI study overstated HRT risks was:",opts:["It used too low a dose of oestrogen","Its participants were older (mean age 63), used oral oestrogen, and used a synthetic progestogen not representative of modern HRT","It only studied women with severe symptoms","It did not measure bone density outcomes"],ans:1,focus:"WHI study limitations — overestimated risk",exp:"The WHI used women with <strong>mean age 63</strong> (≥10 years post-menopause), <strong>oral conjugated equine oestrogen</strong> (which increases VTE), and <strong>medroxyprogesterone acetate</strong> (synthetic progestogen associated with higher breast cancer risk than micronised progesterone). Modern HRT — transdermal oestrogen + micronised progesterone started within 10 years of menopause — has a significantly more favourable risk profile."},
  {q:"A woman asks about the breast cancer risk of combined HRT. The most accurate statement is:",opts:["Combined HRT doubles the risk of breast cancer","The increased risk is approximately 1 extra case per 1000 women per year of use — comparable to drinking 1–2 units/day","There is no increased breast cancer risk with any HRT formulation","The risk only applies after 10 years of use"],ans:1,focus:"HRT breast cancer risk — absolute numbers",exp:"The breast cancer risk with combined HRT (oestrogen + synthetic progestogen) is approximately <strong>1 extra case per 1000 women per year of use</strong>. With micronised progesterone, the risk is lower still. This should be communicated as an absolute number, not a relative risk. For women with severe menopausal symptoms significantly affecting quality of life, this risk is almost universally acceptable when the benefits are also explained."}
];
NOTES_MCQ.vulvalconditions=[
  {q:"The first-line treatment for lichen sclerosus is:",opts:["Topical oestrogen cream","Clobetasol propionate 0.05% (Dermovate)","Oral antihistamines","Topical antifungal cream"],ans:1,focus:"Lichen sclerosus — treatment with potent topical steroid",exp:"<strong>Clobetasol propionate 0.05%</strong> is the standard first-line treatment for lichen sclerosus. Applied once daily for 1 month → alternate days for 1 month → twice weekly maintenance. A pea-sized amount covers the entire affected area. Weaker steroids are insufficient. Topical oestrogen has no role. Most women require long-term maintenance treatment to prevent disease progression and SCC risk."},
  {q:"The lifetime risk of squamous cell carcinoma (SCC) in women with untreated or poorly controlled lichen sclerosus is approximately:",opts:["&lt;0.1%","1–2%","4–5%","20–25%"],ans:2,focus:"Lichen sclerosus — malignant transformation risk",exp:"Lichen sclerosus carries a <strong>4–5% lifetime risk of vulval SCC</strong>, arising via the differentiated VIN pathway in areas of chronic inflammation. This is why: (1) LS requires treatment and annual review, and (2) any suspicious area (ulceration, induration, raised edges, non-response to steroids) requires biopsy. This risk is significantly reduced with adequate steroid treatment and regular surveillance."},
  {q:"Vulvodynia is best characterised as:",opts:["Vulval pain caused by chronic candidiasis","Chronic vulval pain ≥3 months with no identifiable cause, normal examination","Vulval pain caused by lichen sclerosus","Vulval pain exclusively during intercourse in women with endometriosis"],ans:1,focus:"Vulvodynia — definition",exp:"<strong>Vulvodynia</strong>: chronic vulval pain ≥3 months with no identifiable cause and a normal-appearing vulva. It is driven by peripheral sensitisation and central pain sensitisation — not infection, not LS, not a psychological condition. The Q-tip test (cotton-tipped swab reproduces pain on light contact) is positive in provoked vestibulodynia, the most common subtype. Treatment: multidisciplinary — TCAs, pregabalin, pelvic floor physiotherapy, psychological support."},
  {q:"A 67-year-old with known lichen sclerosus develops a firm raised area at the right labium majus that has not responded to clobetasol for 3 months. Next step:",opts:["Increase clobetasol to twice daily application","Patch test for contact allergy","Punch biopsy under local anaesthetic and urgent referral","Prescribe oral antifungal and reassess in 6 weeks"],ans:2,focus:"Suspicious vulval lesion in LS — biopsy",exp:"Any area of <strong>thickening, ulceration, raised edges, or non-response to adequate steroid treatment in lichen sclerosus requires biopsy</strong>. This is how differentiated VIN and early vulval SCC are detected. Punch biopsy under local anaesthetic is quick and diagnostic. Do not delay with empirical treatments when the clinical picture demands histological diagnosis."},
  {q:"HPV-associated VIN (usual type) differs from differentiated VIN in that:",opts:["It arises in older women with chronic lichen sclerosus","It is multifocal, occurs in younger women, and has lower malignant potential","It has higher malignant potential and progresses more rapidly","It cannot be treated with imiquimod"],ans:1,focus:"VIN types — HPV-associated vs differentiated",exp:"<strong>HPV-associated (usual) VIN</strong>: younger women, multifocal, warty/basaloid lesions, associated with CIN, lower malignant potential. Treatable with imiquimod, laser, or excision. <strong>Differentiated VIN</strong>: older women, arises in chronic LS, unifocal, higher malignant potential, can progress to SCC rapidly. Both require treatment but the urgency and surgical approach differ."}
];
NOTES_MCQ.ovariancancer=[
  {q:"The 5-year survival rate for stage I ovarian cancer (confined to the ovary) is approximately:",opts:["20–30%","50–60%","~90%","~40%"],ans:2,focus:"Ovarian cancer — stage I prognosis",exp:"Stage I ovarian cancer (confined to the ovary/tube) has a <strong>~90% 5-year survival</strong>. This contrasts sharply with stage III (~40%) and stage IV (&lt;20%). The clinical tragedy of ovarian cancer is that 75% of women are diagnosed at stage III/IV — after peritoneal spread. Early detection through symptom awareness and low-threshold investigation transforms outcomes."},
  {q:"NICE recommends measuring CA-125 in women over 50 with which symptom pattern?",opts:["Single episode of bloating","Persistent symptoms occurring ≥12 times per month — bloating, early satiety, pelvic pain, or urinary symptoms","Any abdominal symptom lasting more than 2 weeks","Unexplained weight gain only"],ans:1,focus:"NICE 2WW criteria — symptom frequency threshold",exp:"NICE: measure CA-125 in women over 50 with <strong>persistent symptoms (≥12 times/month)</strong>: bloating, early satiety, pelvic/abdominal pain, or urinary frequency/urgency. If CA-125 ≥35 IU/mL → urgent USS. If USS suspicious → 2WW referral. Ascites or palpable mass → direct urgent referral without waiting for CA-125."},
  {q:"A BRCA1 carrier has a lifetime risk of ovarian cancer of approximately:",opts:["1–2% (same as general population)","10–15%","39–46%","75–80%"],ans:2,focus:"BRCA1 — ovarian cancer risk",exp:"<strong>BRCA1 carriers have a 39–46% lifetime risk of ovarian cancer</strong> (vs ~2% in the general population). BRCA2 carriers: 10–27%. Risk-reducing salpingo-oophorectomy (RRSO) at age 35–40 reduces this risk by &gt;95% and is recommended for BRCA1 carriers after completion of family. BRCA testing should be offered to all women diagnosed with ovarian cancer, and to their first-degree relatives."},
  {q:"PARP inhibitors (e.g. olaparib) are most effective in ovarian cancer patients who have:",opts:["Stage I disease","Platinum-resistant disease","BRCA1/2 mutations or homologous recombination deficiency","Clear cell histology"],ans:2,focus:"PARP inhibitors — BRCA and HRD tumours",exp:"<strong>PARP inhibitors exploit synthetic lethality in BRCA-mutated and HRD tumours</strong>. BRCA-mutated cells rely on PARP for DNA repair; inhibiting PARP causes irreparable DNA damage and cell death. Olaparib as maintenance therapy after response to first-line platinum chemotherapy significantly improves progression-free survival in BRCA-mutated ovarian cancer."},
  {q:"Optimal surgical debulking in ovarian cancer is defined as:",opts:["Complete hysterectomy and BSO only","Removal of all visible tumour (no residual disease)","Removal of all tumour deposits &gt;2cm","Removal of the primary tumour only"],ans:1,focus:"Debulking — definition of optimal cytoreduction",exp:"<strong>Optimal cytoreduction: no macroscopic residual disease</strong> after surgery (or residual &lt;1cm in some definitions). This is the single strongest surgical predictor of survival in ovarian cancer. Each 10% increase in completeness of cytoreduction is associated with a ~5% improvement in median survival. This is why specialist gynaecological oncology surgical units achieve better outcomes than general gynaecology units."}
];
NOTES_MCQ.subfertility=[
  {q:"After how long of regular unprotected intercourse should subfertility be investigated?",opts:["6 months in all couples","12 months, or 6 months if woman is over 35 or there is a known risk factor","24 months — most couples will conceive spontaneously by then","3 months if the woman has regular cycles"],ans:1,focus:"Subfertility — when to investigate",exp:"<strong>Investigate after 12 months</strong> of regular unprotected intercourse, or <strong>after 6 months</strong> if the woman is over 35, or <strong>immediately</strong> if there is a known cause (oligomenorrhoea, previous PID/tubal disease, azoospermia, chemotherapy history). Both partners should be investigated simultaneously at the first consultation — do not investigate the woman alone and then the man later."},
  {q:"The single most common identifiable cause of subfertility is:",opts:["Tubal factor","Unexplained","Male factor","Ovulatory disorder"],ans:2,focus:"Subfertility causes — male factor most common",exp:"<strong>Male factor subfertility contributes to approximately 30% of cases</strong> — the single most common identifiable cause. Semen analysis should be requested at the first consultation alongside female investigations. The common error is to focus the investigation entirely on the woman, delaying identification of male factor by months."},
  {q:"A mid-luteal progesterone of 32 nmol/L on day 21 of a 28-day cycle indicates:",opts:["Anovulation — progesterone is too low","Ovulation has occurred","PCOS — progesterone is elevated","The test was performed too early"],ans:1,focus:"Day 21 progesterone — ovulation confirmation",exp:"<strong>Day 21 progesterone &gt;30 nmol/L confirms ovulation</strong> in a 28-day cycle (sample taken 7 days before expected period — i.e. day 21 in a 28-day cycle, day 28 in a 35-day cycle). A value of 32 nmol/L confirms ovulation. Values &lt;10 nmol/L suggest anovulation. For irregular cycles, sample in the presumed mid-luteal phase or repeatedly until ovulation is confirmed."},
  {q:"Hydrosalpinx significantly affects IVF outcomes. The recommended management before IVF is:",opts:["Antibiotic treatment to resolve the hydrosalpinx","Laparoscopic drainage of the hydrosalpinx","Bilateral salpingectomy before commencing IVF","No intervention — proceed directly to IVF"],ans:2,focus:"Hydrosalpinx — salpingectomy before IVF",exp:"<strong>Hydrosalpinx reduces IVF live birth rates by approximately 50%</strong>. The mechanism: hydrosalpinx fluid refluxes into the uterine cavity, is embryotoxic, and impairs implantation. <strong>Bilateral salpingectomy before IVF is recommended</strong> to restore implantation rates to the expected level for the patient's age. Drainage alone is not effective — the hydrosalpinx refills. Antibiotics do not treat established hydrosalpinx."},
  {q:"The current first-line treatment for ovulation induction in anovulatory PCOS is:",opts:["Clomifene citrate","Metformin alone","Letrozole (aromatase inhibitor)","FSH injections"],ans:2,focus:"Ovulation induction — letrozole first-line",exp:"<strong>Letrozole</strong> is now first-line for ovulation induction in PCOS, having superseded clomifene. It achieves higher live birth rates and lower multiple pregnancy rates. Metformin improves cycle regularity but is insufficient alone for ovulation induction. FSH injections are second/third-line due to higher multiple pregnancy risk and requirement for intensive monitoring. All cycles require USS follicle tracking."}
];

NOTES.obstetriccholestasis=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Antenatal</div>
  <div class="n-hero-title">Obstetric<br><em>Cholestasis</em></div>
  <div class="n-hero-sub">ICD O26.6 &nbsp;·&nbsp; Intrahepatic cholestasis of pregnancy — the itch that kills the baby, not the mother</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Abnormal liver function with elevated bile acids in pregnancy, causing intense pruritus. Resolves after delivery. <strong>Bile acids &gt;40 µmol/L</strong> are associated with fetal risk.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">~0.7% of pregnancies in UK. Higher in South Asian and Scandinavian women. <strong>Recurs in 45–70% of subsequent pregnancies.</strong> Family history in first-degree relatives.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">The risk is entirely fetal: sudden unexplained stillbirth. The mother feels terrible but is not in danger. Fetal risk correlates with bile acid level — mild ICP has low risk, severe ICP is a different disease.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Third trimester + intense pruritus (especially palms and soles) + no rash + abnormal LFTs → think <em>obstetric cholestasis</em> → fasting bile acids, LFTs. Do not reassure without investigating.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>PUPPP (pruritic urticarial papules of pregnancy) has a rash. OC does not.</strong> If there is no rash but pruritus is severe — especially on palms and soles — investigate for OC regardless of LFT results on first test. Bile acids can be elevated before LFTs become abnormal.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Diagnosis</span><span class="n-section-tag">what to measure and when</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Fasting bile acids</div><div class="n-diag-content"><strong>The definitive test.</strong> Must be fasting (postprandial levels are unreliable). Diagnostic threshold: <strong>&gt;19 µmol/L</strong>. Mild: 19–39. Severe: ≥40. Risk of stillbirth rises steeply above 100 µmol/L.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">LFTs</div><div class="n-diag-content">ALT/AST elevated. ALP is not useful in pregnancy (elevated normally due to placental isoform). Bilirubin may be mildly raised in severe cases.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Exclude other causes</div><div class="n-diag-content">Hepatitis A/B/C serology. USS liver if ALT grossly elevated. Exclude pre-eclampsia (BP, urinalysis, platelets). HELLP syndrome must be considered if severe derangement.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Common mistake</div><div class="n-diag-content">Reassuring a woman with normal LFTs but pruritus. Bile acids can be elevated with normal LFTs. Always measure fasting bile acids in symptomatic women.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management</span><span class="n-section-tag">symptom + fetal surveillance + timing</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Ursodeoxycholic acid (UDCA)</div>
  <div class="n-algo-body">First-line treatment. Dose: <strong>500 mg BD</strong> (or 10–15 mg/kg/day). Reduces maternal pruritus and improves LFTs. Does not clearly reduce stillbirth risk but is standard of care. Continue until delivery.<span class="n-involve">Obstetric team</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Fetal surveillance</div>
  <div class="n-algo-body">CTG at each appointment from 32 weeks. Weekly bile acids and LFTs. <strong>CTG does not predict sudden fetal death in OC</strong> — the arrhythmia is sudden. Do not give false reassurance based on a normal CTG.<span class="n-involve">Obstetric team</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Timing of delivery</div>
  <div class="n-algo-body"><strong>Mild OC (bile acids &lt;40): IOL at 40 weeks.</strong> Moderate (40–99): IOL at 38–39 weeks. Severe (≥100): discuss IOL at 35–37 weeks. Timing is the primary intervention — OC resolves within days of delivery.<span class="n-involve">Senior obstetrician</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Vitamin K</div>
  <div class="n-algo-body dark-body">Cholestasis impairs fat-soluble vitamin absorption. <strong>Vitamin K deficiency → neonatal haemorrhagic disease.</strong> Offer oral vitamin K supplementation if steatorrhoea present or PT prolonged. Ensure newborn receives vitamin K at birth.<span class="n-involve">Obstetric/neonatal team</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Bile acids ≥100 µmol/L carries a significant risk of stillbirth.</strong> These women require urgent senior obstetric review and individual discussion about early delivery.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Pruritus + jaundice + right upper quadrant pain = not OC.</strong> Think acute fatty liver of pregnancy (AFLP) or HELLP — both are obstetric emergencies requiring immediate delivery.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>OC resolves within 2–4 weeks of delivery.</strong> If LFTs do not normalise postnatally, liver disease must be excluded — OC does not persist.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>The stillbirth in OC is sudden and unpredictable.</strong> Unlike placental causes of fetal compromise, it is not preceded by growth restriction or Doppler changes. CTG cannot reliably predict it. Delivery timing is the only effective intervention.<span class="n-pearl-exam">Exam loves this: candidates say CTG provides reassurance.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>ALP is not a useful marker in OC.</strong> It is normally elevated in the third trimester due to placental ALP production. Rely on ALT, AST, and fasting bile acids.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>OC in a previous pregnancy increases the risk of future pregnancies being affected.</strong> Advise early testing (from 20 weeks) in subsequent pregnancies. Oral contraceptive pill containing oestrogen may trigger a recurrence — warn patients.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A normal CTG in OC means the fetus is safe.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CTG does not predict sudden fetal death in obstetric cholestasis.</strong> The mechanism is thought to be a sudden bile-acid-induced fetal cardiac arrhythmia — not chronic hypoxia. A normal CTG does not negate the need for appropriately timed delivery.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">UDCA eliminates fetal risk in severe OC.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>UDCA reduces maternal symptoms and improves biochemistry but has not been shown to definitively reduce stillbirth risk.</strong> The PITCHES trial (2019) found no significant reduction in composite adverse outcomes with UDCA versus placebo. Delivery timing remains the primary intervention for fetal safety.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">The mother itches.<br>The danger is entirely <em>to the baby.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES.endometrialcancer=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Oncology</div>
  <div class="n-hero-title">Endometrial<br><em>Cancer</em></div>
  <div class="n-hero-sub">ICD C54 &nbsp;·&nbsp; Most common gynaecological cancer — and the one that announces itself</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Malignancy of the uterine endometrium. Type I (endometrioid, oestrogen-driven, good prognosis) accounts for 80%. Type II (serous, clear cell, oestrogen-independent, aggressive) accounts for 20% but causes disproportionate deaths.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Peak age 55–65. Risk factors: <strong>obesity (most important), nulliparity, late menopause, PCOS, tamoxifen use, unopposed oestrogen, Lynch syndrome.</strong> Combined OCP is protective.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">~9,700 new cases/year in UK. Most (90%) present with <strong>postmenopausal bleeding</strong> — which is why the majority are caught at stage I. The alarm symptom that makes this the most curable gynaecological cancer.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Postmenopausal woman + any vaginal bleeding → think <em>endometrial cancer until proven otherwise</em> → urgent 2-week-wait (2WW) referral. Even a single episode. Even on HRT — investigate all unexpected bleeding.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Premenopausal women can also get endometrial cancer.</strong> Persistent intermenstrual bleeding or HMB that fails to respond to treatment, especially in women with obesity or PCOS, should prompt investigation. The 2WW pathway is for postmenopausal bleeding — but do not miss the younger cases.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Diagnosis & Staging</span><span class="n-section-tag">pipelining to surgery</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">TVS</div><div class="n-diag-content">Transvaginal ultrasound: endometrial thickness. <strong>≤4mm in postmenopausal women virtually excludes endometrial cancer</strong> (NPV 99%). Thickened, heterogeneous endometrium → biopsy.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Pipelle biopsy</div><div class="n-diag-content"><strong>First-line tissue diagnosis.</strong> 90% sensitivity for detecting endometrial cancer. Can be done in outpatients. If inadequate or suspicious → hysteroscopy + directed biopsy.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Hysteroscopy</div><div class="n-diag-content">Gold standard — direct visualisation + targeted biopsy. Required if Pipelle is non-diagnostic, stenosed os, or suspicion remains despite normal biopsy.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">MRI pelvis</div><div class="n-diag-content">Staging: depth of myometrial invasion, cervical involvement. <strong>Myometrial invasion >50% = stage IB</strong> — changes surgical planning. CT chest/abdomen for lymph node and distant staging.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Common mistake</div><div class="n-diag-content">Endometrial thickness of 5mm on HRT. <strong>The 4mm threshold applies to women NOT on HRT.</strong> For women on HRT with PMB, endometrial biopsy is required regardless of thickness.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management</span><span class="n-section-tag">surgery first</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Total hysterectomy + BSO</div>
  <div class="n-algo-body"><strong>Standard treatment for stage I/II disease.</strong> Total laparoscopic hysterectomy + bilateral salpingo-oophorectomy ± lymph node assessment (sentinel node biopsy or systematic pelvic/para-aortic dissection based on risk). Laparoscopic approach reduces complications in obese patients.<span class="n-involve">Gynaecological oncology MDT</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Adjuvant treatment</div>
  <div class="n-algo-body">Based on FIGO stage, grade, histological type, lymphovascular space invasion (LVSI). Low risk (stage IA, grade 1–2, no LVSI): surveillance only. Higher risk: <strong>vaginal brachytherapy</strong> ± external beam radiotherapy ± chemotherapy (carboplatin/paclitaxel).<span class="n-involve">Gynaecological oncology MDT</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Fertility-sparing (young women)</div>
  <div class="n-algo-body">Selected women with stage IA grade 1 endometrioid cancer wishing to preserve fertility: <strong>progestogen therapy</strong> (Mirena IUS + oral megestrol acetate). Requires close surveillance with repeat hysteroscopy/biopsy every 3 months. Complete remission rates ~76%.<span class="n-involve">Specialist centre</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Advanced / recurrent disease</div>
  <div class="n-algo-body dark-body">Chemotherapy (carboplatin + paclitaxel) ± immunotherapy (pembrolizumab for MSI-high tumours). Hormonal therapy (progestogens, aromatase inhibitors) for low-grade oestrogen-receptor positive recurrence.<span class="n-involve">Gynaecological oncology MDT</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Any postmenopausal bleeding = 2WW referral.</strong> Do not attribute to atrophic vaginitis without investigation. The risk of endometrial cancer in women with PMB is ~10%.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Lynch syndrome</strong> (MLH1, MSH2, MSH6, PMS2 mutations) carries up to 60% lifetime risk of endometrial cancer. All endometrial cancers should undergo MMR protein testing. Refer first-degree relatives for genetic counselling.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Tamoxifen increases endometrial cancer risk 2–3 fold</strong> due to its agonist effect on the endometrium. Women on tamoxifen with PMB must be investigated promptly — they are not simply having a drug effect.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Endometrial thickness ≤4mm in a postmenopausal woman not on HRT has a &gt;99% negative predictive value for cancer.</strong> This is the threshold for reassurance — not 5mm. For women on HRT, the threshold does not apply; biopsy is required.<span class="n-pearl-exam">Exam loves this: candidates use 5mm as a universal threshold.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Type II endometrial cancer (serous, clear cell)</strong> is oestrogen-independent, occurs in older atrophic endometrium, and carries a poor prognosis. It represents 20% of cases but a disproportionate share of deaths. Adjuvant chemotherapy is standard regardless of stage.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Obesity is the most important modifiable risk factor.</strong> Each 5 kg/m² increase in BMI increases endometrial cancer risk by 50%. Adipose tissue converts androgens to oestrone via aromatase — peripheral oestrogen production drives endometrial hyperplasia without progesterone opposition.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Atrophic vaginitis explains postmenopausal bleeding — no further investigation needed.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Atrophic vaginitis is a diagnosis of exclusion.</strong> Postmenopausal bleeding requires endometrial assessment (TVS ± biopsy) before any other cause is attributed. Atrophic vaginitis and endometrial cancer can coexist.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Grade 1 endometrial cancer is always stage I and cured by hysterectomy.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Grade and stage are independent variables.</strong> A grade 1 tumour with deep myometrial invasion (>50%) is stage IB and has a higher recurrence risk. Lymphovascular space invasion (LVSI) is an additional independent prognostic factor that determines adjuvant treatment — not just grade and stage alone.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Postmenopausal bleeding<br><em>is cancer until you prove otherwise.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES.urinaryincontinence=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Urogynaecology</div>
  <div class="n-hero-title">Urinary<br><em>Incontinence</em></div>
  <div class="n-hero-sub">ICD N39.3 &nbsp;·&nbsp; The mechanism determines everything — treat the cause, not the symptom</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Involuntary leakage of urine. Three main types: <strong>stress UI</strong> (leakage on exertion/cough/sneeze), <strong>urgency UI</strong> (overactive bladder — unable to defer), and <strong>mixed UI</strong> (both). Mechanism, not severity, determines treatment.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Affects ~1 in 3 women. Stress UI peaks post-childbirth; urgency UI peaks after menopause. <strong>Most women do not volunteer the symptom — always ask.</strong> Under-reported and under-treated.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Major impact on quality of life, social function, and mental health. Highly treatable with conservative measures. Surgery before conservative treatment is almost always the wrong sequence.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Leakage on coughing/sneezing/exercise → <em>stress UI</em> → pelvic floor muscle training first. Sudden urge + can't make it to the toilet → <em>urgency UI</em> → bladder training + anticholinergics. Both → mixed UI → address predominant symptom first.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Urodynamics are not required before treating uncomplicated stress or urgency UI.</strong> NICE: offer PFMT for stress UI and bladder training for urgency UI before urodynamics. Urodynamics are required before surgical treatment — not before conservative management.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Assessment</span><span class="n-section-tag">history drives the diagnosis</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Bladder diary</div><div class="n-diag-content"><strong>3-day bladder diary</strong> before any treatment. Documents frequency, volumes, leakage episodes, urgency. Identifies: frequency (>8 voids/day = OAB), nocturia (>1/night), large functional bladder capacity (>400 mL = unlikely OAB).</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Urinalysis + MSU</div><div class="n-diag-content">Exclude UTI and haematuria. <strong>Haematuria + urgency requires cystoscopy</strong> to exclude bladder cancer before treating as OAB.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Post-void residual</div><div class="n-diag-content">Bladder scan after voiding. Significant residual (&gt;150 mL) suggests voiding dysfunction — do not prescribe anticholinergics (worsens retention).</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Urodynamics</div><div class="n-diag-content">Required before surgery. Demonstrates: urodynamic stress incontinence (raised IAP + leak, no detrusor contraction), detrusor overactivity (involuntary contraction during filling), voiding dysfunction.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management by Type</span><span class="n-section-tag">conservative before surgical — always</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Stress UI — conservative</div>
  <div class="n-algo-body"><strong>Supervised pelvic floor muscle training (PFMT) × 3 months minimum</strong> — at least 8 contractions 3 times daily. 70% success rate with supervised training. Duloxetine (SNRI) second-line if PFMT fails: reduces leakage by 50% but poor tolerability (nausea).<span class="n-involve">Physiotherapy / GP</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Stress UI — surgical</div>
  <div class="n-algo-body">After failed conservative treatment: <strong>mid-urethral synthetic sling (TVT/TOT)</strong> — most effective surgical option (cure rate ~80%). Colposuspension (Burch) and autologous fascial sling are alternatives. Urodynamics mandatory pre-operatively.<span class="n-involve">Urogynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Urgency UI / OAB — conservative</div>
  <div class="n-algo-body"><strong>Bladder training: 6-week programme, gradually extending voiding intervals.</strong> Fluid advice (1.5L/day; reduce caffeine). Combined with PFMT for mixed UI.<span class="n-involve">GP / Continence nurse</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Urgency UI — pharmacological/third-line</div>
  <div class="n-algo-body dark-body"><strong>Anticholinergics</strong> (oxybutynin, tolterodine, solifenacin) or <strong>mirabegron</strong> (β3-agonist — preferred in elderly due to fewer cognitive side effects). Third-line: <strong>botulinum toxin A</strong> (cystoscopic injection, lasts 6 months) or <strong>percutaneous tibial nerve stimulation (PTNS). Sacral neuromodulation</strong> for refractory cases.<span class="n-involve">Urogynaecology</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Oxybutynin is the most effective anticholinergic but has the worst side-effect profile.</strong> Dry mouth, constipation, blurred vision, and — critically — cognitive impairment in elderly women. Prefer tolterodine or solifenacin, or switch to mirabegron (β3-agonist) which does not cross the blood-brain barrier.<span class="n-pearl-exam">Exam loves this: candidates prescribe oxybutynin to elderly women.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Mesh complications — be aware of the regulatory context.</strong> Transvaginal mesh for prolapse is banned in UK. Mid-urethral slings (TVT) for stress UI are still in use but restricted to specialist centres with patient counselling about risks (mesh exposure, chronic pain, dyspareunia).</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Haematuria + urgency ≠ OAB until bladder cancer is excluded.</strong> Refer for cystoscopy and upper tract imaging first. Do not treat as overactive bladder in the presence of unexplained haematuria.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Urodynamics should be performed before starting conservative treatment.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Urodynamics are required before surgical treatment, not before conservative treatment.</strong> NICE recommends PFMT for stress UI and bladder training for urgency UI as first-line without urodynamics. Performing urodynamics too early adds delay and cost without changing initial management.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Surgery is the most effective treatment for stress incontinence and should be offered early.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Conservative treatment (supervised PFMT) achieves ~70% improvement and should always precede surgery.</strong> Surgery before a proper trial of PFMT is not appropriate. Pelvic floor physiotherapy outcomes are significantly better with supervised training versus unsupervised exercises — which is what most women are given.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">The mechanism determines the treatment.<br><em>Stress and urgency are different diseases.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES.contraception=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Reproductive</div>
  <div class="n-hero-title">Contra-<br><em>ception</em></div>
  <div class="n-hero-sub">ICD Z30 &nbsp;·&nbsp; UKMEC · Pearl index · The most effective methods are the least used</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Prevention of pregnancy. Effectiveness measured by <strong>Pearl index</strong> (pregnancies per 100 woman-years with perfect use). UKMEC categories 1–4 classify medical eligibility for each method.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who needs counselling</div><div class="n-snap-text">Any woman of reproductive age. Contraception fails most often due to <strong>non-compliance and incorrect use</strong> — not method failure. LARC (long-acting reversible contraception) eliminates user error.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">LARC methods have Pearl index &lt;1 and are the most cost-effective NHS interventions. Yet the most effective methods are the least frequently offered. Method choice should match the woman's life, health, and priorities — not default to the pill.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Efficacy Hierarchy</span><span class="n-section-tag">Pearl index — lower is better</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this"><div class="n-diff-card-tag">Most effective — LARC</div><div class="n-diff-card-name">IUS / IUD / Implant / Injectable</div><div class="n-diff-card-key">Pearl index <strong>&lt;1</strong>. No user action required after insertion. Implant/IUS/IUD: &gt;99% effective. Depo-Provera injectable: 99.8% with perfect use. LARC should be default offer.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag">User-dependent</div><div class="n-diff-card-name">COCP / POP / Barrier</div><div class="n-diff-card-key">COCP: <strong>Pearl index 0.3 (perfect) / 9 (typical)</strong>. POP: 0.3/9. Male condom: 2/18. Effectiveness drops substantially with typical use. Correct and consistent use is the challenge.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">UKMEC Categories</span><span class="n-section-tag">eligibility framework</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">UKMEC 1</div><div class="n-diag-content">No restriction. Method can be used. Example: healthy woman, no risk factors.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">UKMEC 2</div><div class="n-diag-content">Advantages generally outweigh risks. Can use — monitor. Example: COCP in migraine without aura.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">UKMEC 3</div><div class="n-diag-content">Risks generally outweigh advantages. Use with specialist guidance. Example: COCP in migraine with aura, hypertension, smoking &gt;35 years.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">UKMEC 4</div><div class="n-diag-content"><strong>Unacceptable health risk — do not use.</strong> COCP: migraine with aura + additional risk factors, current breast cancer, DVT/PE on anticoagulation, ischaemic heart disease.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Method-Specific Essentials</span><span class="n-section-tag">what exams test</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">COCP (combined pill)</div>
  <div class="n-algo-body">Oestrogen + progestogen. Inhibits ovulation. <strong>Contraindicated (UKMEC 4): migraine with aura, active VTE, breast cancer, hypertension &gt;160/100, smoker &gt;35.</strong> Missing 2+ pills in week 1 = use condoms 7 days. Start day 1 of cycle = immediate protection.<span class="n-involve">GP</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">POP (mini-pill)</div>
  <div class="n-algo-body">Progestogen-only. <strong>Safe in most COCP contraindications</strong> including migraine with aura, hypertension, breastfeeding, &gt;35 smoker. Desogestrel POP: 12-hour window (not 3-hour like older POPs). Primarily inhibits ovulation (unlike older POPs which mainly thicken mucus).<span class="n-involve">GP</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">IUD (copper coil)</div>
  <div class="n-algo-body">Non-hormonal — suitable for women who cannot use hormones. Effective for 5–10 years. <strong>Also the most effective emergency contraception</strong> (if inserted within 5 days of UPSI or within 5 days of predicted ovulation). Increases menstrual flow — not ideal for women with HMB.<span class="n-involve">Trained GP or community sexual health</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">IUS (Mirena / levonorgestrel)</div>
  <div class="n-algo-body dark-body">Progestogen-releasing. <strong>Dual benefit: contraception + treatment of HMB, dysmenorrhoea, endometrial protection on HRT.</strong> Causes amenorrhoea in ~50% after 12 months. Licensed 5–8 years depending on brand. UKMEC 1 for most conditions.<span class="n-involve">Trained GP or community sexual health</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Emergency Contraception</span><span class="n-section-tag">time-critical</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this"><div class="n-diff-card-tag">Most effective EC</div><div class="n-diff-card-name">Copper IUD</div><div class="n-diff-card-key">Within <strong>5 days of UPSI</strong> or 5 days of predicted ovulation. &gt;99% effective. Also provides ongoing contraception. First-line if eligible.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag">Oral EC</div><div class="n-diff-card-name">Ulipristal (ellaOne) / Levonorgestrel</div><div class="n-diff-card-key">Ulipristal within <strong>120 hours (5 days)</strong> — more effective than levonorgestrel, especially days 3–5. Levonorgestrel within <strong>72 hours</strong>. Both less effective in women &gt;70 kg (double levonorgestrel dose).</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Enzyme-inducing drugs reduce hormonal contraceptive effectiveness.</strong> Rifampicin, carbamazepine, phenytoin, St John's Wort — induce CYP450, reduce oestrogen/progestogen levels. Use copper IUD or increase pill dose (not reliable) — switch to non-hormonal method.<span class="n-pearl-exam">Exam loves this: candidates ignore drug interactions.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>The COCP is not contraindicated in obesity alone</strong> — it is UKMEC 2 (BMI 30–35) or UKMEC 3 (BMI &gt;35) due to VTE risk. It is not absolutely contraindicated. LARC is preferable in obese women given the efficacy advantage and no VTE risk.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Contraception is needed until 2 years after the last period if under 50, and 1 year after the last period if over 50.</strong> FSH cannot be reliably used to confirm menopause in women on hormonal contraception. Barrier or LARC until the natural endpoint.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Migraine is a contraindication to all hormonal contraception.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Migraine without aura = UKMEC 2 for COCP (can use with caution).</strong> Migraine with aura = UKMEC 4 for COCP (do not use — stroke risk). Progestogen-only methods (POP, implant, IUS, injectable) are UKMEC 2 for migraine with aura — they can be used. The distinction is oestrogen + aura = absolute contraindication.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Levonorgestrel EC is equally effective on days 1–5 after UPSI.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Levonorgestrel loses effectiveness significantly after 72 hours.</strong> Its efficacy is ~95% within 24h, ~85% at 25–48h, ~58% at 49–72h. Ulipristal acetate maintains effectiveness for the full 120 hours and is significantly more effective on days 3–5. If presenting between 72–120 hours, ulipristal is the appropriate oral EC — or copper IUD.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">The most effective methods<br><em>are the least frequently offered.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES.sexuallytransmitted=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Infectious</div>
  <div class="n-hero-title">Sexually<br><em>Transmitted Infections</em></div>
  <div class="n-hero-sub">ICD A50–A64 &nbsp;·&nbsp; NAAT · Partner notification · The prescription is never just the antibiotic</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What matters</div><div class="n-snap-text">Chlamydia, gonorrhoea, syphilis, herpes, trichomonas, BV. Each has a distinct presentation, specific test, and treatment. <strong>Asymptomatic infection is the norm, not the exception</strong> — most STIs are found by screening, not symptoms.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Peak incidence: 16–25 year olds. New STI diagnoses rising in UK. Co-infection is common — test for all STIs when one is found. <strong>Never treat one STI without a full STI screen.</strong></div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Untreated STIs cause PID, infertility, ectopic pregnancy, chronic pelvic pain, neonatal disease, and cancer (HPV→cervical, HBV/HCV→liver). Partner notification is integral to management — not optional.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">High-Yield STI Summaries</span><span class="n-section-tag">one disease, one key fact</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Chlamydia</div><div class="n-diag-content"><em>C. trachomatis.</em> <strong>Most common bacterial STI in UK.</strong> Usually asymptomatic. Symptoms: mucopurulent discharge, IMB, dysuria, pelvic pain. Test: NAAT (vulvovaginal swab or urine). Treatment: <strong>doxycycline 100mg BD × 7 days</strong> (first-line) or azithromycin 1g stat + 500mg daily × 2 days. Sequelae: PID, infertility, ectopic.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Gonorrhoea</div><div class="n-diag-content"><em>N. gonorrhoeae.</em> Purulent discharge, dysuria. Often co-infects with chlamydia. Test: NAAT (endocervical swab). <strong>Treatment: ceftriaxone 1g IM stat</strong> — oral agents no longer recommended due to resistance. Resistance patterns: always follow current BASHH guidelines. Contact trace all partners.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Syphilis</div><div class="n-diag-content"><em>T. pallidum.</em> Primary: painless ulcer (chancre). Secondary: systemic — rash (including palms/soles), condylomata lata, lymphadenopathy. Latent: asymptomatic. Tertiary: gummas, neuro, cardiovascular. Test: serology (TPPA + RPR). <strong>Treatment: benzathine penicillin G IM.</strong> Notifiable disease.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Herpes (HSV)</div><div class="n-diag-content">HSV-1 and HSV-2. Primary episode: painful vulval/vaginal ulcers + systemic symptoms. Recurrences milder. Diagnosis: clinical ± PCR swab from ulcer. <strong>Treatment: aciclovir 400mg TDS × 5 days.</strong> No cure — virus remains latent in dorsal root ganglia. Suppressive therapy (aciclovir 400mg BD) for frequent recurrences or to reduce transmission.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Trichomonas</div><div class="n-diag-content"><em>T. vaginalis.</em> Frothy yellow-green discharge, vulvovaginal soreness, strawberry cervix. Often asymptomatic. Microscopy (wet prep) or NAAT. <strong>Treatment: metronidazole 400mg BD × 5–7 days</strong> (avoid alcohol). Treat partners simultaneously.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">BV (not sexually transmitted but associated)</div><div class="n-diag-content"><em>Gardnerella vaginalis</em> overgrowth. Thin grey-white discharge, <strong>fishy odour</strong> (especially post-coital), pH &gt;4.5. Clue cells on microscopy. <strong>Treatment: metronidazole 400mg BD × 5 days</strong> or 2g stat. High recurrence rate — do not treat partners routinely.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Diagnosis Principles</span><span class="n-section-tag">what to take and why</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this"><div class="n-diff-card-tag">NAAT — gold standard</div><div class="n-diff-card-name">Nucleic Acid Amplification Test</div><div class="n-diff-card-key">Detects chlamydia and gonorrhoea DNA with high sensitivity. Vulvovaginal self-swab or first-catch urine. <strong>Do not culture instead of NAAT</strong> — NAAT is more sensitive. Culture is needed for gonorrhoea sensitivity testing.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag">Full STI screen</div><div class="n-diff-card-name">When one STI found</div><div class="n-diff-card-key">Chlamydia/gonorrhoea NAAT + syphilis serology + HIV + hepatitis B/C. <strong>Co-infection is common.</strong> Finding one STI should always prompt a full screen — do not treat in isolation.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Syphilis in pregnancy = congenital syphilis risk.</strong> Untreated maternal syphilis causes stillbirth, neonatal death, or severely affected infant. Treat immediately with benzathine penicillin — all trimesters. Ensure partner treated. Notifiable.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Gonorrhoea resistance is rising.</strong> Do not use oral antibiotics (ciprofloxacin) empirically — resistance is widespread. First-line is ceftriaxone IM. If cephalosporin allergy: specialist advice. Always send culture for sensitivity testing alongside NAAT.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Herpes in third trimester = neonatal risk.</strong> Active genital HSV lesions at delivery = strong indication for caesarean section to prevent neonatal herpes encephalitis. Aciclovir prophylaxis from 36 weeks if primary herpes in third trimester.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Partner notification is not optional — it is part of treatment.</strong> Untreated partners reinfect the index patient and continue transmission. For chlamydia: notify all partners within 6 months. For gonorrhoea and syphilis: notify all partners within 3 months (or further depending on stage). Health advisors at GUM clinics manage this.<span class="n-pearl-exam">Exam loves this: candidates discharge the patient without mentioning partner notification.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Azithromycin is no longer recommended as first-line for chlamydia.</strong> BASHH 2022 guidelines recommend doxycycline 100mg BD × 7 days as first-line. Azithromycin 1g stat (with 500mg daily × 2 days) is second-line — concerns about macrolide resistance and treatment failure with single-dose regimen.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>BV is not sexually transmitted but increases susceptibility to STIs.</strong> The disrupted vaginal flora removes Lactobacillus — the acidic protective layer. BV triples the risk of STI acquisition including HIV. Do not treat partners routinely, but do treat BV found during STI screening.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A negative swab for gonorrhoea culture means the patient does not have gonorrhoea.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Culture has lower sensitivity than NAAT for gonorrhoea.</strong> A negative culture does not exclude gonorrhoea if the NAAT is positive. NAAT is the diagnostic standard — culture is supplementary, primarily for resistance testing to guide treatment.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Asymptomatic herpes is not infectious.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Herpes is transmitted during asymptomatic viral shedding.</strong> The majority of HSV transmission occurs when the source partner has no symptoms and no visible lesions. Suppressive antiviral therapy reduces (but does not eliminate) transmission risk. Condom use further reduces — but does not eliminate — transmission.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Partner notification<br><em>is part of the prescription.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES.acutegynae=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Emergency</div>
  <div class="n-hero-title">Acute<br><em>Gynaecology</em></div>
  <div class="n-hero-sub">ICD N83 &nbsp;·&nbsp; Torsion · TOA · Bartholin's · The diagnoses where hours determine whether an ovary survives</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What it covers</div><div class="n-snap-text">Ovarian torsion, tubo-ovarian abscess (TOA), Bartholin's abscess, acute vulval haematoma, Mittelschmerz, haemoperitoneum from ruptured cyst. <strong>All present with acute pelvic pain — the diagnosis determines urgency.</strong></div></div><div class="n-snap-cell"><div class="n-snap-label">What you must not miss</div><div class="n-snap-text"><strong>Torsion and ruptured ectopic are surgical emergencies.</strong> Torsion: every hour of delay risks ovarian infarction. Ectopic: haemodynamic compromise requires immediate theatre. Both can present with a negative pregnancy test.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Ovarian torsion is the only gynaecological emergency where the organ can be saved by prompt surgery. Delayed diagnosis = oophorectomy. The window is narrow. A high index of suspicion is the only protective factor.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Ovarian Torsion</span><span class="n-section-tag">time is ovary</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Sudden-onset severe unilateral pelvic pain (often with nausea/vomiting) in a woman of reproductive age + adnexal mass on USS → think <em>ovarian torsion</em> → urgent surgical review. Do not wait for Doppler to be absent.</div></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Clinical features</div><div class="n-diag-content">Sudden severe unilateral pain, worse on movement. Often intermittent (partial torsion). Nausea and vomiting in ~70%. Low-grade fever if necrosis. Adnexal tenderness on bimanual. No pathognomonic signs.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">USS + Doppler</div><div class="n-diag-content"><strong>USS shows ovarian enlargement ± cyst ± free fluid.</strong> Absent Doppler flow supports torsion — but <strong>present Doppler does not exclude it.</strong> Ovarian blood supply can be intermittent in partial torsion. Do not be falsely reassured by Doppler.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Critical mistake</div><div class="n-diag-content"><strong>Waiting for Doppler to disappear before operating.</strong> Torsion is a clinical + USS diagnosis. Doppler flow can persist in early or partial torsion. If clinical suspicion is high, diagnostic laparoscopy is the correct next step.</div></div>
  </div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Laparoscopy — detorsion</div>
  <div class="n-algo-body"><strong>Untwist the ovary even if it appears infarcted.</strong> Colour returns in up to 90% of cases after detorsion — apparent infarction on visual inspection is unreliable. Oophorectomy should be reserved for confirmed necrosis. Ovarian cystectomy if causative cyst identified.<span class="n-involve">Gynaecological surgery</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Tubo-Ovarian Abscess (TOA)</span><span class="n-section-tag">PID gone wrong</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Presentation</div><div class="n-diag-content">Severe pelvic pain, high fever, cervical excitation, adnexal mass. History of PID or unprotected sex. <strong>Markedly elevated CRP and WCC.</strong> USS or CT: thick-walled complex adnexal collection.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Management</div><div class="n-diag-content">IV antibiotics: <strong>cefoxitin + doxycycline</strong> or IV co-amoxiclav + metronidazole (BASHH regimen). If no improvement in 48–72 hours → image-guided drainage or laparoscopic drainage/salpingectomy. Risk of rupture → peritonitis.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Ruptured TOA</div><div class="n-diag-content"><strong>Ruptured TOA = surgical emergency.</strong> Signs: sudden deterioration, peritonism, haemodynamic instability. Immediate laparotomy required. High mortality if diagnosis delayed.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Bartholin's Abscess & Cyst</span><span class="n-section-tag">the one you drain</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Bartholin's cyst</div><div class="n-diag-content">Blocked Bartholin's duct. Painless swelling at 4 or 8 o'clock position of introitus. No treatment needed if asymptomatic. If large/symptomatic: marsupialization or Word catheter insertion.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Bartholin's abscess</div><div class="n-diag-content">Infected cyst. Exquisitely painful, warm, fluctuant. <strong>Treatment: Word catheter insertion</strong> (inflatable balloon catheter, left in situ for 4–6 weeks to epithelialise a new duct) or marsupialization under LA/GA. Swab for gonorrhoea and chlamydia.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Over-50s</div><div class="n-diag-content"><strong>New Bartholin's mass in a woman over 50 = biopsy to exclude Bartholin's gland carcinoma.</strong> Rare but important. Do not assume all labial masses in older women are benign cysts.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Haemodynamic instability + acute pelvic pain = ruptured ectopic until proven otherwise.</strong> β-hCG, group and crossmatch, immediate senior review. Do not wait for USS if the patient is collapsing.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Torsion: every hour matters.</strong> Ovarian viability falls with time. Diagnostic laparoscopy should not be delayed by observation if clinical suspicion is high — even if Doppler is present.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>A negative pregnancy test does not exclude ectopic pregnancy in very early gestation.</strong> If clinical suspicion is high, serial β-hCG + repeat USS are required. Rare ectopics can have very low hCG.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Detorsion should be performed even if the ovary looks black.</strong> Congestion and haemorrhage cause apparent infarction on visual inspection — colour returns after untwisting in the majority. Intraoperative oophorectomy based on appearance alone is no longer appropriate.<span class="n-pearl-exam">Exam loves this: candidates say the ovary looked necrotic and was removed.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Risk factors for torsion:</strong> ovarian cyst (especially dermoid — most common cause), ovulation induction (enlarged ovaries), previous torsion (10% recurrence risk), long utero-ovarian ligament (predisposes). Torsion can occur in normal ovaries in reproductive-age women.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Mittelschmerz</strong> is mid-cycle ovulation pain — typically mild, unilateral, resolves within 24–48 hours. It is a diagnosis of exclusion. Acute onset, severe pain, or persisting pain requires investigation to exclude torsion, ruptured cyst, or ectopic.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal Doppler flow to the ovary excludes torsion.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Doppler flow can be present in ovarian torsion.</strong> Partial or intermittent torsion preserves some blood flow. The sensitivity of absent Doppler for torsion is only ~44–46%. Clinical suspicion + ovarian enlargement + acute pain is sufficient indication for diagnostic laparoscopy regardless of Doppler findings.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A black, necrotic-appearing ovary should be removed at laparoscopy.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Untwist first, observe for colour change, then decide.</strong> Studies show up to 90% of visually compromised ovaries recover normal function after detorsion. Immediate oophorectomy based on visual appearance results in unnecessary loss of ovarian tissue and reproductive potential. Conserve unless truly necrotic and non-viable after adequate observation post-detorsion.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-text">Untwist it.<br><em>Even if it looks dead.</em></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES_MCQ.obstetriccholestasis=[
  {q:"A 34-week pregnant woman presents with intense pruritus on her palms and soles. No rash is visible. LFTs are mildly elevated. What is the most appropriate next investigation?",opts:["Viral hepatitis screen","Fasting serum bile acids","Liver ultrasound","Urine dipstick for urobilinogen"],ans:1,focus:"OC diagnosis — fasting bile acids",exp:"<strong>Fasting serum bile acids</strong> are the definitive diagnostic test for obstetric cholestasis. They must be fasting (postprandial levels are unreliable). The diagnostic threshold is &gt;19 µmol/L. Note: LFTs can be normal when bile acids are elevated, so bile acids are required regardless of LFT results. The absence of a rash distinguishes OC from PUPPP."},
  {q:"In obstetric cholestasis, the primary risk to the fetus is:",opts:["Fetal growth restriction from placental insufficiency","Sudden unexplained stillbirth","Neonatal jaundice from bile acid transfer","Fetal arrhythmia detectable on CTG"],ans:1,focus:"OC fetal risk — sudden stillbirth",exp:"The primary fetal risk in OC is <strong>sudden unexplained stillbirth</strong>. The mechanism is thought to be a bile-acid-induced fetal cardiac arrhythmia — not chronic hypoxia. This is why CTG is not a reliable tool for fetal surveillance in OC: it cannot predict a sudden arrhythmic event. Delivery timing is the primary intervention."},
  {q:"A woman with obstetric cholestasis has fasting bile acids of 62 µmol/L at 37 weeks. What is the most appropriate management?",opts:["UDCA and weekly bile acid monitoring until 40 weeks","IOL should be offered at 38–39 weeks","Immediate IOL regardless of gestational age","Expectant management with twice-weekly CTG"],ans:1,focus:"OC management — delivery timing by bile acid level",exp:"<strong>Bile acids 40–99 µmol/L: IOL should be offered at 38–39 weeks.</strong> Mild OC (&lt;40 µmol/L) can be managed until 40 weeks. Severe OC (≥100 µmol/L) requires individualised discussion with senior obstetrician about delivery at 35–37 weeks. UDCA treats symptoms but has not been shown to reduce stillbirth risk (PITCHES trial 2019). CTG does not reliably predict the sudden fetal death associated with OC."},
  {q:"Which of the following statements about UDCA (ursodeoxycholic acid) in obstetric cholestasis is correct?",opts:["UDCA eliminates the risk of stillbirth","UDCA improves maternal pruritus and LFTs but has not been shown to reduce stillbirth risk","UDCA is contraindicated in the third trimester","UDCA is only indicated when bile acids exceed 100 µmol/L"],ans:1,focus:"UDCA in OC — PITCHES trial",exp:"<strong>UDCA improves maternal symptoms and biochemistry but has not been shown to definitively reduce stillbirth risk.</strong> The PITCHES trial (2019) found no significant reduction in composite adverse outcomes with UDCA versus placebo. UDCA remains standard of care as it is safe, improves maternal symptoms, and may have some benefit — but delivery timing is the primary intervention for fetal safety. UDCA can be started as soon as OC is diagnosed, regardless of bile acid level."},
  {q:"Obstetric cholestasis carries a significant risk of recurrence in future pregnancies. What is the approximate recurrence rate?",opts:["5–10%","20–30%","45–70%","Over 90%"],ans:2,focus:"OC recurrence rate",exp:"<strong>Obstetric cholestasis recurs in approximately 45–70% of subsequent pregnancies.</strong> Women should be counselled about this and offered early testing (from 20 weeks) in future pregnancies. Additionally, the combined oral contraceptive pill (oestrogen-containing) may trigger a recurrence of the cholestatic pattern in susceptible women — this should be mentioned when discussing future contraception."}
];

NOTES_MCQ.endometrialcancer=[
  {q:"A 62-year-old woman presents with a single episode of postmenopausal vaginal bleeding. She is not on HRT. TVS shows endometrial thickness of 3.8mm. What is the most appropriate next step?",opts:["Reassure — endometrial thickness below 4mm excludes cancer","2-week wait referral for endometrial biopsy","Repeat TVS in 6 weeks","Pipelle biopsy in primary care"],ans:0,focus:"4mm threshold — excluding endometrial cancer",exp:"<strong>Endometrial thickness ≤4mm in a postmenopausal woman NOT on HRT has a negative predictive value of &gt;99% for endometrial cancer.</strong> A thickness of 3.8mm is therefore reassuring. However, 2WW referral remains appropriate given the PMB — the final decision depends on local protocols. Key distinction: this threshold does not apply to women on HRT (where biopsy is required regardless of thickness)."},
  {q:"The most important modifiable risk factor for endometrial cancer is:",opts:["Nulliparity","Late menopause","Obesity","Tamoxifen use"],ans:2,focus:"Endometrial cancer risk — obesity",exp:"<strong>Obesity is the most important modifiable risk factor for endometrial cancer.</strong> Adipose tissue converts androgens to oestrone via aromatase — generating peripheral oestrogen without progesterone opposition, driving endometrial hyperplasia and malignant transformation. Each 5 kg/m² increase in BMI increases endometrial cancer risk by ~50%. This is why endometrial cancer rates are rising in parallel with obesity prevalence."},
  {q:"A 45-year-old woman with Lynch syndrome is diagnosed with stage IA grade 1 endometrioid endometrial cancer. She wishes to preserve fertility. What is the recommended management?",opts:["Total laparoscopic hysterectomy + BSO — fertility preservation not appropriate in Lynch syndrome","Progestogen therapy (IUS + oral megestrol) with regular hysteroscopy/biopsy surveillance","External beam radiotherapy to avoid surgery","Observation only — grade 1 stage IA has very low mortality"],ans:1,focus:"Fertility-sparing management of endometrial cancer",exp:"<strong>Selected women with stage IA grade 1 endometrioid endometrial cancer wishing to preserve fertility can be managed with progestogen therapy</strong> — typically a Mirena IUS + oral megestrol acetate — with close surveillance (hysteroscopy + biopsy every 3 months). Complete remission rates are approximately 76%. This is appropriate even in Lynch syndrome carriers if the woman has been fully counselled and understands the risks. Definitive surgery is recommended once childbearing is complete."},
  {q:"Which histological type of endometrial cancer is associated with the worst prognosis and does not require elevated oestrogen for development?",opts:["Endometrioid adenocarcinoma (type I)","Serous carcinoma (type II)","Mucinous adenocarcinoma","Clear cell carcinoma"],ans:1,focus:"Type II endometrial cancer — serous",exp:"<strong>Type II endometrial cancers (serous, clear cell) are oestrogen-independent</strong>, arise in atrophic endometrium, occur in older women, and carry a significantly worse prognosis than type I (endometrioid) cancers. Serous carcinoma in particular is highly aggressive — it represents ~10% of endometrial cancers but a disproportionate share of deaths. Adjuvant chemotherapy (carboplatin + paclitaxel) is standard regardless of stage for serous carcinoma."},
  {q:"All endometrial cancers should undergo routine testing for mismatch repair (MMR) protein expression because:",opts:["MMR status determines surgical approach","MMR deficiency identifies Lynch syndrome and guides immunotherapy use","MMR testing replaces clinical staging","All MMR-deficient cancers are low grade"],ans:1,focus:"MMR testing in endometrial cancer — Lynch syndrome + immunotherapy",exp:"<strong>MMR deficiency (loss of MLH1, MSH2, MSH6, or PMS2) in endometrial cancer has two important implications:</strong> (1) It flags possible Lynch syndrome — first-degree relatives should be referred for genetic counselling. (2) MMR-deficient (MSI-high) tumours respond to immune checkpoint inhibitors (pembrolizumab), which is now an approved treatment in advanced/recurrent disease. Universal MMR testing is therefore recommended for all endometrial cancers at diagnosis."}
];

NOTES_MCQ.urinaryincontinence=[
  {q:"A 52-year-old woman describes leakage of urine when she coughs, laughs, or exercises. She has had two vaginal deliveries. What is the first-line treatment?",opts:["Mid-urethral synthetic sling (TVT)","Duloxetine 40mg BD","Supervised pelvic floor muscle training for at least 3 months","Urodynamic assessment before any treatment"],ans:2,focus:"Stress UI first-line — PFMT",exp:"<strong>Supervised pelvic floor muscle training (PFMT) for a minimum of 3 months is first-line treatment for stress urinary incontinence.</strong> It achieves approximately 70% improvement rates with supervised training. Surgery (TVT) is only appropriate after a proper trial of conservative treatment fails. Urodynamics are required before surgical treatment — not before conservative management. Duloxetine is second-line pharmacological option."},
  {q:"Which drug class is preferred for overactive bladder in elderly women due to the lowest risk of cognitive side effects?",opts:["Oxybutynin (non-selective anticholinergic)","Tolterodine (selective anticholinergic)","Mirabegron (β3-adrenergic agonist)","Desmopressin"],ans:2,focus:"OAB pharmacotherapy — mirabegron in elderly",exp:"<strong>Mirabegron (β3-adrenergic agonist) is preferred in elderly women with OAB</strong> because it does not cross the blood-brain barrier and therefore does not cause cognitive impairment, confusion, or worsen dementia — unlike anticholinergic drugs. Oxybutynin is the most effective anticholinergic but has the worst CNS side-effect profile. Long-term anticholinergic use has been associated with increased dementia risk in observational studies."},
  {q:"A 3-day bladder diary shows she voids 12 times per day, has 3 episodes of urgency incontinence, and maximum voided volume of 180mL. There is no haematuria. What is the most appropriate first-line management?",opts:["Cystoscopy to exclude bladder pathology","Anticholinergic medication","Bladder training programme","Urodynamics to confirm detrusor overactivity"],ans:2,focus:"Urgency UI / OAB — bladder training first-line",exp:"<strong>Bladder training is first-line for urgency urinary incontinence and overactive bladder.</strong> A 6-week programme gradually extends the intervals between voiding, retraining the detrusor. Combined with fluid advice (1.5L/day; reduce caffeine and fizzy drinks). Urodynamics are not required before starting conservative treatment — only before surgery. Anticholinergics are second-line after bladder training fails. Cystoscopy is needed only if haematuria is present."},
  {q:"Urodynamics (cystometry) are mandatory before which of the following?",opts:["Starting bladder training for urgency incontinence","Starting PFMT for stress incontinence","Performing a mid-urethral sling procedure","Prescribing mirabegron for OAB"],ans:2,focus:"Urodynamics — required before surgery only",exp:"<strong>Urodynamics are required before surgical treatment for urinary incontinence</strong> — specifically to confirm the diagnosis (urodynamic stress incontinence vs detrusor overactivity vs mixed) and to exclude voiding dysfunction before inserting a sling. They are NOT required before conservative treatments (PFMT, bladder training) or pharmacotherapy. Performing urodynamics before all treatments adds cost and delay without changing initial management."},
  {q:"A postmenopausal woman presents with urgency, frequency, and haematuria. She is treated with anticholinergics for 8 weeks with no improvement. What is the most important next investigation?",opts:["Repeat urodynamics","Flexible cystoscopy and upper tract imaging","MRI pelvis","Urine culture and sensitivities"],ans:1,focus:"Haematuria + urgency — exclude bladder cancer",exp:"<strong>Haematuria with urgency symptoms requires cystoscopy to exclude bladder cancer before attributing symptoms to OAB.</strong> Bladder cancer classically presents with painless haematuria but can cause urgency and frequency. In a postmenopausal woman failing to respond to treatment, failure to investigate haematuria appropriately could miss a cancer diagnosis. Flexible cystoscopy + upper tract imaging (USS or CT urogram) is the standard investigation pathway."}
];

NOTES_MCQ.contraception=[
  {q:"A 28-year-old woman with migraine with aura requests the combined oral contraceptive pill. What is the correct UKMEC classification and advice?",opts:["UKMEC 2 — can use with monitoring","UKMEC 3 — use only if no alternatives","UKMEC 4 — do not use","UKMEC 1 — no restriction"],ans:2,focus:"COCP + migraine with aura — UKMEC 4",exp:"<strong>Migraine with aura is a UKMEC 4 contraindication to the combined oral contraceptive pill.</strong> The combination of oestrogen and migrainous aura (which reflects cortical spreading depression) is associated with a significantly increased risk of ischaemic stroke. Progestogen-only methods (POP, implant, IUS, injectable) are UKMEC 2 for migraine with aura and can be offered safely. The copper IUD is also appropriate."},
  {q:"A woman has unprotected sexual intercourse on day 2 of her cycle. She presents 96 hours later requesting emergency contraception. Which is the most appropriate option?",opts:["Levonorgestrel 1.5g stat","Ulipristal acetate (ellaOne) 30mg stat","Copper IUD insertion","Either levonorgestrel or ulipristal — equally effective at 96 hours"],ans:2,focus:"Emergency contraception — copper IUD most effective, ulipristal up to 120h",exp:"<strong>The copper IUD is the most effective form of emergency contraception</strong> and is appropriate up to 5 days after unprotected intercourse or 5 days after predicted ovulation — &gt;99% effective. At 96 hours, levonorgestrel has substantially reduced efficacy (only reliably effective to 72 hours). Ulipristal remains effective to 120 hours and is more effective than levonorgestrel days 3–5. If the woman is willing to have an IUD inserted, it is the best option. If not, ulipristal is appropriate here — not levonorgestrel."},
  {q:"Which contraceptive method is most appropriate for a woman taking carbamazepine for epilepsy?",opts:["Combined oral contraceptive pill — increase dose to 50mcg","Progestogen-only pill (desogestrel)","Copper IUD","Progestogen implant"],ans:2,focus:"Enzyme-inducing drugs — copper IUD only non-hormonal LARC",exp:"<strong>Carbamazepine is an enzyme-inducing drug</strong> that induces CYP3A4, significantly reducing plasma levels of both oestrogen and progestogen — making hormonal contraception unreliable. The copper IUD is the recommended method: it is non-hormonal, highly effective, and unaffected by enzyme-inducing drugs. Increasing the oestrogen dose is not reliably effective and not recommended. The implant and injectable are also affected by enzyme-inducing drugs."},
  {q:"The Mirena IUS has which of the following additional therapeutic uses beyond contraception?",opts:["Prevention of ovarian cancer","Treatment of HMB, dysmenorrhoea, and endometrial protection in HRT","First-line management of PCOS","Treatment of cervical dysplasia (CIN)"],ans:1,focus:"IUS — dual therapeutic uses",exp:"<strong>The levonorgestrel IUS (Mirena) is licensed for: contraception, treatment of heavy menstrual bleeding (HMB), dysmenorrhoea, and endometrial protection in women using systemic oestrogen HRT.</strong> It reduces menstrual blood loss by ~90% and causes amenorrhoea in ~50% after 12 months. For HRT, it provides the progestogen component to protect the endometrium from oestrogen-driven hyperplasia without systemic progestogen exposure. It is not used for PCOS ovulation induction or cervical dysplasia."},
  {q:"What is the correct advice regarding contraception after the age of 50?",opts:["Contraception can be stopped at age 50","Contraception is needed for 1 year after the last period if over 50","Contraception is needed for 2 years after the last period if over 50","FSH can confirm menopause and guide when to stop contraception in women on the pill"],ans:1,focus:"Contraception — when to stop after menopause",exp:"<strong>Contraception is needed for 1 year after the last menstrual period in women over 50, and for 2 years after the last menstrual period in women under 50.</strong> FSH cannot reliably confirm menopause in women using hormonal contraception (the pill suppresses FSH). Women over 50 wishing to use FSH to guide cessation should switch to a non-hormonal method (barrier or copper IUD), then measure FSH after 2 months — two FSH &gt;30 IU/L taken 6 weeks apart confirms menopause."}
];

NOTES_MCQ.sexuallytransmitted=[
  {q:"A 22-year-old woman is found to have chlamydia on a routine screen. She is asymptomatic. What is the current first-line treatment according to BASHH 2022 guidelines?",opts:["Azithromycin 1g single dose","Doxycycline 100mg BD for 7 days","Ciprofloxacin 500mg single dose","Metronidazole 400mg BD for 5 days"],ans:1,focus:"Chlamydia treatment — doxycycline first-line",exp:"<strong>Doxycycline 100mg BD for 7 days is first-line for chlamydia</strong> according to updated BASHH 2022 guidelines. Azithromycin (1g stat + 500mg daily × 2 days) is second-line — concerns about higher treatment failure rates with single-dose azithromycin and rising macrolide resistance led to this change. Ciprofloxacin is not used for chlamydia. Metronidazole treats BV and trichomonas but not chlamydia."},
  {q:"A 19-year-old presents with a painless genital ulcer lasting 2 weeks, with non-tender inguinal lymphadenopathy. She is sexually active with multiple partners. What is the most likely diagnosis?",opts:["Herpes simplex virus (HSV) primary infection","Primary syphilis","Chancroid","Lymphogranuloma venereum (LGV)"],ans:1,focus:"Primary syphilis — painless chancre",exp:"<strong>The classic presentation of primary syphilis is a painless, indurated ulcer (chancre) with non-tender regional lymphadenopathy.</strong> Key distinction: HSV ulcers are typically multiple, painful, and vesicular before ulcerating. Chancroid produces painful ulcers with tender lymphadenopathy. LGV causes painless ulcers followed by painful lymphadenopathy. A painless single ulcer + non-tender nodes = syphilis until proven otherwise. Confirm with TPPA and RPR serology."},
  {q:"Treatment for uncomplicated gonorrhoea in the UK is:",opts:["Ciprofloxacin 500mg oral stat","Azithromycin 1g oral stat","Ceftriaxone 1g IM stat","Doxycycline 100mg BD for 7 days"],ans:2,focus:"Gonorrhoea treatment — ceftriaxone IM",exp:"<strong>Ceftriaxone 1g IM stat is the recommended treatment for gonorrhoea</strong> (BASHH/UKHSA guidelines). Oral agents including ciprofloxacin and azithromycin are no longer recommended due to widespread resistance. Culture for antibiotic sensitivity testing should always be taken alongside NAAT. If cephalosporin allergy is suspected, specialist advice is required. Test of cure (NAAT at 2 weeks) is recommended after treatment."},
  {q:"Which of the following best describes the approach to partner notification in a patient with newly diagnosed chlamydia?",opts:["Only the current partner needs notification","All partners in the last 6 months should be notified and offered testing and treatment","Partner notification is optional and depends on patient consent","Partners should only be notified if symptomatic"],ans:1,focus:"Partner notification — chlamydia 6 months",exp:"<strong>All sexual partners in the last 6 months should be notified, offered testing, and offered treatment for chlamydia.</strong> Partner notification is a core part of STI management — not optional. It breaks the chain of transmission and prevents reinfection of the index patient. Health advisors at GUM clinics are trained to support partner notification, including patient-referral (patient notifies partners directly) and provider-referral (clinic contacts partners) approaches."},
  {q:"A pregnant woman at 28 weeks is found to have a positive TPPA and RPR (titre 1:64) on antenatal screening. She has no history of treated syphilis. What is the most appropriate management?",opts:["Repeat serology at 36 weeks — no treatment until delivery","Doxycycline 100mg BD for 28 days","Benzathine penicillin G 2.4 MU IM — treat immediately","Azithromycin 2g stat as penicillin alternative in pregnancy"],ans:2,focus:"Syphilis in pregnancy — treat immediately with benzathine penicillin",exp:"<strong>Untreated syphilis in pregnancy causes congenital syphilis</strong> — stillbirth, neonatal death, or severely affected infant. <strong>Benzathine penicillin G 2.4 MU IM is the treatment of choice in all trimesters</strong>. Doxycycline is contraindicated in pregnancy. Azithromycin is not recommended due to macrolide resistance in T. pallidum. The sexual partner must also be treated. Syphilis is a notifiable disease — inform public health. Test of cure with monthly RPR titres until delivery."}
];

NOTES_MCQ.acutegynae=[
  {q:"A 24-year-old presents with sudden-onset severe right iliac fossa pain, nausea and vomiting for 3 hours. USS shows an enlarged right ovary of 6cm with a 4cm dermoid cyst and no Doppler flow. What is the most appropriate management?",opts:["IV antibiotics and observe for 24 hours","Urgent laparoscopy for suspected ovarian torsion","CT abdomen to confirm the diagnosis","Analgesia and reassure — likely ruptured follicular cyst"],ans:1,focus:"Ovarian torsion — urgent laparoscopy",exp:"<strong>This is ovarian torsion until proven otherwise — urgent diagnostic laparoscopy is required.</strong> Features: sudden-onset unilateral pain, enlarged ovary, adnexal mass (dermoid). Absent Doppler supports the diagnosis but present Doppler does not exclude it. IV antibiotics are for TOA, not torsion. CT adds delay without changing management. Every hour of delay reduces the chance of ovarian salvage."},
  {q:"At laparoscopy for suspected torsion, the right ovary appears dark blue-black. The most appropriate surgical decision is:",opts:["Proceed to oophorectomy — the ovary is infarcted","Detorse the ovary and observe for colour change before deciding on oophorectomy","Detorse the ovary and insert a salpingo-oophoropexy suture immediately","Leave the ovary — it will recover spontaneously over 48 hours"],ans:1,focus:"Torsion — detorse first even if black",exp:"<strong>Untwist the ovary first and observe for perfusion recovery before considering oophorectomy.</strong> Studies show up to 90% of visually compromised ovaries recover normal function after detorsion — the blue-black colour reflects congestion and haemorrhage, not irreversible necrosis. Immediate oophorectomy based on visual appearance results in unnecessary loss of reproductive tissue. Oophorectomy is reserved for confirmed, irreversible necrosis after adequate observation post-detorsion."},
  {q:"A 28-year-old presents with 5 days of lower abdominal pain, high fever (38.9°C), and a WCC of 18. On USS there is a 5cm thick-walled complex adnexal collection. What is the diagnosis and initial management?",opts:["Ovarian torsion — urgent laparoscopy","Ectopic pregnancy — measure β-hCG urgently","Tubo-ovarian abscess — IV antibiotics as first-line","Acute appendicitis — general surgery review"],ans:2,focus:"TOA — IV antibiotics first-line",exp:"<strong>Tubo-ovarian abscess: fever + elevated WCC + complex adnexal collection = IV antibiotics first-line.</strong> Regimen: IV co-amoxiclav + metronidazole or cefoxitin + doxycycline (BASHH). If no improvement in 48–72 hours, image-guided drainage or laparoscopic drainage is indicated. A ruptured TOA causes peritonitis and haemodynamic instability — requiring immediate laparotomy. This presentation is not consistent with torsion (no fever) or ectopic (complex collection not a gestational sac)."},
  {q:"A 55-year-old postmenopausal woman presents with a fluctuant, tender swelling at the 7 o'clock position of the introitus. What is the diagnosis and the most appropriate treatment?",opts:["Vulval varicosity — reassure","Bartholin's abscess — Word catheter insertion","Bartholin's cyst — no treatment needed","Vulval cancer — urgent biopsy"],ans:1,focus:"Bartholin's abscess — Word catheter",exp:"<strong>Bartholin's gland abscesses are located at the 4 or 8 o'clock position of the introitus.</strong> They are exquisitely painful, warm, and fluctuant. Treatment: <strong>Word catheter insertion</strong> (inflatable catheter left in situ 4–6 weeks to epithelialise a new duct) or marsupialization under LA/GA. Important: in women over 50, a new Bartholin's mass should be biopsied to exclude Bartholin's gland carcinoma. A 55-year-old with an acute abscess can be treated with Word catheter, but if the mass persists after treatment, biopsy is indicated."},
  {q:"Doppler flow is present on USS in a woman with suspected ovarian torsion. The correct interpretation is:",opts:["Torsion is excluded — proceed to conservative management","Doppler flow does not exclude torsion — clinical suspicion should drive the decision for laparoscopy","Torsion is unlikely but CT should be performed to confirm","Partial torsion can be managed conservatively with analgesia"],ans:1,focus:"Torsion — Doppler does not exclude",exp:"<strong>Present Doppler flow does not exclude ovarian torsion.</strong> The sensitivity of absent Doppler for torsion is only approximately 44–46%. Partial or intermittent torsion can preserve blood flow while still causing ischaemic damage. Clinical suspicion + acute pain + adnexal mass is sufficient to proceed to diagnostic laparoscopy regardless of Doppler findings. Relying on Doppler to exclude torsion is a well-documented cause of delayed diagnosis and avoidable oophorectomy."}
];

