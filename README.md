# 🌾 AgriGuard – Satellite Crop Health Monitoring

Domain 3: Agricultural Sustainability · Problem 3.1 Crop Health Monitoring System

AgriGuard is a Google Earth Engine app that uses Sentinel-2 imagery to compute **NDVI, NDMI and NDRE**, compares current crop condition with each field's **own historical baseline**, and produces a **Healthy / Moderate / Stressed** crop map.

## Features
- Cloud, shadow and snow masking (Sentinel-2 SCL)
- Cropland-only analysis (ESA WorldCover)
- NDVI, NDMI, NDRE layers
- Temporal comparison: current vs 3-year same-season baseline
- Health classes, % area statistics, 12-month NDVI trend
- Click-to-inspect any field, plus automatic recommendation

## Run / Deploy
1. Sign in at https://code.earthengine.google.com (GEE account required).
2. Create a new script, paste `app/agriguard.js`, click **Run**.
3. Click **Apps** (top right of the Code Editor) → **New App** → name it `agriguard`, choose *Publish new app*, set access to **Anyone**, publish.
4. Copy the generated `https://<project>.projects.earthengine.app/view/agriguard` URL – that's your live link.

## Usage
Set an end date → click the map to choose a study area → toggle layers (NDVI, NDMI, NDRE, change) → switch mode to *Inspect point* and click a red field to see its values.

## Method
See [docs/architecture.md](docs/architecture.md). Thresholds are tunable in the `CFG` block.

## Limitations
Fallow land can appear stressed; clouds during monsoon reduce valid observations; thresholds should be calibrated per crop and region with ground truth.

## Data
Sentinel-2 SR Harmonized (ESA/Copernicus), ESA WorldCover v200 (2021).

## License
MIT
