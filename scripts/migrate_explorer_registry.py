from __future__ import annotations

import json
import re
from pathlib import Path

ATTACHMENT = Path("/home/ubuntu/upload/AgriChem_Registry_Explorer.html")
OUTPUT = Path("/home/ubuntu/pesticide-field-guide/client/src/data/products.ts")


def tone_for_scheme(scheme: str) -> str:
    if scheme == "IRAC":
        return "terracotta"
    if scheme == "FRAC":
        return "blue"
    return "green"


html = ATTACHMENT.read_text(encoding="utf-8", errors="ignore")
match = re.search(r"window\.REGISTRY=(\{.*?\});", html, re.S)
if not match:
    raise SystemExit("Could not find embedded window.REGISTRY in the attached Explorer HTML")

registry = json.loads(match.group(1))
cols = registry["cols"]
expected = ["reg", "cat", "common", "trade", "moa", "auth", "risk", "tier", "hhp", "crops", "pests", "nCrops", "nPests"]
if cols != expected:
    raise SystemExit(f"Unexpected Explorer columns: {cols}")

rows = []
seen = set()
for row in registry["rows"]:
    reg, category, ingredient, trade, moa, scheme, risk, tier, hhp, crop_ids, pest_ids, n_crops, n_pests = row
    product_id = str(reg or "").strip() or f"EXPLORER-{len(rows) + 1:04d}"
    if product_id in seen:
        raise SystemExit(f"Duplicate registry identifier: {product_id}")
    seen.add(product_id)

    moa = str(moa or "").strip()
    scheme = str(scheme or "").strip()
    moa_codes = [moa] if moa else []
    normalized_scheme = scheme if scheme in {"IRAC", "FRAC", "HRAC"} else "Unmapped"
    crop_names = [registry["crops"][int(index)] for index in crop_ids if int(index) < len(registry["crops"])]
    pest_names = [registry["pests"][int(index)] for index in pest_ids if int(index) < len(registry["pests"])]

    rows.append(
        {
            "productId": product_id,
            "trade": str(trade or "").strip(),
            "ingredient": str(ingredient or "").strip(),
            "category": str(category or "").strip(),
            "reg": product_id,
            "holder": "",
            "crop": " · ".join(crop_names),
            "pest": " · ".join(pest_names),
            "dosage": "",
            "moa": moa or "Unmapped",
            "moaCodes": moa_codes,
            "moaScheme": normalized_scheme,
            "mappingStatus": "mapped" if moa else "unmapped",
            "mappingConfidence": "medium" if moa else "none",
            "mappingSources": ["Attached AgriChem Registry Explorer"] if moa else [],
            "sourceVersion": "DAE Registry Explorer embedded registry",
            "sourceDate": "Provided attachment",
            "tone": tone_for_scheme(normalized_scheme),
        }
    )

if len(rows) != int(registry["meta"]["products"]):
    raise SystemExit(f"Expected {registry['meta']['products']} rows, got {len(rows)}")

json_text = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
output = (
    "export type CatalogProduct = { productId:string; trade:string; ingredient:string; category:string; "
    "reg:string; holder:string; crop:string; pest:string; dosage:string; moa:string; moaCodes:string[]; "
    "moaScheme:string; mappingStatus:string; mappingConfidence:string; mappingSources:string[]; "
    'sourceVersion:string; sourceDate:string; tone:"green"|"terracotta"|"blue" };\n'
    "// Generated from the attached AgriChem Registry Explorer HTML.\n"
    "// The Explorer stores crop/pest relationships as dictionary indexes; migration expands them into v2 strings.\n"
    f"const catalogJson = {json.dumps(json_text, ensure_ascii=False)};\n"
    "export const products: CatalogProduct[] = JSON.parse(catalogJson) as CatalogProduct[];\n"
)
OUTPUT.write_text(output, encoding="utf-8")
print(f"Migrated {len(rows)} products to {OUTPUT}")
print(f"Mapped: {sum(1 for row in rows if row['mappingStatus'] == 'mapped')}")
print(f"Crops: {len(registry['crops'])}; pests: {len(registry['pests'])}; MoA groups: {registry['meta']['moaGroups']}")
