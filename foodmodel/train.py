import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
import json
import os

# Device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Image transforms
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Load dataset
train_dir = "foodmodel/train"
val_dir = "foodmodel/val"

print(f"Checking directories: {train_dir}, {val_dir}")
if not os.path.exists(train_dir):
    print(f"Error: {train_dir} not found")
    exit(1)

print(f"Contents of {train_dir}: {os.listdir(train_dir)}")

try:
    train_data = datasets.ImageFolder(train_dir, transform=transform)
    val_data = datasets.ImageFolder(val_dir, transform=transform)
except Exception as e:
    print(f"Error loading ImageFolder: {e}")
    # Let's see if there are any files in the subdirectories
    for d in os.listdir(train_dir):
        subdir = os.path.join(train_dir, d)
        if os.path.isdir(subdir):
            files = os.listdir(subdir)
            print(f"Directory {d} has {len(files)} files. First 5: {files[:5]}")
    exit(1)

train_loader = DataLoader(train_data, batch_size=32, shuffle=True)
val_loader = DataLoader(val_data, batch_size=32)

# Save class names
classes = train_data.classes
with open("foodmodel/classes.json", "w") as f:
    json.dump(classes, f)
print(f"Classes saved: {classes}")

num_classes = len(classes)

# Load pretrained model
model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)

# Freeze layers
for param in model.parameters():
    param.requires_grad = False

# Replace final layer
model.fc = nn.Linear(model.fc.in_features, num_classes)

model = model.to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.fc.parameters(), lr=0.001)

# Training loop
epochs = 5

for epoch in range(epochs):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, predicted = torch.max(outputs.data, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()

    epoch_loss = running_loss / len(train_data)
    epoch_acc = 100 * correct / total
    print(f"Epoch {epoch+1}/{epochs}, Loss: {epoch_loss:.4f}, Acc: {epoch_acc:.2f}%")

# Save model
torch.save(model.state_dict(), "foodmodel/model.pth")
print("Training Complete. Model saved to foodmodel/model.pth")
