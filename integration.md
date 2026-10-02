# Intégration dans une app Python

L'outil est une page web statique (`index.html` + `app.js` + `style.css`) sans aucune dépendance réseau. Elle est conçue pour être embarquée dans une application Python (PyQt/PySide `QWebEngineView`, Electron, Flask local, ou simple ouverture du fichier dans le navigateur par défaut).

## 1. Pré-remplir les données patient

### Option A — Paramètres URL (la plus simple)

Ouvrir la page avec l'âge et le sexe déjà pris en compte :

```
index.html?nom=DUPONT&prenom=Marie&ddn=1958-04-12&sex=F
```

L'âge est calculé automatiquement à partir de la date de naissance (`ddn`, format ISO `AAAA-MM-JJ`).

Exemple avec le navigateur par défaut :

```python
import webbrowser, urllib.parse, datetime

def ouvrir_checklist(nom, prenom, ddn: datetime.date, sexe):
    params = urllib.parse.urlencode({
        "nom": nom, "prenom": prenom,
        "ddn": ddn.isoformat(), "sex": sexe,   # "F" ou "M"
    })
    webbrowser.open(f"file:///chemin/vers/index.html?{params}")
```

### Option B — Injection JavaScript (embarqué QWebEngineView / webview.py)

Après chargement de la page, appeler :

```javascript
Depistage.setData({ nom: "DUPONT", prenom: "Marie", ddn: "1958-04-12", sex: "F" });
```

Exemple PyQt5 :

```python
from PyQt5 import QtWebEngineWidgets, QtCore

view = QtWebEngineWidgets.QWebEngineView()
view.load(QtCore.QUrl.fromLocalFile("/chemin/vers/index.html"))

def inject(patient):
    js = f"Depistage.setData({{nom:'{patient['nom']}', prenom:'{patient['prenom']}',"
         f"ddn:'{patient['ddn']}', sex:'{patient['sex']}'}})"
    view.page().runJavaScript(js)

view.loadFinished.connect(lambda ok: inject(patient_courant))
```

### Option C — Variable globale avant chargement

Si vous générez/mutilez la page vous-même, définir avant le `<script src="app.js">` :

```html
<script>window.PATIENT_DATA = { nom: "DUPONT", prenom: "Marie", ddn: "1958-04-12", sex: "F" };</script>
```

## 2. Récupérer le résultat en Python

Le médecin coche chaque item (**Fait / À faire / N/A**). Deux moyens de récupérer l'état :

### Export JSON (manuel)

Bouton **📤 Exporter résultat (JSON)** : télécharge un fichier structuré :

```json
{
  "patient": { "nom": "DUPONT", "prenom": "Marie", "ddn": "1958-04-12", "sex": "F", "age": 67 },
  "consultDate": "2025-10-02",
  "sections": [
    { "id": "gyneco", "title": "🌸 Gynécologie (femmes)", "items": [
        { "id": "gyn-mammo", "label": "Mammographie tous les 2 ans…", "status": "non", "value": "" }
    ]},
    ...
  ]
}
```

`status` : `null` (non évalué), `"oui"` (fait/à jour), `"non"` (à faire), `"na"`, `value` = champ libre éventuel.

### Récupération programmatique (QWebEngineView)

```python
view.page().runJavaScript("JSON.stringify(Depistage.getResult())", callback_traitant_le_json)
```

## 3. Fiche patient

Le bouton **🖨️ Fiche patient** génère une fiche imprimable (ou « Enregistrer au format PDF ») : points à jour, points à programmer par domaine, non applicables. La fiche est aussi imprimable en Python :

```python
view.page().runJavaScript("window.print()")  # via le dialogue d'impression du widget
```

## 4. Points d'extension

- Toutes les checklists sont dans `app.js` (tableau `SECTIONS`) : chaque item est une ligne avec `show` (condition âge/sexe) et `why` (justification affichée en drapeau ⓘ).
- Le risque cardiovasculaire **global** n'est pas traité ici (utilisé via risquecv.fr) ; seule la prise de tension et les dépistages cardio ciblés (AAA, FA/ARIH, valvulopathie, artériopathie, insuffisance cardiaque) sont dans la section Cardiologie.
