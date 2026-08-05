export interface ThemeColors {
  bgApp: string;
  bgCard: string;
  bgCardSecondary: string;
  primary: string;
  primaryLight: string;
  primaryHover: string;
  accent: string;
  textMain: string;
  textMuted: string;
  textLight: string;
  borderColor: string;
  success: string;
  danger: string;
  cardBorder: string;
  statsBg: string;
}

export const lightColors: ThemeColors = {
  bgApp: '#f4f6fc',
  bgCard: '#ffffff',
  bgCardSecondary: '#eef2fb',
  primary: '#1e3a8a',
  primaryLight: '#eff6ff',
  primaryHover: '#1d4ed8',
  accent: '#2563eb',
  textMain: '#0f172a',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  borderColor: '#e2e8f0',
  success: '#10b981',
  danger: '#ef4444',
  cardBorder: 'rgba(226, 232, 240, 0.8)',
  statsBg: '#f8fafc',
};

export const darkColors: ThemeColors = {
  bgApp: '#0b1120',
  bgCard: '#151e32',
  bgCardSecondary: '#0f172a',
  primary: '#2563eb',
  primaryLight: 'rgba(37, 99, 235, 0.18)',
  primaryHover: '#1d4ed8',
  accent: '#3b82f6',
  textMain: '#f1f5f9',
  textMuted: '#94a3b8',
  textLight: '#64748b',
  borderColor: '#232f48',
  success: '#10b981',
  danger: '#ef4444',
  cardBorder: '#232f48',
  statsBg: '#0f172a',
};
