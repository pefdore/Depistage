/* Check-list d'indications de dépistage. Tout est local (aucun envoi réseau).
   Modèle : chaque examen a une liste d'indications (cases à cocher).
   - auto(p) => true  : indication remplie par les données patient (pré-cochée)
   - auto(p) => false : données patient ne remplissent pas cette indication
   - auto absent      : indication clinique à vérifier manuellement
   L'examen est "INDIQUÉ" dès qu'une indication est cochée. */

const P = () => {
  const age = parseInt(document.getElementById('pat-age').value, 10);
  const ageMoisRaw = parseFloat(document.getElementById('pat-age-mois')?.value);
  const sex = document.getElementById('pat-sex').value;
  const tabac = document.getElementById('pat-tabac').value;
  const pa = parseFloat(document.getElementById('pat-pa').value);
  const dfg = parseFloat(document.getElementById('pat-dfg').value);
  const imc = parseFloat(document.getElementById('pat-imc').value);
  const ldl = parseFloat(document.getElementById('pat-ldl').value);
  const sbp = parseFloat(document.getElementById('pat-sbp').value);
  const chol = parseFloat(document.getElementById('pat-chol').value);
  const hdl = parseFloat(document.getElementById('pat-hdl').value);
  const hba1c = parseFloat(document.getElementById('pat-hba1c')?.value);
  return {
    age: isNaN(age) ? null : age,
    ageMois: isNaN(ageMoisRaw) ? null : ageMoisRaw,
    sex,
    tabac,                                  // 'jamais' | 'sevré' | 'actif' | ''
    pa: isNaN(pa) ? null : pa,
    fumeur: tabac === 'actif' || tabac === 'sevré',
    grosFumeur: (tabac === 'actif' || tabac === 'sevré') && !isNaN(pa) && pa >= 20,
    diabete: document.getElementById('pat-diabete').value === 'oui',
    hta: document.getElementById('pat-hta').value === 'oui',
    ic: document.getElementById('pat-ic').value === 'oui',
    bpco: document.getElementById('pat-bpco')?.value === 'oui',
    vems: isNaN(parseFloat(document.getElementById('pat-vems')?.value)) ? null : parseFloat(document.getElementById('pat-vems').value),
    exacerb: isNaN(parseFloat(document.getElementById('pat-exac')?.value)) ? null : parseFloat(document.getElementById('pat-exac').value),
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
    sbp: isNaN(sbp) ? null : sbp,
    chol: isNaN(chol) ? null : chol,
    hdl: isNaN(hdl) ? null : hdl,
    hba1c: isNaN(hba1c) ? null : hba1c,
  };
};

const between = (p, a, b) => p.age !== null && p.age >= a && p.age <= b;
const isF = p => p.sex === 'F';
const isM = p => p.sex === 'M';

// ---------- Listes CPAM (ameli pro) ----------
const CPAM_MODULES = [
  { id: 'rc',   label: 'Maladie rénale chronique', icon: '🫘' },
  { id: 'dia',  label: 'Dépistage du diabète', icon: '🍬' },
  { id: 'crc',  label: 'Cancer colorectal (Hémoccult)', icon: '🧪' },
  { id: 'cus',  label: 'Cancer du col de l\u2019utérus (frottis/HPV)', icon: '🌸' },
  { id: 'sein', label: 'Cancer du sein (mammographie)', icon: '🎗️' },
  { id: 'sbd',  label: 'Suivi biologique du diabète', icon: '🩸' },
];
const CPAM_STATUTS = {
  'fait':      { txt: 'Fait',        cls: 'ok' },
  'averifier': { txt: 'À faire',    cls: 'todo' },
  'exclu':     { txt: 'Exclu(e)',   cls: 'na' },
};
function cpamStore() {
  try { return JSON.parse(localStorage.getItem('depistage-cpam') || '{}'); }
  catch { return {}; }
}
function cpamSave(store) { localStorage.setItem('depistage-cpam', JSON.stringify(store)); }
function cpamCurrentPeriod() {
  const d = new Date();
  return d.getFullYear() + '-T' + (Math.floor(d.getMonth() / 3) + 1);
}
function cpamPeriodsOf(store, moduleId) {
  const mod = store[moduleId];
  if (!mod || typeof mod !== 'object') return [];
  if (mod.rows) return ['']; // ancien format (sans trimestre)
  return Object.keys(mod).sort();
}
function cpamGetList(store, moduleId, period) {
  const mod = store[moduleId];
  if (!mod) return null;
  if (mod.rows) return period === undefined || period === '' ? mod : null;
  return mod[period] || null;
}
function cpamLatestList(store, moduleId) {
  const periods = cpamPeriodsOf(store, moduleId);
  if (!periods.length) return null;
  return cpamGetList(store, moduleId, periods[periods.length - 1]);
}
function cpamNorm(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-_]/g, ''); }
function cpamResolveStatut(s) {
  const n = cpamNorm(s);
  if (CPAM_STATUTS[n]) return n;
  if (n.includes('averifier')) return 'averifier';
  if (n.includes('exclu')) return 'exclu';
  if (n.includes('fait')) return 'fait';
  return n;
}
function cpamParseXml(text) {
  const rows = [];
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (clean.startsWith('<')) {
    const doc = new DOMParser().parseFromString(clean, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML invalide');
    const nodes = [...doc.querySelectorAll('ligne, row, Line, patient, Patient, item, record')];
    nodes.forEach(n => {
      const get = tag => (n.querySelector(tag)?.textContent || '').trim();
      const attrs = {};
      [...n.attributes].forEach(a => { attrs[a.name.toLowerCase()] = a.value; });
      const nom = get('nom') || attrs['nom'] || get('colonneb') || '';
      const prenom = get('prenom') || attrs['prenom'] || get('colonnec') || '';
      const age = get('age') || attrs['age'] || get('colonned') || '';
      const nir = get('nir') || attrs['nir'] || get('colonnee') || '';
      const statut = get('statut') || attrs['statut'] || get('colonnef') || '';
      if (nom || nir) rows.push({ nom, prenom, age: parseInt(age, 10) || null, nir, statut: cpamNorm(statut) });
    });
  } else {
    clean.split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      const cells = line.split(/[;\t|]/).map(c => c.replace(/^"|"$/g, '').trim());
      if (cells.length < 4) return;
      const isHeader = cpamNorm(cells[0]).includes('nom') && cpamNorm(cells[1]).includes('prenom');
      if (isHeader) return;
      rows.push({ nom: cells[0] || '', prenom: cells[1] || '', age: parseInt(cells[2], 10) || null, nir: cells[3] || '', statut: cpamNorm(cells[4]) });
    });
  }
  if (!rows.length) throw new Error('Aucune ligne patient trouv\u00e9e');
  return rows;
}
// Extraction de texte d'une cellule <c>...</c> xlsx (inline, sharedStrings ou valeur brute)
async function cpamInflateRaw(bytes) {
  //Décompression deflate d'un Uint8Array via DecompressionStream (navigateur)
  if (typeof DecompressionStream === 'undefined') throw new Error('Navigateur incompatible : ouvrir le fichier xlsx dans Excel et l\u2019enregistrer en CSV pour importer');
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}
function cpamXlsxCellText(cEl, shared) {
  const t = cEl.getAttribute('t');
  if (t === 'inlineStr') return (cEl.querySelector('is>t')?.textContent || cEl.querySelector('is')?.textContent || '').trim();
  const v = cEl.querySelector('v')?.textContent || '';
  if (t === 's') { const i = parseInt(v, 10); return isNaN(i) ? '' : (shared[i] || '').trim(); }
  return v.trim();
}
function cpamXlsxColIndex(ref) {
  const m = /^([A-Z]+)/.exec(ref || '');
  if (!m) return 0;
  return m[1].split('').reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0) - 1; // A=0, B=1…
}
async function cpamParseXlsx(bytes) {
  // Lecture minimale d'un zip : central directory -> entrées (nom + données deflate)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = o => dv.getUint16(o, true);
  const u32 = o => dv.getUint32(o, true);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (bytes[i] === 0x50 && u32(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Fichier xlsx illisible (zip invalide)');
  const cdOff = u32(eocd + 16);
  const entries = {};
  let p = cdOff;
  while (u32(p) === 0x02014b50) {
    const method = u16(p + 10);
    const compSize = u32(p + 20);
    const nameLen = u16(p + 28), extraLen = u16(p + 30), commentLen = u16(p + 32);
    const localOff = u32(p + 42);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (method === 0) {
      entries[name] = bytes.subarray(localOff + 30 + u16(localOff + 26) + u16(localOff + 28), localOff + 30 + u16(localOff + 26) + u16(localOff + 28) + compSize);
    } else {
      const dataStart = localOff + 30 + u16(localOff + 26) + u16(localOff + 28);
      entries[name] = { compressed: bytes.subarray(dataStart, dataStart + compSize) };
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  const getEntry = async name => {
    const e = entries[name];
    if (!e) return null;
    if (e instanceof Uint8Array) return new TextDecoder().decode(e);
    return new TextDecoder().decode(await cpamInflateRaw(e.compressed));
  };
  const sharedXml = await getEntry('xl/sharedStrings.xml');
  const shared = [];
  if (sharedXml) {
    const sdoc = new DOMParser().parseFromString(sharedXml, 'application/xml');
    [...sdoc.querySelectorAll('si')].forEach(si => {
      const ts = [...si.querySelectorAll('t')];
      shared.push(ts.length ? ts.map(t => t.textContent).join('') : (si.textContent || ''));
    });
  }
  let sheet = await getEntry('xl/worksheets/sheet1.xml');
  if (!sheet) {
    const wb = await getEntry('xl/workbook.xml');
    const name = Object.keys(entries).find(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
    if (name) sheet = await getEntry(name);
    else if (!wb) throw new Error('Feuille xlsx introuvable');
  }
  if (!sheet) throw new Error('Feuille xlsx introuvable');
  const doc = new DOMParser().parseFromString(sheet, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XLSX invalide');
  const rows = [];
  const colWanted = { 1: 'nom', 2: 'prenom', 3: 'age', 4: 'nir', 5: 'statut' }; // colonnes B-F
  [...doc.querySelectorAll('row')].forEach(rowEl => {
    const cells = {};
    [...rowEl.querySelectorAll('c')].forEach(c => {
      const idx = cpamXlsxColIndex(c.getAttribute('r'));
      if (colWanted[idx] !== undefined) cells[colWanted[idx]] = cpamXlsxCellText(c, shared);
    });
    if (!cells.nom && !cells.nir) return;
    if (cpamNorm(cells.nom).includes('nom')) return; // ligne d'en-tête
    rows.push({ nom: cells.nom || '', prenom: cells.prenom || '', age: parseInt(cells.age, 10) || null, nir: cells.nir || '', statut: cpamNorm(cells.statut) });
  });
  if (!rows.length) throw new Error('Aucune ligne patient trouv\u00e9e dans le xlsx (colonnes B \u00e0 F attendues)');
  return rows;
}
async function cpamParseAny(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (isZip) return cpamParseXlsx(bytes);
  return cpamParseXml(new TextDecoder().decode(bytes));
}
function cpamImport(moduleId, period, text) {
  return cpamImportRows(moduleId, period, cpamParseXml(text));
}
function cpamImportRows(moduleId, period, rows) {
  if (!rows.length) throw new Error('Aucune ligne patient trouv\u00e9e');
  const store = cpamStore();
  if (store[moduleId] && store[moduleId].rows) store[moduleId] = {}; // migration ancien format
  if (!store[moduleId] || typeof store[moduleId] !== 'object' || !store[moduleId]) store[moduleId] = {};
  store[moduleId][period] = { importedAt: new Date().toISOString(), count: rows.length, rows };
  cpamSave(store);
  return rows.length;
}
function cpamDeleteModule(moduleId, period) {
  const store = cpamStore();
  const mod = store[moduleId];
  if (!mod) return;
  if (mod.rows) delete store[moduleId]; // ancien format
  else { delete mod[period]; if (!Object.keys(mod).length) delete store[moduleId]; }
  cpamSave(store);
}
function cpamMatchPatient(store) {
  const words = {
    nom: cpamNorm(document.getElementById('pat-nom')?.value || ''),
    prenom: cpamNorm(document.getElementById('pat-prenom')?.value || ''),
  };
  if (!words.nom && !words.prenom) return {};
  const out = {};
  CPAM_MODULES.forEach(m => {
    const list = cpamLatestList(store, m.id);
    if (!list) { out[m.id] = { status: 'no-list' }; return; }
    const hit = list.rows.find(r => {
      const rn = cpamNorm(r.nom), rp = cpamNorm(r.prenom);
      if (words.nom && words.prenom) return rn.startsWith(words.nom) && rp.startsWith(words.prenom);
      if (words.nom) return rn.startsWith(words.nom);
      return words.prenom && rp.startsWith(words.prenom);
    });
    out[m.id] = hit ? { status: hit.statut, row: hit } : { status: 'absent' };
  });
  return out;
}
function cpamCount(list, kind) {
  if (!list) return 0;
  const k = cpamNorm(kind);
  if (k === 'total') return list.rows.length;
  return list.rows.filter(r => cpamNorm(r.statut).includes(k)).length;
}

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

function renderPedia(p) {
  const panel = document.getElementById('pedia-panel');
  if (!panel) return;
  const m = p.ageMois;
  if (m === null || m >= 24) { panel.innerHTML = ''; window._pediaMonth = null; return; }
  const f = v => String(v).replace('.', ',');
  const cur = (window._pediaMonth !== null && window._pediaMonth !== undefined) ? Math.min(23, Math.max(0, window._pediaMonth)) : m;
  const curR = Math.round(cur);
  const moisLbl = x => x === 0 ? 'Naissance' : x + ' mois';

  const vacByMonth = {
    0: 'BCG (si risque) — Vitamine K1',
    2: 'Hexavalent 1 (DTCa-Polio-Hib-HepB) + pneumocoque 1 + Rotavirus 1 (recommandé, oral)',
    3: 'Méningocoque B 1 (Bexsero)',
    4: 'Hexavalent 2 + pneumocoque 2 + Rotavirus 2',
    5: 'Méningocoque B 2 (Bexsero)',
    6: 'Méningocoque ACWY 1 (Nimenrix)',
    11: 'Hexavalent 3 (rappel) + pneumocoque 3 (rappel)',
    12: 'Méningocoque B 3 (rappel, Bexsero) + Méningocoque ACWY 2 (Nimenrix/Menquadfi) + ROR 1 (rougeole-oreillons-rubéole)',
    17: 'ROR 2 (16–18 mois)',
  };
  const nextVac = () => { for (let x = Math.floor(m) + 1; x <= 24; x++) if (vacByMonth[x]) return { at: x, txt: vacByMonth[x] }; return null; };

  const weightAt = x => {
    if (x <= 0) return 'Perte max 10 % les 3 premiers jours, regained vers J10–14. +25 à 30 g/jour ensuite (poids de naissance doublé vers 4–5 mois)';
    if (x <= 3) return '+25 à 30 g/jour — poids de naissance doublé vers 4–5 mois';
    if (x <= 6) return '+15 à 20 g/jour';
    if (x <= 12) return '+10 à 15 g/jour — poids de naissance triplé vers 1 an';
    return '+5 à 10 g/jour — taille : +12 cm la 1re année, +8 cm la 2e';
  };

  const laitAt = x => {
    if (x <= 1) return '6–8 repas/jour, 60–90 mL par repas (appétit libre)';
    if (x <= 2) return '5–6 repas/jour, 90–120 mL';
    if (x <= 3) return '5 repas/jour, 120–150 mL';
    if (x <= 5) return '4–5 repas/jour, 150–180 mL (max ≈ 210 mL par biberon)';
    if (x <= 6) return '4 repas/jour, 180–210 mL — début diversification entre 4 et 6 mois';
    if (x <= 12) return '≥ 500 mL de lait/jour (2e âge ou suite) en parallèle de la diversification';
    return '500 mL/jour de lait de croissance ou lait entier — allaitement maternel : à la demande, sans comptage (règle biberon : ≈ 1/10e du poids/jour, max ≈ 1 L)';
  };

  const diversAt = x => {
    if (x < 4) return 'Lait exclusif — pas encore de diversification (début entre 4 et 6 mois, fenêtre d’acceptation). Éviter absolument : miel < 1 an, lait de vache seul < 1 an';
    if (x <= 6) return 'Début : légumes et fruits (2–3 cuillères → progresser) — le lait reste l’aliment principal. Gluten à introduire entre 4 et 7 mois';
    if (x <= 7) return '1 repas mixé complet/jour : légumes ≈ 130 g + viande/poisson 5–10 g (ou 1/4 de jaune d’œuf) + laitage ou fruit en dessert';
    if (x <= 8) return '2 repas diversifiés/jour — protides ≈ 10 g/jour, féculents 20–30 g';
    if (x <= 12) return 'Textures moulinées puis petits morceaux — protides ≈ 20 g/jour (viande/poisson ou 1/2 œuf), ≥ 500 mL de lait/jour';
    return 'Repas quasi familial, morceaux — protides 20–30 g/jour, 3–4 repas + 1 collation ; éviter : sel, sucres ajoutés, fruits à coque entiers < 4 ans';
  };

  const psychoAt = x => {
    if (x <= 2) return 'Sursaut aux bruits, fixe le visage, commence à suivre du regard ; sourire réponse vers 6–8 semaines (repère carnet de santé)';
    if (x <= 4) return 'Tenue de têpe, suit un objet des yeux, sourire social franc, gazouille, se redresse sur les avant-bras';
    if (x <= 6) return 'Se retourne dos → ventre, attrape un objet et le porte à la bouche, tient assis avec appui, gazouillis variés, rit aux éclats';
    if (x <= 9) return 'Assis seul et stable, réagit à son prénom, jeu de coucou, anxiété face à l’inconnu, passe l’objet d’une main à l’autre, babille « mama/dada » vers 8 mois';
    if (x <= 12) return 'Se déplace à 4 pattes, préhension pince pouce–index, comprend « non », tient debout seul, 1–2 mots vers 12 mois, fait coucou-au revoir';
    if (x <= 18) return 'Marche seule acquise (~12–15 mois), montre du doigt, 3–10 mots, empile 2–3 cubes, mange seul à la cuillère, aide à s’habiller';
    return 'Court, monte les escaliers, 20–50 mots, phrases de 2 mots, montre 2–3 parties du corps, jeu symbolique (fait semblant)';
  };

  const alerteAt = x => {
    if (x < 3) return 'Pas de sourire social, hypotonie, succion pauvre, plafonnement du regard';
    if (x < 5) return 'Pas de tenue de tête, pas de poursuite visuelle, strabisme fixé';
    if (x < 9) return 'Ne se retourne pas, ne tient pas assis, ne porte pas les objets à la bouche';
    if (x < 14) return 'Pas d’assise stable, pas de préhension en pince, aucun babille « mama/dada »';
    if (x < 18) return 'Pas de marche, pas de pointage, aucun mot';
    return 'Pas de phrases de 2 mots, régression d’un acquis, évitement du regard';
  };

  const redFlags = [
    { a: [0, 3], t: 'Infection invasive du nourrisson (IIA)', age: '0\u20133 mois', s: 'Fi\u00e8vre \u2265 38 \u00b0C, tvF, gris p\u00e2le, marbrures, geignements, hypotonie, refus des biberons, polypn\u00e9e', c: 'URGENCE : ECBU + h\u00e9moculture \u00b1 PL, aucune antibioth\u00e9rapie orale d\u2019attente, orientation hospitali\u00e8re' },
    { a: [0, 2], t: 'Omphalite / infection du cordon', age: '0\u20132 mois', s: '\u00c9coulement omphalique purulent, \u0153d\u00e8me p\u00e9ri-ombilical, rougeur, fi\u00e8vre', c: 'Antibioth\u00e9rapie rapide (portail infectieux \u2192 risque de sepsis), avis p\u00e9diatrique' },
    { a: [3, 6], t: 'Arthrite septique de hanche / ost\u00e9omy\u00e9lite', age: '3\u20136 mois', s: 'Boiterie ou impotence douloureuse, position en flexion-abduction, fi\u00e8vre, irritabilit\u00e9 au change', c: 'URGENCE : avis orthop\u00e9dique + imagerie, ponction articulaire \u2014 s\u00e9quelles si retard' },
    { a: [4, 9], t: 'D\u00e9tresse respiratoire / bronchiolite grave', age: '< 3 mois \u00e0 risque', s: 'Apn\u00e9es, tirage marqu\u00e9, SpO\u2082 < 92 %, refus de boire, terrain pr\u00e9matur\u00e9 / cardiopathie / DBP', c: 'Hospitalisation (O\u2082, hydratation) \u2014 pas de bronchodilatateur syst\u00e9matique' },
    { a: [6, 24], t: 'Invagination intestinale aigu\u00eb', age: '6\u201324 mois (pic 9\u201312 mois)', s: 'Douleurs paroxystiques (se tord, p\u00e2lit, hurle), vomissements, fosse iliaque droite vide, selles \u00ab gel\u00e9e de framboise \u00bb, l\u00e9thargie entre les crises', c: 'URGENCE : \u00e9chographie abdominale, r\u00e9duction pneumatique ou chirurgicale sans d\u00e9lai' },
    { a: [6, 24], t: 'Syndrome de Kawasaki', age: '6\u201324 mois (pic < 1 an)', s: 'Fi\u00e8vre \u2265 5 jours + \u2265 4/5 : conjonctivite bilat\u00e9rale non purulente, l\u00e8vres s\u00e8ches fissur\u00e9es + rougeur buccale, \u00e9ruption polymorphe, \u00e9ryth\u00e8me/\u0153d\u00e8me mains et pieds, ad\u00e9nopathie cervicale \u2265 1,5 cm', c: 'URGENCE : IgIV + aspirine dans les 10 jours \u2014 an\u00e9vrismes coronaires si retard' },
    { a: [0, 6], t: 'Cardiopathie cong\u00e9nitale', age: '0\u20136 mois', s: 'Souffle, tirs, sueurs du front au biberon, cassure de la courbe de poids, cyanose, h\u00e9patom\u00e9galie, p\u00e2leur', c: '\u00c9chographie cardiaque sans attendre, avis cardiop\u00e9diatrique' },
    { a: [0, 12], t: 'Malaise grave du nourrisson / MIN', age: '0\u201312 mois', s: 'Malaise prolong\u00e9, hypertonie, regard fixe, p\u00e2leur/cyanose, apn\u00e9e ; tvF inexpliqu\u00e9', c: 'Recherche \u00e9tiologique syst\u00e9matique (infection, RGO, cardiopathie, m\u00e9ningite) avant de conclure \u00e0 un malaise vagal \u2014 hospitalisation si malaise grave' },
    { a: [9, 24], t: 'Diab\u00e8te inaugural / acidoc\u00e9tose', age: '9\u201324 mois', s: 'Polyurie-polydipsie (couches anormalement lourdes), amaigrissement, asth\u00e9nie, douleurs abdominales, polypn\u00e9e de Kussmaul, haleine c\u00e9tonique', c: 'Glyc\u00e9mie capillaire + c\u00e9ton\u00e9mie imm\u00e9diate \u2014 urgence absolue si acidoc\u00e9tose' },
    { a: [12, 24], t: 'Rougeole', age: '12\u201324 mois (si non vaccin\u00e9)', s: 'Fi\u00e8vre \u00e9lev\u00e9e + catarrhe oculo-nasal + taches de K\u00f6plik puis \u00e9ruption descendante', c: 'Isolement, d\u00e9claration obligatoire, prophylaxie des contacts, v\u00e9rifier le ROR (1re dose \u00e0 12 mois)' },
    { a: [18, 24], t: 'Signes d\u2019alerte TSA / r\u00e9gression', age: '18\u201324 mois', s: 'Perte d\u2019acquis : langage, pointage, regard, int\u00e9r\u00eat social ; aucun mot \u00e0 18 mois, pas de pointage protod\u00e9claratif', c: 'M-CHAT-R, orientation pr\u00e9coce r\u00e9seau TSA / p\u00e9dopsychiatrie \u2014 avant 3 ans' },
    { a: [0, 24], t: 'Cassure de croissance / hypotonie', age: '0\u201324 mois', s: 'Stagnation pond\u00e9rale, cassure de la courbe, hypertonie ou hypotonie, micro/macroc\u00e9phalie, plafonnement', c: 'Avis p\u00e9diatrique, ne jamais banaliser \u2014 \u00e9tiologie \u00e0 rechercher' },
  ];

  const commonIssues = [
    { t: 'Allergie aux prot\u00e9ines du lait de vache (APLV)', age: '0\u201312 mois (pic 0\u20136 mois)', w: 'R\u00e9gurgitations/vomissements persistants, diarrh\u00e9e chronique, sang dans les selles (colite), ecz\u00e9ma r\u00e9sistant, douleurs abdominales avec pleurs, cassure pond\u00e9rale, RGO s\u00e9v\u00e8re r\u00e9sistant aux IPP', c: 'IgE-m\u00e9di\u00e9e (urticaire, \u0153d\u00e8me, choc) ou non IgE (digestif, cutan\u00e9) : \u00e9viction 2\u20134 semaines puis test de r\u00e9introduction (challenge) \u2014 hydrolysat extensif (ou \u00e9l\u00e9mentaire si \u00e9chec) ; si allaitement : \u00e9viction lait de vache chez la m\u00e8re. R\u00e9introduction progressive vers 9\u201312 mois (80 % gu\u00e9rissent vers 1 an). Avis allergo si IgE-m\u00e9di\u00e9e s\u00e9v\u00e8re, choc, \u00e9chec hydrolysat.' },
    { t: 'Cassure staturo-pond\u00e9rale', age: '0\u201324 mois', w: 'Chute de \u2265 1\u20132 couloirs sur le carnet de sant\u00e9 (poids, taille ou p\u00e9rim\u00e8tre cr\u00e2nien), stagnation pond\u00e9rale sur 2 consultations cons\u00e9cutives', c: '1) Confirmer la mesure, reprendre les courbes \u2014 2) Cause alimentaire (quantit\u00e9s, erreur de reconstitution du biberon, APLV) \u2014 3) \u00c9liminer une cause organique : infection, RGO s\u00e9v\u00e8re, cardiopathie, malabsorption/mucoviscidose, trouble endocrinien, n\u00e9gligence \u2014 4) Examen complet : ORL, cardio, abdomen, peau, tonus \u2014 5) Bilan de 1re intention si \u00e9chec de la prise en charge di\u00e9t\u00e9tique : NFS, CRP, ionogramme, calc\u00e9mie, cr\u00e9atinin\u00e9mie, s\u00e9rologie c\u0153liaque > 6 mois (IgA anti-transglutaminase + IgA totales), coproculture/parasitologie \u2014 avis p\u00e9diatrique si confirm\u00e9e ou signes d\u2019alerte' },
    { t: 'RGO du nourrisson', age: '0\u201312 mois', w: 'R\u00e9gurgitations simples (physiologiques) \u00e0 distinguer des signes d\u2019alerte : vomissements persistants, h\u00e9morragiques, refus alimentaire, cassure pond\u00e9rale, pleurs post-prandiaux, opisthotonos, apn\u00e9es', c: 'R\u00e9assurance + \u00e9paississant (caroube/amidon) + position verticale 30 min post-prandiale si forme simple \u2014 \u00c9VITER les IPP d\u2019embl\u00e9e (b\u00e9n\u00e9fice faible, effets sur le microbiote). IPP seulement si RGO pathologique (cassure, \u0153sophagite, trouble alimentaire). Vomissements bilieux ou d\u00e8s la naissance : urgence chirurgicale \u00e0 \u00e9carter.' },
    { t: 'Coliques du nourrisson', age: '2\u201316 semaines', w: 'Pleurs paroxystiques vesp\u00e9raux, enfant se tord, visage rouge, p\u00e9riodes de r\u00e9mission entre les crises, croissance normale, examen clinique normal', c: 'Diagnostic d\u2019\u00e9limination \u2014 rassurer, burp efficace, portage, bruit blanc, t\u00e9t\u00e9es fractionn\u00e9es ; aucun examen si examen normal et croissance normale. Si atypie (fi\u00e8vre, vomissements, sang, cassure) : \u00e9liminer infection, APLV, RGO, invagination.' },
    { t: 'Dermatite atopique (ecz\u00e9ma)', age: '2\u201324 mois', w: 'Plaques \u00e9ryth\u00e9mato-squameuses prurigineuses : visage et faces extenseurs < 1 an puis flexures ; x\u00e9rose, ant\u00e9c\u00e9dents familiaux atopiques', c: '\u00c9mollients \u2265 2 fois/jour en grande quantit\u00e9 \u2014 dermocortico\u00efdes (classe I\u2013II) si pouss\u00e9e, cure courte, sans crainte \u2014 surveiller surinfection (imp\u00e9tigo ; \u00e9ruption v\u00e9siculeuse douloureuse = ecz\u00e9ma herp\u00e9tique, urgence) \u2014 \u00e9viction alimentaire seulement si allergie prouv\u00e9e. Avis dermato/p\u00e9diatre si s\u00e9v\u00e8re ou \u00e9chec.' },
    { t: 'An\u00e9mie ferriprive', age: '6\u201324 mois', w: 'P\u00e2leur, fatigue, irritabilit\u00e9, inapp\u00e9tence ; enfants \u00e0 risque : pr\u00e9maturit\u00e9, faible poids de naissance, lait de vache < 1 an, diversification tardive ou pauvre en fer', c: 'NFS : Hb < 11 g/dL entre 6 mois et 4 ans \u2014 ferritine si doute. Fer oral 3 mg/kg/j 2\u20133 mois + r\u00e9gime enrichi en fer (viande, c\u00e9r\u00e9ales enrichies, limiter le lait \u00e0 500 mL/j). Si s\u00e9v\u00e8re ou r\u00e9cidivant : rechercher un saignement (selles).' },
    { t: 'Carence en vitamine D (rachitisme)', age: '0\u201324 mois', w: 'Retard d\u2019acquisitions motrices, hypotonie, d\u00e9formations osseuses (craniotab\u00e8s, front carr\u00e9, chapelet costal, genu varum), hypocalc\u00e9mie (convulsions, t\u00e9tanie)', c: 'Pr\u00e9vention : vitamine D 800\u20131 000 UI/jour de la naissance \u2014 v\u00e9rifier l\u2019observance \u00e0 CHAQUE suivi (cause n\u00b01). Si signes cliniques : calc\u00e9mie, phosphor\u00e9mie, PAL, PTH, 25-OH-D \u2014 recharge vitaminique D (\u00b1 calcium) si rachitisme av\u00e9r\u00e9.' },
    { t: 'Constipation / encopr\u00e9sie', age: '0\u201324 mois / encopr\u00e9sie > 4 ans', w: 'Constipation : selles dures rares, douleurs, fissure anale \u2014 Encopr\u00e9sie : fuites f\u00e9cales r\u00e9p\u00e9t\u00e9es dans les sous-v\u00eatement (fausse diarrh\u00e9e par impaction), enfant honteux ou indiff\u00e9rent', c: 'Constipation du nourrisson : massage, laits adapt\u00e9s, eau, pruneau si diversifi\u00e9 \u2014 avant 4 mois : \u00e9liminer Hirschsprung (retard m\u00e9conium, distension, vomissements). Encopr\u00e9sie : d\u00e9simpaction (macrogols) puis entretien 6\u201312 mois + \u00e9ducation (temps aux toilettes, renforcement positif) \u2014 avis si \u00e9chec, douleurs, distension.' },
    { t: '\u00c9nur\u00e9sie nocturne', age: 'diagnostic > 5 ans', w: 'Mictions nocturnes involontaires \u2014 primaire (jamais propre) ou secondaire (reprise apr\u00e8s 6 mois de propret\u00e9 : penser stress, diab\u00e8te, infection, constipation) ; retentissement sur l\u2019estime et la famille', c: 'Apr\u00e8s 5 ans : boire suffisamment le jour, miction avant coucher, calendrier mictionnel \u2014 pipi-stop (alarme) en 1re intention si enfant motiv\u00e9 \u2014 desmopressine (Minirin) si \u00e9chec de l\u2019alarme \u2014 \u00e9liminer BU (infection, glycosurie) et constipation. \u00c9nur\u00e9sie secondaire ou diurne associ\u00e9e : avis p\u00e9diatrique.' },
    { t: 'Troubles du sommeil', age: '0\u201324 mois', w: 'Endormissement difficile, r\u00e9veils multiples, pleurs inexpliqu\u00e9s, besoin d\u2019aide pour rendormir ; retentissement familial, \u00e9puisement parental', c: 'Revoir l\u2019environnement (bruit, lumi\u00e8re, temp\u00e9rature), la r\u00e9gularit\u00e9 des siestes, la sur-stimulation, les signes d\u2019endormissement mal reconnus \u2014 \u00e9liminer douleur (otite, dentition, hernie), RGO, infection \u2014 rituel de coucher, limites claires, r\u00e9assurance. Pas de m\u00e9latonine sans avis. Vigilance \u00e9puisement parental : proposer soutien.' },
    { t: 'Retard de langage simple vs trouble', age: '18\u201324 mois', w: 'Mots peu nombreux, pas de phrases, MAIS compr\u00e9hension normale, pointage pr\u00e9sent, regard social et interactions pr\u00e9serv\u00e9s', c: 'Retard simple (comprend, communique, progresse) \u00e0 distinguer d\u2019un trouble d\u00e9veloppemental (TSA, dysphasie \u2014 voir signes d\u2019alerte). Encourager le langage parental (d\u00e9crire, lire, chanter), limiter les \u00e9crans < 2 ans. Si < 10 mots \u00e0 18 mois, r\u00e9gression, ou compr\u00e9hension alt\u00e9r\u00e9e : M-CHAT-R + avis p\u00e9dopsychiatrie / orthophonie.' },
    { t: 'Otites moyennes aigu\u00ebs / s\u00e9reuses', age: '6\u201324 mois (pic 9\u201318 mois)', w: 'Fi\u00e8vre + douleur auriculaire, tympan congestif \u00b1 bomb\u00e9 ; otites \u00e0 r\u00e9p\u00e9tition \u2014 otite s\u00e9reuse : hypoacousie (fait r\u00e9p\u00e9ter, t\u00e9l\u00e9volume fort), tympan terne r\u00e9tract\u00e9', c: 'OMA purulente : parac\u00e9tamol + abstention antibiotique 48\u201372 h si > 2 ans et forme simple ; amoxicilline si < 2 ans, otite bilat\u00e9rale, fi\u00e8vre \u00e9lev\u00e9e ou \u00e9chec. Otite s\u00e9reuse : surveillance 3 mois (r\u00e9solution spontan\u00e9e fr\u00e9quente), audiogramme si > 3 mois ou retard de langage. > 3 otites/6 mois ou 4/an : avis ORL.' },
    { t: 'Plagioc\u00e9phalie / torticolis', age: '0\u20136 mois (fen\u00eatre de traitement)', w: 'T\u00eate asym\u00e9trique, aplatissement occipital unilat\u00e9ral, torticolis cong\u00e9nital (t\u00eate pench\u00e9e + rotation limit\u00e9e), pr\u00e9f\u00e9rence syst\u00e9matique d\u2019un c\u00f4t\u00e9', c: 'Stimulation motrice, changements de position, temps sur le ventre \u00e9veill\u00e9 (tummy time), kin\u00e9sith\u00e9rapie du torticolis \u2014 la plupart r\u00e9gressent avant 6 mois si pris en charge t\u00f4t. Casque rare, seulement si s\u00e9v\u00e8re et persistant apr\u00e8s 6 mois. V\u00e9rifier les hanches (association).' },
    { t: 'Ict\u00e8re prolong\u00e9 du nourrisson', age: '0\u20132 mois', w: 'Jaunisse > 14 jours (\u00e0 terme) ou > 21 jours (pr\u00e9matur\u00e9) ; URGENCES : selles d\u00e9color\u00e9es + urines fonc\u00e9es (cholestase), ict\u00e8re qui s\u2019aggrave, somnolence, refus de boire', c: 'Ict\u00e8re libre physiologique : r\u00e9gresse < 14 jours, enfant bien portant. Si prolong\u00e9 : bilirubine totale/libre, NFS + r\u00e9ticulocytes (h\u00e9molyse), TSH ; galactos\u00e9mie \u00e0 \u00e9liminer chez le nouveau-n\u00e9 \u2014 SELLES D\u00c9COLOR\u00c9ES + URINES FONC\u00c9ES : \u00e9chographie + avis urgents (atr\u00e9sie des voies biliaires \u2014 fen\u00eatre chirurgicale ~60 jours).' },
    { t: 'Toux chronique / sifflements r\u00e9p\u00e9t\u00e9s', age: '0\u201324 mois', w: 'Toux > 4 semaines, sifflements \u2265 3 \u00e9pisodes, tirage, dyspn\u00e9e d\u2019effort ou alimentaire, infections virales \u00e0 r\u00e9p\u00e9tition, tabagisme passif', c: '\u00c9liminer : corps \u00e9tranger (toux brutale d\u2019apparition), coqueluche (toux paroxystique + reprise inspiratoire > 2 semaines), asthme du nourrisson, tabagisme passif, tuberculose si contexte. Traitement : selon la cause ; bronchodilatateurs d\u2019\u00e9preuve si sifflements ; jamais d\u2019antibiotique syst\u00e9matique pour une toux virale.' },
    { t: 'P\u00e9rim\u00e8tre cr\u00e2nien anormal', age: '0\u201324 mois', w: 'Courbe de PC cass\u00e9e ou franchissant les couloirs, macroc\u00e9phalie (> +2 DS) ou microc\u00e9phalie (< \u20132 DS), fontanelle tendue ou bomb\u00e9e, \u00e9cartement des sutures', c: 'Mesurer le PC \u00e0 CHAQUE consultation et le reporter sur le carnet (souvent oubli\u00e9 !). Macroc\u00e9phalie isol\u00e9e + d\u00e9veloppement normal : souvent b\u00e9nigne, mesurer les parents (h\u00e9ritaire) \u2014 avis p\u00e9diatrique + imagerie c\u00e9r\u00e9brale si cassure de courbe, signes neurologiques ou d\u00e9veloppement anormal.' },
  ];

  const pathoAt = x => redFlags.filter(rx => x >= rx.a[0] && x <= rx.a[1]);

  const sensory = [
    { age: 0, due: 'à chaque examen', title: '🦵 Hanches (luxation congénitale) — Manœuvres d’Ortolani–Barlow', sec: [
      ['Comment faire', 'Bébé détendu, sur le dos : saisir les cuisses, pousser doucement en axial (Barlow : cherche à luxer), puis abduire en ramenant la tête fémorale dans le cotyle (Ortolani : ressaut de réduction). Comparer l’abduction des deux hanches et les plis de l’aine.'],
      ['Normal', 'Aucun ressaut, abduction symétrique ≈ 60–90°, plis symétriques. Un ressaut disparaissant avant 2–4 semaines peut être simple immaturité.'],
      ['Pathologique', 'Ressaut, claquement, limitation d’abduction, asymétrie des plis, inégalité des membres : échographie des hanches à 4 mois (plus tôt si facteur de risque : siège, antécédent familial, fille, oligohydramnios) et avis orthopédique. Luxation non traitée = boiterie et arthrose précoce.'],
    ]},
    { age: 4, due: 'examen des 4 mois', title: '👁 Vision — poursuite, strabisme, lueur pupillaire', sec: [
      ['Comment faire', 'Bébé éveillé sur les genoux du parent : présenter un visage/objet coloré à ≈ 30 cm, vérifier la fixation puis la poursuite des yeux dans les 4 directions. Éclairer chaque œil : réflexe photomoteur, et lueur pupillaire symétrique (réflexe rétinien).'],
      ['Normal', 'Poursuite symétrique des deux yeux, fixation stable, lueur pupillaire identique des deux côtés (rouge/orangée), pas de strabisme fixé (intermittence possible avant 3–4 mois).'],
      ['Pathologique', 'Strabisme persistant après 4 mois, lueur pupillaire blanche ou asymétrique (leucocorie : rétinoblastome ou cataracte jusqu’à preuve du contraire — urgent), absence de poursuite, nystagmus, photophobie–larmoiement : avis ophtalmologique rapide.'],
    ]},
    { age: 4, due: 'examen des 4 mois', title: '👂 Audition — réaction aux bruits + PEAM', sec: [
      ['Comment faire', 'Bruit non orienté type hochet, claquement de doigts ou voix, ≈ 30 cm hors du champ visuel, sans vibration transmise : chercher l’arrêt, le sourire ou la rotation de la tête vers le son. Vérifier au dossier que le PEAM (potentiels évoqués auditifs, dépistage maternité) a été fait et est normal.'],
      ['Normal', 'Réaction d’orientation ou d’arrêt aux bruits, sursaut aux bruits forts, gazouillis naissant, PEAM normal.'],
      ['Pathologique', 'Aucune réaction aux bruits, babillage pauvre/non modulé, PEAM non fait, suspect ou non reçu : orientation ORL pédiatrique sans attendre — chaque mois sans audition aggrave le retard de langage.'],
    ]},
    { age: 9, due: 'examen des 9 mois', title: '👁 Vision — dépistage de l’amblyopie (avant 2 ans)', sec: [
      ['Comment faire', 'Poursuite + occlusion alternée : cacher tour à tour chaque œil avec la main et observer — bébé accepte-t-il le masquage des deux côtés ? Chercher un strabisme (réflexe de lumière cornéenne centré ; cover-test si doute), et l’intérêt pour les petits objets.'],
      ['Normal', 'Masquage accepté des deux côtés, poursuite symétrique, yeux parallèles, attrape les petites miettes.'],
      ['Pathologique', 'Bébé se débat quand on cache un œil (l’autre est amblyope), strabisme manifeste, lueur blanche : avis ophtalmo pédiatrique rapide. L’amblyopie se traite avant 2 ans (période de plasticité visuelle) — au-delà, la perte devient définitive.'],
    ]},
    { age: 9, due: 'examen des 9–12 mois', title: '👂 Audition — test vocal (seuil ≈ 35 dB)', sec: [
      ['Comment faire', 'À distance de ≈ 1 m, hors champ visuel, voix chuchotée ou ludophone/jouet sonore calibré ≈ 35 dB : bébé doit tourner la tête ou rechercher la source. Si doute, audiométrie comportementale (BOA) en cabine.'],
      ['Normal', 'Orientation de la tête vers le son d’un seuil ≈ 35 dB, réaction à son prénom, babille « mama/baba ».'],
      ['Pathologique', 'Pas d’orientation à 35–50 dB, indifférence à la voix : ORL + audiométrie objective (PEAM/ASSR) — suspicion de surdité ≥ 35 dB. Un déficit unilatéral passe inaperçu : vérifier chaque oreille séparément.'],
    ]},
    { age: 18, due: 'examen des 18–24 mois', title: '🧠 Langage et développement — signes d’alerte TSA', sec: [
      ['Comment faire', 'Demander aux parents : combien de mots ? pointe-t-il du doigt pour montrer ? répond-il à son prénom ? cherche-t-il le regard et le partage ? Test M-CHAT-R à 18–24 mois si inquiétude (screening TSA).'],
      ['Normal', '≥ 10–20 mots à 18 mois, pointage protodéclaratif (montre pour partager), intérêt social, réponse au prénom.'],
      ['Pathologique', 'Aucun mot à 18 mois, pas de pointage, évitement du regard, régression du langage : réaliser le M-CHAT-R et adresser pédopsychiatrie/réseau TSA précocement — l’intervention avant 3 ans améliore le pronostic.'],
    ]},
  ];

  const nv = nextVac();
  const pathoCur = pathoAt(curR);

  panel.innerHTML = `
  <div class="pedia-box">
    <div class="pedia-head">🧠 Suivi pédiatrique — ${f(m)} mois</div>
    <div class="pedia-grid">
      <div class="pedia-sec pedia-focus-sec">
        <div class="pedia-sec-title">📍 Focus — ${moisLbl(curR)}${curR === Math.round(m) ? ' (mois actuel)' : ''}</div>
        <div class="pedia-nav">
          <button type="button" class="pedia-nav-btn" data-pedia-month="${Math.max(0, curR - 1)}"${curR <= 0 ? ' disabled' : ''}>◀ ${moisLbl(Math.max(0, curR - 1))}</button>
          <button type="button" class="pedia-nav-btn" data-pedia-month="${Math.min(23, curR + 1)}"${curR >= 23 ? ' disabled' : ''}>${moisLbl(Math.min(23, curR + 1))} ▶</button>
          ${window._pediaMonth !== null && window._pediaMonth !== undefined ? `<button type="button" class="pedia-nav-btn pedia-reset" data-pedia-month="auto">✖ Mois actuel (${moisLbl(Math.round(m))})</button>` : ''}
        </div>
        <div class="pedia-row"><strong>💉 Vaccins :</strong> ${vacByMonth[curR] ? escapeHtml(vacByMonth[curR]) : 'Aucun rendez-vous vaccinal ce mois-ci'}</div>
        <div class="pedia-row"><strong>⚖️ Poids :</strong> ${escapeHtml(weightAt(curR))}</div>
        <div class="pedia-row"><strong>🥛 Lait :</strong> ${escapeHtml(laitAt(curR))}</div>
        <div class="pedia-row"><strong>🥗 Diversification (apports quotidiens) :</strong> ${escapeHtml(diversAt(curR))}</div>
        <div class="pedia-row"><strong>🧩 Psychomoteur :</strong> ${escapeHtml(psychoAt(curR))}</div>
        <div class="pedia-row"><strong>⚠️ Signaux d’alerte :</strong> ${escapeHtml(alerteAt(curR))} — ou perte d’un acquis : avis pédiatrique</div>
        ${pathoCur.length ? `<div class="pedia-row pedia-alert-row"><strong>🚨 Ne jamais oublier à cet âge :</strong> ${pathoCur.map(px => escapeHtml(px.t)).join(' · ')} — <em>détail dans les cartes ci-dessous</em></div>` : ''}
        ${nv && !vacByMonth[curR] ? `<div class="pedia-row"><strong>📅 Prochain vaccin :</strong> ${moisLbl(nv.at)} — ${escapeHtml(nv.txt)}</div>` : ''}
      </div>

      <div class="pedia-sec"><div class="pedia-sec-title">🚨 Pathologies à ne jamais oublier par âge (cliquer pour déplier)</div>
        ${redFlags.map(rx => `<details class="pedia-test pedia-flag-card${curR >= rx.a[0] && curR <= rx.a[1] ? ' pedia-flag-cur' : ''}"><summary><span>🚨 ${escapeHtml(rx.t)}</span><span class="pedia-due">${escapeHtml(rx.age)}</span></summary><div class="pedia-test-body"><div class="pedia-row"><strong>Symptômes évocateurs :</strong> ${escapeHtml(rx.s)}</div><div class="pedia-row"><strong>Conduite à tenir :</strong> ${escapeHtml(rx.c)}</div></div></details>`).join('')}
      </div>
      <div class="pedia-sec"><div class="pedia-sec-title">🩺 Petits problèmes courants — quand y penser & CAT (cliquer pour déplier)</div>
        ${commonIssues.map(rx => `<details class="pedia-test pedia-common-card"><summary><span>🩺 ${escapeHtml(rx.t)}</span><span class="pedia-due">${escapeHtml(rx.age)}</span></summary><div class="pedia-test-body"><div class="pedia-row"><strong>Quand y penser :</strong> ${escapeHtml(rx.w)}</div><div class="pedia-row"><strong>CAT :</strong> ${escapeHtml(rx.c)}</div></div></details>`).join('')}
      </div>
    </div>

    <div class="pedia-sub-title">🧪 Tests sensitifs / de dépistage — mode d’emploi (cliquer pour déplier)</div>
    ${sensory.map(t => `<details class="pedia-test"${t.age <= m + 3 ? ' open' : ''}><summary>${t.title} <span class="pedia-due">${t.age <= m ? 'à faire / à vérifier' : 'à partir de ' + t.age + ' mois'}</span></summary><div class="pedia-test-body">${t.sec.map(([k, v]) => `<div class="pedia-row"><strong>${k} :</strong> ${escapeHtml(v)}</div>`).join('')}</div></details>`).join('')}
    ${window._pediaMonth !== null && window._pediaMonth !== undefined ? `<button type="button" class="pedia-nav-btn pedia-reset pedia-reset-foot" data-pedia-month="auto">✖ Revenir au mois actuel (${moisLbl(Math.round(m))})</button>` : ''}
    <div class="pedia-foot">Repères moyens — calendrier vaccinal 2025 — adapter au contexte clinique.</div>
  </div>`;
}
function bpcoRiskFactors(p) {
  const factors = [];
  if (p.tabac === 'actif') factors.push(`Tabagisme actif${p.pa !== null ? ' (' + p.pa + ' PA)' : ''}`);
  else if (p.tabac === 'sevré' && p.pa !== null && p.pa >= 20) factors.push(`Ancien fumeur (${p.pa} PA)`);
  else if (p.tabac === 'sevré') factors.push('Ancien fumeur');
  if (p.age !== null && p.age >= 40) factors.push('Âge ≥ 40 ans');
  if (p.imc !== null && p.imc < 21) factors.push(`IMC bas (${String(p.imc).replace('.', ',')} kg/m²)`);
  ((window._bpcoHints && window._bpcoHints.factors) || []).forEach(h => { if (!factors.some(x => x.startsWith(h.slice(0, 12)))) factors.push(h); });
  return factors;
}
function buildBpcoCard(p) {
  const hints = (window._bpcoHints && window._bpcoHints.factors) || [];
  const riskAge = p.age !== null && p.age >= 40;
  const riskPa = p.pa !== null && p.pa >= 20;
  const undiagnosed = !p.bpco && ((p.tabac === 'actif' && (riskPa || riskAge)) || hints.length > 0);
  if (!p.bpco && !undiagnosed) return null;
  const v = p.vems;
  const ex = p.exacerb;
  let status, color;
  if (!p.bpco) {
    status = 'Non diagnostiquée — à dépister';
    color = '#ef6c00';
  } else if (v === null) {
    status = 'Diagnostiquée — VEMS non renseigné';
    color = '#78909c';
  } else {
    const gold = v >= 80 ? ['GOLD 1 — léger', '#2e7d32'] : v >= 50 ? ['GOLD 2 — modéré', '#f9a825'] : v >= 30 ? ['GOLD 3 — sévère', '#ef6c00'] : ['GOLD 4 — très sévère', '#c62828'];
    status = gold[0] + (ex !== null ? (ex >= 2 ? ' — groupe E' : ' — groupe A/B') : '');
    color = gold[1];
  }
  const factors = bpcoRiskFactors(p);
  const fold = p.bpco
    ? [`VEMS : ${v === null ? '—' : String(v).replace('.', ',') + ' % théor.'}`, `Exacerbations/an : ${ex === null ? '—' : ex}`, `Tabac : ${p.tabac === 'actif' ? '🚬 actif' : (p.tabac === 'sevré' ? 'sevré' : '—')}`]
    : [`Facteurs de risque : ${factors.length || '—'}`, `VEMS : ${v === null ? 'spirométrie à faire' : String(v).replace('.', ',') + ' % théor.'}`];
  const actions = p.bpco
    ? (v === null ? 'Spirométrie à jour ? Le VEMS définit le stade GOLD et le traitement' : 'Déplier la carte : traitements GOLD, réhabilitation, vaccinations, sevrage')
    : 'Spirométrie recommandée — déplier la carte pour les éléments à évaluer et le plan';
  return { icon: '🧁', name: p.bpco ? 'BPCO' : 'BPCO — non diagnostiquée', status, color, data: fold, actions, bpcoDetail: bpcoDetailHtml(p, factors) };
}
function bpcoDetailHtml(p, factors) {
  const v = p.vems;
  const ex = p.exacerb;
  const exGroup = ex === null ? null : (ex >= 2 ? 'E' : (ex === 1 ? 'B' : 'A'));
  const symHints = factors.filter(x => !/Tabagisme|Ancien fumeur|Âge|IMC/.test(x));
  const evalRows = [
    ['Symptômes (toux chronique, expectorations, dyspnée, sifflements)', symHints.length ? 'retrouvés dans le volet : ' + symHints.join(', ') : 'non retrouvés dans le volet — à reprendre à l’interrogatoire'],
    ['Spirométrie post-bronchodilatateur (VEMS/CVF < 0,70 = diagnostic)', v === null ? 'à faire — confirme le diagnostic et définit le stade GOLD' : String(v).replace('.', ',') + ' % théor.'],
    ['Exacerbations / an', ex === null ? 'à préciser' : String(ex) + (exGroup ? ' — groupe ' + exGroup : '')],
    ['Tabagisme', p.tabac === 'actif' ? '🚬 actif' + (p.pa !== null ? ' (' + p.pa + ' PA)' : '') : (p.tabac === 'sevré' ? 'sevré' + (p.pa !== null ? ' (' + p.pa + ' PA)' : '') : 'non renseigné')],
    ['Dyspnée — échelle mMRC', '0 : aucune · 1 : effort intense · 2 : marche normale ralentie / plateau · 3 : pause après 100 m · 4 : ne sort pas / dyspnée à l’habillage'],
    ['Statut vaccinal', 'Grippe annuelle · Pneumocoque · COVID-19 · VRS si ≥ 75 ans — à vérifier'],
    ['SpO₂ / gaz du sang', 'SpO₂ de repos · OHD si hypoxémie (SpO₂ ≤ 92 % ou PaO₂ < 60 mmHg : oxygène ≥ 16 h/j)'],
    ['IMC / dénutrition', p.imc !== null ? String(p.imc).replace('.', ',') + ' kg/m²' + (p.imc < 21 ? ' — IMC bas : facteur de mauvais pronostic' : '') : 'à renseigner'],
    ['Comorbidités', [p.hta ? 'HTA' : null, p.ic ? 'insuffisance cardiaque' : null, p.diabete ? 'diabète' : null, (p.dfg !== null && p.dfg < 60) ? 'MRC' : null].filter(Boolean).join(', ') || 'aucune renseignée'],
    ['Dépistage cancer du poumon', (p.tabac !== 'jamais' && p.age !== null && p.age >= 50 && p.age <= 74 && p.pa !== null && p.pa >= 25) ? 'À proposer : scanner thoracique faible dose annuel' : 'selon profil : fumeur/sevré ≥ 25 PA, 50–74 ans'],
  ];
  const rxRows = p.bpco ? [
    ['Sevrage tabagique', p.tabac === 'actif' ? '✅ Priorité absolue — seule intervention qui ralentit la progression' : 'maintenir l’abstinence'],
    ['Groupe A (0–1 exacerbation, mMRC 0–1)', 'Bronchodilatateur court à la demande ; si symptômes persistants : LABA ou LAMA'],
    ['Groupe B (mMRC ≥ 2)', 'LABA + LAMA d’emblée (bithérapie inhalée)'],
    ['Groupe E (≥ 2 exacerbations/an ou ≥ 1 hospitalisation)', 'LABA + LAMA d’emblée ; si ≥ 2 exacerbations sous bithérapie ou éosinophiles ≥ 300/µL : associer CSI (triple thérapie)'],
    ['GOLD 3–4', 'Discuter triple thérapie (CSI + LABA + LAMA)'],
    ['Réhabilitation respiratoire', 'À proposer (GOLD ≥ 2 ou post-exacerbation) — dyspnée et qualité de vie améliorées'],
    ['Oxygénothérapie domicile', 'Si hypoxémie chronique (PaO₂ < 60 mmHg) : ≥ 15–16 h/jour'],
    ['Exacerbation aiguë', 'Bronchodilatateur ± corticoïdes oraux 5 j ± antibiotique 5–7 j si purulence — éducation : plan d’action'],
    ['Suivi', 'Réévaluation à 1–3 mois après toute modification ; technique d’inhalation à vérifier'],
  ] : [
    ['Objectif de la consultation', 'Dépister une BPCO méconnue : spirométrie post-bronchodilatateur (VEMS/CVF < 0,70 = diagnostic)'],
    ['Spirométrie', v === null ? 'À prescrire avec test de réversibilité (éliminer un asthme)' : 'VEMS ' + String(v).replace('.', ',') + ' % théor. — vérifier le rapport VEMS/CVF'],
    ['Sevrage tabagique', p.tabac === 'actif' ? '✅ Première action — conseil minimal + aide pharmacologique (substitution, varénicline, cytisine)' : 'maintenir l’abstinence'],
    ['Si confirmation du diagnostic', 'Traitements GOLD (groupes A/B/E) · vaccinations · réévaluation à 6–12 semaines · réhabilitation'],
    ['Différentiel asthme', 'Sifflements paroxystiques, variabilité nocturne, atopie → MEFR/réversibilité ; asthme + BPCO peuvent coexister (ACO)'],
  ];
  const txt = (p.bpco ? 'BPCO ' + (p.vems !== null ? 'VEMS ' + String(p.vems).replace('.', ',') + ' % théor. ' : '') : 'BPCO non diagnostiquée — dépistage à faire') + ' · Facteurs : ' + (factors.join(', ') || 'aucun renseigné');
  (window._copyTexts = window._copyTexts || {}).bpco = txt;
  return `<details class="etat-bpco-details"><summary>▸ Évaluer la situation du patient & traitements GOLD (cliquer)</summary><div class="etat-bpco-body">
    <div class="bpco-sub">① Éléments à évaluer</div>
    ${evalRows.map(([k, val]) => `<div class="bpco-row"><strong>${escapeHtml(k)} :</strong> ${escapeHtml(val)}</div>`).join('')}
    <div class="bpco-sub">② Traitements — recommandations GOLD</div>
    ${rxRows.map(([k, val]) => `<div class="bpco-row"><strong>${escapeHtml(k)} :</strong> ${escapeHtml(val)}</div>`).join('')}
    <div class="bpco-copy"><button type="button" class="cvr-copy" data-copy-id="bpco" title="Copier le résumé BPCO (puis Ctrl-V)">⧉</button><span>Résumé BPCO en un clic</span></div>
  </div></details>`;
}
function renderEtat(p) {
  const panel = document.getElementById('etat-panel');
  if (!panel) return;
  const f = v => v === null ? '—' : String(v).replace('.', ',');
  const kd = kdigoStage(p);
  const cards = [];

  // BPCO : carte dépliable (diagnostiquée ou non diagnostiquée sur facteurs de risque)
  const bpcoCard = buildBpcoCard(p);
  if (bpcoCard) cards.push(bpcoCard);
  // HTA
  if (p.hta) {
    const sbp = p.sbp;
    const status = sbp === null ? { t: 'TA à jour ?', c: '#78909c' } : sbp < 140 ? { t: 'Contrôlée', c: '#2e7d32' } : sbp < 160 ? { t: 'Non contrôlée (niveau 1)', c: '#ef6c00' } : { t: 'Non contrôlée (niveau 2+)', c: '#c62828' };
    cards.push({
      icon: '🩺', name: 'Hypertension artérielle', status: status.t, color: status.c,
      data: [`PAS : ${sbp === null ? '—' : sbp + ' mmHg'}`, `DFG : ${p.dfg === null ? '—' : p.dfg}`, `LDL : ${p.ldl === null ? '—' : f(p.ldl) + ' g/L'}`],
      actions: 'Automesure TA à domicile ; réévaluation du traitement si non contrôlée (voir Traitements → Antihypertenseurs)',
    });
  }

  // MRC
  if (p.dfg !== null && p.dfg < 60) {
    const risk = kd && kd.risk ? KDIGO_RISK_LABEL[kd.risk] : 'RAC manquant';
    const color = kd && kd.risk ? KDIGO_RISK_COLOR[kd.risk] : '#9e9e9e';
    cards.push({
      icon: '🫘', name: 'Maladie rénale chronique', status: `KDIGO ${kd ? kd.g + (kd.a ? ' ' + kd.a : '') : '—'} · ${risk}`, color,
      data: [`DFG : ${p.dfg} mL/min`, `RAC : ${p.rac !== null && p.rac !== undefined ? (p.rac === 'nc' ? 'NC (A1)' : f(p.rac) + ' mg/mmol') : 'à doser'}`],
      actions: 'Détail dans le bloc Fonction rénale ci-dessous',
    });
  }

  // IC
  if (p.ic) {
    cards.push({
      icon: '💔', name: 'Insuffisance cardiaque', status: 'Connue', color: '#c62828',
      data: [`Poids à surveiller quotidiennement`, `iSGLT2 à vérifier (voir Traitements)`],
      actions: 'Quadrithérapie si FEVG réduite ; ionogramme 7–14 j après chaque modification',
    });
  }

  // Obésité / SAS
  if (p.imc !== null && p.imc >= 30) {
    cards.push({
      icon: '⚖️', name: 'Obésité', status: `IMC ${f(p.imc)}`, color: p.imc >= 40 ? '#c62828' : '#ef6c00',
      data: [`IMC : ${f(p.imc)} kg/m²`, `Tour de taille non renseigné`],
      actions: 'Dépister SAS (STOP-Bang dans À faire) ; GLP-1/tirzépatide si DT2 (voir Stratégie antidiabétique)',
    });
  }

  // Tabagisme actif
  if (p.tabac === 'actif' && !p.bpco) {
    cards.push({
      icon: '🚬', name: 'Tabagisme actif', status: p.pa !== null ? `${p.pa} PA` : 'PA à préciser', color: '#c62828',
      data: [p.pa !== null ? `${p.pa} paquets-années` : 'Paquets-années non renseignés', p.age !== null ? `${p.age} ans` : ''],
      actions: 'Aide au sevrage à chaque consultation — fiche info patient « Arrêter de fumer » disponible',
    });
  }

  if (!cards.length) { panel.innerHTML = ''; return; }
  panel.innerHTML = `<div class="etat-grid">${cards.map(c => `
    <div class="etat-box${c.bpcoDetail ? ' etat-box-wide' : ''}" style="border-left: 5px solid ${c.color}">
      <div class="etat-title">${c.icon} ${escapeHtml(c.name)}</div>
      <div class="etat-status" style="color:${c.color}">${escapeHtml(c.status)}</div>
      ${c.data.filter(Boolean).map(d => `<div class="etat-txt">${escapeHtml(d)}</div>`).join('')}
      <div class="etat-act">${escapeHtml(c.actions)}</div>
      ${c.bpcoDetail || ''}
    </div>`).join('')}</div>`;
}
function renderKdigo(p) {
  const panel = document.getElementById('kdigo-panel');
  const st = kdigoStage(p);
  if (!st) { panel.innerHTML = ''; window._kdigoOpen = false; return; }
  const riskTxt = st.risk ? KDIGO_RISK_LABEL[st.risk] : 'RAC manquant — à doser';
  const color = st.risk ? KDIGO_RISK_COLOR[st.risk] : '#e0e0e0';
  const racTxt = p.rac === 'nc' ? 'non calculable (microalbuminurie sous le seuil : catégorie A1)' : (p.rac !== null && p.rac !== undefined ? String(p.rac).replace('.', ',') + ' mg/mmol' : null);
  const mrc = p.dfg < 60 || (st.a && st.a !== 'A1');
  const kdigoCopyTxt = 'Stade KDIGO ' + st.g + (st.a ? ' ' + st.a : '') + ' — DFG ' + p.dfg + ' mL/min/1,73 m²' + (racTxt ? ' · RAC ' + racTxt : '');
  (window._copyTexts = window._copyTexts || {}).kdigo = kdigoCopyTxt;
  panel.innerHTML = `
  <div class="cvr-box kdigo-cvr${window._kdigoOpen ? ' open' : ''}" style="--sc:${color}">
    <div class="cvr-head" role="button" tabindex="0" aria-expanded="${window._kdigoOpen ? 'true' : 'false'}" data-kdigo-toggle="1">
      <span class="cvr-title">🫘 Fonction rénale (KDIGO)</span>
      <span class="cvr-verdict" style="color:${st.risk ? '#1a2b3c' : '#78909c'}; background:${color}">${st.g}${st.a ? ' ' + st.a : ''} · ${riskTxt}</span>
      <button class="cvr-copy" data-copy-id="kdigo" title="Copier le stade KDIGO (puis Ctrl-V)">⧉</button>
      <span class="cvr-chevron">▸</span>
    </div>
    <div class="cvr-detail"><div class="cvr-detail-inner">
      <div class="cvr-layout">
        <div class="cvr-col">
          <div class="cvr-panel-title">① Données rénales</div>
          <div class="cvr-inputs">
            <div class="cvr-input${p.dfg !== null ? ' ok' : ''}"><span class="cvr-input-k">DFG</span><span class="cvr-input-v">${p.dfg !== null ? p.dfg + ' mL/min/1,73 m²' : '—'}</span></div>
            <div class="cvr-input${p.rac !== null ? ' ok' : ''}"><span class="cvr-input-k">RAC (albuminurie)</span><span class="cvr-input-v">${racTxt || 'non renseigné — à doser si MRC suspectée'}</span></div>
          </div>
          ${mrc ? `<div class="cvr-banner" style="--bc:#c62828; margin-top:10px"><strong>Maladie rénale chronique ${p.dfg < 60 ? '(DFG < 60)' : ''}${p.dfg < 60 && st.a && st.a !== 'A1' ? ' + ' : ''}${st.a && st.a !== 'A1' ? '(' + st.a + ')' : ''}</strong><p>Chronicité > 3 mois à confirmer — adapter les traitements (doses selon DFG), éviter les néphrotoxiques (AINS, produits de contraste).</p></div>` : ''}
        </div>
        <div class="cvr-col cvr-col-results">
          <div class="cvr-scorecard" style="--sc:${color}">
            <div class="cvr-scorecard-top">
              <div class="cvr-gauge"><div class="cvr-gauge-fill" style="width:${(st.risk || 1) * 25}%; background:${color}"></div></div>
              <div class="cvr-scorecard-pct">${st.g.replace('G', '')}<span class="cvr-pct-unit">G</span></div>
            </div>
            <div class="cvr-scorecard-cat" style="color:#1a2b3c">Stade KDIGO ${st.g}${st.a ? ' ' + st.a : ''}</div>
            <div class="cvr-scorecard-sub">DFG ${p.dfg} mL/min/1,73 m²${racTxt ? ' · RAC ' + racTxt : ''}</div>
            <div class="cvr-scorecard-act">${riskTxt}${st.risk >= 3 ? ' — avis néphrologique à discuter, bilan étiologique, dépistage cardiovasculaire associé.' : ' — surveillance annuelle du DFG/RAC, contrôle tensionnel et glycémique.'}</div>
          </div>
        </div>
      </div>
    </div></div>
  </div>`;
}

// ---------- État des lieux Diabète (type diabétologue) ----------
const DM_MICRO = [
  { id: 'dm-micro-retino', label: 'Rétinopathie diabétique', note: 'Fond d’œil annuel (photographies rétiniennes si disponibles)' },
  { id: 'dm-micro-nephro', label: 'Néphropathie diabétique', note: 'DFG/RAC : surveillance (voir module Fonction rénale)' },
  { id: 'dm-micro-neuro', label: 'Neuropathie périphérique', note: 'Monofilament, piqûre, diapason aux pieds — annuel' },
  { id: 'dm-micro-neuro-auto', label: 'Neuropathie autonome', note: 'Hypotension orthostatique, gastroparésie, troubles de l’érection, hypoglycémies non perçues (malaise hypoglycémique infraperçu)' },
];
const DM_MACRO = [
  { id: 'dm-macro-coronaro', label: 'Coronaropathie / SCA', note: 'Prévention secondaire : LDL < 0,55, antiagrégant, bêtabloquant/IEC selon cas' },
  { id: 'dm-macro-avc', label: 'AVC / AIT ischémique', note: 'aGLP-1 à privilégier (sémaglutide) ; LDL < 0,55 g/L' },
  { id: 'dm-macro-aomi', label: 'Artériopathie des membres inférieurs', note: 'IPS, recherche de claudication ; LDL < 0,55 g/L' },
  { id: 'dm-macro-cardio', label: 'Insuffisance cardiaque', note: 'iSGLT2 d’emblée ; poids quotidien ; ionogramme 7–14 j après modification' },
];
const DM_SUIVI = [
  { id: 'dm-suivi-fo', label: 'Fond d’œil', due: p => p.age !== null, txt: 'Rétinographie ou ophtalmo — annuel' },
  { id: 'dm-suivi-rein', label: 'DFG + RAC', due: p => true, txt: 'Bilan rénal — annuel (au minimum)' },
  { id: 'dm-suivi-pieds', label: 'Examen des pieds', due: p => true, txt: 'Monofilament + inspection — annuel ; à chaque consultation si haut risque' },
  { id: 'dm-suivi-lipides', label: 'Bilan lipidique', due: p => true, txt: 'LDL/HDL/triglycérides — annuel' },
  { id: 'dm-suivi-ta', label: 'TA', due: p => true, txt: 'Objectif < 130/80 mmHg (automesure à domicile)' },
  { id: 'dm-suivi-poids', label: 'Poids / IMC / tour de taille', due: p => true, txt: 'À chaque consultation' },
  { id: 'dm-suivi-tabac', label: 'Statut tabagique', due: p => p.tabac === 'actif', txt: 'Aide au sevrage à chaque consultation' },
  { id: 'dm-suivi-vaccins', label: 'Vaccins grippe + pneumocoque', due: p => true, txt: 'Grippe annuelle ; pneumocoque recommandé (diabète)' },
  { id: 'dm-suivi-bucco', label: 'Bilan bucco-dentaire', due: p => true, txt: 'Examen/détartrage — annuel (diabète = facteur de risque parodontal)' },
];

function dmComplications() {
  const micro = DM_MICRO.filter(c => dmChecks[c.id]);
  const macro = DM_MACRO.filter(c => dmChecks[c.id]);
  return { micro, macro, any: micro.length + macro.length > 0 };
}

function dmSuiviDone(id) { return !!dmChecks[id]; }

function renderDiabete(p) {
  const panel = document.getElementById('diabete-panel');
  if (!panel) return;
  if (!p.diabete) { panel.innerHTML = ''; window._dmOpen = false; return; }
  const f = v => v === null ? '—' : String(v).replace('.', ',');
  const kd = kdigoStage(p);
  const cvr = cvrCompute(p);
  const comp = dmComplications();
  const hba1c = p.hba1c;
  // Cible HbA1c individualisée (SFD/HAS)
  let target = '< 7,0 %', targetWhy = 'Cible commune chez l’adulte — à individualiser (SFD/HAS)';
  if (p.age !== null && p.age >= 75) { target = '< 7,5–8,0 %'; targetWhy = 'Sujet âgé/fragile : priorité à la sécurité (hypoglycémies, chutes)'; }
  else if (p.age !== null && p.age >= 65) { target = '< 7,0–7,5 %'; targetWhy = '65–74 ans : cible légèrement assouplie'; }
  else if (p.dfg !== null && p.dfg < 45) { target = '< 7,5 %'; targetWhy = 'MRC évoluée : cible assouplie'; }
  // Équilibre vs cible
  const targetMax = p.age >= 75 ? 8.0 : (p.age >= 65 ? 7.5 : (p.dfg !== null && p.dfg < 45 ? 7.5 : 7.0));
  const ok = hba1c !== null && hba1c < targetMax;
  const control = hba1c === null
    ? { label: 'HbA1c à doser', color: '#78909c' }
    : ok
      ? { label: 'Dans la cible', color: '#2e7d32' }
      : hba1c < targetMax + 1
        ? { label: 'Hors cible (+< 1 pt)', color: '#f9a825' }
        : { label: 'Déséquilibré', color: '#c62828' };
  const gauge = hba1c === null ? 0 : Math.max(0, Math.min(100, Math.round((1 - Math.min(hba1c, 12) / 12) * 100)));
  // Classification : simple vs compliqué
  const microTxt = comp.micro.map(c => c.label);
  const macroTxt = comp.macro.map(c => c.label);
  const nbComp = comp.micro.length + comp.macro.length;
  let classe, classeColor;
  if (nbComp === 0) {
    const highRisk = cvr.hasTerrain || cvr.extreme || (cvr.result && cvr.result.pct >= 10);
    if (hba1c !== null && ok && !highRisk) { classe = 'Diabète simple — dans la cible, sans complication'; classeColor = '#2e7d32'; }
    else if (hba1c !== null && !ok) { classe = 'Diabète non compliqué — mais hors cible thérapeutique'; classeColor = '#ef6c00'; }
    else { classe = highRisk ? 'Diabète à haut risque CV — sans complication dépistée' : 'Diabète non compliqué — état des lieux à compléter'; classeColor = highRisk ? '#ef6c00' : '#78909c'; }
  } else {
    classe = 'Diabète compliqué — ' + nbComp + ' complication' + (nbComp > 1 ? 's' : '') + ' : ' + [...microTxt, ...macroTxt].join(', ');
    classeColor = '#c62828';
  }
  const inputs = [
    { k: 'HbA1c', v: hba1c === null ? 'non renseignée — à doser' : f(hba1c) + ' %', ok: hba1c !== null },
    { k: 'Cible HbA1c', v: target, ok: true },
    { k: 'DFG', v: p.dfg === null ? 'non renseigné' : p.dfg + ' mL/min' + (kd ? ' (KDIGO ' + kd.g + (kd.a ? ' ' + kd.a : '') + ')' : ''), ok: p.dfg !== null },
    { k: 'RAC', v: p.rac === null || p.rac === undefined ? 'à doser' : (p.rac === 'nc' ? 'NC (A1)' : f(p.rac) + ' mg/mmol'), ok: p.rac !== null && p.rac !== undefined },
    { k: 'IMC', v: p.imc === null ? '—' : f(p.imc) + ' kg/m²', ok: p.imc !== null },
    { k: 'PAS', v: p.sbp === null ? '—' : p.sbp + ' mmHg', ok: p.sbp !== null },
    { k: 'LDL', v: p.ldl === null ? '—' : f(p.ldl) + ' g/L', ok: p.ldl !== null },
    { k: 'Tabac', v: p.tabac === 'actif' ? '🚬 actif' : (p.tabac === 'sevré' ? 'sevré' : (p.tabac === 'jamais' ? 'jamais' : '—')), ok: p.tabac !== '' },
  ];
  const compChecks = (items, cls) => items.map(c =>
    `<label class="cvr-terrain-item ${cls}"><input type="checkbox" id="${c.id}" ${dmChecks[c.id] ? 'checked' : ''}><span>${escapeHtml(c.label)}<em class="dm-comp-note">${escapeHtml(c.note)}</em></span></label>`).join('');
  const suiviRows = DM_SUIVI.filter(s => s.due(p)).map(s => {
    const done = dmSuiviDone(s.id);
    const info = s.id === 'dm-suivi-pieds'
      ? `<button type="button" class="dm-info-btn" data-dm-info="pieds" title="Comment réaliser le test au monofilament, l'interpréter et l'indication podologue">ⓘ</button>`
      : '';
    return `<span class="dm-suivi-item${done ? ' done' : ''}"><input type="checkbox" id="${s.id}" ${done ? 'checked' : ''}><span class="dm-suivi-label">${escapeHtml(s.label)}${info}</span><span class="dm-suivi-txt">${escapeHtml(s.txt)}</span></span>`;
  }).join('');
  const hba1cStatus = hba1c === null
    ? 'HbA1c non renseignée — la doser : base de l’état des lieux et de la stratégie (voir Traitements → Stratégie antidiabétique).'
    : ok
      ? `HbA1c ${f(hba1c)} % — dans la cible (${target}). Maintenir le traitement, surveillance annuelle.`
      : `HbA1c ${f(hba1c)} % — hors cible (${target}) : renforcer hygiène de vie + adapter le traitement (voir Traitements → Stratégie antidiabétique) ; réévaluer à 3 mois.`;
  const actTxt = nbComp
    ? 'Diabète compliqué : traitement à bénéfice cardio-rénal (iSGLT2 / aGLP-1 selon territoire), prévention secondaire intensive (LDL selon territoire, TA < 130/80), dépistage des autres complications à compléter.'
    : (ok
      ? 'Diabète simple, dans la cible : suivi annuel du dépistage des complications (fond d’œil, DFG/RAC, pieds, lipides, TA).'
      : 'Priorité : équilibre glycémique (HbA1c), puis dépistage annuel des complications et optimisation du traitement.');
  const dms = dmStrategy(p, cvr);
  (window._copyTexts = window._copyTexts || {}).dm = 'Diabète — HbA1c ' + (hba1c !== null ? f(hba1c) + ' %' : 'non renseignée') + ' · Cible ' + target + ' · ' + control.label + (comp.any ? ' · Complications : ' + [].concat(comp.micro, comp.macro).join(', ') : ' · Pas de complication déclarée');
  panel.innerHTML = `
  <div class="cvr-box dm-box${window._dmOpen ? ' open' : ''}" style="--sc:${control.color}">
    <div class="cvr-head" role="button" tabindex="0" aria-expanded="${window._dmOpen ? 'true' : 'false'}" data-dm-toggle="1">
      <span class="cvr-title">🍪 État des lieux — Diabète</span>
      <span class="cvr-verdict" style="color:#1a2b3c; background:${control.color}22; border:1px solid ${control.color}55">${control.label === 'Dans la cible' ? '✓ ' : ''}${escapeHtml(control.label)}${hba1c !== null ? ' · HbA1c ' + f(hba1c) + ' %' : ''}${target ? ' · Cible ' + escapeHtml(target) : ''}</span>
      <button class="cvr-copy" data-copy-id="dm" title="Copier le résumé diabète (puis Ctrl-V)">⧉</button>
      <span class="cvr-chevron">▸</span>
    </div>
    <div class="cvr-detail"><div class="cvr-detail-inner">
      <div class="cvr-layout">
        <div class="cvr-col">
          <div class="cvr-panel-title">① Données & équilibre glycémique <span class="cvr-model">${escapeHtml(classe.split(' — ')[0])}</span></div>
          <div class="cvr-inputs">
            ${inputs.map(i => `<div class="cvr-input${i.ok ? ' ok' : ''}"><span class="cvr-input-k">${i.k}</span><span class="cvr-input-v">${escapeHtml(i.v)}</span></div>`).join('')}
          </div>
          <div class="cvr-banner" style="--bc:${classeColor}; margin-top:10px">
            <strong>${escapeHtml(classe)}</strong>
            <p>${escapeHtml('Cible individuelle ' + target + ' — ' + targetWhy + '. ' + hba1cStatus)}</p>
          </div>
          <div class="cvr-panel-title">② Complications cliquables — cocher celles présentes</div>
          <div class="cvr-panel-subtitle">Microvasculaires</div>
          <div class="cvr-terrain-grid dm-comp-grid">${compChecks(DM_MICRO, 'dm-micro')}</div>
          <div class="cvr-panel-subtitle">Macrovasculaires</div>
          <div class="cvr-terrain-grid dm-comp-grid">${compChecks(DM_MACRO, 'dm-macro')}</div>
          <div class="cvr-panel-title">③ Dépistage annuel du diabète — cocher ce qui est à jour</div>
          <div class="dm-suivi-grid">${suiviRows}</div>
          ${window._dmInfoPieds ? `
          <div class="dm-infobull" data-dm-infobull>
            <div class="dm-infobull-head">
              <span class="dm-infobull-title">🦶 Test au monofilament de Semmes-Weinstein (5,07 g)</span>
              <button type="button" class="dm-infobull-close" data-dm-info-close>✕</button>
            </div>
            <div class="dm-infobull-sec">Comment le réaliser</div>
            <ul class="dm-infobull-list">
              <li>Patient couché, yeux fermés, pieds déchaussés depuis quelques minutes (température ambiante).</li>
              <li>Monofilament tenu par la base : appliquer perpendiculairement sur la peau, le fil se courbe en « C » pendant ~1 seconde, puis le retirer.</li>
              <li>Ne pas tester sur les callosités, ulcères, cicatrices ou zones nécrotiques.</li>
              <li>Testez <strong>4 points par pied</strong> : pulpe du gros orteil, 3<sup>e</sup> orteil, base du 5<sup>e</sup> métatarsien (plante), talon — surface dorsale du 1<sup>er</sup> espace interdigital (optionnel).</li>
              <li>Commencez par une zone saine (main/avant-bras) pour montrer le geste au patient, sans le prévenir de l'emplacement exact sur le pied.</li>
            </ul>
            <div class="dm-infobull-sec">Comment l'interpréter</div>
            <ul class="dm-infobull-list">
              <li><strong>Test normal</strong> : le patient perçoit ≥ 2 stimulations sur les 4 points testés → sensibilité protectrice conservée.</li>
              <li><strong>Test anormal (neuropathie périphérique dépistée)</strong> : absence de perception à ≥ 1 point, même après re-test en alternant stimulus réel/faux pour limiter les faux positifs.</li>
              <li>Compléter avec la <strong>vibration</strong> (diapason 128 Hz ou neuro-esthésiomètre, seuil &gt; 25 V considéré anormal) et la <strong>piqûre</strong> (aiguille stérile, perception de la douleur).</li>
              <li>Combiner au reste du bilan : inspection (déformation, fissure, mycose, onychomycose, ulcère actif ou cicatriciel), pouls pédieux/tibial postérieur (si abolition → ischémie → score IPS (à calculer)), chaussage.</li>
            </ul>
            <div class="dm-infobull-sec">Indication — prise en charge podologique remboursée</div>
            <ul class="dm-infobull-list">
              <li>En cas de <strong>test anormal</strong> (ou d'ulcère actif/amputation préalable) : le patient relève d'un <strong>pied diabétique à risque</strong>, justification d'une prise en charge par <strong>pédicure-podologue</strong>, conventionnée (prise en charge à 100 % dans le cadre du protocole ALD 30 « diabète » quand les soins sont en lien avec l’ALD).</li>
              <li>Classification du risque : pied à <strong>risque faible</strong> (sensibilité normale, pas de déformation majeure) → suivi podologique simple ; <strong>risque modéré</strong> (neuropathie OU déformation OU artériopathie sans ulcère) → suivi podologique régulier ; <strong>risque élevé</strong> (neuropathie + artériopathie, ou déformation + artériopathie, ou antécédent d'ulcère) → suivi rapproché, chaussure thérapeutique, éducation thérapeutique.</li>
              <li>Sur l'ordonnance : porter le diagnostic (« neuropathie diabétique périphérique — pied à risque » / « diabète compliqué »), demander une prise en charge en pédicurie/podologie avec mention « diabète de type 2 compliqué, ALD 30 » ; joindre le résultat du test au monofilament.</li>
              <li>Le podologue réalise alors des soins de pédicurie remboursés au titre de l'ALD 30 (prise en charge 100 % pour les actes en lien avec l'ALD), sur prescription médicale écrite renouvelable.</li>
            </ul>
          </div>` : ''}
        </div>
        <div class="cvr-col cvr-col-results">
          <div class="cvr-scorecard" style="--sc:${control.color}">
            <div class="cvr-scorecard-top">
              <div class="cvr-gauge"><div class="cvr-gauge-fill" style="width:${gauge}%; background:${control.color}"></div></div>
              <div class="cvr-scorecard-pct">${hba1c === null ? '?' : f(hba1c)}<span class="cvr-pct-unit">%</span></div>
            </div>
            <div class="cvr-scorecard-cat" style="color:${control.color}">HbA1c · ${escapeHtml(control.label)}</div>
            <div class="cvr-scorecard-sub">Cible ${target} (SFD/HAS, individualisée) · ${escapeHtml(comp.any ? 'Diabète compliqué' : 'Sans complication cochée')}</div>
            <div class="cvr-scorecard-act">${escapeHtml(actTxt)}</div>
          </div>
          ${nbComp ? `
          <div class="cvr-ldl ko dm-comp-summary">
            <div class="cvr-ldl-head"><span class="cvr-ldl-target">Complications déclarées</span><span class="cvr-ldl-badge ko">${nbComp}</span></div>
            ${comp.micro.length ? `<div class="dm-comp-line">Micro : ${escapeHtml(microTxt.join(', '))}</div>` : ''}
            ${comp.macro.length ? `<div class="dm-comp-line">Macro : ${escapeHtml(macroTxt.join(', '))}</div>` : ''}
          </div>` : ''}
          ${dms && dms.target ? `
          <div class="cvr-ldl dm-strategy-peek">
            <div class="cvr-ldl-head"><span class="cvr-ldl-target">Stratégie antidiabétique</span><span class="cvr-ldl-badge ok">${escapeHtml(dms.target)}</span></div>
            <div class="cvr-ldl-status">${dms.profiles.length} profil(s) actif(s) — détail dans Traitements → Stratégie antidiabétique (DT2).</div>
          </div>` : ''}
        </div>
      </div>
    </div></div>
  </div>`;
}

// ---------- Risque cardiovasculaire (SCORE2 / SCORE2-OP / SCORE2-Diabetes, région bas risque = France) ----------
const cvrState = { hba1c: null, diabAge: null };

function score2Raw(sex, smoker, sbp, chol, hdl, age, diabetes) {
  const a5 = (age - 60) / 5;
  if (sex === 'M') {
    const lp = 0.3742 * a5 + 0.6012 * smoker + 0.2777 * (sbp - 120) / 20 + 0.6457 * diabetes
      + 0.1458 * (chol - 6) - 0.2698 * (hdl - 1.3) / 0.5
      - 0.0755 * a5 * smoker - 0.0255 * a5 * (sbp - 120) / 20 - 0.0281 * a5 * (chol - 6)
      + 0.0426 * a5 * (hdl - 1.3) / 0.5 - 0.0983 * a5 * diabetes;
    return 1 - Math.pow(0.9605, Math.exp(lp));
  }
  const lp = 0.4648 * a5 + 0.7744 * smoker + 0.3131 * (sbp - 120) / 20 + 0.8096 * diabetes
    + 0.1002 * (chol - 6) - 0.2606 * (hdl - 1.3) / 0.5
    - 0.1088 * a5 * smoker - 0.0277 * a5 * (sbp - 120) / 20 - 0.0226 * a5 * (chol - 6)
    + 0.0613 * a5 * (hdl - 1.3) / 0.5 - 0.1272 * a5 * diabetes;
  return 1 - Math.pow(0.9776, Math.exp(lp));
}

function score2OpRaw(sex, smoker, sbp, chol, hdl, age, diabetes) {
  const a = age - 73;
  if (sex === 'M') {
    const lp = 0.0634 * a + 0.4245 * diabetes + 0.3524 * smoker + 0.0094 * (sbp - 150)
      + 0.0850 * (chol - 6) - 0.3564 * (hdl - 1.4)
      - 0.0174 * a * diabetes - 0.0247 * a * smoker - 0.0005 * a * (sbp - 150)
      + 0.0073 * a * (chol - 6) + 0.0091 * a * (hdl - 1.4);
    return 1 - Math.pow(0.7576, Math.exp(lp - 0.0929));
  }
  const lp = 0.0789 * a + 0.6010 * diabetes + 0.4921 * smoker + 0.0102 * (sbp - 150)
    + 0.0605 * (chol - 6) - 0.3040 * (hdl - 1.4)
    - 0.0107 * a * diabetes - 0.0255 * a * smoker - 0.0004 * a * (sbp - 150)
    - 0.0009 * a * (chol - 6) + 0.0154 * a * (hdl - 1.4);
  return 1 - Math.pow(0.8082, Math.exp(lp - 0.229));
}

function score2DiabetesRaw(sex, smoker, sbp, chol, hdl, age, diabAge, hba1c, dfg) {
  const a5 = (age - 60) / 5;
  const eg = (Math.log(dfg) - 4.5) / 0.15;
  const h = (hba1c - 31) / 9.34;
  if (sex === 'M') {
    const lp = 0.5368 * a5 + 0.4774 * smoker + 0.1322 * (sbp - 120) / 20 + 0.6457
      + 0.1102 * (chol - 6) - 0.1087 * (hdl - 1.3) / 0.5
      - 0.0672 * a5 * smoker - 0.0268 * a5 * (sbp - 120) / 20 - 0.0983 * a5
      - 0.0181 * a5 * (chol - 6) + 0.0095 * a5 * (hdl - 1.3) / 0.5
      - 0.0998 * ((diabAge - 50) / 5) + 0.0955 * h
      - 0.0591 * eg + 0.0058 * eg * eg - 0.0134 * h * a5 + 0.0115 * eg * a5;
    return 1 - Math.pow(0.9605, Math.exp(lp));
  }
  const lp = 0.6624 * a5 + 0.6139 * smoker + 0.1421 * (sbp - 120) / 20 + 0.8096
    + 0.1127 * (chol - 6) - 0.1568 * (hdl - 1.3) / 0.5
    - 0.1122 * a5 * smoker - 0.0167 * a5 * (sbp - 120) / 20 - 0.1272 * a5
    - 0.0200 * a5 * (chol - 6) + 0.0186 * a5 * (hdl - 1.3) / 0.5
    - 0.118 * ((diabAge - 50) / 5) + 0.1173 * h
    - 0.0640 * eg + 0.0062 * eg * eg - 0.0196 * h * a5 + 0.0169 * eg * a5;
  return 1 - Math.pow(0.9776, Math.exp(lp));
}

function cvrCalibrate(raw, sex, age, model) {
  const SCALES = {
    s2: { M: [-0.5699, 0.7476], F: [-0.7380, 0.7019] },
    op: { M: [-0.34, 1.19], F: [-0.52, 1.01] },
  };
  const [s1, s2v] = SCALES[model][sex === 'M' ? 'M' : 'F'];
  return 1 - Math.exp(-Math.exp(s1 + s2v * Math.log(-Math.log(1 - raw))));
}

function cvrCategory(pct, age, model) {
  if (model === 'dt2') {
    if (pct < 5) return { label: 'Risque faible', color: '#2e7d32' };
    if (pct < 10) return { label: 'Risque modéré', color: '#f9a825' };
    if (pct < 20) return { label: 'Risque élevé', color: '#ef6c00' };
    return { label: 'Risque très élevé', color: '#c62828' };
  }
  let lo, hi;
  if (age < 50) { lo = 2.5; hi = 7.5; }
  else if (age < 70) { lo = 5; hi = 10; }
  else { lo = 7.5; hi = 15; }
  if (pct < lo) return { label: 'Risque faible', color: '#2e7d32' };
  if (pct < hi) return { label: 'Risque modéré', color: '#f9a825' };
  return { label: 'Risque élevé', color: '#c62828' };
}

function ldlTarget(p, cvr) {
  if (cvr.extreme) return { v: 0.4, label: 'LDL < 0,40 g/L', why: 'Risque extr\u00eame (ESC/EAS 2025) : ath\u00e9roscl\u00e9rose confirm\u00e9e avec r\u00e9cidive d\u2019\u00e9v\u00e9nement vasculaire malgr\u00e9 un traitement intensif au maximum tol\u00e9r\u00e9, ou maladie polyvasculaire (\u2265 2 territoires) \u2014 cible < 0,40 g/L (Class IIb)' };
  if (cvr.hasTerrain) return { v: 0.55, label: 'LDL < 0,55 g/L', why: 'Terrain ath\u00e9romateux \u2014 tr\u00e8s haut risque (ESC/EAS 2025 : < 0,55 g/L et r\u00e9duction \u2265 50 % du LDL)' };
  if (p.diabete) {
    if (cvr.result && cvr.result.pct >= 10) return { v: 0.55, label: 'LDL < 0,55 g/L', why: 'DT2 avec atteinte organe cible ou \u2265 3 facteurs de risque, ou dur\u00e9e > 20 ans \u2014 tr\u00e8s haut risque (ESC/EAS 2025 : < 0,55 g/L)' };
    if (cvr.result && cvr.result.pct >= 5) return { v: 0.7, label: 'LDL < 0,7 g/L', why: 'DT2 sans atteinte d\u2019organe cible + < 3 facteurs de risque \u2014 haut risque (ESC/EAS 2025 : < 0,7 g/L)' };
    return { v: 0.7, label: 'LDL < 0,7 g/L', why: 'DT2 \u2014 haut risque (ESC/EAS 2025 : < 0,7 g/L ; < 0,55 g/L si atteinte organe cible ou dur\u00e9e > 20 ans)' };
  }
  if (!cvr.result) return null;
  if (cvr.result.cat.label === 'Risque \u00e9lev\u00e9') return { v: 0.7, label: 'LDL < 0,7 g/L', why: 'SCORE2 risque \u00e9lev\u00e9 \u2014 haut risque (ESC/EAS 2025 : cible < 0,7 g/L)' };
  if (cvr.result.cat.label === 'Risque mod\u00e9r\u00e9') return { v: 1.0, label: 'LDL < 1,0 g/L', why: 'SCORE2 risque mod\u00e9r\u00e9 (ESC/EAS 2025 : cible < 1,0 g/L ; si persiste : viser < 0,7 g/L)' };
  return { v: 1.16, label: 'LDL < 1,16 g/L', why: 'Risque faible (ESC/EAS 2025 : pas de cible th\u00e9rapeutique ; LDL < 1,16 g/L d\u00e9finit un risque plut\u00f4t faible, sinon \u2265 25 ans de traitement \u00e0 40 ans pour 1 an d\u2019esp\u00e9rance de vie)' };
}

const TERRAIN_ITEMS = [
  { id: 'cvr-t-coronaropathie', label: 'Coronaropathie / SCA / pontage / angioplastie' },
  { id: 'cvr-t-avc', label: 'AVC / AIT ischémique' },
  { id: 'cvr-t-aomi', label: 'Artériopathie oblitérante des membres inférieurs' },
  { id: 'cvr-t-hcq', label: 'Plaque carotidienne symptomatique / sténose > 50 %' },
];
const EXTREME_ITEM = { id: 'cvr-t-extreme', label: 'EXTRÊME : récidive d’événement vasculaire malgré traitement intensif maximal toléré, OU maladie polyvasculaire (≥ 2 territoires artériels)' };

function cvrCompute(p) {
  const st = cvrState;
  const hba1cEl = document.getElementById('cvr-hba1c');
  if (hba1cEl && hba1cEl.value !== '' && !isNaN(parseFloat(hba1cEl.value))) { st.hba1c = parseFloat(hba1cEl.value) > 25 ? parseFloat(hba1cEl.value) : Math.round(parseFloat(hba1cEl.value) * 10.93); }
  else if (p.hba1c !== null && p.hba1c !== undefined) { st.hba1c = p.hba1c > 25 ? p.hba1c : Math.round(p.hba1c * 10.93); }
  const daEl = document.getElementById('cvr-diabage');
  if (daEl && daEl.value !== '' && !isNaN(parseFloat(daEl.value))) st.diabAge = parseFloat(daEl.value);
  const terrChecked = TERRAIN_ITEMS.map(t => !!document.getElementById(t.id)?.checked);
  const hasTerrain = terrChecked.some(Boolean);
  const terrainReasons = TERRAIN_ITEMS.filter((t, i) => terrChecked[i]).map(t => t.label);
  const extreme = !!document.getElementById(EXTREME_ITEM.id)?.checked;
  const age = p.age, sex = p.sex;
  const smoker = p.tabac === 'actif' ? 1 : 0;
  const sbp = p.sbp;
  const chol = p.chol === null ? null : p.chol / 0.3867;
  const hdl = p.hdl === null ? null : p.hdl / 0.3867;
  const isDm = !!p.diabete;
  const model = age >= 70 ? 'op' : 's2';
  const modelName = isDm ? 'SCORE2-Diabetes' : (age >= 70 ? 'SCORE2-OP' : 'SCORE2');

  let result = null, missing = [];
  if (!hasTerrain) {
    if (!isDm && age !== null && age < 40) missing.push('SCORE2 : à partir de 40 ans (40\u201369)');
    if (isDm && age !== null && age < 40) missing.push('SCORE2-Diabetes : validé 40\u201369 ans');
    if (!isDm && age !== null && age >= 70) { /* OP ok jusqu'\u00e0 89 */ }
    if (age === null) missing.push('\u00e2ge');
    if (p.tabac === '') missing.push('statut tabac (partie Patient)');
    if (p.sbp === null) missing.push('PAS (partie Patient)');
    if (p.chol === null) missing.push('cholestérol total (partie Patient)');
    if (p.hdl === null) missing.push('HDL (partie Patient)');
    if (isDm && st.hba1c === null) missing.push('HbA1c (en % dans la partie Patient, ou mmol/mol ci-contre)');
    if (isDm && st.diabAge === null) missing.push('\u00e2ge de diagnostic du diab\u00e8te');
    if (isDm && p.dfg === null) missing.push('DFG (déjà demandé plus haut)');
    const ready = !missing.length && age !== null;
    if (ready) {
      let raw, mdl = model;
      if (isDm) {
        raw = score2DiabetesRaw(sex, smoker, sbp, chol, hdl, age, st.diabAge, st.hba1c, p.dfg);
        mdl = 's2';
      } else {
        raw = age >= 70 ? score2OpRaw(sex, smoker, sbp, chol, hdl, age, 0) : score2Raw(sex, smoker, sbp, chol, hdl, age, 0);
      }
      const calibrated = cvrCalibrate(raw, sex, age, mdl);
      const pct = Math.round(calibrated * 1000) / 10;
      result = { pct, cat: cvrCategory(pct, age, isDm ? 'dt2' : mdl) };
    }
  }
  return { hasTerrain, terrainReasons, extreme, result, missing, age, isDm };
}

function renderCvr(p) {
  const st = cvrState;
  const panel = document.getElementById('cvr-panel');
  const cvr = cvrCompute(p);
  const { hasTerrain, terrainReasons, extreme, result, missing, age, isDm } = cvr;
  const target = ldlTarget(p, cvr);
  const ldlOk = target && p.ldl !== null && p.ldl < target.v;
  const ldlGap = target && p.ldl !== null ? Math.round((p.ldl - target.v) / target.v * 100) : null;
  const d2 = v => v === null ? '—' : v;

  const modelName = p.diabete ? 'SCORE2-Diabetes' : (age >= 70 ? 'SCORE2-OP' : 'SCORE2');
  const verdict = extreme
    ? { label: 'RISQUE EXTRÊME', color: '#6a1b9a', bg: '#f3e5f5' }
    : hasTerrain
      ? { label: 'Prévention secondaire', color: '#c62828', bg: '#fdecea' }
      : result
        ? { label: result.cat.label, pct: result.pct, color: result.cat.color, bg: result.cat.color + '18' }
        : { label: 'À calculer', color: '#78909c', bg: '#eceff1' };

  const gauge = result ? Math.min(100, Math.round(result.pct * (result.pct > 20 ? 3 : 6))) : 0;
  const cvrLevelTxt = extreme ? 'Risque extrême' : (hasTerrain ? 'Prévention secondaire (terrain cardiovasculaire connu)' : (result ? result.cat.label : 'À calculer'));
  const cvrCopyTxt = (extreme ? 'Risque CV extrême' : hasTerrain ? 'Risque CV très élevé — prévention secondaire (terrain cardiovasculaire connu)' : (result ? modelName + ' : ' + result.pct.toFixed(1).replace('.', ',') + ' % à 10 ans — ' + result.cat.label : 'Risque CV : à calculer')) + (target ? ' · Cible ' + target.label : '');
  (window._copyTexts = window._copyTexts || {}).cvr = cvrCopyTxt;

  const terrainChecks = TERRAIN_ITEMS.map(t =>
    `<label class="cvr-terrain-item"><input type="checkbox" id="${t.id}" ${document.getElementById(t.id)?.checked ? 'checked' : ''}><span>${escapeHtml(t.label)}</span></label>`).join('')
    + `<label class="cvr-terrain-item cvr-terrain-extreme"><input type="checkbox" id="${EXTREME_ITEM.id}" ${document.getElementById(EXTREME_ITEM.id)?.checked ? 'checked' : ''}><span>${escapeHtml(EXTREME_ITEM.label)}</span></label>`;

  const inputs = [
    { k: 'Tabac', v: p.tabac === '' ? 'non renseigné' : (p.tabac === 'actif' ? '🚬 actif' : (p.tabac === 'sevré' ? 'sevré (non fumeur pour le score)' : 'jamais')), ok: p.tabac !== '' },
    { k: 'PAS', v: p.sbp === null ? '—' : p.sbp + ' mmHg', ok: p.sbp !== null },
    { k: 'Chol. total', v: p.chol === null ? '—' : d2(p.chol) + ' g/L', ok: p.chol !== null },
    { k: 'HDL', v: p.hdl === null ? '—' : d2(p.hdl) + ' g/L', ok: p.hdl !== null },
  ];

  const actTxt = result ? (p.diabete
    ? (result.pct >= 20 ? 'Très haut risque : statine haute intensité (LDL < 0,55 g/L), iSGLT2/GLP-1 selon indication, TA < 130/80.'
      : result.pct >= 10 ? 'Haut risque : statine (LDL < 0,7 g/L), iSGLT2/GLP-1 à évaluer, TA < 130/80.'
      : result.pct >= 5 ? 'Risque modéré : hygiène de vie, statine à discuter (LDL < 1,0 g/L), contrôle annuel.'
      : 'Risque faible : hygiène de vie, suivi annuel.')
    : (result.cat.label === 'Risque élevé' ? 'Haut risque : statine indiquée (LDL < 0,7 g/L), TA < 130/80 si traitée.'
      : result.cat.label === 'Risque modéré' ? 'Risque modéré : hygiène de vie, réévaluer à 3–6 mois, statine si facteurs persistants.'
      : 'Risque faible : hygiène de vie, réévaluation régulière.')) : '';

  panel.innerHTML = `
  <div class="cvr-box${window._cvrOpen ? ' open' : ''}">
    <div class="cvr-head" role="button" tabindex="0" aria-expanded="${window._cvrOpen ? 'true' : 'false'}">
      <span class="cvr-title">❤️ Risque cardiovasculaire</span>
      <span class="cvr-verdict" style="color:${verdict.color}; background:${verdict.bg}">
        ${result ? result.pct.toFixed(1).replace('.', ',') + ' % · ' : ''}${verdict.label}${target ? ' · ' + target.label : ''}
      </span>
      <span class="cvr-copy" data-copy-id="cvr" title="Copier le résumé du risque CV (puis Ctrl-V)">⧉</span>
      <span class="cvr-chevron">▸</span>
    </div>
    <div class="cvr-detail"><div class="cvr-detail-inner">

      ${extreme ? `
      <div class="cvr-banner" style="--bc:#6a1b9a">
        <strong>⚠ Risque extrême (ESC/EAS 2025)</strong>
        <p>Cible LDL < 0,40 g/L (Class IIb). Traitement intensif maximal : statine haute intensité + ézétimibe → PCSK9 (ou inclisiran) ± bempédoïque — évaluation spécialisée recommandée.</p>
      </div>` : hasTerrain ? `
      <div class="cvr-banner" style="--bc:#c62828">
        <strong>⛔ Terrain athéromateux — prévention secondaire</strong>
        <p>Pas de score nécessaire. Prise en charge intensive : statine haute intensité (LDL < 0,55 g/L), antiagrégant, contrôle TA, arrêt tabac, réadaptation.</p>
      </div>` : ''}

      <div class="cvr-layout">
        <div class="cvr-col">
          <div class="cvr-panel-title">① Terrain cardiovasculaire connu ?</div>
          <div class="cvr-terrain-grid">${terrainChecks}</div>

          <div class="cvr-panel-title">② Données du score <span class="cvr-model">${modelName} · France (bas risque)</span></div>
          <div class="cvr-inputs">
            ${inputs.map(i => `<div class="cvr-input${i.ok ? ' ok' : ''}"><span class="cvr-input-k">${i.k}</span><span class="cvr-input-v">${i.v}</span></div>`).join('')}
            ${isDm ? `
            <label class="cvr-input cvr-input-edit">HbA1c (% ou mmol/mol)<input type="number" id="cvr-hba1c" min="3" max="150" step="0.1" value="${p.hba1c !== null ? d2(p.hba1c) : d2(st.hba1c)}" placeholder="ex. 7,5 % ou 58 mmol/mol"></label>
            <label class="cvr-input cvr-input-edit">Âge diag. DT2<input type="number" id="cvr-diabage" min="20" max="85" step="1" value="${d2(st.diabAge)}" placeholder="ex. 55"></label>` : ''}
          </div>
          ${!hasTerrain && missing.length ? `<div class="cvr-missing">⚠️ Pour calculer le score : ${missing.map(escapeHtml).join(', ')}.</div>` : ''}
        </div>

        <div class="cvr-col cvr-col-results">
          ${result ? `
          <div class="cvr-scorecard" style="--sc:${result.cat.color}">
            <div class="cvr-scorecard-top">
              <div class="cvr-gauge"><div class="cvr-gauge-fill" style="width:${gauge}%; background:${result.cat.color}"></div></div>
              <div class="cvr-scorecard-pct">${result.pct.toFixed(1).replace('.', ',')}<span class="cvr-pct-unit">%</span></div>
            </div>
            <div class="cvr-scorecard-cat" style="color:${result.cat.color}">${result.cat.label}</div>
            <div class="cvr-scorecard-sub">Risque CV à 10 ans — ${modelName}, région bas risque (France)</div>
            <div class="cvr-scorecard-act">${actTxt}</div>
          </div>` : (!hasTerrain && !extreme ? `
          <div class="cvr-scorecard cvr-scorecard-empty">
            <div class="cvr-scorecard-pct">?</div>
            <div class="cvr-scorecard-cat">Score non calculé</div>
            <div class="cvr-scorecard-sub">Renseignez les données manquantes</div>
          </div>` : '')}

          ${target ? `
          <div class="cvr-ldl ${ldlOk === true ? 'ok' : (ldlOk === false ? 'ko' : '')}">
            <div class="cvr-ldl-head">
              <span class="cvr-ldl-target">${target.label}</span>
              ${ldlOk === true ? '<span class="cvr-ldl-badge ok">✓ atteinte</span>' : (ldlOk === false ? `<span class="cvr-ldl-badge ko">+${ldlGap} %</span>` : '')}
            </div>
            <div class="cvr-ldl-why">${escapeHtml(target.why)}</div>
            <div class="cvr-ldl-status">
              ${p.ldl === null
                ? 'LDL non renseigné — remplir le champ LDL (g/L) dans la partie Patient.'
                : (ldlOk
                  ? `✅ LDL du patient : ${d2(p.ldl)} g/L — cible atteinte.`
                  : `❌ LDL du patient : ${d2(p.ldl)} g/L — cible dépassée de ${ldlGap > 0 ? '+' : ''}${ldlGap} % : statine indiquée (voir Traitements → Statines), réévaluer à 3 mois.`)}
            </div>
          </div>` : ''}
        </div>
      </div>

    </div></div>
  </div>`;
  bindCvr(p);
}
function bindCvr(p) {
  const panel = document.getElementById('cvr-panel');
  const head = panel.querySelector('.cvr-head');
  if (head) head.addEventListener('click', e => {
    if (e.target.closest('[data-copy-id]')) return;
    if (e.target.matches('input, select, button')) return;
    window._cvrOpen = !window._cvrOpen;
    render();
  });
  const hba1cEl = document.getElementById('cvr-hba1c');
  if (hba1cEl) hba1cEl.addEventListener('change', e => { const v = parseFloat(e.target.value) || null; cvrState.hba1c = (v !== null && v <= 25) ? Math.round(v * 10.93) : v; renderCvr(P()); });
  const daEl = document.getElementById('cvr-diabage');
  if (daEl) daEl.addEventListener('change', e => { cvrState.diabAge = parseFloat(e.target.value) || null; renderCvr(P()); });
  [EXTREME_ITEM, ...TERRAIN_ITEMS].forEach(t => {
    const el = document.getElementById(t.id);
    if (el) el.addEventListener('change', () => render());
  });
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

function dmStrategy(p, cvr) {
  if (!p.diabete) return null;
  const kd = kdigoStage(p);
  const hba1c = p.hba1c;
  const imc = p.imc;
  const dfg = p.dfg;
  const age = p.age;
  const hba1cTxt = hba1c !== null ? String(hba1c).replace('.', ',') + ' %' : 'non renseignée';

  // Cible HbA1c individualisée (SFD/HAS) + grille complète
  const allTargets = [
    { l: 'HbA1c < 6,5 %', w: 'Possible chez le sujet jeune, DT2 récent, sans comorbidité, si hypoglycémies bien tolérées (bénéfice microvasculaire)' },
    { l: 'HbA1c < 7,0 %', w: 'Cible commune chez l\u2019adulte — à individualiser' },
    { l: 'HbA1c < 7,0–7,5 %', w: '65–74 ans, comorbidités modérées, ou risque d\u2019hypoglycémie' },
    { l: 'HbA1c < 7,5–8,0 %', w: '≥ 75 ans, espérance de vie limitée, fragilité, MRC évoluée, antécédent d\u2019hypoglycémie sévère' },
    { l: 'HbA1c < 8,0–8,5 %', w: 'Sujet très âgé/fragile, fin de vie — bénéfice limité de l\u2019intensification' },
  ];
  let target, targetIdx;
  if (age !== null && age >= 75) { target = 'HbA1c < 7,5–8,0 % (sujet âgé)'; targetIdx = 3; }
  else if (age !== null && age >= 65) { target = 'HbA1c < 7,0–7,5 % (65–74 ans)'; targetIdx = 2; }
  else if (dfg !== null && dfg < 45) { target = 'HbA1c < 7,5 % (MRC)'; targetIdx = 3; }
  else { target = 'HbA1c < 7,0 %'; targetIdx = 1; }

  const profiles = [];
  const hasTerrain = cvr.hasTerrain || cvr.extreme;
  const highRisk = !hasTerrain && cvr.result && cvr.result.pct >= 10;
  const isElderly = age !== null && age >= 75;
  const obese = imc !== null && imc >= 30;

  // 1. Insuffisance cardiaque — iSGLT2 d'emblée (SFD 2023)
  if (p.ic) profiles.push({ n: '1 — Insuffisance cardiaque', t: 'Bithérapie metformine + iSGLT2 d\u2019embl\u00e9e, ind\u00e9pendamment de l\u2019HbA1c (dapagliflozine, empagliflozine) — b\u00e9n\u00e9fice mortalit\u00e9 et hospitalisation. aGLP-1 (tirz\u00e9patide) si HFpEF avec ob\u00e9sit\u00e9 associ\u00e9e. (SFD 2023 · HAS 2024)' });

  // 2. Maladie rénale chronique — iSGLT2 + sémaglutide (SFD 2025, FLOW)
  if (kd && ((dfg !== null && dfg < 60) || (kd.a && kd.a !== 'A1'))) {
    profiles.push({ n: '2 — Maladie r\u00e9nale chronique (KDIGO ' + kd.g + (kd.a ? ' ' + kd.a : '') + ')',
      t: 'Bith\u00e9rapie metformine + iSGLT2 d\u2019embl\u00e9e, ind\u00e9pendamment de l\u2019HbA1c (dapagliflozine, empagliflozine si DFG \u2265 20). Ajouter le s\u00e9maglutide (b\u00e9n\u00e9fice r\u00e9nal d\u00e9montr\u00e9, FLOW — SFD 2025). IEC/ARA2 \u00e0 dose maximale tol\u00e9r\u00e9e \u00b1 fin\u00e9r\u00e9none si albuminurie persistante (KDIGO 2024). Metformine : max 1 000 mg/j si DFG 30\u201344, arr\u00eat si DFG < 30.' });
  }

  // 3. Athéromateuse avérée — metformine + iSGLT2 ou aGLP-1 (SFD 2023)
  if (hasTerrain && !p.ic) {
    profiles.push({ n: '3 — Maladie cardiovasculaire ath\u00e9romateuse \u00e9tablie',
      t: 'Bith\u00e9rapie d\u2019embl\u00e9e, ind\u00e9pendamment de l\u2019HbA1c : metformine + aGLP-1 (s\u00e9maglutide, dulaglutide — b\u00e9n\u00e9fice CV d\u00e9montr\u00e9) ou metformine + iSGLT2. En cas d\u2019ant\u00e9c\u00e9dent d\u2019AVC isch\u00e9mique : privil\u00e9gier l\u2019aGLP-1. Trith\u00e9rapie metformine + aGLP-1 + iSGLT2 si\u00e8ge recherche de b\u00e9n\u00e9fice cardio-r\u00e9nal suppl\u00e9mentaire. (SFD 2023 · HAS 2024)' });
  }

  // 4. Haut risque CV en prévention primaire (SCORE2-Diabetes ≥ 10 %) — HAS 2024 / SFD
  if (highRisk && !obese) {
    profiles.push({ n: '4 — Haut risque CV en pr\u00e9vention primaire (SCORE2-Diabetes ' + cvr.result.pct.toFixed(1).replace('.', ',') + ' %)',
      t: 'Ajouter un iSGLT2 ou un aGLP-1 \u00e0 la metformine, ind\u00e9pendamment de l\u2019HbA1c (HAS 2024 · SFD). Niveau de preuve plus faible qu\u2019en pr\u00e9vention secondaire, mais b\u00e9n\u00e9fice attendu sur les \u00e9v\u00e9nements CV. ' + (hba1c !== null && hba1c >= 8.5 ? 'HbA1c ' + hba1cTxt + ' \u2265 8,5 % : bith\u00e9rapie d\u2019embl\u00e9e justifi\u00e9e.' : '') });
  }

  // 5. Obésité (IMC ≥ 30) — aGLP-1 / tirzépatide
  if (obese) {
    profiles.push({ n: '5 — Ob\u00e9sit\u00e9 (IMC ' + String(imc).replace('.', ',') + ')',
      t: (age !== null && age < 75) ? 'Privil\u00e9gier le tirz\u00e9patide (double agoniste GIP/GLP-1, efficacit\u00e9 maximale sur le poids et l\u2019HbA1c) ou un aGLP-1 (s\u00e9maglutide) \u2014 quelle que soit l\u2019HbA1c (SFD 2023/2025). Metformine maintenue. iSGLT2 utile si IC/MRC associ\u00e9e ou pour un surcro\u00eet de perte de poids en trith\u00e9rapie.' : 'Chez le sujet \u00e2g\u00e9 ob\u00e8se : aGLP-1 possible (pas d\u2019hypoglyc\u00e9mie), surveillance de la sarcop\u00e9nie ; iSGLT2 si IC/MRC.' });
  }

  // 6. Hyperglycémie marquée
  if (hba1c === null || hba1c >= 8.5) {
    profiles.push({ n: '6 — Hyperglyc\u00e9mie marqu\u00e9e (HbA1c ' + hba1cTxt + ')',
      t: (hba1c !== null && hba1c >= 10) ? 'HbA1c \u2265 10 % et/ou sympt\u00f4mes (polyuro-polydipsie, amaigrissement) : insuline basale \u00b1 aGLP-1 d\u2019embl\u00e9e — avis endocrinologique souhaitable. D\u00e9sescalade possible secondairement vers les oraux une fois l\u2019\u00e9quilibre obtenu.' : 'HbA1c \u2265 8,5 % : bith\u00e9rapie d\u2019embl\u00e9e (metformine + aGLP-1 ou iSGLT2 selon le profil ci-dessus). Si HbA1c \u2265 cible + 1,5 % : association d\u2019embl\u00e9e recommand\u00e9e.' });
  }

  // 7. Sujet âgé / fragile
  if (isElderly) {
    profiles.push({ n: '7 — Patient \u00e2g\u00e9 (' + age + ' ans)',
      t: 'Priorit\u00e9 aux classes sans hypoglyc\u00e9mie (aGLP-1, iSGLT2, iDPP4 — ce dernier bien tol\u00e9r\u00e9 mais peu puissant). \u00c9viter glibenclamide ; sulfamides/glinides seulement si risque hypoglyc\u00e9mie faible. D\u00e9sescalade si HbA1c < 7,0 % sous traitement (d\u00e9intensification — pr\u00e9venir les hypoglyc\u00e9mies iatrog\u00e8nes, source d\u2019hospitalisation et de chutes).' });
  }

  // 8. Situation « commune » : algorithme SFD par ordre de préférence
  if (!hasTerrain && !highRisk && !p.ic && !(kd && ((dfg !== null && dfg < 60) || (kd.a && kd.a !== 'A1'))) && !isElderly) {
    profiles.push({ n: 'Situation \u00ab commune \u00bb (' + (age !== null ? age + ' ans' : 'âge non renseigné') + (imc !== null ? ' · IMC ' + String(imc).replace('.', ',') : '') + ')',
      t: '1re intention : hygi\u00e8ne de vie + metformine dose maximale tol\u00e9r\u00e9e (si DFG \u2265 30). Si l\u2019HbA1c reste au-dessus de la cible : bith\u00e9rapie en ajoutant, par ordre de pr\u00e9f\u00e9rence SFD 2023/2025 — un iSGLT2 ou un aGLP-1 (\u00b1 double agoniste GIP/GLP-1), puis un iDPP4, enfin sulfamide/glinide selon le profil (hypoglyc\u00e9mies, prise de poids, tol\u00e9rance). Si l\u2019IMC \u2265 30 : aGLP-1/tirz\u00e9patide prioritaire. Si HbA1c \u2265 cible + 1,5 % sous bith\u00e9rapie : trith\u00e9rapie (metformine + aGLP-1 + iSGLT2) ou insuline basale \u00b1 aGLP-1.' });
  }

  if (!profiles.length) profiles.push({ n: 'Situation \u00ab commune \u00bb', t: 'Hygi\u00e8ne de vie + metformine (si DFG \u2265 30, tol\u00e9rance correcte) ; intensifier selon les profils ci-dessus d\u00e8s qu\u2019un crit\u00e8re appara\u00eet (ASCVD, IC, MRC, ob\u00e9sit\u00e9, hyperglyc\u00e9mie marqu\u00e9e, \u00e2ge).' });

  const dfgTxt = dfg !== null ? dfg + ' mL/min/1,73 m\u00b2' : 'non renseign\u00e9';
  const racTxt = p.rac !== null && p.rac !== undefined ? (p.rac === 'nc' ? 'non calculable (A1)' : String(p.rac).replace('.', ',') + ' mg/mmol') : 'non renseign\u00e9';
  const base = ['DFG du patient : ' + dfgTxt + ' \u00b7 RAC : ' + racTxt + (kd ? ' \u00b7 stade KDIGO ' + kd.g + (kd.a ? ' ' + kd.a : '') : '') + '.'];
  if (dfg === null) base.push('DFG non renseign\u00e9 \u2014 le remplir dans la partie Patient pour les adaptations posologiques (metformine, iSGLT2, aGLP-1).');
  else if (dfg < 30) base.push('Metformine : arr\u00eat si DFG < 30 mL/min ; iSGLT2 non initi\u00e9 si DFG < 20.');
  else if (dfg < 45) base.push('Metformine : max 1 000 mg/j (DFG 30\u201344) ; iSGLT2 \u00e0 dose adapt\u00e9e si DFG \u2265 20.');
  else base.push('DFG \u2265 45 : posologies usuelles de la metformine ; iSGLT2 \u00e0 dose standard.');
  base.push('Rechercher une MASLD/st\u00e9atose h\u00e9patique (tr\u00e8s fr\u00e9quente dans le DT2) — si pr\u00e9sente : aGLP-1 quelle que soit l\u2019HbA1c (SFD 2024).');
  base.push('D\u00e9pistage annuel des complications : fond d\u2019\u0153il, DFG/RAC, pieds, BU, statut vaccinal, bilan lipidique.');

  const lines = ['Cible : ' + target + '.'];
  lines.push('Base du sch\u00e9ma : metformine (sauf CI) \u00b1 agents \u00e0 b\u00e9n\u00e9fice cardio-r\u00e9nal selon les profils ci-dessous.');

  return { target, targetIdx, allTargets, profiles, base, lines };
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

function statinAdvice(p, cvr, tg) {
  const STATINS = [
    { name: 'Pravastatine 20\u201340 mg (faible)', red: 0.30 },
    { name: 'Simvastatine 20\u201340 mg (faible)', red: 0.35 },
    { name: 'Fluvastatine 80 mg XL (faible)', red: 0.38 },
    { name: 'Atorvastatine 10 mg (mod\u00e9r\u00e9e)', red: 0.39 },
    { name: 'Pitavastatine 2\u20134 mg (mod\u00e9r\u00e9e)', red: 0.41 },
    { name: 'Atorvastatine 20\u201340 mg (mod\u00e9r\u00e9e)', red: 0.43 },
    { name: 'Rosuvastatine 5\u201310 mg (mod\u00e9r\u00e9e\u2013haute)', red: 0.46 },
    { name: 'Atorvastatine 40\u201380 mg (haute)', red: 0.50 },
    { name: 'Rosuvastatine 20\u201340 mg (haute)', red: 0.55 },
  ];
  const reasons = [], remb = [], ci = [];
  let ok = false;
  if (cvr.extreme) {
    ok = true;
    reasons.push('Risque extr\u00eame (ESC/EAS 2025) \u2014 traitement lipidique intensif maximal : statine haute intensit\u00e9 + \u00e9z\u00e9timibe, puis PCSK9 si cible < 0,40 g/L non atteinte');
  } else if (cvr.hasTerrain) {
    ok = true;
    reasons.push('Terrain ath\u00e9romateux (pr\u00e9vention secondaire) \u2014 statine haute intensit\u00e9 recommand\u00e9e quel que soit le L');
    } else if (tg) {
    if (p.ldl !== null && p.ldl >= tg.v) {
      ok = true;
      reasons.push(`${tg.label} \u2014 LDL actuel ${p.ldl} g/L : cible non atteinte (${tg.why})`);
    } else if (p.ldl !== null && p.ldl < tg.v) {
      if (tg.v <= 0.55) { ok = true; reasons.push(`Cible stricte ${tg.label} \u2014 LDL ${p.ldl} g/L \u2014 statine haute intensit\u00e9 indiqu\u00e9e (ESC : \u2265 50 % de r\u00e9duction si cible stricte) `); }
      else reasons.push(`Cible ${tg.label} \u2014 LDL ${p.ldl} g/L d\u00e9j\u00e0 conforme : hygi\u00e8ne de vie, pas de statine d\u2019embl\u00e9e.`);
    } else {
      reasons.push(`${tg.label} (cible ESC selon le risque) \u2014 LDL non renseign\u00e9 : \u00e0 compl\u00e9ter pour trancher.`);
    }
  }
  let drug = null, reduction = null, table = [];
  if (ok && p.ldl !== null && tg) {
    const need = 1 - tg.v / p.ldl;
    if (cvr.extreme) {
      drug = 'Rosuvastatine 20\u201340 mg + \u00e9z\u00e9timibe, puis PCSK9 (ou inclisran) si LDL \u2265 0,40 g/L (ESC/EAS 2025)';
      reduction = `R\u00e9duction n\u00e9cessaire pour atteindre ${tg.label} : \u2212${Math.round(need * 100)} % \u2014 cible non atteignable avec une statine seule : association \u00e9z\u00e9timibe + PCSK9 (ou inclisran), \u00b1 bemp\u00e9do\u00efque.`;
      table = STATINS.map(s => `${s.name} : \u2212${Math.round(s.red * 100)} %`);
    } else {
    const pick = STATINS.find(s => s.red >= need) || STATINS[STATINS.length - 1];
    drug = `${pick.name} (\u2212${Math.round(pick.red * 100)} % de LDL)`;
    reduction = `R\u00e9duction n\u00e9cessaire pour atteindre ${tg.label} : \u2212${Math.round(need * 100)} % \u2014 ${pick.red >= need ? 'intensit\u00e9 haute' : 'cible non atteignable avec une statine seule : association \u00e9z\u00e9timibe (\u2212 15\u201320 %) \u00b1 PCSK9 si haut/tr\u00e8s haut risque'}.`;
    table = STATINS.map(s => `${s.name} : \u2212${Math.round(s.red * 100)} %`);
    }
  } else if (ok && tg) {
    drug = cvr.extreme ? 'Rosuvastatine 20\u201340 mg + \u00e9z\u00e9timibe, puis PCSK9 (ou inclisran) si LDL \u2265 0,40 g/L (ESC/EAS 2025)' : 'Atorvastatine 40\u201380 mg ou Rosuvastatine 20\u201340 mg (haute intensit\u00e9 \u2014 ESC)';
    table = STATINS.map(s => `${s.name} : \u2212${Math.round(s.red * 100)} %`);
  }
  remb.push('Statines : s\u00e9curit\u00e9 sociale \u2014 remboursement 65 % / 15 % selon les mol\u00e9cules et dosages (g\u00e9n\u00e9riques \u00e0 65 % ; certaines pr\u00e9sentations SMR insuffisant 15 %)');
  remb.push('Pr\u00e9vention CV (primaire haut risque / secondaire) : prise en charge ALD 100 % selon la pathologie (post-IDM, AVC isch\u00e9mique, art\u00e9riopathie)');
  ci.push('Contre-indications : h\u00e9patopathie active, myopathie sous statine, grossesse/allaitement/projet de grossesse (arr\u00eat) ; prudence \u2265 75 ans, insuffisance r\u00e9nale s\u00e9v\u00e8re, interactions (macrolides, antifongiques azol\u00e9s, ciclosporine, jus de pamplemousse \u2014 simvastatine)');
  ci.push('Surveillance : CPK si sympt\u00f4mes musculaires, bilan h\u00e9patique \u00e0 3 mois, glyc\u00e9mie (l\u00e9g\u00e8re hausse du risque diab\u00e8te sous statine \u2014 ne remet pas en cause le b\u00e9n\u00e9fice CV)');
  return { ok, reasons, drug, reduction, table, remb, ci };
}

function rxChips(reasons) {
  return `<div class="rx-chips">${reasons.map(r => `<span class="rx-chip">\u2713 ${escapeHtml(r)}</span>`).join('')}</div>`;
}
function rxFlags(remb, ci) {
  let h = '<div class="rx-flags">';
  if (remb && remb.length) h += `<span class="rx-flag rf-remb" data-tip="${escapeHtml(remb.join(' ; '))}">\ud83d\udcb6 Remboursement</span>`;
  if (ci && ci.length) h += `<span class="rx-flag rf-ci" data-tip="${escapeHtml(ci.join(' \u2014 '))}">\u26a0 CI / surveillance</span>`;
  return h + '</div>';
}
function rxSub(title, lines) {
  if (!lines || !lines.length) return '';
  return `<details class="rx-sub"><summary>${escapeHtml(title)}</summary><div class="rx-sub-body">${lines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}</div></details>`;
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
    ${ie.ok ? rxChips(ie.reasons) : (ie.reasons.length ? rxChips(ie.reasons) : '<div class="rx-muted-line">Aucun crit\u00e8re : HTA absente, pas d\'albuminurie \u2265 3 mg/mmol, pas d\'IC. Pas d\'indication \u00e0 ce jour.</div>')}
    ${rxFlags(ie.remb, ie.ci)}`;

  const gl = isglt2Advice(p);
  const glStatus = gl.ok ? 'INDIQU\u00c9' : (p.dfg !== null || p.diabete || p.ic ? 'Pas d\'indication' : '\u2014');
  const glColor = gl.ok ? '#c8e6c9' : '#ffcdd2';
  const glDetail = `
    ${gl.ok && gl.drug ? `<div class="rx-drug">\u2192 <strong>${escapeHtml(gl.drug)}</strong></div>` : ''}
    ${gl.ok ? rxChips(gl.reasons) : (gl.reasons.length ? rxChips(gl.reasons) : '<div class="rx-muted-line">Aucun crit\u00e8re : pas de DT2, pas d\'IC, DFG \u2265 45 ou albuminurie < 20 mg/mmol.</div>')}
    ${rxFlags(gl.remb, gl.ci)}`;

  const gp = glp1Advice(p);
  const gpStatus = gp.ok ? 'INDIQU\u00c9' : (p.imc !== null || p.diabete ? 'Pas d\'indication' : '\u2014');
  const gpColor = gp.ok ? '#c8e6c9' : '#ffcdd2';
  const gpDetail = `
    ${gp.ok ? rxChips(gp.reasons) : (gp.reasons.length ? rxChips(gp.reasons) : '<div class="rx-muted-line">Aucun crit\u00e8re : pas de DT2, IMC < 27 ou sans comorbidit\u00e9. Pas d\'indication \u00e0 ce jour.</div>')}
    ${rxFlags(gp.remb, gp.ci)}`;

  const cvr = cvrCompute(p);
  const tg = ldlTarget(p, cvr);
  const stt = statinAdvice(p, cvr, tg);
  const stStatus = stt.ok ? 'INDIQU\u00c9' : (tg ? 'Pas d\'indication' : '\u2014');
  const stColor = stt.ok ? '#c8e6c9' : '#ffcdd2';
  const stDetail = `
    ${stt.ok ? rxChips(stt.reasons) : (stt.reasons.length ? rxChips(stt.reasons) : '<div class="rx-muted-line">Aucune indication : risque CV faible/mod\u00e9r\u00e9 sans cible d\u00e9pass\u00e9e, pas de terrain, LDL conforme. Hygi\u00e8ne de vie et r\u00e9\u00e9valuation.</div>')}
    ${stt.drug ? `<div class="rx-drug">\u2192 Sugg\u00e9r\u00e9 : <strong>${escapeHtml(stt.drug)}</strong></div>` : ''}
    ${stt.reduction ? `<div class="rx-goal">${escapeHtml(stt.reduction)}</div>` : ''}
    ${rxSub('Puissance des statines (baisse moyenne de LDL)', stt.table)}
    ${rxFlags(stt.remb, stt.ci)}`;

  const openState = window._rxOpen || {};
  if (!window._rxTouched) openState.dm = false;
  const dms = dmStrategy(p, cvr);
  let dmBoxes = '';
  if (dms) {
    const dmDetail = `
    <div class="rx-goal"><strong>${escapeHtml(dms.target)}</strong> — cible proposée, à individualiser (grille ci-dessous)</div>
    ${rxSub('Grille des cibles HbA1c (classification)', dms.allTargets.map((t, i) => (i === dms.targetIdx ? '▸ ' : '· ') + t.l + ' — ' + t.w))}
    ${dms.profiles.map(x => rxSub(x.n, [x.t])).join('')}
    ${rxSub('Adaptations r\u00e9nales (m\u00e9tformine / iSGLT2)', dms.base)}
    ${rxFlags(['DT2 = ALD 100 % ; insuline, metformine, GLP-1 RA (ob\u00e9sit\u00e9 IMC \u2265 30 ou \u2265 27 + comorbidit\u00e9), iSGLT2 (indications cardio-r\u00e9nales) rembours\u00e9s aux conditions habituelles (SMR important / insuffisant selon mol\u00e9cule)'], dms.base)}`;
    dmBoxes = makeBox(!!openState.dm, '#1565c0', '\ud83e\udd78', 'Strat\u00e9gie antidiab\u00e9tique (DT2)', dms.profiles.length && dms.profiles[0].n !== 'Aucun crit\u00e8re sp\u00e9cifique d\u00e9tect\u00e9' ? dms.profiles.length + ' profil(s) actif(s)' : 'Base : metformine', '#bbdefb', dmDetail);
  }
  panel.innerHTML =
    dmBoxes +
    makeBox(!!openState.ie, ie.ok ? '#2e7d32' : '#e53935', '\ud83d\udc8a', 'IEC / ARA2', ieStatus, ieColor, ieDetail) +
    makeBox(!!openState.gl, gl.ok ? '#2e7d32' : '#e53935', '\ud83e\uddea', 'iSGLT2 (gliflozine)', glStatus, glColor, glDetail) +
    makeBox(!!openState.gp, gp.ok ? '#2e7d32' : '#e53935', '\ud83e\udd8e', 'GLP-1 / tirz\u00e9patide', gpStatus, gpColor, gpDetail) +
    makeBox(!!openState.st, stt.ok ? '#2e7d32' : '#e53935', '\ud83d\udc8a', 'Statines', stStatus, stColor, stDetail);
}

document.addEventListener('click', e => {
  const head = e.target.closest('.rx-head');
  if (!head) return;
  const box = head.closest('.rx-collapse');
  const willOpen = box.dataset.rxOpen !== '1';
  const nm = box.querySelector('.rx-name').textContent;
  const key = nm.includes('IEC') ? 'ie' : nm.includes('iSGLT2') ? 'gl' : nm.includes('Statines') ? 'st' : nm.includes('antidiab') ? 'dm' : 'gp';
  window._rxTouched = true;
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

const ADULT_SECTIONS = ['cvr-section', 'rx-section', 'todo-section', 'suivi-section'];

function isPediaMode(p) {
  return p.ageMois !== null && p.ageMois < 24;
}

function render() {
  const p = P();
  const complete = p.age !== null && p.sex && p.tabac;
  document.getElementById('patient-warn').classList.toggle('hidden', !!complete);
  const details = document.getElementById('patient-info')?.querySelector('details');
  const summary = document.getElementById('patient-summary');
  if (details) {
    if (summary) {
      const bits = [];
      if (p.age !== null && p.ageMois === null) bits.push(p.age + ' ans');
      if (p.ageMois !== null) bits.push(String(p.ageMois).replace('.', ',') + ' mois');
      if (p.sex === 'F') bits.push('Femme');
      if (p.sex === 'M') bits.push('Homme');
      if (p.tabac === 'actif') bits.push('fumeur');
      if (p.tabac === 'sevré') bits.push('sevré');
      if (p.tabac === 'jamais') bits.push('non fumeur');
      if (p.diabete) bits.push('DT2');
      if (p.hta) bits.push('HTA');
      summary.textContent = bits.length ? bits.join(' · ') : '— cliquer pour renseigner —';
    }
  }

  const pedia = isPediaMode(p);
  ADULT_SECTIONS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', pedia);
  });

  const reminders = [];
  renderPedia(p);
  renderEtat(p);
  if (!pedia) {
    readDmChecks();
    renderKdigo(p);
    renderCvr(p);
    renderDiabete(p);
    renderRx(p);
    renderSuivi(p);
  } else {
    ['kdigo-panel', 'cvr-panel', 'diabete-panel', 'rx-panel', 'suivi-panel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
  }
  if (p.tabac === 'actif') reminders.push('🚬 Patient fumeur : proposer une aide au sevrage (substitution, consultation).');
  if (p.fumeur && p.pa === null && p.age !== null && p.age >= 40) reminders.push('⚠️ Paquets-années non renseignées : nécessaires pour BPCO, cancer du poumon, AAA.');
  if (p.diabete && p.dfg === null) reminders.push('🩸 Patient diabétique : vérifier la fonction rénale (DFG, rapport protéinurie/créatinurie).');
  if (p.dfg !== null && p.dfg < 60) reminders.push('💧 DFG < 60 mL/min : maladie rénale chronique — adapter traitements, éviter néphrotoxiques.');
  if (p.imc !== null && p.imc >= 30) reminders.push('⚖️ Obésité (IMC ≥ 30) : évaluer, proposer prise en charge (activité physique, diététique, chirurgie si indication).');
  if (p.ldl !== null && p.ldl >= 1.9) reminders.push('🧬 LDL ≥ 1,9 g/L : évoquer une hypercholestérolémie familiale (dépistage familial, avis spécialisé).');
  else if (p.ldl !== null && p.ldl >= 1.6) reminders.push('🫀 LDL ≥ 1,6 g/L : évaluer le risque cardiovasculaire global (SCORE2), adapter la prise en charge.');
  document.getElementById('reminders').innerHTML = reminders.map(r => `<div>${escapeHtml(r)}</div>`).join('');
  document.getElementById('reminders').classList.toggle('hidden', !reminders.length);

  updateSummary(pedia);
  renderCpamPatient();
  renderFiches();
}

// ---------- CPAM : rendu ----------
function renderCpamPatient() {
  const box = document.getElementById('cpam-patient');
  if (!box) return;
  const store = cpamStore();
  const name = ((document.getElementById('pat-nom')?.value || '') + ' ' + (document.getElementById('pat-prenom')?.value || '')).trim();
  if (!name) {
    box.innerHTML = '<div class="cpam-hint">Renseignez le NOM et le prénom du patient pour interroger les listes CPAM.</div>';
    return;
  }
  const match = cpamMatchPatient(store);
  const chips = CPAM_MODULES.map(m => {
    const r = match[m.id] || { status: 'absent' };
    let txt, cls;
    if (r.status === 'no-list') { txt = 'Liste non importée'; cls = 'none'; }
    else if (r.status === 'absent') { txt = 'Non concerné'; cls = 'nc'; }
    else {
      const st = CPAM_STATUTS[cpamResolveStatut(r.status)] || { txt: r.status || '?', cls: 'todo' };
      txt = st.txt; cls = st.cls;
    }
    const age = r.row && r.row.age ? ` · ${r.row.age} ans` : '';
    return `<span class="cpam-chip ${cls}" title="${escapeHtml(m.label)}">${m.icon} ${escapeHtml(m.label)} : <strong>${escapeHtml(txt)}</strong>${escapeHtml(age)}</span>`;
  }).join('');
  const listsInfo = CPAM_MODULES.filter(m => cpamPeriodsOf(store, m.id).length).map(m => {
    const periods = cpamPeriodsOf(store, m.id).filter(p => p);
    const latest = cpamLatestList(store, m.id);
    return `<span class="cpam-list-info">${m.icon} ${escapeHtml(m.label)} : ${latest.count} patients · ${periods.length > 1 ? periods[periods.length - 1] + ' · ' : ''}maj ${escapeHtml((latest.importedAt || '').slice(0, 10))}</span>`;
  }).join('');
  box.innerHTML = `<div class="cpam-chips">${chips}</div>` +
    (listsInfo ? `<details class="cpam-details"><summary>Détail des listes CPAM importées</summary><div class="cpam-lists">${listsInfo}</div></details>` : '<div class="cpam-hint">Aucune liste CPAM importée — utilisez « Listes CPAM » dans le bandeau du haut.</div>');
}

function renderCpamAdmin() {
  const panel = document.getElementById('cpam-admin-panel');
  if (!panel) return;
  const store = cpamStore();
  const cur = window._cpamPeriod || cpamCurrentPeriod();
  const curYear = parseInt(cur.split('-')[0], 10);
  const curQ = parseInt(cur.split('-T')[1], 10);
  const periodOptions = [
    `${curYear}-T${curQ}`, `${curYear}-T${(curQ + 2) % 4 + 1}`, `${curYear}-T${(curQ + 1) % 4 + 1}`, `${curYear - 1}-T${curQ}`,
  ];
  panel.innerHTML = `<p class="cpam-admin-hint">Chaque trimestre, téléchargez vos listes ciblées sur <strong>ameli pro</strong> (un fichier xlsx par dépistage), sélectionnez le trimestre puis importez chaque fichier dans son dépistage. L'historique des trimestres est conservé pour suivre votre progression. Données stockées localement dans ce navigateur.</p>
    <div class="cpam-period-picker">
      <label>Trimestre de mise à jour
        <select id="cpam-period-select">${periodOptions.map(p => `<option value="${p}"${p === cur ? ' selected' : ''}>${p}</option>`).join('')}</select>
      </label>
      <span class="cpam-period-note">La CPAM met à jour les listes tous les trimestres — importez le même trimestre pour chaque dépistage.</span>
    </div>` +
    CPAM_MODULES.map(m => {
      const importId = 'cpam-file-' + m.id;
      const list = cpamGetList(store, m.id, cur);
      const periods = cpamPeriodsOf(store, m.id).filter(p => p);
      return `<div class="cpam-admin-row" data-cpam-module="${m.id}">
        <div class="cpam-admin-label">${m.icon} <strong>${escapeHtml(m.label)}</strong></div>
        ${list ? `<div class="cpam-admin-status">✅ ${cur} : ${list.count} patients · importée le ${escapeHtml((list.importedAt || '').slice(0, 10))} · ${cpamCount(list, 'fait')} faits · ${cpamCount(list, 'a verifier')} à vérifier · ${cpamCount(list, 'exclu')} exclus</div>` : `<div class="cpam-admin-status none">— aucune liste importée pour ${cur}</div>`}
        ${periods.length ? `<div class="cpam-admin-periods">Trimestres importés : ${periods.map(p => `<span class="cpam-period-tag${p === cur ? ' active' : ''}">${p}</span>`).join(' ')}</div>` : ''}
        <div class="cpam-admin-actions">
          <input type="file" id="${importId}" accept=".xlsx,.xml,.csv,.txt" class="cpam-file-input">
          <button type="button" class="secondary" data-cpam-import="${m.id}">📥 Importer ${cur}</button>
          ${list ? `<button type="button" class="secondary" data-cpam-delete="${m.id}" data-cpam-period="${cur}">🗑 Supprimer ${cur}</button>` : ''}
        </div>
      </div>`;
    }).join('');
  const sel = document.getElementById('cpam-period-select');
  if (sel) sel.addEventListener('change', () => { window._cpamPeriod = sel.value; renderCpamAdmin(); });
}

function renderCpamProgress() {
  const panel = document.getElementById('cpam-progress-panel');
  if (!panel) return;
  const store = cpamStore();
  const imported = CPAM_MODULES.filter(m => cpamPeriodsOf(store, m.id).length);
  if (!imported.length) {
    panel.innerHTML = '<div class="cpam-hint">Aucune liste CPAM importée. Importez vos listes trimestrielles (onglet « Listes CPAM ») pour visualiser la progression de vos dépistages.</div>';
    return;
  }
  const year = new Date().getFullYear();
  const rows = imported.map(m => {
    const periods = cpamPeriodsOf(store, m.id).filter(p => p);
    const latestP = periods[periods.length - 1];
    const list = cpamGetList(store, m.id, latestP);
    const prevList = periods.length > 1 ? cpamGetList(store, m.id, periods[periods.length - 2]) : null;
    const total = list.rows.length;
    const done = cpamCount(list, 'fait');
    const todo = cpamCount(list, 'a verifier');
    const exclu = cpamCount(list, 'exclu');
    const act = total - exclu;
    const pct = act > 0 ? Math.round(done / act * 100) : 0;
    let delta = '';
    if (prevList) {
      const prevExclu = cpamCount(prevList, 'exclu');
      const prevAct = prevList.rows.length - prevExclu;
      const prevPct = prevAct > 0 ? Math.round(cpamCount(prevList, 'fait') / prevAct * 100) : 0;
      const d = pct - prevPct;
      delta = ` <span class="cpam-delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '▲ +' + d : d < 0 ? '▼ ' + d : '＝'} vs ${periods[periods.length - 2]}</span>`;
    }
    return `<div class="cpam-prog-row">
      <div class="cpam-prog-label">${m.icon} ${escapeHtml(m.label)} <span class="cpam-prog-period">${latestP || '—'}</span></div>
      <div class="progress"><div class="cpam-prog-fill" style="width:${pct}%"></div></div>
      <div class="cpam-prog-num"><strong>${pct} %</strong> (${done}/${act})${delta}</div>
      <div class="cpam-prog-detail">${done} faits · ${todo} à vérifier · ${exclu} exclus · total ${total}</div>
    </div>`;
  }).join('');
  const totals = imported.map(m => {
    const periods = cpamPeriodsOf(store, m.id).filter(p => p);
    const list = cpamGetList(store, m.id, periods[periods.length - 1]);
    return { done: cpamCount(list, 'fait'), act: list.rows.length - cpamCount(list, 'exclu') };
  }).reduce((a, b) => ({ done: a.done + b.done, act: a.act + b.act }), { done: 0, act: 0 });
  const globalPct = totals.act ? Math.round(totals.done / totals.act * 100) : 0;
  panel.innerHTML = `<div class="cpam-prog-global">Progression globale ${year} (dernier trimestre importé par dépistage) : <strong>${globalPct} %</strong> (${totals.done}/${totals.act} dépistages réalisés hors exclus)</div>` + rows +
    '<div class="cpam-hint">Chaque nouvel import trimestriel (onglet « Paramétrage ») enrichit l\u2019historique : l\u2019évolution « ▲/▼ vs trimestre précédent » apparaît automatiquement.</div>';
}

function cpamHandleFile(input, moduleId) {
  const file = input.files && input.files[0];
  if (!file) { alert('Choisissez d\u2019abord un fichier XML téléchargé depuis ameli pro.'); return; }
  const period = window._cpamPeriod || cpamCurrentPeriod();
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const rows = await cpamParseAny(file);
      const n = cpamImportRows(moduleId, period, rows);
      const label = CPAM_MODULES.find(m => m.id === moduleId).label;
      alert(`Liste « ${label} » — trimestre ${period} importée : ${n} patients.\nLa liste ${period} remplace la précédente pour ce trimestre.`);
      renderCpamAdmin();
      renderCpamProgress();
      renderCpamPatient();
    } catch (err) {
      alert('Import impossible : ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

document.addEventListener('click', e => {
  const imp = e.target.closest('button[data-cpam-import]');
  if (imp) {
    const moduleId = imp.dataset.cpamImport;
    const input = document.getElementById('cpam-file-' + moduleId);
    if (input && input.files && input.files.length) cpamHandleFile(input, moduleId);
    else if (input) input.click();
    return;
  }
  const del = e.target.closest('button[data-cpam-delete]');
  if (del) {
    const moduleId = del.dataset.cpamDelete;
    const period = del.dataset.cpamPeriod || window._cpamPeriod || cpamCurrentPeriod();
    const label = CPAM_MODULES.find(m => m.id === moduleId).label;
    if (confirm(`Supprimer la liste « ${label} » — trimestre ${period} ?`)) {
      cpamDeleteModule(moduleId, period);
      renderCpamAdmin();
      renderCpamProgress();
      renderCpamPatient();
    }
  }
});
document.addEventListener('change', e => {
  if (e.target.matches('input.cpam-file-input')) {
    const row = e.target.closest('[data-cpam-module]');
    if (row && e.target.files && e.target.files.length) cpamHandleFile(e.target, row.dataset.cpamModule);
  }
});

function updateSummary(pedia) {
  const all = ALL_GROUPS.flatMap(g => g.exams).filter(e => !(e.hideIf && e.hideIf(P())));
  const todo = all.filter(e => examState(e).indicated && !doneExams[e.id]);
  const doneCount = all.filter(e => examState(e).indicated && doneExams[e.id]).length;

  const list = document.getElementById('todo-list');
  list.innerHTML = '';
  if (pedia) {
    document.getElementById('todo-count').textContent = '—';
    document.getElementById('progress-info').textContent = 'Suivi pédiatrique — modules adultes masqués';
    return;
  }
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

function examLetter(examId, p, cvr, tg, motifs) {
  const req = [];
  const exam = ALL_GROUPS.flatMap(g => g.exams).find(x => x.id === examId);
  const label = exam ? exam.title.split(' (')[0] : examId;
  req.push('- ' + label + (motifs ? ' (' + motifs + ')' : ''));
  if (examId === 'tsa' || examId === 'aomi' || examId === 'aaa' || examId === 'ecg') {
    const fr = [];
    if (p.tabac === 'actif') fr.push('tabagisme actif' + (p.pa ? ' (' + p.pa + ' PA)' : ''));
    else if (p.tabac === 'sevré') fr.push('tabagisme sevré' + (p.pa ? ' (' + p.pa + ' PA)' : ''));
    if (p.hta) fr.push('HTA');
    if (p.diabete) fr.push('diabète de type 2');
    if (p.ldl !== null) fr.push('dyslipidémie (LDL-C ' + p.ldl + ' g/L)');
    if (p.imc !== null && p.imc >= 25) fr.push('IMC ' + p.imc + ' kg/m²');
    if (fr.length) req.push('Facteurs de risque cardiovasculaire : ' + fr.join(', ') + '.');
    if (cvr && cvr.result) req.push('Risque cardiovasculaire (SCORE2) : ' + cvr.result.pct.toFixed(1).replace('.', ',') + ' % à 10 ans — ' + cvr.result.cat.label.toLowerCase() + '.');
    if (cvr && cvr.hasTerrain) req.push('Terrain cardiovasculaire connu : prévention secondaire.');
    if (tg) req.push('Cible LDL-C : ' + tg.label + '.');
  }
  if (examId === 'osteo') {
    if (p.sex === 'F' && p.age !== null && p.age >= 50) req.push('Femme ménopausée de ' + p.age + ' ans.');
    if (p.imc !== null && p.imc < 19) req.push('IMC ' + p.imc + ' kg/m².');
    req.push('Recherche d’une ostéoporose selon les critères HAS / Assurance Maladie (remboursable 70 %).');
  }
  if (examId === 'bpco' || examId === 'poumon') {
    if (p.tabac === 'actif') req.push('Tabagisme actif' + (p.pa ? ' (' + p.pa + ' PA)' : '') + '.');
    else if (p.tabac === 'sevré') req.push('Tabagisme sevré' + (p.pa ? ' (' + p.pa + ' PA)' : '') + '.');
  }
  if (examId === 'foei' && p.diabete) req.push('Diabète de type 2 connu — dépistage annuel de la rétinopathie diabétique.');
  if (examId === 'aomi' && p.diabete) req.push('Diabète de type 2 — dépistage de l’artériopathie (IPS).');
  if (examId === 'ccr' || examId === 'mammo' || examId === 'frottis') req.push('Dépistage organisé / indication selon le calendrier national.');
  if (p.dfg !== null && p.dfg < 60) req.push('Fonction rénale : DFG ' + p.dfg + ' mL/min/1,73 m².');
  return req.join('\n');
}

function copyLetter(examId, motif) {
  const p = P();
  const cvr = cvrCompute(p);
  const tg = ldlTarget(p, cvr);
  const motifs = motif || (document.querySelector('.todo-collapse[data-todo-exam="' + examId + '"] .todo-detail-label:not(.off)')?.textContent || '').trim();
  const txt = examLetter(examId, p, cvr, tg, motifs);
  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.querySelector('button[data-letter="' + examId + '"]');
    if (btn) {
      const old = btn.textContent;
      btn.textContent = '\u2713 Copi\u00e9';
      setTimeout(() => { btn.textContent = old; }, 1500);
    }
  });
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
            <button class="todo-letter" data-letter="${exam.id}" title="Copier un courrier d'adressage" data-motif="${escapeHtml(st.checked.map(i => i.label).join(' ; '))}">\u2709</button>
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
  const cp = e.target.closest('[data-copy-id]');
  if (cp) {
    e.stopPropagation();
    const txt = (window._copyTexts || {})[cp.dataset.copyId] || '';
    if (txt) navigator.clipboard.writeText(txt).then(() => {
      cp.classList.add('copied');
      cp.textContent = '✓';
      setTimeout(() => { cp.classList.remove('copied'); cp.textContent = '⧉'; }, 1500);
    });
    return;
  }
  const kdHead = e.target.closest('[data-kdigo-toggle]');
  if (kdHead) { window._kdigoOpen = !window._kdigoOpen; render(); return; }
  const dmHead = e.target.closest('[data-dm-toggle]');
  if (dmHead) { window._dmOpen = !window._dmOpen; render(); return; }
  const dmInfo = e.target.closest('[data-dm-info]');
  if (dmInfo) { window._dmInfoPieds = !window._dmInfoPieds; render(); return; }
  const dmInfoClose = e.target.closest('[data-dm-info-close]');
  if (dmInfoClose) { window._dmInfoPieds = false; render(); return; }
  const pnav = e.target.closest('button[data-pedia-month]');
  if (pnav) {
    window._pediaMonth = pnav.dataset.pediaMonth === 'auto' ? null : +pnav.dataset.pediaMonth;
    render();
    return;
  }
  const btn = e.target.closest('button[data-done]');
  if (btn) {
    doneExams[btn.dataset.done] = btn.dataset.st || 'fait';
    render();
    return;
  }
  const letter = e.target.closest('button[data-letter]');
  if (letter) {
    copyLetter(letter.dataset.letter, letter.dataset.motif || '');
    return;
  }
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

document.addEventListener('change', e => {
  if (e.target.closest('#diabete-panel input[type=checkbox]')) render();
});

['pat-nom', 'pat-prenom', 'pat-age', 'pat-sex', 'pat-tabac', 'pat-pa', 'pat-diabete', 'pat-hta', 'pat-ic', 'pat-dfg', 'pat-rac', 'pat-imc', 'pat-ldl', 'pat-sbp', 'pat-chol', 'pat-hdl', 'pat-hba1c', 'pat-age-mois'].forEach(idn =>
  document.getElementById(idn).addEventListener('change', render));

document.getElementById('pat-date').value = new Date().toISOString().slice(0, 10);

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Réinitialiser les coches ?')) {
    Object.keys(overrides).forEach(k => delete overrides[k]);
    Object.keys(doneExams).forEach(k => delete doneExams[k]);
    Object.keys(dmChecks).forEach(k => delete dmChecks[k]);
    render();
  }
});
const DM_CHECK_IDS = [...DM_MICRO, ...DM_MACRO, ...DM_SUIVI].map(c => c.id);
const dmChecks = {};
const readDmChecks = () => { DM_CHECK_IDS.forEach(id => { dmChecks[id] = !!document.getElementById(id)?.checked; }); };

document.getElementById('btn-save').addEventListener('click', () => {
  const data = {
    patient: {
      nom: document.getElementById('pat-nom').value,
      prenom: document.getElementById('pat-prenom').value,
      age: document.getElementById('pat-age').value,
      ageMois: document.getElementById('pat-age-mois').value,
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
      sbp: document.getElementById('pat-sbp').value,
      chol: document.getElementById('pat-chol').value,
      hdl: document.getElementById('pat-hdl').value,
      hba1c: document.getElementById('pat-hba1c').value,
      date: document.getElementById('pat-date').value,
    },
    overrides,
    doneExams,
    dmChecks
  };
  localStorage.setItem('depistage-last', JSON.stringify(data));
  alert('Sauvegardé (stockage local du navigateur).');
});

document.getElementById('btn-load').addEventListener('click', () => {
  const raw = localStorage.getItem('depistage-last');
  if (!raw) { alert('Aucune sauvegarde trouvée.'); return; }
  const data = JSON.parse(raw);
  document.getElementById('pat-nom').value = data.patient?.nom || data.patient?.name || '';
  document.getElementById('pat-prenom').value = data.patient?.prenom || '';
  document.getElementById('pat-age').value = data.patient?.age || '';
  document.getElementById('pat-age-mois').value = data.patient?.ageMois || '';
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
  document.getElementById('pat-sbp').value = data.patient?.sbp || '';
  document.getElementById('pat-chol').value = data.patient?.chol || '';
  document.getElementById('pat-hdl').value = data.patient?.hdl || '';
  document.getElementById('pat-hba1c').value = data.patient?.hba1c || '';
  document.getElementById('pat-date').value = data.patient?.date || new Date().toISOString().slice(0, 10);
  Object.keys(overrides).forEach(k => delete overrides[k]);
  Object.assign(overrides, data.overrides || {});
  Object.keys(doneExams).forEach(k => delete doneExams[k]);
  Object.assign(doneExams, data.doneExams || {});
  Object.keys(dmChecks).forEach(k => delete dmChecks[k]);
  Object.assign(dmChecks, data.dmChecks || {});
  render();
});

// ---------- Fiches info patient ----------
const PATIENT_SHEETS = [
  { id: 'goutte', cat: 'Rhumatologie', title: 'La crise de goutte', tags: 'goutte crise uricémie acide urique orteil podagre colchicine allopurinol tophi', intro: 'La crise de goutte est une inflammation brutale et douloureuse d’une articulation, due à un dépôt d’acide urique. La goutte touche 1 % des hommes dans les pays développés. Elle est rare chez la femme. Elle atteint le plus souvent le gros orteil mais peut toucher aussi le cou-de-pied, la cheville, le genou, les doigts ou le coude.', sections: [
    ['Les signes', 'Une douleur brutale survient, souvent la nuit. Elle est intolérable et donne des lancées. Rapidement, l’articulation gonfle, devient rouge, luisante, très douloureuse au toucher et impossible à bouger. Juste avant la crise, on éprouve parfois un malaise général, des troubles digestifs, des fourmillements de cette articulation. Une fièvre, parfois élevée, est fréquente.'],
    ['Le diagnostic', 'Si la ponction de l’articulation est possible au moment de la crise, elle permet de voir les cristaux d’acide urique et de confirmer le diagnostic. Une ponction peut parfois être réalisée à distance sur une autre articulation ou sur des tophis (des dépôts d’acide urique sous la peau).'],
    ['Les causes', 'La goutte survient chez des sujets dont le taux sanguin d’acide urique est trop élevé. Cet excès a souvent pour origine : une production excessive par l’organisme ; des excès alimentaires (trop de protéines) ; un défaut d’élimination par le rein. Parfois, l’excès d’acide urique est lié à une autre maladie (diabète, excès de lipides, problème de thyroïde) ou à la prise de certains médicaments (chimiothérapie, diurétiques, aspirine), ou à une intoxication (plomb).'],
    ['Les facteurs favorisants', 'Certaines personnes ont un risque augmenté de faire une goutte : obèse, diabétique, hypertendu, alcoolique, insuffisant rénal, coronarien ou dyslipidémique. La crise peut être déclenchée par : un excès alimentaire ou alcoolique, certains aliments, le jeûne complet, un traumatisme ou un surmenage de l’articulation, une intervention chirurgicale, une autre maladie associée, certains médicaments.'],
    ['Les complications', 'Sous la peau : des grosseurs (les tophis) peuvent gêner les mouvements et s’ulcérer. Des douleurs articulaires chroniques. Dans les voies urinaires : des calculs bouchent les voies urinaires et, à long terme, abîment les reins.'],
    ['Le traitement de la crise', 'Colchicine, anti-inflammatoires non stéroïdiens (en l’absence de contre-indication), antalgiques. Repos de l’articulation, application de glace. Boire 2–3 L d’eau alcaline (type Vichy Saint-Yorre). Ne pas consommer de boissons alcoolisées (bière, vin…). Parfois, ponction à l’aiguille de l’articulation pour une aspiration intra-articulaire, éventuellement associée à une infiltration de corticoïdes.'],
    ['Le traitement préventif au quotidien', 'Il n’est proposé qu’en cas de crises de goutte fréquentes, de coliques néphrétiques associées, de tophis, de lésions articulaires ou de taux d’acide urique très élevé. L’allopurinol réduit la production d’acide urique par l’organisme. Il interagit avec d’autres médicaments (pénicillines, anticoagulants type anti-vitamine K), ce qui nécessite une vigilance. Il peut déclencher des crises lors de l’introduction.'],
    ['Aliments à éviter', 'Certaines viandes (abats, gibiers), les crustacés et poissons gras, les champignons et surtout l’excès d’alcool, les sodas.'],
    ['Quand reconsulter ?', 'En cas de fièvre persistante ou si les signes persistent malgré le traitement ; en cas de douleurs dans les reins ou si vous urinez du sang.'],
  ]},
  { id: 'hta', cat: 'Cardiologie', title: 'L’hypertension artérielle', tags: 'hta tension artérielle pas sel régime sport', intro: 'Votre tension artérielle est élevée. Elle ne fait pas mal, mais elle abîme silencieusement le cœur, le cerveau, les reins et les yeux. La traiter, c’est prévenir l’AVC et l’infarctus.', sections: [
    ['Objectif', 'Tension < 140/90 mmHg en consultation (parfois < 130/80 selon votre profil). Mesurez aussi à domicile, matin et soir, 3 jours de suite, au calme après 5 min de repos : moyenne domiciliaire < 135/85.'],
    ['Hygiène de vie : le 1er traitement', 'Réduire le sel (< 5–6 g/jour : attention au pain, fromage, plats préparés), activité physique 30 min/jour (marche rapide), perte de poids si excès, limiter l’alcool, arrêter le tabac, légumes et fruits à chaque repas.'],
    ['Les médicaments', 'Ils se prennent tous les jours, sans arrêt, même si vous vous sentez bien. Ne stoppez jamais seul : une tension qui remonte ne se sent pas pas. Plusieurs classes existent (diurétique, IEC/ARA2, inhibiteur calcique) ; l’objectif compte plus que le médicament.'],
    ['Surveillance', 'Tous les 3–6 mois : tension, poids, prise de sang (créatinine, potassium, sucre, lipides). Autosurveillance tensionnelle à domicile à noter dans un carnet.'],
  ]},
  { id: 'dt2', cat: 'Endocrinologie', title: 'Le diabète de type 2', tags: 'diabète sucre hba1c glycémie régime insuline', intro: 'Votre taux de sucre dans le sang est trop élevé. Bien équilibré, le diabète de type 2 permet une vie normale et prévient les complications.', sections: [
    ['Objectif', 'HbA1c (hémoglobine glyquée) < 7 % en général, personnalisé selon votre âge et vos traitements. Elle reflète la moyenne de vos sucres des 3 derniers mois.'],
    ['Alimentation et activité', 'Réduire sucres rapides (sodas, jus, confiseries), féculents en quantité raisonnable, privilégier légumes et fibres. Activité physique 30 min/jour (la marche muscle et fait baisser le sucre). Perte de poids de 5–10 % si excès : souvent très efficace sur le diabète.'],
    ['Traitements', 'Comprimés (metformine en 1re intention), parfois autres classes (réduisent aussi le risque cardiovasculaire) ou insuline si besoin. Prenez-les régulièrement ; en cas de jeûne ou de maladie avec peu mangé, prévenez votre médecin.'],
    ['Surveillance', 'HbA1c tous les 3–6 mois ; 1 fois/an : fond d’œil, bilan rénal (créatinine, albumine), bilan lipidique, dépistage du pied (sensibilité), vaccin grippe. Dents : contrôle annuel.'],
  ]},
  { id: 'sevrage-tabac', cat: 'Addictologie', title: 'Arrêter de fumer', tags: 'tabac sevrage cigarette nicotine patch substitution', intro: 'Arrêter le tabac est le geste le plus profitable pour votre santé : bénéfice cardiovasculaire dès les premières semaines, gain d’espérance de vie de plusieurs années. Vous n’avez pas à y arriver seul.', sections: [
    ['Pourquoi arrêter', 'Risque d’infarctus divisé par 2 dès la 1re année, risque de cancer du poumon qui baisse fortement après 10 ans, souffle et goût améliorés en quelques semaines, économies substantielles.'],
    ['Les méthodes qui marchent', 'Substituts nicotiniques (patch + formes orales : doublent les chances), accompagnement médical, et si besoin varénicine ou buprénorphine. Le combo substituts + suivi est le plus efficace. Choisissez une date d’arrêt et annoncez-la.'],
    ['Gérer les envies', 'Une envie dure 3–5 min : boire de l’eau, marcher, respirer profondément. Éviter café/alcool les premières semaines, demander à l’entourage de ne pas fumer devant vous. Les envies espacent puis disparaissent.'],
    ['Si ça recommence', 'Une rechute n’est pas un échec : c’est une étape. La plupart des ex-fumeurs ont fait plusieurs tentatives. On réanalyse ce qui a déclenché la reprise et on repart, souvent avec un traitement ajusté.'],
  ]},
  { id: 'anticoagulant', cat: 'Cardiologie', title: 'Les anticoagulants (AVK/AOD)', tags: 'anticoagulant avk aod warfarine rivaroxaban inr fibrillation', intro: 'Votre traitement anticoagulant fluidifie le sang pour prévenir la formation de caillots (AVC, phlébite). Bien pris, il est très efficace ; mal pris, il peut être dangereux.', sections: [
    ['Pourquoi ce traitement', 'En cas de fibrillation auriculaire, de phlébite, d’embolie pulmonaire ou de prothèse valvulaire, un caillot peut se former et provoquer un AVC ou une embolie. L’anticoagulant empêche le sang de coaguler à mauvais escient.'],
    ['AVK (Fluidione, warfarine…) : l’INR compte', 'Prise de sang régulière (INR) : cible généralement 2–3. Ne changez jamais la dose seul. Aliments riches en vitamine K (chou, épinards, brocoli) : les consommer est possible mais de façon régulière, sans excès ni arrêt brutal.'],
    ['AOD (Xarelto, Eliquis, Pradaxa…) : l’heure compte', 'À heure fixe chaque jour. Pas de surveillance sanguine de routine mais une prise de sang rénales annuelle. En cas de saignement inhabituel (gencives, urines, selles noires), appelez votre médecin.'],
    ['Signaux d’alerte', 'Saignements qui ne s’arrêtent pas, selles noires, urines rouges, hématomes spontanés, maux de tête brutaux, fatigue inhabituelle : contactez rapidement. Avant tout soin dentaire ou chirurgie, prévenez : anticoagulant à gérer. Ne prenez jamais d’aspirine ou d’anti-inflammatoire sans avis.'],
  ]},
  { id: 'aplv', cat: 'Pédiatrie', title: 'Allergie aux protéines du lait de vache (APLV)', tags: 'aplv allergie lait bébé colite eczéma hydrolysat', intro: 'Votre bébé est peut-être allergique aux protéines du lait de vache. C’est l’allergie la plus fréquante du nourrisson ; elle guérit dans la grande majorité des cas avant 1–2 ans.', sections: [
    ['Qu’est-ce que c’est ?', 'Le système immunitaire du bébé réagit aux protéines du lait de vache. Signes possibles : vomissements, diarrhée, sang dans les selles, eczéma, pleurs après les biberons, cassure de croissance.'],
    ['Le traitement : l’éviction', 'Retirer totalement le lait de vache 2 à 4 semaines : lait à hydrolysat de protéines prescrit par votre médecin. Si l’allaitement maternel se poursuit, la maman supprime les produits laitiers (calcium substitué).'],
    ['Le test de réintroduction', 'Après l’éviction, on réintroduit le lait de vache en consultation : si les signes reviennent, le diagnostic est confirmé et l’éviction se poursuit. Ce test est indispensable avant de conclure.'],
    ['Évolution', '80 % des enfants guérissent vers 1 an. La réintroduction se fait progressivement, sous suivi médical, souvent à partir de 9–12 mois. Ne supprimez jamais d’aliment au long cours sans avis médical.'],
  ]},
  { id: 'diversification', cat: 'Pédiatrie', title: 'La diversification alimentaire', tags: 'diversification bébé 4 mois 6 mois alimentation lait', intro: 'À partir de 4–6 mois, votre bébé découvre les aliments, en plus du lait qui reste son aliment principal jusqu’à 1 an.', sections: [
    ['Quand commencer ?', 'Entre 4 et 6 mois révolus, jamais avant 4 mois : fenêtre idéale d’acceptation. Un bébé prêt tient sa tête, s’intéresse à l’assiette des grands et a perdu le réflexe de protrusion de la langue.'],
    ['Comment introduire', 'Légumes puis fruits, 2–3 cuillères à café, puis on augmente progressivement. Un nouvel aliment à la fois, espacé de quelques jours. Le lait reste majoritaire (≥ 500 mL/jour) : on ne remplace pas les biberons d’un coup.'],
    ['Ce qu’il ne faut JAMAIS', 'Miel avant 1 an (botulisme), lait de vache seul avant 1 an, aliments durs et ronds (fruits à coque entiers avant 4 ans, raisins coupés en 2), sel, sucres ajoutés, jus de fruits avant 1 an.'],
    ['Les protéines : peu et pas trop tôt', 'Viande/poisson : 5–10 g vers 6–7 mois, 10 g vers 8 mois, 20 g vers 9–12 mois (l’équivalent d’1/2 œuf). Pas besoin de protéines en excès : elles surchargent les reins du bébé.'],
  ]},
  { id: 'bronchiolite', cat: 'Pédiatrie', title: 'La bronchiolite', tags: 'bronchiolite bébé toux sifflement virus vrs kinésithérapie', intro: 'La bronchiolite est une infection virale fréquente du nourrisson, très gênante mais le plus souvent bénigne. Voici les repères pour la maison et pour savoir quand consulter.', sections: [
    ['C’est quoi ?', 'Un virus (VRS le plus souvent) encombre les petites bronches du bébé : toux, sifflements, respiration rapide, nez qui coule, fièvre modérée. Ça dure 8–10 jours, souvent un peu plus la nuit.'],
    ['À la maison', 'Lavage de nez au sérum physiologique AVANT les repas (aussi souvent que nécessaire), fractionner les biberons (moitié plus souvent), position légèrement proclive, aérer la chambre, ne pas fumer à la maison. Hydratation indispensable.'],
    ['Signes pour consulter en urgence', 'Respiration très rapide ou sifflante gênante, tirage (creux entre les côtes), apnées, refus total du biberon, pâleur, somnolence inhabituelle, moins de 3 couches mouillées/jour. Chez le < 3 mois : toute gêne respiratoire impose une consultation rapide.'],
    ['Traitements', 'Aucun médicament n’est nécessaire dans la majorité des cas : ni antibiotique (c’est un virus), ni sirop contre-indiqué avant 2 ans. La kinésithérapie respiratoire n’est plus systématique : elle est décidée par le médecin.'],
  ]},
  { id: 'vaccins-enfant', cat: 'Pédiatrie', title: 'Les vaccins de bébé (calendrier 2025)', tags: 'vaccins bébé calendrier hexavalent ror méningocoque bexsero', intro: 'Voici le calendrier vaccinal de votre enfant né en 2025. Les vaccins protègent contre des maladies graves et sont obligatoires pour la collectivité (crèche, école).', sections: [
    ['Les rendez-vous', '2 mois : hexavalent 1 + pneumocoque 1 + rotavirus 1 · 3 mois : méningocoque B 1 · 4 mois : hexavalent 2 + pneumocoque 2 + rotavirus 2 · 5 mois : méningocoque B 2 · 6 mois : méningocoque ACWY 1 · 11 mois : hexavalent 3 + pneumocoque 3 · 12 mois : méningocoque B 3 + ACWY 2 + ROR 1 · 16–18 mois : ROR 2.'],
    ['Ces vaccins protègent de quoi ?', 'L’hexavalent : diphtérie, tétanos, polio, coqueluche, Hib, hépatite B. Le pneumocoque : méningites et pneumonies. Les méningocoques B et ACWY : méningites graves. Le ROR : rougeole, oreillons, rubéole. Le rotavirus : gastro-entérites sévères (recommandé).'],
    ['Et après ?', 'Rappels dTP à 6 ans puis 11–13 ans, coqueluche à 11–13 ans, HPV à 11–14 ans (filles et garçons). Le carnet de santé est le document de référence : apportez-le à chaque consultation.'],
    ['Effets secondaires', 'Fièvre modérée, rougeur ou grosseur à la piqûre pendant 24–48 h : banal. Paracétamol si besoin. Signaux plus rares (fièvre > 39 °C, éruption) : appelez votre médecin.'],
  ]},
  { id: 'constipation-enfant', cat: 'Pédiatrie', title: 'Constipation de l’enfant', tags: 'constipation enfant selles macrogol encoprésie', intro: 'La constipation de l’enfant est fréquente et se soigne bien. La règle d’or : ne pas laisser s’installer un cercle de douleur et de rétention.', sections: [
    ['Reconnaître', 'Selles dures, rares, douloureuses, parfois avec douleur au ventre ou fissure. Chez le nourrisson allaité : des selles rares mais molles sont souvent normales — la constipation, c’est des selles DURES.'],
    ['Premières mesures', 'Chez le nourrisson : masser le ventre, pédaler les jambes, bien réhydrater, laits adaptés si besoin. Chez le grand : eau, fruits/légumes, activité, temps aux toilettes après le repas sans stress, marchepied pour une bonne position.'],
    ['Le traitement médicamenteux', 'Macrogols (laxatifs osmotiques sans accoutumance) : efficaces et bien tolérés, à dose suffisante et suffisamment longtemps (souvent plusieurs mois). Ne jamais faire des lavements répétés sans avis.'],
    ['Encoprésie', 'Si des fuites de selles apparaissent dans les sous-vêtements : c’est souvent une constipation avec impaction (les selles liquides contournent le bouchon). Ce n’est pas de la « paresse » : traitement par déimpaction + éducation, avec suivi médical.'],
  ]},
  { id: 'ipo-omga', cat: 'ORL', title: 'Otite moyenne aiguë de l’enfant', tags: 'otite oreille enfant amoxicilline paracétamol ORL', intro: 'L’otite moyenne aiguë est très fréquente chez le jeune enfant. La plupart guérissent sans antibiotique : voici quand il en faut un et quoi faire à la maison.', sections: [
    ['Reconnaître', 'Fièvre, douleur d’oreille (enfant qui se tient l’oreille, pleure la nuit), nez qui coule. Chez le bébé : parfois seulement fièvre et irritabilité — l’examen du tympan par le médecin fait le diagnostic.'],
    ['Antibiotique ou pas ?', 'Après 2 ans, otite unilatérale sans gravité : paracétamol + surveillance 48–72 h suffisent souvent. Antibiotique (amoxicilline) si : enfant < 2 ans, otite bilatérale, fièvre élevée, douleur intense, otite qui traîne, ou échec de la surveillance.'],
    ['À la maison', 'Paracétamol régulier pour la douleur, lavage de nez au sérum physiologique, hydratation, position tête un peu relevée la nuit. Pas de gouttes auriculaires sans avis, pas d’anti-inflammatoires chez le jeune enfant sans prescription.'],
    ['Quand reconsulter', 'Si douleur qui persiste > 48–72 h, fièvre > 39 °C, écoulement de l’oreille (perforation : souvent soulagée après), ou enfant apathique. Otites à répétition (> 3 en 6 mois) : avis ORL pour vérifier l’audition.'],
  ]},
  { id: 'dmla', cat: 'Ophtalmologie', title: 'DMLA (dégénérescence maculaire)', tags: 'dmla œil vue maculaire lunettes injections', intro: 'La DMLA touche la macula, zone centrale de la rétine, après 50 ans. Le traitement des formes humides a transformé le pronostic : la précocité compte.', sections: [
    ['Les signes d’alerte', 'Lignes déformées (une porte ou un carrelage qui ondule), tache grise au centre de la vision, difficulté à lire d’un œil. Test simple à la maison : couvrir chaque œil et regarder une grille (grille d’Amsler) chaque semaine.'],
    ['Les deux formes', 'Sèche (atrophique) : évolution lente sur des années, surveillance + aides optiques. Humide (néovasculaire) : perte de vision rapide en semaines, traitée par injections intra-oculaires — efficace si débutée tôt.'],
    ['Facteurs de risque', 'Tabac (facteur majeur — arrêter ralentit l’évolution), âge, antécédents familiaux, alimentation pauvre en pigments (légumes verts, épinards, chou), cardiovasculaire. Une supplémentation est prescrite dans certaines formes intermédiaires.'],
    ['Suivi', 'Autosurveillance par grille d’Amsler chaque œil séparément, ophtalmologiste régulièrement, en urgence si déformation brutale des lignes.'],
  ]},
  { id: 'lombalgie', cat: 'Rhumatologie', title: 'Le lumbago (lombalgie aiguë)', tags: 'lumbago lombalgie dos sciatique anti-inflammatoire kiné', intro: 'Le lumbago est un blocage douloureux du dos très fréquent. Bonne nouvelle : dans l’immense majorité des cas, ça passe en quelques jours et l’activité est le meilleur traitement.', sections: [
    ['Ce qu’il faut faire', 'RESTER ACTIF autant que la douleur le permet : la marche est excellente, évitez seulement le lit et l’immobilité prolongée. Antalgiques réguliers (paracétamol, ± anti-inflammatoire selon votre profil), chaleur locale. Reprise du travail et des activités dès que possible.'],
    ['Combien de temps ?', 'La douleur aiguë diminue nettement en 4–6 jours et disparaît en 1–2 semaines dans la majorité des cas. Des récidives sont possibles : le renforcement musculaire (abdominaux, dos) et l’activité régulière les préviennent.'],
    ['Sciatique associée', 'Si la douleur descend dans la jambe avec fourmillements ou engourdissement : c’est souvent une sciatique par hernie discale. Elle guérit dans 90 % des cas sans chirurgie en quelques semaines, avec les mêmes consignes d’activité.'],
    ['Consultez en urgence si', 'Perte de force de la jambe ou du pied, troubles urinaires ou de la sensibilité des parties génitales (selle-miction), lombalgie brutale insomniante sans position antalgique, fièvre ou contexte de cancer : ces signes imposent une consultation sans délai.'],
  ]},
  { id: 'prevention-cardio', cat: 'Prévention', title: 'Prévenir l’infarctus et l’AVC', tags: 'prévention cardiovasculaire score2 cholestérol ldl statine', intro: 'Le risque cardiovasculaire (infarctus, AVC) se mesure et se réduit : tabac, tension, cholestérol, sucre et activité sont les 5 leviers principaux.', sections: [
    ['Connaître son risque', 'Votre médecin calcule votre risque (SCORE2) à partir de l’âge, du sexe, du tabac, de la tension et du cholestérol. Un risque élevé ne veut pas dire une maladie certaine, mais qu’il faut agir plus fort.'],
    ['Les 5 leviers', '1) Arrêter le tabac (le plus rentable) · 2) Tension < 140/90 · 3) Cholestérol selon risque : cible de LDL personnalisée · 4) Sucre et poids (HbA1c, tour de taille) · 5) Activité physique 150 min/semaine + alimentation méditerranéenne.'],
    ['Les médicaments', 'Statine si risque élevé ou LDL trop haut : elle protège à long terme (paroi des artères). Aspirine uniquement sur avis (jamais en automédication de prévention). Tous les traitements se prennent régulièrement, pas « quand ça va mal ».'],
    ['Suivi', 'Bilan annuel : tension, poids, bilan sanguin (sucre, lipides, créatinine), calcul du risque. Ne jamais arrêter un traitement de prévention sans avis : le risque, lui, ne s’arrête pas.'],
  ]},
  { id: 'apnee-sommeil', cat: 'Pneumologie', title: 'Apnées du sommeil (SAOS)', tags: 'apnées sommeil ronflements ppc fatigue', intro: 'Le syndrome d’apnées obstructives du sommeil (ronflements + pauses respiratoires + fatigue) est fréquent et se traite très bien.', sections: [
    ['Reconnaître', 'Ronflements forts, pauses respiratoires constatées par le/la partenaire, sommeil non réparateur, fatigue diurne, endormissements au volant, maux de tête matinaux, nycturie.'],
    ['Le diagnostic', 'Enregistrement du sommeil (polygraphie ventilatoire à domicile) prescrit par le médecin : il confirme l’apnée et son intensité. Toute somnolence au volant impose la recherche de SAOS.'],
    ['Le traitement', 'PPC (pression positive continue) : masque la nuit qui souffle pour ouvrir les voies aériennes — traitement de référence des formes modérées à sévères. Orthèse d’avancée mandibulaire dans certains cas. Perte de poids si excès, arrêt de l’alcool du soir et du tabac, sommeil régulier.'],
    ['Suivi', 'Perte de poids souvent très efficace, réévaluation du réglage du PPC, permis de conduire : déclaration selon somnolence.'],
  ]},
  { id: 'cerveau-bpc', cat: 'Pneumologie', title: 'La BPCO', tags: 'bpco bronchite chronique tabac souffle vems spirométrie', intro: 'La BPCO (bronchopneumopathie chronique obstructive) est un rétrécissement progressif des bronches, le plus souvent lié au tabac. Elle se dépiste tôt par une spirométrie et se traite.', sections: [
    ['Reconnaître', 'Toux chronique (souvent matinale), crachats, essoufflement progressif à l’effort (montée d’escaliers, marche rapide). « Je suis juste moins en forme » est souvent le premier signe.'],
    ['Dépistage et confirmation', 'Spirométrie (souffler dans un appareil) : confirme l’obstruction bronchique. À faire en cas de tabagisme ≥ 20 PA, ou symptômes chroniques, ou exposition professionnelle.'],
    ['Traitements', 'ARRÊT DU TABAC : seule la progression de la maladie. Bronchodilatateurs inhalés (à heure régulière, technique d’inhalation vérifiée à chaque consultation), réhabilitation respiratoire (programme d’exercice très efficace), vaccinations grippe + pneumocoque + COVID.'],
    ['Exacerbations', 'Crise de bronchite aiguë (essoufflement accru, crachats purulents) : consultation rapide, antibiotique ou corticoïdes selon les cas. Les exacerbations répétées abîment le poumon : chacune mérite un avis.'],
  ]},
];

const ficheDoc = f => `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${f.title} — Fiche info patient</title>
<style>
body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; color: #222; line-height: 1.55; }
h1 { font-size: 1.5rem; color: #0d5a8c; margin-bottom: 2px; }
.cat { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: #888; margin-bottom: 16px; }
.intro { background: #eaf5fd; border-left: 4px solid #0d5a8c; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; }
h2 { font-size: 1.1rem; color: #0d5a8c; margin: 20px 0 6px; }
p { margin: 6px 0; }
.foot { margin-top: 28px; padding-top: 10px; border-top: 1px solid #ddd; font-size: .75rem; color: #888; font-style: italic; }
@media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>${f.title}</h1>
<div class="cat">${f.cat} — Fiche d’information patient</div>
<div class="intro">${f.intro}</div>
${f.sections.map(([t, txt]) => `<h2>${t}</h2><p>${txt}</p>`).join('')}
<div class="foot">Document d’information délivré en consultation — ne remplace pas l’avis de votre médecin. Source : Depistage.</div>
</body>
</html>`;

function downloadFiche(f) {
  const blob = new Blob([ficheDoc(f)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fiche-' + f.id + '.html';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
}
function ficheSuggested(p) {
  const out = [];
  const seen = new Set();
  const add = id => { const f = PATIENT_SHEETS.find(x => x.id === id); if (f && !seen.has(id)) { seen.add(id); out.push(f); } };
  const isPedia = p.ageMois !== null && p.ageMois < 24;
  if (isPedia) {
    add('vaccins-enfant');
    add('diversification');
    if (p.ageMois >= 2 && p.ageMois <= 18) add('bronchiolite');
    if (p.ageMois >= 6) add('constipation-enfant');
    if (p.ageMois >= 6 && p.ageMois <= 24) add('ipo-omga');
    add('aplv');
  } else {
    if (p.tabac === 'actif') { add('sevrage-tabac'); add('cerveau-bpc'); add('apnee-sommeil'); }
    if (p.tabac === 'sevré') add('sevrage-tabac');
    if (p.diabete) add('dt2');
    if (p.hta) add('hta');
    if (p.imc !== null && p.imc >= 30) add('apnee-sommeil');
    if (p.age !== null && p.age >= 50) add('prevention-cardio');
    if (p.age !== null && p.age >= 55) add('dmla');
    if (p.age !== null && p.age >= 18 && p.age <= 65) add('lombalgie');
    if (p.diabete || p.hta || (p.age !== null && p.age >= 50)) add('anticoagulant');
  }
  return out;
}

function ficheCard(f) {
  return `<button type="button" class="fiche-card" data-fiche="${f.id}"><span class="fiche-cat">${escapeHtml(f.cat)}</span><span class="fiche-title">${escapeHtml(f.title)}</span><span class="fiche-action">⬇ Télécharger (fiche-${f.id}.html)</span></button>`;
}

function renderFiches() {
  const input = document.getElementById('fiche-search');
  const results = document.getElementById('fiche-results');
  const count = document.getElementById('fiche-count');
  const suggested = document.getElementById('fiche-suggested');
  if (!input || !results) return;

  const p = P();
  const sug = ficheSuggested(p);
  if (suggested) {
    suggested.innerHTML = sug.length
      ? `<div class="fiche-sug-title">💡 Suggérées pour ce patient (${sug.length})</div>` + sug.map(ficheCard).join('')
      : '<div class="fiche-empty">Renseignez le patient ci-dessus : les fiches adaptées à sa situation apparaîtront ici.</div>';
  }

  const q = (input.value || '').trim().toLowerCase();
  const match = f => f.title.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q) || f.tags.toLowerCase().includes(q);
  const list = PATIENT_SHEETS.filter(match);
  if (count) count.textContent = list.length ? list.length + ' fiche' + (list.length > 1 ? 's' : '') : '—';
  results.innerHTML = q
    ? (list.map(ficheCard).join('') || '<div class="fiche-empty">Aucune fiche pour cette recherche.</div>')
    : '';
}

document.addEventListener('toggle', e => {
  const det = e.target;
  if (det && det.closest && det.closest('#patient-info')) window._patientTouched = true;
}, true);
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'fiche-search') renderFiches();
});
document.addEventListener('click', e => {
  const btn = e.target.closest('button[data-fiche]');
  if (btn) {
    const f = PATIENT_SHEETS.find(x => x.id === btn.dataset.fiche);
    if (f) downloadFiche(f);
  }
});

// ---------- Fiche patient ----------
document.getElementById('btn-print').addEventListener('click', () => {
  const p = P();
  const nomRaw = (document.getElementById('pat-nom').value || '').trim();
  const prenomRaw = (document.getElementById('pat-prenom').value || '').trim();
  const name = [nomRaw, prenomRaw].filter(Boolean).join(' ') || '__________';
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

      ${(() => {
        if (!p.diabete) return '';
        const dms = dmStrategy(p, cvrCompute(p));
        const comp = dmComplications();
        const microTxt = comp.micro.map(c => c.label).join(', ');
        const macroTxt = comp.macro.map(c => c.label).join(', ');
        const suiviTodo = DM_SUIVI.filter(s => s.due(p) && !dmSuiviDone(s.id)).map(s => s.label);
        const hba1cTxt = p.hba1c === null ? 'à doser' : String(p.hba1c).replace('.', ',') + ' %';
        return `<div class="exam-box dm-doc-box">
          <div class="exam-title">🍪 Votre diabète — état des lieux</div>
          <table class="ind-table">
            <tr><th>Ce qui est recommandé</th><th>Pourquoi c'est utile pour vous</th></tr>
            <tr><td class="ind-label">HbA1c : ${escapeHtml(hba1cTxt)} — cible ${escapeHtml(dms ? dms.target : '< 7,0 %')}</td><td class="ind-why">L'HbA1c mesure l'équilibre du diabète sur 3 mois. Tenir la cible prévient les complications.</td></tr>
            ${microTxt || macroTxt ? `<tr><td class="ind-label">Complications connues : ${escapeHtml([microTxt, macroTxt].filter(Boolean).join(' ; '))}</td><td class="ind-why">Un suivi régulier de chaque complication protège les yeux, les reins, le cœur, les nerfs et les pieds.</td></tr>` : `<tr><td class="ind-label">Aucune complication connue à ce jour</td><td class="ind-why">Le dépistage annuel (fond d'œil, reins, pieds) permet de détecter tôt toute complication.</td></tr>`}
            ${suiviTodo.length ? `<tr><td class="ind-label">Suivi à planifier : ${escapeHtml(suiviTodo.join(', '))}</td><td class="ind-why">Ce sont les examens de routine recommandés chaque année pour le diabète.</td></tr>` : `<tr><td class="ind-label">Suivi annuel à jour</td><td class="ind-why">Continuez — à refaire chaque année.</td></tr>`}
          </table>
        </div>`;
      })()}
      ${todoCount ? `<div class="intro">Lors de la consultation, nous avons repéré <strong>${todoCount} dépistage${todoCount > 1 ? 's' : ''}</strong> à planifier pour votre santé. Voici la liste et la raison pour chacun.</div>`
        : '<div class="intro ok">Aucun dépistage supplémentaire n\'est nécessaire aujourd\'hui. Votre suivi est à jour — pensez aux prochains rendez-vous de routine.</div>'}

      ${examBlocks || ''}

      <p class="foot">Document remis en consultation — rappel des recommandations françaises de dépistage (HAS, dépistage organisé). Ne remplace pas l'avis médical.</p>
    </div>`;
  window.print();
});

// ---------- CPAM : dialogue ----------
function cpamOpenDialog(tab) {
  const dlg = document.getElementById('cpam-dialog');
  if (!dlg) return;
  dlg.classList.remove('hidden');
  cpamSetTab(tab || 'admin');
}
function cpamSetTab(tab) {
  const adminBtn = document.getElementById('cpam-tab-admin');
  const progBtn = document.getElementById('cpam-tab-progress');
  const adminPanel = document.getElementById('cpam-admin-panel');
  const progPanel = document.getElementById('cpam-progress-panel');
  const isAdmin = tab === 'admin';
  if (adminBtn) adminBtn.classList.toggle('active', isAdmin);
  if (progBtn) progBtn.classList.toggle('active', !isAdmin);
  if (adminPanel) adminPanel.classList.toggle('hidden', !isAdmin);
  if (progPanel) progPanel.classList.toggle('hidden', isAdmin);
  if (isAdmin) renderCpamAdmin(); else renderCpamProgress();
}
document.addEventListener('click', e => {
  if (e.target.closest('#btn-cpam-admin')) { cpamOpenDialog('admin'); return; }
  if (e.target.closest('#btn-cpam-progress')) { cpamOpenDialog('progress'); return; }
  if (e.target.closest('#cpam-dialog-close') || e.target.id === 'cpam-dialog') {
    document.getElementById('cpam-dialog').classList.add('hidden');
    return;
  }
  if (e.target.closest('#cpam-tab-admin')) { cpamSetTab('admin'); return; }
  if (e.target.closest('#cpam-tab-progress')) { cpamSetTab('progress'); }
});

// ---------- Coller les infos (volet de consultation) ----------
const PASTE_LABELS = [
  { id: 'pat-sbp', re: /pression art[ée]rielle systolique/i, kind: 'num' },
  { id: 'pat-ldl', re: /cholest[ée]rol ldl|\bldl/i, kind: 'num' },
  { id: 'pat-hdl', re: /cholest[ée]rol hdl|\bhdl/i, kind: 'num' },
  { id: 'pat-chol', re: /cholest[ée]rol total|^cholest[ée]rol$/im, kind: 'num' },
  { id: 'pat-hba1c', re: /h[ée]moglobine a1c|hba1c/i, kind: 'num' },
  { id: 'pat-dfg', re: /dfg/i, kind: 'num' },
  { id: 'pat-rac', re: /microalbuminurie\/cr[ée]atinine|prot[ée]ines urinaires\/cr[ée]atinine/i, kind: 'txt' },
  { id: 'pat-vems', re: /vems/i, kind: 'num' },
  { id: 'pat-exac', re: /exacerbat/i, kind: 'num' },
];
function parsePasteVolet(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim());
  const res = { filled: [], unknown: [] };
  const set = (id, val, label) => {
    const el = document.getElementById(id);
    if (!el || val === undefined || val === null || val === '') return;
    el.value = val;
    res.filled.push(label || id);
  };
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Civilité -> sexe
  const civ = lines.find(l => /^(monsieur|m\.|madame|mme|mlle)/i.test(l));
  if (civ) {
    const f = /madame|mme|mlle/i.test(civ);
    set('pat-sex', f ? 'F' : 'M', f ? 'Sexe : Femme' : 'Sexe : Homme');
  }
  // "H, xx/xx/xxxx (xx ans)" ou "F, ..." -> sexe + âge
  const birth = lines.find(l => /^[HF],[^\n]*\d{2}\//i.test(l));
  if (birth) {
    if (!civ) set('pat-sex', /^H/i.test(birth) ? 'M' : 'F', 'Sexe');
    const ageM = /(\d{1,3})\s*ans/i.exec(birth);
    if (ageM) set('pat-age', ageM[1], 'Âge : ' + ageM[1] + ' ans');
  }
  // NOM : ligne entièrement en majuscules (avec espaces/tirets), pas trop longue
  const nomCand = lines.find(l => l && l.length <= 40 && /^[A-ZÀ-Ü][A-ZÀ-Ü' -]+$/.test(l) && !/^(NOM|PRENOM|PRÉNOM|MT|ATCD|DCI|FOND|TABAC|POIDS|TAILLE|IMC|PAS|PAD|FC|TSH|ALAT|ASAT|GGT|CRP|DFG|TP|HÉMOGLOBINE|HEMOGLOBINE|PLAQUETTES|CHOLESTÉROL|CHOLESTEROL|FERRITINE|GLYCÉMIE|GLYCEMIE|TRIGLYCÉRIDES|TRIGLYCERIDES|PHOSPHATASES|POTASSIUM|SODIUM|SATURATION|TEMPÉRATURE|TEMPERATURE)$/.test(l));
  if (nomCand) set('pat-nom', nomCand, 'NOM : ' + nomCand);
  // Prénom : prochaine ligne non vide après le NOM, casse mixte (avec tirets/espaces)
  if (nomCand) {
    const idx = lines.indexOf(nomCand);
    for (let j = idx + 1; j < Math.min(idx + 4, lines.length); j++) {
      const preCand = lines[j];
      if (preCand && preCand.length <= 40 && /^[A-ZÀ-Ü][A-Za-zà-ü' -]+$/.test(preCand) && /[a-zà-ü]/.test(preCand)) {
        set('pat-prenom', preCand, 'Prénom : ' + preCand);
        break;
      }
      if (preCand) break; // première ligne non vide non conforme => pas un prénom
    }
  }
  // Tabac
  const tabLine = lines.find(l => /^tabac\b/i.test(l));
  if (tabLine) {
    const tail = norm(tabLine.replace(/^tabac\s*:?\s*/i, ''));
    let val = '', lbl = '';
    if (tail.startsWith('non')) { val = 'jamais'; lbl = 'Tabac : Non fumeur'; }
    else if (tail.includes('sevr') || tail.includes('ancien')) { val = 'sevré'; lbl = 'Tabac : Sevré'; }
    else if (tail.startsWith('oui')) { val = 'actif'; lbl = 'Tabac : Fumeur'; }
    set('pat-tabac', val, lbl);
  }
  // Poids / Taille -> IMC (IMC explicite du volet prioritaire)
  const imcM = /\(imc\)\s*([0-9]+([.,][0-9]+)?)|[\s:]([0-9]{1,2}[.,][0-9])\s*kg\/m2/i.exec(text);
  const poidsM = /^poids\s*$/im.exec(text) ? /(?:^poids\s*$[\s\S]*?)([0-9]+([.,][0-9]+)?)/im.exec(text) : /poids[\s:]*([0-9]+([.,][0-9]+)?)/i.exec(text);
  const tailleM = /taille[\s:]*([0-9]{2,3})(?![0-9])/i.exec(text);
  if (imcM) {
    const imcVal = (imcM[1] || imcM[3]).replace(',', '.');
    set('pat-imc', imcVal, 'IMC : ' + imcVal);
  } else if (poidsM && tailleM) {
    const kg = parseFloat(poidsM[1].replace(',', '.'));
    let cm = parseFloat(tailleM[1]);
    if (cm > 3) {
      const imc = Math.round(kg / Math.pow(cm / 100, 2) * 10) / 10;
      set('pat-imc', imc, 'IMC calculé : ' + imc + ' kg/m² (poids ' + kg + ' kg, taille ' + cm + ' cm)');
    }
  }
  // Labos / constantes : étiquette -> valeur sur la même ligne OU sur la prochaine ligne non vide
  PASTE_LABELS.forEach(({ id, re, kind }) => {
    const li = lines.findIndex(l => re.test(l));
    if (li === -1) return;
    let val = null;
    const m = re.exec(lines[li]);
    if (m) {
      const after = lines[li].slice(m.index + m[0].length);
      const vm = /(?<![A-Za-z0-9])([0-9]+([.,][0-9]+)?)(?![A-Za-z0-9])/.exec(after);
      if (vm) val = vm[1].replace(',', '.');
    }
    if (val === null) {
      for (let j = li + 1; j < Math.min(li + 4, lines.length); j++) {
        if (!lines[j]) continue;
        const vm = /^([0-9]+([.,][0-9]+)?)/.exec(lines[j]);
        if (vm) { val = vm[1].replace(',', '.'); break; }
        break; // ligne non vide non numérique => pas de valeur
      }
    }
    if (val !== null) {
      const lbl = document.querySelector('label:has(#' + id + ')')?.childNodes[0]?.textContent?.trim() || id;
      if (kind === 'num') set(id, val, lbl + ' : ' + val);
      else set(id, val, lbl + ' : ' + val);
    }
  });
  // Biologie non mappée à un champ : listée pour information
  const EXTRA_LABELS = [/ALAT/i, /ASAT/i, /GGT|gamma glutamyl/i, /potassium/i, /CRP|prot[ée]ine c r[ée]active/i, /sodium|natr[ée]mie/i, /TP\s*%|TP\b/i, /h[ée]moglobine(?!\s+a1c)/i, /phosphatases alcalines/i, /plaquettes/i, /ferritine/i, /glyc[ée]mie/i, /triglyc[ée]rides/i, /facteur v/i, /saturation de la transferrine/i, /TSH/i, /PAD|diastolique/i, /fr[ée]quence cardiaque|\bFC\b/i, /saturation en o2|oxym/i, /temp[ée]rature/i, /microalbuminurie\/cr[ée]atinine|prot[ée]ines urinaires/i];
  const knownIds = new Set(res.filled);
  EXTRA_LABELS.forEach(re => {
    const li = lines.findIndex(l => re.test(l) && l.length < 80);
    if (li !== -1) {
      const val = /([0-9]+([.,][0-9]+)?)/.exec(lines[li + 1] || '') || /([0-9]+([.,][0-9]+)?)/.exec(lines[li]);
      res.unknown.push(lines[li].replace(/\s+/g, ' ').slice(0, 50) + (val && val[1] ? ' : ' + val[1] : ''));
    }
  });
  // BPCO : antécédent -> champ ; facteurs de risque -> carte état des lieux
  const nText = norm(text);
  if (/\bbpco\b|bronchopneumopathie|emphyseme/.test(nText)) set('pat-bpco', 'oui', 'ATCD : BPCO');
  const bpcoFactors = [];
  [
    ['Toux chronique et/ou expectorations chroniques', /toux chronique|toux matinale|expectoration|crachat/],
    ['Dyspnée / essoufflement', /dyspnee|essoufflement|souffle court/],
    ['Sifflements', /sifflement|wheezing/],
    ['Bronchites / infections respiratoires à répétition', /bronchite|exacerbat/],
    ['Exposition professionnelle (poussières, fumées, solvants)', /poussiere|solvant|soudage|exposition professionnelle/],
  ].forEach(([label, re]) => { if (re.test(nText)) bpcoFactors.push(label); });
  window._bpcoHints = { factors: bpcoFactors };
  return res;
}
document.getElementById('btn-paste-toggle')?.addEventListener('click', () => {
  document.getElementById('paste-panel').classList.toggle('hidden');
});
document.getElementById('btn-paste-clear')?.addEventListener('click', () => {
  document.getElementById('paste-input').value = '';
  document.getElementById('paste-report').classList.add('hidden');
});
function pasteInjectFromText(text) {
  const res = parsePasteVolet(text);
  const report = document.getElementById('paste-report');
  const filledHtml = res.filled.length
    ? '<div class="paste-ok">✅ Injecté : ' + res.filled.map(f => escapeHtml(f)).join(' · ') + '</div>'
    : '<div class="paste-ko">❌ Aucun champ reconnu — vérifiez que le volet est bien copié (NOM, prénom, « H, date (âge) », biologie…).</div>';
  const unknownHtml = res.unknown.length
    ? '<div class="paste-extra">ℹ️ Présents dans le volet mais sans champ dédié (informatif) : ' + res.unknown.map(f => escapeHtml(f)).join(' · ') + '</div>'
    : '';
  report.innerHTML = filledHtml + unknownHtml;
  report.classList.remove('hidden');
  render();
  return res;
}
document.getElementById('btn-paste-inject')?.addEventListener('click', () => {
  const text = document.getElementById('paste-input').value;
  if (!text.trim()) { alert('Collez d\u2019abord le contenu du volet de consultation dans la zone de texte.'); return; }
  pasteInjectFromText(text);
});
// Détection « ce texte ressemble à un volet de consultation »
function pasteLooksLikeVolet(text) {
  const t = String(text || '');
  if (t.trim().length < 20) return false;
  let score = 0;
  if (/^(monsieur|madame|m\.|mme)/im.test(t)) score += 2;
  if (/^[HF],[^\n]*\(\s*\d{1,3}\s*ans\s*\)/im.test(t)) score += 2;
  if (/^(imc|indice de masse corporelle)/im.test(t)) score += 1;
  if (/pression art[ée]rielle systolique|\bpas\b/im.test(t)) score += 1;
  if (/cholest[ée]rol|\b(ldl|hdl)\b/im.test(t)) score += 1;
  if (/\bdfg\b|ckd-epi/im.test(t)) score += 1;
  if (/h[ée]moglobine a1c|hba1c/im.test(t)) score += 1;
  if (/^tabac\s*:/im.test(t)) score += 1;
  if (/^poids/im.test(t) && /^taille/im.test(t)) score += 1;
  return score >= 3;
}
// Mode automatique : Ctrl+V n'importe où sur la page (hors champ de saisie) injecte le volet
window.addEventListener('paste', e => {
  if (e.target && e.target.closest && (e.target.closest('input, textarea, select, [contenteditable]') || e.target.closest('#paste-modal'))) return;
  const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
  if (!text.trim()) return;
  if (!pasteLooksLikeVolet(text)) return; // collage ordinaire : on ne touche à rien
  e.preventDefault();
  document.getElementById('paste-panel').classList.remove('hidden');
  pasteInjectFromText(text);
});
function pasteOpenModal() {
  const modal = document.getElementById('paste-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  const ta = document.getElementById('paste-modal-input');
  if (ta) { ta.value = ''; setTimeout(() => ta.focus(), 50); }
}
function pasteCloseModal() {
  document.getElementById('paste-modal')?.classList.add('hidden');
}
document.getElementById('btn-paste-inject-header')?.addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  // Toujours ouvrir la modale de collage — pas de lecture auto du presse-papiers
  // (bloquée ou imprévisible en file://) : Ctrl+V dans la modale injecte automatiquement.
  pasteOpenModal();
});
document.getElementById('paste-modal-close')?.addEventListener('click', pasteCloseModal);
document.getElementById('paste-modal')?.addEventListener('click', e => {
  if (e.target.id === 'paste-modal') pasteCloseModal();
});
document.getElementById('paste-modal-input')?.addEventListener('paste', () => {
  setTimeout(() => {
    const ta = document.getElementById('paste-modal-input');
    if (ta && ta.value.trim()) {
      pasteCloseModal();
      document.getElementById('paste-panel').classList.remove('hidden');
      pasteInjectFromText(ta.value);
      ta.value = '';
    }
  }, 60);
});
document.getElementById('paste-modal-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    const ta = e.target;
    if (ta.value.trim()) {
      pasteCloseModal();
      document.getElementById('paste-panel').classList.remove('hidden');
      pasteInjectFromText(ta.value);
      ta.value = '';
    }
  }
});

// ---------- Utilitaires ----------
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

render();
renderFiches();
