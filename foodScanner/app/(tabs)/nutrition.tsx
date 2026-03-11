import { Text, View, StyleSheet } from 'react-native'
import React from 'react'

const NutribitesScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>NutriBites Screen</Text>
      <Text style={styles.subText}>Coming Soon...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subText: {
    color: '#888',
    marginTop: 10,
  },
});

export default NutribitesScreen
