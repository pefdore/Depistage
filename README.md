# Depistage — Check-list de dépistage en consultation

Outil web simple, **100 % local** (aucune donnée envoyée sur le réseau), utilisable en consultation sur tablette/ordinateur, même hors ligne.

## Utilisation

1. Ouvrir `index.html` dans un navigateur (double-clic suffit — aucun serveur requis).
2. Renseigner **nom, prénom, date de naissance et sexe** du patient : l'âge est calculé automatiquement et les items pertinents s'affichent avec les critères HAS (drapeaux « ⓘ »).
3. **Intégration Python** : voir `integration.md` (injection des données patient via URL `?nom=…&prenom=…&ddn=…&sex=F`, `Depistage.setData()`, récupération du résultat via `Depistage.getResult()` ou export JSON).
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

## Avertissement

Aide-mémoire fondé sur les recommandations françaises (HAS, dépistage organisé) — ne remplace pas le jugement clinique. Les seuils peuvent évoluer : vérifier les mises à jour HAS.

## Personnalisation

Toutes les checklists sont dans `app.js` (tableau `SECTIONS`) : ajouter/modifier un item se fait en une ligne. Le style est dans `style.css` (impression : `@media print`).
