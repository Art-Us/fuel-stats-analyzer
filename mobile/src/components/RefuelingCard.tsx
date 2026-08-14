import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Fuel, Droplet, TrendingUp, Coins, Info, Camera } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Refueling } from '../types/api';

interface RefuelingCardProps {
  refueling: Refueling;
  onPress: () => void;
}

export const RefuelingCard: React.FC<RefuelingCardProps> = ({ refueling, onPress }) => {
  const { colors, theme } = useTheme();
  const { date, cost, liters, price_per_liter, mileage, stats } = refueling;

  const formattedDate = new Date(date).toISOString().split('T')[0];
  const hasStats = stats?.fuel_consumption_l_per_100km != null || stats?.cost_per_km != null;

  const badgeBg = theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4';
  const badgeBorder = theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0';
  const badgeTextColor = theme === 'dark' ? '#34d399' : '#15803d';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.cardBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: colors.bgApp }]}>
          <Fuel size={20} color={colors.textMain} />
        </View>

        <View style={styles.mainInfo}>
          <View style={styles.leftCol}>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{formattedDate}</Text>
            <Text style={[styles.costText, { color: colors.primary }]}>{cost.toFixed(2)} PLN</Text>
          </View>

          <View style={styles.rightCol}>
            <Text style={[styles.mileageText, { color: colors.textMain }]}>
              {mileage.toLocaleString('pl-PL')} km
            </Text>
            {stats?.distance && stats.distance > 0 ? (
              <View
                style={[
                  styles.deltaBadge,
                  {
                    backgroundColor: badgeBg,
                    borderColor: badgeBorder,
                  },
                ]}
              >
                <Text style={[styles.deltaText, { color: badgeTextColor }]}>
                  +{stats.distance} km
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Details Row */}
      <View style={styles.detailsRow}>
        <Droplet size={15} color={colors.accent} />
        <Text style={[styles.detailsText, { color: colors.textMuted }]}>
          {liters.toFixed(2)} l  →  {price_per_liter ? `${price_per_liter.toFixed(2)} PLN/l` : ''}
        </Text>
        {(refueling.receipt_image_url || refueling.dashboard_image_url) && (
          <View style={[styles.photoBadge, { backgroundColor: colors.bgCardSecondary }]}>
            <Camera size={13} color={colors.primary} />
            <Text style={[styles.photoBadgeText, { color: colors.primary }]}>
              {refueling.receipt_image_url && refueling.dashboard_image_url ? '2 zdjęcia' : '1 zdjęcie'}
            </Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />

      {/* Stats Row */}
      <View style={[styles.statsRow, { backgroundColor: colors.statsBg }]}>
        {hasStats ? (
          <>
            {stats?.fuel_consumption_l_per_100km != null && (
              <View style={styles.statItem}>
                <TrendingUp size={14} color={colors.textMuted} />
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  l/100km: <Text style={[styles.statVal, { color: colors.textMain }]}>{stats.fuel_consumption_l_per_100km.toFixed(2)}</Text>
                </Text>
              </View>
            )}
            {stats?.cost_per_km != null && (
              <View style={styles.statItem}>
                <Coins size={14} color={colors.textMuted} />
                <Text style={[styles.statVal, { color: colors.textMain }]}>
                  {stats.cost_per_km.toFixed(2)} PLN/km
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.statItem}>
            <Info size={14} color={colors.textMuted} />
            <Text style={[styles.firstRefuelingText, { color: colors.textMuted }]}>
              Pierwsze tankowanie
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftCol: {
    gap: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  costText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  mileageText: {
    fontSize: 15,
    fontWeight: '700',
  },
  deltaBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deltaText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statVal: {
    fontWeight: '700',
    fontSize: 13,
  },
  firstRefuelingText: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 'auto',
  },
  photoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
