import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ScrollProvider } from './src/context/ScrollContext';
import { ViewControlProvider } from './src/context/ViewControlContext';
import { Header } from './src/components/Header';
import { BottomNav, TabType } from './src/components/BottomNav';
import { HistoryView } from './src/views/HistoryView';
import { AddRefuelingView } from './src/views/AddRefuelingView';
import { EditRefuelingView } from './src/views/EditRefuelingView';
import { StatsView } from './src/views/StatsView';

interface AppContentProps {
  currentTab: TabType;
  editingId: number | null;
  carRefreshTrigger: number;
  onSelectTab: (tab: TabType) => void;
  onNavigateEdit: (id: number) => void;
  onBackEdit: () => void;
  onEditSuccess: () => void;
  onAddSuccess: () => void;
  onNavigateAdd: () => void;
}

const AppContent: React.FC<AppContentProps> = ({
  currentTab,
  editingId,
  carRefreshTrigger,
  onSelectTab,
  onNavigateEdit,
  onBackEdit,
  onEditSuccess,
  onAddSuccess,
  onNavigateAdd,
}) => {
  const { theme, colors } = useTheme();

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
            onBack={onBackEdit}
            onSuccess={onEditSuccess}
          />
        ) : currentTab === 'history' ? (
          <HistoryView
            onNavigateAdd={onNavigateAdd}
            onNavigateEdit={onNavigateEdit}
          />
        ) : currentTab === 'add' ? (
          <AddRefuelingView onSuccess={onAddSuccess} />
        ) : (
          <StatsView />
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNav currentTab={currentTab} onSelectTab={onSelectTab} />
    </SafeAreaView>
  );
};

export default function App() {
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
    <SafeAreaProvider>
      <ViewControlProvider>
        <ScrollProvider>
          <ThemeProvider>
            <AppContent
              currentTab={currentTab}
              editingId={editingId}
              carRefreshTrigger={carRefreshTrigger}
              onSelectTab={handleSelectTab}
              onNavigateEdit={handleNavigateEdit}
              onBackEdit={() => setEditingId(null)}
              onEditSuccess={() => {
                setEditingId(null);
                handleRefreshCar();
                setCurrentTab('history');
              }}
              onAddSuccess={() => {
                handleRefreshCar();
                setCurrentTab('history');
              }}
              onNavigateAdd={() => setCurrentTab('add')}
            />
          </ThemeProvider>
        </ScrollProvider>
      </ViewControlProvider>
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
