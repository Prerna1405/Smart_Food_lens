import requests
import os

# Find a test image
test_images = []
for root, dirs, files in os.walk("c:/Users/ahire/ns - Copy/foodmodel/train"):
    for f in files:
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            test_images.append(os.path.join(root, f))
            if len(test_images) >= 1:
                break
    if len(test_images) >= 1:
        break

if test_images:
    image_path = test_images[0]
    print(f"Testing with image: {image_path}")
    
    with open(image_path, 'rb') as f:
        files = {'image': ('test.jpg', f, 'image/jpeg')}
        try:
            response = requests.post('http://127.0.0.1:8000/analyze', files=files)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error: {e}")
else:
    print("No test images found")
