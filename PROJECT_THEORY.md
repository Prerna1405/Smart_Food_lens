# Project Theory: Smart Food Scanner - Indian Food Nutrition &amp; Diet Tracker

## 1. Project Overview

**Smart Food Scanner** is a full-stack mobile application designed for **Indian users** to scan food images (primarily Indian dishes), identify them using computer vision, retrieve detailed nutritional information, and track daily dietary intake via a calendar interface. The system addresses the challenge of nutrition awareness in diverse Indian cuisine by combining **machine learning for food classification**, **nutrition databases**, and **personalized diet logging**.

### Key Features:
- **Image-based Food Recognition**: Uses pre-trained CNN model to classify ~90 Indian food items (sweets, curries, breads, etc.)
- **Nutrition Analysis**: Per-100g nutritional breakdown (calories, protein, carbs, fat) from Indian food database
- **Portion Estimation**: Pre-defined serving sizes (bowl, plate, roti count) with custom gram input
- **Diet Tracking**: Daily/weekly scan history with macro totals
- **Cross-platform Mobile App**: Expo/React Native frontend with tabs (Scan + Calendar)

### Tech Stack:
```
Frontend: Expo Router + React Native + TypeScript + expo-image-picker
Backend: FastAPI + TensorFlow/Keras + PyTorch (prediction)
ML Model: MobileNetV2 (transfer learning) → food_classifier.h5
Data: Indian Nutrition Database (Anuvaad_INDB_2024.11.xlsx → JSON)
Dataset: 90+ Indian food classes with train/val images
```

## 2. Architecture &amp; Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Mobile App    │───▶│   FastAPI Backend │───▶│  ML Model + DB   │
│  (Scan/Calendar)│    │  (/analyze, /scans)│    │  (.h5 + nutrition │
└─────────────────┘    └──────────────────┘    │      .json)      │
                                                └──────────────────┘
```

### Request Flow (Food Scan):
1. **User captures/uploads photo** → expo-image-picker
2. **POST /analyze** (multipart form with image):
   - Save temp file → `predict_image(image_path)` from foodmodel/predict.py
   - **Model Inference**: ResNet18/PyTorch loads classes.json + model.pth → softmax → top class + confidence
   - **Nutrition Lookup**: Pandas on Anuvaad Excel → exact/partial match on food_name
   - Fallback: nutrition_data.json → portion-adjusted macros
3. **Portion Selection** → recalc via /nutrition (POST {food, quantity_grams})
4. **Manual Ingredients** → aggregate nutrition
5. **Save Scan**: POST /api/scans → append to scans.json (date-grouped)
6. **Retrieval**: GET /api/scans/{range} → totals aggregation

### Persistence:
- **scans.json**: Array of {date, scans: [{foodItems: [{food, nutrients}], confidence}]}
- **nutrition_data.json**: {food_lower: {calories_per_100g, protein_g, carbs_g, fat_g}}

## 3. Machine Learning Model Theory

### Dataset:
- **Classes**: 90+ Indian foods (e.g., "Aloo Gobi", "Biryani", "Gulab Jamun", "Dosa", "Paneer Butter Masala")
- **Structure**: foodmodel/train/{class}/images + val/
- **Source**: Custom scraped/collected images of authentic Indian preparations

### Training Pipeline (food_model/train.py):
```
1. ImageDataGenerator: Augmentation (rotate, shift, zoom, flip)
2. Base: MobileNetV2 (ImageNet pretrained, frozen)
3. Head: GlobalAvgPool2D → Dense(128, ReLU) → Dense(num_classes, softmax)
4. Optimizer: Adam(1e-4), Loss: Categorical Crossentropy
5. 12 Epochs, Batch=32, Val Split=20%
6. Export: .h5 to backend/model/, class_indices → class_names.json
```

**Prediction (foodmodel/predict.py)**:
```python
transform = Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
model(image) → softmax → argmax + confidence
nutrition_df[nutrition_df.food_name.str.lower() == predicted.lower()]  # Pandas fuzzy match
```

**Accuracy Considerations**:
- Transfer learning leverages ImageNet features for food textures/colors
- Indian cuisine challenges: Similar appearances (e.g., gravies), lighting variations
- Confidence threshold: Frontend uses 0.7 for high/medium/low badges

## 4. Nutrition Database Theory

### Source: Anuvaad_INDB_2024.11.xlsx (Indian National Database?)
- **Conversion**: convert_nutrition_excel.py → normalize names → JSON
- **Fields**: energy_kcal → calories_per_100g, protein_g, fat_g, carb_g
- **Matching**: Exact + partial (e.g., "biryani" matches "chicken_biryani")
- **Fallbacks**: Default macros if not found

**Sample**:
```json
{
  "paneer": {"calories_per_100g": 265, "protein": 18, "carbs": 1.2, "fat": 20},
  "dal_makhani": {"calories_per_100g": 180, "protein": 6, "carbs": 20, "fat": 8}
}
```

**Portion Scaling**: Frontend maps "full_bowl" → 300g → multiply nutrition × (300/100)

## 5. Backend API Design (FastAPI)

### Endpoints:
| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/analyze` | POST image | Full prediction + nutrition | {food_name, confidence, calories, protein, carbs, fat} |
| `/nutrition` | POST {food, quantity} | Scaled nutrition lookup | {calories, protein, carbs, fat} |
| `/api/scans` | POST | Save daily scan | {success: true} |
| `/api/scans/by-date?date=YYYY-MM-DD` | GET | Daily totals | {scans[], totals{calories,...}} |
| `/api/scans/range?end=YYYY-MM-DD&amp;days=30` | GET | Weekly/monthly aggregation | {data: {date: totals}} |
| `/health` | GET | Model status | {status: "ok", model_loaded: true} |

**CORS**: `*` for Expo dev (localhost/10.0.2.2:8000)

## 6. Frontend Workflow (Expo Router)

### Tabs:
- **Scan (/app/(tabs)/scan.tsx)**: FoodScanner.tsx → Camera/Gallery → Analyze → Portion → Ingredients → Log
- **Calendar (/app/(tabs)/calendar.tsx)**: Visualize scans/range API

### UX Flow:
```
Scan Photo → AI Classify → Confidence Badge
↓
Portion Pills (Bowl/Plate/Roti) → Auto-scale grams
↓
Nutrition Cards (Kcal + Macro Bars)
↓
+Ingredients → Recalc Totals → Save to Backend
```

**Smart Features**:
- Portion heuristics: "Dosa" → full_plate=400g
- Confidence visualization: Green(>70%), Orange, Red(<50%)
- Haptics + Animations via expo-reanimated

## 7. Deployment &amp; Run Instructions (from TODO.md)

```
# Backend
pip install -r backend/requirements.txt
python backend/convert_nutrition_excel.py  # Generate JSON
run_backend.bat  # uvicorn backend.app:app --port 8000

# Frontend
cd foodScanner &amp;&amp; npm install
run_frontend.bat  # npx expo start
```

**Actively Running**: Backend:8000, Expo:8084 (Metro bundler)

## 8. Challenges &amp; Improvements Implemented

- **Model Loading**: Dynamic import fallback (None if fails)
- **Nutrition Fallbacks**: Excel → JSON + partial matching
- **Portion Awareness**: Frontend heuristics + backend scaling
- **Data Validation**: Float conversion with "Not Found" → 0
- **Mobile Optimization**: Temp uploads auto-clean, quality=0.8 images

## 9. Future Enhancements (Inferred from Code)
- Multi-object detection (YOLO integration)
- User-specific calorie goals
- Recipe generation from scans
- Voice input for portions
- Export PDF diet reports

This comprehensive system represents **end-to-end ML for personalized Indian nutrition tracking**, bridging computer vision, databases, and user-friendly mobile UX.

