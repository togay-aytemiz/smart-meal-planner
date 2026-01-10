import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { commonStyles } from '../../theme/common-styles';
import { colors } from '../../theme/colors';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: commonStyles.tabBar,
                tabBarActiveTintColor: colors.tabIconActive,
                tabBarInactiveTintColor: colors.tabIconInactive,
                tabBarLabelStyle: commonStyles.tabLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'My Menu',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialCommunityIcons
                            name={focused ? 'calendar-month' : 'calendar-month-outline'}
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="groceries"
                options={{
                    title: 'Groceries',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialCommunityIcons
                            name={focused ? 'cart' : 'cart-outline'}
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="cookbook"
                options={{
                    title: 'Cookbook',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialCommunityIcons
                            name={focused ? 'book-open-page-variant' : 'book-outline'}
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialCommunityIcons
                            name={focused ? 'account' : 'account-outline'}
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
