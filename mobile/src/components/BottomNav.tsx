import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { History, PlusCircle, BarChart2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export type TabType = 'history' | 'add' | 'stats';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Safe area bottom inset for gesture navigation bar / home indicator
  const safeBottom = Math.max(insets.bottom, 14);

  const tabs: { key: TabType; label: string; Icon: React.ComponentType<{ size: number; color: string }> }[] = [
    { key: 'history', label: 'Historia', Icon: History },
    { key: 'add', label: 'Dodaj', Icon: PlusCircle },
    { key: 'stats', label: 'Statystyki', Icon: BarChart2 },
  ];

  return (
    <View
      style={[
        styles.navContainer,
        {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.borderColor,
          paddingBottom: safeBottom,
          height: 60 + safeBottom,
        },
      ]}
    >
      {tabs.map(({ key, label, Icon }) => {
        const isActive = currentTab === key;
        const activeBg = theme === 'dark' ? 'rgba(37, 99, 235, 0.22)' : 'rgba(37, 99, 235, 0.1)';
        const activeIconColor = colors.accent || colors.primary;
        const activeTextColor = colors.accent || colors.primary;

        return (
          <TouchableOpacity
            key={key}
            style={styles.navItem}
            onPress={() => onSelectTab(key)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconWrapper,
                isActive && {
                  backgroundColor: activeBg,
                  borderRadius: 20,
                  overflow: 'hidden',
                },
              ]}
            >
              <Icon
                size={21}
                color={isActive ? activeIconColor : colors.textMuted}
              />
            </View>
            <Text
              style={[
                styles.navText,
                {
                  color: isActive ? activeTextColor : colors.textMuted,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
  },
  iconWrapper: {
    paddingHorizontal: 18,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 11.5,
  },
});
