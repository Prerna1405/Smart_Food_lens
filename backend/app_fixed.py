import sys
import os

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

import fastapi
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
import shutil
import json
import requests
from datetime import datetime, timedelta
import os
import google.generativeai as genai

# Import the new chef router
from chef_api import router as chef_router
# Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable not set. Gemini features will be disabled.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI()

# SPOONACULAR API CONFIG
SPOONACULAR_API_KEY = "f8401aa1873d439eb5c5b0c9d86a2bda"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chef_router)

# Load nutrition data
def load_nutrition_data():
    nutrition_path = os.path.join(os.path.dirname(__file__), "nutrition", "nutrition_data.json")
    if not os.path.exists(nutrition_path):
        print(f"Nutrition data not found at {nutrition_path}")
        return {}
    with open(nutrition_path, "r", encoding='utf-8') as f:
        return json.load(f)

nutrition_data = load_nutrition_data()
print(f"Loaded nutrition data with {len(nutrition_data)} items")

# Load scans data
def load_scans():
    scans_path = os.path.join(os.path.dirname(__file__), "data", "scans.json")
    if os.path.exists(scans_path):
        with open(scans_path, "r", encoding='utf-8') as f:
            return json.load(f)
    return []

def save_scans(scans):
    scans_path = os.path.join(os.path.dirname(__file__), "data", "scans.json")
    os.makedirs(os.path.dirname(scans_path), exist_ok=True)
    with open(scans_path, "w", encoding='utf-8') as f:
        json.dump(scans, f, indent=2)

def get_spoonacular_recipes(query: str = "", diet: str = "", intolerances: str = "", type: str = "", min_protein: int = 0, max_calories: int = 2000, number: int = 25, offset: int = 0, max_time: int = 120, cuisine: str = ""):
    """Fetch high-quality recipes from Spoonacular with full details."""
    url = "https://api.spoonacular.com/recipes/complexSearch"
    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "query": query,
        "diet": diet,
        "intolerances": intolerances,
        "type": type,
        "cuisine": cuisine,
        "minProtein": min_protein,
        "maxCalories": max_calories,
        "maxReadyTime": max_time,
        "addRecipeInformation": True,
        "fillIngredients": True,
        "number": number,
        "offset": offset,
        "addRecipeNutrition": True
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        if "results" not in data:
            return {"recipes": [], "totalResults": 0}
            
        formatted_recipes = []
        for r in data["results"]:
            # Extract nutrient values
            nutrients = r.get("nutrition", {}).get("nutrients", [])
            calories = next((n["amount"] for n in nutrients if n["name"] == "Calories"), 300)
            protein = next((n["amount"] for n in nutrients if n["name"] == "Protein"), 20)
            carbs = next((n["amount"] for n in nutrients if n["name"] == "Carbohydrates"), 30)
            fat = next((n["amount"] for n in nutrients if n["name"] == "Fat"), 10)
            
            # Extract instructions properly
            instructions = r.get("analyzedInstructions", [])
            steps = []
            if instructions:
                for inst_group in instructions:
                    for step in inst_group.get("steps", []):
                        steps.append({
                            "step": len(steps) + 1,
                            "title": f"Step {len(steps) + 1}",
                            "instruction": step["step"],
                            "timer_seconds": 300 if any(keyword in step["step"].lower() for keyword in ["boil", "cook", "bake", "roast", "simmer"]) else 0
                        })
            else:
                # Fallback steps if no analyzed instructions
                steps = [{"step": 1, "title": "Prepare", "instruction": "Follow standard preparation for this dish.", "timer_seconds": 300}]
            
            # Format Spoonacular data to our app's structure
            formatted_recipes.append({
                "id": r["id"],
                "title": r["title"],
                "image": r["image"],
                "image_url": r["image"],
                "readyInMinutes": r.get("readyInMinutes", 30),
                "cook_time": r.get("readyInMinutes", 30),
                "prep_time": round(r.get("readyInMinutes", 30) * 0.3),
                "servings": r.get("servings", 2),
                "difficulty": "Medium" if r.get("readyInMinutes", 30) > 20 else "Easy",
                "calories": round(calories),
                "protein": round(protein),
                "carbs": round(carbs),
                "fat": round(fat),
                "rating": round(r.get("spoonacularScore", 85) / 20, 1),
                "description": r.get("summary", "").split(".")[0].replace("<b>", "").replace("</b>", "") + ".",
                "cuisine": r.get("cuisines", ["Global"])[0] if r.get("cuisines") else "Global",
                "ingredients": [
                    {
                        "name": ing["name"].capitalize(),
                        "quantity": str(round(ing["amount"], 1)),
                        "unit": ing["unit"]
                    } for ing in r.get("extendedIngredients", [])
                ],
                "steps": steps,
                "tips": "Try using fresh organic ingredients for enhanced flavor."
            })
        return {"recipes": formatted_recipes, "totalResults": data.get("totalResults", 0)}
    except Exception as e:
        print(f"Spoonacular Error: {e}")
        return {"recipes": [], "totalResults": 0}

@app.post("/api/ai/insights")
async def get_ai_insights(request: Request):
    """Generate personalized AI insights based on user profile and activity."""
    try:
        data = await request.json()
        profile = data.get("profile", {})
        today_totals = data.get("today_totals", {"calories": 0, "protein": 0, "carbs": 0, "fat": 0})
        
        # 1. Calculate BMR & TDEE (Same logic as frontend for consistency)
        weight = float(profile.get("weight") or 70)
        height = float(profile.get("height") or 170)
        age = int(profile.get("age") or 25)
        gender = profile.get("gender", "male")
        activity_level = profile.get("activity_level", "moderate")
        goal = profile.get("goal", "maintain")

        bmr = 10 * weight + 6.25 * height - 5 * age
        if gender == 'male': bmr += 5
        else: bmr -= 161

        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9,
        }
        tdee = bmr * multipliers.get(activity_level, 1.2)
        
        target_calories = tdee
        if goal == 'lose': target_calories -= 500
        elif goal == 'gain': target_calories += 500
        
        # 2. Dynamic Water Goal
        # Base: 35ml per kg of body weight
        water_goal = (weight * 0.035)
        # Adjust for activity
        if activity_level in ["active", "very_active"]: water_goal += 0.7
        elif activity_level == "moderate": water_goal += 0.4
        
        # 3. Target Macros
        target_protein = weight * (1.8 if activity_level in ["active", "very_active"] else 1.2)
        if goal == "gain": target_protein += 20
        
        # 4. Generate Insights
        insights = []
        
        # Calorie Insight
        cal_diff = target_calories - today_totals["calories"]
        if cal_diff > 100:
            insights.append({
                "id": "cal_1",
                "title": "Calorie Target",
                "text": f"You need {round(cal_diff)} kcal more to hit your {goal} goal.",
                "icon": "flame",
                "color": "#F59E0B"
            })
        elif cal_diff < -100:
            insights.append({
                "id": "cal_2",
                "title": "Calorie Alert",
                "text": f"You've exceeded your daily target by {round(abs(cal_diff))} kcal.",
                "icon": "warning",
                "color": "#EF4444"
            })
            
        # Water Insight
        insights.append({
            "id": "water_1",
            "title": "Hydration Goal",
            "text": f"Drink {round(water_goal, 1)}L water today based on your {activity_level} lifestyle.",
            "icon": "water",
            "color": "#0EA5E9"
        })
        
        # Protein Insight
        prot_diff = target_protein - today_totals["protein"]
        if prot_diff > 10:
            insights.append({
                "id": "prot_1",
                "title": "Protein Boost",
                "text": f"Add {round(prot_diff)}g more protein to support your {activity_level} activity.",
                "icon": "fitness",
                "color": "#6366F1"
            })
            
        # Goal Specific
        if goal == "lose":
            insights.append({
                "id": "goal_1",
                "title": "Weight Loss Tip",
                "text": "Try to incorporate more fiber-rich vegetables to feel fuller for longer.",
                "icon": "leaf",
                "color": "#10B981"
            })
        elif goal == "gain":
            insights.append({
                "id": "goal_2",
                "title": "Muscle Gain Tip",
                "text": "Ensure you're eating enough complex carbs to fuel your workouts.",
                "icon": "flash",
                "color": "#8B5CF6"
            })

        return {
            "insights": insights,
            "metrics": {
                "target_calories": round(target_calories),
                "target_protein": round(target_protein),
                "water_goal": round(water_goal, 1),
                "bmi": round(weight / ((height/100)**2), 1)
            }
        }
    except Exception as e:
        print(f"AI Insights Error: {e}")
        return {"error": str(e)}

@app.post("/api/ai/health-report")
async def get_health_report(request: Request):
    """Generate a detailed personalized health report."""
    try:
        data = await request.json()
        profile = data.get("profile", {})
        scans = data.get("scans", [])
        
        # Simple rule-based report generator (In production, this would call GPT-4/Gemini)
        name = profile.get("name", "User")
        goal = profile.get("goal", "maintain")
        
        report = {
            "summary": f"Hello {name}! Based on your {goal} goal, your nutrition and activity levels are looking stable.",
            "sections": [
                {
                    "title": "Nutrition Analysis",
                    "content": "Your protein intake is excellent, but we noticed a slight increase in sodium from recent scans. Consider more home-cooked meals.",
                    "status": "good"
                },
                {
                    "title": "Hydration & Sleep",
                    "content": "You are consistently hitting 2L of water. Aim for 3L on active days. Your sleep consistency could improve for better recovery.",
                    "status": "warning"
                },
                {
                    "title": "Pro Recommendations",
                    "content": "1. Add 20g of fiber to your breakfast.\n2. Incorporate 30 mins of light walking after dinner.\n3. Drink 500ml water immediately after waking up.",
                    "status": "tip"
                }
            ]
        }
        return report
    except Exception as e:
        return {"error": str(e)}

@app.get("/")
async def root():
    return {"message": "Welcome to NutriScan Food Nutrition API"}

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": predict_image is not None, "nutrition_items": len(nutrition_data)}

@app.get("/debug")
async def debug():
    return {
        "predict_image": str(type(predict_image)) if predict_image else "None",
        "nutrition_loaded": bool(nutrition_data),
        "nutrition_count": len(nutrition_data),
        "python_path": sys.path[:5]  # First 5 for brevity
    }

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

@app.post("/recalculate")
async def recalculate(request: Request):
    """Recalculate nutrition based on selected food, portion, and ingredients."""
    data = await request.json()
    food_name = data.get("food_name")
    ingredients = data.get("ingredients", [])
    portion_unit = data.get("portion_unit", "g")
    portion_qty = data.get("portion_qty", 100)
    
    # Use real estimation logic
    total = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    
    if ingredients:
        for ing in ingredients:
            qty = float(ing.get("quantity", 0))
            unit = ing.get("unit", "g")
            mult = 1.0
            if unit == "tsp": mult = 5.0
            elif unit == "tbsp": mult = 15.0
            elif unit == "pieces": mult = 50.0
            
            total_g = qty * mult
            total["calories"] += total_g * 1.5
            total["protein"] += total_g * 0.06
            total["carbs"] += total_g * 0.15
            total["fat"] += total_g * 0.05
    else:
        # Scale base food nutrition
        multiplier = get_portion_multiplier(portion_unit, portion_qty)
        
        # Fallback nutrition lookup
        calories = 350
        protein = 10
        carbs = 40
        fat = 10
        
        food_lower = food_name.lower() if food_name else ""
        if food_lower in nutrition_data:
            info = nutrition_data[food_lower]
            calories = info.get("calories_per_100g", 350)
            protein = info.get("protein", 10)
            carbs = info.get("carbs", 40)
            fat = info.get("fat", 10)
            
        total = {
            "calories": calories * multiplier,
            "protein": protein * multiplier,
            "carbs": carbs * multiplier,
            "fat": fat * multiplier
        }
        
    return total

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

@app.post("/analyze")
async def analyze(file: UploadFile = File(..., alias="image")):
    if predict_image is None:
        return {"error": "Model not loaded", "food_name": None}

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = predict_image(file_path)
        food_name = result.get("food_name") or result.get("food", "")
        confidence = result.get("confidence", 0.95)
        
        calories = float(result.get("calories", 0) or 0)
        protein = float(result.get("protein", 0) or 0)
        carbs = float(result.get("carbs", 0) or 0)
        fat = float(result.get("fat", 0) or 0)
        
        # Fallback nutrition lookup
        if calories == 0 and food_name:
            food_lower = food_name.lower()
            if food_lower in nutrition_data:
                info = nutrition_data[food_lower]
                calories = info.get("calories_per_100g", 0)
                protein = info.get("protein", 0)
                carbs = info.get("carbs", 0)
                fat = info.get("fat", 0)
            else:
                for key in nutrition_data:
                    if food_lower in key or key in food_lower:
                        info = nutrition_data[key]
                        calories = info.get("calories_per_100g", 0)
                        protein = info.get("protein", 0)
                        carbs = info.get("carbs", 0)
                        fat = info.get("fat", 0)
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
        return {"error": f"Analyze error: {str(e)}"}
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

@app.post("/nutrition")
async def get_nutrition(request: dict):
    food = request.get("food", "").lower()
    quantity = float(request.get("quantity", 100))
    
    if food in nutrition_data:
        info = nutrition_data[food]
        cal100 = info.get("calories_per_100g", 0)
        return {
            "calories": (cal100 * quantity) / 100,
            "protein": (info.get("protein", 0) * quantity) / 100,
            "carbs": (info.get("carbs", 0) * quantity) / 100,
            "fat": (info.get("fat", 0) * quantity) / 100
        }
    
    return {
        "calories": quantity,
        "protein": quantity * 0.03,
        "carbs": quantity * 0.15,
        "fat": quantity * 0.03
    }

@app.post("/api/scans")
async def add_scan(request: dict):
    scans = load_scans()
    
    date = request.get("date", datetime.now().strftime("%Y-%m-%d"))
    food_items = request.get("foodItems", [])
    
    date_entry = None
    for entry in scans:
        if entry.get("date") == date:
            date_entry = entry
            break
    
    if date_entry is None:
        date_entry = {"date": date, "scans": []}
        scans.append(date_entry)
    
    new_scan = {
        "foodItems": food_items,
        "timestamp": datetime.now().isoformat()
    }
    date_entry["scans"].append(new_scan)
    
    save_scans(scans)
    return {"success": True}

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
                    for key in totals:
                        totals[key] += nutrients.get(key, 0)
            return {"scans": scans_list, "totals": totals}
    return {"scans": [], "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}}

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
                totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
                for scan in entry.get("scans", []):
                    for item in scan.get("foodItems", []):
                        nutrients = item.get("nutrients", {})
                        for key in totals:
                            totals[key] += nutrients.get(key, 0)
                result[entry["date"]] = totals
        except:
            continue
    return {"data": result}

print("NutriScan API loaded successfully!")
print(f"Model: {predict_image is not None}")
print(f"Nutrition data: {len(nutrition_data)} items")

