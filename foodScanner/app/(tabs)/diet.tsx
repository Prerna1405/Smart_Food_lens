import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useUser } from '../../components/context/UserContext';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import axios from 'axios';

const { width } = Dimensions.get('window');
const SPOONACULAR_API_KEY = 'f8401aa1873d439eb5c5b0c9d86a2bda';

interface Recipe {
  id: number;
  title: string;
  image: string;
  calories: number;
  protein: string;
  fat: string;
  carbs: string;
}

const DietPlanScreen = () => {
  const { userProfile, todayTotals } = useUser();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      fetchRecommendedRecipes();
    }
  }, [userProfile]);

  const fetchRecommendedRecipes = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000'}/generate-recipes`,
        {
          profile: userProfile,
          recent_scans: todayScans,
        }
      );

      if (response.data.recipes) {
        setRecipes(response.data.recipes);
      } else {
        throw new Error(response.data.error || 'No recipes found');
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      Alert.alert('Error', 'Failed to fetch AI recipe recommendations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Diet Plan</Text>
        <Text style={styles.subtitle}>Personalized recipes based on your goals</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Daily Progress</Text>
          <View style={styles.progressRow}>
            <ProgressItem 
              label="Calories" 
              current={todayTotals.calories} 
              target={userProfile?.daily_calorie_target || 2000} 
              unit="kcal" 
              color={Colors.light.primary}
            />
          </View>
          <View style={styles.macrosRow}>
            <MacroMini label="P" current={todayTotals.protein} target={userProfile?.daily_protein_target || 150} color={Colors.light.protein} />
            <MacroMini label="C" current={todayTotals.carbs} target={userProfile?.daily_carb_target || 250} color={Colors.light.carbs} />
            <MacroMini label="F" current={todayTotals.fat} target={userProfile?.daily_fat_target || 70} color={Colors.light.fat} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <TouchableOpacity onPress={fetchRecommendedRecipes}>
            <MaterialCommunityIcons name="refresh" size={24} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
        ) : (
          recipes.map((recipe, index) => (
            <Animated.View 
              key={recipe.id} 
              entering={FadeInUp.delay(index * 100)}
              style={styles.recipeCard}
            >
              <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
              <View style={styles.recipeInfo}>
                <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
                <View style={styles.recipeMacros}>
                  <Text style={styles.recipeMacroText}>{recipe.calories} kcal</Text>
                  <Text style={styles.recipeMacroDivider}>•</Text>
                  <Text style={styles.recipeMacroText}>{recipe.protein} Protein</Text>
                </View>
                <TouchableOpacity style={styles.viewRecipeBtn}>
                  <Text style={styles.viewRecipeText}>View Recipe</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.light.primary} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const ProgressItem = ({ label, current, target, unit, color }: any) => {
  const progress = Math.min(current / target, 1);
  return (
    <View style={styles.progressItem}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{Math.round(current)} / {target} {unit}</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const MacroMini = ({ label, current, target, color }: any) => (
  <View style={styles.macroMini}>
    <Text style={[styles.macroMiniLabel, { color }]}>{label}</Text>
    <Text style={styles.macroMiniValue}>{Math.round(current)}g</Text>
    <Text style={styles.macroMiniTarget}>/ {target}g</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: Spacing.xl,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  progressRow: {
    marginBottom: Spacing.lg,
  },
  progressItem: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.md,
  },
  macroMini: {
    alignItems: 'center',
  },
  macroMiniLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  macroMiniValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  macroMiniTarget: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  recipeImage: {
    width: 120,
    height: 120,
  },
  recipeInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  recipeMacros: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeMacroText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  recipeMacroDivider: {
    marginHorizontal: 6,
    color: '#CBD5E1',
  },
  viewRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  viewRecipeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
    marginRight: 2,
  },
});

export default DietPlanScreen;
