// =============================================
// ENHANCED RECIPE MODULE WITH AI FEATURES
// - Multiple Categories
// - Smart Filtering (Nutrition, Diet)
// - Step-by-Step Cooking
// - Voice Assistant
// - Smart Timers
// =============================================

import React, { useMemo, useState, useEffect, useCallback } from "react";
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
  TextInput,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";

const { width, height } = Dimensions.get("window");

// =============================================
// ENHANCED CATEGORIES
// =============================================

const DIETARY_FILTERS = [
  "All",
  "High Protein",
  "Weight Loss",
  "Keto",
  "Vegan",
  "Vegetarian",
  "Diabetes-Friendly",
  "Low Carb",
  "High Fiber",
  "Gluten-Free",
];

const CUISINE_FILTERS = [
  "All Cuisines",
  "Indian",
  "Italian",
  "Chinese",
  "Mexican",
  "American",
  "Thai",
  "Mediterranean",
];

const LEVEL_FILTERS = ["All Levels", "Easy", "Medium", "Hard"];

// =============================================
// ENHANCED RECIPES DATA
// =============================================

const recipesData = [
  {
    id: "1",
    title: "Grilled Chicken Protein Bowl",
    category: "High Protein",
    cuisine: "American",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80",
    calories: 420,
    protein: 38,
    carbs: 26,
    fat: 12,
    fiber: 4,
    prep: "10m",
    cook: "15m",
    level: "Easy",
    serve: 2,
    ingredients: [
      { name: "Chicken Breast", quantity: "200", unit: "g" },
      { name: "Brown Rice", quantity: "100", unit: "g" },
      { name: "Broccoli", quantity: "100", unit: "g" },
      { name: "Olive Oil", quantity: "1", unit: "tbsp" },
      { name: "Garlic", quantity: "2", unit: "cloves" },
      { name: "Salt", quantity: "1", unit: "tsp" },
    ],
    steps: [
      { instruction: "Cook brown rice according to package instructions until soft.", timer: 900 },
      { instruction: "Season chicken breast with salt, pepper, and garlic.", timer: 60 },
      { instruction: "Heat olive oil in a pan over medium-high heat.", timer: 60 },
      { instruction: "Pan fry chicken for 6 minutes each side until golden.", timer: 720 },
      { instruction: "Steam broccoli for 4 minutes until tender.", timer: 240 },
      { instruction: "Slice chicken and serve over rice with broccoli.", timer: 60 },
    ],
    benefits: ["High Protein", "Low Fat", "Muscle Building"],
    dietary: ["High Protein", "Low Carb", "Gluten-Free"],
  },
  {
    id: "2",
    title: "Keto Salmon with Spinach",
    category: "Keto",
    cuisine: "Mediterranean",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1000&q=80",
    calories: 520,
    protein: 44,
    carbs: 8,
    fat: 32,
    fiber: 3,
    prep: "8m",
    cook: "12m",
    level: "Medium",
    serve: 2,
    ingredients: [
      { name: "Salmon Fillet", quantity: "250", unit: "g" },
      { name: "Butter", quantity: "30", unit: "g" },
      { name: "Spinach", quantity: "100", unit: "g" },
      { name: "Garlic", quantity: "3", unit: "cloves" },
      { name: "Lemon", quantity: "1", unit: "piece" },
      { name: "Salt", quantity: "1", unit: "tsp" },
    ],
    steps: [
      { instruction: "Season salmon with salt and pepper on both sides.", timer: 60 },
      { instruction: "Melt butter in a pan over medium heat.", timer: 60 },
      { instruction: "Cook salmon skin side down for 4 minutes.", timer: 240 },
      { instruction: "Flip salmon and cook for another 3 minutes.", timer: 180 },
      { instruction: "Sauté spinach and garlic in the same pan for 2 minutes.", timer: 120 },
      { instruction: "Squeeze lemon juice over salmon and serve hot.", timer: 30 },
    ],
    benefits: ["Omega-3 Rich", "Keto Friendly", "Heart Healthy"],
    dietary: ["Keto", "Low Carb", "High Fat", "Gluten-Free"],
  },
  {
    id: "3",
    title: "Classic Vanilla Custard Flan",
    category: "Dessert",
    cuisine: "American",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1000&q=80",
    calories: 418,
    protein: 29,
    carbs: 10,
    fat: 20,
    fiber: 1,
    prep: "18m",
    cook: "17m",
    level: "Hard",
    serve: 4,
    ingredients: [
      { name: "Sugar", quantity: "100", unit: "g" },
      { name: "Whole Milk", quantity: "500", unit: "ml" },
      { name: "Eggs", quantity: "4", unit: "pieces" },
      { name: "Vanilla Extract", quantity: "1", unit: "tsp" },
      { name: "Caramel Sauce", quantity: "50", unit: "ml" },
    ],
    steps: [
      { instruction: "Preheat oven to 160°C (325°F).", timer: 300 },
      { instruction: "Melt sugar in a pan until golden caramel.", timer: 300 },
      { instruction: "Pour caramel into baking molds and set aside.", timer: 120 },
      { instruction: "Whisk eggs and sugar until fluffy.", timer: 180 },
      { instruction: "Heat milk and vanilla, then slowly add to egg mixture.", timer: 180 },
      { instruction: "Pour mixture into molds and bake in water bath for 40 minutes.", timer: 2400 },
      { instruction: "Cool overnight in refrigerator before serving.", timer: 28800 },
    ],
    benefits: ["Indulgent", "Protein Rich", "Comfort Food"],
    dietary: ["Vegetarian", "Gluten-Free"],
  },
  {
    id: "4",
    title: "Dal Tadka (Indian Lentils)",
    category: "Indian",
    cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80",
    calories: 280,
    protein: 18,
    carbs: 42,
    fat: 6,
    fiber: 12,
    prep: "10m",
    cook: "20m",
    level: "Easy",
    serve: 4,
    ingredients: [
      { name: "Toor Dal", quantity: "200", unit: "g" },
      { name: "Ghee", quantity: "30", unit: "ml" },
      { name: "Garlic", quantity: "4", unit: "cloves" },
      { name: "Cumin Seeds", quantity: "1", unit: "tsp" },
      { name: "Turmeric", quantity: "1", unit: "tsp" },
      { name: "Red Chilli", quantity: "2", unit: "pieces" },
    ],
    steps: [
      { instruction: "Wash dal and pressure cook with turmeric and salt for 3 whistles.", timer: 900 },
      { instruction: "Heat ghee in a small pan over medium heat.", timer: 60 },
      { instruction: "Add cumin seeds and let them splutter.", timer: 30 },
      { instruction: "Add crushed garlic and dried red chillies, sauté until golden.", timer: 120 },
      { instruction: "Pour the tadka (tempering) over the cooked dal.", timer: 30 },
      { instruction: "Mix well and garnish with coriander. Serve hot with roti.", timer: 60 },
    ],
    benefits: ["High Protein", "Iron Rich", "Vegetarian", "Digestive"],
    dietary: ["Vegetarian", "High Protein", "High Fiber", "Diabetes-Friendly"],
  },
  {
    id: "5",
    title: "Palak Paneer (Spinach Curry)",
    category: "Indian",
    cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80",
    calories: 350,
    protein: 22,
    carbs: 18,
    fat: 24,
    fiber: 6,
    prep: "15m",
    cook: "25m",
    level: "Medium",
    serve: 4,
    ingredients: [
      { name: "Paneer", quantity: "250", unit: "g" },
      { name: "Spinach", quantity: "500", unit: "g" },
      { name: "Onion", quantity: "2", unit: "medium" },
      { name: "Tomatoes", quantity: "3", unit: "medium" },
      { name: "Cream", quantity: "50", unit: "ml" },
      { name: "Garam Masala", quantity: "1", unit: "tsp" },
    ],
    steps: [
      { instruction: "Blanch spinach in hot water for 2 minutes, then blend into puree.", timer: 180 },
      { instruction: "Cut paneer into cubes and lightly fry until golden.", timer: 240 },
      { instruction: "Sauté onions and tomatoes until soft and aromatic.", timer: 300 },
      { instruction: "Add spinach puree and simmer for 10 minutes.", timer: 600 },
      { instruction: "Add paneer cubes and garam masala, cook for 5 minutes.", timer: 300 },
      { instruction: "Finish with cream and serve hot with naan or rice.", timer: 60 },
    ],
    benefits: ["Calcium Rich", "Iron Boost", "Vegetarian", "Energy Boost"],
    dietary: ["Vegetarian", "High Protein", "Gluten-Free"],
  },
  {
    id: "6",
    title: "Vegetable Stir Fry with Tofu",
    category: "Vegan",
    cuisine: "Chinese",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1000&q=80",
    calories: 320,
    protein: 18,
    carbs: 28,
    fat: 16,
    fiber: 8,
    prep: "15m",
    cook: "10m",
    level: "Easy",
    serve: 3,
    ingredients: [
      { name: "Firm Tofu", quantity: "200", unit: "g" },
      { name: "Broccoli", quantity: "100", unit: "g" },
      { name: "Bell Peppers", quantity: "2", unit: "pieces" },
      { name: "Carrots", quantity: "2", unit: "medium" },
      { name: "Soy Sauce", quantity: "3", unit: "tbsp" },
      { name: "Sesame Oil", quantity: "2", unit: "tbsp" },
    ],
    steps: [
      { instruction: "Press tofu to remove excess water, then cube.", timer: 300 },
      { instruction: "Heat sesame oil in a wok over high heat.", timer: 60 },
      { instruction: "Fry tofu cubes until golden on all sides.", timer: 300 },
      { instruction: "Add vegetables and stir fry for 4-5 minutes.", timer: 300 },
      { instruction: "Add soy sauce and toss everything together.", timer: 60 },
      { instruction: "Serve hot over steamed rice or noodles.", timer: 60 },
    ],
    benefits: ["Vegan", "Plant Protein", "Low Calorie", "Antioxidant"],
    dietary: ["Vegan", "Vegetarian", "Low Calorie", "High Fiber"],
  },
  {
    id: "7",
    title: "Diabetic-Friendly Oats Idli",
    category: "Diabetes-Friendly",
    cuisine: "Indian",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80",
    calories: 180,
    protein: 8,
    carbs: 32,
    fat: 4,
    fiber: 5,
    prep: "10m",
    cook: "15m",
    level: "Easy",
    serve: 4,
    ingredients: [
      { name: "Oats", quantity: "100", unit: "g" },
      { name: "Semolina", quantity: "50", unit: "g" },
      { name: "Yogurt", quantity: "100", unit: "g" },
      { name: "Carrots", quantity: "50", unit: "g" },
      { name: "Green Peas", quantity: "50", unit: "g" },
      { name: "Mustard Seeds", quantity: "1", unit: "tsp" },
    ],
    steps: [
      { instruction: "Dry roast oats and grind into coarse powder.", timer: 180 },
      { instruction: "Mix oats powder with semolina and yogurt, let rest for 10 minutes.", timer: 600 },
      { instruction: "Add grated carrots and peas to the batter.", timer: 120 },
      { instruction: "Grease idli moulds and pour the batter.", timer: 120 },
      { instruction: "Steam for 12-15 minutes until cooked.", timer: 840 },
      { instruction: "Serve hot with coconut chutney.", timer: 60 },
    ],
    benefits: ["Low Glycemic", "High Fiber", "Diabetic Safe", "Heart Healthy"],
    dietary: ["Diabetes-Friendly", "Vegetarian", "Low Calorie", "High Fiber"],
  },
  {
    id: "8",
    title: "Grilled Chicken Caesar Salad",
    category: "Weight Loss",
    cuisine: "American",
    image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1000&q=80",
    calories: 290,
    protein: 32,
    carbs: 12,
    fat: 14,
    fiber: 4,
    prep: "15m",
    cook: "10m",
    level: "Easy",
    serve: 2,
    ingredients: [
      { name: "Chicken Breast", quantity: "150", unit: "g" },
      { name: "Romaine Lettuce", quantity: "200", unit: "g" },
      { name: "Parmesan", quantity: "30", unit: "g" },
      { name: "Caesar Dressing", quantity: "2", unit: "tbsp" },
      { name: "Croutons", quantity: "30", unit: "g" },
      { name: "Lemon", quantity: "1", unit: "piece" },
    ],
    steps: [
      { instruction: "Season chicken with salt, pepper, and Italian herbs.", timer: 120 },
      { instruction: "Grill chicken for 6 minutes each side until cooked.", timer: 720 },
      { instruction: "Wash and chop romaine lettuce into bite-sized pieces.", timer: 180 },
      { instruction: "Slice grilled chicken into strips.", timer: 60 },
      { instruction: "Toss lettuce with dressing, chicken, parmesan, and croutons.", timer: 120 },
      { instruction: "Squeeze fresh lemon and serve immediately.", timer: 30 },
    ],
    benefits: ["High Protein", "Low Carb", "Weight Loss", "Low Calorie"],
    dietary: ["High Protein", "Low Carb", "Weight Loss", "Gluten-Free"],
  },
];

// =============================================
// VOICE ASSISTANT HOOK
// =============================================

const useVoiceAssistant = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string) => {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }
    
    setIsSpeaking(true);
    try {
      await Speech.speak(text, {
        language: "en-US",
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error("Speech error:", error);
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const stop = useCallback(async () => {
    await Speech.stop();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};

// =============================================
// RECIPE MODULE COMPONENT
// =============================================

export default function RecipeModule() {
  const [category, setCategory] = useState("All");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cuisine, setCuisine] = useState("All Cuisines");
  const [level, setLevel] = useState("All Levels");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = recipesData;

    if (category !== "All") {
      result = result.filter(
        (item) =>
          item.category === category ||
          item.dietary?.includes(category)
      );
    }

    if (cuisine !== "All Cuisines") {
      result = result.filter((item) => item.cuisine === cuisine);
    }

    if (level !== "All Levels") {
      result = result.filter((item) => item.level === level);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.ingredients.some((ing: any) =>
            ing.name.toLowerCase().includes(query)
          )
      );
    }

    return result;
  }, [category, cuisine, level, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Healthy Recipes</Text>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? "options" : "options-outline"}
            size={24}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes or ingredients..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterLabel}>Dietary Preference</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DIETARY_FILTERS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterChip,
                  category === item && styles.filterChipActive,
                ]}
                onPress={() => setCategory(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    category === item && styles.filterChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CUISINE_FILTERS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterChip,
                  cuisine === item && styles.filterChipActive,
                ]}
                onPress={() => setCuisine(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    cuisine === item && styles.filterChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Difficulty</Text>
          <View style={styles.levelRow}>
            {LEVEL_FILTERS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.levelChip,
                  level === item && styles.levelChipActive,
                ]}
                onPress={() => setLevel(item)}
              >
                <Text
                  style={[
                    styles.levelChipText,
                    level === item && styles.levelChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Categories Scroll */}
      {!showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        >
          {DIETARY_FILTERS.map((item) => {
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
      )}

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filtered.length} recipe{filtered.length !== 1 ? "s" : ""} found
      </Text>

      {/* Recipes Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <RecipeCard
            item={item}
            onPress={() => setSelectedRecipe(item)}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>No recipes found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or search
            </Text>
          </View>
        }
      />

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeModal
          visible={selectedRecipe !== null}
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </SafeAreaView>
  );
}

// =============================================
// RECIPE CARD COMPONENT
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
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={14} color="#fff" />
            <Text style={styles.metaText}>{item.calories} kcal</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={14} color="#fff" />
            <Text style={styles.metaText}>{item.protein}g</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// =============================================
// ENHANCED RECIPE MODAL WITH COOKING MODE
// =============================================

function RecipeModal({ visible, recipe, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);
  const { speak, stop, isSpeaking } = useVoiceAssistant();

  useEffect(() => {
    if (!visible) {
      setCurrentStep(0);
      setTimerSeconds(0);
      setTimerRunning(false);
      setCookingMode(false);
      stop();
    }
  }, [visible]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            Speech.speak("Timer complete!", { language: "en-US" });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const startTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setTimerRunning(true);
  };

  const pauseTimer = () => setTimerRunning(false);
  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
  };

  const handleNextStep = () => {
    if (currentStep < recipe.steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      resetTimer();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      resetTimer();
    }
  };

  const handleSpeakStep = () => {
    const step = recipe.steps[currentStep];
    speak(`Step ${currentStep + 1}. ${step.instruction}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!recipe) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <ScrollView style={styles.modalContainer}>
        <Image source={{ uri: recipe.image }} style={styles.heroImage} />
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        {cookingMode && (
          <TouchableOpacity
            style={styles.exitCookingBtn}
            onPress={() => setCookingMode(false)}
          >
            <Text style={styles.exitCookingText}>Exit Cooking Mode</Text>
          </TouchableOpacity>
        )}

        <View style={styles.modalContent}>
          <View style={styles.recipeHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{recipe.cuisine}</Text>
            </View>
            <Text style={styles.modalTitle}>{recipe.title}</Text>
            <View style={styles.benefitsRow}>
              {recipe.benefits?.map((benefit, i) => (
                <View key={i} style={styles.benefitTag}>
                  <Text style={styles.benefitTagText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Nutrition Grid */}
          <View style={styles.nutritionGrid}>
            <NutritionBox label="Calories" value={recipe.calories} unit="kcal" color="#EF4444" />
            <NutritionBox label="Protein" value={recipe.protein} unit="g" color="#3B82F6" />
            <NutritionBox label="Carbs" value={recipe.carbs} unit="g" color="#F59E0B" />
            <NutritionBox label="Fat" value={recipe.fat} unit="g" color="#8B5CF6" />
            <NutritionBox label="Fiber" value={recipe.fiber} unit="g" color="#10B981" />
            <NutritionBox label="Serves" value={recipe.serve} unit="people" color="#EC4899" />
          </View>

          {/* Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Prep</Text>
              <Text style={styles.infoValue}>{recipe.prep}</Text>
            </View>
            <View style={styles.infoBox}>
              <Ionicons name="flame-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Cook</Text>
              <Text style={styles.infoValue}>{recipe.cook}</Text>
            </View>
            <View style={styles.infoBox}>
              <Ionicons name="speedometer-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Level</Text>
              <Text style={styles.infoValue}>{recipe.level}</Text>
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <Text style={styles.ingredientCount}>
                {recipe.ingredients.length} items
              </Text>
            </View>
            {recipe.ingredients.map((ing: any, i: number) => (
              <View key={i} style={styles.ingredientItem}>
                <View style={styles.ingredientBullet} />
                <Text style={styles.ingredientText}>
                  {ing.quantity} {ing.unit} {ing.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Cooking Steps */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cooking Steps</Text>
              <TouchableOpacity
                style={styles.cookingModeBtn}
                onPress={() => setCookingMode(!cookingMode)}
              >
                <Ionicons
                  name={cookingMode ? "checkbox" : "checkbox-outline"}
                  size={20}
                  color="#10B981"
                />
                <Text style={styles.cookingModeText}>Cooking Mode</Text>
              </TouchableOpacity>
            </View>

            {recipe.steps.map((step: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.stepCard,
                  cookingMode && i === currentStep && styles.stepCardActive,
                  i < currentStep && styles.stepCardCompleted,
                ]}
                onPress={() => {
                  if (cookingMode) {
                    setCurrentStep(i);
                    resetTimer();
                  }
                }}
              >
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepNumber,
                      i < currentStep && styles.stepNumberCompleted,
                      cookingMode && i === currentStep && styles.stepNumberActive,
                    ]}
                  >
                    {i < currentStep ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    )}
                  </View>
                  {step.timer > 0 && (
                    <TouchableOpacity
                      style={styles.timerTrigger}
                      onPress={() => startTimer(step.timer)}
                    >
                      <Ionicons name="timer-outline" size={18} color="#10B981" />
                      <Text style={styles.timerTriggerText}>
                        {Math.floor(step.timer / 60)}:{(step.timer % 60)
                          .toString()
                          .padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.stepInstruction}>{step.instruction}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Timer Section */}
          {cookingMode && (
            <View style={styles.timerSection}>
              <Text style={styles.timerSectionTitle}>
                Step {currentStep + 1} Timer
              </Text>
              <Text style={styles.timerDisplay}>{formatTime(timerSeconds)}</Text>
              <View style={styles.timerControls}>
                {!timerRunning ? (
                  <TouchableOpacity
                    style={[styles.timerBtn, styles.timerBtnStart]}
                    onPress={() =>
                      timerSeconds > 0 ? setTimerRunning(true) : startTimer(recipe.steps[currentStep]?.timer || 60)
                    }
                  >
                    <Ionicons name="play" size={24} color="#fff" />
                    <Text style={styles.timerBtnText}>
                      {timerSeconds > 0 ? "Resume" : "Start"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.timerBtn, styles.timerBtnPause]}
                    onPress={pauseTimer}
                  >
                    <Ionicons name="pause" size={24} color="#fff" />
                    <Text style={styles.timerBtnText}>Pause</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.timerBtn, styles.timerBtnReset]}
                  onPress={resetTimer}
                >
                  <Ionicons name="refresh" size={24} color="#fff" />
                  <Text style={styles.timerBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>

              {/* Voice Controls */}
              <View style={styles.voiceControls}>
                <TouchableOpacity
                  style={[styles.voiceBtn, isSpeaking && styles.voiceBtnActive]}
                  onPress={handleSpeakStep}
                >
                  <Ionicons
                    name={isSpeaking ? "volume-high" : "volume-medium-outline"}
                    size={24}
                    color={isSpeaking ? "#10B981" : "#6B7280"}
                  />
                  <Text style={styles.voiceBtnText}>
                    {isSpeaking ? "Stop Voice" : "Read Step Aloud"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.stepNavigation}>
                  <TouchableOpacity
                    style={[styles.navBtn, currentStep === 0 && styles.navBtnDisabled]}
                    onPress={handlePrevStep}
                    disabled={currentStep === 0}
                  >
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                    <Text style={styles.navBtnText}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepIndicator}>
                    {currentStep + 1} / {recipe.steps.length}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.navBtn,
                      currentStep === recipe.steps.length - 1 && styles.navBtnDisabled,
                    ]}
                    onPress={handleNextStep}
                    disabled={currentStep === recipe.steps.length - 1}
                  >
                    <Text style={styles.navBtnText}>Next</Text>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </Modal>
  );
}

// =============================================
// NUTRITION BOX COMPONENT
// =============================================

function NutritionBox({ label, value, unit, color }: any) {
  return (
    <View style={[styles.nutritionBox, { borderLeftColor: color }]}>
      <Text style={[styles.nutritionValue, { color }]}>{value}</Text>
      <Text style={styles.nutritionUnit}>{unit}</Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
    </View>
  );
}

// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  filterBtn: {
    padding: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#111827",
  },
  filtersPanel: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    marginTop: 12,
  },
  filterChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: "#111827",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  levelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  levelChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  levelChipActive: {
    backgroundColor: "#10B981",
  },
  levelChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  levelChipTextActive: {
    color: "#fff",
  },
  resultsCount: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    width: (width - 48) / 2,
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
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
    top: 12,
    left: 12,
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },
  cardBottom: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: "row",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  metaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
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
    color: "#111827",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  heroImage: {
    width: "100%",
    height: 300,
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 50,
  },
  exitCookingBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exitCookingText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  modalContent: {
    padding: 20,
  },
  recipeHeader: {
    marginBottom: 20,
  },
  categoryBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  benefitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  benefitTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  benefitTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#166534",
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  nutritionBox: {
    width: "30%",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  nutritionUnit: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  infoBox: {
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  ingredientCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 12,
  },
  ingredientText: {
    fontSize: 16,
    color: "#374151",
  },
  cookingModeBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  cookingModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 4,
  },
  stepCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  stepCardActive: {
    borderColor: "#10B981",
    backgroundColor: "#DCFCE7",
  },
  stepCardCompleted: {
    backgroundColor: "#F3F4F6",
    opacity: 0.7,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberActive: {
    backgroundColor: "#10B981",
  },
  stepNumberCompleted: {
    backgroundColor: "#10B981",
  },
  stepNumberText: {
    fontWeight: "700",
    color: "#374151",
    fontSize: 14,
  },
  timerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerTriggerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 4,
  },
  stepInstruction: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  timerSection: {
    backgroundColor: "#111827",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 20,
  },
  timerSectionTitle: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: "800",
    color: "#fff",
    fontVariant: ["tabular-nums"],
  },
  timerControls: {
    flexDirection: "row",
    marginTop: 20,
  },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    marginHorizontal: 8,
  },
  timerBtnStart: {
    backgroundColor: "#10B981",
  },
  timerBtnPause: {
    backgroundColor: "#F59E0B",
  },
  timerBtnReset: {
    backgroundColor: "#6B7280",
  },
  timerBtnText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  voiceControls: {
    width: "100%",
    marginTop: 24,
  },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  voiceBtnActive: {
    backgroundColor: "#DCFCE7",
  },
  voiceBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  stepNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#374151",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  navBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  navBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  stepIndicator: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
