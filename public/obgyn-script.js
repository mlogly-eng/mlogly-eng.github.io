(function(){
  const s=document.createElement('style');
  s.textContent=`.n-anchor{margin:0;padding:0 32px;border-top:none!important;}.n-anchor-card{background:linear-gradient(150deg,rgba(200,69,42,0.05) 0%,rgba(210,140,80,0.03) 60%,rgba(200,69,42,0.04) 100%);border:1px solid rgba(200,69,42,0.14);border-left:3px solid rgba(200,69,42,0.4);border-radius:6px;padding:32px 40px 30px 34px;margin:0;position:relative;backdrop-filter:blur(2px);}.n-anchor-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,rgba(200,69,42,0.4),rgba(200,69,42,0.1),transparent);border-radius:6px 6px 0 0;}.n-anchor-label{font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.55);text-transform:uppercase;display:block;margin-bottom:16px;}.n-anchor-text{font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(20,15,10,0.78);letter-spacing:0.15px;font-weight:400;display:block;}.n-anchor-text em{font-style:italic;color:rgba(20,15,10,0.92);}.n-anchor-ornament{display:none;}`;
  document.head.appendChild(s);
})();

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
  <div class="n-section-header"><span class="n-section-num">08</span><span class="n-section-title">Uterotonic Agents</span><span class="n-section-tag">know the ladder</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
    <div class="n-compare-head">Drug</div><div class="n-compare-head">Route / Dose</div><div class="n-compare-head">Mechanism</div><div class="n-compare-head">Key Contraindication</div>
    <div class="n-compare-row-label">Oxytocin</div><div class="n-compare-cell">IV infusion 40 units/500mL (never bolus)</div><div class="n-compare-cell">Oxytocin receptor → myometrial contraction</div><div class="n-compare-cell">Rapid IV bolus → vasodilation → cardiovascular collapse</div>
    <div class="n-compare-row-label">Ergometrine</div><div class="n-compare-cell">0.5 mg IM or slow IV</div><div class="n-compare-cell">α-adrenergic + serotonin → sustained contraction</div><div class="n-compare-cell">Hypertension, pre-eclampsia, cardiac disease</div>
    <div class="n-compare-row-label">Carboprost</div><div class="n-compare-cell">250 mcg IM, repeat every 15 min (max 8 doses)</div><div class="n-compare-cell">PGF2α analogue → powerful uterine contraction</div><div class="n-compare-cell">Asthma (causes bronchospasm)</div>
    <div class="n-compare-row-label">Misoprostol</div><div class="n-compare-cell">800 mcg PR or sublingual</div><div class="n-compare-cell">PGE1 analogue → uterotonic</div><div class="n-compare-cell">None absolute — useful when others contraindicated</div>
    <div class="n-compare-row-label">TXA</div><div class="n-compare-cell">1g IV over 10 min (repeat at 30 min if bleeding)</div><div class="n-compare-cell">Antifibrinolytic — inhibits plasminogen activation</div><div class="n-compare-cell">Must give within 3 hours — no benefit after</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">09</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>TXA within 3 hours.</strong> The WOMAN trial (20,000 women) showed TXA reduces PPH death by 31% when given within 3 hours of birth. After 3 hours: no benefit. Give it early.<span class="n-pearl-exam">Exam loves this: time-sensitive drug most candidates forget.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Balloon tamponade before surgery.</strong> The Bakri balloon is the bridge between uterotonics and laparotomy. If it controls the bleeding, you've avoided a B-Lynch.<span class="n-pearl-exam">Exam loves this: candidates jump straight to B-Lynch or hysterectomy.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Fibrinogen is the first factor to fall.</strong> Fibrinogen &lt;2 g/L predicts severe PPH with high sensitivity. Order it early. Treat with cryoprecipitate — FFP alone is insufficient.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Placenta accreta = do not pull.</strong> Any placenta that won't deliver with gentle traction at LSCS → call senior, prepare for hysterectomy. The attempt to deliver it manually is the catastrophe.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Ergometrine is contraindicated in hypertension — carboprost in asthma.</strong> In a woman with pre-eclampsia who is still bleeding after oxytocin, the next step is carboprost (if no asthma) or misoprostol — not ergometrine. Getting this wrong in an exam or in real life is consequential.<span class="n-pearl-exam">Contraindication question — always comes up.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Massive transfusion protocol: give blood products in a 1:1:1 ratio.</strong> Red cells : FFP : platelets in equal parts to replace whole blood. Target fibrinogen &gt;2 g/L — use cryoprecipitate specifically for this, not FFP alone. Avoid crystalloid dilution of clotting factors.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">10</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
</div><div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">The uterus is either <em>soft</em> or it isn't —<br>everything else follows from that one finding.</div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Pre-eclampsia — from placenta to end-organ</span>
      <span class="n-viz-sub">All roads lead back to abnormal placentation</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TRIGGER</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Abnormal</tspan><tspan x="72" dy="16">Placentation</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Shallow trophoblast invasion</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Spiral arteries not remodelled</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Happens at 8–18 wks</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MECHANISM</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Placental</tspan><tspan x="227" dy="16">Ischaemia</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Releases sFlt-1 · sEng</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Anti-angiogenic factors</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Systemic endothelial damage</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a2a5a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">BP SIGN</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">≥140/90</tspan><tspan x="382" dy="16">after 20wks</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">+ proteinuria or</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">end-organ dysfunction</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Symptom, not the cause</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SEVERE</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">HELLP /</tspan><tspan x="537" dy="16">Eclampsia</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Haemolysis · ↑LFTs</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Low platelets · seizures</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Deliver if ≥34 wks</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TREATMENT</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">Deliver</tspan><tspan x="690" dy="16">the Placenta</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Only cure</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">MgSO₄ if seizure risk</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Labetalol/nifedipine BP</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Antihypertensive Choice</span><span class="n-section-tag">not interchangeable</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
    <div class="n-compare-head">Drug</div><div class="n-compare-head">Route</div><div class="n-compare-head">Use when</div><div class="n-compare-head">Avoid if</div>
    <div class="n-compare-row-label">Labetalol</div><div class="n-compare-cell">Oral or IV infusion</div><div class="n-compare-cell">First-line severe PET; IV for urgent control</div><div class="n-compare-cell">Asthma, bradycardia, heart block</div>
    <div class="n-compare-row-label">Nifedipine</div><div class="n-compare-cell">Oral (modified release)</div><div class="n-compare-cell">Alternative first-line; good oral option</div><div class="n-compare-cell">Do not combine with MgSO₄ (enhanced hypotension risk)</div>
    <div class="n-compare-row-label">Hydralazine</div><div class="n-compare-cell">IV bolus or infusion</div><div class="n-compare-cell">Severe acute PET if labetalol/nifedipine fail</div><div class="n-compare-cell">Reflex tachycardia — use with care</div>
    <div class="n-compare-row-label">Methyldopa</div><div class="n-compare-cell">Oral</div><div class="n-compare-cell">Chronic / mild BP in pregnancy; not for acute control</div><div class="n-compare-cell">Depression; not for acute severe PET</div>
    <div class="n-compare-row-label">ACE inhibitors</div><div class="n-compare-cell">—</div><div class="n-compare-cell">Not in pregnancy</div><div class="n-compare-cell"><strong>Absolutely contraindicated</strong> — fetal renal agenesis, oligohydramnios, IUFD</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>MgSO₄ for seizure prevention, not control of BP.</strong> It does not lower blood pressure. It prevents eclampsia. The antihypertensive is separate.<span class="n-pearl-exam">Exam loves this: candidates confuse the roles.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Delivery cures preeclampsia — the placenta is the source.</strong> After delivery, most features resolve within 48–72 hours, though BP may worsen in the first 24 hours postpartum.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Aspirin 75–150 mg from 12 weeks</strong> reduces preeclampsia risk by 10–20% in high-risk women (prior PET, CKD, antiphospholipid syndrome, diabetes, multiple pregnancy, BMI &gt;35).</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>HELLP triad: Haemolysis, Elevated Liver enzymes, Low Platelets.</strong> Platelets fall first — check FBC if any suspicion. Can occur postpartum.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Postpartum BP can spike on days 3–5.</strong> Preeclampsia doesn't end at delivery — BP often worsens in the first 24 hours postpartum and can cause eclampsia up to 6 weeks post-delivery. Women need at least 72 hours of observation and ongoing antihypertensives after discharge.<span class="n-pearl-exam">This is the most missed timing question.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Fluid restriction: 80 mL/hr total (all sources).</strong> Preeclamptic women are at high risk of pulmonary oedema — their capillaries are leaky due to endothelial dysfunction. Aggressive IV fluids kill them. Restrict total fluid input to 80 mL/hr (including drug infusions) and watch urine output closely. Target UO &gt;25 mL/hr.<span class="n-pearl-exam">Fluid management question — candidates over-fluid and cause pulmonary oedema.</span></div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
</div><div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">The BP is the <em>symptom.</em><br>The placenta is the <em>disease.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Ectopic pregnancy — site, risk, and action</span>
      <span class="n-viz-sub">95% tubal — but any positive test + pain = ectopic until proven otherwise</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MOST COMMON</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Ampullary</tspan><tspan x="72" dy="16">Tube (70%)</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Fertilised egg stuck</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">in widest tube segment</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Pain before rupture</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">HIGH RISK</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Isthmic</tspan><tspan x="227" dy="16">Tube (12%)</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Narrow lumen</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Ruptures earlier</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Sudden catastrophic bleed</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a2a4a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">RARE / DANGEROUS</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">Cornual /</tspan><tspan x="382" dy="16">Interstitial</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Surrounded by myometrium</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Ruptures late — massive bleed</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Often missed on USS</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MANAGEMENT</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">By Stability</tspan><tspan x="537" dy="16">+ βhCG</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Unstable → theatre</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Stable: MTX or wait</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Serial βhCG until zero</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">EMERGENCY</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">Ruptured</tspan><tspan x="690" dy="16">Ectopic</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Haemoperitoneum</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Collapse + shoulder tip</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Immediate laparotomy</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Expectant vs Medical vs Surgical</span><span class="n-section-tag">decision logic</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
    <div class="n-compare-head">Feature</div><div class="n-compare-head">Expectant</div><div class="n-compare-head">Methotrexate (MTX)</div><div class="n-compare-head">Surgery</div>
    <div class="n-compare-row-label">β-hCG</div><div class="n-compare-cell">&lt;1000 IU/L and falling</div><div class="n-compare-cell">&lt;5000 IU/L</div><div class="n-compare-cell">Any — or &gt;5000</div>
    <div class="n-compare-row-label">Mass size</div><div class="n-compare-cell">Small (&lt;2 cm)</div><div class="n-compare-cell">&lt;3.5 cm</div><div class="n-compare-cell">Any (must if &gt;3.5 cm)</div>
    <div class="n-compare-row-label">Fetal heartbeat</div><div class="n-compare-cell">None</div><div class="n-compare-cell">None — absolute contraindication to MTX if present</div><div class="n-compare-cell">Present or absent</div>
    <div class="n-compare-row-label">Haemodynamics</div><div class="n-compare-cell">Stable, no pain</div><div class="n-compare-cell">Stable</div><div class="n-compare-cell">Unstable → emergency laparotomy</div>
    <div class="n-compare-row-label">MTX contraindications</div><div class="n-compare-cell">—</div><div class="n-compare-cell">Renal/hepatic/haem impairment, immunodeficiency, breastfeeding, intrauterine pregnancy</div><div class="n-compare-cell">—</div>
    <div class="n-compare-row-label">Follow-up</div><div class="n-compare-cell">hCG twice weekly until &lt;20</div><div class="n-compare-cell">hCG day 4 + day 7; if &lt;15% drop by day 7 → repeat dose or surgery</div><div class="n-compare-cell">hCG post-op (salpingotomy: persistent trophoblast risk)</div>
  </div>
  <div class="n-body-text"><strong>The discriminatory zone:</strong> At β-hCG &gt;1500–2000 IU/L, a normal intrauterine pregnancy should be visible on transvaginal USS. If β-hCG is above this threshold and no IUP is seen → presume ectopic until proven otherwise. This is the principle that drives management when USS is equivocal.</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Heterotopic pregnancy:</strong> simultaneous intrauterine and ectopic. Rare spontaneously (1:30,000) but 1:100 with IVF. Finding an IUP on USS does not exclude co-existing ectopic in IVF patients.<span class="n-pearl-exam">Exam loves this: rare but guaranteed to appear.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>After salpingectomy for ectopic, future IVF outcomes are not significantly worse</strong> if the other tube is normal. Salpingotomy risks persistent trophoblast — monitor hCG after.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Give anti-D to all Rh-negative women</strong> with ectopic pregnancy, regardless of management method. Sensitisation risk is real.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Fetal heartbeat on USS is an absolute contraindication to methotrexate.</strong> MTX will not reliably kill a cardiac-activity-positive trophoblast at standard doses. Surgery is required. Students often miss this and select MTX for any unruptured ectopic regardless of cardiac activity.<span class="n-pearl-exam">The contraindication question — comes up in almost every ectopic question set.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>The discriminatory zone is ~1500–2000 IU/L.</strong> Above this, transvaginal USS should show an IUP if it exists. An empty uterus above the discriminatory zone = ectopic until proven otherwise. Don't wait for the hCG to go higher before acting — scan and decide.<span class="n-pearl-exam">Frequently tested as a threshold question.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Salpingotomy carries a risk of persistent trophoblast (5–10%).</strong> The tube is opened and the ectopic removed, but trophoblastic tissue can remain implanted. Always monitor hCG after salpingotomy until it reaches zero. If it plateaus or rises, give MTX or re-operate. Salpingectomy avoids this risk.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
</div><div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Positive test + pain + empty uterus —<br>it's <em>ectopic</em> until you prove otherwise.</div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Placenta praevia — grade and consequence</span>
      <span class="n-viz-sub">Location relative to the os determines everything</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">GRADE I</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Low-lying</tspan><tspan x="72" dy="16">Placenta</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Edge within 2 cm of os</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Does not reach os</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">May deliver vaginally</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">GRADE II</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Marginal</tspan><tspan x="227" dy="16">Praevia</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Reaches but does</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">not cover the os</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Borderline — reassess</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a2a5a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">GRADE III</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">Partial</tspan><tspan x="382" dy="16">Praevia</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Partially covers</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">internal os</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">LSCS required</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">GRADE IV</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">Complete</tspan><tspan x="537" dy="16">Praevia</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Entirely covers os</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Painless APH</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Elective LSCS 37–38wk</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DANGER</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">Accreta</tspan><tspan x="690" dy="16">Spectrum</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Abnormal invasion</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Morbidly adherent</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Hysterectomy risk</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Minor vs Major Praevia</span><span class="n-section-tag">the distinction that changes management</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr;">
    <div class="n-compare-head">Feature</div><div class="n-compare-head">Minor Praevia</div><div class="n-compare-head">Major Praevia</div>
    <div class="n-compare-row-label">Definition</div><div class="n-compare-cell">Low-lying — edge within 2 cm of os but not covering it</div><div class="n-compare-cell">Placenta partially or completely covers the internal os</div>
    <div class="n-compare-row-label">Delivery</div><div class="n-compare-cell">Vaginal delivery possible if edge &gt;2 cm from os at term</div><div class="n-compare-cell">LSCS mandatory — planned at 36–37 weeks</div>
    <div class="n-compare-row-label">Migration</div><div class="n-compare-cell">Often resolves — rescan at 32 and 36 weeks</div><div class="n-compare-cell">Major praevia at 20 weeks: ~10% persist to term</div>
    <div class="n-compare-row-label">VE</div><div class="n-compare-cell">Safe in theatre if labour commences</div><div class="n-compare-cell"><strong>Never perform VE</strong> — catastrophic haemorrhage risk</div>
    <div class="n-compare-row-label">Vasa praevia</div><div class="n-compare-cell">Fetal vessels over os — rupture = fetal exsanguination</div><div class="n-compare-cell">Painless dark blood + fetal bradycardia = emergency LSCS</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>The warning bleed.</strong> The first haemorrhage in praevia is usually moderate and self-limiting. It is a warning — do not be falsely reassured. The next bleed can be catastrophic.<span class="n-pearl-exam">Exam loves this: candidates say 'she's stable now' and wait.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Vasa praevia</strong> is different: fetal vessels overlie the os without placental coverage. When membranes rupture, fetal exsanguination can occur within minutes. Sinusoidal CTG + bleeding = fetal emergency.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>1 previous LSCS + anterior low-lying placenta</strong> = accreta must be excluded. Colour Doppler + MRI if USS equivocal. This combination can occur in 15–25% of cases.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Vasa praevia: fetal blood, not maternal.</strong> Painless dark red bleeding + sudden fetal bradycardia = vasa praevia until proven otherwise. Fetal blood is dark (deoxygenated after fetal death begins). Emergency LSCS immediately — fetal blood volume at term is only ~300 mL, exsanguination is rapid.<span class="n-pearl-exam">The dark blood + bradycardia pattern — a classic exam vignette.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Accreta spectrum: accreta → increta → percreta.</strong> Superficial invasion, into myometrium, through serosa. 3 previous LSCS + anterior praevia = &gt;50% risk of accreta. Never attempt manual removal — leave placenta in situ and perform en-bloc hysterectomy. Pre-plan with interventional radiology.<span class="n-pearl-exam">Accreta nomenclature and risk factors appear together.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Painless, bright red PV bleeding after 20 weeks = praevia until proven otherwise.</strong> Painless because lower segment distension separates placenta without contractions. Abruption has pain and a hard uterus. Vasa praevia has dark blood and immediate fetal distress. These three clinical patterns must be distinguished before any VE.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
</div><div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text"><em>Painless. Bright red. Third trimester.</em><br>Scan before you touch.</div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">GDM — from insulin resistance to fetal consequence</span>
      <span class="n-viz-sub">Pedersen hypothesis: maternal glucose crosses the placenta freely</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MECHANISM</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">HPL Blocks</tspan><tspan x="72" dy="16">Insulin</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Placental hormones</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">antagonise insulin</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Peaks at 26–28 wks</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a4a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DIAGNOSIS</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">OGTT</tspan><tspan x="227" dy="16">75g Glucose</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Fasting ≥5.6 mmol/L</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">2hr ≥7.8 mmol/L</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Offered at 24–28 wks</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a2a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">FETAL EFFECT</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">Macrosomia</tspan><tspan x="382" dy="16">>4.5 kg</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Fetal hyperinsulinaemia</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Excess fat deposition</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Shoulder dystocia risk</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MANAGEMENT</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">Diet → Metf</tspan><tspan x="537" dy="16">→ Insulin</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Target fasting <5.3</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">1hr post-meal <7.8</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Deliver by 40+6</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">NEONATAL</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">Hypo-</tspan><tspan x="690" dy="16">glycaemia</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Baby loses placental</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">glucose abruptly</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Feed within 30 min</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">GDM vs Pre-existing Diabetes</span><span class="n-section-tag">different risk, different management</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr;">
    <div class="n-compare-head">Feature</div><div class="n-compare-head">GDM</div><div class="n-compare-head">Pre-existing T1/T2 DM</div>
    <div class="n-compare-row-label">Definition</div><div class="n-compare-cell">Glucose intolerance first detected in pregnancy</div><div class="n-compare-cell">DM diagnosed before conception</div>
    <div class="n-compare-row-label">Screening</div><div class="n-compare-cell">OGTT at 24–28 weeks (earlier if risk factors)</div><div class="n-compare-cell">Pre-conception counselling + tight control from start</div>
    <div class="n-compare-row-label">Folic acid dose</div><div class="n-compare-cell">400 mcg (standard)</div><div class="n-compare-cell"><strong>5 mg</strong> — higher dose pre-conception and first trimester</div>
    <div class="n-compare-row-label">Targets (fasting/1hr)</div><div class="n-compare-cell">Fasting &lt;5.3 / 1hr post-meal &lt;7.8 mmol/L</div><div class="n-compare-cell">Fasting &lt;5.3 / 1hr &lt;7.8 mmol/L — same targets</div>
    <div class="n-compare-row-label">Delivery timing</div><div class="n-compare-cell">Diet-controlled: 40+6. Insulin/metformin: 38–39 weeks</div><div class="n-compare-cell">T1: 37–38 weeks. T2: 38–39 weeks</div>
    <div class="n-compare-row-label">Postpartum</div><div class="n-compare-cell">Stop insulin immediately after delivery. OGTT at 6–13 weeks to exclude T2DM</div><div class="n-compare-cell">Return to pre-pregnancy regimen</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">7</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Glucose targets in pregnancy are tighter than outside pregnancy.</strong> Fasting ≤5.3, 1h post-meal ≤7.8, 2h post-meal ≤6.4 — because even modest hyperglycaemia drives fetal hyperinsulinaemia.<span class="n-pearl-exam">Exam loves this: candidates use non-pregnant thresholds.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Macrosomia is not just a big baby.</strong> The shoulder and trunk grow disproportionately (asymmetric growth from hyperinsulinaemia). This is why shoulder dystocia is the obstetric risk — not just size alone.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>GDM is a metabolic stress test.</strong> A woman who develops GDM has revealed β-cell insufficiency under physiological stress. She carries that susceptibility for life.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Macrosomia causes shoulder dystocia — not just a "big baby".</strong> Fetal fat deposition is disproportionately around the shoulders and trunk in GDM — not the head. This explains why macrosomic babies in GDM have proportionally larger shoulder-to-head ratios. Estimated fetal weight alone is a poor predictor of shoulder dystocia — the abdominal circumference:head circumference ratio is more informative.<span class="n-pearl-exam">The mechanism question: why does GDM macrosomia cause dystocia?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>GDM is a metabolic stress test — 50% develop T2DM within 5–10 years.</strong> GDM reveals underlying insulin resistance that was subclinical. The pregnancy is the stressor. After delivery, perform OGTT at 6–13 weeks, and annual fasting glucose or HbA1c thereafter. Lifestyle intervention reduces progression to T2DM by ~50%. This is a lifelong conversation, not a temporary condition.<span class="n-pearl-exam">The "what happens after pregnancy" question — not reassurance, surveillance.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>OGTT diagnostic thresholds in pregnancy (NICE): fasting ≥5.6 mmol/L or 2-hour ≥7.8 mmol/L.</strong> These are lower than non-pregnancy OGTT thresholds — because tighter control is needed to prevent fetal complications. Don't apply non-pregnancy thresholds to a pregnant woman. Also: HbA1c is unreliable in pregnancy due to altered red cell turnover — do not use for GDM diagnosis.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">8</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
</div><div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">You are not managing a glucose number.<br>You are managing a fetus that eats <em>everything its mother eats.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Shoulder dystocia — HELPERR in order</span>
      <span class="n-viz-sub">The head is out. You have minutes. Do not pull.</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">H</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Call for</tspan><tspan x="72" dy="16">Help</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Senior midwife</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Obs · Paeds · Anaes</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Don't delay anything</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a2a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">E + L</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Episiotomy</tspan><tspan x="227" dy="16">+ Legs</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">McRoberts: legs back</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Hyper-flex on abdomen</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">50% resolve with this</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a2a4a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">P</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">Suprapubic</tspan><tspan x="382" dy="16">Pressure</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Downward + lateral</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Dislodge ant shoulder</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">NOT fundal pressure</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">E + R</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">Enter +</tspan><tspan x="537" dy="16">Rotate</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Rubin II · Woods screw</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Reverse Woods (Barnum)</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Internal manoeuvres</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">R</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">Remove</tspan><tspan x="690" dy="16">Post Arm</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Sweep arm across</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">chest to deliver</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Last: Zavanelli / CS</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">HELPERR Drill — Each Step</span><span class="n-section-tag">order matters in the room</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr;">
    <div class="n-compare-head">Step</div><div class="n-compare-head">Action</div><div class="n-compare-head">Why / mechanism</div>
    <div class="n-compare-row-label">H — Call for Help</div><div class="n-compare-cell">Activate emergency response immediately</div><div class="n-compare-cell">Senior obstetrician, anaesthetist, neonatologist, extra midwives needed within minutes</div>
    <div class="n-compare-row-label">E — Evaluate for Epis</div><div class="n-compare-cell">Consider episiotomy</div><div class="n-compare-cell">Doesn't release bony impaction but creates space for manoeuvres</div>
    <div class="n-compare-row-label">L — Legs (McRoberts)</div><div class="n-compare-cell">Hyperflexion of maternal thighs onto abdomen</div><div class="n-compare-cell">Flattens lumbar lordosis → rotates pubic symphysis superiorly → increases relative AP diameter of pelvis → releases anterior shoulder in ~40% alone</div>
    <div class="n-compare-row-label">P — Suprapubic Pressure</div><div class="n-compare-cell">Downward and lateral pressure on anterior shoulder</div><div class="n-compare-cell">Dislodges anterior shoulder from behind pubic symphysis. McRoberts + SPP resolves ~90% of cases.</div>
    <div class="n-compare-row-label">E — Enter (Rubin/Woods)</div><div class="n-compare-cell">Internal rotation manoeuvres</div><div class="n-compare-cell">Rubin II: pressure on posterior aspect of anterior shoulder. Woods screw: pressure on anterior of posterior shoulder. Rotate fetus like unscrewing a bottle.</div>
    <div class="n-compare-row-label">R — Remove posterior arm</div><div class="n-compare-cell">Deliver posterior arm first</div><div class="n-compare-cell">Reduces shoulder-to-shoulder diameter — most reliable internal manoeuvre</div>
    <div class="n-compare-row-label">R — Roll (Gaskin)</div><div class="n-compare-cell">All-fours position</div><div class="n-compare-cell">Changes pelvic dimensions; gravity assists posterior shoulder delivery</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">5</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>50% of shoulder dystocia occurs with no antenatal risk factors.</strong> It cannot be reliably predicted. All delivery room staff must be trained, every delivery.<span class="n-pearl-exam">Exam loves this: candidates list risk factors as if they predict it.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>McRoberts' + suprapubic pressure resolves ~90% of cases.</strong> Internal manoeuvres are rarely needed if the first two steps are applied correctly and simultaneously.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Posterior arm delivery</strong> is highly effective and underused. Reaching for the posterior arm and sweeping it across the chest delivers the shoulder and significantly reduces the AP diameter.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Never apply fundal pressure during shoulder dystocia.</strong> Fundal pressure drives the anterior shoulder further into the pubic symphysis — it worsens the impaction. The only pressure that helps is suprapubic pressure (downward onto the anterior shoulder). Midwives and students instinctively push the fundus — this is the most dangerous error in the room.<span class="n-pearl-exam">The contraindicated action question — always comes up.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>50% of shoulder dystocia occurs with no antenatal risk factors.</strong> Risk factors (GDM, macrosomia, previous dystocia, BMI &gt;35) are present in many patients who don't have dystocia — and absent in half who do. Do not falsely reassure patients or abandon HELPERR skills because a patient appears "low risk."<span class="n-pearl-exam">The "but she had no risk factors" question — HELPERR must be known regardless.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Brachial plexus injury (Erb's palsy) is the most common complication of shoulder dystocia.</strong> C5–C6 roots damaged by lateral traction — arm held internally rotated with extended elbow ("waiter's tip"). Most resolve within 6–12 months. Document traction applied (direction and force) meticulously. Do not apply lateral traction to the fetal head — always axial, in line with the spine.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">6</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
</div><div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">McRoberts. Suprapubic pressure.<br><em>Help. Immediately.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Early pregnancy loss — types and management pathways</span>
      <span class="n-viz-sub">Classification drives management — always scan first</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">THREATENED</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Bleeding +</tspan><tspan x="72" dy="16">Closed Os</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Viable fetus on USS</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Outcome uncertain</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Rest · repeat scan</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a4a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">INEVITABLE</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Bleeding +</tspan><tspan x="227" dy="16">Open Os</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Products at os</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Passing imminently</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Expect or expedite</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a2a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">INCOMPLETE</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">Partial</tspan><tspan x="382" dy="16">Expulsion</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Tissue retained</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Os open or closed</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Medical or surgical</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MISSED</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">Silent /</tspan><tspan x="537" dy="16">Anembryonic</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">No cardiac activity</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Empty sac (blighted ovum)</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Expectant/medical/ERPC</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SEPTIC</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">Infected</tspan><tspan x="690" dy="16">Retained POC</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Fever · offensive PV</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Uterine tenderness</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">IV abx + urgent ERPC</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Classification of Miscarriage</span><span class="n-section-tag">get the type right</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
    <div class="n-compare-head">Type</div><div class="n-compare-head">USS findings</div><div class="n-compare-head">Os</div><div class="n-compare-head">Management</div>
    <div class="n-compare-row-label">Threatened</div><div class="n-compare-cell">Viable IUP — heartbeat present</div><div class="n-compare-cell">Closed</div><div class="n-compare-cell">Reassure, rescan in 1–2 weeks; 50% go on to miscarry</div>
    <div class="n-compare-row-label">Inevitable</div><div class="n-compare-cell">Viable or non-viable; POC in uterus</div><div class="n-compare-cell">Open</div><div class="n-compare-cell">Expectant, medical, or surgical depending on clinical state</div>
    <div class="n-compare-row-label">Incomplete</div><div class="n-compare-cell">Retained POC in uterus; partial expulsion</div><div class="n-compare-cell">Open</div><div class="n-compare-cell">Expectant, misoprostol, or ERPC</div>
    <div class="n-compare-row-label">Complete</div><div class="n-compare-cell">Empty uterus; no POC</div><div class="n-compare-cell">Closed</div><div class="n-compare-cell">No intervention — confirm with falling hCG</div>
    <div class="n-compare-row-label">Missed</div><div class="n-compare-cell">Non-viable IUP — fetal pole, no heartbeat; or empty sac (&gt;25mm mean sac diameter)</div><div class="n-compare-cell">Closed</div><div class="n-compare-cell">Expectant, medical (misoprostol), or surgical (ERPC)</div>
    <div class="n-compare-row-label">Septic</div><div class="n-compare-cell">Variable — signs of infection</div><div class="n-compare-cell">Open or closed</div><div class="n-compare-cell"><strong>IV antibiotics first</strong>, then evacuation — do not delay</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">6</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>80% of miscarriages are caused by chromosomal abnormality</strong> — most commonly trisomy. Reassure patients that this is not caused by activity, stress, or diet.<span class="n-pearl-exam">Exam loves this: candidates confuse with preventable causes.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Antiphospholipid syndrome</strong> is the most important treatable cause of recurrent miscarriage. Screen with lupus anticoagulant and anticardiolipin antibodies on two occasions 12 weeks apart.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>IUCD insertion at ERPC</strong> is an option for appropriate patients and reduces the risk of intrauterine adhesions (Asherman's syndrome) postoperatively.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Recurrent miscarriage: investigate after 3 losses (or 2 if &gt;35 years).</strong> Causes: antiphospholipid syndrome (most treatable — aspirin + LMWH), chromosomal (parental karyotype), uterine anomaly (USS or hysteroscopy), thrombophilia. 50% remain unexplained even after full workup. APS testing: anticardiolipin antibody, lupus anticoagulant, β2-glycoprotein I — on two occasions 12 weeks apart.<span class="n-pearl-exam">The recurrent miscarriage workup question — always APS first.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Molar pregnancy must be excluded in every miscarriage.</strong> Complete mole: 46XX (all paternal), no fetal tissue, very high hCG, snowstorm appearance. Partial mole: 69XXX or 69XXY (triploid), some fetal tissue, moderately elevated hCG. Both require registration and hCG surveillance for gestational trophoblastic disease. Missing it means missing a treatable cancer.<span class="n-pearl-exam">The hCG and USS pattern question — complete vs partial mole.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Anti-D in miscarriage: give to all Rh-negative women with surgical management or heavy bleeding after 12 weeks.</strong> Before 12 weeks with complete or threatened miscarriage: not routinely given unless sensitising event (surgical evacuation). The threshold matters for the exam — and it's changed in recent NICE guidance: anti-D not required before 12 weeks for threatened miscarriage.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">7</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
</div><div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Most early losses are chromosomal.<br>That's not her fault — <em>and she needs to hear that.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.cordprolapse=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Obstetrics · Emergency</div>
  <div class="n-hero-title">Cord<br><em>Prolapse</em></div>
  <div class="n-hero-sub">ICD O69.0 &nbsp;·&nbsp; The cord is out. The clock has started.</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Umbilical cord descends below the presenting part after membrane rupture. Every contraction compresses the cord → fetal hypoxia → acidosis → death without immediate action.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Malpresentation (breech, transverse lie), preterm, polyhydramnios, ARM with high presenting part, multiparity, cord presentation. <strong>Incidence: 1 in 500 deliveries.</strong></div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Perinatal mortality without immediate intervention is very high. <strong>Intact cord + immediate action = good outcomes.</strong> Every minute of cord compression matters. Speed is the only variable you control.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Immediate Response — Five Steps in Parallel</span><span class="n-section-tag">fingers in, part up, don't let go</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Cord prolapse — every action in parallel</span><span class="n-viz-sub">Fingers in. Part up. Don't let go. Call theatre.</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">RECOGNISE</text>
      <text x="72" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Cord felt or seen</text>
      <text x="72" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">After ROM — FHR drops</text>
      <text x="72" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">with contractions</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Feel on VE — act now</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">IMMEDIATELY</text>
      <text x="227" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Fingers in, part up</text>
      <text x="227" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Elevate presenting part</text>
      <text x="227" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Relieve compression</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Do not remove hand</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a2a4a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">POSITION</text>
      <text x="382" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">All-fours or Trendelenburg</text>
      <text x="382" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Gravity works for you</text>
      <text x="382" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Left lateral if alone</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Reduces cord pressure</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">CALL</text>
      <text x="537" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Crash call now</text>
      <text x="537" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Senior obs · anaes</text>
      <text x="537" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Neonatal team</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Category 1 CS target</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DELIVER</text>
      <text x="690" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">CS within 30 min</text>
      <text x="690" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Bladder fill if delay</text>
      <text x="690" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Tocolysis if needed</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Good outcomes if fast</text>
    </svg>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Cord felt on VE or visible at vulva after membrane rupture → <em>cord prolapse</em> → call emergency team + manual elevation immediately. Do not step back from the patient.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Do not handle the cord</div><div class="n-distractor-text"><strong>Do not pull on the cord, manipulate it, or allow it to dry out.</strong> Handling causes vasospasm. If the cord is outside the vagina, cover with a warm moist pad. Do not clamp, cut, or attempt to reposition it back inside the vagina.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Cord Presentation vs Cord Prolapse</span><span class="n-section-tag">prevent the preventable</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Cord Presentation</div>
      <div class="n-compare-row"><span class="n-compare-label">Definition</span><span>Cord lies below the presenting part — <strong>membranes still intact</strong></span></div>
      <div class="n-compare-row"><span class="n-compare-label">Diagnosis</span><span>USS or felt on VE through intact membranes</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Risk</span><span>Will become prolapse if membranes rupture — spontaneously or by ARM</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Action</span><span><strong>Plan CS before labour. Never permit ARM.</strong> Admit and monitor closely if not immediate CS</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head" style="color:#c8452a">Cord Prolapse</div>
      <div class="n-compare-row"><span class="n-compare-label">Definition</span><span>Cord descends below presenting part — <strong>membranes ruptured</strong></span></div>
      <div class="n-compare-row"><span class="n-compare-label">Diagnosis</span><span>Cord felt on VE, visible at vulva, or sudden fetal bradycardia after ROM</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Risk</span><span>Fetal hypoxia with every contraction — immediate threat to life</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Action</span><span><strong>Fingers in, part up, crash call, Category 1 CS.</strong> No delay</span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Risk Factors</span><span class="n-section-tag">prevent iatrogenic prolapse</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Iatrogenic — ARM</div><div class="n-diag-content"><strong>ARM with unengaged or high presenting part is the most common iatrogenic cause.</strong> Always confirm engagement (station ≥0, head well applied to cervix) before performing ARM. If presenting part is high or mobile — do not perform ARM without senior review.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Malpresentation</div><div class="n-diag-content">Footling breech, transverse or oblique lie, unstable lie — the presenting part does not fill the lower segment, leaving space for the cord to prolapse beside or below it.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Prematurity / Polyhydramnios</div><div class="n-diag-content">Preterm presenting part is small and ill-fitting. Polyhydramnios → gush of fluid at ROM displaces cord. Both increase risk significantly.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Multiparity</div><div class="n-diag-content">Lax uterus + well-established lower segment + rapid labour — presenting part may not be engaged even in cephalic presentation.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">In-Hospital vs Community Prolapse</span><span class="n-section-tag">community = transfer while holding</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">In hospital</div><div class="n-diag-content">Crash call → manual elevation maintained → knee-chest or Trendelenburg → bladder filling if delay anticipated → Category 1 CS. Tocolysis (terbutaline 0.25mg SC) if time needed. Aim delivery within 30 minutes of diagnosis.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Community / homebirth</div><div class="n-diag-content"><strong>999 immediately. Manual elevation maintained throughout transfer.</strong> Knee-chest position in ambulance. Midwife maintains digital elevation of presenting part until theatre — this can be 20–40 minutes. Do not release pressure. Hospital informed en route — theatre prepared before arrival.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Bladder filling</div><div class="n-diag-content">If CS is delayed: fill bladder with 500 mL saline via catheter — this mechanically lifts the presenting part and reduces cord compression. Drain immediately before uterine incision. Useful temporising measure when manual elevation alone is insufficient.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">When vaginal delivery is appropriate</div><div class="n-diag-content">If cervix is fully dilated, presenting part is at or below spines, and delivery is truly imminent — assisted vaginal delivery (ventouse or forceps) is appropriate. <strong>Senior obstetrician must be present.</strong> Cord prolapse + second stage fully dilated = deliver immediately vaginally, not by CS.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Do not remove fingers from the vagina until the baby is delivered.</strong> Even briefly releasing pressure causes immediate cord compression. The examiner's hand stays in until uterine incision.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Do not attempt to replace the cord inside the vagina.</strong> This is not a recognised manoeuvre — it causes vasospasm and worsens compression.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Document time of cord diagnosis precisely.</strong> Decision-to-delivery interval is audited in every cord prolapse case. Category 1 CS target: 30 minutes.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>ARM with high or unengaged presenting part = iatrogenic cord prolapse risk.</strong> Always confirm station before ARM. The most avoidable cause of cord prolapse is a poorly executed ARM.<span class="n-pearl-exam">Exam loves this: what are the risks of ARM?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Cord presentation = plan CS before labour.</strong> Never permit ARM or spontaneous rupture at home. Admit at 37–38 weeks for elective CS. Do not permit vaginal delivery attempt.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>A pulsating cord confirms fetal circulation but not fetal safety.</strong> Cord compression can become complete within seconds. Pulsation does not permit any delay in management.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Fully dilated + cord prolapse = deliver vaginally now.</strong> Do not transfer to theatre for CS if delivery is imminent. Assisted vaginal delivery is faster and appropriate at full dilation with presenting part at or below spines.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Bladder filling buys time when manual elevation is insufficient.</strong> 500 mL saline via catheter elevates the presenting part mechanically. Drain before uterine incision. A useful bridge during transfer or theatre preparation.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Footling breech + prolabour rupture of membranes = very high cord prolapse risk.</strong> The foot does not occlude the lower segment. Urgent assessment and usually Category 1 CS regardless of gestation.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">The CTG looks reassuring — cord prolapse can be managed conservatively.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>There is no conservative management of cord prolapse with a live fetus.</strong> A reassuring CTG buys minutes, not time for observation. Category 1 CS or immediate assisted delivery is the only appropriate response.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">The cord is pulsating — the baby is fine, no rush.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Pulsation confirms circulation exists now — not that it will in 30 seconds.</strong> Complete compression can occur with any contraction. Maintain elevation and proceed to delivery at full speed regardless of cord pulsation.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Footling breech + cord prolapse → CS is too risky at this gestation, try vaginal delivery.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Category 1 CS is the default for cord prolapse unless vaginal delivery is genuinely imminent.</strong> Footling breech does not lower the threshold — it raises it. The cord is compressed with every contraction and with the foot.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Fingers in. Presenting part up.<br><em>Don't let go until delivery.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Endometriosis — sites, symptoms, and staging</span>
      <span class="n-viz-sub">Oestrogen-dependent · chronic · average 7–8 year delay to diagnosis</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SUPERFICIAL</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Peritoneal</tspan><tspan x="72" dy="16">Deposits</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Powder burns · red lesions</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Bladder · bowel surface</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Dysmenorrhoea</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">OVARIAN</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Endo-</tspan><tspan x="227" dy="16">metrioma</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">'Chocolate cyst'</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Bilateral in 30%</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Reduces ovarian reserve</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#5a2a3a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DEEP</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">DIE —</tspan><tspan x="382" dy="16">USL / POD</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Uterosacral ligaments</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Pouch of Douglas</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Severe dyspareunia</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#3a2a5a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">EXTRA-PELVIC</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">Bowel /</tspan><tspan x="537" dy="16">Bladder</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Cyclical rectal bleed</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Haematuria in cycle</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Rare — but missed</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">STAGING</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">rASRM</tspan><tspan x="690" dy="16">I → IV</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">I=minimal · IV=severe</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Stage ≠ symptom severity</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Lap is gold standard</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Medical vs Surgical Management</span><span class="n-section-tag">not one size fits all</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr;">
    <div class="n-compare-head">Approach</div><div class="n-compare-head">Options</div><div class="n-compare-head">When to use</div>
    <div class="n-compare-row-label">Analgesia</div><div class="n-compare-cell">NSAIDs + paracetamol</div><div class="n-compare-cell">First step — always try before hormones</div>
    <div class="n-compare-row-label">Hormonal suppression</div><div class="n-compare-cell">COCP (continuous), POP, Mirena IUS, dienogest, medroxyprogesterone</div><div class="n-compare-cell">Suppress ovulation → reduce oestrogenic stimulation of deposits</div>
    <div class="n-compare-row-label">GnRH agonists</div><div class="n-compare-cell">Leuprorelin, goserelin — create pseudomenopause</div><div class="n-compare-cell">Severe/refractory disease; use with add-back HRT to prevent bone loss</div>
    <div class="n-compare-row-label">Laparoscopy</div><div class="n-compare-cell">Excision or ablation of deposits; drainage of endometrioma</div><div class="n-compare-cell">Failed medical treatment; infertility; diagnostic uncertainty</div>
    <div class="n-compare-row-label">Definitive surgery</div><div class="n-compare-cell">Hysterectomy ± BSO</div><div class="n-compare-cell">Completed family + severe refractory disease; not guaranteed cure — can recur on residual peritoneum</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">5</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Laparoscopy is the gold standard for diagnosis</strong> — but clinical diagnosis is sufficient to start treatment. NICE and ESHRE both support empirical treatment without histological confirmation.<span class="n-pearl-exam">Exam loves this: candidates refuse to treat without 'proof'.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>CA-125 is not a diagnostic test for endometriosis.</strong> It is elevated in endometriosis but also in ovarian cancer, fibroids, and PID. It has no role in diagnosis but may be used to monitor disease activity.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Endometriosis is oestrogen-dependent.</strong> It does not progress after menopause (without exogenous oestrogen). Progestins and GnRH agonists work by suppressing oestrogen.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Endometriosis is oestrogen-dependent — but it can recur after menopause on HRT.</strong> Deposits regress after menopause naturally. However, if the woman starts HRT, oestrogen reactivates residual disease. Use continuous combined HRT (not sequential) after bilateral oophorectomy for endometriosis, to minimise stimulation of any residual implants.<span class="n-pearl-exam">The HRT-after-BSO-for-endometriosis question.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Adenomyosis is endometriosis within the myometrium — same concept, different location.</strong> Endometrial glands and stroma within the uterine muscle wall. Presents with heavy, painful periods + uniformly enlarged ("globular") uterus. MRI is the best diagnostic test. Definitive treatment is hysterectomy — but Mirena IUS can manage symptoms in women who haven't completed their family.<span class="n-pearl-exam">Students confuse adenomyosis and endometriosis — different location, similar mechanism.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>ENZIAN and rASRM staging do not correlate well with symptom severity.</strong> A woman can have minimal visible disease at laparoscopy and be severely symptomatic — or extensive disease and minimal pain. This is because pain correlates with depth of invasion and nerve involvement, not disease extent. Laparoscopy is diagnostic — but stage doesn't predict who needs what treatment.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">8</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Seven years of pain before a diagnosis.<br>The first step is <em>taking the symptoms seriously.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">PCOS — Rotterdam criteria and long-term consequences</span>
      <span class="n-viz-sub">2 of 3 criteria · 5–10% of women · insulin resistance in 70%</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">CRITERION 1</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Oligo /</tspan><tspan x="72" dy="16">Anovulation</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Cycles >35 days</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">or <8/year</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Leading cause subfertility</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">CRITERION 2</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Hyper-</tspan><tspan x="227" dy="16">androgenism</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Clinical: acne · hirsutism</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Biochemical: ↑testosterone</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Exclude CAH · tumour</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a1a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">CRITERION 3</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">PCO</tspan><tspan x="382" dy="16">Morphology</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">≥20 follicles per ovary</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">or volume >10 mL</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">USS — not diagnostic alone</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">METABOLIC</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">Insulin</tspan><tspan x="537" dy="16">Resistance</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">70% regardless of BMI</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">↑T2DM · dyslipidaemia</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Screen with fasting gluc</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">LONG-TERM</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">Endometrial</tspan><tspan x="690" dy="16">Cancer Risk</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Unopposed oestrogen</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">from anovulation</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Provoke bleed if >3 mo</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">PCOS by Presenting Complaint</span><span class="n-section-tag">different problem, different treatment</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr;">
    <div class="n-compare-head">Complaint</div><div class="n-compare-head">First-line treatment</div><div class="n-compare-head">Key points</div>
    <div class="n-compare-row-label">Irregular cycles / anovulation</div><div class="n-compare-cell">Lifestyle (weight loss) → letrozole → clomifene → FSH injection → IVF</div><div class="n-compare-cell">Letrozole now preferred over clomifene (NICE 2023); lower multiple pregnancy risk</div>
    <div class="n-compare-row-label">Hirsutism / acne</div><div class="n-compare-cell">COCP (especially co-cyprindiol); topical for acne; spironolactone if severe</div><div class="n-compare-cell">Co-cyprindiol: anti-androgenic progestogen — do not use long term (VTE risk)</div>
    <div class="n-compare-row-label">Metabolic / insulin resistance</div><div class="n-compare-cell">Lifestyle + metformin</div><div class="n-compare-cell">Metformin improves insulin sensitivity and restores cycles in some; check glucose and lipids annually</div>
    <div class="n-compare-row-label">Endometrial protection</div><div class="n-compare-cell">Progestogen (oral or Mirena) to induce withdrawal bleeds</div><div class="n-compare-cell">Anovulation → unopposed oestrogen → endometrial hyperplasia → cancer. Induce bleed at least every 3–4 months</div>
    <div class="n-compare-row-label">Psychological</div><div class="n-compare-cell">Acknowledge — screen for depression and anxiety</div><div class="n-compare-cell">PCOS has significant psychological burden; body image, fertility anxiety, chronic condition management</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">6</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Letrozole has replaced clomifene as first-line for ovulation induction in PCOS.</strong> It achieves higher live birth rates and lower multiple pregnancy rates. NICE now recommends letrozole.<span class="n-pearl-exam">Exam loves this: candidates still say clomifene first.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Insulin resistance occurs in 70% of PCOS women regardless of BMI.</strong> Lean women with PCOS are not protected. Metabolic screening applies to all.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>PCOS does not resolve at menopause.</strong> The metabolic risks (diabetes, cardiovascular disease) persist. Long-term follow-up is needed throughout life.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Unopposed oestrogen in PCOS causes endometrial hyperplasia.</strong> Anovulation means no luteal phase, no progesterone, so oestrogen acts on the endometrium unopposed. Women with PCOS who are anovulatory need progestogen every 3–4 months at minimum (or continuous with Mirena) to prevent endometrial hyperplasia and cancer. This is one of the main long-term risks of PCOS — often missed.<span class="n-pearl-exam">The long-term complication question — not fertility, but endometrial protection.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Metformin improves insulin sensitivity AND can restore ovulation.</strong> In insulin-resistant PCOS, metformin reduces hyperinsulinaemia → reduces LH-driven androgen production → LH:FSH ratio normalises → ovulation can resume. It also reduces risk of OHSS if used alongside ovulation induction. Not first-line for ovulation alone, but useful as adjunct or in metabolic syndrome.<span class="n-pearl-exam">Mechanism question — why does metformin help in PCOS?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>PCOS does not resolve at menopause — but the androgen and metabolic risks persist.</strong> After menopause, the ovaries produce less oestrogen but still produce androgens. The metabolic syndrome, type 2 diabetes risk, and cardiovascular risk remain elevated lifelong. PCOS should be thought of as a lifelong metabolic condition, not just a reproductive one.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">8</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">PCOS is not just about the ovaries.<br>It's a <em>metabolic condition</em> that happens to affect reproduction.</div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.fibroids=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Benign</div>
  <div class="n-hero-title">Uterine<br><em>Fibroids</em></div>
  <div class="n-hero-sub">Leiomyomata &nbsp;·&nbsp; ICD D25 &nbsp;·&nbsp; Most common benign tumour in women — location matters more than size</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Benign smooth muscle tumours of the myometrium. Oestrogen-dependent — grow in reproductive years, regress after menopause. Most are asymptomatic.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">20–50% of women over 30. <strong>Three times more common and more symptomatic in Black women.</strong> Family history, nulliparity, obesity, early menarche all increase risk.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Submucosal fibroids cause HMB, impair implantation, and increase miscarriage risk. Management is symptom-driven — <strong>size alone is never an indication for treatment.</strong></div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classification by Location</span><span class="n-section-tag">location drives symptoms</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Uterine fibroids — location drives symptoms</span><span class="n-viz-sub">Submucosal = bleeding · intramural = bulk · subserosal = pressure</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SUBMUCOSAL</text>
      <text x="72" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Type 0–2 · SM</text>
      <text x="72" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Distorts cavity</text>
      <text x="72" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">HMB · subfertility</text>
      <text x="72" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Recurrent miscarriage</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Hysteroscopic resection</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">INTRAMURAL</text>
      <text x="227" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Type 3–4 · IM</text>
      <text x="227" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Within myometrium</text>
      <text x="227" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Bulk symptoms · HMB</text>
      <text x="227" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Most common type</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">GnRH · UAE · myomectomy</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a2a4a"/>
      <text x="382" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SUBSEROSAL</text>
      <text x="382" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Type 5–7 · SS</text>
      <text x="382" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Outside uterus</text>
      <text x="382" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Pressure on bladder/bowel</text>
      <text x="382" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Least effect on fertility</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Often asymptomatic</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">PEDUNCULATED</text>
      <text x="537" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Type 7 · Ped</text>
      <text x="537" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">On stalk — can torse</text>
      <text x="537" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Mimics ovarian mass</text>
      <text x="537" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Acute pain if torsion</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Confirm on MRI</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">IN PREGNANCY</text>
      <text x="690" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Red degeneration</text>
      <text x="690" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Rapid growth → infarct</text>
      <text x="690" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Acute pain ~20 wks</text>
      <text x="690" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Localised tenderness</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Analgesia · self-limiting</text>
    </svg>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Heavy menstrual bleeding + enlarged irregular uterus → think <em>fibroids</em> → pelvic USS. Submucosal fibroid + subfertility → hysteroscopic resection before IVF.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Rapid post-menopausal growth</div><div class="n-distractor-text"><strong>A fibroid that grows rapidly after menopause is uterine sarcoma (leiomyosarcoma) until proven otherwise.</strong> Malignant transformation is rare but must not be missed. Investigate with MRI — do not simply observe.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Submucosal vs Other Types</span><span class="n-section-tag">submucosal causes the most harm</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Submucosal (Type 0–2)</div>
      <div class="n-compare-row"><span class="n-compare-label">Location</span><span>Distorts endometrial cavity — even small ones cause significant symptoms</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Bleeding</span><span><strong>HMB is the dominant symptom</strong> — even a 5mm submucosal fibroid causes more bleeding than a 5cm intramural</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Fertility</span><span><strong>Impairs implantation and increases miscarriage risk.</strong> Resect before IVF regardless of size</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Treatment</span><span><strong>Hysteroscopic resection</strong> — outpatient or day case. Definitive for types 0–1</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">Intramural / Subserosal</div>
      <div class="n-compare-row"><span class="n-compare-label">Location</span><span>Within myometrium (IM) or outside uterus (SS) — cavity not directly distorted</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Bleeding</span><span>HMB possible from IM fibroids but less predictable. SS fibroids rarely cause bleeding</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Fertility</span><span>Large IM fibroids may impair implantation. SS fibroids have minimal effect on fertility</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Treatment</span><span>Medical (LNG-IUS, GnRH) or surgical (myomectomy, UAE, hysterectomy) based on symptoms</span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management</span><span class="n-section-tag">symptom-driven — never treat size alone</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Medical — HMB control</div>
  <div class="n-algo-body"><strong>LNG-IUS (Mirena) first-line</strong> if cavity not significantly distorted — reduces blood loss by 86–97%. Tranexamic acid + NSAIDs for symptom relief. COCP for cycle control. <strong>None shrink fibroids — all manage symptoms only.</strong><span class="n-involve">GP / outpatient gynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">GnRH agonists (pre-op)</div>
  <div class="n-algo-body">Induce temporary menopause — shrink fibroids by ~30–40%. Maximum 3–6 months (bone loss). Used pre-operatively to reduce size and blood loss. <strong>Rebound growth occurs on stopping.</strong> Add-back HRT to reduce side effects.<span class="n-involve">Specialist gynaecology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Surgical — fertility-sparing</div>
  <div class="n-algo-body"><strong>Myomectomy</strong> (laparoscopic or open) removes fibroids while preserving the uterus. Recurrence 25–50% within 5 years. <strong>Hysteroscopic resection</strong> for submucosal types 0–2.<span class="n-involve">Specialist gynaecological surgeon</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Definitive / UAE</div>
  <div class="n-algo-body dark-body"><strong>Hysterectomy</strong> — definitive, no recurrence. <strong>UAE (uterine artery embolisation)</strong> — 80–90% effective for symptoms. <strong>Not recommended if future pregnancy desired</strong> — compromises uterine blood supply. Suitable for women who want to avoid surgery.<span class="n-involve">Consultant gynaecology + interventional radiology</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Fibroids in Pregnancy</span><span class="n-section-tag">red degeneration and complications</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Red degeneration</div><div class="n-diag-content">Rapid fibroid growth during pregnancy outstrips blood supply → central infarction. <strong>Presents ~16–22 weeks:</strong> acute localised pain, low-grade fever, uterine tenderness over fibroid. USS confirms. <strong>Treatment: analgesia (paracetamol ± codeine) — self-limiting.</strong> Does not require surgical intervention.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Obstetric complications</div><div class="n-diag-content">Large fibroids increase risk of: malpresentation, placenta praevia (if low-lying), preterm labour, obstructed labour (cervical fibroid), and postpartum haemorrhage. Submucosal fibroids increase miscarriage risk in first trimester.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Myomectomy in pregnancy</div><div class="n-diag-content">Rarely performed during pregnancy — high haemorrhage risk. Reserved for torsion of pedunculated fibroid causing acute abdomen. Do not perform elective myomectomy during pregnancy.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Rapidly enlarging fibroid after menopause = uterine sarcoma until proven otherwise.</strong> MRI urgently. Do not assume benign without investigation.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Submucosal fibroid + subfertility = resect before IVF.</strong> Even small submucosal fibroids halve IVF success rates. Hysteroscopic resection should precede any assisted conception cycle.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>UAE in a woman who wants future pregnancy is inappropriate.</strong> Counsel clearly — UAE is not fertility-sparing. Myomectomy is the correct surgical option in this context.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>LNG-IUS is first-line for HMB from fibroids if the cavity is not significantly distorted.</strong> Reduces blood loss by 86–97%. Candidates who go straight to surgery before trying medical management are wrong.<span class="n-pearl-exam">Exam: what is first-line for fibroid-related HMB?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>A 5mm submucosal fibroid causes more harm than a 5cm subserosal one.</strong> Location, not size, determines clinical significance. The FIGO classification (types 0–8) reflects this — submucosal types 0–2 are highest priority for treatment.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>UAE is contraindicated if future pregnancy is desired.</strong> Disruption of uterine blood supply risks placental abnormalities and uterine rupture in subsequent pregnancy. Myomectomy preserves fertility — UAE does not.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>GnRH agonists cause rebound fibroid growth on stopping.</strong> They are a bridge to surgery, not a standalone treatment. Maximum 3–6 months, always combined with add-back HRT to prevent bone loss.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Myomectomy recurrence rate is 25–50% within 5 years.</strong> Women who want definitive treatment and have completed their family should be counselled about hysterectomy. Myomectomy is fertility-sparing, not curative.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Fibroids are three times more common and more symptomatic in Black women.</strong> Earlier presentation, larger fibroids at diagnosis, higher surgical rates. Ethnicity is the strongest demographic risk factor — more important than BMI or parity.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A large fibroid causing no symptoms needs treatment.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Asymptomatic fibroids do not require treatment regardless of size.</strong> The indication is symptoms — HMB, pressure, subfertility — not imaging findings. Incidental large fibroids in asymptomatic women are managed expectantly.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A fibroid growing after menopause is probably just not regressing fully.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Post-menopausal fibroid growth = uterine sarcoma until excluded.</strong> MRI is required. Women on HRT may have oestrogen-driven continued growth, but any enlargement must be investigated.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">UAE can be offered to a woman who wants to get pregnant after treatment.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>UAE is not fertility-sparing.</strong> It compromises uterine blood supply. Myomectomy is the only surgical option for women who wish to preserve future fertility.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Location matters more than size.<br><em>A 5mm submucosal fibroid outranks a 5cm subserosal one.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.pid=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Infection</div>
  <div class="n-hero-title">Pelvic Inflammatory<br><em>Disease</em></div>
  <div class="n-hero-sub">PID &nbsp;·&nbsp; ICD N73 &nbsp;·&nbsp; Treat empirically. Every day of delay damages the tube.</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Ascending infection from the lower genital tract to the uterus, fallopian tubes, and ovaries. Polymicrobial — chlamydia, gonorrhoea, anaerobes, Mycoplasma genitalium.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Sexually active women under 25. Multiple partners, new partner, no barrier contraception. IUCD insertion, ERPC, and hysteroscopy all increase risk by disrupting the cervical barrier.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Tubal damage → ectopic risk ×6–10, infertility (50% after 3 episodes), chronic pelvic pain. <strong>The Fallopian tube does not recover well from inflammation.</strong> Speed of treatment is the only modifiable variable.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">treat before swabs come back</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">PID — ascending infection and its consequences</span><span class="n-viz-sub">Swab results confirm. They don't trigger treatment.</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">ORGANISMS</text>
      <text x="72" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Polymicrobial</text>
      <text x="72" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Chlamydia · Gonorrhoea</text>
      <text x="72" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Anaerobes · M. genitalium</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Often no single pathogen</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">ASCENT</text>
      <text x="227" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Cervix → tubes</text>
      <text x="227" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Endometritis → salpingitis</text>
      <text x="227" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">CMT is the key sign</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Cervical motion tenderness</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a2a4a"/>
      <text x="382" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DIAGNOSIS</text>
      <text x="382" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Clinical + swabs</text>
      <text x="382" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">No single test confirms</text>
      <text x="382" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Treat if suspected</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Low threshold</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TREATMENT</text>
      <text x="537" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Ceftriaxone + Doxy + Met</text>
      <text x="537" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">BASHH guidelines</text>
      <text x="537" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">14-day course</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Review IUCD if &lt;3 wks</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">COMPLICATION</text>
      <text x="690" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">TOA · infertility</text>
      <text x="690" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">TOA: IV abx or drain</text>
      <text x="690" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">3 episodes → 50% infertile</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Ectopic risk ×6–10</text>
    </svg>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Lower abdominal pain + cervical motion tenderness + adnexal tenderness in a sexually active woman → think <em>PID</em> → treat empirically now. Do not wait for swab results.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Negative swabs do not exclude PID</div><div class="n-distractor-text"><strong>Chlamydia NAAT sensitivity is ~90% — 10% of cases will be missed.</strong> PID is polymicrobial and often culture-negative. If the clinical picture fits, treat. Delayed treatment increases tubal damage exponentially.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Diagnosis — Clinical, Not Microbiological</span><span class="n-section-tag">low threshold to treat</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Minimum criteria</div><div class="n-diag-content">Lower abdominal pain + <strong>cervical motion tenderness (CMT)</strong> or uterine/adnexal tenderness in a sexually active woman. Any one of these in the right clinical context is sufficient to start treatment. All three are not required.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Swabs</div><div class="n-diag-content">Endocervical NAAT for chlamydia and gonorrhoea. HVS for anaerobes. Urine NAAT. <strong>Treat before results return</strong> — results guide de-escalation, not initiation.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Bloods</div><div class="n-diag-content">CRP and WBC — elevated in most cases but normal does not exclude PID. Useful for monitoring response to treatment.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">USS — TOA</div><div class="n-diag-content"><strong>USS to exclude tubo-ovarian abscess if severe symptoms, mass palpable, or failure to respond.</strong> TOA changes management — requires IV antibiotics ± drainage. Do not miss it.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Laparoscopy</div><div class="n-diag-content">Gold standard — direct visualisation of tubes. Reserved for diagnostic uncertainty or failure to respond to treatment. Not required routinely.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Severity and Treatment</span><span class="n-section-tag">BASHH regimen — 14 days always</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Outpatient (Mild PID)</div>
      <div class="n-compare-row"><span class="n-compare-label">Criteria</span><span>Systemically well, no peritonism, no TOA, not pregnant, able to take oral medication</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Regimen</span><span><strong>Ceftriaxone 500mg IM stat</strong> + doxycycline 100mg BD × 14 days + metronidazole 400mg BD × 14 days</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Review</span><span>72-hour review — if not improving, admit for IV antibiotics</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Partners</span><span>Notify all sexual contacts within 6 months — treat empirically</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">Inpatient (Moderate–Severe)</div>
      <div class="n-compare-row"><span class="n-compare-label">Criteria</span><span>Systemically unwell, TOA, surgical abdomen, pregnancy, failed outpatient treatment at 72h</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Regimen</span><span><strong>IV cefoxitin + doxycycline</strong>, then oral doxycycline + metronidazole to complete 14 days total</span></div>
      <div class="n-compare-row"><span class="n-compare-label">TOA</span><span>60–80% respond to IV antibiotics alone. Image-guided drainage if &gt;8cm or no improvement at 48–72h</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Ruptured TOA</span><span><strong>Immediate laparotomy.</strong> Ruptured TOA = surgical emergency with high mortality</span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">IUCD in PID — What to Do</span><span class="n-section-tag">the question the exam always asks</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Inserted &lt;3 weeks ago</div><div class="n-diag-content"><strong>Remove the IUCD.</strong> Insertion within 3 weeks is the likely source of ascending infection. Removal improves outcomes. Provide emergency contraception if appropriate.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Longstanding IUCD</div><div class="n-diag-content"><strong>Leave it in if the woman wishes to keep it and responds to antibiotics.</strong> Removal does not improve outcomes for established PID with a longstanding device. Only remove if no clinical improvement at 72 hours.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">TOA with IUCD</div><div class="n-diag-content">Consider removal of IUCD in TOA that is not responding to antibiotics. Discuss with senior. Provide contraceptive advice after removal.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Ruptured TOA = surgical emergency.</strong> Sudden deterioration + peritonism + haemodynamic instability in a woman with PID = laparotomy immediately. High mortality if delayed.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Fitz-Hugh-Curtis syndrome</strong> — perihepatitis from PID. Right upper quadrant pain + tenderness + PID signs. Violin-string adhesions on laparoscopy. Treat as PID — same antibiotics.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Mycoplasma genitalium — the missed organism.</strong> Not covered by standard ceftriaxone + doxy + metronidazole. If PID fails to respond: test for M. genitalium and add moxifloxacin.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Treat empirically — never wait for swab results.</strong> Every day of delay increases tubal damage and adhesion formation. NICE and BASHH are explicit: start antibiotics on clinical diagnosis.<span class="n-pearl-exam">Exam: candidates wait for the microbiology lab. Always wrong.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>PID is polymicrobial — chlamydia is only found in 40–50% of cases.</strong> Gonorrhoea, anaerobes, and M. genitalium all cause PID independently. A negative chlamydia NAAT does not exclude PID.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Partner notification is mandatory — 6-month look-back period.</strong> Untreated partners cause re-infection. All contacts must be assessed and treated empirically. Health advisors at GUM clinics manage this.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Longstanding IUCD does not need to be removed in mild-to-moderate PID.</strong> Remove only if: inserted &lt;3 weeks ago, no improvement at 72h, or TOA not responding to antibiotics. Routine removal is incorrect.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Infertility risk rises sharply with episodes.</strong> 1 episode: ~12% infertility. 2 episodes: ~25%. 3 episodes: ~50%. Each episode leaves permanent tubal scarring — the first episode is the most important to treat rapidly.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Fitz-Hugh-Curtis syndrome = PID + RUQ pain.</strong> Perihepatitis from PID spreading to the liver capsule. Same treatment as PID. Laparoscopy shows 'violin-string' adhesions between liver and abdominal wall.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Wait for swab results before treating suspected PID.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Treat empirically on clinical diagnosis.</strong> Swabs guide de-escalation, not initiation. Delay causes irreversible tubal damage.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Negative chlamydia NAAT = no PID.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Chlamydia is only found in ~40–50% of PID cases.</strong> The other 50–60% are caused by gonorrhoea, anaerobes, and M. genitalium. Treat clinically regardless of swab result.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">IUCD must always be removed if PID is diagnosed.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Longstanding IUCD can be left in place if the woman responds to antibiotics and wishes to keep it.</strong> Remove only if inserted &lt;3 weeks ago, or if there is no improvement at 72 hours.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Treat first. The swab result<br>confirms what you <em>already suspected.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Preterm labour — assess, delay, and protect the baby</span>
      <span class="n-viz-sub">Every week in utero is a week the NICU doesn't have to be</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">ASSESS</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">TVU Cervix</tspan><tspan x="72" dy="16">+ fFN</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Cervix <25mm = high risk</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">fFN neg → reassure</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Both together best</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DELAY</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Tocolysis</tspan><tspan x="227" dy="16">48 hrs</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Nifedipine first-line</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Atosiban if needed</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Time for steroids only</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a1a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">PROTECT</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">Antenatal</tspan><tspan x="382" dy="16">Steroids</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Betamethasone 2 doses</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle"><34 wks — lung maturity</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Give within 24 hrs</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">NEUROPROTECT</text>
      <text x="537" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">MgSO₄
<30 wks</text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Reduces cerebral palsy</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">4g IV loading dose</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Not a tocolytic here</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DELIVER</text>
      <text x="690" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800"><34 wks:
Tertiary Unit</text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">In-utero transfer</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Neonatal team on standby</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Survival 90%+ at 28wk</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Tocolytics & Neuroprotection</span><span class="n-section-tag">know the drugs</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
    <div class="n-compare-head">Drug</div><div class="n-compare-head">Class</div><div class="n-compare-head">Use</div><div class="n-compare-head">Key point</div>
    <div class="n-compare-row-label">Nifedipine</div><div class="n-compare-cell">Calcium channel blocker</div><div class="n-compare-cell">First-line tocolysis (48h window)</div><div class="n-compare-cell">Do not combine with MgSO₄ (hypotension)</div>
    <div class="n-compare-row-label">Atosiban</div><div class="n-compare-cell">Oxytocin receptor antagonist</div><div class="n-compare-cell">Alternative tocolysis — fewer side effects</div><div class="n-compare-cell">IV infusion; expensive but well tolerated</div>
    <div class="n-compare-row-label">Betamethasone</div><div class="n-compare-cell">Corticosteroid</div><div class="n-compare-cell">Fetal lung maturity &lt;34 weeks (2 doses 24h apart)</div><div class="n-compare-cell">The most important intervention — give first</div>
    <div class="n-compare-row-label">MgSO₄</div><div class="n-compare-cell">Neuroprotectant</div><div class="n-compare-cell">&lt;30 weeks — reduces cerebral palsy risk by ~30%</div><div class="n-compare-cell">Not tocolysis — this is a distinct indication</div>
    <div class="n-compare-row-label">Cervical cerclage</div><div class="n-compare-cell">Mechanical</div><div class="n-compare-cell">Short cervix (&lt;25mm) + prior preterm birth</div><div class="n-compare-cell">McDonald or Shirodkar suture at 12–14 weeks</div>
    <div class="n-compare-row-label">Progesterone</div><div class="n-compare-cell">Hormone</div><div class="n-compare-cell">Vaginal progesterone if short cervix on USS</div><div class="n-compare-cell">Reduces recurrence but not standard for all</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">5</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Tocolysis alone does not improve perinatal outcomes.</strong> Its value is buying 24–48 hours for steroids. If delivery is inevitable, do not obsess over tocolysis — ensure steroids and MgSO₄ are given.<span class="n-pearl-exam">Exam loves this: candidates tocolyse without giving steroids.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Cervical cerclage</strong> reduces preterm birth in women with prior spontaneous preterm birth &lt;34 weeks AND short cervix &lt;25mm in current pregnancy. NICE recommends Shirodkar or McDonald technique.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Progesterone (vaginal)</strong> — reduces preterm birth in singleton pregnancies with short cervix (&lt;25mm) at 24 weeks. Given from 24 to 36+6 weeks.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Tocolysis buys 48 hours — nothing more.</strong> The purpose is not to stop labour permanently but to allow time for corticosteroids to work and in-utero transfer to a neonatal unit. Once steroids are given and transfer done, tocolysis has served its purpose. It does not improve perinatal mortality on its own.<span class="n-pearl-exam">The "why do we give tocolysis" question — not to prevent birth, to create a window.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>fFN (foetal fibronectin) has a high negative predictive value.</strong> A negative fFN between 22–34 weeks has &gt;95% NPV for preterm delivery within 14 days — it is essentially a rule-out test. If negative, tocolysis and admission are less justified. If positive, only 15–20% will actually deliver within 2 weeks — it is a poor positive test.<span class="n-pearl-exam">The diagnostic value question — NPV not PPV.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>MgSO₄ before 30 weeks is neuroprotection, not tocolysis.</strong> Students frequently confuse these. MgSO₄ stabilises oligodendrocyte precursors and reduces periventricular white matter injury, cutting cerebral palsy risk by ~30%. It does not reliably delay delivery. Give it alongside corticosteroids — they have different mechanisms and both are needed.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">9</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Every week in utero<br>is a week the NICU <em>doesn't have to be.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.ovarycyst=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Assessment</div>
  <div class="n-hero-title">Ovarian<br><em>Cyst</em></div>
  <div class="n-hero-sub">ICD N83 &nbsp;·&nbsp; Most are benign. The challenge is identifying which aren't.</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">A fluid-filled structure on or in the ovary. Functional (follicular, corpus luteal) or pathological (dermoid, endometrioma, cystadenoma, malignant). Most resolve spontaneously.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Very common across all ages. Functional cysts: any reproductive-age woman. Dermoids: peak 20–40. Malignant: risk rises sharply after 50. <strong>BRCA1/2 carriers: significantly elevated lifetime risk.</strong></div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Torsion is a surgical emergency. Malignancy must not be missed. The RMI (Risk of Malignancy Index) is the tool that separates benign from malignant — use it in every postmenopausal woman with a cyst.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Cyst Types — Know Each One</span><span class="n-section-tag">appearance on USS guides management</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Ovarian cysts — type determines management</span><span class="n-viz-sub">RMI separates benign from malignant — calculate it in every case</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">FUNCTIONAL</text>
      <text x="72" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Follicular / corpus luteal</text>
      <text x="72" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Simple unilocular</text>
      <text x="72" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">&lt;5cm — likely resolve</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Rescan 6–12 weeks</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DERMOID</text>
      <text x="227" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Teratoma</text>
      <text x="227" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Teeth/fat/hair on USS</text>
      <text x="227" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Echogenic on USS</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Laparoscopic cystectomy</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a2a"/>
      <text x="382" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">ENDOMETRIOMA</text>
      <text x="382" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">'Chocolate cyst'</text>
      <text x="382" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Ground-glass USS</text>
      <text x="382" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Dysmenorrhoea · deep dyspareunia</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Medical or surgical</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">CYSTADENOMA</text>
      <text x="537" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Serous / mucinous</text>
      <text x="537" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Mucinous: very large</text>
      <text x="537" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">May be bilateral (serous)</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">RMI · surgical</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MALIGNANT</text>
      <text x="690" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">RMI &gt;250</text>
      <text x="690" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Solid elements · ascites</text>
      <text x="690" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Bilateral · peritoneal mets</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Refer: gynaecological oncology</text>
    </svg>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Sudden severe unilateral pelvic pain + ovarian cyst on USS → think <em>torsion</em> → emergency laparoscopy. Do not wait for Doppler to be absent — torsion can have preserved flow.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Risk of Malignancy Index (RMI)</span><span class="n-section-tag">the formula you must know</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Formula</div><div class="n-diag-content"><strong>RMI = USS score (U) × Menopausal status (M) × CA-125.</strong> USS score: 0 (no features), 1 (one feature), 3 (two or more features). Menopausal status: premenopausal = 1, postmenopausal = 3. CA-125 = measured value in U/mL.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">USS features scored</div><div class="n-diag-content">Multilocularity, solid elements, bilateral cysts, ascites, intraperitoneal metastases. Each feature present adds to the USS score (1 feature = U score 1, ≥2 features = U score 3).</div></div>
    <div class="n-diag-row"><div class="n-diag-label">RMI &lt;25</div><div class="n-diag-content">Low risk — manage in general gynaecology. Premenopausal with simple cyst: rescan at 3 months.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">RMI 25–250</div><div class="n-diag-content">Moderate risk — specialist MDT review. Further imaging (MRI) and discussion.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">RMI &gt;250</div><div class="n-diag-content"><strong>High risk — urgent referral to gynaecological oncology.</strong> Surgery must not be performed outside a cancer centre. 2WW referral. Do not operate locally.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management by Type and Age</span><span class="n-section-tag">premenopausal vs postmenopausal rules differ</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Premenopausal</div>
      <div class="n-compare-row"><span class="n-compare-label">Simple &lt;5cm</span><span>Likely functional — rescan at 6–8 weeks. Most resolve spontaneously. No intervention needed</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Simple 5–7cm</span><span>Annual USS. Consider MRI if persists &gt;1 year. RMI if any complex features develop</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Simple &gt;7cm</span><span>MRI to characterise. Consider surgical removal — laparoscopic cystectomy</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Dermoid</span><span>Laparoscopic cystectomy — risk of torsion and chemical peritonitis if rupture. Preserve ovarian tissue</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Endometrioma</span><span>Medical (hormonal suppression) or laparoscopic cystectomy. IVF considerations — cystectomy first</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">Postmenopausal</div>
      <div class="n-compare-row"><span class="n-compare-label">Any cyst</span><span><strong>USS + CA-125 + calculate RMI.</strong> Functional cysts do not occur post-menopause — any cyst needs evaluation</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Simple &lt;5cm + normal CA-125</span><span>4-monthly USS for 1 year, then annual if stable. Can discharge after 1 year if unchanged</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Any complex features</span><span><strong>Calculate RMI. If &gt;250 → urgent oncology referral.</strong> Do not operate locally on suspicious postmenopausal cysts</span></div>
      <div class="n-compare-row"><span class="n-compare-label">BRCA1/2</span><span>Risk-reducing BSO at 35–40 (BRCA1) or 40–45 (BRCA2). Dramatically reduces ovarian cancer risk</span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Torsion — Time is Ovary</span><span class="n-section-tag">detorsion even if it looks black</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Presentation</div><div class="n-diag-content">Sudden severe unilateral pain, nausea/vomiting (~70%), adnexal tenderness. May be intermittent if partial torsion. No pathognomonic signs — high index of suspicion required.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Doppler rule</div><div class="n-diag-content"><strong>Present Doppler flow does NOT exclude torsion.</strong> Sensitivity of absent Doppler for torsion is only ~44%. Partial torsion preserves intermittent flow. Clinical suspicion + ovarian enlargement = diagnostic laparoscopy regardless of Doppler.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Surgical principle</div><div class="n-diag-content"><strong>Detorsion first — even if the ovary looks black.</strong> Up to 90% of visually compromised ovaries recover normal function after detorsion. Oophorectomy based on appearance alone is no longer appropriate.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Risk factors</div><div class="n-diag-content">Dermoid cyst (most common cause — heavy, eccentric), ovarian hyperstimulation, previous torsion (10% recurrence risk), long utero-ovarian ligament. Can occur in a normal ovary.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>RMI &gt;250 = urgent gynaecological oncology referral.</strong> Do not operate on a suspicious postmenopausal cyst outside a cancer centre — staging surgery must be performed correctly the first time.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Torsion — every hour matters.</strong> Diagnostic laparoscopy should not be delayed by observation if clinical suspicion is high. Ovarian viability falls with time.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>CA-125 alone is not a screening test for ovarian cancer.</strong> It is only useful as part of RMI. CA-125 is elevated in endometriosis, fibroids, PID, and peritoneal irritation. Specificity is low in isolation.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Detorsion even if the ovary looks black — up to 90% recover.</strong> Visual inspection at laparoscopy is unreliable. Congestion and haemorrhage mimic infarction. Untwist, observe, then decide. Oophorectomy based on appearance = unnecessary organ loss.<span class="n-pearl-exam">Exam: candidate removes the black ovary. Always wrong.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Dermoid is the most common cause of ovarian torsion.</strong> The heavy, eccentric fat content creates a pendulum effect — predisposes to twisting. Always consider torsion in a young woman with known dermoid and acute pain.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>CA-125 is not a screening test — it is part of RMI.</strong> Elevated CA-125 in isolation is non-specific. It is only meaningful when combined with USS features and menopausal status in the RMI formula.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Functional cysts do not occur in postmenopausal women.</strong> Any ovarian cyst in a postmenopausal woman needs USS + CA-125 + RMI calculation. Do not apply premenopausal reassurance criteria to postmenopausal women.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>BRCA1/2 — risk-reducing BSO prevents ovarian cancer.</strong> BRCA1: recommend BSO at 35–40. BRCA2: 40–45. Reduces ovarian cancer risk by ~80–90%. Discuss HRT to manage surgical menopause symptoms.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Mucinous cystadenomas can grow very large (>20cm).</strong> They are benign but cause significant bulk symptoms. Rupture releases mucin into the peritoneal cavity — pseudomyxoma peritonei. Remove intact if possible.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal Doppler flow excludes ovarian torsion — safe to observe.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Present Doppler does not exclude torsion.</strong> Sensitivity of absent Doppler is only ~44%. Partial torsion preserves flow. Clinical suspicion + enlarged ovary = laparoscopy regardless of Doppler.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">CA-125 is the best test to decide if an ovarian cyst is malignant.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CA-125 alone is insufficient. Use the RMI (U × M × CA-125).</strong> CA-125 can be elevated in benign conditions and is normal in up to 50% of early ovarian cancers.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A simple ovarian cyst in a postmenopausal woman can be rescanned in 3 months like a premenopausal cyst.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Postmenopausal cysts require USS + CA-125 + RMI immediately.</strong> Functional cysts do not occur after menopause. Any cyst in a postmenopausal woman needs formal evaluation before any decision to observe.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Sudden pain + cyst = torsion until laparoscopy.<br><em>Detorsion even if it looks dead.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.cervicalcancer=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Oncology</div>
  <div class="n-hero-title">Cervical<br><em>Cancer</em></div>
  <div class="n-hero-sub">ICD C53 &nbsp;·&nbsp; Almost entirely preventable. Almost entirely caused by HPV.</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Malignancy of the cervix, predominantly <strong>squamous cell carcinoma (75%)</strong> or adenocarcinoma (20%). HPV 16 and 18 drive 70% of all cases.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Peak incidence 30–45. Risk factors: early sexual debut, multiple partners, high-risk HPV subtypes, smoking, immunosuppression (HIV, post-transplant), non-attendance at cervical screening.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Cervical screening detects CIN (pre-cancer) before invasion. HPV vaccination prevents it. When invasive: <strong>prognosis depends entirely on stage at diagnosis.</strong> Stage 1 = 90% 5-year survival. Stage 4 = 15%.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">HPV → CIN → Cancer</span><span class="n-section-tag">a preventable progression</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Cervical cancer — HPV to invasion</span><span class="n-viz-sub">A vaccine and a smear programme have made this almost entirely preventable</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">CAUSE</text>
      <text x="72" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">HPV 16 and 18</text>
      <text x="72" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">70% of cervical cancers</text>
      <text x="72" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Sexually transmitted</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Vaccine at 12–13 yrs</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">PRE-CANCER</text>
      <text x="227" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">CIN I–III</text>
      <text x="227" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">CIN1: mild dysplasia</text>
      <text x="227" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">CIN3: severe → carcinoma in situ</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Detected on smear</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a2a4a"/>
      <text x="382" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SCREENING</text>
      <text x="382" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">HPV primary screening</text>
      <text x="382" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">3-yearly 25–49</text>
      <text x="382" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">5-yearly 50–64</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Colposcopy if HPV+</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SYMPTOMS</text>
      <text x="537" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">PCB · IMB · discharge</text>
      <text x="537" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Post-coital bleed = red flag</text>
      <text x="537" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Pelvic pain in advanced disease</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">2WW urgent referral</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">STAGING</text>
      <text x="690" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">FIGO I → IV</text>
      <text x="690" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Stage I: confined to cervix</text>
      <text x="690" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Stage IV: bladder/rectum/distant</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">MRI for staging</text>
    </svg>
  </div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">HPV infection</div><div class="n-mech-text">High-risk HPV (16, 18, 31, 33) infects the transformation zone of the cervix. Usually cleared by the immune system within 2 years. <strong>Persistent infection is required for malignant transformation.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">CIN (cervical intraepithelial neoplasia)</div><div class="n-mech-text">Pre-invasive dysplastic changes. CIN1 (mild), CIN2 (moderate), CIN3 (severe/carcinoma in situ). <strong>CIN3 left untreated progresses to invasive cancer in ~30% within 10 years.</strong> This is the screening target.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Invasion and spread</div><div class="n-mech-text">Basement membrane breach → invasion. Direct extension to parametria, bladder, rectum. Lymphatic spread to iliac and para-aortic nodes. Hydronephrosis = stage IIIB minimum.</div></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Screening Pathway</span><span class="n-section-tag">HPV primary screening — UK 2019</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Smear (age 25–64)</div><div class="n-diag-content">UK uses <strong>HPV primary screening</strong> (since 2019). Test for high-risk HPV first. If HPV-negative: routine recall (3-yearly 25–49, 5-yearly 50–64). If HPV-positive: reflex cytology added to the same sample.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">HPV+ / abnormal cytology</div><div class="n-diag-content">Colposcopy referral. Direct visualisation of the transformation zone under magnification. Aceto-white areas, abnormal vascular patterns, and iodine staining identify CIN.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">CIN1</div><div class="n-diag-content">Active surveillance — most CIN1 regresses spontaneously (60% within 2 years). Colposcopy at 12 months. Treat only if persists or progresses.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">CIN2 / CIN3</div><div class="n-diag-content"><strong>LLETZ (Large Loop Excision of the Transformation Zone)</strong> — outpatient, local anaesthetic. Curative in ~95% of CIN2/3. Specimen sent for histology to confirm margins.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Post-LLETZ follow-up</div><div class="n-diag-content">Test of cure: HPV test at 6 months. If HPV-negative: return to routine screening. If HPV-positive: colposcopy again.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">FIGO Staging and Treatment</span><span class="n-section-tag">stage determines treatment</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Early Stage (I–IIA)</div>
      <div class="n-compare-row"><span class="n-compare-label">Stage IA1</span><span><strong>LLETZ or cone biopsy if fertility desired.</strong> Simple hysterectomy if family complete. Survival &gt;99%</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Stage IA2–IB1</span><span><strong>Radical hysterectomy + pelvic lymphadenectomy</strong> OR chemo-radiotherapy. Equivalent outcomes. Surgery preferred in younger women (preserves ovarian function)</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Fertility-sparing</span><span><strong>Radical trachelectomy</strong> for IA1–IB1 — removes cervix, preserves uterus. Cerclage placed at isthmus. Selected cases only at specialist centres</span></div>
      <div class="n-compare-row"><span class="n-compare-label">IB2–IIA</span><span>Concurrent chemoradiotherapy (cisplatin) preferred for larger tumours (&gt;4cm). Surgery has higher morbidity at this size</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">Advanced Stage (IIB–IV)</div>
      <div class="n-compare-row"><span class="n-compare-label">Stage IIB–IIIC</span><span><strong>Concurrent chemoradiotherapy</strong> (external beam + brachytherapy + weekly cisplatin). Not operable at this stage</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Brachytherapy</span><span>Internal radiation delivered directly to tumour — essential component of treatment for locally advanced disease. Improves survival</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Stage IV</span><span>Palliative intent. <strong>Bevacizumab</strong> (anti-VEGF) + chemotherapy for recurrent/metastatic disease — improves OS in selected cases</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Hydronephrosis</span><span>Bilateral hydronephrosis = stage IIIB minimum. Associated with poor prognosis. Ureteric stenting for symptom control</span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Vaccination — Near Elimination</span><span class="n-section-tag">Gardasil 9 · boys and girls</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Gardasil 9</div><div class="n-diag-content">Offered to all girls <strong>and boys</strong> aged 12–13 in the UK. Protects against HPV 6, 11, 16, 18, 31, 33, 45, 52, 58 — covering ~90% of cervical cancers, plus genital warts (6, 11). Two doses given 6–24 months apart.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Efficacy</div><div class="n-diag-content">Expected to reduce cervical cancer incidence by &gt;90% in vaccinated generations. Scotland has already seen near-elimination in women vaccinated at 12–13. Screening still required — vaccine doesn't cover all high-risk types.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Catch-up</div><div class="n-diag-content">Available on NHS up to age 25 if missed school programme. Offered to men who have sex with men up to age 45. Three doses if started after age 15.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Still screen after vaccination</div><div class="n-diag-content"><strong>Vaccinated women must still attend cervical screening.</strong> HPV 16/18 account for 70%, not 100%, of cervical cancers. Vaccination reduces, does not eliminate, risk.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Post-coital bleeding in any woman = urgent colposcopy / 2WW referral.</strong> Do not reassure without examination. Do not defer because of a recent normal smear. PCB is a red flag symptom regardless of screening history.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Unilateral leg swelling + pelvic mass = stage IIIB+ disease.</strong> Lymphatic obstruction causing leg oedema is a sign of advanced pelvic disease. Urgent staging CT + oncology referral.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Normal smear does not exclude invasive cancer.</strong> Smears detect pre-invasive CIN, not all invasive cancers. Symptomatic women need examination and direct biopsy regardless of smear result.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Post-coital bleeding = urgent 2WW referral regardless of smear history.</strong> PCB is the cardinal symptom of cervical cancer. A normal smear from 2 years ago does not exclude invasive cancer presenting now.<span class="n-pearl-exam">Exam: candidate reassures based on normal smear. Always wrong.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>HPV vaccination + cervical screening = near-elimination strategy.</strong> Scotland has already achieved this in vaccinated cohorts. Gardasil 9 covers HPV types responsible for &gt;90% of cervical cancers plus genital warts.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>CIN3 ≠ cancer.</strong> CIN3 is pre-invasive — it has not breached the basement membrane. Treated with LLETZ, which is curative in ~95%. Do not use the word 'cancer' when explaining CIN3 to patients.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Radical trachelectomy — cervix removed, uterus preserved.</strong> For stage IA1–IB1 in women who want fertility. Cerclage placed to prevent pregnancy loss. Only available at specialist centres. Oncological outcomes equivalent to radical hysterectomy in selected cases.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Adenocarcinoma is harder to detect on cervical screening than squamous cell carcinoma.</strong> It arises higher in the endocervical canal, away from the transformation zone. It is proportionally increasing as HPV-related squamous cell cancer falls with vaccination.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Stage IB1 can be treated with surgery or chemoradiotherapy — equivalent outcomes.</strong> Surgery is preferred in younger women to preserve ovarian function and avoid radiation-induced vaginal stenosis. Choice is individualised through MDT.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Post-coital bleeding in a young woman = cervical ectropion — reassure and discharge.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>PCB requires speculum examination and urgent 2WW referral if no immediately apparent benign cause.</strong> Ectropion is common, but cervical cancer must be excluded. Never reassure without examination.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A recent normal smear means cervical cancer is very unlikely — no further action needed.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Symptoms take precedence over screening history.</strong> Interval cancers occur. A symptomatic woman needs clinical assessment regardless of her last smear result.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">CIN3 means the patient has cervical cancer — explain this to the patient.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CIN3 is pre-invasive — it has NOT breached the basement membrane.</strong> It is high-grade pre-cancer, not cancer. LLETZ is curative. Saying 'cancer' causes significant distress and is factually incorrect.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">A vaccine. A smear programme.<br><em>This cancer is almost entirely preventable.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Placental abruption — revealed, concealed, and consequences</span>
      <span class="n-viz-sub">20% have no visible bleeding — the board loves this</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TYPE 1</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Revealed</tspan><tspan x="72" dy="16">Abruption</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Visible PV bleeding</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Placenta edge bleeds out</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Easier to quantify</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TYPE 2</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Concealed</tspan><tspan x="227" dy="16">Abruption</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Blood trapped behind</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Placenta — no PV loss</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Worst — missed easily</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#5a2a3a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SIGNS</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">Woody Hard</tspan><tspan x="382" dy="16">Uterus</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Constant pain (not colicky)</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Uterus tense between ctx</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Opposite of praevia</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">FETAL</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">CTG</tspan><tspan x="537" dy="16">Decelerations</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Hypoxia from separation</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Stillbirth if large</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Deliver immediately</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MATERNAL</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">DIC /</tspan><tspan x="690" dy="16">Hypovolaemia</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Clotting cascade fails</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Clotting screen + XM</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Massive haemorrhage protocol</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Praevia vs Abruption vs Vasa Praevia</span><span class="n-section-tag">three causes of APH</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
    <div class="n-compare-head">Feature</div><div class="n-compare-head">Placenta Praevia</div><div class="n-compare-head">Abruption</div><div class="n-compare-head">Vasa Praevia</div>
    <div class="n-compare-row-label">Pain</div><div class="n-compare-cell">Painless</div><div class="n-compare-cell">Painful — sudden severe</div><div class="n-compare-cell">Painless</div>
    <div class="n-compare-row-label">Blood colour</div><div class="n-compare-cell">Bright red</div><div class="n-compare-cell">Dark red (concealed possible)</div><div class="n-compare-cell">Dark red (fetal blood)</div>
    <div class="n-compare-row-label">Uterus</div><div class="n-compare-cell">Soft</div><div class="n-compare-cell">Woody hard, tender</div><div class="n-compare-cell">Soft</div>
    <div class="n-compare-row-label">Fetal heart</div><div class="n-compare-cell">Usually normal unless severe</div><div class="n-compare-cell">Distress proportional to abruption size</div><div class="n-compare-cell">Sudden severe bradycardia / sinusoidal</div>
    <div class="n-compare-row-label">Whose blood</div><div class="n-compare-cell">Maternal</div><div class="n-compare-cell">Maternal</div><div class="n-compare-cell"><strong>Fetal</strong> — exsanguination risk</div>
    <div class="n-compare-row-label">Action</div><div class="n-compare-cell">No VE; USS; LSCS if major</div><div class="n-compare-cell">Deliver urgently; DIC screen</div><div class="n-compare-cell">Emergency LSCS immediately</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">5</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>The Couvelaire uterus</strong> (uteroplacental apoplexy): extravasated blood infiltrates the uterine muscle, turning it blue-purple. Rarely causes contractile failure — hysterectomy rarely needed but may be.<span class="n-pearl-exam">Exam loves this: rare but high-yield term.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Kleihauer-Betke test</strong> quantifies feto-maternal haemorrhage — guides anti-D dosing in Rh-negative women. Standard dose if &lt;4 mL FMH; additional doses if more.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>After abruption, risk of recurrence is 10× baseline</strong> in future pregnancies. Aspirin from 12 weeks and closer surveillance are recommended.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Concealed abruption: no external bleeding, but worse than it looks.</strong> Blood tracks behind the placenta and does not escape vaginally. A woman with severe abdominal pain, woody uterus, and fetal distress — but minimal PV blood — may have a massive concealed abruption. The absence of visible bleeding is not reassurance.<span class="n-pearl-exam">The "no bleeding but bad signs" scenario — this is the one that kills.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>DIC is a direct complication of abruption.</strong> Retroplacental blood clot releases thromboplastin → activates clotting cascade → consumes fibrinogen and platelets → DIC. Check fibrinogen urgently (normal in pregnancy is &gt;4 g/L; &lt;2 g/L = severe coagulopathy). Treat with cryoprecipitate + FFP + deliver.<span class="n-pearl-exam">Abruption → DIC mechanism question.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Kleihauer-Betke test quantifies fetal-maternal haemorrhage.</strong> Used in Rh-negative women with abruption to calculate the dose of anti-D needed. Standard 500 IU covers up to 4 mL of fetal blood — but large APH may require higher doses. Always check Kleihauer before giving anti-D in significant bleeds.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">8</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">No visible blood<br>doesn't mean <em>no bleeding.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Induction of labour — Bishop score to delivery</span>
      <span class="n-viz-sub">The cervix decides how long it takes — Bishop score tells you where you start</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">ASSESS</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Bishop</tspan><tspan x="72" dy="16">Score</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">≥8 = favourable</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle"><6 = needs ripening</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">5 features 0–3 each</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">RIPEN</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Dinoprostone</tspan><tspan x="227" dy="16">PGE₂ Gel</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Softens + dilates cervix</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Repeat after 6 hrs</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Monitor CTG after</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a2a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">BALLOON</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">Cook /</tspan><tspan x="382" dy="16">Foley</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Mechanical ripening</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Alternative to PGE₂</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Lower hyperstim risk</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">AMNIOTOMY</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">ARM +</tspan><tspan x="537" dy="16">Syntocinon</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Once cervix favourable</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Synto titrated carefully</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Continuous CTG req'd</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">COMPLICATION</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">Hyper-</tspan><tspan x="690" dy="16">stimulation</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">>5 ctx in 10 min</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Tocolyse + stop Synto</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Category 1 CS if CTG bad</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">IOL Methods Compared</span><span class="n-section-tag">choose by cervix and clinical context</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
    <div class="n-compare-head">Method</div><div class="n-compare-head">Mechanism</div><div class="n-compare-head">Use when</div><div class="n-compare-head">Caution</div>
    <div class="n-compare-row-label">Dinoprostone (PGE2)</div><div class="n-compare-cell">Prostaglandin gel/pessary — cervical ripening + stimulation</div><div class="n-compare-cell">Unfavourable cervix (Bishop &lt;6); intact membranes</div><div class="n-compare-cell">Previous LSCS: increased uterine rupture risk — use balloon instead</div>
    <div class="n-compare-row-label">Misoprostol (PGE1)</div><div class="n-compare-cell">Prostaglandin — potent uterotonic</div><div class="n-compare-cell">Second-trimester IOL; IUFD (low dose)</div><div class="n-compare-cell">Not licensed in UK for IOL in live pregnancy — use dinoprostone instead</div>
    <div class="n-compare-row-label">Balloon catheter</div><div class="n-compare-cell">Mechanical cervical ripening — Foley/Cook balloon distends lower segment</div><div class="n-compare-cell">Previous LSCS — preferred method (no prostaglandin uterotonic risk)</div><div class="n-compare-cell">Not if ruptured membranes or active infection</div>
    <div class="n-compare-row-label">ARM (AROM)</div><div class="n-compare-cell">Artificial rupture of membranes — releases prostaglandins + allows syntocinon</div><div class="n-compare-cell">Favourable cervix (Bishop ≥6); after successful ripening</div><div class="n-compare-cell">Only when presenting part engaged — cord prolapse risk</div>
    <div class="n-compare-row-label">Syntocinon (oxytocin)</div><div class="n-compare-cell">IV infusion — drives contractions once membranes ruptured</div><div class="n-compare-cell">After ARM; augmentation of slow labour</div><div class="n-compare-cell">Continuous CTG mandatory; previous LSCS: lower-dose protocol</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">5</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Offering IOL at 41 weeks reduces stillbirth without increasing caesarean rate</strong> (Hannah Post-term trial, SWEPIS trial). Waiting for 42 weeks increases risk.<span class="n-pearl-exam">Exam loves this: the evidence shifted from 'wait' to 'offer'.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Misoprostol (PGE1) is not licensed in the UK for IOL</strong> but is used in low-resource settings and for IUFD. More potent and cheaper than dinoprostone. Higher hyperstimulation risk.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Balloon catheter is preferred over prostaglandins for previous caesarean IOL</strong> — lower uterine rupture risk. Transcervical Foley catheter inflated in the lower segment.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Offering IOL at 41 weeks reduces stillbirth without increasing caesarean rate.</strong> The ARRIVE trial and NICE NG207 evidence: induction at 41+0 vs expectant management reduces perinatal mortality with no increase in LSCS. The old teaching ("IOL increases caesarean risk") has been overturned. Stillbirth risk rises sharply after 41 weeks — don't withhold IOL to "let things happen naturally."<span class="n-pearl-exam">The evidence-practice gap question — old vs new guidance.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Bishop score components: Dilation, Effacement, Station, Consistency, Position (DESCP).</strong> Score 0–13. Score ≥8 = favourable — ARM alone may be sufficient. Score &lt;6 = unfavourable — cervical ripening required first. The cervix is almost entirely responsible for IOL success: a good cervix makes almost any IOL work; a poor cervix makes even optimal IOL fail.<span class="n-pearl-exam">Bishop score components and threshold values — always examined.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Previous LSCS + IOL: use balloon catheter, not prostaglandins.</strong> Prostaglandins (especially misoprostol) increase uterine rupture risk in a scarred uterus — approximately 1 in 200 with dinoprostone, higher with misoprostol. Balloon catheter achieves mechanical ripening without pharmacological uterotonic effect. Syntocinon with continuous CTG is then used after ARM — at lower doses, with vigilance for scar pain or CTG changes suggesting rupture.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">9</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Induction is a process, not an event.<br>The cervix decides <em>how long it takes.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Menopause — oestrogen withdrawal and its consequences</span>
      <span class="n-viz-sub">Menopause is not a disease — but undertreated oestrogen deficiency causes one</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">VASOMOTOR</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Hot Flushes</tspan><tspan x="72" dy="16">+ Sweats</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">GnRH neuron disinhibition</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Hypothalamic dysregulation</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">HRT most effective</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">UROGENITAL</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">GSM /</tspan><tspan x="227" dy="16">Atrophy</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">↓oestrogen → thin mucosa</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Dryness · dyspareunia · UTI</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Topical oestrogen safe</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a1a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SKELETAL</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">Osteo-</tspan><tspan x="382" dy="16">porosis</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Rapid bone loss 1–3 yrs</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">post-menopause</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">DEXA if early / POI</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">CARDIOVASC</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">CV Risk</tspan><tspan x="537" dy="16">Rises</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Oestrogen cardioprotective</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Lost after menopause</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">HRT <60 may protect</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">HRT</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">Oestrogen</tspan><tspan x="690" dy="16">± Progest</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Systemic if uterus present</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Add progestogen always</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Discuss risks at 1 yr</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">HRT: Benefits vs Risks</span><span class="n-section-tag">individualise every decision</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr;">
    <div class="n-compare-head">Factor</div><div class="n-compare-head">Oral HRT</div><div class="n-compare-head">Transdermal HRT</div>
    <div class="n-compare-row-label">VTE risk</div><div class="n-compare-cell">Increased ~2–3× (first-pass hepatic effect on clotting factors)</div><div class="n-compare-cell">No increased VTE risk — bypasses liver</div>
    <div class="n-compare-row-label">Stroke risk</div><div class="n-compare-cell">Slight increase with conjugated equine oestrogen</div><div class="n-compare-cell">No increased stroke risk</div>
    <div class="n-compare-row-label">Breast cancer</div><div class="n-compare-cell">Combined HRT: small increased risk (&lt;1 extra case per 1000 women per year). Oestrogen-only: no increased risk (in hysterectomised women)</div><div class="n-compare-cell">Same risk profile as oral for breast cancer</div>
    <div class="n-compare-row-label">Progestogen type</div><div class="n-compare-cell">Synthetic progestogens (MPA, norethisterone) — higher breast cancer risk</div><div class="n-compare-cell">Micronised progesterone (Utrogestan) — lower breast cancer risk, preferred</div>
    <div class="n-compare-row-label">Contraindications</div><div class="n-compare-cell" colspan="2">Oestrogen receptor-positive breast cancer (absolute), unexplained PV bleeding, uncontrolled hypertension, active VTE/liver disease</div>
    <div class="n-compare-row-label">POI (&lt;40 years)</div><div class="n-compare-cell" colspan="2">HRT is essential until at least age 51 — to prevent premature cardiovascular and bone disease. Not optional.</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">5</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Transdermal (patch/gel) HRT has lower thrombotic risk than oral HRT.</strong> Oral oestrogen undergoes first-pass hepatic metabolism → clotting factor effects. Transdermal bypasses this. Prefer transdermal in women with VTE risk factors.<span class="n-pearl-exam">Exam loves this: candidates prescribe oral to everyone.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Micronised progesterone (Utrogestan)</strong> is the safest progestogen — lower breast cancer risk, no cardiovascular effect. Preferred over synthetic progestogens (norethisterone, medroxyprogesterone acetate).</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>HRT can be prescribed by GPs</strong> — no specialist referral required for straightforward cases. Refer if: POI, HRT failure, uncertainty about risk, or complex co-morbidities.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Premature ovarian insufficiency (POI) is not the same as early menopause.</strong> POI is ovarian failure before age 40 — affects 1% of women. These women need HRT for cardiovascular and bone protection until at least 51 (natural menopause age). Without HRT they have markedly increased risk of osteoporosis and cardiovascular disease. POI requires specialist management including psychological support, fertility counselling (spontaneous pregnancy still possible in 5–10%).<span class="n-pearl-exam">The "under-40 amenorrhoea" vignette — POI must be top of the differential.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Genitourinary syndrome of menopause (GSM) responds to local oestrogen.</strong> Vaginal dryness, recurrent UTIs, dyspareunia, urinary urgency — these are all GSM. Local vaginal oestrogen (cream, ring, pessary) is first-line and does not carry the systemic HRT risks. It can be used lifelong, even in women in whom systemic HRT is contraindicated (including most breast cancer survivors).<span class="n-pearl-exam">The "breast cancer survivor with vaginal symptoms" question — local oestrogen is safe.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>HRT absolute contraindications: current breast cancer (ER+), unexplained PV bleeding, active VTE, uncontrolled hypertension, active liver disease.</strong> A history of VTE is not an absolute contraindication — transdermal HRT can be considered with specialist advice. Prior breast cancer is complex: ER-negative cancer does not carry the same absolute ban. Know the difference between absolute and relative.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">8</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Menopause is not a disease.<br>But undertreated oestrogen deficiency <em>causes one.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.vulvalconditions=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Dermatology</div>
  <div class="n-hero-title">Vulval<br><em>Conditions</em></div>
  <div class="n-hero-sub">Lichen sclerosus · Lichen planus · VIN · Bartholin's · Vulvodynia · The ones that get missed</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">Lichen sclerosus</div><div class="n-snap-text">White atrophic 'cigarette paper' skin in a figure-of-8 distribution. Intense pruritus. Autoimmune. <strong>4–5% lifetime risk of vulval SCC — annual review for life.</strong></div></div><div class="n-snap-cell"><div class="n-snap-label">Lichen planus</div><div class="n-snap-text">Erosive, glazed, red. Wickham's striae. Can involve vagina causing scarring and stenosis. Potent topical steroids + vaginal steroid suppositories.</div></div><div class="n-snap-cell"><div class="n-snap-label">Rule</div><div class="n-snap-text">Any vulval lesion that doesn't respond to treatment, any suspicious area, any same-site recurrence — <strong>biopsy it. Every time.</strong></div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Lichen Sclerosus vs Lichen Planus vs Lichen Simplex</span><span class="n-section-tag">three white conditions, three different diseases</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Vulval conditions — white, red, and ulcerated</span><span class="n-viz-sub">Biopsy what you are not sure about. Every time.</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">LICHEN SCLEROSUS</text>
      <text x="72" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">White · Atrophic</text>
      <text x="72" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Figure-of-8 pattern</text>
      <text x="72" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Cigarette paper skin</text>
      <text x="72" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Autoimmune (thyroid/vitiligo)</text>
      <text x="72" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Clobetasol · lifelong</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">4–5% SCC risk</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">LICHEN PLANUS</text>
      <text x="227" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Erosive · Red</text>
      <text x="227" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Glazed erythema</text>
      <text x="227" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Wickham's striae</text>
      <text x="227" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Affects vagina too</text>
      <text x="227" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Topical steroid + vaginal</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">SCC risk lower than LS</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a2a"/>
      <text x="382" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">LICHEN SIMPLEX</text>
      <text x="382" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Thickened · Lichenified</text>
      <text x="382" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Scratch-itch cycle</text>
      <text x="382" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Secondary to atopy/irritants</text>
      <text x="382" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Not autoimmune</text>
      <text x="382" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Moderate steroid + emollient</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Break the itch-scratch cycle</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#3a2a4a"/>
      <text x="537" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">VIN</text>
      <text x="537" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Pre-malignant</text>
      <text x="537" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">HPV-related (younger)</text>
      <text x="537" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Differentiated (older, from LS)</text>
      <text x="537" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Raised white/red lesions</text>
      <text x="537" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Biopsy · excision · imiquimod</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">dVIN: higher malignant potential</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">VULVAL SCC</text>
      <text x="690" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Malignant</text>
      <text x="690" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Warty/nodular ulcer</text>
      <text x="690" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Arises on LS or VIN</text>
      <text x="690" y="98" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Postmenopausal peak</text>
      <text x="690" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Wide excision + SNB</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Inguinofemoral LN dissection</text>
    </svg>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Lichen Sclerosus vs Lichen Planus — Side by Side</span><span class="n-section-tag">the comparison the exam wants</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Lichen Sclerosus</div>
      <div class="n-compare-row"><span class="n-compare-label">Appearance</span><span>White, atrophic, wrinkled. 'Cigarette paper' texture. Purpura from fragile vessels</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Distribution</span><span><strong>Figure-of-8</strong> — vulva + perianal skin. Does NOT affect vagina</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Symptoms</span><span>Intense pruritus. Dyspareunia. Clitoral phimosis. Fused labia minora</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Cause</span><span>Autoimmune. Associated with thyroid disease, vitiligo, alopecia areata</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Treatment</span><span><strong>Clobetasol propionate 0.05%</strong> — nightly × 4 weeks, alternate nights × 4 weeks, twice weekly maintenance</span></div>
      <div class="n-compare-row"><span class="n-compare-label">SCC risk</span><span><strong>4–5% lifetime risk of vulval SCC</strong> — annual specialist review for life</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">Lichen Planus</div>
      <div class="n-compare-row"><span class="n-compare-label">Appearance</span><span>Glazed erythema, erosions, lacy white border (Wickham's striae)</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Distribution</span><span>Vulva <strong>AND vagina</strong> (causes scarring, stenosis) — distinguishes from LS</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Symptoms</span><span>Burning, soreness, dyspareunia. Postcoital bleeding if vaginal. Vaginal discharge</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Cause</span><span>T-cell mediated autoimmune. May have oral LP (lacy white patches on buccal mucosa)</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Treatment</span><span>Potent topical steroid + <strong>vaginal steroid suppositories/hydrocortisone foam</strong> to prevent stenosis. Immunosuppressants if refractory</span></div>
      <div class="n-compare-row"><span class="n-compare-label">SCC risk</span><span>Lower than LS but present — erosive LP is pre-malignant in some classifications</span></div>
    </div>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">Key differentiator</div><div class="n-exam-statement">Lichen planus involves the vagina and can cause vaginal stenosis/scarring — lichen sclerosus does not extend into the vagina. If there is vaginal involvement, it is LP until proven otherwise.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">VIN — Vulval Intraepithelial Neoplasia</span><span class="n-section-tag">two types, different risks</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">HPV-related VIN (uVIN)</div><div class="n-diag-content">Younger women (&lt;50). High-risk HPV (16, 18). Multifocal, raised, white/red/pigmented lesions. Associated with CIN, VAIN, anal intraepithelial neoplasia. Treatment: surgical excision, imiquimod (topical immune modifier), or CO2 laser. <strong>Lower malignant potential than dVIN.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Differentiated VIN (dVIN)</div><div class="n-diag-content">Older women. Arises on background of lichen sclerosus. <strong>Much higher malignant potential — can progress to SCC rapidly.</strong> Often subtle — thickened, fissured lesion on LS background. Biopsy any non-healing area in LS. Treatment: surgical excision with clear margins.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Bartholin's cyst/abscess</div><div class="n-diag-content">Cyst: painless, posterior labium majus at 4 or 8 o'clock. Treat if symptomatic. Abscess: acutely tender, hot, fluctuant. <strong>Word catheter (4–6 weeks) or marsupialization.</strong> Swab for gonorrhoea/chlamydia. New Bartholin's mass in postmenopausal woman = biopsy (Bartholin's gland carcinoma).</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Vulvodynia</span><span class="n-section-tag">not psychosomatic — a real pain condition</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Definition</div><div class="n-diag-content">Chronic vulval pain (&gt;3 months) without identifiable cause. Localised (vestibulodynia — provoked by touch/penetration) or generalised. <strong>Peripheral and central sensitisation — not a psychological disorder.</strong> Prevalence ~7–8% of women.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Assessment</div><div class="n-diag-content">Cotton-bud test: map pain at clock-face positions of vestibule. Exclude infection, LS, LP, contact dermatitis, fissures. Diagnosis of exclusion — biopsy if any visible lesion.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Treatment</div><div class="n-diag-content">Multidisciplinary: <strong>topical lidocaine</strong> (immediate relief before intercourse), <strong>topical amitriptyline/gabapentin</strong> (neuropathic modulation), <strong>pelvic floor physiotherapy</strong> (hypertonicity very common), <strong>CBT/pain psychology</strong>, oral tricyclics or gabapentinoids. Surgical vestibulectomy for refractory localised vestibulodynia — good outcomes.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">biopsy threshold is low</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Any vulval lesion not responding to treatment = biopsy.</strong> VIN and early vulval SCC are missed on appearance alone. Outpatient punch biopsy under LA is simple and definitive.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Lichen sclerosus without regular follow-up is inadequate care.</strong> Annual specialist review is required lifelong to detect malignant transformation. 4–5% lifetime SCC risk.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>New Bartholin's swelling in a postmenopausal woman = biopsy to exclude Bartholin's gland carcinoma.</strong> Bartholin's glands atrophy after menopause. Any new swelling in this location needs histology.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Clobetasol propionate 0.05% — first-line for lichen sclerosus, use the 3-month tapering regimen.</strong> Nightly × 4 weeks, alternate nights × 4 weeks, twice weekly maintenance. Underdosing is common — potent steroid is needed, not hydrocortisone.<span class="n-pearl-exam">Exam: candidates prescribe weak steroids. Wrong.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Lichen planus involves the vagina — lichen sclerosus does not.</strong> Vaginal involvement with scarring, stenosis, and loss of architecture = LP. This distinction is the most commonly tested differentiator.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Differentiated VIN has higher malignant potential than HPV-related VIN.</strong> Arises on lichen sclerosus in older women. Subtle lesion — any non-healing fissure or thickened area on LS must be biopsied.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Vulvodynia is a recognised neuropathic pain condition — not psychosomatic.</strong> Peripheral sensitisation + central sensitisation. Dismissing it as anxiety delays effective treatment. Multimodal management is required.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Word catheter for Bartholin's abscess — not simple I&D.</strong> Simple incision has a high recurrence rate. Word catheter left in situ for 4–6 weeks epithelialises a new duct opening. Marsupialization is the surgical equivalent.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Lichen sclerosus is not sexually transmitted — it is autoimmune.</strong> Patients are frequently and incorrectly told this. Sexual partners do not need treatment or testing. Reassurance and correct diagnosis matter enormously for this group.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Lichen sclerosus can be managed by GP indefinitely — specialist review is optional.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Annual specialist review is mandatory lifelong.</strong> 4–5% lifetime SCC risk. Any non-healing area, induration, or failure to respond to clobetasol requires urgent biopsy.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Topical oestrogen is first-line for lichen sclerosus.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Topical oestrogen has no role in lichen sclerosus.</strong> It treats vulvovaginal atrophy — a completely different condition. First-line for LS is clobetasol propionate 0.05%.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Vulvodynia is caused by anxiety and should be referred to psychiatry.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Vulvodynia is driven by peripheral and central sensitisation.</strong> Psychology is one component of a multimodal approach — not the sole treatment. Pelvic floor physiotherapy, topical neuropathic agents, and surgical options are all evidence-based.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">White skin. Itch. Figure-of-8.<br>Biopsy what you're not sure about. <em>Every time.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.ovariancancer=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Oncology</div>
  <div class="n-hero-title">Ovarian<br><em>Cancer</em></div>
  <div class="n-hero-sub">ICD C56 &nbsp;·&nbsp; The silent killer — vague symptoms, late diagnosis, poor prognosis</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Malignancy of the ovary. <strong>High-grade serous carcinoma (HGSC)</strong> is most common — 70% of cases. Subtypes: low-grade serous, endometrioid, clear cell, mucinous, borderline.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">Lifetime risk 1.7%. Key risks: <strong>BRCA1 (40–60% lifetime risk), BRCA2 (20–30%), Lynch syndrome</strong>, nulliparity, endometriosis, HRT &gt;10 years. COCP is protective.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">5-year survival Stage I = 90%. Stage III–IV = &lt;30%. <strong>75% present at advanced stage</strong> — because symptoms are vague and overlap with IBS. Early detection is the only way to improve survival.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Histological Types</span><span class="n-section-tag">know what you're dealing with</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Ovarian cancer subtypes — 90% are epithelial</span>
      <span class="n-viz-sub">Each subtype has distinct biology, risk factors and chemo-sensitivity</span>
    </div>
    <svg viewBox="0 0 760 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="148" height="200" rx="2" fill="#1a2a3a"/>
      <text x="74" y="22" font-family="Syne,sans-serif" font-size="7.5" fill="rgba(255,255,255,.5)" text-anchor="middle" font-weight="700" letter-spacing="1.5">HIGH-GRADE SEROUS</text>
      <text x="74" y="46" font-family="Syne,sans-serif" font-size="22" fill="white" text-anchor="middle" font-weight="800">70%</text>
      <text x="74" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Most aggressive</text>
      <text x="74" y="82" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">TP53 mutation universal</text>
      <text x="74" y="96" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">BRCA1/2 in 20%</text>
      <text x="74" y="120" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.45)" text-anchor="middle">Often bilateral</text>
      <text x="74" y="133" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.45)" text-anchor="middle">Chemo-sensitive initially</text>
      <text x="74" y="170" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.3)" text-anchor="middle">Platinum + PARP inhibitor</text>
      <rect x="155" y="0" width="118" height="200" rx="2" fill="#2a3a5a"/>
      <text x="214" y="22" font-family="Syne,sans-serif" font-size="7.5" fill="rgba(255,255,255,.5)" text-anchor="middle" font-weight="700" letter-spacing="1.5">ENDOMETRIOID</text>
      <text x="214" y="46" font-family="Syne,sans-serif" font-size="22" fill="white" text-anchor="middle" font-weight="800">10%</text>
      <text x="214" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Better prognosis</text>
      <text x="214" y="82" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Linked to endometriosis</text>
      <text x="214" y="96" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Lynch syndrome risk</text>
      <text x="214" y="133" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.45)" text-anchor="middle">Often early stage at Dx</text>
      <rect x="280" y="0" width="118" height="200" rx="2" fill="#3a2a4a"/>
      <text x="339" y="22" font-family="Syne,sans-serif" font-size="7.5" fill="rgba(255,255,255,.5)" text-anchor="middle" font-weight="700" letter-spacing="1.5">CLEAR CELL</text>
      <text x="339" y="46" font-family="Syne,sans-serif" font-size="22" fill="white" text-anchor="middle" font-weight="800">5%</text>
      <text x="339" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Chemo-resistant</text>
      <text x="339" y="82" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Linked to endometriosis</text>
      <text x="339" y="96" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Poor platinum response</text>
      <text x="339" y="133" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.45)" text-anchor="middle">Higher VTE risk</text>
      <rect x="405" y="0" width="118" height="200" rx="2" fill="#3a3a1a"/>
      <text x="464" y="22" font-family="Syne,sans-serif" font-size="7.5" fill="rgba(255,255,255,.5)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MUCINOUS</text>
      <text x="464" y="46" font-family="Syne,sans-serif" font-size="22" fill="white" text-anchor="middle" font-weight="800">3%</text>
      <text x="464" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Often large, unilateral</text>
      <text x="464" y="82" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">CA-125 often normal</text>
      <text x="464" y="96" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">CEA may be raised</text>
      <text x="464" y="133" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.45)" text-anchor="middle">Rule out GI primary first</text>
      <rect x="530" y="0" width="108" height="200" rx="2" fill="#4a2a1a"/>
      <text x="584" y="22" font-family="Syne,sans-serif" font-size="7.5" fill="rgba(255,255,255,.5)" text-anchor="middle" font-weight="700" letter-spacing="1.5">BORDERLINE</text>
      <text x="584" y="46" font-family="Syne,sans-serif" font-size="18" fill="white" text-anchor="middle" font-weight="800">10–15%</text>
      <text x="584" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Low malignant potential</text>
      <text x="584" y="82" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">No stromal invasion</text>
      <text x="584" y="96" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Excellent prognosis</text>
      <text x="584" y="133" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.45)" text-anchor="middle">Fertility-sparing possible</text>
      <rect x="645" y="0" width="115" height="200" rx="2" fill="#c8452a"/>
      <text x="702" y="22" font-family="Syne,sans-serif" font-size="7.5" fill="rgba(255,255,255,.5)" text-anchor="middle" font-weight="700" letter-spacing="1.5">GCT / OTHERS</text>
      <text x="702" y="46" font-family="Syne,sans-serif" font-size="18" fill="white" text-anchor="middle" font-weight="800">Rare</text>
      <text x="702" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Granulosa cell tumour</text>
      <text x="702" y="82" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Oestrogen-secreting</text>
      <text x="702" y="96" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle">Inhibin B as marker</text>
      <text x="702" y="133" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.45)" text-anchor="middle">Dysgerminoma in young</text>
    </svg>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Persistent bloating + early satiety + urinary frequency + pelvic mass in a woman &gt;50 → think <em>ovarian cancer</em> → CA-125 + USS → calculate RMI → refer if &gt;200.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text"><strong>Mucinous ovarian cancer: CA-125 is often NORMAL.</strong> If you only check CA-125 and it's normal, you'll miss it. CEA may be raised instead, and you must also rule out a GI primary (colorectal, appendix) before attributing it to ovary.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">FIGO Staging</span><span class="n-section-tag">determines everything</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">FIGO staging — ovarian cancer</span>
      <span class="n-viz-sub">Stage at diagnosis is the single most important prognostic factor</span>
    </div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="760" height="160" rx="3" fill="#f9f6f2"/>
      <rect x="10" y="10" width="170" height="140" rx="3" fill="#2d6a4f"/>
      <text x="95" y="32" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.6)" text-anchor="middle" font-weight="700" letter-spacing="2">STAGE I</text>
      <text x="95" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Confined to ovary</text>
      <text x="95" y="75" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">IA: one ovary, capsule intact</text>
      <text x="95" y="88" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">IB: both ovaries</text>
      <text x="95" y="101" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">IC: capsule ruptured / ascites</text>
      <text x="95" y="130" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.95)" text-anchor="middle" font-weight="800">5yr: ~90%</text>
      <rect x="190" y="10" width="170" height="140" rx="3" fill="#52b788"/>
      <text x="275" y="32" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.6)" text-anchor="middle" font-weight="700" letter-spacing="2">STAGE II</text>
      <text x="275" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Pelvic extension</text>
      <text x="275" y="75" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.85)" text-anchor="middle">Spread to uterus / tubes /</text>
      <text x="275" y="88" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.85)" text-anchor="middle">other pelvic structures</text>
      <text x="275" y="101" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.85)" text-anchor="middle">Still within pelvis</text>
      <text x="275" y="130" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.95)" text-anchor="middle" font-weight="800">5yr: ~70%</text>
      <rect x="370" y="10" width="190" height="140" rx="3" fill="#e76f51"/>
      <text x="465" y="32" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.6)" text-anchor="middle" font-weight="700" letter-spacing="2">STAGE III</text>
      <text x="465" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Peritoneal / lymph nodes</text>
      <text x="465" y="75" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.85)" text-anchor="middle">IIIA: micro peritoneal mets</text>
      <text x="465" y="88" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.85)" text-anchor="middle">IIIB: &lt;2cm peritoneal deposits</text>
      <text x="465" y="101" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.85)" text-anchor="middle">IIIC: &gt;2cm / +lymph nodes</text>
      <text x="465" y="115" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.65)" text-anchor="middle">75% diagnosed here or stage IV</text>
      <text x="465" y="130" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.95)" text-anchor="middle" font-weight="800">5yr: ~25%</text>
      <rect x="570" y="10" width="180" height="140" rx="3" fill="#c8452a"/>
      <text x="660" y="32" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.6)" text-anchor="middle" font-weight="700" letter-spacing="2">STAGE IV</text>
      <text x="660" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Distant metastases</text>
      <text x="660" y="75" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.85)" text-anchor="middle">IVA: pleural effusion (cytology+)</text>
      <text x="660" y="88" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.85)" text-anchor="middle">IVB: liver/spleen parenchyma</text>
      <text x="660" y="101" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.85)" text-anchor="middle">or extraabdominal sites</text>
      <text x="660" y="130" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.95)" text-anchor="middle" font-weight="800">5yr: ~15%</text>
    </svg>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Investigation &amp; RMI</span><span class="n-section-tag">how to risk-stratify</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Risk of Malignancy Index (RMI) — the triage tool</span>
      <span class="n-viz-sub">RMI = U × M × CA-125. Score &gt;200 → urgent gynaecological oncology referral</span>
    </div>
    <svg viewBox="0 0 760 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="760" height="150" rx="3" fill="#1a1a2e"/>
      <text x="380" y="28" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">RMI = U × M × CA-125</text>
      <rect x="20" y="42" width="220" height="95" rx="3" fill="rgba(255,255,255,.06)"/>
      <text x="130" y="62" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">U — USS SCORE</text>
      <text x="130" y="80" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.8)" text-anchor="middle">0 = no features</text>
      <text x="130" y="93" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.8)" text-anchor="middle">1 = one feature</text>
      <text x="130" y="106" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.8)" text-anchor="middle">3 = two or more features</text>
      <text x="130" y="125" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.4)" text-anchor="middle">Multilocular, solid, bilateral,</text>
      <text x="130" y="136" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.4)" text-anchor="middle">ascites, metastases</text>
      <rect x="255" y="42" width="220" height="95" rx="3" fill="rgba(255,255,255,.06)"/>
      <text x="365" y="62" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">M — MENOPAUSAL STATUS</text>
      <text x="365" y="80" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.8)" text-anchor="middle">1 = premenopausal</text>
      <text x="365" y="93" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.8)" text-anchor="middle">3 = postmenopausal</text>
      <text x="365" y="115" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.4)" text-anchor="middle">Postmenopausal = &gt;12m amenorrhoea</text>
      <text x="365" y="128" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.4)" text-anchor="middle">or age &gt;50 if hysterectomised</text>
      <rect x="490" y="42" width="250" height="95" rx="3" fill="rgba(200,69,42,.15)"/>
      <text x="615" y="62" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">CA-125 — raw value (IU/mL)</text>
      <text x="615" y="80" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.8)" text-anchor="middle">Plug in raw number directly</text>
      <text x="615" y="100" font-family="JetBrains Mono,monospace" font-size="9" fill="#c8452a" text-anchor="middle" font-weight="700">RMI &gt; 200 = refer urgently</text>
      <text x="615" y="120" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.4)" text-anchor="middle">Sensitivity 85%, Specificity 97%</text>
      <text x="615" y="133" font-family="JetBrains Mono,monospace" font-size="6.5" fill="rgba(255,255,255,.4)" text-anchor="middle">for identifying high-risk lesions</text>
    </svg>
  </div>
  <div class="n-body-text">Work-up once suspected: <strong>CA-125 + pelvic USS first</strong>. If RMI &gt;200: CT chest/abdomen/pelvis for staging + urgent gynaecological oncology referral. Do not biopsy percutaneously — risk of peritoneal seeding. Diagnosis is surgical. For germ cell tumours in young women, also check AFP, β-hCG, LDH, inhibin B.</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Epithelial vs Non-Epithelial</span><span class="n-section-tag">know the distinction</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr;">
    <div class="n-compare-head">Feature</div><div class="n-compare-head">Epithelial (90%)</div><div class="n-compare-head">Non-Epithelial (10%)</div>
    <div class="n-compare-row-label">Age</div><div class="n-compare-cell">Postmenopausal (50–70s)</div><div class="n-compare-cell">Young women (teens–30s)</div>
    <div class="n-compare-row-label">Types</div><div class="n-compare-cell">HGSC, clear cell, mucinous, endometrioid, borderline</div><div class="n-compare-cell">Dysgerminoma, yolk sac, granulosa cell, teratoma</div>
    <div class="n-compare-row-label">Markers</div><div class="n-compare-cell">CA-125 (most), CEA (mucinous)</div><div class="n-compare-cell">AFP, β-hCG, LDH, inhibin B</div>
    <div class="n-compare-row-label">Prognosis</div><div class="n-compare-cell">Stage-dependent; often poor</div><div class="n-compare-cell">Generally better — chemo-sensitive</div>
    <div class="n-compare-row-label">Fertility</div><div class="n-compare-cell">Rarely spared (bilateral common)</div><div class="n-compare-cell">Often fertility-sparing possible</div>
    <div class="n-compare-row-label">Special feature</div><div class="n-compare-cell">Peritoneal carcinomatosis common</div><div class="n-compare-cell">Granulosa: oestrogen → endometrial hyperplasia</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Management</span><span class="n-section-tag">surgery is the foundation</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Primary debulking surgery</div>
  <div class="n-algo-body"><strong>Total abdominal hysterectomy + bilateral salpingo-oophorectomy + omentectomy</strong> + peritoneal biopsies + pelvic/para-aortic lymphadenectomy. Goal: no visible residual disease (R0). Every cm of residual tumour worsens survival.<span class="n-involve">Gynaecological oncology MDT</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Adjuvant chemotherapy</div>
  <div class="n-algo-body"><strong>Carboplatin + paclitaxel × 6 cycles</strong> — standard first-line for Stage IC and above. PARP inhibitors (olaparib, niraparib) as <strong>maintenance</strong> in BRCA-mutated or HRD-positive tumours — dramatically improves PFS.<span class="n-involve">Clinical oncology</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Neoadjuvant (bulky / unresectable)</div>
  <div class="n-algo-body">If primary surgery not feasible: <strong>3 cycles carboplatin/paclitaxel → interval debulking surgery → 3 further cycles.</strong> Equivalent OS to primary surgery in selected cases. Decision made at MDT with CT staging.<span class="n-involve">MDT decision</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Recurrence</div>
  <div class="n-algo-body dark-body"><strong>Platinum-sensitive</strong> (relapse &gt;6 months): repeat platinum-based ± PARP inhibitor. <strong>Platinum-resistant</strong> (relapse &lt;6 months): single-agent (liposomal doxorubicin, topotecan, gemcitabine) ± bevacizumab. Median survival 12–18 months.<span class="n-involve">Palliative + oncology</span></div>
</div>
  </div>
  <div class="n-body-text"><strong>BRCA testing:</strong> All women with high-grade ovarian cancer should have germline BRCA testing — guides PARP inhibitor use AND enables cascade testing for relatives. Somatic (tumour) BRCA testing also relevant for treatment decisions.</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Ascites + ovarian mass = ovarian cancer until proven otherwise.</strong> Refer urgently without waiting for CA-125. Do not attribute ascites to a benign cyst.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Young woman + ovarian mass + AFP/β-hCG raised</strong> → germ cell tumour. Highly chemo-sensitive and potentially curable — urgent referral changes outcomes.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>BRCA1/2 carriers must be referred to clinical genetics.</strong> Risk-reducing PBSO reduces ovarian cancer risk by &gt;80%. BRCA1: offer age 35–40. BRCA2: offer age 40–45.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Never biopsy an ovarian mass percutaneously</strong> — risk of peritoneal seeding and upstaging. Diagnosis is always surgical.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>COCP is the most powerful modifiable protective factor.</strong> 5 years of use reduces lifetime risk by ~50%. Protection persists decades after stopping. The mechanism: fewer ovulatory cycles = fewer opportunities for malignant transformation at the surface epithelium.<span class="n-pearl-exam">Exam loves this — protective in a contraceptive question.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>PARP inhibitors work by synthetic lethality.</strong> BRCA1/2-mutated cells use PARP for single-strand DNA repair. Inhibit PARP → double-strand breaks accumulate → BRCA-deficient cells can't repair → cell death. Olaparib as maintenance post-chemo dramatically improves PFS in BRCA-mutated HGSC.<span class="n-pearl-exam">Mechanism question favourite.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>CA-125 is normal in up to 50% of Stage I ovarian cancers</strong> — and often normal in mucinous tumours. It monitors treatment response and detects recurrence. A rising CA-125 in remission predicts relapse by 3–6 months. It is NOT a screening test — poor specificity (raised in endometriosis, fibroids, PID, pregnancy).<span class="n-pearl-exam">This trips up students every time.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Granulosa cell tumours secrete oestrogen</strong> — leading to postmenopausal bleeding, endometrial hyperplasia, or precocious puberty in girls. Marker is inhibin B, not CA-125. They have a late recurrence pattern — can relapse 10–20 years after initial treatment.<span class="n-pearl-exam">Non-epithelial tumour question — always about the oestrogen effect.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Borderline tumours have no stromal invasion</strong> — low malignant potential, excellent prognosis. Fertility-sparing surgery (unilateral salpingo-oophorectomy) is appropriate in young women. No routine chemotherapy. But they can recur and rarely transform to invasive cancer — long-term follow-up required.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Optimal cytoreduction (R0) is the most important surgical goal.</strong> Residual disease &gt;1cm significantly worsens overall survival. This is why ovarian cancer surgery is performed only in specialist centres — it often involves bowel resection, diaphragm stripping, and multi-visceral resection to achieve R0.<span class="n-pearl-exam">Explains why subspecialty referral matters clinically and on the exam.</span></div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">08</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">CA-125 is normal so ovarian cancer is excluded.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Normal CA-125 does not exclude ovarian cancer</strong> — particularly Stage I (50% normal) and mucinous type. In a woman with symptoms &gt;12×/month, normal CA-125 should prompt USS, not reassurance.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Ascites with an ovarian mass is probably benign — large benign cysts can cause ascites.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Ascites + ovarian mass = cancer until proven otherwise.</strong> Benign cysts do not cause ascites. Refer urgently. Don't wait for CA-125.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">She's 28, so this ovarian mass is almost certainly benign.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>In young women, check AFP, β-hCG, LDH, inhibin B</strong> — germ cell and sex cord tumours are more common in this age group. These are often highly treatable but need the right workup and markers.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Ovarian cancer is staged surgically, treated surgically,<br>and the goal is always <em>complete cytoreduction.</em><br>CA-125 monitors — it does not exclude.</div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;
NOTES.subfertility=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Reproductive</div>
  <div class="n-hero-title">Sub-<br><em>fertility</em></div>
  <div class="n-hero-sub">ICD N97 &nbsp;·&nbsp; Failure to conceive after 12 months — investigate both partners simultaneously</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">Definition</div><div class="n-snap-text">Failure to conceive after <strong>12 months</strong> of regular unprotected intercourse. Investigate earlier (6 months) if woman &gt;35 or known risk factor. 1 in 7 couples affected.</div></div><div class="n-snap-cell"><div class="n-snap-label">Causes</div><div class="n-snap-text"><strong>Male factor ~30%, ovulatory ~25%, tubal ~20%, unexplained ~25%.</strong> Male and female causes are equally common — never investigate one partner without the other.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Time-sensitive — female fertility declines sharply after 35. Many causes are treatable. <strong>Hydrosalpinx halves IVF success rates</strong> — must be treated before IVF cycles begin.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Initial Investigation — Both Partners at First Visit</span><span class="n-section-tag">never investigate sequentially</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Subfertility — causes and investigations</span><span class="n-viz-sub">Never investigate one partner without investigating both</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MALE ~30%</text>
      <text x="72" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Semen analysis</text>
      <text x="72" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Count · motility · morphology</text>
      <text x="72" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Azoospermia → genetics</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Repeat if abnormal</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">OVULATORY ~25%</text>
      <text x="227" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Day 21 progesterone</text>
      <text x="227" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">FSH · LH · AMH</text>
      <text x="227" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">PCOS most common cause</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Letrozole / FSH</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a2a"/>
      <text x="382" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TUBAL ~20%</text>
      <text x="382" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">HyCoSy / laparoscopy</text>
      <text x="382" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Post-PID · endometriosis</text>
      <text x="382" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Chlamydia serology first</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">IVF if bilateral block</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">UNEXPLAINED ~25%</text>
      <text x="537" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">All tests normal</text>
      <text x="537" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Expectant if &lt;35</text>
      <text x="537" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">IUI then IVF</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Age determines urgency</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">IVF / ICSI</text>
      <text x="690" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Stimulate → retrieve → transfer</text>
      <text x="690" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">NHS: ≤3 cycles if eligible</text>
      <text x="690" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">ICSI: single sperm injection</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Success ~40% at &lt;35</text>
    </svg>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">12 months trying + irregular periods + elevated LH:FSH ratio → think <em>PCOS</em> → letrozole for ovulation induction. But first: confirm semen analysis has been done.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Hydrosalpinx halves IVF success</div><div class="n-distractor-text"><strong>A hydrosalpinx found before IVF must be treated with salpingectomy before starting cycles.</strong> Not drainage — it refills. The toxic fluid reflux from a hydrosalpinx into the uterus halves implantation rates. This step is commonly missed.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Investigation Framework</span><span class="n-section-tag">systematic, simultaneous, both partners</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Female Partner</div>
      <div class="n-compare-row"><span class="n-compare-label">Ovulation</span><span><strong>Day 21 progesterone (&gt;30 nmol/L = ovulation confirmed)</strong> in a 28-day cycle. Adjust timing for cycle length (7 days before expected period)</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Ovarian reserve</span><span>AMH (anti-Müllerian hormone) — predicts response to stimulation. FSH + LH day 2–5. Antral follicle count on USS</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Tubal patency</span><span><strong>HyCoSy</strong> (hysterosalpingo-contrast sonography) or HSG or laparoscopy + dye test. Chlamydia serology first</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Uterine cavity</span><span>USS or SIS (saline infusion sonography) for polyps, fibroids, adhesions, septum</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Other</span><span>Prolactin, TFT (thyroid), BMI, rubella immunity, folic acid advice</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">Male Partner</div>
      <div class="n-compare-row"><span class="n-compare-label">Semen analysis</span><span><strong>First test — request at initial consultation.</strong> WHO criteria: volume &gt;1.5mL, count &gt;16M/mL, motility &gt;42%, morphology &gt;4%</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Repeat if abnormal</span><span>Two analyses minimum if first abnormal — 2–3 months apart. Single test insufficient</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Azoospermia</span><span>No sperm at all → FSH, LH, testosterone, karyotype, Y-chromosome microdeletion, testicular biopsy</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Severe OAT</span><span>Oligoasthenoteratospermia → ICSI is treatment of choice. Refer to reproductive medicine</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Lifestyle</span><span>Hot baths, cycling, smoking, anabolic steroids, alcohol all impair spermatogenesis</span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Management by Cause</span><span class="n-section-tag">matched to diagnosis</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">Ovulatory dysfunction (PCOS)</div>
  <div class="n-algo-body"><strong>Letrozole first-line</strong> (NICE — replaced clomifene). Higher live birth rates, lower multiple pregnancy risk, no anti-oestrogenic endometrial effect. All cycles require USS monitoring for OHSS risk. Metformin as adjunct in insulin-resistant women. FSH injections if letrozole fails.<span class="n-involve">Reproductive medicine clinic</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">Tubal factor</div>
  <div class="n-algo-body"><strong>IVF is first-line for tubal disease.</strong> Treat hydrosalpinx with salpingectomy before IVF. Tubal surgery may be appropriate for mild distal disease at specialist centres — but IVF is faster and usually more effective.<span class="n-involve">Reproductive medicine clinic</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Male factor</div>
  <div class="n-algo-body">Mild–moderate oligospermia: <strong>IUI (intrauterine insemination).</strong> Severe oligospermia or non-obstructive azoospermia: <strong>ICSI</strong> — single sperm injected directly into the egg under microscopy. Obstructive azoospermia: surgical sperm retrieval (PESA/TESE) + ICSI.<span class="n-involve">Reproductive medicine</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Unexplained subfertility</div>
  <div class="n-algo-body dark-body">Expectant management up to 2 years if woman &lt;35, all investigations normal. IUI × 3 cycles. Then IVF. <strong>Age is the most important variable</strong> — escalate faster in women &gt;35. Do not defer IVF past 38.<span class="n-involve">Reproductive medicine</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">OHSS — Ovarian Hyperstimulation Syndrome</span><span class="n-section-tag">the IVF complication to know</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Mild</div><div class="n-diag-content">Bloating, mild abdominal discomfort, nausea. Ovaries enlarged. Manage conservatively — analgesia, fluids, monitor. Resolves spontaneously.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Severe</div><div class="n-diag-content"><strong>Massive ascites, pleural effusion, haemoconcentration, thromboembolism, renal failure, electrolyte imbalance.</strong> Admit — IV albumin, anticoagulation, fluid management. Can be fatal.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Prevention</div><div class="n-diag-content"><strong>GnRH agonist trigger</strong> instead of hCG, <strong>embryo freeze-all strategy</strong> (defer transfer), cycle cancellation, or cabergoline (dopamine agonist — reduces VEGF). Risk factors: PCOS, young, low BMI, high AMH.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Hydrosalpinx before IVF = salpingectomy first.</strong> Do not proceed to IVF cycles with a known hydrosalpinx — toxic reflux halves implantation rates. This is not optional.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Woman &gt;38 with unexplained subfertility should not wait 2 years.</strong> Escalate to IVF faster. Age is the dominant prognostic factor — fertility declines sharply after 38.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Azoospermia on semen analysis requires urgent investigation.</strong> FSH, karyotype, Y-chromosome microdeletion, testosterone. Obstructive azoospermia (normal FSH) may be surgically correctable. Non-obstructive (raised FSH) may need donor sperm.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Letrozole has replaced clomifene as first-line ovulation induction in PCOS (NICE).</strong> Higher live birth rates, lower multiple pregnancy risk, no anti-oestrogenic effect on endometrium. Clomifene is no longer correct first-line.<span class="n-pearl-exam">Exam: candidates say clomifene. Wrong since NICE update.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Male factor accounts for 30% of subfertility — request semen analysis at the first appointment.</strong> Investigating only the woman is the most common error. Semen analysis is cheap, non-invasive, and changes management in 30% of couples.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Hydrosalpinx = salpingectomy before IVF.</strong> Toxic fluid reflux from a hydrosalpinx into the uterus halves IVF implantation rates. Never proceed to IVF cycles with an untreated hydrosalpinx.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>AMH predicts ovarian reserve and guides IVF stimulation dosing.</strong> Low AMH = poor responder = higher FSH dose needed. It does not predict fertility in natural conception — only response to stimulation.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Day 21 progesterone &gt;30 nmol/L confirms ovulation in a 28-day cycle.</strong> Adjust timing: sample 7 days before expected next period. A value of 16–30 is borderline — repeat in next cycle before concluding anovulation.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>OHSS risk is highest in PCOS women with high AMH undergoing IVF.</strong> Prevention: GnRH agonist trigger instead of hCG, freeze-all embryos, cabergoline. Severe OHSS with haemoconcentration carries VTE risk — anticoagulate.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">The female investigations are normal — male factor is unlikely.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Male factor accounts for 30% of subfertility — the single most common identifiable cause.</strong> Request semen analysis at the first consultation regardless of the female investigations.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Clomifene is first-line for ovulation induction in PCOS.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Letrozole is now first-line (NICE 2023).</strong> Higher live birth rates and lower multiple pregnancy risk. Clomifene has anti-oestrogenic effects on cervical mucus and endometrium that letrozole avoids.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Proceed to IVF with a hydrosalpinx — it won't affect the result.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Hydrosalpinx halves IVF success rates.</strong> Salpingectomy before IVF is mandatory. The toxic reflux fluid directly impairs endometrial receptivity and embryo implantation.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Never investigate one partner<br><em>without investigating both.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Abnormal liver function with elevated bile acids in pregnancy causing intense pruritus. Resolves after delivery. <strong>Bile acids ≥40 µmol/L</strong> carry significant fetal risk.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who gets it</div><div class="n-snap-text">~0.7% of pregnancies in UK. Higher incidence in South Asian and Scandinavian women. <strong>Recurs in 45–70% of subsequent pregnancies.</strong> Strong family history in first-degree relatives.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">The risk is entirely fetal: sudden unexplained stillbirth via bile-acid-induced cardiac arrhythmia. <strong>The mother feels terrible but is not in danger.</strong> Fetal risk correlates with bile acid level — mild ICP has low risk, severe ICP is a different disease.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">itch without rash, fetal risk, not maternal</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Obstetric cholestasis — bile acids and fetal risk</span><span class="n-viz-sub">The mother itches. The danger is entirely to the baby.</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MECHANISM</text>
      <text x="72" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">↓ Bile acid excretion</text>
      <text x="72" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Oestrogen impairs</text>
      <text x="72" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">hepatic bile transport</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Genetic susceptibility</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SYMPTOMS</text>
      <text x="227" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Palmar/plantar itch</text>
      <text x="227" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Worse at night</text>
      <text x="227" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">No rash (scratch marks only)</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">LFTs + bile acids</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a1a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DIAGNOSIS</text>
      <text x="382" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Bile acids &gt;19 µmol/L</text>
      <text x="382" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Mild 19–39 / Severe ≥40</text>
      <text x="382" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">ALT often elevated</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Fasting sample essential</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#8a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TREATMENT</text>
      <text x="537" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">UDCA + monitor</text>
      <text x="537" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Ursodeoxycholic acid</text>
      <text x="537" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Weekly bile acids + LFTs</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Relieves symptoms</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DELIVER</text>
      <text x="690" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">≥40 µmol/L → 35–37 wks</text>
      <text x="690" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Sudden stillbirth risk</text>
      <text x="690" y="91" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Cardiac arrhythmia mechanism</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Mild: offer IOL 38–40</text>
    </svg>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Third trimester + intense pruritus (especially palms and soles) + no rash + raised ALT or bile acids → think <em>obstetric cholestasis</em> → fasting bile acids + LFTs. Do not reassure without investigating.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">PUPPP has a rash. OC does not.</div><div class="n-distractor-text"><strong>PUPPP (pruritic urticarial papules of pregnancy) has a visible rash. OC does not.</strong> Scratch marks from excoriation may be present, but there is no primary rash in OC. If there is no rash but severe pruritus — especially palms and soles — investigate for OC regardless of LFT results. Bile acids can be elevated before LFTs become abnormal.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Diagnosis — What to Measure and When</span><span class="n-section-tag">fasting bile acids are the test</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Fasting bile acids</div><div class="n-diag-content"><strong>The definitive test. Must be fasting</strong> — postprandial levels are unreliable and will be elevated in all pregnant women after a meal. Diagnostic threshold: &gt;19 µmol/L. Severity: mild 19–39 µmol/L, severe ≥40 µmol/L, extreme ≥100 µmol/L. Risk of stillbirth rises steeply above 100 µmol/L.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">LFTs</div><div class="n-diag-content">ALT/AST elevated. <strong>ALP is not useful in pregnancy</strong> — it is normally elevated due to placental ALP production. Bilirubin may be mildly raised in severe cases. Check weekly alongside bile acids once diagnosis confirmed.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Exclude other causes</div><div class="n-diag-content">Hepatitis A/B/C serology, USS liver if ALT grossly elevated. Exclude pre-eclampsia (BP, urinalysis, platelets, urate). <strong>HELLP syndrome</strong> must be considered if platelets falling or haemolysis present. Acute fatty liver of pregnancy (AFLP) if unwell + hypoglycaemia + coagulopathy.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Common mistake</div><div class="n-diag-content">Reassuring a woman with normal LFTs but ongoing pruritus. <strong>Bile acids can be elevated with entirely normal LFTs.</strong> Always measure fasting bile acids in any symptomatic woman — do not rely on LFTs alone to exclude OC.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">UDCA — Mechanism & Evidence</span><span class="n-section-tag">treats the mother, not proven to save the baby</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">How UDCA works</div><div class="n-diag-content">Ursodeoxycholic acid is a hydrophilic bile acid that replaces toxic hydrophobic bile acids in the hepatic bile pool. It improves bile acid transport across the hepatocyte canalicular membrane, reduces serum bile acid levels, and decreases placental bile acid transfer to the fetus. <strong>Dose: 500mg BD (or 10–15 mg/kg/day).</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label">Clinical effect</div><div class="n-diag-content">Reduces maternal pruritus significantly and improves LFTs. Reduces serum bile acid levels. <strong>The PITCHES trial (2019) found no significant reduction in adverse perinatal outcomes</strong> with UDCA vs placebo — it does not definitively reduce stillbirth risk. Standard of care despite this — it improves maternal quality of life and may have benefit not captured by the trial.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Vitamin K</div><div class="n-diag-content">Cholestasis impairs fat-soluble vitamin absorption (A, D, E, K). <strong>Vitamin K deficiency → neonatal haemorrhagic disease.</strong> Offer oral vitamin K to mother if steatorrhoea or prolonged PT. Ensure newborn receives IM vitamin K at birth — routine in UK but especially important in OC.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Timing of Delivery — The Primary Intervention</span><span class="n-section-tag">delivery cures OC</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Mild OC (19–39 µmol/L)</div><div class="n-diag-content">Weekly bile acids + LFTs. CTG at each review. <strong>Offer IOL at 40 weeks</strong> (or from 38 weeks after discussion of risks/benefits). Low absolute fetal risk at this level.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Moderate OC (40–99 µmol/L)</div><div class="n-diag-content">Weekly monitoring. <strong>Offer IOL at 37–38 weeks.</strong> Significant fetal risk. Discuss risks of prematurity vs risk of stillbirth. Senior obstetrician involvement.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Severe OC (≥100 µmol/L)</div><div class="n-diag-content"><strong>Discuss IOL from 35–36 weeks.</strong> Individualize based on gestation, fetal wellbeing, and patient preference. Bile acids ≥100 µmol/L carry a substantial stillbirth risk — delivery outweighs prematurity risk from 35 weeks. Immediate senior review.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Why CTG doesn't help</div><div class="n-diag-content">The mechanism of fetal death in OC is thought to be a <strong>sudden bile-acid-induced cardiac arrhythmia</strong> — not progressive hypoxia. There is no preceding growth restriction, Doppler abnormality, or CTG change. A normal CTG provides false reassurance. Delivery timing is the only evidence-based fetal protective intervention.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags — Not OC</span><span class="n-section-tag">these are different, more dangerous diagnoses</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Bile acids ≥100 µmol/L = urgent senior review and discussion of early delivery.</strong> This is not mild OC — it carries substantial stillbirth risk. Do not manage as routine outpatient.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Pruritus + jaundice + RUQ pain + unwell = NOT OC.</strong> Think AFLP (acute fatty liver of pregnancy) or HELLP — both are obstetric emergencies requiring immediate delivery regardless of gestation.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>OC resolves within 2–4 weeks of delivery.</strong> If LFTs do not normalise postnatally, liver disease must be excluded — refer to hepatology. Persistent abnormalities after 6 weeks are not OC.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">OC vs Other Causes of Itch</span><span class="n-section-tag">not all itch is the same</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr;">
    <div class="n-compare-head">Feature</div><div class="n-compare-head">Obstetric Cholestasis</div><div class="n-compare-head">Other Causes of Itch in Pregnancy</div>
    <div class="n-compare-row-label">Itch pattern</div><div class="n-compare-cell">Palms and soles, worsens at night, no rash</div><div class="n-compare-cell">PUPPP: urticarial rash on abdomen; PG: blistering rash</div>
    <div class="n-compare-row-label">Bile acids</div><div class="n-compare-cell">Raised (&gt;10 µmol/L = OC; &gt;40 = severe)</div><div class="n-compare-cell">Normal</div>
    <div class="n-compare-row-label">LFTs</div><div class="n-compare-cell">Often raised (ALT/AST); bilirubin may be raised</div><div class="n-compare-cell">Normal</div>
    <div class="n-compare-row-label">Fetal risk</div><div class="n-compare-cell">Stillbirth, meconium-stained liquor, preterm birth — risk rises with bile acid level</div><div class="n-compare-cell">None significant</div>
    <div class="n-compare-row-label">Delivery timing</div><div class="n-compare-cell">Bile acids &lt;40: 38–39 weeks. &gt;40: 35–36 weeks (individualise)</div><div class="n-compare-cell">Term</div>
    <div class="n-compare-row-label">Treatment</div><div class="n-compare-cell">UDCA (ursodeoxycholic acid) — improves itch and bile acids. Vitamin K if prolonged.</div><div class="n-compare-cell">Emollients, antihistamines (PUPPP). Topical steroids (PG).</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">7</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Stillbirth in OC is sudden and unpredictable — CTG cannot reliably predict it.</strong> The mechanism is bile-acid-induced fetal cardiac arrhythmia, not chronic hypoxia. Delivery timing is the only effective intervention.<span class="n-pearl-exam">Exam loves this: candidates say CTG provides reassurance in OC.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>ALP is not a useful marker in OC.</strong> Normally elevated in the third trimester due to placental isoform. Rely on ALT, AST, and fasting bile acids. Using ALP to diagnose or monitor OC is a common error.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>OC recurs in 45–70% of subsequent pregnancies.</strong> Advise testing from 20 weeks in future pregnancies. Warn that oestrogen-containing oral contraceptives can trigger a biochemical recurrence — use progesterone-only or non-hormonal contraception.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>UDCA treats maternal symptoms but has not been proven to prevent stillbirth (PITCHES trial, 2019).</strong> Still used as standard of care — improves bile acid levels and quality of life. Delivery timing remains the primary fetal-protective strategy.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Fasting bile acids &gt;19 µmol/L = diagnostic.</strong> Postprandial samples are unreliable — all pregnant women will have elevated levels after eating. Always request fasting sample. Repeat if symptomatic but initial level normal.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>OC is associated with increased risk of preterm labour, meconium passage, and fetal distress in labour.</strong> Continuous CTG in labour is recommended. Meconium-stained liquor in a known OC pregnancy should be taken seriously.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">8</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A normal CTG in OC means the fetus is safe.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CTG does not predict sudden fetal death in obstetric cholestasis.</strong> The mechanism is an acute cardiac arrhythmia — not chronic hypoxia. A normal CTG does not negate the need for appropriately timed delivery.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">UDCA eliminates fetal risk — delivery can wait until 40 weeks regardless of bile acid level.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>UDCA has not been shown to reduce stillbirth risk (PITCHES 2019).</strong> Delivery timing is individualised by bile acid level. Severe OC (≥100 µmol/L) warrants discussion of delivery from 35 weeks — regardless of UDCA use.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal LFTs exclude obstetric cholestasis in a symptomatic woman.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Bile acids can be elevated with entirely normal LFTs.</strong> Always request fasting bile acids in any woman with unexplained pruritus in pregnancy. Do not rely on LFTs alone.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">The mother itches.<br>The danger is entirely <em>to the baby.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Endometrial cancer — oestrogen, endometrium, and alarm symptoms</span>
      <span class="n-viz-sub">Postmenopausal bleeding is cancer until you prove otherwise</span>
    </div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TYPE I
80%</text>
      <text x="72" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="72" dy="0">Endometrioid</tspan><tspan x="72" dy="16">Low Grade</tspan></text>
      <text x="72" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Oestrogen-driven</text>
      <text x="72" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Obesity · PCOS · tamoxifen</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Good prognosis</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TYPE II
20%</text>
      <text x="227" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="227" dy="0">Serous /</tspan><tspan x="227" dy="16">Clear Cell</tspan></text>
      <text x="227" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Oestrogen-independent</text>
      <text x="227" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Aggressive — p53 mut</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Disproportionate deaths</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a2a"/>
      <text x="382" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SYMPTOM</text>
      <text x="382" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="382" dy="0">PMB —</tspan><tspan x="382" dy="16">Refer in 2wks</tspan></text>
      <text x="382" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">90% present with PMB</text>
      <text x="382" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Premenopause: IMB / HMB</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Alarm symptom = early Dx</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">DIAGNOSE</text>
      <text x="537" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="537" dy="0">TVS + Pipelle</tspan><tspan x="537" dy="16">or Hysteroscopy</tspan></text>
      <text x="537" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">ET >4mm = investigate</text>
      <text x="537" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Pipelle 70% sensitivity</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Hysteroscopy gold std</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="26" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TREATMENT</text>
      <text x="690" y="44" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800"><tspan x="690" dy="0">TAH + BSO</tspan><tspan x="690" dy="16">± Lymph nodes</tspan></text>
      <text x="690" y="74" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Stage I: surgery curative</text>
      <text x="690" y="89" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Stage III+: adjuvant RT</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">5yr survival 75–80%</text>
    </svg>
  </div>

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
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">FIGO Staging & Treatment</span><span class="n-section-tag">surgery is the foundation</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
    <div class="n-compare-head">Stage</div><div class="n-compare-head">Extent</div><div class="n-compare-head">Treatment</div><div class="n-compare-head">5yr survival</div>
    <div class="n-compare-row-label">Stage I</div><div class="n-compare-cell">Confined to uterus (IA: &lt;50% myometrial invasion; IB: &gt;50%)</div><div class="n-compare-cell">Total hysterectomy + BSO ± vault brachytherapy</div><div class="n-compare-cell">~85–95%</div>
    <div class="n-compare-row-label">Stage II</div><div class="n-compare-cell">Involves cervical stroma</div><div class="n-compare-cell">Radical hysterectomy + radiotherapy</div><div class="n-compare-cell">~75%</div>
    <div class="n-compare-row-label">Stage III</div><div class="n-compare-cell">Beyond uterus: adnexa, vagina, nodes</div><div class="n-compare-cell">Surgery + chemo + radiotherapy</div><div class="n-compare-cell">~50%</div>
    <div class="n-compare-row-label">Stage IV</div><div class="n-compare-cell">Bladder/bowel or distant mets</div><div class="n-compare-cell">Palliative chemotherapy ± hormonal</div><div class="n-compare-cell">~15%</div>
    <div class="n-compare-row-label">Type I</div><div class="n-compare-cell">Endometrioid — oestrogen-driven, well differentiated</div><div class="n-compare-cell">Most common (80%) — good prognosis. Lynch syndrome if young.</div><div class="n-compare-cell">Generally good</div>
    <div class="n-compare-row-label">Type II</div><div class="n-compare-cell">Serous, clear cell — not oestrogen-driven</div><div class="n-compare-cell">Aggressive; chemo + surgery. TP53 mutation.</div><div class="n-compare-cell">Poor — presents late</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">6</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Endometrial thickness ≤4mm in a postmenopausal woman not on HRT has a &gt;99% negative predictive value for cancer.</strong> This is the threshold for reassurance — not 5mm. For women on HRT, the threshold does not apply; biopsy is required.<span class="n-pearl-exam">Exam loves this: candidates use 5mm as a universal threshold.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Type II endometrial cancer (serous, clear cell)</strong> is oestrogen-independent, occurs in older atrophic endometrium, and carries a poor prognosis. It represents 20% of cases but a disproportionate share of deaths. Adjuvant chemotherapy is standard regardless of stage.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Obesity is the most important modifiable risk factor.</strong> Each 5 kg/m² increase in BMI increases endometrial cancer risk by 50%. Adipose tissue converts androgens to oestrone via aromatase — peripheral oestrogen production drives endometrial hyperplasia without progesterone opposition.</div></div>
      <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Lynch syndrome causes endometrial cancer before colorectal cancer in ~50% of affected women.</strong> Lynch (HNPCC) mutations (MLH1, MSH2, MSH6, PMS2) increase lifetime endometrial cancer risk to 40–60%. Any woman &lt;50 with endometrial cancer, or a family history of Lynch-associated cancers (colorectal, ovarian, gastric, urinary), should be referred for genetic testing. MMR immunohistochemistry should be routine on all resected endometrial cancers.<span class="n-pearl-exam">The young woman with endometrial cancer question — always consider Lynch.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Fertility-sparing management is possible in Stage IA, Grade 1, ER-positive disease in young women.</strong> High-dose progestogens (medroxyprogesterone or Mirena IUS) can achieve complete response in carefully selected women who wish to conceive. This requires MDT review, endometrial sampling every 3–6 months, and completion of family as soon as possible. Not appropriate for Type II cancers or deep myometrial invasion.<span class="n-pearl-exam">The "young woman wanting children with stage IA EC" vignette.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Postmenopausal bleeding = endometrial cancer until proven otherwise.</strong> Endometrial thickness ≤4mm on TVUSS in a postmenopausal woman (not on HRT) has &gt;99% NPV for cancer. But any thickness &gt;4mm, or persistent symptoms despite thin endometrium, requires pipelle biopsy or hysteroscopy. Never discharge on USS alone if symptoms persist.</div></div>
</div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">8</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
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
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Postmenopausal bleeding<br><em>is cancer until you prove otherwise.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES.urinaryincontinence=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Urogynaecology</div>
  <div class="n-hero-title">Urinary<br><em>Incontinence</em></div>
  <div class="n-hero-sub">Stress · Urgency · Overflow · Mixed · The mechanism determines everything</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">Stress UI</div><div class="n-snap-text">Sphincter weakness — leaks on cough, sneeze, exercise. Pelvic floor muscle training first. Surgery only after conservative failure.</div></div><div class="n-snap-cell"><div class="n-snap-label">Urgency UI / OAB</div><div class="n-snap-text">Detrusor overactivity — sudden urge, can't defer. Bladder training first. Anticholinergics or mirabegron second-line.</div></div><div class="n-snap-cell"><div class="n-snap-label">Overflow UI</div><div class="n-snap-text">Chronic urinary retention with overflow dribbling. Often missed. <strong>Check post-void residual in all UI.</strong> Cause: obstruction, neurological, anticholinergic drugs.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Four Types — Mechanism Determines Treatment</span><span class="n-section-tag">get the type right before treating</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Urinary incontinence — mechanism determines treatment</span><span class="n-viz-sub">Stress and urgency are different diseases with different treatments</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="182" height="180" rx="2" fill="#1a3a2a"/>
      <text x="91" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">STRESS UI</text>
      <text x="91" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Sphincter weakness</text>
      <text x="91" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Leak on cough/sneeze/exercise</text>
      <text x="91" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Childbirth · prolapse</text>
      <text x="91" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">PFMT × 3 months first</text>
      <text x="91" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">TVT if conservative fails</text>
      <rect x="193" y="0" width="182" height="180" rx="2" fill="#2a3a5a"/>
      <text x="284" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">URGENCY UI / OAB</text>
      <text x="284" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Detrusor overactivity</text>
      <text x="284" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Sudden urge, can't defer</text>
      <text x="284" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Frequency · nocturia</text>
      <text x="284" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Bladder training first</text>
      <text x="284" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Anticholinergic / mirabegron</text>
      <rect x="386" y="0" width="182" height="180" rx="2" fill="#3a3a2a"/>
      <text x="477" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">OVERFLOW UI</text>
      <text x="477" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Retention + overflow</text>
      <text x="477" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Dribbling, incomplete voiding</text>
      <text x="477" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">PVR &gt;150 mL</text>
      <text x="477" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Treat cause · catheterise</text>
      <text x="477" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Never anticholinergics</text>
      <rect x="579" y="0" width="181" height="180" rx="2" fill="#4a2a3a"/>
      <text x="669" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MIXED UI</text>
      <text x="669" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Both components</text>
      <text x="669" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Treat dominant type first</text>
      <text x="669" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Reassess after treatment</text>
      <text x="669" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Very common postmenopause</text>
      <text x="669" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Combined approach</text>
    </svg>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Leakage on coughing/sneezing/exercise → stress UI → PFMT first. Sudden urge, can't make it → urgency UI → bladder training first. Dribbling + high post-void residual → overflow UI → investigate cause, catheterise, never anticholinergics.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Assessment</span><span class="n-section-tag">history + bladder diary + PVR before any treatment</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row">
      <span class="n-viz-title">Urinary incontinence — diagnostic pathway</span>
      <span class="n-viz-sub">Post-void residual separates overflow from other types</span>
    </div>
    <svg viewBox="0 0 760 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="760" height="130" rx="3" fill="#1a1a2e"/>
      <rect x="10" y="20" width="130" height="90" rx="2" fill="rgba(255,255,255,.07)"/>
      <text x="75" y="42" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">HISTORY</text>
      <text x="75" y="62" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Stress vs urge?</text>
      <text x="75" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Frequency, nocturia</text>
      <text x="75" y="90" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Bladder diary 3 days</text>
      <path d="M142 65 L160 65" stroke="rgba(255,255,255,.3)" stroke-width="1.5" stroke-dasharray="3,2"/>
      <rect x="162" y="20" width="140" height="90" rx="2" fill="rgba(255,255,255,.07)"/>
      <text x="232" y="42" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">EXAMINATION</text>
      <text x="232" y="62" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Pelvic floor strength</text>
      <text x="232" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Prolapse assessment</text>
      <text x="232" y="90" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Stress test (cough)</text>
      <path d="M304 65 L322 65" stroke="rgba(255,255,255,.3)" stroke-width="1.5" stroke-dasharray="3,2"/>
      <rect x="324" y="20" width="140" height="90" rx="2" fill="rgba(255,255,255,.07)"/>
      <text x="394" y="42" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">INVESTIGATIONS</text>
      <text x="394" y="62" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">MSU (exclude UTI)</text>
      <text x="394" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Post-void residual USS</text>
      <text x="394" y="90" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">PVR &gt;150mL = overflow</text>
      <path d="M466 65 L484 65" stroke="rgba(255,255,255,.3)" stroke-width="1.5" stroke-dasharray="3,2"/>
      <rect x="486" y="20" width="140" height="90" rx="2" fill="rgba(200,69,42,.12)"/>
      <text x="556" y="42" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">URODYNAMICS</text>
      <text x="556" y="62" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Before surgery only</text>
      <text x="556" y="76" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Confirms type + severity</text>
      <text x="556" y="90" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.8)" text-anchor="middle">Not routine for conservative Rx</text>
      <rect x="638" y="20" width="112" height="90" rx="2" fill="rgba(255,255,255,.04)"/>
      <text x="694" y="52" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.5)" text-anchor="middle">Haematuria → cystoscopy</text>
      <text x="694" y="66" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.5)" text-anchor="middle">Neurological signs → MRI</text>
      <text x="694" y="80" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(200,69,42,.8)" text-anchor="middle">Red flags → don't wait</text>
    </svg>
  </div>

  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Bladder diary</div><div class="n-diag-content"><strong>3-day bladder diary before any treatment.</strong> Documents: frequency (normal &lt;8 voids/day), volumes, urgency episodes, nocturia (&gt;1/night = significant), leakage type (on exertion vs with urge). Identifies dominant UI type and functional bladder capacity.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Post-void residual (PVR)</div><div class="n-diag-content">Bladder scan after voiding. <strong>PVR &gt;150 mL = significant.</strong> Overflow UI diagnosis. Contraindication to anticholinergic drugs. Causes: bladder outlet obstruction, detrusor underactivity, neurological (MS, diabetic autonomic neuropathy), anticholinergic drugs.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Urinalysis + MSU</div><div class="n-diag-content">Exclude UTI (exacerbates all UI types). <strong>Haematuria + urgency = cystoscopy to exclude bladder cancer before treating as OAB.</strong> Never attribute haematuria to OAB without investigation.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Urodynamics</div><div class="n-diag-content"><strong>Required before surgery — not before conservative treatment.</strong> Demonstrates: urodynamic stress incontinence (IAP rise + leakage, no detrusor contraction), detrusor overactivity (involuntary contraction during filling), voiding dysfunction. NICE: do not perform urodynamics before first-line conservative management.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Treatment Pathways</span><span class="n-section-tag">conservative before surgical — always</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Stress UI</div>
      <div class="n-compare-row"><span class="n-compare-label">1st line</span><span><strong>Supervised PFMT × 3 months minimum.</strong> At least 8 contractions, 3×/day. 70% improvement with supervised training. Must be supervised — unsupervised exercises have much lower efficacy</span></div>
      <div class="n-compare-row"><span class="n-compare-label">2nd line</span><span>Duloxetine (SNRI) — reduces leakage episodes by ~50%. Poor tolerability (nausea in 30%). Offer as adjunct or if PFMT fails and patient declines surgery</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Surgical</span><span><strong>Mid-urethral synthetic sling (TVT/TOT)</strong> — ~80% cure rate. Requires urodynamics first. Autologous fascial sling or colposuspension as alternatives. Patient counselled about mesh risks</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Urodynamics?</span><span>Mandatory before surgery. Not required before conservative treatment</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">Urgency UI / OAB</div>
      <div class="n-compare-row"><span class="n-compare-label">1st line</span><span><strong>Bladder training: 6-week programme,</strong> gradually extending voiding intervals. Combined with fluid advice (1.5L/day, reduce caffeine, avoid evening fluids). PFMT if mixed UI</span></div>
      <div class="n-compare-row"><span class="n-compare-label">2nd line</span><span>Anticholinergics: oxybutynin, tolterodine, solifenacin. Or <strong>mirabegron (β3-agonist) — preferred in elderly</strong> (fewer cognitive SE, does not cross BBB). Avoid oxybutynin in elderly</span></div>
      <div class="n-compare-row"><span class="n-compare-label">3rd line</span><span><strong>Botulinum toxin A</strong> (cystoscopic injection, lasts ~6 months). <strong>PTNS</strong> (percutaneous tibial nerve stimulation). <strong>Sacral neuromodulation</strong> for refractory cases</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Urodynamics?</span><span>Before 3rd-line treatments. Not required before bladder training or pharmacology</span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Overflow UI — Don't Miss It</span><span class="n-section-tag">the one that gets confused with the others</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Presentation</div><div class="n-diag-content">Continuous dribbling, sensation of incomplete emptying, frequent small voids, recurrent UTIs. PVR &gt;150 mL on bladder scan. <strong>Often misdiagnosed as urgency UI</strong> — giving anticholinergics makes it dramatically worse.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Causes</div><div class="n-diag-content">Bladder outlet obstruction (prolapse, post-surgical), detrusor underactivity (neurological — MS, diabetes, spinal cord), iatrogenic (anticholinergic drugs, opiates), chronic urinary retention from any cause.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Treatment</div><div class="n-diag-content">Treat the underlying cause. <strong>Clean intermittent self-catheterisation (CISC)</strong> for detrusor underactivity. Catheterise acutely for large residuals. <strong>Absolute contraindication to anticholinergic drugs.</strong> Refer to urology/urogynaecology.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Haematuria + urinary symptoms = bladder cancer until proven otherwise.</strong> Do not attribute haematuria to UI. Urgent cystoscopy is required to exclude transitional cell carcinoma.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Overflow incontinence in a young woman = think neurological.</strong> Absent detrusor contractions, high post-void residual, painless dribbling — consider MS, spinal cord compression, or cauda equina syndrome. Check perianal sensation and anal tone.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Occult stress incontinence hidden by prolapse.</strong> Reduce the prolapse digitally and repeat the stress cough test — stress UI may only become apparent once the prolapse is reduced. Repair prolapse without addressing UI and the patient will have new post-op leakage.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Antimuscarinics in elderly patients: falls and cognitive impairment.</strong> Anticholinergic burden from oxybutynin causes confusion and falls. Prefer mirabegron (β3-agonist) in older patients — no central anticholinergic effects.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Urodynamics before surgery — not before conservative treatment.</strong> NICE is explicit: start PFMT for stress UI and bladder training for urgency UI without urodynamics. Urodynamics before conservative treatment is incorrect.<span class="n-pearl-exam">Exam: when are urodynamics indicated?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Oxybutynin in elderly women = cognitive impairment.</strong> Anticholinergic burden — crosses blood-brain barrier, causes confusion, memory impairment, increased dementia risk with long-term use. Use mirabegron (β3-agonist) instead — does not cross BBB.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>High post-void residual + anticholinergic prescription = acute urinary retention.</strong> Always check PVR before prescribing anticholinergics. Overflow UI mimics urgency UI — the treatment for one is catastrophic for the other.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Haematuria + urgency ≠ OAB until bladder cancer excluded.</strong> Cystoscopy and upper tract imaging first. Never attribute haematuria to overactive bladder without investigation — bladder cancer is the diagnosis not to miss.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Mid-urethral sling (TVT) is restricted to specialist centres in the UK.</strong> Following the mesh scandal, all transvaginal mesh procedures require detailed counselling about risks (mesh exposure, chronic pain, dyspareunia) and must be performed by surgeons on the NHS mesh registry.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Supervised PFMT achieves ~70% improvement in stress UI.</strong> The critical word is supervised — physiotherapist-led, with real-time feedback. Women given leaflets with exercises at home have significantly worse outcomes. Always refer to a specialist continence physiotherapist.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Patient has urgency and frequency — prescribe oxybutynin and review in 6 weeks.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Check PVR first.</strong> Urgency UI and overflow UI look identical in history. Prescribing anticholinergics to a patient with overflow incontinence causes acute urinary retention. Always bladder scan before prescribing.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Surgery is the most effective treatment for stress UI — offer it early to motivated patients.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Supervised PFMT achieves ~70% improvement and must precede surgery.</strong> Surgery before an adequate conservative trial is not appropriate. Urodynamics must be performed before any surgical intervention.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Haematuria in a woman with OAB — treat the OAB, the haematuria is likely related.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Haematuria must be investigated before attributing it to OAB.</strong> Bladder cancer can present with urgency and haematuria. Cystoscopy + upper tract imaging first. OAB does not cause haematuria.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">The mechanism determines the treatment.<br><em>Check PVR before prescribing anything.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES.contraception=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Reproductive</div>
  <div class="n-hero-title">Contra-<br><em>ception</em></div>
  <div class="n-hero-sub">ICD Z30 &nbsp;·&nbsp; UKMEC · Pearl index · The most effective methods are the least offered</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">What is it</div><div class="n-snap-text">Prevention of pregnancy. Effectiveness measured by <strong>Pearl index</strong> (pregnancies per 100 woman-years with perfect use). UKMEC categories 1–4 classify medical eligibility for each method.</div></div><div class="n-snap-cell"><div class="n-snap-label">Who needs counselling</div><div class="n-snap-text">Any woman of reproductive age. Most contraceptive failures are due to <strong>non-compliance and incorrect use</strong> — not method failure. LARC eliminates user error entirely.</div></div><div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">LARC methods (implant, IUS, IUD, injectable) are the most effective and cost-efficient NHS interventions. <strong>They are the least frequently offered.</strong> Method choice must be individualised — not defaulted to the pill.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Efficacy Hierarchy</span><span class="n-section-tag">Pearl index — lower is better</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Contraception — efficacy by method</span><span class="n-viz-sub">Pearl index: pregnancies per 100 woman-years (perfect use)</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">MOST EFFECTIVE</text>
      <text x="72" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">IUD · IUS · Implant</text>
      <text x="72" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Pearl index &lt;1</text>
      <text x="72" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">No user error possible</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">LARC — always offer first</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">INJECTABLE</text>
      <text x="227" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">DMPA / Sayana Press</text>
      <text x="227" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Pearl index &lt;1</text>
      <text x="227" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Every 12–13 weeks</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Fertility delay up to 1 year</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a2a"/>
      <text x="382" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">EFFECTIVE</text>
      <text x="382" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">COCP / POP</text>
      <text x="382" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Pearl 0.1–0.3 (perfect)</text>
      <text x="382" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Pearl 9 (typical use)</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">User compliance essential</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">BARRIER</text>
      <text x="537" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Condoms / diaphragm</text>
      <text x="537" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Condom: only STI protection</text>
      <text x="537" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Pearl index 2–18</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Correct use essential</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">EMERGENCY</text>
      <text x="690" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Cu-IUD / EC pill</text>
      <text x="690" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Cu-IUD most effective</text>
      <text x="690" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">UPA within 120h</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">LNG within 72h</text>
    </svg>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Woman with <strong>migraine with aura</strong> requesting contraception → POP, implant, or IUS — never COCP. Oestrogen + aura = UKMEC 4. Absolute contraindication.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">UKMEC Categories</span><span class="n-section-tag">the eligibility framework</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">UKMEC 1</div><div class="n-diag-content">No restriction. Method can be used freely. Example: healthy young woman with no risk factors.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">UKMEC 2</div><div class="n-diag-content">Advantages generally outweigh risks — can use with caution and monitoring. Example: COCP in migraine without aura, uncomplicated diabetes, BMI 30–35.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">UKMEC 3</div><div class="n-diag-content">Risks generally outweigh advantages — use only if no acceptable alternative and with specialist guidance. Example: COCP in migraine with aura, hypertension 140–159/90–99, smoking ≥35 years, BMI &gt;35.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">UKMEC 4</div><div class="n-diag-content"><strong>Unacceptable health risk — do not use under any circumstances.</strong> COCP: migraine with aura, current breast cancer, DVT/PE on anticoagulation, ischaemic heart disease, BP &gt;160/100, smoker &gt;35 with &gt;15 cigarettes/day.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">COCP vs POP — Key Differences</span><span class="n-section-tag">the migraine rule is critical</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">COCP (Combined Pill)</div>
      <div class="n-compare-row"><span class="n-compare-label">Hormones</span><span>Oestrogen + progestogen — inhibits ovulation, thickens mucus, thins endometrium</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Key CI (UKMEC 4)</span><span><strong>Migraine with aura, active VTE/PE, breast cancer, BP &gt;160/100, smoker &gt;35 (&gt;15/day), ischaemic heart disease</strong></span></div>
      <div class="n-compare-row"><span class="n-compare-label">VTE risk</span><span>2–4× background risk. Higher with third-generation progestogens (desogestrel, gestodene) vs levonorgestrel</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Miss 2+ pills (week 1)</span><span>Use condoms for 7 days. Consider EC if UPSI in pill-free week or first week of pack</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Benefits</span><span>Reduces HMB, dysmenorrhoea, ovarian/endometrial cancer risk, acne, PMS</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">POP (Mini-Pill)</div>
      <div class="n-compare-row"><span class="n-compare-label">Hormones</span><span>Progestogen-only — desogestrel POP primarily inhibits ovulation. Older POPs mainly thicken mucus</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Key advantage</span><span><strong>Safe in most COCP contraindications:</strong> migraine with aura (UKMEC 2), breastfeeding, hypertension, smoker &gt;35, previous VTE</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Window</span><span><strong>Desogestrel POP: 12-hour window.</strong> Older POPs (levonorgestrel): 3-hour window. Know which one you're prescribing</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Side effects</span><span>Irregular bleeding, amenorrhoea (~20%), functional ovarian cysts. No oestrogen-related effects</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Only absolute CI</span><span>Current breast cancer (UKMEC 4). Severe liver disease</span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">LARC — Intrauterine and Implant</span><span class="n-section-tag">99%+ effective · first-line offer</span></div>
  <div class="n-algo">
    <div class="n-algo-row">
  <div class="n-algo-step s-first">IUS (Mirena / LNG-IUS)</div>
  <div class="n-algo-body">Progestogen-releasing. <strong>Dual benefit: contraception + treatment of HMB, dysmenorrhoea, endometrial protection on HRT.</strong> Amenorrhoea in ~50% after 12 months. Licensed 5–8 years. UKMEC 1 for most conditions.<span class="n-involve">Trained GP / community sexual health</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-fail">IUD (Copper coil)</div>
  <div class="n-algo-body">Non-hormonal — suitable when hormones are contraindicated. Effective 5–10 years. <strong>Also the most effective emergency contraception</strong> (≤5 days post-UPSI or 5 days post-predicted ovulation). Increases menstrual flow — avoid in women with HMB.<span class="n-involve">Trained GP / community sexual health</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-severe">Implant (Nexplanon)</div>
  <div class="n-algo-body">Single progestogen rod inserted subdermally in upper arm. Effective 3 years. Highest Pearl index (&lt;0.1) of all methods. <strong>Irregular bleeding is the main reason for removal (20% request removal).</strong> Safe in most conditions including migraine with aura.<span class="n-involve">Trained GP / community sexual health</span></div>
</div>
    <div class="n-algo-row">
  <div class="n-algo-step s-unstable">Injectable (DMPA/Sayana Press)</div>
  <div class="n-algo-body dark-body">Progestogen every 12–13 weeks. <strong>Fertility may take up to 12 months to return after stopping.</strong> Counsel about this delay before starting. Amenorrhoea common and beneficial for some women. Bone density decreases with prolonged use.<span class="n-involve">GP / nurse prescriber</span></div>
</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Emergency Contraception</span><span class="n-section-tag">time-critical — Cu-IUD is best</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Copper IUD (Cu-IUD)</div>
      <div class="n-compare-row"><span class="n-compare-label">Timing</span><span>Within <strong>5 days of UPSI</strong> or 5 days after predicted ovulation (can be calculated). Most effective EC available</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Efficacy</span><span>&gt;99% effective as EC. Failure rate &lt;0.1%</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Ongoing</span><span>Can remain as ongoing contraception (5–10 years). Convert unplanned need to long-term LARC</span></div>
      <div class="n-compare-row"><span class="n-compare-label">First-line if</span><span>Weight &gt;70kg, enzyme-inducing drugs, presenting at 72–120h, wants ongoing non-hormonal contraception</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">Oral EC</div>
      <div class="n-compare-row"><span class="n-compare-label">Ulipristal (ellaOne)</span><span>Within <strong>120 hours (5 days).</strong> More effective than LNG, especially days 3–5. Progesterone receptor modulator</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Levonorgestrel</span><span>Within <strong>72 hours.</strong> Efficacy drops substantially after 24h. Less effective if weight &gt;70kg — double dose</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Key interaction</span><span>Ulipristal inhibits progesterone-receptor — do not start POP or progestogen-based LARC for 5 days after taking it</span></div>
      <div class="n-compare-row"><span class="n-compare-label">After 72h</span><span><strong>If 72–120h post-UPSI: ulipristal or Cu-IUD — not levonorgestrel alone</strong></span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Migraine with aura + COCP = UKMEC 4. Absolute contraindication.</strong> Oestrogen in the context of aura increases ischaemic stroke risk. POP, implant, IUS, and injectable are all safe (UKMEC 2) in migraine with aura.<span class="n-pearl-exam">Exam: migraine classification determines the answer.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Enzyme-inducing drugs (rifampicin, carbamazepine, phenytoin, St John's Wort) reduce hormonal contraceptive effectiveness.</strong> CYP450 induction accelerates metabolism. Use Cu-IUD as ongoing non-hormonal contraception. Do not rely on increased pill dose.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Cu-IUD is the most effective emergency contraception (&gt;99%).</strong> Can be inserted up to 5 days after UPSI or 5 days after predicted ovulation. Always offer it — it's better than oral EC and provides ongoing contraception.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>After ulipristal (ellaOne) EC: wait 5 days before starting progestogen-based methods.</strong> Ulipristal competes with progesterone receptor — simultaneous use reduces efficacy of hormonal contraception. Use condoms in the interim.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Contraception is needed until 2 years after last period if under 50, and 1 year if over 50.</strong> FSH cannot reliably confirm menopause in women on hormonal contraception. Continue barrier or LARC until the natural endpoint.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>DMPA injectable delays return of fertility by up to 12 months.</strong> Counsel all women who may want pregnancy within the next year — injectable is inappropriate for them. Implant and IUS allow immediate return of fertility on removal.</div></div>
  </div>
</div></div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06b</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Migraine with aura + COCP = absolute contraindication (UKMEC 4).</strong> Oestrogen in the context of aura significantly increases ischaemic stroke risk. Prescribing COCP here is dangerous.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Enzyme-inducing drugs render hormonal contraception unreliable.</strong> Rifampicin, carbamazepine, phenytoin, St John's Wort — use Cu-IUD as the only reliable non-hormonal option.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>After ulipristal EC — wait 5 days before starting progestogen-based contraception.</strong> Ulipristal competes at the progesterone receptor. Use condoms for the 5-day window.</div></div>
  </div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Migraine is a contraindication to all hormonal contraception.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Migraine without aura: COCP is UKMEC 2 (usable with caution).</strong> Migraine with aura: COCP is UKMEC 4 (absolute contraindication). Progestogen-only methods are UKMEC 2 for migraine with aura — they can be used.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Levonorgestrel EC is equally effective across the full 72 hours.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Levonorgestrel loses efficacy substantially after 24h.</strong> At 49–72h, efficacy drops to ~58%. Beyond 72h: ulipristal or Cu-IUD only. If presenting between 72–120h, levonorgestrel alone is insufficient.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Start the POP immediately after taking ulipristal EC.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Wait 5 days before starting any progestogen-based method after ulipristal.</strong> Ulipristal is a progesterone receptor modulator — simultaneous use impairs both. Use condoms for the 5-day window.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">The most effective methods<br><em>are the least frequently offered.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES.sexuallytransmitted=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Infectious</div>
  <div class="n-hero-title">Sexually<br><em>Transmitted Infections</em></div>
  <div class="n-hero-sub">NAAT · Partner notification · Treatment tables · The prescription is never just the antibiotic</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">The rule</div><div class="n-snap-text">Most STIs are asymptomatic. Found by screening, not symptoms. <strong>Finding one STI = full STI screen for all.</strong> Co-infection is common.</div></div><div class="n-snap-cell"><div class="n-snap-label">Partner notification</div><div class="n-snap-text">Integral to management — not optional. Look-back periods: chlamydia/gonorrhoea = 6 months, syphilis = 3 months to 2 years (stage-dependent). Health advisors at GUM clinics manage this.</div></div><div class="n-snap-cell"><div class="n-snap-label">Gonorrhoea</div><div class="n-snap-text">Resistance is rising — <strong>oral antibiotics no longer recommended.</strong> First-line is ceftriaxone 1g IM. Always culture + NAAT. Never empirical ciprofloxacin.</div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">STI Treatment Table</span><span class="n-section-tag">one disease, one treatment, one look-back period</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">STIs — asymptomatic infection is the norm</span><span class="n-viz-sub">The prescription includes partner notification — every time</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a3a2a"/>
      <text x="72" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">CHLAMYDIA</text>
      <text x="72" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Silent infection</text>
      <text x="72" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Doxycycline 100mg BD × 7d</text>
      <text x="72" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">NAAT (swab or urine)</text>
      <text x="72" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Look-back: 6 months</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">PID · ectopic · infertility</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#2a3a5a"/>
      <text x="227" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">GONORRHOEA</text>
      <text x="227" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Resistance rising</text>
      <text x="227" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Ceftriaxone 1g IM stat</text>
      <text x="227" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">NAAT + culture both</text>
      <text x="227" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Look-back: 3 months</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">No oral agents — resistance</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a3a2a"/>
      <text x="382" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">SYPHILIS</text>
      <text x="382" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">3 stages + latent</text>
      <text x="382" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Benzathine pen G IM</text>
      <text x="382" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">TPPA + RPR serology</text>
      <text x="382" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Look-back: 3 months–2 years</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Notifiable disease</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#5a3a1a"/>
      <text x="537" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">HERPES (HSV)</text>
      <text x="537" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Lifelong latency</text>
      <text x="537" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Aciclovir 400mg TDS × 5d</text>
      <text x="537" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">PCR swab from ulcer</text>
      <text x="537" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">No cure — suppression option</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Neonatal risk at delivery</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#c8452a"/>
      <text x="690" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">BV / TRICH</text>
      <text x="690" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Metronidazole</text>
      <text x="690" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">BV: 400mg BD × 5d</text>
      <text x="690" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Trich: 400mg BD × 7d</text>
      <text x="690" y="140" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Trich: treat partners</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">BV: don't treat partners</text>
    </svg>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Partner Notification Look-Back Periods</span><span class="n-section-tag">the part candidates always forget</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Look-Back Periods (BASHH)</div>
      <div class="n-compare-row"><span class="n-compare-label">Chlamydia</span><span><strong>6 months</strong> — or last partner if &gt;6 months ago</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Gonorrhoea</span><span><strong>3 months</strong> — or last partner if &gt;3 months ago</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Syphilis (1°)</span><span><strong>3 months + duration of symptoms</strong></span></div>
      <div class="n-compare-row"><span class="n-compare-label">Syphilis (2°)</span><span><strong>6 months + duration of symptoms</strong></span></div>
      <div class="n-compare-row"><span class="n-compare-label">Syphilis (early latent)</span><span><strong>2 years</strong></span></div>
      <div class="n-compare-row"><span class="n-compare-label">Trichomonas</span><span>Most recent partner / current partner</span></div>
      <div class="n-compare-row"><span class="n-compare-label">BV</span><span>Partners do NOT need treating — BV is not sexually transmitted</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head">Who Notifies?</div>
      <div class="n-compare-row"><span class="n-compare-label">Patient referral</span><span>Patient informs their own partners — most common method. Health advisor provides written notification card</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Provider referral</span><span>Health advisor contacts partners directly — used when patient unable or unwilling</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Contract referral</span><span>Patient given a time limit — if they don't notify, provider does</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Confidentiality</span><span>Index patient's identity is not disclosed to notified partners. Confidentiality is maintained</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Syphilis</span><span>Notifiable disease — report to UKHSA regardless of partner notification method</span></div>
    </div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Individual STIs — Key Clinical Points</span><span class="n-section-tag">what the exam actually tests</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Chlamydia</div><div class="n-diag-content">Most common bacterial STI in UK. Usually asymptomatic. <strong>Doxycycline 100mg BD × 7 days first-line</strong> (BASHH 2022 — azithromycin 1g stat is now second-line due to macrolide resistance concerns and treatment failure). Sequelae: PID, infertility, ectopic pregnancy, Fitz-Hugh-Curtis syndrome (perihepatitis).</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Gonorrhoea</div><div class="n-diag-content"><em>N. gonorrhoeae.</em> Purulent cervical discharge. Often co-infects with chlamydia. <strong>Ceftriaxone 1g IM stat — always.</strong> No oral agents due to widespread resistance. NAAT is diagnostic; culture needed for sensitivity testing. Test of cure at 2 weeks. Resistance is a public health emergency.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Syphilis</div><div class="n-diag-content"><em>T. pallidum.</em> Primary: painless indurated ulcer (chancre), heals spontaneously. Secondary: systemic — rash including <strong>palms and soles</strong>, condylomata lata, lymphadenopathy. Latent: asymptomatic. Tertiary: gummas, neurosyphilis, aortic aneurysm. <strong>Benzathine benzylpenicillin G IM.</strong> Notifiable.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Herpes (HSV)</div><div class="n-diag-content">Primary: painful vulval ulcers + systemic upset + urinary retention. Recurrences milder. Latent in dorsal root ganglia — no cure. <strong>Aciclovir 400mg TDS × 5 days.</strong> Suppressive therapy (aciclovir 400mg BD) for frequent recurrences (&gt;6/year) or to reduce transmission. Asymptomatic shedding causes most transmission.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">HPV / Warts</div><div class="n-diag-content">Low-risk HPV 6 and 11 cause condylomata acuminata (genital warts). High-risk HPV 16, 18 → CIN, cervical cancer, VIN, anal cancer. Treatment for warts: podophyllotoxin (self-applied), imiquimod, cryotherapy, excision. <strong>HPV vaccination (Gardasil-9) protects against 9 types including 6, 11, 16, 18.</strong> No treatment eradicates the virus — clearance is by immune response.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">BV vs Trichomonas</div><div class="n-diag-content">BV (<em>Gardnerella</em> overgrowth): thin grey-white discharge, <strong>fishy odour</strong> especially post-coital, pH &gt;4.5, clue cells. Not sexually transmitted — don't treat partners. Trichomonas (<em>T. vaginalis</em>, protozoan): frothy yellow-green discharge, strawberry cervix, vulvovaginal soreness. STI — treat partners. Both: metronidazole (BV 400mg BD × 5d, Trich 400mg BD × 7d).</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">STIs in Pregnancy — Special Considerations</span><span class="n-section-tag">fetal and neonatal risk</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Syphilis in pregnancy</div><div class="n-diag-content"><strong>Treat immediately with benzathine benzylpenicillin G — all trimesters.</strong> Untreated maternal syphilis: stillbirth, neonatal death, congenital syphilis (snuffles, rash, hepatosplenomegaly, saddle nose). Notifiable. Ensure partner treated. All women screened at booking in UK.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Herpes in third trimester</div><div class="n-diag-content">Primary HSV in third trimester: <strong>aciclovir suppression from 36 weeks + strongly consider CS at delivery.</strong> Active lesions at delivery = CS recommended (neonatal herpes encephalitis risk). Recurrent HSV with no active lesions at delivery: vaginal delivery generally safe.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Chlamydia in pregnancy</div><div class="n-diag-content">Causes neonatal conjunctivitis and pneumonia. <strong>Treat with azithromycin 1g stat</strong> (doxycycline is contraindicated in pregnancy). Test of cure 5–6 weeks after treatment. Screen at booking in high-risk women.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Gonorrhoea in pregnancy</div><div class="n-diag-content">Causes ophthalmia neonatorum (hyperacute neonatal conjunctivitis). <strong>Ceftriaxone 1g IM stat.</strong> Neonatal eye prophylaxis at delivery in high-risk women. Gonorrhoea is notifiable.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Gonorrhoea — oral antibiotics are no longer appropriate.</strong> Ciprofloxacin resistance is widespread. Ceftriaxone 1g IM is mandatory. Always send culture for sensitivity testing alongside NAAT.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Syphilis in pregnancy = treat immediately, all trimesters.</strong> Congenital syphilis is entirely preventable. UK screens all pregnant women at booking — missed diagnoses are a serious clinical governance failure.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Herpes primary in third trimester → aciclovir from 36 weeks + CS discussion.</strong> Neonatal herpes encephalitis has a high mortality. This window is narrow and decisions must be made promptly.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Partner notification is part of the prescription — not optional.</strong> Chlamydia: 6-month look-back. Gonorrhoea: 3 months. Syphilis: 3 months to 2 years depending on stage. Health advisors at GUM clinics manage this systematically.<span class="n-pearl-exam">Exam: candidates discharge without mentioning partner notification.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Doxycycline is first-line for chlamydia — not azithromycin 1g stat (BASHH 2022).</strong> Single-dose azithromycin has higher treatment failure rates. Doxycycline 100mg BD × 7 days achieves better eradication. Azithromycin is second-line if doxycycline is contraindicated.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>BV is not sexually transmitted — do not treat the partner.</strong> Lactobacillus disruption from multiple partners is associated, but BV is an ecological imbalance, not an infection passed between partners. Contrast with trichomonas (STI) — always treat the partner.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Syphilis rash involves palms and soles — no other common STI does this.</strong> Secondary syphilis rash is maculopapular, non-itchy, and generalised including the palms and soles. Classic exam vignette. Also: condylomata lata (flat warty lesions at mucosal surfaces) ≠ condylomata acuminata (HPV warts).</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Asymptomatic viral shedding causes most herpes transmission.</strong> The majority of HSV transmission occurs when the source partner has no symptoms and no visible lesions. Suppressive antiviral therapy reduces (but does not eliminate) transmission. Condoms further reduce but do not eliminate risk.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Finding one STI = full STI screen.</strong> NAAT for chlamydia and gonorrhoea, syphilis serology, HIV, hepatitis B and C. Co-infection is common. Treating chlamydia and discharging without a full screen is a missed opportunity and a quality failure.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Chlamydia — treat with azithromycin 1g stat, review in 2 weeks.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Doxycycline 100mg BD × 7 days is first-line (BASHH 2022).</strong> Azithromycin single dose has higher treatment failure rates due to macrolide resistance. Doxycycline is the correct answer on any post-2022 exam.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Gonorrhoea — prescribe ciprofloxacin 500mg orally as it's first-line.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Oral antibiotics for gonorrhoea are no longer recommended — widespread resistance.</strong> Ceftriaxone 1g IM stat is first-line. Always send culture for sensitivity. Empirical ciprofloxacin risks treatment failure and ongoing transmission.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Patient has BV — treat the patient and advise the partner to get checked.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>BV partners do not need treating.</strong> BV is not sexually transmitted — it is an ecological disruption of vaginal flora. Treating partners does not reduce recurrence. Contrast with trichomonas (STI) where simultaneous partner treatment is mandatory.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">Partner notification<br><em>is part of the prescription.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES.acutegynae=()=>`<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Gynaecology · Emergency</div>
  <div class="n-hero-title">Acute<br><em>Gynaecology</em></div>
  <div class="n-hero-sub">Torsion · TOA · Haemoperitoneum · The diagnoses where hours determine whether an ovary survives</div>
  <div class="n-snapshot"><div class="n-snap-cell"><div class="n-snap-label">Must not miss</div><div class="n-snap-text"><strong>Torsion and ruptured ectopic are surgical emergencies.</strong> Torsion: every hour risks infarction. Ectopic: haemodynamic collapse requires immediate theatre. Both can have a normal pregnancy test.</div></div><div class="n-snap-cell"><div class="n-snap-label">Torsion rule</div><div class="n-snap-text">Untwist the ovary even if it looks black. <strong>Up to 90% recover function after detorsion</strong> — visual appearance is unreliable. Oophorectomy based on appearance = unnecessary organ loss.</div></div><div class="n-snap-cell"><div class="n-snap-cell"><div class="n-snap-label">Doppler rule</div><div class="n-snap-text">Present Doppler flow does <strong>not</strong> exclude torsion. Partial torsion preserves flow. Clinical suspicion + adnexal mass = diagnostic laparoscopy regardless of Doppler.</div></div></div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Triage — The Acute Pelvic Pain Algorithm</span><span class="n-section-tag">β-hCG first, always</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Acute pelvic pain triage</span><span class="n-viz-sub">β-hCG is the first branch point — every time</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="144" height="180" rx="2" fill="#1a2a3a"/>
      <text x="72" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">STEP 1 ALWAYS</text>
      <text x="72" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">β-hCG</text>
      <text x="72" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Positive = ectopic</text>
      <text x="72" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">until excluded</text>
      <text x="72" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Never skip this step</text>
      <rect x="155" y="0" width="144" height="180" rx="2" fill="#c8452a"/>
      <text x="227" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">β-hCG POSITIVE</text>
      <text x="227" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Ectopic until proven otherwise</text>
      <text x="227" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Empty uterus on USS</text>
      <text x="227" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Adnexal mass ± free fluid</text>
      <text x="227" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Laparotomy if shocked</text>
      <rect x="310" y="0" width="144" height="180" rx="2" fill="#3a2a4a"/>
      <text x="382" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">β-hCG NEGATIVE</text>
      <text x="382" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Torsion · TOA · Cyst</text>
      <text x="382" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Sudden onset = torsion</text>
      <text x="382" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Fever + mass = TOA</text>
      <text x="382" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">USS + CRP + WCC</text>
      <rect x="465" y="0" width="144" height="180" rx="2" fill="#3a5a3a"/>
      <text x="537" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TORSION</text>
      <text x="537" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Laparoscopy now</text>
      <text x="537" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Detorsion even if black</text>
      <text x="537" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Doppler unreliable</text>
      <text x="537" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Time = ovary</text>
      <rect x="620" y="0" width="140" height="180" rx="2" fill="#5a3a1a"/>
      <text x="690" y="22" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1.5">TOA</text>
      <text x="690" y="46" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">IV antibiotics</text>
      <text x="690" y="68" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Drain if no response</text>
      <text x="690" y="83" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.72)" text-anchor="middle">Ruptured = laparotomy</text>
      <text x="690" y="158" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">High mortality if missed</text>
    </svg>
  </div>
  <div class="n-distractor-box"><div class="n-distractor-label">The appendicitis differential</div><div class="n-distractor-text">Right-sided pelvic pain in a woman of reproductive age — is it torsion, ectopic, appendicitis, or a ruptured cyst? <strong>β-hCG first always.</strong> Then USS. If USS inconclusive and appendicitis is possible, CT abdomen/pelvis. Diagnostic laparoscopy resolves the distinction and treats torsion simultaneously.</div></div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Ovarian Torsion</span><span class="n-section-tag">time is ovary</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Presentation</div><div class="n-diag-content">Sudden severe unilateral pelvic pain, often with nausea and vomiting (~70%). May be intermittent (partial torsion — the ovary twists and untwists). Low-grade fever if necrosis developing. Adnexal tenderness on bimanual. <strong>No pathognomonic signs.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label">USS + Doppler</div><div class="n-diag-content">Ovarian enlargement ± cyst ± free fluid. <strong>Absent Doppler supports torsion but present Doppler does not exclude it.</strong> Sensitivity of absent Doppler for torsion is only ~44%. Partial torsion preserves intermittent flow. Do not be falsely reassured.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Critical error</div><div class="n-diag-content">Waiting for Doppler to disappear before operating. Torsion is a clinical + USS diagnosis. <strong>High clinical suspicion + adnexal enlargement = diagnostic laparoscopy.</strong> Do not wait for radiological certainty.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Treatment</div><div class="n-diag-content"><strong>Laparoscopic detorsion — even if the ovary looks black or necrotic.</strong> Colour returns in up to 90% of visually compromised ovaries. Oophorectomy reserved for confirmed necrosis after detorsion + observation. Ovarian cystectomy if causative cyst. Oophoropexy considered for recurrence or contralateral torsion risk.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Tubo-Ovarian Abscess</span><span class="n-section-tag">PID gone wrong</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Presentation</div><div class="n-diag-content">Severe pelvic pain, high fever (&gt;38°C), cervical excitation, bilateral adnexal tenderness, palpable mass. Markedly elevated CRP and WCC. History of PID or unprotected intercourse. USS or CT: thick-walled complex adnexal collection.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Management</div><div class="n-diag-content">IV antibiotics: <strong>cefoxitin + doxycycline + metronidazole</strong> (BASHH regimen). If no improvement at 48–72 hours → image-guided drainage (USS or CT guided) or laparoscopic drainage/salpingo-oophorectomy.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Ruptured TOA</div><div class="n-diag-content"><strong>Ruptured TOA = surgical emergency.</strong> Sudden deterioration, peritonism, haemodynamic instability. Immediate laparotomy. Septic shock can develop within hours. High mortality if diagnosis delayed.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Haemoperitoneum — Ruptured Cyst</span><span class="n-section-tag">corpus luteum is the most common culprit</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Presentation</div><div class="n-diag-content">Sudden onset unilateral pain, often mid-cycle or post-coital. Free fluid on USS. <strong>Corpus luteal cyst is the most common cause.</strong> May be associated with anticoagulation or bleeding diathesis.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Management</div><div class="n-diag-content">Haemodynamically stable + small bleed: <strong>conservative management</strong> — analgesia, observation, repeat USS. Haemodynamically unstable or large haemoperitoneum: <strong>laparoscopy or laparotomy</strong> for haemostasis (ovarian cystectomy or diathermy).</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Rule out ectopic</div><div class="n-diag-content"><strong>β-hCG must be negative before diagnosing ruptured ovarian cyst.</strong> Ruptured ectopic and ruptured corpus luteum have identical presentations. Never assume haemoperitoneum in a woman of reproductive age is benign without excluding pregnancy.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Haemodynamic instability + acute pelvic pain = ruptured ectopic until proven otherwise.</strong> β-hCG + group and crossmatch + immediate senior review. Do not wait for USS if the patient is collapsing.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Torsion: every hour matters.</strong> Ovarian viability falls with time. Do not delay diagnostic laparoscopy if clinical suspicion is high — even with a normal Doppler.</div></div>
    <div class="n-flag-item legal"><span class="n-flag-icon legal-ic"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1" stroke="#786e64" stroke-width="1.2" fill="none"/><path d="M4 5h2M5 4v2" stroke="#786e64" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Negative β-hCG does not exclude ectopic in very early gestation.</strong> If clinical suspicion is high, serial β-hCG + repeat USS are required. Very early ectopics can have undetectable hCG on initial testing.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Acute Gynaecology — At a Glance</span><span class="n-section-tag">one table for the department</span></div>
  <div class="n-compare-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;">
    <div class="n-compare-head">Diagnosis</div><div class="n-compare-head">Key feature</div><div class="n-compare-head">Investigation</div><div class="n-compare-head">Immediate action</div>
    <div class="n-compare-row-label">Ectopic (ruptured)</div><div class="n-compare-cell">Amenorrhoea + shoulder tip pain + haemodynamic instability</div><div class="n-compare-cell">βhCG + TVUSS + FBC/G&amp;S</div><div class="n-compare-cell">IV access + laparotomy</div>
    <div class="n-compare-row-label">Ovarian torsion</div><div class="n-compare-cell">Sudden-onset unilateral pain + nausea + vomiting; intermittent</div><div class="n-compare-cell">USS (Doppler may be normal)</div><div class="n-compare-cell">Urgent laparoscopy — time-critical</div>
    <div class="n-compare-row-label">PID</div><div class="n-compare-cell">Bilateral pain + fever + cervical excitation + vaginal discharge</div><div class="n-compare-cell">Swabs, CRP, WBC; exclude ectopic first</div><div class="n-compare-cell">IV antibiotics if severe; admit</div>
    <div class="n-compare-row-label">Haemoperitoneum</div><div class="n-compare-cell">Ruptured corpus luteum cyst — sudden onset, right-sided, haemodynamic</div><div class="n-compare-cell">USS + βhCG (must exclude ectopic)</div><div class="n-compare-cell">Conservative if stable; surgery if unstable</div>
    <div class="n-compare-row-label">Fibroids (red degeneration)</div><div class="n-compare-cell">Localised uterine tenderness + pregnancy (14–22 weeks)</div><div class="n-compare-cell">USS — central necrosis on Doppler</div><div class="n-compare-cell">Analgesia + supportive care; not surgical</div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">7</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Detorsion even if the ovary looks black.</strong> Congestion and haemorrhage cause apparent infarction — colour returns after untwisting in ~90%. Intraoperative oophorectomy based on visual appearance alone is no longer appropriate.<span class="n-pearl-exam">Exam: candidate says ovary looked necrotic and was removed. Wrong.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Doppler flow does not exclude torsion.</strong> Sensitivity of absent Doppler is only ~44%. Partial or intermittent torsion preserves flow. Clinical suspicion + enlarged ovary = diagnostic laparoscopy regardless of Doppler.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>β-hCG is always the first investigation in acute pelvic pain.</strong> Ruptured ectopic and torsion/ruptured cyst look identical clinically. Never proceed to USS without knowing the β-hCG result first.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>TOA risk factors: PID, IUCD, immunosuppression.</strong> IUCD does not cause TOA directly but may be a nidus. Remove IUCD once IV antibiotics started if TOA confirmed — improves response to treatment.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Mittelschmerz is a diagnosis of exclusion.</strong> Mid-cycle, mild, unilateral, resolves in 24–48 hours. Any severe, persistent, or recurrent acute pain requires investigation to exclude torsion, ectopic, or ruptured cyst before attributing to ovulation.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Dermoid cyst is the most common cause of ovarian torsion.</strong> Heavy, eccentric mass creates a pendulum effect — predisposes to twisting. Other risk factors: ovulation induction (enlarged follicles), previous torsion, long utero-ovarian ligament.</div></div>
  </div>
</div><div class="n-section">
  <div class="n-section-header"><span class="n-section-num">8</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal Doppler flow excludes torsion — safe to observe.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Present Doppler does not exclude torsion.</strong> Sensitivity of absent Doppler is only ~44%. If clinical suspicion is high, proceed to diagnostic laparoscopy regardless of Doppler findings.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Black-looking ovary at laparoscopy = oophorectomy.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Detorsion first, observe for colour change, then decide.</strong> Up to 90% of visually compromised ovaries recover. Reserve oophorectomy for confirmed, irreversible necrosis after adequate observation post-detorsion.</div></div>
</div>
    <div class="n-trap">
  <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Pregnancy test negative — ectopic excluded, proceed to manage as torsion.</div></div>
  <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Very early ectopics can have undetectable β-hCG on urine dip.</strong> If clinical suspicion of ectopic remains, serum β-hCG is more sensitive. Serial measurements if equivocal. Do not rely solely on urine pregnancy test to exclude ectopic.</div></div>
</div>
  </div>
<div class="n-anchor"><div class="n-anchor-card"><span class="n-anchor-label">The one thing to remember</span><div class="n-anchor-text">β-hCG first. Always.<br><em>Untwist the ovary — even if it looks dead.</em></div></div></div><div class="n-note-end-cta" onclick="showVentPopup()">
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

