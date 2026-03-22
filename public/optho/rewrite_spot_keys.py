import re, os
from pathlib import Path

HTML_PATH = '/home/user/workspace/vent_spot_v2/ophtho_index_spot_ai.html'
IMG_DIR   = '/home/user/workspace/vent_spot_v2/ophtho_spot_ai_assets/spot5'

# Image-specific card-back text (HTML allowed). Keep short, descriptive, non-repetitive.
K = {
  # Eyelids
  'eyelids_01_chalazion.png': "Firm, round tarsal swelling with minimal surface erythema.<br>Spot it: Chalazion.<br>Tip: Lid hygiene + warm compress; persistent lesions may need I&C (rule out sebaceous CA if recurrent).",
  'eyelids_02_hordeolum.jpg': "Focal tender pustule at lid margin with surrounding redness.<br>Spot it: Hordeolum (stye).<br>Tip: Warm compress + topical antibiotic if draining; consider preseptal cellulitis if diffuse lid swelling.",
  'eyelids_03_entropion.jpg': "In-turned lid margin—lashes directed toward the cornea (trichiasis risk).<br>Spot it: Entropion.<br>Tip: Lubrication and tape can temporize; definitive repair if corneal staining/ulceration.",
  'eyelids_04_ectropion.jpg': "Everted lower lid with exposed palpebral conjunctiva and tearing (punctum not apposed).<br>Spot it: Ectropion.<br>Tip: Treat exposure with lubricants; refer for oculoplastic correction if persistent.",
  'eyelids_05_blepharitis.jpg': "Greasy scales/crusts along lashes with inflamed lid margin (MGD look).<br>Spot it: Blepharitis.<br>Tip: Lid scrubs + warm compress; consider topical azithro/doxy for posterior bleph.",

  # Conjunctiva
  'conj_01_subconj.png': "Well-demarcated bright red patch under the conjunctiva with a clear cornea.<br>Spot it: Subconjunctival haemorrhage.<br>Tip: Reassure; check BP/anticoagulants and ask about trauma/contact lens.",
  'conj_02_pterygium.jpg': "Triangular fibrovascular growth crossing the limbus onto cornea (nasal wedge).<br>Spot it: Pterygium.<br>Tip: UV protection + lubricants; excise if visual axis/astigmatism or recurrent inflammation.",
  'conj_03_pinguecula.jpg': "Yellow, slightly raised conjunctival lesion adjacent to limbus without corneal invasion.<br>Spot it: Pinguecula.<br>Tip: Usually benign—manage dryness/UV; redness episodes = pingueculitis.",
  'conj_04_episcleritis.jpg': "Sectoral superficial redness—looks localized rather than diffuse, with no corneal haze.<br>Spot it: Episcleritis.<br>Tip: Mild pain/foreign-body sensation; blanching with phenylephrine helps distinguish from scleritis.",
  'conj_05_vernal.jpg': "Large ‘cobblestone’ papillae on upper tarsal conjunctiva (allergic pattern).<br>Spot it: Vernal/GPC (cobblestone).<br>Tip: Treat with antihistamine/mast-cell stabilizer; shield ulcer risk in severe VKC.",

  # Cornea
  'cornea_01_hsv.png': "Branching fluorescein-staining epithelial defect with terminal bulbs (dendrite).<br>Spot it: HSV dendrite.<br>Tip: Use topical/oral antivirals; avoid steroids until epithelium healed.",
  'cornea_02_hsv2.jpg': "Classic dendritic ulcer—thin branching pattern on corneal surface with epithelial staining.<br>Spot it: HSV dendrite (example).<br>Tip: Reduced corneal sensation supports HSV; debride gently if needed and treat promptly.",
  'cornea_03_ulcer.jpg': "Focal white stromal infiltrate with surrounding injection—cornea is not crystal clear.<br>Spot it: Bacterial corneal ulcer.<br>Tip: Contact lens user? Start intensive topical antibiotics + urgent ophthalmology.",
  'cornea_04_ulcer2.jpg': "Large central opacity/infiltrate with severe conjunctival injection (vision-threatening location).<br>Spot it: Corneal ulcer (severe).<br>Tip: Culture if possible before antibiotics; treat as emergency to prevent perforation.",
  'cornea_05_ulcer3.jpg': "Dense corneal infiltrate with an inferior hypopyon (layered WBC in AC).<br>Spot it: Corneal ulcer + hypopyon.<br>Tip: Endophthalmitis risk—same-day specialist care and broad coverage.",

  # Uveitis
  'uveitis_01_kp.png': "Fine keratic precipitates scattered on corneal endothelium (anterior uveitis clue).<br>Spot it: Keratic precipitates.<br>Tip: Look for cells/flare in AC; ask about HLA‑B27 symptoms (back pain, psoriasis, IBD).",
  'uveitis_02_kp2.jpg': "Large ‘mutton-fat’ KPs—greasy white deposits suggest granulomatous uveitis.<br>Spot it: Keratic precipitates (slit).<br>Tip: Consider sarcoid/TB/syphilis; check IOP (can be high in uveitis).",
  'uveitis_03_hypopyon.jpg': "Horizontal white fluid level in anterior chamber (hypopyon) with red eye.<br>Spot it: Hypopyon.<br>Tip: DDx includes severe uveitis vs infectious keratitis/endophthalmitis—urgent evaluation.",
  'uveitis_04_hypopyon2.jpg': "Prominent hypopyon with intense inflammation—classic ‘pus level’ appearance.<br>Spot it: Hypopyon uveitis.<br>Tip: Behçet can cause recurrent hypopyon; always exclude infection before steroids.",
  'uveitis_05_kp3.png': "Inferior endothelial deposits forming a triangular distribution (Arlt’s triangle pattern).<br>Spot it: KP / corneal deposits.<br>Tip: Treat underlying anterior uveitis; monitor for posterior synechiae.",

  # Glaucoma
  'glauc_01_cupping.png': "Large cup-to-disc ratio with thinning of the neuroretinal rim (vertical elongation).<br>Spot it: Glaucomatous cupping.<br>Tip: Correlate with IOP + RNFL/OCT + visual fields—photo alone isn’t diagnosis.",
  'glauc_02_compare.jpg': "Side-by-side discs—one with a much larger cup and rim loss compared to normal.<br>Spot it: Cupping: normal vs glaucoma.<br>Tip: Asymmetry >0.2 CDR between eyes is suspicious (if disc sizes similar).",
  'glauc_03_disc.jpg': "Excavated optic nerve head with rim notching and visible laminar dots/cupping depth.<br>Spot it: Pathologic disc cupping.<br>Tip: Look for disc hemorrhage and RNFL wedge defects on red-free imaging.",
  'glauc_04_eyerounds.jpg': "Disc photo emphasizing cup-to-disc estimation—cup occupies most of the disc area.<br>Spot it: Optic cup size.<br>Tip: Always account for disc size (large discs can have physiologic large cups).",
  'glauc_05_cupping2.jpg': "Advanced cupping with near-total rim loss (‘bean-pot’ appearance) and pallor at edges.<br>Spot it: Advanced cupping.<br>Tip: Advanced disease can have central vision preserved until late—fields are essential.",

  # Retina basics
  'retina_01_normal.jpg': "Healthy fundus: sharp disc margins, normal vessel caliber, flat macula with foveal reflex.<br>Spot it: Normal fundus.<br>Tip: Use this as baseline—then hunt for hemorrhages, exudates, edema, and pallor.",
  'retina_02_crvo.jpg': "Diffuse retinal hemorrhages in all quadrants with dilated tortuous veins (‘blood & thunder’).<br>Spot it: CRVO (blood and thunder).<br>Tip: Check for macular edema/neovascularization; manage systemic vascular risks.",
  'retina_03_npdr.jpg': "Multiple dot‑blot hemorrhages and microaneurysms without neovascular fronds (non‑proliferative).<br>Spot it: NPDR.<br>Tip: Severity staging matters—refer if severe NPDR or any macular involvement.",
  'retina_04_rd.jpg': "Grey, corrugated elevated retina with folds—looks ‘billowing’ rather than flat.<br>Spot it: Retinal detachment.<br>Tip: Ask about flashes/floaters/curtain; protect vision with urgent retina assessment.",
  'retina_05_submac.jpg': "Dark red subretinal blood at/near the macula obscuring underlying detail.<br>Spot it: Subretinal haemorrhage.<br>Tip: Think wet AMD/trauma—time-sensitive referral (anti‑VEGF ± pneumatic displacement).",

  # Retinal detachment deck
  'rd_01_pack.png': "Bullous, wrinkled detached retina superiorly with a clear horseshoe tear at the edge.<br>Spot it: Rhegmatogenous RD.<br>Tip: Break + subretinal fluid = emergency—same-day retina referral.",
  'rd_02_tear.jpg': "Horseshoe-shaped retinal tear with rolled flap; local elevation suggests early detachment.<br>Spot it: Retinal tear.<br>Tip: Treatable before full RD—laser/cryo urgently if symptomatic.",
  'rd_03_macula_off.jpg': "Macula region appears elevated/blurred—central detail is lost compared with disc clarity (macula-off).<br>Spot it: RD (macula off).<br>Tip: Visual prognosis depends on macula status—don’t delay surgical evaluation.",
  'rd_04_aao.jpg': "Greenish wide-field image showing a large elevated, rippled area of detached retina temporal to disc.<br>Spot it: Rhegmatogenous RD.<br>Tip: Look for the break at the border of detachment; symptoms guide urgency.",
  'rd_05_wide.jpg': "Wide-field montage with a large superior ‘bubble’ of detached retina overhanging the posterior pole.<br>Spot it: Rhegmatogenous RD.<br>Tip: Avoid heavy activity; shield the eye and arrange urgent retina review.",

  # Diabetic retinopathy
  'dr_01_pdr.png': "Fine frond-like new vessels with scattered hemorrhages—proliferative pattern.<br>Spot it: Proliferative DR.<br>Tip: Neovascularization = treat (PRP/anti‑VEGF) to prevent VH/tractional RD.",
  'dr_02_pdr2.jpg': "Neovascular tufts at/near the disc margin (NVD) with fragile vessels.<br>Spot it: PDR (example).<br>Tip: Ask about sudden floaters—vitreous hemorrhage is common in PDR.",
  'dr_03_prp.jpg': "Multiple pale laser burns in the mid‑periphery—classic post‑PRP scars.<br>Spot it: Post-PRP scars.<br>Tip: PRP reduces neovascular drive; monitor for macular edema and visual field constriction.",
  'dr_04_prp2.jpg': "Wide-field view showing extensive scatter photocoagulation spots sparing the macula.<br>Spot it: PRP (wide-field).<br>Tip: Adequate PRP coverage matters—under-treated PDR can still progress.",
  'dr_05_before_after.png': "Before/after panel—regressed neovascularization and less active hemorrhage after treatment.<br>Spot it: PDR treated.<br>Tip: Control HbA1c/BP/lipids—systemic control directly affects progression.",

  # AMD
  'amd_01_wet.png': "Macular subretinal hemorrhage/exudation—dark red patches in the macula region.<br>Spot it: Wet AMD.<br>Tip: New distortion/central blur needs urgent OCT + anti‑VEGF.",
  'amd_02_wet2.jpg': "Grey‑green subretinal lesion with surrounding hemorrhage—suggests active CNV.<br>Spot it: Wet AMD (example).<br>Tip: Treat early—delays worsen scar formation and permanent vision loss.",
  'amd_03_labels.jpg': "Annotated fundus highlighting macular hemorrhage/fluid—classic wet AMD teaching image.<br>Spot it: AMD with haemorrhage.<br>Tip: Differentiate from macroaneurysm—history and OCT/FA help.",
  'amd_04_small.jpg': "Small but dense macular bleed—central lesion stands out against orange fundus background.<br>Spot it: Wet AMD (example).<br>Tip: Even small subfoveal hemorrhage can drop vision fast—same-week retina care.",
  'amd_05_oct.png': "Fundus + OCT: OCT shows subretinal/intraretinal fluid consistent with active CNV.<br>Spot it: AMD (fundus + OCT).<br>Tip: Fluid on OCT is the treatment target—follow response after injections.",

  # Vascular
  'vasc_01_crao.jpg': "Pale ischemic retina with a distinct cherry‑red spot at the fovea.<br>Spot it: CRAO (cherry red).<br>Tip: Treat as an ocular stroke—urgent embolic/vascular workup.",
  'vasc_02_crvo.jpg': "Widespread hemorrhages with venous engorgement—venous occlusion pattern.<br>Spot it: CRVO.<br>Tip: Screen for HTN/DM/glaucoma; watch for neovascularization and edema.",
  'vasc_03_brao.jpg': "Sectoral retinal whitening in one arterial territory with a demarcated boundary.<br>Spot it: BRAO.<br>Tip: Like CRAO, needs stroke-style evaluation for embolic source.",
  'vasc_04_cattle.png': "Segmented ‘boxcarring’/cattle‑trucking in retinal arteries—flow is interrupted.<br>Spot it: CRAO (cattle trucking).<br>Tip: Poor perfusion sign; document onset time and start urgent stroke pathway.",
  'vasc_05_htn.jpg': "AV nicking, arteriolar narrowing, and cotton‑wool spots—hypertensive changes.<br>Spot it: HTN retinopathy.<br>Tip: Severe findings can signal malignant HTN—measure BP and escalate care.",

  # Optic nerve
  'on_01_pap.png': "Swollen optic disc with blurred margins and loss of physiologic cup.<br>Spot it: Papilloedema.<br>Tip: Bilateral disc swelling = raised ICP until proven otherwise—urgent neuro workup.",
  'on_02_compare.jpg': "Comparison image set showing disc edema—margin blurring and elevation vs baseline.<br>Spot it: Disc edema (examples).<br>Tip: Differentiate papilledema vs optic neuritis—pain with EOM and unilateral favors neuritis.",
  'on_03_pap2.jpg': "Disc edema with peripapillary hemorrhages/exudates—more severe papilledema look.<br>Spot it: Papilloedema (example).<br>Tip: Check BP too—malignant HTN can mimic with disc swelling.",
  'on_04_grades.jpg': "Photo series demonstrating Frisén grading of papilledema severity.<br>Spot it: Papilloedema grades.<br>Tip: Use grading to monitor response to treatment (e.g., IIH).",
  'on_05_pap3.png': "Elevated hyperemic disc with indistinct borders—another papilledema example.<br>Spot it: Papilloedema (example).<br>Tip: Ask about headache, transient visual obscurations, pulsatile tinnitus.",

  # Red eye deck
  'redeye_01_viral.jpg': "Diffuse conjunctival injection with watery discharge/follicular look (not purulent).<br>Spot it: Viral conjunctivitis.<br>Tip: Highly contagious—hand hygiene; check for preauricular node.",
  'redeye_02_subconj.jpg': "Flat red patch under conjunctiva with otherwise quiet eye—no corneal haze.<br>Spot it: Subconjunctival haemorrhage.<br>Tip: Usually painless; pain/photophobia suggests a different diagnosis.",
  'redeye_03_episcleritis.jpg': "Localized sectoral redness—superficial vessels rather than deep violaceous hue.<br>Spot it: Episcleritis.<br>Tip: Mild tenderness; severe boring pain suggests scleritis.",
  'redeye_04_hypopyon.jpg': "Red eye with visible hypopyon—white meniscus in the anterior chamber.<br>Spot it: Hypopyon.<br>Tip: Think severe keratitis/uveitis—urgent slit-lamp exam and cultures as needed.",
  'redeye_05_ulcer.jpg': "Cornea appears cloudy/white at the lesion with intense injection—ulcer appearance.<br>Spot it: Corneal ulcer.<br>Tip: Contact lens + pain = emergency; stop lenses and start intensive therapy.",

  # Neuro-ophthalmology
  'neuro_01_atrophy.jpg': "Chalky pale optic disc with reduced vascularity—atrophic look rather than swollen.<br>Spot it: Optic atrophy.<br>Tip: Correlate with RAPD, color vision loss, and field defects to localize cause.",
  'neuro_02_pale.gif': "Pale disc compared with surrounding retina—neuroretinal rim looks washed out.<br>Spot it: Pale optic nerve.<br>Tip: Ask about prior optic neuritis/ischemic episodes; check temporal pallor.",
  'neuro_03_cup.jpg': "Deep cup with relatively pale rim—can mimic glaucoma vs compressive neuropathy.<br>Spot it: Cupping.<br>Tip: If pallor > cupping or marked RAPD, think non-glaucomatous optic neuropathy.",
  'neuro_04_pap.jpg': "Disc swelling with blurred margins—papilledema-type appearance.<br>Spot it: Papilloedema.<br>Tip: Evaluate urgently if bilateral; unilateral swelling has a different differential.",
  'neuro_05_compare.jpg': "Comparison image: normal disc vs glaucomatous disc—rim loss vs healthy rim.<br>Spot it: Normal vs glaucoma.<br>Tip: Use disc photos with OCT RNFL and fields for a complete glaucoma assessment.",

  # Cataract
  'cat_01_nsc.jpg': "Amber/brown nucleus—nuclear sclerosis gives a ‘brunescent’ central lens.<br>Spot it: Nuclear sclerosis.<br>Tip: Causes myopic shift (‘second sight’) and gradual blur; surgery when function-limiting.",
  'cat_02_white.jpg': "White, opaque lens filling the pupil—mature cataract appearance.<br>Spot it: Mature (white) cataract.<br>Tip: If pain/high IOP with white cataract, consider phacolytic/phacomorphic glaucoma.",
  'cat_03_psc.jpg': "Central posterior plaque just behind the pupil—PSC pattern (glare, near-vision worse).<br>Spot it: Posterior subcapsular.<br>Tip: Common with steroids/DM; symptoms disproportionate to size because it sits on visual axis.",
  'cat_04_mature.jpg': "Dense lens opacity obscuring red reflex—advanced cataract with minimal fundus view.<br>Spot it: Mature cataract.<br>Tip: Assess for phacodonesis/zonular weakness before surgery (trauma, pseudoexfoliation).",
  'cat_05_slit.jpg': "Slit-lamp view showing nuclear opacity within lens substance (central densification).<br>Spot it: Nuclear cataract (slit).<br>Tip: Document grade and impact on acuity; counsel about surgery risks/benefits.",

  # Hypertensive retinopathy deck
  'hr_01_pack.png': "Arteriolar narrowing with AV crossing changes plus cotton‑wool spots/hemorrhages.<br>Spot it: Hypertensive retinopathy.<br>Tip: Severe grades suggest end-organ damage—urgent systemic BP management.",
  'hr_02_labeled.jpg': "Labeled image highlighting AV nicking, hemorrhages, and exudates (teaching layout).<br>Spot it: Hypertensive retinopathy.<br>Tip: Use labels to learn the pattern; correlate with BP and renal/cardiac status.",
  'hr_03_fundus.jpg': "Generalized arteriolar attenuation and copper‑wiring appearance of vessels.<br>Spot it: Hypertensive changes.<br>Tip: Chronic HTN causes vessel wall thickening; manage long-term vascular risk.",
  'hr_04_eyerounds.jpg': "Hard exudates + cotton‑wool spots scattered with vessel narrowing—more severe disease.<br>Spot it: Hypertensive retinopathy.<br>Tip: Look for optic disc edema—malignant HTN can present with swelling.",
  'hr_05_eyewiki.jpg': "Severe retinopathy pattern (grade 3–4): hemorrhages/exudates ± disc edema.<br>Spot it: HTN retinopathy (grade 3-4).<br>Tip: Treat as medical emergency—rapid BP control and systemic evaluation.",
}


def esc_js_single(s: str) -> str:
  # Escape for JS single-quoted string
  return s.replace('\\', '\\\\').replace("'", "\\'")


def main():
  html = Path(HTML_PATH).read_text(encoding='utf-8')

  start = html.find('const SPOT_DATA = {')
  end   = html.find('\n};\n\n/* ── Spot open/close ── */')
  if start == -1 or end == -1:
    raise SystemExit('Could not locate SPOT_DATA block')

  block = html[start:end]

  # Replace each card's key based on its img basename
  card_pat = re.compile(
    r"img:\s*'(?P<img>[^']+)'\s*,\s*\n\s*dx:\s*'(?P<dx>[^']*)'\s*,\s*key:\s*'(?P<key>(?:\\'|[^'])*)'"
  )

  def repl(m):
    img_path = m.group('img')
    base = os.path.basename(img_path)
    if base not in K:
      raise KeyError(f'Missing key text for {base}')
    new_key = esc_js_single(K[base])
    return (
      f"img: '{img_path}',\n"
      f"      dx: '{m.group('dx')}', key: '{new_key}'"
    )

  new_block = card_pat.sub(repl, block)

  new_html = html[:start] + new_block + html[end:]
  Path(HTML_PATH).write_text(new_html, encoding='utf-8')

  # sanity: ensure all 75 basenames covered
  imgs = sorted([p.name for p in Path(IMG_DIR).iterdir() if p.is_file()])
  missing = [b for b in imgs if b not in K]
  extra   = [b for b in K.keys() if b not in imgs]
  print('images:', len(imgs))
  print('keys  :', len(K))
  print('missing:', missing)
  print('extra  :', extra)

if __name__ == '__main__':
  main()
