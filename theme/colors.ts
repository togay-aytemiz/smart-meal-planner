export const colors = {
    // Backgrounds
    background: '#FAFAF9',
    surface: '#FFFFFF',

    // Primary
    primary: '#2D6A4F',
    primaryLight: '#40916C',
    primaryDark: '#1B4332',

    // Accent
    accent: '#E76F51',
    accentLight: '#F4A261',

    // Text
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',

    // Borders
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Status
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',

    // Misc
    overlay: 'rgba(0, 0, 0, 0.5)',
    transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
