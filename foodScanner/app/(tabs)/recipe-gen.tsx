import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/theme';
import axios from 'axios';
import { useUser } from '../../components/context/UserContext';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const RecipeGeneratorScreen = () => {
  const { userProfile } = useUser();
  const [disease, setDisease] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);

  const generateAIBasedRecipes = async () => {
    if (!disease && !userProfile?.health_goals) {
      Alert.alert('Info', 'Please enter a health condition or set a goal in Profile.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/generate-recipes`, {
        profile: {
          ...userProfile,
          health_goals: disease || userProfile?.health_goals || 'General Health',
        },
        recent_scans: [],
      });

      if (response.data.recipes) {
        setRecipes(response.data.recipes);
      } else {
        Alert.alert('Error', 'No specific recipes found for this condition.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'AI Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Recipe Studio</Text>
        <Text style={styles.subtitle}>Precision nutrition for your health conditions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputCard}>
          <Text style={styles.label}>Target Health Condition / Disease</Text>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="medical-bag" size={24} color={Colors.light.primary} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Diabetes, Hypertension, PCOS..."
              placeholderTextColor="#94A3B8"
              value={disease}
              onChangeText={setDisease}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.generateBtn, loading && styles.disabledBtn]} 
            onPress={generateAIBasedRecipes}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="auto-fix" size={20} color="#fff" />
                <Text style={styles.generateBtnText}>Generate Healing Recipes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {recipes.length > 0 && (
          <Text style={styles.resultsTitle}>Tailored Recommendations</Text>
        )}

        {recipes.map((item, index) => (
          <View key={item.id} style={styles.recipeCard}>
            <Image source={{ uri: item.image }} style={styles.recipeImage} />
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeTitle}>{item.title}</Text>
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.nutrients.calories} kcal</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.tagText, { color: '#059669' }]}>Score: {item.healthScore}</Text>
                </View>
              </View>
              <Text style={styles.summary} numberOfLines={2}>
                {item.summary.replace(/<[^>]*>?/gm, '')}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: Spacing.xl, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 16, color: '#64748B', marginTop: 4 },
  content: { padding: Spacing.lg },
  inputCard: { backgroundColor: '#fff', padding: Spacing.lg, borderRadius: BorderRadius.xl, ...Shadows.md, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 16, borderRadius: BorderRadius.lg, height: 56, marginBottom: 16 },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A' },
  generateBtn: { backgroundColor: Colors.light.primary, height: 56, borderRadius: BorderRadius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  disabledBtn: { opacity: 0.7 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultsTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  recipeCard: { backgroundColor: '#fff', borderRadius: BorderRadius.xl, marginBottom: 16, overflow: 'hidden', ...Shadows.sm },
  recipeImage: { width: '100%', height: 180 },
  recipeInfo: { padding: Spacing.lg },
  recipeTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  summary: { fontSize: 14, color: '#64748B', lineHeight: 20 },
});

export default RecipeGeneratorScreen;
