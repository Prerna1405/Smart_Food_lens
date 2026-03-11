﻿print("Starting app.py...")
import sys
import os
print(f"Python path: {sys.path}")

try:
    # Add the parent directory to the path to allow imports from foodmodel
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    print("Appended to path. Attempting to import predict_image...")
    from foodmodel.predict import predict_image
    print("Successfully imported predict_image.")
except ImportError as e:
    print(f"Failed to import predict_image: {e}")
    predict_image = None
except Exception as e:
    print(f"An unexpected error occurred during import: {e}")
    predict_image = None

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import shutil
import json
from datetime import datetime, timedelta
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load nutrition data
def load_nutrition_data():
    nutrition_path = os.path.join(os.path.dirname(__file__), "nutrition", "nutrition_data.json")
    with open(nutrition_path, "r") as f:
        return json.load(f)

nutrition_data = load_nutrition_data()

# Load scans data
def load_scans():
    scans_path = os.path.join(os.path.dirname(__file__), "data", "scans.json")
    if os.path.exists(scans_path):
        with open(scans_path, "r") as f:
            return json.load(f)
    return []

def save_scans(scans):
    scans_path = os.path.join(os.path.dirname(__file__), "data", "scans.json")
    with open(scans_path, "w") as f:
        json.dump(scans, f, indent=2)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if predict_image is None:
        return {"error": "Prediction model is not available."}

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = predict_image(file_path)
        
        # Return the result with correct field names
        return {
            "food_name": result.get("food_name", result.get("food", "")),
            "confidence": result.get("confidence", 0.95),
            "calories": result.get("calories", 0),
            "protein": result.get("protein", 0),
            "carbs": result.get("carbs", 0),
            "fat": result.get("fat", 0),
        }
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}"}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# Endpoint: POST /analyze (used by frontend)
@app.post("/analyze")
async def analyze(file: UploadFile = File(..., alias="image")):
    if predict_image is None:
        return {"error": "Prediction model is not available.", "food_name": None}

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = predict_image(file_path)
        
        # Get food name - support both old 'food' and new 'food_name' format
        food_name = result.get("food_name") or result.get("food", "")
        
        # Get actual confidence from model prediction
        confidence = result.get("confidence", 0.95)
        
        # Ensure we always return numeric values, not strings like "Not Found"
        calories = result.get("calories", 0)
        protein = result.get("protein", 0)
        carbs = result.get("carbs", 0)
        fat = result.get("fat", 0)
        
        # Convert to numbers, fallback to 0 if not found or invalid
        try:
            calories = float(calories) if calories not in [None, "Not Found", ""] else 0
        except (ValueError, TypeError):
            calories = 0
        try:
            protein = float(protein) if protein not in [None, "Not Found", ""] else 0
        except (ValueError, TypeError):
            protein = 0
        try:
            carbs = float(carbs) if carbs not in [None, "Not Found", ""] else 0
        except (ValueError, TypeError):
            carbs = 0
        try:
            fat = float(fat) if fat not in [None, "Not Found", ""] else 0
        except (ValueError, TypeError):
            fat = 0
        
        # Fallback to nutrition_data.json if calories is 0 (Not Found)
        if calories == 0 and food_name:
            food_lower = food_name.lower()
            # Try exact match first
            if food_lower in nutrition_data:
                food_info = nutrition_data[food_lower]
                calories = food_info.get("calories_per_100g", 0)
                protein = food_info.get("protein", 0)
                carbs = food_info.get("carbs", 0)
                fat = food_info.get("fat", 0)
            else:
                # Try partial match (e.g., "biryani" matches "biryani" in JSON)
                for key in nutrition_data:
                    if key in food_lower or food_lower in key:
                        food_info = nutrition_data[key]
                        calories = food_info.get("calories_per_100g", 0)
                        protein = food_info.get("protein", 0)
                        carbs = food_info.get("carbs", 0)
                        fat = food_info.get("fat", 0)
                        break
        
        return {
            "food_name": food_name,
            "confidence": confidence,
            "calories": calories,
            "protein": protein,
            "carbs": carbs,
            "fat": fat,
            "ingredients": []
        }
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}", "food_name": None}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# Endpoint: POST /classify-nutrition (used by frontend as fallback)
@app.post("/classify-nutrition")
async def classify_nutrition(file: UploadFile = File(..., alias="image"), threshold: float = 0.70):
    if predict_image is None:
        return {"error": "Prediction model is not available."}

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = predict_image(file_path)
        
        # Get food name - support both old 'food' and new 'food_name' format
        food_name = result.get("food_name") or result.get("food", "")
        
        # Get actual confidence from model prediction
        confidence = result.get("confidence", 0.95)
        
        return {
            "food": food_name,
            "confidence": confidence
        }
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}"}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# Endpoint: POST /nutrition (used by frontend)
@app.post("/nutrition")
async def get_nutrition(request: dict):
    food = request.get("food", "").lower()
    quantity = float(request.get("quantity", 100))
    
    # Check if food exists in nutrition data
    if food in nutrition_data:
        food_info = nutrition_data[food]
        calories_per_100g = food_info.get("calories_per_100g", 0)
        return {
            "calories": (calories_per_100g * quantity) / 100,
            "protein": (food_info.get("protein", 0) * quantity) / 100,
            "carbs": (food_info.get("carbs", 0) * quantity) / 100,
            "fat": (food_info.get("fat", 0) * quantity) / 100
        }
    
    # Default values if not found
    return {
        "calories": (100 * quantity) / 100,
        "protein": (3 * quantity) / 100,
        "carbs": (15 * quantity) / 100,
        "fat": (3 * quantity) / 100
    }

# Endpoint: POST /api/scans (used by frontend to save scan)
@app.post("/api/scans")
async def add_scan(request: dict):
    scans = load_scans()
    
    date = request.get("date", datetime.now().strftime("%Y-%m-%d"))
    food = request.get("food", "meal")
    quantity = float(request.get("quantity", 0))
    confidence = float(request.get("confidence", 0))
    food_items = request.get("foodItems", [])
    
    # Find existing date entry or create new one
    date_entry = None
    for entry in scans:
        if entry.get("date") == date:
            date_entry = entry
            break
    
    if date_entry is None:
        date_entry = {"date": date, "scans": []}
        scans.append(date_entry)
    
    # Add new scan
    new_scan = {
        "foodItems": food_items,
        "confidence": confidence,
        "quantity": quantity,
        "timestamp": datetime.now().isoformat()
    }
    date_entry["scans"].append(new_scan)
    
    save_scans(scans)
    return {"success": True, "message": "Scan saved successfully"}

# Endpoint: GET /api/scans/by-date (used by frontend)
@app.get("/api/scans/by-date")
async def get_scans_by_date(date: str):
    scans = load_scans()
    
    for entry in scans:
        if entry.get("date") == date:
            scans_list = entry.get("scans", [])
            totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
            
            for scan in scans_list:
                for item in scan.get("foodItems", []):
                    nutrients = item.get("nutrients", {})
                    totals["calories"] += nutrients.get("calories", 0)
                    totals["protein"] += nutrients.get("protein", 0)
                    totals["carbs"] += nutrients.get("carbs", 0)
                    totals["fat"] += nutrients.get("fat", 0)
            
            return {"scans": scans_list, "totals": totals}
    
    return {"scans": [], "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}}

# Endpoint: GET /api/scans/last-three-days (used by frontend)
@app.get("/api/scans/last-three-days")
async def get_last_three_days():
    scans = load_scans()
    today = datetime.now()
    three_days_ago = today - timedelta(days=3)
    
    result = []
    for entry in scans:
        try:
            entry_date = datetime.strptime(entry.get("date", ""), "%Y-%m-%d")
            if entry_date >= three_days_ago:
                result.append(entry)
        except:
            continue
    
    return {"scans": result}

# Endpoint: GET /api/scans/range (used by frontend calendar)
@app.get("/api/scans/range")
async def get_scans_range(end: str, days: int = 30):
    scans = load_scans()
    
    try:
        end_date = datetime.strptime(end, "%Y-%m-%d")
    except:
        end_date = datetime.now()
    
    start_date = end_date - timedelta(days=days)
    
    result = {}
    for entry in scans:
        try:
            entry_date = datetime.strptime(entry.get("date", ""), "%Y-%m-%d")
            if start_date <= entry_date <= end_date:
                scans_list = entry.get("scans", [])
                totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
                
                for scan in scans_list:
                    for item in scan.get("foodItems", []):
                        nutrients = item.get("nutrients", {})
                        totals["calories"] += nutrients.get("calories", 0)
                        totals["protein"] += nutrients.get("protein", 0)
                        totals["carbs"] += nutrients.get("carbs", 0)
                        totals["fat"] += nutrients.get("fat", 0)
                
                result[entry.get("date")] = totals
        except:
            continue
    
    return {"data": result}

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": predict_image is not None}

@app.get("/debug")
async def debug():
    return {
        "predict_image": str(predict_image),
        "is_none": predict_image is None,
        "python_path": sys.path
    }

@app.get("/")
async def root():
    return {"message": "Welcome to the Food Nutrition API"}

print("app.py loaded.")

