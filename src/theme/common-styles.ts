import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';
import { spacing, radius, shadows } from './spacing';

// Common reusable styles for components
export const commonStyles = StyleSheet.create({
    // ═══════════════════════════════════════════════
    // CONTAINERS
    // ═══════════════════════════════════════════════

    screenContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },

    contentContainer: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },

    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadows.md,
    },

    cardSmall: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        ...shadows.sm,
    },

    // ═══════════════════════════════════════════════
    // HEADERS
    // ═══════════════════════════════════════════════

    screenHeader: {
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
    },

    headerTitle: {
        ...typography.h1,
        color: colors.textPrimary,
    },

    headerSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },

    sectionHeader: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },

    // ═══════════════════════════════════════════════
    // INPUTS
    // ═══════════════════════════════════════════════

    inputContainer: {
        marginBottom: spacing.md,
    },

    inputLabel: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 4, // 12px
        ...typography.body,
        color: colors.textPrimary,
    },

    inputFocused: {
        borderColor: colors.primary,
        borderWidth: 2,
    },

    inputError: {
        borderColor: colors.error,
    },

    inputErrorText: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xs,
    },

    inputPlaceholder: {
        color: colors.textMuted,
    },

    // ═══════════════════════════════════════════════
    // BUTTONS
    // ═══════════════════════════════════════════════

    buttonPrimary: {
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },

    buttonPrimaryText: {
        ...typography.button,
        color: colors.textInverse,
    },

    buttonSecondary: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },

    buttonSecondaryText: {
        ...typography.button,
        color: colors.textPrimary,
    },

    buttonGhost: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },

    buttonGhostText: {
        ...typography.button,
        color: colors.primary,
    },

    buttonDisabled: {
        opacity: 0.5,
    },

    // ═══════════════════════════════════════════════
    // TAGS / CHIPS
    // ═══════════════════════════════════════════════

    tag: {
        backgroundColor: colors.borderLight,
        borderRadius: radius.full,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
    },

    tagText: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    tagSelected: {
        backgroundColor: colors.primary,
    },

    tagSelectedText: {
        ...typography.caption,
        color: colors.textInverse,
    },

    // ═══════════════════════════════════════════════
    // DIVIDERS
    // ═══════════════════════════════════════════════

    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },

    dividerThick: {
        height: 8,
        backgroundColor: colors.background,
    },

    // ═══════════════════════════════════════════════
    // ROW LAYOUTS
    // ═══════════════════════════════════════════════

    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    rowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ═══════════════════════════════════════════════
    // SAFE AREAS
    // ═══════════════════════════════════════════════

    safeBottom: {
        paddingBottom: spacing.xxl,
    },

    fixedBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
        paddingTop: spacing.md,
        backgroundColor: colors.background,
    },
});
