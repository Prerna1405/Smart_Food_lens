import requests
import os

# Find a test image for biryani
test_image = None
for root, dirs, files in os.walk("c:/Users/ahire/ns - Copy/foodmodel/train"):
    for f in files:
        if 'biryani' in f.lower() and f.lower().endswith(('.jpg', '.jpeg', '.png')):
            test_image = os.path.join(root, f)
            break
    if test_image:
        break

if test_image:
    print(f"Testing with image: {test_image}")
    
    with open(test_image, 'rb') as f:
        files = {'image': ('test.jpg', f, 'image/jpeg')}
        try:
            response = requests.post('http://127.0.0.1:8000/analyze', files=files)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error: {e}")
else:
    print("No biryani test images found")

