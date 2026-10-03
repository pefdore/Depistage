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
];

// ---------- État ----------
const overrides = {}; // indicationId -> true | false (coche manuelle)
const isChecked = ind => {
  if (overrides[ind.id] !== undefined) return overrides[ind.id];
  return ind.auto ? !!ind.auto(P()) : false;
};

function examState(exam) {
  const checked = exam.indications.filter(isChecked);
  return { checked, indicated: checked.length > 0 };
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
  document.getElementById('reminders').innerHTML = reminders.map(r => `<div>${escapeHtml(r)}</div>`).join('');
  document.getElementById('reminders').classList.toggle('hidden', !reminders.length);

  EXAMS.forEach(exam => {
    const st = examState(exam);
    const card = document.createElement('section');
    card.className = 'card exam' + (st.indicated ? ' indicated' : '');

    const header = document.createElement('div');
    header.className = 'exam-header';
    header.innerHTML = `
      <h2>${exam.icon} ${escapeHtml(exam.title)}</h2>
      <span class="verdict ${st.indicated ? 'yes' : 'no'}">${st.indicated ? 'INDIQUÉ' : 'Pas d\'indication'}</span>`;
    card.appendChild(header);

    exam.indications.forEach(ind => {
      const auto = ind.auto ? !!ind.auto(p) : null;
      const checked = isChecked(ind);
      const row = document.createElement('label');
      row.className = 'ind' + (checked ? ' checked' : '');
      row.innerHTML = `
        <input type="checkbox" data-ind="${ind.id}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(ind.label)}</span>
        ${auto === true && checked ? '<span class="tag auto">auto</span>' : ''}
        ${auto === true && !checked ? '<span class="tag off">auto (décoché)</span>' : ''}
        ${auto === false && checked ? '<span class="tag manual">ajout manuel</span>' : ''}`;
      card.appendChild(row);
    });

    container.appendChild(card);
  });

  updateSummary();
}

function updateSummary() {
  const indicated = EXAMS.filter(e => examState(e).indicated);
  document.getElementById('progress-info').textContent =
    `${indicated.length} examen${indicated.length > 1 ? 's' : ''} avec indication` +
    (indicated.length ? ` : ${indicated.map(e => e.title.split(' (')[0]).join(', ')}` : '');
}

// ---------- Événements ----------
document.addEventListener('change', e => {
  const cb = e.target.closest('input[data-ind]');
  if (!cb) return;
  const id = cb.dataset.ind;
  const exam = EXAMS.find(x => x.indications.some(i => i.id === id));
  const ind = exam.indications.find(i => i.id === id);
  overrides[id] = cb.checked;
  render();
});

['pat-age', 'pat-sex', 'pat-tabac', 'pat-pa', 'pat-diabete', 'pat-hta', 'pat-dfg', 'pat-imc'].forEach(idn =>
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


  const examBlocks = EXAMS.map(exam => {
    const st = examState(exam);
    if (!st.indicated) return '';
    const inds = st.checked.map(i => `<li>${escapeHtml(i.label)}</li>`).join('');
    return `<div class="exam-box">
      <div class="exam-title">${exam.icon} ${escapeHtml(exam.title)}</div>
      <ul>${inds}</ul>
      <div class="exam-cta">→ À prescrire / à programmer avec votre médecin</div>
    </div>`;
  }).join('');

  const todoCount = EXAMS.filter(e => examState(e).indicated).length;

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
