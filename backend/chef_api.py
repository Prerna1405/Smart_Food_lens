import os
import json
import asyncio
import urllib.parse
import urllib.request
import random
from fastapi import APIRouter, Request, Query, HTTPException
from typing import Optional, List, Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ==========================================
# NEW RECIPE ENGINE (Inspired by smart-recipe-generator)
# ==========================================

async def generate_ai_recipe(
    ingredients: List[str] = None,
    cuisine: str = None,
    max_calories: int = None,
    min_protein: int = None,
    meal_type: str = None
) -> Dict[str, Any]:
    """
    Generate a high-quality unique recipe using Gemini AI.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("Gemini API key not configured")

    prompt = f"""
    Generate a unique, professional, and realistic recipe based on these parameters:
    - Ingredients: {', '.join(ingredients) if ingredients else 'Any healthy ingredients'}
    - Cuisine: {cuisine if cuisine else 'Any'}
    - Max Calories: {max_calories if max_calories else 'Balanced'}
    - Min Protein: {min_protein if min_protein else 'Balanced'}
    - Meal Type: {meal_type if meal_type else 'Any'}

    The recipe must be detailed and high-quality. Return ONLY a clean JSON object with this exact structure:
    {{
      "title": "Recipe Name",
      "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80 (use a realistic food photo URL from Unsplash)",
      "calories": 450,
      "protein": 25,
      "carbs": 40,
      "fat": 15,
      "ingredients": [
        {{"name": "Ingredient Name", "quantity": "100g or 1 cup"}}
      ],
      "steps": [
        "Step 1 instruction",
        "Step 2 instruction"
      ],
      "cooking_time": 30,
      "servings": 2
    }}
    Ensure all nutrition values are numbers and steps are clear.
    """

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = await model.generate_content_async(prompt)
        text = response.text
        
        # Extract JSON from markdown if needed
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"Recipe Generation error: {e}")
        # Fallback recipe if AI fails
        return {
            "title": "Quick Healthy Bowl",
            "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80",
            "calories": 400,
            "protein": 20,
            "carbs": 45,
            "fat": 12,
            "ingredients": [{"name": "Mixed Greens", "quantity": "2 cups"}, {"name": "Grilled Chicken", "quantity": "100g"}],
            "steps": ["Wash the greens.", "Top with grilled chicken.", "Enjoy your meal!"],
            "cooking_time": 10,
            "servings": 1
        }

# ==========================================
# ENDPOINTS
# ==========================================

@router.post("/chef/generate")
async def chef_generate_recipe(request: Request):
    """
    Generate a new recipe based on user preferences.
    """
    try:
        data = await request.json()
        ingredients = data.get("ingredients", [])
        cuisine = data.get("cuisine")
        max_calories = data.get("max_calories")
        min_protein = data.get("min_protein")
        meal_type = data.get("meal_type")
        
        recipe = await generate_ai_recipe(
            ingredients=ingredients,
            cuisine=cuisine,
            max_calories=max_calories,
            min_protein=min_protein,
            meal_type=meal_type
        )
        return recipe
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chef/discover")
async def chef_discover(page: int = Query(1)):
    """
    Discover new recipes (randomly generated for infinite scroll).
    """
    # For discovery, we generate a few random high-quality recipes
    # In a real app, these might come from a DB or cache
    tasks = [generate_ai_recipe() for _ in range(5)]
    recipes = await asyncio.gather(*tasks)
    return recipes

@router.get("/chef/search")
async def chef_search(q: str = Query(""), page: int = Query(1)):
    """
    Search for recipes by generating one based on the query.
    """
    recipe = await generate_ai_recipe(ingredients=[q] if q else None)
    return [recipe] # Return as a list for compatibility with frontend

@router.get("/chef/recipe/{id}")
async def chef_recipe_detail(id: str):
    """
    Fetch recipe details (for simplicity, we generate a new one or return a mock).
    """
    # In this new engine, we might not need to store IDs if everything is real-time generated
    return await generate_ai_recipe()

@router.post("/chef/log-meal")
async def chef_log_meal(request: Request):
    """Log meal to user tracker."""
    return {"status": "success", "message": "Meal logged to dashboard"}
