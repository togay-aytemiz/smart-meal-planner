import { TextStyle } from 'react-native';

export const typography = {
    // Headings
    h1: {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 40,
    } as TextStyle,

    h2: {
        fontSize: 24,
        fontWeight: '600',
        lineHeight: 32,
    } as TextStyle,

    h3: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 28,
    } as TextStyle,

    // Body
    body: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
    } as TextStyle,

    bodySmall: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
    } as TextStyle,

    // UI Elements
    button: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 24,
    } as TextStyle,

    buttonSmall: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    } as TextStyle,

    caption: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
    } as TextStyle,

    label: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    } as TextStyle,

    // Special
    eyebrow: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    } as TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
