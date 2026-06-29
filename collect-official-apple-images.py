import csv
import html
import os
import re
import shutil
import tempfile
import urllib.request
from collections import defaultdict
from io import BytesIO
from pathlib import Path

from PIL import Image


PROJECT = Path(os.environ.get("CELULARS_PROJECT", ".")).resolve()
CHECKLIST = PROJECT / "image-upload-checklist.csv"
OUT = PROJECT / "official-apple-images"
FRONT_DIR = OUT / "front"
BACK_DIR = OUT / "back"
REVIEW_DIR = OUT / "review"
REPORT_FOUND = PROJECT / "official-apple-image-found.csv"
REPORT_MISSING = PROJECT / "official-apple-image-missing.csv"
REPORT_REVIEW = PROJECT / "official-apple-image-review.csv"

PAGES = {
    "iPhone 17e": "https://www.apple.com/shop/buy-iphone/iphone-17e",
    "iPhone 17 Pro Max": "https://www.apple.com/shop/buy-iphone/iphone-17-pro",
    "iPhone 17 Pro": "https://www.apple.com/shop/buy-iphone/iphone-17-pro",
    "iPhone Air": "https://www.apple.com/shop/buy-iphone/iphone-air",
    "iPhone 17": "https://www.apple.com/shop/buy-iphone/iphone-17",
    "iPhone 16 Plus": "https://www.apple.com/shop/buy-iphone/iphone-16",
    "iPhone 16": "https://www.apple.com/shop/buy-iphone/iphone-16",
}

SUPPORT_IDENTIFY = "https://support.apple.com/en-us/108044"


def slug(s):
    s = s.lower().replace("(product)red", "product red")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def compact_slug(s):
    return slug(s).replace("-", "")


def fetch(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 CELULARS official Apple image collection"
        },
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def page_assets(url):
    try:
        body = fetch(url).decode("utf-8", "ignore")
    except Exception:
        return []
    urls = re.findall(r"https://store\.storeimages\.cdn-apple\.com/[^\"' <>]+", body)
    urls += ["https://www.apple.com" + u for u in re.findall(r"/iphone/[^\"' <>]+?\.(?:png|jpg|jpeg)", body)]
    return sorted(set(html.unescape(u) for u in urls))


def choose_asset(assets, model_name, color, view):
    mslug = slug(model_name)
    cslug = slug(color)
    ccompact = compact_slug(color)
    candidates = []
    for url in assets:
        low = url.lower()
        if mslug not in low:
            continue
        if cslug not in low and ccompact not in low:
            continue
        if "select" not in low and "finish-select" not in low:
            continue
        if view == "front":
            if "_av" in low:
                continue
            if "png-alpha" not in low:
                continue
            score = 0
            if "finish-select" in low:
                score += 4
            if f"{mslug}-{cslug}-select" in low:
                score += 3
            if f"{mslug}-finish-select-{ccompact}" in low:
                score += 3
            if "wid=940" in low:
                score += 2
            candidates.append((score, url))
        else:
            if "_av2" not in low:
                continue
            score = 0
            if "finish-select" in low:
                score += 4
            if f"{mslug}-{cslug}-select" in low:
                score += 3
            if f"{mslug}-finish-select-{ccompact}" in low:
                score += 3
            if "png-alpha" in low:
                score += 2
            candidates.append((score, url))
    if not candidates:
        return ""
    return sorted(candidates, key=lambda x: (-x[0], len(x[1])))[0][1]


def convert_to_webp(url, output_path):
    data = fetch(url)
    with Image.open(BytesIO(data)) as im:
        im.load()
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        im.save(output_path, "WEBP", quality=88, method=6)
    return output_path.stat().st_size


def write_csv(path, rows, fields):
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def main():
    OUT.mkdir(exist_ok=True)
    for d in (FRONT_DIR, BACK_DIR, REVIEW_DIR):
        d.mkdir(parents=True, exist_ok=True)

    with CHECKLIST.open("r", newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    assets_by_page = {}
    for url in sorted(set(PAGES.values())):
        assets_by_page[url] = page_assets(url)

    support_assets = page_assets(SUPPORT_IDENTIFY)

    found_rows = []
    missing_rows = []
    review_rows = []

    for row in rows:
        model = row["model_name"]
        color = row["color"]
        page = PAGES.get(model)
        front_url = back_url = ""
        front_file = FRONT_DIR / row["image_front_filename"]
        back_file = BACK_DIR / row["image_back_filename"]

        if page:
            assets = assets_by_page.get(page, [])
            front_url = choose_asset(assets, model, color, "front")
            back_url = choose_asset(assets, model, color, "back")

        front_ok = back_ok = False
        err = ""
        if front_url:
            try:
                convert_to_webp(front_url, front_file)
                front_ok = True
            except Exception as e:
                err += f"front download/convert failed: {e}; "
        if back_url:
            try:
                convert_to_webp(back_url, back_file)
                back_ok = True
            except Exception as e:
                err += f"back download/convert failed: {e}; "

        if front_ok or back_ok:
            found_rows.append(
                {
                    "model_name": model,
                    "color": color,
                    "front_filename": front_file.name if front_ok else "",
                    "back_filename": back_file.name if back_ok else "",
                    "front_source_url": front_url if front_ok else "",
                    "back_source_url": back_url if back_ok else "",
                    "source_page": page,
                    "status": "complete" if front_ok and back_ok else "partial",
                    "notes": err,
                }
            )
        else:
            missing_rows.append(
                {
                    "model_name": model,
                    "color": color,
                    "front_filename": row["image_front_filename"],
                    "back_filename": row["image_back_filename"],
                    "source_checked": page or SUPPORT_IDENTIFY,
                    "status": "missing",
                    "notes": "No exact official Apple per-color front/back asset found. Do not substitute non-Apple images.",
                }
            )

        # Keep Apple Support composite images as review references only.
        mslug = slug(model)
        support_matches = [u for u in support_assets if mslug in u.lower()]
        if support_matches and not (front_ok and back_ok):
            review_rows.append(
                {
                    "model_name": model,
                    "color": color,
                    "review_source_url": support_matches[0],
                    "source_page": SUPPORT_IDENTIFY,
                    "status": "review",
                    "notes": "Official Apple composite/model identification image; not used as front/back per-color final asset.",
                }
            )

    fields_found = [
        "model_name",
        "color",
        "front_filename",
        "back_filename",
        "front_source_url",
        "back_source_url",
        "source_page",
        "status",
        "notes",
    ]
    fields_missing = [
        "model_name",
        "color",
        "front_filename",
        "back_filename",
        "source_checked",
        "status",
        "notes",
    ]
    fields_review = [
        "model_name",
        "color",
        "review_source_url",
        "source_page",
        "status",
        "notes",
    ]
    write_csv(REPORT_FOUND, found_rows, fields_found)
    write_csv(REPORT_MISSING, missing_rows, fields_missing)
    write_csv(REPORT_REVIEW, review_rows, fields_review)

    summary = {
        "rows_processed": len(rows),
        "found_rows": len(found_rows),
        "front_files": len(list(FRONT_DIR.glob("*.webp"))),
        "back_files": len(list(BACK_DIR.glob("*.webp"))),
        "total_webp": len(list(OUT.rglob("*.webp"))),
        "missing_rows": len(missing_rows),
        "review_rows": len(review_rows),
    }
    for k, v in summary.items():
        print(f"{k}={v}")


if __name__ == "__main__":
    main()
