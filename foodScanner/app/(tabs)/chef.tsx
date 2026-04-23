// =============================================
// FINAL APK READY RECIPE MODULE
// NO FONT ISSUE
// NO TIMEOUT
// PROFESSIONAL UI
// CLICK CARD => FULL DETAIL MODAL
// MULTIPLE CATEGORIES
// TIMER
// NUTRITION
// WORKS PERFECTLY
// =============================================

import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from "react-native";

const { width, height } = Dimensions.get("window");

// =============================================
// DATA
// =============================================

const categories = [
  "All",
  "High Protein",
  "Weight Loss",
  "Keto",
  "Vegan",
  "Dessert",
];

const recipesData = [
  {
    id: "1",
    title: "Chicken Protein Bowl",
    category: "High Protein",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80",
    calories: 420,
    protein: 38,
    carbs: 26,
    fat: 12,
    prep: "10m",
    cook: "15m",
    level: "Easy",
    serve: 2,
    ingredients: [
      "Chicken Breast",
      "Brown Rice",
      "Broccoli",
      "Garlic",
      "Olive Oil",
      "Salt",
    ],
    steps: [
      "Cook rice until soft.",
      "Season chicken breast.",
      "Pan fry chicken for 6 minutes each side.",
      "Steam broccoli.",
      "Serve together hot.",
    ],
  },

  {
    id: "2",
    title: "Keto Salmon",
    category: "Keto",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1000&q=80",
    calories: 520,
    protein: 44,
    carbs: 8,
    fat: 32,
    prep: "8m",
    cook: "12m",
    level: "Medium",
    serve: 2,
    ingredients: [
      "Salmon",
      "Butter",
      "Garlic",
      "Spinach",
      "Salt",
      "Pepper",
    ],
    steps: [
      "Season salmon.",
      "Cook salmon skin side down.",
      "Saute spinach in butter.",
      "Serve hot.",
    ],
  },

  {
    id: "3",
    title: "Flan Dessert",
    category: "Dessert",
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1000&q=80",
    calories: 418,
    protein: 29,
    carbs: 10,
    fat: 20,
    prep: "18m",
    cook: "17m",
    level: "Hard",
    serve: 4,
    ingredients: [
      "Sugar",
      "Milk",
      "Eggs",
      "Vanilla",
      "Caramel",
    ],
    steps: [
      "Melt sugar to caramel.",
      "Pour caramel in molds.",
      "Mix eggs and milk.",
      "Bake in oven water bath.",
      "Cool overnight.",
    ],
  },
];

// =============================================
// MAIN COMPONENT
// =============================================

export default function RecipeModule() {
  const [category, setCategory] = useState("All");
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const filtered = useMemo(() => {
    if (category === "All") return recipesData;
    return recipesData.filter((item) => item.category === category);
  }, [category]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Healthy Recipes</Text>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
      >
        {categories.map((item) => {
          const active = item === category;

          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryBtn,
                active && { backgroundColor: "#111827" },
              ]}
              onPress={() => setCategory(item)}
            >
              <Text
                style={[
                  styles.categoryText,
                  active && { color: "#fff" },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Recipes */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecipeCard
            item={item}
            onPress={() => setSelectedRecipe(item)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal */}
      <RecipeModal
        visible={selectedRecipe !== null}
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </SafeAreaView>
  );
}

// =============================================
// CARD
// =============================================

function RecipeCard({ item, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Image source={{ uri: item.image }} style={styles.cardImage} />

      <View style={styles.overlay} />

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.category}</Text>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.cardTitle}>{item.title}</Text>

        <View style={styles.cardRow}>
          <Text style={styles.smallText}>{item.prep} Prep</Text>
          <Text style={styles.smallText}>{item.cook} Cook</Text>
          <Text style={styles.smallText}>{item.level}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// =============================================
// MODAL
// =============================================

function RecipeModal({ visible, recipe, onClose }) {
  const [step, setStep] = useState(0);
  const [time, setTime] = useState(60);

  useEffect(() => {
    setStep(0);
    setTime(60);
  }, [recipe]);

  useEffect(() => {
    if (!visible) return;

    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) return 60;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  if (!recipe) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <ScrollView style={{ backgroundColor: "#fff" }}>
        <Image source={{ uri: recipe.image }} style={styles.heroImage} />

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={{ color: "#fff", fontSize: 18 }}>✕</Text>
        </TouchableOpacity>

        <View style={styles.modalContent}>
          <Text style={styles.modalCategory}>{recipe.category}</Text>
          <Text style={styles.modalTitle}>{recipe.title}</Text>

          {/* Info */}
          <View style={styles.grid}>
            <InfoBox label="Calories" value={recipe.calories} />
            <InfoBox label="Protein" value={recipe.protein + "g"} />
            <InfoBox label="Carbs" value={recipe.carbs + "g"} />
            <InfoBox label="Fat" value={recipe.fat + "g"} />
            <InfoBox label="Prep" value={recipe.prep} />
            <InfoBox label="Cook" value={recipe.cook} />
          </View>

          {/* Ingredients */}
          <Text style={styles.section}>Ingredients</Text>

          {recipe.ingredients.map((x, i) => (
            <Text key={i} style={styles.listItem}>
              • {x}
            </Text>
          ))}

          {/* Steps */}
          <Text style={styles.section}>Cooking Steps</Text>

          {recipe.steps.map((x, i) => (
            <View
              key={i}
              style={[
                styles.stepCard,
                i === step && { borderColor: "#10B981" },
              ]}
            >
              <Text style={styles.stepNo}>Step {i + 1}</Text>
              <Text style={styles.stepText}>{x}</Text>
            </View>
          ))}

          {/* Timer */}
          <Text style={styles.section}>Cooking Timer</Text>

          <View style={styles.timerBox}>
            <Text style={styles.timerText}>{time}s</Text>
          </View>

          {/* Step Controls */}
          <View style={styles.stepButtons}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() =>
                setStep((prev) => (prev === 0 ? 0 : prev - 1))
              }
            >
              <Text style={styles.navTxt}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: "#10B981" }]}
              onPress={() =>
                setStep((prev) =>
                  prev === recipe.steps.length - 1
                    ? prev
                    : prev + 1
                )
              }
            >
              <Text style={[styles.navTxt, { color: "#fff" }]}>
                Next
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </Modal>
  );
}

// =============================================
// SMALL BOX
// =============================================

function InfoBox({ label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: "#F9FAFB",
  },

  heading: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 18,
  },

  categoryBtn: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    marginRight: 10,
  },

  categoryText: {
    fontWeight: "700",
  },

  card: {
    height: 250,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 18,
  },

  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  badge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

  cardBottom: {
    position: "absolute",
    bottom: 18,
    left: 18,
    right: 18,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  smallText: {
    color: "#fff",
    fontWeight: "600",
  },

  heroImage: {
    width: "100%",
    height: 320,
  },

  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 12,
    borderRadius: 50,
  },

  modalContent: {
    padding: 20,
  },

  modalCategory: {
    color: "#10B981",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 8,
  },

  modalTitle: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 20,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  infoBox: {
    width: "48%",
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },

  infoValue: {
    fontSize: 22,
    fontWeight: "800",
  },

  infoLabel: {
    color: "#6B7280",
    marginTop: 4,
  },

  section: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 14,
  },

  listItem: {
    fontSize: 16,
    marginBottom: 10,
  },

  stepCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },

  stepNo: {
    fontWeight: "800",
    marginBottom: 8,
  },

  stepText: {
    color: "#374151",
    lineHeight: 22,
  },

  timerBox: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 18,
  },

  timerText: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "900",
  },

  stepButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  navBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    marginHorizontal: 5,
  },

  navTxt: {
    fontWeight: "800",
  },
});