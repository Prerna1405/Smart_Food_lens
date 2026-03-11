import sys
import os
import json
import pandas as pd

def normalize_name(s: str) -> str:
    if s is None:
        return ""
    s = str(s).strip().lower()
    s = " ".join(s.split())
    s = s.replace(" ", "_")
    return s

def convert_excel_to_json(src_path: str, dst_path: str):
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Excel file not found: {src_path}")

    if src_path.lower().endswith(".csv"):
        df = pd.read_csv(src_path)
    else:
        df = pd.read_excel(src_path, engine="openpyxl")

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    if "food_name" not in df.columns:
        # Attempt common alternate names
        for alt in ["food", "item", "name"]:
            if alt in df.columns:
                df = df.rename(columns={alt: "food_name"})
                break
    if "food_name" not in df.columns:
        raise ValueError("Missing 'food_name' column in Excel")

    df["food_name"] = df["food_name"].astype(str).map(normalize_name)
    df = df[df["food_name"] != ""]
    df = df.drop_duplicates(subset=["food_name"], keep="last")

    # Map calories -> calories_per_100g to match backend expectations
    col_map = {
        "calories": "calories_per_100g",
        "protein": "protein",
        "carbs": "carbs",
        "fat": "fat",
    }
    for src, dst in col_map.items():
        if src in df.columns and dst not in df.columns:
            df[dst] = df[src]
    # Ensure required columns exist
    for dst in ["calories_per_100g", "protein", "carbs", "fat"]:
        if dst not in df.columns:
            df[dst] = 0.0

    out = {}
    for _, row in df.iterrows():
        name = row["food_name"]
        try:
            out[name] = {
                "calories_per_100g": float(row.get("calories_per_100g", 0) or 0),
                "protein": float(row.get("protein", 0) or 0),
                "carbs": float(row.get("carbs", 0) or 0),
                "fat": float(row.get("fat", 0) or 0),
            }
        except Exception:
            # Skip rows with invalid numeric conversion
            continue

    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    with open(dst_path, "w") as f:
        json.dump(out, f, indent=2)

def main():
    base = os.path.dirname(__file__)
    default_src = os.path.join(base, "nutrition", "nutrition.xlsx")
    default_dst = os.path.join(base, "nutrition", "nutrition_data.json")
    src = sys.argv[1] if len(sys.argv) > 1 else default_src
    if not os.path.exists(src):
        nutr_dir = os.path.join(base, "nutrition")
        candidates = []
        for fn in os.listdir(nutr_dir):
            p = os.path.join(nutr_dir, fn)
            if fn.lower().endswith(".xlsx") or fn.lower().endswith(".csv"):
                candidates.append(p)
        if candidates:
            src = candidates[0]
    dst = sys.argv[2] if len(sys.argv) > 2 else default_dst
    convert_excel_to_json(src, dst)
    print(f"Wrote {dst}")

if __name__ == "__main__":
    main()
