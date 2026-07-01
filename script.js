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

  const shellEl = document.querySelector('#celulars-iphones-catalog');
  document.querySelector('[data-condition-filter="Modelo informativo"]')?.remove();
  const gridEl = document.querySelector('[data-catalog-grid]');
  const statusEl = document.querySelector('[data-status]');
  const conditionButtons = [...document.querySelectorAll('[data-condition-filter]')];
  const lineButtons = [...document.querySelectorAll('[data-line-filter]')];
  const techModalEl = document.createElement('div');
  techModalEl.className = 'tech-modal';
  techModalEl.hidden = true;
  techModalEl.setAttribute('aria-hidden','true');
  techModalEl.innerHTML = '<section class="tech-panel" role="dialog" aria-modal="true" aria-labelledby="tech-title"><header class="tech-header"><div><span class="tech-kicker">CELULARS</span><h2 class="tech-title" id="tech-title" data-tech-title></h2></div><button class="tech-close" type="button" aria-label="Fechar ficha t\u00e9cnica" data-tech-close>&times;</button></header><div class="tech-body" data-tech-body></div><div class="tech-actions"><button class="tech-button" type="button" data-tech-close>Fechar</button><a class="whatsapp-button" href="#" target="_blank" rel="noopener" data-tech-whatsapp></a></div></section>';
  shellEl.appendChild(techModalEl);
  const techTitleEl = techModalEl.querySelector('[data-tech-title]');
  const techBodyEl = techModalEl.querySelector('[data-tech-body]');
  const techWhatsappEl = techModalEl.querySelector('[data-tech-whatsapp]');
  const STANDARD_CONDITIONS = ['Novo','eCPO eco Certified Pre-Owned'];
  IPHONE_MODELS.forEach(m=>{m.conditions=[...STANDARD_CONDITIONS];m.stock_status='Disponível'});
  let activeCondition = 'todos', activeLine = 'todos';
  const MAIN_TABLE_MODELS = new Set(['iPhone X','iPhone XR','iPhone XS','iPhone XS Max','iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max','iPhone 12','iPhone 12 mini','iPhone 12 Pro','iPhone 12 Pro Max','iPhone 13','iPhone 13 mini','iPhone 13 Pro','iPhone 13 Pro Max','iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max','iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max','iPhone 16e','iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max','iPhone 17e','iPhone 17','iPhone Air','iPhone 17 Pro','iPhone 17 Pro Max']);

  function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
  function escapeHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function formatUsd(v){return 'US$ '+Math.round(v).toLocaleString('en-US')}
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
  function isMainTableModel(m){return MAIN_TABLE_MODELS.has(m.model_name)}
  function basePrice(m){const p=Number(m.base_price_usd);return p>0?p:null}
  function explicitConditionPrice(m,condition){const key=normalize(condition).includes('ecpo')?'price_ecpo_usd':'price_new_usd',p=Number(m[key]);return p>0?p:null}
  function colorHex(c){const k=normalize(c),map=[[/cosmic orange|coral/,'#d97845'],[/deep blue|blue titanium|pacific blue|sierra blue|mist blue|sky blue|blue|ultramarine/,'#6f8fb8'],[/space black|black titanium|space gray|graphite|midnight|jet black|black/,'#2d3036'],[/white titanium|cloud white|starlight|white/,'#eef1f4'],[/natural titanium|desert titanium|light gold|gold/,'#c9b28b'],[/silver/,'#d7dbe1'],[/soft pink|pink|rose gold/,'#e5b6bd'],[/sage|green|alpine green|midnight green|teal/,'#7f9b8b'],[/lavender|purple|deep purple/,'#8d79a6'],[/yellow/,'#e4ca68'],[/red|product/,'#b33a3a']];return(map.find(([rx])=>rx.test(k))||[null,'#cfd6df'])[1]}
  function buildWhatsAppUrl(msg){return 'https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(msg)}
  function messageFor(m,s){return s.capacity&&s.color&&s.condition?'Olá, tenho interesse no '+m.model_name+', capacidade '+s.capacity+', cor '+s.color+', condição '+s.condition+', pela CELULARS. Gostaria de confirmar disponibilidade, preço final e condições de compra.':'Olá, tenho interesse no '+m.model_name+' pela CELULARS. Gostaria de confirmar capacidades, cores, disponibilidade, preço final e condições de compra.'}
  function techMessageFor(m,s){return 'Olá, vi a ficha técnica do '+m.model_name+', '+s.capacity+', cor '+s.color+', condição '+s.condition+', no site da CELULARS. Gostaria de confirmar disponibilidade, preço final e condições de compra.'}
  function matchesFilters(m){return(activeCondition==='todos'||m.conditions.some(c=>normalize(c)===normalize(activeCondition)))&&(activeLine==='todos'||normalize(m.line)===normalize(activeLine))}
  function optionButtons(kind,vals,sel){return vals.map(v=>{const selected=normalize(v)===normalize(sel),swatch=kind==='color'?'<span class="color-swatch" style="--swatch:'+escapeHtml(colorHex(v))+'" aria-hidden="true"></span>':'';return'<button class="option-chip'+(kind==='color'?' color-chip':'')+(selected?' is-selected':'')+'" type="button" data-option="'+escapeHtml(kind)+'" data-value="'+escapeHtml(v)+'" aria-pressed="'+(selected?'true':'false')+'">'+swatch+'<span>'+escapeHtml(v)+'</span></button>'}).join('')}
  function compactOptionList(kind,vals,sel){return'<div class="option-row compact-options">'+optionButtons(kind,vals,sel)+'</div>'}
  function renderBasePriceSummary(m){const p=basePrice(m);return p?'<span class="price-prefix">A partir de</span><strong>'+formatUsd(p)+'</strong><span>'+formatBrl(p*CATALOG_RATE)+'</span>':'<span class="price-prefix">A partir de</span><strong class="price-consult">Sob consulta</strong><span>Confirmação via WhatsApp</span>'}
  function renderConditionPrice(m,condition,selected){const p=explicitConditionPrice(m,condition),label=normalize(condition).includes('ecpo')?'eCPO':'Novo';return'<button class="price-option'+(selected?' is-selected':'')+'" type="button" data-option="condition" data-value="'+escapeHtml(condition)+'" aria-pressed="'+(selected?'true':'false')+'"><span>'+label+'</span>'+(p?'<strong>'+formatUsd(p)+'</strong><em>'+formatBrl(p*CATALOG_RATE)+'</em>':'<strong>Sob consulta</strong><em>confirmar valor final</em>')+'</button>'}
  function renderPriceCells(m,s){return{ecpo:renderConditionPrice(m,'eCPO eco Certified Pre-Owned',normalize(s.condition).includes('ecpo')),novo:renderConditionPrice(m,'Novo',normalize(s.condition)==='novo')}}
  function selectedPriceText(m,s){const p=explicitConditionPrice(m,s.condition),general=basePrice(m);if(p)return formatUsd(p)+' / '+formatBrl(p*CATALOG_RATE);return general?'Sob consulta; referência geral a partir de '+formatUsd(general)+' / '+formatBrl(general*CATALOG_RATE):'Sob consulta'}
  function statusClass(m){return'is-available'}
  function selectedState(a){return{capacity:a.dataset.capacity,color:a.dataset.color,condition:a.dataset.condition}}
  function updateCard(a,m){const s=selectedState(a),action=a.querySelector('[data-action]'),selectedColor=a.querySelector('[data-selected-color]'),selectedCapacity=a.querySelector('[data-selected-capacity]'),selectedCondition=a.querySelector('[data-selected-condition]');const summary=a.querySelector('[data-price-summary]');if(summary)summary.innerHTML=renderBasePriceSummary(m);if(action)action.href=buildWhatsAppUrl(messageFor(m,s));if(selectedColor)selectedColor.textContent=s.color;if(selectedCapacity)selectedCapacity.textContent=s.capacity;if(selectedCondition)selectedCondition.textContent=s.condition;const cells=renderPriceCells(m,s),ecpo=a.querySelector('[data-price-cell="ecpo"]'),novo=a.querySelector('[data-price-cell="novo"]');if(ecpo)ecpo.innerHTML=cells.ecpo;if(novo)novo.innerHTML=cells.novo;a.querySelectorAll('[data-option]').forEach(b=>{const on=normalize(b.dataset.value)===normalize(s[b.dataset.option]);b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',on?'true':'false')})}
  function techSection(title,rows){const body=rows.filter(r=>r[1]!==undefined&&r[1]!==null&&String(r[1]).trim()!=='').map(r=>'<div><dt>'+escapeHtml(r[0])+'</dt><dd>'+escapeHtml(r[1])+'</dd></div>').join('');return'<section class="tech-section"><h3>'+escapeHtml(title)+'</h3><dl class="tech-list">'+body+'</dl></section>'}
  function openTechModal(a,m){const s=selectedState(a),sp=m.specs||DEFAULT_SPECS,priceText=selectedPriceText(m,s),note='Preços, disponibilidade e conversão em reais são apenas referência e precisam ser confirmados via WhatsApp.';techTitleEl.textContent='Ficha técnica \u2014 '+m.model_name;techBodyEl.innerHTML=techSection('Visão geral',[["Modelo",m.model_name],["Ano de lançamento",m.year],["Família / linha",m.family+' / '+m.line],["Status",m.stock_status||'Disponível'],["Condição selecionada",s.condition],["Preço",priceText]])+techSection('Capacidades',[["Opções",m.capacities.join(', ')],["Selecionada",s.capacity]])+techSection('Cores oficiais',[["Cores",m.colors.join(', ')],["Selecionada",s.color]])+techSection('Tela',[["Tamanho",sp.screen_size||sp.screen],["Tecnologia",sp.display_technology],["Resolução",sp.resolution],["Taxa de atualização / ProMotion",sp.refresh_rate]])+techSection('Chip / Performance',[["Processador / chip",sp.chip],["Neural Engine",sp.neural_engine]])+techSection('Câmeras',[["Sistema traseiro",sp.rear_camera],["Câmera frontal",sp.front_camera],["Vídeo",sp.video]])+techSection('Segurança',[["Autenticação",sp.security],["Botão Home",sp.home_button]])+techSection('Conectividade',[["Rede",sp.network],["Wi-Fi",sp.wifi],["Bluetooth",sp.bluetooth],["SIM / eSIM",sp.sim_esim]])+techSection('Bateria e carregamento',[["Conector",sp.connector],["Carregamento sem fio / MagSafe",sp.wireless_charging]])+techSection('Sistema',[["iOS original",sp.original_ios],["Suporte iOS",sp.ios_support_note]])+'<section class="tech-section"><h3>Observações CELULARS</h3><p class="tech-note">'+escapeHtml(note)+'</p></section>';techWhatsappEl.textContent='Consultar pelo WhatsApp';techWhatsappEl.href=buildWhatsAppUrl(techMessageFor(m,s));techModalEl.hidden=false;techModalEl.setAttribute('aria-hidden','false');techModalEl.querySelector('[data-tech-close]').focus()}
  function closeTechModal(){techModalEl.hidden=true;techModalEl.setAttribute('aria-hidden','true')}
  function rowDataAttrs(m,i,s){return'class="catalog-table-row" data-model-index="'+i+'" data-capacity="'+escapeHtml(s.capacity)+'" data-color="'+escapeHtml(s.color)+'" data-condition="'+escapeHtml(s.condition)+'"'}
  function renderModelCell(m,s){return'<div class="model-cell"><strong>'+escapeHtml(m.model_name)+'</strong><span data-price-summary>'+renderBasePriceSummary(m)+'</span><small>Cor selecionada: <b data-selected-color>'+escapeHtml(s.color)+'</b></small></div>'}
  function renderActions(m,s){return'<div class="table-actions"><button class="tech-button" type="button" data-tech-trigger>Ver ficha técnica</button><a class="whatsapp-button" href="'+buildWhatsAppUrl(messageFor(m,s))+'" target="_blank" rel="noopener" data-action>Consultar pelo WhatsApp</a></div>'}
  function renderCatalogRow(m,i){const s={capacity:m.capacities[0],color:m.colors[0],condition:m.conditions[0]},cells=renderPriceCells(m,s);return'<tr '+rowDataAttrs(m,i,s)+'><td data-label="Modelo">'+renderModelCell(m,s)+'</td><td data-label="Ano"><span class="year-badge">'+m.year+'</span></td><td data-label="Capacidades">'+compactOptionList('capacity',m.capacities,s.capacity)+'</td><td data-label="Cores">'+compactOptionList('color',m.colors,s.color)+'</td><td data-label="eCPO" data-price-cell="ecpo">'+cells.ecpo+'</td><td data-label="Novo" data-price-cell="novo">'+cells.novo+'</td><td data-label="Status"><span class="status-pill '+statusClass(m)+'">Status: '+escapeHtml(m.stock_status||'Disponível')+'</span></td><td data-label="Ação">'+renderActions(m,s)+'</td></tr>'}
  function renderLegacyCard(m,i){const s={capacity:m.capacities[0],color:m.colors[0],condition:m.conditions[0]},cells=renderPriceCells(m,s);return'<article class="legacy-card" '+rowDataAttrs(m,i,s).replace('class="catalog-table-row"','')+'><div class="legacy-card-head">'+renderModelCell(m,s)+'<span class="year-badge">'+m.year+'</span></div><div class="legacy-options"><div><span>Capacidades</span>'+compactOptionList('capacity',m.capacities,s.capacity)+'</div><div><span>Cores</span>'+compactOptionList('color',m.colors,s.color)+'</div><div class="legacy-price-columns"><div><span>eCPO</span><div data-price-cell="ecpo">'+cells.ecpo+'</div></div><div><span>Novo</span><div data-price-cell="novo">'+cells.novo+'</div></div></div></div><div class="legacy-footer"><span class="status-pill '+statusClass(m)+'">Status: '+escapeHtml(m.stock_status||'Disponível')+'</span>'+renderActions(m,s)+'</div></article>'}
  function renderTable(models){return'<div class="catalog-table-wrap"><table class="catalog-table"><thead><tr><th>Modelo</th><th>Ano</th><th>Capacidades</th><th>Cores</th><th>eCPO</th><th>Novo</th><th>Status</th><th>Ação</th></tr></thead><tbody>'+models.map((m)=>renderCatalogRow(m,IPHONE_MODELS.indexOf(m))).join('')+'</tbody></table></div>'}
  function renderCatalogLayout(models){const main=models.filter(isMainTableModel),legacy=models.filter(m=>!isMainTableModel(m));let html='';if(main.length)html+='<section class="catalog-table-section"><div class="section-heading"><span>Tabela principal</span><strong>iPhone X ao iPhone 17</strong></div>'+renderTable(main)+'</section>';if(legacy.length)html+='<section class="legacy-consult-section"><div class="section-heading"><span>Consulta especial</span><strong>Modelos anteriores sob consulta</strong></div><div class="legacy-consult-grid">'+legacy.map(m=>renderLegacyCard(m,IPHONE_MODELS.indexOf(m))).join('')+'</div></section>';html+='<p class="table-reference-note">Preços, disponibilidade e conversão em reais são apenas referência e precisam ser confirmados via WhatsApp.</p>';return html}
  function wireCatalogControls(){gridEl.querySelectorAll('[data-model-index]').forEach(a=>{const m=IPHONE_MODELS[Number(a.dataset.modelIndex)];a.addEventListener('click',e=>{const b=e.target.closest('[data-option]');if(!b||!a.contains(b))return;a.dataset[b.dataset.option]=b.dataset.value;updateCard(a,m)});a.querySelectorAll('[data-tech-trigger]').forEach(b=>b.addEventListener('click',()=>openTechModal(a,m)))})}
  function renderCatalog(){const ms=IPHONE_MODELS.filter(matchesFilters);gridEl.innerHTML=renderCatalogLayout(ms);wireCatalogControls();statusEl.hidden=!!ms.length;statusEl.textContent=ms.length?'':'Nenhum iPhone encontrado para este filtro.'}
  function setActive(btns,active){btns.forEach(b=>b.classList.toggle('is-active',b===active))}
  conditionButtons.forEach(b=>b.addEventListener('click',()=>{activeCondition=b.dataset.conditionFilter;setActive(conditionButtons,b);renderCatalog()}));lineButtons.forEach(b=>b.addEventListener('click',()=>{activeLine=b.dataset.lineFilter;setActive(lineButtons,b);renderCatalog()}));techModalEl.addEventListener('click',e=>{if(e.target===techModalEl||e.target.closest('[data-tech-close]'))closeTechModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&techModalEl?.hidden===false)closeTechModal()});renderCatalog();updateBcbExchangeRate();
})();
