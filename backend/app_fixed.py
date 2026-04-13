import sys
import os
import shutil
import json
from datetime import datetime, timedelta
from typing import Optional, List

# Auth imports
from passlib.context import CryptContext
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from fastapi import FastAPI, File, UploadFile, Request, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
import traceback
from fastapi.responses import JSONResponse

# JWT Configuration
SECRET_KEY = "your-secret-key-for-jwt-tokens" # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# MongoDB Configuration
MONGO_DETAILS = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_DETAILS)
database = client.nutriscan
users_collection = database.get_collection("users")
scans_collection = database.get_collection("scans")

# Password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# --- Schemas ---
class UserSchema(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Auth Helpers ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = await users_collection.find_one({"username": token_data.username})
    if user is None:
        raise credentials_exception
    return user

try:
    # Add the parent directory to the path to allow imports from foodmodel
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    print("Appended to path. Attempting to import predict_image from predict_yolo...")
    from foodmodel.predict_yolo import predict_image, get_nutrition_for_food
    print("Successfully imported predict_image from predict_yolo.")
except ImportError as e:
    print(f"Failed to import predict_image from predict_yolo: {e}")
    try:
        from foodmodel.predict import predict_image, get_nutrition_for_food
        print("Fallback: Successfully imported predict_image from predict.")
    except ImportError as e2:
        print(f"Failed to import fallback predict_image: {e2}")
        predict_image = None
        get_nutrition_for_food = None
except Exception as e:
    print(f"An unexpected error occurred during import: {e}")
    predict_image = None
    get_nutrition_for_food = None

# --- Global Exception Handler ---
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print(f"Unhandled exception: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(e)},
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Credentials": "true",
            }
        )

app = FastAPI()
app.middleware("http")(catch_exceptions_middleware)

# Enhanced CORS configuration
origins = [
    "http://localhost:8081",
    "http://localhost:8080",
    "http://localhost:19006",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8080",
    "http://localhost:8084", # Your web app port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth Endpoints ---

@app.post("/api/auth/register", response_model=Token)
async def register(user: UserSchema):
    existing_user = await users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    await users_collection.insert_one(new_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users_collection.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"], "email": current_user["email"]}

def get_portion_multiplier(unit, quantity):
    """Portion size logic to match frontend selection."""
    multipliers = {
        "g": 0.01,
        "grams": 0.01,
        "tsp": 0.05,
        "tbsp": 0.15,
        "bowl": 2.5,
        "cup": 2.4,
        "piece": 1.0,
        "half_bowl": 1.25,
        "1_bowl": 2.5,
        "2_bowl": 5.0,
        "1_roti": 0.4,
        "2_roti": 0.8,
        "3_roti": 1.2,
    }
    norm_unit = unit.lower().replace(' ', '_')
    base_mult = multipliers.get(norm_unit, 0.01)
    try:
        qty = float(quantity) if quantity else 1.0
    except (ValueError, TypeError):
        qty = 1.0
    return base_mult * qty

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

@app.post("/generate-recipes")
async def generate_recipes(request: Request):
    """Generate personalized recipes using AI based on user profile and goals."""
    data = await request.json()
    profile = data.get("profile", {})
    recent_scans = data.get("recent_scans", [])
    
    # Extract user context for the AI prompt
    dietary_prefs = ", ".join(profile.get("dietary_preferences", [])) or "None"
    restrictions = ", ".join(profile.get("restrictions", [])) or "None"
    goal = profile.get("health_goals", "Maintain Weight")
    
    # Calculate daily needs (fallback)
    target_cal = profile.get("daily_calorie_target", 2000)
    
    print(f"🤖 [AI Recipe Gen] Creating recipes for Goal: {goal}, Diet: {dietary_prefs}")

    # Use Spoonacular's complex search as our AI-powered engine
    # (In a production environment, this could also be coupled with a LLM like Gemini or GPT)
    try:
        search_url = "https://api.spoonacular.com/recipes/complexSearch"
        params = {
            "apiKey": SPOONACULAR_API_KEY,
            "diet": dietary_prefs.lower(),
            "intolerances": restrictions.lower(),
            "maxCalories": target_cal // 3, # Suggesting a meal that fits ~1/3 of daily target
            "number": 5,
            "addRecipeInformation": True,
            "fillIngredients": True,
            "sort": "healthiness",
            "type": "main course"
        }
        
        # Adjust search for specific goals/conditions
        if "Diabetes" in goal or "Low Carb" in goal:
            params["maxCarbs"] = 30
        if "Hypertension" in goal or "Low Sodium" in goal:
            params["maxSodium"] = 500
        if "Muscle" in goal or "Gain" in goal:
            params["minProtein"] = 30

        resp = requests.get(search_url, params=params, timeout=10)
        recipes_data = resp.json()
        
        results = []
        for r in recipes_data.get("results", []):
            results.append({
                "id": r["id"],
                "title": r["title"],
                "image": r["image"],
                "summary": r.get("summary", ""),
                "readyInMinutes": r.get("readyInMinutes"),
                "healthScore": r.get("healthScore"),
                "nutrients": {
                    "calories": r.get("nutrition", {}).get("nutrients", [{}])[0].get("amount", 0),
                    # We'll rely on the frontend to display detailed nutrients from info
                }
            })
            
        return {"recipes": results}
    except Exception as e:
        print(f"❌ [AI Error] Recipe generation failed: {e}")
        return {"error": "Failed to generate recipes", "details": str(e)}

@app.get("/recipe-info/{recipe_id}")
async def get_recipe_info(recipe_id: int):
    """Get detailed nutrition and instructions for a specific recipe."""
    try:
        url = f"https://api.spoonacular.com/recipes/{recipe_id}/information"
        params = {"apiKey": SPOONACULAR_API_KEY, "includeNutrition": True}
        resp = requests.get(url, params=params, timeout=10)
        return resp.json()
    except Exception as e:
        return {"error": str(e)}

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
    
    multiplier = get_portion_multiplier(portion_unit, portion_qty)
    
    # 1. Try to get nutrition from the database (Excel match via YOLO logic)
    base_nutrients = None
    if get_nutrition_for_food:
        base_nutrients = get_nutrition_for_food(food_name)
    
    # 2. Fallback to LOCAL_INGREDIENT_DB if Excel didn't match
    if not base_nutrients and food_name in LOCAL_INGREDIENT_DB:
        ings = LOCAL_INGREDIENT_DB[food_name]
        total_cal = sum(i.get("calories", 0) for i in ings)
        total_prot = sum(i.get("protein", 0) for i in ings)
        total_carb = sum(i.get("carbs", 0) for i in ings)
        total_fat = sum(i.get("fat", 0) for i in ings)
        # Assuming LOCAL_INGREDIENT_DB entries represent a "standard portion" (~250g)
        # Normalize to per 100g base for scaling
        base_nutrients = {
            "calories": total_cal / 2.5,
            "protein": total_prot / 2.5,
            "carbs": total_carb / 2.5,
            "fat": total_fat / 2.5
        }

    # 3. Fallback to local JSON if still nothing
    if not base_nutrients and food_name:
        food_lower = food_name.lower()
        if food_lower in nutrition_data:
            info = nutrition_data[food_lower]
            base_nutrients = {
                "calories": info.get("calories_per_100g", 0),
                "protein": info.get("protein", 0),
                "carbs": info.get("carbs", 0),
                "fat": info.get("fat", 0)
            }

    # 4. Final fallback to API or Average if still nothing
    if not base_nutrients and food_name:
        base_nutrients = get_external_nutrition(food_name)
        
    if not base_nutrients:
        # Last resort average
        base_nutrients = {"calories": 150, "protein": 5, "carbs": 20, "fat": 5}

    # 5. Apply multiplier to base (per 100g) nutrients
    # multiplier is already (unit_base * quantity / 100)
    # So scaled = base_per_100g * multiplier
    scaled = {
        "calories": round(base_nutrients["calories"] * multiplier, 1),
        "protein": round(base_nutrients["protein"] * multiplier, 1),
        "carbs": round(base_nutrients["carbs"] * multiplier, 1),
        "fat": round(base_nutrients["fat"] * multiplier, 1),
        "kcal": round(base_nutrients["calories"] * multiplier, 1)
    }
    
    print(f"Scaled result: {scaled['calories']} kcal (Multiplier: {multiplier:.2f})")
    return scaled

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

import requests
from functools import lru_cache

# API Configuration
SPOONACULAR_API_KEY = "f8401aa1873d439eb5c5b0c9d86a2bda"

@lru_cache(maxsize=128)
def get_external_nutrition(query: str):
    """Fetch nutrition from Spoonacular API with caching."""
    print(f"🌐 [API Fallback] Searching Spoonacular for: {query}")
    try:
        # 1. Search for the food item ID
        search_url = f"https://api.spoonacular.com/food/ingredients/search"
        params = {"apiKey": SPOONACULAR_API_KEY, "query": query, "number": 1}
        resp = requests.get(search_url, params=params, timeout=5)
        data = resp.json()
        
        if not data.get("results"):
            return None
            
        ingredient_id = data["results"][0]["id"]
        
        # 2. Get detailed nutrition for that ID
        info_url = f"https://api.spoonacular.com/food/ingredients/{ingredient_id}/information"
        params = {"apiKey": SPOONACULAR_API_KEY, "amount": 100, "unit": "g"}
        info_resp = requests.get(info_url, params=params, timeout=5)
        info_data = info_resp.json()
        
        nutrients = info_data.get("nutrition", {}).get("nutrients", [])
        
        # Helper to find specific nutrient
        def find_n(name):
            for n in nutrients:
                if n["name"].lower() == name.lower():
                    return n["amount"]
            return 0
            
        return {
            "calories": find_n("Calories"),
            "protein": find_n("Protein"),
            "carbs": find_n("Carbohydrates"),
            "fat": find_n("Fat"),
            "source": "Spoonacular API"
        }
    except Exception as e:
        print(f"❌ [API Error] Spoonacular failed: {e}")
        return None

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

        # 1. CV Recognition (YOLOv8)
        result = predict_image(file_path)
        
        if "error" in result:
            return result

        food_name = result.get("food_name") or result.get("food", "")
        confidence = result.get("confidence", 0.0)
        
        # High confidence check (Requirement: >= 90%)
        is_high_confidence = confidence >= 0.90
        
        # 2. Nutrition Retrieval (Local -> External API)
        nutrition = result.get("nutrition")
        
        # Fallback 1: Local JSON fallback
        if not nutrition and food_name:
            food_lower = food_name.lower()
            if food_lower in nutrition_data:
                info = nutrition_data[food_lower]
                nutrition = {
                    "calories": info.get("calories_per_100g", 0),
                    "protein": info.get("protein", 0),
                    "carbs": info.get("carbs", 0),
                    "fat": info.get("fat", 0),
                    "source": "Local Database"
                }
        
        # Fallback 2: Spoonacular API (Requirement: Automatic Fallback)
        if not nutrition and food_name:
            nutrition = get_external_nutrition(food_name)

        # 3. Portion Estimation (Requirement: Accurate Recognition)
        # Simple volume estimation based on bounding boxes or default portion
        portion_g = result.get("portion_g", 250) # Default 250g if not estimated
        
        # Final response assembly (Requirement 2 & 4)
        if not nutrition:
            # Absolute last resort fallback to prevent 0 kcal
            nutrition = {"calories": 150, "protein": 5, "carbs": 20, "fat": 5, "source": "Estimated Average"}

        return {
            "food": food_name,
            "confidence": round(confidence, 2),
            "portion_g": portion_g,
            "kcal": round(nutrition["calories"] * (portion_g / 100), 1),
            "protein_g": round(nutrition["protein"] * (portion_g / 100), 1),
            "carbs_g": round(nutrition["carbs"] * (portion_g / 100), 1),
            "fat_g": round(nutrition["fat"] * (portion_g / 100), 1),
            "per_100g": nutrition,
            "status": "Success",
            "ingredients": result.get("ingredients", [])
        }
    except Exception as e:
        print(f"❌ [Analyze Error] {e}")
        return {"error": f"Internal analysis error: {str(e)}"}
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
async def add_scan(request: dict, current_user: Optional[dict] = Depends(get_current_user)):
    username = current_user["username"] if current_user else "anonymous"
    
    date = request.get("date", datetime.now().strftime("%Y-%m-%d"))
    
    # Handle both formats (single food or list of foodItems)
    food_items = request.get("foodItems", [])
    if not food_items:
        food_name = request.get("food_name")
        nutrients = request.get("nutrients")
        if food_name and nutrients:
            food_items = [{"food": food_name, "nutrients": nutrients}]
    
    if not food_items:
        return {"success": False, "error": "No food items provided"}
        
    new_scan = {
        "username": username,
        "date": date,
        "foodItems": food_items,
        "timestamp": datetime.now().isoformat()
    }
    
    await scans_collection.insert_one(new_scan)
    return {"success": True}

@app.post("/api/ai/generate-recipe")
async def generate_recipe(request: dict):
    query = request.get("query", "")
    # Mocking AI recipe generation for now
    # In a real app, this would call OpenAI/Gemini
    return {
        "title": f"Healthy {query.title()}",
        "description": "A delicious, nutritionally balanced meal prepared by AI based on your preferences.",
        "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop",
        "ingredients": [
            {"name": "Organic Greens", "quantity": "2 cups", "icon": "leaf"},
            {"name": "Plant Protein", "quantity": "150g", "icon": "food-drumstick"},
            {"name": "Avocado", "quantity": "1/2", "icon": "avocado"},
            {"name": "Quinoa", "quantity": "1/2 cup", "icon": "seed"}
        ],
        "steps": [
            "Rinse and prepare all organic ingredients.",
            "Cook the base protein with light seasoning for 12 minutes.",
            "Assemble the bowl with greens and quinoa.",
            "Top with sliced avocado and a light vinaigrette."
        ],
        "nutrition": {
            "calories": 450,
            "protein": 32,
            "carbs": 28,
            "fat": 18
        }
    }

@app.get("/api/scans/by-date")
async def get_scans_by_date(date: str, current_user: Optional[dict] = Depends(get_current_user)):
    username = current_user["username"] if current_user else "anonymous"
    
    cursor = scans_collection.find({"username": username, "date": date})
    scans_list = await cursor.to_list(length=100)
    
    # Clean up _id for JSON serialization
    for s in scans_list:
        if "_id" in s:
            s["_id"] = str(s["_id"])
            
    totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    for scan in scans_list:
        for item in scan.get("foodItems", []):
            nutrients = item.get("nutrients", {})
            for key in totals:
                totals[key] += nutrients.get(key, 0)
                
    return {"scans": scans_list, "totals": totals}

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

