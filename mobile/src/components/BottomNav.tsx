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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Safe area bottom inset for gesture navigation bar / home indicator
  const safeBottom = Math.max(insets.bottom, 16);

  return (
    <View
      style={[
        styles.navContainer,
        {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.borderColor,
          paddingBottom: safeBottom,
          height: 58 + safeBottom,
        },
      ]}
    >
      {/* Historia */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectTab('history')}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.iconWrapper,
            currentTab === 'history' && { backgroundColor: colors.primary },
          ]}
        >
          <History
            size={20}
            color={currentTab === 'history' ? '#ffffff' : colors.textMuted}
          />
        </View>
        <Text
          style={[
            styles.navText,
            { color: currentTab === 'history' ? colors.primary : colors.textMuted },
          ]}
        >
          Historia
        </Text>
      </TouchableOpacity>

      {/* Dodaj */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectTab('add')}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.iconWrapper,
            currentTab === 'add' && { backgroundColor: colors.primary },
          ]}
        >
          <PlusCircle
            size={20}
            color={currentTab === 'add' ? '#ffffff' : colors.textMuted}
          />
        </View>
        <Text
          style={[
            styles.navText,
            { color: currentTab === 'add' ? colors.primary : colors.textMuted },
          ]}
        >
          Dodaj
        </Text>
      </TouchableOpacity>

      {/* Statystyki */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectTab('stats')}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.iconWrapper,
            currentTab === 'stats' && { backgroundColor: colors.primary },
          ]}
        >
          <BarChart2
            size={20}
            color={currentTab === 'stats' ? '#ffffff' : colors.textMuted}
          />
        </View>
        <Text
          style={[
            styles.navText,
            { color: currentTab === 'stats' ? colors.primary : colors.textMuted },
          ]}
        >
          Statystyki
        </Text>
      </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingTop: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 16,
  },
  iconWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
