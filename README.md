# 🌾 AgriGuard

## Satellite-Based Crop Health Monitoring System

**GeoImpathon 1.0 — Domain 3: Agricultural Sustainability**  
**Problem Statement 3.1 — Crop Health Monitoring System**

AgriGuard is a Google Earth Engine application that uses Sentinel-2 satellite imagery to monitor agricultural crop health, detect temporal changes, and identify potentially stressed agricultural areas.

---

## 🚀 Live Demo

**Live Application:**  
https://aveeragoel0308.users.earthengine.app/view/agriguard

---

## 🎯 Problem

Large agricultural areas are difficult to monitor through manual field inspection alone. Crop stress may result from water shortage, nutrient deficiency, pests, disease, or environmental conditions.

AgriGuard uses satellite-based vegetation indicators to identify areas that may require further field inspection.

---

## 💡 Our Solution

AgriGuard processes Sentinel-2 imagery to:

- Calculate NDVI, NDMI and NDRE
- Mask clouds, shadows, cirrus and snow
- Identify cropland using ESA WorldCover
- Compare current crop condition with a historical baseline
- Classify areas as Healthy, Moderate or Stressed
- Identify potential stress hotspots
- Display 12-month vegetation trends
- Allow field-level inspection

---

## 🛰️ Data Sources

### Sentinel-2 Surface Reflectance Harmonized

Used for multispectral vegetation analysis.

### ESA WorldCover

Used to identify cropland areas.

---

## 📊 Vegetation Indices

### NDVI

Measures vegetation greenness.

```text
NDVI = (NIR - Red) / (NIR + Red)
