export const colors = {
    // Backgrounds
    background: '#F6EFE7',
    surface: '#FFF7EE',
    surfaceAlt: '#FDF1E4',
    surfaceMuted: '#F4E6D9',

    // Primary
    primary: '#F46C42',
    primaryLight: '#FF8A63',
    primaryDark: '#D5522E',

    // Accent
    accent: '#F2A24A',
    accentLight: '#F7C47E',
    accentSoft: '#FBE3C7',

    // Text
    textPrimary: '#2A241F',
    textSecondary: '#6E6159',
    textMuted: '#9C8F87',
    textInverse: '#FFFFFF',
    textOnPrimary: '#FFF6F0',

    // Borders
    border: '#E6D8CB',
    borderLight: '#F3E8DD',
    borderStrong: '#D9C7B8',

    // Status
    success: '#1E9E6D',
    successLight: '#DCF3E9',
    warning: '#E38A2E',
    warningLight: '#F8E4C8',
    error: '#E24D4D',
    errorLight: '#F7D6D6',

    // Misc
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(42, 36, 31, 0.08)',
    heroScrim: 'rgba(24, 20, 18, 0.35)',
    glassSurface: 'rgba(255, 247, 238, 0.92)',
    glassBorder: 'rgba(255, 255, 255, 0.7)',
    liveBadge: '#F0554A',
    transparent: 'transparent',
    tabBarBackground: '#F6EFE7',
    tabBarBorder: '#E7D8CC',
    tabIconActive: '#F46C42',
    tabIconInactive: '#FFAA8F',
    iconPrimary: '#F46C42',
    iconMuted: '#9C8F87',
} as const;

export type ColorKey = keyof typeof colors;
