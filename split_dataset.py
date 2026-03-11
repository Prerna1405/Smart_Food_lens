import os
import shutil
import random

source = "food_model/dataset"
train_dir = "foodmodel/train"
val_dir = "foodmodel/val"

split_ratio = 0.8

# Ensure source exists
if not os.path.exists(source):
    print(f"Source directory {source} does not exist.")
    exit(1)

for category in os.listdir(source):
    category_path = os.path.join(source, category)
    if not os.path.isdir(category_path):
        continue
        
    os.makedirs(os.path.join(train_dir, category), exist_ok=True)
    os.makedirs(os.path.join(val_dir, category), exist_ok=True)

    images = [f for f in os.listdir(category_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    random.shuffle(images)

    split = int(len(images) * split_ratio)

    for img in images[:split]:
        shutil.copy(
            os.path.join(category_path, img),
            os.path.join(train_dir, category, img)
        )

    for img in images[split:]:
        shutil.copy(
            os.path.join(category_path, img),
            os.path.join(val_dir, category, img)
        )
print(f"Dataset split into {train_dir} and {val_dir}")
