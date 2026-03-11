import torch
from torchvision import transforms, models
from PIL import Image
import json
import pandas as pd
import os

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Globals for lazy loading
classes = None
model = None
nutrition_df = None

def load_resources():
    global classes, model, nutrition_df

    if classes is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        classes_path = os.path.join(base_dir, "classes.json")
        with open(classes_path) as f:
            classes = json.load(f)

    if model is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "model.pth")
        model = models.resnet18(weights=None)
        model.fc = torch.nn.Linear(model.fc.in_features, len(classes))
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()

    if nutrition_df is None:
        # The excel file is in the root, so we go up one level from the `foodmodel` directory
        excel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Anuvaad_INDB_2024.11.xlsx'))
        nutrition_df = pd.read_excel(excel_path)

# Image transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def predict_image(image_path):
    load_resources()  # Ensure resources are loaded

    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(image)
        # Get probabilities using softmax
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        # Get the maximum probability and predicted class
        max_prob, predicted = torch.max(probabilities, 1)
        
        # Get confidence as a float value
        confidence = float(max_prob.item())

    food_name = classes[predicted.item()]

    # Try different column name variations for nutrition data
    # First try exact match
    row = nutrition_df[nutrition_df["food_name"].str.lower() == food_name.lower()]
    
    # If exact match fails, try partial match
    if row.empty:
        # Try partial match - check if food_name is contained in any food_name
        partial_matches = nutrition_df[nutrition_df["food_name"].str.lower().str.contains(food_name.lower(), na=False)]
        if not partial_matches.empty:
            row = partial_matches.head(1)
        else:
            # Try reverse partial match - check if any food_name is contained in food_name
            reverse_matches = nutrition_df[nutrition_df["food_name"].str.lower().apply(lambda x: x in food_name.lower() if x else False)]
            if not reverse_matches.empty:
                row = reverse_matches.head(1)

    if row.empty:
        return {
            "food_name": food_name,
            "confidence": confidence,
            "calories": "Not Found",
            "protein": "Not Found",
            "fat": "Not Found",
            "carbs": "Not Found"
        }

    # Handle different column names in Excel
    calories = row["energy_kcal"].values[0] if "energy_kcal" in row.columns else 0
    protein = row["protein_g"].values[0] if "protein_g" in row.columns else (row["protein"].values[0] if "protein" in row.columns else 0)
    fat = row["fat_g"].values[0] if "fat_g" in row.columns else (row["fat"].values[0] if "fat" in row.columns else 0)
    carbs = row["carb_g"].values[0] if "carb_g" in row.columns else (row["carbs"].values[0] if "carbs" in row.columns else 0)

    return {
        "food_name": food_name,
        "confidence": confidence,
        "calories": calories,
        "protein": protein,
        "fat": fat,
        "carbs": carbs,
    }
