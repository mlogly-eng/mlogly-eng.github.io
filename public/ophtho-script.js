// REVEAL
// ── Inject n-anchor enhanced styles ──
(function(){
  const s=document.createElement('style');
  s.textContent=`.n-anchor{margin:0;padding:0 32px;border-top:none!important;}.n-anchor-card{background:linear-gradient(150deg,rgba(200,69,42,0.13) 0%,rgba(160,80,30,0.08) 60%,rgba(200,69,42,0.11) 100%);border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;margin:0;position:relative;}.n-anchor-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,rgba(200,69,42,0.5),rgba(200,69,42,0.15),transparent);border-radius:6px 6px 0 0;}.n-anchor-label{font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7)!important;text-transform:uppercase;display:block;margin-bottom:16px;}.n-anchor-text{font-family:'Instrument Serif',Georgia,serif!important;font-size:clamp(17px,2vw,24px)!important;line-height:1.65!important;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400!important;display:block!important;}.n-anchor-text em{font-style:italic!important;color:rgba(245,242,235,1)!important;}.n-anchor-ornament{display:none!important;}.n-compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid rgba(245,242,235,0.1);border-radius:6px;overflow:hidden;margin:4px 0;}.n-compare-col{padding:0;}.n-compare-col:first-child{border-right:1px solid rgba(245,242,235,0.1);}.n-compare-head{font-family:Syne,sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:16px 20px 14px;border-bottom:1px solid rgba(245,242,235,0.1);color:rgba(245,242,235,0.9);background:rgba(245,242,235,0.04);}.n-compare-row{display:grid;grid-template-columns:90px 1fr;gap:0;border-bottom:1px solid rgba(245,242,235,0.06);padding:0;}.n-compare-row:last-child{border-bottom:none;}.n-compare-label{font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.38);padding:12px 12px 12px 20px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;}.n-compare-row span:last-child{font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.78);padding:12px 16px;line-height:1.5;}.n-compare-row span:last-child strong{color:rgba(245,242,235,0.95);font-weight:700;}`;
  document.head.appendChild(s);
})();
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
const NOTE_ORDER_OPHTHO=['intro','eyelids','lacrimal','conjunctiva','lens','cataract','cornea','uveitis','refraction','glaucoma','retina','retdetach','rd','dr','hr','vascular','rvo','amd','redeye','orbit','opticnerve','on','tumours','strabismus','pharmacology'];
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Lens anatomy</span><span class="n-viz-sub">Zones and their significance</span></div>
    <svg viewBox="0 0 760 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="244" height="170" rx="2" fill="#1a2a3a"/>
      <text x="122" y="30" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">ANTERIOR</text>
      <text x="122" y="58" font-family="Syne,sans-serif" font-size="15" fill="white" text-anchor="middle" font-weight="800">Epithelium</text>
      <text x="122" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Single layer of cells</text>
      <text x="122" y="98" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Mitotically active</text>
      <text x="122" y="140" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Damage → PSC cataract</text>
      <text x="122" y="158" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Steroids · radiation</text>
      <rect x="258" y="0" width="244" height="170" rx="2" fill="#c8452a"/>
      <text x="380" y="30" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">CORE</text>
      <text x="380" y="58" font-family="Syne,sans-serif" font-size="15" fill="white" text-anchor="middle" font-weight="800">Nucleus</text>
      <text x="380" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Embryonic fibres — compacted</text>
      <text x="380" y="98" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Hardest, most dense zone</text>
      <text x="380" y="140" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Nuclear sclerosis → brown opacity</text>
      <text x="380" y="158" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Most common cataract type</text>
      <rect x="516" y="0" width="244" height="170" rx="2" fill="#2a4a2a"/>
      <text x="638" y="30" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">PERIPHERAL</text>
      <text x="638" y="58" font-family="Syne,sans-serif" font-size="15" fill="white" text-anchor="middle" font-weight="800">Cortex</text>
      <text x="638" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Newer fibres — hydrated</text>
      <text x="638" y="98" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Softer, more peripheral</text>
      <text x="638" y="140" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Cortical cataract → spoke-wheel</text>
      <text x="638" y="158" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Diabetes · ageing</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>No blood supply. No nerves. No inflammation.</em><br>Only silent, progressive opacity.</div></div></div>
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Cataract types by location</span><span class="n-viz-sub">Location predicts cause</span></div>
    <svg viewBox="0 0 760 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="244" height="170" rx="2" fill="#c8452a"/>
      <text x="122" y="30" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">NUCLEAR</text>
      <text x="122" y="60" font-family="Syne,sans-serif" font-size="15" fill="white" text-anchor="middle" font-weight="800">Nuclear Sclerosis</text>
      <text x="122" y="82" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Central amber/brown opacity</text>
      <text x="122" y="100" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Myopic shift — near vision</text>
      <text x="122" y="120" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">temporarily improved</text>
      <text x="122" y="150" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Ageing · UV exposure</text>
      <rect x="258" y="0" width="244" height="170" rx="2" fill="#2a4a6e"/>
      <text x="380" y="30" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">CORTICAL</text>
      <text x="380" y="60" font-family="Syne,sans-serif" font-size="15" fill="white" text-anchor="middle" font-weight="800">Cortical</text>
      <text x="380" y="82" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Spoke-wheel pattern</text>
      <text x="380" y="100" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">from periphery inward</text>
      <text x="380" y="120" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Glare · contrast loss</text>
      <text x="380" y="150" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Diabetes · ageing</text>
      <rect x="516" y="0" width="244" height="170" rx="2" fill="#3a2a5a"/>
      <text x="638" y="30" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">POSTERIOR</text>
      <text x="638" y="60" font-family="Syne,sans-serif" font-size="15" fill="white" text-anchor="middle" font-weight="800">PSC</text>
      <text x="638" y="82" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Posterior subscapsular</text>
      <text x="638" y="100" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Granular plaque at back</text>
      <text x="638" y="120" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Worse in bright light / reading</text>
      <text x="638" y="150" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Steroids · diabetes · trauma</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Nuclear. Cortical. PSC.</em><br>The location tells you the cause. The cause tells you the patient.</div></div></div>
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Corneal layers — anterior to posterior</span><span class="n-viz-sub">Each layer has distinct pathology</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="140" height="160" rx="2" fill="#1a3a2a"/>
      <text x="70" y="30" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">SUPERFICIAL</text>
      <text x="70" y="56" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Epithelium</text>
      <text x="70" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">5–7 cell layers</text>
      <text x="70" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Regenerates in 24–48h</text>
      <text x="70" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Dendrite → HSV</text>
      <rect x="152" y="0" width="140" height="160" rx="2" fill="#2a3a1a"/>
      <text x="222" y="30" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">LAYER 2</text>
      <text x="222" y="56" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Bowman's</text>
      <text x="222" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Acellular — no regen</text>
      <text x="222" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Scar if breached</text>
      <text x="222" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Breach → opacity</text>
      <rect x="304" y="0" width="152" height="160" rx="2" fill="#c8452a"/>
      <text x="380" y="30" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">BULK — 90%</text>
      <text x="380" y="56" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Stroma</text>
      <text x="380" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">500μm collagen fibrils</text>
      <text x="380" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Regular = transparent</text>
      <text x="380" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Keratoconus · ulcers</text>
      <rect x="468" y="0" width="140" height="160" rx="2" fill="#1a2a4a"/>
      <text x="538" y="30" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">LAYER 5</text>
      <text x="538" y="56" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Descemet's</text>
      <text x="538" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">BM of endothelium</text>
      <text x="538" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Thickens with age</text>
      <text x="538" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Haab's striae → congenital glaucoma</text>
      <rect x="620" y="0" width="140" height="160" rx="2" fill="#3a1a2a"/>
      <text x="690" y="30" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">DEEPEST</text>
      <text x="690" y="56" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Endothelium</text>
      <text x="690" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Single cell pump layer</text>
      <text x="690" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">No regeneration</text>
      <text x="690" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Failure → bullous keratopathy</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Painful red eye. White corneal spot.</em><br>Same-day referral. No steroids until you know the organism.</div></div></div>
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Retinal layers — light travels inward</span><span class="n-viz-sub">From vitreous to choroid</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="140" height="160" rx="2" fill="#1a1a3a"/>
      <text x="70" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">INNERMOST</text>
      <text x="70" y="54" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800">Nerve Fibre</text>
      <text x="70" y="70" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Layer (NFL)</text>
      <text x="70" y="90" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Ganglion axons</text>
      <text x="70" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Cotton wool spots here</text>
      <rect x="152" y="0" width="140" height="160" rx="2" fill="#2a1a4a"/>
      <text x="222" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">INNER</text>
      <text x="222" y="54" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800">Inner Nuclear</text>
      <text x="222" y="70" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Layer (INL)</text>
      <text x="222" y="90" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Bipolar · amacrine cells</text>
      <text x="222" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Dot haemorrhages</text>
      <rect x="304" y="0" width="152" height="160" rx="2" fill="#c8452a"/>
      <text x="380" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">OUTER</text>
      <text x="380" y="54" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800">Outer Plexiform</text>
      <text x="380" y="70" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Layer (OPL)</text>
      <text x="380" y="90" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Photoreceptor synapses</text>
      <text x="380" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Hard exudates deposit here</text>
      <rect x="468" y="0" width="140" height="160" rx="2" fill="#1a3a1a"/>
      <text x="538" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">RECEPTORS</text>
      <text x="538" y="54" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800">Photoreceptors</text>
      <text x="538" y="70" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Rods · Cones</text>
      <text x="538" y="90" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Light transduction</text>
      <text x="538" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">AMD · RP · detachment</text>
      <rect x="620" y="0" width="140" height="160" rx="2" fill="#3a2a1a"/>
      <text x="690" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">DEEPEST</text>
      <text x="690" y="54" font-family="Syne,sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="800">RPE</text>
      <text x="690" y="70" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Retinal pigment</text>
      <text x="690" y="90" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">epithelium</text>
      <text x="690" y="130" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Drusen beneath → AMD</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>The retina is brain tissue.</em><br>Every layer has a name, a function, and a disease.</div></div></div>
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Diabetic retinopathy staging</span><span class="n-viz-sub">NPDR to PDR</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="180" height="160" rx="2" fill="#2a3a2a"/>
      <text x="90" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">STAGE 1</text>
      <text x="90" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Mild NPDR</text>
      <text x="90" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Microaneurysms only</text>
      <text x="90" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Annual screening</text>
      <text x="90" y="140" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Glycaemic control</text>
      <rect x="192" y="0" width="180" height="160" rx="2" fill="#2a4a2a"/>
      <text x="282" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">STAGE 2</text>
      <text x="282" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Moderate NPDR</text>
      <text x="282" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">+ haemorrhages</text>
      <text x="282" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">+ hard exudates</text>
      <text x="282" y="140" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">6-monthly review</text>
      <rect x="384" y="0" width="180" height="160" rx="2" fill="#6a3a1a"/>
      <text x="474" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">STAGE 3</text>
      <text x="474" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Severe NPDR</text>
      <text x="474" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">4:2:1 rule</text>
      <text x="474" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">IRMA · venous beading</text>
      <text x="474" y="140" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Urgent ophthalmology</text>
      <rect x="576" y="0" width="184" height="160" rx="2" fill="#c8452a"/>
      <text x="668" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">STAGE 4</text>
      <text x="668" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">PDR</text>
      <text x="668" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Neovascularisation</text>
      <text x="668" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">NVD · NVE</text>
      <text x="668" y="140" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">PRP · anti-VEGF · urgent</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>DR is asymptomatic until it's devastating.</em><br>Screen every diabetic. Every year.</div></div></div>
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Hypertensive retinopathy grading</span><span class="n-viz-sub">Keith-Wagener-Barker classification</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="180" height="160" rx="2" fill="#2a3a2a"/>
      <text x="90" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">GRADE I</text>
      <text x="90" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Mild</text>
      <text x="90" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Arterial narrowing</text>
      <text x="90" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Increased light reflex</text>
      <text x="90" y="140" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Asymptomatic</text>
      <rect x="192" y="0" width="180" height="160" rx="2" fill="#3a4a1a"/>
      <text x="282" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">GRADE II</text>
      <text x="282" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Moderate</text>
      <text x="282" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">AV nipping</text>
      <text x="282" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Silver/copper wiring</text>
      <text x="282" y="140" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">BRVO risk</text>
      <rect x="384" y="0" width="180" height="160" rx="2" fill="#6a3a1a"/>
      <text x="474" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">GRADE III</text>
      <text x="474" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Severe</text>
      <text x="474" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Flame haemorrhages</text>
      <text x="474" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Cotton wool spots</text>
      <text x="474" y="140" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Accelerated HTN</text>
      <rect x="576" y="0" width="184" height="160" rx="2" fill="#c8452a"/>
      <text x="668" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">GRADE IV</text>
      <text x="668" y="54" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Malignant</text>
      <text x="668" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Papilloedema</text>
      <text x="668" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">+ all Grade III signs</text>
      <text x="668" y="140" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Emergency admission</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>The fundus is a timeline.</em><br>AV nipping = years. Flame haemorrhages = today.</div></div></div>
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
    <div class="n-snap-cell"><div class="n-snap-label">Three compartments</div><div class="n-snap-text">Anterior segment (cornea → lens), posterior segment (vitreous → retina), adnexa (lids, orbit, lacrimal). <strong>Disease location predicts symptoms.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">History first</div><div class="n-snap-text">Painful vs painless. Sudden vs gradual. Unilateral vs bilateral. Red vs white. <strong>These four dichotomies narrow the diagnosis before the slit lamp.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Examination order</div><div class="n-snap-text">VA → pupils → fields → EOM → anterior segment → fundus. <strong>Never skip VA — it is the vital sign of the eye.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Anatomy — Three Compartments</span><span class="n-section-tag">location determines symptom</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Globe anatomy by compartment</span><span class="n-viz-sub">Know where the disease is — know what you'll find</span></div>
    <svg viewBox="0 0 760 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="244" height="170" rx="2" fill="#c8452a"/>
      <text x="122" y="30" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">ANTERIOR</text>
      <text x="122" y="58" font-family="Syne,sans-serif" font-size="15" fill="white" text-anchor="middle" font-weight="800">Cornea → Lens</text>
      <text x="122" y="82" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Cornea · Iris · Ciliary body</text>
      <text x="122" y="100" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Aqueous humour · Lens</text>
      <text x="122" y="128" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">Symptoms: pain · redness</text>
      <text x="122" y="146" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">photophobia · haloes</text>
      <rect x="258" y="0" width="244" height="170" rx="2" fill="#2a4a6e"/>
      <text x="380" y="30" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">POSTERIOR</text>
      <text x="380" y="58" font-family="Syne,sans-serif" font-size="15" fill="white" text-anchor="middle" font-weight="800">Vitreous → Retina</text>
      <text x="380" y="82" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Vitreous · Retina · Choroid</text>
      <text x="380" y="100" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Macula · Optic disc</text>
      <text x="380" y="128" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">Symptoms: painless loss</text>
      <text x="380" y="146" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">floaters · flashes · curtain</text>
      <rect x="516" y="0" width="244" height="170" rx="2" fill="#3a4a3a"/>
      <text x="638" y="30" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">ADNEXA</text>
      <text x="638" y="58" font-family="Syne,sans-serif" font-size="15" fill="white" text-anchor="middle" font-weight="800">Orbit + Lids</text>
      <text x="638" y="82" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Eyelids · Lacrimal · Orbit</text>
      <text x="638" y="100" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Extraocular muscles · ON</text>
      <text x="638" y="128" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">Symptoms: diplopia · ptosis</text>
      <text x="638" y="146" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">watering · proptosis</text>
    </svg>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">The Four History Dichotomies</span><span class="n-section-tag">diagnose before you examine</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Painful vs Painless</div><div class="n-diag-content"><strong>Painful red eye:</strong> acute glaucoma, keratitis, uveitis, scleritis, corneal ulcer. <strong>Painless vision loss:</strong> retinal detachment, CRAO/CRVO, AMD, vitreous haemorrhage, optic neuritis (dull ache with movement, not sharp pain). Painless + sudden + white eye = posterior emergency.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Sudden vs Gradual</div><div class="n-diag-content"><strong>Sudden:</strong> vascular (CRAO/CRVO), retinal detachment, vitreous haemorrhage, acute angle-closure glaucoma. <strong>Gradual:</strong> cataract, chronic glaucoma, AMD, diabetic retinopathy, refractive error. Sudden = emergency until proven otherwise.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Unilateral vs Bilateral</div><div class="n-diag-content"><strong>Unilateral:</strong> vascular, structural, local pathology. <strong>Bilateral:</strong> systemic disease (DM, HTN, autoimmune), toxic, hereditary, cortical lesions (both visual fields affected — homonymous). Bilateral simultaneous sudden loss suggests cortical or toxic cause.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Red vs White Eye</div><div class="n-diag-content"><strong>Red eye</strong> = anterior segment pathology in most cases (conjunctivitis, keratitis, uveitis, glaucoma). <strong>White (quiet) eye with vision loss</strong> = posterior emergency — retinal detachment, CRAO, optic neuritis, vitreous haemorrhage (may appear red). White eye + pain = scleritis.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">The Ophthalmic Examination — In Order</span><span class="n-section-tag">VA is the vital sign</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Visual Acuity — always first</div><div class="n-mech-text">Snellen chart at 6m. Document each eye separately. With correction. <strong>If VA is reduced — everything else follows from this.</strong> Counting fingers, hand movements, light perception if Snellen not possible. Pinhole improves refractive error, not pathology.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Pupils — RAPD is critical</div><div class="n-mech-text">Size, shape, reactivity. <strong>Relative Afferent Pupillary Defect (RAPD)</strong> = swinging torch test — the affected pupil dilates instead of constricting when light shines in. RAPD = optic nerve or significant retinal disease on that side. Absent in cataract.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Visual Fields — confrontation first</div><div class="n-mech-text">Confrontation at bedside. Formal automated perimetry (Humphrey) for glaucoma, neuro-ophthalmology. Field defect pattern localises the lesion: monocular = eye/ON, bitemporal = chiasm, homonymous = post-chiasmal.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Anterior segment — slit lamp</div><div class="n-mech-text">Cornea (ulcer, KPs, oedema), anterior chamber (depth, cells, flare, hypopyon), iris (synechiae, rubeosis), lens (cataract, dislocation). <strong>IOP before dilating</strong> if glaucoma suspected.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d1">05</div><div class="n-mech-body"><div class="n-mech-cause">Fundus — dilated exam</div><div class="n-mech-text">Optic disc (C:D ratio, pallor, swelling), macula (drusen, pigment change, haemorrhage), vessels (A:V nicking, neovascularisation), periphery (detachment, breaks). Direct ophthalmoscope for disc; indirect for periphery.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Key Clinical Signs & What They Mean</span><span class="n-section-tag">pattern recognition</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">RAPD</div><div class="n-diag-content">Relative afferent pupillary defect. Affected pupil dilates on direct illumination (swinging torch). Indicates optic nerve disease or severe retinal disease. <strong>Absent in cataract</strong> — if RAPD present with apparent cataract, look harder for posterior pathology.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Ciliary Flush</div><div class="n-diag-content">Ring of injection around the limbus (corneal margin). Suggests anterior segment inflammation — keratitis, uveitis, acute glaucoma. Contrasts with peripheral conjunctival injection of simple conjunctivitis. <strong>Limbal injection = refer.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label">Pinhole Test</div><div class="n-diag-content">Pinhole improves VA if reduced by refractive error. <strong>Does not improve VA caused by pathology</strong> (cataract, macular disease, optic nerve). Improved pinhole VA = refractive cause. Unchanged = pathological cause.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Red Reflex</div><div class="n-diag-content">Orange-red glow from fundus on ophthalmoscopy. <strong>Absent or white (leukocoria)</strong> = cataract, retinoblastoma, vitreous haemorrhage, retinal detachment. Absent red reflex in a child = same-day referral.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">the foundations that everything else builds on</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>VA is the vital sign of the eye.</strong> Document it before every other examination step. A normal VA in the context of an apparently serious complaint should prompt careful reconsideration.<span class="n-pearl-exam">Exam: patient with painful red eye — first thing to document?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>RAPD = optic nerve or significant retinal disease.</strong> Not present in cataract, refractive error, or amblyopia. If a cataract patient has RAPD, there is pathology behind the lens.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Painless, sudden, unilateral vision loss in a quiet eye = posterior emergency.</strong> Retinal detachment, CRAO, vitreous haemorrhage, optic neuritis. Do not reassure and discharge.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Bitemporal hemianopia = chiasmal lesion until proven otherwise.</strong> Pituitary adenoma compresses the crossing nasal fibres. MRI pituitary + endocrine screen.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Homonymous hemianopia = post-chiasmal lesion.</strong> Same side field loss in both eyes — stroke, tumour, AVM. The patient may not realise the deficit is bilateral.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Absent red reflex in a child = same-day ophthalmology referral.</strong> Retinoblastoma, dense cataract, vitreous haemorrhage. Do not delay.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">foundations matter</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Painful red eye — examine the anterior segment first.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Check VA first. Always.</strong> A VA of 6/6 vs 6/60 changes everything about urgency and management.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Dense cataract → RAPD present → must be the cataract affecting the pupil.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Cataracts do not cause RAPD.</strong> RAPD with cataract = co-existing optic nerve or retinal disease. Investigate before surgery.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Patient lost vision in one eye, other eye fine — not an emergency if painless.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Painless sudden unilateral loss = emergency.</strong> CRAO, retinal detachment, and optic neuritis are all painless and all time-critical.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>VA first. Always. Everything else follows.</em><br>Four dichotomies: painful/painless · sudden/gradual · unilateral/bilateral · red/white.<br>RAPD = optic nerve. Absent red reflex in child = same-day referral.</div></div></div>
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
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid rgba(245,242,235,0.12);border-radius:6px;overflow:hidden;">
    <div style="border-right:1px solid rgba(245,242,235,0.1);">
      <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 20px;border-bottom:1px solid rgba(245,242,235,0.1);color:rgba(245,242,235,0.9);background:rgba(245,242,235,0.05);">Chalazion</div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">What</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Meibomian lipogranuloma — chronic <strong>sterile</strong> inflammation</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Tender?</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;"><strong>No.</strong> Firm nodule in tarsal plate. Non-inflamed.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Cause</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Blocked duct → retained lipid → granulomatous response</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Rx</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Warm compresses → steroid injection → I&amp;C if &gt;4 weeks</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Red flag</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;"><strong>Same site recurrence = biopsy.</strong> Sebaceous carcinoma masquerades here.</span></div>
    </div>
    <div style="">
      <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 20px;border-bottom:1px solid rgba(245,242,235,0.1);color:#c8452a;background:rgba(200,69,42,0.06);">Hordeolum (Stye)</div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">What</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Staphylococcal abscess — acute <strong>bacterial</strong> infection</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Tender?</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;"><strong>Yes.</strong> Acutely painful, red, pointing. Hot lid.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Cause</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Staph aureus. External = Zeis/Moll. Internal = Meibomian.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Rx</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Warm compresses + topical abx. Systemic if cellulitis.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Red flag</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;"><strong>Fever + proptosis + restricted EOM</strong> = orbital cellulitis. IV abx now.</span></div>
    </div>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>The pupil localises the cause of ptosis.</em><br>Dilated = aneurysm. Miosis = Horner. Normal = myasthenia or aponeurotic.<br>Tender lid lump = infected. Same-site recurrence = biopsy.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.eyelids=[{q:"Firm non-tender upper lid nodule for 6 weeks. First-line management?",opts:["Flucloxacillin","Warm compresses + massage","Urgent excision","Topical steroids"],ans:1,focus:"Chalazion management",exp:"Chalazion = blocked meibomian gland lipogranuloma. First-line: warm compresses + massage. Persistent: steroid injection or I&C. Recurrent in same spot → biopsy."},{q:"Complete right ptosis, eye down-and-out, pupil 7mm fixed. Immediate investigation?",opts:["TFTs","Ice test","Emergency CT/MR angiography","Anti-AChR antibodies"],ans:2,focus:"CN III + pupil = aneurysm",exp:"Complete CN III with pupil involvement = PComm aneurysm until proven otherwise. Pupillary fibres on outer surface compressed by extrinsic pressure first."},{q:"Lower lid sags away from globe. Watery eye despite no increased tearing. Diagnosis?",opts:["Entropion reflex tearing","Ectropion — disrupted tear drainage","NLDO","Dry eye"],ans:1,focus:"Ectropion — paradoxical epiphora",exp:"Ectropion: lower lid everts → punctum displaced → impaired drainage → epiphora. Paradoxically watery despite drainage problem not excess production."},{q:"Ptosis worsening through the day + normal pupil + improves with ice. Diagnosis?",opts:["Aponeurotic ptosis","Myasthenia gravis","Horner syndrome","CN III ischaemic"],ans:1,focus:"Myasthenia — fatigable ptosis",exp:"Fatigable ptosis in MG: ACh depletes with repetitive use. Ice test improves it (cold enhances ACh). Normal pupil. Anti-AChR antibodies."},{q:"Horner syndrome — how does ptosis differ from CN III?",opts:["Horner = complete; CN III = partial","Horner = partial ptosis + miosis; CN III = complete ptosis + mydriasis","Both cause complete ptosis","Horner has no pupil change"],ans:1,focus:"Horner vs CN III pupils",exp:"Horner: sympathetic loss → partial ptosis (Müller's muscle) + miosis. CN III: levator palsy → complete ptosis + fixed dilated pupil. Pupil size is the key."}];

// ── LACRIMAL ──
NOTES.lacrimal = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Adnexa · Note 03</div>
  <div class="n-hero-title">Lacrimal<br><em>Apparatus</em></div>
  <div class="n-hero-sub">Tear film · Dry eye · Dacryocystitis · NLDO · The watery eye paradox</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Tear film layers</div><div class="n-snap-text">Lipid (Meibomian) → aqueous (lacrimal gland) → mucin (goblet cells). <strong>Each layer can fail independently — and each gives a different dry eye subtype.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Drainage path</div><div class="n-snap-text">Tears → puncta → canaliculi → lacrimal sac → nasolacrimal duct → inferior meatus. <strong>Obstruction anywhere = epiphora.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The paradox</div><div class="n-snap-text">Dry eye (reflex tearing) and NLDO (blocked drainage) both cause a <em>watery eye.</em> Opposite causes, same symptom — the history and Schirmer's separate them.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Tear Film — Three Layers, Three Failure Modes</span><span class="n-section-tag">know which layer is failing</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Tear film structure and failure modes</span><span class="n-viz-sub">From superficial to deep</span></div>
    <svg viewBox="0 0 760 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="244" height="180" rx="2" fill="#c8452a"/>
      <text x="122" y="32" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">SUPERFICIAL</text>
      <text x="122" y="62" font-family="Syne,sans-serif" font-size="17" fill="white" text-anchor="middle" font-weight="800">LIPID</text>
      <text x="122" y="86" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Meibomian glands</text>
      <text x="122" y="108" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Prevents evaporation</text>
      <text x="122" y="140" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Failure → evaporative dry eye</text>
      <text x="122" y="158" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">MGD · rosacea · blepharitis</text>
      <rect x="258" y="0" width="244" height="180" rx="2" fill="#2a4a6e"/>
      <text x="380" y="32" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">MIDDLE</text>
      <text x="380" y="62" font-family="Syne,sans-serif" font-size="17" fill="white" text-anchor="middle" font-weight="800">AQUEOUS</text>
      <text x="380" y="86" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Lacrimal gland</text>
      <text x="380" y="108" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">90% of tear volume</text>
      <text x="380" y="140" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Failure → aqueous-deficient dry eye</text>
      <text x="380" y="158" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Sjögren · post-radiation</text>
      <rect x="516" y="0" width="244" height="180" rx="2" fill="#3a5a38"/>
      <text x="638" y="32" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">DEEP</text>
      <text x="638" y="62" font-family="Syne,sans-serif" font-size="17" fill="white" text-anchor="middle" font-weight="800">MUCIN</text>
      <text x="638" y="86" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Goblet cells (conjunctiva)</text>
      <text x="638" y="108" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Anchors aqueous to cornea</text>
      <text x="638" y="140" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Failure → poor wetting, filamentary</text>
      <text x="638" y="158" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Vit A deficiency · cicatricial conjunctivitis</text>
    </svg>
  </div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Evaporative (MGD)</div><div class="n-diag-content">Most common dry eye type. Meibomian gland dysfunction → lipid deficiency → rapid tear breakup. <strong>TBUT &lt;10 seconds.</strong> Posterior blepharitis, rosacea. Warm compresses + expression + oral doxycycline 100mg OD for 3 months.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Aqueous-deficient (Sjögren)</div><div class="n-diag-content">Primary Sjögren or secondary (RA, SLE, systemic sclerosis). Anti-Ro/La antibodies. Schirmer's test &lt;5mm in 5 min (wetting of filter paper). Preservative-free tears, punctal plugs, topical ciclosporin. Dry mouth + dry eyes = Sjögren until proven otherwise.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Mucin-deficient</div><div class="n-diag-content">Goblet cell loss — vitamin A deficiency (Bitot's spots, keratomalacia — leading cause of preventable blindness worldwide), cicatricial conjunctivitis (Stevens-Johnson, trachoma, pemphigoid). Filamentary keratitis. Treat underlying cause.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">The Watery Eye — Drainage Path & NLDO</span><span class="n-section-tag">epiphora ≠ excess tears</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Anatomy of drainage</div><div class="n-mech-text">Tears drain via <strong>upper and lower puncta</strong> → canaliculi → common canaliculus → lacrimal sac → nasolacrimal duct → inferior meatus. The pump action requires orbicularis oculi function (blink). CN VII palsy → pump failure → epiphora.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">NLDO — Nasolacrimal Duct Obstruction</div><div class="n-mech-text">Most common cause of epiphora. Congenital (80% resolve spontaneously by age 1 — try massage first, probe at 12 months). Adult: age-related fibrosis, trauma, tumour. <strong>Syringe and probe to confirm, dacryocystorhinostomy (DCR) definitive.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Dacryocystitis</div><div class="n-mech-text">Infection of lacrimal sac — almost always from NLDO. <strong>Tender, red swelling medial to medial canthus</strong> (below medial canthal tendon — distinguishes from DCR abscess above). Staph aureus. Acute: oral/IV antibiotics, warm compresses, incise if pointing. Elective DCR after resolution.</div></div></div>
  </div>
  <div class="n-exam-box"><div class="n-exam-if">The paradox — exam favourite</div><div class="n-exam-statement">A watery eye does NOT mean overproduction. <em>Dry eye causes reflex hypersecretion.</em> NLDO blocks drainage. Ectropion misroutes tears. Same symptom — three completely different mechanisms. The Schirmer's test and syringe test separate them.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Sjögren Syndrome — Systemic Picture</span><span class="n-section-tag">the eyes are often the first clue</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Primary Sjögren</div><div class="n-diag-content">Autoimmune destruction of exocrine glands — lacrimal + salivary. Female:male 9:1. Middle-aged. Keratoconjunctivitis sicca (dry eyes) + xerostomia (dry mouth). Anti-Ro (SS-A) + anti-La (SS-B) antibodies. ANA positive.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Secondary Sjögren</div><div class="n-diag-content">Associated with RA (most common), SLE, systemic sclerosis, primary biliary cirrhosis. Screen all patients with connective tissue disease for dry eye symptoms.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Complications</div><div class="n-diag-content">Corneal ulceration from chronic dry eye. <strong>5% lifetime risk of B-cell lymphoma</strong> (MALT type, parotid). Monitor. Peripheral neuropathy, renal tubular acidosis in severe cases.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Investigations & Treatment Ladder</span><span class="n-section-tag">test, then treat by severity</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Schirmer's test</div><div class="n-mech-text">Filter paper in inferior fornix for 5 min. &lt;5mm = severe aqueous deficiency. 5–10mm = moderate. Used to diagnose and monitor.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Tear breakup time (TBUT)</div><div class="n-mech-text">Fluorescein instilled, time to first dark spot on slit lamp. <strong>&lt;10 seconds = abnormal.</strong> Mainly assesses lipid layer stability — best test for MGD/evaporative dry eye.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Treatment ladder</div><div class="n-mech-text">Mild: preservative-free artificial tears. Moderate: punctal plugs (block drainage, conserve tears) + lid hygiene. Severe: topical ciclosporin (Restasis), oral doxycycline, autologous serum drops. Surgical: permanent punctal occlusion, moisture chamber glasses.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam favourites</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Watery eye ≠ too many tears.</strong> Dry eye (reflex), NLDO (blocked drainage), ectropion (misdirection) all cause epiphora. Schirmer's + syringe test to differentiate.<span class="n-pearl-exam">Exam: patient with watery eye and dry mouth — what autoantibodies?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Congenital NLDO — massage first.</strong> 80% resolve spontaneously by 12 months. Massage the lacrimal sac 2–3x daily. Probe only if persistent beyond 12 months.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Dacryocystitis swelling is below the medial canthal tendon.</strong> Orbital cellulitis swelling is above or surrounding. This anatomical distinction guides urgency and treatment.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Sjögren + dry eyes = screen for lymphoma.</strong> 5% lifetime risk of MALT lymphoma, usually parotid. Any new parotid swelling in a Sjögren patient needs investigation.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Vitamin A deficiency = mucin-deficient dry eye + night blindness.</strong> Bitot's spots (foamy white conjunctival patches) → keratomalacia → corneal perforation. Leading cause of preventable childhood blindness globally.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Punctal plugs conserve tears by blocking drainage</strong> — the opposite of what you'd expect. Used for moderate-severe aqueous deficient dry eye when drops alone are insufficient.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for these</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Patient complains of watery eyes → dry eye unlikely.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Dry eye causes reflex hypersecretion</strong> — watering is a classic dry eye complaint. Schirmer's test before assuming NLDO.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Congenital NLDO at 6 months → probe now.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Massage first, probe at 12 months if unresolved.</strong> 80% resolve spontaneously — avoid unnecessary procedures.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Sjögren is just dry eyes and dry mouth — a nuisance condition.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>5% lymphoma risk, peripheral neuropathy, renal tubular acidosis.</strong> Sjögren is a serious systemic autoimmune disease.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Watery eye ≠ too many tears.</em><br>Three layers, three failure modes. Drainage has anatomy — obstruction has surgery.<br>Sjögren = screen for lymphoma.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.lacrimal=[{q:"RA patient, bilateral gritty burning watery eyes. Schirmer's 3mm/5min. Diagnosis?",opts:["NLDO","Aqueous-deficient dry eye — secondary Sjögren","Evaporative dry eye","Allergic conjunctivitis"],ans:1,focus:"Sjögren — aqueous-deficient",exp:"Secondary Sjögren in RA. Schirmer <5mm/5min = aqueous deficiency. Anti-Ro/La antibodies. Watering = reflex hypersecretion."},{q:"Pressing medial canthus produces mucopus from punctum. Diagnosis and treatment?",opts:["Acute dacryocystitis — IV antibiotics","Chronic dacryocystitis NLDO — DCR","Dry eye — artificial tears","Conjunctivitis — chloramphenicol"],ans:1,focus:"Chronic dacryocystitis — regurgitation test",exp:"Chronic dacryocystitis: persistent epiphora + mucopurulent regurgitation on sac pressure = NLDO. Treatment: dacryocystorhinostomy."},{q:"Contraindicated in acute dacryocystitis?",opts:["Oral flucloxacillin","Warm compresses","Probing and syringing","Ophthalmology referral"],ans:2,focus:"No probing in acute dacryocystitis",exp:"Probing risks false passage and spreading infection. Treat with antibiotics first. DCR is elective."},{q:"Which layer of tear film is produced by goblet cells?",opts:["Lipid — MGD","Aqueous — lacrimal gland","Mucin — goblet cells","Aqueous — Sjögren"],ans:2,focus:"Tear film layers",exp:"Mucin (innermost) from goblet cells allows tears to spread over corneal epithelium. Destroyed in SJS, ocular pemphigoid, trachoma."},{q:"Which investigation measures aqueous tear production?",opts:["TBUT","Schirmer's test","Rose Bengal staining","Meibography"],ans:1,focus:"Schirmer's test",exp:"Schirmer's: filter paper in lower fornix; <5mm/5min = aqueous deficiency. TBUT = lipid function. Rose Bengal = damaged epithelium."}];

// ── CONJUNCTIVA ──
NOTES.conjunctiva = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Anterior Segment · Note 04</div>
  <div class="n-hero-title">Con<em>junctiva</em></div>
  <div class="n-hero-sub">Bacterial · Viral · Allergic · Episcleritis · Scleritis · The Red Eye Safety Screen</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Red eye differential</div><div class="n-snap-text">Conjunctivitis, keratitis, uveitis, acute glaucoma, episcleritis, scleritis. <strong>Discriminators: pain, photophobia, VA change, pupil.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Discharge type</div><div class="n-snap-text">Mucopurulent = bacterial. Watery = viral. Stringy/ropy = allergic. No discharge = episcleritis/scleritis.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Safety rule</div><div class="n-snap-text">Red eye + photophobia + VA loss + irregular pupil = <strong>NOT conjunctivitis. Refer immediately.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Red Eye Safety Screen</span><span class="n-section-tag">never miss these</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Red eye: safe vs refer</span><span class="n-viz-sub">These features should never be attributed to simple conjunctivitis</span></div>
    <svg viewBox="0 0 760 155" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="370" height="155" rx="2" fill="#2a4a2a"/>
      <text x="185" y="28" font-family="Syne,sans-serif" font-size="12" fill="rgba(255,255,255,.6)" text-anchor="middle" font-weight="700" letter-spacing="2">SAFE — CONJUNCTIVITIS</text>
      <text x="185" y="58" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.82)" text-anchor="middle">Normal VA ✓</text>
      <text x="185" y="78" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.82)" text-anchor="middle">No photophobia ✓</text>
      <text x="185" y="98" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.82)" text-anchor="middle">Normal round pupil ✓</text>
      <text x="185" y="118" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.82)" text-anchor="middle">Discharge present ✓</text>
      <text x="185" y="142" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Treat empirically · safety-net · review if not improving</text>
      <rect x="390" y="0" width="370" height="155" rx="2" fill="#c8452a"/>
      <text x="575" y="28" font-family="Syne,sans-serif" font-size="12" fill="rgba(255,255,255,.6)" text-anchor="middle" font-weight="700" letter-spacing="2">REFER — NOT SAFE</text>
      <text x="575" y="58" font-family="JetBrains Mono,monospace" font-size="10" fill="white" text-anchor="middle">Reduced VA ✗</text>
      <text x="575" y="78" font-family="JetBrains Mono,monospace" font-size="10" fill="white" text-anchor="middle">Photophobia ✗</text>
      <text x="575" y="98" font-family="JetBrains Mono,monospace" font-size="10" fill="white" text-anchor="middle">Irregular/fixed pupil ✗</text>
      <text x="575" y="118" font-family="JetBrains Mono,monospace" font-size="10" fill="white" text-anchor="middle">Ciliary flush ✗</text>
      <text x="575" y="142" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle">Keratitis · uveitis · glaucoma · scleritis</text>
    </svg>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Conjunctivitis — Three Types</span><span class="n-section-tag">the history gives the diagnosis</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Bacterial</div><div class="n-diag-content"><strong>Mucopurulent discharge, sticky lashes on waking.</strong> Organisms: Staph aureus, H. influenzae, S. pneumoniae. Topical chloramphenicol. <strong>Gonococcal (hyperacute):</strong> profuse purulent discharge, same-day emergency — N. gonorrhoeae can perforate the cornea within 24 hours. IV ceftriaxone + contact tracing. Neonatal (ophthalmia neonatorum): chlamydia (most common) or gonococcal — notifiable, treat immediately.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Viral</div><div class="n-diag-content">Adenoviral — watery discharge, follicles on conjunctiva, <strong>pre-auricular lymph node</strong> (pathognomonic). Highly contagious — strict hand hygiene, no sharing towels, stay away from swimming pools for 14 days. No antibiotics. Self-limiting in 2–3 weeks. Epidemic keratoconjunctivitis: adenovirus 8/19 — subepithelial infiltrates, photophobia, vision affected.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Allergic</div><div class="n-diag-content"><strong>Bilateral, itching, stringy/ropy discharge, papillae</strong> (not follicles). Seasonal (pollen) or perennial (dust mite, pet). Associations: atopy, asthma, eczema. Topical antihistamine (olopatadine), mast cell stabilisers (sodium cromoglicate). Avoid rubbing — histamine release worsens symptoms. <strong>Vernal keratoconjunctivitis:</strong> young males, cobblestone papillae on upper tarsal plate, shield ulcer on cornea — sight-threatening.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Chlamydial</div><div class="n-diag-content">Chronic follicular conjunctivitis. Large follicles, inferior tarsal conjunctiva. Pannus (corneal vascularisation). STI — genital chlamydia. <strong>Trachoma</strong> (C. trachomatis serotypes A–C): leading infectious cause of blindness globally. Entropion + trichiasis + corneal scarring. WHO SAFE strategy.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Episcleritis vs Scleritis</span><span class="n-section-tag">this distinction matters enormously</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid rgba(245,242,235,0.12);border-radius:6px;overflow:hidden;">
    <div style="border-right:1px solid rgba(245,242,235,0.1);">
      <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 20px;border-bottom:1px solid rgba(245,242,235,0.1);color:rgba(245,242,235,0.9);background:rgba(245,242,235,0.05);">Episcleritis</div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Pain</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Mild discomfort or <strong>none.</strong> Dull ache at most.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Colour</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Bright red, sectoral. <strong>Blanches with phenylephrine.</strong></span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">VA</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;"><strong>Normal.</strong> No threat to vision.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Systemic</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Usually idiopathic. Mild assoc: IBD, RA.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Rx</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Topical NSAIDs or lubricants. Self-limiting weeks.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Urgency</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Routine — no emergency referral needed.</span></div>
    </div>
    <div style="">
      <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 20px;border-bottom:1px solid rgba(245,242,235,0.1);color:#c8452a;background:rgba(200,69,42,0.06);">Scleritis</div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Pain</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;"><strong>Severe boring pain. Wakes from sleep.</strong> Radiates jaw/temple.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Colour</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Deep violaceous. <strong>Does NOT blanch</strong> with phenylephrine.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">VA</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Can be <strong>reduced.</strong> Posterior → exudative RD.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Systemic</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;"><strong>RA · GPA · SLE · IBD</strong> — full workup mandatory.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid rgba(245,242,235,0.06);"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Rx</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;">Oral NSAIDs → steroids → DMARDs. Topicals insufficient.</span></div>
      <div style="display:grid;grid-template-columns:88px 1fr;"><span style="font-family:Syne,sans-serif;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(245,242,235,0.35);padding:11px 10px 11px 18px;border-right:1px solid rgba(245,242,235,0.06);display:flex;align-items:center;">Urgency</span><span style="font-family:JetBrains Mono,monospace;font-size:11px;color:rgba(245,242,235,0.8);padding:11px 16px;line-height:1.5;"><strong>Urgent.</strong> Scleral thinning → perforation if untreated.</span></div>
    </div>
  </div>
</div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Subconjunctival Haemorrhage</span><span class="n-section-tag">alarming to the patient, usually benign</span></div>
  <div class="n-exam-box"><div class="n-exam-if">The pattern</div><div class="n-exam-statement">Bright red, sharply demarcated area of blood under conjunctiva. No pain. No discharge. Normal VA. Alarming to look at — almost always benign and self-resolving in 2 weeks.</div></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Benign causes</div><div class="n-diag-content">Valsalva (coughing, sneezing, straining), trauma, contact lens wear, idiopathic. Reassure, lubricants, resolves spontaneously.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">When to investigate</div><div class="n-diag-content">Recurrent SCH → check BP and clotting (anticoagulants, thrombocytopenia). Bilateral spontaneous SCH in elderly → consider haematological malignancy. Traumatic → exclude ruptured globe (dark red 360° haemorrhage + low IOP).</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam favourites</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Pre-auricular lymph node = viral conjunctivitis.</strong> Adenovirus. No antibiotics. Highly contagious. Strict hygiene is the only treatment.<span class="n-pearl-exam">Exam: watery discharge + pre-auricular node — what organism?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Gonococcal conjunctivitis is a same-day emergency.</strong> Hyperacute, profuse purulent discharge. N. gonorrhoeae penetrates intact corneal epithelium — can perforate within 24 hours.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Vessels blanch with phenylephrine = episcleritis.</strong> Deep violaceous colour that does NOT blanch = scleritis. This single clinical test separates a benign from a sight- and globe-threatening condition.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Scleritis + RA = vasculitis.</strong> Scleritis in RA indicates active systemic vasculitis. Refer urgently, treat the underlying disease aggressively with DMARDs or biologics.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Vernal KJC = cobblestone papillae + shield ulcer.</strong> Young atopic male. Upper tarsal plate papillae look like cobblestones. Shield ulcer is sight-threatening. Topical cyclosporin, mast cell stabilisers.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Trachoma = leading infectious cause of preventable blindness globally.</strong> C. trachomatis A–C. SAFE strategy: Surgery, Antibiotics (azithromycin), Facial washing, Environmental improvement.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for these</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Red eye with watery discharge → viral, reassure and discharge.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Check VA and pupil first.</strong> Watery eye + photophobia + reduced VA = keratitis or uveitis. Not conjunctivitis.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Red eye + profuse mucopurulent discharge → topical chloramphenicol, review in a week.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Hyperacute = gonococcal until proven otherwise.</strong> Same-day emergency. IV ceftriaxone. Can perforate the cornea within 24 hours.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Scleritis vs episcleritis — both red, both in the sclera, both need topical treatment.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Scleritis needs systemic treatment and systemic workup.</strong> Deep pain, no blanching, associated with RA/GPA/SLE. Topical drops are insufficient.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Red eye safety screen: VA + pupil + photophobia before discharge.</em><br>Pre-auricular node = viral. Hyperacute purulent = gonococcal emergency.<br>Blanches with phenylephrine = episcleritis. Does not blanch = scleritis.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.conjunctiva=[{q:"20-year-old with bilateral itching, ropy discharge. First-line?",opts:["Chloramphenicol","Dexamethasone","Topical azelastine","Oral cetirizine only"],ans:2,focus:"Allergic conjunctivitis — antihistamine",exp:"Allergic: itching is hallmark. First-line: topical antihistamine (azelastine) or mast cell stabiliser. Steroids contraindicated in primary care."},{q:"Neonate day 3, profuse pus reforming immediately. Organism and management?",opts:["Chlamydia — oral erythromycin","Staph — topical chloramphenicol","N. gonorrhoeae — IV ceftriaxone + same-day referral","HSV — topical aciclovir"],ans:2,focus:"Gonococcal ophthalmia neonatorum",exp:"Gonococcal ophthalmia (day 1–4): hyperacute. Only organism perforating intact cornea. IV ceftriaxone. Notifiable."},{q:"Sectoral red eye, mild discomfort, blanches with phenylephrine. Diagnosis?",opts:["Scleritis — NSAIDs","Episcleritis — lubricants/NSAIDs","Bacterial conjunctivitis","Uveitis"],ans:1,focus:"Episcleritis — phenylephrine blanching",exp:"Episcleritis: superficial vessels blanch with phenylephrine. Mild discomfort. Self-limiting. Compare: scleritis vessels don't blanch, deep boring pain, systemic association."},{q:"RA patient, deep boring nocturnal eye pain, globe tender, red eye not blanching. Diagnosis?",opts:["Conjunctivitis","Episcleritis","Scleritis — NSAIDs, ophthalmology","Acute glaucoma"],ans:2,focus:"Scleritis — RA, no blanching",exp:"Scleritis: deep boring pain, globe tenderness, no blanching, RA/GPA/SLE association. Treatment: oral NSAIDs → steroids → immunosuppression."},{q:"Watery red eye + pre-auricular node + URTI + VA 6/6 + no photophobia. Key public health advice?",opts:["Return to work tomorrow","Strict hygiene, avoid contact 14 days","No infectious precautions","Oral azithromycin"],ans:1,focus:"Viral conjunctivitis — contagious",exp:"Adenoviral EKC: highly contagious. Strict handwashing, no shared towels, avoid swimming, 14-day contact restriction. Self-limiting."}];

// ── UVEITIS ──
NOTES.uveitis = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Uveal Tract · Note 08</div>
  <div class="n-hero-title">U<em>veitis</em></div>
  <div class="n-hero-sub">Anterior · Intermediate · Posterior · HLA-B27 · KPs · Synechiae · Complications</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The uvea</div><div class="n-snap-text">Iris + ciliary body (anterior uvea) + choroid (posterior uvea). Inflammation at any level = uveitis. <strong>Location determines symptoms.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Anterior uveitis signs</div><div class="n-snap-text">Ciliary flush, KPs on corneal endothelium, cells + flare in anterior chamber, miosis, posterior synechiae. <strong>Painful, photophobic, reduced VA.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Systemic clue</div><div class="n-snap-text">HLA-B27: AS, reactive arthritis, psoriatic arthritis, IBD. <strong>The red eye may be the first presentation of spondyloarthropathy.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Classification by Anatomical Location</span><span class="n-section-tag">location = presentation</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Uveitis classification and key associations</span><span class="n-viz-sub">Most common = anterior (70%)</span></div>
    <svg viewBox="0 0 760 175" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="244" height="175" rx="2" fill="#c8452a"/>
      <text x="122" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">ANTERIOR — 70%</text>
      <text x="122" y="55" font-family="Syne,sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="800">Iritis / Iridocyclitis</text>
      <text x="122" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.72)" text-anchor="middle">Painful · photophobic · red</text>
      <text x="122" y="98" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.72)" text-anchor="middle">KPs · cells + flare · miosis</text>
      <text x="122" y="128" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">HLA-B27 · AS · IBD</text>
      <text x="122" y="148" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Reactive arthritis · psoriasis</text>
      <rect x="258" y="0" width="244" height="175" rx="2" fill="#2a4a6e"/>
      <text x="380" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">INTERMEDIATE</text>
      <text x="380" y="55" font-family="Syne,sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="800">Pars Planitis</text>
      <text x="380" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.72)" text-anchor="middle">Floaters · blur · quiet eye</text>
      <text x="380" y="98" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.72)" text-anchor="middle">Snowball vitreous · snowbanking</text>
      <text x="380" y="128" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">MS · Sarcoidosis · Lyme</text>
      <text x="380" y="148" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">CMO = main complication</text>
      <rect x="516" y="0" width="244" height="175" rx="2" fill="#3a2a4e"/>
      <text x="638" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">POSTERIOR</text>
      <text x="638" y="55" font-family="Syne,sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="800">Choroiditis</text>
      <text x="638" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.72)" text-anchor="middle">Painless · floaters · scotoma</text>
      <text x="638" y="98" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.72)" text-anchor="middle">White retinal lesions on fundus</text>
      <text x="638" y="128" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Toxoplasma · TB · CMV</text>
      <text x="638" y="148" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Sarcoid · Behçet · Syphilis</text>
    </svg>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Anterior Uveitis — Slit Lamp Signs</span><span class="n-section-tag">what you see on the slit lamp</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">KPs — Keratic Precipitates</div><div class="n-diag-content">WBC deposits on corneal endothelium. <strong>Fine/stellate KPs</strong> = non-granulomatous (HLA-B27, idiopathic). <strong>Mutton-fat KPs (large, greasy)</strong> = granulomatous uveitis — sarcoidosis, TB, syphilis, Vogt-Koyanagi-Harada. Granulomatous = systemic workup mandatory.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Cells + Flare</div><div class="n-diag-content">Cells = WBCs in aqueous. Flare = protein leak (breakdown of blood-aqueous barrier). Graded 1–4+. <strong>Hypopyon</strong> = visible layer of pus in AC — severe inflammation, consider endophthalmitis or Behçet's.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Synechiae</div><div class="n-diag-content"><strong>Posterior synechiae</strong> = iris adheres to lens → irregular pupil on dilation, can cause pupil block → secondary angle-closure glaucoma. <strong>Peripheral anterior synechiae (PAS)</strong> = iris adheres to trabecular meshwork → secondary glaucoma. Dilate early to prevent.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Complications</div><div class="n-diag-content">Cataract (steroid-induced + inflammatory), glaucoma (synechiae + steroid), cystoid macular oedema (CMO) — the main cause of visual loss in chronic uveitis. Hypotony (ciliary shutdown) in severe cases.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">HLA-B27 — The Spondyloarthropathy Connection</span><span class="n-section-tag">eye as window to the spine</span></div>
  <div class="n-exam-box"><div class="n-exam-if">The pattern</div><div class="n-exam-statement">Young man, recurrent unilateral anterior uveitis, back pain worse in the morning, improves with exercise — <em>ankylosing spondylitis.</em> HLA-B27 in 90% of AS. The eye can precede the spinal symptoms by years.</div></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Ankylosing Spondylitis</div><div class="n-diag-content">Most common HLA-B27 association. Recurrent, unilateral, acute anterior uveitis. Attacks self-limit in 6–8 weeks. Same eye may be affected repeatedly. Classic presentation on exams.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Reactive Arthritis</div><div class="n-diag-content">Post-infectious (chlamydia, enteric pathogens). Triad: urethritis + arthritis + conjunctivitis/uveitis. "Can't see, can't pee, can't climb a tree." HLA-B27 in 50–80%.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">IBD-associated</div><div class="n-diag-content">Uveitis in 5–10% of IBD patients. May correlate or not correlate with bowel disease activity. Crohn's more commonly associated than UC.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Psoriatic Arthritis</div><div class="n-diag-content">Uveitis in ~25%. May have nail changes, DIP joint arthritis, sacroiliitis. Ask about skin and joints in all uveitis patients.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Infectious Causes — Posterior Uveitis</span><span class="n-section-tag">always exclude infection before immunosuppression</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Toxoplasma</div><div class="n-diag-content">Most common cause of posterior uveitis worldwide. <strong>Focal necrotising retinochoroiditis</strong> — white fluffy retinal lesion adjacent to old pigmented scar ("headlight in fog"). Congenital (primary) or reactivation. Pyrimethamine + sulfadiazine + folinic acid.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">CMV Retinitis</div><div class="n-diag-content">Immunocompromised — HIV (CD4 &lt;50), post-transplant. <strong>Pizza-pie fundus</strong> — haemorrhages + fluffy white lesions. Brushfire spread along vessels. Ganciclovir IV → valganciclovir oral maintenance.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Sarcoidosis</div><div class="n-diag-content">Granulomatous uveitis, any level. Mutton-fat KPs. Snowball vitreous. Candle-wax dripping on vessels (periphlebitis). Chest X-ray (hilar lymphadenopathy), ACE, serum calcium, HRCT chest.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Syphilis</div><div class="n-diag-content">"The great masquerader." Can mimic any uveitis pattern — anterior, intermediate, posterior, panuveitis. Always test VDRL/RPR + treponemal test in uveitis workup. Treat with IV penicillin.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Treatment Principles</span><span class="n-section-tag">treat the inflammation, protect the vision</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Exclude infection first</div><div class="n-mech-text">Never give topical steroids to undiagnosed red eye. HSV keratitis + steroid = dendritic ulcer explodes. CMV/toxoplasma + steroid = catastrophic. Exclude infective cause before immunosuppression.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Anterior uveitis — topical treatment</div><div class="n-mech-text">Topical corticosteroids (prednisolone acetate 1% hourly initially). Cycloplegics (cyclopentolate, atropine) — reduce pain, prevent posterior synechiae formation, dilate pupil. Reduce drops as inflammation settles.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Chronic/posterior — systemic treatment</div><div class="n-mech-text">Oral prednisolone for sight-threatening posterior uveitis. Steroid-sparing agents for chronic disease: methotrexate, mycophenolate, azathioprine. Anti-TNF (adalimumab, infliximab) for refractory cases. Intravitreal triamcinolone for CMO.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam favourites</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Mutton-fat KPs = granulomatous uveitis = systemic workup.</strong> Sarcoid, TB, syphilis, VKH. Fine KPs = non-granulomatous = HLA-B27 likely.<span class="n-pearl-exam">Exam: KP type predicts uveitis aetiology — know both.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>HLA-B27 uveitis = unilateral, acute, recurrent, anterior.</strong> Young male, back pain, recurrent attacks. The opposite eye is at risk in subsequent attacks.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>CMO is the commonest cause of visual loss in uveitis.</strong> Macula swells from cytokines and breakdown of blood-retinal barrier. OCT confirms. Treat with periocular/intravitreal steroid.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Toxoplasma = white lesion adjacent to old scar.</strong> "Satellite lesion" pattern. Reactivation of congenital infection is common. Treat when threatening the macula or optic nerve.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Always test for syphilis in uveitis.</strong> VDRL + treponemal test. Syphilis mimics everything — anterior, posterior, panuveitis, retinitis, papillitis. Miss it and you miss a treatable, systemic infection.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Dilate early in anterior uveitis.</strong> Cycloplegics prevent posterior synechiae. Once synechiae form → irregular pupil → pupil block → secondary glaucoma. Easier to prevent than treat.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for these</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Red eye + uveitis on slit lamp → topical steroids immediately.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Exclude HSV keratitis first.</strong> Topical steroids on dendritic ulcer = corneal perforation. Fluorescein stain before treating any red eye with steroids.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Anterior uveitis — treat and discharge, it will settle.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Investigate for systemic cause.</strong> HLA-B27, ANA, ACE, CXR, syphilis serology. Uveitis can be the presenting feature of AS, sarcoid, IBD, syphilis.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">VA normal in uveitis — reassure, no rush with follow-up.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>CMO develops silently.</strong> Normal VA today does not rule out macular oedema developing over days. OCT follow-up is mandatory in all but the mildest cases.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>KP type predicts aetiology. Mutton-fat = granulomatous = systemic search.</em><br>HLA-B27: unilateral, acute, recurrent. Dilate early to prevent synechiae.<br>Always exclude syphilis. Always exclude infection before steroids.</div></div></div>
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Open-angle vs Angle-closure glaucoma</span><span class="n-viz-sub">Mechanism determines management</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="370" height="160" rx="2" fill="#1a2a3a"/>
      <text x="185" y="28" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">CHRONIC — SILENT</text>
      <text x="185" y="56" font-family="Syne,sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="800">Open-Angle</text>
      <text x="185" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Trabecular meshwork dysfunction</text>
      <text x="185" y="96" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Gradual IOP rise · peripheral VF loss first</text>
      <text x="185" y="112" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Painless · asymptomatic until late</text>
      <text x="185" y="145" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Prostaglandin drops · laser · trabeculectomy</text>
      <rect x="390" y="0" width="370" height="160" rx="2" fill="#c8452a"/>
      <text x="575" y="28" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">ACUTE — EMERGENCY</text>
      <text x="575" y="56" font-family="Syne,sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="800">Angle-Closure</text>
      <text x="575" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Iris occludes angle → aqueous trapped</text>
      <text x="575" y="96" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Sudden IOP &gt;50 · pain · vomiting · haloes</text>
      <text x="575" y="112" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Fixed mid-dilated pupil · corneal haze</text>
      <text x="575" y="145" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">IV acetazolamide · pilocarpine · laser iridotomy</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Fixed. Mid-dilated. Oval. Red eye. Vomiting.</em><br>Not migraine. Acute angle-closure. Every minute matters.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.glaucoma=[{q:"68-year-old asthmatic with POAG started timolol. Now has worsening breathlessness. Action?",opts:["Switch to preservative-free timolol","Stop timolol — systemic beta-2 blockade via NLD absorption. Switch to prostaglandin","Coincidental COPD — continue","Change instillation technique"],ans:1,focus:"Timolol — asthma contraindication",exp:"Timolol absorbed via nasolacrimal duct → beta-2 blockade → bronchospasm. Contraindicated in asthma/COPD. Switch to prostaglandin analogue (latanoprost)."},{q:"Sudden headache + nausea + halos + red eye + fixed mid-dilated oval pupil + hazy cornea. Diagnosis?",opts:["Migraine — discharge with analgesia","Uveitis — steroids","Acute angle-closure — IV acetazolamide","Conjunctivitis — chloramphenicol"],ans:2,focus:"Acute angle-closure — mid-dilated oval",exp:"Acute angle-closure: IOP 40–70mmHg → corneal oedema, pain, nausea, red eye, fixed mid-dilated OVAL pupil. IV acetazolamide 500mg, pilocarpine, beta-blocker. Definitive: LPI."},{q:"After right acute closure, what for the left eye?",opts:["Observe","Pilocarpine drops only","Prophylactic Nd:YAG peripheral iridotomy","Systemic acetazolamide both eyes"],ans:2,focus:"Fellow eye prophylactic LPI",exp:"Fellow eye has same narrow anatomy → 50% lifetime closure risk without treatment. Prophylactic LPI creates alternative aqueous route, bypassing pupil block."},{q:"POAG patient IOP 18mmHg but progressive disc cupping + VF loss. Diagnosis?",opts:["Ocular hypertension","Normal-tension glaucoma","Pseudoexfoliation glaucoma","Steroid-induced"],ans:1,focus:"Normal-tension glaucoma",exp:"NTG: optic neuropathy + VF loss despite normal IOP. Mechanism: vascular insufficiency. Associations: Raynaud's, migraine, nocturnal hypotension."},{q:"Why are POAG patients often symptom-free until late?",opts:["Central loss first — notice blurring","Peripheral loss first; >30% ganglion cells die before symptoms; fellow eye compensates","Uniform constriction from outset","Altitudinal loss sparing central"],ans:1,focus:"POAG — peripheral first, central late",exp:"POAG: peripheral VF loss (arcuate, nasal step) first. Central acuity preserved until very late. Fellow eye compensates. >30% ganglion cells dead before detectable defects."}];

// ── REFRACTION ──
NOTES.refraction = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Optics · Note 09</div>
  <div class="n-hero-title">Refraction &amp;<br><em>Refractive Surgery</em></div>
  <div class="n-hero-sub">Myopia · Hyperopia · Astigmatism · Presbyopia · LASIK · Phakic IOL</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The errors</div><div class="n-snap-text">Myopia: image in front of retina (globe too long). Hyperopia: behind retina (globe too short). Astigmatism: multiple focal points. Presbyopia: accommodation loss after 40.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Correcting lenses</div><div class="n-snap-text">Myopia → <strong>concave (minus)</strong> diverges rays. Hyperopia → <strong>convex (plus)</strong> converges rays. Astigmatism → cylindrical. Presbyopia → reading (plus) add.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Key caveat</div><div class="n-snap-text">LASIK corrects corneal curvature. <strong>It does NOT prevent presbyopia</strong> — presbyopia is lens inelasticity, not corneal shape.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Four Refractive Errors</span><span class="n-section-tag">optics with clinical consequences</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Focus point relative to retina</span><span class="n-viz-sub">The globe length or lens curvature determines where light lands</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="182" height="160" rx="2" fill="#c8452a"/>
      <text x="91" y="28" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">MYOPIA</text>
      <text x="91" y="50" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.65)" text-anchor="middle">Globe too long</text>
      <text x="91" y="70" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.65)" text-anchor="middle">Focus: ANTERIOR to retina</text>
      <text x="91" y="96" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.85)" text-anchor="middle">Blur at distance</text>
      <text x="91" y="114" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.85)" text-anchor="middle">Clear at near</text>
      <text x="91" y="146" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.35)" text-anchor="middle">Concave (−) lens · LASIK</text>
      <rect x="193" y="0" width="182" height="160" rx="2" fill="#2a4a6e"/>
      <text x="284" y="28" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">HYPEROPIA</text>
      <text x="284" y="50" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.65)" text-anchor="middle">Globe too short</text>
      <text x="284" y="70" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.65)" text-anchor="middle">Focus: POSTERIOR to retina</text>
      <text x="284" y="96" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.85)" text-anchor="middle">Blur at near (young)</text>
      <text x="284" y="114" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.85)" text-anchor="middle">Accommodative esotropia risk</text>
      <text x="284" y="146" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.35)" text-anchor="middle">Convex (+) lens · LASIK</text>
      <rect x="386" y="0" width="182" height="160" rx="2" fill="#3a5a38"/>
      <text x="477" y="28" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">ASTIGMATISM</text>
      <text x="477" y="50" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.65)" text-anchor="middle">Irregular corneal curvature</text>
      <text x="477" y="70" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.65)" text-anchor="middle">Multiple focal points</text>
      <text x="477" y="96" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.85)" text-anchor="middle">Distortion at all distances</text>
      <text x="477" y="114" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.85)" text-anchor="middle">Keratoconus if progressive</text>
      <text x="477" y="146" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.35)" text-anchor="middle">Cylindrical lens · toric IOL</text>
      <rect x="579" y="0" width="181" height="160" rx="2" fill="#4a3a1e"/>
      <text x="669" y="28" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">PRESBYOPIA</text>
      <text x="669" y="50" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.65)" text-anchor="middle">Lens inelasticity (&gt;40yr)</text>
      <text x="669" y="70" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.65)" text-anchor="middle">Lost accommodation</text>
      <text x="669" y="96" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.85)" text-anchor="middle">Near blur, arm-length reading</text>
      <text x="669" y="114" font-family="JetBrains Mono,monospace" font-size="10" fill="rgba(255,255,255,.85)" text-anchor="middle">Universal after 45</text>
      <text x="669" y="146" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.35)" text-anchor="middle">Reading (+) add · multifocal IOL</text>
    </svg>
  </div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">High Myopia Risk</div><div class="n-diag-content">Myopia &gt;6 dioptres. Stretched retina → <strong>retinal detachment, lattice degeneration, myopic macular degeneration, open-angle glaucoma</strong> risk. Annual fundus exam. Myopia control in children: atropine 0.01%, orthokeratology, multifocal contact lenses.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Hyperopia in Children</div><div class="n-diag-content">Young children can compensate by accommodating — but constant accommodation drives the eyes inward. <strong>Uncorrected hyperopia → accommodative esotropia → amblyopia.</strong> A child with a squint needs a refraction before anything else.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Keratoconus</div><div class="n-diag-content">Progressive corneal ectasia — thinning + steepening of cornea, usually inferiorly. Onset teens/20s. Irregular astigmatism, oil-droplet reflex on retinoscopy, Munson's sign (V-shape lower lid on downgaze). Rigid contact lenses → corneal cross-linking → keratoplasty.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Refractive Surgery — Options & Limits</span><span class="n-section-tag">what it can and cannot fix</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">LASIK</div><div class="n-diag-content">Laser reshapes corneal stroma under a flap. Corrects myopia (up to −10D), hyperopia (+4D), astigmatism. Stable refraction required (&gt;1 year). <strong>Contraindications: thin cornea (&lt;500μm), keratoconus, dry eye, unstable prescription.</strong> Does not correct presbyopia.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">LASEK / PRK</div><div class="n-diag-content">Surface ablation — no flap. Better for thin corneas, contact sport athletes. Slower recovery, more post-op pain, same visual outcome long-term.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Phakic IOL (ICL)</div><div class="n-diag-content">Implantable contact lens placed in posterior chamber, natural lens left in situ. For high myopia beyond LASIK range. Reversible. Risk: cataract, endothelial cell loss, pupil block glaucoma.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Refractive Lens Exchange</div><div class="n-diag-content">Remove natural lens, replace with multifocal IOL. Corrects presbyopia + refractive error. Eliminates future cataract. Risk of retinal detachment in high myopes. Irreversible.</div></div>
  </div>
  <div class="n-distractor-box"><div class="n-distractor-label">Why LASIK cannot cure presbyopia</div><div class="n-distractor-text">LASIK corrects refractive error by reshaping corneal curvature. <strong>Presbyopia is caused by loss of lens elasticity</strong> — the lens can no longer change shape to accommodate. No corneal reshaping addresses lens stiffness. LASIK patients still need reading glasses after age 45. Monovision LASIK (one eye for near, one for distance) is a workaround, not a cure.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Prescriptions & Clinical Notation</span><span class="n-section-tag">reading a refraction</span></div>
  <div class="n-exam-box"><div class="n-exam-if">Reading the script</div><div class="n-exam-statement">Sphere / Cylinder × Axis. Example: <em>−3.00 / −1.50 × 90</em> = 3D myope with 1.5D of astigmatism, cylinder axis at 90°. Negative sphere = myopia. Positive sphere = hyperopia. Add (+2.50) = presbyopic reading addition.</div></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Anisometropia</div><div class="n-diag-content">Significant difference in refraction between eyes (&gt;2D). Brain suppresses the more blurred image → <strong>anisometropic amblyopia.</strong> Treat with glasses early in childhood. Patching if amblyopia established.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Cycloplegic refraction</div><div class="n-diag-content">In children, accommodation masks hyperopia. <strong>Must paralyse accommodation (cycloplegia) with atropine or cyclopentolate</strong> to get true refraction. Adult refraction without cycloplegia may underestimate hyperopia.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam favourites</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Hyperopia in children → squint → amblyopia.</strong> Never dismiss a childhood squint without refraction. Glasses first, patch second if amblyopia confirmed.<span class="n-pearl-exam">Exam: child with convergent squint — first investigation?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>High myopia (&gt;6D) = annual fundus check.</strong> Lattice degeneration, retinal detachment, myopic maculopathy, glaucoma. The stretched retina is fragile.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Keratoconus = irregular astigmatism in a young person.</strong> Oil-droplet reflex on retinoscopy is pathognomonic. Cross-linking halts progression if cornea is thick enough.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>LASIK contraindicated in keratoconus.</strong> Thinning an already thin cornea accelerates ectasia. Always topographic screening before refractive surgery.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Presbyopia onset is universal and inevitable after 40.</strong> Not a disease — crystalline lens loses elasticity with age. Reading glasses, multifocals, or monovision contact lenses.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Cycloplegic refraction is mandatory in children.</strong> Accommodation masks the true degree of hyperopia. Atropine 1% for 3 days before refraction in young children.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for these</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Patient had LASIK 10 years ago — no need for reading glasses now at 48.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>LASIK does not prevent presbyopia.</strong> Lens inelasticity is inevitable. They still need reading glasses after 45.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">7-year-old with inward squint — refer to orthoptist for eye exercises.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Refraction first.</strong> Most childhood convergent squints are driven by uncorrected hyperopia. Glasses may resolve the squint entirely.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Myopia: long eye, concave lens. Hyperopia: short eye, convex lens.</em><br>High myopia = annual fundus check. Hyperopia in children = squint screen.<br>LASIK reshapes cornea — it cannot fix the lens.</div></div></div>
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Three types of retinal detachment</span><span class="n-viz-sub">Mechanism determines treatment</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="244" height="160" rx="2" fill="#c8452a"/>
      <text x="122" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">MOST COMMON</text>
      <text x="122" y="54" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">Rhegmatogenous</text>
      <text x="122" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Retinal break → fluid entry</text>
      <text x="122" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">PVD + lattice degeneration</text>
      <text x="122" y="110" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Flashes · floaters · curtain</text>
      <text x="122" y="148" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">PPV · scleral buckle · pneumatic</text>
      <rect x="258" y="0" width="244" height="160" rx="2" fill="#2a3a5a"/>
      <text x="380" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">DIABETIC</text>
      <text x="380" y="54" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">Tractional</text>
      <text x="380" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Fibrovascular membranes</text>
      <text x="380" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Pull retina off RPE</text>
      <text x="380" y="110" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">No retinal break · PDR cause</text>
      <text x="380" y="148" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Vitrectomy to remove membranes</text>
      <rect x="516" y="0" width="244" height="160" rx="2" fill="#2a4a2a"/>
      <text x="638" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">SECONDARY</text>
      <text x="638" y="54" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">Exudative</text>
      <text x="638" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Fluid without a break</text>
      <text x="638" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Shifting fluid sign</text>
      <text x="638" y="110" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Tumour · scleritis · VKH</text>
      <text x="638" y="148" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Treat the cause — no surgery</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Flashes. Floaters. Curtain. Tobacco dust.</em><br>Same-day exam. Macula-on = same-day surgery. No exceptions.</div></div></div>
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Retinal vascular occlusions</span><span class="n-viz-sub">Artery vs vein — the key distinction</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="370" height="160" rx="2" fill="#c8452a"/>
      <text x="185" y="28" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">ARTERIAL — ISCHAEMIA</text>
      <text x="185" y="56" font-family="Syne,sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="800">CRAO</text>
      <text x="185" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Pale retina + cherry red spot at fovea</text>
      <text x="185" y="96" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Profound painless monocular VL</text>
      <text x="185" y="112" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">RAPD · attenuated arterioles</text>
      <text x="185" y="145" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Stroke equivalent — carotid · echo · AF workup</text>
      <rect x="390" y="0" width="370" height="160" rx="2" fill="#2a3a5a"/>
      <text x="575" y="28" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">VENOUS — HAEMORRHAGE</text>
      <text x="575" y="56" font-family="Syne,sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="800">CRVO</text>
      <text x="575" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">All 4 quadrant flame haemorrhages</text>
      <text x="575" y="96" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Dilated tortuous veins · disc oedema</text>
      <text x="575" y="112" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.7)" text-anchor="middle">Blood and thunder fundus</text>
      <text x="575" y="145" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">HTN · glaucoma · anti-VEGF for CMO</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Cherry red spot. Thunderstorm fundus. Curtain descending.</em><br>Every vascular occlusion needs an embolic source search today.</div></div></div>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Pain on eye movement. Proptosis. VA loss.</em><br>Not preseptal. Orbital cellulitis until proven otherwise.</div></div></div>
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
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Optic neuropathy — key distinctions</span><span class="n-viz-sub">Age, pain, disc appearance, inflammatory markers</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="244" height="160" rx="2" fill="#2a3a5a"/>
      <text x="122" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">YOUNG ADULT</text>
      <text x="122" y="54" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">Optic Neuritis</text>
      <text x="122" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Pain on eye movement</text>
      <text x="122" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Colour desaturation · RAPD</text>
      <text x="122" y="108" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Normal or swollen disc</text>
      <text x="122" y="148" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">25% → MS · MRI essential</text>
      <rect x="258" y="0" width="244" height="160" rx="2" fill="#3a3a2a"/>
      <text x="380" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">MIDDLE-AGED</text>
      <text x="380" y="54" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">NA-AION</text>
      <text x="380" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Painless on waking</text>
      <text x="380" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Inferior altitudinal VF defect</text>
      <text x="380" y="108" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Hyperaemic swollen disc</text>
      <text x="380" y="148" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">Normal ESR · manage CVS risk</text>
      <rect x="516" y="0" width="244" height="160" rx="2" fill="#c8452a"/>
      <text x="638" y="28" font-family="Syne,sans-serif" font-size="10" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">ELDERLY — EMERGENCY</text>
      <text x="638" y="54" font-family="Syne,sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="800">GCA / AION</text>
      <text x="638" y="76" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Jaw claudication · scalp tender</text>
      <text x="638" y="92" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Pale chalk-white disc</text>
      <text x="638" y="108" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">ESR &gt;50 · CRP elevated</text>
      <text x="638" y="148" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(255,255,255,.38)" text-anchor="middle">IV methylprednisolone NOW</text>
    </svg>
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
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Colour desaturation. RAPD. Pain on movement.</em><br>In the elderly: exclude GCA before anything else.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.opticnerve=[{q:"29-year-old, subacute VL right eye over 3 days, pain on EOM, colour desaturation, RAPD. Normal fundus. Diagnosis?",opts:["Acute angle-closure","Retrobulbar optic neuritis","CRAO","AION"],ans:1,focus:"Optic neuritis — retrobulbar, normal fundus",exp:"Retrobulbar optic neuritis: inflammation behind the globe → normal disc. Subacute painful VL + colour desaturation + RAPD. Classic: 'patient sees nothing, doctor sees nothing.' MRI brain essential — 25% first MS presentation."},{q:"Uhthoff's phenomenon — what and what does it indicate?",opts:["Ischaemic supply instability","Demyelination — heat impairs conduction in demyelinated axons","IOP rise with heat","Corneal oedema from temperature"],ans:1,focus:"Uhthoff's — demyelination",exp:"Uhthoff's: pathognomonic of demyelination. Raised temperature reduces safety factor for conduction in demyelinated axons → transient VA worsening with exercise/heat. Supports MS-related optic neuritis."},{q:"74-year-old, sudden painless monocular VL + jaw pain + scalp tenderness + ESR 112. Most urgent action?",opts:["Biopsy — start steroids after confirmation","Immediate IV methylprednisolone 1g","Oral prednisolone 1mg/kg","CT head before steroids"],ans:1,focus:"GCA — immediate steroids",exp:"GCA causing arteritic AION. IV methylprednisolone 1g immediately. TAB positive for 2 weeks on steroids. Fellow eye 20–40% risk within days if untreated."},{q:"What does RAPD indicate and how is it detected?",opts:["Bilateral optic nerve disease","Unilateral afferent defect — affected pupil paradoxically dilates on swinging torch","CN III damage","Horner — cocaine test"],ans:1,focus:"RAPD — swinging torch",exp:"RAPD: unilateral optic nerve/severe retinal disease reduces afferent input. Affected pupil paradoxically dilates when torch swings to it. Objective, cannot be faked."},{q:"50-year-old, HTN + DM, wakes with inferior altitudinal VF defect + swollen hyperaemic disc. Normal ESR/CRP. Diagnosis?",opts:["Arteritic AION — IV methylprednisolone","Non-arteritic AION — manage vascular risk","Optic neuritis — MRI + steroids","CRVO — anti-VEGF"],ans:1,focus:"Non-arteritic AION",exp:"NA-AION: painless sudden inferior altitudinal VF, swollen hyperaemic disc, vascular risk factors (HTN, DM), normal inflammatory markers. No proven treatment. Manage cardiovascular risk. 15–20% fellow eye involvement."}];

// ── OCULAR TUMOURS ──
NOTES.tumours = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Oncology · Note 17</div>
  <div class="n-hero-title">Ocular<br><em>Tumours</em></div>
  <div class="n-hero-sub">Retinoblastoma · Uveal Melanoma · BCC · Sebaceous Carcinoma · Leukocoria · Choroidal Mets</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Retinoblastoma</div><div class="n-snap-text">Most common intraocular tumour in childhood. Leukocoria or strabismus. <strong>Absent red reflex in a child = same-day referral.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Uveal melanoma</div><div class="n-snap-text">Most common primary intraocular malignancy in adults. Mushroom-shaped on ultrasound. <strong>Metastasises almost exclusively to liver.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Eyelid rule</div><div class="n-snap-text">Madarosis (lash loss) adjacent to a lid lesion = malignancy until proven otherwise. BCC most common eyelid tumour.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Retinoblastoma</span><span class="n-section-tag">leukocoria in a child</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Retinoblastoma genetics — two-hit model</span><span class="n-viz-sub">Knudson's hypothesis</span></div>
    <svg viewBox="0 0 760 155" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="370" height="155" rx="2" fill="#c8452a"/>
      <text x="185" y="28" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.6)" text-anchor="middle" font-weight="700" letter-spacing="2">HEREDITARY — 40%</text>
      <text x="185" y="56" font-family="Syne,sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="800">Germline first hit</text>
      <text x="185" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">Every retinal cell already has one mutation</text>
      <text x="185" y="98" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">Only one somatic hit needed</text>
      <text x="185" y="120" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">Bilateral · Multifocal · Earlier onset</text>
      <text x="185" y="140" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">Risk osteosarcoma · pinealoblastoma</text>
      <rect x="390" y="0" width="370" height="155" rx="2" fill="#2a4a6e"/>
      <text x="575" y="28" font-family="Syne,sans-serif" font-size="11" fill="rgba(255,255,255,.6)" text-anchor="middle" font-weight="700" letter-spacing="2">NON-HEREDITARY — 60%</text>
      <text x="575" y="56" font-family="Syne,sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="800">Two somatic hits</text>
      <text x="575" y="80" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">Both mutations acquired in one cell</text>
      <text x="575" y="98" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">Less likely → later onset</text>
      <text x="575" y="120" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">Unilateral · Unifocal · Later onset</text>
      <text x="575" y="140" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.42)" text-anchor="middle">15% still have germline mutation</text>
    </svg>
  </div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Presentation</div><div class="n-diag-content"><strong>Leukocoria</strong> (white pupil — absent/white red reflex, often spotted in flash photos). Strabismus second most common. Age &lt;5 years. Diagnosis: RetCam examination under anaesthesia, MRI orbit (no CT — radiation risk with germline RB1). Never biopsy — risk of seeding.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Treatment</div><div class="n-diag-content">Goal: save life, then eye, then vision. Focal treatments (laser, cryotherapy, thermotherapy) for small tumours. Intra-arterial chemotherapy (IAC) — selective ophthalmic artery chemotherapy — eye-sparing for advanced tumours. Enucleation for advanced disease. Radiation avoided in germline cases (secondary tumour risk).</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Genetics</div><div class="n-diag-content">RB1 gene — tumour suppressor on chromosome 13q14. All bilateral cases and 15% of apparently unilateral cases have germline mutation → genetic counselling + screening of siblings and offspring. 45% risk of secondary malignancy (osteosarcoma, soft tissue sarcoma) in germline carriers by age 40.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Uveal Melanoma</span><span class="n-section-tag">most common primary intraocular malignancy in adults</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label err">Presentation</div><div class="n-diag-content">Most are asymptomatic — found on routine fundoscopy. Symptomatic: flashes, floaters, visual field loss, reduced VA (exudative retinal detachment). Choroid (90%), ciliary body (6%), iris (4%). <strong>Iris melanoma has a much better prognosis.</strong></div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Diagnosis</div><div class="n-diag-content">Clinical + B-scan ultrasound: <strong>mushroom shape + choroidal excavation + internal low reflectivity</strong> = pathognomonic. Fundus fluorescein angiography. MRI orbit. <strong>Biopsy rarely needed</strong> — ultrasound features are diagnostic. FNAB (fine needle aspiration biopsy) for molecular prognostication (chromosome 3 monosomy = poor prognosis).</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Metastasis</div><div class="n-diag-content"><strong>Metastasises almost exclusively to the liver</strong> (unlike cutaneous melanoma). 50% of patients develop metastases — often years after treatment, due to micrometastatic dormancy. Liver enzymes + LFTs + liver imaging at diagnosis and annually. No adjuvant treatment proven effective yet.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Treatment</div><div class="n-diag-content">Plaque brachytherapy (most common — ruthenium or iodine-125 plaque sutured to sclera). Proton beam radiotherapy for large tumours near optic disc. Enucleation for very large tumours. Treatment does not improve survival — goal is local control and eye preservation.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Eyelid Tumours</span><span class="n-section-tag">madarosis = malignancy</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">BCC — most common</div><div class="n-diag-content">80% of eyelid malignancies. Lower lid medial canthus most common site. Pearly nodule, rolled edges, telangiectasia. <strong>Madarosis (lash loss) at the lesion edge.</strong> Treatment: surgical excision with 5mm margins, Mohs micrographic surgery. Rarely metastasises but locally invasive — can invade orbit.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Sebaceous Carcinoma</div><div class="n-diag-content">Rare but dangerous. Arises from Meibomian glands or glands of Zeis. <strong>Masquerades as chalazion — same-site recurrence = biopsy immediately.</strong> Pagetoid spread (intraepithelial spread to conjunctiva) — can mimic chronic conjunctivitis. High metastatic potential. Wide excision + sentinel node biopsy.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">SCC</div><div class="n-diag-content">Less common than BCC. Associated with actinic keratosis, HPV, immunosuppression. Can metastasise to regional lymph nodes. Excision with clear margins, consider sentinel node biopsy.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Melanoma</div><div class="n-diag-content">1–2% of eyelid malignancies. Lentigo maligna melanoma on sun-damaged skin. Wide excision, sentinel node biopsy, systemic staging.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Choroidal Metastases & Other Tumours</span><span class="n-section-tag">the eye as a window to systemic cancer</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Choroidal Metastases</div><div class="n-diag-content">Most common intraocular malignancy overall (more common than primary uveal melanoma). <strong>Breast cancer most common source (50%)</strong>, then lung. Creamy-white flat lesions (contrast with mushroom shape of melanoma). Often bilateral, multiple. Systemic staging, palliative radiotherapy.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Retinal Haemangioblastoma</div><div class="n-diag-content">Von Hippel-Lindau disease. Orange retinal tumour with dilated feeder vessels. Screen all patients with retinal haemangioblastoma for VHL — cerebellar haemangioblastomas, phaeochromocytoma, renal cell carcinoma.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Iris Melanoma</div><div class="n-diag-content">Pigmented iris lesion with growth on serial photography. <strong>Much better prognosis than choroidal melanoma.</strong> Rarely metastasises. Wide local excision for documented growth.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam favourites</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Absent red reflex in a child = same-day referral.</strong> Retinoblastoma until proven otherwise. Do not reassure parents and ask them to return next week.<span class="n-pearl-exam">Exam: 2-year-old with white pupil noted in photos — management?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Retinoblastoma: never biopsy.</strong> Risk of extraocular seeding and orbital spread. Diagnosis is clinical + ultrasound + MRI. Fine needle aspiration only for molecular prognostication in selected cases.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Uveal melanoma metastasises to the liver.</strong> Unlike cutaneous melanoma which metastasises widely. Annual liver surveillance with LFTs ± ultrasound. Micrometastases can be dormant for years.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Choroidal mets are more common than uveal melanoma.</strong> Flat, creamy-white, bilateral. Think breast (women) or lung (men). Always systemic staging.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>Sebaceous carcinoma masquerades as chalazion.</strong> Same-site recurrence, chronic unilateral "blepharitis" that doesn't respond to treatment, or pagetoid conjunctival spread — biopsy.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Retinal haemangioblastoma = screen for VHL.</strong> Even solitary lesion may indicate germline VHL mutation. MRI brain/spine, abdominal imaging, 24h urinary catecholamines.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for these</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Recurrent chalazion in same location → incision and curettage again.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Biopsy it.</strong> Sebaceous gland carcinoma. High local recurrence rate. Can metastasise. Missing it is indefensible.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Uveal melanoma successfully treated — reassure patient, annual review sufficient.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>50% develop liver metastases,</strong> often years later. Annual LFTs + liver imaging. Micrometastatic dormancy is a real phenomenon.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Retinoblastoma patient — biopsy the mass for tissue diagnosis.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Never biopsy retinoblastoma.</strong> Extraocular seeding converts a potentially curable local tumour into metastatic disease. Diagnosis by imaging + clinical exam.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Leukocoria in a child = retinoblastoma until proven otherwise. Never biopsy.</em><br>Uveal melanoma → liver surveillance. Choroidal mets > primary melanoma in frequency.<br>Madarosis + lid lesion = malignancy. Recurrent chalazion = biopsy.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.tumours=[{q:"2-year-old with absent red reflex and white glow in photographs. Management?",opts:["Reassure — likely artefact","Same-day ophthalmology — exclude retinoblastoma","Optician at 3 months","Review in 2 weeks"],ans:1,focus:"Leukocoria — same-day",exp:"Leukocoria = same-day ophthalmology referral. Retinoblastoma must be excluded urgently. Absent red reflex is never normal."},{q:"Which retinoblastoma type is most likely bilateral?",opts:["Non-hereditary — two somatic hits","Hereditary — germline first hit, one somatic hit needed","X-linked","Mitochondrial"],ans:1,focus:"Hereditary retinoblastoma — bilateral",exp:"Hereditary (40%): germline RB1 → every cell has first hit → only one more hit needed → bilateral, multifocal, earlier onset."},{q:"Pigmented choroidal mass, mushroom shape on B-scan. Standard treatment for medium tumour?",opts:["Photodynamic therapy","Plaque brachytherapy","Intravitreal anti-VEGF","Systemic chemotherapy"],ans:1,focus:"Uveal melanoma — brachytherapy",exp:"Uveal melanoma: mushroom shape (breaks Bruch's membrane), high internal reflectivity. Standard: plaque brachytherapy. All: lifelong liver surveillance — metastases almost exclusively hepatic."},{q:"Lower lid lesion, pearly rolled edge, central ulceration, loss of adjacent lashes. Diagnosis?",opts:["Chalazion — warm compresses","BCC — Mohs surgery","Viral papilloma — reassure","Sebaceous cyst — excise"],ans:1,focus:"BCC — madarosis + pearly edge",exp:"BCC: most common eyelid malignancy. Pearly rolled edge, central ulceration (rodent ulcer), madarosis from follicular infiltration. Mohs micrographic surgery."},{q:"60-year-old, 'chalazion' recurring in same upper lid site after two I&C procedures. Action?",opts:["Third I&C with wider approach","Biopsy — exclude sebaceous gland carcinoma","Oral doxycycline","Allergy testing"],ans:1,focus:"Recurrent chalazion — sebaceous carcinoma",exp:"Sebaceous carcinoma masquerades as recurrent chalazion in same location. Most aggressive eyelid malignancy. Biopsy any chalazion recurring in same spot after adequate treatment."}];

// ── PHARMACOLOGY ──
NOTES.pharmacology = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Pharmacology · Note 18</div>
  <div class="n-hero-title">Ocular<br><em>Pharmacology</em></div>
  <div class="n-hero-sub">Glaucoma drops · Mydriatics · Antibiotics · Anti-VEGF · Steroids · Systemic dangers</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Glaucoma drops</div><div class="n-snap-text">Reduce IOP by decreasing aqueous production (beta-blockers, CAIs, alpha-2 agonists) or increasing drainage (prostaglandins, miotics). <strong>Absorbed systemically via nasolacrimal duct — systemic side effects are real.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Steroids rule</div><div class="n-snap-text"><strong>Never give topical steroids to undiagnosed red eye.</strong> HSV keratitis reactivation → corneal perforation. IOP rise in steroid responders. Posterior subcapsular cataract.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Anti-VEGF</div><div class="n-snap-text">Intravitreal injection. Ranibizumab, bevacizumab, aflibercept. First-line for wet AMD, DMO, RVO. Monthly dosing or treat-and-extend.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Glaucoma Drops — Mechanisms & Hazards</span><span class="n-section-tag">mechanism predicts side effect</span></div>
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">IOP-lowering mechanisms</span><span class="n-viz-sub">Reduce production vs increase drainage</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="182" height="160" rx="2" fill="#c8452a"/>
      <text x="91" y="28" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">PROSTAGLANDINS</text>
      <text x="91" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">First-line</text>
      <text x="91" y="74" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">↑ Uveoscleral drainage</text>
      <text x="91" y="92" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">Latanoprost · bimatoprost</text>
      <text x="91" y="118" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">SE: iris darkening</text>
      <text x="91" y="136" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">lash growth · periorbital fat loss</text>
      <rect x="193" y="0" width="182" height="160" rx="2" fill="#2a4a6e"/>
      <text x="284" y="28" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">BETA-BLOCKERS</text>
      <text x="284" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Timolol</text>
      <text x="284" y="74" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">↓ Aqueous production</text>
      <text x="284" y="92" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">β2 on ciliary epithelium</text>
      <text x="284" y="118" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">CI: asthma · COPD</text>
      <text x="284" y="136" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">heart block · bradycardia</text>
      <rect x="386" y="0" width="182" height="160" rx="2" fill="#3a4e2a"/>
      <text x="477" y="28" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">ALPHA-2 AGONISTS</text>
      <text x="477" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Brimonidine</text>
      <text x="477" y="74" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">↓ Production + ↑ drainage</text>
      <text x="477" y="92" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">Dual mechanism</text>
      <text x="477" y="118" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">CI: infants (apnoea)</text>
      <text x="477" y="136" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">allergy common (20%)</text>
      <rect x="579" y="0" width="181" height="160" rx="2" fill="#4e3a2a"/>
      <text x="669" y="28" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="2">CAIs</text>
      <text x="669" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Dorzolamide</text>
      <text x="669" y="74" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">↓ Aqueous (bicarbonate)</text>
      <text x="669" y="92" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.75)" text-anchor="middle">Topical or oral (acetazolamide)</text>
      <text x="669" y="118" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">CI: sulfa allergy</text>
      <text x="669" y="136" font-family="JetBrains Mono,monospace" font-size="9" fill="rgba(255,255,255,.38)" text-anchor="middle">Oral: renal stones · paraesthesia</text>
    </svg>
  </div>
  <div class="n-distractor-box"><div class="n-distractor-label">Systemic absorption via the nasolacrimal duct</div><div class="n-distractor-text">Eye drops drain via the nasolacrimal duct into the nasal mucosa, where they are absorbed directly into the systemic circulation — bypassing first-pass hepatic metabolism. A single timolol eye drop delivers a significant systemic beta-blockade. <strong>Nasolacrimal occlusion (press on medial canthus for 2 minutes after instillation) reduces systemic absorption by up to 70%.</strong> Always ask about eye drops when taking a systemic drug history.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Mydriatics & Cycloplegics</span><span class="n-section-tag">dilate and paralyse</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Tropicamide</div><div class="n-diag-content">Short-acting anticholinergic. Pupil dilation for fundoscopy. Duration 4–6 hours. <strong>Risk of precipitating acute angle-closure</strong> in anatomically narrow angles — always check anterior chamber depth before dilating.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Cyclopentolate</div><div class="n-diag-content">Anticholinergic. <strong>Cycloplegia + mydriasis.</strong> Used for cycloplegic refraction (mandatory in children) and uveitis (prevents posterior synechiae). Duration 24 hours. Systemic: tachycardia, flushing, confusion in children.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Atropine</div><div class="n-diag-content">Longest-acting cycloplegic — 1–2 weeks. Used for: children's cycloplegic refraction (most accurate), amblyopia penalisation (blur good eye to force use of lazy eye), myopia control (0.01%). Systemic toxicity: "mad as a hatter, blind as a bat, dry as a bone, red as a beet."</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Phenylephrine</div><div class="n-diag-content">Sympathomimetic — pupil dilation without cycloplegia. Used with tropicamide for fundoscopy in older patients (better dilation). <strong>Risk: hypertensive crisis in patients on MAOIs.</strong> 2.5% (not 10%) in patients with cardiovascular disease.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Topical Antibiotics & Antivirals</span><span class="n-section-tag">right drug for right pathogen</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Chloramphenicol</div><div class="n-diag-content">Broad-spectrum, first-line for bacterial conjunctivitis and minor corneal infections. Theoretical aplastic anaemia risk (1 in 200,000) — very rare but real. Avoid in neonates.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Aciclovir</div><div class="n-diag-content">Topical 3% ointment for HSV epithelial keratitis (dendritic ulcer). <strong>Never use topical steroids for undiagnosed red eye — if it is HSV, steroids cause rapid progression to stromal disease and perforation.</strong> Oral aciclovir/valaciclovir for prophylaxis of recurrent HSV keratitis.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Ganciclovir</div><div class="n-diag-content">CMV retinitis in immunocompromised. Intravitreal or IV for active disease. Oral valganciclovir for maintenance and prophylaxis (HIV patients with CD4 rising on ART).</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Natamycin/Voriconazole</div><div class="n-diag-content">Fungal keratitis — contact lens wearers, agricultural trauma, immunocompromised. <strong>Diagnose by corneal scraping and culture.</strong> Treatment prolonged (weeks–months). Penetrating keratoplasty for refractory cases.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Anti-VEGF & Intravitreal Therapy</span><span class="n-section-tag">the revolution in retinal medicine</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Agents</div><div class="n-diag-content"><strong>Ranibizumab (Lucentis)</strong> — licensed fragment. <strong>Bevacizumab (Avastin)</strong> — unlicensed but widely used, much cheaper, equivalent evidence. <strong>Aflibercept (Eylea)</strong> — VEGF trap, extended dosing interval. <strong>Faricimab (Vabysmo)</strong> — dual angiopoietin-2 + VEGF inhibitor, 4-monthly dosing possible.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Indications</div><div class="n-diag-content">Wet AMD (first-line), diabetic macular oedema (DMO), branch and central retinal vein occlusion (BRVO/CRVO), myopic CNV, proliferative DR (adjunct to laser). Monthly loading doses then treat-and-extend or PRN.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Risks of intravitreal injection</div><div class="n-diag-content">Endophthalmitis (0.03–0.05% per injection), traumatic cataract, retinal detachment, vitreous haemorrhage, subconjunctival haemorrhage (common, benign), IOP spike. Systemic: theoretical thromboembolic risk with repeated injections — discuss in high-risk patients.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Corticosteroids — Indications & Dangers</span><span class="n-section-tag">powerful but hazardous</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Topical steroids</div><div class="n-diag-content">Anterior uveitis, allergic conjunctivitis (severe), post-operative inflammation. <strong>Three dangers: (1) HSV reactivation → perforation. (2) Steroid-responder glaucoma (IOP rise in 30% of population). (3) Posterior subcapsular cataract</strong> with chronic use. Never prescribe for undiagnosed red eye.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Intravitreal steroids</div><div class="n-diag-content">Triamcinolone, dexamethasone implant (Ozurdex), fluocinolone implant (Iluvien). CMO from uveitis, CRVO, pseudophakic CMO. Sustained release. Risks: glaucoma and cataract much higher than anti-VEGF — use in pseudophakic or high-risk patients.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Systemic steroids</div><div class="n-diag-content">Giant cell arteritis (GCA) — <strong>start immediately on clinical suspicion</strong>, before biopsy result (IV methylprednisolone if vision already lost). Posterior uveitis. Optic neuritis (shortens episode but doesn't improve final VA). Monitor BP, glucose, bone density.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam favourites</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Timolol eye drops in a patient with asthma = bronchospasm.</strong> Absorbed systemically via NLD. Beta-2 blockade. Always take a drug history that includes eye drops.<span class="n-pearl-exam">Exam: patient develops bronchospasm — which eye drop might be responsible?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Prostaglandin analogues = first-line for open-angle glaucoma.</strong> Once-daily, best IOP reduction. Side effects: iris colour change (heterochromia), lash growth (hypertrichosis), periorbital fat atrophy.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Brimonidine is contraindicated in infants.</strong> CNS penetration → apnoea. Never use in children under 2 years. This is a classic exam trap.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Topical steroids + HSV keratitis = corneal perforation.</strong> Fluorescein stain any undiagnosed red eye before steroids. Dendritic ulcer = aciclovir, not steroid.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">05</div><div class="n-pearl-body"><strong>GCA = start steroids immediately.</strong> Do not wait for temporal artery biopsy result — the fellow eye may lose vision within hours. The biopsy remains positive for 2 weeks after starting steroids.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">06</div><div class="n-pearl-body"><strong>Nasolacrimal occlusion reduces systemic absorption of eye drops by 70%.</strong> Press medial canthus for 2 minutes after instillation. Important for timolol, brimonidine, latanoprost.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">07</div><div class="n-pearl-body"><strong>Anti-VEGF injection risks: endophthalmitis, RD, cataract.</strong> Rate is low per injection (~0.05% endophthalmitis) but patients receive many injections over years. Absolute sterility is mandatory.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">07</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for these</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Eye drops are topical — no systemic effects to worry about.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Significant systemic absorption via NLD.</strong> Timolol causes bradycardia, bronchospasm. Brimonidine causes apnoea in infants. Always take an eye drop history.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Undiagnosed red eye in GP → topical steroid to reduce inflammation while awaiting referral.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Never give topical steroids for undiagnosed red eye.</strong> If HSV keratitis, you will perforate the cornea. Refer instead.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Temporal arteritis — await biopsy before starting steroids.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Start steroids immediately on clinical suspicion.</strong> Biopsy remains positive for 2 weeks on steroids. Vision loss in the fellow eye is imminent.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Eye drops have systemic effects — always take a drop history.</em><br>Prostaglandins first-line. Timolol CI: asthma. Brimonidine CI: infants.<br>Never steroids for undiagnosed red eye. GCA: treat before biopsy.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;
NOTES_MCQ.pharmacology=[{q:"Asthmatic POAG patient prescribed timolol develops worsening wheeze. Mechanism?",opts:["Preservative allergy","Systemic beta-2 blockade via nasolacrimal absorption → bronchospasm","Coincidental COPD","Drop technique"],ans:1,focus:"Timolol — systemic absorption, asthma CI",exp:"Timolol absorbed via NLD → nasal mucosa → systemic circulation, bypassing first-pass. Beta-2 blockade causes bronchospasm. Contraindicated in asthma/COPD. Switch to prostaglandin analogue."},{q:"First-line glaucoma drop and its mechanism?",opts:["Timolol — reduce aqueous production","Prostaglandin analogue (latanoprost) — increase uveoscleral outflow","Dorzolamide — inhibit carbonic anhydrase","Brimonidine — alpha-2 agonist"],ans:1,focus:"Prostaglandins — first-line",exp:"Prostaglandin analogues (latanoprost): most effective single agent, 25–35% IOP reduction. FP receptor → uveoscleral outflow. Once-daily evening. No respiratory/cardiac CI."},{q:"GP prescribes topical dexamethasone for red eye. Patient returns 2 weeks later with corneal dendrites and worsening vision. What happened?",opts:["Steroid-induced glaucoma","HSV keratitis reactivated by steroid immunosuppression","Allergic reaction to preservative","Bacterial superinfection"],ans:1,focus:"Steroids + HSV = disaster",exp:"Topical steroids reactivate HSV → dendritic (or geographic) ulcer. Can lead to corneal perforation. Never prescribe steroids for undiagnosed red eye. Slit lamp + fluorescein first. Treatment: stop steroid, topical aciclovir."},{q:"Which drug is contraindicated in infants due to apnoea risk?",opts:["Latanoprost","Timolol","Brimonidine (alpha-2 agonist)","Dorzolamide"],ans:2,focus:"Brimonidine — CI in infants",exp:"Brimonidine (alpha-2 agonist) causes CNS depression and apnoea in infants and young children. Absolute contraindication. Used in adults for glaucoma (reduces production + increases uveoscleral drainage)."},{q:"A patient with wet AMD is offered intravitreal injections. Which drug class and key complication?",opts:["Intravitreal steroids — cataract","Anti-VEGF (ranibizumab/aflibercept) — endophthalmitis","Topical CAI — metallic taste","Alpha-2 agonist — allergy"],ans:1,focus:"Anti-VEGF for wet AMD",exp:"Anti-VEGF (ranibizumab, bevacizumab, aflibercept) for wet AMD, DMO, CRVO. Intravitreal injection. Key SE: endophthalmitis (rare but serious), RPE tear, subconjunctival haemorrhage. Dry AMD: no proven treatment (AREDS supplements only)."}];

// ── AMD ──
NOTES.amd = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Retinal Disease · Note 12</div>
  <div class="n-hero-title">Age-Related Macular<br><em>Degeneration</em></div>
  <div class="n-hero-sub">Dry AMD · Wet AMD · Geographic Atrophy · Leading cause of blindness in the over-50s</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The distinction that matters</div><div class="n-snap-text">Dry AMD = slow photoreceptor loss from drusen and RPE atrophy. Wet AMD = choroidal neovascularisation — leaks, scars, destroys central vision rapidly. <strong>Wet = treatable. Dry = not.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Where it hits</div><div class="n-snap-text">AMD destroys the macula — the central 5° of vision. Peripheral vision is preserved. Patients lose reading, faces, fine detail — but never go completely blind from AMD alone.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Risk factors</div><div class="n-snap-text">Age (strongest), smoking (strongest modifiable), family history, female sex, cardiovascular risk factors. Smoking doubles the risk. <strong>Stopping smoking is the single most impactful intervention.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">The macular anatomy — from drusen to CNV</span><span class="n-viz-sub">Where AMD begins and how it progresses</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="146" height="160" rx="2" fill="#1a2a3a"/>
      <text x="73" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">NORMAL</text>
      <text x="73" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Macula</text>
      <text x="73" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">RPE intact</text>
      <text x="73" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Bruch's membrane healthy</text>
      <text x="73" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Highest cone density</text>
      <rect x="157" y="0" width="146" height="160" rx="2" fill="#3a4a2a"/>
      <text x="230" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">EARLY DRY</text>
      <text x="230" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Drusen</text>
      <text x="230" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Hard = small, benign</text>
      <text x="230" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Soft = confluent, high risk</text>
      <text x="230" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">AREDS2 if intermediate</text>
      <rect x="314" y="0" width="146" height="160" rx="2" fill="#5a4a2a"/>
      <text x="387" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">ADVANCED DRY</text>
      <text x="387" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Geo Atrophy</text>
      <text x="387" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">RPE cell death</text>
      <text x="387" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Bare Bruch's membrane</text>
      <text x="387" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Slow scotoma · no tx</text>
      <rect x="471" y="0" width="146" height="160" rx="2" fill="#8a3a1a"/>
      <text x="544" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">WET CONVERSION</text>
      <text x="544" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">CNV</text>
      <text x="544" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Choroidal new vessels</text>
      <text x="544" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Leaky → fluid + bleed</text>
      <text x="544" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Metamorphopsia · anti-VEGF</text>
      <rect x="628" y="0" width="132" height="160" rx="2" fill="#c8452a"/>
      <text x="694" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">UNTREATED</text>
      <text x="694" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Disciform</text>
      <text x="694" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Fibrovascular scar</text>
      <text x="694" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Permanent central scotoma</text>
      <text x="694" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Irreversible — no recovery</text>
    </svg>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Dry vs Wet AMD — The Core Distinction</span><span class="n-section-tag">mechanism drives management</span></div>
  <div class="n-diff-grid">
    <div class="n-diff-card this">
      <div class="n-diff-card-tag">Slow — 90% of cases</div>
      <div class="n-diff-card-name">Dry AMD</div>
      <div class="n-diff-card-key">Drusen accumulation → RPE dysfunction → photoreceptor loss. <strong>Gradual central vision loss over years.</strong> No leakage. No treatment reverses it.</div>
      <div class="n-diag-steps" style="margin-top:16px;">
        <div class="n-diag-row"><div class="n-diag-label">Fundoscopy</div><div class="n-diag-content">Drusen (yellow deposits under RPE), RPE pigmentary changes, geographic atrophy</div></div>
        <div class="n-diag-row"><div class="n-diag-label gold">Tx</div><div class="n-diag-content">No proven treatment. AREDS2 supplements (ACSF + zinc) slow progression in intermediate AMD. Low vision aids. Stop smoking.</div></div>
        <div class="n-diag-row"><div class="n-diag-label err">Risk</div><div class="n-diag-content">10–15% convert to wet AMD. Patients should monitor with Amsler grid and report new metamorphopsia immediately.</div></div>
      </div>
    </div>
    <div class="n-diff-card that">
      <div class="n-diff-card-tag">Fast — 10% of cases, 90% of severe loss</div>
      <div class="n-diff-card-name">Wet AMD (nAMD)</div>
      <div class="n-diff-card-key">Choroidal neovascularisation (CNV) → subretinal fluid + haemorrhage → rapid central vision loss. <strong>Treatable with anti-VEGF.</strong> Time-critical.</div>
      <div class="n-diag-steps" style="margin-top:16px;">
        <div class="n-diag-row"><div class="n-diag-label">Symptoms</div><div class="n-diag-content">Rapid central visual loss, metamorphopsia (distortion), central scotoma. New-onset distortion = wet AMD until proven otherwise.</div></div>
        <div class="n-diag-row"><div class="n-diag-label gold">Tx</div><div class="n-diag-content"><strong>Intravitreal anti-VEGF</strong> (ranibizumab, aflibercept, bevacizumab). Monthly injections initially, then as-needed. Preserves — and can improve — vision if started promptly.</div></div>
        <div class="n-diag-row"><div class="n-diag-label err">Urgency</div><div class="n-diag-content">Refer to medical retina within <strong>1 week</strong> of symptom onset. Every week of delay = permanent photoreceptor loss.</div></div>
      </div>
    </div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Mechanism — From Drusen to Blindness</span><span class="n-section-tag">5 steps</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Drusen formation — the earliest sign</div><div class="n-mech-text">Lipid-protein deposits accumulate beneath the RPE (Bruch's membrane). <strong>Hard drusen</strong>: small, discrete, benign. <strong>Soft drusen</strong>: larger, confluent — high risk of progression. Soft drusen = the warning sign on screening.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">RPE dysfunction — complement-driven inflammation</div><div class="n-mech-text">Drusen trigger complement activation and chronic low-grade inflammation → RPE cell dysfunction and death. The CFH gene (complement factor H) is the strongest genetic risk factor — variants impair complement regulation at the RPE.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Geographic atrophy — end-stage dry AMD</div><div class="n-mech-text">Progressive RPE cell death leaves areas of bare Bruch's membrane with overlying photoreceptor loss. <strong>Geographic atrophy</strong>: well-demarcated areas of RPE and photoreceptor loss. Gradual central scotoma. Currently no approved treatment, though emerging complement inhibitors show promise.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Choroidal neovascularisation — the wet switch</div><div class="n-mech-text">RPE dysfunction upregulates VEGF → new vessels grow from choroid through Bruch's membrane into subretinal space. These vessels are <strong>leaky and fragile</strong> → subretinal fluid, haemorrhage, lipid exudation. This is wet AMD — the conversion that causes rapid vision loss.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d5">05</div><div class="n-mech-body"><div class="n-mech-cause">Disciform scar — untreated end point</div><div class="n-mech-text">Untreated CNV → fibrovascular scarring under the fovea → <strong>dense central scotoma.</strong> Anti-VEGF prevents this. The scar, once formed, cannot be reversed — which is why speed of treatment is everything in wet AMD.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Investigation</span><span class="n-section-tag">OCT is the key</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">OCT</div><div class="n-diag-content"><strong>Gold standard.</strong> Shows subretinal fluid, intraretinal fluid, CNV membrane, drusen, RPE elevation. Guides anti-VEGF treatment decisions. Non-invasive.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Amsler Grid</div><div class="n-diag-content">Home monitoring tool. Metamorphopsia (wavy lines) = wet conversion. Patients with dry AMD should check weekly. New distortion = urgent same-week review.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">FFA / ICGA</div><div class="n-diag-content">Fluorescein/indocyanine green angiography characterises CNV type. Less used now OCT-A (angiography) available non-invasively.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Visual Acuity</div><div class="n-diag-content">Central vision loss. Snellen — but early AMD may have preserved VA despite significant structural change on OCT. Do not use VA alone to assess severity.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Elderly patient + sudden central visual distortion (metamorphopsia) + straight lines appear wavy → <em>wet AMD until proven otherwise</em> → urgent same-week referral to medical retina for OCT and anti-VEGF.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The distractor</div><div class="n-distractor-text">Patients often present late because they've been covering one eye without realising. <strong>Always test each eye separately in elderly patients with visual complaints.</strong> Bilateral AMD is common — the better eye masks the worse one.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Metamorphopsia (distortion) = wet AMD until proven otherwise.</strong> Blurred vision is non-specific. Distortion — straight lines appearing wavy or bent — is the hallmark of subretinal fluid from CNV.<span class="n-pearl-exam">Exam classic: elderly patient, sudden onset, wavy lines on Amsler grid.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Dry AMD never causes sudden vision loss.</strong> Any sudden or rapid deterioration in a known dry AMD patient = wet conversion. Urgent OCT required.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Anti-VEGF preserves, not restores.</strong> The goal of treatment is to prevent further loss. Some patients gain vision with early treatment, but established photoreceptor loss is permanent. Start early.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>AMD never causes complete blindness alone</strong> — peripheral vision is preserved. Patients lose central vision (reading, faces) but retain navigational vision.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Dry AMD is harmless — no action needed beyond annual review.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Dry AMD converts to wet in 10–15% of cases.</strong> Patients need Amsler grid home monitoring and clear instructions to present immediately with new distortion. Intermediate dry AMD warrants AREDS2 supplements.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Anti-VEGF cures wet AMD — once vision is stable, treatment can stop permanently.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Anti-VEGF controls wet AMD — it does not cure it.</strong> Most patients require ongoing injections (treat-and-extend or PRN protocols). Stopping completely risks reactivation and vision loss.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Distortion means wet. Wet means urgent.</em><br>Anti-VEGF preserves vision. But only if started before the scar forms.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;

NOTES_MCQ.amd = [
  {q:"An 72-year-old woman notices straight lines appearing wavy when reading. VA is 6/12. What is the most likely diagnosis and next step?",opts:["Dry AMD — annual review","Wet AMD — urgent same-week referral for OCT and anti-VEGF","Macular hole — elective vitrectomy","Central serous retinopathy — observe"],ans:1,focus:"Wet AMD — metamorphopsia = urgent",exp:"<strong>Metamorphopsia (wavy distortion) = wet AMD until proven otherwise.</strong> New subretinal fluid from CNV distorts the photoreceptors. Requires urgent referral for OCT and anti-VEGF within 1 week. Every week of delay risks permanent central scotoma from disciform scarring."},
  {q:"Which AMD finding on fundoscopy carries the highest risk of progression to wet AMD?",opts:["Hard drusen","Soft confluent drusen","RPE hyperpigmentation alone","Normal fundus in patient over 70"],ans:1,focus:"Soft drusen — high-risk feature",exp:"<strong>Soft confluent drusen</strong> are large, poorly defined deposits with indistinct edges that may coalesce. They indicate significant RPE dysfunction and carry the highest risk of wet conversion. Hard drusen (small, discrete) are low risk."},
  {q:"First-line treatment for wet AMD (neovascular AMD) is:",opts:["Photodynamic therapy","Pan-retinal photocoagulation","Intravitreal anti-VEGF (ranibizumab/aflibercept)","AREDS2 supplements"],ans:2,focus:"Wet AMD — anti-VEGF first-line",exp:"<strong>Intravitreal anti-VEGF</strong> (ranibizumab, aflibercept, bevacizumab) is first-line for wet AMD. Anti-VEGF blocks the VEGF driving CNV growth and leakage. PDT is now second-line. AREDS2 supplements are for dry AMD only."},
  {q:"AREDS2 supplements are indicated for which stage of AMD?",opts:["Early dry AMD (small drusen only)","Intermediate or advanced dry AMD","All stages of AMD","Wet AMD post-anti-VEGF"],ans:1,focus:"AREDS2 — intermediate dry AMD",exp:"<strong>AREDS2 supplements</strong> (vitamins C, E, lutein, zeaxanthin, zinc) slow progression in <strong>intermediate AMD</strong> (medium drusen or one large drusen) or advanced AMD in one eye. They have no proven benefit in early AMD or wet AMD."},
  {q:"A patient with known dry AMD suddenly loses central vision acutely over 48 hours. What has occurred?",opts:["Geographic atrophy — expected progression","Wet AMD conversion — urgent OCT and anti-VEGF","Vitreous haemorrhage — B-scan USS","Central retinal artery occlusion — emergency"],ans:1,focus:"Acute loss in dry AMD = wet conversion",exp:"<strong>Dry AMD causes gradual, slow central vision loss.</strong> Any sudden or rapid deterioration = wet AMD conversion until proven otherwise. Urgent OCT to confirm subretinal fluid/CNV and same-week anti-VEGF injection. Do not reassure and observe."}
];

// ── RED EYE ──
NOTES.redeye = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Clinical · Note 14</div>
  <div class="n-hero-title">The Red<br><em>Eye</em></div>
  <div class="n-hero-sub">Conjunctivitis · Uveitis · Acute Angle-Closure · Scleritis · Episcleritis · Subconjunctival Haemorrhage</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The one question</div><div class="n-snap-text">Is the vision affected? Normal VA + no photophobia + no corneal changes = likely benign (conjunctivitis, episcleritis, subconjunctival haemorrhage). <strong>Reduced VA or severe pain = refer urgently.</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The dangerous red eye</div><div class="n-snap-text">Acute angle-closure glaucoma: red + painful + fixed mid-dilated pupil + haloes + vomiting. IOP &gt;50mmHg. Emergency. <strong>Lower IOP immediately:</strong> IV acetazolamide (cuts aqueous production), pilocarpine (opens angle), IV mannitol (osmotic shrinkage). Then laser iridotomy.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Ciliary flush</div><div class="n-snap-text">Circumlimbal redness (deepest at the limbus) = intraocular pathology — uveitis, angle-closure, keratitis. Peripheral redness = conjunctivitis. <strong>Where the redness is tells you where the problem is.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Red eye — location of redness tells you where the problem is</span><span class="n-viz-sub">The single most useful clinical rule</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="148" height="160" rx="2" fill="#1a3a2a"/>
      <text x="74" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">PERIPHERAL</text>
      <text x="74" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Conjunctivitis</text>
      <text x="74" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Diffuse peripheral redness</text>
      <text x="74" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Normal VA · normal pupil</text>
      <text x="74" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Chloramphenicol if bacterial</text>
      <rect x="159" y="0" width="148" height="160" rx="2" fill="#2a3a5a"/>
      <text x="233" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">SECTORAL</text>
      <text x="233" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Episcleritis</text>
      <text x="233" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Blanches w/ phenylephrine</text>
      <text x="233" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Mild discomfort · normal VA</text>
      <text x="233" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">IBD · RA · SLE · NSAIDs</text>
      <rect x="318" y="0" width="148" height="160" rx="2" fill="#5a2a3a"/>
      <text x="392" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">CIRCUMLIMBAL</text>
      <text x="392" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Ciliary Flush</text>
      <text x="392" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Deepest at limbus</text>
      <text x="392" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Uveitis · keratitis · glaucoma</text>
      <text x="392" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Check pupil + VA → refer</text>
      <rect x="477" y="0" width="148" height="160" rx="2" fill="#1a2a5a"/>
      <text x="551" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">SMALL PUPIL</text>
      <text x="551" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Uveitis</text>
      <text x="551" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Irregular · synechiae · KPs</text>
      <text x="551" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Photophobia · reduced VA</text>
      <text x="551" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Steroids + cycloplegics</text>
      <rect x="636" y="0" width="124" height="160" rx="2" fill="#c8452a"/>
      <text x="698" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">MID-DILATED</text>
      <text x="698" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Angle-Closure</text>
      <text x="698" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Fixed oval · IOP &gt;50</text>
      <text x="698" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Pain · N&amp;V · haloes</text>
      <text x="698" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Emergency — acetazolamide</text>
    </svg>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Diagnosis by Pattern</span><span class="n-section-tag">the key features</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Conjunctivitis</div><div class="n-diag-content">Bilateral, discharge (purulent = bacterial, watery = viral), gritty sensation, normal VA, normal pupil, no photophobia. Peripheral redness. Self-limiting. Chloramphenicol if bacterial.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">Episcleritis</div><div class="n-diag-content">Sectoral redness, mild discomfort, normal VA, normal IOP, blanches with phenylephrine. Benign. Associated with IBD, RA, SLE. Lubricants ± topical NSAIDs.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Scleritis</div><div class="n-diag-content"><strong>Severe boring pain</strong>, photophobia, does not blanch with phenylephrine, deep red/purple hue, tender on palpation. Associated with RA, GPA. Systemic NSAIDs. Posterior scleritis can be painless — USS shows T-sign.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Anterior Uveitis</div><div class="n-diag-content">Ciliary flush, photophobia, <strong>small irregular pupil</strong> (posterior synechiae), keratic precipitates on corneal endothelium, reduced VA. Associated with HLA-B27, sarcoidosis, TB. Topical steroids + cycloplegics.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Acute Angle-Closure</div><div class="n-diag-content"><strong>Fixed mid-dilated oval pupil</strong>, corneal haze, severe pain, nausea/vomiting, haloes around lights. IOP >50mmHg. Emergency: IV acetazolamide 500mg, pilocarpine 2%, IV mannitol, laser iridotomy.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Subconjunctival Haem.</div><div class="n-diag-content">Bright red patch, sharply demarcated, asymptomatic, normal VA. Alarming appearance, benign cause (Valsalva, coughing, hypertension). No treatment. Resolves in 2 weeks. Check BP if recurrent.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Keratitis</div><div class="n-diag-content">Ciliary flush, photophobia, foreign body sensation, corneal opacity/ulcer on slit-lamp. Contact lens wearers: <em>Acanthamoeba/Pseudomonas</em>. Urgent: stop lenses, corneal scrape, intensive topical antibiotics.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">The Dangerous Red Eye — Angle-Closure</span><span class="n-section-tag">emergency protocol</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Sudden painful red eye + fixed mid-dilated pupil + corneal haze + nausea/vomiting + haloes around lights → <em>acute angle-closure glaucoma</em> → emergency treatment immediately.</div></div>
  <div class="n-algo-steps">
    <div class="n-algo-step s-first"><div class="n-algo-num">01</div><div class="n-algo-body"><div class="n-algo-action">IV acetazolamide 500mg</div><div class="n-algo-detail">Carbonic anhydrase inhibitor — reduces aqueous production rapidly</div></div></div>
    <div class="n-algo-step"><div class="n-algo-num">02</div><div class="n-algo-body"><div class="n-algo-action">Pilocarpine 2% topical</div><div class="n-algo-detail">Constricts pupil — opens angle. Give to both eyes (prophylactic to fellow eye)</div></div></div>
    <div class="n-algo-step"><div class="n-algo-num">03</div><div class="n-algo-body"><div class="n-algo-action">IV mannitol if IOP remains high</div><div class="n-algo-detail">Osmotic agent — reduces vitreous volume</div></div></div>
    <div class="n-algo-step s-severe"><div class="n-algo-num">04</div><div class="n-algo-body"><div class="n-algo-action">Laser peripheral iridotomy</div><div class="n-algo-detail">Definitive treatment — creates drainage bypass. Also treat fellow eye prophylactically</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Pupil as Diagnostic Tool</span><span class="n-section-tag">look at the pupil first</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label">Small, irregular</div><div class="n-diag-content">Anterior uveitis — posterior synechiae bind iris to lens. Photophobia prominent.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Fixed, mid-dilated</div><div class="n-diag-content">Acute angle-closure glaucoma — sphincter ischaemia from raised IOP. Emergency.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Normal, reactive</div><div class="n-diag-content">Conjunctivitis, episcleritis, subconjunctival haemorrhage — external/benign pathology.</div></div>
    <div class="n-diag-row"><div class="n-diag-label gold">RAPD present</div><div class="n-diag-content">Optic nerve or retinal pathology — CRAO, optic neuritis, severe glaucoma. Urgent referral.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Episcleritis blanches with phenylephrine. Scleritis does not.</strong> This is the clinical test that distinguishes them. Scleritis has deep, boring pain and is associated with systemic vasculitis.<span class="n-pearl-exam">Exam: sectoral redness — is it epi or sclera? Blanching = episcleritis.</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>Contact lens + red eye = Acanthamoeba/Pseudomonas until proven otherwise.</strong> Stop lenses immediately. Corneal scrape for culture. Intensive topical treatment. Never prescribe steroids to a contact lens wearer with keratitis.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>Subconjunctival haemorrhage looks alarming but is benign.</strong> Patients are terrified. Reassure. Check BP. No treatment needed. However — recurrent SCH = check coagulation and anticoagulant use.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Angle-closure is classically triggered by dim light or mydriatic drops.</strong> Pupil dilation narrows the angle. Warn patients with shallow anterior chambers (hyperopes, Asians, elderly) before dilating.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Red eye + discharge = conjunctivitis. Prescribe chloramphenicol.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Always check VA and pupil before diagnosing conjunctivitis.</strong> Reduced VA, abnormal pupil, ciliary flush, or severe pain = refer urgently. Uveitis and keratitis can present with discharge.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Patient has red eye with nausea and vomiting — likely gastroenteritis.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Nausea and vomiting with red eye = acute angle-closure glaucoma until proven otherwise.</strong> The GI symptoms are from vagal stimulation by severe pain and acutely raised IOP. Always examine the eye.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>Where is the redness? What is the pupil doing? Is the vision affected?</em><br>Three questions. They give you the diagnosis.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;

NOTES_MCQ.redeye = [
  {q:"A 68-year-old presents with a sudden painful red eye, haloes around lights, nausea, and vomiting. On examination the pupil is fixed and mid-dilated. IOP is 58mmHg. Diagnosis?",opts:["Anterior uveitis — topical steroids","Acute angle-closure glaucoma — emergency treatment","Conjunctivitis — chloramphenicol","Scleritis — oral NSAIDs"],ans:1,focus:"Acute angle-closure — fixed mid-dilated pupil",exp:"<strong>Acute angle-closure glaucoma:</strong> sudden painful red eye + fixed mid-dilated oval pupil + corneal haze + nausea/vomiting + IOP >40mmHg. Emergency: IV acetazolamide 500mg, topical pilocarpine 2%, IV mannitol, urgent laser iridotomy."},
  {q:"A patient has a sectoral red eye with mild discomfort. The redness blanches completely with topical phenylephrine. Diagnosis?",opts:["Scleritis — oral NSAIDs urgently","Episcleritis — lubricants ± topical NSAIDs","Anterior uveitis — topical steroids","Conjunctivitis — chloramphenicol"],ans:1,focus:"Episcleritis — blanches with phenylephrine",exp:"<strong>Episcleritis blanches with phenylephrine.</strong> Scleritis does not — it has deep, boring pain, does not blanch, and is associated with systemic vasculitis. Episcleritis is benign, associated with IBD/RA/SLE, treated with lubricants and topical NSAIDs."},
  {q:"A contact lens wearer presents with a painful red eye and photophobia. Slit-lamp shows a corneal ulcer. Most important immediate step?",opts:["Topical steroids to reduce inflammation","Stop contact lens wear immediately + corneal scrape + intensive topical antibiotics","Chloramphenicol drops for 1 week","Reassure and review in 2 weeks"],ans:1,focus:"Contact lens keratitis — emergency",exp:"<strong>Contact lens keratitis is an emergency.</strong> Stop lenses immediately. Corneal scrape for culture (Acanthamoeba, Pseudomonas). Intensive topical antibiotics (ciprofloxacin or ofloxacin hourly). Never give steroids to a contact lens wearer with keratitis — can worsen Acanthamoeba catastrophically."},
  {q:"Anterior uveitis classically presents with which pupil finding?",opts:["Fixed mid-dilated pupil","Small irregular pupil with posterior synechiae","Dilated unreactive pupil","Normal reactive pupil"],ans:1,focus:"Anterior uveitis — small irregular pupil",exp:"<strong>Anterior uveitis:</strong> ciliary flush + photophobia + <strong>small irregular pupil</strong> (posterior synechiae — iris adhesions to anterior lens surface) + keratic precipitates on corneal endothelium. Contrast with angle-closure (fixed mid-dilated) and conjunctivitis (normal pupil)."},
  {q:"A patient presents alarmed by a bright red patch covering part of their white of the eye. Vision is normal, there is no pain, and the patch is sharply demarcated. Management?",opts:["Urgent referral — possible scleritis","Topical antibiotics for 1 week","Reassure — subconjunctival haemorrhage, check BP, no treatment needed","Topical steroids"],ans:2,focus:"Subconjunctival haemorrhage — benign",exp:"<strong>Subconjunctival haemorrhage</strong> — bright red, sharply demarcated, asymptomatic, normal VA. Alarming appearance, benign cause (Valsalva, coughing, hypertension). Resolves spontaneously in 2 weeks. No treatment needed. Check BP. If recurrent, check coagulation screen and anticoagulant use."}
];

// ── STRABISMUS ──
NOTES.strabismus = () => `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Paediatric · Note 17</div>
  <div class="n-hero-title">Strabismus &amp;<br><em>Amblyopia</em></div>
  <div class="n-hero-sub">Esotropia · Exotropia · Amblyopia · Cover Test · Critical Period · Patching</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Strabismus causes amblyopia — the brain suppresses the misaligned eye to avoid diplopia. <strong>If untreated before the critical period (age 7–8), amblyopia becomes permanent.</strong> This is the reason early detection matters.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The cover test</div><div class="n-snap-text">Cover the fixing eye — if the other eye moves to take up fixation, strabismus is present. <strong>Movement on cover = manifest squint (tropia). Movement on uncover = latent squint (phoria).</strong></div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Pseudostrabismus</div><div class="n-snap-text">Wide epicanthal folds in young children make eyes appear crossed. Cover test is normal — no movement. Common cause of false-positive referrals. Reassure parents.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-viz-block">
    <div class="n-viz-label-row"><span class="n-viz-title">Strabismus types &amp; consequences</span><span class="n-viz-sub">Direction of deviation determines the diagnosis</span></div>
    <svg viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="146" height="160" rx="2" fill="#2a3a5a"/>
      <text x="73" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">ESOTROPIA</text>
      <text x="73" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Inward turn</text>
      <text x="73" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Most common in children</text>
      <text x="73" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Accommodative → hyperopia</text>
      <text x="73" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Glasses first · then surgery</text>
      <rect x="157" y="0" width="146" height="160" rx="2" fill="#3a2a5a"/>
      <text x="230" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">EXOTROPIA</text>
      <text x="230" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Outward turn</text>
      <text x="230" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Often intermittent initially</text>
      <text x="230" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Worse when tired/daydreaming</text>
      <text x="230" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Prisms · occlusion · surgery</text>
      <rect x="314" y="0" width="146" height="160" rx="2" fill="#1a3a2a"/>
      <text x="387" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">AMBLYOPIA</text>
      <text x="387" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Cortical loss</text>
      <text x="387" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Brain suppresses deviated eye</text>
      <text x="387" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Critical period: ≤7–8 yr</text>
      <text x="387" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Patch good eye · glasses first</text>
      <rect x="471" y="0" width="146" height="160" rx="2" fill="#4a3a1a"/>
      <text x="544" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">PSEUDOSTRABISMUS</text>
      <text x="544" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">Normal cover test</text>
      <text x="544" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Wide epicanthal folds</text>
      <text x="544" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Apparent crossing — not real</text>
      <text x="544" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Always cover test first</text>
      <rect x="628" y="0" width="132" height="160" rx="2" fill="#c8452a"/>
      <text x="694" y="26" font-family="Syne,sans-serif" font-size="9" fill="rgba(255,255,255,.55)" text-anchor="middle" font-weight="700" letter-spacing="1">PARALYTIC</text>
      <text x="694" y="52" font-family="Syne,sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="800">CN Palsy</text>
      <text x="694" y="72" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">Sudden diplopia + EOM limit</text>
      <text x="694" y="87" font-family="JetBrains Mono,monospace" font-size="7.5" fill="rgba(255,255,255,.7)" text-anchor="middle">CN III + pupil = aneurysm</text>
      <text x="694" y="128" font-family="JetBrains Mono,monospace" font-size="7" fill="rgba(255,255,255,.38)" text-anchor="middle">Emergency MR angiography</text>
    </svg>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Types of Strabismus</span><span class="n-section-tag">direction and cause</span></div>
  <div class="n-diag-steps">
    <div class="n-diag-row"><div class="n-diag-label gold">Esotropia</div><div class="n-diag-content">Eye turns <strong>inward</strong>. Most common in children. Accommodative esotropia: hyperopia causes excess accommodation → convergence → esotropia. Corrects with glasses. Non-accommodative: surgical correction.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Exotropia</div><div class="n-diag-content">Eye turns <strong>outward</strong>. Often intermittent initially — worse when tired or daydreaming. Prisms, occlusion, or surgery depending on severity and control.</div></div>
    <div class="n-diag-row"><div class="n-diag-label">Hypertropia</div><div class="n-diag-content">Eye turns <strong>upward</strong>. Consider CN IV palsy (superior oblique weakness — head tilt to compensate), Brown syndrome, thyroid eye disease.</div></div>
    <div class="n-diag-row"><div class="n-diag-label err">Paralytic Strabismus</div><div class="n-diag-content">Sudden-onset diplopia + restricted EOM in an adult = CN III, IV, or VI palsy. CN III + dilated pupil = posterior communicating artery aneurysm until proven otherwise. <strong>Emergency MR angiography.</strong></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Amblyopia — The Consequence of Untreated Strabismus</span><span class="n-section-tag">the critical period</span></div>
  <div class="n-mech-chain">
    <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Misalignment → diplopia in the developing brain</div><div class="n-mech-text">The brain receives two conflicting images. In adults this causes diplopia. In children, the brain has a solution — it suppresses the image from the deviating eye. <strong>This suppression is the beginning of amblyopia.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Cortical suppression — visual cortex rewires</div><div class="n-mech-text">The visual cortex actively suppresses input from the deviating eye. Neurons dedicated to that eye are taken over by the dominant eye. <strong>This is not a problem with the eye itself — the retina and optic nerve are normal. The problem is cortical.</strong></div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Critical period — the closing window</div><div class="n-mech-text">The visual cortex remains plastic (modifiable) until approximately <strong>age 7–8 years</strong>. Treatment during this window can reverse amblyopia by forcing the brain to use the suppressed eye. After the critical period, cortical reorganisation is irreversible.</div></div></div>
    <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Treatment — patching forces use of the amblyopic eye</div><div class="n-mech-text">Cover the dominant eye with a patch → brain is forced to process input from the amblyopic eye → cortical connections strengthen → VA improves. Must correct any refractive error first (glasses). <strong>Compliance is the biggest challenge.</strong></div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">The Cover Test — Perform It Correctly</span><span class="n-section-tag">the key examination</span></div>
  <div class="n-algo-steps">
    <div class="n-algo-step s-first"><div class="n-algo-num">01</div><div class="n-algo-body"><div class="n-algo-action">Cover one eye, watch the other</div><div class="n-algo-detail">Cover the right eye — watch the left. If the left eye moves to fixate = left eye was deviated = manifest strabismus (tropia)</div></div></div>
    <div class="n-algo-step"><div class="n-algo-num">02</div><div class="n-algo-body"><div class="n-algo-action">Uncover — watch for movement</div><div class="n-algo-detail">Remove cover, watch the uncovered eye. If it moves to re-align = latent strabismus (phoria) — only present when binocular fusion is disrupted</div></div></div>
    <div class="n-algo-step"><div class="n-algo-num">03</div><div class="n-algo-body"><div class="n-algo-action">Repeat covering the other eye</div><div class="n-algo-detail">Cover the left, watch the right. Asymmetric findings suggest unilateral amblyopia or paralytic strabismus</div></div></div>
    <div class="n-algo-step s-severe"><div class="n-algo-num">04</div><div class="n-algo-body"><div class="n-algo-action">No movement on either cover = orthotropic</div><div class="n-algo-detail">But check for pseudostrabismus — wide epicanthal folds, normal cover test. Reassure parents.</div></div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">04</span><span class="n-section-title">Classic Exam Pattern</span><span class="n-section-tag">think fast</span></div>
  <div class="n-exam-box"><div class="n-exam-if">If you see</div><div class="n-exam-statement">Child + inward-turning eye + hyperopia on refraction → <em>accommodative esotropia</em> → correct the refractive error with glasses first. Many cases resolve fully. Residual deviation after optical correction = surgery.</div></div>
  <div class="n-distractor-box"><div class="n-distractor-label">The dangerous distractor</div><div class="n-distractor-text"><strong>White reflex (leukocoria) in a child with apparent strabismus = retinoblastoma until proven otherwise.</strong> Always examine the red reflex before diagnosing benign strabismus. Absent or white red reflex = urgent paediatric ophthalmology.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">05</span><span class="n-section-title">High-Yield Pearls</span><span class="n-section-tag">exam loves these</span></div>
  <div class="n-pearl-list">
    <div class="n-pearl"><div class="n-pearl-num">01</div><div class="n-pearl-body"><strong>Amblyopia is a cortical problem, not an ocular one.</strong> The eye is structurally normal. VA loss is from cortical suppression. This is why patching the good eye — not treating the bad eye — works.<span class="n-pearl-exam">Exam classic: why does patching the good eye treat amblyopia?</span></div></div>
    <div class="n-pearl"><div class="n-pearl-num">02</div><div class="n-pearl-body"><strong>After age 7–8, amblyopia treatment is largely ineffective.</strong> The critical period has closed. This is why vision screening in children at 4–5 years exists — to detect amblyopia while still treatable.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">03</div><div class="n-pearl-body"><strong>New-onset diplopia in an adult with restricted EOM = CN palsy until proven otherwise.</strong> CN III + pupil involvement = posterior communicating artery aneurysm = emergency MR angiography. Never delay this.</div></div>
    <div class="n-pearl"><div class="n-pearl-num">04</div><div class="n-pearl-body"><strong>Head tilt + vertical diplopia = CN IV palsy (superior oblique).</strong> The patient tilts head to compensate for the extorted eye. Bielschowsky head tilt test confirms it.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">06</span><span class="n-section-title">Trap Zone</span><span class="n-section-tag">don't fall for it</span></div>
  <div class="n-trap-list">
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Child with crossing eyes — wide nasal bridge, parents reassured it's normal.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>Always perform a cover test.</strong> Wide epicanthal folds cause pseudostrabismus — apparent crossing with normal cover test. But real esotropia looks identical to parents. The cover test is the only way to distinguish them. Never reassure without examining.</div></div>
    </div>
    <div class="n-trap">
      <div class="n-trap-wrong"><span class="n-trap-badge wrong">Trap</span><div class="n-trap-text">Amblyopia — the child is old enough to cooperate with treatment now (age 10). Start patching.</div></div>
      <div class="n-trap-truth"><span class="n-trap-badge right">Truth</span><div class="n-trap-text"><strong>The critical period closes at approximately age 7–8.</strong> Patching after this age has minimal benefit. Early detection — at preschool vision screening — is the only way to treat amblyopia effectively.</div></div>
    </div>
  </div>
</div>
<div class="n-anchor" style="margin:0;padding:0 32px;border-top:none!important;"><div style="background:linear-gradient(150deg,rgba(200,69,42,0.13),rgba(160,80,30,0.08),rgba(200,69,42,0.11));border:1px solid rgba(200,69,42,0.25);border-left:3px solid rgba(200,69,42,0.55);border-radius:6px;padding:32px 40px 30px 34px;position:relative;"><span style="font-family:Syne,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:3.5px;color:rgba(200,69,42,0.7);text-transform:uppercase;display:block;margin-bottom:16px;">THE ONE THING TO REMEMBER</span><div style="font-family:'Instrument Serif',Georgia,serif;font-size:clamp(17px,2vw,24px);line-height:1.65;color:rgba(245,242,235,0.92)!important;letter-spacing:0.15px;font-weight:400;display:block;"><em>The brain suppresses what it cannot fuse. And after age eight, that suppression is permanent.</em><br>Detect early. Patch early. The window closes.</div></div></div>
<div class="n-note-end-cta" onclick="showVentPopup()"><div><div class="n-note-end-cta-tag">// End of note</div><div class="n-note-end-cta-title">Are you ventilating?</div><div class="n-note-end-cta-sub">5 questions. No feedback until the end.</div></div><div class="n-note-end-cta-arrow">&#8599;</div></div></div>`;

NOTES_MCQ.strabismus = [
  {q:"A 3-year-old is referred with apparent crossing of the eyes. Cover test shows no movement of either eye on covering or uncovering. The most likely diagnosis is:",opts:["Esotropia — refer to orthoptics","Exotropia — prism therapy","Pseudostrabismus — wide epicanthal folds, reassure","Amblyopia — start patching"],ans:2,focus:"Pseudostrabismus — normal cover test",exp:"<strong>Pseudostrabismus:</strong> wide epicanthal folds make eyes appear crossed, but the cover test is completely normal — no movement on covering or uncovering. The corneal light reflexes are symmetric. Reassure parents. Review at 6 months. <strong>Never reassure without performing the cover test.</strong>"},
  {q:"A 5-year-old has a right esotropia. Refraction shows +4.00D hyperopia. First-line treatment is:",opts:["Patch the left (good) eye immediately","Correct the hyperopia with glasses first","Surgical correction of the esotropia","Botulinum toxin injection"],ans:1,focus:"Accommodative esotropia — glasses first",exp:"<strong>Accommodative esotropia</strong> is caused by hyperopia — excess accommodation drives convergence. First-line: <strong>correct the refractive error with glasses.</strong> Many cases resolve fully with optical correction alone. Patching for any associated amblyopia. Residual esotropia after full optical correction = surgery."},
  {q:"Why does patching the good eye treat amblyopia?",opts:["It strengthens the extraocular muscles of the amblyopic eye","It forces the visual cortex to process input from the suppressed eye, rebuilding cortical connections","It corrects the refractive error in the amblyopic eye","It reduces diplopia by blocking the dominant eye's image"],ans:1,focus:"Amblyopia — cortical mechanism of patching",exp:"Amblyopia is a <strong>cortical problem</strong> — the visual cortex has suppressed the deviating eye's input. Patching the good eye forces the brain to use the amblyopic eye, <strong>rebuilding cortical neural connections</strong> during the critical period. The eye itself is structurally normal — VA loss is entirely due to cortical suppression."},
  {q:"After what age is amblyopia treatment largely ineffective?",opts:["Age 3–4","Age 5–6","Age 7–8","Age 10–12"],ans:2,focus:"Amblyopia — critical period",exp:"The visual cortex remains plastic until approximately <strong>age 7–8 years</strong>. Patching during this critical period can reverse cortical suppression and improve VA. After the critical period closes, cortical reorganisation is irreversible and amblyopia treatment has minimal benefit. This is why preschool vision screening (age 4–5) is essential."},
  {q:"A 45-year-old develops sudden-onset diplopia with a right ptosis and the right eye deviated down and out. The right pupil is 7mm and unreactive. Immediate next step?",opts:["Refer to orthoptics for prism therapy","Urgent MR angiography — posterior communicating artery aneurysm","MRI brain for demyelination","Ice test for myasthenia gravis"],ans:1,focus:"CN III + pupil = aneurysm emergency",exp:"<strong>Complete CN III palsy with pupil involvement = posterior communicating artery aneurysm until proven otherwise.</strong> The oculomotor nerve's pupillary fibres run on the outer surface and are compressed first by external pressure (aneurysm). <strong>Emergency MR angiography.</strong> Ischaemic CN III (diabetes, hypertension) typically spares the pupil."}
];

// Fix ID aliases so HTML references work
NOTES.rd = NOTES.retdetach;
NOTES_MCQ.rd = NOTES_MCQ.retdetach;
NOTES.rvo = NOTES.vascular;
NOTES_MCQ.rvo = NOTES_MCQ.vascular;
NOTES.on = NOTES.opticnerve;
NOTES_MCQ.on = NOTES_MCQ.opticnerve;
