import asyncio
import httpx
async def main():
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.get("http://localhost:8000/chef/category?type=diabetes&page=1")
            print(res.text[:1000])
    except Exception as e:
        print(f"Error: {e}")
asyncio.run(main())
