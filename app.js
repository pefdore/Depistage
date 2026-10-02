/* Tour d'horizon 360° — check-list de dépistage par appareil.
   100 % local, intégrable dans une app Python (voir integration.md). */

// ---------- Patient ----------
let PATIENT = { nom: '', prenom: '', ddn: '', sex: '' };

function computeAge(ddn, refDate) {
  if (!ddn) return null;
  const d = new Date(ddn);
  if (isNaN(d)) return null;
  const ref = refDate ? new Date(refDate) : new Date();
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
  return age < 0 || age > 130 ? null : age;
}

const P = () => {
  const age = computeAge(PATIENT.ddn, document.getElementById('pat-date').value);
  return { age, sex: PATIENT.sex };
};

const adult   = p => p.age !== null && p.age >= 18;
const minor   = p => p.age !== null && p.age < 18;
const between = (p, a, b) => p.age !== null && p.age >= a && p.age <= b;
const isF = p => p.sex === 'F';
const isM = p => p.sex === 'M';

/* ---------- Structure des items ----------
   { id, label, detail, show(patient), why(patient) }
   show : condition d'affichage (sexe/âge).
   why  : justification / critère affiché en drapeau ⓘ.
   input: 'text' | 'date' | 'note' — champ libre optionnel.
   statuts : null | 'oui' (fait / à jour / présent) | 'non' (à faire) | 'na' */

const SECTIONS = [
// ============================ PNEUMOLOGIE ============================
{
  id: 'pneumo', title: '🫁 Pneumologie',
  items: [
    { id: 'pneumo-tabac', label: 'Statut tabagique évalué (jamais / sevré / actif — paquets-années)', show: () => true,
      why: () => 'Dépistage du tabagisme à chaque consultation (HAS).' },
    { id: 'pneumo-tabac-aide', label: 'Si fumeur : aide au sevrage proposée (substitution, consultation, TCC)', show: () => true, input: 'note' },
    { id: 'pneumo-bpco-sympt', label: 'BPCO : symptômes recherchés (toux chronique, expectorations, dyspnée, sifflements)', show: () => true,
      why: p => (p.age >= 40) ? 'Fumeur/ex-fumeur ≥ 40 ans avec symptômes → spirométrie indiquée.' : null },
    { id: 'pneumo-bpco-spiro', label: 'BPCO : spirométrie / EFR avec test de réversibilité', show: () => true },
    { id: 'pneumo-a1at', label: 'Déficit en alpha-1-antitrypsine : à évoquer si BPCO < 45 ans ou non-fumeur', show: p => p.age !== null && p.age < 60 },
    { id: 'pneumo-saos', label: 'Syndrome d\'apnées du sommeil : dépistage (STOP-BANG, ronflements, somnolence)', show: () => true },
    { id: 'pneumo-asthma', label: 'Asthme : contrôle, DEP, observance, technique d\'inhalation', show: () => true },
    { id: 'pneumo-tub', label: 'Tuberculose : dépistage (LGRA/IGRA) si exposition, immunodépression, origine à risque', show: () => true },
    { id: 'pneumo-poumon-scanner', label: 'Cancer du poumon : scanner low-dose annuel si fumeur/ex-fumeur 50–74 ans avec tabagisme important', show: p => between(p, 50, 74),
      why: p => between(p, 50, 74) ? 'Dépistage individuel à envisager : 50–74 ans, tabagisme ≥ 20 PA (HAS).' : null },
    { id: 'pneumo-vacc', label: 'Vaccins respiratoires à jour : grippe, pneumocoque, COVID, VRS (voir section Immunologie)', show: () => true },
    { id: 'pneumo-exacerb', label: 'Antécédents d\'exacerbations / hospitalisations respiratoires', show: () => true },
    { id: 'pneumo-dmep', label: 'DMP en cours (ergothérapie respiratoire) proposée si dyspnée chronique', show: () => true },
  ]
},
// ============================ RHUMATOLOGIE / OS ============================
{
  id: 'rhumato', title: '🦴 Rhumatologie — Ostéoporose',
  items: [
    { id: 'osteo-indications', label: 'INDICATIONS d\'ostéodensitométrie (DMO) — cocher chaque indication présente :', show: () => true },
    { id: 'osteo-fem65', label: 'Femme ≥ 65 ans', show: p => isF(p) && p.age >= 65,
      why: p => 'Indication systématique : femme ≥ 65 ans (HAS).' },
    { id: 'osteo-menop40', label: 'Ménopause précoce (< 40 ans) ou ménopause avant 45 ans', show: p => isF(p) && p.age >= 40,
      why: () => 'Indication de DMO : ménopause précoce (avant 40–45 ans).' },
    { id: 'osteo-imc19', label: 'IMC < 19 (ou perte de poids importante)', show: () => true,
      why: () => 'Indication de DMO : maigreur (IMC < 19).' },
    { id: 'osteo-fracture', label: 'Fracture de faible énergie après 50 ans (poignet, vertèbre, col du fémur…)', show: p => p.age !== null && p.age >= 50,
      why: () => 'Fracture de faible énergie = indication de DMO (fragilité osseuse).' },
    { id: 'osteo-cortico', label: 'Corticothérapie prolongée (≥ 7,5 mg/j prednisone ≥ 3 mois) ou prévue', show: () => true,
      why: () => 'Indication de DMO : corticothérapie prolongée.' },
    { id: 'osteo-ATCDfam', label: 'Antécédent familial d\'ostéoporose (fracture du col fémoral chez un parent au 1er degré)', show: () => true },
    { id: 'osteo-fdr', label: 'Autres FDR : tabac, alcool ≥ 3 verres/j, ménopause < 45 ans, hyperthyroïdie, hyperparathyroïdie, hypogonadisme, maladie inflammatoire chronique (RCH, PR), malabsorption, immobilisation prolongée', show: () => true },
    { id: 'osteo-homme70', label: 'Homme ≥ 70 ans : dépistage possible (HAS 2024)', show: p => isM(p) && p.age >= 70,
      why: () => 'HAS 2024 : dépistage possible chez l\'homme ≥ 70 ans.' },
    { id: 'osteo-frax', label: 'FRAX calculé ≥ seuil d\'intervention → DMO ou traitement direct', show: () => true },
    { id: 'osteo-dmo', label: 'DMO réalisée / à prescrire selon les indications ci-dessus', show: () => true },
    { id: 'osteo-vitd', label: 'Vitamine D et apports calciques : évaluation / supplémentation si carence', show: () => true },
    { id: 'osteo-trt', label: 'Si ostéoporose connue : traitement, observance, contrôle', show: () => true },
    { id: 'osteo-chutes', label: 'Risque de chute évalué (traitements, vision, marche)', show: p => p.age !== null && p.age >= 65 },
    { id: 'rhumato-pr', label: 'Polyarthrite / douleurs inflammatoires : dépistage rhumatismal si symptômes', show: () => true },
    { id: 'rhumato-goutte', label: 'Goutte : uricémie si crises / syndrome métabolique', show: () => true },
    { id: 'rhumato-lomb', label: 'Lombalgie chronique / examen rachis', show: () => true },
  ]
},
// ============================ CARDIOLOGIE (hors RCV global → risquecv.fr) ============================
{
  id: 'cardio', title: '❤️ Cardiologie (RCV global : risquecv.fr)',
  items: [
    { id: 'cardio-ta', label: 'Pression artérielle mesurée (HTA : dépistage au moins tous les 2 ans si TA normale)', show: () => true,
      why: () => 'Le score RCV global se calcule sur risquecv.fr — ici : dépistage HTA seulement.' },
    { id: 'cardio-aaa', label: 'Anévrisme aorte abdominale : échographie si fumeur/ex-fumeur 65–85 ans', show: p => between(p, 65, 85),
      why: p => between(p, 65, 85) ? 'Dépistage AAA : une échographie chez fumeur/ex-fumeur 65–85 ans (HAS).' : null },
    { id: 'cardio-arih', label: 'Fibrillation auriculaire : ARIH ≥ 65 ans (palpation pouls / auto-mesure)', show: p => p.age !== null && p.age >= 65,
      why: () => 'Dépistage FA par palpation du pouls ≥ 65 ans (prévention AVC).' },
    { id: 'cardio-ic', label: 'Insuffisance cardiaque : dépistage si dyspnée / œdèmes / fatigabilité', show: () => true },
    { id: 'cardio-ep', label: 'Artériopathie des membres inférieurs : pouls périphériques, claudication (diabétiques, fumeurs)', show: () => true },
    { id: 'cardio-mv', label: 'Souffle cardiaque / valvulopathie : auscultation à l\'occasion de l\'examen', show: () => true },
  ]
},
// ============================ MÉTABOLISME / ENDOCRINO ============================
{
  id: 'metabolisme', title: '🍬 Métabolisme / Endocrinologie',
  items: [
    { id: 'meta-diabete', label: 'Diabète type 2 : glycémie à jeun ou HbA1c', show: () => true,
      why: p => between(p, 45, 75) ? 'Dépistage recommandé tous les 3 ans entre 45 et 75 ans (HAS).' : 'À faire avant 45 ans si FDR (obésité, ATCD familiaux, HTA, SAS, diabète gestationnel).' },
    { id: 'meta-fdr-diab', label: 'FDR diabète : obésité/tour de taille, ATCD familial, HTA, dyslipidémie, sédentarité, origine à risque', show: () => true },
    { id: 'meta-prediab', label: 'Si prediabète : contrôle annuel HbA1c/glycémie', show: () => true },
    { id: 'meta-obesite', label: 'IMC + tour de taille mesurés', show: () => true },
    { id: 'meta-thyroide', label: 'TSH si signes d\'hypothyroïdie, goitre, ≥ 60 ans ou facteurs de risque thyroïdiens', show: () => true },
    { id: 'meta-hemochro', label: 'Hémochromatose : ferritinémie/TRANSFERRINE si symptômes ou ATCD familial (C282Y)', show: () => true },
    { id: 'meta-dyslipid', label: 'Bilan lipidique : LDL selon risque (voir risquecv.fr pour le calcul du risque global)', show: () => true },
  ]
},
// ============================ NÉPHROLOGIE / UROLOGIE ============================
{
  id: 'nephro-uro', title: '🫘 Néphrologie / Urologie',
  items: [
    { id: 'uro-dfg', label: 'Fonction rénale : DFG + protéinurie/créatinurie si HTA, diabète, âge, traitement néphrotoxique', show: () => true },
    { id: 'uro-prostate-territ', label: 'Hypertrophie bénigne de la prostate : symptômes du bas appareil urinaire (IPSS)', show: p => isM(p) && p.age !== null && p.age >= 50 },
    { id: 'uro-prostate-psa', label: 'Cancer de la prostate : PSA à discuter (décision partagée, informer bénéfices/risques)', show: p => isM(p) && p.age !== null && p.age >= 50,
      why: p => 'PSA : dépistage individuel à discuter ≥ 50 ans (ou ≥ 45 ans si ATCD familial / origine afro-antillaise) — HAS.' },
    { id: 'uro-tur', label: 'Toucher rectal si symptômes urinaires ou PSA élevé', show: p => isM(p) && p.age !== null && p.age >= 50 },
    { id: 'uro-incont', label: 'Incontinence / troubles mictionnels : dépistage (femmes, sujet âgé)', show: () => true },
    { id: 'uro-lithiasis', label: 'Lithiase urinaire : bilan si coliques néphrétiques récidivantes', show: () => true },
  ]
},
// ============================ GYNÉCOLOGIE / OBSTÉTRIQUE ============================
{
  id: 'gyneco', title: '🌸 Gynécologie (femmes)',
  items: [
    { id: 'gyn-cervix', label: 'Frottis cervico-utérin (ou test HPV) tous les 3 ans / HPV tous les 5 ans', show: p => isF(p) && between(p, 25, 65),
      why: p => 'Dépistage organisé : 25–65 ans (HPV tous les 5 ans depuis 25 ans).' },
    { id: 'gyn-hpv-vacc', label: 'Vaccination HPV : statut à proposer si < 20 ans (rattrapage 15–19 ans)', show: p => isF(p) && p.age !== null && p.age < 20 },
    { id: 'gyn-mammo', label: 'Mammographie tous les 2 ans (dépistage organisé)', show: p => isF(p) && between(p, 50, 74),
      why: p => 'Dépistage organisé : 50–74 ans, tous les 2 ans.' },
    { id: 'gyn-mammo-fdr', label: 'Mammographie avant 50 ans si ATCD familial / BRCA / irradiation thoracique', show: p => isF(p) && p.age !== null && p.age < 50 && p.age >= 25 },
    { id: 'gyn-seins-exam', label: 'Examen clinique des seins + éducation à l\'auto-palpation', show: p => isF(p) },
    { id: 'gyn-ovaire', label: 'Cancer de l\'ovaire : pas de dépistage systématique, mais symptômes évocateurs à connaître', show: p => isF(p) && p.age !== null && p.age >= 50 },
    { id: 'gyn-endometre', label: 'Cancer de l\'endomètre : métrorragies post-ménopause → avis gynéco rapide', show: p => isF(p) && p.age !== null && p.age >= 50 },
    { id: 'gyn-contraception', label: 'Contraception : adaptée, tolérée, à jour', show: p => isF(p) && between(p, 15, 55) },
    { id: 'gyn-grossesse', label: 'Grossesse : désir / en cours / post-partum (acide folique, sérologies)', show: p => isF(p) && between(p, 18, 51) },
    { id: 'gyn-menopause', label: 'Ménopause : symptômes, troubles génito-urinaires, TRH à évaluer', show: p => isF(p) && p.age !== null && p.age >= 45 },
    { id: 'gyn-diab-gest', label: 'ATCD de diabète gestationnel ou prééclampsie → surveillance cardio-métabolique renforcée', show: p => isF(p) },
  ]
},
// ============================ GASTRO-ENTÉROLOGIE ============================
{
  id: 'gastro', title: '🩻 Gastro-entérologie',
  items: [
    { id: 'gas-crc', label: 'Cancer colorectal : test immunologique (recherche sang occulte) tous les 2 ans', show: p => between(p, 50, 74),
      why: p => 'Dépistage organisé : 50–74 ans, tous les 2 ans.' },
    { id: 'gas-coloscopie', label: 'Coloscopie si test positif, ATCD familial (HNPCC, polypose), ou signes d\'alerte', show: () => true },
    { id: 'gas-signes', label: 'Signes d\'alerte digestive : rectorragies, melena, dysphagie, amaigrissement, douleurs chroniques, alternating bowel habit', show: () => true },
    { id: 'gas-helicobacter', label: 'Helicobacter pylori : dépistage/éradication si ulcère, ATCD, dyspepsie, origine à risque', show: () => true },
    { id: 'gas-hbp', label: 'Hépatite B : statut vaccinal / sérologie si risque', show: () => true },
    { id: 'gas-hcv', label: 'Hépatite C : sérologie au moins une fois chez 18–59 ans (recommandation HAS)', show: p => between(p, 18, 59),
      why: p => 'Dépistage HCV au moins une fois chez les adultes 18–59 ans (HAS).' },
    { id: 'gas-cirrhose', label: 'Si consommation d\'alcool à risque ou stéatose : bilan hépatique / FibroScan', show: () => true },
    { id: 'gas-micronutriments', label: 'Carence en fer / B12 / folates : NFS si fatigue, carence martiale (femmes, végétariens, âgés)', show: () => true },
  ]
},
// ============================ IMMUNOLOGIE / VACCINS ============================
{
  id: 'immuno', title: '💉 Immunologie — Vaccinations',
  items: [
    { id: 'vacc-carnet', label: 'Carnet vaccinal vérifié (MesVaccins.net, carnet de santé)', show: () => true },
    { id: 'vacc-dtp', label: 'Diphtérie / tétanos / poliomyélite : rappel à jour (rappel à 25, 45, 65 ans puis tous les 10 ans)', show: () => true,
      why: p => (p.age !== null && p.age >= 65) ? '≥ 65 ans : rappel DTP tous les 10 ans.' : null },
    { id: 'vacc-grippe', label: 'Grippe saisonnière', show: () => true,
      why: p => (p.age !== null && p.age >= 65) ? 'Recommandée chaque année dès 65 ans (ou maladie chronique).' : null },
    { id: 'vacc-covid', label: 'COVID-19 : à jour selon recommandations (≥ 65 ans, comorbidités)', show: () => true },
    { id: 'vacc-pneumo', label: 'Pneumocoque : schéma à jour (65–85 ans ou pathologie chronique)', show: p => p.age !== null && p.age >= 65,
      why: p => between(p, 65, 85) ? 'Vaccination pneumococcique recommandée 65–85 ans (schéma adapté selon statut).' : null },
    { id: 'vacc-rsv', label: 'VRS : vaccination ≥ 75 ans (ou ≥ 65 ans avec comorbidités)', show: p => p.age !== null && p.age >= 65,
      why: p => (p.age >= 75) ? 'Recommandée à partir de 75 ans (HAS 2024–2025).' : '≥ 65 ans avec comorbidités : possible.' },
    { id: 'vacc-zona', label: 'Zona (Shingrix) : 65–74 ans (ou 50–64 ans avec comorbidités)', show: p => p.age !== null && p.age >= 65,
      why: p => between(p, 65, 74) ? 'Recommandée entre 65 et 74 ans.' : null },
    { id: 'vacc-hpv', label: 'HPV : 11–14 ans (rattrapage 15–19 ans)', show: p => p.age !== null && p.age >= 11 && p.age <= 19,
      why: () => 'Vaccination recommandée à 11–14 ans (rattrapage jusqu\'à 19 ans révolus).' },
    { id: 'vacc-rub-int', label: 'Rappel rougeole (ROR) : statut vérifié (né après 1980, 2 doses)', show: p => p.age !== null && p.age >= 18 },
    { id: 'vacc-hepb', label: 'Hépatite B : statut vaccinal (sérologie si risque)', show: () => true },
    { id: 'vacc-menin', label: 'Méningocoque ABCYW : à jour selon âge/situation (avis patients 16–24 ans, aspiration)', show: p => p.age !== null && p.age <= 24 },
    { id: 'vacc-grossesse', label: 'Vaccins grossesse : rappel coqueluche (Tdap) à chaque grossesse, VRS/grpe pendant la grossesse selon calendrier', show: p => isF(p) && between(p, 18, 50) },
  ]
},
// ============================ NÉOPLASIES (vue transversale) ============================
{
  id: 'neo', title: '🔎 Néoplasies — points de vigilance',
  items: [
    { id: 'neo-signes', label: 'Signes d\'alerte généraux : amaigrissement inexpliqué, hémorragies, adénopathies, toux > 3 sem, dysphagie, douleur chronique inhabituelle', show: () => true },
    { id: 'neo-peau', label: 'Cancer de la peau : examen des lésions suspectes / éducation à l\'auto-examen (photoprotection)', show: () => true },
    { id: 'neo-genet', label: 'ATCD familiaux de cancers (sein/ovaire/colon/pancréas/prostate) : consultation d\'oncogénétique à envisager', show: () => true },
    { id: 'neo-suivi', label: 'Suivi oncologique si ATCD personnel : examens programmés, biologiste référent', show: () => true },
  ]
},
// ============================ NEURO / PSYCHIAATRIE ============================
{
  id: 'neuro', title: '🧠 Neurologie / Psychiatrie',
  items: [
    { id: 'neuro-depression', label: 'Dépression : dépistage (PHQ-2, questions simples) si contexte', show: () => true },
    { id: 'neuro-anxiete', label: 'Anxiété / trouble anxieux généralisé (GAD-2)', show: () => true },
    { id: 'neuro-cognitif', label: 'Troubles cognitifs : repérage si plainte (patient/entourage) ≥ 70 ans (MMS, consultation mémoire)', show: p => p.age !== null && p.age >= 70,
      why: () => 'Repérage des troubles cognitifs chez le sujet âgé (HAS).' },
    { id: 'neuro-avc', label: 'Facteurs de risque d\'AVC connus et contrôlés (FA, HTA, tabac — RCV : risquecv.fr)', show: () => true },
    { id: 'neuro-cephalees', label: 'Céphalées chroniques / migraines : recherche de signes de gravité', show: () => true },
    { id: 'neuro-epilepsie', label: 'Épilepsie : contrôle des crises, observance, permis/plan de conduite', show: () => true },
    { id: 'neuro-parkinson', label: 'Syndrome parkinsonien : dépistage moteur si signes (tremblement, rigidité, lenteur)', show: p => p.age !== null && p.age >= 60 },
    { id: 'neuro-suicide', label: 'Risque suicidaire évalué si détresse psychique', show: () => true },
  ]
},
// ============================ ORL / OPHTALMO ============================
{
  id: 'orl', title: '👂 ORL / Ophtalmologie',
  items: [
    { id: 'orl-audition', label: 'Audition : dépistage de la déficience auditive (60–74 ans, HAS)', show: p => p.age !== null && p.age >= 60,
      why: () => 'Dépistage de la déficience auditive recommandé chez les 60–74 ans (HAS).' },
    { id: 'orl-vision', label: 'Vision : acuité visuelle, cataracte, DMLA (examen ophtalmo si signes)', show: p => p.age !== null && p.age >= 50 },
    { id: 'orl-glaucome', label: 'Glaucoma : dépistage ophtalmologique si ≥ 40 ans avec FDR (ATCD familial, myopie forte, corticoïdes)', show: p => p.age !== null && p.age >= 40 },
    { id: 'orl-diabete-fond', label: 'Fond d\'œil annuel si diabète (rétinopathie diabétique)', show: () => true },
    { id: 'orl-angine', label: 'Angine : streptotest si symptomatologie (pédiatrie/adulte jeune)', show: p => p.age !== null && p.age < 40 },
    { id: 'orl-saos-ent', label: 'ORL : hypertrophie amygdalienne / SAOS de l\'enfant (attention pédiatrie)', show: p => minor(p) },
  ]
},
// ============================ DERMATOLOGIE ============================
{
  id: 'dermato', title: '☀️ Dermatologie',
  items: [
    { p: true, id: 'derm-examen', label: 'Examen cutané : lésions suspectes, naevi atypiques', show: () => true },
    { id: 'derm-photoprotection', label: 'Photoprotection / éducation solaire (sujets à peau claire, immunodéprimés)', show: () => true },
    { id: 'derm-dermato-onco', label: 'ATCD de mélanome / carcinome : suivi dermatologique annuel', show: () => true },
  ]
},
// ============================ INFECTIOLOGIE / IST ============================
{
  id: 'infectio', title: '🦠 Infectiologie / IST',
  items: [
    { id: 'ist-vih', label: 'VIH : dépistage au moins une fois si situation à risque, ou proposition systématique (18–65 ans)', show: p => between(p, 18, 65) },
    { id: 'ist-chlamydia', label: 'Chlamydia/gonocoque : dépistage < 30 ans avec partenaires multiples / nouveaux partenaire', show: p => p.age !== null && p.age < 30 },
    { id: 'ist-syphilis', label: 'Syphilis : sérologie si situation à risque / grossesse', show: () => true },
    { id: 'ist-hepatites', label: 'Hépatites B/C : statut vérifié (sérologie B, PCR C si risque)', show: () => true },
    { id: 'ist-grossesse-sero', label: 'Sérologies grossesse : toxoplasmose, rubéole, VIH, syphilis, VHB (obligatoires)', show: p => isF(p) && between(p, 18, 50) },
  ]
},
// ============================ GÉRIATRIE / SOCIAL ============================
{
  id: 'geri', title: '🧓 Gériatrie / Social (≥ 65 ans)',
  items: [
    { id: 'geri-chutes', label: 'Chutes (antécédents, équilibre, environnement, kiné)', show: p => p.age !== null && p.age >= 65 },
    { id: 'geri-denutrition', label: 'Dénutrition : dépistage (MNA, perte de poids, albumine)', show: p => p.age !== null && p.age >= 70 },
    { id: 'geri-isolement', label: 'Isolement social / réseau de proximité, aidants', show: p => p.age !== null && p.age >= 65 },
    { id: 'geri-iatrogenie', label: 'Revue des traitements : iatrogénie, interactions, observance', show: p => p.age !== null && p.age >= 65 },
    { id: 'geri-autonomie', label: 'Autonomie (IADL/ADL), aides à domicile, APA', show: p => p.age !== null && p.age >= 65 },
    { id: 'geri-avancee', label: 'Directives anticipées / personne de confiance à identifier', show: p => p.age !== null && p.age >= 65 },
    { id: 'geri-continence', label: 'Continence : rechercher troubles mictionnels / fécaux', show: p => p.age !== null && p.age >= 65 },
  ]
},
// ============================ ADDICTOLOGIE ============================
{
  id: 'addicto', title: '🍷 Addictologie',
  items: [
    { id: 'addict-alcool', label: 'Alcool : dépistage (AUDIT-C / FACE) — repérage et IBAA si positif', show: () => true,
      why: () => 'Dépistage des consommations d\'alcool à risque (remboursement SI ≥ 1 si/an).' },
    { id: 'addict-tabac', label: 'Tabac : statut et sevrage (voir Pneumologie)', show: () => true },
    { id: 'addict-cannabis', label: 'Cannabis / opioïdes / autres : dépistage si contexte', show: () => true },
    { id: 'addict-jeu', label: 'Jeu pathologique / écrans : repérage si contexte', show: () => true },
  ]
}
];

// ---------- État ----------
const state = {};

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

  const age = p.age;
  document.getElementById('pat-age-line').textContent =
    PATIENT.ddn && age !== null
      ? `Âge calculé : ${age} an${age > 1 ? 's' : ''}`
      : (PATIENT.ddn ? 'Date de naissance invalide' : 'Renseignez la date de naissance pour activer les critères automatiques');

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
document.addEventListener('click', e => {
  const btn = e.target.closest('.status button');
  if (btn) {
    const id = btn.closest('.item').dataset.id;
    if (!state[id]) state[id] = { status: null, value: '' };
    const cur = state[id].status;
    state[id].status = (cur === btn.dataset.status) ? null : btn.dataset.status;
    render();
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
  const pid = el?.id;
  if (pid && pid.startsWith('pat-')) {
    PATIENT[pid.slice(4)] = el.value;
    render();
  }
});
document.addEventListener('change', e => {
  const pid = e.target.id;
  if (pid === 'pat-sex') { PATIENT.sex = e.target.value; render(); }
});

document.getElementById('pat-date').value = new Date().toISOString().slice(0, 10);

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Réinitialiser toute la check-list ?')) {
    Object.keys(state).forEach(k => delete state[k]);
    render();
  }
});

// ---------- Export JSON (pour l'app Python) ----------
function getResult() {
  const p = P();
  return {
    patient: { ...PATIENT, age: p.age },
    consultDate: document.getElementById('pat-date').value,
    sections: SECTIONS.map(s => ({
      id: s.id, title: s.title,
      items: s.items.filter(i => !i.show || i.show(p)).map(i => ({
        id: i.id, label: i.label,
        status: state[i.id]?.status || null,
        value: state[i.id]?.value || ''
      }))
    }))
  };
}

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(getResult(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `depistage_${(PATIENT.nom || 'patient').replace(/\s+/g, '_')}_${document.getElementById('pat-date').value}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- Fiche patient ----------
document.getElementById('btn-print').addEventListener('click', () => {
  const p = P();
  const name = [PATIENT.nom, PATIENT.prenom].filter(Boolean).join(' ') || '__________';
  const date = document.getElementById('pat-date').value || '';
  const sexTxt = p.sex === 'F' ? 'Femme' : p.sex === 'M' ? 'Homme' : '—';
  const ageTxt = p.age !== null ? `${p.age} ans` : '—';
  const ddnTxt = PATIENT.ddn || '—';

  let todoRows = '', doneRows = '', naRows = '';
  SECTIONS.forEach(sec => {
    const items = sec.items.filter(i => !i.show || i.show(p));
    items.forEach(it => {
      const st = state[it.id]?.status || null;
      const val = state[it.id]?.value ? ` (${state[it.id].value})` : '';
      const clean = it.label.trim();
      if (st === 'non') todoRows += `<tr><td>${escapeHtml(sec.title.replace(/^\S+\s/, ''))}</td><td>${escapeHtml(clean)}${escapeHtml(val)}</td></tr>`;
      else if (st === 'oui') doneRows += `<tr><td>${escapeHtml(clean)}${escapeHtml(val)}</td></tr>`;
      else if (st === 'na') naRows += `<tr><td>${escapeHtml(clean)}</td></tr>`;
    });
  });

  const fmt = (rows, empty) => rows || `<tr><td>${empty}</td></tr>`;

  document.getElementById('print-area').innerHTML = `
    <h1>Check-list de santé — tour d'horizon 360°</h1>
    <p><strong>Patient :</strong> ${escapeHtml(name)} &nbsp;|&nbsp; <strong>Né(e) le :</strong> ${escapeHtml(ddnTxt)} (${escapeHtml(ageTxt)}) &nbsp;|&nbsp; <strong>Sexe :</strong> ${sexTxt} &nbsp;|&nbsp; <strong>Consultation du :</strong> ${escapeHtml(date)}</p>

    <h2>✅ Déjà à jour / réalisé</h2>
    <table><tr><th>Item</th></tr>${fmt(doneRows, 'Aucun point marqué « fait ».')}</table>

    <h2>📋 À faire / à programmer</h2>
    <table><tr><th>Domaine</th><th>Action recommandée</th></tr>${fmt(todoRows, 'Aucun point marqué « à faire » — pensez à cocher les items pendant la consultation.')}</table>

    <h2>ℹ️ Non applicable / non concerné</h2>
    <table><tr><th>Item</th></tr>${fmt(naRows, '—')}</table>

    <div class="plan">
      <strong>Prochaines étapes :</strong> prenez rendez-vous pour les examens listés ci-dessus « à programmer ». Certains dépistages sont proposés automatiquement (courrier du programme national) ; les autres nécessitent une prescription de votre médecin. Le risque cardiovasculaire global est évalué par votre médecin via risquecv.fr.
    </div>
    <p class="foot">Document généré en consultation à titre d'aide-mémoire, conformément aux recommandations françaises (HAS / dépistage organisé). Ne remplace pas l'avis médical — toute question : contacter votre médecin.</p>`;
  window.print();
});

// ---------- API pour l'app Python hôte ----------
window.Depistage = {
  setData(d) {
    PATIENT = {
      nom: d.nom || '',
      prenom: d.prenom || '',
      ddn: d.ddn || d.dateNaissance || '',
      sex: d.sex || d.sexe || ''
    };
    document.getElementById('pat-nom').value = PATIENT.nom;
    document.getElementById('pat-prenom').value = PATIENT.prenom;
    document.getElementById('pat-ddn').value = PATIENT.ddn;
    document.getElementById('pat-sex').value = PATIENT.sex;
    render();
  },
  getResult
};

// Injection initiale : window.PATIENT_DATA ou paramètres URL (?nom=...&prenom=...&ddn=...&sex=F)
(function init() {
  if (window.PATIENT_DATA) { window.Depistage.setData(window.PATIENT_DATA); return; }
  const q = new URLSearchParams(location.search);
  if (q.get('nom') || q.get('ddn') || q.get('sex')) {
    window.Depistage.setData({ nom: q.get('nom') || '', prenom: q.get('prenom') || '', ddn: q.get('ddn') || '', sex: q.get('sex') || '' });
    return;
  }
  render();
})();

// ---------- Utilitaires ----------
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
