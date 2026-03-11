import os
from datasets import load_dataset

dataset = load_dataset("bharat-raghunathan/indian-foods-dataset")

OUTPUT_DIR = "dataset"
os.makedirs(OUTPUT_DIR, exist_ok=True)

label_names = dataset["train"].features["label"].names
print("Classes:", label_names)

def save_split(split_name):
    for idx, item in enumerate(dataset[split_name]):
        label = label_names[item["label"]]
        image = item["image"]

        if image.mode != "RGB":
            image = image.convert("RGB")

        class_dir = os.path.join(OUTPUT_DIR, label)
        os.makedirs(class_dir, exist_ok=True)

        image.save(
            os.path.join(class_dir, f"{split_name}_{idx}.jpg"),
            "JPEG"
        )

save_split("train")
save_split("test")

print("Dataset exported successfully.")
# This script downloads the Indian Foods Dataset using the Hugging Face Datasets library,