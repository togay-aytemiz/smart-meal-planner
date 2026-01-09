export const animation = {
    duration: {
        fast: 150,
        normal: 250,
        slow: 400,
    },

    // For react-native-reanimated
    spring: {
        gentle: {
            damping: 20,
            stiffness: 100,
        },
        bouncy: {
            damping: 10,
            stiffness: 150,
        },
        stiff: {
            damping: 25,
            stiffness: 200,
        },
    },
} as const;
