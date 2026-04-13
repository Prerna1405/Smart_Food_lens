from ultralytics import YOLO
import json
import pandas as pd
import os
import re
from rapidfuzz import process, fuzz

# Globals for lazy loading
model = None
nutrition_df = None

def normalize_for_matching(name):
    """Deep normalization for robust matching: lowercase, no special characters, no spaces."""
    if not name:
        return ""
    # Convert to string and lowercase
    name = str(name).lower()
    # Remove all non-alphanumeric characters
    name = re.sub(r'[^a-z0-9]', '', name)
    return name

def normalize_food_name(name):
    """Normalize food names for UI display: replace underscores with spaces, handle camelCase, capitalize each word."""
    if not name:
        return ""
    
    # Handle common concatenated names like 'Cholebhature'
    common_concat = {
        "cholebhature": "Chole Bhature",
        "dalmakhani": "Dal Makhani",
        "aloogobi": "Aloo Gobi",
        "panerbuttermasala": "Paneer Butter Masala"
    }
    
    clean_name = normalize_for_matching(name)
    if clean_name in common_concat:
        return common_concat[clean_name]

    # Replace underscores and multiple spaces/hyphens with a single space
    name = re.sub(r'[_ \-]+', ' ', name)
    # Remove any other non-alphanumeric except space
    name = re.sub(r'[^a-zA-Z0-9 ]', '', name)
    # Capitalize each word
    return name.strip().title()

def load_resources():
    global model, nutrition_df

    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Load YOLOv8 classification model
    if model is None:
        # 1. Try to find the best.pt from recent training runs
        runs_dir = os.path.abspath(os.path.join(base_dir, "..", "runs", "classify", "train", "weights", "best.pt"))
        local_best = os.path.join(base_dir, "best.pt")
        default_yolo = os.path.join(base_dir, "yolov8n-cls.pt")
        root_yolo = os.path.abspath(os.path.join(base_dir, "..", "yolov8n-cls.pt"))
        
        model_path = None
        if os.path.exists(runs_dir):
            model_path = runs_dir
        elif os.path.exists(local_best):
            model_path = local_best
        elif os.path.exists(default_yolo):
            model_path = default_yolo
        elif os.path.exists(root_yolo):
            model_path = root_yolo
            
        if model_path:
            print(f"DEBUG: Loading YOLO model from {model_path}")
            model = YOLO(model_path)
        else:
            print(f"DEBUG: YOLO model weights not found in any standard location")

    # Load Nutrition Database
    if nutrition_df is None:
        excel_path = os.path.abspath(os.path.join(base_dir, '..', 'Anuvaad_INDB_2024.11.xlsx'))
        if os.path.exists(excel_path):
            try:
                nutrition_df = pd.read_excel(excel_path)
                
                # 2. Rename columns to match code expectations
                nutrition_df = nutrition_df.rename(columns={
                    "Food Name": "food_name",
                    "Energy (kcal)": "energy_kcal",
                    "Protein (g)": "protein_g",
                    "Fat (g)": "fat_g",
                    "Carbohydrate (g)": "carb_g"
                })
                
                # Add match-ready column (lowercase, no special chars)
                if 'food_name' in nutrition_df.columns:
                    nutrition_df['match_key'] = nutrition_df['food_name'].apply(normalize_for_matching)
                else:
                    print("DEBUG: 'food_name' column not found in Excel after rename")
            except Exception as e:
                print(f"DEBUG: Error loading Excel: {e}")
                nutrition_df = pd.DataFrame()
        else:
            print(f"DEBUG: Excel file not found at {excel_path}")
            nutrition_df = pd.DataFrame()

def get_nutrition_for_food(food_name):
    """NUTRITION DATABASE MATCHING logic with fuzzy matching."""
    if nutrition_df is None or nutrition_df.empty:
        return None
        
    search_key = normalize_for_matching(food_name)
    
    # 1. Exact match on match_key
    row = nutrition_df[nutrition_df["match_key"] == search_key]
    
    if row.empty:
        # 2. Partial match (contains)
        row = nutrition_df[nutrition_df["match_key"].str.contains(search_key, na=False)].head(1)
        
    if row.empty:
        # 3. Fuzzy match using RapidFuzz
        choices = nutrition_df["match_key"].tolist()
        best_match = process.extractOne(search_key, choices, scorer=fuzz.WRatio)
        
        if best_match and best_match[1] > 80:  # 80% similarity threshold
            match_key = best_match[0]
            row = nutrition_df[nutrition_df["match_key"] == match_key].head(1)
            print(f"DEBUG: Fuzzy match found: {food_name} -> {row['food_name'].values[0]} ({best_match[1]}%)")

    if row.empty:
        return None
        
    return {
        "calories": float(row["energy_kcal"].values[0]) if "energy_kcal" in row.columns else 0,
        "protein": float(row["protein_g"].values[0]) if "protein_g" in row.columns else 0,
        "fat": float(row["fat_g"].values[0]) if "fat_g" in row.columns else 0,
        "carbs": float(row["carb_g"].values[0]) if "carb_g" in row.columns else 0,
        "matched_name": row["food_name"].values[0]
    }

def predict_image(image_path):
    load_resources()

    if model is None:
        return {"error": "YOLO model not loaded. Training might still be in progress."}

    # Predict using YOLOv8
    results = model.predict(image_path, imgsz=224, verbose=False)
    
    if not results or len(results) == 0:
        return {"error": "Food not detected – please scan again"}

    result = results[0]
    
    # Check if it's a classification result
    if result.probs is not None:
        # Get top 3 predictions
        try:
            # Handle different ultralytics versions (tensor vs list)
            top5_conf = result.probs.top5conf
            if hasattr(top5_conf, 'tolist'):
                top5_conf = top5_conf.tolist()
                
            top5_indices = result.probs.top5
            if hasattr(top5_indices, 'tolist'):
                top5_indices = top5_indices.tolist()
        except Exception as e:
            print(f"DEBUG: Error extracting probs: {e}")
            return {"error": f"Model inference error: {str(e)}"}
            
        names = result.names

        predictions = []
        for conf, idx in zip(top5_conf[:3], top5_indices[:3]):
            class_name = names[idx]
            predictions.append({
                "food_name": normalize_food_name(class_name),
                "raw_class": class_name,
                "confidence": float(conf)
            })

        main_pred = predictions[0]
        
        # 6. Confidence Threshold (Requirement: >= 90% accuracy goal)
        if main_pred["confidence"] < 0.60:
            # We still return but mark it as low confidence for the UI
            print(f"⚠️ [LOW CONFIDENCE] {main_pred['food_name']} at {main_pred['confidence']:.2%}")

        # 7. Portion Estimation (New: Estimate based on object scale)
        # In a real YOLOv8-cls, we don't have boxes, but we can use the top predicted class
        # to infer a standard portion size.
        standard_portions = {
            "Aloo Gobi": 250,
            "Dal Tadka": 300,
            "Chapati": 40,
            "Rice": 150,
            "Biryani": 350,
            "Chole Bhature": 400,
            "Laddu": 50,
            "Paneer Butter Masala": 250,
            "Dosa": 100
        }
        portion_g = standard_portions.get(main_pred['food_name'], 200)

        # 8. DEBUG LOGGING
        print(f"--- YOLOv8 DEBUG LOG ---")
        print(f"Detected: {main_pred['food_name']} ({main_pred['confidence']:.2%})")
        top3_summary = [f"{p['food_name']} ({p['confidence']:.1%})" for p in predictions]
        print(f"Top 3: {top3_summary}")
        
        nutrition = get_nutrition_for_food(main_pred['food_name'])
        
        return {
            "food_name": main_pred['food_name'],
            "confidence": main_pred['confidence'],
            "portion_g": portion_g,
            "top_predictions": predictions,
            "nutrition": nutrition,
            "status": "Success"
        }
    else:
        return {"error": "Food not detected – please scan again"}
