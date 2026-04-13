/**
 * Improved theme with health-app color palette and typography
 */

import { Platform } from 'react-native';

const tintColorLight = '#2563EB';
const tintColorDark = '#3B82F6';

export const Colors = {
  light: {
    text: '#1E293B',
    textSecondary: '#64748B',
    background: '#F8FAFC',
    tint: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    primary: '#2563EB',
    primaryLight: '#DBEAFE',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    card: '#FFFFFF',
    border: '#E2E8F0',
    notification: '#F43F5E',
    calories: '#F59E0B',
    protein: '#10B981',
    carbs: '#3B82F6',
    fat: '#F43F5E',
    gradientStart: '#3B82F6',
    gradientEnd: '#1D4ED8',
    overlay: 'rgba(255, 255, 255, 0.8)',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
    primary: '#3B82F6',
    primaryLight: '#1E3A8A',
    success: '#10B981',
    successLight: '#064E3B',
    warning: '#F59E0B',
    warningLight: '#78350F',
    error: '#EF4444',
    errorLight: '#7F1D1D',
    card: '#1E293B',
    border: '#334155',
    notification: '#F43F5E',
    calories: '#F59E0B',
    protein: '#10B981',
    carbs: '#3B82F6',
    fat: '#F43F5E',
    overlay: 'rgba(15, 23, 42, 0.8)',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Courier',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "system-ui, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }
    }),
  },
  md: {
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
      }
    }),
  },
  lg: {
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }
    }),
  },
};
