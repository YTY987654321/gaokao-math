"""Build complete product packs: generate + render + export metadata."""

import json
import os
from config import PRODUCTS, OUTPUT_DIR
from generator import GaokaoMathGenerator
from pdf_renderer import PDFRenderer


def build_products_metadata():
    """Build the products.json metadata file for the website."""
    products_json = {}
    for slug, info in PRODUCTS.items():
        pdf_path = f"products/assets/{slug}.pdf"
        products_json[slug] = {
            "name": info["name"],
            "slug": info["slug"],
            "description": info["description"],
            "topic": info["topic"],
            "difficulty": info["difficulty"],
            "price_cny": info["price_cny"],
            "price_usd": info["price_usd"],
            "pdf_url": pdf_path,
        }

    meta_path = os.path.join(OUTPUT_DIR, "..", "..", "website", "products", "products.json")
    os.makedirs(os.path.dirname(meta_path), exist_ok=True)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(products_json, f, ensure_ascii=False, indent=2)
    print(f"📦 Products metadata: {meta_path}")
    return products_json


def build_all():
    """Full pipeline: generate content → render PDF → build metadata."""
    print("=" * 50)
    print("🚀 Gaokao Math Content Engine - Full Build")
    print("=" * 50)

    # Step 1: Generate content
    print("\n📝 Step 1: Generating content...")
    gen = GaokaoMathGenerator()
    slugs = gen.generate_all_packs()

    if not slugs:
        print("⚠️  No content generated. Check API key and connectivity.")
        return

    # Step 2: Render PDFs
    print("\n📄 Step 2: Rendering PDFs...")
    renderer = PDFRenderer()
    renderer.render_all_packs()

    # Step 3: Build metadata
    print("\n📦 Step 3: Building product metadata...")
    build_products_metadata()

    print("\n" + "=" * 50)
    print("✅ Build complete!")
    print(f"   Generated {len(slugs)} product packs")
    print(f"   Output: {OUTPUT_DIR}")
    print("=" * 50)


if __name__ == "__main__":
    build_all()
