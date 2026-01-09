import { colors } from './colors';
import { typography } from './typography';
import { spacing, radius, shadows } from './spacing';
import { animation } from './animation';

// Unified theme object for convenience
export const theme = {
    colors,
    typography,
    spacing,
    radius,
    shadows,
    animation,
} as const;
