/* Check-list d'indications de dépistage. Tout est local (aucun envoi réseau).
   Modèle : chaque examen a une liste d'indications (cases à cocher).
   - auto(p) => true  : indication remplie par les données patient (pré-cochée)
   - auto(p) => false : données patient ne remplissent pas cette indication
   - auto absent      : indication clinique à vérifier manuellement
   L'examen est "INDIQUÉ" dès qu'une indication est cochée. */

const P = () => {
  const age = parseInt(document.getElementById('pat-age').value, 10);
  const sex = document.getElementById('pat-sex').value;
  const tabac = document.getElementById('pat-tabac').value;
  const pa = parseFloat(document.getElementById('pat-pa').value);
  const dfg = parseFloat(document.getElementById('pat-dfg').value);
  const imc = parseFloat(document.getElementById('pat-imc').value);
  const ldl = parseFloat(document.getElementById('pat-ldl').value);
  return {
    age: isNaN(age) ? null : age,
    sex,
    tabac,                                  // 'jamais' | 'sevré' | 'actif' | ''
    pa: isNaN(pa) ? null : pa,
    fumeur: tabac === 'actif' || tabac === 'sevré',
    grosFumeur: (tabac === 'actif' || tabac === 'sevré') && !isNaN(pa) && pa >= 20,
    diabete: document.getElementById('pat-diabete').value === 'oui',
    hta: document.getElementById('pat-hta').value === 'oui',
    ic: document.getElementById('pat-ic').value === 'oui',
    dfg: isNaN(dfg) ? null : dfg,
    rac: (() => {
      const raw = (document.getElementById('pat-rac').value || '').trim().toLowerCase();
      if (!raw) return null;
      if (raw.includes('non calc') || raw === 'nc') return 'nc';
      if (raw.startsWith('<')) return 0;
      const v = parseFloat(raw.replace(',', '.'));
      return isNaN(v) ? null : v;
    })(),
    imc: isNaN(imc) ? null : imc,
    ldl: isNaN(ldl) ? null : ldl,
  };
};

const between = (p, a, b) => p.age !== null && p.age >= a && p.age <= b;
const isF = p => p.sex === 'F';
const isM = p => p.sex === 'M';

// ---------- KDIGO ----------
function kdigoCategory(p) {
  if (p.dfg === null || p.dfg === undefined) return null;
  if (p.dfg >= 90) return 'G1';
  if (p.dfg >= 60) return 'G2';
  if (p.dfg >= 45) return 'G3a';
  if (p.dfg >= 30) return 'G3b';
  if (p.dfg >= 15) return 'G4';
  return 'G5';
}
function albuminuriaCategory(p) {
  if (p.rac === 'nc') return 'A1';
  if (p.rac === null || p.rac === undefined) return null;
  if (p.rac < 3) return 'A1';
  if (p.rac < 30) return 'A2';
  return 'A3';
}
const KDIGO_RISK = {
  G1:  { A1: 1, A2: 2, A3: 3 },
  G2:  { A1: 1, A2: 2, A3: 3 },
  G3a: { A1: 2, A2: 3, A3: 4 },
  G3b: { A1: 3, A2: 4, A3: 4 },
  G4:  { A1: 4, A2: 4, A3: 4 },
  G5:  { A1: 4, A2: 4, A3: 4 },
};
const KDIGO_RISK_LABEL = { 1: 'Risque bas', 2: 'Risque modérément élevé', 3: 'Risque élevé', 4: 'Risque très élevé' };
const KDIGO_RISK_COLOR = { 1: '#c8e6c9', 2: '#fff9c4', 3: '#ffe0b2', 4: '#ffcdd2' };

function kdigoStage(p) {
  const g = kdigoCategory(p);
  const a = albuminuriaCategory(p);
  if (!g) return null;
  const risk = (a && KDIGO_RISK[g][a]) || null;
  return { g, a, risk };
}

function renderKdigo(p) {
  const panel = document.getElementById('kdigo-panel');
  const st = kdigoStage(p);
  if (!st) { panel.innerHTML = ''; return; }
  const riskTxt = st.risk ? KDIGO_RISK_LABEL[st.risk] : 'RAC manquant — à doser';
  const color = st.risk ? KDIGO_RISK_COLOR[st.risk] : '#e0e0e0';
  let html = `<div class="kdigo-box" style="border-left: 6px solid ${color}">
    <strong>Stade KDIGO : ${st.g}${st.a ? ' ' + st.a : ''}</strong>
    <span>DFG ${p.dfg} mL/min/1,73 m²${p.rac === 'nc' ? ' — RAC non calculable (microalbuminurie sous le seuil de dosage : catégorie A1)' : (p.rac !== null && p.rac !== undefined ? ' — RAC ' + String(p.rac).replace('.', ',') + ' mg/mmol' : ' — RAC non renseigné : à doser si MRC suspectée')}</span>
    <span style="background:${color};padding:2px 8px;border-radius:10px;font-size:0.85em">${riskTxt}</span>`;
  if (p.dfg < 60 || (st.a && st.a !== 'A1')) {
    html += `<span>Maladie rénale chronique ${p.dfg < 60 ? '(DFG < 60)' : ''}${p.dfg < 60 && st.a && st.a !== 'A1' ? ' + ' : ''}${st.a && st.a !== 'A1' ? '(' + st.a + ')' : ''} — chronicité > 3 mois à confirmer</span>`;
  }
  html += `</div>`;
  panel.innerHTML = html;
}

// ---------- Décision IEC/ARA2 & iSGLT2 (KDIGO 2024 / HAS / remboursement) ----------
function iecara2Advice(p) {
  const reasons = [];
  let ok = false;
  let remb = [];
  let ci = [];
  const st = kdigoStage(p);

  if (p.hta) {
    ok = true;
    reasons.push('HTA : IEC ou ARA2 en 1re intention (recommandation HAS)');
    remb.push('HTA : traitement remboursé (génériques, 65 %)');
  }
  if (p.rac !== null && p.rac >= 3 && p.dfg !== null) {
    ok = true;
    reasons.push(`Albuminurie (RAC ≥ 3 mg/mmol) ${st && st.a ? '(' + st.a + ') ' : ''}: IEC/ARA2 systématique, à dose maximale tolérée (KDIGO) — néphroprotection même sans HTA`);
  }
  if (p.diabete && (p.hta || (p.rac !== null && p.rac >= 3))) {
    ok = true;
    reasons.push('Diabète + HTA ou albuminurie : IEC/ARA2 recommandé (protection rénale et cardiaque)');
  }
  if (p.ic) {
    ok = true;
    reasons.push('Insuffisance cardiaque : IEC/ARA2 (ou ARNI selon FEVG) au bilan thérapeutique');
    remb.push('Insuffisance cardiaque : indication remboursée');
  }
  if (p.rac !== null && p.rac >= 30) {
    reasons.push('Albuminurie sévère (RAC ≥ 30 mg/mmol, A3) : IEC/ARA2 à pleine dose + avis néphrologue recommandé');
  }
  if (p.rac !== null && p.rac >= 3) {
    remb.push('Néphropathie (protéinurie ≥ 0,5 g/24 h ou RAC ≥ 3 mg/mmol) : indication remboursée');
  }
  if (p.dfg !== null && p.dfg < 15) {
    ci.push('DFG < 15 : prescription à discuter en néphrologie (dialyse imminente) — prudence');
  }
  if (p.rac === 'nc') {
    reasons.push('RAC dosé mais non calculable : microalbuminurie sous le seuil de détection = catégorie A1 (albuminurie normale) — pas d\'indication liée à l\'albuminurie');
  }
  if (p.rac === null && p.dfg !== null && p.dfg < 60) {
    reasons.push('⚠ RAC non renseigné : doser le rapport albuminurie/créatinurie pour statuer');
  }
  return { ok, reasons, remb, ci };
}

function isglt2Advice(p) {
  const reasons = [];
  let ok = false;
  let drug = null;
  let remb = [];
  let ci = [];

  if (p.diabete) {
    ok = true;
    drug = drug || 'iSGLT2 antidiabétique (AMM DT2)';
    reasons.push('Diabète de type 2 : iSGLT2 en complément du régime — bénéfice cardiovasculaire et rénal (HAS : 2e intention si besoin après/metformine, 1re intention si MRC/IC/risque CV élevé)');
    remb.push('DT2 : remboursé si HbA1c > objectif sous traitement optimisé');
  }
  if (p.ic) {
    ok = true;
    drug = 'dapagliflozine ou empagliflozine (AMM insuffisance cardiaque)';
    reasons.push('Insuffisance cardiaque (HFrEF/HFmrEF, avec ou sans diabète) : iSGLT2 recommandé — réduit hospitalisations et mortalité (ESC)');
    remb.push('IC (FEVG réduite) : indication remboursée (dapagliflozine 10 mg, empagliflozine 10 mg)');
  }
  if (p.dfg !== null && p.dfg >= 20 && p.dfg < 45) {
    ok = true;
    drug = drug || 'empagliflozine 10 mg (AMM MRC, sans albuminurie requise)';
    reasons.push('MRC DFG 20–45 : empagliflozine indiquée même sans albuminurie (KDIGO 2024)');
    remb.push('Empagliflozine 10 mg : inscrite LPPR pour MRC (remboursement 65 %) ; dapagliflozine : MRC avec albuminurie');
  }
  if (p.rac !== null && p.rac >= 20 && p.dfg !== null && p.dfg >= 25) {
    ok = true;
    drug = drug || 'dapagliflozine 10 mg (AMM MRC)';
    reasons.push('Albuminurie ≥ 20 mg/mmol avec DFG ≥ 25 : dapagliflozine indiquée (KDIGO 2024) — ralentit la progression');
    remb.push('Dapagliflozine 10 mg : inscrite pour MRC avec albuminurie (remboursement 65 %)');
  }
  if (p.dfg !== null && p.dfg < 20) {
    ci.push('DFG < 20 : initiation d\'un iSGLT2 pour la MRC non recommandée (discuter en néphrologie, poursuite possible si déjà sous traitement)');
  }
  ci.push('Contre-indications : diabète de type 1, antécédent d\'acidocétose, grossesse/allaitement ; arrêt 3–4 j avant chirurgie/jeûne/maladie aiguë (sick day rules)');
  ci.push('Effets indésirables à anticiper : infections génitales, déplétion volémique — hydratation suffisante');
  return { ok, drug, reasons, remb, ci };
}

function glp1Advice(p) {
  const reasons = [];
  let amm = false;
  let rembOk = false;
  let remb = [];
  let ci = [];
  const imcOk = p.imc !== null;

  // ----- AMM obésité (Wegovy / Mounjaro) -----
  if (imcOk && p.imc >= 30) {
    amm = true;
    reasons.push(`Obésité (IMC ${String(p.imc).replace('.', ',')} ≥ 30 kg/m²) : AMM Wegovy® (sémaglutide) / Mounjaro® (tirzépatide) — prescription possible par tout médecin depuis le 23/06/2025 (ANSM)`);
  } else if (imcOk && p.imc >= 27 && (p.hta || p.diabete || (p.ldl !== null && p.ldl >= 1.6))) {
    amm = true;
    reasons.push(`Surpoids (IMC ${String(p.imc).replace('.', ',')} ≥ 27) + comorbidité liée au poids (${p.hta ? 'HTA' : ''}${p.diabete ? (p.hta ? ', ' : '') + 'diabète' : ''}${p.ldl !== null && p.ldl >= 1.6 ? (p.hta || p.diabete ? ', ' : '') + 'dyslipidémie' : ''}) : AMM remplie`);
  }

  // ----- Indication médicale renforcée (bénéfice CV/métabolique) -----
  if (p.diabete && imcOk && p.imc >= 27) {
    reasons.push('DT2 avec surpoids/obésité : GLP-1 préféré si objectif pondéral prioritaire ou échec metformine/inhibiteurs SGLT2 — bénéfice HbA1c et poids (HAS)');
  }
  if (p.imc !== null && p.imc >= 30 && p.hta) {
    reasons.push('Obésité + HTA : la perte de poids améliore le contrôle tensionnel — indication médicale renforcée');
  }

  // ----- Diabète de type 2 : AMM propre (Ozempic® sémaglutide, Mounjaro®/Tirzépatide) -----
  if (p.diabete) {
    amm = true;
    reasons.push('Diabète de type 2 (adulte) : AMM Ozempic® (sémaglutide) / Mounjaro® (tirzépatide) en 2e intention après metformine, ou 1re intention si IMC ≥ 35, inefficacité/contre-indication de la metformine, ou risque CV élevé (SMDR HAS)');
    remb.push('DT2 : remboursé 65 % si échec d\'au moins 2 antidiabétiques oraux bien conduits (dont metformine), HbA1c > 8 % ; ou d\'emblée si IMC ≥ 35, insuffisance rénale (DFG < 60), risque CV élevé, ou intolérance metformine');
  }

  // ----- Remboursement obésité (arrêtés 2025, effectifs 15/06/2026) -----
  if (imcOk && p.imc >= 40) {
    rembOk = true;
    remb.push(`Obésité massive (IMC ≥ 40) : remboursement 65 % possible (Wegovy®/Mounjaro®)`);
  } else if (imcOk && p.imc >= 35 && (p.diabete || p.hta || (p.ldl !== null && p.ldl >= 1.6))) {
    rembOk = true;
    remb.push(`Obésité (IMC ≥ 35) + comorbidité sévère (${p.diabete ? 'diabète' : ''}${p.hta ? (p.diabete ? ', ' : '') + 'HTA' : ''}) : remboursement 65 % possible — les comorbidités retenues sont : HTA mal contrôlée, DT2, dyslipidémie non contrôlée, SAS sévère, AOMI, arthrose invalidante, stéatohépatite`);
  }
  if (rembOk) {
    remb.push('Conditions à réunir : échec d\'une prise en charge nutritionnelle documentée (< 5 % de perte à 6 mois), régime hypocalorique + activité physique, primo-prescription en structure spécialisée (CSO, CHU, nutrition/endocrino) puis renouvellement possible par le MT, justificatif ameli pro obligatoire');
  } else if (amm && !p.diabete && imcOk && p.imc >= 27 && p.imc < 35) {
    remb.push('IMC < 35 sans comorbidité sévère : AMM remplie mais PAS de remboursement prévu (arrêtés 28/05/2026 : IMC ≥ 40, ou ≥ 35 + comorbidité sévère) — prescription sur fonds privés à envisager avec le patient');
  }
  if (p.diabete && rembOk) remb.push('Si les critères DT2 sont remplis, la voie « diabète » est généralement la plus simple (remboursement standard, pas de primo-prescription CSO)');

  // ----- Contre-indications / précautions -----
  ci.push('CONTRE-INDICATIONS : diabète de type 1, pancréatite antérieure, antécédent personnel/familial de cancer médullaire de la thyroïde ou NEM 2, grossesse/projet de grossesse/allaitement (contraception efficace nécessaire)');
  ci.push('Précautions : gastroparésie sévère, rétinopathie diabétique (surveillance initiale sous sémaglutide), troubles alimentaires ; effets : nausées/vomissements (titration lente), interaction avec contraceptifs oraux (tirzépatide)');
  ci.push('Information patient : arrêt 1 semaine avant chirurgie/anesthésie (sémaglutide) ; reprise alimentaire progressive post-opératoire (risque d\'inhalation rapporté)');

  return { ok: amm, reasons, remb, ci };
}

function renderRx(p) {
  const panel = document.getElementById('rx-panel');

  const makeBox = (open, color, icon, name, verdict, verdictColor, detail) => `
    <div class="rx-box rx-collapse${open ? ' open' : ''}" style="border-left:6px solid ${color}" data-rx-open="${open ? '1' : '0'}">
      <button type="button" class="rx-head" aria-expanded="${open}">
        <span class="rx-name">${icon} ${name}</span>
        <span class="rx-head-right"><span class="rx-verdict" style="background:${verdictColor}">${verdict}</span><span class="rx-chevron">&#9656;</span></span>
      </button>
      <div class="rx-detail"><div class="rx-detail-inner">${detail}</div></div>
    </div>`;

  const ie = iecara2Advice(p);
  const ieStatus = ie.ok ? 'INDIQU\u00c9' : (p.hta || p.rac !== null ? 'Pas d\'indication' : '\u2014');
  const ieColor = ie.ok ? '#c8e6c9' : '#ffcdd2';
  const ieDetail = `
    ${ie.reasons.map(r => `<div class="rx-reason">\u2713 ${escapeHtml(r)}</div>`).join('')}
    ${ie.remb.length ? `<div class="rx-remb">\ud83d\udcb6 Remboursement : ${escapeHtml(ie.remb.join(' ; '))}</div>` : ''}
    ${ie.ci.map(c => `<div class="rx-ci">\u26a0 ${escapeHtml(c)}</div>`).join('')}
    ${!ie.ok && !ie.reasons.length ? '<div class="rx-reason">Aucun crit\u00e8re : HTA absente, pas d\'albuminurie \u2265 3 mg/mmol, pas d\'IC. Pas d\'indication \u00e0 ce jour.</div>' : ''}`;

  const gl = isglt2Advice(p);
  const glStatus = gl.ok ? 'INDIQU\u00c9' : (p.dfg !== null || p.diabete || p.ic ? 'Pas d\'indication' : '\u2014');
  const glColor = gl.ok ? '#c8e6c9' : '#ffcdd2';
  const glDetail = `
    ${gl.drug ? `<div class="rx-reason">\u2192 ${escapeHtml(gl.drug)}</div>` : ''}
    ${gl.reasons.map(r => `<div class="rx-reason">\u2713 ${escapeHtml(r)}</div>`).join('')}
    ${gl.remb.length ? `<div class="rx-remb">\ud83d\udcb6 Remboursement : ${escapeHtml(gl.remb.join(' ; '))}</div>` : ''}
    ${gl.ci.map(c => `<div class="rx-ci">\u26a0 ${escapeHtml(c)}</div>`).join('')}
    ${!gl.ok && !gl.reasons.length ? '<div class="rx-reason">Aucun crit\u00e8re : pas de DT2, pas d\'IC, DFG \u2265 45 ou albuminurie < 20 mg/mmol.</div>' : ''}`;

  const gp = glp1Advice(p);
  const gpStatus = gp.ok ? 'INDIQU\u00c9' : (p.imc !== null || p.diabete ? 'Pas d\'indication' : '\u2014');
  const gpColor = gp.ok ? '#c8e6c9' : '#ffcdd2';
  const gpDetail = `
    ${gp.reasons.map(r => `<div class="rx-reason">\u2713 ${escapeHtml(r)}</div>`).join('')}
    ${gp.remb.length ? `<div class="rx-remb">\ud83d\udcb6 Remboursement : ${escapeHtml(gp.remb.join(' ; '))}</div>` : ''}
    ${gp.ci.map(c => `<div class="rx-ci">\u26a0 ${escapeHtml(c)}</div>`).join('')}
    ${!gp.ok && !gp.reasons.length ? '<div class="rx-reason">Aucun crit\u00e8re : pas de DT2, IMC < 27 ou sans comorbidit\u00e9. Pas d\'indication \u00e0 ce jour.</div>' : ''}`;

  const openState = window._rxOpen || {};
  panel.innerHTML =
    makeBox(!!openState.ie, ie.ok ? '#2e7d32' : '#e53935', '\ud83d\udc8a', 'IEC / ARA2', ieStatus, ieColor, ieDetail) +
    makeBox(!!openState.gl, gl.ok ? '#2e7d32' : '#e53935', '\ud83e\uddea', 'iSGLT2 (gliflozine)', glStatus, glColor, glDetail) +
    makeBox(!!openState.gp, gp.ok ? '#2e7d32' : '#e53935', '\ud83e\udd8e', 'GLP-1 / tirz\u00e9patide', gpStatus, gpColor, gpDetail);
}

document.addEventListener('click', e => {
  const head = e.target.closest('.rx-head');
  if (!head) return;
  const box = head.closest('.rx-collapse');
  const willOpen = box.dataset.rxOpen !== '1';
  const key = box.querySelector('.rx-name').textContent.includes('IEC') ? 'ie'
    : box.querySelector('.rx-name').textContent.includes('iSGLT2') ? 'gl' : 'gp';
  window._rxOpen = window._rxOpen || {};
  window._rxOpen[key] = willOpen;
  box.dataset.rxOpen = willOpen ? '1' : '0';
  box.classList.toggle('open', willOpen);
  head.setAttribute('aria-expanded', willOpen);
});

// ---------- Examens & indications ----------
const EXAMS = [
{
  id: 'osteo', cat: 'chronique', title: 'Ost\u00e9odensitom\u00e9trie (crit\u00e8res HAS / Assurance Maladie)', icon: '\ud83e\uddb4',
  indications: [
    { id: 'osteo-patho', why: 'Certaines maladies ou traitements fragilisent l\'os \u00e0 tout \u00e2ge : mesurer la densit\u00e9 osseuse permet de d\u00e9cider un traitement protecteur.', label: 'Pathologie ou traitement inducteur d\'ost\u00e9oporose, quel que soit l\u00e2ge et le sexe : corticoth\u00e9rapie \u2265 3 mois cons\u00e9cutifs, hyperthyro\u00efde non trait\u00e9e, hypogonadisme, m\u00e9nopause pr\u00e9coce (< 40 ans), malabsorption, polyarthrite, immobilisation prolong\u00e9e...', req: 'Remboursable 70 %' },
    { id: 'osteo-fracture', why: 'Une fracture apr\u00e8s un choc minime signe un os fragile : la densitom\u00e9trie confirme l\'ost\u00e9oporose et permet d\'\u00e9viter la fracture suivante, souvent plus grave.', label: 'Fracture de faible \u00e9nergie (poignet, vert\u00e8bre, f\u00e9mur, c\u00f4tes...) apr\u00e8s 50 ans, sans traumatisme majeur', req: 'Remboursable 70 %' },
    { id: 'osteo-femme-fdr', why: 'Chez la femme m\u00e9nopaus\u00e9e, ces facteurs justifient une mesure de la densit\u00e9 osseuse, rembours\u00e9e par l\'Assurance Maladie.', label: 'Femme m\u00e9nopaus\u00e9e avec facteur de risque : ant\u00e9c\u00e9dent de fracture du col du f\u00e9mur chez un parent au 1er degr\u00e9, IMC < 19 kg/m\u00b2, m\u00e9nopause pr\u00e9coce (< 40 ans)', req: 'Remboursable 70 %', auto: p => isF(p) && (p.imc !== null && p.imc < 19) },
    { id: 'osteo-arret-trt', why: '\u00c0 l\'arr\u00eat d\'un traitement anti-ost\u00e9oporotique, contr\u00f4ler la densit\u00e9 osseuse guide la d\u00e9cision de reprise ou de surveillance.', label: '\u00c0 l\'arr\u00eat du traitement anti-ost\u00e9oporotique (hors arr\u00eat pr\u00e9coce pour effet ind\u00e9sirable), chez la femme m\u00e9nopaus\u00e9e', req: 'Remboursable 70 %' },
    { id: 'osteo-controle', why: 'Si la premi\u00e8re densitom\u00e9trie \u00e9tait normale (ou ost\u00e9op\u00e9nie) sans traitement, un contr\u00f4le peut \u00eatre justifi\u00e9 si de nouveaux facteurs de risque apparaissent.', label: '2e examen chez la femme m\u00e9nopaus\u00e9e 3\u20135 ans apr\u00e8s un 1er examen normal/ost\u00e9op\u00e9nie sans traitement, si nouveaux facteurs de risque', req: 'Remboursable 70 %' },
    { id: 'osteo-homme', why: 'Chez l\'homme, il n\'existe pas de d\u00e9pistage par l\'\u00e2ge : la densitom\u00e9trie ne se justifie qu\'avec une cause ou une fracture.', label: 'Homme : pas de d\u00e9pistage syst\u00e9matique \u2014 densitom\u00e9trie seulement si pathologie inductrice (cortico\u00efdes, hypogonadisme...) ou fracture de faible \u00e9nergie', req: 'Remboursable si cause' },
    { id: 'osteo-info-age', label: 'INFO : la HAS ne recommande PAS de d\u00e9pistage syst\u00e9matique par l\'\u00e2ge (les seuils \u00ab femme 65 ans / homme 70 ans \u00bb sont am\u00e9ricains, USPSTF). Sans facteur de risque, l\'examen n\'est pas rembours\u00e9', req: 'Non rembours\u00e9 seul' },
  ],
},
{
  id: 'bpco', cat: 'chronique', title: 'Spirométrie (dépistage BPCO)', icon: '🫁',
  indications: [
    { id: 'bpco-pa', why: 'Un tabagisme important peut abêger les bronches sans symptème évident : la spirométrie le dépiste tôt et permet de ralentir la maladie.', label: 'Tabagisme ≥ 20 paquets-années et ≥ 40 ans', auto: p => p.grosFumeur && p.age !== null && p.age >= 40 },
    { id: 'bpco-toux', why: 'Une toux chronique chez un fumeur peut cacher une BPCO : la respiration mesurée permet de la détecter.', label: 'Toux chronique et/ou expectorations chroniques' },
    { id: 'bpco-dyspnee', why: 'Un essoufflement anormal doit être exploré : la spirométrie évalue le souffle et oriente le traitement.', label: 'Dyspnée, sifflements, essoufflement anormal' },
    { id: 'bpco-exac', why: 'Des infections respiratoires à répétition suggèrent une BPCO : la diagnostiquer permet de mieux la traiter.', label: 'Exacerbations respiratoires à répétition' },
    { id: 'bpco-expo', why: 'L\'exposition professionnelle aux poussières abêger les bronches comme le tabac : un contrôle du souffle s\'impose.', label: 'Exposition professionnelle (poussières, fumées, solvants)' },
  ],
},
{
  id: 'aaa', cat: 'chronique', title: 'Échographie aorte abdominale (anévrisme)', icon: '🩸',
  indications: [
    { id: 'aaa-fumeur', why: 'Le tabac fragilise la paroi de l\'aorte : une échographie simple détecte un anévrisme avant qu\'il ne se rompe.', label: 'Fumeur ou sevré, 65–85 ans', auto: p => p.fumeur && between(p, 65, 85) },
    { id: 'aaa-fam', why: 'Un anévrisme familial augmente votre risque : une échographie l\'élimine.', label: 'Antécédent familial d\'anévrisme aortique' },
    { id: 'aaa-arteriopathie', why: 'Quand les artères sont déjà malades, l\'aorte peut être touchée aussi : à vérifier par échographie.', label: 'Artériopathie obliterante / coronaropathie évoluée' },
  ],
},
{
  id: 'poumon', cat: 'neo', title: 'Scanner thoracique low-dose (cancer du poumon)', icon: '🫁',
  indications: [
    { id: 'poumon-tabac', why: 'Un tabagisme important augmente fortement le risque de cancer du poumon : un scanner faible dose le détecte à un stade guérissable.', label: 'Fumeur ou sevré, 50–74 ans, ≥ 20 paquets-années', auto: p => p.grosFumeur && between(p, 50, 74) },
    { id: 'poumon-expo', why: 'L\'exposition à l\'amiante ou à la silice augmente le risque de cancer du poumon : un scanner de dépistage s\'en assure.', label: 'Exposition professionnelle (amiante, silice, métaux)' },
    { id: 'poumon-pilotes', label: 'INFO : pas encore de dépistage organisé national — programme pilote IMPULSION (INCa) lancé en mai 2026, limité à 5 régions pilotes : Île-de-France, Hauts-de-France, Pays de la Loire, PACA, Auvergne-Rhône-Alpes. Inscription via le 34 33 ou depistage-cancer-poumon.fr (scanner remboursé 100 %). Hors ces régions : pas de dépistage organisé, scanner seulement sur orientation individuelle', req: 'Info' },
  ],
},
{
  id: 'ccr', cat: 'neo', title: 'Test immunologique dans les selles / coloscopie (cancer colorectal)', icon: '🧪',
  indications: [
    { id: 'ccr-age', why: 'Entre 50 et 74 ans, le risque de cancer du colon augmente : le test sur selles le détecte tôt, à un stade guérissable dans 9 cas sur 10.', label: '50–74 ans (dépistage organisé, tous les 2 ans)', auto: p => between(p, 50, 74) },
    { id: 'ccr-fam', why: 'Un cas familial proche augmente votre risque : une coloscopie permet de vérifier l\'intérieur du colon.', label: 'Antécédent familial au 1er degré (colon, rectum), polypose, HNPCC/Lynch' },
    { id: 'ccr-signes', why: 'Un saignement ou un trouble du transit récent doit être exploré sans attendre.', label: 'Signes d\'alerte : rectorragies, trouble du transit récent, douleurs' },
  ],
},
{
  id: 'mammo', cat: 'neo', title: 'Mammographie (cancer du sein)', icon: '🎗️',
  indications: [
    { id: 'mammo-age', why: 'Le dépistage régulier du sein par mammographie permet de détecter un cancer de petite taille, mieux traité.', label: 'Femme 50–74 ans (dépistage organisé, tous les 2 ans)', auto: p => isF(p) && between(p, 50, 74) },
    { id: 'mammo-fam', why: 'Des antécédents familiaux augmentent le risque : une surveillance rapprochée s\'impose.', label: 'Antécédent familial (sein/ovaire) ou mutation BRCA' },
    { id: 'mammo-radio', why: 'Une irradiation du thorax dans l\'enfance augmente le risque de cancer du sein : surveillance renforcée nécessaire.', label: 'Irradiation thoracique (Hodgkin...) ou hyperplasie atypique' },
  ],
},
{
  id: 'frottis', cat: 'neo', title: 'Frottis / test HPV (cancer du col)', icon: '🌸',
  indications: [
    { id: 'frottis-age', why: 'Le frottis/HPV détecte des lésions précancéreuses du col, faciles à traiter avant qu\'elles ne deviennent un cancer.', label: 'Femme 25–65 ans (HPV tous les 5 ans, 25–30 ans : frottis tous les 3 ans)', auto: p => isF(p) && between(p, 25, 65) },
    { id: 'frottis-jamais', why: 'Un dépistage non à jour laisse le temps à une lésion d\'évoluer : à réaliser sans tarder.', label: 'Jamais de dépistage ou dépistage non à jour' },
  ],
},
{
  id: 'psa', cat: 'neo', title: 'PSA (cancer de la prostate) — décision partagée', icon: '♂️',
  indications: [
    { id: 'psa-age', why: 'Après 50 ans, une simple prise de sang peut révéler un problème de prostate — à discuter avec votre médecin des bénéfices et limites.', label: 'Homme ≥ 50 ans : dépistage individuel possible, en informer bénéfices/risques', auto: p => isM(p) && p.age !== null && p.age >= 50 },
    { id: 'psa-fam', why: 'Un cancer de la prostate chez un proche augmente votre risque : le dépistage peut commencer plus tôt.', label: 'Antécédent familial (père, frère) avant 65 ans : dès 45 ans' },
    { id: 'psa-sympt', why: 'Des troubles urinaires ou un saignement imposent une évaluation rapide.', label: 'Symptômes urinaires (hématurie, troubles mictionnels)' },
  ],
},
{
  id: 'diabete', cat: 'chronique', hideIf: p => p.diabete, title: 'Glycémie à jeun / HbA1c (diabète de type 2)', icon: '🍪',
  indications: [
    { id: 'diabete-age', why: 'Le diabète peut passer inaperçu des années : une glycémie le dépiste avant les complications (yeux, reins, cœur).', label: '45–75 ans (tous les 3 ans)', auto: p => between(p, 45, 75) },
    { id: 'diabete-obesite', why: 'Le surpoids favorise le diabète : une glycémie vérifie que le sucre est bien régulé.', label: 'Surpoids/obésité (IMC ≥ 25, tour de taille élevé) + sédentarité', auto: p => p.imc !== null && p.imc >= 25 },
    { id: 'diabete-hta', why: 'L\'HTA et le diabète vont souvent ensemble et abêgement les mêmes organes : à vérifier.', label: 'HTA ou dyslipidémie', auto: p => p.hta },
    { id: 'diabete-fam', why: 'Un diabète familial augmente votre risque : une glycémie s\'en assure.', label: 'Antécédent familial de diabète type 2' },
    { id: 'diabete-gest', why: 'Le diabète gestationnel ou certaines origines augmentent le risque : à vérifier par une prise de sang.', label: 'Diabète gestationnel, ou origine à risque (Afrique subsaharienne, Asie, Inde)' },
    { id: 'diabete-connu', why: 'Un diabète mal équilibré abêgement progressivement yeux, reins et nerfs : contrôler l\'HbA1c permet d\'adapter le traitement.', label: 'Diabète déjà connu : HbA1c à jour (objectif individualisé, en général < 7 %)', auto: p => p.diabete },
  ],
},
{
  id: 'foei', cat: 'chronique', title: 'Fond d\'œil (rétinopathie diabétique)', icon: '👁️',
  indications: [
    { id: 'foei-diabete', why: 'Le diabète peut abêger la rétine sans symptôme jusqu\'à des lésions sévères : un fond d\'œil annuel le détecte à temps.', label: 'Diabète de type 2 : examen annuel', auto: p => p.diabete },
    { id: 'foei-dmla', why: 'La DMLA peut rendre la vision centrale basse progressivement : détectée tôt, des traitements ralentissent son évolution.', label: 'Sujet ≥ 60 ans : DMLA (acuité visuelle, Ophtalmo si signes)', auto: p => p.age !== null && p.age >= 60 },
  ],
},
{
  id: 'hcv', cat: 'chronique', title: 'Sérologie hépatite C', icon: '🩺',
  indications: [
    { id: 'hcv-age', why: 'L\'hépatite C peut dormir des dizaines d\'années : une sérologie une fois dans la vie l\'élimine, et elle se guérit aujourd\'hui.', label: '18–59 ans : au moins une fois dans la vie', auto: p => between(p, 18, 59) },
    { id: 'hcv-risque', why: 'Ces situations exposent au virus de l\'hépatite C : une simple prise de sang l\'élimine.', label: 'Usage de drogues IV/intranasal, transfusion avant 1992, tatouage/percing, prison' },
  ],
},
{
  id: 'ecg', cat: 'chronique', title: 'ÉCG', icon: '💓',
  indications: [
    { id: 'ecg-fa', why: 'Après 65 ans, la fibrillation auriculaire est fréquente et peut causer un AVC sans symptôme : un ECG la détecte et un traitement protège.', label: '≥ 65 ans : dépistage de la fibrillation atriale (palpation du pouls ; ECG si irrégulier ou suspicion)', auto: p => p.age !== null && p.age >= 65 },
    { id: 'ecg-hta', why: 'L\'HTA fatigue le cœur : l\'ECG vérifie qu\'il n\'a pas souffert (hypertrophie, trouble du rythme).', label: 'HTA : ECG dans le bilan initial / suivi', auto: p => p.hta },
    { id: 'ecg-cardio', why: 'Une cardiopathie connue se surveille : l\'ECG vérifie la stabilité électrique du cœur.', label: 'Coronaropathie, valvulopathie ou cardiopathie connue : ECG de suivi' },
    { id: 'ecg-sympt', why: 'Ces symptômes peuvent traduire un trouble du rythme ou un problème coronarien : l\'ECG est l\'examen de première intention.', label: 'Symptômes : douleur thoracique, palpitations, dyspnée, lipothymie/syncope' },
    { id: 'ecg-sport', why: 'Avant un effort intensif, l\'ECG élimine une anomalie cardiaque rare mais grave.', label: 'Bilan avant reprise d\'activité physique intense / compétition (> 35 ans)' },
    { id: 'ecg-preop', why: 'Avant une chirurgie, l\'ECG vérifie que le cőur supporte l\'anesthésie.', label: 'Bilan pré-opératoire (chirurgie à risque cardiovasculaire)' },
    { id: 'ecg-trt', why: 'Certains traitements peuvent perturber le cőur : l\'ECG surveille leur bonne tolérance.', label: 'Surveillance d\'un traitement cardiotoxique ou d\'un trouble ionique' },
  ],
},
{
  id: 'tsa', cat: 'chronique', title: 'Doppler des troncs supra-aortiques (TSA)', icon: '🩸',
  indications: [
    { id: 'tsa-souffle', why: 'Un souffle sur les carotides peut traduire un rétrécissement : le Doppler l\'évalue avant un AVC.', label: 'Souffle carotidien audible à l\'auscultation' },
    { id: 'tsa-ait', why: 'Après un AIT, les carotides doivent être explorées en urgence : une sténose serrée se corrige.', label: 'AIT, AVC, amaurose transitoire : bilan urgent' },
    { id: 'tsa-aomi', why: 'Quand une artère est malade, les autres le sont souvent : le Doppler TSA s\'en assure.', label: 'Artériopathie connue (coronaropathie, AOMI, anévrisme) : recherche de sténose associée' },
    { id: 'tsa-radio', why: 'Une radiothérapie cervicale accélère le vieillissement des carotides : à surveiller.', label: 'Radiothérapie cervicale antérieure' },
    { id: 'tsa-fa', why: 'La fibrillation auriculaire envoie des caillots vers le cerveau : le Doppler complète l\'évaluation du risque.', label: 'Fibrillation atriale (évaluation embolique)' },
    { id: 'tsa-preop', why: 'Avant une chirurgie cardiaque, l\'état des carotides conditionne la sécurité de l\'intervention.', label: 'Bilan pré-opératoire (chirurgie à risque, CEC)' },
    { id: 'tsa-signe', label: 'Le dépistage systématique de la sténose carotidienne asymptomatique n\'est PAS recommandé (HAS) — cliquez uniquement si point ci-dessus' },
  ],
},
{
  id: 'aomi', cat: 'chronique', title: 'Doppler artériel des membres inférieurs (AOMI)', icon: '🦵',
  indications: [
    { id: 'aomi-claudication', why: 'La douleur à la marche traduit souvent une artère rétrécie : le Doppler confirme et évalue le risque cardiaque associé.', label: 'Claudication intermittente : douleur de marche soulagée par l\'arrêt' },
    { id: 'aomi-tabac', why: 'Le tabac bouche les artères des jambes : un simple IPS (prise de tension aux chevilles) le dépiste avant les symptômes.', label: 'Fumeur ou sevré ≥ 50 ans : dépistage (IPS)', auto: p => p.fumeur && p.age !== null && p.age >= 50 },
    { id: 'aomi-diabete', why: 'Le diabète abêger silencieusement les artères des jambes : un IPS annuel prévient ulcères et amputations.', label: 'Diabète ≥ 50 ans (ou ≥ 40 ans avec autre facteur de risque) : dépistage annuel par IPS', auto: p => p.diabete && p.age !== null && p.age >= 50 },
    { id: 'aomi-hta', why: 'HTA + cholestérol bouche les artères : l\'IPS vérifie la circulation des jambes.', label: 'HTA + dyslipidémie : dépistage si contexte', auto: p => p.hta && p.ldl !== null && p.ldl >= 1.6 },
    { id: 'aomi-signes', why: 'Ces signes traduisent une ischémie sévère : une prise en charge urgente est nécessaire.', label: 'Signes d\'ischémie : ulcère, gangrène, douleur de décubitus, abolition d\'un pouls' },
    { id: 'aomi-preop', why: 'Avant une chirurgie majeure, la circulation des jambes doit être évaluée.', label: 'Bilan pré-opératoire / avant chirurgie vasculaire ou orthopédique majeure' },
  ],
},
{
  id: 'sas', cat: 'chronique', title: 'Syndrome d\'apnées du sommeil (STOP-BANG)', icon: '😴', scoring: 'stopbang',
  indications: [
    { id: 'sas-s', why: 'Des ronflements forts avec pauses respiratoires fatiguent le cœur et le cerveau : les traiter améliore durablement l\'énergie et protège le cőur.', label: 'S — Ronflements forts (observés par l\'entourage)' },
    { id: 'sas-t', why: 'La somnolence diurne d\'un SAS augmente le risque d\'accidents et d\'HTA : un enregistrement du sommeil confirme le diagnostic.', label: 'T — Fatigue diurne excessive / somnolence (endormissements)' },
    { id: 'sas-o', why: 'Des apnées observées signent presque toujours un SAS : à confirmer pour le traiter efficacement.', label: 'O — Apnées observées pendant le sommeil' },
    { id: 'sas-p', why: 'L\'HTA est souvent liée au SAS : le traiter améliore la tension.', label: 'P — Pression artérielle élevée (HTA traitée ou non)', auto: p => p.hta },
    { id: 'sas-b', why: 'L\'obésité abdominale favorise l\'obstruction des voies aériennes pendant le sommeil.', label: 'B — IMC > 35 kg/m²', auto: p => p.imc !== null && p.imc > 35 },
    { id: 'sas-a', why: 'Après 50 ans, le relâchement des tissus augmente le risque d\'apnées.', label: 'A — Âge > 50 ans', auto: p => p.age !== null && p.age > 50 },
    { id: 'sas-n', why: 'Un tour de cou large rétrécit les voies aériennes pendant le sommeil.', label: 'N — Tour de cou > 40 cm' },
    { id: 'sas-g', why: 'Les hommes ont plus souvent d\'apnées du sommeil que les femmes.', label: 'G — Sexe masculin', auto: p => p.sex === 'M' },
  ],
},
];

// ---------- Vaccins ----------
const VACCINS = [
{
  id: 'v-menb', cat: 'vaccinal', title: 'Vaccin méningocoque B (Bexsero®)', icon: '🦠',
  indications: [
    { id: 'v-menb-nour', why: 'Protège le nourrisson des méningites à méningocoque B, graves et imprévisibles.', label: 'Nourrisson (né depuis 2023) : schéma M3, M5, rappel M12', req: 'Obligatoire', auto: p => p.age !== null && p.age < 2 },
    { id: 'v-menb-rat5', why: 'Le rattrapage protège votre enfant avant l\'entrée en collectivité.', label: 'Enfant 2–4 ans révolus non vaccinés : rattrapage transitoire (2 doses)', req: 'Obligatoire', auto: p => p.age !== null && p.age >= 2 && p.age <= 4 },
    { id: 'v-menb-1524', why: 'Les jeunes adultes sont une population à risque d\'infection invasive : la vaccination les protège et réduit le portage.', label: 'Personne de 15 à 24 ans révolus : vaccination à proposer', req: 'Recommandée', auto: p => p.age !== null && p.age >= 15 && p.age <= 24 },
    { id: 'v-menb-risque', why: 'Ces situations exposent aux formes graves : la vaccination est essentielle avec rappels réguliers.', label: 'Personne à risque : déficit en complément / properdine, asplénie, greffe de CSH (rappel tous les 5 ans)', req: 'Recommandée' },
  ],
},
{
  id: 'v-menacwy', cat: 'vaccinal', title: 'Vaccin méningocoque ACWY (Nimenrix® / Menquadfi® / Menveo®)', icon: '🦠',
  indications: [
    { id: 'v-acwy-nour', why: 'Protège contre 4 types de méningocoques (A, C, W, Y) en remplacement du vaccin C seul.', label: 'Nourrisson (né depuis 2023) : dose à 6 mois (Nimenrix) + rappel 12 mois (Nimenrix ou Menquadfi)', req: 'Obligatoire', auto: p => p.age !== null && p.age < 2 },
    { id: 'v-acwy-rat', why: 'Complète la protection contre les méningocoques A, C, W et Y.', label: 'Rattrapage 12–24 mois : 1 dose ACWY ; 2–4 ans révolus non vaccinés : rattrapage transitoire, 1 dose', req: 'Obligatoire', auto: p => p.age !== null && p.age >= 1 && p.age <= 4 },
    { id: 'v-acwy-ado', why: 'Les adolescents sont porteurs et transmetteurs : les vacciner les protège et coupe la transmission.', label: 'Adolescent 11–14 ans : 1 dose, indépendamment du statut vaccinal (campagne collèges)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 11 && p.age <= 14 },
    { id: 'v-acwy-1524', why: 'Une seule dose complète la protection de cette tranche d\'âge à risque.', label: 'Rattrapage 15–24 ans révolus : 1 dose', req: 'Recommandée', auto: p => p.age !== null && p.age >= 15 && p.age <= 24 },
    { id: 'v-acwy-risque', why: 'La vaccination protège des formes graves chez les personnes vulnérables.', label: 'Personne à risque : déficit en complément / properdine, asplénie, greffe de CSH (rappel tous les 5 ans)', req: 'Recommandée' },
  ],
},
{
  id: 'v-grippe', cat: 'vaccinal', title: 'Vaccin grippe saisonnière', icon: '💉',
  indications: [
    { id: 'v-grippe-65', why: 'La grippe après 65 ans peut entraîner une pneumonie ou une décompensation cardiaque : le vaccin évite chaque année hospitalisations et décès.', label: 'Personne ≥ 65 ans : chaque année', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 },
    { id: 'v-grippe-comorb', why: 'Avec une maladie chronique, la grippe décompense la santé : le vaccin protège.', label: 'Comorbidité (diabète, HTA, maladie respiratoire ou cardiaque, obésité, DFG < 60)', req: 'Recommandée', auto: p => p.diabete || p.hta || (p.imc !== null && p.imc >= 30) || (p.dfg !== null && p.dfg < 60) },
    { id: 'v-grippe-grossesse', why: 'Le vaccin protège la maman et transmet des anticorps au bébé.', label: 'Femme enceinte (tout trimestre)' },
  ],
},
{
  id: 'v-pneumo', cat: 'vaccinal', title: 'Vaccin pneumocoque', icon: '💉',
  indications: [
    { id: 'v-pneumo-65', why: 'Le pneumocoque cause pneumonies et méningites : le vaccin protège les plus vulnérables.', label: 'Personne ≥ 65 ans (schéma adapté selon antécédents)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 },
    { id: 'v-pneumo-comorb', why: 'Les maladies chroniques fragilisent face au pneumocoque : la vaccination évite les infections graves.', label: 'Comorbidité avant 65 ans : diabète, maladie respiratoire, cardiaque, rénale (DFG < 60), immunodépression', req: 'Recommandée', auto: p => p.diabete || (p.dfg !== null && p.dfg < 60) },
  ],
},
{
  id: 'v-covid', cat: 'vaccinal', title: 'Vaccin COVID-19 (rappel)', icon: '💉',
  indications: [
    { id: 'v-covid-65', why: 'Le rappel maintient la protection contre les formes graves, qui s\'affaiblit avec le temps.', label: 'Personne ≥ 65 ans et/ou comorbidités : rappel selon recommandations en vigueur', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 || p.diabete || p.hta || (p.imc !== null && p.imc >= 30) },
  ],
},
{
  id: 'v-rsv', cat: 'vaccinal', title: 'Vaccin VRS / RSV (bronchiolite)', icon: '💉',
  indications: [
    { id: 'v-rsv-75', why: 'Le VRS cause des bronchiolites sévères chez les seniors : le vaccin évite hospitalisations et décompensations respiratoires.', label: 'Personne ≥ 75 ans', req: 'Recommandée', auto: p => p.age !== null && p.age >= 75 },
    { id: 'v-rsv-65', why: 'Avec une maladie chronique, l\'infection à VRS peut décompenser la santé : le vaccin protège.', label: 'Personne 65–74 ans avec comorbidité (diabète, HTA, insuffisance respiratoire ou cardiaque, DFG < 60)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 && p.age <= 74 && (p.diabete || p.hta || (p.dfg !== null && p.dfg < 60)) },
    { id: 'v-rsv-femme-enceinte', why: 'La vaccination de la maman protège le nouveau-né dès la naissance via les anticorps transmis.', label: 'Femme enceinte : vaccination de la mère (8e mois de grossesse, selon campagne en cours)' },
  ],
},
{
  id: 'v-zona', cat: 'vaccinal', title: 'Vaccin zona (Shingrix®)', icon: '💉',
  indications: [
    { id: 'v-zona-6574', why: 'Le zona est douloureux et peut laisser des douleurs chroniques : le vaccin réduit fortement ce risque.', label: 'Personne 65–74 ans', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 && p.age <= 74 },
    { id: 'v-zona-5064', why: 'Avec une maladie chronique, le zona est plus fréquent et plus sévère : le vaccin protège.', label: 'Personne 50–64 ans avec comorbidité (diabète, HTA, DFG < 60, immunodépression)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 50 && p.age <= 64 && (p.diabete || p.hta || (p.dfg !== null && p.dfg < 60)) },
  ],
},
{
  id: 'v-dtp', cat: 'vaccinal', title: 'Rappel diphtérie / tétanos / poliomyélite (DTP)', icon: '💉',
  indications: [
    { id: 'v-dtp-adulte', why: 'Le tétanos est mortel et partout (terre, rouille) : le rappel décennal maintient la protection.', label: 'Adulte : rappel dTP tous les 10 ans (ou 20 ans si rappels à jour et primovaccination complète)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 18 },
    { id: 'v-dtp-bles', why: 'Une plaie peut infecter par le tétanos : un rappel récent protège, sinon un rappel urgent est nécessaire.', label: 'Plaie : rappel tétanos si dernier rappel > 10 ans (plaie souillée : > 5 ans)' },
  ],
},
{
  id: 'v-hpv', cat: 'vaccinal', title: 'Vaccin HPV (papillomavirus)', icon: '💉',
  indications: [
    { id: 'v-hpv-1114', why: 'Le vaccin HPV protège contre les cancers du col, de l\'anus et de la gorge, très efficacement à cet âge.', label: 'Adolescent·e 11–14 ans (2 doses)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 11 && p.age <= 14 },
    { id: 'v-hpv-1519', why: 'Le rattrapage reste très protecteur contre les cancers liés aux papillomavirus.', label: 'Rattrapage 15–19 ans (3 doses)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 15 && p.age <= 19 },
  ],
},
{
  id: 'v-hepb', cat: 'vaccinal', title: 'Vaccin hépatite B', icon: '💉',
  indications: [
    { id: 'v-hepb-rat', why: 'L\'hépatite B peut devenir chronique et causer une cirrhose : le vaccin protège à vie.', label: 'Rattrapage jusqu\'à 18 ans révolus', req: 'Recommandée', auto: p => p.age !== null && p.age <= 18 },
    { id: 'v-hepb-risque', why: 'Ces situations exposent au virus : le vaccin évite une infection potentiellement chronique.', label: 'Personne à risque : multiples partenaires, IST, usager de drogues, voyage en zone d\'endémie, profession de santé, entourage d\'un porteur', req: 'Recommandée' },
  ],
},
{
  id: 'v-rougeole', cat: 'vaccinal', title: 'Vaccin rougeole (ROR — rattrapage)', icon: '💉',
  indications: [
    { id: 'v-ror-1980', why: 'La rougeole revient en France : deux doses de vaccin protègent efficacement, une seule dose insuffit.', label: 'Né·e après 1980 : 2 doses de vaccin trivalent ROR à jour', req: 'Recommandée', auto: p => p.age !== null && p.age <= 45 },
  ],
},
];


// ---------- Suivi des maladies chroniques (protocoles) ----------
const SUIVI = [
  {
    id: 'suivi-dt2', need: p => p.diabete, icon: '\ud83c\udf6a', title: 'Diab\u00e8te de type 2 connu \u2014 protocole de suivi annuel',
    items: [
      { label: 'HbA1c : 2\u20134x/an (objectif individualis\u00e9, en g\u00e9n\u00e9ral < 7 %)' },
      { label: 'Fonction r\u00e9nale : cr\u00e9atinine, DFG + RAC (albuminurie/cr\u00e9atinurie) chaque ann\u00e9e' },
      { label: 'Fond d\'\u0153il annuel (r\u00e9tinopathie)' },
      { label: 'Bilan lipidique annuel (LDL)' },
      { label: 'TA \u00e0 chaque consultation ; ECG selon contexte' },
      { label: 'Pieds : examen annuel (monofilament, pouls) \u2014 \u00e9ducation \u00e0 l\'autogestion' },
      { label: 'Vaccins : grippe annuelle, pneumocoque, COVID, VRS/zona selon \u00e2ge' },
      { label: 'D\u00e9pistage SAS si somnolence/ob\u00e9sit\u00e9 ; d\u00e9pression ; hygi\u00e8ne de vie' },
    ],
  },
  {
    id: 'suivi-hta', need: p => p.hta, icon: '\ud83e\ude7a', title: 'HTA connue \u2014 suivi',
    items: [
      { label: 'TA domicile (automesure) ; consultation tous les 3\u20136 mois jusqu\'au contr\u00f4le, puis annuel' },
      { label: 'Bilan annuel : cr\u00e9atinine/DFG + RAC, K+, glyc\u00e9mie, lipides, ECG' },
      { label: 'Retinopathie hypertensive si n\u00e9cessaire' },
      { label: 'Evaluation du risque cardiovasculaire global (SCORE2)' },
    ],
  },
  {
    id: 'suivi-mrc', need: p => p.dfg !== null && p.dfg < 60, icon: '\ud83e\ude78', title: 'Maladie r\u00e9nale chronique \u2014 suivi selon stade KDIGO',
    items: [
      { label: 'Confirmer la chronicit\u00e9 (> 3 mois) : DFG + RAC \u00e0 distance' },
      { label: 'Adapter les doses de m\u00e9dicaments au DFG ; \u00e9viter AINS, produits de contraste iod\u00e9s sans pr\u00e9cautions' },
      { label: 'Contr\u00f4ler la tension ; rechercher une anémie, un bilan phosphocalcique (G3b+)' },
      { label: 'N\u00e9phroprotection : IEC/ARA2 si albuminurie \u2265 3 mg/mmol, iSGLT2 selon KDIGO (voir volets traitements)' },
      { label: 'Avis n\u00e9phrologique : DFG < 30, albuminurie A3, progression rapide (> 5 mL/min/an), ou h\u00e9maturie' },
      { label: 'Vaccins : grippe, pneumocoque, COVID (DFG < 60 = comorbidit\u00e9)' },
    ],
  },
  {
    id: 'suivi-ic', need: p => p.ic, icon: '\ud83d\udc93', title: 'Insuffisance cardiaque \u2014 suivi',
    items: [
      { label: 'Poids quotidien patient ; signes d\'alerte (dyspn\u00e9e, \u0153d\u00e8mes, prise de poids > 2 kg/3 j)' },
      { label: 'Ionogramme + cr\u00e9atinine 7\u201314 j apr\u00e8s chaque modification de diur\u00e9tique/IEC' },
      { label: 'Quadrith\u00e9rapie de fond si FEVG r\u00e9duite : IEC/ARNI, b\u00eatabloquant, iSGLT2, ARM (antialdost\u00e9rone)' },
      { label: '\u00c9chographie cardiaque de r\u00e9\u00e9valuation selon contexte' },
    ],
  },
  {
    id: 'suivi-bpco', need: p => p.tabac === 'actif', icon: '\ud83d\udeac', title: 'Suivi tabagique actif',
    items: [
      { label: 'Sevrage tabagique \u00e0 chaque consultation : conseil bref, substitution nicotinique, orientation consultation' },
      { label: 'Paquets-ann\u00e9es \u00e0 jour (d\u00e9termine BPCO, poumon, AAA)' },
      { label: 'Vaccins grippe/pneumocoque' },
    ],
  },
];

const ALL_GROUPS = [
  { title: 'Examens de dépistage', exams: EXAMS },
  { title: 'Vaccinations', exams: VACCINS },
];

// ---------- État ----------
const overrides = {}; // indicationId -> true | false (coche manuelle)
const doneExams = {}; // examId -> 'fait' | 'nc' | 'ns' (traité, non concerné, non souhaité)
const isChecked = ind => {
  if (overrides[ind.id] !== undefined) return overrides[ind.id];
  return ind.auto ? !!ind.auto(P()) : false;
};

function examState(exam) {
  const checked = exam.indications.filter(isChecked);
  const n = checked.length;
  if (exam.scoring === 'stopbang') {
    return { checked, score: n, indicated: n >= 3, level: n >= 5 ? 'élevé' : (n >= 3 ? 'intermédiaire' : 'faible') };
  }
  return { checked, indicated: n > 0 };
}

// ---------- Rendu ----------
function renderSuivi(p) {
  const panel = document.getElementById('suivi-panel');
  const active = SUIVI.filter(x => x.need(p));
  if (!active.length) { panel.innerHTML = '<div class="suivi-empty">Aucune maladie chronique connue \u2014 les protocoles de suivi appara\u00eetront ici (diab\u00e8te, HTA, MRC, IC...).</div>'; return; }
  panel.innerHTML = active.map(x => `
    <div class="suivi-box">
      <div class="suivi-title">${x.icon} ${escapeHtml(x.title)}</div>
      ${x.items.map(i => `<div class="suivi-item">\u2022 ${escapeHtml(i.label)}</div>`).join('')}
    </div>`).join('');
}

function render() {
  const p = P();
  const complete = p.age !== null && p.sex && p.tabac;
  document.getElementById('patient-warn').classList.toggle('hidden', !!complete);

  const reminders = [];
  renderKdigo(p);
  renderRx(p);
  renderSuivi(p);
  if (p.tabac === 'actif') reminders.push('🚬 Patient fumeur : proposer une aide au sevrage (substitution, consultation).');
  if (p.fumeur && p.pa === null && p.age !== null && p.age >= 40) reminders.push('⚠️ Paquets-années non renseignées : nécessaires pour BPCO, cancer du poumon, AAA.');
  if (p.diabete && p.dfg === null) reminders.push('🩸 Patient diabétique : vérifier la fonction rénale (DFG, rapport protéinurie/créatinurie).');
  if (p.dfg !== null && p.dfg < 60) reminders.push('💧 DFG < 60 mL/min : maladie rénale chronique — adapter traitements, éviter néphrotoxiques.');
  if (p.imc !== null && p.imc >= 30) reminders.push('⚖️ Obésité (IMC ≥ 30) : évaluer, proposer prise en charge (activité physique, diététique, chirurgie si indication).');
  if (p.ldl !== null && p.ldl >= 1.9) reminders.push('🧬 LDL ≥ 1,9 g/L : évoquer une hypercholestérolémie familiale (dépistage familial, avis spécialisé).');
  else if (p.ldl !== null && p.ldl >= 1.6) reminders.push('🫀 LDL ≥ 1,6 g/L : évaluer le risque cardiovasculaire global (SCORE2), adapter la prise en charge.');
  document.getElementById('reminders').innerHTML = reminders.map(r => `<div>${escapeHtml(r)}</div>`).join('');
  document.getElementById('reminders').classList.toggle('hidden', !reminders.length);

  updateSummary();
}

function updateSummary() {
  const all = ALL_GROUPS.flatMap(g => g.exams).filter(e => !(e.hideIf && e.hideIf(P())));
  const todo = all.filter(e => examState(e).indicated && !doneExams[e.id]);
  const doneCount = all.filter(e => examState(e).indicated && doneExams[e.id]).length;

  const list = document.getElementById('todo-list');
  list.innerHTML = '';
  const CATS = [
    { key: 'chronique', title: 'D\u00e9pistage des maladies chroniques' },
    { key: 'neo', title: 'D\u00e9pistage n\u00e9oplasique' },
    { key: 'vaccinal', title: 'Suivi vaccinal' },
  ];
  const byCat = {};
  const mutedByCat = {};
  CATS.forEach(c => { byCat[c.key] = []; mutedByCat[c.key] = []; });
  all.filter(e => !examState(e).indicated && !doneExams[e.id]).forEach(exam => {
    if (exam.indications.some(i => !isChecked(i) && !i.auto)) mutedByCat[exam.cat || 'chronique'].push(exam);
  });
  if (!todo.length && !Object.values(mutedByCat).some(a => a.length)) {
    list.innerHTML = '<div class="todo-empty">' + (doneCount
      ? '✅ Tout est traité pour ce patient.'
      : 'Aucun examen indiqué actuellement.') + '</div>';
  }
  todo.forEach(exam => {
    byCat[exam.cat || 'chronique'].push(exam);
  });
  CATS.forEach(cat => {
    const exams = byCat[cat.key];
    const mutedExams = (mutedByCat[cat.key] || []);
    if (!exams.length && !mutedExams.length) return;
    const h = document.createElement('div');
    h.className = 'todo-cat-title';
    h.textContent = cat.title;
    list.appendChild(h);
    if (exams.length) renderTodoChips(exams, list, false);
    if (mutedExams.length) {
      const sub = document.createElement('div');
      sub.className = 'todo-muted-sub';
      sub.textContent = 'Aucune indication détectée automatiquement — vérifier quand même :';
      list.appendChild(sub);
      renderTodoChips(mutedExams, list, true);
    }
  });
  document.getElementById('todo-count').textContent =
    todo.length ? `${todo.length} à faire${doneCount ? ` · ${doneCount} fait${doneCount > 1 ? 's' : ''}` : ''}` : (doneCount ? '✅ tout traité' : '—');
  document.getElementById('progress-info').textContent =
    `${todo.length} examen${todo.length > 1 ? 's' : ''} à faire`;
}

function renderTodoChips(exams, list, muted) {
  exams.forEach(exam => {
    const st = examState(exam);
    const others = exam.indications.filter(i => !isChecked(i));
    const chip = document.createElement('div');
    chip.className = 'todo-chip todo-collapse' + (muted ? ' muted' : '') + (window._todoOpen?.[exam.id] ? ' open' : '');
    chip.dataset.todoExam = exam.id;
    const checkedRows = st.checked.map(i => `
      <div class="todo-detail-row"><input type="checkbox" data-ind="${i.id}" checked>
        <span class="todo-detail-label">${escapeHtml(i.label)}${i.req ? ` <em class="req">(${escapeHtml(i.req)})</em>` : ''}</span></div>
      ${i.why ? `<div class="todo-detail-why">${escapeHtml(i.why)}</div>` : ''}`).join('');
    const otherRows = others.length ? `
      <div class="todo-detail-sub">Autres indications à vérifier (cocher si applicable) :</div>
      ${others.map(i => `
        <div class="todo-detail-row"><input type="checkbox" data-ind="${i.id}">
          <span class="todo-detail-label off">${escapeHtml(i.label)}${i.req ? ` <em class="req">(${escapeHtml(i.req)})</em>` : ''}</span></div>`).join('')}` : '';
    chip.innerHTML = `
      <div class="todo-head" role="button" tabindex="0" aria-expanded="${window._todoOpen?.[exam.id] ? 'true' : 'false'}">
        <span class="todo-label">${exam.icon} ${escapeHtml(exam.title.split(' (')[0])}
          <em>${muted ? 'aucune indication détectée — à vérifier' : st.checked.length + ' indication' + (st.checked.length > 1 ? 's' : '') + (st.level && exam.scoring ? ' — ' + escapeHtml(st.level) : '')}</em></span>
        <span class="todo-head-right">
          <span class="todo-chevron">▸</span>
          <span class="todo-actions">
            <button class="todo-done" data-done="${exam.id}" data-st="fait">✓ Fait</button>
            <button class="todo-nc" data-done="${exam.id}" data-st="nc">NC</button>
            <button class="todo-ns" data-done="${exam.id}" data-st="ns">NS</button>
          </span>
        </span>
      </div>
      <div class="todo-detail"><div class="todo-detail-inner">
        <div class="todo-detail-sub">Motif(s) retenu(s) :</div>
        ${checkedRows}
        ${otherRows}
      </div></div>`;
    list.appendChild(chip);
  });
}

// ---------- Événements ----------
document.addEventListener('click', e => {
  const btn = e.target.closest('button[data-done]');
  if (btn) return;
  const head = e.target.closest('.todo-head');
  if (head) {
    const chip = head.closest('.todo-collapse');
    const id = chip.dataset.todoExam;
    window._todoOpen = window._todoOpen || {};
    window._todoOpen[id] = !window._todoOpen[id];
    chip.classList.toggle('open', window._todoOpen[id]);
    head.setAttribute('aria-expanded', window._todoOpen[id]);
    return;
  }
  doneExams[btn.dataset.done] = btn.dataset.st || 'fait';
  render();
});

document.addEventListener('change', e => {
  const cb = e.target.closest('input[data-ind]');
  if (!cb) return;
  const id = cb.dataset.ind;
  const exam = ALL_GROUPS.flatMap(g => g.exams).find(x => x.indications.some(i => i.id === id));
  const ind = exam.indications.find(i => i.id === id);
  overrides[id] = cb.checked;
  render();
});

['pat-age', 'pat-sex', 'pat-tabac', 'pat-pa', 'pat-diabete', 'pat-hta', 'pat-ic', 'pat-dfg', 'pat-rac', 'pat-imc', 'pat-ldl'].forEach(idn =>
  document.getElementById(idn).addEventListener('change', render));

document.getElementById('pat-date').value = new Date().toISOString().slice(0, 10);

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Réinitialiser les coches ?')) {
    Object.keys(overrides).forEach(k => delete overrides[k]);
    Object.keys(doneExams).forEach(k => delete doneExams[k]);
    render();
  }
});

document.getElementById('btn-save').addEventListener('click', () => {
  const data = {
    patient: {
      name: document.getElementById('pat-name').value,
      age: document.getElementById('pat-age').value,
      sex: document.getElementById('pat-sex').value,
      tabac: document.getElementById('pat-tabac').value,
      pa: document.getElementById('pat-pa').value,
      diabete: document.getElementById('pat-diabete').value,
      hta: document.getElementById('pat-hta').value,
      ic: document.getElementById('pat-ic').value,
      dfg: document.getElementById('pat-dfg').value,
      rac: document.getElementById('pat-rac').value,
      imc: document.getElementById('pat-imc').value,
      ldl: document.getElementById('pat-ldl').value,
      date: document.getElementById('pat-date').value,
    },
    overrides,
    doneExams
  };
  localStorage.setItem('depistage-last', JSON.stringify(data));
  alert('Sauvegardé (stockage local du navigateur).');
});

document.getElementById('btn-load').addEventListener('click', () => {
  const raw = localStorage.getItem('depistage-last');
  if (!raw) { alert('Aucune sauvegarde trouvée.'); return; }
  const data = JSON.parse(raw);
  document.getElementById('pat-name').value = data.patient?.name || '';
  document.getElementById('pat-age').value = data.patient?.age || '';
  document.getElementById('pat-sex').value = data.patient?.sex || '';
  document.getElementById('pat-tabac').value = data.patient?.tabac || '';
  document.getElementById('pat-pa').value = data.patient?.pa || '';
  document.getElementById('pat-diabete').value = data.patient?.diabete || '';
  document.getElementById('pat-hta').value = data.patient?.hta || '';
  document.getElementById('pat-ic').value = data.patient?.ic || '';
  document.getElementById('pat-dfg').value = data.patient?.dfg || '';
  document.getElementById('pat-rac').value = data.patient?.rac || '';
  document.getElementById('pat-imc').value = data.patient?.imc || '';
  document.getElementById('pat-ldl').value = data.patient?.ldl || '';
  document.getElementById('pat-date').value = data.patient?.date || new Date().toISOString().slice(0, 10);
  Object.keys(overrides).forEach(k => delete overrides[k]);
  Object.assign(overrides, data.overrides || {});
  Object.keys(doneExams).forEach(k => delete doneExams[k]);
  Object.assign(doneExams, data.doneExams || {});
  render();
});

// ---------- Fiche patient ----------
document.getElementById('btn-print').addEventListener('click', () => {
  const p = P();
  const name = document.getElementById('pat-name').value || '__________';
  const date = document.getElementById('pat-date').value || new Date().toISOString().slice(0, 10);
  const sexTxt = p.sex === 'F' ? 'Femme' : p.sex === 'M' ? 'Homme' : '—';
  const tabacTxt = p.tabac === 'actif' ? `Fumeur${p.pa !== null ? ` (${p.pa} PA)` : ''}`
    : p.tabac === 'sevré' ? `Sevré${p.pa !== null ? ` (${p.pa} PA)` : ''}`
    : p.tabac === 'jamais' ? 'Non fumeur' : '—';
  const comorb = [];
  if (p.diabete) comorb.push('Diabète');
  if (p.hta) comorb.push('HTA');
  if (p.dfg !== null) comorb.push(`DFG ${p.dfg} mL/min`);
  if (p.imc !== null) comorb.push(`IMC ${p.imc}`);
  if (p.ldl !== null) comorb.push(`LDL ${String(p.ldl).replace('.', ',')} g/L`);


  const examBlocks = ALL_GROUPS.flatMap(g => g.exams).map(exam => {
    const st = examState(exam);
    if (!st.indicated || doneExams[exam.id]) return '';
    const scoreInfo = exam.scoring === 'stopbang' ? ` — score ${st.score}/8 (risque ${st.level})` : (exam.scoring === 'glp1' && st.level ? ` — ${st.level}` : '');
    const rows = st.checked.map(i => `
      <tr>
        <td class="ind-label">${escapeHtml(i.label)}${i.req ? ` <em class="req">(${escapeHtml(i.req)})</em>` : ''}</td>
        <td class="ind-why">${i.why ? escapeHtml(i.why) : '—'}</td>
      </tr>`).join('');
    return `<div class="exam-box">
      <div class="exam-title">${exam.icon} ${escapeHtml(exam.title)}${scoreInfo}</div>
      <table class="ind-table">
        <tr><th>Ce qui est recommandé</th><th>Pourquoi c'est utile pour vous</th></tr>
        ${rows}
      </table>
      <div class="exam-cta">→ À prescrire / à programmer avec votre médecin</div>
    </div>`;
  }).join('');

  const todoCount = ALL_GROUPS.flatMap(g => g.exams).filter(e => examState(e).indicated && !doneExams[e.id]).length;

  document.getElementById('print-area').innerHTML = `
    <div class="doc">
      <div class="doc-head">
        <h1>Votre programme de dépistage</h1>
        <p class="doc-date">Consultation du ${escapeHtml(date.split('-').reverse().join('/'))}</p>
      </div>

      <div class="patient-band">
        <div><span class="k">Patient</span><span class="v">${escapeHtml(name)}</span></div>
        <div><span class="k">Âge</span><span class="v">${p.age ?? '—'} ans</span></div>
        <div><span class="k">Sexe</span><span class="v">${sexTxt}</span></div>
        <div><span class="k">Tabac</span><span class="v">${escapeHtml(tabacTxt)}</span></div>
        ${comorb.length ? `<div><span class="k">Antécédents</span><span class="v">${escapeHtml(comorb.join(', '))}</span></div>` : ''}
      </div>

      ${todoCount ? `<div class="intro">Lors de la consultation, nous avons repéré <strong>${todoCount} dépistage${todoCount > 1 ? 's' : ''}</strong> à planifier pour votre santé. Voici la liste et la raison pour chacun.</div>`
        : '<div class="intro ok">Aucun dépistage supplémentaire n\'est nécessaire aujourd\'hui. Votre suivi est à jour — pensez aux prochains rendez-vous de routine.</div>'}

      ${examBlocks || ''}

      <p class="foot">Document remis en consultation — rappel des recommandations françaises de dépistage (HAS, dépistage organisé). Ne remplace pas l'avis médical.</p>
    </div>`;
  window.print();
});

// ---------- Utilitaires ----------
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

render();
