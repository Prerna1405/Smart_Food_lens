import { Tabs } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, View, StyleSheet } from "react-native";
import { Colors } from "../../constants/theme";
import { BlurView } from "expo-blur";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <BlurView 
            intensity={80} 
            tint="dark" 
            style={StyleSheet.absoluteFill} 
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTab : null}>
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.scanTab, focused && styles.activeScanTab]}>
              <Ionicons name="camera" size={28} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTab : null}>
              <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="recipe-gen"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTab : null}>
              <Ionicons name={focused ? "book" : "book-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          href: null, // Move old diet tab to the background
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          href: null, // Hide the nutrition tab
        }}
      />
      <Tabs.Screen
        name="ProfileScreen"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTab : null}>
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeTab: {
    padding: 4,
  },
  scanTab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
    ...Platform.select({
      web: {
        boxShadow: `0px 4px 8px ${Colors.light.primary}66`, // 0.4 opacity in hex is ~66
      },
      default: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }
    }),
  },
  activeScanTab: {
    backgroundColor: Colors.light.primary,
    transform: [{ scale: 1.1 }],
  },
});
