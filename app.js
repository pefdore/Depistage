/* Check-list de dépistage — données et logique. Tout est local (aucun envoi réseau). */

// ---------- Modèle ----------
// Chaque item : { id, label, detail, show: (patient)=>bool, why: (patient)=>string|null, input: 'text'|'date'|'note' }
// why : si retourne une string, un drapeau explicatif "auto" est affiché.
// statuts : null (non évalué) | 'oui' (fait / à jour) | 'non' (à faire / à programmer) | 'na'

const P = () => {
  const age = parseInt(document.getElementById('pat-age').value, 10);
  const sex = document.getElementById('pat-sex').value;
  const tabac = document.getElementById('pat-tabac').value;
  const pa = parseFloat(document.getElementById('pat-pa').value);
  return {
    age: isNaN(age) ? null : age,
    sex,
    tabac,                                   // '' | 'actif' | 'ex' | 'jamais'
    pa: isNaN(pa) ? null : pa,               // paquets-années
    fumeur: tabac === 'actif' || tabac === 'ex',
    grosFumeur: (tabac === 'actif' || tabac === 'ex') && !isNaN(pa) && pa >= 20,
  };
};

const adult = p => p.age !== null && p.age >= 18;
const between = (p, a, b) => p.age !== null && p.age >= a && p.age <= b;
const isF = p => p.sex === 'F';
const isM = p => p.sex === 'M';

// ---------- Données ----------
const SECTIONS = [
{
  id: 'tabac', title: '🚬 Tabac / addictions',
  items: [
    { id: 'tabac-aide', label: 'Si fumeur : sevrage proposé / aide proposée (substitution, consultation, TCC)', show: p => adult(p) && p.tabac === 'actif', input: 'note',
      why: p => p.tabac === 'actif' ? 'Patient fumeur (statut Doctolib) : sevrage à proposer à chaque consultation (HAS).' : null },
    { id: 'alcool-audit', label: 'Alcool : dépistage (AUDIT-C / FACE)', detail: 'Remboursement SI : au moins 1 si/an (adulte)', show: adult },
    { id: 'cannabis', label: 'Autres addictions : cannabis, opioïdes, alcoolisation dangereuse — dépistage si contexte', show: adult },
  ]
},
{
  id: 'bpco', title: '🫁 BPCO',
  items: [
    { id: 'bpco-critere', label: 'Critères de dépistage évalués (fumeur ou ex-fumeur ≥ 20 PA + ≥ 40 ans, ou symptomatique)', show: adult,
      why: p => {
        if (!p.fumeur) return null;
        if (p.age !== null && p.age >= 40 && p.grosFumeur) return 'Fumeur/ex-fumeur ≥ 20 PA et ≥ 40 ans : critères de dépistage de la BPCO réunis.';
        if (p.age !== null && p.age >= 40 && p.pa === null) return 'Fumeur ≥ 40 ans : renseigner les paquets-années (seuil ≥ 20 PA).';
        return null;
      } },
    { id: 'bpco-sympt', label: 'Symptômes : toux chronique, expectorations, dyspnée, sifflements', show: adult },
    { id: 'bpco-spiro', label: 'EFR / spirométrie avec test de réversibilité', show: adult },
    { id: 'bpco-vdd', label: 'Vérifier Vaccins : grippe annuelle, pneumocoque, COVID, RSV si ≥ 75 ans', show: adult,
      why: p => (p.age !== null && p.age >= 75) ? 'RSV : vaccination recommandée à partir de 75 ans (prévention de la BPCO exacerbée).' : null },
    { id: 'bpco-exac', label: 'Antécédent d\'exacerbation / hospitalisation — évaluation du risque', show: adult },
    { id: 'bpco-depist-a1at', label: 'Déficit en alpha-1-antitrypsine : à évoquer si BPCO jeune (< 45 ans) ou non-fumeur', show: p => p.age !== null && p.age < 60 },
    { id: 'bpco-sommeil', label: 'Syndrome d\'apnées du sommeil : chercher (ronflements, somnolence — STOP-BANG)', show: adult },
    { id: 'bpco-rehab', label: 'Si BPCO confirmé : réhabilitation respiratoire proposée', show: adult },
  ]
},
{
  id: 'osteo', title: '🦴 Ostéoporose',
  items: [
    { id: 'osteo-femmes65', label: 'Ostéodensitométrie : femme ≥ 65 ans', show: p => adult(p) && isF(p) && p.age >= 65,
      why: p => p.age >= 65 ? 'Recommandée systématiquement chez la femme de 65 ans et plus (HAS).' : null },
    { id: 'osteo-menopause', label: 'Ostéodensitométrie : femme ménopausée avec facteur de risque', detail: 'FR : FRAX ≥ seuil, corticothérapie prolongée, antécédent de fracture de faible énergie, tabagisme, IMC < 19, alcool, ménopause précoce, antécédent familial', show: p => adult(p) && isF(p),
      why: p => {
        if (p.age === null || p.age < 50) return null;
        if (p.tabac === 'actif') return 'Tabagisme actif = facteur de risque ostéoporose : ostéodensitométrie à considérer dès 50 ans (HAS).';
        return 'À considérer dès 50 ans si facteur de risque (HAS).';
      } },
    { id: 'osteo-homme', label: 'Homme ≥ 70 ans : dépistage à considérer (HAS 2024 : dépistage possible chez l\'homme de 70 ans et plus)', show: p => adult(p) && isM(p) && p.age >= 70,
      why: p => p.age >= 70 ? 'Recommandation HAS 2024 : dépistage possible chez l\'homme ≥ 70 ans.' : null },
    { id: 'osteo-fracture', label: 'Antécédent de fracture de faible énergie après 50 ans / fracture de l\'extrémité supérieure du fémur', show: adult },
    { id: 'osteo-cortico', label: 'Corticothérapie prolongée (≥ 3 mois, ≥ 7,5 mg/j prednisone)', show: adult },
    { id: 'osteo-calcium-vitd', label: 'Apports calciques et vitamine D : évaluation / supplémentation si carence', show: adult },
    { id: 'osteo-chute', label: 'Évaluation du risque de chute (traitements, vision, aide à la marche)', show: p => p.age !== null && p.age >= 65 },
    { id: 'osteo-treatment', label: 'Si ostéoporose : traitement en cours, observance, contrôle', show: adult },
  ]
},
{
  id: 'diabete', title: '🍬 Diabète',
  items: [
    { id: 'diabete-depist', label: 'Dépistage diabète de type 2 : glycémie à jeun ou HbA1c', show: adult,
      why: p => {
        if (p.age !== null && p.age >= 45 && p.age < 75) return 'Diabète de type 2 : dépistage recommandé tous les 3 ans entre 45 et 75 ans (HAS 2024).';
        return null;
      } },
    { id: 'diabete-prediab', label: 'Si prediabète : HbA1c ou glycémie à jeun à contrôler annuellement', show: adult },
    { id: 'diabete-fdr', label: 'Facteurs de risque : obésité (tour de taille élevé), antécédent familial, HTA, dyslipidémie, inactivité, APNOS, diabète gestationnel, origine à risque, syndrome métabolique', show: adult },
    { id: 'diabete-exam', label: 'Si diabète : fond d\'œil, ECG, examen des pieds, profil lipidique', show: adult },
    { id: 'diabete-hba1c', label: 'Si diabète : HbA1c à jour (objectif individualisé, en général < 7 %)', show: adult },
    { id: 'diabete-dfg', label: 'Si diabète : fonction rénale (DFG, rapport protéinurie/créatinurie)', show: adult },
    { id: 'diabete-pied', label: 'Suivi podologique régulier si neuropathie ou artériopathie', show: adult },
    { id: 'diabete-educ', label: 'Éducation thérapeutique et vaccination : grippe, pneumocoque, COVID (recommandée chez les diabétiques)', show: adult },
  ]
},
{
  id: 'cardio', title: '❤️ Cardiovasculaire & métabolique (complément)',
  items: [
    { id: 'hta', label: 'TA mesurée / HTA dépistée', show: adult },
    { id: 'ldl', label: 'Bilan lipidique (LDL) selon risque', show: adult },
    { id: 'imc-tt', label: 'IMC et tour de taille', show: adult },
    { id: 'eas-score', label: 'Score SCORE2 / risque cardiovasculaire global', show: adult },
    { id: 'aa', label: 'Recherche d\'anévrisme aortique abdominale : ÉCHO aorte chez fumeur/ex-fumeur de 65 à 85 ans', show: adult,
      why: p => (p.age !== null && p.age >= 65 && p.age <= 85 && p.fumeur) ? 'Dépistage de l\'AAA : une échographie chez les fumeurs/ex-fumeurs de 65 à 85 ans (HAS).' : null },
    { id: 'arih', label: 'Dépistage de l\'arythmie par ARIH (auto-mesure à domicile chez ≥ 65 ans)', show: p => p.age !== null && p.age >= 65 },
    { id: 'fod', label: 'Cécité par BAV : détection de l\'arythmie par palpation du pouls ≥ 65 ans', show: p => p.age !== null && p.age >= 65 },
  ]
},
{
  id: 'neo-cancer', title: ' Oncologie — dépistage organisé + individuel',
  items: [
    { id: 'cancer-crc', label: 'Cancer colorectal : test immunologique (recherche de sang occulte) tous les 2 ans', show: p => between(p, 50, 74),
      why: p => between(p, 50, 74) ? 'Dépistage organisé : 50–74 ans, tous les 2 ans.' : null },
    { id: 'cancer-crc-colpo', label: 'Cancer colorectal : coloscopie si test positif, ATCD familial (HNPCC, polypose), ou signes d\'alerte', show: adult },
    { id: 'cancer-cervix', label: 'Frottis cervico-utérin (ou test HPV) tous les 3 ans, ou HPV tous les 5 ans (25–65 ans)', show: p => adult(p) && isF(p) && between(p, 25, 65),
      why: p => between(p, 25, 65) ? 'Dépistage organisé : 25 à 65 ans.' : null },
    { id: 'cancer-cervix-vacc', label: 'Vaccination HPV à vérifier chez les jeunes femmes (idéalement avant 20 ans)', show: p => adult(p) && isF(p) && p.age !== null && p.age < 30 },
    { id: 'cancer-mammo', label: 'Mammographie tous les 2 ans', show: p => adult(p) && isF(p) && between(p, 50, 74),
      why: p => between(p, 50, 74) ? 'Dépistage organisé : 50–74 ans, tous les 2 ans.' : null },
    { id: 'cancer-mammo-fdr', label: 'Mammographie avant 50 ans si facteurs de risque (ATCD familial, mutation BRCA, irradiation thoracique)', show: p => adult(p) && isF(p) && p.age !== null && p.age < 50 },
    { id: 'cancer-breast-clin', label: 'Examen clinique des seins', show: p => adult(p) && isF(p) },
    { id: 'cancer-psa', label: 'PSA : dépistage individuel possible chez l\'homme 50–54 ans et plus, informer des bénéfices/risques avant de prescrire', show: p => adult(p) && isM(p) && p.age !== null && p.age >= 50,
      why: p => (p.age !== null && p.age >= 50) ? 'PSA : à discuter (dépistage individuel, décision partagée) — HAS 2024.' : null },
    { id: 'cancer-prostate-dre', label: 'Toucher rectal si symptômes urinaires ou PSA élevé', show: p => adult(p) && isM(p) && p.age !== null && p.age >= 50 },
    { id: 'cancer-poumon', label: 'Cancer du poumon : scanner thoracique low-dose annuel, fumeur/ex-fumeur 50–74 ans avec tabagisme important', show: adult,
      why: p => {
        if (!p.fumeur) return null;
        if (p.age !== null && p.age >= 50 && p.age <= 74 && p.grosFumeur) return 'Fumeur/ex-fumeur 50–74 ans avec ≥ 20 PA : scanner low-dose annuel à envisager (HAS).';
        if (p.age !== null && p.age >= 50 && p.age <= 74 && p.pa === null) return '50–74 ans et fumeur/ex-fumeur : renseigner les paquets-années (seuil ≥ 20 PA).';
        return null;
      } },
    { id: 'cancer-peau', label: 'Cancer de la peau : examen des lésions suspectes / éducation à l\'auto-examen', show: adult },
    { id: 'cancer-signes', label: 'Signes d\'alerte généraux recherchés : amaigrissement inexpliqué, hémorragies, douleurs chroniques, adénopathies, toux > 3 semaines, dysphagie, sang dans les selles ou urines', show: adult },
    { id: 'cancer-hpv-cond', label: 'Conduite à tenir si test de dépistage positif : orientation rapide, examens complémentaires', show: adult },
    { id: 'cancer-genet', label: 'ATCD familiaux de cancers (sein/ovaire/colon/pancréas) : envisager consultation d\'oncogénétique', show: adult },
  ]
},
{
  id: 'vaccins', title: '💉 Vaccinations',
  items: [
    { id: 'vacc-grippe', label: 'Grippe saisonnière : à jour', show: adult,
      why: p => {
        if (p.age !== null && p.age >= 65) return 'Recommandée chaque année dès 65 ans (ou maladie chronique).';
        return null;
      } },
    { id: 'vacc-covid', label: 'COVID-19 : à jour selon recommandations en vigueur (personnes âgées/comorbidités)', show: adult,
      why: p => (p.age !== null && p.age >= 65) ? 'Rappel recommandé pour les ≥ 65 ans et comorbidités.' : null },
    { id: 'vacc-pneumo', label: 'Pneumocoque : à jour (65–85 ans, ou pathologie chronique)', show: p => p.age !== null && p.age >= 65,
      why: p => (p.age !== null && p.age >= 65 && p.age <= 85) ? 'Vaccination pneumococcique recommandée entre 65 et 85 ans (schéma adapté).' : null },
    { id: 'vacc-rsv', label: 'VRS/RSV : ≥ 75 ans (ou ≥ 65 ans avec comorbidités)', show: p => p.age !== null && p.age >= 75,
      why: p => (p.age !== null && p.age >= 75) ? 'Recommandée à partir de 75 ans (HAS 2024–2025).' : null },
    { id: 'vacc-zona', label: 'Zona (Shingrix) : 65–74 ans (ou 50–64 ans avec comorbidités)', show: p => p.age !== null && p.age >= 65,
      why: p => between(p, 65, 74) ? 'Recommandée entre 65 et 74 ans.' : null },
    { id: 'vacc-dtp', label: 'Diphtérie / tétanos / poliomyélite : rappel à jour (10 ans, ou 20 ans si DTPa complet)', show: adult },
    { id: 'vacc-hpv', label: 'HPV : jeunes 11–14 ans (rattrapage 15–19 ans) — à proposer', show: p => p.age !== null && p.age >= 11 && p.age <= 19,
      why: p => (p.age !== null && p.age >= 11 && p.age <= 14) ? 'Vaccination recommandée à 11–14 ans (rattrapage jusqu\'à 19 ans révolus).' : null },
    { id: 'vacc-carnet', label: 'Carnet de vaccination / vaccination antérieure : statut vérifié (CarnetVax, MesVaccins)', show: adult },
    { id: 'vacc-hepb', label: 'Hépatite B : statut vaccinal / sérologie si risque', show: adult },
  ]
},
{
  id: 'femme', title: '🌸 Santé de la femme (complément)',
  items: [
    { id: 'femme-contraception', label: 'Contraception : appropriée, tolérée, à jour', show: p => adult(p) && isF(p) },
    { id: 'femme-gros', label: 'Grossesse : désir, en cours, post-partum ? (sérologies, acide folique)', show: p => adult(p) && isF(p) && p.age !== null && p.age >= 18 && p.age <= 51 },
    { id: 'femme-menopause', label: 'Ménopause : symptômes, troubles génito-urinaires, TRH à évaluer', show: p => adult(p) && isF(p) && p.age !== null && p.age >= 45 },
    { id: 'femme-tsm', label: 'Trousse de premiers secours / auto-palpation des seins enseignée', show: p => adult(p) && isF(p) },
    { id: 'femme-vitd9', label: 'Supplémentation : vitamine B9 en péri-conceptionnel', show: p => adult(p) && isF(p) && p.age !== null && p.age <= 45 },
  ]
},
{
  id: 'global', title: '🧠 Autres points de suivi (complément)',
  items: [
    { id: 'glob-depression', label: 'Dépression : dépistage (PHQ-2 / questions simples) si contexte', show: adult },
    { id: 'glob-audition', label: 'Audition : dépistage de la déficience auditive (adultes, en particulier ≥ 60 ans)', show: p => p.age !== null && p.age >= 60,
      why: p => (p.age !== null && p.age >= 60) ? 'Dépistage de la déficience auditive recommandé chez les 60–74 ans (HAS).' : null },
    { id: 'glob-vision', label: 'Vision : acuité visuelle / cataracte / DMLA (examen ophtalmologique si signes)', show: p => p.age !== null && p.age >= 50 },
    { id: 'glob-mna', label: 'Dénutrition : dépistage chez le sujet âgé (MNA, perte de poids)', show: p => p.age !== null && p.age >= 70 },
    { id: 'glob-cognitif', label: 'Troubles cognitifs : repérage si plainte du patient ou de l\'entourage (≥ 70 ans)', show: p => p.age !== null && p.age >= 70 },
    { id: 'glob-chute', label: 'Chutes : antécédents, équilibre, environnement (≥ 65 ans)', show: p => p.age !== null && p.age >= 65 },
    { id: 'glob-isolement', label: 'Isolement social / autonomie : repérage (personne âgée)', show: p => p.age !== null && p.age >= 65 },
    { id: 'glob-activite', label: 'Activité physique et alimentation : évaluation brève', show: adult },
    { id: 'glob-obesite', label: 'Surpoids / obésité : IMC, orientation si nécessaire', show: adult },
    { id: 'glob-vih', label: 'VIH / IST : dépistage au moins une fois si situation à risque, ou proposition systématique', show: adult },
    { id: 'glob-hepc', label: 'Hépatite C : dépistage au moins une fois chez les 18–59 ans (HAS)', show: p => between(p, 18, 59),
      why: p => between(p, 18, 59) ? 'Dépistage HCV recommandé au moins une fois chez les adultes 18–59 ans.' : null },
    { id: 'glob-vitd', label: 'Vitamine D : carence à évoquer chez sujet âgé / ostéoporose', show: p => p.age !== null && p.age >= 65 },
    { id: 'glob-med-revue', label: 'Revue des traitements (iatrogénie, interactions, observance)', show: p => p.age !== null && p.age >= 65 },
    { id: 'glob-pdv', label: 'Points de vue du patient : questions, attentes, priorités', show: adult },
  ]
}
];

// ---------- État ----------
const state = {}; // itemId -> { status, value }

function getItem(itemId) {
  for (const s of SECTIONS) { const it = s.items.find(i => i.id === itemId); if (it) return it; }
  return null;
}

function visibleItems() {
  const p = P();
  return SECTIONS.flatMap(s => s.items.filter(i => !i.show || i.show(p)));
}

// ---------- Rendu ----------
function render() {
  const container = document.getElementById('sections');
  container.innerHTML = '';
  const p = P();

  SECTIONS.forEach(sec => {
    const visItems = sec.items.filter(i => !i.show || i.show(p));
    if (!visItems.length) return;
    const card = document.createElement('section');
    card.className = 'card';
    card.innerHTML = `<h2>${sec.title}</h2>`;

    visItems.forEach(it => {
      const row = document.createElement('div');
      row.className = 'item';
      row.dataset.id = it.id;

      const st = state[it.id]?.status || null;
      if (st === 'na') row.classList.add('na');

      const why = it.why ? it.why(p) : null;
      let flags = '';
      if (why) flags += `<span class="flag auto">ⓘ ${escapeHtml(why)}</span>`;
      if (st === 'oui') flags += `<span class="flag done">✔ Fait / à jour</span>`;
      if (st === 'non') flags += `<span class="flag todo">✖ À faire</span>`;

      const inputHtml = it.input === 'text'
        ? `<input type="text" data-input="${it.id}" placeholder="préciser" value="${escapeAttr(state[it.id]?.value || '')}">`
        : it.input === 'date'
        ? `<input type="date" data-input="${it.id}" value="${escapeAttr(state[it.id]?.value || '')}">`
        : '';

      row.innerHTML = `
        <div class="q">
          <span class="label">${escapeHtml(it.label)}${flags}</span>
          ${it.detail ? `<div class="detail">${escapeHtml(it.detail)}</div>` : ''}
          ${it.input === 'note' ? `<textarea data-input="${it.id}" rows="2" placeholder="note...">${escapeHtml(state[it.id]?.value || '')}</textarea>` : ''}
        </div>
        ${inputHtml}
        <div class="status">
          <button data-status="oui" class="${st === 'oui' ? 'active-oui' : ''}">Fait</button>
          <button data-status="non" class="${st === 'non' ? 'active-non' : ''}">À faire</button>
          <button data-status="na" class="${st === 'na' ? 'active-na' : ''}">N/A</button>
        </div>`;
      card.appendChild(row);
    });
    container.appendChild(card);
  });

  updateSummary();
}

function updateSummary() {
  const items = visibleItems();
  const evaluated = items.filter(i => state[i.id]?.status && state[i.id].status !== 'na');
  const todo = evaluated.filter(i => state[i.id].status === 'non');
  const fill = document.getElementById('progress-fill');
  const pct = evaluated.length ? Math.round(100 * evaluated.length / items.length) : 0;
  fill.style.width = pct + '%';
  fill.style.background = todo.length ? '#dc3545' : '#198754';
  document.getElementById('progress-info').textContent =
    `${evaluated.length} / ${items.length} items évalués` + (todo.length ? ` — ${todo.length} à faire` : '');
}

// ---------- Événements ----------
function setStatus(itemId, status) {
  if (!state[itemId]) state[itemId] = { status: null, value: '' };
  const cur = state[itemId].status;
  state[itemId].status = (cur === status) ? null : status;
  render();
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.status button');
  if (btn) {
    const id = btn.closest('.item').dataset.id;
    setStatus(id, btn.dataset.status);
  }
});

document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (el) {
    const id = el.dataset.input;
    if (!state[id]) state[id] = { status: null, value: '' };
    state[id].value = el.value;
    updateSummary();
  }
});

['pat-age', 'pat-sex', 'pat-tabac', 'pat-pa'].forEach(idn =>
  document.getElementById(idn).addEventListener('change', render));

document.getElementById('pat-date').value = new Date().toISOString().slice(0, 10);

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Réinitialiser toute la check-list ?')) {
    Object.keys(state).forEach(k => delete state[k]);
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
      date: document.getElementById('pat-date').value,
    },
    state
  };
  localStorage.setItem('depistage-last', JSON.stringify(data));
  alert('Check-list sauvegardée (stockage local du navigateur).');
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
  document.getElementById('pat-date').value = data.patient?.date || '';
  Object.keys(data.state || {}).forEach(k => state[k] = data.state[k]);
  render();
});

// ---------- Fiche patient ----------
document.getElementById('btn-print').addEventListener('click', () => {
  const p = P();
  const name = document.getElementById('pat-name').value || '__________';
  const date = document.getElementById('pat-date').value || new Date().toISOString().slice(0, 10);
  const sexTxt = p.sex === 'F' ? 'Femme' : p.sex === 'M' ? 'Homme' : '—';
  const tabacTxt = p.tabac === 'actif' ? `Fumeur actif${p.pa !== null ? ' (' + p.pa + ' PA)' : ''}`
    : p.tabac === 'ex' ? `Ex-fumeur${p.pa !== null ? ' (' + p.pa + ' PA)' : ''}`
    : p.tabac === 'jamais' ? 'Non-fumeur' : '—';

  let todoRows = '', doneRows = '', naRows = '';
  SECTIONS.forEach(sec => {
    const items = sec.items.filter(i => (!i.show || i.show(p)));
    items.forEach(it => {
      const st = state[it.id]?.status || null;
      const val = state[it.id]?.value ? ` (${state[it.id].value})` : '';
      const clean = it.label.replace(/\s+/g, ' ').trim();
      if (st === 'non') todoRows += `<tr><td>${escapeHtml(sec.title.replace(/^\S+\s/, ''))}</td><td>${escapeHtml(clean)}${escapeHtml(val)}</td></tr>`;
      else if (st === 'oui') doneRows += `<tr><td>${escapeHtml(clean)}${escapeHtml(val)}</td></tr>`;
      else if (st === 'na') naRows += `<tr><td>${escapeHtml(clean)}</td></tr>`;
    });
  });

  const fmt = (rows, empty) => rows || `<tr><td>${empty}</td></tr>`;

  document.getElementById('print-area').innerHTML = `
    <h1>Check-list de santé — points de surveillance et de dépistage</h1>
    <p><strong>Patient :</strong> ${escapeHtml(name)} &nbsp;|&nbsp; <strong>Âge :</strong> ${p.age ?? '—'} ans &nbsp;|&nbsp; <strong>Sexe :</strong> ${sexTxt} &nbsp;|&nbsp; <strong>Tabac :</strong> ${escapeHtml(tabacTxt)} &nbsp;|&nbsp; <strong>Date :</strong> ${escapeHtml(date)}</p>

    <h2>✅ Déjà à jour / réalisé</h2>
    <table><tr><th>Item</th></tr>${fmt(doneRows, 'Aucun point marqué « fait ».')}</table>

    <h2>📋 À faire / à programmer</h2>
    <table><tr><th>Domaine</th><th>Action recommandée</th></tr>${fmt(todoRows, 'Aucun point marqué « à faire » — pensez à cocher les items pendant la consultation.')}</table>

    <h2>ℹ️ Non applicable / non concerné</h2>
    <table><tr><th>Item</th></tr>${fmt(naRows, '—')}</table>

    <div class="plan">
      <strong>Prochaines étapes :</strong> prenez rendez-vous pour les examens listés ci-dessus « à programmer ». Certains dépistages sont proposés automatiquement (courrier du programme national) ; les autres nécessitent une prescription de votre médecin.
    </div>
    <p class="foot">Document généré en consultation à titre d'aide-mémoire, conformément aux recommandations françaises (HAS / dépistage organisé). Ne remplace pas l'avis médical — toute question : contacter votre médecin.</p>`;
  window.print();
});

// ---------- Utilitaires ----------
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

render();
