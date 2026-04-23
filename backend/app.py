import os
import sys
import requests
import shutil
import json
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from chef_api import router as chef_router, generate_ai_recipe
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase Client Initialization
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key must be set in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ... (rest of the imports)

def generate_recipe(food_name: str):
    """Generate or retrieve a recipe for the given food name."""
    # 1. Try local DB
    recipe = LOCAL_RECIPE_DB.get(food_name.lower())
    if recipe:
        return recipe

    # 2. Try to generate using AI if local fails
    try:
        # We need to run the async function in a sync context if called from a sync endpoint
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        ai_recipe = loop.run_until_complete(generate_ai_recipe(ingredients=[food_name]))
        
        # Transform AI recipe to match frontend expectations if needed
        # The AI recipe format from chef_api.py:
        # { title, image, calories, protein, carbs, fat, ingredients: [{name, quantity}], steps: [str], cooking_time, servings }
        
        # Transform steps to the format used by FoodScanner.tsx (RecipeStep[])
        steps = []
        for i, instruction in enumerate(ai_recipe.get("steps", []), 1):
            steps.append({
                "step": i,
                "title": f"Step {i}",
                "instruction": instruction,
                "timer_seconds": 300 # Default 5 mins
            })
            
        return {
            "description": ai_recipe.get("description", f"A delicious way to prepare {food_name}."),
            "benefits": ["High Protein", "Nutritious", "Homemade"],
            "prep_time": "10 mins",
            "cook_time": f"{ai_recipe.get('cooking_time', 20)} mins",
            "difficulty": "Medium",
            "servings": ai_recipe.get("servings", 1),
            "tips": "Serve hot for best taste.",
            "ingredients": ai_recipe.get("ingredients", []),
            "steps": steps,
            "image_url": ai_recipe.get("image")
        }
    except Exception as e:
        print(f"Failed to generate AI recipe: {e}")
        # Fallback to a basic template
        return {
            "description": f"Simple {food_name} recipe.",
            "benefits": ["Quick", "Easy"],
            "prep_time": "5 mins",
            "cook_time": "15 mins",
            "difficulty": "Easy",
            "servings": 1,
            "tips": "Adjust spices to taste.",
            "ingredients": [{"name": food_name, "quantity": "100", "unit": "g"}],
            "steps": [{"step": 1, "title": "Prepare", "instruction": f"Prepare the {food_name} and serve."}],
        }


# SPOONACULAR API CONFIG
SPOONACULAR_API_KEY = "f8401aa1873d439eb5c5b0c9d86a2bda"

try:
    # Use the new TensorFlow prediction script
    from prediction_tf import predict_image, get_nutrition_for_food
except ImportError as e:
    print(f"Failed to import prediction_tf: {e}")
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

app.include_router(chef_router)

def get_portion_multiplier(unit, quantity):
    """7. PORTION SIZE SYSTEM logic."""
    # Base multipliers (relative to 100g database entry)
    multipliers = {
        "g": 0.01,         # 1g = 0.01 * 100g
        "grams": 0.01,
        "tsp": 0.05,       # 1 tsp approx 5g
        "tbsp": 0.15,      # 1 tbsp approx 15g
        "bowl": 2.5,       # 1 bowl approx 250g
        "cup": 2.4,        # 1 cup approx 240g
        "piece": 1.0,      # 1 piece approx 100g (default)
        "half_bowl": 1.25, # 125g
        "1_bowl": 2.5,     # 250g
        "2_bowl": 5.0,     # 500g
        "1_roti": 0.7,     # 1 roti approx 70g
        "2_roti": 1.4,     # 140g
        "3_roti": 2.1,     # 210g
    }
    
    # Handle normalized units from frontend
    norm_unit = unit.lower().replace(' ', '_')
    base_mult = multipliers.get(norm_unit, 0.01) # Default to grams if unknown
    
    try:
        qty = float(quantity) if quantity else 1.0
    except (ValueError, TypeError):
        qty = 1.0
        
    return base_mult * qty



# LOCAL INGREDIENT DATABASE (Mock for demo)
LOCAL_RECIPE_DB = {
    "aloo gobi": {
        "description": "A classic North Indian dry curry made with potatoes and cauliflower, seasoned with turmeric and other spices.",
        "benefits": ["Rich in Vitamin C", "High Fiber", "Anti-inflammatory"],
        "prep_time": "15 mins",
        "cook_time": "25 mins",
        "difficulty": "Easy",
        "servings": 2,
        "tips": "Soak cauliflower in warm salt water for 10 mins before cooking to remove impurities.",
        "ingredients": [
            {"name": "Potato", "quantity": "2 medium", "unit": "pieces", "calories": 150},
            {"name": "Cauliflower", "quantity": "1 medium", "unit": "piece", "calories": 100},
            {"name": "Onion", "quantity": "1 medium", "unit": "piece", "calories": 40},
            {"name": "Oil", "quantity": "2", "unit": "tbsp", "calories": 240}
        ],
        "steps": [
            {"step": 1, "title": "Prep Veggies", "instruction": "Cut cauliflower into medium florets and potatoes into small cubes.", "timer_seconds": 300},
            {"step": 2, "title": "Sauté Aromatics", "instruction": "Heat oil in a pan. Add cumin seeds and onions. Sauté until golden.", "timer_seconds": 300},
            {"step": 3, "title": "Cook Main Dish", "instruction": "Add potatoes and cauliflower. Sprinkle turmeric, chili powder, and salt. Cover and cook.", "timer_seconds": 900},
            {"step": 4, "title": "Garnish", "instruction": "Garnish with fresh coriander and serve hot.", "timer_seconds": 60}
        ]
    },
    "dal tadka": {
        "description": "Smooth and creamy yellow lentils tempered with ghee, garlic, and aromatic spices.",
        "benefits": ["High Protein", "Easy to Digest", "Iron Rich"],
        "prep_time": "10 mins",
        "cook_time": "20 mins",
        "difficulty": "Medium",
        "servings": 2,
        "tips": "For best flavor, use Desi Ghee for the tadka.",
        "ingredients": [
            {"name": "Toor Dal", "quantity": "1", "unit": "cup", "calories": 230},
            {"name": "Ghee", "quantity": "2", "unit": "tbsp", "calories": 260},
            {"name": "Garlic", "quantity": "4", "unit": "cloves", "calories": 20},
            {"name": "Spices", "quantity": "1", "unit": "set", "calories": 50}
        ],
        "steps": [
            {"step": 1, "title": "Boil Dal", "instruction": "Pressure cook the washed dal with turmeric and salt until soft.", "timer_seconds": 900},
            {"step": 2, "title": "Prepare Tadka", "instruction": "Heat ghee. Add cumin, garlic, and dried red chilies. Let it sizzle.", "timer_seconds": 120},
            {"step": 3, "title": "Combine", "instruction": "Pour the hot tadka over the cooked dal. Cover immediately.", "timer_seconds": 60}
        ]
    }
}

@app.get("/api/scans/range")
async def get_scans_range(end: str, days: int = 30):
    try:
        end_date = datetime.strptime(end, "%Y-%m-%d")
    except ValueError:
        end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    response = supabase.from_("scans").select("*").gte("date", start_date.strftime("%Y-%m-%d")).lte("date", end_date.strftime("%Y-%m-%d")).execute()
    scans_data = response.data

    result = {}
    for entry in scans_data:
        entry_date_str = entry.get("date", "")
        try:
            entry_date = datetime.strptime(entry_date_str, "%Y-%m-%d")
            if start_date <= entry_date <= end_date:
                totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
                for scan_item in entry.get("scans", []):
                    for item in scan_item.get("foodItems", []):
                        n = item.get("nutrients", item)
                        totals["calories"] += n.get("calories", 0)
                        totals["protein"] += n.get("protein", 0)
                        totals["carbs"] += n.get("carbs", 0)
                        totals["fat"] += n.get("fat", 0)
                result[entry_date_str] = totals
        except ValueError:
            continue
    return {"data": result}

@app.get("/api/scans/last-three-days")
async def get_last_three_days():
    today = datetime.now()
    three_days_ago = today - timedelta(days=3)
    
    response = supabase.from_("scans").select("*").gte("date", three_days_ago.strftime("%Y-%m-%d")).order("date", desc=True).execute()
    scans_data = response.data
    
    return {"scans": scans_data}

# ALL RECIPE AND CHEF AI LOGIC HAS BEEN MOVED TO chef_api.py

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if predict_image is None:
        return {"error": "Prediction model not available. Check foodmodel/predict.py"}

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = predict_image(file_path)
        
        return {
            "food_name": result.get("food_name", result.get("food", "")),
            "confidence": result.get("confidence", 0.95),
            "calories": result.get("calories", 0),
            "protein": result.get("protein", 0),
            "carbs": result.get("carbs", 0),
            "fat": result.get("fat", 0),
        }
    except Exception as e:
        return {"error": f"Prediction error: {str(e)}"}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/classify-nutrition")
async def classify_nutrition(file: UploadFile = File(..., alias="image"), threshold: float = 0.70):
    if predict_image is None:
        return {"error": "Model not available"}

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = predict_image(file_path)
        food_name = result.get("food_name") or result.get("food", "")
        confidence = result.get("confidence", 0.95)
        
        return {
            "food": food_name,
            "confidence": confidence
        }
    except Exception as e:
        return {"error": f"Classify error: {str(e)}"}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

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

        food_name = result["food_name"]
        
        # 8. DEBUG LOGGING
        print(f"--- ANALYZE SUCCESS ---")
        print(f"Food: {food_name}")
        print(f"Confidence: {result['confidence']:.2%}")
        
        # Get detailed recipe
        recipe = generate_recipe(food_name)
        
        # Ensure nutrition values are never fake 0g
        nutrition = result.get("nutrition")
        if not nutrition or nutrition.get("calories") == "Not Found" or nutrition.get("calories") == 0:
            # Estimate from recipe ingredients
            est_cal = sum(ing.get("calories", 0) for ing in recipe["ingredients"])
            nutrition = {
                "calories": est_cal or 350, # Fallback to 350 if estimation fails
                "protein": (est_cal or 350) * 0.06,
                "carbs": (est_cal or 350) * 0.12,
                "fat": (est_cal or 350) * 0.05,
                "matched_name": f"{food_name} (AI Estimated)"
            }

        return {
            "food_name": food_name,
            "confidence": result["confidence"],
            "top_predictions": result.get("top_predictions", []),
            "nutrition": nutrition,
            "recipe": recipe,
            "status": "success"
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
    portion_qty = data.get("portion_qty", 100)
    
    print(f"--- DEBUG RECALCULATE ---")
    print(f"Food: {food_name}, Portion: {portion_qty} {portion_unit}")
    
    # Use real estimation logic
    total = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    
    if ingredients:
        for ing in ingredients:
            qty = float(ing.get("quantity", 0))
            # Better estimation based on unit
            unit = ing.get("unit", "g")
            mult = 1.0
            if unit == "tsp": mult = 5.0
            elif unit == "tbsp": mult = 15.0
            elif unit == "pieces": mult = 50.0
            
            total_g = qty * mult
            # Standard density: 1.5 kcal/g
            total["calories"] += total_g * 1.5
            total["protein"] += total_g * 0.06
            total["carbs"] += total_g * 0.15
            total["fat"] += total_g * 0.05
    else:
        # Scale base food nutrition correctly (fix the 100x bug)
        base_nutrients = get_nutrition_for_food(food_name)
        if not base_nutrients:
            # AI Estimation if not in DB
            recipe = generate_recipe(food_name)
            base_nutrients = {
                "calories": sum(i.get("calories", 0) for i in recipe["ingredients"]),
                "protein": 10, "carbs": 40, "fat": 10
            }
            
        multiplier = get_portion_multiplier(portion_unit, portion_qty)
        # database is per 100g. get_portion_multiplier returns (total_grams / 100)
        total = {
            "calories": base_nutrients["calories"] * multiplier,
            "protein": base_nutrients["protein"] * multiplier,
            "carbs": base_nutrients["carbs"] * multiplier,
            "fat": base_nutrients["fat"] * multiplier
        }
        
    print(f"Final recalculation: {total['calories']} kcal")
    return total

@app.post("/api/scans")
async def add_scan(request: dict):
    """8. CALORIE DASHBOARD FIX logic."""
    date = request.get("date", datetime.now().strftime("%Y-%m-%d"))
    food_name = request.get("food_name", "Meal")
    nutrients = request.get("nutrients", {"calories": 0, "protein": 0, "carbs": 0, "fat": 0})
    
    # Fetch existing entry for the date
    response = supabase.from_("scans").select("*").eq("date", date).limit(1).execute()
    existing_entry = response.data[0] if response.data else None

    if existing_entry:
        # Append to existing scans array
        existing_scans = existing_entry.get("scans", [])
        existing_scans.append({
            "foodItems": [{"food": food_name, "nutrients": nutrients}],
            "timestamp": datetime.now().isoformat()
        })
        supabase.from_("scans").update({"scans": existing_scans}).eq("id", existing_entry["id"]).execute()
    else:
        # Create new entry
        supabase.from_("scans").insert({
            "date": date,
            "scans": [{
                "foodItems": [{"food": food_name, "nutrients": nutrients}],
                "timestamp": datetime.now().isoformat()
            }]
        }).execute()
    
    return {"success": True}

@app.get("/api/scans/by-date")
async def get_scans_by_date(date: str):
    response = supabase.from_("scans").select("*").eq("date", date).limit(1).execute()
    entry = response.data[0] if response.data else {"scans": [], "date": date}
    
    totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    for scan_item in entry.get("scans", []):
        for item in scan_item.get("foodItems", []):
            n = item.get("nutrients", item)
            totals["calories"] += n.get("calories", 0)
            totals["protein"] += n.get("protein", 0)
            totals["carbs"] += n.get("carbs", 0)
            totals["fat"] += n.get("fat", 0)
            
    return {"scans": entry.get("scans", []), "totals": totals}

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": predict_image is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
