import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "foodmodel")))
from predict import predict_image

# Find an image to test with
test_img = None
train_dir = "foodmodel/train"
for root, dirs, files in os.walk(train_dir):
    for file in files:
        if file.endswith(".jpg"):
            test_img = os.path.join(root, file)
            break
    if test_img:
        break

if test_img:
    print(f"Testing with image: {test_img}")
    result = predict_image(test_img)
    print("Result:")
    import json
    print(json.dumps(result, indent=2))
else:
    print("No test image found.")
