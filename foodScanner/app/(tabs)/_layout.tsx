import { Tabs } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: {
            backgroundColor: '#1E1E1E',
          },
          default: {
            backgroundColor: '#1E1E1E',
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => <Ionicons name="camera-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: "Diet",
          tabBarIcon: ({ color }) => <Ionicons name="restaurant-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: "Nutrition",
          tabBarIcon: ({ color }) => <Ionicons name="nutrition-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
