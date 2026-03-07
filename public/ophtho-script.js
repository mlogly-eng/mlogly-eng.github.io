// REVEAL
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); revealObs.unobserve(e.target); }});
}, {threshold:.08});
document.querySelectorAll('.reveal').forEach((el,i) => {
  const g = el.closest('.notes-grid');
  if(g){ const idx=Array.from(g.children).indexOf(el); if(idx>-1) el.style.transitionDelay=idx*.08+'s'; }
  revealObs.observe(el);
});

// ══ HIGHLIGHT SYSTEM ══
let hlHistory={}, _savedRange=null, _popupVisible=false;

function showHlPopup(rect){
  const popup=document.getElementById('hl-popup');
  const popW=210;
  let x=rect.left+rect.width/2-popW/2;
  let y=rect.top-54;
  x=Math.max(8,Math.min(x,window.innerWidth-popW-8));
  if(y<8) y=rect.bottom+8;
  popup.style.left=x+'px'; popup.style.top=y+'px';
  popup.classList.add('show'); _popupVisible=true;
}
function hideHlPopup(){ document.getElementById('hl-popup').classList.remove('show'); _popupVisible=false; }

function applyHlColor(color){
  if(!_savedRange){ hideHlPopup(); return; }
  const container=document.getElementById('mcontent');
  if(!container){ hideHlPopup(); return; }
  if(!hlHistory[currentNote]) hlHistory[currentNote]=[];
  hlHistory[currentNote].push(container.innerHTML);
  const range=_savedRange;
  const walk=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
  const toWrap=[];
  let node;
  while((node=walk.nextNode())){
    const nr=document.createRange(); nr.selectNodeContents(node);
    if(range.compareBoundaryPoints(Range.END_TO_START,nr)>=0) continue;
    if(range.compareBoundaryPoints(Range.START_TO_END,nr)<=0) continue;
    const start=(node===range.startContainer)?range.startOffset:0;
    const end=(node===range.endContainer)?range.endOffset:node.length;
    if(start>=end) continue;
    toWrap.push({node,start,end});
  }
  toWrap.forEach(({node,start,end})=>{
    try{
      if(end<node.length) node.splitText(end);
      const target=(start>0)?node.splitText(start):node;
      const mark=document.createElement('mark');
      mark.className='vent-hl'; mark.dataset.color=color;
      mark.addEventListener('click',function(e){e.stopPropagation();removeHighlight(this);});
      target.parentNode.insertBefore(mark,target); mark.appendChild(target);
    }catch(e){}
  });
  window.getSelection().removeAllRanges();
  _savedRange=null; hideHlPopup(); saveHighlights();
}

function removeHighlight(markEl){
  if(!hlHistory[currentNote]) hlHistory[currentNote]=[];
  hlHistory[currentNote].push(document.getElementById('mcontent').innerHTML);
  const p=markEl.parentNode;
  while(markEl.firstChild) p.insertBefore(markEl.firstChild,markEl);
  p.removeChild(markEl); saveHighlights();
}
function undoHighlight(){
  if(!hlHistory[currentNote]||!hlHistory[currentNote].length) return;
  document.getElementById('mcontent').innerHTML=hlHistory[currentNote].pop();
  reAttachMarkHandlers(); saveHighlights(); hideHlPopup();
}
function clearAllHighlights(){
  const c=document.getElementById('mcontent'); if(!c) return;
  if(!hlHistory[currentNote]) hlHistory[currentNote]=[];
  hlHistory[currentNote].push(c.innerHTML);
  c.querySelectorAll('mark.vent-hl').forEach(m=>{
    const p=m.parentNode;
    while(m.firstChild) p.insertBefore(m.firstChild,m);
    p.removeChild(m);
  });
  saveHighlights(); hideHlPopup();
}
function reAttachMarkHandlers(){
  document.querySelectorAll('#mcontent mark.vent-hl').forEach(m=>{
    m.addEventListener('click',function(e){e.stopPropagation();removeHighlight(this);});
  });
}
function saveHighlights(){
  try{
    const all=JSON.parse(localStorage.getItem('vent-hl-ophtho')||'{}');
    all[currentNote]=document.getElementById('mcontent').innerHTML;
    localStorage.setItem('vent-hl-ophtho',JSON.stringify(all));
  }catch(e){}
}
function loadHighlights(noteId){
  try{
    const all=JSON.parse(localStorage.getItem('vent-hl-ophtho')||'{}');
    if(all[noteId]){
      document.getElementById('mcontent').innerHTML=all[noteId];
      reAttachMarkHandlers();
    }
  }catch(e){}
}
document.addEventListener('mouseup',function(e){
  if(e.target.closest('#hl-popup')) return;
  setTimeout(()=>{
    const sel=window.getSelection();
    if(!sel||sel.isCollapsed||!sel.rangeCount){ hideHlPopup(); return; }
    const range=sel.getRangeAt(0);
    if(range.toString().trim()===''){hideHlPopup();return;}
    const container=document.getElementById('mcontent');
    if(!container||!container.contains(range.commonAncestorContainer)){hideHlPopup();return;}
    if(document.getElementById('page-mcq').style.display!=='none'){hideHlPopup();return;}
    _savedRange=range.cloneRange();
    showHlPopup(range.getBoundingClientRect());
  },20);
});
document.addEventListener('click',function(e){
  if(_popupVisible&&!e.target.closest('#hl-popup')) hideHlPopup();
});

// ══ FONT SIZE ══
const FONT_STEPS=[85,92,100,108,116,126,138];
let fontStepIndex=2;
function applyFontSize(){
  const pct=FONT_STEPS[fontStepIndex];
  document.getElementById('modal').style.fontSize=pct+'%';
  document.getElementById('font-size-display').textContent=pct+'%';
  try{localStorage.setItem('vent-fontsize-ophtho',fontStepIndex);}catch(e){}
}
function changeFontSize(dir){
  fontStepIndex=Math.max(0,Math.min(FONT_STEPS.length-1,fontStepIndex+dir));
  applyFontSize();
}
function loadFontSize(){
  try{const s=localStorage.getItem('vent-fontsize-ophtho');if(s!==null)fontStepIndex=parseInt(s);}catch(e){}
  applyFontSize();
}

// ══ BREATHE MODE ══
// breatheOn and nav/prefs state
const NOTE_ORDER_OPHTHO=['intro','eyelids','lacrimal','conjunctiva','lens','cataract','cornea','uveitis','refraction','glaucoma','retina','retdetach','dr','hr','vascular','orbit','opticnerve','tumours','pharmacology'];
const NOTE_NAMES={'intro':'Intro to Ophthalmology','eyelids':'Eyelids','lacrimal':'Lacrimal Apparatus','conjunctiva':'Conjunctiva','lens':'The Lens','cataract':'Cataracts','cornea':'Corneal Infections','uveitis':'Uveitis','refraction':'Refraction','glaucoma':'Glaucoma','retina':'The Retina','retdetach':'Retinal Detachment','dr':'Diabetic Retinopathy','hr':'Hypertensive Retinopathy','vascular':'Vascular Retinopathy','orbit':'The Orbit','opticnerve':'Optic Neuropathy','tumours':'Ocular Tumours','pharmacology':'Ocular Pharmacology'};
// Alias so breathe engine (which uses NOTE_ORDER) works
const NOTE_ORDER = NOTE_ORDER_OPHTHO;
const NOTE_NAMES_NAV = NOTE_NAMES;

function updateNavLabel(){
  const idx=NOTE_ORDER.indexOf(currentNote);
  const label=document.getElementById('mnav-label');
  if(label) label.textContent=(idx+1)+' / '+NOTE_ORDER.length+' · '+(NOTE_NAMES[currentNote]||currentNote);
  const prev=document.getElementById('btn-prev-note');
  const next=document.getElementById('btn-next-note');
  if(prev) prev.style.opacity=idx===0?'0.25':'1';
  if(next) next.style.opacity=idx===NOTE_ORDER.length-1?'0.25':'1';
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

// ── Session history ──
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
let breatheOn=false, bStart=null, bPaused=false, bCurIdx=0, bCyclesDone=0, bPhase='inhale';
let bPhTimer=null, bRafId=null, bSections=[], bTotal=0, bAtLast=false, bNextShown=false, bSessionSections=0;
const BCIRC=263.9;

function bPhaseDur(p){ if(p==='inhale')return PREFS.inhale*1000; if(p==='hold')return PREFS.hold*1000; return PREFS.exhale*1000; }

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
  if(!bScrollUnlocked && !breatheOn) return;
  if(!breatheOn){ vsResetSession(); bStart_(); }
  else bStop(true);
}

function bStart_(){
  const _heroEl=document.querySelector('#mcontent .n-hero-new');
  const _sectEls=Array.from(document.querySelectorAll('#mcontent .n-section'));
  bSections=_heroEl?[_heroEl,..._sectEls]:_sectEls;
  bTotal=bSections.length;
  if(bTotal===0) return;
  breatheOn=true; bStart=Date.now(); bPaused=false;
  bCurIdx=0; bCyclesDone=0; bAtLast=false; bNextShown=false; bSessionSections=0;
  document.getElementById('modal').classList.add('focus-mode');
  document.getElementById('modal').classList.add('breathe-active');
  document.getElementById('btn-breathe').classList.add('breathe-on');
  document.getElementById('breathe-btn-label').textContent='Breathing';
  document.getElementById('b-ring-wrap').classList.add('visible');
  document.getElementById('b-reading-bar').style.display='block';
  document.getElementById('b-nav').classList.add('visible');
  document.getElementById('b-spine').classList.add('visible');
  showNoteNav(); updateNavLabel();
  const spine=document.getElementById('b-spine'); spine.innerHTML='';
  bSections.forEach((_,i)=>{ const d=document.createElement('div'); d.className='b-sdot'; d.onclick=()=>{ if(breatheOn) bJumpTo(i); }; spine.appendChild(d); });
  bActivate(0); bStartPhase('inhale');
  const hint=document.getElementById('b-kbd-hint'); if(hint){ hint.classList.add('visible'); setTimeout(()=>hint.classList.remove('visible'),4000); }
}

function bStop(showSummary=false){
  const elapsed=bStart?Math.round((Date.now()-bStart)/1000):0;
  breatheOn=false; clearTimeout(bPhTimer); cancelAnimationFrame(bRafId);
  document.getElementById('modal').classList.remove('breathe-active','b-at-last');
  setTimeout(()=>{ document.getElementById('modal').classList.remove('focus-mode'); }, 400);
  document.getElementById('btn-breathe').classList.remove('breathe-on');
  document.getElementById('breathe-btn-label').textContent='Breathe';
  document.getElementById('b-ring-wrap').classList.remove('visible');
  document.getElementById('b-reading-bar').style.display='none';
  document.getElementById('b-reading-fill').style.width='0%';
  document.getElementById('b-nav').classList.remove('visible');
  document.getElementById('b-spine').classList.remove('visible');
  document.getElementById('b-next-bar').classList.remove('visible');
  const _kh=document.getElementById('b-kbd-hint'); if(_kh) _kh.classList.remove('visible');
  hideNoteNav();
  bSections.forEach(s=>s.classList.remove('b-active','b-was','b-hold'));
  bAtLast=false; bNextShown=false;
  const _bStart=bStart;
  bStart=null;
  if(_bStart && elapsed>0){
    const sess={ id:Date.now(), noteId:currentNote, topic:NOTE_NAMES[currentNote]||currentNote, duration:elapsed, sections:bSessionSections, feeling:null, date:new Date().toISOString() };
    bAddSession(sess);
    // Save breathe session to Supabase
    if(typeof saveBreatheSession === 'function') saveBreatheSession(currentNote);
    if(showSummary) setTimeout(()=>bShowSummary(sess),600);
  }
}

function bActivate(idx){
  if(idx<0||idx>=bSections.length) return;
  bSections.forEach((s,i)=>{ s.classList.remove('b-active','b-was','b-hold'); if(i<idx) s.classList.add('b-was'); });
  bSections[idx].classList.add('b-active');
  const modal=document.getElementById('modal');
  if(modal){
    const mbar=modal.querySelector('.mbar');
    const mbarH=mbar?mbar.offsetHeight:58;
    const el=bSections[idx];
    const modalRect=modal.getBoundingClientRect();
    const elRect=el.getBoundingClientRect();
    const elH=el.offsetHeight;
    const availH=modal.clientHeight-mbarH;
    const margin=32;
    const elTopInModal=elRect.top-modalRect.top-mbarH;
    let scrollTop;
    if(elH<=availH-margin*2) scrollTop=modal.scrollTop+elTopInModal-Math.floor((availH-elH)/2);
    else scrollTop=modal.scrollTop+elTopInModal-margin;
    modal.scrollTo({top:Math.max(0,scrollTop),behavior:'smooth'});
    modal.classList.toggle('b-at-last',(idx===bTotal-1));
  }
  document.querySelectorAll('#b-spine .b-sdot').forEach((d,i)=>{ d.className='b-sdot'+(i<idx?' b-done':i===idx?' b-active':''); });
  const fill=document.getElementById('b-reading-fill');
  if(fill) fill.style.width=(bTotal>1?(idx/(bTotal-1))*100:100)+'%';
  bCyclesDone=0; bSessionSections=Math.max(bSessionSections,idx+1);
  bAtLast=(idx===bTotal-1);
}

function bJumpTo(idx){ clearTimeout(bPhTimer); cancelAnimationFrame(bRafId); bCurIdx=idx; bActivate(idx); bStartPhase('inhale'); }
function bSkipFwd(){ if(!breatheOn||bPaused)return; clearTimeout(bPhTimer); cancelAnimationFrame(bRafId); bSections[bCurIdx]?.classList.remove('b-hold'); bAdvance(); }
function bSkipBack(){ if(!breatheOn||bPaused)return; clearTimeout(bPhTimer); cancelAnimationFrame(bRafId); bSections[bCurIdx]?.classList.remove('b-hold'); bCurIdx=Math.max(0,bCurIdx-1); bActivate(bCurIdx); bStartPhase('inhale'); }

function bAdvance(){ if(bCurIdx+1>=bTotal){ bOnLast(); return; } bCurIdx++; bActivate(bCurIdx); bStartPhase('inhale'); }

function bOnLast(){
  bAtLast=true; bCyclesDone=0; bStartPhase('inhale');
  const bar=document.getElementById('b-next-bar');
  if(!bar) return;
  const idx=NOTE_ORDER.indexOf(currentNote);
  const nextId=idx<NOTE_ORDER.length-1?NOTE_ORDER[idx+1]:null;
  const nextName=nextId?(NOTE_NAMES[nextId]||nextId):null;
  const goBtn=bar.querySelector('.b-next-go');
  const titleEl=document.getElementById('b-next-title');
  if(nextName){
    if(titleEl) titleEl.textContent=nextName;
    if(goBtn){ goBtn.textContent='Continue →'; goBtn.style.display=''; }
  } else {
    if(titleEl) titleEl.textContent='Last note — well done.';
    if(goBtn) goBtn.style.display='none';
  }
  bar.dataset.nextId=nextId||'';
  bar.classList.add('visible');
  bNextShown=true;
  const navEl=document.getElementById('b-nav');
  if(navEl) navEl.classList.remove('visible');
  // Scroll so the sticky bar is visible — scroll to bottom of content
  setTimeout(()=>{
    const modal=document.getElementById('modal');
    if(modal) modal.scrollTo({top:modal.scrollHeight,behavior:'smooth'});
  },100);
}

function bGoNextNote(){
  const nextId=document.getElementById('b-next-bar').dataset.nextId;
  document.getElementById('b-next-bar').classList.remove('visible');
  // Save this note's cards into session BEFORE stopping
  if(bStart){
    const elapsed=Math.round((Date.now()-bStart)/1000);
    const noteId=currentNote;
    const noteName=NOTE_NAMES[noteId]||noteId;
    const mcqs=(NOTES_MCQ[noteId]||[]);
    const noteCards=vsPickCards(mcqs,noteId,noteName);
    vsSessionNotes.push({noteId,noteName,cards:noteCards});
  }
  bStop(false); // stop without showing summary
  if(nextId) openNote(nextId);
  if(nextId) setTimeout(()=>bStart_(),400); // continue session, no reset
}
function bDismissNextNote(){
  document.getElementById('b-next-bar').classList.remove('visible');
  document.getElementById('b-nav').classList.add('visible');
}

function bStartPhase(p){
  if(!breatheOn)return; bPhase=p; const dur=bPhaseDur(p);
  const lbl=document.getElementById('b-phase-label'); if(lbl) lbl.textContent=p;
  if(p==='hold') bSections[bCurIdx]?.classList.add('b-hold');
  else bSections[bCurIdx]?.classList.remove('b-hold');
  bAnimateArc(p,dur); if(dur===0){bNextPhase();return;}
  bPhTimer=setTimeout(()=>{if(!breatheOn||bPaused)return; bNextPhase();},dur);
}
function bNextPhase(){
  if(bPhase==='inhale') bStartPhase('hold');
  else if(bPhase==='hold') bStartPhase('exhale');
  else{ bCyclesDone++; if(bCyclesDone>=PREFS.cycles){ if(!bNextShown) bAdvance(); else bStartPhase('inhale'); } else bStartPhase('inhale'); }
}
function bAnimateArc(p,dur){
  cancelAnimationFrame(bRafId);
  const arc=document.getElementById('b-r-arc'); const secEl=document.getElementById('b-core-sec');
  const start=performance.now();
  function frame(now){
    if(!breatheOn||bPaused)return;
    const elapsed=now-start; const t=Math.min(elapsed/Math.max(dur,1),1);
    let offset;
    if(p==='inhale') offset=BCIRC*(1-t);
    else if(p==='hold') offset=0;
    else offset=BCIRC*t;
    arc.style.strokeDashoffset=offset; arc.style.transition='none';
    secEl.textContent=Math.max(1,Math.ceil((dur-elapsed)/1000));
    if(t<1) bRafId=requestAnimationFrame(frame);
  }
  bRafId=requestAnimationFrame(frame);
}
function bTogglePause(){
  if(!breatheOn)return; bPaused=!bPaused;
  const lbl=document.getElementById('b-pause-lbl');
  if(bPaused){ clearTimeout(bPhTimer); cancelAnimationFrame(bRafId); lbl.textContent='▶'; const pl=document.getElementById('b-phase-label'); if(pl) pl.textContent='paused'; }
  else{ lbl.textContent='⏸'; bStartPhase(bPhase); }
}

// ── Ventilation Summary ──
let vsCurrentSess=null, vsCards=[], vsCurIdx=0, vsMarks=[], vsAnswerShown=false;
let vsSessionNotes=[]; // accumulates all notes studied in one breathing session

function bShowSummary(sess){
  vsCurrentSess=sess;
  const noteId=sess.noteId||sess.topic;
  const noteName=NOTE_NAMES[noteId]||sess.topic||noteId;
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
function bShareSession(){ const arr=bLoadHistory();const sess=arr[0];if(!sess)return;const text='Just breathed through "'+(NOTE_NAMES[sess.topic]||sess.topic)+'" — '+bFmtDur(sess.duration)+', '+sess.sections+' sections 🌬\n\nVENT — study like you breathe.';if(navigator.share){navigator.share({text,url:window.location.href}).catch(()=>{});}else{navigator.clipboard.writeText(text).catch(()=>{prompt('Copy to share:',text);});} }

document.addEventListener('DOMContentLoaded',()=>vlUpdateBadge());

document.addEventListener('keydown',e=>{
  if(!breatheOn)return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();bSkipFwd();}
  else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();bSkipBack();}
  else if(e.key===' '){e.preventDefault();bTogglePause();}
  else if(e.key==='Escape'){e.preventDefault();bStop(true);}
});


// ══ MODAL + FULLSCREEN ══
let currentNote=null, isFullscreen=false;

function openNote(id){
  currentNote=id;
  // Save progress to Supabase
  if(typeof saveNoteProgress === 'function') saveNoteProgress(id);
  document.getElementById('mcontent').innerHTML=NOTES[id]?NOTES[id]():'<div class="n-page"><p style="color:var(--ink3);font-size:15px;">Coming soon.</p></div>';
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
  document.getElementById('page-note').style.display='block';
  document.getElementById('page-mcq').style.display='none';
  document.getElementById('mbar-note-tools').style.visibility='visible';
  loadHighlights(id);
  dismissVentPopup();
  // Re-init breathe sections on note switch
  if(breatheOn){
    setTimeout(()=>{
      const _heroEl=document.querySelector('#mcontent .n-hero-new');
  const _sectEls=Array.from(document.querySelectorAll('#mcontent .n-section'));
  bSections=_heroEl?[_heroEl,..._sectEls]:_sectEls;
      bTotal=bSections.length; bCurIdx=0; bCyclesDone=0; bAtLast=false; bNextShown=false; bSessionSections=0;
      document.getElementById('b-next-bar').classList.remove('visible');
      document.getElementById('b-nav').classList.add('visible');
      const spine=document.getElementById('b-spine'); spine.innerHTML='';
      bSections.forEach((_,i)=>{const d=document.createElement('div');d.className='b-sdot';d.onclick=()=>{if(breatheOn)bJumpTo(i);};spine.appendChild(d);});
      bActivate(0); bStartPhase('inhale');
    },50);
    showNoteNav(); updateNavLabel();
  }
}
function closeModal(){
  document.getElementById('overlay').classList.remove('open','fullscreen');
  document.body.style.overflow=''; isFullscreen=false;
  const btn=document.getElementById('btn-fullscreen');
  if(btn) btn.innerHTML='<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  dismissVentPopup();
  // Stop breathe only when fully closing the overlay
  if(breatheOn) bStop(false);
  const tools=document.getElementById('mbar-note-tools'); if(tools) tools.style.visibility='visible';
  hideHlPopup();
}
function closeBg(e){ if(e.target===document.getElementById('overlay')) closeModal(); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });

function toggleFullscreen(){
  isFullscreen=!isFullscreen;
  document.getElementById('overlay').classList.toggle('fullscreen',isFullscreen);
  document.getElementById('btn-fullscreen').innerHTML=isFullscreen
    ?'<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 1v4H1M13 5h-4V1M9 13V9h4M1 9h4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    :'<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function showVentPopup(){ document.getElementById('vent-popup').classList.add('show'); document.getElementById('vent-backdrop').classList.add('show'); }
function dismissVentPopup(){ document.getElementById('vent-popup').classList.remove('show'); document.getElementById('vent-backdrop').classList.remove('show'); }

// ══ MCQ ENGINE ══
const mcqState={};
function startMCQ(){
  dismissVentPopup();
  const mcqs=NOTES_MCQ[currentNote]; if(!mcqs||!mcqs.length) return;
  if(!mcqState[currentNote]) mcqState[currentNote]={current:0,answers:Array(mcqs.length).fill(null)};
  document.getElementById('page-note').style.display='none';
  document.getElementById('page-mcq').style.display='block';
  document.getElementById('mcq-inner').innerHTML=renderQuestion(currentNote);
  document.getElementById('modal').scrollTop=0;
  document.getElementById('mbar-note-tools').style.visibility='hidden';
}
function backToNote(){
  document.getElementById('page-mcq').style.display='none';
  document.getElementById('page-note').style.display='block';
  document.getElementById('modal').scrollTop=0;
  document.getElementById('mbar-note-tools').style.visibility='visible';
}
function renderQuestion(noteId){
  const state=mcqState[noteId],mcqs=NOTES_MCQ[noteId];
  const qi=state.current,total=mcqs.length,q=mcqs[qi];
  const letters=['A','B','C','D','E'];
  const pct=Math.round((qi/total)*100);
  let dots=''; for(let i=0;i<total;i++) dots+=`<div class="mcq-dot ${i<qi?'done':i===qi?'current':''}"></div>`;
  return `<div class="mcq-room-header"><span class="mcq-room-label">// Test yourself</span><div style="display:flex;align-items:center;gap:16px;"><span class="mcq-room-note-title">${qi+1} of ${total}</span><button onclick="backToNote()" style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,.3);background:none;border:1px solid rgba(255,255,255,.1);padding:5px 12px;border-radius:2px;cursor:pointer;transition:all .2s;" onmouseover="this.style.color='rgba(255,255,255,.7)';this.style.borderColor='rgba(255,255,255,.3)';" onmouseout="this.style.color='rgba(255,255,255,.3)';this.style.borderColor='rgba(255,255,255,.1)';">&#8592; Note</button></div></div>
  <div class="mcq-progress-strip"><div class="mcq-progress-fill" style="width:${pct}%"></div></div>
  <div class="mcq-body"><div class="mcq-counter"><span class="mcq-counter-q">Question ${qi+1} of ${total}</span><div class="mcq-counter-dots">${dots}</div></div>
  <div class="mcq-q-wrap"><div class="mcq-q-num">Question ${qi+1}</div><div class="mcq-q-text">${q.q}</div></div>
  <div class="mcq-opts-list" id="opts-${noteId}">
  ${q.opts.map((o,i)=>`<button class="mcq-opt-btn" onclick="selectOpt('${noteId}',${i})"><span class="mcq-opt-ltr">${letters[i]}</span><span class="mcq-opt-txt">${o}</span></button>`).join('')}
  </div><div class="mcq-next-wrap"><button class="mcq-next-btn" id="next-${noteId}" onclick="nextQ('${noteId}')" disabled>${qi+1<total?'Next &rarr;':'See results &rarr;'}</button></div></div>`;
}
function selectOpt(noteId,oi){
  const state=mcqState[noteId]; if(state.answers[state.current]!==null) return;
  state.answers[state.current]=oi;
  document.querySelectorAll(`#opts-${noteId} .mcq-opt-btn`).forEach((btn,i)=>{ btn.classList.add('answered'); if(i===oi) btn.classList.add('selected'); });
  document.getElementById(`next-${noteId}`).disabled=false;
}
function nextQ(noteId){
  const state=mcqState[noteId],mcqs=NOTES_MCQ[noteId];
  if(state.current+1<mcqs.length){ state.current++; document.getElementById('mcq-inner').innerHTML=renderQuestion(noteId); }
  else showResults(noteId);
}
function showResults(noteId){
  const state=mcqState[noteId],mcqs=NOTES_MCQ[noteId],letters=['A','B','C','D','E'];
  let correct=0; const missed=[];
  mcqs.forEach((q,i)=>{ if(state.answers[i]===q.ans) correct++; else missed.push(q.focus||'Review this topic'); });
  const pct=Math.round((correct/mcqs.length)*100);
  const gc=pct>=80?'#4db87a':pct>=60?'#c8a040':'#e05a5a';
  const gl=pct===100?'Perfect score.':pct>=80?'Well ventilated.':pct>=60?'Getting there.':'Back to the note.';
  const gs=pct===100?'Every concept landed.':pct>=80?'Solid understanding. Review the ones you missed.':pct>=60?'Decent foundation. Some gaps to address.':"That's okay — read it again, then retry.";
  let html=`<div class="mcq-room-header"><span class="mcq-room-label">// Results</span><div style="display:flex;align-items:center;gap:16px;"><span class="mcq-room-note-title">${correct}/${mcqs.length} correct</span><button onclick="backToNote()" style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,.3);background:none;border:1px solid rgba(255,255,255,.1);padding:5px 12px;border-radius:2px;cursor:pointer;transition:all .2s;" onmouseover="this.style.color='rgba(255,255,255,.7)';this.style.borderColor='rgba(255,255,255,.3)';" onmouseout="this.style.color='rgba(255,255,255,.3)';this.style.borderColor='rgba(255,255,255,.1)';">&#8592; Note</button></div></div>
  <div class="mcq-progress-strip"><div class="mcq-progress-fill" style="width:${pct}%"></div></div>
  <div class="res-hero"><div class="res-circle" style="border-color:${gc}"><div class="res-circle-num" style="color:${gc}">${correct}/${mcqs.length}</div><div class="res-circle-pct" style="color:${gc}">${pct}%</div></div>
  <div><div class="res-hero-grade">${gl}</div><div class="res-hero-sub">${gs}</div></div></div>
  <div class="res-body">`;
  if(missed.length){ const u=[...new Set(missed)]; html+=`<div class="res-section-lbl">Focus on</div><div class="res-focus-box">${u.map(m=>`<div class="res-focus-item">${m}</div>`).join('')}</div>`; }
  html+=`<div class="res-section-lbl">Full breakdown</div><div class="res-qlist">`;
  mcqs.forEach((q,i)=>{
    const chosen=state.answers[i],isOk=chosen===q.ans;
    html+=`<div class="res-qblock ${isOk?'res-right':'res-wrong'}"><div class="res-qblock-header"><span class="res-qbadge ${isOk?'right':'wrong'}">${isOk?'&#10003; Correct':'&#10007; Incorrect'}</span><span class="res-qblock-num">Q${i+1}</span></div>
    <div class="res-qblock-q">${q.q}</div><div class="res-opts-wrap">`;
    q.opts.forEach((opt,oi)=>{ let cls='res-opt',tag=''; if(oi===q.ans){cls+=' correct';tag=' &#10003;';}else if(oi===chosen){cls+=' chosen-wrong';tag=' &#10007;';} html+=`<div class="${cls}"><span class="res-opt-ltr">${letters[oi]}</span><span>${opt}${tag}</span></div>`; });
    html+=`</div><div class="res-explain-block"><div class="res-explain-lbl">Why</div><div class="res-explain-txt">${q.exp}</div></div></div>`;
  });
  html+=`</div><div class="res-actions"><button class="res-btn-retry" onclick="retryMCQ('${noteId}')">&#8635; Retry</button><button class="res-btn-back" onclick="backToNote()">&#8592; Back to note</button></div></div>`;
  document.getElementById('mcq-inner').innerHTML=html;
}
function retryMCQ(noteId){
  mcqState[noteId]={current:0,answers:Array(NOTES_MCQ[noteId].length).fill(null)};
  document.getElementById('mcq-inner').innerHTML=renderQuestion(noteId);
}

document.addEventListener('DOMContentLoaded', loadFontSize);

// ══════════════════════════════════════
// NOTES CONTENT
// ══════════════════════════════════════
const NOTES = {};
const NOTES_MCQ = {};

// ── LENS ──
NOTES.lens = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Anatomy · Note 01</div>
  <div class="n-hero-title">The<br><em>Lens</em></div>
  <div class="n-hero-sub">Biconvex · Avascular · Transparent · Grows throughout life</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">What it is</div><div class="n-snap-text">Biconvex, transparent, avascular structure suspended behind the iris by zonular fibres attached to the ciliary body. Nutrients diffuse in from aqueous humour.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Why no blood supply</div><div class="n-snap-text">Blood vessel contents scatter light — incompatible with transparency. The lens relies entirely on aqueous humour. <strong>No inflammation is possible in lens disease.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Clinical consequence</div><div class="n-snap-text">Lens disease is always painless and silent until advanced. No redness, no inflammation — only slowly failing vision. <strong>Cataracts never present as emergencies.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Three Layers</span><span class="n-section-tag">capsule to nucleus</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Capsule — outermost elastic membrane</div><div class="n-mech-text">Collagen IV-rich elastic membrane encasing the entire lens. <strong>Anterior capsule is thicker than posterior.</strong> In cataract surgery, the posterior capsule is deliberately preserved to hold the intraocular lens in the capsular bag. Rupture = vitreous prolapse, IOL cannot be placed in the bag.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Anterior epithelium — the only mitotically active cells</div><div class="n-mech-text">Single layer found on the anterior surface only. These cells divide throughout life, differentiating at the equator into new lens fibres. <strong>The posterior capsule has no epithelium.</strong> After cataract surgery, residual anterior epithelial cells migrate to the posterior capsule causing posterior capsule opacification (PCO).</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Lens fibres — purpose-built for transparency</div><div class="n-mech-text">Mature lens fibres lose their nuclei and all organelles — <strong>this is essential for transparency.</strong> Organelles scatter light. Fibres are packed with crystallins in a highly ordered lattice. Oldest fibres form the central nucleus; newest are peripheral cortex. Any disruption to this order = light scattering = cataract.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Accommodation</span><span class="n-section-tag">the counterintuition</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Near vision — ciliary contracts, zonules relax</div><div class="n-mech-text">Ciliary muscle contracts → ciliary body moves inward → <strong>zonular fibres relax</strong> → elastic lens rounds up → higher refractive power for near focus. The key counterintuition: contracted ciliary = relaxed zonules = rounder lens. Most students reverse this entirely.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Distance vision — ciliary relaxes, zonules tighten</div><div class="n-mech-text">Ciliary muscle relaxes → ciliary body moves outward → <strong>zonular fibres tighten</strong> → lens flattened → lower refractive power for distance. The lens is being pulled flat by the taut zonules. At rest (ciliary relaxed), the eye defaults to distance focus.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Presbyopia — inevitable loss of accommodation after 40</div><div class="n-mech-text">The lens loses elasticity with age — cannot round up sufficiently for near focus even when zonules relax fully. <strong>Presbyopia is not a disease — it is inevitable in everyone who lives long enough.</strong> Begins around 40–45, progresses until ~65. Treated with reading glasses or multifocal IOLs.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">72-year-old says reading glasses no longer needed, near vision improved → think <em>"second sight of the aged"</em> → nuclear cataract causing myopic shift. Examine on slit lamp. Don't reassure.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text">Patients present delighted their vision has "improved". This is <strong>NOT genuine improvement</strong> — it is a myopic shift from increasing nuclear density. A sign of progressive nuclear sclerosis. Do not reassure and discharge.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Why Transparency Fails</span><span class="n-section-tag">three mechanisms</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Oxidative damage (ageing):</strong> decades of oxidative stress cause crystallin cross-linking → nuclear sclerosis → brunescent nucleus → myopic shift ("second sight").</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Corticosteroids (any route — inhaled, topical, systemic):</strong> cause posterior subcapsular cataract (PSC). Can develop within weeks. Always ask about inhalers and creams — patients don't count them as "real" medication.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Diabetes — sorbitol accumulation:</strong> excess glucose → aldose reductase → sorbitol → cannot leave the lens → draws water in by osmosis → crystallin disruption. Can develop rapidly in poorly controlled T1DM.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Posterior Capsule Opacification</span><span class="n-section-tag">commonest late complication</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Cause</div><div class="n-diag-content">Residual <strong>anterior lens epithelial cells</strong> migrate to the posterior capsule after phacoemulsification and proliferate, opacifying it. Not a recurrence of cataract — the IOL is unaffected.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Incidence</div><div class="n-diag-content">Up to <strong>30% within 5 years</strong> of cataract surgery.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Treatment</div><div class="n-diag-content"><strong>Nd:YAG laser capsulotomy</strong> — single outpatient procedure, immediate result. Creates a clear central opening in the posterior capsule.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Complications</div><div class="n-diag-content">IOP spike (transient), IOL pitting (rare), posterior vitreous detachment (rare). Generally very safe.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Contracted ciliary = relaxed zonules = rounder lens.</strong> This is the most commonly reversed fact in accommodation physiology. The zonules are slack when the ciliary contracts — not taut.<span class="n-pearl-exam">Exam loves: what happens to zonular fibres during near focus?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>The posterior capsule has no epithelium.</strong> Only the anterior does. PCO develops from residual anterior cells migrating posteriorly — not from a posterior layer that never existed.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Lens fibres lose organelles deliberately.</strong> This is designed for transparency, not degeneration. Any cell retaining organelles scatters light and causes cataract.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">For near vision, the ciliary muscle relaxes — allowing the zonules to tighten and pull the lens flat.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>This is reversed.</strong> For near vision: ciliary contracts → zonules relax → lens rounds up. For distance: ciliary relaxes → zonules tighten → lens flattens. Contracted ciliary = relaxed zonules = near focus.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">PCO after cataract surgery is a recurrence of the original cataract and requires repeat phacoemulsification.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>PCO is not a recurrence of cataract.</strong> It is opacification of the posterior capsule by residual epithelial cells. The IOL is intact. Treatment: Nd:YAG laser capsulotomy — not surgery.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>No blood supply. No nerves. No inflammation.</em><br>Only silent, progressive opacity.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES_MCQ.lens = [
  {q:"During near vision, which of the following correctly describes the state of the ciliary muscle and zonular fibres?",opts:["Ciliary relaxed, zonules taut","Ciliary contracted, zonules relaxed","Ciliary contracted, zonules taut","Ciliary relaxed, zonules relaxed"],ans:1,focus:"Accommodation mechanics",exp:"During near vision: <strong>ciliary muscle contracts</strong> → ciliary body moves inward → <strong>zonular fibres relax</strong> → elastic lens rounds up → greater refractive power. Remember: contracted ciliary = slack zonules = rounder lens. This is the most commonly reversed concept in accommodation physiology."},
  {q:"A 74-year-old reports his reading glasses are no longer needed and near vision has improved. Slit lamp reveals a brunescent lens nucleus. What is happening?",opts:["The cataract has spontaneously resolved","Nuclear sclerosis is causing a myopic shift — 'second sight of the aged'","Presbyopia is reversing with age","The IOL has shifted forward"],ans:1,focus:"Second sight of the aged",exp:"<strong>'Second sight'</strong> is a myopic shift caused by increasing nuclear density in nuclear sclerosis. As the nucleus densifies, its refractive index rises, improving near vision temporarily. This is NOT an improvement — it signals progressive cataract. Slit lamp examination required, surgery when function is affected."},
  {q:"Why does the lens have no blood supply?",opts:["Blood vessels are too large to fit in the lens capsule","Blood vessel contents would scatter light and destroy transparency","The lens receives oxygen by diffusion from the vitreous only","Blood flow would interfere mechanically with accommodation"],ans:1,focus:"Lens transparency — no vasculature",exp:"Blood vessel contents — red cells, plasma proteins — scatter light. <strong>A vascular lens would be opaque.</strong> Instead, the lens receives nutrients by diffusion from the aqueous humour through the capsule. This also means there is no inflammatory response possible in lens disease — only silent opacity."},
  {q:"Posterior capsule opacification (PCO) occurs because:",opts:["The IOL degrades over time releasing toxic products","Residual anterior lens epithelial cells migrate to and proliferate on the posterior capsule","The posterior capsule regenerates new lens fibres after surgery","Aqueous humour deposits proteins on the posterior capsule"],ans:1,focus:"PCO mechanism and treatment",exp:"<strong>PCO</strong> is caused by residual anterior lens epithelial cells (remaining after phacoemulsification) migrating posteriorly and proliferating on the preserved posterior capsule. The IOL is unaffected. Treatment: <strong>Nd:YAG laser capsulotomy</strong> — a quick outpatient procedure."},
  {q:"A 45-year-old on long-term inhaled budesonide presents with blurred vision worst in bright light and near work. Which cataract type is most likely?",opts:["Nuclear sclerosis from oxidative damage","Posterior subcapsular cataract from corticosteroid use","Cortical cataract from UV exposure","Congenital cataract from in-utero exposure"],ans:1,focus:"Steroid-induced PSC",exp:"<strong>Posterior subcapsular cataract (PSC)</strong> from corticosteroids via any route — inhaled, topical, systemic. PSC sits at the posterior pole on the visual axis. Symptoms worst in <strong>bright light</strong> (pupil constricts → visual axis through opacity) and <strong>near work</strong>. Always specifically ask about inhaled steroids — patients rarely mention inhalers."}
];

// ── CATARACTS ──
NOTES.cataract = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Lens Pathology · Note 02</div>
  <div class="n-hero-title">Cat<em>aracts</em></div>
  <div class="n-hero-sub">Opacity of the crystalline lens · Leading cause of reversible blindness worldwide</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The type matters</div><div class="n-snap-text">Nuclear, cortical, and posterior subcapsular cataracts have different causes, symptoms, and slit-lamp appearances. <strong>The location tells you the cause.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Who gets them</div><div class="n-snap-text">Ageing (most common), corticosteroids, diabetes, UV exposure, trauma, congenital (TORCH, galactosaemia). Always ask about <strong>inhalers, skin creams, and oral steroids.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">When to operate</div><div class="n-snap-text">When the cataract causes <strong>functional impairment</strong> affecting daily life. There is no VA threshold. The decision is shared with the patient.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Three Types — Location Determines Symptoms</span><span class="n-section-tag">the essential triad</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Nuclear sclerosis — ageing and oxidative damage</div><div class="n-mech-text">Starts centrally in the nucleus. Progressive yellowing/browning (brunescence) from crystallin cross-linking. Causes <strong>myopic shift</strong> — patients temporarily stop needing reading glasses ("second sight"). Glare and reduced contrast. Worst in dim conditions when pupil dilates and more nuclear opacity enters the visual axis.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Cortical cataract — spoke-like opacities from the periphery</div><div class="n-mech-text">Cuneiform white opacities or water clefts radiating from the periphery toward the centre. Associated with UV exposure and diabetes. Symptoms develop as spokes extend toward the visual axis. <strong>Glare and monocular diplopia.</strong> Slit lamp: radial white opacities radiating from the equator inward.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Posterior subcapsular (PSC) — worst in bright light and near work</div><div class="n-mech-text">Granular opacity at the posterior pole directly on the visual axis. Causes: corticosteroids (any route), diabetes, uveitis, irradiation. <strong>Disproportionately severe symptoms for lesion size.</strong> Tiny PSC can devastate vision. Worst in bright light (miosis → visual axis through opacity) and near work.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Asthmatic on inhaled steroids + blurred vision worst in bright light + reading difficulty → think <em>posterior subcapsular cataract</em> → slit lamp: posterior granular opacity.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text">Patients mention "inhalers" but don't think of them as medication. <strong>Always specifically ask: inhaled steroids for asthma/COPD, topical steroids for skin, nasal sprays, oral courses.</strong> Any route causes PSC. The most common missed drug history in cataract assessment.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Congenital Cataract — A Paediatric Emergency</span><span class="n-section-tag">amblyopia risk</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Absent red reflex in a neonate = same-day ophthalmology referral.</strong> The critical window for visual cortex development closes early. Amblyopia (irreversible) develops within weeks if the visual axis is obstructed.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Causes: TORCH infections</strong> (rubella classically), galactosaemia, Down syndrome, Marfan syndrome, in-utero steroid exposure. Test for galactosaemia — it is treatable and the cataract reversible with dietary change.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>After surgery: aphakic glasses/contact lens + occlusion therapy (patching the better eye)</strong> to force the amblyopic eye to be used. All three required: surgery + optical correction + patching.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Surgical Management</span><span class="n-section-tag">phacoemulsification</span></div>
  <div class="n-algo">
    <div class="n-algo-row"><div class="n-algo-step s-first">Indication</div><div class="n-algo-body">Functional impairment affecting daily life — driving, reading, work. <strong>No specific VA threshold.</strong> Shared decision with the patient.</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-fail">Technique</div><div class="n-algo-body"><strong>Phacoemulsification</strong> (ultrasound probe emulsifies nucleus) → irrigation/aspiration of cortex → IOL implanted in posterior capsular bag. Day-case, topical anaesthesia, 20–30 minutes.</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-severe">Complications</div><div class="n-algo-body">Posterior capsule rupture (vitreous prolapse), endophthalmitis (rare but devastating), corneal oedema, IOL dislocation, PCO (30% at 5 years).</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-unstable">PCO</div><div class="n-algo-body dark-body"><strong>Nd:YAG laser capsulotomy</strong> — outpatient, immediate result. Not a recurrence of cataract. IOL unaffected.<span class="n-involve">Ophthalmology outpatient</span></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>"Second sight of the aged"</strong> — nuclear sclerosis causes a myopic shift improving near vision. Sign of worsening cataract, not improvement.<span class="n-pearl-exam">Exam: 72-year-old no longer needs reading glasses — what's happening?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>PSC causes disproportionately severe symptoms for lesion size.</strong> A tiny opacity on the visual axis causes more disability than a large cortical spoke — every photon through the visual axis is affected.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Absent red reflex in a child = emergency referral, same day.</strong> The visual cortex critical period is narrow. Delay = permanent amblyopia.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Surgery is indicated when visual acuity is worse than 6/12.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>There is no VA threshold for cataract surgery.</strong> The indication is functional impairment. A 6/9 patient who cannot drive may need surgery; a 6/24 patient who is coping may not.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Inhaled steroids don't cause cataracts — only systemic oral steroids matter.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Any route of corticosteroid causes PSC</strong> — inhaled, topical (skin or eye), nasal spray, oral. Patients routinely omit inhalers when asked about medication. Always ask specifically.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Nuclear. Cortical. PSC.</em><br>The location tells you the cause. The cause tells you the patient.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES_MCQ.cataract = [
  {q:"A 55-year-old asthmatic on long-term inhaled budesonide presents with blurred vision worst in bright light and near work. Which cataract type is most likely?",opts:["Nuclear sclerosis","Cortical cataract","Posterior subcapsular cataract","Congenital cataract"],ans:2,focus:"PSC and corticosteroids",exp:"<strong>Posterior subcapsular cataract (PSC)</strong> from inhaled corticosteroids. Classic: symptoms worst in bright light (pupil constricts, visual axis passes through posterior opacity) and near work. Any route of steroid causes PSC — inhaled, topical, oral."},
  {q:"What is the classic slit-lamp appearance of cortical cataract?",opts:["Brunescent (brown) central nucleus","Spoke-like opacities radiating from the equator inward","Dense granular plaque at the posterior pole","Anterior capsular plaque"],ans:1,focus:"Cortical cataract — slit-lamp",exp:"<strong>Cortical cataracts</strong> appear as cuneiform (spoke-like) white opacities or water clefts radiating from the equatorial periphery toward the central visual axis. Associated with UV exposure and diabetes."},
  {q:"A 72-year-old reports his reading glasses are no longer needed and near vision has improved spontaneously. What is the most appropriate next step?",opts:["Reassure — presbyopia is reversing with age","Prescribe new distance glasses","Examine with slit lamp — this is 'second sight' from nuclear sclerosis","Refer for laser refractive surgery"],ans:2,focus:"Second sight of the aged",exp:"<strong>'Second sight of the aged'</strong> is a myopic shift from progressive nuclear sclerosis. As the nucleus densifies, its refractive index rises, temporarily improving near vision. NOT genuine improvement — the cataract is progressing."},
  {q:"A newborn has an absent red reflex on routine examination. What is the most appropriate management?",opts:["Reassure and review at 6-week check","Refer to paediatrics within 2 weeks","Same-day ophthalmology referral — exclude congenital cataract","Refer to optician at 3 months"],ans:2,focus:"Congenital cataract — emergency referral",exp:"<strong>Absent red reflex = same-day ophthalmology referral.</strong> Congenital cataract must be treated urgently. The visual cortex has a narrow critical period. Delayed treatment = irreversible amblyopia. Causes include rubella, galactosaemia, Down syndrome."},
  {q:"The indication for cataract surgery is best described as:",opts:["Visual acuity worse than 6/12","Visual acuity worse than 6/60","Functional visual impairment affecting daily life","Age over 65 with any lens opacity"],ans:2,focus:"Indications for cataract surgery",exp:"Cataract surgery is indicated by <strong>functional impairment</strong> — when the cataract affects driving, reading, or other activities important to the patient. There is no specific VA threshold. Decision is made jointly with the patient."}
];

// ── CORNEA ──
NOTES.cornea = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Cornea · Note 03</div>
  <div class="n-hero-title">Corneal<br><em>Infections</em></div>
  <div class="n-hero-sub">Keratitis · Red painful eye + white corneal spot = corneal ulcer until proven otherwise</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The rule</div><div class="n-snap-text">Painful red eye + photophobia + white corneal opacity = corneal ulcer. <strong>Same-day referral. No steroids without a confident slit lamp diagnosis.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Why urgent</div><div class="n-snap-text">The cornea is avascular and immune-privileged. Infection causes rapid stromal destruction. <strong>Hours matter.</strong> A day's delay risks permanent scarring and vision loss.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">History = organism</div><div class="n-snap-text">Contact lens wearer → bacterial/Acanthamoeba. Agricultural trauma → fungal. Recurrent painful episodes with stress → HSV. <strong>The history tells you the organism before you examine.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Bacterial Keratitis</span><span class="n-section-tag">Pseudomonas · Staphylococcus</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Who gets it — contact lens wearers and trauma</div><div class="n-mech-text"><strong>Pseudomonas aeruginosa</strong> is the most common cause in contact lens wearers. Staphylococcus aureus more common after trauma. Contact lens wear disrupts the epithelial barrier; sleeping in lenses dramatically increases risk. Any corneal trauma (foreign body, fingernail scratch) can introduce bacteria.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Slit lamp — dense grey-white infiltrate with hypopyon</div><div class="n-mech-text">Dense, grey-white stromal infiltrate with overlying epithelial defect. <strong>Hypopyon</strong> (sterile pus layering in the inferior anterior chamber) is common and strongly suggests bacterial keratitis. The pus is inflammatory exudate — not direct infection of the AC. Pseudomonas ulcers can progress to corneal perforation within 24–48 hours.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Treatment — intensive topical antibiotics, scrape first</div><div class="n-mech-text">Corneal scrape for microscopy and culture before starting treatment. <strong>Topical ciprofloxacin 0.3% or ofloxacin 0.3%</strong>, initially every 15–30 minutes (day and night in severe cases). Taper as clinical improvement occurs. Systemic antibiotics not required for corneal keratitis alone. Admit if severe, worsening, or central ulcer threatening the visual axis.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">HSV Keratitis</span><span class="n-section-tag">dendritic ulcer · pathognomonic features</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Mechanism — reactivation of latent HSV-1</div><div class="n-mech-text">Primary HSV-1 infection establishes latency in the trigeminal ganglion. Reactivation triggered by stress, UV exposure, fever, or immunosuppression. <strong>Recurrent episodes are the rule.</strong> Each episode risks progressive corneal scarring, stromal vascularisation, and eventual visual loss.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Pathognomonic features — dendritic ulcer and reduced sensation</div><div class="n-mech-text"><strong>Dendritic ulcer:</strong> branching fluorescein-staining epithelial defect with <strong>terminal bulbs</strong> at each branch end — swellings representing active viral replication. Pathognomonic. <strong>Reduced corneal sensation:</strong> HSV destroys corneal stromal nerves. Test with a fine cotton wisp — blink reflex should be brisk bilaterally. Reduced sensation strongly supports HSV and explains why patients often present later than expected (less pain).</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Treatment — aciclovir, absolutely no steroids</div><div class="n-mech-text"><strong>Topical aciclovir 3%</strong> five times daily for 14 days. Oral aciclovir for severe or stromal disease. Long-term oral prophylaxis after 2+ episodes of stromal keratitis. <strong>Topical steroids are absolutely contraindicated in epithelial HSV</strong> — they suppress the immune response controlling viral replication → catastrophic viral spread → stromal melting and perforation.</div></div></div>
  </div>
  <div class="n-diag-steps" style="margin-top:20px;">
    <div class="n-diag-row"><div class="n-diag-label gold">Terminal bulbs</div><div class="n-diag-content">Bulb-shaped swellings at the end of each dendritic branch. Seen on fluorescein staining with cobalt blue light. <strong>Pathognomonic for HSV.</strong> A healing abrasion may branch but will never have terminal bulbs.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Reduced sensation</div><div class="n-diag-content">Test with fine cotton wisp. <strong>Reduced blink reflex on affected side = strong support for HSV.</strong> Also explains delayed presentation — less pain than the clinical picture warrants.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">No steroids</div><div class="n-diag-content"><strong>Steroids in HSV keratitis = corneal melting.</strong> Viral replication is unleashed when the immune response is suppressed. Never prescribe topical steroids to a red eye without slit lamp diagnosis.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Fungal Keratitis</span><span class="n-section-tag">Fusarium · Aspergillus · agricultural history</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Who gets it — agricultural and soil trauma</div><div class="n-mech-text">Caused by <strong>Fusarium</strong> or <strong>Aspergillus</strong> following vegetable matter, soil, or agricultural trauma. Think: farmer, gardener, or anyone injured by plant material. Ask specifically — patients may not volunteer the agricultural history. Fungal keratitis is rare in temperate climates but devastating when missed.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Slit lamp — feathery borders, satellite lesions, dry infiltrate</div><div class="n-mech-text"><strong>Feathery, irregular borders</strong> — unlike the sharp margins of bacterial keratitis. <strong>Satellite lesions</strong> (small separate infiltrates at a distance from the main lesion). <strong>Dry, rough-textured infiltrate</strong> with little surrounding oedema. May have hypopyon. The feathery pattern reflects fungal hyphal infiltration into the stroma.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Treatment — prolonged antifungal, no steroids</div><div class="n-mech-text"><strong>Topical natamycin 5%</strong> or <strong>voriconazole</strong> for weeks to months. Treatment duration is far longer than bacterial keratitis and patients must be warned. Oral voriconazole for deep or severe disease. <strong>Steroids absolutely contraindicated.</strong> Penetrating keratoplasty may be required for treatment failure. Corneal scrape for fungal culture essential.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Acanthamoeba Keratitis</span><span class="n-section-tag">contact lens + tap water · pain out of proportion</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Who gets it — contact lens wearers using tap water</div><div class="n-mech-text">Almost exclusively contact lens wearers who use tap water for rinsing lenses, lens cases, or who swim/shower in lenses. Acanthamoeba cysts survive in tap water, pools, and hot tubs. The corneal epithelium must be disrupted for infection — contact lens wear provides this. <strong>No other risk factor comes close to contact lens + tap water exposure.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">The cardinal feature — pain out of all proportion</div><div class="n-mech-text">In early disease the clinical appearance is deceptively mild — modest injection, subtle grey infiltrate. But <strong>the patient is in severe, often unbearable pain</strong> disproportionate to what you see. This mismatch is the clinical clue. A ring-shaped corneal infiltrate (perineuritis) appears late. The organism invades corneal nerves, causing excruciating perineural inflammation.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Treatment — PHMB + propamidine, very prolonged</div><div class="n-mech-text"><strong>PHMB (polyhexamethylene biguanide)</strong> + <strong>propamidine isethionate (Brolene)</strong> for 6–12 months. The cystic form is resistant to most antiseptics — this is why treatment is so prolonged. Frequently misdiagnosed as HSV. The key distinguishing features: contact lens + tap water history + pain vastly exceeding clinical signs. <strong>Starting topical steroids delays diagnosis by months.</strong></div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Contact lens wearer + severe eye pain + red eye + modest clinical findings → think <em>Acanthamoeba keratitis</em> → pain out of proportion = the cardinal clue. Ring infiltrate appears late.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The dangerous misdiagnosis</div><div class="n-distractor-text">Acanthamoeba is frequently misdiagnosed as HSV because both cause severe pain and both can show dendritic patterns. The distinction: <strong>Acanthamoeba is exclusively in contact lens wearers with tap water exposure, and pain is dramatically disproportionate to clinical signs.</strong> HSV-like appearance + contact lens history = think Acanthamoeba first. Starting steroids for presumed HSV in Acanthamoeba = disaster.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Never prescribe topical steroids to a red eye without slit lamp diagnosis.</strong> Steroids in bacterial keratitis delay treatment; in HSV they cause corneal melting; in fungal and Acanthamoeba they accelerate destruction. This is the most dangerous error in corneal disease.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Any white corneal opacity in a contact lens wearer = same-day ophthalmology referral.</strong> Do not treat empirically in primary care. Corneal scrape for culture is essential before antibiotics in suspected bacterial keratitis.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Sleeping in contact lenses</strong> massively increases bacterial and Acanthamoeba keratitis risk. Corneal hypoxia disrupts the epithelial barrier. Ask about overnight wear in every contact lens patient with a red eye.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Terminal bulbs = HSV, pathognomonic.</strong> A healing corneal abrasion may branch but will never have terminal bulbs. This is the key slit-lamp distinction.<span class="n-pearl-exam">Exam: what feature distinguishes a dendritic ulcer from a healing abrasion?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Acanthamoeba: pain out of all proportion.</strong> Early disease looks mild clinically. But the patient is in severe, often unbearable pain. This mismatch is the clinical clue — not the appearance.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Hypopyon in bacterial keratitis is sterile.</strong> The AC pus is inflammatory exudate from the corneal infection, not direct bacterial invasion of the AC. Management remains intensive topical antibiotics — systemic not required.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Fungal keratitis = feathery borders + satellite lesions + dry infiltrate + agricultural history.</strong> The feathery irregular pattern distinguishes it from the dense, well-defined grey infiltrate of bacterial keratitis.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">08</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A contact lens wearer with a red eye and branching corneal pattern has HSV keratitis — treat with topical aciclovir.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Contact lens + branching pattern = Acanthamoeba until proven otherwise.</strong> Acanthamoeba can mimic HSV. Pain out of proportion and the lens/tap water history are the distinguishing features. Starting aciclovir for Acanthamoeba delays the correct diagnosis by weeks.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A patient with a suspected viral keratitis and marked conjunctival inflammation should be given topical dexamethasone to reduce the inflammatory response.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Steroids in undiagnosed keratitis are one of the most dangerous errors in ophthalmology.</strong> In HSV keratitis specifically they cause corneal melting. No steroid should be prescribed for a red eye without a confident slit lamp diagnosis from an ophthalmologist.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Painful red eye. White corneal spot.</em><br>Same-day referral. No steroids until you know the organism.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES_MCQ.cornea = [
  {q:"A 24-year-old contact lens wearer presents with a very painful red right eye. On examination there is a small grey corneal infiltrate and marked injection, but the pain seems dramatically worse than the clinical findings suggest. Which organism is most likely?",opts:["Pseudomonas aeruginosa","Herpes simplex virus","Acanthamoeba","Fusarium"],ans:2,focus:"Acanthamoeba — pain out of proportion",exp:"<strong>Acanthamoeba keratitis</strong> classically presents in contact lens wearers with <strong>pain disproportionately severe</strong> relative to clinical signs. The ring infiltrate appears late. Frequently misdiagnosed as HSV. Treatment: PHMB + propamidine for 6–12 months."},
  {q:"A dendritic corneal ulcer is found on fluorescein examination. Which feature is pathognomonic for HSV rather than a healing abrasion?",opts:["Branching pattern","Terminal bulbs at the end of each branch","Fluorescein staining","Photophobia"],ans:1,focus:"HSV dendrite — terminal bulbs",exp:"<strong>Terminal bulbs</strong> — bulb-shaped swellings at the end of each dendritic branch — are pathognomonic for HSV keratitis. They represent active viral replication. A healing corneal abrasion may show a branching pattern, but never has terminal bulbs."},
  {q:"Which corneal infection is associated with agricultural trauma involving plant or soil material?",opts:["Bacterial keratitis — Pseudomonas","HSV keratitis","Fungal keratitis — Fusarium or Aspergillus","Acanthamoeba"],ans:2,focus:"Fungal keratitis — agricultural history",exp:"<strong>Fungal keratitis</strong> (Fusarium, Aspergillus) follows vegetable matter or soil trauma — agricultural workers, gardeners. Slit lamp shows feathery, irregular borders and satellite lesions. Treatment: topical natamycin or voriconazole for weeks to months."},
  {q:"A patient with a red painful eye and a branching corneal opacity is given topical dexamethasone by a GP. Which risk is greatest?",opts:["Corneal perforation from elevated IOP","Catastrophic viral replication and corneal melting in HSV keratitis","Antibiotic resistance development","Allergic reaction to the steroid vehicle"],ans:1,focus:"Steroids contraindicated in HSV",exp:"<strong>Steroids in HSV keratitis cause catastrophic viral replication</strong>. The immune response is suppressing the virus — steroids remove this suppression, leading to rapid viral spread, stromal destruction, and corneal melting. No steroid should be prescribed for a red eye without slit lamp diagnosis."},
  {q:"A contact lens wearer presents with bacterial keratitis and a hypopyon. What does the hypopyon represent and how does it change management?",opts:["Bacterial invasion of the AC — requires systemic antibiotics and vitrectomy","Sterile inflammatory exudate — does not change management from intensive topical antibiotics","Fungal endophthalmitis requiring intravitreal injection","Viral anterior uveitis requiring topical steroids"],ans:1,focus:"Hypopyon in bacterial keratitis — sterile",exp:"In bacterial keratitis, the <strong>hypopyon is a sterile inflammatory exudate</strong> — not bacteria in the AC. It forms because inflammatory mediators from the corneal infection spill into the AC. Management remains intensive topical antibiotics. Systemic antibiotics are not required for corneal keratitis alone."}
];

// ── RETINA ──
NOTES.retina = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Anatomy · Note 04</div>
  <div class="n-hero-title">The<br><em>Retina</em></div>
  <div class="n-hero-sub">Ten layers · Rods and cones · Macula · Fovea · Understanding this makes every fundoscopy finding make sense</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">What it is</div><div class="n-snap-text">Inner layer of the eye — neural tissue derived from the brain. Converts light into electrical signals. <strong>10 layers, two blood supplies, one blind spot.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Two blood supplies</div><div class="n-snap-text">Inner retina: central retinal artery. Outer retina (photoreceptors): choriocapillaris via RPE. <strong>Photoreceptors have no direct blood supply — they depend entirely on the RPE.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Every fundoscopy finding — haemorrhages, exudates, cotton wool spots, papilloedema — makes anatomical sense only when you know which retinal layer is affected and why.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Rods vs Cones</span><span class="n-section-tag">the essential distinction</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this">
      <div class="n-diff-card-tag">Rods</div>
      <div class="n-diff-card-name">120 million · Peripheral · Scotopic (dim light)</div>
      <div class="n-diff-card-key">Detect dim light. No colour. Absent from the fovea — concentrated in mid-peripheral retina. <strong>Rhodopsin</strong> is the photopigment. This is why you can see a faint star better by looking slightly away from it (averted vision).</div>
    </div>
    <div class="n-diff-card that">
      <div class="n-diff-card-tag">Cones</div>
      <div class="n-diff-card-name">6 million · Fovea · Photopic (bright light)</div>
      <div class="n-diff-card-key">Colour vision and high-acuity (photopic) vision. Three types (L, M, S wavelengths). <strong>Densely packed in the fovea</strong> — foveal disease causes central vision loss disproportionate to the area affected.</div>
    </div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Macula, Fovea, and Optic Disc</span><span class="n-section-tag">central vision anatomy</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Macula — high cone density, responsible for fine vision</div><div class="n-mech-text">Area of high cone density temporal to the disc (~15°). The macular pigment xanthophyll gives the macula its yellow colour. Central vision, colour discrimination, and reading all depend on the macula. Disease here causes central scotoma and metamorphopsia (distortion), not peripheral loss.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Fovea — pure cones, highest acuity, pit architecture</div><div class="n-mech-text">A pit at the centre of the macula where inner retinal layers are displaced laterally — light reaches cones directly with minimal scattering. <strong>Pure cones, no rods, no ganglion cell layer overlay.</strong> 1:1 photoreceptor-to-ganglion cell ratio. This is why VA is 6/6 at the fovea — and why tiny foveal lesions devastate acuity disproportionately.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Optic disc — the physiological blind spot</div><div class="n-mech-text">Where ganglion cell axons converge to exit as the optic nerve. No photoreceptors = physiological blind spot. The disc has a cup (central pale area) and neuroretinal rim. <strong>Cup-to-disc ratio &gt;0.6 or asymmetry between eyes raises suspicion for glaucoma.</strong> Inferior and superior neuroretinal rim is lost first in glaucoma.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">anatomy = diagnosis</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Sudden painless visual loss + pale swollen retina + cherry red spot at fovea → think <em>central retinal artery occlusion</em> → fovea is spared (choroidal supply intact) while the rest whitens.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Why the cherry red spot</div><div class="n-distractor-text">The fovea has <strong>no ganglion cell layer overlay</strong> — it directly overlies the choroid. When the central retinal artery occludes, the inner retina (ganglion cell-rich) swells white from ischaemia. But the fovea, supplied by the choriocapillaris underneath, retains its normal reddish colour. This contrast = cherry red spot.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Fundoscopy Findings — Which Layer?</span><span class="n-section-tag">anatomy tells you everything</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Flame haems</div><div class="n-diag-content"><strong>Nerve fibre layer.</strong> Blood tracks along axon bundles → flame-shaped. Seen in hypertensive and diabetic retinopathy, papilloedema, CRVO.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Dot/blot haems</div><div class="n-diag-content"><strong>Deep intraretinal layers.</strong> Contained by tight tissue structure → round. Seen in diabetic retinopathy. Deep to flame haemorrhages.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Cotton wool spots</div><div class="n-diag-content"><strong>Nerve fibre layer infarcts.</strong> Arteriolar occlusion → axoplasmic transport failure → fluffy white patches. Not specific: HTN, DM, HIV, vasculitis.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Hard exudates</div><div class="n-diag-content"><strong>Outer plexiform layer.</strong> Lipid-protein deposits from leaking vessels. Yellow, waxy, sharply defined. Seen in DR (circinate pattern) and severe HTN (macular star).</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>No rods in the fovea.</strong> This is why you cannot see a dim star by looking directly at it — look slightly to the side to use the rod-rich peripheral retina. Called "averted vision."<span class="n-pearl-exam">Exam: why can't you see a very faint star by looking directly at it?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Flame haemorrhages = NFL. Dot/blot = deeper retina.</strong> Location of haemorrhage tells you which layer is affected, which tells you the likely pathology.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Cup-to-disc ratio &gt;0.6 or asymmetry = glaucoma until proven otherwise.</strong> Inferior and superior neuroretinal rim is lost first. Check the rim, not just the cup.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Hard exudates and cotton wool spots are both "soft" fluffy white lesions found in diabetic retinopathy.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Hard exudates are yellow, waxy, and sharply defined</strong> (lipid deposits in the outer plexiform layer). Cotton wool spots are white, fluffy, and poorly defined (nerve fibre layer infarcts). Completely different pathology, different layers, different significance.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">The cherry red spot in CRAO is a pathological change at the fovea — it represents abnormal foveal tissue.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>The cherry red spot is the normal fovea</strong> — it stands out because the surrounding retina has turned white from ischaemia. The fovea is spared because it is supplied by the choriocapillaris, not the central retinal artery.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>The retina is brain tissue.</em><br>Every layer has a name, a function, and a disease.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES_MCQ.retina = [
  {q:"A patient has sudden painless visual loss with a pale swollen retina and a cherry red spot at the fovea. Why is the fovea spared?",opts:["The fovea has the highest density of blood vessels","The fovea is supplied by the choriocapillaris, not the central retinal artery","The fovea is protected by macular pigment","The cherry red spot is pathological foveal oedema"],ans:1,focus:"Cherry red spot — foveal anatomy",exp:"The fovea has no ganglion cell layer overlay and is supplied by the <strong>choriocapillaris</strong> (via RPE diffusion), not the central retinal artery. When the CRA occludes, the ganglion cell-rich inner retina swells white, but the fovea retains its normal reddish colour — hence the cherry red spot."},
  {q:"Why can a very faint star only be seen by looking slightly to the side rather than directly at it?",opts:["The cornea is thicker in the periphery","The fovea contains only cones which require brighter light; rods in the peripheral retina detect dim light","The optic disc creates a central blind spot","Peripheral vision has higher acuity"],ans:1,focus:"Rods vs cones — scotopic vision",exp:"The <strong>fovea contains only cones</strong>, requiring bright (photopic) light. Rods — responsible for scotopic (dim-light) detection — are concentrated in the mid-peripheral retina and absent from the fovea. Looking slightly away (averted vision) uses the rod-rich periphery."},
  {q:"Flame-shaped haemorrhages on fundoscopy indicate bleeding in which retinal layer?",opts:["Choroidal layer","Nerve fibre layer","Outer nuclear layer","Photoreceptor layer"],ans:1,focus:"Flame haemorrhages — NFL",exp:"<strong>Flame-shaped haemorrhages</strong> occur in the nerve fibre layer — blood tracks along the radially-oriented axon bundles. Dot/blot haemorrhages occur in deeper intraretinal layers where haemorrhage is contained by the tighter tissue structure."},
  {q:"Which of the following best describes why foveal lesions cause disproportionately severe central vision loss?",opts:["The fovea has two separate arterial supplies","Pure cones with 1:1 ganglion cell ratio and no overlying ganglion cell layer","The fovea contains the highest density of rods","The fovea directly overlies the optic disc"],ans:1,focus:"Foveal anatomy and acuity",exp:"The fovea is a pit where inner layers are displaced laterally, allowing light to reach <strong>pure cones with no overlying ganglion cell layer</strong>. The 1:1 cone-to-ganglion cell ratio provides maximum spatial resolution. Even tiny foveal lesions devastate acuity."},
  {q:"Cotton wool spots on fundoscopy represent:",opts:["Hard lipid exudates from leaking microaneurysms","Infarcts of the nerve fibre layer from arteriolar occlusion","Haemorrhages in the outer retinal layers","Retinal drusen from AMD"],ans:1,focus:"Cotton wool spots — NFL infarcts",exp:"<strong>Cotton wool spots</strong> are pale fluffy patches representing localised <strong>nerve fibre layer infarcts</strong> — arteriolar occlusion causes axoplasmic transport failure with material accumulation. Not specific: seen in hypertensive retinopathy, diabetic retinopathy, HIV retinopathy, and vasculitis."}
];

// ── DIABETIC RETINOPATHY ──
NOTES.dr = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Retinal Disease · Note 05</div>
  <div class="n-hero-title">Diabetic<br><em>Retinopathy</em></div>
  <div class="n-hero-sub">NPDR · PDR · Maculopathy · Leading cause of blindness in working-age adults</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The mechanism</div><div class="n-snap-text">Chronic hyperglycaemia → pericyte loss → capillary weakness → microaneurysms, haemorrhages, exudates. Later: retinal ischaemia → VEGF → neovascularisation.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">NPDR vs PDR</div><div class="n-snap-text">NPDR = changes confined within the retina. PDR = new vessels on the retinal surface or disc. <strong>Neovascularisation = proliferative = high risk of vitreous haemorrhage and tractional detachment.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Maculopathy</div><div class="n-snap-text">Diabetic macular oedema can occur at any DR stage — even mild NPDR. Most common cause of visual loss in DR. <strong>Screened separately from overall DR staging.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Mechanism — From Pericyte to Blindness</span><span class="n-section-tag">5 steps</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Pericyte loss — the first hit, predates any visible change</div><div class="n-mech-text">Chronic hyperglycaemia → glycation of pericyte proteins → pericyte apoptosis. Pericytes are the structural support cells of retinal capillaries. <strong>Their loss weakens the capillary wall.</strong> The earliest histological change in DR — invisible on fundoscopy but preceding all visible lesions.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Microaneurysms — earliest visible sign on fundoscopy</div><div class="n-mech-text">Weakened capillary walls balloon outwards → microaneurysms. <strong>Discrete red dots</strong> on fundoscopy. May leak plasma (→ hard exudates) or rupture (→ blot haemorrhages). Smaller and rounder than dot haemorrhages. First sign of DR visible on clinical examination.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Hard exudates and macular oedema — commonest cause of vision loss</div><div class="n-mech-text">Leaking microaneurysms deposit lipid-protein in the outer plexiform layer. <strong>Hard exudates</strong>: yellow, waxy, sharply defined, often in a circinate (ring) pattern. When near the fovea → macular oedema → central vision loss. This — maculopathy — is the most common cause of vision loss in DR, at any stage.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Retinal ischaemia — IRMA, venous beading, cotton wool spots</div><div class="n-mech-text">Capillary non-perfusion → retinal ischaemia → intraretinal microvascular abnormalities (IRMA), venous beading, cotton wool spots. These features of severe NPDR signal <strong>high risk of progression to PDR.</strong> The 4:2:1 rule: haemorrhages in 4 quadrants, venous beading in 2, IRMA in 1 = severe NPDR.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d5">05</div><div class="n-mech-body"><div class="n-mech-cause">Neovascularisation — VEGF-driven, sight-threatening emergency</div><div class="n-mech-text">Ischaemic retina secretes VEGF → new vessels on disc (NVD) or elsewhere (NVE). <strong>These fragile vessels rupture</strong> → vitreous haemorrhage (sudden vision loss). Fibrovascular membranes contract → tractional retinal detachment. This is PDR — requires urgent treatment.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Staging</span><span class="n-section-tag">NPDR to PDR</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Mild NPDR</div><div class="n-diag-content">Microaneurysms only. Annual screening. Good glycaemic and BP control.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Moderate NPDR</div><div class="n-diag-content">Microaneurysms + dot/blot haemorrhages + hard exudates + cotton wool spots, less than severe criteria. 6-monthly review.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Severe NPDR</div><div class="n-diag-content"><strong>4:2:1 rule</strong> — haemorrhages in all 4 quadrants, venous beading in ≥2 quadrants, IRMA in ≥1 quadrant. High risk of PDR. Urgent ophthalmology.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">PDR</div><div class="n-diag-content"><strong>Neovascularisation</strong> on disc (NVD) or elsewhere (NVE). Risk of vitreous haemorrhage. Pan-retinal photocoagulation (PRP) or intravitreal anti-VEGF. Sight-threatening.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Maculopathy</div><div class="n-diag-content">Clinically significant macular oedema (CSMO). Intravitreal <strong>anti-VEGF</strong> first-line. <strong>Most common cause of visual loss in DR.</strong> Can occur at any DR stage.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Diabetic + sudden painless loss of vision + no view on fundoscopy → think <em>vitreous haemorrhage from PDR</em> → urgent B-scan USS to exclude retinal detachment underneath.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text">DR can be <strong>completely asymptomatic until very advanced.</strong> Patients with significant NPDR or early PDR may have 6/6 acuity and no symptoms. <strong>This is why screening exists.</strong> Never use symptoms as a guide to DR severity — use fundoscopy.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Neovascularisation of the disc (NVD)</strong> is the highest-risk sign in DR. New vessels at the disc bleed more readily than NVE and signal extensive retinal ischaemia. Requires urgent PRP or anti-VEGF.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Rapid glycaemic tightening</strong> in longstanding diabetes can paradoxically worsen retinopathy acutely. Gradual glucose reduction recommended in advanced DR.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>UK Diabetic Eye Screening Programme:</strong> annual digital fundus photography for all diabetics ≥12 years. Do not rely on routine GP fundoscopy alone.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Hard exudates ≠ cotton wool spots.</strong> Hard = yellow, waxy, sharply defined (lipid deposits, outer plexiform layer). Cotton wool = white, fluffy, poorly defined (NFL infarcts). Different pathology, different layers, different significance.<span class="n-pearl-exam">Exam loves confusing these two. Always be specific.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Maculopathy can occur with mild NPDR.</strong> Stage overall DR and assess the macula separately. CSMO requires treatment regardless of overall DR grade.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>PRP works by destroying ischaemic peripheral retina</strong> — reducing the VEGF signal driving neovascularisation. Not a cure, but reduces vitreous haemorrhage and tractional detachment risk.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A diabetic patient has soft exudates (cotton wool spots) near the macula — this is macular oedema requiring anti-VEGF.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Cotton wool spots are NFL infarcts, not macular oedema.</strong> CSMO is diagnosed by hard exudates within 500μm of the fovea, or thickening on OCT. Cotton wool spots indicate ischaemia and progress to PDR, not maculopathy.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A type 2 diabetic with good glycaemic control (HbA1c 47) and no symptoms does not need annual eye screening.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>All diabetics ≥12 years require annual screening regardless of HbA1c or symptoms.</strong> DR is asymptomatic until advanced. Good glycaemic control reduces progression but does not eliminate risk.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>DR is asymptomatic until it's devastating.</em><br>Screen every diabetic. Every year.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES_MCQ.dr = [
  {q:"What is the earliest histological change in diabetic retinopathy, predating any visible fundoscopy finding?",opts:["Neovascularisation","Microaneurysm formation","Pericyte loss","Hard exudate deposition"],ans:2,focus:"Pericyte loss — earliest DR change",exp:"<strong>Pericyte loss</strong> is the earliest histological change in DR. Chronic hyperglycaemia causes glycation of pericyte proteins and apoptosis. Pericytes are structural support cells of retinal capillaries — their loss weakens capillary walls, leading eventually to microaneurysm formation."},
  {q:"A diabetic patient has hard exudates with a circinate pattern near the fovea and mild macular thickening on OCT. What is the most appropriate management?",opts:["Pan-retinal photocoagulation (PRP)","Annual diabetic eye screening only","Intravitreal anti-VEGF therapy","Immediate vitrectomy"],ans:2,focus:"CSMO — anti-VEGF first-line",exp:"<strong>Clinically significant macular oedema (CSMO)</strong> — exudates near the fovea and macular thickening — is treated with <strong>intravitreal anti-VEGF</strong> as first-line. PRP treats PDR/neovascularisation, not macular oedema. CSMO is the most common cause of visual loss in DR."},
  {q:"Which of the following defines proliferative diabetic retinopathy (PDR)?",opts:["Microaneurysms in all four quadrants","Neovascularisation on the retinal surface or disc","Venous beading in two quadrants","Cotton wool spots in more than one quadrant"],ans:1,focus:"PDR definition — neovascularisation",exp:"<strong>PDR is defined by neovascularisation</strong> — new vessels on the disc (NVD) or elsewhere on the retinal surface (NVE). These fragile vessels are at risk of vitreous haemorrhage. Fibrovascular membrane contraction can cause tractional retinal detachment."},
  {q:"A type 1 diabetic with severe NPDR presents with sudden painless vision loss to hand movements. Fundoscopy shows no view. What is the most likely cause and next step?",opts:["Central retinal artery occlusion — start aspirin","Vitreous haemorrhage from PDR — urgent B-scan USS and ophthalmology","Macular oedema — OCT scan","Acute angle-closure glaucoma — measure IOP"],ans:1,focus:"Vitreous haemorrhage in PDR",exp:"<strong>Vitreous haemorrhage from PDR</strong> — fragile neovascular vessels rupture into the vitreous, causing sudden dense visual loss with no fundal view. Urgent <strong>B-scan ultrasonography</strong> to exclude underlying tractional retinal detachment. Urgent ophthalmology referral."},
  {q:"Hard exudates in diabetic retinopathy represent:",opts:["NFL infarcts","Lipid-protein deposits from leaking microaneurysms in the outer plexiform layer","New blood vessel formation","Haemorrhages from pericyte loss"],ans:1,focus:"Hard exudates — pathology",exp:"<strong>Hard exudates</strong> are yellow, waxy, sharply defined deposits of lipid and protein leaking from microaneurysms into the outer plexiform layer. <strong>Cotton wool spots</strong> (soft exudates) are fluffy white NFL infarcts. These are entirely different pathological processes."}
];

// ── HYPERTENSIVE RETINOPATHY ──
NOTES.hr = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Retinal Disease · Note 06</div>
  <div class="n-hero-title">Hypertensive<br><em>Retinopathy</em></div>
  <div class="n-hero-sub">Keith-Wagener-Barker Grades I–IV · The fundus is a timeline of blood pressure history</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The rule</div><div class="n-snap-text">Grades I–II = chronic changes from years of elevated pressure. Grades III–IV = acute severe hypertension happening now. <strong>Grade IV = papilloedema = malignant HTN = admit immediately.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">AV nipping vs haemorrhages</div><div class="n-snap-text">AV nipping tells you about the past — years of arteriolar sclerosis. Flame haemorrhages tell you about right now — acute severe pressure. Both can coexist on the same fundus.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Treatment urgency</div><div class="n-snap-text">Grade III: same-day BP reduction. Grade IV: immediate admission, IV antihypertensives. <strong>No more than 25% BP reduction in first hour</strong> — rapid reduction causes cerebral ischaemia.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Four Grades</span><span class="n-section-tag">KWB grading</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">I</div><div class="n-mech-body"><div class="n-mech-cause">Silver/copper wiring — chronic arteriolar thickening</div><div class="n-mech-text">Normal arterioles appear orange-red as blood is visible through the thin wall. Chronic hypertension thickens the wall → increased light reflection. <strong>Copper wire</strong>: mild thickening, blood column still visible. <strong>Silver wire</strong>: dense thickening, blood column entirely obscured. This change is in the wall, not the blood.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">II</div><div class="n-mech-body"><div class="n-mech-cause">AV nipping (Gunn's sign) — chronic arteriolar sclerosis</div><div class="n-mech-text">At AV crossings, artery and vein share an adventitial sheath. A chronically thickened arteriole compresses the vein → vein appears to narrow or disappear at the crossing. <strong>Sign of chronic HTN — takes years to develop.</strong> Associated with increased risk of branch retinal vein occlusion at the crossing point.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">III</div><div class="n-mech-body"><div class="n-mech-cause">Flame haemorrhages + cotton wool spots — acute severe HTN now</div><div class="n-mech-text">Acute severe hypertension causes <strong>arteriolar fibrinoid necrosis</strong>: (1) flame haemorrhages — blood in the NFL following axon paths; (2) cotton wool spots — NFL infarcts from arteriolar occlusion; (3) hard exudates forming a <strong>macular star</strong> in severe cases. <strong>Grade III = same-day BP reduction.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">IV</div><div class="n-mech-body"><div class="n-mech-cause">Papilloedema — malignant hypertension, end-organ damage happening now</div><div class="n-mech-text">All Grade III changes <strong>plus papilloedema</strong> — blurred disc margins, disc elevation, peripapillary haemorrhages. This is malignant hypertension. <strong>Admit immediately.</strong> IV labetalol or sodium nitroprusside. Target: no more than 25% reduction in first hour, then gradually over 24–48 hours.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">BP 240/140 + blurred disc margins + flame haemorrhages + cotton wool spots → think <em>Grade IV malignant hypertension</em> → admit immediately. IV antihypertensives. Reduce BP by no more than 25% in first hour.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The dangerous distractor</div><div class="n-distractor-text"><strong>Do not lower BP to normal.</strong> In chronic HTN, cerebral autoregulation is shifted rightward — the brain operates at higher pressures. Rapidly normalising BP in a patient running at 200/120 for years causes <strong>watershed infarcts</strong>, identical to ischaemic stroke. Target: 25% reduction in first hour, then gradual over 24–48 hours.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">HTN vs Diabetic Retinopathy</span><span class="n-section-tag">both can coexist</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this">
      <div class="n-diff-card-tag">Hypertensive Retinopathy</div>
      <div class="n-diff-card-name">Flame haemorrhages — superficial, NFL</div>
      <div class="n-diff-card-key">Blood tracks along nerve fibre axons → flame-shaped. <strong>AV nipping present.</strong> Arterioles thin, tortuous, highly reflective. Macular star in severe disease. No microaneurysms.</div>
    </div>
    <div class="n-diff-card that">
      <div class="n-diff-card-tag">Diabetic Retinopathy</div>
      <div class="n-diff-card-name">Dot/blot haemorrhages — deep, intraretinal</div>
      <div class="n-diff-card-key">Contained in deeper layers → round. <strong>Microaneurysms present.</strong> Hard exudates in circinate pattern around leaking microaneurysms. No AV nipping. Both diseases can coexist in the same fundus.</div>
    </div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Papilloedema = malignant hypertension = admit immediately.</strong> End-organ damage (renal, cardiac, cerebral) is occurring right now. Not a finding to manage in outpatients. IV antihypertensive therapy in a monitored setting.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Reducing BP too fast = watershed infarcts.</strong> Target: 25% reduction in first hour, then gradual normalisation over 24–48 hours. Do not aim for normal BP acutely.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Grade II AV nipping + acute Grade III changes simultaneously</strong> means chronic uncontrolled HTN AND an acute crisis. The fundus is a timeline — both stories visible at once.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>AV nipping tells you about the past. Flame haemorrhages tell you about right now.</strong> A patient can show Grade II from years of chronic pressure AND Grade III from today's crisis — simultaneously on the same fundus.<span class="n-pearl-exam">Exam: what does AV nipping tell you about the duration of hypertension?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>The macular star</strong> — hard exudates arranged in a star pattern around the fovea — forms because exudate follows the radial Henle fibre layer in the macula. Seen in Grade III/IV HTN retinopathy and other causes of papilloedema.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Silver wiring vs copper wiring:</strong> copper = mild thickening (blood column still visible). Silver = severe thickening (blood column entirely obscured). Both are Grade I, silver being more advanced.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Grade IV malignant hypertension — lower BP rapidly to normal to prevent stroke.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Rapid normalisation causes watershed infarcts.</strong> Target: 25% BP reduction in first hour. Then gradual normalisation over 24–48 hours. The adapted autoregulatory curve cannot tolerate a sudden drop to normal BP.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">AV nipping indicates acute severe hypertension requiring emergency treatment today.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>AV nipping is a sign of chronic hypertension</strong> — it takes years of arteriolar sclerosis to develop. It indicates long-standing BP problems, not an acute emergency. Grade III/IV findings (haemorrhages, papilloedema) indicate the acute emergency.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>The fundus is a timeline.</em><br>AV nipping = years. Flame haemorrhages = today.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div>
  <div class="n-note-end-cta-arrow">&#8599;</div>
</div></div>`;

NOTES_MCQ.hr = [
  {q:"A 58-year-old hypertensive presents with BP 240/140, blurred disc margins, flame haemorrhages, and cotton wool spots. What is the KWB grade and management?",opts:["Grade II — optimise antihypertensives as outpatient","Grade III — same-day urgent BP reduction","Grade IV — admit for IV antihypertensive treatment","Grade I — reassure and review in 3 months"],ans:2,focus:"KWB Grade IV — malignant hypertension",exp:"<strong>Grade IV hypertensive retinopathy</strong> — Grade III features plus papilloedema (blurred disc margins). This is malignant hypertension. <strong>Admit immediately</strong> for IV antihypertensives. Target: no more than 25% BP reduction in the first hour."},
  {q:"AV nipping (Gunn's sign) on fundoscopy indicates:",opts:["Acute severe hypertension with arteriolar fibrinoid necrosis","Chronic hypertension with arteriolar sclerosis compressing venules at crossing points","Diabetic microangiopathy at arteriovenous crossings","Raised intracranial pressure"],ans:1,focus:"AV nipping — sign of chronic HTN",exp:"<strong>AV nipping (Gunn's sign)</strong>: chronically thickened, sclerosed arteriole compresses the venule at a shared adventitial sheath crossing point. A sign of <strong>chronic</strong> hypertension — takes years to develop. NOT a sign of acute hypertensive emergency."},
  {q:"What is the maximum recommended BP reduction in the first hour of treating hypertensive emergency?",opts:["10%","25%","50%","Normalise BP as rapidly as possible"],ans:1,focus:"BP reduction target — 25% in first hour",exp:"No more than <strong>25% reduction in the first hour</strong>. In chronic HTN, cerebral autoregulation operates at higher pressures. Rapid reduction below this causes cerebral and retinal ischaemia — watershed infarcts indistinguishable from ischaemic stroke."},
  {q:"A patient has only increased arteriolar light reflex (copper wiring) with no AV nipping, haemorrhages, or disc changes. BP is 158/96. What is the KWB grade?",opts:["Grade I","Grade II","Grade III","Grade IV"],ans:0,focus:"KWB Grade I — copper/silver wiring only",exp:"<strong>Grade I</strong>: only increased arteriolar light reflex (copper or silver wiring) from wall thickening. <strong>Grade II</strong> adds AV nipping. <strong>Grade III</strong> adds haemorrhages and cotton wool spots. <strong>Grade IV</strong> adds papilloedema."},
  {q:"How does hypertensive retinopathy differ from diabetic retinopathy on fundoscopy?",opts:["HTN causes dot/blot haemorrhages; DR causes flame haemorrhages","HTN causes flame haemorrhages and AV nipping; DR causes dot/blot haemorrhages and microaneurysms","Both conditions cause identical appearances","HTN causes neovascularisation; DR causes AV nipping"],ans:1,focus:"HTN vs DR fundoscopy differences",exp:"<strong>Hypertensive:</strong> flame haemorrhages (NFL), AV nipping, arteriolar changes, macular star. <strong>Diabetic:</strong> dot/blot haemorrhages (intraretinal), microaneurysms, circinate hard exudates. Both can coexist in the same patient."}
];

// ── INTRO ──
NOTES.intro = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Foundations · Note 01</div>
  <div class="n-hero-title">Intro to<br><em>Ophthalmology</em></div>
  <div class="n-hero-sub">Anatomy · History · Examination · The framework everything else hangs from</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Three compartments</div><div class="n-snap-text">Anterior segment (cornea → lens), posterior segment (vitreous → retina), adnexa (lids, orbit, lacrimal). Disease location predicts symptoms.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The history</div><div class="n-snap-text">Painful vs painless. Sudden vs gradual. Unilateral vs bilateral. Red vs white. <strong>These four dichotomies narrow the diagnosis before you examine.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Examination order</div><div class="n-snap-text">VA → pupils → fields → EOM → anterior → fundus. <strong>Never skip VA — it is the vital sign of the eye.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Four Dichotomies</span><span class="n-section-tag">history before exam</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Painful vs Painless</div><div class="n-diag-content">Painful red eye: acute glaucoma, keratitis, uveitis, scleritis. Painless loss: retinal detachment, CRAO, AMD, vitreous haemorrhage. <strong>Painless white eye with sudden loss = posterior emergency.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label">Sudden vs Gradual</div><div class="n-diag-content">Sudden: vascular (CRAO/CRVO), detachment, acute glaucoma. Gradual: cataract, AMD, chronic glaucoma, DR. Sudden = emergency.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Unilateral vs Bilateral</div><div class="n-diag-content">Unilateral: local ocular disease. Bilateral: systemic disease (DR, hypertensive retinopathy, papilloedema). <strong>Bilateral = systemic until proven otherwise.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Red vs White</div><div class="n-diag-content">Red: conjunctivitis, keratitis, uveitis, acute glaucoma. White with loss: retinal disease, cataract, optic nerve. A white eye with sudden loss is often more serious than a red one.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Painless sudden visual loss in a white quiet eye → think <em>posterior segment emergency</em> → urgent fundoscopy. CRAO, vitreous haemorrhage, or retinal detachment until proven otherwise.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The dangerous distractor</div><div class="n-distractor-text">Absence of redness reassures both patient and doctor. <strong>Central retinal artery occlusion, retinal detachment, and vitreous haemorrhage are all painless, silent, and white.</strong></div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Always test VA first.</strong> Medicolegally indefensible to assess an eye without documenting acuity.<span class="n-pearl-exam">Exam: first step in any ophthalmic examination?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>RAPD = relative afferent pupillary defect.</strong> Swinging torch test — affected pupil paradoxically dilates. Indicates optic nerve or severe retinal disease.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Bilateral disc swelling = papilloedema = raised ICP until proven otherwise.</strong> Never treat bilateral disc swelling as a local ocular problem.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">A pain-free white eye is always benign.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>The most dangerous posterior emergencies are painless.</strong> CRAO, retinal detachment, vitreous haemorrhage. Pain is helpful but its absence does not exclude emergency.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Skip VA if the patient says their vision is fine.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>VA must be documented in every encounter.</strong> Patients normalise visual loss. VA is your legal baseline.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Painful or painless. Sudden or gradual.</em><br>Two questions that halve the differential before you touch the patient.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.intro=[{q:"A 45-year-old has sudden painless visual loss in a white quiet eye. Most appropriate action?",opts:["Reassure — painless white eye is benign","Lubricating drops, review 1 week","Urgent same-day fundoscopy","Refer optician"],ans:2,focus:"Painless sudden loss = posterior emergency",exp:"Sudden painless loss in a white eye = posterior segment emergency. CRAO, vitreous haemorrhage, retinal detachment all present this way. Same-day fundoscopy mandatory."},{q:"First step in a formal ophthalmic examination?",opts:["Fundoscopy","Slit lamp","IOP measurement","Visual acuity"],ans:3,focus:"VA first",exp:"VA is the vital sign of the eye — documented first in every encounter."},{q:"Bilateral sudden visual loss. Highest priority systemic cause?",opts:["Unilateral RD","Bilateral POAG","Raised ICP — papilloedema","Bilateral corneal disease"],ans:2,focus:"Bilateral = systemic",exp:"Bilateral disc swelling = papilloedema = raised ICP. Never treat as purely local."},{q:"Which best indicates posterior segment pathology?",opts:["Presence of pain","Redness","White quiet eye + sudden loss","Gradual onset"],ans:2,focus:"White eye + sudden loss",exp:"White quiet eye with sudden loss = CRAO, RD, vitreous haemorrhage. Anterior disease causes red eye."},{q:"Swinging torch: left pupil dilates when light shines into it. Meaning?",opts:["Normal","Left RAPD — optic nerve/severe retinal disease","Bilateral Horner","Pharmacological mydriasis"],ans:1,focus:"RAPD — afferent defect",exp:"RAPD (Marcus Gunn) — affected pupil paradoxically dilates. Causes: optic neuritis, AION, severe RD, optic nerve compression."}];

// ── EYELIDS ──
NOTES.eyelids = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Adnexa · Note 02</div>
  <div class="n-hero-title">Eye<em>lids</em></div>
  <div class="n-hero-sub">Ptosis · Chalazion · Hordeolum · Entropion · Ectropion · Blepharitis</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Ptosis localisation</div><div class="n-snap-text">The pupil is everything. <strong>Dilated = CN III/aneurysm. Miosis = Horner. Normal = aponeurotic or myasthenia.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Chalazion vs Hordeolum</div><div class="n-snap-text">Chalazion = Meibomian lipogranuloma — <strong>non-tender.</strong> Hordeolum = staphylococcal abscess — <strong>tender = infected.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Lid malposition</div><div class="n-snap-text">Entropion (lid in) = lashes abrade cornea. Ectropion (lid out) = exposure keratopathy + epiphora. Both scar the cornea if untreated.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Ptosis — Localise by the Pupil</span><span class="n-section-tag">the pupil is everything</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Ptosis classification by pupil state</span><span class="n-viz-sub">Examine the pupil before anything else</span></div>
    <svg viewBox="0 0 760 190" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="183" height="190" rx="2" fill="#c8452a"/>
      <text x="91" y="34" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="3">PUPIL</text>
      <text x="91" y="66" font-family="Syne,sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="800">DILATED</text>
      <text x="91" y="96" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.8)" text-anchor="middle">CN III palsy</text>
      <text x="91" y="114" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.8)" text-anchor="middle">PComm aneurysm</text>
      <text x="91" y="152" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Emergency CT/MRA now</text>
      <rect x="193" y="0" width="183" height="190" rx="2" fill="#2a4a6e"/>
      <text x="284" y="34" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="3">PUPIL</text>
      <text x="284" y="66" font-family="Syne,sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="800">MIOSIS</text>
      <text x="284" y="96" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.8)" text-anchor="middle">Horner syndrome</text>
      <text x="284" y="114" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.8)" text-anchor="middle">Pancoast · Carotid dissection</text>
      <text x="284" y="152" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Image full sympathetic chain</text>
      <rect x="386" y="0" width="183" height="190" rx="2" fill="#3a5a38"/>
      <text x="477" y="34" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="3">PUPIL</text>
      <text x="477" y="66" font-family="Syne,sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="800">NORMAL</text>
      <text x="477" y="96" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.8)" text-anchor="middle">Fatigable → Myasthenia</text>
      <text x="477" y="114" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.8)" text-anchor="middle">High crease → Aponeurotic</text>
      <text x="477" y="152" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Ice test · Anti-AChR</text>
      <rect x="579" y="0" width="181" height="190" rx="2" fill="#1a1510" stroke="rgba(200,69,42,.25)" stroke-width="1"/>
      <text x="669" y="34" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="3">PUPIL</text>
      <text x="669" y="66" font-family="Syne,sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="800">NORMAL</text>
      <text x="669" y="96" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.8)" text-anchor="middle">Congenital ptosis</text>
      <text x="669" y="114" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.8)" text-anchor="middle">Risk amblyopia if untreated</text>
      <text x="669" y="152" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Early surgical correction</text>
    </svg>
  </div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">CN III + Aneurysm</div><div class="n-diag-content">Complete ptosis + eye down-and-out + <strong>fixed dilated pupil = PComm aneurysm until proven otherwise.</strong> Emergency CT/MRA. Do not wait. Pupil-sparing CN III = ischaemic (DM/HTN) — can observe.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Horner Syndrome</div><div class="n-diag-content">Partial ptosis (2–3mm) + <strong>miosis</strong> + anhidrosis. Disruption of sympathetic chain at any level. Pancoast tumour, carotid dissection, aortic aneurysm. Image the entire pathway — hypothalamus to orbit.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Myasthenia Gravis</div><div class="n-diag-content"><strong>Fatigable ptosis</strong> — worsens through the day. Normal pupil. Variable, can be unilateral. Ice test: cold transiently improves ptosis. Anti-AChR antibodies in 85%. CT chest for thymoma.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Aponeurotic</div><div class="n-diag-content">Most common in adults. Levator aponeurosis dehiscence. Normal pupil. <strong>High lid crease</strong> is the clue. Age-related, contact lens use, post-operative. Surgical repair.</div></div>
  </div>
  <div class="n-distractor-box"><div class="n-distractor-label">Why the pupil separates aneurysm from ischaemia</div><div class="n-distractor-text"><strong>Pupillomotor fibres run on the outer surface of CN III</strong> — they are compressed first by extrinsic pressure (aneurysm, tumour). Ischaemic CN III (DM/HTN) affects the inner vascular core first, sparing the outer pupillary fibres. So: pupil involved = compressive = aneurysm. Pupil spared = ischaemic = watch. This distinction is life-saving.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Chalazion vs Hordeolum</span><span class="n-section-tag">tender = infected</span></div>
  <div class="n-compare-grid">
    <div class="n-compare-col">
      <div class="n-compare-head">Chalazion</div>
      <div class="n-compare-row"><span class="n-compare-label">What</span><span>Lipogranuloma of Meibomian gland — chronic sterile inflammation</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Tender?</span><span><strong>No</strong> — firm, non-tender nodule in tarsal plate</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Cause</span><span>Blocked Meibomian duct → retained lipid → granulomatous response</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Treatment</span><span>Warm compresses + massage first. Intralesional steroid. I&C if persistent (&gt;4 weeks)</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Red flag</span><span><strong>Recurrence in same site = biopsy.</strong> Sebaceous gland carcinoma masquerades as chalazion</span></div>
    </div>
    <div class="n-compare-col">
      <div class="n-compare-head" style="color:#c8452a">Hordeolum (Stye)</div>
      <div class="n-compare-row"><span class="n-compare-label">What</span><span>Staphylococcal abscess — acute bacterial infection</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Tender?</span><span><strong>Yes</strong> — acutely painful, red, swollen lid</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Cause</span><span>Staph aureus. External (Zeis/Moll glands) or internal (Meibomian)</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Treatment</span><span>Warm compresses + topical antibiotics. Systemic if spreading cellulitis</span></div>
      <div class="n-compare-row"><span class="n-compare-label">Red flag</span><span>Spreading erythema + fever + proptosis = preseptal/orbital cellulitis — IV antibiotics urgently</span></div>
    </div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Lid Malposition — Entropion & Ectropion</span><span class="n-section-tag">both damage the cornea</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Entropion</div><div class="n-diag-content">Lid margin turns <strong>inward</strong> → lashes abrade the corneal epithelium → keratitis, corneal ulcer, scarring. Usually lower lid. Involutional (age-related lid laxity) most common in developed world. Cicatricial (trachoma, burns) in endemic areas. Acute tape, then surgical correction.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Ectropion</div><div class="n-diag-content">Lid margin turns <strong>outward</strong> → punctum displaced → epiphora (watering). Conjunctival exposure → exposure keratopathy. Usually lower lid. Involutional, cicatricial, or paralytic (CN VII palsy — Bell's, parotid tumour). Lubricate aggressively. Tape at night. Surgical correction.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Trichiasis</div><div class="n-diag-content">Misdirected lashes abrading cornea <strong>without</strong> the lid turning — distinct from entropion. Causes: trachoma, chronic blepharitis, post-surgical. Epilate acutely. Definitive: electrolysis, cryotherapy, or laser.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Blepharitis</span><span class="n-section-tag">the commonest lid condition</span></div>
  <div class="n-exam-box"><div class="n-exam-if">The pattern</div><div class="n-exam-statement">Chronic bilateral red, itchy, crusty lid margins — worse on waking — <em>blepharitis.</em> Not an infection. A dysfunction. Manage it as a routine, not a course.</div></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Anterior</div><div class="n-diag-content">Staphylococcal overgrowth at lash base. Hard collarette scales. Associated with seborrhoeic dermatitis. Lid hygiene (warm compress + cotton bud scrub) + topical antibiotics (chloramphenicol) for flares.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Posterior (MGD)</div><div class="n-diag-content">Meibomian gland dysfunction. Oily, foamy secretions at lid margin. Associated with <strong>rosacea</strong>. Warm compresses + Meibomian expression. Oral doxycycline 100mg OD for 3 months in refractory cases (anti-inflammatory dose).</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam favourites</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Ptosis + dilated pupil = PComm aneurysm until proven otherwise.</strong> Emergency CT angiography. Not a routine neurology referral — this is a surgical emergency.<span class="n-pearl-exam">Exam: what distinguishes aneurysmal from ischaemic CN III palsy?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Horner = partial ptosis + miosis + anhidrosis.</strong> The miosis distinguishes it from aponeurotic ptosis (normal pupil). Image the full sympathetic pathway from hypothalamus to orbit.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Recurrent chalazion in the same location = biopsy.</strong> Sebaceous gland carcinoma of the eyelid masquerades as chalazion. Missing it is a serious diagnostic error.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Fatigable ptosis = myasthenia gravis.</strong> Ice test: ptosis improves transiently with cold (cold inhibits acetylcholinesterase). Anti-AChR antibodies in 85%. CT chest for thymoma.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Congenital ptosis → early surgery to prevent amblyopia.</strong> The visual cortex is plastic — deprivation amblyopia develops rapidly in the first years of life. Don't watch and wait.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Paralytic ectropion = CN VII palsy.</strong> Bell's palsy, parotid tumour, acoustic neuroma. Cornea is exposed and at risk — lubricate every hour, tape eye shut at night until lid function returns.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">07</div><div class="n-pearl-body"><strong>Posterior blepharitis + facial flushing/telangiectasia = rosacea.</strong> Treat the skin and the lids together. Doxycycline addresses both.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for these</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Drooping lid + dilated pupil → neurology referral next week.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Emergency CT angiography today.</strong> PComm aneurysm. Rupture = 40% mortality. Hours matter.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Ptosis that worsens through the day = tiredness.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Fatigable ptosis = myasthenia gravis.</strong> Anti-AChR, ice test, CT chest for thymoma.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Lump recurs in the same lid location — another chalazion, I&C again.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Biopsy it.</strong> Sebaceous gland carcinoma. Can metastasise. Same-site recurrence = malignancy until proven otherwise.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>The pupil localises the cause of ptosis.</em><br>Dilated = aneurysm. Miosis = Horner. Normal = myasthenia or aponeurotic.<br>Tender lid lump = infected. Same-site recurrence = biopsy.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.eyelids=[{q:"Firm non-tender upper lid nodule for 6 weeks. First-line management?",opts:["Flucloxacillin","Warm compresses + massage","Urgent excision","Topical steroids"],ans:1,focus:"Chalazion management",exp:"Chalazion = blocked meibomian gland lipogranuloma. First-line: warm compresses + massage. Persistent: steroid injection or I&C. Recurrent in same spot → biopsy."},{q:"Complete right ptosis, eye down-and-out, pupil 7mm fixed. Immediate investigation?",opts:["TFTs","Ice test","Emergency CT/MR angiography","Anti-AChR antibodies"],ans:2,focus:"CN III + pupil = aneurysm",exp:"Complete CN III with pupil involvement = PComm aneurysm until proven otherwise. Pupillary fibres on outer surface compressed by extrinsic pressure first."},{q:"Lower lid sags away from globe. Watery eye despite no increased tearing. Diagnosis?",opts:["Entropion reflex tearing","Ectropion — disrupted tear drainage","NLDO","Dry eye"],ans:1,focus:"Ectropion — paradoxical epiphora",exp:"Ectropion: lower lid everts → punctum displaced → impaired drainage → epiphora. Paradoxically watery despite drainage problem not excess production."},{q:"Ptosis worsening through the day + normal pupil + improves with ice. Diagnosis?",opts:["Aponeurotic ptosis","Myasthenia gravis","Horner syndrome","CN III ischaemic"],ans:1,focus:"Myasthenia — fatigable ptosis",exp:"Fatigable ptosis in MG: ACh depletes with repetitive use. Ice test improves it (cold enhances ACh). Normal pupil. Anti-AChR antibodies."},{q:"Horner syndrome — how does ptosis differ from CN III?",opts:["Horner = complete; CN III = partial","Horner = partial ptosis + miosis; CN III = complete ptosis + mydriasis","Both cause complete ptosis","Horner has no pupil change"],ans:1,focus:"Horner vs CN III pupils",exp:"Horner: sympathetic loss → partial ptosis (Müller's muscle) + miosis. CN III: levator palsy → complete ptosis + fixed dilated pupil. Pupil size is the key."}];

// ── LACRIMAL ──
NOTES.lacrimal = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Adnexa · Note 03</div>
  <div class="n-hero-title">Lacrimal<br><em>Apparatus</em></div>
  <div class="n-hero-sub">Tear film · Dry eye · Dacryocystitis · NLDO · The watery eye paradox</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Tear film layers</div><div class="n-snap-text">Lipid (meibomian) → aqueous (lacrimal gland) → mucin (goblet cells). Each layer can fail independently.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Drainage path</div><div class="n-snap-text">Tears → puncta → canaliculi → lacrimal sac → NLD → inferior meatus. <strong>Blockage anywhere = epiphora.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The paradox</div><div class="n-snap-text">Dry eye (reflex tearing) and NLDO (blocked drainage) both cause a <em>watery eye</em>. Opposite causes, identical symptom.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Dry Eye — Three Failure Modes</span><span class="n-section-tag">lipid · aqueous · mucin</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Lipid deficiency — evaporative (most common)</div><div class="n-mech-text">MGD, posterior blepharitis, rosacea. Rapid tear break-up time. <strong>Warm compresses + scrubs. Oral doxycycline for severe MGD.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Aqueous deficiency — Sjögren syndrome</div><div class="n-mech-text">Primary or secondary (RA, SLE). Anti-Ro/La antibodies. Schirmer's &lt;5mm/5min. <strong>Preservative-free artificial tears, punctal plugs, ciclosporin drops.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Mucin deficiency — goblet cell destruction</div><div class="n-mech-text"><strong>Stevens-Johnson syndrome, ocular pemphigoid, trachoma</strong> destroy goblet cells. Tears can't spread over epithelium → dry patches despite normal aqueous.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Elderly patient + watery eye + pressing medial canthus expresses mucopurulent material through punctum → think <em>chronic dacryocystitis with NLDO</em> → refer for DCR.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The diagnostic test</div><div class="n-distractor-text"><strong>Regurgitation of mucopus on sac pressure</strong> confirms lacrimal sac obstruction. Distinguishes sac obstruction from canalicular causes of epiphora.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Both dry eye and NLDO cause watering.</strong> Opposite mechanisms.<span class="n-pearl-exam">Exam: name two causes of a persistently watery eye.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Sjögren = aqueous-deficient dry eye.</strong> Anti-Ro/La. Schirmer &lt;5mm/5min. Screen for RA, SLE, PBC.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Never probe an acutely infected lacrimal sac.</strong> Treat infection first. DCR is elective after resolution.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Watery eye = excess production → artificial tears.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Epiphora can be excess production or impaired drainage.</strong> NLDO needs DCR — artificial tears are irrelevant for a blocked duct.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Probe and syringe acutely infected dacryocystitis.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Probing risks false passage + spreading infection.</strong> Antibiotics first, DCR electively after.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Watery eye. Two causes, opposite mechanisms.</em><br>Too much production, or too little drainage.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.lacrimal=[{q:"RA patient, bilateral gritty burning watery eyes. Schirmer's 3mm/5min. Diagnosis?",opts:["NLDO","Aqueous-deficient dry eye — secondary Sjögren","Evaporative dry eye","Allergic conjunctivitis"],ans:1,focus:"Sjögren — aqueous-deficient",exp:"Secondary Sjögren in RA. Schirmer <5mm/5min = aqueous deficiency. Anti-Ro/La antibodies. Watering = reflex hypersecretion."},{q:"Pressing medial canthus produces mucopus from punctum. Diagnosis and treatment?",opts:["Acute dacryocystitis — IV antibiotics","Chronic dacryocystitis NLDO — DCR","Dry eye — artificial tears","Conjunctivitis — chloramphenicol"],ans:1,focus:"Chronic dacryocystitis — regurgitation test",exp:"Chronic dacryocystitis: persistent epiphora + mucopurulent regurgitation on sac pressure = NLDO. Treatment: dacryocystorhinostomy."},{q:"Contraindicated in acute dacryocystitis?",opts:["Oral flucloxacillin","Warm compresses","Probing and syringing","Ophthalmology referral"],ans:2,focus:"No probing in acute dacryocystitis",exp:"Probing risks false passage and spreading infection. Treat with antibiotics first. DCR is elective."},{q:"Which layer of tear film is produced by goblet cells?",opts:["Lipid — MGD","Aqueous — lacrimal gland","Mucin — goblet cells","Aqueous — Sjögren"],ans:2,focus:"Tear film layers",exp:"Mucin (innermost) from goblet cells allows tears to spread over corneal epithelium. Destroyed in SJS, ocular pemphigoid, trachoma."},{q:"Which investigation measures aqueous tear production?",opts:["TBUT","Schirmer's test","Rose Bengal staining","Meibography"],ans:1,focus:"Schirmer's test",exp:"Schirmer's: filter paper in lower fornix; <5mm/5min = aqueous deficiency. TBUT = lipid function. Rose Bengal = damaged epithelium."}];

// ── CONJUNCTIVA ──
NOTES.conjunctiva = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Anterior Segment · Note 04</div>
  <div class="n-hero-title">Con<em>junctiva</em></div>
  <div class="n-hero-sub">Bacterial · Viral · Allergic · Episcleritis vs Scleritis · The Red Eye Safety Screen</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Red eye differential</div><div class="n-snap-text">Conjunctivitis, keratitis, uveitis, acute glaucoma, episcleritis, scleritis. <strong>Discriminators: pain, photophobia, VA loss, pupil.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Discharge</div><div class="n-snap-text">Mucopurulent (bacterial). Watery (viral). Stringy/ropy (allergic). None (episcleritis).</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Safety rule</div><div class="n-snap-text">Red eye + photophobia + reduced VA + irregular pupil = NOT conjunctivitis. <strong>Refer immediately.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Conjunctivitis — Three Types</span><span class="n-section-tag">history gives the diagnosis</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Bacterial — mucopurulent, sticky lashes</div><div class="n-mech-text"><em>Staphylococcus, H. influenzae, N. gonorrhoeae</em> (hyperacute — profuse pus, same-day emergency, perforates cornea). <strong>Topical chloramphenicol. Gonococcal: IV ceftriaxone.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Viral — watery, follicles, pre-auricular node</div><div class="n-mech-text">Adenovirus. Highly contagious. <strong>Strict hygiene 14 days. No antibiotics. Self-limiting.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Allergic — itching is the hallmark</div><div class="n-mech-text">Bilateral, seasonal, ropy discharge. <strong>Topical antihistamines or mast cell stabilisers. No steroids in primary care.</strong></div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Episcleritis vs Scleritis</span><span class="n-section-tag">phenylephrine tells the depth</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this"><div class="n-diff-card-tag">Episcleritis</div><div class="n-diff-card-name">Superficial, sectoral, mild</div><div class="n-diff-card-key">Vessels blanch with phenylephrine 2.5%. Mild discomfort. Idiopathic or IBD/RA. Self-limiting. Lubricants or NSAIDs.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag">Scleritis</div><div class="n-diff-card-name">Deep boring pain, globe tender</div><div class="n-diff-card-key"><strong>Vessels do NOT blanch.</strong> Severe pain worse at night. RA, GPA, SLE. NSAIDs → steroids → immunosuppression.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Red eye + profuse purulent discharge reforming within minutes → think <em>gonococcal conjunctivitis</em> → same-day emergency. Corneal perforation risk.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Hyperacute = gonococcal</div><div class="n-distractor-text"><em>N. gonorrhoeae</em> is the only organism that perforates an intact cornea (collagenases). Pus reforms within minutes. IV ceftriaxone + same-day referral.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Itching = allergic. Sticky on waking = bacterial. Watery + URTI = viral.</strong><span class="n-pearl-exam">Exam: single symptom distinguishing allergic conjunctivitis?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Blanches with phenylephrine = episcleritis. Does not blanch = scleritis.</strong></div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Neonatal: gonococcal day 1–4 (hyperacute), chlamydial day 5–14.</strong> Both notifiable. Chlamydial = oral erythromycin (prevents pneumonia).</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">All red eyes with discharge = conjunctivitis → chloramphenicol.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Check VA, photophobia, pupil first.</strong> Keratitis, uveitis, acute glaucoma all have discharge. Missing them = irreversible loss.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Topical steroids for allergic conjunctivitis.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Steroids in undiagnosed red eye are dangerous.</strong> HSV keratitis, IOP rise, cataract. Use antihistamines or mast cell stabilisers instead.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Pain. Photophobia. VA. Pupil.</em><br>Four questions separating conjunctivitis from emergency.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.conjunctiva=[{q:"20-year-old with bilateral itching, ropy discharge. First-line?",opts:["Chloramphenicol","Dexamethasone","Topical azelastine","Oral cetirizine only"],ans:2,focus:"Allergic conjunctivitis — antihistamine",exp:"Allergic: itching is hallmark. First-line: topical antihistamine (azelastine) or mast cell stabiliser. Steroids contraindicated in primary care."},{q:"Neonate day 3, profuse pus reforming immediately. Organism and management?",opts:["Chlamydia — oral erythromycin","Staph — topical chloramphenicol","N. gonorrhoeae — IV ceftriaxone + same-day referral","HSV — topical aciclovir"],ans:2,focus:"Gonococcal ophthalmia neonatorum",exp:"Gonococcal ophthalmia (day 1–4): hyperacute. Only organism perforating intact cornea. IV ceftriaxone. Notifiable."},{q:"Sectoral red eye, mild discomfort, blanches with phenylephrine. Diagnosis?",opts:["Scleritis — NSAIDs","Episcleritis — lubricants/NSAIDs","Bacterial conjunctivitis","Uveitis"],ans:1,focus:"Episcleritis — phenylephrine blanching",exp:"Episcleritis: superficial vessels blanch with phenylephrine. Mild discomfort. Self-limiting. Compare: scleritis vessels don't blanch, deep boring pain, systemic association."},{q:"RA patient, deep boring nocturnal eye pain, globe tender, red eye not blanching. Diagnosis?",opts:["Conjunctivitis","Episcleritis","Scleritis — NSAIDs, ophthalmology","Acute glaucoma"],ans:2,focus:"Scleritis — RA, no blanching",exp:"Scleritis: deep boring pain, globe tenderness, no blanching, RA/GPA/SLE association. Treatment: oral NSAIDs → steroids → immunosuppression."},{q:"Watery red eye + pre-auricular node + URTI + VA 6/6 + no photophobia. Key public health advice?",opts:["Return to work tomorrow","Strict hygiene, avoid contact 14 days","No infectious precautions","Oral azithromycin"],ans:1,focus:"Viral conjunctivitis — contagious",exp:"Adenoviral EKC: highly contagious. Strict handwashing, no shared towels, avoid swimming, 14-day contact restriction. Self-limiting."}];

// ── UVEITIS ──
NOTES.uveitis = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Uveal Tract · Note 08</div>
  <div class="n-hero-title">U<em>veitis</em></div>
  <div class="n-hero-sub">Anterior · Intermediate · Posterior · HLA-B27 · KPs · Synechiae</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The uvea</div><div class="n-snap-text">Iris + ciliary body (anterior) + choroid (posterior). Inflammation of any = uveitis.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Anterior uveitis</div><div class="n-snap-text">Painful red eye, photophobia, ciliary flush. <strong>Slit lamp: KPs, cells + flare in AC, miosis.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Systemic clue</div><div class="n-snap-text">HLA-B27: AS, reactive arthritis, psoriatic arthritis, IBD. <strong>The red eye may be the first presentation.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classification</span><span class="n-section-tag">location determines presentation</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Anterior — most common, painful red eye</div><div class="n-mech-text"><strong>Painful, photophobic, lacrimation, blur.</strong> Ciliary flush. KPs on corneal endothelium, AC cells + flare, miosis. Posterior synechiae (irregular pupil) → secondary glaucoma.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Intermediate — floaters, quiet eye</div><div class="n-mech-text">Pars plana inflammation. Floaters + blur. Snowball vitreous. MS + sarcoidosis. CMO is main complication.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Posterior — painless, white eye</div><div class="n-mech-text">Floaters, scotoma, quiet eye. Toxoplasmosis ("headlight in fog"), CMV retinitis (immunocompromised, "pizza pie"). <strong>Check HIV in severe posterior uveitis.</strong></div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Fine vs Mutton-Fat KPs</span><span class="n-section-tag">granulomatous or not</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this"><div class="n-diff-card-tag">Fine KPs</div><div class="n-diff-card-name">Neutrophil aggregates, Arlt's triangle</div><div class="n-diff-card-key">Non-granulomatous. HLA-B27 anterior uveitis. Inferior distribution (gravity).</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag">Mutton-Fat KPs</div><div class="n-diff-card-name">Greasy, large = granulomatous</div><div class="n-diff-card-key">Macrophage aggregates. <strong>Sarcoid, TB, sympathetic ophthalmia, VKH.</strong> Send CXR + serum ACE + tuberculin test.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Young man + inflammatory back pain + recurrent unilateral red eye + irregular pupil → think <em>HLA-B27 uveitis in AS</em> → topical steroids + mydriatics.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Unilateral and alternating</div><div class="n-distractor-text">HLA-B27 uveitis is <strong>unilateral, alternating</strong> — not simultaneously bilateral. Simultaneous bilateral = sarcoidosis. The red eye may be the first presentation of undiagnosed AS or IBD.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Ciliary flush = perilimbal injection = deep inflammation.</strong> Not conjunctivitis.<span class="n-pearl-exam">Exam: what does ciliary flush indicate?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Mydriatics: (1) relieve ciliary spasm; (2) prevent/break posterior synechiae.</strong> Never omit them.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Mutton-fat KPs = granulomatous = sarcoid/TB until proven otherwise.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Anterior uveitis is always bilateral simultaneously.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>HLA-B27 = unilateral, alternating.</strong> Simultaneous bilateral = sarcoidosis or granulomatous.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Posterior uveitis presents as a painful red eye.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Posterior uveitis = painless white quiet eye.</strong> Floaters + scotoma. Fundoscopy required. Frequently missed.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>The eye is a window into systemic disease.</em><br>Uveitis is rheumatology — seen through a slit lamp.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.uveitis=[{q:"Young man with inflammatory back pain + recurrent unilateral red eye + photophobia. Slit lamp: KPs + AC cells. Systemic suspect?",opts:["Crohn's — gastro","Ankylosing spondylitis — HLA-B27","Sarcoidosis — ACE","RA — RF"],ans:1,focus:"HLA-B27 — AS association",exp:"HLA-B27-associated anterior uveitis with IBP suggests AS. 90% of AS is HLA-B27 positive. Uveitis is most common extra-articular manifestation."},{q:"Why prescribe mydriatics in anterior uveitis?",opts:["Lower IOP","Prevent/break posterior synechiae + relieve ciliary spasm","Improve drainage","Prevent secondary glaucoma by constriction"],ans:1,focus:"Mydriatics — dual purpose",exp:"Mydriatics: (1) relieve ciliary spasm pain; (2) prevent/break posterior synechiae. Omitting risks iris-lens adhesion → secondary glaucoma."},{q:"Large greasy yellowish deposits on corneal endothelium. Most important investigation?",opts:["MRI spine","CXR + serum ACE — exclude sarcoid/TB","Corneal scrape","HSV serology"],ans:1,focus:"Mutton-fat KPs — granulomatous",exp:"Mutton-fat KPs = macrophage aggregates = granulomatous uveitis. Causes: sarcoidosis, TB, VKH. Investigate: CXR, serum ACE, tuberculin test."},{q:"HIV+ patient, painless progressive VL. Fundoscopy: yellow-white areas + haemorrhage, 'pizza pie' pattern. Diagnosis?",opts:["Toxoplasma","CMV retinitis","Behçet's","Acute retinal necrosis"],ans:1,focus:"CMV retinitis",exp:"CMV retinitis in immunocompromise (CD4 <50): 'pizza pie' fundus — yellow-white necrosis + intraretinal haemorrhage. Treat: ganciclovir/valganciclovir + ART."},{q:"Anterior uveitis → fixed irregular small pupil. What occurred and treatment?",opts:["Pharmacological mydriasis","Posterior synechiae — intensive topical steroids + mydriatics","Acute angle-closure","Optic nerve compression"],ans:1,focus:"Posterior synechiae",exp:"Posterior synechiae: iris adheres to anterior lens capsule from fibrin → irregular fixed small pupil. Treatment: intensive topical steroids + mydriatics (atropine 1%). Untreated total synechiae → iris bombé → secondary closure."}];

// ── GLAUCOMA ──
NOTES.glaucoma = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-title">Glau<em>coma</em></div>
  <div class="n-hero-sub">POAG · Acute Angle-Closure · NTG · Secondary · Disc · Fields · The Full Picture</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Definition</div><div class="n-snap-text">Optic neuropathy → progressive retinal ganglion cell death → characteristic disc cupping → irreversible VF loss. <strong>Raised IOP is a risk factor, not the definition.</strong> NTG exists.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">POAG — the silent thief</div><div class="n-snap-text">Chronic, painless, bilateral. Peripheral field loss first. <strong>&gt;30% ganglion cells dead before any symptom.</strong> Most common cause of irreversible blindness worldwide.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Acute angle-closure</div><div class="n-snap-text">IOP 40–70 mmHg within hours. Severe pain, nausea/vomiting, halos, fixed <strong>mid-dilated oval pupil</strong>. Misdiagnosed as migraine. Permanent vision loss within hours.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Aqueous Dynamics — The Plumbing</span><span class="n-section-tag">production and drainage</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Production — ciliary body epithelium</div><div class="n-mech-text">Aqueous produced by ciliary body non-pigmented epithelium (active secretion + ultrafiltration) → posterior chamber → flows through pupil → anterior chamber. Normal IOP: <strong>10–21 mmHg</strong>. Diurnal variation: highest on waking. Beta-blockers and CAIs reduce production.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Trabecular outflow (90%) — the main drain</div><div class="n-mech-text">Trabecular meshwork at anterior chamber angle → Schlemm's canal → episcleral venous plexus. <strong>Resistance here = POAG mechanism.</strong> Trabecular cells phagocytose debris; their dysfunction over decades increases resistance. Miotics and laser trabeculoplasty (SLT/ALT) improve trabecular outflow.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Uveoscleral outflow (10%) — the bypass route</div><div class="n-mech-text">Aqueous passes through ciliary body face → suprachoroidal space → sclera. <strong>Prostaglandin analogues dramatically increase this pathway</strong> (25–35% IOP reduction). This is why they are first-line — no systemic respiratory or cardiac contraindications.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Normal-tension glaucoma — IOP is not the only story</div><div class="n-mech-text">Glaucomatous disc damage despite IOP always &lt;21 mmHg. Mechanism: <strong>vascular insufficiency at the optic nerve head</strong>. Associations: Raynaud's phenomenon, migraine, nocturnal hypotension (over-treated systemic hypertension), sleep apnoea, autoimmune disease. Disc haemorrhages are a hallmark — more common in NTG than POAG. Treatment still targets IOP reduction.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Optic Disc and Visual Field Changes</span><span class="n-section-tag">what to find and what it means</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">CDR</div><div class="n-diag-content">Cup:disc ratio. Normal &lt;0.5. <strong>CDR &gt;0.6 or asymmetry &gt;0.2 between eyes is suspicious.</strong> Cup enlarges as axons die. Vertical elongation of cup is most glaucomatous-specific pattern.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">ISNT Rule</div><div class="n-diag-content">Normal rim thickness: <strong>Inferior &gt; Superior &gt; Nasal &gt; Temporal.</strong> Glaucoma attacks inferior and superior poles of the neuroretinal rim first, corresponding to the superior and inferior arcuate fibre bundles. Loss of ISNT rule = structural glaucomatous damage.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">VF Loss Sequence</div><div class="n-diag-content">Nasal step (earliest) → paracentral scotoma → arcuate (Bjerrum) scotoma → ring scotoma → temporal island → loss of central acuity (late). <strong>Central 5° is preserved until very late disease.</strong> Patients are unaware because the other eye compensates.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Disc Haemorrhage</div><div class="n-diag-content">Splinter haemorrhage at disc margin = active axonal loss. Common in NTG. Indicates progression even when IOP appears controlled. A missed finding on examination.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">OCT</div><div class="n-diag-content">Retinal nerve fibre layer (RNFL) thinning on OCT precedes VF loss by years. <strong>Structural changes (OCT) precede functional changes (VF).</strong> OCT is now the gold standard for glaucoma monitoring.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Angle-Closure Glaucoma — Mechanisms</span><span class="n-section-tag">pupil block and the acute emergency</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Pupil block — the anatomical predisposition</div><div class="n-mech-text">Hyperopic (long-sighted) eyes have shorter axial length → shallower anterior chamber → iris closer to lens → aqueous builds up behind iris → <strong>iris bombé</strong> → peripheral iris occludes trabecular meshwork → acute IOP spike. Precipitants: dim lighting (pupil dilates), mydriatic drops, stress, anticholinergic medications. <strong>Asian and female patients are disproportionately affected.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Clinical presentation — the emergency</div><div class="n-mech-text">Sudden severe unilateral pain, photophobia, halos around lights, profuse nausea and vomiting, blurred vision. Examination: <strong>injected eye, cloudy cornea (oedema from raised IOP), fixed MID-DILATED OVAL pupil, shallow AC.</strong> IOP 40–70 mmHg — the globe feels rock-hard on palpation. Most misdiagnosed as migraine or acute abdomen.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Non-pupil-block mechanisms</div><div class="n-mech-text"><strong>Plateau iris:</strong> ciliary processes push peripheral iris forward, occluding angle even after LPI. <strong>Phacomorphic glaucoma:</strong> swollen intumescent lens pushes iris forward. <strong>Neovascular glaucoma:</strong> new vessels in angle (from PDR, CRVO, CRAO) — rubeosis iridis — obstruct drainage. All are secondary angle-closure forms.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Secondary Glaucomas</span><span class="n-section-tag">trabecular meshwork is always the common pathway</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Pseudoexfoliation glaucoma (XFG):</strong> most common identifiable secondary glaucoma worldwide. Flaky white material (abnormal fibrillar protein) deposited on lens, zonules, trabecular meshwork → outflow obstruction. Pupil dilation reveals white ring on lens. Higher IOP spikes. Associated with zonular weakness → complicated cataract surgery.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Pigment dispersion syndrome:</strong> iris pigment released by posterior iris rubbing against zonular packets → pigment deposits on corneal endothelium (Krukenberg spindle), trabecular meshwork. Myopic males in 20s–30s. <strong>Iris transillumination defects.</strong></div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Steroid-induced glaucoma:</strong> topical, oral, or periocular steroids → reduced trabecular phagocytosis → IOP rise in 6 weeks. <strong>Never prescribe topical steroids without IOP monitoring.</strong> Occurs in ~30% of the general population (steroid responders). Risk highest with topical &gt; periocular &gt; oral &gt; inhaled.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Neovascular glaucoma (NVG):</strong> retinal ischaemia (PDR, CRVO, CRAO, ocular ischaemic syndrome) → VEGF → rubeosis iridis (new vessels on iris surface and angle) → closed angle. <strong>Rubeosis = ocular emergency.</strong> Anti-VEGF + panretinal photocoagulation + glaucoma surgery.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Sudden severe unilateral pain + nausea/vomiting + halos around lights + injected eye + fixed mid-dilated oval pupil + hazy cornea → think <em>acute angle-closure glaucoma</em> → IV acetazolamide + topical pilocarpine. Not migraine. Not acute abdomen.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The mid-dilated oval pupil is the key</div><div class="n-distractor-text">In acute angle-closure the ischaemic iris sphincter fails → <strong>fixed mid-dilated OVAL pupil</strong>. This is the pathognomonic finding missed when doctors focus on the headache and vomiting. A miotic pupil in a red painful eye = uveitis, not closure. The shape and fixity separate them.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Treatment Algorithm</span><span class="n-section-tag">reduce IOP by every mechanism simultaneously in acute closure</span></div>
  <div class="n-algo">
    <div class="n-algo-row"><div class="n-algo-step s-first">POAG 1st line</div><div class="n-algo-body"><strong>Prostaglandin analogues (latanoprost 0.005%, bimatoprost 0.03%)</strong> — most effective single agent (25–35% reduction). Once-daily evening. FP receptor → uveoscleral outflow. SE: iris colour change (permanent), periorbital fat atrophy (PAP), increased lash growth, CMO in pseudophakic patients.</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-fail">Add-on agents</div><div class="n-algo-body"><strong>Timolol 0.5%</strong> (beta-blocker — <em>CI: asthma, COPD, heart block, bradycardia</em>). <strong>Dorzolamide</strong> (topical CAI). <strong>Brimonidine</strong> (alpha-2 agonist — <em>CI: infants, MAOIs</em>). <strong>Selective laser trabeculoplasty (SLT)</strong> is now first-line equivalent to drops in POAG — LiGHT trial evidence.</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-severe">Acute Closure</div><div class="n-algo-body"><strong>IV acetazolamide 500mg</strong> (CI: sulfonamide allergy) + <strong>topical pilocarpine 2%</strong> (constricts pupil, opens angle) + topical beta-blocker + topical CAI. Supine positioning. IV mannitol if IOP unresponsive. Definitive: <strong>Nd:YAG laser peripheral iridotomy (LPI)</strong> — creates hole in iris bypassing pupil block.</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-unstable">Fellow Eye</div><div class="n-algo-body"><strong>Prophylactic LPI to fellow eye after any acute closure.</strong> 50% lifetime risk without treatment. Same narrow anatomy, same risk.</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-first">Surgery</div><div class="n-algo-body dark-body">Trabeculectomy (gold standard filtering surgery), MIGS (minimally invasive — iStent, Hydrus), Ahmed/Baerveldt drainage implants for refractory cases.<span class="n-involve">Glaucoma subspecialty</span></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Risk Factors and Screening</span><span class="n-section-tag">who to screen</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">POAG</div><div class="n-pearl-body"><strong>Age &gt;60, Afro-Caribbean ethnicity (3–4× risk), family history (1st degree = 10× risk), myopia, central corneal thickness &lt;555μm, raised IOP (but not required).</strong> NHS England offers free NHS sight tests to first-degree relatives of glaucoma patients and all over 40s at risk.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">Closure</div><div class="n-pearl-body"><strong>Female, Asian, hyperopia, increasing age (lens grows throughout life), family history.</strong> Drug history critical — anticholinergics, sympathomimetics, topiramate (ciliary body oedema causing secondary closure in young patients).</div></div>
    <div class="n-pearl"><div class="n-pearl-num">NTG</div><div class="n-pearl-body"><strong>Raynaud's, migraine, nocturnal hypotension, sleep apnoea, Japanese ethnicity (highest prevalence of NTG globally).</strong> 90% of glaucoma in Japan is NTG.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">08</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Glaucoma is defined by optic neuropathy + VF loss, NOT by IOP.</strong> IOP is a modifiable risk factor, not the definition. NTG proves this.<span class="n-pearl-exam">Exam: can glaucoma occur with normal IOP? What is this called?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>SLT is now first-line equivalent to drops (LiGHT trial).</strong> Laser trabeculoplasty first, with drops as add-on — reverses the traditional hierarchy in suitable patients.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Timolol → systemic beta-blockade via nasolacrimal absorption.</strong> First-pass metabolism bypassed. Real bronchospasm, real bradycardia, real heart block. Always take a systemic history before prescribing.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>OCT RNFL changes precede VF loss by 5–10 years.</strong> Structure fails before function is measurable. Glaucoma suspects need OCT — VF testing alone misses early disease.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Pseudoexfoliation syndrome = most common secondary glaucoma globally.</strong> Look for white flaky material on the lens anterior capsule under slit lamp. Zonular fragility complicates cataract surgery.<span class="n-pearl-exam">Exam: Krukenberg spindle is pathognomonic of which condition?</span></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">09</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Acute angle-closure causes a constricted pupil from the massively elevated IOP.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Acute closure causes a FIXED, MID-DILATED, OVAL pupil.</strong> The ischaemic iris sphincter fails at extreme IOP — it cannot constrict. Pilocarpine is given specifically to force constriction and pull the iris away from the trabecular meshwork.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal IOP rules out glaucoma — if IOP is 16, the patient cannot have glaucoma.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Normal-tension glaucoma accounts for ~30–40% of POAG in Caucasian populations and 90%+ in Japan.</strong> Diagnosis requires disc assessment + VF + OCT, not IOP alone. Never dismiss glaucomatous disc changes because IOP is "normal."</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">POAG patients complain of blurred vision and come early because central vision is affected.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Peripheral field loss is the hallmark of POAG. Central acuity is preserved until very late disease.</strong> Patients are asymptomatic until &gt;30% of ganglion cells are dead. The fellow eye compensates further. This is why screening is essential — patients do not self-refer.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Fixed. Mid-dilated. Oval. Red eye. Vomiting.</em><br>Not migraine. Acute angle-closure. Every minute matters.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.glaucoma=[{q:"68-year-old asthmatic with POAG started timolol. Now has worsening breathlessness. Action?",opts:["Switch to preservative-free timolol","Stop timolol — systemic beta-2 blockade via NLD absorption. Switch to prostaglandin","Coincidental COPD — continue","Change instillation technique"],ans:1,focus:"Timolol — asthma contraindication",exp:"Timolol absorbed via nasolacrimal duct → beta-2 blockade → bronchospasm. Contraindicated in asthma/COPD. Switch to prostaglandin analogue (latanoprost)."},{q:"Sudden headache + nausea + halos + red eye + fixed mid-dilated oval pupil + hazy cornea. Diagnosis?",opts:["Migraine — discharge with analgesia","Uveitis — steroids","Acute angle-closure — IV acetazolamide","Conjunctivitis — chloramphenicol"],ans:2,focus:"Acute angle-closure — mid-dilated oval",exp:"Acute angle-closure: IOP 40–70mmHg → corneal oedema, pain, nausea, red eye, fixed mid-dilated OVAL pupil. IV acetazolamide 500mg, pilocarpine, beta-blocker. Definitive: LPI."},{q:"After right acute closure, what for the left eye?",opts:["Observe","Pilocarpine drops only","Prophylactic Nd:YAG peripheral iridotomy","Systemic acetazolamide both eyes"],ans:2,focus:"Fellow eye prophylactic LPI",exp:"Fellow eye has same narrow anatomy → 50% lifetime closure risk without treatment. Prophylactic LPI creates alternative aqueous route, bypassing pupil block."},{q:"POAG patient IOP 18mmHg but progressive disc cupping + VF loss. Diagnosis?",opts:["Ocular hypertension","Normal-tension glaucoma","Pseudoexfoliation glaucoma","Steroid-induced"],ans:1,focus:"Normal-tension glaucoma",exp:"NTG: optic neuropathy + VF loss despite normal IOP. Mechanism: vascular insufficiency. Associations: Raynaud's, migraine, nocturnal hypotension."},{q:"Why are POAG patients often symptom-free until late?",opts:["Central loss first — notice blurring","Peripheral loss first; >30% ganglion cells die before symptoms; fellow eye compensates","Uniform constriction from outset","Altitudinal loss sparing central"],ans:1,focus:"POAG — peripheral first, central late",exp:"POAG: peripheral VF loss (arcuate, nasal step) first. Central acuity preserved until very late. Fellow eye compensates. >30% ganglion cells dead before detectable defects."}];

// ── REFRACTION ──
NOTES.refraction = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Optics · Note 09</div>
  <div class="n-hero-title">Refraction &amp;<br><em>Refractive Surgery</em></div>
  <div class="n-hero-sub">Myopia · Hyperopia · Astigmatism · Presbyopia · LASIK · Phakic IOL</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The errors</div><div class="n-snap-text">Myopia: image anterior to retina. Hyperopia: posterior. Astigmatism: multiple foci. Presbyopia: age-related accommodation loss after 40.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Lenses</div><div class="n-snap-text">Myopia → concave (minus). Hyperopia → convex (plus).</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Key caveat</div><div class="n-snap-text">LASIK reshapes the cornea. <strong>It does NOT prevent presbyopia</strong> — caused by lens inelasticity, not corneal curvature.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Four Errors</span><span class="n-section-tag">optics and clinical implications</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Myopia — globe too long</div><div class="n-mech-text">Distant blur, near clear. High myopia (&gt;6D): retinal detachment, glaucoma, myopic maculopathy risk. Concave lens. LASIK flattens cornea.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Hyperopia — globe too short</div><div class="n-mech-text">Young compensate by accommodating. <strong>Uncorrected hyperopia in children → accommodative esotropia → amblyopia risk.</strong> Convex lens. First presentation may be a squint.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Keratoconus — irregular astigmatism</div><div class="n-mech-text">Cannot be corrected with spectacles. Rigid contact lenses or DALK. Signs: Munson's sign, scissor reflex on retinoscopy, Fleischer's ring. Progressive in teens. <strong>Absolute CI to LASIK.</strong></div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">45-year-old holding phone at arm's length, previously normal vision → think <em>presbyopia</em> → reading glasses (+1.00 to +2.50D). Universal after 40.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Presbyopia vs Hyperopia</div><div class="n-distractor-text">Both cause near difficulty + corrected with plus lens. <strong>Presbyopia: everyone after 40, lens inelasticity. Hyperopia: short globe, may be childhood.</strong> Hyperopes become symptomatic earlier — less accommodative reserve.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Hyperopic children develop convergent squint — not myopic.</strong> Accommodation drives convergence.<span class="n-pearl-exam">Exam: why does hyperopia cause convergent squint?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>High myopia = retinal detachment risk.</strong> Warn: new floaters/flashes = same-day review.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Phakic IOL preferred for high myopia (&gt;-8D)</strong> or thin corneas — no stroma removed, reversible.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">LASIK cures presbyopia — no more reading glasses.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Refractive surgery corrects corneal curvature, not lens inelasticity.</strong> Must be stated in pre-op counselling.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Long-sighted children see well — no squint risk.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Hyperopia drives accommodative esotropia.</strong> All children with new squint need cycloplegic refraction.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Minus for myopia. Plus for hyperopia.</em><br>Surgery reshapes the cornea. It cannot reverse the ageing lens.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.refraction=[{q:"6-year-old, right convergent squint. Cycloplegic refraction: +4.50D bilateral. Mechanism?",opts:["Myopia → divergence — minus lenses","Hyperopia → excess accommodation → convergence — plus lenses","Astigmatism — cylinder","Presbyopia — readers"],ans:1,focus:"Hyperopia → accommodative esotropia",exp:"Accommodative esotropia: hyperopia → excessive accommodation → convergence via AC/A → esotropia. Correct with full cycloplegic refraction. Squint may resolve with specs if purely accommodative."},{q:"48-year-old emmetrope holds books at arm's length. Cause?",opts:["Myopia — concave lens","Hyperopia — convex","Presbyopia — reading glasses (plus lens)","Astigmatism — cylinder"],ans:2,focus:"Presbyopia",exp:"Presbyopia: lens inelasticity after 40. Universal. Corrected with plus reading glasses. Myope may read without glasses by removing distance correction."},{q:"Key contraindication before LASIK?",opts:["Myopia >-3D","Keratoconus — LASIK causes ectasia","Age under 21","Previous viral conjunctivitis"],ans:1,focus:"Keratoconus — absolute CI to LASIK",exp:"Keratoconus is absolute CI to LASIK. Removing stroma from already thinning cornea → catastrophic ectasia. Screen with topography pre-operatively."},{q:"Patient with -10D myopia wants refractive surgery. Why unsuitable for LASIK?",opts:["LASIK is ideal for high myopia","Would leave unsafe residual bed — phakic IOL preferred","PRK always preferred","LASIK can't correct astigmatism"],ans:1,focus:"High myopia — phakic IOL",exp:"High myopia (>-8D): LASIK ablates too much stroma → residual bed <250μm → ectasia risk. Phakic IOL placed in posterior chamber. No stroma removed, reversible."},{q:"Which refractive error carries increased RD risk?",opts:["Hyperopia — convergence traction","Myopia — elongated globe → stretched retina → lattice → tears","Astigmatism","Presbyopia"],ans:1,focus:"Myopia and RD risk",exp:"High myopia: elongated axial length stretches retina thin → lattice degeneration → tears → detachment. Risk significant above -6D."}];

// ── RETINAL DETACHMENT ──
NOTES.retdetach = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Retina · Note 12</div>
  <div class="n-hero-title">Retinal<br><em>Detachment</em></div>
  <div class="n-hero-sub">Rhegmatogenous · Tractional · Exudative · PVD · Macula-on vs Off · AMD · Surgery</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">What happens</div><div class="n-snap-text">Neurosensory retina separates from RPE → photoreceptors lose choroidal O₂/nutrients → irreversible damage within hours to days.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Warning sequence</div><div class="n-snap-text">Flashes (vitreous traction on retina) → floaters (pigment cells or haemorrhage) → dark curtain from periphery. <strong>10–15% of symptomatic PVDs have a concurrent retinal tear.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The urgency rule</div><div class="n-snap-text"><strong>Macula-on (VA 6/6) = same-day surgery.</strong> Every hour risks the fovea detaching. Macula-off = still urgent but prognosis for central vision is guarded.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">PVD — The Precursor Event</span><span class="n-section-tag">flashes + floaters = same-day exam</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Vitreous syneresis → PVD</div><div class="n-mech-text">With age, vitreous gel liquefies (syneresis) and collapses away from the retinal surface. PVD occurs in 75% of adults over 65. Usually benign. The <strong>Weiss ring</strong> (annular floater from vitreopapillary adhesion site) is pathognomonic of PVD. <strong>Flashes</strong> occur as the vitreous tugs on the retina during PVD.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Vitreoretinal traction at sites of strong adhesion</div><div class="n-mech-text">Where vitreous is strongly adherent — <strong>lattice degeneration</strong>, retinal vessels, vitreous base — PVD creates a horseshoe (flap) tear. Liquid vitreous then accesses the subretinal space. Risk factors: high myopia (elongated globe, thin peripheral retina), prior cataract surgery (posterior capsule absent), retinal tears in fellow eye, trauma, lattice degeneration. <strong>A shower of new floaters = pigment cells (tobacco dust) = Shafer's sign = retinal tear until proven otherwise.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">The curtain sign — detachment progression</div><div class="n-mech-text">Subretinal fluid extends from the tear → neurosensory retina lifts from RPE → <strong>dark curtain or shadow rising from the periphery toward fixation.</strong> Rate of progression depends on tear size and position. Superior tears (fluid falls with gravity) progress faster than inferior tears. Macula involvement ends the window of opportunity for full VA recovery.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Three Types of Retinal Detachment</span><span class="n-section-tag">mechanism determines surgery</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Rhegmatogenous — most common (Greek: rhegma = break)</div><div class="n-mech-text">Retinal break (tear or hole) → liquid vitreous enters subretinal space → bullous peripheral detachment. <strong>Surgery options: (1) Pneumatic retinopexy</strong> — intravitreal gas bubble + laser/cryo to seal tear, head positioning required, ambulatory. <strong>(2) Scleral buckle</strong> — silicone band sewn around eye to indent the sclera and close the tear from outside. Gold standard for inferior tears and aphakic detachments. <strong>(3) Pars plana vitrectomy (PPV)</strong> — remove vitreous, drain SRF, laser, gas or silicone oil tamponade. Commonest surgery in developed world.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Tractional — fibrovascular membranes pull retina from RPE</div><div class="n-mech-text">No retinal break. Concave retinal configuration. Causes: <strong>proliferative diabetic retinopathy (PDR)</strong> (most common), sickle cell retinopathy, retinopathy of prematurity (ROP), penetrating trauma. Treatment: <strong>PPV to remove fibrovascular membranes.</strong> Pre-operative anti-VEGF reduces intraoperative haemorrhage in PDR. Often coexists with rhegmatogenous RD (combined tractional-rhegmatogenous) — more complex surgery.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Exudative (secondary) — fluid without break</div><div class="n-mech-text">Subretinal fluid accumulates from breakdown of blood-retinal barrier. <strong>No retinal tear. Smooth, convex surface. Fluid shifts with head position (shifting fluid sign).</strong> Causes: choroidal tumour (uveal melanoma, choroidal haemangioma), posterior scleritis, Vogt-Koyanagi-Harada syndrome (VKH), eclampsia, central serous chorioretinopathy (CSC). Treatment: address underlying cause — no surgical reattachment.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">AMD and the Posterior Pole</span><span class="n-section-tag">the other major retinal emergency</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this">
      <div class="n-diff-card-tag">Dry AMD</div>
      <div class="n-diff-card-name">Drusen → geographic atrophy</div>
      <div class="n-diff-card-key">Hard drusen (small, well-defined) → soft drusen (large, confluent) → geographic atrophy of RPE. Slow progressive central VL. <strong>No proven treatment. AREDS2 supplements slow progression to wet AMD in intermediate disease</strong> (AREDS2: vit C, vit E, zinc, lutein, zeaxanthin — replaces beta-carotene which increased lung cancer risk in smokers).</div>
    </div>
    <div class="n-diff-card that">
      <div class="n-diff-card-tag">Wet AMD</div>
      <div class="n-diff-card-name">CNV → rapid central VL — emergency</div>
      <div class="n-diff-card-key">Choroidal neovascularisation (CNV) → subretinal or sub-RPE fluid + haemorrhage → distortion (metamorphopsia), rapid central VL. <strong>Same-day referral to medical retina.</strong> Treatment: <strong>intravitreal anti-VEGF (ranibizumab, aflibercept, bevacizumab, faricimab)</strong> — monthly loading + PRN dosing. Amsler grid monitoring at home for metamorphopsia between appointments.</div>
    </div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Myope + sudden shower of floaters + flashes + dark curtain rising from below + VA still 6/6 → think <em>macula-on rhegmatogenous RD</em> → same-day dilated exam + same-day surgery. Every hour counts.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Shafer's sign — tobacco dust</div><div class="n-distractor-text"><strong>Pigment cells (tobacco dust) in the vitreous on slit lamp = Shafer's sign = retinal tear until proven otherwise.</strong> These are RPE cells liberated when the retina tears. A quiet vitreous at the slit lamp is reassuring; tobacco dust is not. It does not always mean detachment has occurred — but it means a tear is almost certainly present.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Red Flags</span><span class="n-section-tag">must not miss</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>New floaters ± flashes = same-day dilated fundal examination.</strong> Normal VA does NOT exclude macula-on RD. Every GP and ED doctor must know this. Missing a macula-on RD = preventable permanent central visual loss.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Macula-on RD = same-day emergency surgery.</strong> The foveal photoreceptors have the highest metabolic demands and the shortest survival time once detached. Surgical success rates (anatomical reattachment) are &gt;90% for primary RD but central VA recovery depends entirely on whether the macula was ever detached.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Dense vitreous haemorrhage + new floaters + no fundal view = B-scan ultrasound urgently.</strong> Haemorrhage may be masking an underlying RD. B-scan confirms or excludes retinal detachment when the fundus cannot be visualised optically.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Wet AMD with new metamorphopsia or sudden central blur = same-day medical retina referral.</strong> Anti-VEGF initiated promptly can preserve and sometimes recover VA. Delayed treatment allows fibrotic scar formation (disciform scar) — untreatable.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Tobacco dust (Shafer's sign) in anterior vitreous = retinal tear until proven otherwise.</strong> RPE cells freed through the break. Present before frank detachment develops.<span class="n-pearl-exam">Exam: what does Shafer's sign indicate?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Exudative RD: shifting fluid, no break, smooth convex surface.</strong> Never operated — treat the cause. Shifting fluid distinguishes it from rhegmatogenous at the bedside.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>AREDS2 supplements are for intermediate AMD only — not mild or advanced.</strong> They do not reverse existing damage; they reduce the 5-year risk of progression to advanced AMD by ~25%.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Proliferative vitreoretinopathy (PVR) is the main cause of surgical failure in RD.</strong> RPE cells migrate, proliferate on vitreous and retinal surfaces → traction → re-detachment. Silicone oil may be needed for complex PVR.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal VA + new floaters = benign PVD — review in 6 weeks.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Same-day dilated fundal exam is mandatory regardless of VA.</strong> A macula-on RD has VA 6/6. The point is to prevent VA from ever falling. A 6-week review is completely inappropriate for new floaters.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Macula-off RD can wait until next morning — the macula is already gone so urgency is lower.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Macula-off RD still needs urgent surgery — ideally within 24h of macular involvement.</strong> The longer the fovea is detached, the worse and more unpredictable the central vision recovery. Even macula-off operations done within 24h can achieve good central VA outcomes.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Flashes. Floaters. Curtain. Tobacco dust.</em><br>Same-day exam. Macula-on = same-day surgery. No exceptions.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.retdetach=[{q:"55-year-old myope, sudden new floaters + photopsia. VA 6/6. Immediate management?",opts:["Reassure — PVD in myopes is common, review 6 weeks","Same-day dilated fundal exam","Lubricating drops","Urgent MRI orbit"],ans:1,focus:"New PVD — same-day exam",exp:"New floaters + flashes = same-day dilated fundal exam. 10–15% of symptomatic PVDs have concurrent retinal tear. Normal VA does NOT exclude RD."},{q:"RD with VA 6/6. What does this indicate and surgical urgency?",opts:["Exudative — less urgent","Macula still on — same-day emergency surgery","Small — monitor 48 hours","Normal VA = surgery not required"],ans:1,focus:"Macula-on = same-day surgery",exp:"VA 6/6 with RD = macula still attached. This is the critical window. Same-day surgery preserves post-operative 6/6. Delay risks macular detachment and permanent central loss."},{q:"Diabetic with PDR has RD. Type and treatment?",opts:["Exudative — anti-VEGF","Tractional — fibrovascular membranes, no break; vitrectomy","Rhegmatogenous — pneumatic retinopexy","Exudative — fluid shifts with gravity"],ans:1,focus:"Tractional RD in PDR",exp:"Tractional RD in PDR: fibrovascular membranes contract, pull retina. No retinal break. Concave configuration. Treatment: pars plana vitrectomy to remove membranes."},{q:"Which is NOT a risk factor for rhegmatogenous RD?",opts:["High myopia","Lattice degeneration","Previous cataract surgery","Hyperopia"],ans:3,focus:"RD risk factors",exp:"Hyperopia is NOT a risk factor. Risk factors: high myopia, lattice degeneration, aphakia/pseudophakia, family history, fellow-eye RD, trauma."},{q:"Pathognomonic floater of uncomplicated PVD?",opts:["Multiple dark dots throughout VF","Single large ring-shaped floater (Weiss ring)","Curtain from below","Zigzag shimmering lights"],ans:1,focus:"Weiss ring — PVD",exp:"Weiss ring: annular floater from vitreopapillary attachment detaching. Pathognomonic of PVD. Zigzag lights = migraine scintillating scotoma, not retinal."}];


// ── VASCULAR RETINOPATHY ──
NOTES.vascular = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Retinal Disease · Note 15</div>
  <div class="n-hero-title">Vascular<br><em>Retinopathy</em></div>
  <div class="n-hero-sub">CRAO · CRVO · BRVO · BRAO · Amaurosis Fugax · Rubeosis · Emboli</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The four entities</div><div class="n-snap-text">CRAO (artery central), CRVO (vein central), BRVO (vein branch), BRAO (artery branch). Arterial = white retina, cherry red spot. Venous = flame haemorrhages, dilated tortuous veins.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">CRAO emergency window</div><div class="n-snap-text">Retinal ischaemia is irreversible within 90–100 minutes. <strong>Same urgency as cerebral stroke — urgent vascular investigation.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">CRVO complication</div><div class="n-snap-text">Ischaemic CRVO → VEGF production → rubeosis iridis → neovascular glaucoma. <strong>100-day glaucoma rule.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">CRAO — Central Retinal Artery Occlusion</span><span class="n-section-tag">the retinal stroke</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Mechanism and fundoscopic appearance</div><div class="n-mech-text">Embolism (most common — Hollenhorst plaque from carotid, cardiac, or air embolus), thrombosis, vasospasm, giant cell arteritis. Central retinal artery is an end artery — no collaterals. <strong>Fundoscopy: diffuse pale/white oedematous retina + cherry red spot at fovea</strong> (choroidal circulation visible through thin foveal retina against pale surrounding ischaemic retina). Attenuated arterioles, box-carring of blood column (segmentation).</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Presentation and examination</div><div class="n-mech-text"><strong>Sudden profound painless monocular visual loss — VA often perception of light or worse.</strong> Large RAPD. A cilioretinal artery (present in 20–30% of people, supplied by choroidal circulation) may preserve a small central island of vision. FFA: prolonged arteriovenous transit time.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Management — treat as stroke equivalent</div><div class="n-mech-text"><strong>Ocular massage (2 min on/off) + IV acetazolamide + anterior chamber paracentesis</strong> to lower IOP and dislodge embolus. All have limited evidence. <strong>Urgent investigation for embolic source: carotid Doppler, echo, cardiac monitoring (AF), ESR/CRP (GCA in elderly).</strong> Fast-track TIA clinic referral. No proven thrombolysis benefit for retinal artery (unlike cerebral). Prognosis poor — &lt;30% recover useful vision.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">CRVO — Central Retinal Vein Occlusion</span><span class="n-section-tag">thunderstorm on the fundus</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Mechanism</div><div class="n-mech-text">Thrombus at the lamina cribrosa where CRV shares adventitial sheath with CRA — atherosclerotic artery compresses vein. Risk factors: <strong>hypertension (most important), diabetes, hyperlipidaemia, glaucoma, hyperviscosity (polycythaemia, myeloma, protein C/S deficiency), oral contraceptive pill in young women.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Fundoscopic appearance — "stormy sunset"</div><div class="n-mech-text"><strong>Flame haemorrhages in all 4 quadrants, dilated tortuous veins, disc oedema, cotton wool spots.</strong> "Blood and thunder" fundus. The extent of haemorrhage reflects venous pressure elevation. Distinct from DR which has dot/blot haemorrhages, microaneurysms, and no venous tortuosity.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Ischaemic vs non-ischaemic CRVO</div><div class="n-mech-text"><strong>Non-ischaemic (80%):</strong> VA may be 6/12 or better. Collateral vessels develop. Some spontaneous recovery. CMO is main cause of persistent VL. <strong>Ischaemic (20%):</strong> &gt;10 disc areas of capillary non-perfusion on FFA, severe VL (CF or worse), RAPD, extensive haemorrhage. High risk of rubeosis iridis and NVG within 90–100 days (<strong>"100-day glaucoma"</strong>). Monthly iris examination mandatory.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">BRVO and BRAO</span><span class="n-section-tag">branch occlusions — wedge pattern</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this">
      <div class="n-diff-card-tag">BRVO (Branch Retinal Vein)</div>
      <div class="n-diff-card-name">Sector haemorrhage, AV crossing</div>
      <div class="n-diff-card-key">Atherosclerotic arteriole compresses vein at AV crossing. <strong>Flame haemorrhages in one sector only (wedge-shaped, apex at AV crossing).</strong> Superotemporal most common. CMO most common cause of VL. Treatment: <strong>intravitreal anti-VEGF or steroid implant (ozurdex) for CMO. Laser PRP if neovascularisation develops.</strong></div>
    </div>
    <div class="n-diff-card that">
      <div class="n-diff-card-tag">BRAO (Branch Retinal Artery)</div>
      <div class="n-diff-card-name">Wedge of white retina, emboli</div>
      <div class="n-diff-card-key">Embolus lodges in branch artery. <strong>Sector of pale oedematous retina corresponding to the occluded branch's territory. Hollenhorst plaque</strong> (bright yellow glistening cholesterol embolus) may be visible at arteriolar bifurcation. Sectoral VF defect. Management: embolic source workup.</div>
    </div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Amaurosis Fugax</span><span class="n-section-tag">TIA of the eye</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Painless monocular visual loss lasting seconds to minutes described as a "curtain coming down" over vision then fully recovering → think <em>amaurosis fugax</em> → same-day vascular neurology / TIA clinic. Carotid embolism until proven otherwise.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Monocular vs binocular — critical distinction</div><div class="n-distractor-text"><strong>Amaurosis fugax is MONOCULAR</strong> (one eye, carotid territory). <strong>Binocular transient VL</strong> (both eyes simultaneously or temporal field both eyes) = posterior circulation TIA (vertebrobasilar). The patient's cover test distinguishes them — covering one eye: if loss persists in one eye = monocular = carotid.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Treatment of Macular Oedema in Vascular Occlusions</span><span class="n-section-tag">anti-VEGF era</span></div>
  <div class="n-algo">
    <div class="n-algo-row"><div class="n-algo-step s-first">CRVO + CMO</div><div class="n-algo-body"><strong>Intravitreal anti-VEGF (ranibizumab, aflibercept)</strong> — first-line. Monthly loading doses then PRN. Reduces CMO, improves VA in ~50%. Intravitreal dexamethasone implant (Ozurdex) — alternative, longer-acting but raises IOP and causes cataract. Treat underlying risk factors.</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-fail">BRVO + CMO</div><div class="n-algo-body">Anti-VEGF (ranibizumab licensed for BRVO-CMO). Ozurdex alternative. <strong>Grid laser photocoagulation for BRVO-CMO</strong> was first-line pre-anti-VEGF era — still used in resource-limited settings. PRP for sector neovascularisation.</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-severe">Ischaemic CRVO</div><div class="n-algo-body"><strong>Monthly iris examination for rubeosis iridis.</strong> If rubeosis develops: urgent panretinal photocoagulation (PRP) + anti-VEGF + glaucoma management. Pre-emptive PRP in dense ischaemia is controversial but increasingly practiced.</div></div>
    <div class="n-algo-row"><div class="n-algo-step s-unstable">Systemic</div><div class="n-algo-body dark-body">All vascular occlusions: BP, glucose, lipids, FBC, ESR/CRP (elderly), thrombophilia screen if young (&lt;50 with no other risk factors), echo + Holter if embolism suspected.<span class="n-involve">Medical Retina + Cardiology/Neurology/Haematology</span></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Cherry red spot at fovea = CRAO.</strong> The thin fovea lets orange-red choroidal circulation show through, while surrounding ischaemic retina appears pale white.<span class="n-pearl-exam">Exam: what fundoscopic finding is pathognomonic of CRAO?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>CRVO = all 4 quadrant flame haemorrhages + dilated tortuous veins + disc oedema.</strong> If haemorrhage is wedge-shaped confined to one sector = BRVO. Quadrant symmetry = CRVO.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>100-day glaucoma:</strong> ischaemic CRVO → retinal ischaemia → VEGF → iris neovascularisation → NVG. Monthly iris checks for 3 months mandatory. Rubeosis = emergency PRP + anti-VEGF.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Hollenhorst plaque = bright yellow glistening cholesterol embolus at arteriolar bifurcation.</strong> May be asymptomatic if small. Indicates ipsilateral carotid atherosclerosis. Always investigate carotid and cardiac source.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>CRAO in a young patient with no vascular risk factors:</strong> cardiac embolism, carotid dissection, hypercoagulable state, paradoxical embolus (PFO), vasculitis. Thrombophilia screen + echo + Holter.<span class="n-pearl-exam">Exam: what workup is required for CRAO in a 35-year-old?</span></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">CRAO presents with a painful red eye.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CRAO is painless and the eye is white and quiet.</strong> Sudden profound monocular VL in a white eye = vascular emergency. The absence of redness and pain causes dangerous delay in recognition and workup.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">CRVO fundus looks like diabetic retinopathy — they are clinically indistinguishable.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CRVO: flame haemorrhages all 4 quadrants, dilated tortuous veins, disc oedema.</strong> DR: dot/blot haemorrhages (intraretinal), microaneurysms, hard exudates, normal veins. The distribution, haemorrhage morphology, and venous appearance are different.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Amaurosis fugax is bilateral transient VL — the same as a posterior TIA.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Amaurosis fugax is strictly MONOCULAR</strong> (carotid territory). Bilateral simultaneous transient VL = posterior circulation TIA. This distinction critically changes the vascular territory investigated and the treatment pathway.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Cherry red spot. Thunderstorm fundus. Curtain descending.</em><br>Every vascular occlusion needs an embolic source search today.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.vascular=[{q:"A 68-year-old with atrial fibrillation has sudden painless profound monocular VL. VA: perception of light. Fundoscopy: pale white retina with cherry red spot at fovea. Diagnosis and most urgent systemic investigation?",opts:["CRVO — anti-VEGF injection","CRAO — urgent carotid Doppler, echo, ESR, cardiac monitoring","Ischaemic CRVO — panretinal photocoagulation","Posterior circulation stroke — MRI brain"],ans:1,focus:"CRAO — cherry red spot + embolic workup",exp:"CRAO: end-artery embolus. Cherry red spot = thin fovea letting choroidal circulation show through against pale ischaemic surrounding retina. Urgent embolic workup: carotid Doppler, echocardiography, 24h cardiac monitoring (AF), ESR/CRP (GCA). RAPD present."},{q:"Fundoscopy shows flame haemorrhages in all four quadrants, dilated tortuous veins, and a swollen disc. What is the diagnosis?",opts:["Proliferative diabetic retinopathy","CRVO — central retinal vein occlusion","BRVO — branch vein occlusion","Hypertensive retinopathy grade III"],ans:1,focus:"CRVO — all 4 quadrant haemorrhages",exp:"CRVO: 'blood and thunder' fundus — flame haemorrhages all 4 quadrants, dilated tortuous veins, disc oedema. Compare with DR (dot/blot haemorrhages, microaneurysms, no venous tortuosity) and BRVO (one sector wedge pattern)."},{q:"A patient with ischaemic CRVO is monitored monthly. At 10 weeks, new vessels are seen on the iris surface. What is the diagnosis and immediate management?",opts:["Normal collateral vessel formation — continue monitoring","Rubeosis iridis — urgent panretinal photocoagulation + anti-VEGF","Posterior synechiae — topical steroids","Iris naevus — photograph and monitor"],ans:1,focus:"Rubeosis — 100-day glaucoma",exp:"Rubeosis iridis: retinal ischaemia → VEGF → iris neovascularisation → neovascular glaucoma ('100-day glaucoma'). Emergency: PRP to reduce retinal VEGF production + intravitreal anti-VEGF. Without treatment → closed angle → intractable pain + blindness."},{q:"A 45-year-old woman describes episodes of a 'curtain descending' over her right eye lasting 5 minutes, then fully resolving, 3 times this week. Diagnosis and management?",opts:["Bilateral posterior circulation TIA — aspirin + statin","Amaurosis fugax — same-day TIA clinic, carotid Doppler, echo, cardiac monitoring","Migraine with aura — triptans","Acute angle-closure — topical pilocarpine"],ans:1,focus:"Amaurosis fugax — monocular TIA",exp:"Amaurosis fugax: monocular transient VL from carotid territory embolism. 'Curtain' descending and lifting = CRA territory. Same-day TIA pathway. Carotid Doppler: stenosis >70% → carotid endarterectomy. Distinguish from binocular transient VL = posterior circulation TIA."},{q:"Which finding on fundoscopy distinguishes BRVO from CRVO?",opts:["Dilated tortuous veins","Flame haemorrhages confined to one sector in a wedge pattern, apex at an AV crossing","Disc oedema","Cotton wool spots"],ans:1,focus:"BRVO vs CRVO — distribution",exp:"BRVO: haemorrhages confined to one sector (wedge-shaped, apex at AV crossing where atherosclerotic arteriole compresses vein). Superotemporal most common. CRVO: all 4 quadrant haemorrhages, dilated veins everywhere, disc oedema."}];

// ── ORBIT ──
NOTES.orbit = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Orbit · Note 15</div>
  <div class="n-hero-title">The<br><em>Orbit</em></div>
  <div class="n-hero-sub">Orbital vs Preseptal Cellulitis · Thyroid Eye Disease · Proptosis · Blow-out Fracture</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The septum divides everything</div><div class="n-snap-text">Preseptal = not sight-threatening. Postseptal (orbital) = threatens vision and life. <strong>Proptosis + EOM restriction = orbital until proven otherwise.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Most common proptosis</div><div class="n-snap-text">Adults: thyroid eye disease. Unilateral proptosis, no obvious cause → CT orbit today.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">TED threats</div><div class="n-snap-text">Dysthyroid optic neuropathy (DON) and corneal exposure are sight-threatening.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Orbital vs Preseptal Cellulitis</span><span class="n-section-tag">the septum is everything</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this"><div class="n-diff-card-tag">Preseptal</div><div class="n-diff-card-name">Anterior to septum — lid only</div><div class="n-diff-card-key">Lid oedema + erythema. <strong>No proptosis, no EOM restriction, normal VA.</strong> Oral co-amoxiclav. Admit children &lt;5.</div></div>
    <div class="n-diff-card that"><div class="n-diff-card-tag">Orbital (Postseptal)</div><div class="n-diff-card-name">Emergency</div><div class="n-diff-card-key"><strong>Proptosis + restricted painful EOM + VA reduction + fever.</strong> Usually ethmoid sinusitis. Risk: subperiosteal abscess, cavernous sinus thrombosis. IV co-amoxiclav + urgent CT + ophtho + ENT.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Child + sinusitis + lid swelling + proptosis + pain on eye movement → think <em>orbital cellulitis</em> → CT orbit + IV antibiotics + ophtho + ENT. Exclude subperiosteal abscess.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The dangerous distractor</div><div class="n-distractor-text">Both cause lid swelling externally. <strong>Internal signs distinguish them: proptosis, EOM restriction, pain on movement, VA reduction.</strong> When in doubt: CT orbit. Undertreating orbital cellulitis risks cavernous sinus thrombosis and death.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">TED + Blow-out Fracture</span><span class="n-section-tag">two other orbital emergencies</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Dysthyroid optic neuropathy (DON):</strong> EOM enlargement compresses optic nerve at apex → RAPD + colour desaturation. <strong>Emergency IV methylprednisolone or orbital decompression.</strong></div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>White-eyed blow-out fracture in children:</strong> trapdoor mechanism traps inferior rectus. Eye looks calm but restricted upgaze + bradycardia/vomiting (oculocardiac reflex). <strong>Urgent surgery within 24–48h.</strong></div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Adult blow-out fracture:</strong> inferior wall → floor buckles into maxillary sinus → restricted upgaze + vertical diplopia + enophthalmos + infraorbital anaesthesia. Elective repair for persistent diplopia or enophthalmos &gt;2mm.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Pain on EOM + proptosis = orbital cellulitis until proven otherwise.</strong><span class="n-pearl-exam">Exam: features distinguishing orbital from preseptal cellulitis?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>TED can occur with normal thyroid function (euthyroid Graves').</strong> Check TFTs + TSH receptor antibodies in new bilateral proptosis.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>White-eyed blow-out + bradycardia + nausea = surgical emergency.</strong> The calm eye is the trap.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Child with post-sinusitis lid swelling → oral antibiotics regardless.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Any proptosis/EOM restriction/VA change = orbital = IV antibiotics + CT.</strong> Children under 5 often admitted even without orbital signs.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal TFTs = TED eye disease is controlled.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>TED can progress independently of thyroid hormone levels.</strong> DON treated with IV steroids regardless of TFTs.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Pain on eye movement. Proptosis. VA loss.</em><br>Not preseptal. Orbital cellulitis until proven otherwise.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.orbit=[{q:"9-year-old, 3 days sinusitis → right proptosis, restricted painful EOM, 38.9°C. Diagnosis?",opts:["Preseptal — oral co-amoxiclav","Orbital cellulitis — IV antibiotics + urgent CT + ophtho + ENT","Chalazion — warm compresses","Allergic — antihistamine"],ans:1,focus:"Orbital cellulitis — emergency",exp:"Orbital cellulitis: postseptal — proptosis + restricted painful EOM + fever. From ethmoid sinusitis. Emergency: IV co-amoxiclav + urgent CT sinuses/orbit to exclude subperiosteal abscess."},{q:"Features distinguishing orbital from preseptal cellulitis?",opts:["Orbital = bilateral; preseptal = unilateral","Orbital: proptosis + restricted painful EOM + VA reduction; preseptal: lid swelling only","Orbital only from trauma; preseptal from sinusitis","No clinical distinction"],ans:1,focus:"Orbital vs preseptal features",exp:"The orbital septum is the anatomical boundary. Preseptal: lid swelling/erythema, normal EOM/VA. Orbital: proptosis, painful restricted EOM, possible VA loss, fever."},{q:"Graves' patient, new diplopia + left RAPD. CT: enlarged EOM at orbital apex. Emergency management?",opts:["Orbital cellulitis — IV antibiotics","Dysthyroid optic neuropathy — IV methylprednisolone","Acute angle-closure — acetazolamide","Cavernous sinus thrombosis — anticoagulation"],ans:1,focus:"DON — emergency",exp:"DON: EOM enlargement compresses optic nerve at apex → RAPD, colour desaturation, VF defect. Emergency: high-dose IV methylprednisolone. If inadequate response: orbital decompression."},{q:"12-year-old after facial blow, can't look up, vomiting, bradycardia, white quiet eye. Diagnosis?",opts:["Contusion — analgesia","White-eyed blow-out — urgent surgery within 24–48h","Orbital cellulitis — IV antibiotics","Retinal detachment"],ans:1,focus:"White-eyed blow-out — paediatric emergency",exp:"White-eyed blow-out (trapdoor): pliable floor springs back trapping inferior rectus. Eye deceptively calm. Restricted upgaze + oculocardiac reflex. Urgent surgery within 24–48h before ischaemic fibrosis."},{q:"TED with proptosis + lagophthalmos. Immediate sight-threatening complication?",opts:["Secondary glaucoma","Corneal exposure keratopathy — lubricants, lid taping, tarsorrhaphy if severe","DON — IV methylprednisolone","Disc cupping"],ans:1,focus:"Corneal exposure in TED",exp:"Lagophthalmos + proptosis → corneal drying → ulceration → perforation. Frequent preservative-free lubricants, moisture chambers, tape lids at night, tarsorrhaphy if insufficient."}];

// ── OPTIC NEUROPATHY ──
NOTES.opticnerve = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Neuro-ophthalmology · Note 16</div>
  <div class="n-hero-title">Optic<br><em>Neuropathy</em></div>
  <div class="n-hero-sub">Optic Neuritis · AION · PION · Compressive · RAPD · Uhthoff · GCA · Papilloedema</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The diagnostic triad</div><div class="n-snap-text">Reduced VA + RAPD + colour desaturation (red desaturation) = optic nerve disease until proven otherwise. All three can occur with a normal-looking disc.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Optic neuritis</div><div class="n-snap-text">Painful subacute VL. Young adult, female. Colour desaturation. RAPD. Fundus often normal. <strong>25% are the first demyelinating event in MS.</strong> MRI brain essential.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">GCA — act immediately</div><div class="n-snap-text">Elderly + sudden profound VL + jaw claudication + scalp tenderness + raised ESR/CRP. Pale chalk-white disc. <strong>IV methylprednisolone now. Never wait for biopsy.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">RAPD — The Cornerstone Sign</span><span class="n-section-tag">swinging torch, objective, unfakeable</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Mechanism</div><div class="n-mech-text">Unilateral reduction in afferent signal (optic nerve or severe retinal disease) → less pupil constriction when light shines into affected eye. On swinging torch: <strong>the affected pupil paradoxically dilates when light moves to it</strong> — it was relatively dilated from the consensual reflex when the good eye was lit; direct illumination now provides less input than the good eye did.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Causes of RAPD</div><div class="n-mech-text">Optic neuritis, AION, PION, optic nerve compression (tumour, thyroid, trauma), optic atrophy, CRAO, extensive retinal detachment, severe glaucoma (late). <strong>Cataract and amblyopia do NOT cause RAPD.</strong> Bilateral symmetric optic nerve disease causes no RAPD — afferent input equally reduced on both sides.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Clinical value</div><div class="n-mech-text">RAPD is <strong>objective — cannot be faked</strong> and does not require patient cooperation. Its absence in claimed monocular VL suggests either functional (non-organic) visual loss or retrochiasmal disease. A large RAPD with normal fundoscopy = retrobulbar optic neuritis — the classic "patient sees nothing, doctor sees nothing."</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Optic Neuritis</span><span class="n-section-tag">demyelination, pain, colour, MS</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Presentation</div><div class="n-diag-content">Subacute unilateral VL over hours–days. <strong>Pain on eye movement (80%) — the key distinguishing feature from AION.</strong> Colour desaturation (red appears washed out). RAPD. Female predominance. Age 20–45. Fundus: normal (retrobulbar, 65%) or swollen disc (papillitis, 35%).</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Uhthoff's Phenomenon</div><div class="n-diag-content">VA worsens with heat or exercise — hot bath, exercise, fever. <strong>Pathognomonic of demyelination.</strong> Raised temperature reduces the safety factor for axonal conduction in already demyelinated nerves. Pulfrich phenomenon: depth perception disturbance from asymmetric conduction velocity.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">MS Risk</div><div class="n-diag-content">25% of optic neuritis is the first MS event. 10-year MS risk: <strong>38% overall; 72% if MRI shows ≥1 white matter lesion (T2 hyperintensity) at presentation.</strong> MRI brain ± spine mandatory. If criteria met → neurology for disease-modifying therapy discussion.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Treatment</div><div class="n-diag-content">IV methylprednisolone 1g/day × 3 days speeds recovery but does NOT improve final VA (ONTT data). Observation is acceptable for mild cases. Vision usually recovers to 6/9 or better within 6–12 weeks. Persistent poor VA → consider NMO-IgG (neuromyelitis optica — anti-AQP4 antibody, more severe, requires immunosuppression).</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">AION — Arteritic vs Non-Arteritic</span><span class="n-section-tag">GCA is always the emergency to exclude</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this">
      <div class="n-diff-card-tag">Non-arteritic AION (NA-AION)</div>
      <div class="n-diff-card-name">Vascular risk factors, waking</div>
      <div class="n-diff-card-key">Sudden painless VL on waking (nocturnal hypotension). <strong>Inferior altitudinal VF defect</strong> (inferior nerve fibres more vulnerable). Swollen hyperaemic disc. HTN, DM, sleep apnoea, small crowded disc ("disc at risk" — small cup, small CDR). Normal ESR/CRP. <strong>No proven treatment.</strong> Manage vascular risk. Aspirin may be prescribed. 15–20% fellow eye risk over 5 years.</div>
    </div>
    <div class="n-diff-card that">
      <div class="n-diff-card-tag">Arteritic AION — GCA</div>
      <div class="n-diff-card-name">Emergency — steroid immediately</div>
      <div class="n-diff-card-key">Giant cell arteritis. Posterior ciliary arteries occluded. Profound visual loss (often worse than NA-AION). Jaw claudication (pathognomonic), scalp/temple tenderness, headache, malaise, weight loss, PMR. ESR &gt;50, CRP elevated. <strong>Pale, chalk-white, swollen disc.</strong> <strong>IV methylprednisolone 1g immediately — TAB positive for 2 weeks on steroids.</strong> Fellow eye: 20–40% risk within days untreated.</div>
    </div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Other Optic Neuropathies</span><span class="n-section-tag">compression · toxic · hereditary</span></div>
  <div class="n-flag-list">
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Compressive optic neuropathy:</strong> meningioma (optociliary shunt vessels — dilated corkscrew vessels at disc, pathognomonic), pituitary adenoma (bitemporal hemianopia from chiasmal compression), thyroid eye disease (DON — apex crowding). Gradual painless VL + RAPD. MRI orbit/brain urgently.</div></div>
    <div class="n-flag-item critical"><span class="n-flag-icon crit"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L5 6M5 8.5L5 9" stroke="#c8452a" stroke-width="1.5" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Papilloedema (bilateral disc swelling from raised ICP):</strong> headache worse on bending/morning, transient visual obscurations (seconds), pulsatile tinnitus, diplopia (false localising VI nerve palsy). Causes: space-occupying lesion, IIH (obese young woman), meningitis, venous sinus thrombosis. <strong>Urgent neuroimaging + neurology.</strong> Untreated IIH → severe VF loss.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Toxic/nutritional optic neuropathy:</strong> ethambutol (dose-dependent, check colour vision and VA monthly), methanol, B12 deficiency, tobacco-alcohol amblyopia. Bilateral central or centrocaecal scotoma, bilateral RAPD absent. Remove toxin and supplement.</div></div>
    <div class="n-flag-item time"><span class="n-flag-icon time-ic"><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" stroke="#8a6020" stroke-width="1.2" fill="none"/><path d="M5 3V5.5L6.5 6.5" stroke="#8a6020" stroke-width="1.2" stroke-linecap="round"/></svg></span><div class="n-flag-text"><strong>Leber's hereditary optic neuropathy (LHON):</strong> mitochondrial (maternal inheritance). Young males, subacute bilateral painless central VL. mt-DNA point mutations (11778 most common). Disc microangiopathy early. No proven treatment (idebenone has modest effect). Genetic counselling.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">74-year-old + sudden profound monocular VL + jaw pain chewing + scalp tenderness + ESR 95 + pale swollen disc → think <em>GCA/arteritic AION</em> → IV methylprednisolone 1g immediately. Not after CRP. Not after biopsy.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Disc colour is the distinguishing feature between arteritic and non-arteritic</div><div class="n-distractor-text"><strong>Arteritic AION: pale chalk-white disc</strong> — total ischaemia of the optic nerve head from posterior ciliary artery occlusion. <strong>Non-arteritic AION: hyperaemic swollen disc</strong> — partial ischaemia from haemodynamic factors. Disc colour, jaw claudication, and inflammatory markers separate them at the bedside.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Pain on eye movement + colour desaturation + RAPD + young woman = optic neuritis until proven otherwise.</strong> Normal-looking disc does not exclude it (retrobulbar).<span class="n-pearl-exam">Exam: what is Uhthoff's phenomenon and what does it indicate?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>GCA: start steroids immediately — biopsy waits 2 weeks.</strong> Fellow eye risk is 20–40% within days. The temporal artery biopsy is diagnostic, not enabling. Missing the window = preventable bilateral blindness.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Pituitary adenoma causes bitemporal hemianopia from compression of nasal fibres at the chiasm</strong> — nasal fibres decussate at the chiasm. Ask about headache, galactorrhoea, amenorrhoea, erectile dysfunction, acromegaly features.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Ethambutol is the only commonly prescribed antibiotic causing optic neuropathy.</strong> Dose-dependent. Baseline VA and colour vision before starting TB treatment. Monthly monitoring during therapy. Stop immediately if VL or colour changes occur.<span class="n-pearl-exam">Exam: which anti-TB drug causes optic neuropathy?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>IIH (idiopathic intracranial hypertension):</strong> obese young women, bilateral disc swelling, headache, pulsatile tinnitus, transient visual obscurations, VI nerve palsy. Normal MRI. Elevated LP opening pressure (&gt;25 cmH₂O). Treatment: weight loss, acetazolamide, optic nerve sheath fenestration or lumboperitoneal shunt if sight-threatening.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Wait for temporal artery biopsy result before starting steroids in suspected GCA.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>IV methylprednisolone now, biopsy later.</strong> TAB histology remains positive for up to 14 days on steroids. The clinical diagnosis is sufficient to start treatment. The purpose of biopsy is to confirm — not to authorise.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Normal MRI after optic neuritis means no MS risk.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Normal MRI = 25% 10-year MS risk.</strong> White matter lesions at presentation = 72%. All patients need long-term neurological follow-up regardless of MRI findings. NMO (anti-AQP4) must also be excluded — worse prognosis, different treatment.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Bilateral disc swelling is always papilloedema from raised ICP.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Bilateral disc swelling has many causes: raised ICP (papilloedema), bilateral AION (GCA), bilateral optic neuritis, accelerated hypertension, diabetic papillopathy, bilateral infiltration (sarcoid, lymphoma).</strong> Papilloedema specifically means disc swelling secondary to raised ICP. Neuroimaging and LP are mandatory.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Colour desaturation. RAPD. Pain on movement.</em><br>In the elderly: exclude GCA before anything else.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.opticnerve=[{q:"29-year-old, subacute VL right eye over 3 days, pain on EOM, colour desaturation, RAPD. Normal fundus. Diagnosis?",opts:["Acute angle-closure","Retrobulbar optic neuritis","CRAO","AION"],ans:1,focus:"Optic neuritis — retrobulbar, normal fundus",exp:"Retrobulbar optic neuritis: inflammation behind the globe → normal disc. Subacute painful VL + colour desaturation + RAPD. Classic: 'patient sees nothing, doctor sees nothing.' MRI brain essential — 25% first MS presentation."},{q:"Uhthoff's phenomenon — what and what does it indicate?",opts:["Ischaemic supply instability","Demyelination — heat impairs conduction in demyelinated axons","IOP rise with heat","Corneal oedema from temperature"],ans:1,focus:"Uhthoff's — demyelination",exp:"Uhthoff's: pathognomonic of demyelination. Raised temperature reduces safety factor for conduction in demyelinated axons → transient VA worsening with exercise/heat. Supports MS-related optic neuritis."},{q:"74-year-old, sudden painless monocular VL + jaw pain + scalp tenderness + ESR 112. Most urgent action?",opts:["Biopsy — start steroids after confirmation","Immediate IV methylprednisolone 1g","Oral prednisolone 1mg/kg","CT head before steroids"],ans:1,focus:"GCA — immediate steroids",exp:"GCA causing arteritic AION. IV methylprednisolone 1g immediately. TAB positive for 2 weeks on steroids. Fellow eye 20–40% risk within days if untreated."},{q:"What does RAPD indicate and how is it detected?",opts:["Bilateral optic nerve disease","Unilateral afferent defect — affected pupil paradoxically dilates on swinging torch","CN III damage","Horner — cocaine test"],ans:1,focus:"RAPD — swinging torch",exp:"RAPD: unilateral optic nerve/severe retinal disease reduces afferent input. Affected pupil paradoxically dilates when torch swings to it. Objective, cannot be faked."},{q:"50-year-old, HTN + DM, wakes with inferior altitudinal VF defect + swollen hyperaemic disc. Normal ESR/CRP. Diagnosis?",opts:["Arteritic AION — IV methylprednisolone","Non-arteritic AION — manage vascular risk","Optic neuritis — MRI + steroids","CRVO — anti-VEGF"],ans:1,focus:"Non-arteritic AION",exp:"NA-AION: painless sudden inferior altitudinal VF, swollen hyperaemic disc, vascular risk factors (HTN, DM), normal inflammatory markers. No proven treatment. Manage cardiovascular risk. 15–20% fellow eye involvement."}];

// ── OCULAR TUMOURS ──
NOTES.tumours = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Oncology · Note 17</div>
  <div class="n-hero-title">Ocular<br><em>Tumours</em></div>
  <div class="n-hero-sub">Retinoblastoma · Uveal Melanoma · BCC · Sebaceous Carcinoma · Leukocoria · Madarosis</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Retinoblastoma</div><div class="n-snap-text">Most common intraocular tumour in childhood. Leukocoria or strabismus. <strong>Absent red reflex = same-day referral.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Uveal melanoma</div><div class="n-snap-text">Most common primary intraocular malignancy in adults. Mushroom-shaped. <strong>Metastasises almost exclusively to liver.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Eyelid rule</div><div class="n-snap-text">Madarosis adjacent to lid lesion = malignancy until proven otherwise. <strong>BCC most common.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Retinoblastoma</span><span class="n-section-tag">leukocoria in a child</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Presentation</div><div class="n-mech-text"><strong>Leukocoria</strong> (white pupil, absent red reflex — often noted in photos). Strabismus is second most common. &lt;5 years. Diagnosis: RetCam ± MRI.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Genetics — RB1 two-hit</div><div class="n-mech-text"><strong>Hereditary (40%)</strong>: germline first hit → bilateral, multifocal, earlier onset. <strong>Non-hereditary (60%)</strong>: two somatic hits → unilateral, unifocal. ~15% of unilateral cases still have germline mutation. All patients need genetic testing.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Treatment + secondary tumours</div><div class="n-mech-text">Focal: laser, cryotherapy, intra-arterial chemo. Advanced: enucleation. Survival &gt;95% in HICs. Hereditary: risk of secondary malignancies (osteosarcoma, pinealoblastoma).</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Uveal Melanoma + Eyelid Malignancies</span><span class="n-section-tag">adult intraocular + adnexal</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Uveal Melanoma</div><div class="n-diag-content">Often asymptomatic → found on routine fundoscopy. Mushroom-shaped choroidal mass (breaks Bruch's membrane). B-scan: high internal reflectivity. <strong>Plaque brachytherapy for most. Lifelong liver surveillance.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label">BCC</div><div class="n-diag-content">Most common eyelid malignancy (90%). Lower lid, medial canthus. Pearly rolled edge, central ulceration, <strong>madarosis</strong>. Locally invasive. <strong>Mohs surgery.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Sebaceous Carcinoma</div><div class="n-diag-content">Rare, high mortality. <strong>Masquerades as recurrent chalazion.</strong> Upper lid. Pagetoid spread. <strong>Rule: biopsy any chalazion recurring in same site.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Madarosis</div><div class="n-diag-content"><strong>Lash loss adjacent to lid lesion = malignancy until proven otherwise.</strong> BCC, SCC, sebaceous carcinoma all infiltrate follicles. Benign lesions do not cause madarosis.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">2-year-old with white pupil in photos, absent red reflex → think <em>retinoblastoma</em> → same-day ophthalmology. Leukocoria = intraocular malignancy until excluded.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Leukocoria differential</div><div class="n-distractor-text">Not all leukocoria is retinoblastoma — but <strong>all leukocoria needs same-day referral</strong>. Others: congenital cataract, PFV, ROP, Coats'. The priority is excluding retinoblastoma.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Uveal melanoma metastasises almost exclusively to liver.</strong> BRAF mutations rare → checkpoint inhibitors have poor efficacy.<span class="n-pearl-exam">Exam: where does uveal melanoma most commonly metastasise?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Sebaceous carcinoma mimics chalazion.</strong> Biopsy any chalazion recurring in the same location after adequate treatment.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Bilateral retinoblastoma = germline RB1 = hereditary.</strong> ~500× normal osteosarcoma risk. Genetic counselling + lifelong surveillance.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Unilateral retinoblastoma is never hereditary.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>~15% of unilateral cases still carry germline mutation.</strong> All patients need genetic testing regardless of laterality.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">BCC never metastasises — safe to observe.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>BCC causes devastating local invasion.</strong> Orbital extension + intracranial spread with neglected medial canthal BCC. Mohs surgery is essential.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>White pupil in a child. Pigmented mass in an adult.</em><br>Both need same-day referral. Both curable if caught early.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.tumours=[{q:"2-year-old with absent red reflex and white glow in photographs. Management?",opts:["Reassure — likely artefact","Same-day ophthalmology — exclude retinoblastoma","Optician at 3 months","Review in 2 weeks"],ans:1,focus:"Leukocoria — same-day",exp:"Leukocoria = same-day ophthalmology referral. Retinoblastoma must be excluded urgently. Absent red reflex is never normal."},{q:"Which retinoblastoma type is most likely bilateral?",opts:["Non-hereditary — two somatic hits","Hereditary — germline first hit, one somatic hit needed","X-linked","Mitochondrial"],ans:1,focus:"Hereditary retinoblastoma — bilateral",exp:"Hereditary (40%): germline RB1 → every cell has first hit → only one more hit needed → bilateral, multifocal, earlier onset."},{q:"Pigmented choroidal mass, mushroom shape on B-scan. Standard treatment for medium tumour?",opts:["Photodynamic therapy","Plaque brachytherapy","Intravitreal anti-VEGF","Systemic chemotherapy"],ans:1,focus:"Uveal melanoma — brachytherapy",exp:"Uveal melanoma: mushroom shape (breaks Bruch's membrane), high internal reflectivity. Standard: plaque brachytherapy. All: lifelong liver surveillance — metastases almost exclusively hepatic."},{q:"Lower lid lesion, pearly rolled edge, central ulceration, loss of adjacent lashes. Diagnosis?",opts:["Chalazion — warm compresses","BCC — Mohs surgery","Viral papilloma — reassure","Sebaceous cyst — excise"],ans:1,focus:"BCC — madarosis + pearly edge",exp:"BCC: most common eyelid malignancy. Pearly rolled edge, central ulceration (rodent ulcer), madarosis from follicular infiltration. Mohs micrographic surgery."},{q:"60-year-old, 'chalazion' recurring in same upper lid site after two I&C procedures. Action?",opts:["Third I&C with wider approach","Biopsy — exclude sebaceous gland carcinoma","Oral doxycycline","Allergy testing"],ans:1,focus:"Recurrent chalazion — sebaceous carcinoma",exp:"Sebaceous carcinoma masquerades as recurrent chalazion in same location. Most aggressive eyelid malignancy. Biopsy any chalazion recurring in same spot after adequate treatment."}];

// ── PHARMACOLOGY ──
NOTES.pharmacology = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Pharmacology · Note 18</div>
  <div class="n-hero-title">Ocular<br><em>Pharmacology</em></div>
  <div class="n-hero-sub">Glaucoma drops · Mydriatics · Antibiotics · Anti-VEGF · Steroid dangers</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Glaucoma drops</div><div class="n-snap-text">Lower IOP by reducing production (beta-blockers, CAIs, alpha-2) or increasing drainage (prostaglandins, miotics). <strong>Systemically absorbed via nasolacrimal duct.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Mydriatics</div><div class="n-snap-text">Anticholinergics + sympathomimetics. Risk of acute angle-closure in narrow angle eyes.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Steroid rule</div><div class="n-snap-text"><strong>Never prescribe topical steroids for undiagnosed red eye.</strong> HSV reactivation, IOP rise, cataract.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Glaucoma Drops</span><span class="n-section-tag">mechanism and hazards</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Reduce production</div><div class="n-mech-text"><strong>Timolol (beta-blocker):</strong> β2 on ciliary epithelium → reduced aqueous. Absorbed via NLD → systemic bradycardia, bronchospasm. <strong>CI: asthma, COPD, heart block.</strong> Topical CAIs (dorzolamide): reduce bicarbonate. Alpha-2 (brimonidine): reduces production + increases uveoscleral drainage. <strong>CI: infants (apnoea).</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Increase drainage — prostaglandins (first-line)</div><div class="n-mech-text"><strong>Latanoprost, bimatoprost:</strong> FP receptor → uveoscleral outflow. 25–35% IOP reduction. Once-daily evening. Most effective single agent. SE: iris colour change (permanent), lash growth, periorbital fat atrophy.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Systemic — acute IOP reduction</div><div class="n-mech-text"><strong>IV acetazolamide 500mg:</strong> systemic CAI. First-line for acute angle-closure. SE: paraesthesia, hypokalaemia. <strong>CI: sulfonamide allergy.</strong> IV mannitol: hyperosmotic, draws water from vitreous. Reserved for severe closure.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Mydriatics, Antibiotics, Anti-VEGF</span><span class="n-section-tag">other key agents</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Tropicamide 1%</div><div class="n-diag-content">Short-acting anticholinergic. Standard mydriatic for fundal examination. Duration: 4–6h. Warn about driving.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Cyclopentolate 1%</div><div class="n-diag-content">Standard cycloplegic for refraction in children + uveitis treatment. Duration: 24h. Paralysis of accommodation reveals true error.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Antibiotics</div><div class="n-diag-content"><strong>Chloramphenicol:</strong> first-line bacterial conjunctivitis. <strong>Ciprofloxacin:</strong> keratitis (pseudomonas cover). <strong>Aciclovir:</strong> HSV keratitis (dendritic ulcer). Never use topical steroids for undiagnosed red eye.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Anti-VEGF</div><div class="n-diag-content"><strong>Intravitreal ranibizumab, bevacizumab, aflibercept:</strong> wet AMD, diabetic macular oedema, CRVO/BRVO with CMO. Monthly → PRN dosing. SE: endophthalmitis (rare), RPE tear, subconjunctival haemorrhage.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Patient given topical steroid for "red eye" by GP → 2 weeks later: dendritic ulcer + worsening → think <em>HSV keratitis reactivated by steroids</em> → stop steroid, start aciclovir.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">Why steroids are dangerous in undiagnosed red eye</div><div class="n-distractor-text"><strong>Three mechanisms of steroid harm: (1) HSV reactivation → dendritic ulcer → perforation; (2) IOP rise → secondary glaucoma; (3) posterior subcapsular cataract with chronic use.</strong> Slit lamp diagnosis first. Always.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Prostaglandin analogues are first-line for POAG.</strong> Most effective, once-daily, no systemic respiratory/cardiac CI.<span class="n-pearl-exam">Exam: first-line glaucoma drop and mechanism?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Topical timolol → systemic beta-blockade via nasolacrimal absorption.</strong> Real bronchospasm, real bradycardia. Always ask about asthma before prescribing.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Anti-VEGF treats wet AMD and diabetic macular oedema.</strong> Dry AMD has no proven treatment (AREDS supplements only slow progression).</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Topical steroids are safe for red eye — they only act locally.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Topical steroids in undiagnosed red eye can cause HSV perforation, glaucoma, and cataract.</strong> Slit lamp diagnosis first — always.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Topical eye drops have no systemic effects.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Eye drops drain via NLD to nasal mucosa → systemic circulation, bypassing first-pass metabolism.</strong> Timolol causes real bronchospasm. Brimonidine causes apnoea in infants. Always check systemic history.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor"><div class="n-anchor-text"><em>Prostaglandins first. Steroids never blind.</em><br>Every drop you prescribe is a systemic drug.</div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.pharmacology=[{q:"Asthmatic POAG patient prescribed timolol develops worsening wheeze. Mechanism?",opts:["Preservative allergy","Systemic beta-2 blockade via nasolacrimal absorption → bronchospasm","Coincidental COPD","Drop technique"],ans:1,focus:"Timolol — systemic absorption, asthma CI",exp:"Timolol absorbed via NLD → nasal mucosa → systemic circulation, bypassing first-pass. Beta-2 blockade causes bronchospasm. Contraindicated in asthma/COPD. Switch to prostaglandin analogue."},{q:"First-line glaucoma drop and its mechanism?",opts:["Timolol — reduce aqueous production","Prostaglandin analogue (latanoprost) — increase uveoscleral outflow","Dorzolamide — inhibit carbonic anhydrase","Brimonidine — alpha-2 agonist"],ans:1,focus:"Prostaglandins — first-line",exp:"Prostaglandin analogues (latanoprost): most effective single agent, 25–35% IOP reduction. FP receptor → uveoscleral outflow. Once-daily evening. No respiratory/cardiac CI."},{q:"GP prescribes topical dexamethasone for red eye. Patient returns 2 weeks later with corneal dendrites and worsening vision. What happened?",opts:["Steroid-induced glaucoma","HSV keratitis reactivated by steroid immunosuppression","Allergic reaction to preservative","Bacterial superinfection"],ans:1,focus:"Steroids + HSV = disaster",exp:"Topical steroids reactivate HSV → dendritic (or geographic) ulcer. Can lead to corneal perforation. Never prescribe steroids for undiagnosed red eye. Slit lamp + fluorescein first. Treatment: stop steroid, topical aciclovir."},{q:"Which drug is contraindicated in infants due to apnoea risk?",opts:["Latanoprost","Timolol","Brimonidine (alpha-2 agonist)","Dorzolamide"],ans:2,focus:"Brimonidine — CI in infants",exp:"Brimonidine (alpha-2 agonist) causes CNS depression and apnoea in infants and young children. Absolute contraindication. Used in adults for glaucoma (reduces production + increases uveoscleral drainage)."},{q:"A patient with wet AMD is offered intravitreal injections. Which drug class and key complication?",opts:["Intravitreal steroids — cataract","Anti-VEGF (ranibizumab/aflibercept) — endophthalmitis","Topical CAI — metallic taste","Alpha-2 agonist — allergy"],ans:1,focus:"Anti-VEGF for wet AMD",exp:"Anti-VEGF (ranibizumab, bevacizumab, aflibercept) for wet AMD, DMO, CRVO. Intravitreal injection. Key SE: endophthalmitis (rare but serious), RPE tear, subconjunctival haemorrhage. Dry AMD: no proven treatment (AREDS supplements only)."}];
