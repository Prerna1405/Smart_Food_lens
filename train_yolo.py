from ultralytics import YOLO
import os
import shutil

def train_yolo_classification(data_dir, epochs=25, imgsz=224, batch=16):
    # Initialize a YOLOv8 classification model
    model = YOLO("yolov8n-cls.pt")

    # Train the model
    # data_dir should contain 'train' and 'val' folders
    results = model.train(
        data=data_dir,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        plots=True
    )

    print(f"Training complete. Best model saved to: {results.save_dir}")

    # Move the best model to foodmodel/best.pt for backend use
    best_pt_src = os.path.join(results.save_dir, 'weights', 'best.pt')
    target_path = os.path.join("foodmodel", "best.pt")
    
    if os.path.exists(best_pt_src):
        os.makedirs("foodmodel", exist_ok=True)
        shutil.copy2(best_pt_src, target_path)
        print(f"✅ Best model copied to: {target_path}")
    else:
        print(f"❌ Could not find best.pt at {best_pt_src}")

if __name__ == "__main__":
    # Ensure this points to the directory containing 'train' and 'val'
    dataset_directory = 'yolo_dataset' 
    if os.path.exists(dataset_directory):
        train_yolo_classification(dataset_directory)
    else:
        print(f"❌ Dataset directory {dataset_directory} not found. Please run reorganize_dataset.py first.")
