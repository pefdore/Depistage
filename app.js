/* Tour d'horizon 360° — dépistage. 100 % local, intégrable dans une app Python (integration.md).
   Structure : SECTIONS → blocs.
   - type 'depistage' : liste d'indications à cocher → conclusion automatique « EXAMEN à réaliser car : … »
     (indications 'auto' déduites de l'âge/sexe, déjà cochées et verrouillées)
   - type 'checklist' : items avec statut Fait / À faire / N/A
*/

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
  return (age < 0 || age > 130) ? null : age;
}
const P = () => ({ age: computeAge(PATIENT.ddn, document.getElementById('pat-date').value), sex: PATIENT.sex });
const between = (p, a, b) => p.age !== null && p.age >= a && p.age <= b;
const isF = p => p.sex === 'F';
const isM = p => p.sex === 'M';

// ---------- Données ----------
const SECTIONS = [

// ==================== CONSULTATION DE PRÉVENTION (âges cibles cotées) ====================
{ id: 'prevention', title: '🗓️ Consultation de prévention « Mon bilan prévention »', blocks: [
  { id: 'bilan-prevention', type: 'checklist', title: 'Bilan prévention remboursé (100 %, sans avance de frais)', show: p => p.age !== null && p.age >= 18,
    items: [
      { id: 'bp-18-25', label: 'Rendez-vous « Mon bilan prévention » 18–25 ans à proposer (santé mentale, addictions, santé sexuelle)', show: p => between(p, 18, 25), why: () => 'Consultation de prévention cotée : 18–25 ans, prise en charge 100 %, une fois par tranche d\'âge.' },
      { id: 'bp-45-50', label: 'Rendez-vous « Mon bilan prévention » 45–50 ans à proposer (dépistage cancers, risque cardio/métabolique)', show: p => between(p, 45, 50), why: () => 'Consultation de prévention cotée : 45–50 ans, prise en charge 100 %, une fois par tranche d\'âge.' },
      { id: 'bp-60-65', label: 'Rendez-vous « Mon bilan prévention » 60–65 ans à proposer (fragilités, autonomie, vaccinations)', show: p => between(p, 60, 65), why: () => 'Consultation de prévention cotée : 60–65 ans, prise en charge 100 %, une fois par tranche d\'âge.' },
      { id: 'bp-70-75', label: 'Rendez-vous « Mon bilan prévention » 70–75 ans à proposer (autonomie, chutes, isolement)', show: p => between(p, 70, 75), why: () => 'Consultation de prévention cotée : 70–75 ans, prise en charge 100 %, une fois par tranche d\'âge.' }
    ] }
]},

// ==================== PNEUMOLOGIE ====================
{ id: 'pneumo', title: '🫁 Pneumologie', blocks: [
  { id: 'bpco', type: 'depistage', title: 'BPCO', exam: 'Spirométrie / EFR avec test de réversibilité', show: () => true,
    auto: [{ label: 'Âge ≥ 40 ans + tabagisme (actif ou sevré)', cond: p => p.age !== null && p.age >= 40 }],
    indications: [
      'Toux chronique / expectorations chroniques',
      'Dyspnée chronique ou à l\'effort',
      'Sifflements respiratoires',
      'Tabagisme ≥ 20 paquets-années',
      'Exacerbations respiratoires à répétition',
      'Exposition professionnelle (poussières, fumées, solvants)'
    ] },
  { id: 'saos', type: 'depistage', title: 'Syndrome d\'apnées du sommeil (SAOS)', exam: 'Polygraphie / polysomnographie du sommeil', show: () => true,
    auto: [],
    indications: [
      'Ronflements nocturnes + pauses respiratoires rapportées',
      'Somnolence diurne excessive (score d\'Epworth élevé)',
      'Obésité / tour de taille augmenté',
      'HTA réfractaire, surtout nocturne',
      'Pas de rafraîchissement au réveil, nycturie'
    ] },
  { id: 'a1at', type: 'depistage', title: 'Déficit en alpha-1-antitrypsine', exam: 'Dosage sanguin alpha-1-antitrypsine', show: () => true,
    auto: [],
    indications: [
      'BPCO / emphysème diagnostiqué avant 45 ans',
      'Emphysème chez un non-fumeur',
      'ATCD familial de déficit en A1AT ou cirrhose inexpliquée'
    ] },
  { id: 'poumon-scanner', type: 'depistage', title: 'Cancer du poumon', exam: 'Scanner thoracique low-dose (à renouveler annuellement)', show: p => between(p, 50, 74),
    auto: [{ label: 'Fumeur ou ex-fumeur de 50–74 ans (dépistage à envisager si tabagisme important)', cond: () => true }],
    indications: ['Tabagisme ≥ 20 paquets-années', 'BPCO / fibrose pulmonaire associée', 'ATCD personnel de cancer (poumon, tête et cou)'] },
  { id: 'tb', type: 'depistage', title: 'Tuberculose (infection latente)', exam: 'Test IGRA (ou IDR)', show: () => true,
    auto: [],
    indications: ['Contage tuberculeux récent', 'Vivant ou retour de zone d\'endémie', 'Immunodépression / traitement immunosuppresseur', 'Profession de santé'] },
  { id: 'asthme', type: 'checklist', title: 'Asthme (si connu)', show: () => true,
    items: [
      { id: 'asthme-controle', label: 'Contrôle de l\'asthme évalué (ACT), DEP' },
      { id: 'asthme-technique', label: 'Technique d\'inhalation vérifiée' },
      { id: 'asthme-observance', label: 'Observance du traitement de fond vérifiée' }
    ] }
]},

// ==================== RHUMATOLOGIE / OSTÉOPOROSE ====================
{ id: 'rhumato', title: '🦴 Rhumatologie — Ostéoporose', blocks: [
  { id: 'osteo', type: 'depistage', title: 'Ostéoporose', exam: 'Ostéodensitométrie (DMO)', show: () => true,
    auto: [
      { label: 'Femme ≥ 65 ans', cond: p => isF(p) && p.age !== null && p.age >= 65 },
      { label: 'Homme ≥ 70 ans (dépistage possible, HAS 2024)', cond: p => isM(p) && p.age !== null && p.age >= 70 }
    ],
    indications: [
      'Ménopause précoce (< 40 ans, ou avant 45 ans)',
      'IMC < 19 / maigreur importante',
      'Fracture de faible énergie après 50 ans (poignet, vertèbre, col fémoral…)',
      'Fracture de l\'extrémité supérieure du fémur chez un parent au 1er degré',
      'Corticothérapie : ≥ 7,5 mg/j prednisone ≥ 3 mois (en cours ou prévue)',
      'Tabagisme actif',
      'Consommation d\'alcool ≥ 3 verres/j',
      'Hyperthyroïdie ou hyperparathyroïdie',
      'Hypogonadisme (homme) / ménopause < 45 ans',
      'Maladie inflammatoire chronique (PR, RCH, Crohn…)',
      'Malabsorption / gastrectomie / maladie cœliaque',
      'Immobilité prolongée',
      'Diabète traité par glitazones (femmes)',
      'Traitements anti-hormonaux (hormonothérapie du cancer du sein ou de la prostate)',
      'FRAX ≥ seuil d\'intervention'
    ] },
  { id: 'rhumato-inflammatory', type: 'depistage', title: 'Rhumatisme inflammatoire débutant', exam: 'Bilan biologique + avis rhumatologue', show: () => true,
    auto: [],
    indications: [
      'Douleurs inflammatoires (réveil nocturne, raideur matinale > 30 min)',
      'Gonflement articulaire persistant',
      'Psoriasis / colopathie associée (rhumatisme psoriasique)'
    ] },
  { id: 'goutte', type: 'depistage', title: 'Goutte / hyperuricémie', exam: 'Uricémie', show: () => true,
    auto: [],
    indications: ['Crises de grosse articulation (orteil, pied)', 'Syndrome métabolique / insuffisance rénale', 'Diurétiques / immunosuppresseurs'] }
]},

// ==================== CARDIOLOGIE (RCV global → risquecv.fr) ====================
{ id: 'cardio', title: '❤️ Cardiologie (risque global : risquecv.fr)', blocks: [
  { id: 'hta', type: 'depistage', title: 'Hypertension artérielle', exam: 'Mesure de la pression artérielle (au besoin MAPA/MHM)', show: () => true,
    auto: [{ label: 'Âge ≥ 65 ans : TA à mesurer au moins une fois/an', cond: p => p.age !== null && p.age >= 65 }],
    indications: ['TA élevée mesurée précédemment', 'Surpoids/obésité', 'ATCD familial d\'HTA précoce', 'Diabète / dyslipidémie', 'Sédentarité, alcool, tabac', 'Grossesse : TA à chaque contact (femmes)', 'Apnées du sommeil'] },
  { id: 'aaa', type: 'depistage', title: 'Anévrisme de l\'aorte abdominale (AAA)', exam: 'Échographie aorte abdominale', show: p => between(p, 65, 85),
    auto: [{ label: 'Fumeur ou ex-fumeur de 65–85 ans', cond: () => true }],
    indications: ['Tabagisme (actif ou passé)', 'ATCD familial d\'AAA', 'AAA, artériopathie ou anévrisme poplité/fémoral connus'] },
  { id: 'fa', type: 'depistage', title: 'Fibrillation auriculaire', exam: 'Palpation du pouls / ECG / ARIH', show: p => p.age !== null && p.age >= 65,
    auto: [{ label: 'Âge ≥ 65 ans (dépistage par ARIH/pouls)', cond: () => true }],
    indications: ['Pouls irrégulier palpé', 'Palpitations rapportées', 'ATCD d\'AVC/AIT', 'Insuffisance cardiaque, HTA, obésité'] },
  { id: 'ic', type: 'depistage', title: 'Insuffisance cardiaque', exam: 'BNP/NT-proBNP puis échographie cardiaque', show: () => true,
    auto: [],
    indications: ['Dyspnée d\'effort progressive', 'Œdèmes des membres inférieurs', 'Prise de poids rapide, orthopnée', 'Coronaropathie / HTA / diabète connus'] },
  { id: 'amput', type: 'depistage', title: 'Artériopathie des membres inférieurs', exam: 'Pouls périphériques + IPS si doute', show: () => true,
    auto: [],
    indications: ['Claudication intermittente', 'Tabagisme, diabète, dyslipidémie', 'Ulcération/gangrène d\'orteil', 'Coronaropathie connue'] },
  { id: 'valvulo', type: 'depistage', title: 'Valvulopathie', exam: 'Auscultation cardiaque ± échographie', show: () => true,
    auto: [{ label: 'Souffle connu ou âge ≥ 75 ans (attention souffle aortique)', cond: p => p.age !== null && p.age >= 75 }],
    indications: ['Souffle cardiaque à l\'auscultation', 'Dyspnée / syncopes / douleur thoracique', 'ATCD de rhumatisme articulaire aigu', 'BPCO (insuffisance tricuspide)'] }
]},

// ==================== MÉTABOLISME / ENDOCRINO ====================
{ id: 'metabo', title: '🍬 Métabolisme / Endocrinologie', blocks: [
  { id: 'diabete', type: 'depistage', title: 'Diabète de type 2', exam: 'Glycémie à jeun (ou HbA1c)', show: () => true,
    auto: [
      { label: 'Âge 45–75 ans : dépistage tous les 3 ans (HAS)', cond: p => between(p, 45, 75) },
      { label: 'Femme : ATCD de diabète gestationnel → dépistage régulier', cond: p => isF(p) }
    ],
    indications: ['Obésité / tour de taille élevé', 'ATCD familial de diabète (parent du 1er degré)', 'Diabète gestationnel ou macrosomie antérieure', 'HTA ou dyslipidémie', 'Sédentarité', 'Syndrome d\'apnées du sommeil', 'Origine à risque (Afrique subsaharienne, Asie, Inde…)'] },
  { id: 'dyslipid', type: 'depistage', title: 'Dyslipidémie', exam: 'Bilan lipidique (LDL — interprétation du risque global sur risquecv.fr)', show: () => true,
    auto: [{ label: 'À l\'entrée en adultes puis selon risque', cond: p => p.age !== null && p.age >= 18 }],
    indications: ['ATCD familial d\'hypercholestérolémie ou d\'accident cardiovasculaire précoce', 'Xanthomes / arc cornéen avant 50 ans', 'Diabète / HTA / tabac', 'Maladie rénale chronique', 'Surpoids'] },
  { id: 'thyroide', type: 'depistage', title: 'Dysthyroïdie', exam: 'TSH', show: () => true,
    auto: [],
    indications: ['Fatigue inexpliquée, prise ou perte de poids', 'Intolérance au froid/chaleur, troubles du rythme', 'Goitre palpé / nodule thyroïdien', 'Femme ≥ 60 ans ou post-partum', 'Traitement par amiodarone / lithium', 'ATCD familial de maladie thyroïdienne'] },
  { id: 'hemochromatose', type: 'depistage', title: 'Hémochromatose', exam: 'Transferrine saturation (SAT), ferritine', show: () => true,
    auto: [],
    indications: ['Asthenie, arthralgies méta­carpophalangiennes', 'ATCD familial (mutation C282Y)', 'Diabète / cardiopathie / cirrhose inexpliqués', 'Origine nord-européenne'] },
  { id: 'obesite', type: 'depistage', title: 'Obésité / surpoids', exam: 'IMC + tour de taille, puis prise en charge si anormal', show: () => true,
    auto: [],
    indications: [
      'IMC ≥ 25 (surpoids) ou ≥ 30 (obésité)',
      'Tour de taille augmenté (≥ 94 cm H / ≥ 80 cm F)',
      'Prise de poids récente inexpliquée',
      'Diabète / HTA / dyslipidémie / SAS associés',
      'Alimentation déséquilibrée / sédentarité',
      'Traitement favorisant (corticoïdes, antipsychotiques, insuline)',
      'Arrêt du tabac récent (prise de poids fréquente)',
      'Bilan de prévention à valoriser (cf. tranche d\'âge)'
    ] },
]},

// ==================== NÉPHROLOGIE / UROLOGIE ====================
{ id: 'uro', title: '🫘 Néphrologie / Urologie', blocks: [
  { id: 'mrc', type: 'depistage', title: 'Maladie rénale chronique', exam: 'DFG estimé (créatinine) + rapport protéinurie/créatinurie', show: () => true,
    auto: [{ label: 'Âge ≥ 65 ans : DFG à interpréter en fonction de l\'âge', cond: p => p.age !== null && p.age >= 65 }],
    indications: ['Diabète', 'HTA', 'Maladie cardiovasculaire', 'Traitement néphrotoxique au long cours (AINS, lithium)', 'Obstruction urinaire / uropathie', 'ATCD familial de maladie rénale'] },
  { id: 'prostate-psa', type: 'depistage', title: 'Cancer de la prostate', exam: 'PSA (après information bénéfices/risques — décision partagée)', show: p => isM(p) && p.age !== null && p.age >= 50,
    auto: [
      { label: 'Homme ≥ 50 ans (dépistage individuel à discuter)', cond: p => p.age !== null && p.age >= 50 },
      { label: 'Homme ≥ 45 ans si ATCD familial ou origine afro-antillaise', cond: p => p.age !== null && p.age >= 45 }
    ],
    indications: ['Troubles urinaires du bas appareil (IPSS élevé)', 'ATCD familial de cancer de la prostate (père, frère)', 'Origine afro-antillaise', 'Hématurie inexpliquée'] },
  { id: 'hbp', type: 'depistage', title: 'Hypertrophie bénigne de la prostate', exam: 'Toucher rectal ± débitmétrie, IPSS', show: p => isM(p) && p.age !== null && p.age >= 50,
    auto: [{ label: 'Homme ≥ 50 ans', cond: () => true }],
    indications: ['Nycturie, jets hachés, vidange incomplète', 'Rétention urinaire antérieure'] },
  { id: 'incontinence', type: 'depistage', title: 'Incontinence urinaire', exam: 'Bilan simple (agenda mictionnel) puis avis spécialisé', show: () => true,
    auto: [],
    indications: ['Fuites urinaires rapportées (femme, post-partum)', 'Sujet âgé : fuites non évaluées', 'Impériosités'] }
]},

// ==================== GYNÉCOLOGIE ====================
{ id: 'gyneco', title: '🌸 Gynécologie (femmes)', blocks: [
  { id: 'cervix', type: 'depistage', title: 'Cancer du col de l\'utérus', exam: 'Test HPV tous les 5 ans (ou frottis cytologique tous les 3 ans)', show: p => isF(p) && between(p, 25, 65),
    auto: [{ label: 'Femme de 25 à 65 ans (dépistage organisé)', cond: () => true }],
    indications: ['Test non réalisé dans l\'intervalle', 'Frottis/HPV antérieur anormal (ASC-US+)', 'Immunodépression (VIH, transplantation) → dépistage plus fréquent'] },
  { id: 'sein', type: 'depistage', title: 'Cancer du sein', exam: 'Mammographie tous les 2 ans ± échographie', show: p => isF(p) && p.age !== null && p.age >= 25,
    auto: [
      { label: 'Femme 50–74 ans (dépistage organisé)', cond: p => between(p, 50, 74) },
      { label: 'Femme 25–49 ans : examen clinique annuel, imagerie seulement si signe ou FDR', cond: p => between(p, 25, 49) }
    ],
    indications: ['Nodule palpable / rétraction cutanée / écoulement mamelonnaire', 'ATCD familial de cancer du sein (1er degré, surtout < 50 ans)', 'Mutation BRCA1/2 ou syndrome de Lynch', 'Irradiation thoracique antérieure', 'Densité mammaire élevée connue'] },
  { id: 'endometre', type: 'depistage', title: 'Cancer de l\'endomètre', exam: 'Avis gynécologique + échographie pelvienne', show: p => isF(p) && p.age !== null && p.age >= 45,
    auto: [],
    indications: ['Métrorragies post-ménopausiques', 'Ménopause tardive (> 55 ans)', 'Obésité / diabète / syndrome de Lynch', 'Traitement par tamoxifène'] },
  { id: 'ovaire', type: 'checklist', title: 'Cancer de l\'ovaire', show: p => isF(p) && p.age !== null && p.age >= 50,
    items: [
      { id: 'ovaire-signes', label: 'Pas de dépistage systématique, mais symptômes évocateurs à rechercher (distension, douleurs, troubles digestifs)' }
    ] },
  { id: 'grossesse', type: 'checklist', title: 'Grossesse / pré-conceptionnel', show: p => isF(p) && between(p, 18, 51),
    items: [
      { id: 'gross-fol', label: 'Acide folique en péri-conceptionnel (0,4 mg/j)' },
      { id: 'gross-sero', label: 'Sérologies obligatoires si grossesse : toxoplasmose, rubéole, VIH, syphilis, VHB' },
      { id: 'gross-vacc', label: 'Rappel coqueluche (Tdap) à chaque grossesse' },
      { id: 'gross-diab', label: 'HGPO 24–28 SA si FDR' }
    ] },
  { id: 'menopause', type: 'checklist', title: 'Ménopause', show: p => isF(p) && p.age !== null && p.age >= 45,
    items: [
      { id: 'meno-sympt', label: 'Symptômes climatériques évalués, troubles génito-urinaires (GSM)' },
      { id: 'meno-trh', label: 'TRH discutée si symptômes gênants (bénéfices/risques)' }
    ] },
  { id: 'contraception', type: 'checklist', title: 'Contraception', show: p => isF(p) && between(p, 15, 55),
    items: [
      { id: 'contr-adaptee', label: 'Contraception adaptée, tolérée, à jour' },
      { id: 'contr-info', label: 'Information contraception d\'urgence si besoin' }
    ] }
]},

// ==================== GASTRO-ENTÉROLOGIE ====================
{ id: 'gastro', title: '🩻 Gastro-entérologie', blocks: [
  { id: 'crc', type: 'depistage', title: 'Cancer colorectal', exam: 'Test immunologique de recherche de sang occulte (tous les 2 ans) ou coloscopie', show: p => between(p, 50, 74),
    auto: [{ label: 'Âge 50–74 ans (dépistage organisé)', cond: () => true }],
    indications: ['Test non fait depuis > 2 ans', 'Test positif → coloscopie totale', 'ATCD familial au 1er degré avant 65 ans → coloscopie', 'Cas familiaux multiples / syndrome de Lynch / polypose', 'Rectorragies, syndrome rectal, altération du transit > 50 ans', 'Coloscopie antérieure avec polypes adénomateux'] },
  { id: 'oesophage-estomac', type: 'depistage', title: 'Cancer de l\'œsophage / estomac', exam: 'Fibroscopie œso-gastro-duodénale', show: () => true,
    auto: [],
    indications: ['Dysphagie (blocage à la déglutition)', 'Douleur épigastrique persistante / anémie ferriprive', 'Âge > 55 ans avec reflux rebelle', 'ATCD familial de cancer de l\'estomac'] },
  { id: 'helicobacter', type: 'depistage', title: 'Infection à Helicobacter pylori', exam: 'Test respiraire à l\'urée ou sérologie', show: () => true,
    auto: [],
    indications: ['Dyspepsie persistante', 'ATCD personnel ou familial d\'ulcère', 'ATCD familial de cancer gastrique', 'Origine / séjour en pays à haute prévalence'] },
  { id: 'hcv', type: 'depistage', title: 'Hépatite C', exam: 'Sérologie HCV (au moins une fois)', show: p => between(p, 18, 59),
    auto: [{ label: 'Adulte 18–59 ans : dépistage au moins une fois (HAS)', cond: () => true }],
    indications: ['Sérologie jamais réalisée', 'Usage de drogues IV ou intra-nasale', 'Transfusion / geste invasif avant 1992', 'Tatouage / piercing à risque', 'VIH, hépatite B connue', 'Partenaire à risque'] },
  { id: 'hbp', type: 'depistage', title: 'Hépatopathie / cirrhose', exam: 'Bilan hépatique ± FibroScan / échographie', show: () => true,
    auto: [],
    indications: ['Consommation d\'alcool à risque', 'Stéatose / NASH connue', 'Obésité, diabète, dyslipidémie', 'Hépatite B ou C chronique', 'Médicaments hépatotoxiques au long cours'] },
  { id: 'carences', type: 'depistage', title: 'Carence martiale / B12 / folates', exam: 'NFS + ferritine (± B9, B12)', show: () => true,
    auto: [{ label: 'Femme en âge de procréer : carence martiale fréquente', cond: p => isF(p) && between(p, 15, 50) }],
    indications: ['Fatigue, pâleur, essoufflement', 'Saignements chroniques (règles abondantes, AINS)', 'Régime végétarien / végétalien', 'Âge > 65 ans', 'Gastrectomie / malabsorption (B12)', 'Grossesse'] }
]},

// ==================== IMMUNOLOGIE / VACCINATION ====================
{ id: 'vaccins', title: '💉 Immunologie — Vaccinations', blocks: [
  { id: 'vacc', type: 'checklist', title: 'Calendrier vaccinal', show: () => true,
    items: [
      { id: 'v-carnet', label: 'Carnet vaccinal vérifié (MesVaccins.net, carnet de santé)', why: () => 'Vérifier les dates de rappel dans le carnet.' },
      { id: 'v-dtp', label: 'Diphtérie / Tétanos / Poliomyélite : rappel à jour (25, 45, 65 ans puis tous les 10 ans)', why: p => (p.age !== null && p.age >= 65) ? '≥ 65 ans : rappel tous les 10 ans.' : null },
      { id: 'v-grippe', label: 'Grippe saisonnière', why: p => (p.age !== null && p.age >= 65) ? 'Recommandée chaque année dès 65 ans (ou maladie chronique).' : null },
      { id: 'v-covid', label: 'COVID-19 : à jour selon recommandations', why: p => (p.age !== null && p.age >= 65) ? 'Rappel recommandé ≥ 65 ans et comorbidités.' : null },
      { id: 'v-pneumo', label: 'Pneumocoque : à jour', why: p => between(p, 65, 85) ? 'Recommandée 65–85 ans (schéma selon statut immunitaire).' : (p.age !== null && p.age < 65 && p.age >= 18 ? 'Si maladie chronique : indication avant 65 ans.' : null) },
      { id: 'v-rsv', label: 'VRS', why: p => (p.age !== null && p.age >= 75) ? 'Recommandée ≥ 75 ans (ou ≥ 65 ans avec comorbidités).' : null },
      { id: 'v-zona', label: 'Zona (Shingrix)', why: p => between(p, 65, 74) ? 'Recommandée 65–74 ans (ou 50–64 ans avec comorbidités).' : null },
      { id: 'v-hpv', label: 'HPV', why: p => (p.age !== null && p.age >= 11 && p.age <= 19) ? '11–14 ans, rattrapage jusqu\'à 19 ans révolus.' : null },
      { id: 'v-ror', label: 'ROR : statut vérifié (2 doses, nés après 1980)' },
      { id: 'v-hepb', label: 'Hépatite B : statut vaccinal' },
      { id: 'v-meningo', label: 'Méningocoque ABCYW', why: p => (p.age !== null && p.age <= 24) ? 'À jour chez les 16–24 ans selon situations à risque.' : null }
    ] }
]},

// ==================== NÉOPLASIES — VIGILANCE TRANSVERSALE ====================
{ id: 'neo', title: '🔎 Néoplasies — vigilance', blocks: [
  { id: 'neo-alerte', type: 'depistage', title: 'Signes d\'alerte de néoplasie', exam: 'Bilan d\'orientation (examen clinique + examens ciblés)', show: () => true,
    auto: [],
    indications: [
      'Amaigrissement inexpliqué (> 5 % en 6 mois)',
      'Hémorragie anormale (rectorragies, hémoptysie, hématurie, métrorragies)',
      'Adénopathie persistante > 3 semaines',
      'Toux ou dysphonie persistante > 3 semaines',
      'Dysphagie persistante',
      'Douleur chronique inhabituelle / nocturne',
      'Nodule cutané modifié (mélanome : ABCDE)',
      'Anémie inexpliquée'
    ] },
  { id: 'neo-genet', type: 'depistage', title: 'Prédisposition génétique', exam: 'Consultation d\'oncogénétique', show: () => true,
    auto: [],
    indications: [
      'Cancers du sein/ovaire familiaux (≥ 2 cas, < 50 ans) → BRCA',
      'Cancers colorectaux familiaux (Lynch, polypose)',
      'Cancer de la prostate familial précoce',
      'Cancer pancréatique familial'
    ] },
  { id: 'peau', type: 'checklist', title: 'Cancer de la peau', show: () => true,
    items: [
      { id: 'peau-exam', label: 'Examen cutané : lésions suspectes repérées' },
      { id: 'peau-photo', label: 'Photoprotection / éducation solaire donnée' },
      { id: 'peau-suivi', label: 'Suivi dermatologique annuel si ATCD de mélanome' }
    ] }
]},

// ==================== NEURO / PSYCHIATRIE ====================
{ id: 'neuro', title: '🧠 Neurologie / Psychiatrie', blocks: [
  { id: 'depression', type: 'depistage', title: 'Dépression', exam: 'Évaluation (PHQ-9) puis prise en charge', show: () => true,
    auto: [],
    indications: ['Humeur triste / perte d\'intérêt > 2 semaines', 'PHQ-2 positif', 'Antécédent de dépression', 'Maladie chronique / événement de vie douloureux récent'] },
  { id: 'anxiete', type: 'depistage', title: 'Trouble anxieux', exam: 'Évaluation (GAD-7) puis prise en charge', show: () => true,
    auto: [],
    indications: ['Inquiétudes non contrôlables > 6 mois', 'Signes physiques d\'anxiété', 'Évitement de situations'] },
  { id: 'risque-suicide', type: 'depistage', title: 'Risque suicidaire', exam: 'Évaluation immédiate du risque, orientation si nécessaire', show: () => true,
    auto: [],
    indications: ['Idées suicidaires exprimées', 'Antécédent de tentative', 'Isolement majeur, perte récente', 'Addiction active + humeur basse'] },
  { id: 'cognitif', type: 'depistage', title: 'Troubles cognitifs', exam: 'Repérage (MMS/MoCA) puis consultation mémoire', show: p => p.age !== null && p.age >= 70,
    auto: [{ label: 'Âge ≥ 70 ans : repérage si plainte du patient ou de l\'entourage', cond: () => true }],
    indications: ['Plainte cognitive confirmée par l\'entourage', 'Difficultés dans les activités instrumentales (IADL)', 'Troubles du comportement, désorientation'] },
  { id: 'parkinson', type: 'depistage', title: 'Syndrome parkinsonien', exam: 'Examen moteur + avis neurologique', show: p => p.age !== null && p.age >= 60,
    auto: [],
    indications: ['Tremblement de repos', 'Lenteur des mouvements / rigidité', 'Chutes répétées inexpliquées', 'Trouble de l\'odorat ancien'] },
  { id: 'cephalees', type: 'depistage', title: 'Céphalées chroniques', exam: 'Examen neuro + imagerie si signes de gravité', show: () => true,
    auto: [],
    indications: ['Céphalée nouvelle, d\'apparition brutale', 'Céphalée avec fièvre / troubles neurologiques', 'Céphalée du matin avec vomissements', 'Aggravation progressive'] }
]},

// ==================== ORL / OPHTALMOLOGIE ====================
{ id: 'orl', title: '👂 ORL / Ophtalmologie', blocks: [
  { id: 'audition', type: 'depistage', title: 'Déficience auditive', exam: 'Dépistage subjectif (questionnaire) puis audiométrie', show: p => p.age !== null && p.age >= 60,
    auto: [{ label: 'Âge 60–74 ans : dépistage de la déficience auditive (HAS)', cond: p => p.age !== null && p.age <= 74 }],
    indications: ['Difficulté à suivre une conversation', 'Volume TV élevé', 'Acouphènes', 'Difficulté dans le bruit'] },
  { id: 'vision', type: 'depistage', title: 'Vision (acuité, DMLA, cataracte)', exam: 'Examen ophtalmologique', show: p => p.age !== null && p.age >= 50,
    auto: [{ label: 'Âge ≥ 50 ans : DMLA et cataracte à rechercher', cond: () => true }],
    indications: ['Baisse d\'acuité visuelle', 'Déformation des lignes droites (métamorphopsies)', 'Éblouissements / halos', 'Diabète (fond d\'œil annuel)', 'Dioptrie forte (myopie forte → risque rétinien)'] },
  { id: 'glaucome', type: 'depistage', title: 'Glaucome chronique', exam: 'Examen ophtalmologique (PIO, papille)', show: p => p.age !== null && p.age >= 40,
    auto: [],
    indications: ['ATCD familial de glaucome', 'Myopie forte', 'Corticothérapie prolongée', 'Migraine / HTA / diabète', 'Âge ≥ 70 ans'] },
  { id: 'angine', type: 'depistage', title: 'Angine streptococcique (si symptomatique)', exam: 'Streptotest (TDR)', show: p => p.age !== null && p.age < 40,
    auto: [],
    indications: ['Angine fébrile (score de Mac Isaac ≥ 2)', 'Scarlatine dans l\'entourage', 'Tonsilles purulentes + fièvre'] }
]},

// ==================== INFECTIOLOGIE / IST ====================
{ id: 'infectio', title: '🦠 Infectiologie / IST', blocks: [
  { id: 'vih', type: 'depistage', title: 'VIH', exam: 'Sérologie VIH (dépistage au moins une fois, ou selon situation)', show: p => between(p, 18, 65),
    auto: [{ label: 'Adulte 18–65 ans : dépistage au moins une fois (proposition systématique)', cond: () => true }],
    indications: ['Sérologie jamais réalisée', 'Partenaire(s) à risque / nouveaux partenaires', 'IST antérieure', 'Usage de drogues IV', 'Grossesse (dépistage obligatoire)', 'Signes cliniques évocateurs'] },
  { id: 'ist', type: 'depistage', title: 'Autres IST (chlamydia, gonocoque, syphilis)', exam: 'PCR premier jet / ECBU / sérologie syphilis', show: () => true,
    auto: [{ label: '< 30 ans : dépistage chlamydia à proposer si nouveaux partenaires', cond: p => p.age !== null && p.age < 30 }],
    indications: ['Leucorrhées / urétrite', 'Partenaires multiples sans préservatif', 'Partenaire atteint d\'IST', 'Homme ayant des relations avec des hommes (dépistage régulier)', 'Grossesse (syphilis obligatoire)'] },
  { id: 'hepb', type: 'depistage', title: 'Hépatite B', exam: 'Sérologie HBsAg + anti-HBs', show: () => true,
    auto: [],
    indications: ['Statut vaccinal inconnu', 'Entourage de porteur', 'Grossesse (dépistage obligatoire)', 'Situation à risque (même que VIH)', 'Origine de zone d\'endémie'] }
]},

// ==================== GÉRIATRIE / SOCIAL ====================
{ id: 'geri', title: '🧓 Gériatrie / Social (≥ 65 ans)', blocks: [
  { id: 'chutes', type: 'depistage', title: 'Risque de chute', exam: 'Évaluation (TUG, test de lever de chaise) ± kiné', show: p => p.age !== null && p.age >= 65,
    auto: [{ label: 'Âge ≥ 65 ans : évaluation annuelle du risque de chute', cond: () => true }],
    indications: ['Chute dans l\'année écoulée', 'Trouble de la marche / équilibre', 'Benzodiazépines, anticholinergiques, hypotenseurs', 'Déficit visuel', 'Ostéoporose associée'] },
  { id: 'denutrition', type: 'depistage', title: 'Dénutrition', exam: 'Dépistage (MNA, poids, albumine)', show: p => p.age !== null && p.age >= 70,
    auto: [{ label: 'Âge ≥ 70 ans : dépistage de la dénutrition (HAS)', cond: () => true }],
    indications: ['Perte d\'appétit / perte de poids involontaire', 'Difficultés à faire les courses / cuisiner', 'Troubles de déglutition', 'Polymédication'] },
  { id: 'iatrogenie', type: 'checklist', title: 'Iatrogénie / traitements', show: p => p.age !== null && p.age >= 65,
    items: [
      { id: 'iatro-revue', label: 'Revue de la liste des traitements (prescrits et automédication)' },
      { id: 'iatro-observance', label: 'Observance vérifiée (ordre des prises, oudonnance comprise)' }
    ] },
  { id: 'social', type: 'checklist', title: 'Autonomie / social', show: p => p.age !== null && p.age >= 65,
    items: [
      { id: 'soc-isolement', label: 'Isolement social / aidants identifiés' },
      { id: 'soc-iadl', label: 'Autonomie évaluée (IADL), aides à domicile / APA si besoin' },
      { id: 'soc-confiance', label: 'Personne de confiance identifiée, directives anticipées évoquées' }
    ] }
]},

// ==================== ADDICTOLOGIE ====================
{ id: 'addicto', title: '🍷 Addictologie', blocks: [
  { id: 'tabac', type: 'depistage', title: 'Tabagisme', exam: 'Intervention brève d\'aide au sevrage (substitution, consultation)', show: () => true,
    auto: [],
    indications: ['Fumeur actif (paquets-années : …)', 'Ex-fumeur < 3 ans (surveillance)', 'Envie d\'arrêter exprimée'] },
  { id: 'alcool', type: 'depistage', title: 'Consommation d\'alcool à risque', exam: 'AUDIT-C complet + IBAA si positif', show: () => true,
    auto: [],
    indications: ['AUDIT-C ≥ 3 (H) / ≥ 2 (F) ou consommation ≥ 10 verres/semaine', 'Ivresses répétées', 'Pathologie hépatique, HTA, troubles du sommeil', 'Entourage inquiet'] },
  { id: 'autres-addict', type: 'depistage', title: 'Autres addictions', exam: 'Repérage et orientation', show: () => true,
    auto: [],
    indications: ['Cannabis quotidien', 'Opioïdes / benzodiazépines : usage prolongé non adapté', 'Jeux / écrans problématiques', 'Usage de crack / cocaïne / amphétamines'] }
]}
];

// ---------- État ----------
const state = {};
// blockId -> { indications: Set(idx), auto: bool[], status: 'a-jour'|'non-concerne'|null, note }
// checklist itemId -> { status: 'oui'|'non'|null, value }

function blockState(id) {
  if (!state[id]) state[id] = { indications: new Set(), status: null, note: '' };
  return state[id];
}
function itemState(id) {
  if (!state[id]) state[id] = { status: null, value: '' };
  return state[id];
}

// ---------- Rendu ----------
function render() {
  const container = document.getElementById('sections');
  container.innerHTML = '';
  const p = P();

  SECTIONS.forEach(sec => {
    const visBlocks = sec.blocks.filter(b => !b.show || b.show(p));
    if (!visBlocks.length) return;
    const card = document.createElement('section');
    card.className = 'card';
    card.innerHTML = `<h2>${sec.title}</h2>`;
    visBlocks.forEach(b => card.appendChild(renderBlock(b, p)));
    container.appendChild(card);
  });

  const age = p.age;
  document.getElementById('pat-age-line').textContent =
    PATIENT.ddn && age !== null ? `Âge calculé : ${age} an${age > 1 ? 's' : ''}`
    : (PATIENT.ddn ? 'Date de naissance invalide' : 'Renseignez la date de naissance pour activer les critères automatiques');

  updateSummary();
}

function renderBlock(b, p) {
  const div = document.createElement('div');
  div.className = 'block';
  div.dataset.block = b.id;

  if (b.type === 'depistage') {
    const st = blockState(b.id);
    const autoActive = (b.auto || []).filter(a => a.cond(p));
    const manualActive = [...st.indications].map(i => b.indications[i]).filter(Boolean);
    const reasons = [...autoActive.map(a => a.label), ...manualActive];
    const todo = st.status !== 'a-jour' && st.status !== 'non-concerne' && reasons.length > 0;
    const done = st.status === 'a-jour';
    const nc = st.status === 'non-concerne';

    let html = `<div class="block-head">
      <span class="block-title">${escapeHtml(b.title)}</span>
      <span class="block-actions">
        <button data-blockstatus="a-jour" class="${done ? 'active-oui' : ''}" title="Examen déjà réalisé ou à jour">✔ Réalisé / à jour</button>
        <button data-blockstatus="non-concerne" class="${nc ? 'active-na' : ''}" title="Ne concerne pas ce patient">N/A</button>
      </span></div>`;
    html += `<div class="block-exam">Examen : <strong>${escapeHtml(b.exam)}</strong></div>`;

    if (autoActive.length) {
      html += `<div class="indications-label">Automatique (âge / sexe) :</div><div class="indications">`;
      autoActive.forEach(a => html += `<label class="ind auto"><input type="checkbox" checked disabled> ${escapeHtml(a.label)}</label>`);
      html += `</div>`;
    }
    html += `<div class="indications-label">Indications à cocher si présentes :</div><div class="indications">`;
    b.indications.forEach((ind, i) => {
      html += `<label class="ind"><input type="checkbox" data-ind="${i}" ${st.indications.has(i) ? 'checked' : ''}> ${escapeHtml(ind)}</label>`;
    });
    html += `</div>`;

    if (todo)
      html += `<div class="conclusion todo">➡️ <strong>${escapeHtml(b.exam)} à réaliser</strong> car : ${escapeHtml(reasons.join(' ; '))}</div>`;
    else if (done)
      html += `<div class="conclusion done">✔ ${escapeHtml(b.title)} : examen réalisé / à jour</div>`;
    else if (nc)
      html += `<div class="conclusion na">N/A — ${escapeHtml(b.title)}</div>`;
    else if (st.indications.size === 0 && autoActive.length === 0)
      html += `<div class="conclusion none">Aucune indication cochée — pas de dépistage requis pour ce point</div>`;

    div.innerHTML = html;
    div.querySelectorAll('[data-ind]').forEach(cb => cb.addEventListener('change', () => {
      const i = parseInt(cb.dataset.ind, 10);
      if (cb.checked) st.indications.add(i); else st.indications.delete(i);
      render();
    }));
    div.querySelectorAll('[data-blockstatus]').forEach(btn => btn.addEventListener('click', () => {
      st.status = (st.status === btn.dataset.blockstatus) ? null : btn.dataset.blockstatus;
      render();
    }));
  }

  if (b.type === 'checklist') {
    let html = `<div class="block-head"><span class="block-title">${escapeHtml(b.title)}</span></div>`;
    b.items.forEach(it => {
      if (it.show && !it.show(p)) return;
      const st = itemState(it.id);
      const why = it.why ? it.why(p) : null;
      let flags = why ? `<span class="flag auto">ⓘ ${escapeHtml(why)}</span>` : '';
      if (st.status === 'oui') flags += `<span class="flag done">✔ Fait / à jour</span>`;
      if (st.status === 'non') flags += `<span class="flag todo">✖ À faire</span>`;
      html += `<div class="item" data-item="${it.id}">
        <div class="q"><span class="label">${escapeHtml(it.label)}${flags}</span></div>
        <div class="status">
          <button data-itemstatus="oui" class="${st.status === 'oui' ? 'active-oui' : ''}">Fait</button>
          <button data-itemstatus="non" class="${st.status === 'non' ? 'active-non' : ''}">À faire</button>
          <button data-itemstatus="na" class="${st.status === 'na' ? 'active-na' : ''}">N/A</button>
        </div></div>`;
    });
    div.innerHTML = html;
    div.querySelectorAll('[data-itemstatus]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.closest('.item').dataset.item;
      const st = itemState(id);
      st.status = (st.status === btn.dataset.itemstatus) ? null : btn.dataset.itemstatus;
      render();
    }));
  }
  return div;
}

// ---------- Synthèse ----------
function collectConclusions(p) {
  const todo = [], done = [], nc = [];
  SECTIONS.forEach(sec => {
    sec.blocks.forEach(b => {
      if (b.show && !b.show(p)) return;
      if (b.type !== 'depistage') return;
      const st = state[b.id] || { indications: new Set(), status: null };
      const auto = (b.auto || []).filter(a => a.cond(p)).map(a => a.label);
      const man = [...st.indications].map(i => b.indications[i]).filter(Boolean);
      if (st.status === 'a-jour') done.push({ section: sec.title, title: b.title, exam: b.exam });
      else if (st.status === 'non-concerne') nc.push({ section: sec.title, title: b.title });
      else if (auto.length + man.length > 0) todo.push({ section: sec.title, title: b.title, exam: b.exam, reasons: [...auto, ...man] });
    });
  });
  return { todo, done, nc };
}

function updateSummary() {
  const p = P();
  const { todo } = collectConclusions(p);
  let checklistTodo = 0, checklistEval = 0, checklistTotal = 0;
  SECTIONS.forEach(sec => sec.blocks.forEach(b => {
    if (b.type === 'checklist' && (!b.show || b.show(p))) b.items.forEach(it => {
      if (it.show && !it.show(p)) return;
      checklistTotal++;
      const st = state[it.id];
      if (st?.status === 'non') checklistTodo++;
      if (st?.status) checklistEval++;
    });
  }));
  document.getElementById('progress-info').innerHTML =
    `<strong>${todo.length}</strong> dépistage(s) à réaliser` +
    (checklistTotal ? ` — ${checklistTodo} action(s) de suivi à faire (${checklistEval}/${checklistTotal} items évalués)` : '');
}

// ---------- Patient & boutons ----------
document.addEventListener('input', e => {
  const pid = e.target.id;
  if (pid && pid.startsWith('pat-')) { PATIENT[pid.slice(4)] = e.target.value; render(); }
});
document.addEventListener('change', e => { if (e.target.id === 'pat-sex') { PATIENT.sex = e.target.value; render(); } });
document.getElementById('pat-date').value = new Date().toISOString().slice(0, 10);

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Réinitialiser toute la check-list ?')) { Object.keys(state).forEach(k => delete state[k]); render(); }
});

// ---------- Export ----------
function getResult() {
  const p = P();
  const sections = SECTIONS.map(sec => {
    const blocks = sec.blocks.filter(b => !b.show || b.show(p)).map(b => {
      if (b.type === 'depistage') {
        const st = state[b.id] || { indications: [], status: null };
        return {
          type: 'depistage', id: b.id, title: b.title, exam: b.exam, status: st.status,
          autoIndications: (b.auto || []).filter(a => a.cond(p)).map(a => a.label),
          indicationsCochees: [...st.indications].map(i => b.indications[i]).filter(Boolean),
          conclusion: conclusionText(b, p)
        };
      }
      return {
        type: 'checklist', id: b.id, title: b.title,
        items: b.items.filter(it => !it.show || it.show(p)).map(it => ({
          id: it.id, label: it.label, status: state[it.id]?.status || null
        }))
      };
    });
    return { id: sec.id, title: sec.title, blocks };
  });
  return {
    patient: { ...PATIENT, age: p.age },
    consultDate: document.getElementById('pat-date').value,
    conclusions: collectConclusions(p),
    sections
  };
}

function conclusionText(b, p) {
  const st = state[b.id] || { indications: new Set(), status: null };
  const auto = (b.auto || []).filter(a => a.cond(p)).map(a => a.label);
  const man = [...st.indications].map(i => b.indications[i]).filter(Boolean);
  if (st.status === 'a-jour') return `${b.exam} : réalisé / à jour`;
  if (st.status === 'non-concerne') return 'non concerné';
  if (auto.length + man.length) return `${b.exam} à réaliser car : ${[...auto, ...man].join(' ; ')}`;
  return 'aucune indication';
}

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(getResult(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `depistage_${(PATIENT.nom || 'patient').replace(/\s+/g, '_')}_${document.getElementById('pat-date').value}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- Rapport médecin ----------
function buildDoctorReport(p) {
  const name = [PATIENT.nom, PATIENT.prenom].filter(Boolean).join(' ') || '—';
  const date = document.getElementById('pat-date').value || '';
  const sexTxt = p.sex === 'F' ? 'Femme' : p.sex === 'M' ? 'Homme' : '—';
  const { todo, done, nc } = collectConclusions(p);

  let rows = '';
  SECTIONS.forEach(sec => {
    sec.blocks.forEach(b => {
      if (b.show && !b.show(p)) return;
      if (b.type === 'depistage') {
        const st = state[b.id] || { indications: new Set(), status: null };
        const auto = (b.auto || []).filter(a => a.cond(p)).map(a => a.label);
        const man = [...st.indications].map(i => b.indications[i]).filter(Boolean);
        let conclusion;
        if (st.status === 'a-jour') conclusion = 'RÉALISÉ / à jour';
        else if (st.status === 'non-concerne') conclusion = 'N/A';
        else if (auto.length + man.length) conclusion = `À RÉALISER — ${[...auto, ...man].join(' ; ')}`;
        else conclusion = 'Pas d\'indication';
        rows += `<tr><td>${escapeHtml(sec.title.replace(/^\S+\s/, ''))}</td><td>${escapeHtml(b.title)}</td><td>${escapeHtml(conclusion)}</td></tr>`;
      } else {
        b.items.forEach(it => {
          if (it.show && !it.show(p)) return;
          const st = state[it.id];
          const s = st?.status === 'oui' ? 'Fait' : st?.status === 'non' ? 'À FAIRE' : st?.status === 'na' ? 'N/A' : '—';
          rows += `<tr><td>${escapeHtml(sec.title.replace(/^\S+\s/, ''))}</td><td>${escapeHtml(it.label)}</td><td>${s}</td></tr>`;
        });
      }
    });
  });

  return `<h1>Rapport médecin — check-list de dépistage 360°</h1>
    <p><strong>${escapeHtml(name)}</strong> — ${p.age !== null ? p.age + ' ans' : 'âge ?'} — ${sexTxt} — le ${escapeHtml(date)}</p>
    <p>Synthèse : <strong>${todo.length} dépistage(s) à réaliser</strong>, ${done.length} à jour, ${nc.length} non concernés. RCV global : depistagecv.fr / risquecv.fr.</p>
    <table><tr><th>Appareil</th><th>Point</th><th>Conclusion</th></tr>${rows}</table>
    <p class="foot">Aide-mémoire conforme aux recommandations HAS / dépistage organisé. Ne remplace pas le jugement clinique.</p>`;
}

document.getElementById('btn-print-med').addEventListener('click', () => {
  const p = P();
  document.getElementById('print-area').innerHTML = buildDoctorReport(p);
  window.print();
});

// ---------- Rapport patient ----------
document.getElementById('btn-print').addEventListener('click', () => {
  const p = P();
  const name = [PATIENT.nom, PATIENT.prenom].filter(Boolean).join(' ') || '__________';
  const date = document.getElementById('pat-date').value || '';
  const sexTxt = p.sex === 'F' ? 'Femme' : p.sex === 'M' ? 'Homme' : '—';
  const ageTxt = p.age !== null ? `${p.age} ans` : '—';
  const { todo, done, nc } = collectConclusions(p);

  let todoRows = '', doneRows = '', ncRows = '', suiviRows = '';
  todo.forEach(t => todoRows += `<tr><td>${escapeHtml(t.section.replace(/^\S+\s/, ''))}</td><td><strong>${escapeHtml(t.exam)}</strong><br>${escapeHtml(t.title)}</td><td>${escapeHtml(t.reasons.join(' ; '))}</td></tr>`);
  done.forEach(t => doneRows += `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.exam)}</td></tr>`);
  nc.forEach(t => ncRows += `<tr><td>${escapeHtml(t.title)}</td></tr>`);
  SECTIONS.forEach(sec => sec.blocks.forEach(b => {
    if (b.type === 'checklist' && (!b.show || b.show(p))) b.items.forEach(it => {
      if (it.show && !it.show(p)) return;
      if (state[it.id]?.status === 'non') suiviRows += `<tr><td>${escapeHtml(sec.title.replace(/^\S+\s/, ''))}</td><td>${escapeHtml(it.label)}</td></tr>`;
    });
  }));

  const fmt = (rows, empty) => rows || `<tr><td>${empty}</td></tr>`;

  document.getElementById('print-area').innerHTML = `
    <h1>Bilan de santé — points de dépistage</h1>
    <p><strong>Patient :</strong> ${escapeHtml(name)} &nbsp;|&nbsp; <strong>Né(e) le :</strong> ${escapeHtml(PATIENT.ddn || '—')} (${escapeHtml(ageTxt)}) &nbsp;|&nbsp; <strong>Sexe :</strong> ${sexTxt} &nbsp;|&nbsp; <strong>Consultation du :</strong> ${escapeHtml(date)}</p>

    <h2>📋 Examens de dépistage à réaliser</h2>
    <table><tr><th>Domaine</th><th>Examen</th><th>Car : indication(s) trouvée(s)</th></tr>${fmt(todoRows, 'Aucun dépistage supplémentaire à programmer.')}</table>

    <h2>✔ Déjà réalisés / à jour</h2>
    <table><tr><th>Dépistage</th><th>Examen</th></tr>${fmt(doneRows, 'Aucun.')}</table>

    ${suiviRows ? `<h2>📌 Actions de suivi à faire</h2><table><tr><th>Domaine</th><th>Action</th></tr>${suiviRows}</table>` : ''}

    ${ncRows ? `<h2>ℹ️ Non concerné</h2><table>${ncRows}</table>` : ''}

    <div class="plan"><strong>Prochaines étapes :</strong> prenez rendez-vous pour les examens listés ci-dessus. Certains dépistages sont proposés automatiquement (courrier du programme national) ; les autres nécessitent une prescription de votre médecin. Le risque cardiovasculaire global est évalué par votre médecin via risquecv.fr.</div>
    <p class="foot">Document généré en consultation à titre d'aide-mémoire, conformément aux recommandations françaises (HAS / dépistage organisé). Ne remplace pas l'avis médical.</p>`;
  window.print();
});

// ---------- API Python ----------
window.Depistage = {
  setData(d) {
    PATIENT = { nom: d.nom || '', prenom: d.prenom || '', ddn: d.ddn || d.dateNaissance || '', sex: d.sex || d.sexe || '' };
    document.getElementById('pat-nom').value = PATIENT.nom;
    document.getElementById('pat-prenom').value = PATIENT.prenom;
    document.getElementById('pat-ddn').value = PATIENT.ddn;
    document.getElementById('pat-sex').value = PATIENT.sex;
    render();
  },
  getResult
};

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
