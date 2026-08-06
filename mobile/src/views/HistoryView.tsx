import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Plus, Fuel, AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useScroll } from '../context/ScrollContext';
import { useViewControl } from '../context/ViewControlContext';
import { getRefuelings } from '../services/api';
import { Refueling } from '../types/api';
import { RefuelingCard } from '../components/RefuelingCard';
import { VehicleCard } from '../components/Header';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HistoryViewProps {
  onNavigateAdd: () => void;
  onNavigateEdit: (id: number) => void;
  carRefreshTrigger?: number;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onNavigateAdd,
  onNavigateEdit,
  carRefreshTrigger = 0,
}) => {
  const { colors } = useTheme();
  const { getScrollY, setScrollY } = useScroll();
  const { cachedHistory, setCachedHistory } = useViewControl();
  const insets = useSafeAreaInsets();
  const [refuelings, setRefuelings] = useState<Refueling[]>(cachedHistory);
  const [loading, setLoading] = useState<boolean>(cachedHistory.length === 0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fabBottom = Math.max(insets.bottom, 16) + 68;

  const fetchHistory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (cachedHistory.length === 0) {
        setLoading(true);
      }
      setError(null);
      const data = await getRefuelings('all');
      setRefuelings(data);
      setCachedHistory(data);
    } catch (err) {
      console.error('Błąd podczas pobierania historii:', err);
      if (cachedHistory.length === 0) {
        setError('Nie udało się pobrać historii tankowań.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cachedHistory.length, setCachedHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Group by year and month
  const groupedRefuelings = refuelings.reduce((acc, item) => {
    const d = new Date(item.date);
    const monthYear = d.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(item);
    return acc;
  }, {} as Record<string, Refueling[]>);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgApp }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: getScrollY('history') }}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y, 'history')}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchHistory(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <VehicleCard refreshTrigger={carRefreshTrigger} />
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Ładowanie historii...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <AlertCircle size={24} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Błąd</Text>
              <Text style={styles.errorSub}>{error}</Text>
            </View>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHistory()}>
              <RefreshCw size={14} color="#ffffff" />
              <Text style={styles.retryText}>Odśwież</Text>
            </TouchableOpacity>
          </View>
        ) : refuelings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.primaryLight }]}>
              <Fuel size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
              Brak wpisów tankowania
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Kliknij przycisk poniżej, aby dodać pierwsze tankowanie ręcznie lub ze zdjęcia.
            </Text>
          </View>
        ) : (
          Object.entries(groupedRefuelings).map(([groupTitle, items]) => (
            <View key={groupTitle} style={styles.cardGroup}>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
                {groupTitle}
              </Text>
              {items.map((item) => (
                <RefuelingCard
                  key={item.id}
                  refueling={item}
                  onPress={() => onNavigateEdit(item.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: fabBottom }]}
        onPress={onNavigateAdd}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 8,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  errorTitle: {
    fontWeight: '700',
    color: '#991b1b',
    fontSize: 15,
  },
  errorSub: {
    fontSize: 13,
    color: '#991b1b',
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
  },
  cardGroup: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 10,
    paddingLeft: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 84,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
});
