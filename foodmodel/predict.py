import torch
from torchvision import transforms, models
from PIL import Image
import json
import pandas as pd
import os
import re

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Globals for lazy loading
classes = None
model = None
nutrition_df = None

def normalize_food_name(name):
    """Normalize food names: replace underscores with spaces, capitalize each word."""
    if not name:
        return ""
    # Replace underscores and multiple spaces/hyphens with a single space
    name = re.sub(r'[_ \-]+', ' ', name)
    # Remove any other non-alphanumeric except space
    name = re.sub(r'[^a-zA-Z0-9 ]', '', name)
    # Capitalize each word (e.g., aloo_gobi -> Aloo Gobi)
    return name.strip().title()

def load_resources():
    global classes, model, nutrition_df

    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. MODEL CLASS LOADING: Dynamic detection from dataset folders
    dataset_dir = os.path.abspath(os.path.join(base_dir, 'train'))
    classes_path = os.path.join(base_dir, "classes.json")
    
    if os.path.exists(dataset_dir):
        # Scan folders to build class list alphabetically
        current_classes = sorted([d for d in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, d))])
        if current_classes:
            classes = current_classes
            # Save the dynamic classes list
            with open(classes_path, "w") as f:
                json.dump(classes, f)
    
    # Fallback to existing classes.json if dataset folder isn't accessible
    if classes is None and os.path.exists(classes_path):
        with open(classes_path) as f:
            classes = json.load(f)

    if model is None and classes is not None:
        model_path = os.path.join(base_dir, "model.pth")
        # Ensure model architecture matches class count
        model = models.resnet18(weights=None)
        model.fc = torch.nn.Linear(model.fc.in_features, len(classes))
        if os.path.exists(model_path):
            try:
                model.load_state_dict(torch.load(model_path, map_location=device))
            except Exception as e:
                print(f"DEBUG: Model weight mismatch or error: {e}")
        model.to(device)
        model.eval()

    if nutrition_df is None:
        excel_path = os.path.abspath(os.path.join(base_dir, '..', 'Anuvaad_INDB_2024.11.xlsx'))
        if os.path.exists(excel_path):
            nutrition_df = pd.read_excel(excel_path)
            # Add normalized column for matching
            nutrition_df['norm_name'] = nutrition_df['food_name'].apply(lambda x: normalize_food_name(str(x)))
        else:
            nutrition_df = pd.DataFrame(columns=["food_name", "norm_name", "energy_kcal", "protein_g", "fat_g", "carb_g"])

# Image transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def get_nutrition_for_food(food_name):
    """5. NUTRITION DATABASE MATCHING logic."""
    if nutrition_df is None or nutrition_df.empty:
        return None
        
    norm_search = normalize_food_name(food_name)
    # Exact match on normalized names
    row = nutrition_df[nutrition_df["norm_name"] == norm_search]
    
    if row.empty:
        # Partial match
        row = nutrition_df[nutrition_df["norm_name"].str.contains(norm_search, case=False, na=False)].head(1)
        
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

    if model is None or classes is None:
        return {"error": "Model or Classes not loaded"}

    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(image)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        
        # 3. TOP 3 PREDICTIONS logic
        top_probs, top_idxs = torch.topk(probabilities, 3)
        
        predictions = []
        for i in range(3):
            prob = float(top_probs[0][i].item())
            idx = int(top_idxs[0][i].item())
            class_name = classes[idx]
            predictions.append({
                "food_name": normalize_food_name(class_name),
                "raw_class": class_name,
                "confidence": prob
            })

    main_pred = predictions[0]
    
    # 8. DEBUG LOGGING
    print(f"--- DEBUG LOG ---")
    print(f"Detected: {main_pred['food_name']} ({main_pred['confidence']:.2%})")
    top3_summary = [f"{p['food_name']} ({p['confidence']:.1%})" for p in predictions]
    print(f"Top 3: {top3_summary}")
    
    nutrition = get_nutrition_for_food(main_pred['food_name'])
    if nutrition:
        print(f"Matched Nutrition: {nutrition['matched_name']}")
    else:
        print(f"Matched Nutrition: None found")
    print(f"-----------------")

    result = {
        "food_name": main_pred['food_name'],
        "confidence": main_pred['confidence'],
        "top_predictions": predictions,
        "nutrition": nutrition,
        "status": "Success" if nutrition else "Nutrition data not available for this food."
    }
    
    return result
