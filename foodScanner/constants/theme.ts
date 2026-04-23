import { Platform } from 'react-native';

const tintColorLight = '#6366F1'; // Indigo-600
const tintColorDark = '#818CF8'; // Indigo-400

export const Colors = {
  light: {
    text: '#0F172A', // Slate-900 (Better contrast)
    textSecondary: '#475569', // Slate-600
    background: '#FFFFFF', // Pure white for premium feel
    tint: tintColorLight,
    icon: '#475569',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    primary: '#6366F1',
    primaryLight: '#F5F7FF',
    secondary: '#10B981',
    secondaryLight: '#F0FDF4',
    accent: '#F59E0B',
    accentLight: '#FFFBEB',
    success: '#10B981',
    successLight: '#DCFCE7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    calories: '#F43F5E',
    protein: '#3B82F6',
    carbs: '#F59E0B',
    fat: '#8B5CF6',
    border: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    
    // Premium Gradients
    primaryGradient: ['#6366F1', '#4F46E5'],
    secondaryGradient: ['#10B981', '#059669'],
    accentGradient: ['#F59E0B', '#D97706'],
    premiumGradient: ['#6366F1', '#8B5CF6', '#D946EF'], // Multi-color premium
    glassGradient: ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)'],
    
    // Nutrition Gradients
    caloriesGradient: ['#FF6B6B', '#EE5253'],
    proteinGradient: ['#4834D4', '#686DE0'],
    carbsGradient: ['#F0932B', '#FFBE76'],
    fatGradient: ['#BE2EDD', '#E056FD'],
    
    // Background Glow Colors
    glowPrimary: 'rgba(99, 102, 241, 0.15)',
    glowSecondary: 'rgba(16, 185, 129, 0.1)',
    glowAccent: 'rgba(245, 158, 11, 0.1)',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
    primary: '#818CF8',
    success: '#34D399',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...Platform.select({
      web: { boxShadow: 'none' }
    })
  },
  sm: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    ...Platform.select({
      web: { boxShadow: '0px 2px 3px rgba(100, 116, 139, 0.05)' }
    })
  },
  md: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    ...Platform.select({
      web: { boxShadow: '0px 4px 6px rgba(100, 116, 139, 0.1)' }
    })
  },
  lg: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    ...Platform.select({
      web: { boxShadow: '0px 10px 12px rgba(100, 116, 139, 0.15)' }
    })
  },
  premium: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    ...Platform.select({
      web: { boxShadow: '0px 8px 16px rgba(99, 102, 241, 0.2)' }
    })
  }
};

export const Typography = {
  family: {
    regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    medium: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    bold: Platform.OS === 'ios' ? 'System' : 'sans-serif-bold',
    rounded: 'SF Pro Rounded', // Will fallback to system if not loaded
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  weight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  }
};
