import { useState } from "react";
import { View, Text, Button, TextInput, Image, StyleSheet, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";

function resolveApiUrl() {
  const extra = Constants.expoConfig?.extra || {};
  if (extra?.API_URL) return extra.API_URL;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8000`;
  }
  return Platform.select({
    web: "http://localhost:8000",
    default: "http://localhost:8000",
  });
}
const API_URL = resolveApiUrl();

export default function App() {
  const [image, setImage] = useState(null);
  const [food, setFood] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [nutrition, setNutrition] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      predictFood(result.assets[0]);
    }
  };

  const predictFood = async (img) => {
    try {
      setLoading(true);
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
        });
      }

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setFood(data.food);
      setConfidence(data.confidence.toFixed(2));
      const qty = quantity ? Number(quantity) : 100;
      if (!quantity) setQuantity(String(qty));
      try {
        const nres = await fetch(`${API_URL}/nutrition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ food: data.food, quantity: qty }),
        });
        const ndata = await nres.json();
        if (!ndata.error) setNutrition(ndata);
        else setNutrition(null);
      } catch {
        setNutrition(null);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to scan image");
    } finally {
      setLoading(false);
    }
  };

  const getNutrition = async () => {
    if (!quantity) {
      Alert.alert("Error", "Enter quantity in grams");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/nutrition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food: food,
          quantity: Number(quantity),
        }),
      });

      const data = await response.json();
      setNutrition(data);
    } catch (err) {
      Alert.alert("Error", "Failed to calculate nutrition");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food Scanner</Text>

      <Button title="Scan Meal" onPress={pickImage} />

      {image && (
        <Image source={{ uri: image.uri }} style={styles.image} />
      )}

      {loading && <Text>Analyzing image...</Text>}

      {food !== "" && (
        <>
          <Text style={styles.result}>
            Detected: {food} ({confidence})
          </Text>

          <TextInput
            placeholder="Quantity (grams)"
            keyboardType="numeric"
            value={quantity}
            onChangeText={setQuantity}
            style={styles.input}
          />

          <Button title="Calculate Nutrition" onPress={getNutrition} />
        </>
      )}

      {nutrition && (
        <View style={styles.nutrition}>
          <Text>Calories: {nutrition.calories.toFixed(2)}</Text>
          <Text>Protein: {nutrition.protein.toFixed(2)} g</Text>
          <Text>Carbs: {nutrition.carbs.toFixed(2)} g</Text>
          <Text>Fat: {nutrition.fat.toFixed(2)} g</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  image: {
    width: 250,
    height: 250,
    marginVertical: 15,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginVertical: 10,
  },
  result: {
    fontSize: 16,
    marginVertical: 10,
  },
  nutrition: {
    marginTop: 15,
  },
});
