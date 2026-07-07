(function clientMain(){
  "use strict";
  const IPHONE_MODELS = [
  {
    "model_name": "iPhone 17e",
    "year": 2026,
    "line": "iPhone 17",
    "family": "e",
    "capacities": [
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Black",
      "White",
      "Soft Pink"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 699,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 17 Pro Max",
    "year": 2025,
    "line": "iPhone 17",
    "family": "Pro Max",
    "capacities": [
      "256 GB",
      "512 GB",
      "1 TB",
      "2 TB"
    ],
    "colors": [
      "Silver",
      "Cosmic Orange",
      "Deep Blue"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 1299,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 17 Pro",
    "year": 2025,
    "line": "iPhone 17",
    "family": "Pro",
    "capacities": [
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Silver",
      "Cosmic Orange",
      "Deep Blue"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 1199,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone Air",
    "year": 2025,
    "line": "iPhone Air",
    "family": "Air",
    "capacities": [
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Space Black",
      "Cloud White",
      "Light Gold",
      "Sky Blue"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 999,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 17",
    "year": 2025,
    "line": "iPhone 17",
    "family": "standard",
    "capacities": [
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Black",
      "White",
      "Mist Blue",
      "Sage",
      "Lavender"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 899,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 16e",
    "year": 2025,
    "line": "iPhone 16",
    "family": "e",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Black",
      "White"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 499,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 16 Pro Max",
    "year": 2024,
    "line": "iPhone 16",
    "family": "Pro Max",
    "capacities": [
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Black Titanium",
      "White Titanium",
      "Natural Titanium",
      "Desert Titanium"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 1049,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 16 Pro",
    "year": 2024,
    "line": "iPhone 16",
    "family": "Pro",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Black Titanium",
      "White Titanium",
      "Natural Titanium",
      "Desert Titanium"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 849,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 16 Plus",
    "year": 2024,
    "line": "iPhone 16",
    "family": "Plus",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Black",
      "White",
      "Pink",
      "Teal",
      "Ultramarine"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 729,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 16",
    "year": 2024,
    "line": "iPhone 16",
    "family": "standard",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Black",
      "White",
      "Pink",
      "Teal",
      "Ultramarine"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 649,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 15 Pro Max",
    "year": 2023,
    "line": "iPhone 15",
    "family": "Pro Max",
    "capacities": [
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Black Titanium",
      "White Titanium",
      "Blue Titanium",
      "Natural Titanium"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 899,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 15 Pro",
    "year": 2023,
    "line": "iPhone 15",
    "family": "Pro",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Black Titanium",
      "White Titanium",
      "Blue Titanium",
      "Natural Titanium"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 699,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 15 Plus",
    "year": 2023,
    "line": "iPhone 15",
    "family": "Plus",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Black",
      "Blue",
      "Green",
      "Yellow",
      "Pink"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 599,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 15",
    "year": 2023,
    "line": "iPhone 15",
    "family": "standard",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Black",
      "Blue",
      "Green",
      "Yellow",
      "Pink"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 549,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 14 Pro Max",
    "year": 2022,
    "line": "iPhone 14",
    "family": "Pro Max",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Space Black",
      "Silver",
      "Gold",
      "Deep Purple"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 629,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 14 Pro",
    "year": 2022,
    "line": "iPhone 14",
    "family": "Pro",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Space Black",
      "Silver",
      "Gold",
      "Deep Purple"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 579,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 14 Plus",
    "year": 2022,
    "line": "iPhone 14",
    "family": "Plus",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Midnight",
      "Starlight",
      "Blue",
      "Purple",
      "Yellow",
      "(PRODUCT)RED"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 479,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 14",
    "year": 2022,
    "line": "iPhone 14",
    "family": "standard",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Midnight",
      "Starlight",
      "Blue",
      "Purple",
      "Yellow",
      "(PRODUCT)RED"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 429,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone SE (3rd generation)",
    "year": 2022,
    "line": "SE",
    "family": "SE",
    "capacities": [
      "64 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Midnight",
      "Starlight",
      "(PRODUCT)RED"
    ],
    "commercial": true,
    "conditions": [
      "Novo",
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 149,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 13 Pro Max",
    "year": 2021,
    "line": "iPhone 13",
    "family": "Pro Max",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Graphite",
      "Gold",
      "Silver",
      "Sierra Blue",
      "Alpine Green"
    ],
    "commercial": true,
    "conditions": [
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 499,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 13 Pro",
    "year": 2021,
    "line": "iPhone 13",
    "family": "Pro",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB",
      "1 TB"
    ],
    "colors": [
      "Graphite",
      "Gold",
      "Silver",
      "Sierra Blue",
      "Alpine Green"
    ],
    "commercial": true,
    "conditions": [
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 429,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 13",
    "year": 2021,
    "line": "iPhone 13",
    "family": "standard",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Pink",
      "Blue",
      "Midnight",
      "Starlight",
      "Green",
      "(PRODUCT)RED"
    ],
    "commercial": true,
    "conditions": [
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 349,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 13 mini",
    "year": 2021,
    "line": "iPhone 13",
    "family": "mini",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Pink",
      "Blue",
      "Midnight",
      "Starlight",
      "Green",
      "(PRODUCT)RED"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 12 Pro Max",
    "year": 2020,
    "line": "iPhone 12",
    "family": "Pro Max",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Silver",
      "Graphite",
      "Gold",
      "Pacific Blue"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 12 Pro",
    "year": 2020,
    "line": "iPhone 12",
    "family": "Pro",
    "capacities": [
      "128 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Silver",
      "Graphite",
      "Gold",
      "Pacific Blue"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 12",
    "year": 2020,
    "line": "iPhone 12",
    "family": "standard",
    "capacities": [
      "64 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Black",
      "White",
      "(PRODUCT)RED",
      "Green",
      "Blue",
      "Purple"
    ],
    "commercial": true,
    "conditions": [
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 299,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone 12 mini",
    "year": 2020,
    "line": "iPhone 12",
    "family": "mini",
    "capacities": [
      "64 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Black",
      "White",
      "(PRODUCT)RED",
      "Green",
      "Blue",
      "Purple"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone SE (2nd generation)",
    "year": 2020,
    "line": "SE",
    "family": "SE",
    "capacities": [
      "64 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Black",
      "White",
      "(PRODUCT)RED"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 11 Pro Max",
    "year": 2019,
    "line": "iPhone 11",
    "family": "Pro Max",
    "capacities": [
      "64 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Space Gray",
      "Silver",
      "Gold",
      "Midnight Green"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 11 Pro",
    "year": 2019,
    "line": "iPhone 11",
    "family": "Pro",
    "capacities": [
      "64 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Space Gray",
      "Silver",
      "Gold",
      "Midnight Green"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 11",
    "year": 2019,
    "line": "iPhone 11",
    "family": "standard",
    "capacities": [
      "64 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Black",
      "Green",
      "Yellow",
      "Purple",
      "(PRODUCT)RED",
      "White"
    ],
    "commercial": true,
    "conditions": [
      "eCPO eco Certified Pre-Owned"
    ],
    "base_price_usd": 229,
    "stock_status": "Dispon\u00edvel"
  },
  {
    "model_name": "iPhone XS Max",
    "year": 2018,
    "line": "iPhone X / XS / XR",
    "family": "XS Max",
    "capacities": [
      "64 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Silver",
      "Space Gray",
      "Gold"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone XS",
    "year": 2018,
    "line": "iPhone X / XS / XR",
    "family": "XS",
    "capacities": [
      "64 GB",
      "256 GB",
      "512 GB"
    ],
    "colors": [
      "Silver",
      "Space Gray",
      "Gold"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone XR",
    "year": 2018,
    "line": "iPhone X / XS / XR",
    "family": "XR",
    "capacities": [
      "64 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Black",
      "White",
      "Blue",
      "Yellow",
      "Coral",
      "(PRODUCT)RED"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone X",
    "year": 2017,
    "line": "iPhone X / XS / XR",
    "family": "X",
    "capacities": [
      "64 GB",
      "256 GB"
    ],
    "colors": [
      "Silver",
      "Space Gray"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 8 Plus",
    "year": 2017,
    "line": "iPhone 8 / 7 / 6",
    "family": "Plus",
    "capacities": [
      "64 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Gold",
      "Silver",
      "Space Gray",
      "(PRODUCT)RED"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 8",
    "year": 2017,
    "line": "iPhone 8 / 7 / 6",
    "family": "standard",
    "capacities": [
      "64 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Gold",
      "Silver",
      "Space Gray",
      "(PRODUCT)RED"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 7 Plus",
    "year": 2016,
    "line": "iPhone 8 / 7 / 6",
    "family": "Plus",
    "capacities": [
      "32 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Rose Gold",
      "Gold",
      "Silver",
      "Black",
      "Jet Black",
      "(PRODUCT)RED"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 7",
    "year": 2016,
    "line": "iPhone 8 / 7 / 6",
    "family": "standard",
    "capacities": [
      "32 GB",
      "128 GB",
      "256 GB"
    ],
    "colors": [
      "Rose Gold",
      "Gold",
      "Silver",
      "Black",
      "Jet Black",
      "(PRODUCT)RED"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone SE (1st generation)",
    "year": 2016,
    "line": "SE",
    "family": "SE",
    "capacities": [
      "16 GB",
      "32 GB",
      "64 GB",
      "128 GB"
    ],
    "colors": [
      "Silver",
      "Gold",
      "Space Gray",
      "Rose Gold"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 6s Plus",
    "year": 2015,
    "line": "iPhone 8 / 7 / 6",
    "family": "Plus",
    "capacities": [
      "16 GB",
      "32 GB",
      "64 GB",
      "128 GB"
    ],
    "colors": [
      "Silver",
      "Gold",
      "Space Gray",
      "Rose Gold"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 6s",
    "year": 2015,
    "line": "iPhone 8 / 7 / 6",
    "family": "standard",
    "capacities": [
      "16 GB",
      "32 GB",
      "64 GB",
      "128 GB"
    ],
    "colors": [
      "Silver",
      "Gold",
      "Space Gray",
      "Rose Gold"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 6 Plus",
    "year": 2014,
    "line": "iPhone 8 / 7 / 6",
    "family": "Plus",
    "capacities": [
      "16 GB",
      "64 GB",
      "128 GB"
    ],
    "colors": [
      "Silver",
      "Gold",
      "Space Gray"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 6",
    "year": 2014,
    "line": "iPhone 8 / 7 / 6",
    "family": "standard",
    "capacities": [
      "16 GB",
      "32 GB",
      "64 GB",
      "128 GB"
    ],
    "colors": [
      "Silver",
      "Gold",
      "Space Gray"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 5s",
    "year": 2013,
    "line": "iPhone 5",
    "family": "standard",
    "capacities": [
      "16 GB",
      "32 GB",
      "64 GB"
    ],
    "colors": [
      "Space Gray",
      "Silver",
      "Gold"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 5c",
    "year": 2013,
    "line": "iPhone 5",
    "family": "c",
    "capacities": [
      "8 GB",
      "16 GB",
      "32 GB"
    ],
    "colors": [
      "White",
      "Pink",
      "Yellow",
      "Blue",
      "Green"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 5",
    "year": 2012,
    "line": "iPhone 5 / 4 / 3G",
    "family": "standard",
    "capacities": [
      "16 GB",
      "32 GB",
      "64 GB"
    ],
    "colors": [
      "Black",
      "White"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 4s",
    "year": 2011,
    "line": "iPhone 4",
    "family": "standard",
    "capacities": [
      "8 GB",
      "16 GB",
      "32 GB",
      "64 GB"
    ],
    "colors": [
      "Black",
      "White"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 4",
    "year": 2010,
    "line": "iPhone 5 / 4 / 3G",
    "family": "standard",
    "capacities": [
      "8 GB",
      "16 GB",
      "32 GB"
    ],
    "colors": [
      "Black",
      "White"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 3GS",
    "year": 2009,
    "line": "iPhone 5 / 4 / 3G",
    "family": "standard",
    "capacities": [
      "8 GB",
      "16 GB",
      "32 GB"
    ],
    "colors": [
      "Black",
      "White"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone 3G",
    "year": 2008,
    "line": "iPhone 5 / 4 / 3G",
    "family": "standard",
    "capacities": [
      "8 GB",
      "16 GB"
    ],
    "colors": [
      "Black",
      "White"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  },
  {
    "model_name": "iPhone",
    "year": 2007,
    "line": "iPhone 5 / 4 / 3G",
    "family": "original",
    "capacities": [
      "4 GB",
      "8 GB",
      "16 GB"
    ],
    "colors": [
      "Silver"
    ],
    "commercial": false,
    "conditions": [
      "Modelo informativo"
    ],
    "base_price_usd": null,
    "stock_status": "Refer\u00eancia hist\u00f3rica"
  }
];
  const WHATSAPP_NUMBER = "17865466540";
  const CELULARS_EXCHANGE_SPREAD_BRL = 0.15;
  let CATALOG_RATE = 5.47;
  const UNKNOWN = 'Informa\u00e7\u00e3o a confirmar';
  const DEFAULT_SPECS = {
    screen_size: UNKNOWN,
    display_technology: UNKNOWN,
    resolution: UNKNOWN,
    refresh_rate: UNKNOWN,
    chip: UNKNOWN,
    neural_engine: UNKNOWN,
    rear_camera: UNKNOWN,
    front_camera: UNKNOWN,
    video: UNKNOWN,
    security: UNKNOWN,
    home_button: UNKNOWN,
    network: UNKNOWN,
    wifi: UNKNOWN,
    bluetooth: UNKNOWN,
    sim_esim: UNKNOWN,
    connector: UNKNOWN,
    wireless_charging: UNKNOWN,
    original_ios: UNKNOWN,
    ios_support_note: UNKNOWN,
    notes: UNKNOWN
  };
  const SPEC_OVERRIDES = {
    "iPhone 17e": {screen_size:"6,1 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2532 x 1170 pixels a 460 ppi",refresh_rate:"Informa\u00e7\u00e3o a confirmar",chip:"A19",neural_engine:"16-core Neural Engine",rear_camera:"Sistema 48MP Fusion com Main e Telephoto 2x por sensor",front_camera:"C\u00e2mera frontal TrueDepth",video:"4K Dolby Vision; recursos exatos a confirmar",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e Gigabit LTE",wifi:"Wi-Fi 6",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; varia por regi\u00e3o",connector:"USB-C",wireless_charging:"MagSafe at\u00e9 15W, Qi2 at\u00e9 15W",original_ios:"iOS 26",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 17 Pro Max": {screen_size:"6,9 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2868 x 1320 pixels a 460 ppi",refresh_rate:"ProMotion adaptativo at\u00e9 120 Hz",chip:"A19 Pro",neural_engine:"16-core Neural Engine",rear_camera:"Sistema 48MP Pro Fusion com Main, Ultra Wide e Telephoto",front_camera:"C\u00e2mera frontal Center Stage",video:"Grava\u00e7\u00e3o de v\u00eddeo profissional; detalhes exatos a confirmar",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e mmWave; Gigabit LTE",wifi:"Wi-Fi 7",bluetooth:"Bluetooth 6",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe e Qi2",original_ios:"iOS 26",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 17 Pro": {screen_size:"6,3 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2622 x 1206 pixels a 460 ppi",refresh_rate:"ProMotion adaptativo at\u00e9 120 Hz",chip:"A19 Pro",neural_engine:"16-core Neural Engine",rear_camera:"Sistema 48MP Pro Fusion com Main, Ultra Wide e Telephoto",front_camera:"C\u00e2mera frontal Center Stage",video:"Grava\u00e7\u00e3o de v\u00eddeo profissional; detalhes exatos a confirmar",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e mmWave; Gigabit LTE",wifi:"Wi-Fi 7",bluetooth:"Bluetooth 6",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe e Qi2",original_ios:"iOS 26",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone Air": {screen_size:"6,5 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2736 x 1260 pixels a 460 ppi",refresh_rate:"ProMotion adaptativo at\u00e9 120 Hz",chip:"A19 Pro",neural_engine:"16-core Neural Engine",rear_camera:"Sistema 48MP Fusion com Main e Telephoto 2x por sensor",front_camera:"C\u00e2mera frontal Center Stage",video:"4K Dolby Vision; recursos exatos a confirmar",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e Gigabit LTE",wifi:"Wi-Fi 7",bluetooth:"Bluetooth 6",sim_esim:"eSIM",connector:"USB-C",wireless_charging:"MagSafe e Qi2",original_ios:"iOS 26",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 17": {screen_size:"6,3 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2622 x 1206 pixels a 460 ppi",refresh_rate:"ProMotion adaptativo at\u00e9 120 Hz",chip:"A19",neural_engine:"16-core Neural Engine",rear_camera:"Sistema 48MP Dual Fusion",front_camera:"C\u00e2mera frontal Center Stage",video:"4K Dolby Vision; recursos exatos a confirmar",security:"Face ID",home_button:"N\u00e3o",network:"5G e Gigabit LTE",wifi:"Wi-Fi 7",bluetooth:"Bluetooth 6",sim_esim:"eSIM; varia por regi\u00e3o",connector:"USB-C",wireless_charging:"MagSafe e Qi2",original_ios:"iOS 26",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 16e": {screen_size:"6,1 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2532 x 1170 pixels a 460 ppi",refresh_rate:"60 Hz",chip:"A18",neural_engine:"16-core Neural Engine",rear_camera:"C\u00e2mera 48MP Fusion",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K Dolby Vision; recursos exatos a confirmar",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e LTE",wifi:"Wi-Fi 6",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; varia por regi\u00e3o",connector:"USB-C",wireless_charging:"Carregamento sem fio Qi",original_ios:"iOS 18",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 16 Pro Max": {screen_size:"6,9 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2868 x 1320 pixels a 460 ppi",refresh_rate:"ProMotion adaptativo at\u00e9 120 Hz",chip:"A18 Pro",neural_engine:"16-core Neural Engine",rear_camera:"Sistema Pro: 48MP Fusion, 48MP Ultra Wide e Telephoto 5x",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K Dolby Vision; ProRes e recursos Pro",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e mmWave; Gigabit LTE",wifi:"Wi-Fi 7",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe at\u00e9 25W, Qi2 e Qi",original_ios:"iOS 18",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 16 Pro": {screen_size:"6,3 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2622 x 1206 pixels a 460 ppi",refresh_rate:"ProMotion adaptativo at\u00e9 120 Hz",chip:"A18 Pro",neural_engine:"16-core Neural Engine",rear_camera:"Sistema Pro: 48MP Fusion, 48MP Ultra Wide e Telephoto",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K Dolby Vision; ProRes e recursos Pro",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e mmWave; Gigabit LTE",wifi:"Wi-Fi 7",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe at\u00e9 25W, Qi2 e Qi",original_ios:"iOS 18",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 16 Plus": {screen_size:"6,7 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2796 x 1290 pixels a 460 ppi",refresh_rate:"60 Hz",chip:"A18",neural_engine:"16-core Neural Engine",rear_camera:"Sistema 48MP Fusion + Ultra Wide",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K Dolby Vision",security:"Face ID",home_button:"N\u00e3o",network:"5G e Gigabit LTE",wifi:"Wi-Fi 7",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe at\u00e9 25W, Qi2 e Qi",original_ios:"iOS 18",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 16": {screen_size:"6,1 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2556 x 1179 pixels a 460 ppi",refresh_rate:"60 Hz",chip:"A18",neural_engine:"16-core Neural Engine",rear_camera:"Sistema 48MP Fusion + Ultra Wide",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K Dolby Vision",security:"Face ID",home_button:"N\u00e3o",network:"5G e Gigabit LTE",wifi:"Wi-Fi 7",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe at\u00e9 25W, Qi2 e Qi",original_ios:"iOS 18",ios_support_note:"Compat\u00edvel com Apple Intelligence",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 15 Pro Max": {screen_size:"6,7 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2796 x 1290 pixels a 460 ppi",refresh_rate:"ProMotion adaptativo at\u00e9 120 Hz",chip:"A17 Pro",neural_engine:"16-core Neural Engine",rear_camera:"Sistema Pro: 48MP Main, Ultra Wide e Telephoto 5x",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K Dolby Vision; ProRes",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e mmWave; Gigabit LTE",wifi:"Wi-Fi 6",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe at\u00e9 15W, Qi2 e Qi",original_ios:"iOS 17",ios_support_note:"Suporte iOS atual varia por vers\u00e3o",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 15 Pro": {screen_size:"6,1 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2556 x 1179 pixels a 460 ppi",refresh_rate:"ProMotion adaptativo at\u00e9 120 Hz",chip:"A17 Pro",neural_engine:"16-core Neural Engine",rear_camera:"Sistema Pro: 48MP Main, Ultra Wide e Telephoto",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K Dolby Vision; ProRes",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e mmWave; Gigabit LTE",wifi:"Wi-Fi 6",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe at\u00e9 15W, Qi2 e Qi",original_ios:"iOS 17",ios_support_note:"Suporte iOS atual varia por vers\u00e3o",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 15 Plus": {screen_size:"6,7 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2796 x 1290 pixels a 460 ppi",refresh_rate:"60 Hz",chip:"A16 Bionic",neural_engine:"16-core Neural Engine",rear_camera:"Sistema dual: 48MP Main e 12MP Ultra Wide",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K Dolby Vision; modo Cinematic",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e mmWave; Gigabit LTE",wifi:"Wi-Fi 6",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe at\u00e9 15W, Qi2 e Qi",original_ios:"iOS 17",ios_support_note:"Suporte iOS atual varia por vers\u00e3o",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 15": {screen_size:"6,1 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2556 x 1179 pixels a 460 ppi",refresh_rate:"60 Hz",chip:"A16 Bionic",neural_engine:"16-core Neural Engine",rear_camera:"Sistema dual: 48MP Main e 12MP Ultra Wide",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K Dolby Vision; modo Cinematic",security:"Face ID",home_button:"N\u00e3o",network:"5G sub-6 GHz e mmWave; Gigabit LTE",wifi:"Wi-Fi 6",bluetooth:"Bluetooth 5.3",sim_esim:"eSIM; modelos dos EUA sem bandeja SIM",connector:"USB-C",wireless_charging:"MagSafe at\u00e9 15W, Qi2 e Qi",original_ios:"iOS 17",ios_support_note:"Suporte iOS atual varia por vers\u00e3o",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 12": {screen_size:"6,1 polegadas",display_technology:"Super Retina XDR OLED",resolution:"2532 x 1170 pixels a 460 ppi",refresh_rate:"60 Hz",chip:"A14 Bionic",neural_engine:"16-core Neural Engine",rear_camera:"Sistema dual 12MP: Wide e Ultra Wide",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"HDR Dolby Vision at\u00e9 4K 30 fps",security:"Face ID",home_button:"N\u00e3o",network:"5G e Gigabit LTE",wifi:"Wi-Fi 6",bluetooth:"Bluetooth 5.0",sim_esim:"nano-SIM e eSIM",connector:"Lightning",wireless_charging:"MagSafe at\u00e9 15W e Qi",original_ios:"iOS 14",ios_support_note:"Suporte iOS atual varia por vers\u00e3o",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 11": {screen_size:"6,1 polegadas",display_technology:"Liquid Retina HD LCD com IPS",resolution:"1792 x 828 pixels a 326 ppi",refresh_rate:"60 Hz",chip:"A13 Bionic",neural_engine:"8-core Neural Engine",rear_camera:"Sistema dual 12MP: Wide e Ultra Wide",front_camera:"C\u00e2mera frontal TrueDepth 12MP",video:"4K at\u00e9 60 fps",security:"Face ID",home_button:"N\u00e3o",network:"Gigabit LTE",wifi:"Wi-Fi 6",bluetooth:"Bluetooth 5.0",sim_esim:"nano-SIM e eSIM",connector:"Lightning",wireless_charging:"Qi",original_ios:"iOS 13",ios_support_note:"Suporte iOS atual varia por vers\u00e3o",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."},
    "iPhone 4": {screen_size:"3,5 polegadas",display_technology:"Retina LCD Multi-Touch",resolution:"960 x 640 pixels a 326 ppi",refresh_rate:"60 Hz",chip:"A4",neural_engine:"N\u00e3o aplic\u00e1vel",rear_camera:"5MP",front_camera:"C\u00e2mera frontal VGA",video:"HD 720p",security:"Sem Face ID ou Touch ID",home_button:"Sim",network:"3G UMTS/HSDPA/HSUPA; GSM/EDGE; CDMA EV-DO em modelo CDMA",wifi:"802.11b/g/n (2,4 GHz)",bluetooth:"Bluetooth 2.1 + EDR",sim_esim:"micro-SIM",connector:"30-pin",wireless_charging:"N\u00e3o",original_ios:"iOS 4",ios_support_note:"Modelo legado",notes:"Dados principais baseados nas especifica\u00e7\u00f5es t\u00e9cnicas Apple."}
  };
  function specsForModel(m){
    const name=m.model_name, year=Number(m.year), fam=normalize(m.family+' '+name), pro=fam.includes('pro'), max=fam.includes('max'), plus=fam.includes('plus'), mini=fam.includes('mini'), se=fam.includes('se'), xLike=year>=2017&&normalize(name).includes('iphone x');
    let sp={...DEFAULT_SPECS};
    if(year>=2020){sp.network='5G e LTE';sp.security='Face ID';sp.home_button='N\u00e3o';sp.connector=year>=2023?'USB-C':'Lightning';sp.wireless_charging='MagSafe e Qi';sp.sim_esim=year>=2022?'eSIM; modelos dos EUA sem bandeja SIM':'nano-SIM e eSIM';}
    else if(year>=2017&&xLike){sp.network='LTE Advanced';sp.security='Face ID';sp.home_button='N\u00e3o';sp.connector='Lightning';sp.wireless_charging='Qi';sp.sim_esim=year>=2018?'nano-SIM e eSIM':'nano-SIM';}
    else if(year>=2017){sp.network='LTE Advanced';sp.security='Touch ID';sp.home_button='Sim, com Touch ID';sp.connector='Lightning';sp.wireless_charging='Qi';sp.sim_esim='nano-SIM';}
    else if(year>=2013){sp.network='LTE';sp.security=year>=2013&&name!=='iPhone 5c'?'Touch ID':'Sem Face ID ou Touch ID';sp.home_button=sp.security==='Touch ID'?'Sim, com Touch ID':'Sim';sp.connector='Lightning';sp.wireless_charging='N\u00e3o';sp.sim_esim='nano-SIM';}
    else {sp.network=year>=2008?'3G / GSM':'2G GSM/EDGE';sp.security='Sem Face ID ou Touch ID';sp.home_button='Sim';sp.connector='30-pin';sp.wireless_charging='N\u00e3o';sp.sim_esim=year>=2010?'micro-SIM':'SIM';}
    if(year>=2023){sp.wifi=sp.wifi==='Informa\u00e7\u00e3o a confirmar'?'Wi-Fi 6 ou superior':sp.wifi;sp.bluetooth=sp.bluetooth==='Informa\u00e7\u00e3o a confirmar'?'Bluetooth 5.3':sp.bluetooth;}
    else if(year>=2019){sp.wifi='Wi-Fi 6';sp.bluetooth='Bluetooth 5.0';}
    else if(year>=2014){sp.wifi='802.11ac Wi-Fi';sp.bluetooth='Bluetooth 4.x';}
    else if(year>=2010){sp.wifi='802.11b/g/n Wi-Fi';sp.bluetooth='Bluetooth 2.1 ou 4.0, conforme gera\u00e7\u00e3o';}
    if(year>=2024&&!SPEC_OVERRIDES[name]){sp.chip=pro?'A18 Pro':'A18';sp.neural_engine='16-core Neural Engine';sp.display_technology='Super Retina XDR OLED';sp.refresh_rate=pro?'ProMotion adaptativo at\u00e9 120 Hz':'60 Hz';sp.rear_camera=pro?'Sistema Pro com 48MP Fusion':'Sistema 48MP Fusion';sp.front_camera='C\u00e2mera frontal TrueDepth 12MP';sp.video='4K Dolby Vision';sp.original_ios='iOS 18';sp.ios_support_note='Compat\u00edvel com Apple Intelligence';}
    if(year===2023&&!SPEC_OVERRIDES[name]){sp.chip=pro?'A17 Pro':'A16 Bionic';sp.neural_engine='16-core Neural Engine';sp.display_technology='Super Retina XDR OLED';sp.refresh_rate=pro?'ProMotion adaptativo at\u00e9 120 Hz':'60 Hz';sp.rear_camera=pro?'Sistema Pro: 48MP Main, Ultra Wide e Telephoto':'Sistema dual: 48MP Main e 12MP Ultra Wide';sp.front_camera='C\u00e2mera frontal TrueDepth 12MP';sp.video='4K Dolby Vision';sp.original_ios='iOS 17';}
    if(year===2022){sp.chip=se?'A15 Bionic':pro?'A16 Bionic':'A15 Bionic';sp.neural_engine='16-core Neural Engine';sp.display_technology=se?'Retina HD LCD':'Super Retina XDR OLED';sp.refresh_rate=pro?'ProMotion adaptativo at\u00e9 120 Hz':'60 Hz';sp.screen_size=se?'4,7 polegadas':max?'6,7 polegadas':plus?'6,7 polegadas':'6,1 polegadas';sp.resolution=se?'1334 x 750 pixels a 326 ppi':pro?'2556 x 1179 pixels a 460 ppi':max?'2796 x 1290 pixels a 460 ppi':plus?'2778 x 1284 pixels a 458 ppi':'2532 x 1170 pixels a 460 ppi';sp.rear_camera=se?'C\u00e2mera Wide 12MP':pro?'Sistema Pro: 48MP Main, Ultra Wide e Telephoto':'Sistema dual 12MP: Main e Ultra Wide';sp.front_camera=se?'C\u00e2mera FaceTime HD 7MP':'C\u00e2mera frontal TrueDepth 12MP';sp.video='4K; recursos variam por modelo';sp.original_ios=se?'iOS 15':'iOS 16';sp.security=se?'Touch ID':'Face ID';sp.home_button=se?'Sim, com Touch ID':'N\u00e3o';sp.wireless_charging=se?'Qi':'MagSafe e Qi';}
    if(year===2021){sp.chip='A15 Bionic';sp.neural_engine='16-core Neural Engine';sp.display_technology='Super Retina XDR OLED';sp.refresh_rate=pro?'ProMotion adaptativo at\u00e9 120 Hz':'60 Hz';sp.screen_size=max?'6,7 polegadas':mini?'5,4 polegadas':'6,1 polegadas';sp.resolution=max?'2778 x 1284 pixels a 458 ppi':mini?'2340 x 1080 pixels a 476 ppi':'2532 x 1170 pixels a 460 ppi';sp.rear_camera=pro?'Sistema Pro 12MP: Wide, Ultra Wide e Telephoto':'Sistema dual 12MP: Wide e Ultra Wide';sp.front_camera='C\u00e2mera frontal TrueDepth 12MP';sp.video='4K Dolby Vision';sp.original_ios='iOS 15';}
    if(year===2020&&!SPEC_OVERRIDES[name]){sp.chip=se?'A13 Bionic':'A14 Bionic';sp.neural_engine=se?'8-core Neural Engine':'16-core Neural Engine';sp.display_technology=se?'Retina HD LCD':'Super Retina XDR OLED';sp.refresh_rate='60 Hz';sp.screen_size=se?'4,7 polegadas':max?'6,7 polegadas':mini?'5,4 polegadas':'6,1 polegadas';sp.resolution=se?'1334 x 750 pixels a 326 ppi':max?'2778 x 1284 pixels a 458 ppi':mini?'2340 x 1080 pixels a 476 ppi':'2532 x 1170 pixels a 460 ppi';sp.rear_camera=se?'C\u00e2mera Wide 12MP':pro?'Sistema Pro 12MP: Wide, Ultra Wide e Telephoto':'Sistema dual 12MP: Wide e Ultra Wide';sp.front_camera=se?'C\u00e2mera FaceTime HD 7MP':'C\u00e2mera frontal TrueDepth 12MP';sp.video='4K; Dolby Vision nos modelos iPhone 12';sp.original_ios=se?'iOS 13':'iOS 14';sp.security=se?'Touch ID':'Face ID';sp.home_button=se?'Sim, com Touch ID':'N\u00e3o';sp.network=se?'LTE Advanced':'5G e Gigabit LTE';sp.wireless_charging=se?'Qi':'MagSafe e Qi';}
    if(year===2019&&!SPEC_OVERRIDES[name]){sp.chip='A13 Bionic';sp.neural_engine='8-core Neural Engine';sp.display_technology=pro?'Super Retina XDR OLED':'Liquid Retina HD LCD';sp.refresh_rate='60 Hz';sp.screen_size=max?'6,5 polegadas':'5,8 polegadas';sp.resolution=max?'2688 x 1242 pixels a 458 ppi':'2436 x 1125 pixels a 458 ppi';sp.rear_camera='Sistema triplo 12MP: Wide, Ultra Wide e Telephoto';sp.front_camera='C\u00e2mera frontal TrueDepth 12MP';sp.video='4K at\u00e9 60 fps';sp.original_ios='iOS 13';}
    if(year===2018){sp.chip='A12 Bionic';sp.neural_engine='Neural Engine de segunda gera\u00e7\u00e3o';sp.display_technology=name==='iPhone XR'?'Liquid Retina HD LCD':'Super Retina HD OLED';sp.refresh_rate='60 Hz';sp.screen_size=max?'6,5 polegadas':name==='iPhone XR'?'6,1 polegadas':'5,8 polegadas';sp.resolution=max?'2688 x 1242 pixels a 458 ppi':name==='iPhone XR'?'1792 x 828 pixels a 326 ppi':'2436 x 1125 pixels a 458 ppi';sp.rear_camera=name==='iPhone XR'?'C\u00e2mera Wide 12MP':'Sistema dual 12MP: Wide e Telephoto';sp.front_camera='C\u00e2mera frontal TrueDepth 7MP';sp.video='4K at\u00e9 60 fps';sp.original_ios='iOS 12';}
    if(year===2017&&!xLike){sp.chip='A11 Bionic';sp.neural_engine='Neural Engine';sp.display_technology='Retina HD LCD';sp.refresh_rate='60 Hz';sp.screen_size=plus?'5,5 polegadas':'4,7 polegadas';sp.resolution=plus?'1920 x 1080 pixels a 401 ppi':'1334 x 750 pixels a 326 ppi';sp.rear_camera=plus?'Sistema dual 12MP: Wide e Telephoto':'C\u00e2mera Wide 12MP';sp.front_camera='C\u00e2mera FaceTime HD 7MP';sp.video='4K at\u00e9 60 fps';sp.original_ios='iOS 11';}
    if(name==='iPhone X'){sp.chip='A11 Bionic';sp.neural_engine='Neural Engine';sp.display_technology='Super Retina HD OLED';sp.refresh_rate='60 Hz';sp.screen_size='5,8 polegadas';sp.resolution='2436 x 1125 pixels a 458 ppi';sp.rear_camera='Sistema dual 12MP: Wide e Telephoto';sp.front_camera='C\u00e2mera frontal TrueDepth 7MP';sp.video='4K at\u00e9 60 fps';sp.original_ios='iOS 11';}
    if(year===2016){sp.chip=name.includes('SE')?'A9':'A10 Fusion';sp.neural_engine='N\u00e3o aplic\u00e1vel';sp.display_technology='Retina HD LCD';sp.refresh_rate='60 Hz';sp.screen_size=name.includes('Plus')?'5,5 polegadas':name.includes('SE')?'4,0 polegadas':'4,7 polegadas';sp.resolution=name.includes('Plus')?'1920 x 1080 pixels a 401 ppi':name.includes('SE')?'1136 x 640 pixels a 326 ppi':'1334 x 750 pixels a 326 ppi';sp.rear_camera=name.includes('7 Plus')?'Sistema dual 12MP':'C\u00e2mera 12MP';sp.front_camera=name.includes('SE')?'C\u00e2mera FaceTime HD 1,2MP':'C\u00e2mera FaceTime HD 7MP';sp.video='4K at\u00e9 30 fps';sp.original_ios=name.includes('SE')?'iOS 9.3':'iOS 10';}
    if(year===2015){sp.chip='A9';sp.neural_engine='N\u00e3o aplic\u00e1vel';sp.display_technology='Retina HD LCD';sp.refresh_rate='60 Hz';sp.screen_size=plus?'5,5 polegadas':'4,7 polegadas';sp.resolution=plus?'1920 x 1080 pixels a 401 ppi':'1334 x 750 pixels a 326 ppi';sp.rear_camera='C\u00e2mera 12MP';sp.front_camera='C\u00e2mera FaceTime HD 5MP';sp.video='4K at\u00e9 30 fps';sp.original_ios='iOS 9';}
    if(year===2014){sp.chip='A8';sp.neural_engine='N\u00e3o aplic\u00e1vel';sp.display_technology='Retina HD LCD';sp.refresh_rate='60 Hz';sp.screen_size=plus?'5,5 polegadas':'4,7 polegadas';sp.resolution=plus?'1920 x 1080 pixels a 401 ppi':'1334 x 750 pixels a 326 ppi';sp.rear_camera='C\u00e2mera iSight 8MP';sp.front_camera='C\u00e2mera FaceTime HD 1,2MP';sp.video='1080p HD';sp.original_ios='iOS 8';}
    if(year===2013){sp.chip=name==='iPhone 5s'?'A7':'A6';sp.neural_engine='N\u00e3o aplic\u00e1vel';sp.display_technology='Retina LCD';sp.refresh_rate='60 Hz';sp.screen_size='4,0 polegadas';sp.resolution='1136 x 640 pixels a 326 ppi';sp.rear_camera='C\u00e2mera iSight 8MP';sp.front_camera='C\u00e2mera FaceTime HD 1,2MP';sp.video='1080p HD';sp.original_ios='iOS 7';}
    if(year===2012){sp.chip='A6';sp.neural_engine='N\u00e3o aplic\u00e1vel';sp.display_technology='Retina LCD';sp.refresh_rate='60 Hz';sp.screen_size='4,0 polegadas';sp.resolution='1136 x 640 pixels a 326 ppi';sp.rear_camera='C\u00e2mera iSight 8MP';sp.front_camera='C\u00e2mera FaceTime HD 1,2MP';sp.video='1080p HD';sp.original_ios='iOS 6';}
    if(year===2011){sp.chip='A5';sp.neural_engine='N\u00e3o aplic\u00e1vel';sp.display_technology='Retina LCD';sp.refresh_rate='60 Hz';sp.screen_size='3,5 polegadas';sp.resolution='960 x 640 pixels a 326 ppi';sp.rear_camera='C\u00e2mera 8MP';sp.front_camera='C\u00e2mera VGA';sp.video='1080p HD';sp.original_ios='iOS 5';}
    if(year===2009){sp.chip='Samsung S5PC100';sp.neural_engine='N\u00e3o aplic\u00e1vel';sp.display_technology='LCD Multi-Touch';sp.refresh_rate='60 Hz';sp.screen_size='3,5 polegadas';sp.resolution='480 x 320 pixels a 163 ppi';sp.rear_camera='C\u00e2mera 3MP';sp.front_camera='N\u00e3o';sp.video='V\u00eddeo VGA';sp.original_ios='iPhone OS 3';}
    if(year===2008){sp.chip='Samsung 32-bit ARM';sp.neural_engine='N\u00e3o aplic\u00e1vel';sp.display_technology='LCD Multi-Touch';sp.refresh_rate='60 Hz';sp.screen_size='3,5 polegadas';sp.resolution='480 x 320 pixels a 163 ppi';sp.rear_camera='C\u00e2mera 2MP';sp.front_camera='N\u00e3o';sp.video='N\u00e3o grava v\u00eddeo nativamente';sp.original_ios='iPhone OS 2';}
    if(year===2007){sp.chip='Samsung 32-bit ARM';sp.neural_engine='N\u00e3o aplic\u00e1vel';sp.display_technology='LCD Multi-Touch';sp.refresh_rate='60 Hz';sp.screen_size='3,5 polegadas';sp.resolution='480 x 320 pixels a 163 ppi';sp.rear_camera='C\u00e2mera 2MP';sp.front_camera='N\u00e3o';sp.video='N\u00e3o grava v\u00eddeo nativamente';sp.original_ios='iPhone OS 1';}
    return {...sp,...(SPEC_OVERRIDES[name]||{})};
  }
  IPHONE_MODELS.forEach(m=>{m.specs={...DEFAULT_SPECS,...specsForModel(m),...(m.specs||{})}});
  const gridEl = document.querySelector('[data-catalog-grid]');
  const statusEl = document.querySelector('[data-status]');
  const categoryButtons = [...document.querySelectorAll('[data-category-filter]')];
  const lineButtons = [...document.querySelectorAll('[data-line-filter]')];
  const searchInput = document.querySelector('[data-search-filter]');
  IPHONE_MODELS.forEach(m=>{m.conditions=['Novo','eCPO eco Certified Pre-Owned'];m.stock_status='Disponível'});
  let activeCategory = 'todos', activeLine = 'todos', activeSearch = '';
  const FLORIDA_TAX_RATE = 0.07;
  const IPHONE_17_ORDER = ['iPhone 17 Pro Max','iPhone 17 Pro','iPhone Air','iPhone 17','iPhone 17e'];
  const IPHONE_17_MODELS = new Set(IPHONE_17_ORDER);
  const IPHONE_17_RANK = new Map(IPHONE_17_ORDER.map((name,index)=>[name,index]));
  const ECPO_ORDER = ['iPhone 17 Pro Max','iPhone 17 Pro','iPhone Air','iPhone 17','iPhone 17e','iPhone 16 Pro Max','iPhone 16 Pro','iPhone 16 Plus','iPhone 16','iPhone 16e','iPhone 15 Pro Max','iPhone 15 Pro','iPhone 15 Plus','iPhone 15','iPhone 14 Pro Max','iPhone 14 Pro','iPhone 14 Plus','iPhone 14','iPhone 13 Pro Max','iPhone 13 Pro','iPhone 13','iPhone 13 mini','iPhone 12 Pro Max','iPhone 12 Pro','iPhone 12','iPhone 12 mini'];
  const ECPO_MODELS = new Set(ECPO_ORDER);
  const ECPO_RANK = new Map(ECPO_ORDER.map((name,index)=>[name,index]));
  const IPHONE_17_PRICING = {
    'iPhone 17 Pro Max': {colors:['Silver','Cosmic Orange','Deep Blue'],prices:{'256 GB':1199,'512 GB':1399,'1 TB':1599,'2 TB':1999}},
    'iPhone 17 Pro': {colors:['Silver','Cosmic Orange','Deep Blue'],prices:{'256 GB':1099,'512 GB':1299,'1 TB':1499}},
    'iPhone Air': {colors:['Space Black','Cloud White','Light Gold','Sky Blue'],prices:{'256 GB':999,'512 GB':1199,'1 TB':1399}},
    'iPhone 17': {colors:['Black','White','Mist Blue','Sage','Lavender'],prices:{'256 GB':829,'512 GB':1029}},
    'iPhone 17e': {colors:['Black','White','Soft Pink'],prices:{'256 GB':599,'512 GB':799}}
  };
  function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
  function escapeHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function formatUsd(v){return 'US$ '+Math.round(v).toLocaleString('en-US')}
  function formatUsdCents(v){return 'US$ '+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function formatBrl(v){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2})}
  function formatBcbRate(v){return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4})}
  const BCB_CACHE_KEY='celulars_bcb_ptax_usd_brl_v3_spread15';
  const BCB_LEGACY_CACHE_KEYS=['celulars_bcb_ptax_usd_brl_v2','celulars_bcb_ptax_usd_brl_v1'];
  const BCB_CACHE_TTL_MS=86400000;
  const FALLBACK_BCB_RATE=5.32;
  function localDateKey(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function bcbParamDate(d){return String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'-'+d.getFullYear()}
  function formatBcbDate(v){const s=String(v||'').slice(0,10),p=s.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:'--/--/----'}
  function referenceRateFrom(rateInfo){return (Number(rateInfo.rate)||FALLBACK_BCB_RATE)+CELULARS_EXCHANGE_SPREAD_BRL}
  function readBcbCache(){try{const c=JSON.parse(localStorage.getItem(BCB_CACHE_KEY)||'null');return c&&Number(c.rate)>0?{...c,cacheVersion:3}:null}catch(e){return null}}
  function readLegacyBcbCache(){for(const key of BCB_LEGACY_CACHE_KEYS){try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c&&Number(c.rate)>0)return{...c,cacheVersion:key.includes('_v2')?2:1}}catch(e){}}return null}
  function writeBcbCache(c){try{localStorage.setItem(BCB_CACHE_KEY,JSON.stringify({...c,spread:CELULARS_EXCHANGE_SPREAD_BRL,referenceRate:referenceRateFrom(c),cacheVersion:3}))}catch(e){}}
  function logBcbStatus(source,rateInfo){try{console.info('[CELULARS PTAX]',{source,checkedAt:new Date().toISOString(),checkedKey:localDateKey(),quoteDate:rateInfo.date||String(rateInfo.dataHoraCotacao||'').slice(0,10),ptaxRate:Number(rateInfo.rate)||null,spread:CELULARS_EXCHANGE_SPREAD_BRL,referenceRate:referenceRateFrom(rateInfo),cacheKey:BCB_CACHE_KEY})}catch(e){}}
  function updateExchangeCard(rateInfo,status){const ptax=Number(rateInfo.rate)||FALLBACK_BCB_RATE,reference=ptax+CELULARS_EXCHANGE_SPREAD_BRL,referenceEls=document.querySelectorAll('[data-cel-reference-rate], [data-bcb-rate]'),ptaxEls=document.querySelectorAll('[data-cel-ptax-rate]'),spreadEls=document.querySelectorAll('[data-cel-spread-rate]'),dateEls=document.querySelectorAll('[data-bcb-date], [data-cel-ptax-date]');referenceEls.forEach(el=>el.textContent=formatBcbRate(reference));ptaxEls.forEach(el=>el.textContent=formatBcbRate(ptax));spreadEls.forEach(el=>el.textContent=formatBcbRate(CELULARS_EXCHANGE_SPREAD_BRL));dateEls.forEach(el=>{el.textContent=status==='fallback'?'Cotação indisponível temporariamente.':'Atualizada em '+formatBcbDate(rateInfo.date||rateInfo.dataHoraCotacao)+'.'})}
  async function fetchBcbPtax(){const end=new Date(),start=new Date();start.setDate(end.getDate()-14);const url="https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='"+bcbParamDate(start)+"'&@dataFinalCotacao='"+bcbParamDate(end)+"'&$format=json&$orderby=dataHoraCotacao desc&$top=1";const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error('BCB PTAX HTTP '+res.status);const data=await res.json(),row=data&&data.value&&data.value[0];if(!row||!Number(row.cotacaoVenda))throw new Error('BCB PTAX sem cota\u00e7\u00e3o');return{rate:Number(row.cotacaoVenda),date:String(row.dataHoraCotacao).slice(0,10),dataHoraCotacao:row.dataHoraCotacao,fetchedKey:localDateKey(),fetchedAt:Date.now(),source:'Banco Central do Brasil - PTAX USD/BRL venda'}}
  async function updateBcbExchangeRate(){const cached=readBcbCache(),today=localDateKey();if(cached&&cached.fetchedKey===today&&Date.now()-Number(cached.fetchedAt||0)<BCB_CACHE_TTL_MS){CATALOG_RATE=referenceRateFrom(cached);updateExchangeCard(cached,'cache');logBcbStatus('cache',cached);renderCatalog();return}try{const fresh=await fetchBcbPtax();CATALOG_RATE=referenceRateFrom(fresh);writeBcbCache(fresh);updateExchangeCard(fresh,'live');logBcbStatus('api',fresh);renderCatalog()}catch(e){console.warn('Não foi possível carregar PTAX do Banco Central.',e);const saved=readBcbCache()||readLegacyBcbCache();if(saved){CATALOG_RATE=referenceRateFrom(saved);updateExchangeCard(saved,'saved');logBcbStatus('saved-cache',saved);renderCatalog()}else{const fallback={rate:FALLBACK_BCB_RATE,date:''};CATALOG_RATE=referenceRateFrom(fallback);updateExchangeCard(fallback,'fallback');logBcbStatus('fallback',fallback);renderCatalog()}}}
  function isNewModel(m){return IPHONE_17_MODELS.has(m.model_name)}
  function isEcpoModel(m){return ECPO_MODELS.has(m.model_name)}
  function modelFamily(m){if(m.model_name==='iPhone Air')return'iPhone Air';const match=m.model_name.match(/^iPhone\s+(\d+)/);return match?'iPhone '+match[1]:m.line}
  function colorHex(c){const k=normalize(c),map=[[/cosmic orange|coral/,'#d97845'],[/deep blue|blue titanium|pacific blue|sierra blue|mist blue|sky blue|blue|ultramarine/,'#6f8fb8'],[/space black|black titanium|space gray|graphite|midnight|jet black|black/,'#2d3036'],[/white titanium|cloud white|starlight|white/,'#eef1f4'],[/natural titanium|desert titanium|light gold|gold/,'#c9b28b'],[/silver/,'#d7dbe1'],[/soft pink|pink|rose gold/,'#e5b6bd'],[/sage|green|alpine green|midnight green|teal/,'#7f9b8b'],[/lavender|purple|deep purple/,'#8d79a6'],[/yellow/,'#e4ca68'],[/red|product/,'#b33a3a']];return(map.find(([rx])=>rx.test(k))||[null,'#cfd6df'])[1]}
  function buildWhatsAppUrl(msg){return 'https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(msg)}
  function categoryAllowed(kind){return activeCategory==='todos'||activeCategory===kind}
  function lineAllowed(m){return activeLine==='todos'||normalize(modelFamily(m))===normalize(activeLine)}
  function matchesModelSearch(m,kind){if(!activeSearch)return true;const info=IPHONE_17_PRICING[m.model_name]||{},hay=[m.model_name,m.year,m.line,modelFamily(m),m.capacities.join(' '),(info.colors||m.colors||[]).join(' '),kind].join(' ');return normalize(hay).includes(normalize(activeSearch))}
  function newModelsFor(models){return models.filter(m=>isNewModel(m)&&categoryAllowed('novo')&&lineAllowed(m)&&matchesModelSearch(m,'Novo')).sort((a,b)=>(IPHONE_17_RANK.get(a.model_name)??999)-(IPHONE_17_RANK.get(b.model_name)??999))}
  function ecpoModelsFor(models){return models.filter(m=>isEcpoModel(m)&&categoryAllowed('ecpo')&&lineAllowed(m)&&matchesModelSearch(m,'eCPO')).sort((a,b)=>(ECPO_RANK.get(a.model_name)??999)-(ECPO_RANK.get(b.model_name)??999))}
  function colorList(colors){return'<div class="color-list">'+colors.map(c=>'<span class="color-static"><span class="color-swatch" style="--swatch:'+escapeHtml(colorHex(c))+'" aria-hidden="true"></span><span>'+escapeHtml(c)+'</span></span>').join('')+'</div>'}
  function iphone17Info(m){return IPHONE_17_PRICING[m.model_name]||{colors:m.colors||[],prices:{}}}
  function capacityRowsFor(m){const info=iphone17Info(m);return Object.keys(info.prices||{}).map(capacity=>({model:m,capacity,applePrice:Number(info.prices[capacity])||null}))}
  function renderModelCell(m){return'<div class="model-cell"><strong>'+escapeHtml(m.model_name)+'</strong><small>'+escapeHtml(m.year)+' &bull; Novo</small></div>'}
  function renderEcpoModelCell(m){return'<div class="model-cell"><strong>'+escapeHtml(m.model_name)+'</strong><small>'+escapeHtml(m.year)+' &bull; eCPO</small></div>'}
  function renderMoneyCell(value,highlight){return value?'<strong class="'+(highlight?'price-usd':'')+'">'+formatUsdCents(value)+'</strong>':'<span class="review-price">Em revisão</span>'}
  function renderCatalogRow(row){const m=row.model,info=iphone17Info(m),apple=row.applePrice,tax=apple?apple*FLORIDA_TAX_RATE:null,siteUsd=apple?apple+tax:null,siteBrl=siteUsd?siteUsd*CATALOG_RATE:null,msg='Olá, tenho interesse no '+m.model_name+' '+row.capacity+' novo pela CELULARS. Gostaria de confirmar cor, preço final e condições de compra.';return'<tr class="catalog-table-row" data-model="'+escapeHtml(m.model_name)+'"><td data-label="Modelo">'+renderModelCell(m)+'</td><td data-label="Capacidade"><span class="capacity-pill">'+escapeHtml(row.capacity)+'</span></td><td data-label="Cores">'+colorList(info.colors||m.colors||[])+'</td><td data-label="Condição"><span class="condition-pill">Novo</span></td><td data-label="Preço Apple">'+renderMoneyCell(apple,false)+'</td><td data-label="Taxa FL 7%">'+renderMoneyCell(tax,false)+'</td><td data-label="Preço CELULARS US$">'+renderMoneyCell(siteUsd,true)+'</td><td data-label="Preço CELULARS R$">'+(siteBrl?'<strong>'+formatBrl(siteBrl)+'</strong>':'<span class="review-price">Em revisão</span>')+'</td><td data-label="WhatsApp"><a class="whatsapp-button is-secondary table-whatsapp" href="'+buildWhatsAppUrl(msg)+'" target="_blank" rel="noopener">Consultar</a></td></tr>'}
  function renderTable(rows){return'<div class="catalog-table-wrap"><table class="catalog-table is-iphone17-pricing"><thead><tr><th>Modelo</th><th>Capacidade</th><th>Cores</th><th>Condição</th><th>Preço Apple</th><th>Taxa FL 7%</th><th>Preço CELULARS US$</th><th>Preço CELULARS R$</th><th>WhatsApp</th></tr></thead><tbody>'+rows.map(renderCatalogRow).join('')+'</tbody></table></div>'}
  function renderEcpoRow(m){return'<tr class="catalog-table-row" data-model="'+escapeHtml(m.model_name)+'"><td data-label="Modelo">'+renderEcpoModelCell(m)+'</td><td data-label="Ano"><span class="year-badge">'+escapeHtml(m.year)+'</span></td><td data-label="Capacidades"><div class="capacity-list">'+m.capacities.map(c=>'<span class="capacity-pill">'+escapeHtml(c)+'</span>').join('')+'</div></td><td data-label="Cores">'+colorList(m.colors||[])+'</td><td data-label="Condição"><span class="condition-pill is-ecpo">eCPO</span></td><td data-label="Consulta"><span class="review-price">Preço sob consulta</span></td></tr>'}
  function renderEcpoTable(models){return'<div class="catalog-table-wrap"><table class="catalog-table is-ecpo-consult"><thead><tr><th>Modelo</th><th>Ano</th><th>Capacidades</th><th>Cores</th><th>Condição</th><th>Consulta</th></tr></thead><tbody>'+models.map(renderEcpoRow).join('')+'</tbody></table></div>'}
  function renderCatalogLayout(newRows,ecpoRows){let html='';if(newRows.length)html+='<section class="catalog-table-section"><div class="section-heading"><span>Novos</span><strong>iPhones novos linha 17</strong></div><p class="section-note">Modelos novos da linha iPhone 17 com valores de referência baseados no preço oficial Apple acrescido da taxa da Flórida/Miami-Dade. A conversão em reais usa a Cotação CELULARS vigente.</p>'+renderTable(newRows)+'</section>';if(ecpoRows.length)html+='<section class="catalog-table-section"><div class="section-heading"><span>eCPO</span><strong>iPhones eCPO P1 / Grade A do 12 ao 17</strong></div><p class="section-note">Aparelhos eCPO P1 / Grade A selecionados pela CELULARS para varejo. Preços, disponibilidade, grade, condição e lote são confirmados pelo WhatsApp conforme estoque do momento.</p>'+renderEcpoTable(ecpoRows)+'</section>';return html}
  function wireCatalogControls(){}
  function renderCatalog(){const newRows=newModelsFor(IPHONE_MODELS).flatMap(capacityRowsFor),ecpoRows=ecpoModelsFor(IPHONE_MODELS);gridEl.innerHTML=renderCatalogLayout(newRows,ecpoRows);wireCatalogControls();const total=newRows.length+ecpoRows.length;statusEl.hidden=!!total;statusEl.textContent=total?'':'Nenhum iPhone encontrado para este filtro.'}
  function setActive(btns,active){btns.forEach(b=>b.classList.toggle('is-active',b===active))}
  categoryButtons.forEach(b=>b.addEventListener('click',()=>{activeCategory=b.dataset.categoryFilter;setActive(categoryButtons,b);renderCatalog()}));lineButtons.forEach(b=>b.addEventListener('click',()=>{activeLine=b.dataset.lineFilter;setActive(lineButtons,b);renderCatalog()}));searchInput?.addEventListener('input',()=>{activeSearch=searchInput.value;renderCatalog()});renderCatalog();updateBcbExchangeRate();
})();
