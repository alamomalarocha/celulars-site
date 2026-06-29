import csv
import html
import os
from collections import defaultdict
from pathlib import Path


PROJECT = Path(os.environ["CELULARS_PROJECT"]).resolve()
CSV_PATH = PROJECT / "third-party-image-candidates.csv"
GALLERY_PATH = PROJECT / "third-party-image-review-gallery.html"
APPROVAL_PATH = PROJECT / "third-party-image-approval-template.csv"


def read_rows():
    with CSV_PATH.open("r", newline="", encoding="utf-8-sig") as f:
        return [row for row in csv.DictReader(f) if row.get("status") == "needs_manual_review"]


def esc(value):
    return html.escape(str(value or ""), quote=True)


def rel_image(row):
    name = row.get("converted_webp_filename") or row.get("downloaded_filename") or ""
    if not name:
        return ""
    candidates = [
        PROJECT / "third-party-image-candidates" / "review" / name,
        PROJECT / "third-party-image-candidates" / "webp" / name,
        PROJECT / "third-party-image-candidates" / "raw" / name,
    ]
    for path in candidates:
        if path.exists():
            return path.relative_to(PROJECT).as_posix()
    return ""


def write_approval(rows):
    fields = [
        "model_name",
        "color",
        "view",
        "candidate_filename",
        "source_page",
        "image_url",
        "usage_risk",
        "approved_by_user",
        "approval_notes",
    ]
    with APPROVAL_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "model_name": row["model_name"],
                    "color": row["color"],
                    "view": row["view"],
                    "candidate_filename": row.get("converted_webp_filename") or row.get("downloaded_filename") or "",
                    "source_page": row["source_page"],
                    "image_url": row["image_url"],
                    "usage_risk": row["usage_risk"],
                    "approved_by_user": "",
                    "approval_notes": "",
                }
            )


def card(row):
    image = rel_image(row)
    thumb = (
        f'<a class="thumb-link" href="{esc(image)}" target="_blank" rel="noopener">'
        f'<img src="{esc(image)}" alt="{esc(row["model_name"] + " " + row["color"] + " " + row["view"])}">'
        "</a>"
        if image
        else '<div class="missing-thumb">No local file</div>'
    )
    source = esc(row["source_page"])
    image_url = esc(row["image_url"])
    return f"""
      <article class="candidate-card risk-{esc(row['usage_risk'])}">
        <div class="thumb">{thumb}</div>
        <div class="card-main">
          <div class="card-title-row">
            <h3>{esc(row['model_name'])}</h3>
            <span class="view-pill">{esc(row['view'])}</span>
          </div>
          <p class="color-line">{esc(row['color'])}</p>
          <div class="quick-labels">
            <span>Good candidate</span>
            <span class="is-active">Needs review</span>
            <span>Reject</span>
          </div>
          <dl>
            <div><dt>Source domain</dt><dd>{esc(row['source_domain'])}</dd></div>
            <div><dt>License</dt><dd>{esc(row['license_status'])}</dd></div>
            <div><dt>Usage risk</dt><dd><span class="risk-label">{esc(row['usage_risk'])}</span></dd></div>
            <div><dt>Status</dt><dd>{esc(row['status'])}</dd></div>
            <div><dt>Local file</dt><dd>{esc(row.get('converted_webp_filename') or row.get('downloaded_filename'))}</dd></div>
          </dl>
          <p class="notes">{esc(row['notes'])}</p>
          <div class="links">
            <a href="{source}" target="_blank" rel="noopener">Source page</a>
            <a href="{image_url}" target="_blank" rel="noopener">Image URL</a>
          </div>
        </div>
      </article>
    """


def build_gallery(rows):
    grouped = defaultdict(lambda: defaultdict(list))
    for row in rows:
        grouped[row["model_name"]][row["color"]].append(row)

    sections = []
    for model in sorted(grouped):
        color_blocks = []
        for color in sorted(grouped[model]):
            items = sorted(grouped[model][color], key=lambda r: r["view"])
            color_blocks.append(
                f"""
                <section class="color-group">
                  <header class="color-header">
                    <h2>{esc(color)}</h2>
                    <span>{len(items)} candidate{'s' if len(items) != 1 else ''}</span>
                  </header>
                  <div class="view-grid">{''.join(card(row) for row in items)}</div>
                </section>
                """
            )
        sections.append(
            f"""
            <section class="model-group">
              <header class="model-header">
                <h1>{esc(model)}</h1>
                <span>{sum(len(v) for v in grouped[model].values())} review items</span>
              </header>
              {''.join(color_blocks)}
            </section>
            """
        )

    styles = """
    :root{--ink:#111827;--muted:#667085;--line:#d9e2ef;--blue:#123d79;--soft:#f6f8fb;--warn:#af6200;--risk:#b42318}
    *{box-sizing:border-box}
    body{margin:0;background:#f3f6fa;color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .page{max-width:1320px;margin:0 auto;padding:32px}
    .hero{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:24px}
    .hero h1{margin:0;font-size:42px;line-height:1}
    .hero p{max-width:760px;color:var(--muted);line-height:1.55}
    .summary{display:flex;flex-wrap:wrap;gap:10px}
    .summary span{border:1px solid var(--line);border-radius:999px;background:#fff;padding:8px 12px;font-weight:750}
    .model-group{margin:22px 0;padding:22px;border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 12px 30px rgba(16,24,40,.06)}
    .model-header,.color-header,.card-title-row,.links,.quick-labels{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .model-header{justify-content:space-between;margin-bottom:18px}
    .model-header h1{margin:0;font-size:28px}
    .model-header span,.color-header span{color:var(--muted);font-weight:750}
    .color-group{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}
    .color-header{justify-content:space-between;margin-bottom:12px}
    .color-header h2{margin:0;font-size:20px}
    .view-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px}
    .candidate-card{display:grid;grid-template-columns:190px minmax(0,1fr);gap:16px;border:1px solid var(--line);border-radius:16px;background:#fff;padding:14px;min-width:0}
    .candidate-card.risk-medium{border-left:6px solid var(--warn)}
    .candidate-card.risk-high{border-left:6px solid var(--risk)}
    .candidate-card.risk-low{border-left:6px solid #168244}
    .thumb{height:220px;border-radius:14px;background:linear-gradient(145deg,#fff,#eef3f8);display:grid;place-items:center;overflow:hidden;border:1px solid #edf1f7}
    .thumb img{display:block;max-width:100%;max-height:100%;object-fit:contain}
    .missing-thumb{color:var(--muted);font-weight:800}
    .card-main{min-width:0}
    .card-main h3{margin:0;font-size:18px}
    .view-pill,.risk-label{border-radius:999px;padding:5px 9px;font-size:12px;font-weight:850;text-transform:uppercase}
    .view-pill{background:#edf5ff;color:var(--blue)}
    .risk-label{background:#fff3e6;color:var(--warn)}
    .color-line{margin:5px 0 10px;color:var(--muted);font-weight:750}
    .quick-labels span{border:1px solid var(--line);border-radius:999px;padding:6px 9px;background:#fff;color:var(--muted);font-size:12px;font-weight:850}
    .quick-labels .is-active{border-color:var(--warn);background:#fff8ed;color:var(--warn)}
    dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 14px;margin:12px 0}
    dt{color:var(--muted);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
    dd{margin:3px 0 0;font-size:13px;overflow-wrap:anywhere}
    .notes{margin:10px 0;color:#344054;font-size:13px;line-height:1.45}
    .links a{color:var(--blue);font-weight:800;font-size:13px;text-decoration:none}
    @media(max-width:760px){.page{padding:18px}.hero{display:block}.hero h1{font-size:34px}.view-grid{grid-template-columns:1fr}.candidate-card{grid-template-columns:1fr}.thumb{height:260px}dl{grid-template-columns:1fr}}
    """
    page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CELULARS third-party image review gallery</title>
  <style>{styles}</style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <div>
        <h1>Third-party image review</h1>
        <p>Local review gallery for CELULARS iPhone image candidates. This page does not approve, publish, or update the catalog. Use the approval CSV to mark yes/no manually.</p>
      </div>
      <div class="summary">
        <span>{len(rows)} needs review</span>
        <span>Grouped by model, color, view</span>
      </div>
    </header>
    {''.join(sections)}
  </main>
</body>
</html>
"""
    GALLERY_PATH.write_text(page, encoding="utf-8")


def main():
    rows = read_rows()
    write_approval(rows)
    build_gallery(rows)
    print(f"gallery={GALLERY_PATH}")
    print(f"approval={APPROVAL_PATH}")
    print(f"candidates={len(rows)}")


if __name__ == "__main__":
    main()
