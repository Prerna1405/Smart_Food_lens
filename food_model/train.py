import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
import os
import json

# ---------------- CONFIG ----------------
DATASET_DIR = "dataset"
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 12
# ----------------------------------------

print("Checking dataset directory...")
if not os.path.exists(DATASET_DIR):
    raise ValueError("Dataset folder not found!")

num_classes = len(os.listdir(DATASET_DIR))
print(f"Found {num_classes} classes")

# Data generators
train_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    zoom_range=0.15,
    horizontal_flip=True,
)

train_generator = train_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    subset="training"
)

val_generator = train_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    subset="validation"
)

# Base model
base_model = MobileNetV2(
    weights="imagenet",
    include_top=False,
    input_shape=(224, 224, 3)
)

base_model.trainable = False

# Custom head
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation="relu")(x)
outputs = Dense(num_classes, activation="softmax")(x)

model = Model(inputs=base_model.input, outputs=outputs)

model.compile(
    optimizer=Adam(learning_rate=0.0001),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

print(model.summary())

# ---------------- TRAIN ----------------
print("Starting training...")

history = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS
)

# ---------------- SAVE ----------------
base = os.path.dirname(os.path.abspath(__file__))
dst_model = os.path.normpath(os.path.join(base, "..", "backend", "model", "food_classifier.h5"))
os.makedirs(os.path.dirname(dst_model), exist_ok=True)
model.save(dst_model)
class_indices = train_generator.class_indices
names_by_index = [None] * len(class_indices)
for name, idx in class_indices.items():
    names_by_index[idx] = name
dst_names = os.path.normpath(os.path.join(base, "..", "backend", "model", "class_names.json"))
with open(dst_names, "w") as f:
    json.dump(names_by_index, f, indent=2)
print(f"Saved {dst_model}")
