// 4px base unit spacing system
export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
} as const;

// Border radius
export const radius = {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
} as const;

// Shadows
export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
    },
} as const;

// Touch target minimum size
export const hitSlop = {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
};

export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;
export type ShadowKey = keyof typeof shadows;
