/**
 * Calm UI Theme - Neurodivergent-friendly design system
 * High contrast, reduced motion, clear hierarchy
 */

import { Platform } from 'react-native';

export const CalmColors = {
  light: {
    // Backgrounds - soft, not stark white
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Text - high contrast, readable
    text: '#1A1A1A',
    textSecondary: '#4A4A4A',
    textTertiary: '#6A6A6A',
    
    // Primary actions - calming blue-green
    primary: '#2D7A8F',
    primaryLight: '#4A9BAF',
    primaryDark: '#1A5A6F',
    
    // Success/completion - gentle green
    success: '#3A8F3D',
    successLight: '#5AAF5D',
    
    // Warning/attention - warm orange (not aggressive red)
    warning: '#D97706',
    warningLight: '#F59E0B',
    
    // Error - soft red
    error: '#C53030',
    errorLight: '#E53E3E',
    
    // Neutrals
    border: '#E2E8F0',
    borderLight: '#F0F4F8',
    disabled: '#CBD5E0',
    
    // Focus states - clear, high contrast
    focusRing: '#2D7A8F',
    
    // Sensory-friendly overlays
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayLight: 'rgba(0, 0, 0, 0.2)',
  },
  dark: {
    // Backgrounds - true dark, not gray
    background: '#0F1419',
    surface: '#1A1F2E',
    surfaceElevated: '#242936',
    
    // Text - reduced brightness to avoid glare
    text: '#E8E8E8',
    textSecondary: '#B8B8B8',
    textTertiary: '#888888',
    
    // Primary actions
    primary: '#4A9BAF',
    primaryLight: '#6ABCCF',
    primaryDark: '#2D7A8F',
    
    // Success
    success: '#5AAF5D',
    successLight: '#7ACF7D',
    
    // Warning
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    
    // Error
    error: '#E53E3E',
    errorLight: '#FC8181',
    
    // Neutrals
    border: '#334155',
    borderLight: '#475569',
    disabled: '#475569',
    
    // Focus
    focusRing: '#4A9BAF',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
  },
};

export const CalmSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Larger touch targets for reduced motor precision
  minTouchTarget: 48,
  comfortableTouchTarget: 56,
};

export const CalmTypography = {
  // Larger base sizes for readability
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  fontFamily: Platform.select({
    ios: {
      sans: 'System',
      rounded: 'SF Rounded',
      mono: 'Menlo',
    },
    android: {
      sans: 'Roboto',
      rounded: 'sans-serif',
      mono: 'monospace',
    },
    default: {
      sans: 'System',
      rounded: 'System',
      mono: 'monospace',
    },
  }),
};

export const CalmBorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const CalmShadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

/**
 * Animation durations - can be reduced to 0 for reduced motion
 */
export const CalmAnimation = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    standard: 'ease-in-out',
    enter: 'ease-out',
    exit: 'ease-in',
  },
};

/**
 * Accessibility - WCAG AAA compliant
 */
export const CalmAccessibility = {
  minContrastRatio: 7, // AAA standard
  minTouchTarget: 48,
  focusIndicatorWidth: 3,
};
