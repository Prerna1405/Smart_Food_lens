import requests
import json

# Test the nutrition endpoint
url = "http://127.0.0.1:8000/nutrition"
data = {"food": "dhokla", "quantity": 300}
headers = {"Content-Type": "application/json"}

response = requests.post(url, data=json.dumps(data), headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Also test the analyze endpoint
print("\n--- Testing analyze endpoint ---")

