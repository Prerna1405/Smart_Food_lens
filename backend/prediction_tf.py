import tensorflow as tf
import numpy as np
from PIL import Image
import json
import pandas as pd
import os

# Globals for lazy loading
classes = None
model = None
nutrition_df = None

def load_resources():
    global classes, model, nutrition_df

    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    if classes is None:
        # Using classes from foodmodel as fallback
        classes_path = os.path.join(base_dir, "..", "foodmodel", "classes.json")
        if os.path.exists(classes_path):
            with open(classes_path) as f:
                classes = json.load(f)
        else:
            # Emergency fallback classes
            classes = ["Healthy Food"]

    if model is None:
        model_path = os.path.join(base_dir, "model", "food_classifier.h5")
        if os.path.exists(model_path):
            model = tf.keras.models.load_model(model_path)
        else:
            print(f"Warning: Model file not found at {model_path}")

    if nutrition_df is None:
        excel_path = os.path.abspath(os.path.join(base_dir, '..', 'Anuvaad_INDB_2024.11.xlsx'))
        if os.path.exists(excel_path):
            nutrition_df = pd.read_excel(excel_path)

def get_nutrition_for_food(food_name):
    """Robust nutrition lookup from Excel."""
    load_resources()
    if nutrition_df is None:
        return None

    search_key = food_name.lower()
    row = nutrition_df[nutrition_df["food_name"].str.lower() == search_key]
    
    if row.empty:
        partial_matches = nutrition_df[nutrition_df["food_name"].str.lower().str.contains(search_key, na=False)]
        if not partial_matches.empty:
            row = partial_matches.head(1)
        else:
            reverse_matches = nutrition_df[nutrition_df["food_name"].str.lower().apply(lambda x: x in search_key if x else False)]
            if not reverse_matches.empty:
                row = reverse_matches.head(1)

    if row.empty:
        return None

    calories = row["energy_kcal"].values[0] if "energy_kcal" in row.columns else (row["energy"].values[0] if "energy" in row.columns else 0)
    protein = row["protein_g"].values[0] if "protein_g" in row.columns else (row["protein"].values[0] if "protein" in row.columns else 0)
    fat = row["fat_g"].values[0] if "fat_g" in row.columns else (row["fat"].values[0] if "fat" in row.columns else 0)
    carbs = row["carb_g"].values[0] if "carb_g" in row.columns else (row["carbs"].values[0] if "carbs" in row.columns else 0)

    return {
        "calories": float(calories) if not pd.isna(calories) and calories != "Not Found" else 0,
        "protein": float(protein) if not pd.isna(protein) and protein != "Not Found" else 0,
        "fat": float(fat) if not pd.isna(fat) and fat != "Not Found" else 0,
        "carbs": float(carbs) if not pd.isna(carbs) and carbs != "Not Found" else 0,
        "matched_name": row["food_name"].values[0]
    }

def predict_image(image_path):
    load_resources()
    
    if model is None:
        return {"error": "Model not loaded"}

    # Prep image
    img = Image.open(image_path).convert("RGB")
    img = img.resize((224, 224))
    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    # Predict
    predictions = model.predict(img_array)
    top_indices = np.argsort(predictions[0])[-3:][::-1]
    
    top_predictions = []
    for idx in top_indices:
        if idx < len(classes):
            top_predictions.append({
                "food_name": classes[idx],
                "confidence": float(predictions[0][idx])
            })

    if not top_predictions:
        return {"error": "No predictions found"}

    main_prediction = top_predictions[0]
    food_name = main_prediction["food_name"]
    confidence = main_prediction["confidence"]

    nutrition = get_nutrition_for_food(food_name)

    return {
        "food_name": food_name,
        "confidence": confidence,
        "top_predictions": top_predictions,
        "nutrition": nutrition,
        "status": "Success" if nutrition else "Nutrition not found"
    }
