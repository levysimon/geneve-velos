# 🚲 Genève Vélos — EDA Interactive

Visualisation interactive des mouvements de vélos en libre-service à Genève.  
**321 000 trajets · 616 stations · Août 2025 → Mars 2026**

🔗 **Site live** : `https://[votre-username].github.io/geneve-velos/`

---

## Stack

| Outil | Usage |
|-------|-------|
| [D3.js v7](https://d3js.org/) | Tous les graphiques (heatmap, line, bar, scatter, OD matrix) |
| [Leaflet.js](https://leafletjs.com/) | Carte interactive des 616 stations |
| CartoDB Dark Tiles | Fond de carte sombre |
| Python + pandas | Pré-calcul des données JSON |
| GitHub Pages | Hébergement statique (0 coût) |

## Structure

```
geneve-velos/
├── index.html              # SPA principale
├── css/style.css           # Styles + design tokens
├── js/main.js              # Tous les charts D3 + Leaflet
├── data/                   # JSON pré-calculés (Python)
│   ├── kpis.json           # Métriques globales
│   ├── daily.json          # Trajets quotidiens
│   ├── hourly.json         # Profil horaire
│   ├── monthly.json        # Tendance mensuelle
│   ├── heatmap.json        # Jour × Heure
│   ├── stations.json       # 616 stations GPS + stats
│   ├── top_od.json         # Top 50 paires OD
│   ├── od_matrix.json      # Matrice OD top 12 stations
│   ├── duration.json       # Histogramme durées
│   ├── ebike_pref.json     # Préférence e-bike par heure
│   ├── zone_flow.json      # Flux Centre / Périphérie
│   ├── recurring.json      # Trajets récurrents (navetteurs)
│   ├── commuters.json      # Flux symétriques domicile↔travail
│   └── vacances.json       # Vacances scolaires GE 2025-2026
└── .github/workflows/deploy.yml   # CI/CD GitHub Pages
```

## Mise en place

### 1. Pré-requis Python (pour régénérer les données)

```bash
pip install pandas numpy sqlite3
```

### 2. Générer les données JSON

```bash
python generate_data.py
```

> Les fichiers `.db` (velos.db, hubs_details.db) doivent être présents localement.
> Les JSON sont versionnés dans `data/` pour que le site fonctionne sans les bases SQLite.

### 3. Déploiement GitHub Pages

1. Créer un repository GitHub : `geneve-velos`
2. Push le contenu de ce dossier sur `main`
3. Aller dans **Settings → Pages → Source : GitHub Actions**
4. Le workflow `.github/workflows/deploy.yml` déploie automatiquement

```bash
git init
git remote add origin https://github.com/[votre-username]/geneve-velos.git
git add .
git commit -m "feat: initial site"
git branch -M main
git push -u origin main
```

### 4. Développement local

```bash
# Serveur local simple (Python)
python -m http.server 8080
# → http://localhost:8080
```

> **Attention** : ne pas ouvrir `index.html` directement en `file://` car les `fetch()` seront bloqués par CORS. Toujours passer par un serveur HTTP.

## Sections du site

| Section | Contenu |
|---------|---------|
| **KPIs** | 8 métriques clés en temps réel |
| **Temporel** | Série journalière · Heatmap Jour×Heure · Barres horaires · Tendance mensuelle |
| **Carte** | 616 stations colorées · Flux OD · Mode balance |
| **Flotte** | Classique vs e-bike · Préférence · Distribution durées |
| **Trajets** | Matrice OD interactive · Top paires |
| **Zones** | Flux Centre↔Périphérie · Analyse géographique |
| **Patterns** | Trajets récurrents · Navetteurs symétriques |

## Personnalisation

Les couleurs sont définies dans les CSS variables (`:root` dans `style.css`) :

```css
--bike:   #4f9cf9   /* bleu classique */
--ebike:  #e6431a   /* orange e-bike */
--green:  #34c784   /* métrique positive */
```

Les constantes graphiques sont en haut de `main.js` dans l'objet `C`.

---

*Données : système de vélos en libre-service du Canton de Genève · Analyse EDA Python (pandas + numpy)*
