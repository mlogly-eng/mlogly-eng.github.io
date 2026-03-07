'use client'

import { useEffect } from 'react'
import './home.css'

export default function Home() {
  useEffect(() => {
    // All existing JavaScript
    if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
  const dot=document.getElementById('cdot'),ring=document.getElementById('cring');
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';});
  (function loop(){rx+=(mx-rx)*.1;ry+=(my-ry)*.1;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop);})();
  document.querySelectorAll('a,button,.sc').forEach(el=>{
    el.addEventListener('mouseenter',()=>{dot.style.transform='translate(-50%,-50%) scale(2.2)';ring.style.width='52px';ring.style.height='52px';ring.style.borderColor='rgba(200,69,42,.65)';});
    el.addEventListener('mouseleave',()=>{dot.style.transform='translate(-50%,-50%)';ring.style.width='36px';ring.style.height='36px';ring.style.borderColor='rgba(200,69,42,.35)';});
  });
}
const hbg=document.getElementById('hbg'),drawer=document.getElementById('drawer');
hbg.addEventListener('click',()=>{
  const opening=!hbg.classList.contains('open');
  hbg.classList.toggle('open');
  if(opening){drawer.style.display='flex';requestAnimationFrame(()=>drawer.classList.add('open'));document.body.style.overflow='hidden';}
  else{drawer.classList.remove('open');setTimeout(()=>{drawer.style.display='none';},300);document.body.style.overflow='';}
});
document.querySelectorAll('.drawer-link').forEach(l=>l.addEventListener('click',()=>{
  hbg.classList.remove('open');drawer.classList.remove('open');
  setTimeout(()=>{drawer.style.display='none';},300);document.body.style.overflow='';
}));
const obs=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('visible');});},{threshold:.08,rootMargin:'0px 0px -32px 0px'});
document.querySelectorAll('.reveal').forEach(el=>{
  const p=el.closest('.spec-grid,.s-right,.w-rows');
  if(p){const i=Array.from(p.children).indexOf(el);if(i>-1)el.style.transitionDelay=i*.1+'s';}
  obs.observe(el);
});
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3600);}
function notifyMe(btn,specialty){btn.textContent='✓ Noted';btn.disabled=true;showToast("we'll tell you when "+specialty+" drops.");}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);}
document.getElementById('sb').addEventListener('click',async()=>{
  const email=document.getElementById('ei').value.trim();
  const errEl=document.getElementById('cerr');
  const btn=document.getElementById('sb');
  errEl.classList.remove('show');
  if(!validEmail(email)){errEl.textContent='Please enter a valid email address.';errEl.classList.add('show');document.getElementById('ei').focus();return;}
  btn.disabled=true;btn.textContent='Submitting...';
  const { createClient } = await import("@supabase/supabase-js"); const sb = createClient("https://vwotkstjgzwjjutzjjph.supabase.co","sb_publishable_bIKimcSjTZWahxZ_5epT3A_s4LGlFUj"); await sb.from("waitlist").insert({email, year: document.getElementById("yr").value, created_at: new Date().toISOString()});
  await new Promise(r=>setTimeout(r,800));
  document.getElementById('fc').innerHTML='<div style="padding:48px 0;"><div style="font-family:\'Instrument Serif\',serif;font-size:52px;color:#e85d3f;font-style:italic;line-height:1;margin-bottom:20px;">You\'re in.</div><p style="color:rgba(245,242,235,.65);font-size:16px;line-height:1.75;">We\'ll reach out when Vent opens.<br>Until then — breathe.</p></div>';
});

/* ══════════════════════════════════════
   Q-BANK DATA
   Questions are loaded from the OB/GYN
   note file's NOTES_MCQ. Since this is
   the home page, we embed them here.
══════════════════════════════════════ */
const QB_DATA = {
  obgyn: {
    label: 'OB / GYN',
    questions: [
      // PPH
      {q:"A woman delivers vaginally and loses 1200ml. The uterus is soft and boggy. What is the most likely cause?",opts:["Retained placenta","Uterine atony","Genital tract trauma","Coagulopathy"],ans:1,exp:"<strong>Uterine atony</strong> causes 70–80% of PPH. A soft boggy uterus that fails to contract is the classic sign.",wrongs:["<strong>Retained placenta</strong> causes PPH but the uterus is typically firm and well-contracted — this is a tissue cause.","<strong>Genital tract trauma</strong> is a tone-independent cause; the uterus would be well contracted.","<strong>Coagulopathy</strong> (thrombin) is the least common of the 4 Ts and usually follows, not precedes, massive haemorrhage."],focus:"4 Ts — Tone as most common cause",learn:["<strong>PPH = blood loss >500ml vaginal or >1000ml caesarean.</strong> Primary PPH is within 24 hours.","The 4 Ts: <strong>Tone</strong> (70–80%), Trauma, Tissue, Thrombin — in order of frequency.","Bimanual uterine massage and IV oxytocin are the first response to uterine atony.","<strong>Shock Index (HR ÷ SBP) >1.0</strong> indicates significant haemodynamic compromise.","Tranexamic acid reduces PPH mortality when given within 3 hours of onset (WOMAN trial)."]},
      {q:"First-line uterotonic for PPH prevention and treatment is:",opts:["Ergometrine","Carboprost","Tranexamic acid","Oxytocin"],ans:3,exp:"<strong>Oxytocin</strong> is first-line for both prevention (active management of third stage) and PPH treatment.",wrongs:["<strong>Ergometrine</strong> is second-line; contraindicated in hypertension and cardiac disease.","<strong>Carboprost (PGF2α)</strong> is third-line; contraindicated in asthma.","<strong>Tranexamic acid</strong> is an antifibrinolytic — adjunct treatment, not a uterotonic."],focus:"Uterotonic drug hierarchy",learn:["<strong>Oxytocin 10 IU IM</strong> is given immediately after delivery of the anterior shoulder — active management.","Ergometrine causes sustained uterine contraction; avoid in pre-eclampsia and hypertension.","Carboprost: max 8 doses of 250mcg IM every 15 minutes. Never IV.","<strong>Misoprostol</strong> is an oral/PR option when oxytocin is unavailable.","Uterotonic ladder: oxytocin → ergometrine → carboprost → surgical."]},
      {q:"After oxytocin and ergometrine fail in PPH, the next pharmacological step is:",opts:["Misoprostol PR","Carboprost IM","IV tranexamic acid","B-Lynch suture"],ans:1,exp:"<strong>Carboprost (15-methyl PGF2α)</strong> is third-line after oxytocin and ergometrine.",wrongs:["<strong>Misoprostol PR</strong> is a useful alternative when other uterotonics are unavailable, but not the next step when ergometrine has already failed.","<strong>IV tranexamic acid</strong> is an antifibrinolytic adjunct — it doesn't cause uterine contraction.","<strong>B-Lynch suture</strong> is a surgical intervention — only after pharmacology has failed."],focus:"Uterotonic escalation ladder",learn:["Carboprost is <strong>contraindicated in asthma</strong> — causes severe bronchospasm.","Maximum dose: 250mcg IM every 15 minutes, up to 8 doses total.","<strong>B-Lynch suture</strong>, uterine artery ligation, and hysterectomy are the surgical escalation.","Interventional radiology (uterine artery embolisation) is an alternative to preserve fertility.","If PPH continues despite all uterotonics → activate massive transfusion protocol."]},
      {q:"The WOMAN trial showed tranexamic acid reduces PPH mortality when given within:",opts:["1 hour of delivery","3 hours of PPH onset","6 hours of PPH onset","Only with confirmed coagulopathy"],ans:1,exp:"Tranexamic acid reduces PPH-related death when given within <strong>3 hours of onset</strong>. Benefit drops sharply after 3 hours.",wrongs:["<strong>1 hour</strong> is not the WOMAN trial threshold; the benefit extends to 3 hours.","<strong>6 hours</strong> is too late — the antifibrinolytic effect is lost by then.","Waiting for <strong>confirmed coagulopathy</strong> delays treatment unnecessarily; give empirically in significant PPH."],focus:"WOMAN trial — tranexamic acid timing",learn:["WOMAN trial: 20,000 women, showed TXA <strong>reduces PPH mortality by 19%</strong> when given within 3 hours.","Dose: <strong>1g IV over 10 minutes</strong>. Repeat 1g if bleeding continues after 30 minutes.","TXA is an antifibrinolytic — it prevents clot breakdown, not a direct uterotonic.","Give as soon as PPH is recognised — do not wait for lab evidence of coagulopathy.","TXA is safe in breastfeeding."]},
      {q:"Shock Index >1 in PPH indicates:",opts:["Normal haemodynamics","Mild blood loss only","Significant haemodynamic compromise requiring action","Coagulopathy confirmed"],ans:2,exp:"<strong>Shock Index = HR ÷ Systolic BP.</strong> Normal 0.5–0.7. Value >1.0 signals significant compromise — predicts need for massive transfusion.",wrongs:["A <strong>normal Shock Index</strong> is 0.5–0.7; values >1 are never normal.","<strong>Mild blood loss</strong> typically maintains SI <0.9.","<strong>Shock Index does not confirm coagulopathy</strong> — that requires lab tests (fibrinogen, ROTEM)."],focus:"Shock Index in haemorrhage assessment",learn:["Shock Index detects physiological compromise <strong>earlier than HR or BP alone</strong>.","BP is maintained by vasoconstriction even with significant volume loss — a late sign.","SI >1.7 correlates with massive transfusion requirement.","<strong>MEOWS (Modified Early Obstetric Warning Score)</strong> incorporates multiple parameters including SI.","Trend over time matters — a rising SI despite intervention signals ongoing haemorrhage."]},
      // Preeclampsia
      {q:"Which of the following best describes the underlying pathophysiology of pre-eclampsia?",opts:["Primary hypertension aggravated by pregnancy","Abnormal placentation causing systemic endothelial dysfunction","Gestational fluid overload causing BP rise","Autoimmune renal inflammation causing proteinuria"],ans:1,exp:"Pre-eclampsia is caused by <strong>abnormal placentation</strong> — failure of trophoblast invasion → ischaemic placenta → antiangiogenic factors (sFlt-1) → systemic endothelial damage.",wrongs:["<strong>Primary hypertension</strong> precedes pregnancy by definition and is a risk factor for, not the cause of, pre-eclampsia.","<strong>Fluid overload</strong> is a consequence of pre-eclampsia, not the cause — capillary leak causes oedema despite low oncotic pressure.","<strong>Autoimmune renal inflammation</strong> describes nephritic syndrome; the kidney in pre-eclampsia shows glomerular endotheliosis, not inflammation."],focus:"Pre-eclampsia pathophysiology",learn:["Failed trophoblast invasion → <strong>narrow, high-resistance spiral arteries</strong> → placental ischaemia.","Ischaemic placenta releases sFlt-1 (anti-VEGF) → blocks normal endothelial function throughout the body.","This is why pre-eclampsia affects <strong>every organ system</strong>: brain (seizures), liver (HELLP), kidney (proteinuria), lungs (oedema).","<strong>Delivery is the only cure</strong> — removing the placenta resolves the cause.","Aspirin 75–150mg from 12 weeks reduces risk in high-risk women by ~50%."]},
      {q:"A 28-week primigravida has BP 158/102, 2+ proteinuria and severe headache. First-line antihypertensive?",opts:["Atenolol","Labetalol IV","ACE inhibitor","Furosemide"],ans:1,exp:"<strong>Labetalol IV</strong> is first-line for acute severe hypertension in pregnancy — it is safe, fast-acting, and well-evidenced.",wrongs:["<strong>Atenolol</strong> (beta-blocker) is associated with fetal growth restriction; not used in pregnancy.","<strong>ACE inhibitors</strong> are absolutely contraindicated in pregnancy — cause fetal renal agenesis and oligohydramnios.","<strong>Furosemide</strong> is a diuretic; pre-eclampsia involves capillary leak not fluid overload — diuresis worsens placental perfusion."],focus:"Acute antihypertensive management in pregnancy",learn:["Treat BP ≥160/110 urgently to prevent maternal stroke.","<strong>Labetalol IV, hydralazine IV, or nifedipine oral</strong> are the three first-line options in the UK.","<strong>Target: <150/100</strong> — do not over-lower as this compromises placental perfusion.","Always have magnesium sulphate drawn up when giving antihypertensives acutely.","Absolute contraindications: ACE inhibitors, ARBs, atenolol in any trimester."]},
      {q:"Magnesium sulphate in pre-eclampsia is used to:",opts:["Lower blood pressure","Prevent and treat eclamptic seizures","Induce diuresis","Reverse coagulopathy in HELLP"],ans:1,exp:"<strong>MgSO4 prevents and treats eclamptic seizures</strong>. It is not an antihypertensive. MAGPIE trial showed 58% reduction in eclampsia.",wrongs:["<strong>MgSO4 does not lower BP</strong> — antihypertensives are given separately.","<strong>Diuresis</strong> is not a magnesium effect; it is caused by furosemide or spontaneous postpartum diuresis.","<strong>HELLP coagulopathy</strong> requires fresh frozen plasma and platelets — magnesium has no role."],focus:"Magnesium sulphate — mechanism and use",learn:["<strong>MAGPIE trial:</strong> MgSO4 reduces eclampsia by 58% and maternal mortality by 45%.","Loading dose: <strong>4g IV over 15 minutes</strong>. Maintenance: 1g/hour infusion.","Monitor for toxicity: loss of patellar reflexes (first sign), respiratory depression, cardiac arrest.","Antidote: <strong>calcium gluconate 10ml of 10%</strong> IV — keep at bedside.","Continue MgSO4 for <strong>24 hours postpartum</strong> — eclampsia commonly occurs after delivery."]},
      // GDM
      {q:"A 30-year-old woman at 26 weeks has a 75g OGTT: fasting glucose 5.4 mmol/L, 1-hour 10.8 mmol/L, 2-hour 8.9 mmol/L. The diagnosis is:",opts:["Normal","Gestational diabetes mellitus","Pre-existing type 2 diabetes","Impaired fasting glucose only"],ans:1,exp:"<strong>GDM is diagnosed if any value meets the threshold:</strong> fasting ≥5.1, 1-hour ≥10.0, or 2-hour ≥8.5 mmol/L (NICE/IADPSG). The 2-hour value of 8.9 exceeds 8.5.",wrongs:["<strong>Normal</strong> requires all values below threshold — the 2-hour at 8.9 exceeds the 8.5 cutoff.","<strong>Pre-existing T2DM</strong> is defined by fasting ≥7.0 or 2-hour ≥11.1; this doesn't meet that threshold.","<strong>Impaired fasting glucose</strong> is a non-pregnant diagnosis; in pregnancy, any threshold breach = GDM."],focus:"GDM OGTT diagnostic thresholds",learn:["NICE GDM thresholds: fasting <strong>≥5.1</strong>, 1-hour <strong>≥10.0</strong>, 2-hour <strong>≥8.5</strong> mmol/L.","The OGTT is performed at <strong>24–28 weeks</strong> in women with risk factors.","<strong>Any single value exceeding the threshold</strong> confirms GDM — not an average.","Women with GDM at booking glucose ≥7.0 likely have pre-existing T2DM — refer to diabetologist.","Post-diagnosis: blood glucose monitoring 4×/day (fasting + 1-hour post-meals)."]},
      {q:"Which fasting glucose level in GDM mandates insulin from the outset rather than a trial of metformin?",opts:[">5.5 mmol/L",">7.0 mmol/L",">6.0 mmol/L","Any fasting hyperglycaemia"],ans:1,exp:"Fasting glucose <strong>>7.0 mmol/L</strong> indicates significant insulin deficiency — metformin alone cannot achieve targets. Start insulin immediately.",wrongs:["<strong>>5.5 mmol/L</strong> is just above the GDM fasting threshold — diet modification and metformin are first-line here.","<strong>>6.0 mmol/L</strong> is not a standard clinical cutoff for immediate insulin.","<strong>Any fasting hyperglycaemia</strong> does not automatically warrant insulin — most GDM is diet or metformin controlled."],focus:"GDM: when to start insulin",learn:["Fasting glucose <strong>>7 mmol/L</strong> at diagnosis = insulin from the outset.","<strong>Isophane insulin (NPH)</strong> at night targets fasting hyperglycaemia.","Short-acting insulin with meals targets post-prandial peaks.","Insulin requirements increase as pregnancy progresses due to rising insulin resistance.","<strong>Stop all insulin and metformin immediately after delivery</strong> — GDM-related resistance resolves within hours."]},
      // Ectopic
      {q:"A woman with a positive pregnancy test presents with 6/52 amenorrhoea, unilateral pelvic pain and vaginal spotting. Urine βhCG positive. Transvaginal USS shows no intrauterine pregnancy. What is the next step?",opts:["Reassure and repeat in 2 weeks","Measure serum βhCG and repeat USS in 48 hours","Immediate diagnostic laparoscopy","Prescribe methotrexate empirically"],ans:1,exp:"With no IUP seen and symptoms suggesting ectopic, measure <strong>serum βhCG and repeat USS in 48 hours</strong> to establish location and trend.",wrongs:["<strong>Reassuring and waiting</strong> is dangerous — a ruptured ectopic can cause death within hours.","<strong>Immediate laparoscopy</strong> is indicated if the patient is haemodynamically unstable or a definite ectopic is visualised on USS.","<strong>Methotrexate</strong> requires confirmed ectopic and haemodynamic stability — never give empirically."],focus:"Ectopic pregnancy — initial management",learn:["The triad: <strong>amenorrhoea, pain, vaginal bleeding</strong> — but only 50% have all three.","<strong>Ectopic until proven otherwise</strong> in any woman of reproductive age with pain and a positive pregnancy test.","Discriminatory zone: βhCG <strong>>1500–2000 IU/L</strong> — a viable IUP should be visible on TVUSS above this level.","Absent IUP + rising βhCG + no adnexal mass = <strong>pregnancy of unknown location (PUL)</strong>.","Ruptured ectopic: sudden severe pain + haemodynamic instability = emergency laparoscopy."]},
      // Shoulder Dystocia
      {q:"During delivery, after the head delivers, there is difficulty delivering the shoulders. The turtle sign is present. What is the first manoeuvre?",opts:["Fundal pressure","McRoberts' position + suprapubic pressure","Zavanelli manoeuvre","Delivery of posterior arm"],ans:1,exp:"<strong>McRoberts' position</strong> (hyperflexion of maternal thighs) with <strong>suprapubic pressure</strong> is always the first manoeuvre — resolves ~50% of shoulder dystocia.",wrongs:["<strong>Fundal pressure</strong> is absolutely contraindicated — it worsens impaction of the anterior shoulder.","<strong>Zavanelli manoeuvre</strong> (cephalic replacement + caesarean) is the last resort, reserved for all other manoeuvres failing.","<strong>Delivery of the posterior arm</strong> is an effective internal manoeuvre but is used after McRoberts has failed."],focus:"HELPERR — shoulder dystocia management",learn:["HELPERR: <strong>H</strong>elp, <strong>E</strong>pisiotomy, <strong>L</strong>egs (McRoberts), <strong>P</strong>ressure (suprapubic), <strong>E</strong>nter (internal), <strong>R</strong>emove arm, <strong>R</strong>oll.","McRoberts + suprapubic pressure resolves <strong>~50%</strong> of cases.","<strong>Never apply fundal pressure</strong> — this is the most common documented error.","Suprapubic pressure: directed downward and laterally to dislodge the anterior shoulder.","Document time of head delivery — every 60 seconds without delivery increases fetal acidosis significantly."]},
      // Preterm Labour
      {q:"A woman at 28 weeks presents in confirmed preterm labour. Which of the following should be given to protect the fetal brain?",opts:["Magnesium sulphate","Betamethasone","Ritodrine","Indomethacin"],ans:0,exp:"<strong>Magnesium sulphate at 28 weeks is neuroprotective</strong> — it reduces the risk of cerebral palsy in preterm infants, not seizures.",wrongs:["<strong>Betamethasone</strong> is crucial for lung maturation (surfactant) but its primary benefit is <strong>pulmonary</strong>, not neuroprotection.","<strong>Ritodrine</strong> (beta-agonist tocolytic) is no longer used routinely in the UK due to maternal side effects.","<strong>Indomethacin</strong> is a tocolytic used <34 weeks; not given for neuroprotection."],focus:"Magnesium sulphate for neuroprotection at <30 weeks",learn:["Magnesium sulphate is given for <strong>neuroprotection</strong> at <30 weeks — reduces cerebral palsy risk by ~30%.","Give <strong>betamethasone 12mg IM × 2 doses 24 hours apart</strong> for lung maturation at 24–34 weeks.","<strong>Antenatal corticosteroids reduce: RDS, IVH, NEC, and neonatal death.</strong>","Tocolysis (e.g. nifedipine, atosiban) is used to delay delivery to allow steroids to work — not to prevent delivery indefinitely.","Transfer to a unit with NICU before delivery if possible."]},
      // Cord Prolapse
      {q:"Umbilical cord prolapse is confirmed on examination. The baby is alive. What is the immediate first action?",opts:["Call for help and prepare theatre","Manually replace the cord","Elevate the presenting part off the cord digitally and call for emergency CS","Give terbutaline to stop contractions"],ans:2,exp:"<strong>Elevate the presenting part digitally</strong> to relieve cord compression immediately. This is the priority before all else.",wrongs:["<strong>Calling for help</strong> happens simultaneously but relieving compression is the first physical act.","<strong>Manually replacing the cord</strong> (funic reduction) is controversial and not first-line.","<strong>Terbutaline</strong> may be used to reduce contractions while awaiting theatre but is not the first action."],focus:"Cord prolapse — immediate management",learn:["Cord prolapse = <strong>obstetric emergency</strong>. Category 1 caesarean section.","<strong>Never remove your hand</strong> from the presenting part once it is elevated — continuous pressure until delivery.","Position: <strong>knee-chest</strong> or exaggerated Sims' — gravity takes the presenting part off the cord.","Filling the bladder with 500–700ml saline can also elevate the presenting part.","<strong>Do not attempt vaginal delivery</strong> unless birth is imminent — full dilatation and easy forceps only."]},
      // Miscarriage
      {q:"A woman at 9 weeks has heavy vaginal bleeding. Speculum shows dilated cervical os with visible products. The diagnosis is:",opts:["Threatened miscarriage","Inevitable miscarriage","Complete miscarriage","Missed miscarriage"],ans:1,exp:"<strong>Inevitable miscarriage</strong>: dilated os means the pregnancy cannot continue. Products may or may not have passed yet.",wrongs:["<strong>Threatened miscarriage</strong>: bleeding with <strong>closed os</strong> — the pregnancy may still continue.","<strong>Complete miscarriage</strong>: all products have passed, os is closed, USS confirms empty uterus.","<strong>Missed miscarriage</strong>: embryo has died but os is <strong>closed</strong> and no bleeding — found incidentally on USS."],focus:"Types of miscarriage — classification",learn:["Threatened: bleeding + <strong>closed os</strong> — may continue.","Inevitable: bleeding + <strong>open os</strong> — will not continue.","Incomplete: some products remain, os open.","Complete: all products passed, os closed.","<strong>Missed (silent)</strong>: fetal death with closed os, no bleeding — often incidental USS finding."]},
      // Placenta Praevia
      {q:"A woman at 34 weeks presents with painless, bright red vaginal bleeding. She is haemodynamically stable. What is absolutely contraindicated?",opts:["USS to check placental position","Corticosteroids for fetal lung maturity","Vaginal examination","IV access and blood cross-match"],ans:2,exp:"<strong>Vaginal examination is absolutely contraindicated</strong> in suspected placenta praevia — it can precipitate catastrophic haemorrhage.",wrongs:["<strong>USS</strong> is the diagnostic tool of choice — safe and should be done urgently.","<strong>Corticosteroids</strong> are appropriate if <34 weeks and delivery may be imminent.","<strong>IV access + cross-match</strong> are essential initial resuscitation steps."],focus:"Placenta praevia — management principles",learn:["<strong>Painless, bright red APH in the third trimester = placenta praevia until proven otherwise.</strong>","Major praevia (covering os) = <strong>elective caesarean at 36–37 weeks</strong>.","<strong>Never perform a digital vaginal examination</strong> before excluding praevia on USS.","Placenta accreta spectrum (accreta, increta, percreta) is the feared complication — risk increases with prior CS.","Ante-partum admissions, steroids if preterm, cross-match blood, plan delivery with senior team."]},
      // IOL
      {q:"A nulliparous woman has a Bishop score of 3. The most appropriate cervical ripening agent is:",opts:["Oxytocin infusion","Artificial rupture of membranes","Prostaglandin E2 (dinoprostone)","Misoprostol 200mcg"],ans:2,exp:"<strong>Prostaglandin E2 (dinoprostone)</strong> — vaginal gel or pessary — is the first-line cervical ripening agent for an unfavourable cervix (Bishop ≤6).",wrongs:["<strong>Oxytocin infusion</strong> requires a ripe cervix (Bishop ≥8) and ruptured membranes — it cannot ripen an unfavourable cervix.","<strong>ARM</strong> requires a favourable cervix — impossible with Bishop 3.","<strong>Misoprostol 200mcg</strong> is too high a dose and not standard UK practice for IOL; lower doses (25–50mcg) are used off-label."],focus:"Bishop score and cervical ripening",learn:["<strong>Bishop score ≤6 = unfavourable cervix</strong> requiring ripening before oxytocin.","Dinoprostone: <strong>3mg vaginal tablet or 1mg gel</strong>; can repeat after 6 hours.","Balloon catheter is an alternative for cervical ripening, especially in VBAC (no uterotonic risk).","<strong>Hyperstimulation (>5 contractions in 10 minutes)</strong> with PG = remove pessary, give tocolytic.","Oxytocin is titrated post-ARM once cervix is favourable."]},
      // OvaryCyst
      {q:"A premenopausal woman has a 4cm, unilocular, anechoic ovarian cyst on USS. CA-125 is normal. Most appropriate management?",opts:["Immediate surgical excision","Reassure and repeat USS in 3 months","Start OCP to suppress it","Refer to oncology urgently"],ans:1,exp:"A simple unilocular anechoic cyst <5cm with normal CA-125 in a premenopausal woman is almost certainly functional. <strong>Expectant management with repeat USS</strong> is appropriate.",wrongs:["<strong>Immediate surgery</strong> is not warranted for a likely functional cyst with no concerning features.","<strong>OCP</strong> does not reliably suppress established cysts — evidence is poor.","<strong>Urgent oncology referral</strong> is for cysts with malignant features (solid components, septations, ascites, raised CA-125)."],focus:"Ovarian cyst management — premenopausal",learn:["<strong>Unilocular, thin-walled, anechoic cyst in premenopausal woman</strong> = likely functional.","RCOG guidelines: simple cyst <5cm → no follow-up needed; 5–7cm → annual USS.","CA-125 is unreliable in premenopausal women — raised by endometriosis, fibroids, PID.","<strong>IOTA simple rules</strong> classify USS features into benign, malignant, or inconclusive.","Risk of malignancy in simple premenopausal cyst is <1%."]},
      // PCOS
      {q:"A 24-year-old presents with oligomenorrhoea, acne, and hirsutism. USS shows bilateral polycystic ovarian morphology. To confirm PCOS by Rotterdam criteria, you need:",opts:["At least 3 of the 3 Rotterdam features","At least 2 of the 3 Rotterdam features","Elevated testosterone only","Elevated LH:FSH ratio >2"],ans:1,exp:"<strong>Rotterdam criteria requires 2 out of 3:</strong> oligo/anovulation, clinical/biochemical hyperandrogenism, polycystic ovarian morphology. This patient already has 2.",wrongs:["<strong>All 3 features</strong> are not required — 2 out of 3 is sufficient.","<strong>Elevated testosterone alone</strong> does not diagnose PCOS without meeting Rotterdam criteria.","<strong>LH:FSH ratio >2</strong> was historical — Rotterdam criteria do not include it."],focus:"PCOS Rotterdam diagnostic criteria",learn:["Rotterdam criteria (2 of 3): <strong>oligo/anovulation</strong>, <strong>hyperandrogenism</strong> (clinical or biochemical), <strong>polycystic ovarian morphology</strong>.","<strong>Polycystic morphology</strong> = ≥20 follicles in one ovary OR ovarian volume >10ml.","PCOS carries metabolic risk: insulin resistance, T2DM, dyslipidaemia — screen all women.","<strong>First-line anovulation treatment for fertility: letrozole</strong> (replaced clomifene citrate in 2022).","Lifestyle modification (weight loss) is the most effective first-line treatment."]},
      // Endometriosis
      {q:"A 26-year-old has progressively worsening dysmenorrhoea, deep dyspareunia, and subfertility. Examination is normal. The investigation of choice to confirm endometriosis is:",opts:["Pelvic MRI","Serum CA-125","Transvaginal ultrasound","Diagnostic laparoscopy with biopsy"],ans:3,exp:"<strong>Diagnostic laparoscopy with histological confirmation</strong> is the gold standard for diagnosing endometriosis.",wrongs:["<strong>MRI</strong> detects deep infiltrating endometriosis well but cannot diagnose peritoneal disease and requires laparoscopy to confirm.","<strong>CA-125</strong> is neither sensitive nor specific for endometriosis — not a diagnostic test.","<strong>TVUSS</strong> detects endometriomas (>3cm) and deep infiltrating disease but cannot identify peritoneal implants."],focus:"Endometriosis diagnosis — gold standard",learn:["Endometriosis affects <strong>~10% of women</strong> of reproductive age; average diagnostic delay is 7–10 years.","<strong>Symptoms do not correlate with stage</strong> — stage I disease can cause debilitating pain.","TVUSS with bowel preparation is the first-line investigation for suspected deep endometriosis.","Medical treatment: COCP, progestogens, GnRH analogues — all are suppressive, not curative.","<strong>Laparoscopic excision</strong> is preferred over ablation for visible disease."]},
    ]
  },
  ophtho: {
    label: 'Ophthalmology',
    questions: [
      {q:"A diabetic patient presents with dot and blot haemorrhages, microaneurysms, and hard exudates on fundoscopy. Vision is currently normal. The diagnosis is:",opts:["Proliferative diabetic retinopathy","Background (non-proliferative) diabetic retinopathy","Central retinal vein occlusion","Hypertensive retinopathy grade IV"],ans:1,exp:"<strong>Background (non-proliferative) DR</strong>: dot/blot haemorrhages, microaneurysms, hard exudates — all within the retinal layers. No new vessels yet.",wrongs:["<strong>Proliferative DR</strong> = new vessel formation (neovascularisation) on the disc or elsewhere — not present here.","<strong>CRVO</strong> causes flame haemorrhages in all four quadrants with disc swelling — not microaneurysms.","<strong>Hypertensive retinopathy grade IV</strong> (papilloedema) requires disc swelling and severe hypertension."],focus:"Diabetic retinopathy classification",learn:["<strong>Background DR</strong>: microaneurysms, dot/blot haemorrhages, hard exudates, cotton wool spots.","<strong>Pre-proliferative DR</strong>: IRMA, venous beading, multiple cotton wool spots.","<strong>Proliferative DR</strong>: new vessels on disc (NVD) or elsewhere (NVE) — risk of vitreous haemorrhage.","Hard exudates = lipid deposits from leaky microaneurysms. Cotton wool spots = microinfarcts.","<strong>Annual dilated fundoscopy</strong> is mandatory for all diabetics."]},
      {q:"A 65-year-old presents with sudden painless loss of vision in one eye. Fundoscopy shows a pale, oedematous retina with a 'cherry red spot' at the macula. Diagnosis?",opts:["Central retinal vein occlusion","Anterior ischaemic optic neuropathy","Central retinal artery occlusion","Vitreous haemorrhage"],ans:2,exp:"<strong>Cherry red spot + pale retina = CRAO.</strong> The fovea appears red as underlying choroid shows through — the rest of the retina is ischaemic and white.",wrongs:["<strong>CRVO</strong> shows flame haemorrhages in all four quadrants ('stormy sunset') — not a cherry red spot.","<strong>AION</strong> causes pale disc swelling (altitudinal field defect) without cherry red spot.","<strong>Vitreous haemorrhage</strong> obscures the fundal view — you wouldn't see the retina clearly."],focus:"Central retinal artery occlusion features",learn:["CRAO: <strong>sudden, painless, profound monocular vision loss.</strong>","Fundoscopy: <strong>pale retina + cherry red spot</strong> at fovea (choroidal circulation preserved).","Aetiology: embolus (carotid, cardiac), vasculitis, thrombosis.","<strong>Emergency</strong>: ocular massage, IOP-lowering, urgent vascular work-up.","CRAO is a <strong>stroke equivalent</strong> — urgent carotid Doppler, ECG, cardiac echo, lipids, BP."]},
      {q:"A patient with open-angle glaucoma has elevated IOP. The first-line topical treatment is:",opts:["Pilocarpine drops","Timolol (beta-blocker) drops","Latanoprost (prostaglandin analogue)","Acetazolamide tablets"],ans:2,exp:"<strong>Prostaglandin analogues (latanoprost)</strong> are first-line for POAG — once daily, highly effective at reducing IOP with fewer systemic side effects.",wrongs:["<strong>Pilocarpine</strong> is a miotic — used for acute angle-closure, not chronic open-angle glaucoma.","<strong>Timolol</strong> was historically first-line but has been superseded by prostaglandin analogues.","<strong>Acetazolamide</strong> (carbonic anhydrase inhibitor) is oral, used in acute angle-closure emergencies — not first-line maintenance."],focus:"Glaucoma — first-line medical treatment",learn:["<strong>Prostaglandin analogues</strong> (latanoprost, bimatoprost): increase uveoscleral outflow — once daily, most potent IOP reduction.","<strong>Beta-blockers</strong> (timolol): reduce aqueous production — avoid in asthma, heart block.","<strong>Carbonic anhydrase inhibitors</strong> (dorzolamide, brimonidine): adjuncts.","Target IOP should be individualised — lower if disc damage is severe.","<strong>Visual field testing and OCT</strong> monitor progression regardless of IOP."]},
      {q:"A 70-year-old woman presents with sudden onset red, painful eye, fixed mid-dilated pupil, corneal oedema, and vomiting. The diagnosis is:",opts:["Acute anterior uveitis","Acute angle-closure glaucoma","Episcleritis","Bacterial conjunctivitis"],ans:1,exp:"<strong>Acute angle-closure glaucoma:</strong> sudden severe pain, red eye, fixed mid-dilated oval pupil, corneal haziness, nausea/vomiting — IOP often >50 mmHg.",wrongs:["<strong>Anterior uveitis</strong>: red eye + photophobia + small irregular pupil (posterior synechiae) — not mid-dilated fixed.","<strong>Episcleritis</strong>: sectoral redness, no pain on movement, normal IOP and normal pupil.","<strong>Bacterial conjunctivitis</strong>: bilateral purulent discharge, no change in IOP or pupil."],focus:"Acute angle-closure glaucoma — clinical features",learn:["Classically in <strong>hyperopic elderly women</strong> — shallow anterior chamber.","Triggers: dim lighting, mydriatic drops, emotional stress (pupil dilates, blocks angle).","<strong>Emergency treatment:</strong> IV acetazolamide, topical pilocarpine, IV mannitol, laser iridotomy.","<strong>Fixed mid-dilated pupil</strong> distinguishes from uveitis (small, irregular) and normal (reactive).","Contralateral prophylactic laser iridotomy is recommended."]},
      {q:"Which layer of the cornea is avascular and provides ~70% of its refractive power?",opts:["Bowman's layer","Descemet's membrane","Stroma","Epithelium"],ans:2,exp:"The <strong>stroma</strong> comprises ~90% of corneal thickness and provides the bulk of its refractive power, maintained by regular collagen fibril arrangement.",wrongs:["<strong>Bowman's layer</strong>: acellular, protects stroma — does not contribute to refraction.","<strong>Descemet's membrane</strong>: basement membrane of endothelium — structural role only.","<strong>Epithelium</strong>: provides smooth optical surface and barrier function but minimal refraction."],focus:"Corneal anatomy and layers",learn:["Corneal layers anterior to posterior: <strong>Epithelium → Bowman's → Stroma → Dua's → Descemet's → Endothelium.</strong>","Stroma = <strong>~500μm</strong>, made of collagen fibrils in precise arrangement — disruption causes opacity.","<strong>Endothelium</strong> pumps fluid out to keep stroma clear — endothelial failure = corneal oedema.","Cornea is the <strong>main refracting surface</strong> of the eye (~43 dioptres); lens adds ~19D.","<strong>Keratoconus</strong>: progressive thinning and ectasia of the stroma — causes irregular astigmatism."]},
    ]
  }
};

// Flatten all questions with system tag
function qbGetPool(sys) {
  let pool = [];
  if (sys === 'all') {
    Object.entries(QB_DATA).forEach(([sysKey, sysData]) => {
      sysData.questions.forEach(q => pool.push({...q, _sys: sysData.label}));
    });
  } else if (QB_DATA[sys]) {
    QB_DATA[sys].questions.forEach(q => pool.push({...q, _sys: QB_DATA[sys].label}));
  }
  return pool;
}

// State
let qbSys = 'all', qbMode = 'normal', qbCount = 10;
let qbSession = null; // {questions, current, answers, mode}







function qbExit() {
  document.getElementById('qb-room').classList.remove('open');
  document.body.style.overflow = '';
  qbSession = null;
}
function qbUpdateProgress() {
  if (!qbSession) return;
  const pct = Math.round((qbSession.current / qbSession.questions.length) * 100);
  document.getElementById('qb-room-pbar').style.width = pct + '%';
  document.getElementById('qb-room-nav-right').textContent = (qbSession.current + 1) + ' / ' + qbSession.questions.length;
}
function qbRenderQ() {
  if (!qbSession) return;
  const {questions, current} = qbSession;
  const q = questions[current];
  const total = questions.length;
  const letters = ['A','B','C','D','E'];
  qbUpdateProgress();
  let dots = '';
  for (let i = 0; i < total; i++) dots += `<div class="qb-dot ${i < current ? 'done' : i === current ? 'current' : ''}"></div>`;
  const html = `
    <div class="qb-q-shell">
      <div class="qb-q-meta">
        <div class="qb-q-tag">${q._sys}</div>
        <div class="qb-q-num">Q${current+1} of ${total}</div>
      </div>
      <div class="qb-dots">${dots}</div>
      <div class="qb-q-text">${q.q}</div>
      <div class="qb-opts" id="qb-opts-wrap">
        ${q.opts.map((o,i) => `
          <button class="qb-opt" onclick="qbSelectOpt(${i})">
            <span class="qb-opt-ltr">${letters[i]}</span>
            <span class="qb-opt-txt">${o}</span>
          </button>`).join('')}
      </div>
      <div id="qb-feedback-area"></div>
      <div class="qb-next-row">
        <button class="qb-next-btn" id="qb-next-btn" onclick="qbNext()" disabled>
          ${current + 1 < total ? 'Next &rarr;' : 'See results &rarr;'}
        </button>
      </div>
    </div>`;
  document.getElementById('qb-room-body').innerHTML = html;
  document.getElementById('qb-room-body').scrollTop = 0;
}
function qbSelectOpt(oi) {
  if (!qbSession) return;
  const {questions, current, mode} = qbSession;
  if (qbSession.answers[current] !== null) return;
  qbSession.answers[current] = oi;
  const q = questions[current];
  const letters = ['A','B','C','D','E'];
  // Lock all options
  document.querySelectorAll('.qb-opt').forEach(b => b.classList.add('qb-locked'));
  if (mode === 'normal') {
    // Colour the options
    document.querySelectorAll('.qb-opt').forEach((b, i) => {
      if (i === q.ans) b.classList.add('qb-correct-reveal');
      else if (i === oi && oi !== q.ans) b.classList.add('qb-wrong-reveal');
    });
    // Build feedback
    const isCorrect = oi === q.ans;
    let wrongsHtml = '';
    if (q.wrongs) {
      wrongsHtml = `<div class="qb-fb-lbl">Why the others are wrong</div><div class="qb-fb-wrongs">
        ${q.opts.map((o,i) => i !== q.ans ? `<div class="qb-fb-wrong-item"><strong>${letters[i]}. ${o}</strong> — ${q.wrongs[i - (i > q.ans ? 1 : 0)] || ''}</div>` : '').filter(Boolean).join('')}
      </div>`;
    }
    let learnHtml = '';
    if (q.learn && q.learn.length) {
      learnHtml = `<div class="qb-learn">
        <div class="qb-learn-lbl">Learning note</div>
        <div class="qb-learn-pts">${q.learn.map(pt => `<div class="qb-learn-pt">${pt}</div>`).join('')}</div>
      </div>`;
    }
    document.getElementById('qb-feedback-area').innerHTML = `
      <div class="qb-feedback ${isCorrect ? '' : 'wrong'}">
        <div class="qb-fb-verdict">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
        <div class="qb-fb-lbl">Why</div>
        <div class="qb-fb-why">${q.exp}</div>
        ${wrongsHtml}
      </div>
      ${learnHtml}`;
  } else {
    // Exam mode: just mark selected, no reveal
    document.querySelectorAll('.qb-opt').forEach((b, i) => {
      if (i === oi) b.classList.add('qb-selected');
    });
  }
  document.getElementById('qb-next-btn').disabled = false;
}
function qbNext() {
  if (!qbSession) return;
  if (qbSession.current + 1 < qbSession.questions.length) {
    qbSession.current++;
    qbRenderQ();
  } else {
    qbRenderResults();
  }
}
function qbRenderResults() {
  const {questions, answers, mode} = qbSession;
  const letters = ['A','B','C','D','E'];
  let correct = 0, missed = [];
  questions.forEach((q,i) => {
    if (answers[i] === q.ans) correct++;
    else missed.push(q.focus || 'Review this topic');
  });
  const total = questions.length;
  const pct = Math.round((correct/total)*100);
  const gc = pct>=80?'#4db87a':pct>=60?'#c8a040':'#e05a5a';
  const gl = pct===100?'Flawless.':pct>=80?'Well done.':pct>=60?'Getting there.':'Back to the notes.';
  const gs = pct===100?'Every single one correct.':pct>=80?'Solid work. Review the ones you missed.':pct>=60?'Good base. Some gaps to close.':"That's okay. Read the relevant notes, then retry.";
  document.getElementById('qb-room-pbar').style.width = '100%';
  document.getElementById('qb-room-nav-right').textContent = correct + '/' + total + ' correct';
  let focusHtml = '';
  if (missed.length) {
    const u = [...new Set(missed)];
    focusHtml = `<div class="qb-res-slbl">Focus on</div><div class="qb-focus-box">${u.map(m=>`<div class="qb-focus-item">${m}</div>`).join('')}</div>`;
  }
  const qlistHtml = questions.map((q,i) => {
    const ch = answers[i], ok = ch === q.ans;
    return `<div class="qb-res-qb ${ok?'right':'wrong'}">
      <div class="qb-res-qb-hdr">
        <span class="qb-res-badge ${ok?'right':'wrong'}">${ok?'&#10003; Correct':'&#10007; Incorrect'}</span>
        <span class="qb-res-src">${q._sys} · Q${i+1}</span>
      </div>
      <div class="qb-res-qtext">${q.q}</div>
      <div class="qb-res-opts">
        ${q.opts.map((o,oi)=>`<div class="qb-res-opt${oi===q.ans?' correct':oi===ch&&!ok?' chosen-wrong':''}">
          <span class="qb-res-opt-ltr">${letters[oi]}</span><span>${o}${oi===q.ans?' &#10003;':oi===ch&&!ok?' &#10007;':''}</span>
        </div>`).join('')}
      </div>
      <div class="qb-res-explain">
        <div class="qb-res-exp-lbl">Why</div>
        <div class="qb-res-exp-txt">${q.exp}</div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('qb-room-body').innerHTML = `
    <div class="qb-res-shell">
      <div class="qb-res-top">
        <div class="qb-res-circle" style="border-color:${gc}">
          <div class="qb-res-n" style="color:${gc}">${correct}/${total}</div>
          <div class="qb-res-pct" style="color:${gc}">${pct}%</div>
        </div>
        <div>
          <div class="qb-res-grade">${gl}</div>
          <div class="qb-res-sub">${gs}</div>
        </div>
      </div>
      ${focusHtml}
      <div class="qb-res-slbl">Full breakdown</div>
      <div class="qb-res-qlist">${qlistHtml}</div>
      <div class="qb-res-actions">
        <button class="qb-res-retry" onclick="qbRetry()">&#8635; Retry</button>
        <button class="qb-res-new" onclick="qbNewSession()">New session &#8599;</button>
      </div>
    </div>`;
  document.getElementById('qb-room-body').scrollTop = 0;
}
function qbRetry() {
  qbSession.current = 0;
  qbSession.answers = Array(qbSession.questions.length).fill(null);
  qbSession.questions = qbSession.questions.sort(() => Math.random() - .5);
  qbRenderQ();
}
function qbNewSession() {
  qbExit();
  openQBLauncher();
}
  }, [])

  return (
    <>
      <div id="cdot"></div>
      <div id="cring"></div>
      <div id="toast" className="toast"></div>
      <div dangerouslySetInnerHTML={{ __html: `<nav>
  <a href="/" class="logo">
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="21" stroke="#1a1510" stroke-width="1.5"/><path d="M22 10 L10 30" stroke="#c8452a" stroke-width="2.5" stroke-linecap="round"/><path d="M22 10 L34 30" stroke="#c8452a" stroke-width="2.5" stroke-linecap="round"/><path d="M10 30 Q22 36 34 30" stroke="#1a1510" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="22" cy="10" r="2.5" fill="#c8452a"/><path d="M14 22 Q10 26 10 30" stroke="#c8452a" stroke-width="1" stroke-linecap="round" opacity="0.4"/><path d="M30 22 Q34 26 34 30" stroke="#c8452a" stroke-width="1" stroke-linecap="round" opacity="0.4"/></svg>
    <span class="logo-name">Vent</span>
  </a>
  <div class="nav-links"><a href="#specialties">Specialties</a><a href="#story">Our story</a><a href="/qbank">Q-Bank</a><a href="#waitlist">Early access</a></div>
  <a href="#waitlist" class="nav-pill">Join waitlist</a>
  <button class="nav-hamburger" id="hbg" aria-label="Open menu"><span></span><span></span><span></span></button>
</nav>
<div class="nav-drawer" id="drawer">
  <a href="#specialties" class="drawer-link">Specialties</a>
  <a href="#story" class="drawer-link">Our story</a>
  <a href="/qbank" class="drawer-link">Q-Bank</a>
  <a href="#waitlist" class="drawer-link drawer-pill">Join waitlist</a>
</div>

<section class="hero">
  <div class="hero-l">
    <div class="hero-kick">2026 — Early access</div>
    <h1 class="hero-hl">Finally,<br><em>breathe.</em></h1>
    <p class="hero-body">Medical school gives you <strong>10,000 pages</strong> when you need ten minutes. Vent gives you the framework — so you can finally understand, not just memorise.</p>
    <div class="hero-ctas">
      <a href="#specialties" class="btn-p">Browse notes</a>
      <a href="#story" class="btn-g">Read the story →</a>
    </div>
  </div>
  <div class="hero-r">
    <div class="particle" style="left:20%;animation-duration:6s;animation-delay:0s;"></div>
    <div class="particle" style="left:45%;animation-duration:8s;animation-delay:1.5s;width:5px;height:5px;"></div>
    <div class="particle" style="left:68%;animation-duration:5s;animation-delay:.8s;"></div>
    <div class="particle" style="left:82%;animation-duration:9s;animation-delay:3s;"></div>
    <div class="hero-glow"></div>
    <div class="hero-brand-panel">
      <div class="hbp-logo">
        <svg width="120" height="120" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="21" stroke="rgba(245,242,235,0.07)" stroke-width="1.5"/>
          <path d="M22 10 L10 30" stroke="#c8452a" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M22 10 L34 30" stroke="#c8452a" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M10 30 Q22 36 34 30" stroke="rgba(245,242,235,0.22)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
          <circle cx="22" cy="10" r="5" fill="#c8452a" opacity="0.15">
            <animate attributeName="r" values="2.5;10;2.5" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite"/>
          </circle>
          <path d="M14 22 Q10 26 10 30" stroke="#c8452a" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
          <path d="M30 22 Q34 26 34 30" stroke="#c8452a" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
        </svg>
      </div>
      <div class="hbp-name">VENT</div>
      <div class="hbp-sub">ventilate · vent · breathe</div>
      <div class="hbp-manifesto">
        <div class="hbp-m-line">Clinical notes that teach.</div>
        <div class="hbp-m-line">Questions that test what matters.</div>
        <div class="hbp-m-line hbp-m-accent">Built to make you understand.</div>
      </div>
    </div>
  </div>
</section>

<section class="specs" id="specialties">
  <div class="reveal">
    <div class="sec-kick">// Clinical notes</div>
    <h2 class="sec-hl">Choose your<br><em>specialty</em></h2>
    <p class="sec-desc">Every note built to the same standard — integrated visuals, clinical reasoning frameworks, and the insight no textbook gives you. Built to the same standard throughout.</p>
  </div>
  <div class="spec-grid">
    <a href="/ophtho" class="sc reveal">
      <div class="sc-icon">👁</div><div class="sc-num">01 — Ophthalmology</div>
      <div class="sc-title">Eye &amp; Vision</div>
      <p class="sc-desc">Lens anatomy, cataracts and their types, corneal infections, retinal anatomy, diabetic retinopathy, hypertensive retinopathy. The eye conditions every doctor must know.</p>
      <div class="sc-foot" style="flex-direction:column;align-items:flex-start;gap:8px;">
        <div class="breathing-badge"><span class="breathing-dot"></span>Test yourself — 5 MCQs per note</div>
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;"><div class="sc-meta">6 notes · 5 MCQs each · Live</div><div class="sc-arr">↗</div></div>
      </div>
    </a>
    <a href="/obgyn" class="sc reveal">
      <div class="sc-icon">🩺</div><div class="sc-num">02 — OB/GYN</div>
      <div class="sc-title">Obstetrics &amp; Gynaecology</div>
      <p class="sc-desc">PPH, preeclampsia, ectopic pregnancy, placenta praevia, gestational diabetes, shoulder dystocia — and 21 more. Every OB/GYN condition you need to know, cold.</p>
      <div class="sc-foot" style="flex-direction:column;align-items:flex-start;gap:8px;">
        <div class="breathing-badge"><span class="breathing-dot"></span>Test yourself — MCQs per note</div>
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;"><div class="sc-meta">27 notes · Live</div><div class="sc-arr">↗</div></div>
      </div>
    </a>
    <div class="sc soon reveal">
      <div class="soon-tag">Coming soon</div><div class="sc-icon">🫀</div><div class="sc-num">03 — Internal Medicine</div>
      <div class="sc-title">Internal Med</div>
      <p class="sc-desc">Heart failure, ACS, pneumonia, COPD, sepsis, AKI, liver disease. The bread and butter of every medicine rotation.</p>
      <div class="sc-foot"><div class="sc-meta">In progress</div><button class="sc-notify" onclick="notifyMe(this,'Internal Medicine')">Notify me →</button></div>
    </div>
    <div class="sc soon reveal">
      <div class="soon-tag">Coming soon</div><div class="sc-icon">🩻</div><div class="sc-num">04 — Surgery</div>
      <div class="sc-title">Surgery</div>
      <p class="sc-desc">Appendicitis, bowel obstruction, hernias, acute abdomen, perioperative care. What you need before you scrub in.</p>
      <div class="sc-foot"><div class="sc-meta">In progress</div><button class="sc-notify" onclick="notifyMe(this,'Surgery')">Notify me →</button></div>
    </div>
    <div class="sc soon reveal">
      <div class="soon-tag">Coming soon</div><div class="sc-icon">🧠</div><div class="sc-num">05 — Neurology</div>
      <div class="sc-title">Neurology</div>
      <p class="sc-desc">Stroke, seizures, meningitis, Parkinson's, MS. Where pattern recognition saves lives and milliseconds matter.</p>
      <div class="sc-foot"><div class="sc-meta">In progress</div><button class="sc-notify" onclick="notifyMe(this,'Neurology')">Notify me →</button></div>
    </div>
    <div class="sc soon reveal">
      <div class="soon-tag">Coming soon</div><div class="sc-icon">👶</div><div class="sc-num">06 — Paediatrics</div>
      <div class="sc-title">Paediatrics</div>
      <p class="sc-desc">Paediatric sepsis, bronchiolitis, febrile convulsions, developmental milestones. Emergencies that look different from adults.</p>
      <div class="sc-foot"><div class="sc-meta">In progress</div><button class="sc-notify" onclick="notifyMe(this,'Paediatrics')">Notify me →</button></div>
    </div>
  </div>
</section>


<section class="qbank-entry">
  <div class="qbank-entry-in reveal">
    <div class="qbe-left">
      <div class="qbe-tag">// Q-Bank</div>
      <h2 class="qbe-hl">Test yourself.<br><em>No notes allowed.</em></h2>
      <p class="qbe-body">Pure recall. Choose a specialty, set your mode, pick your count. Clinical questions written from the notes — so they test exactly what matters. Growing towards 1,000+.</p>
      <a href="/qbank" class="qbe-btn">Enter Q-Bank <span>↗</span></a>
    </div>
    <div class="qbe-right">
      <div class="qbe-stat"><div class="qbe-stat-n">1,000+</div><div class="qbe-stat-l">Questions — the goal</div></div>
      <div class="qbe-divider"></div>
      <div class="qbe-modes">
        <div class="qbe-mode"><span class="qbe-mode-dot"></span>Normal — feedback after each</div>
        <div class="qbe-mode"><span class="qbe-mode-dot exam"></span>Exam — results at the end</div>
      </div>
    </div>
  </div>
</section>

<section class="story" id="story">
  <div class="story-in">
    <div class="s-eye">The story behind Vent</div>
    <div class="s-grid">
      <div class="s-left reveal">
        <h2 class="s-hl">One word.<br><em>Two truths.</em></h2>
        <div class="mb">
          <div class="mb-t">// What "Vent" means</div>
          <div class="mb-r"><div class="mb-ico">🫁</div><div><div class="mb-w">Ventilate</div><div class="mb-d">To supply fresh air. In medicine — keeping someone alive when they can't breathe alone. That's what this does for your mind.</div></div></div>
          <div class="mb-r"><div class="mb-ico">💬</div><div><div class="mb-w">To Vent</div><div class="mb-d">To release. To express what's suffocating you. Med school is overwhelming — you need somewhere to exhale.</div></div></div>
          <div class="mb-r"><div class="mb-ico">⚡</div><div><div class="mb-w">The Logo</div><div class="mb-d">A V tracing the bronchial tree. A breath entering, branching. Relief made into a mark.</div></div></div>
        </div>
      </div>
      <div class="s-right">
        <div class="ch reveal"><div class="ch-n">Chapter 01 — The problem</div><div class="ch-t">I was suffocating in my own curriculum.</div><p class="ch-b">Final year. Every week a new mountain of material. <strong>No one tells you which 20% actually matters.</strong></p></div>
        <div class="ch reveal"><div class="ch-n">Chapter 02 — The realization</div><div class="ch-t">The best students weren't reading more.</div><p class="ch-b">They had frameworks. They knew <strong>what to look for, not everything there is to see.</strong></p></div>
        <div class="ch reveal"><div class="ch-n">Chapter 03 — The answer</div><div class="ch-t">So I built what I needed.</div><p class="ch-b">Not a database. Not a question bank. <strong>A breathing room</strong> — where content earns its place or gets cut.</p></div>
      </div>
    </div>
  </div>
</section>

<section class="what">
  <div class="w-hdr reveal">
    <h2 class="w-hl">What Vent<br><em>actually is</em></h2>
    <p class="w-note">Notes. MCQs. A full Q-Bank. In one place. Nothing you do not need.</p>
  </div>
  <div class="w-rows">
    <div class="wr reveal"><div class="wrn">1</div><div class="wrm"><h3>Concept-driven visual notes</h3><p>Every condition with integrated diagrams that teach, not just label. The visual is the explanation.</p></div><div class="wrx"><div class="wrxl">Format</div><div class="wrxv">Premium SVG diagrams built into the text flow. Not appended — integrated.</div></div></div>
    <div class="wr reveal"><div class="wrn">2</div><div class="wrm"><h3>Clinical reasoning frameworks</h3><p>Here's how to think through it when the patient is in front of you at 3am, not just the facts.</p></div><div class="wrx"><div class="wrxl">The differentiator</div><div class="wrxv">Every note ends with "what everyone gets wrong" — the insight no textbook includes.</div></div></div>
    <div class="wr reveal"><div class="wrn">3</div><div class="wrm"><h3>A full Q-Bank — standalone, not an afterthought</h3><p>Clinical questions across specialties, growing towards 1,000+. Choose your system, set your mode, pick your count. Pure recall — no notes, no hints.</p></div><div class="wrx"><div class="wrxl">Two modes</div><div class="wrxv">Normal: per-question feedback with explanations for every option — right and wrong. Exam: no feedback until the end. Full breakdown at results.</div></div></div>
    <div class="wr reveal"><div class="wrn">4</div><div class="wrm"><h3>Test yourself — built in, not bolted on</h3><p>5 clinical MCQs at the end of every note. Not a separate app. Not later. Right there, in the same breath.</p></div><div class="wrx"><div class="wrxl">How it works</div><div class="wrxv">Finish reading. One tap. The questions are written from the note — so they test exactly what you just learned. Immediate results. Explanations for every answer.</div></div></div>
  </div>
</section>

<section class="breathe">
  <div class="bring"></div><div class="bring"></div><div class="bring"></div><div class="bring"></div>
  <div class="bc">
    <h2>You can<br><em>breathe now.</em></h2>
    <p>Medicine is already the hardest thing you'll ever do. Your notes shouldn't be.</p>
    <a href="#waitlist" class="bc-cta">Get early access →</a>
  </div>
</section>

<section class="cta" id="waitlist">
  <div class="ctabg">Breathe.</div>
  <div class="cta-in">
    <div class="reveal">
      <h2 class="c-hl">Time to<br><em>exhale.</em></h2>
      <p class="c-body">Vent is in early access. Join the waitlist and be first through the door. No spam. No filler. Just the signal.</p>
    </div>
    <div class="c-form reveal" id="fc">
      <input type="email" class="c-field" placeholder="your@email.com" id="ei" autocomplete="email">
      <select class="c-field" id="yr"><option value="" disabled selected>What year are you in?</option><option value="MS1">MS1</option><option value="MS2">MS2</option><option value="MS3">MS3</option><option value="MS4">MS4</option><option value="Resident">Resident</option><option value="Other">Other</option></select>
      <p class="c-err" id="cerr">Please enter a valid email address.</p>
      <button class="c-btn" id="sb">Join the waitlist →</button>
      <p class="c-note">// no spam. no filler. just vent.</p>
    </div>
  </div>
</section>

<footer>
  <div class="f-in">
    <div>
      <div class="f-logo"><svg width="28" height="28" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="21" stroke="rgba(245,242,235,0.2)" stroke-width="1.5"/><path d="M22 10 L10 30" stroke="#c8452a" stroke-width="2.5" stroke-linecap="round"/><path d="M22 10 L34 30" stroke="#c8452a" stroke-width="2.5" stroke-linecap="round"/><path d="M10 30 Q22 36 34 30" stroke="rgba(245,242,235,0.3)" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="22" cy="10" r="2.5" fill="#c8452a"/></svg><span class="f-name">VENT</span></div>
      <p class="f-tag">Finally. Just what you need.<br>Beta · 2026</p>
    </div>
    <div class="f-links"><a href="#story">Story</a><a href="#specialties">Specialties</a><a href="#waitlist">Early access</a><a href="#">Privacy</a></div>
    <div class="f-right"><div class="f-social"><a href="#">Instagram</a><a href="#">X / Twitter</a></div><div class="f-copy">© 2026 Vent. All rights reserved.</div></div>
  </div>
</footer>


<div id="qb-room" class="qb-room">
  <div class="qb-room-nav">
    <button class="qb-room-exit" onclick="qbExit()">&#8592; Exit</button>
    <div class="qb-room-nav-mid">
      <span class="qb-room-label" id="qb-room-label">Q-Bank</span>
      <span class="qb-room-mode-badge" id="qb-room-mode-badge">Normal</span>
    </div>
    <div class="qb-room-nav-right" id="qb-room-nav-right"></div>
  </div>
  <div class="qb-room-progress-bar"><div class="qb-room-progress-fill" id="qb-room-pbar"></div></div>
  <div id="qb-room-body" class="qb-room-body"></div>
</div>

<script>
if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
  const dot=document.getElementById('cdot'),ring=document.getElementById('cring');
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';});
  (function loop(){rx+=(mx-rx)*.1;ry+=(my-ry)*.1;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop);})();
  document.querySelectorAll('a,button,.sc').forEach(el=>{
    el.addEventListener('mouseenter',()=>{dot.style.transform='translate(-50%,-50%) scale(2.2)';ring.style.width='52px';ring.style.height='52px';ring.style.borderColor='rgba(200,69,42,.65)';});
    el.addEventListener('mouseleave',()=>{dot.style.transform='translate(-50%,-50%)';ring.style.width='36px';ring.style.height='36px';ring.style.borderColor='rgba(200,69,42,.35)';});
  });
}
const hbg=document.getElementById('hbg'),drawer=document.getElementById('drawer');
hbg.addEventListener('click',()=>{
  const opening=!hbg.classList.contains('open');
  hbg.classList.toggle('open');
  if(opening){drawer.style.display='flex';requestAnimationFrame(()=>drawer.classList.add('open'));document.body.style.overflow='hidden';}
  else{drawer.classList.remove('open');setTimeout(()=>{drawer.style.display='none';},300);document.body.style.overflow='';}
});
document.querySelectorAll('.drawer-link').forEach(l=>l.addEventListener('click',()=>{
  hbg.classList.remove('open');drawer.classList.remove('open');
  setTimeout(()=>{drawer.style.display='none';},300);document.body.style.overflow='';
}));
const obs=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('visible');});},{threshold:.08,rootMargin:'0px 0px -32px 0px'});
document.querySelectorAll('.reveal').forEach(el=>{
  const p=el.closest('.spec-grid,.s-right,.w-rows');
  if(p){const i=Array.from(p.children).indexOf(el);if(i>-1)el.style.transitionDelay=i*.1+'s';}
  obs.observe(el);
});
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3600);}
function notifyMe(btn,specialty){btn.textContent='✓ Noted';btn.disabled=true;showToast("we'll tell you when "+specialty+" drops.");}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);}
document.getElementById('sb').addEventListener('click',async()=>{
  const email=document.getElementById('ei').value.trim();
  const errEl=document.getElementById('cerr');
  const btn=document.getElementById('sb');
  errEl.classList.remove('show');
  if(!validEmail(email)){errEl.textContent='Please enter a valid email address.';errEl.classList.add('show');document.getElementById('ei').focus();return;}
  btn.disabled=true;btn.textContent='Submitting...';
  const { createClient } = await import("@supabase/supabase-js"); const sb = createClient("https://vwotkstjgzwjjutzjjph.supabase.co","sb_publishable_bIKimcSjTZWahxZ_5epT3A_s4LGlFUj"); await sb.from("waitlist").insert({email, year: document.getElementById("yr").value, created_at: new Date().toISOString()});
  await new Promise(r=>setTimeout(r,800));
  document.getElementById('fc').innerHTML='<div style="padding:48px 0;"><div style="font-family:\'Instrument Serif\',serif;font-size:52px;color:#e85d3f;font-style:italic;line-height:1;margin-bottom:20px;">You\'re in.</div><p style="color:rgba(245,242,235,.65);font-size:16px;line-height:1.75;">We\'ll reach out when Vent opens.<br>Until then — breathe.</p></div>';
});

/* ══════════════════════════════════════
   Q-BANK DATA
   Questions are loaded from the OB/GYN
   note file's NOTES_MCQ. Since this is
   the home page, we embed them here.
══════════════════════════════════════ */
const QB_DATA = {
  obgyn: {
    label: 'OB / GYN',
    questions: [
      // PPH
      {q:"A woman delivers vaginally and loses 1200ml. The uterus is soft and boggy. What is the most likely cause?",opts:["Retained placenta","Uterine atony","Genital tract trauma","Coagulopathy"],ans:1,exp:"<strong>Uterine atony</strong> causes 70–80% of PPH. A soft boggy uterus that fails to contract is the classic sign.",wrongs:["<strong>Retained placenta</strong> causes PPH but the uterus is typically firm and well-contracted — this is a tissue cause.","<strong>Genital tract trauma</strong> is a tone-independent cause; the uterus would be well contracted.","<strong>Coagulopathy</strong> (thrombin) is the least common of the 4 Ts and usually follows, not precedes, massive haemorrhage."],focus:"4 Ts — Tone as most common cause",learn:["<strong>PPH = blood loss >500ml vaginal or >1000ml caesarean.</strong> Primary PPH is within 24 hours.","The 4 Ts: <strong>Tone</strong> (70–80%), Trauma, Tissue, Thrombin — in order of frequency.","Bimanual uterine massage and IV oxytocin are the first response to uterine atony.","<strong>Shock Index (HR ÷ SBP) >1.0</strong> indicates significant haemodynamic compromise.","Tranexamic acid reduces PPH mortality when given within 3 hours of onset (WOMAN trial)."]},
      {q:"First-line uterotonic for PPH prevention and treatment is:",opts:["Ergometrine","Carboprost","Tranexamic acid","Oxytocin"],ans:3,exp:"<strong>Oxytocin</strong> is first-line for both prevention (active management of third stage) and PPH treatment.",wrongs:["<strong>Ergometrine</strong> is second-line; contraindicated in hypertension and cardiac disease.","<strong>Carboprost (PGF2α)</strong> is third-line; contraindicated in asthma.","<strong>Tranexamic acid</strong> is an antifibrinolytic — adjunct treatment, not a uterotonic."],focus:"Uterotonic drug hierarchy",learn:["<strong>Oxytocin 10 IU IM</strong> is given immediately after delivery of the anterior shoulder — active management.","Ergometrine causes sustained uterine contraction; avoid in pre-eclampsia and hypertension.","Carboprost: max 8 doses of 250mcg IM every 15 minutes. Never IV.","<strong>Misoprostol</strong> is an oral/PR option when oxytocin is unavailable.","Uterotonic ladder: oxytocin → ergometrine → carboprost → surgical."]},
      {q:"After oxytocin and ergometrine fail in PPH, the next pharmacological step is:",opts:["Misoprostol PR","Carboprost IM","IV tranexamic acid","B-Lynch suture"],ans:1,exp:"<strong>Carboprost (15-methyl PGF2α)</strong> is third-line after oxytocin and ergometrine.",wrongs:["<strong>Misoprostol PR</strong> is a useful alternative when other uterotonics are unavailable, but not the next step when ergometrine has already failed.","<strong>IV tranexamic acid</strong> is an antifibrinolytic adjunct — it doesn't cause uterine contraction.","<strong>B-Lynch suture</strong> is a surgical intervention — only after pharmacology has failed."],focus:"Uterotonic escalation ladder",learn:["Carboprost is <strong>contraindicated in asthma</strong> — causes severe bronchospasm.","Maximum dose: 250mcg IM every 15 minutes, up to 8 doses total.","<strong>B-Lynch suture</strong>, uterine artery ligation, and hysterectomy are the surgical escalation.","Interventional radiology (uterine artery embolisation) is an alternative to preserve fertility.","If PPH continues despite all uterotonics → activate massive transfusion protocol."]},
      {q:"The WOMAN trial showed tranexamic acid reduces PPH mortality when given within:",opts:["1 hour of delivery","3 hours of PPH onset","6 hours of PPH onset","Only with confirmed coagulopathy"],ans:1,exp:"Tranexamic acid reduces PPH-related death when given within <strong>3 hours of onset</strong>. Benefit drops sharply after 3 hours.",wrongs:["<strong>1 hour</strong> is not the WOMAN trial threshold; the benefit extends to 3 hours.","<strong>6 hours</strong> is too late — the antifibrinolytic effect is lost by then.","Waiting for <strong>confirmed coagulopathy</strong> delays treatment unnecessarily; give empirically in significant PPH."],focus:"WOMAN trial — tranexamic acid timing",learn:["WOMAN trial: 20,000 women, showed TXA <strong>reduces PPH mortality by 19%</strong> when given within 3 hours.","Dose: <strong>1g IV over 10 minutes</strong>. Repeat 1g if bleeding continues after 30 minutes.","TXA is an antifibrinolytic — it prevents clot breakdown, not a direct uterotonic.","Give as soon as PPH is recognised — do not wait for lab evidence of coagulopathy.","TXA is safe in breastfeeding."]},
      {q:"Shock Index >1 in PPH indicates:",opts:["Normal haemodynamics","Mild blood loss only","Significant haemodynamic compromise requiring action","Coagulopathy confirmed"],ans:2,exp:"<strong>Shock Index = HR ÷ Systolic BP.</strong> Normal 0.5–0.7. Value >1.0 signals significant compromise — predicts need for massive transfusion.",wrongs:["A <strong>normal Shock Index</strong> is 0.5–0.7; values >1 are never normal.","<strong>Mild blood loss</strong> typically maintains SI <0.9.","<strong>Shock Index does not confirm coagulopathy</strong> — that requires lab tests (fibrinogen, ROTEM)."],focus:"Shock Index in haemorrhage assessment",learn:["Shock Index detects physiological compromise <strong>earlier than HR or BP alone</strong>.","BP is maintained by vasoconstriction even with significant volume loss — a late sign.","SI >1.7 correlates with massive transfusion requirement.","<strong>MEOWS (Modified Early Obstetric Warning Score)</strong> incorporates multiple parameters including SI.","Trend over time matters — a rising SI despite intervention signals ongoing haemorrhage."]},
      // Preeclampsia
      {q:"Which of the following best describes the underlying pathophysiology of pre-eclampsia?",opts:["Primary hypertension aggravated by pregnancy","Abnormal placentation causing systemic endothelial dysfunction","Gestational fluid overload causing BP rise","Autoimmune renal inflammation causing proteinuria"],ans:1,exp:"Pre-eclampsia is caused by <strong>abnormal placentation</strong> — failure of trophoblast invasion → ischaemic placenta → antiangiogenic factors (sFlt-1) → systemic endothelial damage.",wrongs:["<strong>Primary hypertension</strong> precedes pregnancy by definition and is a risk factor for, not the cause of, pre-eclampsia.","<strong>Fluid overload</strong> is a consequence of pre-eclampsia, not the cause — capillary leak causes oedema despite low oncotic pressure.","<strong>Autoimmune renal inflammation</strong> describes nephritic syndrome; the kidney in pre-eclampsia shows glomerular endotheliosis, not inflammation."],focus:"Pre-eclampsia pathophysiology",learn:["Failed trophoblast invasion → <strong>narrow, high-resistance spiral arteries</strong> → placental ischaemia.","Ischaemic placenta releases sFlt-1 (anti-VEGF) → blocks normal endothelial function throughout the body.","This is why pre-eclampsia affects <strong>every organ system</strong>: brain (seizures), liver (HELLP), kidney (proteinuria), lungs (oedema).","<strong>Delivery is the only cure</strong> — removing the placenta resolves the cause.","Aspirin 75–150mg from 12 weeks reduces risk in high-risk women by ~50%."]},
      {q:"A 28-week primigravida has BP 158/102, 2+ proteinuria and severe headache. First-line antihypertensive?",opts:["Atenolol","Labetalol IV","ACE inhibitor","Furosemide"],ans:1,exp:"<strong>Labetalol IV</strong> is first-line for acute severe hypertension in pregnancy — it is safe, fast-acting, and well-evidenced.",wrongs:["<strong>Atenolol</strong> (beta-blocker) is associated with fetal growth restriction; not used in pregnancy.","<strong>ACE inhibitors</strong> are absolutely contraindicated in pregnancy — cause fetal renal agenesis and oligohydramnios.","<strong>Furosemide</strong> is a diuretic; pre-eclampsia involves capillary leak not fluid overload — diuresis worsens placental perfusion."],focus:"Acute antihypertensive management in pregnancy",learn:["Treat BP ≥160/110 urgently to prevent maternal stroke.","<strong>Labetalol IV, hydralazine IV, or nifedipine oral</strong> are the three first-line options in the UK.","<strong>Target: <150/100</strong> — do not over-lower as this compromises placental perfusion.","Always have magnesium sulphate drawn up when giving antihypertensives acutely.","Absolute contraindications: ACE inhibitors, ARBs, atenolol in any trimester."]},
      {q:"Magnesium sulphate in pre-eclampsia is used to:",opts:["Lower blood pressure","Prevent and treat eclamptic seizures","Induce diuresis","Reverse coagulopathy in HELLP"],ans:1,exp:"<strong>MgSO4 prevents and treats eclamptic seizures</strong>. It is not an antihypertensive. MAGPIE trial showed 58% reduction in eclampsia.",wrongs:["<strong>MgSO4 does not lower BP</strong> — antihypertensives are given separately.","<strong>Diuresis</strong> is not a magnesium effect; it is caused by furosemide or spontaneous postpartum diuresis.","<strong>HELLP coagulopathy</strong> requires fresh frozen plasma and platelets — magnesium has no role."],focus:"Magnesium sulphate — mechanism and use",learn:["<strong>MAGPIE trial:</strong> MgSO4 reduces eclampsia by 58% and maternal mortality by 45%.","Loading dose: <strong>4g IV over 15 minutes</strong>. Maintenance: 1g/hour infusion.","Monitor for toxicity: loss of patellar reflexes (first sign), respiratory depression, cardiac arrest.","Antidote: <strong>calcium gluconate 10ml of 10%</strong> IV — keep at bedside.","Continue MgSO4 for <strong>24 hours postpartum</strong> — eclampsia commonly occurs after delivery."]},
      // GDM
      {q:"A 30-year-old woman at 26 weeks has a 75g OGTT: fasting glucose 5.4 mmol/L, 1-hour 10.8 mmol/L, 2-hour 8.9 mmol/L. The diagnosis is:",opts:["Normal","Gestational diabetes mellitus","Pre-existing type 2 diabetes","Impaired fasting glucose only"],ans:1,exp:"<strong>GDM is diagnosed if any value meets the threshold:</strong> fasting ≥5.1, 1-hour ≥10.0, or 2-hour ≥8.5 mmol/L (NICE/IADPSG). The 2-hour value of 8.9 exceeds 8.5.",wrongs:["<strong>Normal</strong> requires all values below threshold — the 2-hour at 8.9 exceeds the 8.5 cutoff.","<strong>Pre-existing T2DM</strong> is defined by fasting ≥7.0 or 2-hour ≥11.1; this doesn't meet that threshold.","<strong>Impaired fasting glucose</strong> is a non-pregnant diagnosis; in pregnancy, any threshold breach = GDM."],focus:"GDM OGTT diagnostic thresholds",learn:["NICE GDM thresholds: fasting <strong>≥5.1</strong>, 1-hour <strong>≥10.0</strong>, 2-hour <strong>≥8.5</strong> mmol/L.","The OGTT is performed at <strong>24–28 weeks</strong> in women with risk factors.","<strong>Any single value exceeding the threshold</strong> confirms GDM — not an average.","Women with GDM at booking glucose ≥7.0 likely have pre-existing T2DM — refer to diabetologist.","Post-diagnosis: blood glucose monitoring 4×/day (fasting + 1-hour post-meals)."]},
      {q:"Which fasting glucose level in GDM mandates insulin from the outset rather than a trial of metformin?",opts:[">5.5 mmol/L",">7.0 mmol/L",">6.0 mmol/L","Any fasting hyperglycaemia"],ans:1,exp:"Fasting glucose <strong>>7.0 mmol/L</strong> indicates significant insulin deficiency — metformin alone cannot achieve targets. Start insulin immediately.",wrongs:["<strong>>5.5 mmol/L</strong> is just above the GDM fasting threshold — diet modification and metformin are first-line here.","<strong>>6.0 mmol/L</strong> is not a standard clinical cutoff for immediate insulin.","<strong>Any fasting hyperglycaemia</strong> does not automatically warrant insulin — most GDM is diet or metformin controlled."],focus:"GDM: when to start insulin",learn:["Fasting glucose <strong>>7 mmol/L</strong> at diagnosis = insulin from the outset.","<strong>Isophane insulin (NPH)</strong> at night targets fasting hyperglycaemia.","Short-acting insulin with meals targets post-prandial peaks.","Insulin requirements increase as pregnancy progresses due to rising insulin resistance.","<strong>Stop all insulin and metformin immediately after delivery</strong> — GDM-related resistance resolves within hours."]},
      // Ectopic
      {q:"A woman with a positive pregnancy test presents with 6/52 amenorrhoea, unilateral pelvic pain and vaginal spotting. Urine βhCG positive. Transvaginal USS shows no intrauterine pregnancy. What is the next step?",opts:["Reassure and repeat in 2 weeks","Measure serum βhCG and repeat USS in 48 hours","Immediate diagnostic laparoscopy","Prescribe methotrexate empirically"],ans:1,exp:"With no IUP seen and symptoms suggesting ectopic, measure <strong>serum βhCG and repeat USS in 48 hours</strong> to establish location and trend.",wrongs:["<strong>Reassuring and waiting</strong> is dangerous — a ruptured ectopic can cause death within hours.","<strong>Immediate laparoscopy</strong> is indicated if the patient is haemodynamically unstable or a definite ectopic is visualised on USS.","<strong>Methotrexate</strong> requires confirmed ectopic and haemodynamic stability — never give empirically."],focus:"Ectopic pregnancy — initial management",learn:["The triad: <strong>amenorrhoea, pain, vaginal bleeding</strong> — but only 50% have all three.","<strong>Ectopic until proven otherwise</strong> in any woman of reproductive age with pain and a positive pregnancy test.","Discriminatory zone: βhCG <strong>>1500–2000 IU/L</strong> — a viable IUP should be visible on TVUSS above this level.","Absent IUP + rising βhCG + no adnexal mass = <strong>pregnancy of unknown location (PUL)</strong>.","Ruptured ectopic: sudden severe pain + haemodynamic instability = emergency laparoscopy."]},
      // Shoulder Dystocia
      {q:"During delivery, after the head delivers, there is difficulty delivering the shoulders. The turtle sign is present. What is the first manoeuvre?",opts:["Fundal pressure","McRoberts' position + suprapubic pressure","Zavanelli manoeuvre","Delivery of posterior arm"],ans:1,exp:"<strong>McRoberts' position</strong> (hyperflexion of maternal thighs) with <strong>suprapubic pressure</strong> is always the first manoeuvre — resolves ~50% of shoulder dystocia.",wrongs:["<strong>Fundal pressure</strong> is absolutely contraindicated — it worsens impaction of the anterior shoulder.","<strong>Zavanelli manoeuvre</strong> (cephalic replacement + caesarean) is the last resort, reserved for all other manoeuvres failing.","<strong>Delivery of the posterior arm</strong> is an effective internal manoeuvre but is used after McRoberts has failed."],focus:"HELPERR — shoulder dystocia management",learn:["HELPERR: <strong>H</strong>elp, <strong>E</strong>pisiotomy, <strong>L</strong>egs (McRoberts), <strong>P</strong>ressure (suprapubic), <strong>E</strong>nter (internal), <strong>R</strong>emove arm, <strong>R</strong>oll.","McRoberts + suprapubic pressure resolves <strong>~50%</strong> of cases.","<strong>Never apply fundal pressure</strong> — this is the most common documented error.","Suprapubic pressure: directed downward and laterally to dislodge the anterior shoulder.","Document time of head delivery — every 60 seconds without delivery increases fetal acidosis significantly."]},
      // Preterm Labour
      {q:"A woman at 28 weeks presents in confirmed preterm labour. Which of the following should be given to protect the fetal brain?",opts:["Magnesium sulphate","Betamethasone","Ritodrine","Indomethacin"],ans:0,exp:"<strong>Magnesium sulphate at 28 weeks is neuroprotective</strong> — it reduces the risk of cerebral palsy in preterm infants, not seizures.",wrongs:["<strong>Betamethasone</strong> is crucial for lung maturation (surfactant) but its primary benefit is <strong>pulmonary</strong>, not neuroprotection.","<strong>Ritodrine</strong> (beta-agonist tocolytic) is no longer used routinely in the UK due to maternal side effects.","<strong>Indomethacin</strong> is a tocolytic used <34 weeks; not given for neuroprotection."],focus:"Magnesium sulphate for neuroprotection at <30 weeks",learn:["Magnesium sulphate is given for <strong>neuroprotection</strong> at <30 weeks — reduces cerebral palsy risk by ~30%.","Give <strong>betamethasone 12mg IM × 2 doses 24 hours apart</strong> for lung maturation at 24–34 weeks.","<strong>Antenatal corticosteroids reduce: RDS, IVH, NEC, and neonatal death.</strong>","Tocolysis (e.g. nifedipine, atosiban) is used to delay delivery to allow steroids to work — not to prevent delivery indefinitely.","Transfer to a unit with NICU before delivery if possible."]},
      // Cord Prolapse
      {q:"Umbilical cord prolapse is confirmed on examination. The baby is alive. What is the immediate first action?",opts:["Call for help and prepare theatre","Manually replace the cord","Elevate the presenting part off the cord digitally and call for emergency CS","Give terbutaline to stop contractions"],ans:2,exp:"<strong>Elevate the presenting part digitally</strong> to relieve cord compression immediately. This is the priority before all else.",wrongs:["<strong>Calling for help</strong> happens simultaneously but relieving compression is the first physical act.","<strong>Manually replacing the cord</strong> (funic reduction) is controversial and not first-line.","<strong>Terbutaline</strong> may be used to reduce contractions while awaiting theatre but is not the first action."],focus:"Cord prolapse — immediate management",learn:["Cord prolapse = <strong>obstetric emergency</strong>. Category 1 caesarean section.","<strong>Never remove your hand</strong> from the presenting part once it is elevated — continuous pressure until delivery.","Position: <strong>knee-chest</strong> or exaggerated Sims' — gravity takes the presenting part off the cord.","Filling the bladder with 500–700ml saline can also elevate the presenting part.","<strong>Do not attempt vaginal delivery</strong> unless birth is imminent — full dilatation and easy forceps only."]},
      // Miscarriage
      {q:"A woman at 9 weeks has heavy vaginal bleeding. Speculum shows dilated cervical os with visible products. The diagnosis is:",opts:["Threatened miscarriage","Inevitable miscarriage","Complete miscarriage","Missed miscarriage"],ans:1,exp:"<strong>Inevitable miscarriage</strong>: dilated os means the pregnancy cannot continue. Products may or may not have passed yet.",wrongs:["<strong>Threatened miscarriage</strong>: bleeding with <strong>closed os</strong> — the pregnancy may still continue.","<strong>Complete miscarriage</strong>: all products have passed, os is closed, USS confirms empty uterus.","<strong>Missed miscarriage</strong>: embryo has died but os is <strong>closed</strong> and no bleeding — found incidentally on USS."],focus:"Types of miscarriage — classification",learn:["Threatened: bleeding + <strong>closed os</strong> — may continue.","Inevitable: bleeding + <strong>open os</strong> — will not continue.","Incomplete: some products remain, os open.","Complete: all products passed, os closed.","<strong>Missed (silent)</strong>: fetal death with closed os, no bleeding — often incidental USS finding."]},
      // Placenta Praevia
      {q:"A woman at 34 weeks presents with painless, bright red vaginal bleeding. She is haemodynamically stable. What is absolutely contraindicated?",opts:["USS to check placental position","Corticosteroids for fetal lung maturity","Vaginal examination","IV access and blood cross-match"],ans:2,exp:"<strong>Vaginal examination is absolutely contraindicated</strong> in suspected placenta praevia — it can precipitate catastrophic haemorrhage.",wrongs:["<strong>USS</strong> is the diagnostic tool of choice — safe and should be done urgently.","<strong>Corticosteroids</strong> are appropriate if <34 weeks and delivery may be imminent.","<strong>IV access + cross-match</strong> are essential initial resuscitation steps."],focus:"Placenta praevia — management principles",learn:["<strong>Painless, bright red APH in the third trimester = placenta praevia until proven otherwise.</strong>","Major praevia (covering os) = <strong>elective caesarean at 36–37 weeks</strong>.","<strong>Never perform a digital vaginal examination</strong> before excluding praevia on USS.","Placenta accreta spectrum (accreta, increta, percreta) is the feared complication — risk increases with prior CS.","Ante-partum admissions, steroids if preterm, cross-match blood, plan delivery with senior team."]},
      // IOL
      {q:"A nulliparous woman has a Bishop score of 3. The most appropriate cervical ripening agent is:",opts:["Oxytocin infusion","Artificial rupture of membranes","Prostaglandin E2 (dinoprostone)","Misoprostol 200mcg"],ans:2,exp:"<strong>Prostaglandin E2 (dinoprostone)</strong> — vaginal gel or pessary — is the first-line cervical ripening agent for an unfavourable cervix (Bishop ≤6).",wrongs:["<strong>Oxytocin infusion</strong> requires a ripe cervix (Bishop ≥8) and ruptured membranes — it cannot ripen an unfavourable cervix.","<strong>ARM</strong> requires a favourable cervix — impossible with Bishop 3.","<strong>Misoprostol 200mcg</strong> is too high a dose and not standard UK practice for IOL; lower doses (25–50mcg) are used off-label."],focus:"Bishop score and cervical ripening",learn:["<strong>Bishop score ≤6 = unfavourable cervix</strong> requiring ripening before oxytocin.","Dinoprostone: <strong>3mg vaginal tablet or 1mg gel</strong>; can repeat after 6 hours.","Balloon catheter is an alternative for cervical ripening, especially in VBAC (no uterotonic risk).","<strong>Hyperstimulation (>5 contractions in 10 minutes)</strong> with PG = remove pessary, give tocolytic.","Oxytocin is titrated post-ARM once cervix is favourable."]},
      // OvaryCyst
      {q:"A premenopausal woman has a 4cm, unilocular, anechoic ovarian cyst on USS. CA-125 is normal. Most appropriate management?",opts:["Immediate surgical excision","Reassure and repeat USS in 3 months","Start OCP to suppress it","Refer to oncology urgently"],ans:1,exp:"A simple unilocular anechoic cyst <5cm with normal CA-125 in a premenopausal woman is almost certainly functional. <strong>Expectant management with repeat USS</strong> is appropriate.",wrongs:["<strong>Immediate surgery</strong> is not warranted for a likely functional cyst with no concerning features.","<strong>OCP</strong> does not reliably suppress established cysts — evidence is poor.","<strong>Urgent oncology referral</strong> is for cysts with malignant features (solid components, septations, ascites, raised CA-125)."],focus:"Ovarian cyst management — premenopausal",learn:["<strong>Unilocular, thin-walled, anechoic cyst in premenopausal woman</strong> = likely functional.","RCOG guidelines: simple cyst <5cm → no follow-up needed; 5–7cm → annual USS.","CA-125 is unreliable in premenopausal women — raised by endometriosis, fibroids, PID.","<strong>IOTA simple rules</strong> classify USS features into benign, malignant, or inconclusive.","Risk of malignancy in simple premenopausal cyst is <1%."]},
      // PCOS
      {q:"A 24-year-old presents with oligomenorrhoea, acne, and hirsutism. USS shows bilateral polycystic ovarian morphology. To confirm PCOS by Rotterdam criteria, you need:",opts:["At least 3 of the 3 Rotterdam features","At least 2 of the 3 Rotterdam features","Elevated testosterone only","Elevated LH:FSH ratio >2"],ans:1,exp:"<strong>Rotterdam criteria requires 2 out of 3:</strong> oligo/anovulation, clinical/biochemical hyperandrogenism, polycystic ovarian morphology. This patient already has 2.",wrongs:["<strong>All 3 features</strong> are not required — 2 out of 3 is sufficient.","<strong>Elevated testosterone alone</strong> does not diagnose PCOS without meeting Rotterdam criteria.","<strong>LH:FSH ratio >2</strong> was historical — Rotterdam criteria do not include it."],focus:"PCOS Rotterdam diagnostic criteria",learn:["Rotterdam criteria (2 of 3): <strong>oligo/anovulation</strong>, <strong>hyperandrogenism</strong> (clinical or biochemical), <strong>polycystic ovarian morphology</strong>.","<strong>Polycystic morphology</strong> = ≥20 follicles in one ovary OR ovarian volume >10ml.","PCOS carries metabolic risk: insulin resistance, T2DM, dyslipidaemia — screen all women.","<strong>First-line anovulation treatment for fertility: letrozole</strong> (replaced clomifene citrate in 2022).","Lifestyle modification (weight loss) is the most effective first-line treatment."]},
      // Endometriosis
      {q:"A 26-year-old has progressively worsening dysmenorrhoea, deep dyspareunia, and subfertility. Examination is normal. The investigation of choice to confirm endometriosis is:",opts:["Pelvic MRI","Serum CA-125","Transvaginal ultrasound","Diagnostic laparoscopy with biopsy"],ans:3,exp:"<strong>Diagnostic laparoscopy with histological confirmation</strong> is the gold standard for diagnosing endometriosis.",wrongs:["<strong>MRI</strong> detects deep infiltrating endometriosis well but cannot diagnose peritoneal disease and requires laparoscopy to confirm.","<strong>CA-125</strong> is neither sensitive nor specific for endometriosis — not a diagnostic test.","<strong>TVUSS</strong> detects endometriomas (>3cm) and deep infiltrating disease but cannot identify peritoneal implants."],focus:"Endometriosis diagnosis — gold standard",learn:["Endometriosis affects <strong>~10% of women</strong> of reproductive age; average diagnostic delay is 7–10 years.","<strong>Symptoms do not correlate with stage</strong> — stage I disease can cause debilitating pain.","TVUSS with bowel preparation is the first-line investigation for suspected deep endometriosis.","Medical treatment: COCP, progestogens, GnRH analogues — all are suppressive, not curative.","<strong>Laparoscopic excision</strong> is preferred over ablation for visible disease."]},
    ]
  },
  ophtho: {
    label: 'Ophthalmology',
    questions: [
      {q:"A diabetic patient presents with dot and blot haemorrhages, microaneurysms, and hard exudates on fundoscopy. Vision is currently normal. The diagnosis is:",opts:["Proliferative diabetic retinopathy","Background (non-proliferative) diabetic retinopathy","Central retinal vein occlusion","Hypertensive retinopathy grade IV"],ans:1,exp:"<strong>Background (non-proliferative) DR</strong>: dot/blot haemorrhages, microaneurysms, hard exudates — all within the retinal layers. No new vessels yet.",wrongs:["<strong>Proliferative DR</strong> = new vessel formation (neovascularisation) on the disc or elsewhere — not present here.","<strong>CRVO</strong> causes flame haemorrhages in all four quadrants with disc swelling — not microaneurysms.","<strong>Hypertensive retinopathy grade IV</strong> (papilloedema) requires disc swelling and severe hypertension."],focus:"Diabetic retinopathy classification",learn:["<strong>Background DR</strong>: microaneurysms, dot/blot haemorrhages, hard exudates, cotton wool spots.","<strong>Pre-proliferative DR</strong>: IRMA, venous beading, multiple cotton wool spots.","<strong>Proliferative DR</strong>: new vessels on disc (NVD) or elsewhere (NVE) — risk of vitreous haemorrhage.","Hard exudates = lipid deposits from leaky microaneurysms. Cotton wool spots = microinfarcts.","<strong>Annual dilated fundoscopy</strong> is mandatory for all diabetics."]},
      {q:"A 65-year-old presents with sudden painless loss of vision in one eye. Fundoscopy shows a pale, oedematous retina with a 'cherry red spot' at the macula. Diagnosis?",opts:["Central retinal vein occlusion","Anterior ischaemic optic neuropathy","Central retinal artery occlusion","Vitreous haemorrhage"],ans:2,exp:"<strong>Cherry red spot + pale retina = CRAO.</strong> The fovea appears red as underlying choroid shows through — the rest of the retina is ischaemic and white.",wrongs:["<strong>CRVO</strong> shows flame haemorrhages in all four quadrants ('stormy sunset') — not a cherry red spot.","<strong>AION</strong> causes pale disc swelling (altitudinal field defect) without cherry red spot.","<strong>Vitreous haemorrhage</strong> obscures the fundal view — you wouldn't see the retina clearly."],focus:"Central retinal artery occlusion features",learn:["CRAO: <strong>sudden, painless, profound monocular vision loss.</strong>","Fundoscopy: <strong>pale retina + cherry red spot</strong> at fovea (choroidal circulation preserved).","Aetiology: embolus (carotid, cardiac), vasculitis, thrombosis.","<strong>Emergency</strong>: ocular massage, IOP-lowering, urgent vascular work-up.","CRAO is a <strong>stroke equivalent</strong> — urgent carotid Doppler, ECG, cardiac echo, lipids, BP."]},
      {q:"A patient with open-angle glaucoma has elevated IOP. The first-line topical treatment is:",opts:["Pilocarpine drops","Timolol (beta-blocker) drops","Latanoprost (prostaglandin analogue)","Acetazolamide tablets"],ans:2,exp:"<strong>Prostaglandin analogues (latanoprost)</strong> are first-line for POAG — once daily, highly effective at reducing IOP with fewer systemic side effects.",wrongs:["<strong>Pilocarpine</strong> is a miotic — used for acute angle-closure, not chronic open-angle glaucoma.","<strong>Timolol</strong> was historically first-line but has been superseded by prostaglandin analogues.","<strong>Acetazolamide</strong> (carbonic anhydrase inhibitor) is oral, used in acute angle-closure emergencies — not first-line maintenance."],focus:"Glaucoma — first-line medical treatment",learn:["<strong>Prostaglandin analogues</strong> (latanoprost, bimatoprost): increase uveoscleral outflow — once daily, most potent IOP reduction.","<strong>Beta-blockers</strong> (timolol): reduce aqueous production — avoid in asthma, heart block.","<strong>Carbonic anhydrase inhibitors</strong> (dorzolamide, brimonidine): adjuncts.","Target IOP should be individualised — lower if disc damage is severe.","<strong>Visual field testing and OCT</strong> monitor progression regardless of IOP."]},
      {q:"A 70-year-old woman presents with sudden onset red, painful eye, fixed mid-dilated pupil, corneal oedema, and vomiting. The diagnosis is:",opts:["Acute anterior uveitis","Acute angle-closure glaucoma","Episcleritis","Bacterial conjunctivitis"],ans:1,exp:"<strong>Acute angle-closure glaucoma:</strong> sudden severe pain, red eye, fixed mid-dilated oval pupil, corneal haziness, nausea/vomiting — IOP often >50 mmHg.",wrongs:["<strong>Anterior uveitis</strong>: red eye + photophobia + small irregular pupil (posterior synechiae) — not mid-dilated fixed.","<strong>Episcleritis</strong>: sectoral redness, no pain on movement, normal IOP and normal pupil.","<strong>Bacterial conjunctivitis</strong>: bilateral purulent discharge, no change in IOP or pupil."],focus:"Acute angle-closure glaucoma — clinical features",learn:["Classically in <strong>hyperopic elderly women</strong> — shallow anterior chamber.","Triggers: dim lighting, mydriatic drops, emotional stress (pupil dilates, blocks angle).","<strong>Emergency treatment:</strong> IV acetazolamide, topical pilocarpine, IV mannitol, laser iridotomy.","<strong>Fixed mid-dilated pupil</strong> distinguishes from uveitis (small, irregular) and normal (reactive).","Contralateral prophylactic laser iridotomy is recommended."]},
      {q:"Which layer of the cornea is avascular and provides ~70% of its refractive power?",opts:["Bowman's layer","Descemet's membrane","Stroma","Epithelium"],ans:2,exp:"The <strong>stroma</strong> comprises ~90% of corneal thickness and provides the bulk of its refractive power, maintained by regular collagen fibril arrangement.",wrongs:["<strong>Bowman's layer</strong>: acellular, protects stroma — does not contribute to refraction.","<strong>Descemet's membrane</strong>: basement membrane of endothelium — structural role only.","<strong>Epithelium</strong>: provides smooth optical surface and barrier function but minimal refraction."],focus:"Corneal anatomy and layers",learn:["Corneal layers anterior to posterior: <strong>Epithelium → Bowman's → Stroma → Dua's → Descemet's → Endothelium.</strong>","Stroma = <strong>~500μm</strong>, made of collagen fibrils in precise arrangement — disruption causes opacity.","<strong>Endothelium</strong> pumps fluid out to keep stroma clear — endothelial failure = corneal oedema.","Cornea is the <strong>main refracting surface</strong> of the eye (~43 dioptres); lens adds ~19D.","<strong>Keratoconus</strong>: progressive thinning and ectasia of the stroma — causes irregular astigmatism."]},
    ]
  }
};

// Flatten all questions with system tag
function qbGetPool(sys) {
  let pool = [];
  if (sys === 'all') {
    Object.entries(QB_DATA).forEach(([sysKey, sysData]) => {
      sysData.questions.forEach(q => pool.push({...q, _sys: sysData.label}));
    });
  } else if (QB_DATA[sys]) {
    QB_DATA[sys].questions.forEach(q => pool.push({...q, _sys: QB_DATA[sys].label}));
  }
  return pool;
}

// State
let qbSys = 'all', qbMode = 'normal', qbCount = 10;
let qbSession = null; // {questions, current, answers, mode}







function qbExit() {
  document.getElementById('qb-room').classList.remove('open');
  document.body.style.overflow = '';
  qbSession = null;
}
function qbUpdateProgress() {
  if (!qbSession) return;
  const pct = Math.round((qbSession.current / qbSession.questions.length) * 100);
  document.getElementById('qb-room-pbar').style.width = pct + '%';
  document.getElementById('qb-room-nav-right').textContent = (qbSession.current + 1) + ' / ' + qbSession.questions.length;
}
function qbRenderQ() {
  if (!qbSession) return;
  const {questions, current} = qbSession;
  const q = questions[current];
  const total = questions.length;
  const letters = ['A','B','C','D','E'];
  qbUpdateProgress();
  let dots = '';
  for (let i = 0; i < total; i++) dots += \`<div class="qb-dot \${i < current ? 'done' : i === current ? 'current' : ''}"></div>\`;
  const html = \`
    <div class="qb-q-shell">
      <div class="qb-q-meta">
        <div class="qb-q-tag">\${q._sys}</div>
        <div class="qb-q-num">Q\${current+1} of \${total}</div>
      </div>
      <div class="qb-dots">\${dots}</div>
      <div class="qb-q-text">\${q.q}</div>
      <div class="qb-opts" id="qb-opts-wrap">
        \${q.opts.map((o,i) => \`
          <button class="qb-opt" onclick="qbSelectOpt(\${i})">
            <span class="qb-opt-ltr">\${letters[i]}</span>
            <span class="qb-opt-txt">\${o}</span>
          </button>\`).join('')}
      </div>
      <div id="qb-feedback-area"></div>
      <div class="qb-next-row">
        <button class="qb-next-btn" id="qb-next-btn" onclick="qbNext()" disabled>
          \${current + 1 < total ? 'Next &rarr;' : 'See results &rarr;'}
        </button>
      </div>
    </div>\`;
  document.getElementById('qb-room-body').innerHTML = html;
  document.getElementById('qb-room-body').scrollTop = 0;
}
function qbSelectOpt(oi) {
  if (!qbSession) return;
  const {questions, current, mode} = qbSession;
  if (qbSession.answers[current] !== null) return;
  qbSession.answers[current] = oi;
  const q = questions[current];
  const letters = ['A','B','C','D','E'];
  // Lock all options
  document.querySelectorAll('.qb-opt').forEach(b => b.classList.add('qb-locked'));
  if (mode === 'normal') {
    // Colour the options
    document.querySelectorAll('.qb-opt').forEach((b, i) => {
      if (i === q.ans) b.classList.add('qb-correct-reveal');
      else if (i === oi && oi !== q.ans) b.classList.add('qb-wrong-reveal');
    });
    // Build feedback
    const isCorrect = oi === q.ans;
    let wrongsHtml = '';
    if (q.wrongs) {
      wrongsHtml = \`<div class="qb-fb-lbl">Why the others are wrong</div><div class="qb-fb-wrongs">
        \${q.opts.map((o,i) => i !== q.ans ? \`<div class="qb-fb-wrong-item"><strong>\${letters[i]}. \${o}</strong> — \${q.wrongs[i - (i > q.ans ? 1 : 0)] || ''}</div>\` : '').filter(Boolean).join('')}
      </div>\`;
    }
    let learnHtml = '';
    if (q.learn && q.learn.length) {
      learnHtml = \`<div class="qb-learn">
        <div class="qb-learn-lbl">Learning note</div>
        <div class="qb-learn-pts">\${q.learn.map(pt => \`<div class="qb-learn-pt">\${pt}</div>\`).join('')}</div>
      </div>\`;
    }
    document.getElementById('qb-feedback-area').innerHTML = \`
      <div class="qb-feedback \${isCorrect ? '' : 'wrong'}">
        <div class="qb-fb-verdict">\${isCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
        <div class="qb-fb-lbl">Why</div>
        <div class="qb-fb-why">\${q.exp}</div>
        \${wrongsHtml}
      </div>
      \${learnHtml}\`;
  } else {
    // Exam mode: just mark selected, no reveal
    document.querySelectorAll('.qb-opt').forEach((b, i) => {
      if (i === oi) b.classList.add('qb-selected');
    });
  }
  document.getElementById('qb-next-btn').disabled = false;
}
function qbNext() {
  if (!qbSession) return;
  if (qbSession.current + 1 < qbSession.questions.length) {
    qbSession.current++;
    qbRenderQ();
  } else {
    qbRenderResults();
  }
}
function qbRenderResults() {
  const {questions, answers, mode} = qbSession;
  const letters = ['A','B','C','D','E'];
  let correct = 0, missed = [];
  questions.forEach((q,i) => {
    if (answers[i] === q.ans) correct++;
    else missed.push(q.focus || 'Review this topic');
  });
  const total = questions.length;
  const pct = Math.round((correct/total)*100);
  const gc = pct>=80?'#4db87a':pct>=60?'#c8a040':'#e05a5a';
  const gl = pct===100?'Flawless.':pct>=80?'Well done.':pct>=60?'Getting there.':'Back to the notes.';
  const gs = pct===100?'Every single one correct.':pct>=80?'Solid work. Review the ones you missed.':pct>=60?'Good base. Some gaps to close.':"That's okay. Read the relevant notes, then retry.";
  document.getElementById('qb-room-pbar').style.width = '100%';
  document.getElementById('qb-room-nav-right').textContent = correct + '/' + total + ' correct';
  let focusHtml = '';
  if (missed.length) {
    const u = [...new Set(missed)];
    focusHtml = \`<div class="qb-res-slbl">Focus on</div><div class="qb-focus-box">\${u.map(m=>\`<div class="qb-focus-item">\${m}</div>\`).join('')}</div>\`;
  }
  const qlistHtml = questions.map((q,i) => {
    const ch = answers[i], ok = ch === q.ans;
    return \`<div class="qb-res-qb \${ok?'right':'wrong'}">
      <div class="qb-res-qb-hdr">
        <span class="qb-res-badge \${ok?'right':'wrong'}">\${ok?'&#10003; Correct':'&#10007; Incorrect'}</span>
        <span class="qb-res-src">\${q._sys} · Q\${i+1}</span>
      </div>
      <div class="qb-res-qtext">\${q.q}</div>
      <div class="qb-res-opts">
        \${q.opts.map((o,oi)=>\`<div class="qb-res-opt\${oi===q.ans?' correct':oi===ch&&!ok?' chosen-wrong':''}">
          <span class="qb-res-opt-ltr">\${letters[oi]}</span><span>\${o}\${oi===q.ans?' &#10003;':oi===ch&&!ok?' &#10007;':''}</span>
        </div>\`).join('')}
      </div>
      <div class="qb-res-explain">
        <div class="qb-res-exp-lbl">Why</div>
        <div class="qb-res-exp-txt">\${q.exp}</div>
      </div>
    </div>\`;
  }).join('');
  document.getElementById('qb-room-body').innerHTML = \`
    <div class="qb-res-shell">
      <div class="qb-res-top">
        <div class="qb-res-circle" style="border-color:\${gc}">
          <div class="qb-res-n" style="color:\${gc}">\${correct}/\${total}</div>
          <div class="qb-res-pct" style="color:\${gc}">\${pct}%</div>
        </div>
        <div>
          <div class="qb-res-grade">\${gl}</div>
          <div class="qb-res-sub">\${gs}</div>
        </div>
      </div>
      \${focusHtml}
      <div class="qb-res-slbl">Full breakdown</div>
      <div class="qb-res-qlist">\${qlistHtml}</div>
      <div class="qb-res-actions">
        <button class="qb-res-retry" onclick="qbRetry()">&#8635; Retry</button>
        <button class="qb-res-new" onclick="qbNewSession()">New session &#8599;</button>
      </div>
    </div>\`;
  document.getElementById('qb-room-body').scrollTop = 0;
}
function qbRetry() {
  qbSession.current = 0;
  qbSession.answers = Array(qbSession.questions.length).fill(null);
  qbSession.questions = qbSession.questions.sort(() => Math.random() - .5);
  qbRenderQ();
}
function qbNewSession() {
  qbExit();
  openQBLauncher();
}` }} />
    </>
  )
}
