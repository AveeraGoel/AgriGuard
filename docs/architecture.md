# AgriGuard Architecture

```mermaid
flowchart TD
  A[Sentinel-2 SR Harmonized] --> B[Cloud/shadow/snow masking - SCL band]
  B --> C[Cropland mask - ESA WorldCover class 40]
  C --> D1[NDVI]
  C --> D2[NDMI]
  C --> D3[NDRE]
  D1 & D2 & D3 --> E[Current 30-day median composite]
  A --> F[Same-season composites, previous 3 years]
  F --> G[Field baseline NDVI]
  E --> H[Change vs own baseline]
  G --> H
  H --> I{Classification}
  I --> J[Healthy]
  I --> K[Moderate]
  I --> L[Stressed]
  J & K & L --> M[Interactive map + stats + 12-month trend + recommendation]
```

## Classification rules (tunable in `CFG`)
| Class | Condition |
|---|---|
| Stressed | NDVI < 0.35 **or** NDVI drop > 20% vs baseline |
| Moderate | NDVI < 0.55 **or** NDVI drop > 10% vs baseline |
| Healthy | otherwise |

## SDG link
SDG 2 (Zero Hunger), SDG 12 (Responsible Consumption), SDG 13 (Climate Action): early stress detection reduces yield loss and targets water and inputs where needed.
