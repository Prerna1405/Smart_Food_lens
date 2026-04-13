import os
import shutil
import random
from tqdm import tqdm

def reorganize_dataset(source_dirs, target_dir, split_ratio=0.8):
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    train_dir = os.path.join(target_dir, 'train')
    val_dir = os.path.join(target_dir, 'val')

    os.makedirs(train_dir, exist_ok=True)
    os.makedirs(val_dir, exist_ok=True)

    # Find all classes across all source directories
    classes = set()
    for src in source_dirs:
        if os.path.exists(src):
            classes.update([d for d in os.listdir(src) if os.path.isdir(os.path.join(src, d))])

    print(f"Found {len(classes)} classes.")

    for cls in tqdm(classes, desc="Processing classes"):
        all_images = []
        for src in source_dirs:
            cls_src = os.path.join(src, cls)
            if os.path.exists(cls_src):
                all_images.extend([os.path.join(cls_src, img) for img in os.listdir(cls_src) if img.lower().endswith(('.jpg', '.jpeg', '.png'))])

        if not all_images:
            continue

        random.shuffle(all_images)
        split_idx = int(len(all_images) * split_ratio)
        train_images = all_images[:split_idx]
        val_images = all_images[split_idx:]

        # Create class folders in target
        os.makedirs(os.path.join(train_dir, cls), exist_ok=True)
        os.makedirs(os.path.join(val_dir, cls), exist_ok=True)

        for img_path in train_images:
            shutil.copy2(img_path, os.path.join(train_dir, cls, os.path.basename(img_path)))
        for img_path in val_images:
            shutil.copy2(img_path, os.path.join(val_dir, cls, os.path.basename(img_path)))

    print(f"Dataset reorganized into {target_dir}")

if __name__ == "__main__":
    source_directories = [
        'foodmodel/train',
        'foodmodel/val'
    ]
    target_directory = 'yolo_dataset'
    reorganize_dataset(source_directories, target_directory)
