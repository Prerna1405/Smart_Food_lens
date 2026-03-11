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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useUser } from "./context/UserContext";
import { Colors } from "../constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Stage = "scan" | "portion" | "ingredients";
type PortionOption = "half_bowl" | "full_bowl" | "full_plate" | "1_roti" | "2_roti" | "custom";
const PORTION_OPTIONS: PortionOption[] = ["half_bowl", "full_bowl", "full_plate", "1_roti", "2_roti", "custom"];
const PORTION_LABELS: Record<PortionOption, string> = {
  half_bowl: "Half Bowl",
  full_bowl: "Full Bowl",
  full_plate: "Full Plate",
  "1_roti": "1 Roti",
  "2_roti": "2 Roti",
  custom: "Custom",
};

type Ingredient = {
  name: string;
  quantity: string; // EMPTY by default
  unit: "g" | "ml" | "tsp" | "tbsp" | "pieces";
  portionType?: string;
  options?: Record<string, number>;
};

export default function FoodScanner() {
  const [stage, setStage] = useState<Stage>("scan");
  const [image, setImage] = useState<any>(null);
  const [dish, setDish] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [portion, setPortion] = useState<PortionOption>("full_bowl");
  
  const [customGrams, setCustomGrams] = useState<string>("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [totals, setTotals] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const { updateTodayTotals } = useUser();
  const router = useRouter();

  function resolveApiUrl() {
    return Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
  }
  const API_URL = resolveApiUrl();

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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      const img = result.assets[0];
      setImage(img);
      await analyze(img);
    }
  };

  const openCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      const img = result.assets[0];
      setImage(img);
      await analyze(img);
    }
  };

  const analyze = async (img: any) => {
    try {
      const formData = await createImageFormData(img);
      formData.append("portion", portion);
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
      console.log("Analyze:", data);
      let d = data?.food_name || null;
      if (!d) {
        try {
          const res2 = await fetch(`${API_URL}/classify-nutrition?threshold=0.70`, {
            method: "POST",
            body: formData,
          });
          const classified = await res2.json();
          d = String(classified?.food || "").trim() || null;
          if (d) {
            const grams =
              portion === "custom"
                ? Number(customGrams) || 0
                : gramsFromPortion({ name: d, quantity: "", unit: "g", portionType: "dish_baseline" }, portion);
            const resN = await fetch(`${API_URL}/nutrition`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ food: d.toLowerCase(), quantity: grams }),
            });
            const n = await resN.json();
            data = {
              food_name: d,
              confidence: Number(classified?.confidence || 0),
              calories: Number(n?.calories || 0),
              protein: Number(n?.protein || 0),
              carbs: Number(n?.carbs || 0),
              fat: Number(n?.fat || 0),
              ingredients: Array.isArray(data?.ingredients) ? data.ingredients : [],
            };
          }
        } catch {}
      }
      
      // Calculate portion-adjusted values if not already done by backend
      let finalCalories = Number(data?.calories || 0);
      let finalProtein = Number(data?.protein || 0);
      let finalCarbs = Number(data?.carbs || 0);
      let finalFat = Number(data?.fat || 0);
      
      // If backend returned values but they need portion adjustment
      if (d && finalCalories > 0) {
        const portionGrams = portion === "custom" 
          ? Number(customGrams) || 0 
          : gramsFromPortion({ name: d, quantity: "", unit: "g", portionType: "dish_baseline" }, portion);
        
        // Check if the values from backend are for 100g or need scaling
        // The /analyze endpoint returns values based on the model's default, we need to adjust
        if (portionGrams > 0) {
          // Fetch nutrition with correct portion
          try {
            const resN = await fetch(`${API_URL}/nutrition`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ food: d.toLowerCase(), quantity: portionGrams }),
            });
            const n = await resN.json();
            finalCalories = Number(n?.calories || 0);
            finalProtein = Number(n?.protein || 0);
            finalCarbs = Number(n?.carbs || 0);
            finalFat = Number(n?.fat || 0);
          } catch {}
        }
      }
      
      setDish(d);
      const conf = Number(data?.confidence || 0);
      setConfidence(conf);
      setDetectedIngredients(Array.isArray(data?.ingredients) ? data.ingredients : []);
      setTotals({
        calories: finalCalories,
        protein: finalProtein,
        carbs: finalCarbs,
        fat: finalFat,
      });
      setStage("portion");
    } catch {
      Alert.alert("Error", "Analysis failed");
    }
  };

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { name: "", quantity: "", unit: "g" },
    ]);
  };

  const updateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      )
    );
  };

  const gramsFromPortion = useCallback((ing: Ingredient, portionSel: string) => {
    const pt = ing.portionType || "";
    if (!pt) return 0;
    if (pt === "dish_baseline") {
      if (portionSel === "custom") return Number(customGrams) || 0;
      if (portionSel === "half_bowl") return 150;
      if (portionSel === "full_bowl") return 300;
      if (portionSel === "full_plate") return 400;
      if (portionSel === "1_roti") return 50;
      if (portionSel === "2_roti") return 100;
      return 150;
    }
    if (pt === "rice_bowl" || pt === "curry_bowl") {
      if (portionSel === "half_bowl") return 150;
      if (portionSel === "full_bowl") return 300;
      return 150;
    }
    if (pt === "biryani_plate") {
      if (portionSel === "full_plate") return 400;
      return 200;
    }
    if (pt === "chapati_piece" || pt === "snack_piece") {
      const pieces = portionSel === "2_roti" ? 2 : 1;
      return 50 * pieces;
    }
    if (pt.startsWith("spoon_")) {
      if (portionSel === "full_plate") return 14;
      return 4.5;
    }
    return 0;
  }, [customGrams]);

  const toGrams = useCallback((unit: Ingredient["unit"], qtyStr: string, ing: Ingredient, portionSel: string) => {
    const q = Number(qtyStr);
    if (!isNaN(q) && q > 0) {
      if (unit === "g" || unit === "ml") return q;
      if (unit === "tsp") return q * 4.5;
      if (unit === "tbsp") return q * 14;
      if (unit === "pieces") return q * 35;
      return q;
    }
    return gramsFromPortion(ing, portionSel);
  }, [gramsFromPortion]);

  const recalcDishTotals = useCallback(async () => {
    if (!dish) return;
    try {
      const grams =
        portion === "custom"
          ? Number(customGrams) || 0
          : gramsFromPortion({ name: dish, quantity: "", unit: "g", portionType: "dish_baseline" }, portion);
      console.log("recalcDishTotals - dish:", dish, "portion:", portion, "grams:", grams);
      const res = await fetch(`${API_URL}/nutrition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food: dish.toLowerCase(), quantity: grams }),
      });
      const n = await res.json();
      console.log("recalcDishTotals - nutrition response:", n);
      setTotals({
        calories: Number(n?.calories || 0),
        protein: Number(n?.protein || 0),
        carbs: Number(n?.carbs || 0),
        fat: Number(n?.fat || 0),
      });
    } catch (e) {
      console.error("recalcDishTotals error:", e);
    }
  }, [dish, portion, customGrams, API_URL, gramsFromPortion]);

  useEffect(() => {
    const t = setTimeout(() => {
      recalcDishTotals();
    }, 150);
    return () => clearTimeout(t);
  }, [recalcDishTotals]);

  const confidenceBadge = useMemo(() => {
    let color = "#e67e22";
    if (confidence >= 0.7) color = "#2ecc71";
    else if (confidence < 0.5) color = "#e74c3c";
    return { color, text: `${Math.round(confidence * 100)}%` };
  }, [confidence]);

  const addToDailyLog = async () => {
    if (!totals) {
      Alert.alert("Missing totals", "Calculate nutrition first");
      return;
    }
    try {
      const date = new Date().toISOString().slice(0, 10);
      const foodItems: any[] = [];
      let totalGrams = 0;
      for (const ing of ingredients) {
        if (!ing.name.trim()) continue;
        const baseQty = toGrams(ing.unit, ing.quantity, ing, portion);
        const qty = portion === "custom" ? Number(customGrams) || baseQty : baseQty;
        totalGrams += qty;
        let n = null;
        try {
          const res = await fetch(`${API_URL}/nutrition`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ food: ing.name.toLowerCase(), quantity: qty }),
          });
          n = await res.json();
        } catch {}
        foodItems.push({
          food: ing.name.toLowerCase(),
          nutrients: {
            calories: Number(n?.calories) || 0,
            protein: Number(n?.protein) || 0,
            carbs: Number(n?.carbs) || 0,
            fat: Number(n?.fat) || 0,
          },
        });
      }
      await fetch(`${API_URL}/api/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          food: dish || "meal",
          quantity: totalGrams,
          confidence: 0,
          foodItems,
        }),
      });
      const totalsRes = await fetch(`${API_URL}/api/scans/by-date?date=${date}`);
      const totalsJson = await totalsRes.json();
      if (totalsJson?.totals) {
        updateTodayTotals(totalsJson.totals);
      }
    } catch {}
    setStage("scan");
    setImage(null);
    setDish(null);
    setIngredients([]);
    setPortion("full_bowl");
    setCustomGrams("");
    setTotals(null);
    router.replace("/");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {stage === "scan" && (
        <View style={styles.center}>
          <Text style={styles.title}>Food Scanner</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={openCamera}>
            <MaterialCommunityIcons name="camera" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Open Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={pickImage}>
            <MaterialCommunityIcons name="scan-helper" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Upload Food Image</Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === "portion" && image && (
        <View>
          <View style={styles.card}>
            <Image
              source={{ uri: image.uri }}
              style={[
                styles.image,
                image?.width && image?.height
                  ? { aspectRatio: Math.min(16 / 9, image.width / image.height), height: undefined }
                  : null,
              ]}
              resizeMode="cover"
            />
            <View style={styles.dishRow}>
              <Text style={styles.dishName}>{dish || "Unknown"}</Text>
              <View style={[styles.badge, { backgroundColor: confidenceBadge.color }]}>
                <Text style={styles.badgeText}>{confidenceBadge.text}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Portion</Text>
            <View style={styles.portionRow}>
              {PORTION_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPortion(p)}
                  style={[styles.pill, portion === p && styles.pillActive]}
                >
                  <Text style={[styles.pillText, portion === p && styles.pillTextActive]}>
                    {PORTION_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {portion === "custom" && (
              <View style={styles.row}>
                <MaterialCommunityIcons name="scale" size={18} color={Colors.light?.tint || "#0a7ea4"} />
                <TextInput
                  placeholder="Custom grams"
                  value={customGrams}
                  onChangeText={setCustomGrams}
                  keyboardType="numeric"
                  style={[styles.input, { flex: 0.6 }]}
                />
              </View>
            )}
            <Text style={styles.subtle}>
              Serving updates macros automatically based on portion
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Nutrition Summary</Text>
            <Text style={styles.calories}>
              {Number(totals?.calories || 0).toFixed(0)} kcal
            </Text>
            <View style={styles.macroRow}>
              <View style={styles.miniCard}>
                <MaterialCommunityIcons name="food-drumstick" size={20} color="#27ae60" />
                <Text style={styles.miniTitle}>Protein</Text>
                <Text style={styles.miniValue}>{Number(totals?.protein || 0).toFixed(1)} g</Text>
                <View style={styles.barBg}><View style={[styles.barFill, { width: `${Math.min(100, (totals?.protein || 0) * 2)}%`, backgroundColor: "#27ae60" }]} /></View>
              </View>
              <View style={styles.miniCard}>
                <MaterialCommunityIcons name="bread-slice" size={20} color="#2980b9" />
                <Text style={styles.miniTitle}>Carbs</Text>
                <Text style={styles.miniValue}>{Number(totals?.carbs || 0).toFixed(1)} g</Text>
                <View style={styles.barBg}><View style={[styles.barFill, { width: `${Math.min(100, (totals?.carbs || 0) * 1.5)}%`, backgroundColor: "#2980b9" }]} /></View>
              </View>
              <View style={styles.miniCard}>
                <MaterialCommunityIcons name="egg" size={20} color="#e67e22" />
                <Text style={styles.miniTitle}>Fat</Text>
                <Text style={styles.miniValue}>{Number(totals?.fat || 0).toFixed(1)} g</Text>
                <View style={styles.barBg}><View style={[styles.barFill, { width: `${Math.min(100, (totals?.fat || 0) * 3)}%`, backgroundColor: "#e67e22" }]} /></View>
              </View>
            </View>
          </View>

          {detectedIngredients.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.section}>Ingredients</Text>
              {detectedIngredients.map((it, idx) => (
                <View key={`${it}-${idx}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: "#0a7ea4", marginRight: 8 }} />
                  <Text>{it}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStage("ingredients")}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Add Ingredients</Text>
          </TouchableOpacity>
        </View>
      )}

      {stage === "ingredients" && (
        <View>
          <View style={styles.card}>
            <Text style={styles.section}>Add Extra Ingredient</Text>

            {ingredients.map((ing, idx) => (
              <View key={idx} style={styles.row}>
                <TextInput
                  placeholder="Ingredient"
                  value={ing.name}
                  style={styles.input}
                  onChangeText={(v) => updateIngredient(idx, "name", v)}
                />

                <TextInput
                  placeholder="Qty"
                  value={ing.quantity}
                  keyboardType="numeric"
                  style={styles.qty}
                  onChangeText={(v) => updateIngredient(idx, "quantity", v)}
                />

                <Picker
                  selectedValue={ing.unit}
                  style={styles.unit}
                  onValueChange={(v) => updateIngredient(idx, "unit", v)}
                >
                  <Picker.Item label="g" value="g" />
                  <Picker.Item label="ml" value="ml" />
                  <Picker.Item label="tsp" value="tsp" />
                  <Picker.Item label="tbsp" value="tbsp" />
                  <Picker.Item label="pieces" value="pieces" />
                </Picker>
              </View>
            ))}

            <View style={styles.chips}>
              {ingredients
                .filter((i) => i.name.trim())
                .map((i, idx) => (
                  <View key={`${i.name}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipText}>{i.name}</Text>
                  </View>
                ))}
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={addIngredient}>
              <MaterialCommunityIcons name="plus-circle" size={20} color="#0a7ea4" />
              <Text style={styles.secondaryBtnText}>Add Ingredient</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Total Nutrition</Text>
            <View style={styles.totalsRow}>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Calories</Text>
                <Text style={styles.totalValue}>{Number(totals?.calories || 0).toFixed(0)} kcal</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Protein</Text>
                <Text style={styles.totalValue}>{Number(totals?.protein || 0).toFixed(1)} g</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Carbs</Text>
                <Text style={styles.totalValue}>{Number(totals?.carbs || 0).toFixed(1)} g</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Fat</Text>
                <Text style={styles.totalValue}>{Number(totals?.fat || 0).toFixed(1)} g</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={addToDailyLog}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Add to Daily Log</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => {
                setStage("scan");
                setImage(null);
                setDish(null);
                setIngredients([]);
                setTotals(null);
                setPortion("full_bowl");
                setCustomGrams("");
              }}
            >
              <MaterialCommunityIcons name="restart" size={20} color="#0a7ea4" />
              <Text style={styles.secondaryBtnText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#f7f8fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginVertical: 16 },
  image: { width: "100%", height: 280, borderRadius: 16 },
  section: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  label: { marginTop: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  input: {
    flex: 2,
    borderWidth: 1,
    padding: 8,
    marginRight: 6,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderColor: "#e5e7eb",
  },
  qty: {
    flex: 1,
    borderWidth: 1,
    padding: 8,
    marginRight: 6,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderColor: "#e5e7eb",
  },
  unit: { flex: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dishRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  dishName: { fontSize: 20, fontWeight: "700" },
  badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { color: "#fff", fontWeight: "700" },
  portionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 6 },
  pill: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#eef2f7" },
  pillActive: { backgroundColor: "#0a7ea4" },
  pillText: { color: "#11181C", fontWeight: "600" },
  pillTextActive: { color: "#fff" },
  subtle: { color: "#6b7280", marginTop: 8 },
  calories: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  macroRow: { flexDirection: "row", gap: 10 },
  miniCard: { flex: 1, backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 },
  miniTitle: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  miniValue: { fontSize: 16, fontWeight: "700" },
  barBg: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 999, marginTop: 6 },
  barFill: { height: 8, borderRadius: 999 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { backgroundColor: "#eef2f7", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  chipText: { color: "#11181C" },
  totalsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  totalItem: { flexBasis: "48%", backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 },
  totalLabel: { color: "#6b7280" },
  totalValue: { fontSize: 16, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12, marginTop: 10 },
  primaryBtn: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#0a7ea4", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#0a7ea4", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  secondaryBtnText: { color: "#0a7ea4", fontWeight: "700" },
  ghostBtn: { flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: "#0a7ea4", backgroundColor: "#fff" },
});

