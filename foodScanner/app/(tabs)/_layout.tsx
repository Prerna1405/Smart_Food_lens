import { Tabs } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Colors, Shadows, Spacing, Typography } from "../../constants/theme";
import Animated, { 
  FadeInDown, 
  withTiming, 
  useAnimatedStyle, 
  useSharedValue,
  Easing
} from "react-native-reanimated";
import { useEffect } from "react";
import { BlurView } from "expo-blur";
import { GlobalChatbot } from "../../components/GlobalChatbot";

const EasingCurve = Easing.bezier(0.4, 0.0, 0.2, 1);

function CustomTabBar({ state, descriptors, navigation, translateY }: any) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.tabBarContainer, animatedStyle]}>
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
          const isFocused = state.index === index;

          if (options.href === null) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = () => {
            switch (route.name) {
              case 'index': return isFocused ? 'home' : 'home-outline';
              case 'stats': return isFocused ? 'stats-chart' : 'stats-chart-outline';
              case 'scan': return isFocused ? 'camera' : 'camera-outline';
              case 'chef': return isFocused ? 'restaurant' : 'restaurant-outline';
              case 'ProfileScreen': return isFocused ? 'person' : 'person-outline';
              default: return 'help-outline';
            }
          };

          if (route.name === 'scan') {
            return (
              <TouchableOpacity key={route.key} onPress={onPress} style={styles.scanTab}>
                <View style={styles.scanIconContainer}>
                  <Ionicons name={iconName() as any} size={32} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem}>
              <View style={[styles.tabIconContainer, isFocused && styles.activeTabIconContainer]}>
                <Ionicons 
                  name={iconName() as any} 
                  size={20} 
                  color={isFocused ? '#fff' : Colors.light.tabIconDefault} 
                />
              </View>
              <Text style={[
                styles.tabLabel, 
                { color: isFocused ? Colors.light.primary : Colors.light.tabIconDefault }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const translateY = useSharedValue(100);

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: 500,
      easing: EasingCurve,
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} translateY={translateY} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="stats" options={{ title: "Stats" }} />
        <Tabs.Screen name="scan" options={{ title: "Scan" }} />
        <Tabs.Screen name="chef" options={{ title: "Chef" }} />
        <Tabs.Screen name="ProfileScreen" options={{ title: "Profile" }} />
      </Tabs>
      <GlobalChatbot />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.light.surface,
    borderTopWidth: Platform.OS === 'ios' ? 0 : 1,
    borderTopColor: Colors.light.border,
    height: Platform.OS === 'ios' ? 90 : 75,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Shadows.lg,
    overflow: 'hidden',
  },
  tabBarInner: {
    flexDirection: 'row',
    height: '100%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    paddingTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeTabIconContainer: {
    backgroundColor: Colors.light.primary,
    ...Shadows.sm,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Typography.family.rounded,
  },
  scanTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -25,
  },
  scanIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.premium,
    borderWidth: 4,
    borderColor: '#fff',
  },
});
