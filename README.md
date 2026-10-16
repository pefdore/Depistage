# Depistage — Check-list de dépistage en consultation

Outil web simple, **100 % local** (aucune donnée envoyée sur le réseau), utilisable en consultation sur tablette/ordinateur, même hors ligne.

## Utilisation

1. Ouvrir `index.html` dans un navigateur (double-clic suffit — aucun serveur requis).
1b. **📋 Injecter dans la fiche** (ou Ctrl+V direct n'importe où sur la page) : copiez le volet de consultation (Weda, etc.) et collez — le site remplit automatiquement l'identité (NOM, prénom, sexe, âge), les antécédents (diabète/DT2/DNID → case Diabète ; HTA/hypertension → case HTA ; insuffisance cardiaque ; BPCO/bronchopneumopathie → case BPCO ; MRC/maladie rénale chronique → case MRC), le tabac (non/oui/sevré + paquets-années), les traitements (champ dédié), les constantes (poids, taille → IMC, PAS, PAD, FC, SpO2, température) et toute la biologie (LDL, HDL, cholestérol, triglycérides, glycémie, HbA1c, DFG, RAC, TSH, ferritine, hémoglobine, plaquettes, ALAT, ASAT, GGT, PAL, CRP, potassium, sodium, TP…). Tout le site (dépistages, risque CV, listes CPAM) se met à jour immédiatement.
2. Renseigner **âge** et **sexe** du patient : les items pertinents s'affichent automatiquement avec les critères HAS (drapeaux « ⓘ »).
3. Pour chaque item : **Fait** (à jour), **À faire** (à programmer) ou **N/A**.
4. Cliquer sur **🖨️ Fiche patient** : génère et imprime (ou exporte en PDF via « Enregistrer au format PDF ») une fiche de synthèse pour le patient avec les points à jour et les points à programmer.
5. **💾 Sauvegarder / 📂 Charger** : stockage local du navigateur (une seule check-list à la fois).

## Domaines couverts

- 🚬 Tabac / addictions (dont AUDIT-C alcool)
- 🫁 BPCO (critères de dépistage, spirométrie, RSV, déficit alpha-1-antitrypsine, SAOS)
- 🦴 Ostéoporose (indications ostéodensitométrie : femme ≥ 65 ans, homme ≥ 70 ans, corticothérapie, fractures de faible énergie…)
- 🍬 Diabète (dépistage 45–75 ans, suivi : HbA1c, fond d'œil, DFG, pieds)
- ❤️ Cardiovasculaire (TA, LDL, SCORE2, anévrisme aorte, ARIH)
- Oncologie : dépistage organisé colorectal (50–74 ans), frottis/HPV (25–65 ans), mammographie (50–74 ans), PSA (décision partagée), poumon (fumeur 50–74 ans), signes d'alerte
- 💉 Vaccinations (grippe, COVID, pneumocoque, RSV ≥ 75 ans, zona, DTP, HPV)
- 🌸 Santé de la femme (contraception, grossesse, ménopause)
- 🧠 Autres : audition, vision, dénutrition, cognition, chutes, VIH, hépatite C, iatrogénie…

## Listes CPAM (ameli pro) — dépistages ciblés

Le bandeau du haut donne accès à deux boutons :

- **📋 Listes CPAM (dépistages ciblés)** — module de paramétrage : sélectionnez le **trimestre** (ex. `2026-T1`, pré-sélectionné sur le trimestre en cours), puis pour chaque dépistage ciblé (maladie rénale chronique, dépistage du diabète, cancer colorectal, col de l'utérus, cancer du sein, suivi biologique du diabète) téléchargez le fichier XML depuis **ameli pro** et importez-le. Un upload par trimestre et par dépistage : l'historique des trimestres est conservé (tags visibles sous chaque dépistage), l'import du même trimestre remplace la version précédente, et chaque trimestre est supprimable séparément. Colonnes attendues : Nom (B), Prénom (C), Âge (D), NIR (E), Statut (F) : `exclu(e)` / `a vérifier` / `fait`. Fichiers acceptés : **`.xlsx`** (Excel, format ameli pro — lu directement, sans dépendance), XML balisé ou fichier séparé `;`/tabulation.
- **📊 Progression de mes dépistages** — compare l'évolution de vos dépistages : pourcentage de « fait » par liste (hors exclus, dernier trimestre importé), **delta ▲/▼ vs le trimestre précédent** dès que deux trimestres sont importés, et progression globale.

Dans le dossier patient, une carte **« 🏥 Listes CPAM »** interroge automatiquement toutes les listes importées à partir du champ Nom : d'un coup d'œil, pour chaque dépistage, le patient est **Non concerné** (pas dans la liste), **Fait**, **À faire** ou **Exclu(e)**.

Toutes les listes restent stockées localement dans le navigateur (`localStorage`) — aucune donnée n'est envoyée sur le réseau.

## Avertissement

Aide-mémoire fondé sur les recommandations françaises (HAS, dépistage organisé) — ne remplace pas le jugement clinique. Les seuils peuvent évoluer : vérifier les mises à jour HAS.

## Personnalisation

Toutes les checklists sont dans `app.js` (tableau `SECTIONS`) : ajouter/modifier un item se fait en une ligne. Le style est dans `style.css` (impression : `@media print`).
