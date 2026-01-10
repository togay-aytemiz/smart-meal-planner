export const colors = {
    // Backgrounds
    background: '#F7EDE3',
    surface: '#FFF6EB',

    // Primary
    primary: '#F26B3A',
    primaryLight: '#FF8A5C',
    primaryDark: '#D4552A',

    // Accent
    accent: '#F0A24B',
    accentLight: '#F7C07B',

    // Text
    textPrimary: '#2B2420',
    textSecondary: '#6B5F57',
    textMuted: '#9B8F86',
    textInverse: '#FFFFFF',

    // Borders
    border: '#E7D9CC',
    borderLight: '#F2E7DC',

    // Status
    success: '#1E9E6D',
    successLight: '#DDF4EA',
    warning: '#E38A2E',
    warningLight: '#F8E4C8',
    error: '#E24D4D',
    errorLight: '#F8D6D6',

    // Misc
    overlay: 'rgba(0, 0, 0, 0.5)',
    transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
