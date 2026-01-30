import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabScreenHeader } from '../../components/ui';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useLanguage } from '../../contexts/language-context';

export default function DiscoverScreen() {
    const { t } = useLanguage();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <TabScreenHeader title={t('discover.title')} />

            <View style={styles.content}>
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderEmoji}>🔍</Text>
                    <Text style={styles.placeholderTitle}>{t('discover.placeholderTitle')}</Text>
                    <Text style={styles.placeholderText}>{t('discover.placeholderText')}</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderEmoji: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    placeholderTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    placeholderText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
