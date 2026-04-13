import os
import sys
import requests
import shutil
import json
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware

# SPOONACULAR API CONFIG
SPOONACULAR_API_KEY = "f8401aa1873d439eb5c5b0c9d86a2bda"

try:
    # Add the parent directory to the path to allow imports from foodmodel
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from foodmodel.predict_yolo import predict_image, get_nutrition_for_food
except ImportError as e:
    print(f"Failed to import predict_image from predict_yolo: {e}")
    try:
        from foodmodel.predict import predict_image, get_nutrition_for_food
    except ImportError:
        predict_image = None
        get_nutrition_for_food = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_portion_multiplier(unit, quantity):
    """7. PORTION SIZE SYSTEM logic."""
    # Base multipliers (relative to 100g database entry)
    # Database values are per 100g. Multiplier converts quantity to 100g-equivalent.
    multipliers = {
        "g": 0.01,         # 1g = 0.01 * 100g
        "grams": 0.01,
        "tsp": 0.05,       # 1 tsp approx 5g
        "tbsp": 0.15,      # 1 tbsp approx 15g
        "bowl": 2.5,       # 1 bowl approx 250g
        "cup": 2.4,        # 1 cup approx 240g
        "piece": 1.0,      # 1 piece approx 100g (default fallback)
        "half_bowl": 1.25, # 125g
        "1_bowl": 2.5,     # 250g
        "2_bowl": 5.0,     # 500g
        "1_roti": 0.4,     # 1 roti approx 40g (Fix: 40/100 = 0.4)
        "2_roti": 0.8,     # 2 roti approx 80g
        "3_roti": 1.2,     # 3 roti approx 120g
    }
    
    # Handle normalized units from frontend
    norm_unit = unit.lower().replace(' ', '_')
    base_mult = multipliers.get(norm_unit, 0.01) # Default to grams if unknown
    
    try:
        qty = float(quantity) if quantity else 1.0
    except (ValueError, TypeError):
        qty = 1.0
        
    return base_mult * qty

def load_scans():
    scans_path = os.path.join(os.path.dirname(__file__), "data", "scans.json")
    os.makedirs(os.path.dirname(scans_path), exist_ok=True)
    if os.path.exists(scans_path):
        with open(scans_path, "r") as f:
            return json.load(f)
    return []

def save_scans(scans):
    scans_path = os.path.join(os.path.dirname(__file__), "data", "scans.json")
    with open(scans_path, "w") as f:
        json.dump(scans, f, indent=2)

def fetch_nutrition_online(food_name: str):
    """Fallback nutrition lookup using Spoonacular API."""
    if not food_name or SPOONACULAR_API_KEY == "YOUR_SPOONACULAR_API_KEY":
        return None
    
    try:
        url = f"https://api.spoonacular.com/recipes/guessNutrition?title={food_name}&apiKey={SPOONACULAR_API_KEY}"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if "calories" in data:
            return {
                "calories": float(data["calories"]["value"]),
                "protein": float(data["protein"]["value"]),
                "fat": float(data["fat"]["value"]),
                "carbs": float(data["carbs"]["value"]),
                "matched_name": f"{food_name} (Spoonacular API)"
            }
    except Exception as e:
        print(f"DEBUG: Nutrition API Error: {e}")
    return None

# LOCAL INGREDIENT DATABASE (Priority over API)
LOCAL_INGREDIENT_DB = {
    "Aloo Gobi": [
        {"name": "Potato", "quantity": "100", "unit": "g", "calories": 77, "protein": 2, "carbs": 17, "fat": 0.1},
        {"name": "Cauliflower", "quantity": "150", "unit": "g", "calories": 38, "protein": 3, "carbs": 7.5, "fat": 0.4},
        {"name": "Onion", "quantity": "30", "unit": "g", "calories": 12, "protein": 0.3, "carbs": 2.8, "fat": 0},
        {"name": "Oil", "quantity": "10", "unit": "ml", "calories": 88, "protein": 0, "carbs": 0, "fat": 10},
        {"name": "Spices", "quantity": "5", "unit": "g", "calories": 15, "protein": 0.5, "carbs": 3, "fat": 0.5}
    ],
    "Dal Tadka": [
        {"name": "Lentils (Toor Dal)", "quantity": "100", "unit": "g", "calories": 116, "protein": 7, "carbs": 20, "fat": 0.4},
        {"name": "Garlic", "quantity": "5", "unit": "g", "calories": 7, "protein": 0.3, "carbs": 1.6, "fat": 0},
        {"name": "Tomato", "quantity": "30", "unit": "g", "calories": 5, "protein": 0.3, "carbs": 1.2, "fat": 0},
        {"name": "Ghee/Oil", "quantity": "10", "unit": "ml", "calories": 90, "protein": 0, "carbs": 0, "fat": 10},
        {"name": "Onion", "quantity": "30", "unit": "g", "calories": 12, "protein": 0.3, "carbs": 2.8, "fat": 0}
    ],
    "Chapati": [
        {"name": "Whole Wheat Flour", "quantity": "35", "unit": "g", "calories": 120, "protein": 4, "carbs": 25, "fat": 0.5},
        {"name": "Water", "quantity": "15", "unit": "ml", "calories": 0, "protein": 0, "carbs": 0, "fat": 0},
        {"name": "Ghee (Optional)", "quantity": "2", "unit": "g", "calories": 18, "protein": 0, "carbs": 0, "fat": 2}
    ],
    "Rice": [
        {"name": "White Rice (Cooked)", "quantity": "150", "unit": "g", "calories": 195, "protein": 4, "carbs": 42, "fat": 0.4},
        {"name": "Water", "quantity": "0", "unit": "ml", "calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    ],
    "Biryani": [
        {"name": "Basmati Rice", "quantity": "150", "unit": "g", "calories": 195, "protein": 4, "carbs": 42, "fat": 0.4},
        {"name": "Chicken/Veg", "quantity": "100", "unit": "g", "calories": 165, "protein": 25, "carbs": 0, "fat": 7},
        {"name": "Oil/Ghee", "quantity": "15", "unit": "ml", "calories": 135, "protein": 0, "carbs": 0, "fat": 15},
        {"name": "Curd", "quantity": "30", "unit": "g", "calories": 18, "protein": 1, "carbs": 1.5, "fat": 1},
        {"name": "Spices", "quantity": "10", "unit": "g", "calories": 30, "protein": 1, "carbs": 6, "fat": 1}
    ],
    "Chole Bhature": [
        {"name": "Chickpeas (Chole)", "quantity": "150", "unit": "g", "calories": 240, "protein": 13, "carbs": 40, "fat": 4},
        {"name": "Refined Flour (Maida)", "quantity": "100", "unit": "g", "calories": 360, "protein": 10, "carbs": 76, "fat": 1},
        {"name": "Oil", "quantity": "20", "unit": "ml", "calories": 180, "protein": 0, "carbs": 0, "fat": 20},
        {"name": "Onion & Tomato", "quantity": "50", "unit": "g", "calories": 20, "protein": 1, "carbs": 4, "fat": 0},
        {"name": "Spices", "quantity": "10", "unit": "g", "calories": 30, "protein": 1, "carbs": 6, "fat": 1}
    ],
    "Laddu": [
        {"name": "Besan (Gram Flour)", "quantity": "50", "unit": "g", "calories": 190, "protein": 11, "carbs": 29, "fat": 3},
        {"name": "Ghee", "quantity": "25", "unit": "g", "calories": 225, "protein": 0, "carbs": 0, "fat": 25},
        {"name": "Sugar", "quantity": "30", "unit": "g", "calories": 116, "protein": 0, "carbs": 30, "fat": 0},
        {"name": "Dry Fruits", "quantity": "5", "unit": "g", "calories": 30, "protein": 1, "carbs": 2, "fat": 2.5}
    ],
    "Paneer Butter Masala": [
        {"name": "Paneer", "quantity": "100", "unit": "g", "calories": 265, "protein": 18, "carbs": 1, "fat": 20},
        {"name": "Butter", "quantity": "15", "unit": "g", "calories": 105, "protein": 0, "carbs": 0, "fat": 12},
        {"name": "Cream", "quantity": "20", "unit": "ml", "calories": 40, "protein": 0.5, "carbs": 0.8, "fat": 4},
        {"name": "Tomato Puree", "quantity": "100", "unit": "ml", "calories": 32, "protein": 1.5, "carbs": 7, "fat": 0},
        {"name": "Onion", "quantity": "30", "unit": "g", "calories": 12, "protein": 0.3, "carbs": 2.8, "fat": 0}
    ],
    "Dosa": [
        {"name": "Rice & Urad Dal Batter", "quantity": "150", "unit": "g", "calories": 250, "protein": 6, "carbs": 50, "fat": 1},
        {"name": "Oil/Ghee", "quantity": "10", "unit": "ml", "calories": 90, "protein": 0, "carbs": 0, "fat": 10},
        {"name": "Potato Masala (Optional)", "quantity": "50", "unit": "g", "calories": 40, "protein": 1, "carbs": 8, "fat": 0.1}
    ]
}

def fetch_ingredients_online(food_name: str):
    """6. INGREDIENT AUTO DETECTION with local DB priority."""
    if not food_name:
        return []
    
    # 1. CHECK LOCAL DB FIRST
    if food_name in LOCAL_INGREDIENT_DB:
        print(f"DEBUG: Found {food_name} in local ingredient database.")
        return LOCAL_INGREDIENT_DB[food_name]
    
    # 2. CALL API ONLY IF NOT IN LOCAL DB
    if SPOONACULAR_API_KEY != "YOUR_SPOONACULAR_API_KEY":
        try:
            print(f"DEBUG: {food_name} not in local DB, calling Spoonacular API...")
            search_url = f"https://api.spoonacular.com/recipes/complexSearch?query={food_name}&number=1&apiKey={SPOONACULAR_API_KEY}"
            response = requests.get(search_url, timeout=5)
            data = response.json()
            
            if data.get("results"):
                recipe_id = data["results"][0]["id"]
                ingredients_url = f"https://api.spoonacular.com/recipes/{recipe_id}/ingredientWidget.json?apiKey={SPOONACULAR_API_KEY}"
                ing_response = requests.get(ingredients_url, timeout=5)
                ing_data = ing_response.json()
                
                return [
                    {"name": ing["name"].title(), "quantity": str(ing["amount"]["metric"]["value"]), "unit": "g"}
                    for ing in ing_data.get("ingredients", [])
                ]
        except Exception as e:
            print(f"DEBUG: Ingredient API Error: {e}")
    
    return []

@app.get("/ingredients")
async def get_ingredients(food_name: str):
    """Fetch ingredients for a specific food."""
    ingredients = fetch_ingredients_online(food_name)
    return {"ingredients": ingredients}

@app.post("/analyze")
async def analyze(file: UploadFile = File(..., alias="image")):
    if predict_image is None:
        return {"error": "Prediction model is not available."}

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = predict_image(file_path)
        
        if "error" in result:
            return result

        # Try local DB first, then fallback to online API
        nutrition = result.get("nutrition")
        status = result.get("status")
        
        if not nutrition:
            print(f"DEBUG: No local nutrition for {result['food_name']}, trying online API...")
            online_nutrition = fetch_nutrition_online(result["food_name"])
            if online_nutrition:
                nutrition = online_nutrition
                status = "Success (Online API)"
                print(f"DEBUG: Found online nutrition for {result['food_name']}")
            else:
                status = "Nutrition data not available for this food."

        # 8. DEBUG LOGGING: Print result to terminal
        print(f"--- ANALYZE SUCCESS ---")
        print(f"Food: {result['food_name']}")
        print(f"Confidence: {result['confidence']:.2%}")
        if nutrition:
            print(f"Matched Nutrition: {nutrition['matched_name']}")
        else:
            print(f"Nutrition matched: NOT FOUND")
        print(f"------------------------")

        # Fetch ingredients for the top prediction
        ingredients = fetch_ingredients_online(result["food_name"])
        
        return {
            "food_name": result["food_name"],
            "confidence": result["confidence"],
            "top_predictions": result["top_predictions"],
            "nutrition": nutrition,
            "status": status,
            "ingredients": ingredients
        }
    except Exception as e:
        print(f"DEBUG: Analyze error: {e}")
        return {"error": f"An error occurred: {str(e)}"}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/recalculate")
async def recalculate(request: Request):
    """Recalculate nutrition based on selected food, portion, and ingredients."""
    data = await request.json()
    food_name = data.get("food_name")
    ingredients = data.get("ingredients", [])
    portion_unit = data.get("portion_unit", "g")
    portion_qty = data.get("portion_qty", 1)
    
    print(f"--- DEBUG RECALCULATE ---")
    print(f"Food: {food_name}, Portion: {portion_qty} {portion_unit}")
    
    # 5. Fix portion calculations & 6. Prevent mixing units
    multiplier = get_portion_multiplier(portion_unit, portion_qty)
    
    # If ingredients exist, we calculate based on them
    if ingredients:
        total = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
        has_nutrients = False
        for ing in ingredients:
            try:
                qty = float(ing.get("quantity", 0))
                
                # Check if ingredient has specific nutrition data from LOCAL_INGREDIENT_DB
                if "calories" in ing:
                    has_nutrients = True
                    # Scale based on the ratio of provided quantity vs original recipe quantity
                    # In LOCAL_INGREDIENT_DB, we stored calories for the specific quantity listed
                    total["calories"] += ing["calories"]
                    total["protein"] += ing["protein"]
                    total["carbs"] += ing["carbs"]
                    total["fat"] += ing["fat"]
                else:
                    # Realistic scaling for common ingredients (per 1g) fallback
                    total["calories"] += qty * 1.3
                    total["protein"] += qty * 0.04
                    total["carbs"] += qty * 0.18
                    total["fat"] += qty * 0.04
            except:
                continue
        
        if has_nutrients:
            print(f"Calculated from detailed local ingredients: {total['calories']} kcal")
            return total
            
        print(f"Calculated from ingredients (fallback avg): {total['calories']} kcal")
        return total
    
    # Otherwise, scale base food nutrition from Excel (which is per 100g)
    base_nutrients = get_nutrition_for_food(food_name)
    if not base_nutrients:
        print(f"No base nutrition found for {food_name}")
        return {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
        
    # base_nutrients are for 100g. Multiplier converts selection to 100g-equivalent.
    # e.g. 1 roti (40g) -> multiplier 0.4. 0.4 * base_nutrients gives nutrition for 40g.
    scaled = {
        "calories": base_nutrients["calories"] * multiplier,
        "protein": base_nutrients["protein"] * multiplier,
        "carbs": base_nutrients["carbs"] * multiplier,
        "fat": base_nutrients["fat"] * multiplier
    }
    print(f"Scaled from base nutrition ({multiplier:.2f}x of 100g): {scaled['calories']} kcal")
    return scaled

@app.post("/api/scans")
async def add_scan(request: dict):
    """8. CALORIE DASHBOARD FIX logic."""
    scans = load_scans()
    
    date = request.get("date", datetime.now().strftime("%Y-%m-%d"))
    food_name = request.get("food_name", "Meal")
    nutrients = request.get("nutrients", {"calories": 0, "protein": 0, "carbs": 0, "fat": 0})
    
    date_entry = next((e for e in scans if e["date"] == date), None)
    if not date_entry:
        date_entry = {"date": date, "scans": []}
        scans.append(date_entry)
    
    date_entry["scans"].append({
        "foodItems": [{"food": food_name, "nutrients": nutrients}],
        "timestamp": datetime.now().isoformat()
    })
    
    save_scans(scans)
    return {"success": True}

@app.get("/api/scans/last-three-days")
async def get_last_three_days_scans():
    """Get summarized scan data for the last 3 days."""
    scans = load_scans()
    today = datetime.now()
    results = []
    
    for i in range(3):
        target_date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        entry = next((e for e in scans if e["date"] == target_date), {"scans": [], "date": target_date})
        
        day_totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
        for scan in entry["scans"]:
            for item in scan["foodItems"]:
                n = item["nutrients"]
                day_totals["calories"] += n.get("calories", 0)
                day_totals["protein"] += n.get("protein", 0)
                day_totals["carbs"] += n.get("carbs", 0)
                day_totals["fat"] += n.get("fat", 0)
        
        results.append({
            "date": target_date,
            "totals": day_totals,
            "scanCount": len(entry["scans"])
        })
        
    return results

@app.get("/api/scans/by-date")
async def get_scans_by_date(date: str):
    scans = load_scans()
    entry = next((e for e in scans if e["date"] == date), {"scans": [], "date": date})
    
    totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    for scan in entry["scans"]:
        for item in scan["foodItems"]:
            n = item["nutrients"]
            totals["calories"] += n.get("calories", 0)
            totals["protein"] += n.get("protein", 0)
            totals["carbs"] += n.get("carbs", 0)
            totals["fat"] += n.get("fat", 0)
            
    return {"scans": entry["scans"], "totals": totals}

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": predict_image is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)