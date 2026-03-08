/* ══════════════════════════════════════
   NOTES DATA — all 6 ophthalmology topics
══════════════════════════════════════ */
const NOTES = {};

NOTES.lens = {
  mcqs: [
    { q: "Which layer of the lens is responsible for continuous lifelong growth?", opts: ["Nucleus","Cortex","Epithelium","Zonule fibres"], ans: 2, exp: "The anterior lens epithelium is the only metabolically active layer and undergoes mitosis throughout life. New fibres are added to the cortex, compressing older fibres into the nucleus.", focus: "Lens anatomy" },
    { q: "A 62-year-old presents with difficulty reading small print despite good distance vision. Which mechanism explains this?", opts: ["Pupillary constriction","Loss of lens elasticity","Corneal flattening","Vitreous liquefaction"], ans: 1, exp: "Presbyopia results from progressive hardening and loss of elasticity of the lens with age. The ciliary muscle still contracts but the lens cannot change shape adequately to accommodate for near vision.", focus: "Presbyopia" },
    { q: "Why does the lens have no blood supply?", opts: ["It is too small to need one","Vessels would obstruct the visual axis","It derives oxygen from the vitreous only","It is avascular by embryological accident"], ans: 1, exp: "The lens must remain optically transparent. Blood vessels contain haemoglobin which is opaque — any vascularity would scatter light and reduce visual acuity. Nutrition comes from diffusion through aqueous humour.", focus: "Lens avascular nature" },
    { q: "Accommodation for near vision requires:", opts: ["Relaxation of ciliary muscle and increased lens convexity","Contraction of ciliary muscle and increased lens convexity","Contraction of ciliary muscle and decreased lens convexity","Relaxation of ciliary muscle and decreased lens convexity"], ans: 1, exp: "Near vision: ciliary muscle contracts → zonule fibres relax → lens becomes more convex (rounder) → higher refractive power. The lens acts like a zoom lens becoming fatter for close work.", focus: "Accommodation mechanism" },
    { q: "The lens epithelium pumps Na⁺ out using Na⁺/K⁺-ATPase. What would happen if this pump failed?", opts: ["Lens liquefaction","Lens calcification","Cortical cataract from osmotic water influx","Nuclear sclerosis"], ans: 2, exp: "The pump maintains low intracellular Na⁺. If it fails, Na⁺ accumulates inside lens fibres, drawing water in by osmosis — the fibres swell, lose transparency, and cortical cataract develops. This is the mechanism in metabolic cataracts.", focus: "Lens pump failure" }
  ]
};

NOTES.cataract = {
  mcqs: [
    { q: "A 70-year-old describes gradual blurring at all distances with colours appearing yellowed. Slit-lamp shows brunescent lens nucleus. Diagnosis?", opts: ["Posterior subcapsular cataract","Nuclear sclerotic cataract","Cortical cataract","Posterior polar cataract"], ans: 1, exp: "Nuclear sclerosis = age-related hardening and yellowing of the nucleus. Brunescence (brown discolouration) is advanced nuclear sclerosis. It affects all distances and causes colour desaturation, especially blues.", focus: "Nuclear cataract" },
    { q: "Which cataract type causes the greatest glare in bright light and is most associated with steroid use?", opts: ["Nuclear","Cortical","Posterior subcapsular","Anterior subcapsular"], ans: 2, exp: "Posterior subcapsular cataracts sit directly in the axial visual path. Bright light causes pupillary constriction, forcing light through the opacified posterior pole — maximum glare. They occur with steroids, diabetes, and radiation.", focus: "Posterior subcapsular cataract" },
    { q: "A diabetic patient notices monocular diplopia and improved near vision without glasses — the 'second sight' phenomenon. What is happening?", opts: ["Macular oedema improving","Nuclear sclerosis increasing lens refractive index","Corneal oedema resolving","Vitreous detachment"], ans: 1, exp: "Nuclear sclerosis increases the refractive index of the lens → myopic shift → near objects come into focus without reading glasses ('second sight'). The myopia also causes monocular diplopia from differential refraction.", focus: "Second sight phenomenon" },
    { q: "During phacoemulsification, the posterior capsule is torn. What is the immediate danger?", opts: ["Iris prolapse","Vitreous prolapse into anterior chamber","Corneal decompensation","Zonular dialysis"], ans: 1, exp: "Posterior capsule rupture allows vitreous (a gel) to prolapse forward into the anterior chamber. Vitreous in the AC raises IOP, causes traction on the retina, and dramatically increases risk of retinal detachment and cystoid macular oedema.", focus: "Cataract surgery complication" },
    { q: "Cortical cataracts appear as spoke-like opacities radiating from the periphery. Which metabolic process best explains cortical cataract formation?", opts: ["Lens protein glycation","Osmotic swelling from Na⁺/K⁺-ATPase failure","UV-induced oxidative damage to the nucleus","Steroid inhibition of lens epithelial cells"], ans: 1, exp: "Osmotic imbalance from pump failure or high glucose (polyol pathway → sorbitol accumulation → osmotic water influx) causes cortical fibre swelling and vacuole formation, producing the characteristic spoke-like pattern.", focus: "Cortical cataract mechanism" }
  ]
};

NOTES.cornea = {
  mcqs: [
    { q: "A contact lens wearer presents with a painful red eye, photophobia, and a white corneal opacity. The most dangerous organism to exclude first is:", opts: ["Staphylococcus aureus","Herpes simplex virus","Pseudomonas aeruginosa","Acanthamoeba"], ans: 2, exp: "Pseudomonas produces proteases that digest corneal stroma rapidly — a small ulcer can perforate within 24–48 hours. Contact lens wear is the primary risk factor. Aggressive treatment with fluoroquinolone drops is urgent.", focus: "Bacterial keratitis" },
    { q: "Dendritic ulcers on fluorescein staining are pathognomonic of:", opts: ["Acanthamoeba keratitis","Fungal keratitis","HSV epithelial keratitis","Bacterial keratitis"], ans: 2, exp: "HSV replicates in epithelial cells and spreads laterally, creating a branching (dendritic) ulcer with terminal bulbs. The dendrites stain with fluorescein (ulcerated epithelium) and rose bengal (devitalised cells at edges).", focus: "HSV keratitis" },
    { q: "A patient with ring-shaped corneal infiltrate and excruciating pain disproportionate to findings swam in a river while wearing soft contact lenses. Diagnosis?", opts: ["Fungal keratitis","Acanthamoeba keratitis","HSV stromal keratitis","Bacterial keratitis"], ans: 1, exp: "Acanthamoeba: ring infiltrate (immune reaction to trophozoites in stroma) + severe pain (perineural invasion — Acanthamoeba tracks along corneal nerves). Freshwater exposure + contact lens = classic history.", focus: "Acanthamoeba keratitis" },
    { q: "Why is topical steroid use dangerous in undiagnosed herpetic keratitis?", opts: ["Steroids cause corneal thinning directly","Steroids suppress viral immune control, enabling deeper stromal invasion","Steroids increase IOP causing optic nerve damage","Steroids prevent antiviral penetration"], ans: 1, exp: "Steroids suppress the T-cell response that limits HSV replication. In epithelial keratitis, steroids accelerate viral spread into the stroma (disciform/stromal keratitis) causing sight-threatening scarring. Steroids are only used for immune stromal keratitis under antiviral cover.", focus: "Steroid risk in HSV" },
    { q: "First-line treatment for Acanthamoeba keratitis is:", opts: ["Topical voriconazole","PHMB + propamidine (Brolene)","Topical aciclovir","Topical ciprofloxacin"], ans: 1, exp: "Acanthamoeba requires cysticidal agents — the cyst form is extremely resistant. PHMB (polyhexamethylene biguanide) + propamidine is first-line. Treatment is intensive and prolonged (months). Antifungals and antivirals are ineffective.", focus: "Acanthamoeba treatment" }
  ]
};

NOTES.retina = {
  mcqs: [
    { q: "Rods are most concentrated at:", opts: ["The fovea centralis","The macula lutea","The peripheral retina (20–30° from fovea)","The optic disc"], ans: 2, exp: "Rods peak at ~20° from the fovea and are absent from the foveal centre. They detect low-light and peripheral motion. The fovea is rod-free — entirely cones — which is why dim stars are better seen by looking slightly off-centre.", focus: "Rod distribution" },
    { q: "A patient with diabetes has hard exudates, microaneurysms, and haemorrhages — all within one disc diameter of the fovea. Vision is 6/18. What is the diagnosis?", opts: ["Background DR","Pre-proliferative DR","Clinically significant macular oedema","Proliferative DR"], ans: 2, exp: "CSMO is defined by hard exudates/thickening within 500μm of the fovea centre, or any hard exudate ring with thickening within 1 disc diameter of the fovea. It's the most common cause of visual loss in DR and requires macular laser or anti-VEGF.", focus: "CSMO" },
    { q: "Which retinal layer is damaged first in retinal detachment, separating neurosensory retina from RPE?", opts: ["Nerve fibre layer","Photoreceptor outer segments from RPE","Ganglion cell layer","Inner nuclear layer"], ans: 1, exp: "Retinal detachment separates photoreceptor outer segments from the RPE. The RPE maintains photoreceptors through active transport of nutrients and phagocytosis of shed outer segments. Separation = photoreceptor death. This is why speed of reattachment determines visual outcome.", focus: "Retinal detachment" },
    { q: "The blind spot corresponds to:", opts: ["The fovea","The macula","The optic disc","The peripheral ora serrata"], ans: 2, exp: "The optic disc has no photoreceptors — it is where ganglion cell axons converge to form the optic nerve. This creates a physiological scotoma (blind spot) at ~15° temporal to fixation. We don't perceive it due to perceptual fill-in.", focus: "Optic disc anatomy" },
    { q: "Müller cells span the full thickness of the retina. Their primary role is:", opts: ["Phagocytosis of shed outer segments","Structural support, K⁺ buffering, and metabolic support for neurons","Light transduction","Synthesis of visual pigment"], ans: 1, exp: "Müller cells are the principal glial cells of the retina, providing structural scaffolding, regulating extracellular K⁺ (spatial buffering), recycling neurotransmitters, and supplying lactate to photoreceptors. Their dysfunction contributes to macular oedema.", focus: "Müller cells" }
  ]
};

NOTES.dr = {
  mcqs: [
    { q: "The earliest visible sign of diabetic retinopathy on fundoscopy is:", opts: ["Hard exudates","Soft exudates (cotton wool spots)","Dot and blot haemorrhages","Microaneurysms"], ans: 3, exp: "Microaneurysms are the earliest visible sign — focal outpouchings of retinal capillary walls from pericyte loss. They appear as tiny red dots and are the hallmark of background DR (NPDR stage 1).", focus: "Early DR sign" },
    { q: "Cotton wool spots in DR indicate:", opts: ["Lipid deposition in the retina","Nerve fibre layer infarcts from arteriolar occlusion","New vessel formation","Vitreous haemorrhage"], ans: 1, exp: "Cotton wool spots = microinfarcts of the nerve fibre layer from occluded precapillary arterioles. Axoplasmic flow is disrupted, causing focal swelling that appears as fluffy white patches. Their presence indicates pre-proliferative DR — VEGF rising.", focus: "Cotton wool spots" },
    { q: "Proliferative DR develops because:", opts: ["Retinal oedema damages the macula","Ischaemic retina releases VEGF driving new vessel formation","High blood glucose directly stimulates endothelial growth","Pericyte proliferation blocks capillaries"], ans: 1, exp: "Capillary non-perfusion → retinal ischaemia → VEGF secretion → neovascularisation (new vessels at disc = NVD, elsewhere = NVE). New vessels are fragile, bleed easily (vitreous haemorrhage), and cause tractional retinal detachment.", focus: "PDR mechanism" },
    { q: "UK screening for diabetic retinopathy in Type 1 diabetes begins:", opts: ["At diagnosis","After 2 years","At age 12 or after 2 years of diabetes, whichever is later","At age 18"], ans: 2, exp: "NICE: Type 1 DM screening starts at age 12 (or after 2 years of diabetes if diagnosed after age 10). Type 2 DM: screening at diagnosis. Annual digital retinal photography is the screening modality.", focus: "DR screening" },
    { q: "A patient with PDR develops sudden painless profound visual loss. The most likely cause is:", opts: ["Central retinal artery occlusion","Vitreous haemorrhage","Acute angle closure glaucoma","Optic neuritis"], ans: 1, exp: "Fragile new vessels in PDR rupture into the vitreous → vitreous haemorrhage → sudden painless dense visual loss. The vitreous fills with blood, blocking the visual axis. It is painless (no sensory nerves in vitreous). Pars plana vitrectomy may be needed.", focus: "PDR complication" }
  ]
};

NOTES.hr = {
  mcqs: [
    { q: "A patient with BP 200/120 has papilloedema on fundoscopy. This is KWB grade:", opts: ["Grade I","Grade II","Grade III","Grade IV"], ans: 3, exp: "KWB Grade IV = papilloedema (disc swelling from raised ICP or malignant hypertension causing disc ischaemia). This indicates hypertensive emergency requiring immediate IV antihypertensive treatment. Grade III has flame haemorrhages and cotton wool spots.", focus: "KWB grading" },
    { q: "AV nipping (nicking) in hypertensive retinopathy occurs because:", opts: ["Veins are compressed by thickened arterial walls at crossing points","Arteries bleed into the vein at crossings","High venous pressure causes venous dilation","Cotton wool spots compress nearby veins"], ans: 0, exp: "At arteriovenous crossings, arteries and veins share a common adventitial sheath. Hypertensive arteriosclerosis thickens arterial walls → compression of the underlying vein → appears 'nicked' or tapered. This predisposes to branch retinal vein occlusion.", focus: "AV nicking" },
    { q: "The copper wiring appearance in hypertensive retinopathy is caused by:", opts: ["Haemosiderin deposition in vessel walls","Increased light reflex from arteriosclerotic vessel wall thickening","Cholesterol emboli in arterioles","New vessel formation"], ans: 1, exp: "Arteriosclerosis thickens and scleroses the arterial wall → increased light reflection from the column of blood inside → the vessel appears to have a broader, brighter reflex. Progresses: silver wiring → copper wiring as the sclerosis increases.", focus: "Vessel changes" },
    { q: "Which feature distinguishes hypertensive emergency (vs urgency) requiring immediate IV treatment?", opts: ["BP > 180/120","Headache and blurred vision","End-organ damage (papilloedema, encephalopathy, AKI)","Grade II KWB changes"], ans: 2, exp: "Hypertensive emergency = severely elevated BP WITH end-organ damage. Retinal signs signifying emergency: Grade IV (papilloedema), Grade III (haemorrhages + cotton wool spots = accelerated hypertension). BP alone (urgency) can be managed orally over hours to days.", focus: "Emergency vs urgency" },
    { q: "A patient develops a sudden painless sectoral visual field defect. Fundoscopy shows flame haemorrhages in one quadrant along a vein distribution. Diagnosis?", opts: ["Branch retinal artery occlusion","Central retinal vein occlusion","Branch retinal vein occlusion","Vitreous haemorrhage"], ans: 2, exp: "BRVO presents with sudden painless visual field loss. Fundoscopy: flame haemorrhages, cotton wool spots, disc oedema in the territory of the occluded branch vein — classic sector distribution. AV nicking at the occlusion site is the typical cause. Associations: hypertension, hyperlipidaemia.", focus: "BRVO" }
  ]
};

/* ══════════════════════════════════════
   NOTE CONTENT — HTML for each modal
══════════════════════════════════════ */
const NOTE_CONTENT = {};

NOTE_CONTENT.lens = `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Anatomy</div>
  <div class="n-hero-title">The<br><em>Lens</em></div>
  <div class="n-hero-sub">Structure &nbsp;·&nbsp; Transparency &nbsp;·&nbsp; Accommodation</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">What it is</div><div class="n-snap-text">A biconvex, avascular, transparent crystalline structure sitting behind the iris. Suspended by zonule fibres from the ciliary body. Accounts for <strong>~30%</strong> of the eye's refractive power.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Why no vessels</div><div class="n-snap-text">Blood vessels contain haemoglobin which is <strong>opaque</strong>. Any vascularity would scatter light and destroy vision. Nutrition diffuses from the <strong>aqueous humour</strong> anteriorly.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Understanding lens structure explains cataract types, why certain diseases target the lens, and the mechanism of accommodation failure in <strong>presbyopia</strong>.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Structure</span><span class="n-section-tag">layers from outside in</span></div>
  <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Capsule</div><div class="n-mech-text">The outermost layer — a thick basement membrane secreted by the lens epithelium. It is <strong>thickest anteriorly</strong> where the epithelium is active. The capsule is the key surgical layer in cataract surgery (phacoemulsification works inside it).</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Anterior Epithelium</div><div class="n-mech-text">A single layer of cuboidal cells — the <strong>only metabolically active</strong> part of the lens. Mitosis here is continuous throughout life. Daughter cells migrate to the equator and differentiate into lens fibres, adding to the cortex.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Cortex</div><div class="n-mech-text">Young, recently added lens fibres. <strong>Soft and transparent</strong>. The fibres have lost their nuclei and organelles (which would scatter light), and consist almost entirely of crystallin proteins packed at high concentration.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Nucleus</div><div class="n-mech-text">The oldest, most central fibres — compressed by decades of new fibre addition. <strong>Harder and more sclerotic</strong> with age. Nuclear sclerosis (yellowing, hardening) is the basis of the most common cataract type.</div></div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Accommodation</span><span class="n-section-tag">the zoom mechanism</span></div>
  <div class="n-mech-step"><div class="n-mech-dot d1">Far</div><div class="n-mech-body"><div class="n-mech-cause">Distance vision — ciliary muscle relaxed</div><div class="n-mech-text">Ciliary muscle relaxes → ciliary ring widens → zonule fibres under <strong>tension</strong> → lens pulled flat → lower refractive power → parallel rays from distance focus on retina.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d2">Near</div><div class="n-mech-body"><div class="n-mech-cause">Near vision — ciliary muscle contracts</div><div class="n-mech-text">Ciliary muscle contracts → ciliary ring narrows → zonule fibres <strong>relax</strong> → lens springs into a more convex shape → higher refractive power → diverging rays from near objects focused onto retina.</div></div></div>
  <div class="n-pearl"><div class="n-pearl-num">Pearl</div><div class="n-pearl-body">Presbyopia (age ~45+) occurs because the lens <strong>loses elasticity</strong> — it can no longer spring back into a convex shape when the zonules relax. The ciliary muscle still works fine. This is why reading glasses (convex lenses) compensate — they do the converging work the lens can no longer perform.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Lens Transparency</span><span class="n-section-tag">why it is clear and how it fails</span></div>
  <p class="n-mech-text">Transparency requires three things: <strong>(1)</strong> no blood vessels, <strong>(2)</strong> no organelles or nuclei in mature fibres, <strong>(3)</strong> short-range crystallin protein order (proteins packed so regularly that they scatter light destructively — paradoxically creating transparency).</p>
  <p class="n-mech-text" style="margin-top:12px">The <strong>Na⁺/K⁺-ATPase pump</strong> on epithelial cells maintains low intracellular sodium. If this fails (diabetes, ischaemia, toxic), sodium accumulates → osmotic water influx → fibres swell → cortical opacification (cataract).</p>
  <div class="n-trap"><div class="n-trap-badge wrong">Trap</div><div class="n-trap-text"><div class="n-trap-wrong">The lens makes its own nutrients</div><div class="n-trap-truth">It doesn't. All nutrition comes by diffusion from the aqueous humour. This is why any process reducing aqueous flow — or changing aqueous composition — affects lens health.</div></div></div>
</div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">Test whether this note actually landed. 5 questions. No pressure.</div>
  <div class="n-note-end-cta-arrow">&#8594;</div>
</div></div>`;

NOTE_CONTENT.cataract = `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Lens Pathology</div>
  <div class="n-hero-title">Catar<em>acts</em></div>
  <div class="n-hero-sub">Nuclear &nbsp;·&nbsp; Cortical &nbsp;·&nbsp; Posterior Subcapsular</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">What it is</div><div class="n-snap-text">Any opacity of the crystalline lens. The <strong>type tells you the cause</strong>. The <strong>location tells you the symptoms</strong>. Age-related nuclear sclerosis is the most common cause of visual impairment worldwide.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The key distinction</div><div class="n-snap-text"><strong>Nuclear</strong>: far &gt; near initially (myopic shift). <strong>PSC</strong>: near &gt; far, worst in bright light (pupil constriction). <strong>Cortical</strong>: glare and scatter. Location = symptoms.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Cataract surgery (phacoemulsification + IOL) is the <strong>most common elective operation</strong> globally. Understanding types guides counselling, prognosis, and identifying the underlying cause.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Nuclear Sclerotic Cataract</span><span class="n-section-tag">most common · age-related</span></div>
  <div class="n-mech-text"><strong>Mechanism:</strong> Lifelong addition of cortical fibres compresses the nucleus. Oxidative cross-linking of crystallin proteins causes yellowing (nuclear sclerosis) progressing to brunescence (brown) in advanced cases.</div>
  <div class="n-mech-step" style="margin-top:16px"><div class="n-mech-dot d1">Sx</div><div class="n-mech-body"><div class="n-mech-cause">Symptoms</div><div class="n-mech-text">Gradual blur at all distances. Colour desaturation (yellowing filter). Early: <strong>'second sight'</strong> — the myopic shift from increased nuclear refractive index temporarily improves near vision without glasses. Monocular diplopia.</div></div></div>
  <div class="n-pearl"><div class="n-pearl-num">Pearl</div><div class="n-pearl-body">'Second sight' is a <strong>warning sign, not reassurance</strong>. The patient feels their vision has improved — in fact they have developed significant lens-induced myopia. The nuclear cataract will progress.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Posterior Subcapsular Cataract</span><span class="n-section-tag">steroids · diabetes · radiation</span></div>
  <div class="n-mech-text"><strong>Mechanism:</strong> Aberrant migration of lens epithelial cells to the posterior pole. They form large, irregular 'bladder cells' (Wedl cells) that scatter light maximally because they sit <strong>exactly in the axial visual path</strong>.</div>
  <div class="n-flag-item" style="margin-top:12px"><span class="n-flag-icon"><svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="1.5" fill="#c8452a"/><text x="5" y="8" font-size="7" fill="white" text-anchor="middle" font-family="monospace">!</text></svg></span><div class="n-flag-text"><strong>Causes to know:</strong> Long-term systemic or topical steroids · Diabetes · Ionising radiation · Uveitis · Myotonic dystrophy. In a young patient with PSC — always ask about steroids.</div></div>
  <div class="n-mech-text" style="margin-top:12px"><strong>Symptoms:</strong> Worst in bright light (pupil constricts → forces light through the opacity). Reading more affected than distance. Glare, haloes. Progresses faster than nuclear cataract.</div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Phacoemulsification</span><span class="n-section-tag">how surgery works</span></div>
  <div class="n-algo"><div class="n-algo-row"><div class="n-algo-body"><strong>1. Capsulorhexis</strong> — circular tear in the anterior capsule to create an opening.</div></div><div class="n-algo-row"><div class="n-algo-body"><strong>2. Hydrodissection</strong> — fluid injected to separate lens from capsule.</div></div><div class="n-algo-row"><div class="n-algo-body"><strong>3. Phacoemulsification</strong> — ultrasonic probe emulsifies and aspirates the lens nucleus.</div></div><div class="n-algo-row"><div class="n-algo-body"><strong>4. IOL implantation</strong> — foldable intraocular lens placed inside the remaining posterior capsule.</div></div></div>
  <div class="n-trap" style="margin-top:16px"><div class="n-trap-badge wrong">Complication</div><div class="n-trap-text"><div class="n-trap-wrong">Posterior capsule rupture</div><div class="n-trap-truth">Allows vitreous prolapse into anterior chamber → raised IOP, retinal traction, risk of retinal detachment and cystoid macular oedema. The most feared intraoperative complication.</div></div></div>
</div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">Test whether this note actually landed. 5 questions. No pressure.</div>
  <div class="n-note-end-cta-arrow">&#8594;</div>
</div></div>`;

NOTE_CONTENT.cornea = `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Emergency</div>
  <div class="n-hero-title">Corneal<br><em>Infections</em></div>
  <div class="n-hero-sub">Bacterial &nbsp;·&nbsp; HSV &nbsp;·&nbsp; Fungal &nbsp;·&nbsp; Acanthamoeba</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The rule</div><div class="n-snap-text"><strong>Painful red eye + white corneal opacity = corneal ulcer until proven otherwise.</strong> Urgent slit-lamp examination and corneal scrape for microbiology. Delayed treatment = corneal perforation.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Risk factors</div><div class="n-snap-text"><strong>Contact lens wear</strong> is the dominant risk factor in developed countries — especially extended wear and sleeping in lenses. Creates a hypoxic, microtrauma-rich environment at the corneal surface.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Corneal ulcers can perforate within <strong>24–48 hours</strong> (Pseudomonas). Scarring causes permanent visual loss. Getting the organism right — and not starting steroids blindly — determines outcome.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Bacterial Keratitis</span><span class="n-section-tag">contact lens · rapid</span></div>
  <div class="n-mech-text"><strong>Key organisms:</strong> <strong>Pseudomonas aeruginosa</strong> (contact lens — produces proteases that liquefy stroma within 24–48h), Staphylococcus aureus (trauma, dry eye), Streptococcus pneumoniae.</div>
  <div class="n-mech-text" style="margin-top:10px"><strong>Presentation:</strong> Severe pain, photophobia, discharge, vision loss. Dense white/grey stromal infiltrate with overlying epithelial defect (stains with fluorescein). Hypopyon in severe cases.</div>
  <div class="n-mech-text" style="margin-top:10px"><strong>Treatment:</strong> Hourly topical fluoroquinolone (ciprofloxacin or ofloxacin) initially. Corneal scrape for MC&S before starting. Remove contact lenses permanently until healed.</div>
  <div class="n-trap"><div class="n-trap-badge wrong">Do not</div><div class="n-trap-text"><div class="n-trap-wrong">Start topical steroids empirically</div><div class="n-trap-truth">Steroids in bacterial keratitis suppress immunity and accelerate stromal destruction. Only add under specialist supervision once infection is controlled and organism identified.</div></div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">HSV Keratitis</span><span class="n-section-tag">dendritic ulcer · steroid danger</span></div>
  <div class="n-mech-text">HSV-1 replicates in corneal epithelial cells, spreads laterally creating a branching <strong>dendritic ulcer</strong> with terminal end bulbs — pathognomonic on fluorescein staining.</div>
  <div class="n-diff-card" style="margin-top:14px"><div class="n-diff-card-name">Epithelial keratitis</div><div class="n-diff-card-key">Dendritic ulcer · topical aciclovir · NO steroids</div></div>
  <div class="n-diff-card"><div class="n-diff-card-name">Stromal (disciform) keratitis</div><div class="n-diff-card-key">Immune-mediated disc-shaped oedema · steroids WITH antiviral cover</div></div>
  <div class="n-pearl"><div class="n-pearl-num">Pearl</div><div class="n-pearl-body">Steroids are <strong>lethal in epithelial HSV</strong> — they enable viral replication and drive invasion into the stroma. But in immune stromal keratitis (disciform), steroids are the treatment, always under antiviral cover. The distinction is everything.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Acanthamoeba Keratitis</span><span class="n-section-tag">ring infiltrate · agonising pain</span></div>
  <div class="n-mech-text"><strong>Classic history:</strong> Contact lens wearer + freshwater exposure (river, lake, tap water). The protozoan exists as trophozoites (active) and cysts (dormant, treatment-resistant).</div>
  <div class="n-mech-text" style="margin-top:10px"><strong>Distinctive features:</strong> <strong>(1)</strong> Ring-shaped stromal infiltrate — immune reaction around trophozoites. <strong>(2)</strong> Excruciating pain disproportionate to signs — Acanthamoeba tracks along corneal nerves (perineural invasion). <strong>(3)</strong> Often initially misdiagnosed as HSV.</div>
  <div class="n-mech-text" style="margin-top:10px"><strong>Treatment:</strong> PHMB (polyhexamethylene biguanide) + propamidine (Brolene). Intensive drops for months. The cyst form resists almost everything — treatment must be prolonged and cysticidal.</div>
</div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">Test whether this note actually landed. 5 questions. No pressure.</div>
  <div class="n-note-end-cta-arrow">&#8594;</div>
</div></div>`;

NOTE_CONTENT.retina = `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Anatomy</div>
  <div class="n-hero-title">The<br><em>Retina</em></div>
  <div class="n-hero-sub">10 Layers &nbsp;·&nbsp; Rods &amp; Cones &nbsp;·&nbsp; Macula &amp; Fovea</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">What it is</div><div class="n-snap-text">A 10-layered sheet of neural tissue lining the posterior two-thirds of the eye. It converts light into electrical signals. The retina is <strong>embryologically brain tissue</strong> — an outgrowth of the diencephalon.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The key zones</div><div class="n-snap-text"><strong>Macula:</strong> central 5mm, responsible for fine detail and colour. <strong>Fovea:</strong> central 1.5mm pit, densely packed cones only — highest acuity. <strong>Optic disc:</strong> no photoreceptors = blind spot.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Why it matters</div><div class="n-snap-text">Understanding retinal layers makes every fundoscopy finding logical — haemorrhage shape indicates layer, exudate type indicates vessel permeability, pallor indicates ischaemia depth.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">Rods vs Cones</span><span class="n-section-tag">distribution and function</span></div>
  <div class="n-diff-card"><div class="n-diff-card-name">Rods (~120 million)</div><div class="n-diff-card-key">Peripheral retina · Low light (scotopic) · Motion detection · Single pigment (rhodopsin)</div></div>
  <div class="n-diff-card"><div class="n-diff-card-name">Cones (~6 million)</div><div class="n-diff-card-key">Concentrated at fovea · Daylight (photopic) · Colour & acuity · Three types (S/M/L wavelength)</div></div>
  <div class="n-pearl"><div class="n-pearl-num">Pearl</div><div class="n-pearl-body">The fovea is <strong>rod-free</strong>. To see a dim star, look slightly off-centre — this uses the rod-rich perifoveal retina. Patients with macular disease often develop this as an involuntary strategy (eccentric fixation).</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">The 10 Layers</span><span class="n-section-tag">outside → inside (RPE to NFL)</span></div>
  <div class="n-algo"><div class="n-algo-row"><div class="n-algo-body"><strong>1. RPE</strong> — Retinal pigment epithelium. Phagocytoses shed outer segments, maintains blood-retina barrier, recycles visual pigment. Inseparable attachment to choroid; weak bond with neurosensory retina = retinal detachment plane.</div></div><div class="n-algo-row"><div class="n-algo-body"><strong>2–3. Photoreceptors</strong> — Outer segments contain stacked membranous discs with visual pigment. Inner segments are metabolically active.</div></div><div class="n-algo-row"><div class="n-algo-body"><strong>4–6. Outer nuclear / plexiform / inner nuclear layers</strong> — Cell bodies and synaptic connections of photoreceptors, bipolar cells, horizontal cells, amacrine cells.</div></div><div class="n-algo-row"><div class="n-algo-body"><strong>7–8. Inner plexiform / Ganglion cell layer</strong> — Synapses between bipolar and ganglion cells. GCL is thickest at the macula — loss here = macular disease.</div></div><div class="n-algo-row"><div class="n-algo-body"><strong>9–10. NFL + ILM</strong> — Nerve fibre layer carries ganglion cell axons to optic disc. ILM = internal limiting membrane.</div></div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Haemorrhage Patterns</span><span class="n-section-tag">shape = layer</span></div>
  <div class="n-mech-step"><div class="n-mech-dot d1">NFL</div><div class="n-mech-body"><div class="n-mech-cause">Flame haemorrhages</div><div class="n-mech-text">Blood in the nerve fibre layer spreads along the axon bundles → flame / splinter shape. Seen in hypertension, CRVO, papilloedema, anaemia.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d2">Deep</div><div class="n-mech-body"><div class="n-mech-cause">Dot & blot haemorrhages</div><div class="n-mech-text">Blood in the inner nuclear / outer plexiform layers is constrained vertically → dot (small) or blot (larger) shape. Classic in diabetic retinopathy and CRVO.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d3">Sub-R</div><div class="n-mech-body"><div class="n-mech-cause">Subretinal haemorrhage</div><div class="n-mech-text">Below the neurosensory retina, above RPE — dark red, no defined edges. Seen in wet AMD (choroidal neovascularisation), trauma.</div></div></div>
</div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">Test whether this note actually landed. 5 questions. No pressure.</div>
  <div class="n-note-end-cta-arrow">&#8594;</div>
</div></div>`;

NOTE_CONTENT.dr = `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Retinal Disease</div>
  <div class="n-hero-title">Diabetic<br><em>Retinopathy</em></div>
  <div class="n-hero-sub">NPDR &nbsp;·&nbsp; PDR &nbsp;·&nbsp; CSMO &nbsp;·&nbsp; Screening</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">Scale</div><div class="n-snap-text">The <strong>most common cause of blindness</strong> in working-age adults in the UK. After 20 years of DM, ~90% of Type 1 and ~60% of Type 2 patients have some retinopathy.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The mechanism</div><div class="n-snap-text">Chronic hyperglycaemia → <strong>pericyte loss</strong> → capillary microaneurysms → ischaemia → <strong>VEGF</strong> → neovascularisation. The same pathway in every patient.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Key distinction</div><div class="n-snap-text"><strong>NPDR:</strong> no new vessels — haemorrhages, exudates, microaneurysms. <strong>PDR:</strong> new vessels (NVD/NVE) — VEGF-driven. <strong>CSMO</strong> can occur at any stage and is the main cause of vision loss.</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">The Progression</span><span class="n-section-tag">pericytes → ischaemia → VEGF</span></div>
  <div class="n-mech-step"><div class="n-mech-dot d1">01</div><div class="n-mech-body"><div class="n-mech-cause">Pericyte loss</div><div class="n-mech-text">Pericytes stabilise capillary walls and regulate blood flow. Hyperglycaemia selectively destroys them → capillary walls weaken.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d2">02</div><div class="n-mech-body"><div class="n-mech-cause">Microaneurysms</div><div class="n-mech-text">First visible sign on fundoscopy — tiny outpouchings of weakened capillary walls. Appear as <strong>dot haemorrhages</strong>, but technically distinct (microaneurysms leak; haemorrhages have burst).</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d3">03</div><div class="n-mech-body"><div class="n-mech-cause">Capillary occlusion → ischaemia</div><div class="n-mech-text">Occlusion causes nerve fibre layer infarcts (<strong>cotton wool spots</strong>) — these indicate pre-proliferative disease. VEGF rises from ischaemic retina.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d4">04</div><div class="n-mech-body"><div class="n-mech-cause">Neovascularisation (PDR)</div><div class="n-mech-text">VEGF drives new vessel formation. <strong>NVD</strong> (new vessels at disc) and <strong>NVE</strong> (elsewhere) are fragile, bleed easily → vitreous haemorrhage, tractional retinal detachment.</div></div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">CSMO</span><span class="n-section-tag">clinically significant macular oedema</span></div>
  <div class="n-mech-text">CSMO can occur at <strong>any stage</strong> of DR and is the principal cause of vision loss. It results from breakdown of the inner blood-retina barrier — fluid accumulates in the macula.</div>
  <div class="n-exam-box" style="margin-top:14px"><div class="n-exam-statement">CSMO definition (ETDRS)</div><div class="n-exam-if">Hard exudates or thickening <strong>within 500μm of the fovea centre</strong>, OR any ring of hard exudates with adjacent thickening within <strong>1 disc diameter of the fovea</strong>.</div></div>
  <div class="n-mech-text" style="margin-top:12px"><strong>Treatment:</strong> Intravitreal anti-VEGF (ranibizumab, aflibercept) first-line. Focal laser for non-centre-involving CSMO. Treat even before vision loss — <strong>prevention &gt; rescue</strong>.</div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Screening</span><span class="n-section-tag">UK programme</span></div>
  <div class="n-algo"><div class="n-algo-row"><div class="n-algo-body"><strong>Type 1 DM:</strong> Screening starts at age 12, or after 2 years of diabetes (whichever is later). Annual digital retinal photography.</div></div><div class="n-algo-row"><div class="n-algo-body"><strong>Type 2 DM:</strong> Screening at diagnosis, then annually.</div></div><div class="n-algo-row"><div class="n-algo-body"><strong>Pregnancy with DM:</strong> Screening at booking (before 13 weeks) and 28 weeks — retinopathy can accelerate rapidly in pregnancy.</div></div></div>
  <div class="n-pearl"><div class="n-pearl-num">Pearl</div><div class="n-pearl-body">Tight glycaemic control reduces risk but can <strong>acutely worsen</strong> retinopathy in the short term when glucose is corrected rapidly (insulin therapy). Annual eye review after starting insulin is essential.</div></div>
</div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">Test whether this note actually landed. 5 questions. No pressure.</div>
  <div class="n-note-end-cta-arrow">&#8594;</div>
</div></div>`;

NOTE_CONTENT.hr = `<div class="n-page"><div class="n-hero-new">
  <div class="n-hero-eyebrow">Ophthalmology · Retinal Disease</div>
  <div class="n-hero-title">Hypertensive<br><em>Retinopathy</em></div>
  <div class="n-hero-sub">KWB Grades I–IV &nbsp;·&nbsp; AV Nipping &nbsp;·&nbsp; Emergency vs Urgency</div>
  <div class="n-snapshot">
    <div class="n-snap-cell"><div class="n-snap-label">The grading</div><div class="n-snap-text"><strong>KWB I:</strong> arteriolar narrowing. <strong>II:</strong> AV nipping. <strong>III:</strong> haemorrhages + cotton wool spots. <strong>IV:</strong> papilloedema. Grade III/IV = hypertensive emergency — end-organ damage.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">The mechanism</div><div class="n-snap-text">Elevated BP causes <strong>arteriosclerosis</strong> (chronic) and <strong>fibrinoid necrosis</strong> (acute severe). Arteriosclerosis thickens vessel walls → compression of veins at crossings → AV nipping → BRVO risk.</div></div>
    <div class="n-snap-cell"><div class="n-snap-label">Key clinical point</div><div class="n-snap-text">KWB III/IV changes = <strong>hypertensive emergency</strong> requiring IV antihypertensives. BP alone without end-organ damage = urgency (oral, over hours to days — avoid rapid correction).</div></div>
  </div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">01</span><span class="n-section-title">KWB Grades</span><span class="n-section-tag">Keith-Wagener-Barker</span></div>
  <div class="n-mech-step"><div class="n-mech-dot d1">I</div><div class="n-mech-body"><div class="n-mech-cause">Arteriolar narrowing</div><div class="n-mech-text">Increased arteriolar tone → reduced A:V ratio (normal ~2:3). Subtle — requires calibrated comparison. The earliest sign, often only visible to specialists.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d2">II</div><div class="n-mech-body"><div class="n-mech-cause">AV nipping (nicking)</div><div class="n-mech-text">Arteriosclerotic arteries thicken → share adventitial sheath with veins at crossings → compresses vein → appears tapered or 'nicked'. Predisposes to <strong>branch retinal vein occlusion (BRVO)</strong>.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d3">III</div><div class="n-mech-body"><div class="n-mech-cause">Haemorrhages + cotton wool spots</div><div class="n-mech-text">Flame haemorrhages from NFL vessel rupture. Cotton wool spots from arteriolar occlusion → nerve fibre infarcts. Also hard exudates from protein leakage. This is <strong>accelerated hypertension</strong>.</div></div></div>
  <div class="n-mech-step"><div class="n-mech-dot d4">IV</div><div class="n-mech-body"><div class="n-mech-cause">Papilloedema</div><div class="n-mech-text">Disc swelling from raised ICP or direct ischaemia of the optic nerve head. This is <strong>malignant hypertension</strong> — a true emergency. IV labetalol or sodium nitroprusside. Target: reduce MAP by <strong>25% in the first hour</strong>.</div></div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">02</span><span class="n-section-title">Vessel Changes</span><span class="n-section-tag">what you see and why</span></div>
  <div class="n-diff-card"><div class="n-diff-card-name">Copper wiring</div><div class="n-diff-card-key">Moderate arteriosclerosis → broader, copper-coloured light reflex from thickened wall</div></div>
  <div class="n-diff-card"><div class="n-diff-card-name">Silver wiring</div><div class="n-diff-card-key">Severe arteriosclerosis → vessel wall so opaque the blood column can no longer be seen — appears silver-white</div></div>
  <div class="n-pearl"><div class="n-pearl-num">Pearl</div><div class="n-pearl-body">AV nipping at crossing points is the mechanism of <strong>BRVO</strong>. The compressed vein develops elevated venous pressure → rupture of small venules → sectoral flame haemorrhages in that vein's territory. KWB II changes are a chronic risk factor for BRVO.</div></div>
</div>
<div class="n-section">
  <div class="n-section-header"><span class="n-section-num">03</span><span class="n-section-title">Emergency vs Urgency</span><span class="n-section-tag">the distinction that matters</span></div>
  <div class="n-exam-box"><div class="n-exam-statement">Hypertensive emergency</div><div class="n-exam-if">Severely elevated BP <strong>+ end-organ damage</strong> (papilloedema, encephalopathy, AKI, aortic dissection, STEMI). Requires IV antihypertensives. Target 25% MAP reduction in 1 hour, not normalisation.</div></div>
  <div class="n-exam-box" style="margin-top:10px"><div class="n-exam-statement">Hypertensive urgency</div><div class="n-exam-if">Severely elevated BP <strong>without</strong> end-organ damage. Oral antihypertensives over hours to days. Avoid rapid reduction — risk of watershed infarction in organs with autoregulation reset to high BP.</div></div>
  <div class="n-trap"><div class="n-trap-badge wrong">Trap</div><div class="n-trap-text"><div class="n-trap-wrong">Normalise BP rapidly in emergencies</div><div class="n-trap-truth">Chronic hypertension resets cerebral autoregulation upward. Rapidly dropping BP to 'normal' causes cerebral hypoperfusion → ischaemic stroke. Reduce MAP by 25% in the first hour, then gradually over 24–48h.</div></div></div>
</div>
<div class="n-note-end-cta" onclick="showVentPopup()">
  <div class="n-note-end-cta-tag">// End of note</div>
  <div class="n-note-end-cta-title">Are you ventilating?</div>
  <div class="n-note-end-cta-sub">Test whether this note actually landed. 5 questions. No pressure.</div>
  <div class="n-note-end-cta-arrow">&#8594;</div>
</div></div>`;

/* ══════════════════════════════════════
   openNote — replaces ophtho-script.js
══════════════════════════════════════ */
function openNote(id) {
  currentNote = id;

  // Build combined NOTES object with content + mcqs
  const content = NOTE_CONTENT[id] || `<div class="n-page"><div class="n-hero-new"><div class="n-hero-title"><em>${id}</em></div><p style="padding:24px;color:var(--ink3)">Note content coming soon.</p></div></div>`;

  document.getElementById('mcontent').innerHTML = content;

  // Auto-tag key elements for breathe/focus mode
  document.querySelectorAll('#mcontent .n-mech-cause, #mcontent .n-section-title, #mcontent .n-pearl-num, #mcontent .n-exam-statement').forEach(el => {
    if (!el.querySelector('.b-key')) el.innerHTML = '<span class="b-key">' + el.innerHTML + '</span>';
  });
  document.querySelectorAll('#mcontent .n-mech-text strong, #mcontent .n-algo-body strong, #mcontent .n-flag-text strong, #mcontent .n-pearl-body strong, #mcontent .n-diag-content strong').forEach(el => {
    el.classList.add('b-key');
  });

  // Reset to note view (hide MCQ)
  document.getElementById('page-note').style.display = 'block';
  document.getElementById('page-mcq').style.display = 'none';

  // Open overlay
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('modal').scrollTop = 0;

  dismissVentPopup();
}
