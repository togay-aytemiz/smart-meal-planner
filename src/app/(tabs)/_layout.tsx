import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Bugün',
                    tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>📅</Text>,
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Keşfet',
                    tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>🔍</Text>,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>👤</Text>,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        height: 85,
        paddingTop: 8,
    },
    tabLabel: {
        ...typography.caption,
        marginBottom: 8,
    },
    tabIcon: {
        fontSize: 24,
    },
});
