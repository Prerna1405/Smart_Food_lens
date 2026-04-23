import asyncio
import sys
import os
import urllib.parse
import urllib.request
import json
from dotenv import load_dotenv

load_dotenv()
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")

async def fetch_spoonacular_recipes(query: str, count: int = 5, offset: int = 0, **kwargs) -> list:
    filters = ""
    for k, v in kwargs.items():
        if v: filters += f"&{k}={urllib.parse.quote(str(v))}"
    
    url = f"https://api.spoonacular.com/recipes/complexSearch?apiKey={SPOONACULAR_API_KEY}&query={urllib.parse.quote(query)}&number={count}&offset={offset}&addRecipeInformation=true{filters}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode())
        return data.get("results", [])
    except Exception as e:
        print(f"Error: {e}")
        return []

async def test():
    print("Testing category unique results...")
    wl1 = await fetch_spoonacular_recipes("popular", count=10, offset=0, maxCalories=400)
    print("Weight Loss Rank 1:", [r['title'] for r in wl1])
    
    wl2 = await fetch_spoonacular_recipes("", count=10, offset=0, maxCalories=400)
    print("Weight Loss Rank 2:", [r['title'] for r in wl2])

    overlap = set([r['id'] for r in wl1]) & set([r['id'] for r in wl2])
    print(f"Overlap between Weight Loss rows: {len(overlap)}")
    
    print("\nTesting Pagination...")
    p1 = await fetch_spoonacular_recipes("indian", count=5, offset=0)
    p2 = await fetch_spoonacular_recipes("indian", count=5, offset=5)
    
    overlap_pg = set([r['id'] for r in p1]) & set([r['id'] for r in p2])
    print(f"Overlap between pages: {len(overlap_pg)}")

asyncio.run(test())
