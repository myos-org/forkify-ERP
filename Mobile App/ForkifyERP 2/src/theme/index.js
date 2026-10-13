// src/theme/index.js — Klyro Unified Design System Tokens
export const Colors = {
  // Brand Palette — Midnight Navy & Electric Blue
  primary:      '#2563EB', // Primary electric blue
  primaryHover: '#1D4ED8', // Hover blue
  primaryDark:  '#1E40AF',
  primaryLight: '#EAF1FF', // Pale blue surface
  primaryMid:   '#3B82F6',

  // Structure & Navy
  navy:         '#101828', // Primary navy
  navyDark:     '#0B1220', // Dark theme background
  navyLight:    '#1D2939', // Elevated surface

  // Semantic Statuses
  success:      '#16A34A',
  successLight: '#DCFCE7',
  successDark:  '#15803D',
  danger:       '#DC2626',
  dangerLight:  '#FEE2E2',
  warning:      '#D97706',
  warningLight: '#FEF3C7',
  info:         '#2563EB',
  infoLight:    '#EAF1FF',

  // Light Theme Surfaces
  bg:           '#F8FAFC', // Main background
  bgAlt:        '#F1F5F9',
  card:         '#FFFFFF', // Card surface
  cardAlt:      '#F8FAFC',
  border:       '#E4E7EC', // Border neutral
  borderLight:  '#F2F4F7',

  // Typography
  text:         '#101828', // Primary text
  textSecondary:'#667085', // Secondary text
  textMuted:    '#98A2B3', // Disabled / muted text
  textLight:    '#D0D5DD',

  // Disabled States
  disabledSurface: '#F2F4F7',
  disabledText:    '#98A2B3',

  // Navigation
  navBg:        '#101828',
  navActive:    '#2563EB',
  navText:      'rgba(255,255,255,0.7)',
  navTextActive:'#FFFFFF',

  // Dark Theme Tokens
  dark: {
    bg:         '#0B1220',
    navBg:      '#101828',
    card:       '#182230',
    elevated:   '#1D2939',
    text:       '#F9FAFB',
    textMuted:  '#98A2B3',
    border:     '#344054',
    accent:     '#60A5FA',
  },

  // Gradients
  gradBlue:     ['#2563EB', '#3B82F6'],
  gradGreen:    ['#15803D', '#16A34A'],
  gradDark:     ['#101828', '#1E293B'],
  gradCard:     ['#FFFFFF', '#F8FAFC'],

  // Status Chips
  statusDraft:      '#FEF9C3', statusDraftText:   '#A16207',
  statusActive:     '#DCFCE7', statusActiveText:  '#15803D',
  statusArchived:   '#F1F5F9', statusArchivedText:'#64748B',
};

export const Typography = {
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   16,
  xl:   18,
  xxl:  22,
  h1:   28,
  h2:   24,
};

export const Radius = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  24,
  full: 999,
};

export const Shadow = {
  xs: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};
