import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  ImageBackground,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useUser } from "./context/UserContext";
import { Colors, Shadows, BorderRadius, Spacing } from "../constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeIn, SlideInUp, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

type Stage = "scan" | "result" | "ingredients";
type PortionUnit = "g" | "ml" | "oz" | "cup" | "bowl" | "plate" | "piece" | "handful";

const PORTION_UNITS: { label: string; value: PortionUnit; multiplier: number }[] = [
  { label: "Grams (g)", value: "g", multiplier: 1 },
  { label: "Milliliters (ml)", value: "ml", multiplier: 1 },
  { label: "Ounces (oz)", value: "oz", multiplier: 28.35 },
  { label: "Cup", value: "cup", multiplier: 240 },
  { label: "Bowl", value: "bowl", multiplier: 400 },
  { label: "Plate", value: "plate", multiplier: 600 },
  { label: "Piece", value: "piece", multiplier: 100 },
  { label: "Handful", value: "handful", multiplier: 50 },
];

type Prediction = {
  food_name: string;
  confidence: number;
};

type Ingredient = {
  name: string;
  quantity: string;
  unit: string;
};

export default function FoodScanner() {
  const [stage, setStage] = useState<Stage>("scan");
  const [image, setImage] = useState<any>(null);
  const [dish, setDish] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [topPredictions, setTopPredictions] = useState<Prediction[]>([]);
  const [portionUnit, setPortionUnit] = useState<PortionUnit>("g");
  const [portionQty, setPortionQty] = useState<string>("100");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totals, setTotals] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [referenceObject, setReferenceObject] = useState<string>("None");
  
  const { addScan } = useUser();
  const router = useRouter();

  const API_URL = Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

  async function createImageFormData(img: any) {
    const formData = new FormData();
    if (Platform.OS === "web") {
      const resp = await fetch(img.uri);
      const blob = await resp.blob();
      formData.append("image", blob, "photo.jpg");
    } else {
      formData.append("image", {
        uri: img.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);
    }
    return formData;
  }

  const analyze = async (img: any) => {
    setIsProcessing(true);
    try {
      const formData = await createImageFormData(img);
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.error) {
          Alert.alert("Error", data.error);
          return;
      }

      setDish(data.food);
      setConfidence(data.confidence);
      setTopPredictions(data.top_predictions || []);
      setIngredients(data.ingredients || []);
      setStatusMsg(data.status || "");
      
      // Update portion state from server's estimation
      setPortionQty(data.portion_g.toString());
      setPortionUnit("g");
      
      // Use exact nutrition totals from server
      setTotals({
          calories: data.kcal,
          protein: data.protein_g,
          carbs: data.carbs_g,
          fat: data.fat_g
      });
      
      setStage("result");
    } catch {
      Alert.alert("Error", "Analysis failed. Please check your connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const recalcTotals = async (food: string | null, ings: Ingredient[], pUnit: PortionUnit, pQty: string) => {
    if (!pQty || isNaN(parseFloat(pQty))) return;
    
    try {
        const unitData = PORTION_UNITS.find(u => u.value === pUnit);
        const multiplier = (unitData?.multiplier || 1) * (parseFloat(pQty) || 100) / 100;

        const res = await fetch(`${API_URL}/recalculate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                food_name: food,
                ingredients: ings,
                portion_unit: pUnit,
                portion_qty: pQty,
                multiplier: multiplier
            })
        });
        const data = await res.json();
        
        if (data.error) {
            console.error("Recalc API error:", data.error);
            return;
        }

        setTotals({
            calories: data.calories || data.kcal || 0,
            protein: data.protein || data.protein_g || 0,
            carbs: data.carbs || data.carbs_g || 0,
            fat: data.fat || data.fat_g || 0
        });
    } catch (e) {
        console.error("Recalc network error", e);
    }
  };

  const handleAddToLog = async () => {
    if (!totals) return;
    
    const scanData = {
      date: new Date().toISOString().slice(0, 10),
      food_name: dish || "Meal",
      nutrients: totals
    };

    const success = await addScan(scanData);
    if (success) {
      router.replace("/");
    } else {
      Alert.alert("Error", "Failed to add to log");
    }
  };

  const selectFood = async (foodName: string) => {
      setDish(foodName);
      // Also fetch ingredients for the new selection
      try {
          const res = await fetch(`${API_URL}/ingredients?food_name=${foodName}`);
          const data = await res.json();
          if (data.ingredients) {
              setIngredients(data.ingredients);
              recalcTotals(foodName, data.ingredients, portionUnit, portionQty);
          } else {
              recalcTotals(foodName, ingredients, portionUnit, portionQty);
          }
      } catch {
          recalcTotals(foodName, ingredients, portionUnit, portionQty);
      }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1000&auto=format&fit=crop' }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {stage === "scan" && !isProcessing && (
          <Animated.View entering={FadeInUp} style={styles.center}>
            <View style={styles.scanIconContainer}>
              <MaterialCommunityIcons name="camera-iris" size={80} color="#fff" />
            </View>
            <Text style={styles.scanTitle}>Scan Your Meal</Text>
            <Text style={styles.scanSub}>Dynamic food detection with ingredient auto-generation</Text>
            
            <TouchableOpacity style={styles.actionBtn} onPress={async () => {
                const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
                if (!result.canceled) { setImage(result.assets[0]); await analyze(result.assets[0]); }
            }}>
              <MaterialCommunityIcons name="camera" size={24} color="#fff" />
              <Text style={styles.actionBtnText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryActionBtn} onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync();
                if (!result.canceled) { setImage(result.assets[0]); await analyze(result.assets[0]); }
            }}>
              <MaterialCommunityIcons name="image-multiple" size={24} color={Colors.light.primary} />
              <Text style={styles.secondaryActionBtnText}>Upload from Gallery</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Analyzing food & ingredients...</Text>
          </View>
        )}

        {stage === "result" && image && (
          <Animated.View entering={SlideInUp.springify()}>
            <View style={styles.resultCard}>
              <Image source={{ uri: image.uri }} style={styles.resultImage} />
              
              <View style={styles.dishInfo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishNameText}>{dish}</Text>
                  {statusMsg !== "Success" && (
                      <Text style={styles.statusMsg}>{statusMsg}</Text>
                  )}
                  <View style={styles.confidenceRow}>
                    <MaterialCommunityIcons name="check-decagram" size={16} color={confidence > 0.6 ? Colors.light.success : Colors.light.warning} />
                    <Text style={styles.confidenceText}>{Math.round(confidence * 100)}% match</Text>
                  </View>
                  <View style={styles.confidenceBarBg}>
                    <View style={[styles.confidenceBarFill, { width: `${confidence * 100}%`, backgroundColor: confidence > 0.8 ? Colors.light.success : confidence > 0.5 ? Colors.light.warning : Colors.light.error }]} />
                  </View>
                </View>
                <View style={styles.caloriesBadge}>
                  <Text style={styles.caloriesValueText}>{Math.round(totals?.calories || 0)}</Text>
                  <Text style={styles.caloriesLabelText}>kcal</Text>
                </View>
              </View>

              {/* 3. CONFIDENCE THRESHOLD: Top 3 Predictions */}
              {confidence < 0.6 && topPredictions.length > 1 && (
                  <View style={styles.topPredictionsBox}>
                      <Text style={styles.sectionLabel}>Did you mean?</Text>
                      <View style={styles.predictionsRow}>
                          {topPredictions.map((p, i) => (
                              <TouchableOpacity 
                                key={i} 
                                style={[styles.predictionChip, dish === p.food_name && styles.activePrediction]}
                                onPress={() => selectFood(p.food_name)}
                              >
                                  <Text style={[styles.predictionText, dish === p.food_name && styles.activePredictionText]}>{p.food_name}</Text>
                              </TouchableOpacity>
                          ))}
                      </View>
                  </View>
              )}

              {/* 7. PORTION SIZE SYSTEM */}
              <View style={styles.portionSection}>
                 <Text style={styles.sectionLabel}>Portion Size:</Text>
                 <View style={styles.portionRow}>
                    <TextInput 
                        style={styles.qtyInput}
                        value={portionQty}
                        keyboardType="numeric"
                        onChangeText={(v) => {
                            setPortionQty(v);
                            recalcTotals(dish, ingredients, portionUnit, v);
                        }}
                    />
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={portionUnit}
                            onValueChange={(v) => {
                                setPortionUnit(v as PortionUnit);
                                recalcTotals(dish, ingredients, v as PortionUnit, portionQty);
                            }}
                            style={styles.unitPickerSmall}
                        >
                            {PORTION_UNITS.map(u => <Picker.Item key={u.value} label={u.label} value={u.value} />)}
                        </Picker>
                    </View>
                 </View>
              </View>

              <View style={styles.macrosContainer}>
                <MacroCircle label="Protein" value={totals?.protein || 0} color={Colors.light.protein} unit="g" />
                <MacroCircle label="Carbs" value={totals?.carbs || 0} color={Colors.light.carbs} unit="g" />
                <MacroCircle label="Fat" value={totals?.fat || 0} color={Colors.light.fat} unit="g" />
              </View>

              {ingredients.length > 0 && (
                  <View style={styles.miniIngredients}>
                      <Text style={styles.sectionLabel}>Auto-detected Ingredients:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                          {ingredients.map((ing, i) => (
                              <View key={i} style={styles.ingredientChip}>
                                  <Text style={styles.chipText}>{ing.name}</Text>
                              </View>
                          ))}
                      </ScrollView>
                  </View>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.addBtn} onPress={handleAddToLog}>
                  <MaterialCommunityIcons name="plus-circle" size={22} color="#fff" />
                  <Text style={styles.addBtnText}>Add To Daily Calories</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.editBtn} onPress={() => setStage("ingredients")}>
                  <MaterialCommunityIcons name="pencil" size={20} color={Colors.light.text} />
                  <Text style={styles.editBtnText}>Edit Ingredients</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {stage === "ingredients" && (
          <Animated.View entering={FadeIn}>
            <View style={styles.ingredientsCard}>
              <View style={styles.cardHeader}>
                  <TouchableOpacity onPress={() => setStage("result")}>
                      <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.light.text} />
                  </TouchableOpacity>
                  <Text style={styles.cardTitle}>Edit Ingredients</Text>
              </View>

              {ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <View style={styles.ingMain}>
                    <TextInput
                      style={styles.ingNameInput}
                      value={ing.name}
                      onChangeText={(v) => {
                        const newIngs = [...ingredients];
                        newIngs[idx].name = v;
                        setIngredients(newIngs);
                      }}
                    />
                    <View style={styles.ingQtyRow}>
                      <TextInput
                        style={styles.ingQtyInput}
                        value={ing.quantity}
                        keyboardType="numeric"
                        onChangeText={(v) => {
                          const newIngs = [...ingredients];
                          newIngs[idx].quantity = v;
                          setIngredients(newIngs);
                          recalcTotals(dish, newIngs, portionUnit, portionQty);
                        }}
                      />
                      <Text style={styles.unitText}>{ing.unit}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => {
                      const newIngs = ingredients.filter((_, i) => i !== idx);
                      setIngredients(newIngs);
                      recalcTotals(dish, newIngs, portionUnit, portionQty);
                  }}>
                    <MaterialCommunityIcons name="delete-outline" size={24} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity 
                style={styles.addIngBtn}
                onPress={() => setIngredients([...ingredients, { name: 'New Item', quantity: '50', unit: 'g' }])}
              >
                <MaterialCommunityIcons name="plus" size={20} color={Colors.light.primary} />
                <Text style={styles.addIngBtnText}>Add Ingredient</Text>
              </TouchableOpacity>

              <View style={styles.summaryBar}>
                <View>
                  <Text style={styles.summaryLabel}>Total Calories</Text>
                  <Text style={styles.summaryValue}>{Math.round(totals?.calories || 0)} kcal</Text>
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddToLog}>
                  <Text style={styles.saveBtnText}>Save Meal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const MacroCircle = ({ label, value, color, unit }: any) => (
  <View style={styles.macroCircleContainer}>
    <View style={[styles.macroIconCircle, { backgroundColor: color + '20' }]}>
       <Text style={[styles.macroCircleValue, { color }]}>{Math.round(value)}</Text>
    </View>
    <Text style={styles.macroCircleLabel}>{label} ({unit})</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scrollContainer: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 100 },
  center: { alignItems: 'center', marginTop: 100 },
  scanIconContainer: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  scanTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: Spacing.sm },
  scanSub: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full, ...Shadows.md, marginBottom: Spacing.md, width: '100%', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: Spacing.sm },
  secondaryActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full, width: '100%', justifyContent: 'center' },
  secondaryActionBtnText: { color: Colors.light.primary, fontSize: 18, fontWeight: 'bold', marginLeft: Spacing.sm },
  processingContainer: { alignItems: 'center', marginTop: 150 },
  processingText: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: Spacing.lg },
  resultCard: { backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.lg },
  resultImage: { width: '100%', height: 250 },
  dishInfo: { padding: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dishNameText: { fontSize: 24, fontWeight: 'bold', color: Colors.light.text, textTransform: 'capitalize' },
  statusMsg: { fontSize: 12, color: Colors.light.error, fontWeight: "600", marginTop: 2 },
  confidenceRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  confidenceText: { fontSize: 13, color: Colors.light.textSecondary, marginLeft: 4, fontWeight: "600" },
  confidenceBarBg: { height: 4, backgroundColor: "#F1F5F9", borderRadius: 2, marginTop: 6, width: "100%" },
  confidenceBarFill: { height: "100%", borderRadius: 2 },
  caloriesBadge: { alignItems: "center", backgroundColor: Colors.light.warningLight, padding: Spacing.sm, borderRadius: BorderRadius.lg, minWidth: 60 },
  caloriesValueText: { fontSize: 20, fontWeight: "bold", color: Colors.light.warning },
  caloriesLabelText: { fontSize: 12, color: Colors.light.warning, fontWeight: "700" },
  guideContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  guideScroll: { marginTop: 4 },
  guideChip: { backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md, marginRight: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  activeGuideChip: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  guideText: { fontSize: 12, color: Colors.light.text, fontWeight: "600" },
  activeGuideText: { color: "#fff" },
  guideHint: { fontSize: 11, color: Colors.light.textSecondary, marginTop: 4, fontStyle: "italic" },
  topPredictionsBox: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  predictionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  predictionChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#E2E8F0' },
  activePrediction: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  predictionText: { fontSize: 12, color: Colors.light.text, fontWeight: '600' },
  activePredictionText: { color: '#fff' },
  portionSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.light.textSecondary, marginBottom: 8 },
  portionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyInput: { width: 70, backgroundColor: '#F1F5F9', padding: 10, borderRadius: BorderRadius.md, fontSize: 16, fontWeight: 'bold', color: Colors.light.text },
  pickerContainer: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: BorderRadius.md, height: 45, justifyContent: 'center' },
  unitPickerSmall: { width: '100%' },
  macrosContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  macroCircleContainer: { alignItems: 'center' },
  macroIconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  macroCircleValue: { fontSize: 18, fontWeight: 'bold' },
  macroCircleLabel: { fontSize: 12, color: Colors.light.textSecondary, fontWeight: '600' },
  miniIngredients: { padding: Spacing.lg },
  chipsScroll: { marginTop: 4 },
  ingredientChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, marginRight: 8 },
  chipText: { fontSize: 13, color: Colors.light.text, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.md },
  addBtn: { flex: 1.5, flexDirection: 'row', backgroundColor: Colors.light.primary, padding: Spacing.md, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginLeft: 6 },
  editBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#F1F5F9', padding: Spacing.md, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  editBtnText: { color: Colors.light.text, fontWeight: 'bold', fontSize: 14, marginLeft: 4 },
  ingredientsCard: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, gap: 12 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.light.text },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, backgroundColor: '#F8FAFC', padding: Spacing.md, borderRadius: BorderRadius.md },
  ingMain: { flex: 1 },
  ingNameInput: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  ingQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ingQtyInput: { width: 60, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', padding: 6, borderRadius: 4, fontSize: 14, fontWeight: '600' },
  unitText: { color: Colors.light.textSecondary, fontWeight: '600' },
  addIngBtn: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.light.primary, borderRadius: BorderRadius.md, marginTop: Spacing.sm },
  addIngBtnText: { color: Colors.light.primary, fontWeight: '700', marginLeft: 4 },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: Spacing.lg, marginTop: Spacing.xl },
  summaryLabel: { fontSize: 13, color: Colors.light.textSecondary, fontWeight: '700' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: Colors.light.text },
  saveBtn: { backgroundColor: Colors.light.success, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
