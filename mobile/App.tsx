import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { Header } from './src/components/Header';
import { BottomNav, TabType } from './src/components/BottomNav';
import { HistoryView } from './src/views/HistoryView';
import { AddRefuelingView } from './src/views/AddRefuelingView';
import { EditRefuelingView } from './src/views/EditRefuelingView';
import { StatsView } from './src/views/StatsView';

const MainApp: React.FC = () => {
  const { theme, colors } = useTheme();
  const [currentTab, setCurrentTab] = useState<TabType>('history');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [carRefreshTrigger, setCarRefreshTrigger] = useState<number>(0);

  const handleRefreshCar = () => {
    setCarRefreshTrigger((prev) => prev + 1);
  };

  const handleSelectTab = (tab: TabType) => {
    setEditingId(null);
    setCurrentTab(tab);
  };

  const handleNavigateEdit = (id: number) => {
    setEditingId(id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgApp }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <Header refreshTrigger={carRefreshTrigger} />

      {/* Body Views */}
      <View style={styles.body}>
        {editingId != null ? (
          <EditRefuelingView
            id={editingId}
            onBack={() => setEditingId(null)}
            onSuccess={() => {
              setEditingId(null);
              handleRefreshCar();
              setCurrentTab('history');
            }}
          />
        ) : currentTab === 'history' ? (
          <HistoryView
            onNavigateAdd={() => setCurrentTab('add')}
            onNavigateEdit={handleNavigateEdit}
          />
        ) : currentTab === 'add' ? (
          <AddRefuelingView
            onSuccess={() => {
              handleRefreshCar();
              setCurrentTab('history');
            }}
          />
        ) : (
          <StatsView />
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNav currentTab={currentTab} onSelectTab={handleSelectTab} />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
