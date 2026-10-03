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
    dfg: isNaN(dfg) ? null : dfg,
    imc: isNaN(imc) ? null : imc,
    ldl: isNaN(ldl) ? null : ldl,
  };
};

const between = (p, a, b) => p.age !== null && p.age >= a && p.age <= b;
const isF = p => p.sex === 'F';
const isM = p => p.sex === 'M';

// ---------- Examens & indications ----------
const EXAMS = [
{
  id: 'osteo', title: 'Ostéodensitométrie', icon: '🦴',
  indications: [
    { id: 'osteo-f65', label: 'Femme ≥ 65 ans', auto: p => isF(p) && p.age !== null && p.age >= 65 },
    { id: 'osteo-h70', label: 'Homme ≥ 70 ans', auto: p => isM(p) && p.age !== null && p.age >= 70 },
    { id: 'osteo-fracture', label: 'Fracture de faible énergie après 50 ans (poignet, vertèbre, fémur...)' },
    { id: 'osteo-cortico', label: 'Corticothérapie ≥ 3 mois, ≥ 7,5 mg/j prednisone' },
    { id: 'osteo-menop-precoc', label: 'Ménopause précoce (< 40 ans) ou hypogonadisme' },
    { id: 'osteo-imc', label: 'IMC < 19, ou perte de poids', auto: p => p.imc !== null && p.imc < 19 },
    { id: 'osteo-fam', label: 'Antécédent familial de fracture du col du fémur' },
    { id: 'osteo-fdr', label: 'Femme ménopausée avec autre facteur de risque (tabac, alcool, FRAX élevé)' },
  ],
},
{
  id: 'bpco', title: 'Spirométrie (dépistage BPCO)', icon: '🫁',
  indications: [
    { id: 'bpco-pa', label: 'Tabagisme ≥ 20 paquets-années et ≥ 40 ans', auto: p => p.grosFumeur && p.age !== null && p.age >= 40 },
    { id: 'bpco-toux', label: 'Toux chronique et/ou expectorations chroniques' },
    { id: 'bpco-dyspnee', label: 'Dyspnée, sifflements, essoufflement anormal' },
    { id: 'bpco-exac', label: 'Exacerbations respiratoires à répétition' },
    { id: 'bpco-expo', label: 'Exposition professionnelle (poussières, fumées, solvants)' },
  ],
},
{
  id: 'aaa', title: 'Échographie aorte abdominale (anévrisme)', icon: '🩸',
  indications: [
    { id: 'aaa-fumeur', label: 'Fumeur ou sevré, 65–85 ans', auto: p => p.fumeur && between(p, 65, 85) },
    { id: 'aaa-fam', label: 'Antécédent familial d\'anévrisme aortique' },
    { id: 'aaa-arteriopathie', label: 'Artériopathie obliterante / coronaropathie évoluée' },
  ],
},
{
  id: 'poumon', title: 'Scanner thoracique low-dose (cancer du poumon)', icon: '🫁',
  indications: [
    { id: 'poumon-tabac', label: 'Fumeur ou sevré, 50–74 ans, ≥ 20 paquets-années', auto: p => p.grosFumeur && between(p, 50, 74) },
    { id: 'poumon-expo', label: 'Exposition professionnelle (amiante, silice, métaux)' },
  ],
},
{
  id: 'ccr', title: 'Test immunologique dans les selles / coloscopie (cancer colorectal)', icon: '🧪',
  indications: [
    { id: 'ccr-age', label: '50–74 ans (dépistage organisé, tous les 2 ans)', auto: p => between(p, 50, 74) },
    { id: 'ccr-fam', label: 'Antécédent familial au 1er degré (colon, rectum), polypose, HNPCC/Lynch' },
    { id: 'ccr-signes', label: 'Signes d\'alerte : rectorragies, trouble du transit récent, douleurs' },
  ],
},
{
  id: 'mammo', title: 'Mammographie (cancer du sein)', icon: '🎗️',
  indications: [
    { id: 'mammo-age', label: 'Femme 50–74 ans (dépistage organisé, tous les 2 ans)', auto: p => isF(p) && between(p, 50, 74) },
    { id: 'mammo-fam', label: 'Antécédent familial (sein/ovaire) ou mutation BRCA' },
    { id: 'mammo-radio', label: 'Irradiation thoracique (Hodgkin...) ou hyperplasie atypique' },
  ],
},
{
  id: 'frottis', title: 'Frottis / test HPV (cancer du col)', icon: '🌸',
  indications: [
    { id: 'frottis-age', label: 'Femme 25–65 ans (HPV tous les 5 ans, 25–30 ans : frottis tous les 3 ans)', auto: p => isF(p) && between(p, 25, 65) },
    { id: 'frottis-jamais', label: 'Jamais de dépistage ou dépistage non à jour' },
  ],
},
{
  id: 'psa', title: 'PSA (cancer de la prostate) — décision partagée', icon: '♂️',
  indications: [
    { id: 'psa-age', label: 'Homme ≥ 50 ans : dépistage individuel possible, en informer bénéfices/risques', auto: p => isM(p) && p.age !== null && p.age >= 50 },
    { id: 'psa-fam', label: 'Antécédent familial (père, frère) avant 65 ans : dès 45 ans' },
    { id: 'psa-sympt', label: 'Symptômes urinaires (hématurie, troubles mictionnels)' },
  ],
},
{
  id: 'diabete', title: 'Glycémie à jeun / HbA1c (diabète de type 2)', icon: '🍪',
  indications: [
    { id: 'diabete-age', label: '45–75 ans (tous les 3 ans)', auto: p => between(p, 45, 75) },
    { id: 'diabete-obesite', label: 'Surpoids/obésité (IMC ≥ 25, tour de taille élevé) + sédentarité', auto: p => p.imc !== null && p.imc >= 25 },
    { id: 'diabete-hta', label: 'HTA ou dyslipidémie', auto: p => p.hta },
    { id: 'diabete-fam', label: 'Antécédent familial de diabète type 2' },
    { id: 'diabete-gest', label: 'Diabète gestationnel, ou origine à risque (Afrique subsaharienne, Asie, Inde)' },
    { id: 'diabete-connu', label: 'Diabète déjà connu : HbA1c à jour (objectif individualisé, en général < 7 %)', auto: p => p.diabete },
  ],
},
{
  id: 'foei', title: 'Fond d\'œil (rétinopathie diabétique)', icon: '👁️',
  indications: [
    { id: 'foei-diabete', label: 'Diabète de type 2 : examen annuel', auto: p => p.diabete },
    { id: 'foei-dmla', label: 'Sujet ≥ 60 ans : DMLA (acuité visuelle, Ophtalmo si signes)', auto: p => p.age !== null && p.age >= 60 },
  ],
},
{
  id: 'hcv', title: 'Sérologie hépatite C', icon: '🩺',
  indications: [
    { id: 'hcv-age', label: '18–59 ans : au moins une fois dans la vie', auto: p => between(p, 18, 59) },
    { id: 'hcv-risque', label: 'Usage de drogues IV/intranasal, transfusion avant 1992, tatouage/percing, prison' },
  ],
},
{
  id: 'glp1', title: 'Traitement médicamenteux de l\'obésité — GLP-1 (Wegovy® / Mounjaro®)', icon: '💉', scoring: 'glp1',
  indications: [
    { id: 'glp1-amm', label: 'PRESCRIPTION (AMM, tout médecin y compris MG depuis le 23/06/2025 — ANSM) : IMC ≥ 30 kg/m², ou IMC ≥ 27 + comorbidité liée au poids (HTA, diabète, dyslipidémie, SAS, maladie cardiovasculaire)', req: 'Critère AMM', auto: p => p.imc !== null && (p.imc >= 30 || (p.imc >= 27 && (p.diabete || p.hta || (p.ldl !== null && p.ldl >= 1.6)))) },
    { id: 'glp1-ado', label: 'Adolescent ≥ 12 ans avec obésité et poids > 60 kg (AMM)', req: 'Critère AMM' },
    { id: 'glp1-imc40', label: 'REMBOURSEMENT : IMC ≥ 40 kg/m² (obésité massive, sans comorbidité requise)', req: 'Critère remboursement', auto: p => p.imc !== null && p.imc >= 40 },
    { id: 'glp1-imc35-comorb', label: 'REMBOURSEMENT : IMC ≥ 35 kg/m² + au moins une comorbidité sévère (HTA, diabète, dyslipidémie, SAS sévère, AOMI, arthrose invalidante, stéatohépatite)', req: 'Critère remboursement', auto: p => p.imc !== null && p.imc >= 35 && (p.diabete || p.hta || (p.ldl !== null && p.ldl >= 1.6)) },
    { id: 'glp1-nutrition', label: 'Échec d\'une prise en charge nutritionnelle bien conduite (< 5 % de perte de poids à 6 mois)' },
    { id: 'glp1-regle', label: 'En complément d\'un régime hypocalorique et d\'une activité physique accrue (obligatoire)', req: 'Condition de remboursement' },
    { id: 'glp1-prescripteur', label: 'Primo-prescription réservée aux structures spécialisées (CSO, CHU, service nutrition/endocrinologie) ; renouvellement possible par le médecin traitant', req: 'Condition de remboursement' },
    { id: 'glp1-formulaire', label: 'Justificatif d\'accompagnement obligatoire à saisir sur amelipro (téléservice Assurance Maladie)', req: 'Condition de remboursement' },
    { id: 'glp1-prise', label: 'Remboursement 65 % par l\'Assurance Maladie (arrêtés du 28/05/2026, effectif 15/06/2026). Saxenda® n\'est PAS remboursé', req: 'Info remboursement' },
  ],
},
{
  id: 'ecg', title: 'ÉCG', icon: '💓',
  indications: [
    { id: 'ecg-fa', label: '≥ 65 ans : dépistage de la fibrillation atriale (palpation du pouls ; ECG si irrégulier ou suspicion)', auto: p => p.age !== null && p.age >= 65 },
    { id: 'ecg-hta', label: 'HTA : ECG dans le bilan initial / suivi', auto: p => p.hta },
    { id: 'ecg-cardio', label: 'Coronaropathie, valvulopathie ou cardiopathie connue : ECG de suivi' },
    { id: 'ecg-sympt', label: 'Symptômes : douleur thoracique, palpitations, dyspnée, lipothymie/syncope' },
    { id: 'ecg-sport', label: 'Bilan avant reprise d\'activité physique intense / compétition (> 35 ans)' },
    { id: 'ecg-preop', label: 'Bilan pré-opératoire (chirurgie à risque cardiovasculaire)' },
    { id: 'ecg-trt', label: 'Surveillance d\'un traitement cardiotoxique ou d\'un trouble ionique' },
  ],
},
{
  id: 'tsa', title: 'Doppler des troncs supra-aortiques (TSA)', icon: '🩸',
  indications: [
    { id: 'tsa-souffle', label: 'Souffle carotidien audible à l\'auscultation' },
    { id: 'tsa-ait', label: 'AIT, AVC, amaurose transitoire : bilan urgent' },
    { id: 'tsa-aomi', label: 'Artériopathie connue (coronaropathie, AOMI, anévrisme) : recherche de sténose associée' },
    { id: 'tsa-radio', label: 'Radiothérapie cervicale antérieure' },
    { id: 'tsa-fa', label: 'Fibrillation atriale (évaluation embolique)' },
    { id: 'tsa-preop', label: 'Bilan pré-opératoire (chirurgie à risque, CEC)' },
    { id: 'tsa-signe', label: 'Le dépistage systématique de la sténose carotidienne asymptomatique n\'est PAS recommandé (HAS) — cliquez uniquement si point ci-dessus' },
  ],
},
{
  id: 'aomi', title: 'Doppler artériel des membres inférieurs (AOMI)', icon: '🦵',
  indications: [
    { id: 'aomi-claudication', label: 'Claudication intermittente : douleur de marche soulagée par l\'arrêt' },
    { id: 'aomi-tabac', label: 'Fumeur ou sevré ≥ 50 ans : dépistage (IPS)', auto: p => p.fumeur && p.age !== null && p.age >= 50 },
    { id: 'aomi-diabete', label: 'Diabète ≥ 50 ans (ou ≥ 40 ans avec autre facteur de risque) : dépistage annuel par IPS', auto: p => p.diabete && p.age !== null && p.age >= 50 },
    { id: 'aomi-hta', label: 'HTA + dyslipidémie : dépistage si contexte', auto: p => p.hta && p.ldl !== null && p.ldl >= 1.6 },
    { id: 'aomi-signes', label: 'Signes d\'ischémie : ulcère, gangrène, douleur de décubitus, abolition d\'un pouls' },
    { id: 'aomi-preop', label: 'Bilan pré-opératoire / avant chirurgie vasculaire ou orthopédique majeure' },
  ],
},
{
  id: 'sas', title: 'Syndrome d\'apnées du sommeil (STOP-BANG)', icon: '😴', scoring: 'stopbang',
  indications: [
    { id: 'sas-s', label: 'S — Ronflements forts (observés par l\'entourage)' },
    { id: 'sas-t', label: 'T — Fatigue diurne excessive / somnolence (endormissements)' },
    { id: 'sas-o', label: 'O — Apnées observées pendant le sommeil' },
    { id: 'sas-p', label: 'P — Pression artérielle élevée (HTA traitée ou non)', auto: p => p.hta },
    { id: 'sas-b', label: 'B — IMC > 35 kg/m²', auto: p => p.imc !== null && p.imc > 35 },
    { id: 'sas-a', label: 'A — Âge > 50 ans', auto: p => p.age !== null && p.age > 50 },
    { id: 'sas-n', label: 'N — Tour de cou > 40 cm' },
    { id: 'sas-g', label: 'G — Sexe masculin', auto: p => p.sex === 'M' },
  ],
},
];

// ---------- Vaccins ----------
const VACCINS = [
{
  id: 'v-menb', title: 'Vaccin méningocoque B (Bexsero®)', icon: '🦠',
  indications: [
    { id: 'v-menb-nour', label: 'Nourrisson (né depuis 2023) : schéma M3, M5, rappel M12', req: 'Obligatoire', auto: p => p.age !== null && p.age < 2 },
    { id: 'v-menb-rat5', label: 'Enfant 2–4 ans révolus non vaccinés : rattrapage transitoire (2 doses)', req: 'Obligatoire', auto: p => p.age !== null && p.age >= 2 && p.age <= 4 },
    { id: 'v-menb-1524', label: 'Personne de 15 à 24 ans révolus : vaccination à proposer', req: 'Recommandée', auto: p => p.age !== null && p.age >= 15 && p.age <= 24 },
    { id: 'v-menb-risque', label: 'Personne à risque : déficit en complément / properdine, asplénie, greffe de CSH (rappel tous les 5 ans)', req: 'Recommandée' },
  ],
},
{
  id: 'v-menacwy', title: 'Vaccin méningocoque ACWY (Nimenrix® / Menquadfi® / Menveo®)', icon: '🦠',
  indications: [
    { id: 'v-acwy-nour', label: 'Nourrisson (né depuis 2023) : dose à 6 mois (Nimenrix) + rappel 12 mois (Nimenrix ou Menquadfi)', req: 'Obligatoire', auto: p => p.age !== null && p.age < 2 },
    { id: 'v-acwy-rat', label: 'Rattrapage 12–24 mois : 1 dose ACWY ; 2–4 ans révolus non vaccinés : rattrapage transitoire, 1 dose', req: 'Obligatoire', auto: p => p.age !== null && p.age >= 1 && p.age <= 4 },
    { id: 'v-acwy-ado', label: 'Adolescent 11–14 ans : 1 dose, indépendamment du statut vaccinal (campagne collèges)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 11 && p.age <= 14 },
    { id: 'v-acwy-1524', label: 'Rattrapage 15–24 ans révolus : 1 dose', req: 'Recommandée', auto: p => p.age !== null && p.age >= 15 && p.age <= 24 },
    { id: 'v-acwy-risque', label: 'Personne à risque : déficit en complément / properdine, asplénie, greffe de CSH (rappel tous les 5 ans)', req: 'Recommandée' },
  ],
},
{
  id: 'v-grippe', title: 'Vaccin grippe saisonnière', icon: '💉',
  indications: [
    { id: 'v-grippe-65', label: 'Personne ≥ 65 ans : chaque année', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 },
    { id: 'v-grippe-comorb', label: 'Comorbidité (diabète, HTA, maladie respiratoire ou cardiaque, obésité, DFG < 60)', req: 'Recommandée', auto: p => p.diabete || p.hta || (p.imc !== null && p.imc >= 30) || (p.dfg !== null && p.dfg < 60) },
    { id: 'v-grippe-grossesse', label: 'Femme enceinte (tout trimestre)' },
  ],
},
{
  id: 'v-pneumo', title: 'Vaccin pneumocoque', icon: '💉',
  indications: [
    { id: 'v-pneumo-65', label: 'Personne ≥ 65 ans (schéma adapté selon antécédents)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 },
    { id: 'v-pneumo-comorb', label: 'Comorbidité avant 65 ans : diabète, maladie respiratoire, cardiaque, rénale (DFG < 60), immunodépression', req: 'Recommandée', auto: p => p.diabete || (p.dfg !== null && p.dfg < 60) },
  ],
},
{
  id: 'v-covid', title: 'Vaccin COVID-19 (rappel)', icon: '💉',
  indications: [
    { id: 'v-covid-65', label: 'Personne ≥ 65 ans et/ou comorbidités : rappel selon recommandations en vigueur', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 || p.diabete || p.hta || (p.imc !== null && p.imc >= 30) },
  ],
},
{
  id: 'v-rsv', title: 'Vaccin VRS / RSV (bronchiolite)', icon: '💉',
  indications: [
    { id: 'v-rsv-75', label: 'Personne ≥ 75 ans', req: 'Recommandée', auto: p => p.age !== null && p.age >= 75 },
    { id: 'v-rsv-65', label: 'Personne 65–74 ans avec comorbidité (diabète, HTA, insuffisance respiratoire ou cardiaque, DFG < 60)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 && p.age <= 74 && (p.diabete || p.hta || (p.dfg !== null && p.dfg < 60)) },
    { id: 'v-rsv-femme-enceinte', label: 'Femme enceinte : vaccination de la mère (8e mois de grossesse, selon campagne en cours)' },
  ],
},
{
  id: 'v-zona', title: 'Vaccin zona (Shingrix®)', icon: '💉',
  indications: [
    { id: 'v-zona-6574', label: 'Personne 65–74 ans', req: 'Recommandée', auto: p => p.age !== null && p.age >= 65 && p.age <= 74 },
    { id: 'v-zona-5064', label: 'Personne 50–64 ans avec comorbidité (diabète, HTA, DFG < 60, immunodépression)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 50 && p.age <= 64 && (p.diabete || p.hta || (p.dfg !== null && p.dfg < 60)) },
  ],
},
{
  id: 'v-dtp', title: 'Rappel diphtérie / tétanos / poliomyélite (DTP)', icon: '💉',
  indications: [
    { id: 'v-dtp-adulte', label: 'Adulte : rappel dTP tous les 10 ans (ou 20 ans si rappels à jour et primovaccination complète)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 18 },
    { id: 'v-dtp-bles', label: 'Plaie : rappel tétanos si dernier rappel > 10 ans (plaie souillée : > 5 ans)' },
  ],
},
{
  id: 'v-hpv', title: 'Vaccin HPV (papillomavirus)', icon: '💉',
  indications: [
    { id: 'v-hpv-1114', label: 'Adolescent·e 11–14 ans (2 doses)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 11 && p.age <= 14 },
    { id: 'v-hpv-1519', label: 'Rattrapage 15–19 ans (3 doses)', req: 'Recommandée', auto: p => p.age !== null && p.age >= 15 && p.age <= 19 },
  ],
},
{
  id: 'v-hepb', title: 'Vaccin hépatite B', icon: '💉',
  indications: [
    { id: 'v-hepb-rat', label: 'Rattrapage jusqu\'à 18 ans révolus', req: 'Recommandée', auto: p => p.age !== null && p.age <= 18 },
    { id: 'v-hepb-risque', label: 'Personne à risque : multiples partenaires, IST, usager de drogues, voyage en zone d\'endémie, profession de santé, entourage d\'un porteur', req: 'Recommandée' },
  ],
},
{
  id: 'v-rougeole', title: 'Vaccin rougeole (ROR — rattrapage)', icon: '💉',
  indications: [
    { id: 'v-ror-1980', label: 'Né·e après 1980 : 2 doses de vaccin trivalent ROR à jour', req: 'Recommandée', auto: p => p.age !== null && p.age <= 45 },
  ],
},
];

const ALL_GROUPS = [
  { title: 'Examens de dépistage', exams: EXAMS },
  { title: 'Vaccinations', exams: VACCINS },
];

// ---------- État ----------
const overrides = {}; // indicationId -> true | false (coche manuelle)
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
  if (exam.scoring === 'glp1') {
    const idChecked = id => checked.some(i => i.id === id);
    const ammOk = idChecked('glp1-amm') || idChecked('glp1-ado');
    const imcOk = idChecked('glp1-imc40') || idChecked('glp1-imc35-comorb');
    const nutOk = idChecked('glp1-nutrition');
    const eligible = ammOk && imcOk && nutOk;
    let level;
    if (eligible) level = 'Prescriptible (MG) ET remboursé 65 %';
    else if (ammOk && imcOk) level = 'Échec nutritionnel à documenter (6 mois)';
    else if (ammOk) level = 'AMM remplie — mais remboursement : IMC ≥ 40 ou ≥ 35 + comorbidité sévère';
    else level = 'Pas de critère AMM rempli';
    return { checked, indicated: eligible, level };
  }
  return { checked, indicated: n > 0 };
}

// ---------- Rendu ----------
function render() {
  const p = P();
  const container = document.getElementById('exams');
  container.innerHTML = '';

  const complete = p.age !== null && p.sex && p.tabac;
  document.getElementById('patient-warn').classList.toggle('hidden', !!complete);

  const reminders = [];
  if (p.tabac === 'actif') reminders.push('🚬 Patient fumeur : proposer une aide au sevrage (substitution, consultation).');
  if (p.fumeur && p.pa === null && p.age !== null && p.age >= 40) reminders.push('⚠️ Paquets-années non renseignées : nécessaires pour BPCO, cancer du poumon, AAA.');
  if (p.diabete && p.dfg === null) reminders.push('🩸 Patient diabétique : vérifier la fonction rénale (DFG, rapport protéinurie/créatinurie).');
  if (p.dfg !== null && p.dfg < 60) reminders.push('💧 DFG < 60 mL/min : maladie rénale chronique — adapter traitements, éviter néphrotoxiques.');
  if (p.imc !== null && p.imc >= 30) reminders.push('⚖️ Obésité (IMC ≥ 30) : évaluer, proposer prise en charge (activité physique, diététique, chirurgie si indication).');
  if (p.ldl !== null && p.ldl >= 1.9) reminders.push('🧬 LDL ≥ 1,9 g/L : évoquer une hypercholestérolémie familiale (dépistage familial, avis spécialisé).');
  else if (p.ldl !== null && p.ldl >= 1.6) reminders.push('🫀 LDL ≥ 1,6 g/L : évaluer le risque cardiovasculaire global (SCORE2), adapter la prise en charge.');
  document.getElementById('reminders').innerHTML = reminders.map(r => `<div>${escapeHtml(r)}</div>`).join('');
  document.getElementById('reminders').classList.toggle('hidden', !reminders.length);

  ALL_GROUPS.forEach(group => {
    const groupTitle = document.createElement('h3');
    groupTitle.className = 'group-title';
    groupTitle.textContent = group.title;
    container.appendChild(groupTitle);
    group.exams.forEach(exam => {
    const st = examState(exam);
    const card = document.createElement('section');
    card.className = 'card exam' + (st.indicated ? ' indicated' : '');

    const header = document.createElement('div');
    header.className = 'exam-header';
    header.innerHTML = `
      <h2>${exam.icon} ${escapeHtml(exam.title)}</h2>
      <span class="verdict ${st.indicated ? 'yes' : 'no'}">${exam.scoring && st.level ? st.level : (st.indicated ? 'INDIQUÉ' : 'Pas d\'indication')}</span>`;
    card.appendChild(header);

    exam.indications.forEach(ind => {
      const auto = ind.auto ? !!ind.auto(p) : null;
      const checked = isChecked(ind);
      const row = document.createElement('label');
      row.className = 'ind' + (checked ? ' checked' : '');
      row.innerHTML = `
        <input type="checkbox" data-ind="${ind.id}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(ind.label)}</span>
        ${ind.req ? `<span class="tag req ${ind.req === 'Obligatoire' ? 'req-ob' : 'req-rec'}">${escapeHtml(ind.req)}</span>` : ''}
        ${auto === true && checked ? '<span class="tag auto">auto</span>' : ''}
        ${auto === true && !checked ? '<span class="tag off">auto (décoché)</span>' : ''}
        ${auto === false && checked ? '<span class="tag manual">ajout manuel</span>' : ''}`;
      card.appendChild(row);
    });

    container.appendChild(card);
    });
  });

  updateSummary();
}

function updateSummary() {
  const all = ALL_GROUPS.flatMap(g => g.exams);
  const indicated = all.filter(e => examState(e).indicated);
  document.getElementById('progress-info').textContent =
    `${indicated.length} examen${indicated.length > 1 ? 's' : ''} avec indication` +
    (indicated.length ? ` : ${indicated.map(e => e.title.split(' (')[0]).join(', ')}` : '');
}

// ---------- Événements ----------
document.addEventListener('change', e => {
  const cb = e.target.closest('input[data-ind]');
  if (!cb) return;
  const id = cb.dataset.ind;
  const exam = ALL_GROUPS.flatMap(g => g.exams).find(x => x.indications.some(i => i.id === id));
  const ind = exam.indications.find(i => i.id === id);
  overrides[id] = cb.checked;
  render();
});

['pat-age', 'pat-sex', 'pat-tabac', 'pat-pa', 'pat-diabete', 'pat-hta', 'pat-dfg', 'pat-imc', 'pat-ldl'].forEach(idn =>
  document.getElementById(idn).addEventListener('change', render));

document.getElementById('pat-date').value = new Date().toISOString().slice(0, 10);

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Réinitialiser les coches ?')) {
    Object.keys(overrides).forEach(k => delete overrides[k]);
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
      dfg: document.getElementById('pat-dfg').value,
      imc: document.getElementById('pat-imc').value,
      ldl: document.getElementById('pat-ldl').value,
      date: document.getElementById('pat-date').value,
    },
    overrides
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
  document.getElementById('pat-dfg').value = data.patient?.dfg || '';
  document.getElementById('pat-imc').value = data.patient?.imc || '';
  document.getElementById('pat-ldl').value = data.patient?.ldl || '';
  document.getElementById('pat-date').value = data.patient?.date || new Date().toISOString().slice(0, 10);
  Object.keys(overrides).forEach(k => delete overrides[k]);
  Object.assign(overrides, data.overrides || {});
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
    if (!st.indicated) return '';
    const inds = st.checked.map(i => `<li>${escapeHtml(i.label)}${i.req ? ` <em>(${escapeHtml(i.req)})</em>` : ''}</li>`).join('');
    const scoreInfo = exam.scoring === 'stopbang' ? ` — score ${st.score}/8 (risque ${st.level})` : (exam.scoring === 'glp1' && st.level ? ` — ${st.level}` : '');
    return `<div class="exam-box">
      <div class="exam-title">${exam.icon} ${escapeHtml(exam.title)}${scoreInfo}</div>
      <ul>${inds}</ul>
      <div class="exam-cta">→ À prescrire / à programmer avec votre médecin</div>
    </div>`;
  }).join('');

  const todoCount = ALL_GROUPS.flatMap(g => g.exams).filter(e => examState(e).indicated).length;

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

      <div class="plan">
        <strong>Comment faire ?</strong>
        <ol>
          <li>Prenez rendez-vous pour les examens listés ci-dessus (certains nécessitent une ordonnance de votre médecin).</li>
          <li>Certains dépistages vous seront proposés automatiquement par courrier (programme national de dépistage).</li>
          <li>En cas de question ou de résultat anormal, contactez votre médecin traitant.</li>
        </ol>
      </div>

      <p class="foot">Document remis en consultation — rappel des recommandations françaises de dépistage (HAS, dépistage organisé). Ne remplace pas l'avis médical.</p>
    </div>`;
  window.print();
});

// ---------- Utilitaires ----------
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

render();
