import csv
import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps


PROJECT = Path(os.environ["CELULARS_PROJECT"]).resolve()
ROOT = PROJECT / "third-party-image-candidates"
RAW = ROOT / "raw"
WEBP = ROOT / "webp"
REVIEW = ROOT / "review"
REJECTED = ROOT / "rejected"
REPORT = PROJECT / "third-party-image-candidates.csv"
CHECKLIST = PROJECT / "image-upload-checklist.csv"
READY = PROJECT / "images-ready-for-godaddy-upload.csv"
APPLE_REVIEW = PROJECT / "official-apple-image-review.csv"
APPLE_REVIEW_DIR = PROJECT / "official-apple-images" / "review"

PRIORITY_MODELS = [
    "iPhone 16 Pro Max",
    "iPhone 16 Pro",
    "iPhone 16e",
    "iPhone 15 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15 Plus",
    "iPhone 15",
    "iPhone 14 Pro Max",
    "iPhone 14 Pro",
    "iPhone 14 Plus",
    "iPhone 14",
    "iPhone 13 Pro Max",
    "iPhone 13 Pro",
    "iPhone 13",
    "iPhone 12",
    "iPhone 11",
]


def slug(value):
    value = value.lower().replace("(product)red", "product red")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def read_csv(path):
    with path.open("r", newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows):
    fields = [
        "model_name",
        "color",
        "view",
        "source_page",
        "image_url",
        "source_domain",
        "license_status",
        "usage_risk",
        "downloaded_filename",
        "converted_webp_filename",
        "status",
        "notes",
    ]
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def request_json(url, params):
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        f"{url}?{qs}",
        headers={"User-Agent": "CELULARS image candidate review (local catalog preparation)"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def commons_search(query, limit=4):
    data = request_json(
        "https://commons.wikimedia.org/w/api.php",
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrnamespace": "6",
            "gsrsearch": query,
            "gsrlimit": str(limit),
            "prop": "imageinfo",
            "iiprop": "url|mime|size|extmetadata",
        },
    )
    pages = data.get("query", {}).get("pages", {})
    items = []
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}
        items.append(
            {
                "title": page.get("title", ""),
                "page": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(page.get("title", "").replace(" ", "_")),
                "url": info.get("url", ""),
                "mime": info.get("mime", ""),
                "width": info.get("width", 0),
                "height": info.get("height", 0),
                "license": html.unescape((meta.get("LicenseShortName") or {}).get("value", "")),
                "artist": html.unescape(re.sub("<.*?>", "", (meta.get("Artist") or {}).get("value", ""))),
            }
        )
    return items


def license_risk(license_name):
    low = {"CC0", "Public domain", "PD", "CC-PD-Mark"}
    if license_name in low:
        return "low"
    if license_name and ("CC BY" in license_name or "Creative Commons" in license_name):
        return "medium"
    return "high"


def bad_title(title):
    t = title.lower()
    blocked = ["screenshot", "screen shot", "logo", "icon", "svg", "case", "box", "packaging", "store", "mall", "hand"]
    return any(word in t for word in blocked)


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "CELULARS image candidate review"})
    with urllib.request.urlopen(req, timeout=45) as response:
        data = response.read()
    path.write_bytes(data)
    return data


def normalize_webp(raw_path, webp_path):
    with Image.open(raw_path) as image:
        image.load()
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGBA")
        image.thumbnail((980, 980), Image.LANCZOS)
        canvas = Image.new("RGBA", (1200, 1200), (248, 250, 252, 255))
        canvas.alpha_composite(image, ((1200 - image.width) // 2, (1200 - image.height) // 2))
        webp_path.parent.mkdir(parents=True, exist_ok=True)
        canvas.convert("RGB").save(webp_path, "WEBP", quality=88, method=6)


def source_domain(url):
    return urllib.parse.urlparse(url).netloc


def add_apple_review_rows(rows, checklist_rows, active_keys):
    review_rows = read_csv(APPLE_REVIEW) if APPLE_REVIEW.exists() else []
    review_by_model = {}
    for row in review_rows:
        if row.get("review_filename"):
            review_by_model.setdefault(row["model_name"], row)
    for item in checklist_rows:
        model = item["model_name"]
        color = item["color"]
        if model not in review_by_model:
            continue
        rev = review_by_model[model]
        source_file = APPLE_REVIEW_DIR / rev["review_filename"]
        if not source_file.exists():
            continue
        for view in ("front", "back"):
            if f"{model}|{color}|{view}" in active_keys:
                continue
            out_name = f"{slug(model)}-{slug(color)}-{view}-apple-review-composite.webp"
            out_file = REVIEW / out_name
            if not out_file.exists():
                normalize_webp(source_file, out_file)
            rows.append(
                {
                    "model_name": model,
                    "color": color,
                    "view": view,
                    "source_page": rev["source_page"],
                    "image_url": rev["review_source_url"],
                    "source_domain": source_domain(rev["review_source_url"]),
                    "license_status": "Official Apple support image; usage requires manual approval",
                    "usage_risk": "medium",
                    "downloaded_filename": rev["review_filename"],
                    "converted_webp_filename": out_name,
                    "status": "needs_manual_review",
                    "notes": "Official Apple composite/model-identification image, not a clean single-color front/back product image.",
                }
            )


def main():
    for folder in (ROOT, RAW, WEBP, REVIEW, REJECTED):
        folder.mkdir(parents=True, exist_ok=True)

    checklist_rows = read_csv(CHECKLIST)
    active = read_csv(READY) if READY.exists() else []
    active_keys = {
        f"{row['model_name']}|{row['color']}|{row['view']}"
        for row in active
        if row.get("godaddy_url")
    }
    remaining = [
        row
        for row in checklist_rows
        if f"{row['model_name']}|{row['color']}|front" not in active_keys
        or f"{row['model_name']}|{row['color']}|back" not in active_keys
    ]
    priority_order = {name: i for i, name in enumerate(PRIORITY_MODELS)}
    remaining.sort(key=lambda r: (priority_order.get(r["model_name"], 999), r["model_name"], r["color"]))

    rows = []
    add_apple_review_rows(rows, remaining, active_keys)

    queried = set()
    # Query Commons for one licensed candidate per remaining model/color, front-oriented first.
    for item in remaining:
        model, color = item["model_name"], item["color"]
        for view in ("front", "back"):
            if f"{model}|{color}|{view}" in active_keys:
                continue
            query = f'"{model}" "{color}" iPhone'
            key = f"{model}|{color}|{view}"
            if key in queried:
                continue
            queried.add(key)
            status = "missing"
            candidate = None
            try:
                candidates = commons_search(query, 4)
                for cand in candidates:
                    if not cand["url"] or not cand["mime"].startswith("image/"):
                        continue
                    if bad_title(cand["title"]):
                        continue
                    if model.lower().replace(" ", "")[:8] not in cand["title"].lower().replace(" ", ""):
                        continue
                    candidate = cand
                    break
            except Exception as exc:
                candidates = []
                err = str(exc)
            else:
                err = ""

            if candidate:
                risk = license_risk(candidate["license"])
                raw_ext = Path(urllib.parse.urlparse(candidate["url"]).path).suffix or ".jpg"
                raw_name = f"{slug(model)}-{slug(color)}-{view}-commons{raw_ext.lower()}"
                webp_name = f"{slug(model)}-{slug(color)}-{view}.webp"
                raw_path = RAW / raw_name
                webp_path = WEBP / webp_name
                try:
                    if not raw_path.exists():
                        download(candidate["url"], raw_path)
                    normalize_webp(raw_path, webp_path)
                    status = "needs_manual_review" if risk != "low" else "approved_candidate"
                    notes = f"Wikimedia Commons candidate. Verify exact color/view and attribution before use. Source title: {candidate['title']}"
                except Exception as exc:
                    status = "rejected"
                    notes = f"Candidate rejected after download/convert failure: {exc}; source title: {candidate['title']}"
                    webp_name = ""
                    if raw_path.exists():
                        try:
                            raw_path.replace(REJECTED / raw_path.name)
                        except Exception:
                            pass
                rows.append(
                    {
                        "model_name": model,
                        "color": color,
                        "view": view,
                        "source_page": candidate["page"],
                        "image_url": candidate["url"],
                        "source_domain": source_domain(candidate["url"]),
                        "license_status": candidate["license"],
                        "usage_risk": risk,
                        "downloaded_filename": raw_name if status != "missing" else "",
                        "converted_webp_filename": webp_name,
                        "status": status,
                        "notes": notes,
                    }
                )
            else:
                rows.append(
                    {
                        "model_name": model,
                        "color": color,
                        "view": view,
                        "source_page": "https://commons.wikimedia.org/",
                        "image_url": "",
                        "source_domain": "commons.wikimedia.org",
                        "license_status": "",
                        "usage_risk": "high",
                        "downloaded_filename": "",
                        "converted_webp_filename": "",
                        "status": "missing" if not err else "rejected",
                        "notes": "No suitable licensed Wikimedia Commons candidate found." if not err else f"Commons query failed: {err}",
                    }
                )
            time.sleep(0.08)

    write_csv(REPORT, rows)
    print(f"report={REPORT}")
    print(f"rows={len(rows)}")
    print(f"approved_candidate={sum(1 for r in rows if r['status']=='approved_candidate')}")
    print(f"needs_manual_review={sum(1 for r in rows if r['status']=='needs_manual_review')}")
    print(f"rejected={sum(1 for r in rows if r['status']=='rejected')}")
    print(f"missing={sum(1 for r in rows if r['status']=='missing')}")
    print(f"webp_files={len(list(WEBP.glob('*.webp')))}")
    print(f"review_files={len(list(REVIEW.glob('*.webp')))}")


if __name__ == "__main__":
    main()
