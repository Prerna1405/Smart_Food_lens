# TODO: Food Scanner App Improvements

## Phase 1: Backend Fixes (COMPLETED)

### 1.1 Fix API Response Format in predict.py ✅
- [x] Update `predict_image()` to return `food_name` instead of `food` for consistency
- [x] Return actual model confidence score instead of hardcoded values

### 1.2 Update backend/app.py endpoints ✅
- [x] Update `/analyze` endpoint to use correct field names from predict.py
- [x] Update `/predict` endpoint to use correct field names
- [x] Fix nutrition fallback logic to handle missing data properly

### 1.3 Improve nutrition_data.json
- [ ] Add more food items to the nutrition database
- [ ] Ensure all model classes have corresponding nutrition entries

## Phase 2: Frontend Fixes - Scan Screen

### 2.1 Fix Portion Calculation
- [ ] Review and fix `gramsFromPortion` function in FoodScanner.tsx
- [ ] Review and fix `toGrams` function for unit conversions
- [ ] Ensure portion changes trigger proper recalculation

### 2.2 Fix Ingredient Addition Logic
- [ ] Fix the `addToDailyLog` function to properly include extra ingredients
- [ ] Ensure ingredients are added to the main dish totals
- [ ] Fix the `recalcDishTotals` function to handle all cases

### 2.3 Improve Nutrient Calculation
- [ ] Fix macro calculation when adding extra ingredients
- [ ] Ensure all nutrients (calories, protein, carbs, fat) are properly summed

## Phase 3: Frontend Fixes - Calendar Screen

### 3.1 Fix Calendar Data Display
- [ ] Verify `/api/scans/range` endpoint returns correct data format
- [ ] Fix calendar marked dates logic
- [ ] Ensure daily summary shows correct totals

### 3.2 Fix Graph Display
- [ ] Verify weekly trend graph shows correct data
- [ ] Fix macro breakdown bar chart

## Phase 4: Testing & Validation

### 4.1 Backend Tests
- [ ] Test `/analyze` endpoint with sample images
- [ ] Test `/nutrition` endpoint with various foods
- [ ] Test scan saving and retrieval

### 4.2 Frontend Tests
- [ ] Test scan flow from image capture to saving
- [ ] Test portion selection and recalculation
- [ ] Test ingredient addition
- [ ] Test calendar data display

