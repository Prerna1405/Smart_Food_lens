import asyncio
import httpx
import time

API_URL = "http://localhost:8000"

async def test_category(goal, page):
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{API_URL}/chef-discovery", json={
                "profile": {"goal": goal, "age": 30, "weight": 70, "disease": "none"},
                "page": page
            })
            data = resp.json()
            
            all_recipes = []
            if "recommended" in data:
                all_recipes.extend(data.get("recommended", []))
                all_recipes.extend(data.get("goals", []))
                all_recipes.extend(data.get("indian", []))
                all_recipes.extend(data.get("quick", []))
            elif "recipes" in data:
                all_recipes.extend(data["recipes"])
            # Or if it's returning a direct list
            elif isinstance(data, list):
                all_recipes.extend(data)
                
            if not all_recipes:
                print(f"[{goal.upper()} | Page {page}] FAILED: No recipes returned.")
                return

            ids = [r.get("id") for r in all_recipes]
            unique_ids = set(ids)
            dup_count = len(ids) - len(unique_ids)
            
            print(f"[{goal.upper()} | Page {page}]")
            print(f"  URL: POST /chef-discovery")
            print(f"  Total Recipes Returned: {len(all_recipes)}")
            print(f"  Unique IDs: {len(unique_ids)}")
            print(f"  Duplicate IDs: {dup_count}")
            print(f"  Sample Titles: {[r.get('title') for r in all_recipes[:3]]}")
            print(f"  Time: {round(time.time()-start, 2)}s\n")
    except Exception as e:
        print(f"Error testing {goal}: {e}")

async def main():
    print("--- DEEP ANALYSIS: BACKEND OUTPUT LOGS ---\n")
    await test_category("weight-loss", 1)
    await test_category("keto", 1)
    await test_category("high-protein", 1)
    await test_category("weight-loss", 2) # test load more

asyncio.run(main())
