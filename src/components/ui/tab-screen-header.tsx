import { type ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import ScreenHeader from './screen-header';

interface TabScreenHeaderProps {
    title: string;
    subtitle?: string;
    rightSlot?: ReactNode;
    style?: StyleProp<ViewStyle>;
    titleStyle?: StyleProp<TextStyle>;
    subtitleStyle?: StyleProp<TextStyle>;
}

export default function TabScreenHeader({
    title,
    subtitle,
    rightSlot,
    style,
    titleStyle,
    subtitleStyle,
}: TabScreenHeaderProps) {
    return (
        <ScreenHeader
            title={title}
            subtitle={subtitle}
            rightSlot={rightSlot}
            size="default"
            style={style}
            titleStyle={titleStyle}
            subtitleStyle={subtitleStyle}
        />
    );
}
