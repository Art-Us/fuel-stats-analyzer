import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import {
  DollarSign,
  Droplet,
  TrendingUp,
  AlertCircle,
  Fuel,
  Gauge,
  Zap,
} from 'lucide-react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Line as SvgLine,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { getStats, getRefuelings } from '../services/api';
import { StatsResponse, PeriodType, Refueling } from '../types/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CHART_HEIGHT = 205;

interface AreaChartItemProps {
  data: { label: string; fullDate?: string; value: number | null }[];
  strokeColor: string;
  gradientId: string;
  unit: string;
  colors: any;
}

const AreaChartItem: React.FC<AreaChartItemProps> = ({
  data,
  strokeColor,
  gradientId,
  unit,
  colors,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const validData = data.map((d, i) => ({ ...d, originalIdx: i })).filter((d) => d.value !== null);
  if (validData.length === 0) return null;

  const values = validData.map((d) => d.value as number);
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1 || 1;

  const paddingX = 30;
  const paddingY = 34;
  const chartW = CARD_WIDTH - 32 - paddingX * 2;
  const chartH = CHART_HEIGHT - paddingY * 2;

  const points = validData.map((d, idx) => {
    const x = paddingX + (validData.length > 1 ? (idx / (validData.length - 1)) * chartW : chartW / 2);
    const y = paddingY + chartH - ((d.value! - minVal) / (maxVal - minVal || 1)) * chartH;
    return { x, y, value: d.value!, label: d.label, fullDate: d.fullDate, index: idx };
  });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );

  const areaD = `${pathD} L ${points[points.length - 1].x} ${CHART_HEIGHT - paddingY} L ${points[0].x} ${CHART_HEIGHT - paddingY} Z`;

  const minDistanceX = 46;
  const visibleLabelIndices = new Set<number>();
  let lastX = -Infinity;

  points.forEach((p, idx) => {
    if (idx === 0) {
      visibleLabelIndices.add(idx);
      lastX = p.x;
      return;
    }
    if (idx === points.length - 1) {
      if (p.x - lastX >= minDistanceX) {
        visibleLabelIndices.add(idx);
      }
      return;
    }
    const lastPointX = points[points.length - 1].x;
    if (p.x - lastX >= minDistanceX && lastPointX - p.x >= minDistanceX) {
      visibleLabelIndices.add(idx);
      lastX = p.x;
    }
  });

  const activePoint = selectedIdx !== null && selectedIdx < points.length ? points[selectedIdx] : null;

  const handleTouch = (evt: GestureResponderEvent) => {
    const touchX = evt.nativeEvent.locationX;
    let closestIdx = -1;
    let minDistance = 40;

    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - touchX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    if (closestIdx !== -1) {
      setSelectedIdx(selectedIdx === closestIdx ? null : closestIdx);
    } else {
      setSelectedIdx(null);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleTouch}
      style={{ width: CARD_WIDTH - 32, height: CHART_HEIGHT }}
    >
      <Svg width={CARD_WIDTH - 32} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        <SvgLine
          x1={paddingX}
          y1={paddingY}
          x2={CARD_WIDTH - 32 - paddingX}
          y2={paddingY}
          stroke={colors.borderColor}
          strokeDasharray="4 4"
        />
        <SvgLine
          x1={paddingX}
          y1={paddingY + chartH / 2}
          x2={CARD_WIDTH - 32 - paddingX}
          y2={paddingY + chartH / 2}
          stroke={colors.borderColor}
          strokeDasharray="4 4"
        />
        <SvgLine
          x1={paddingX}
          y1={CHART_HEIGHT - paddingY}
          x2={CARD_WIDTH - 32 - paddingX}
          y2={CHART_HEIGHT - paddingY}
          stroke={colors.borderColor}
        />

        {/* Area & Line */}
        <Path d={areaD} fill={`url(#${gradientId})`} />
        <Path d={pathD} fill="none" stroke={strokeColor} strokeWidth={3} />

        {/* Guideline for active selected point */}
        {activePoint && (
          <SvgLine
            x1={activePoint.x}
            y1={paddingY - 5}
            x2={activePoint.x}
            y2={CHART_HEIGHT - paddingY}
            stroke={strokeColor}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        )}

        {/* Points & Date Labels */}
        {points.map((p, i) => {
          const isSelected = selectedIdx === i;
          const showLabel = visibleLabelIndices.has(i);
          return (
            <React.Fragment key={i}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={isSelected ? 6 : 4}
                fill={strokeColor}
                stroke="#ffffff"
                strokeWidth={isSelected ? 3 : 2}
              />

              {showLabel && (
                <SvgText
                  x={p.x}
                  y={CHART_HEIGHT - 4}
                  fontSize={10}
                  fill={isSelected ? colors.primary : colors.textMuted}
                  fontWeight={isSelected ? '700' : '400'}
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* Active Point Floating Tooltip Callout */}
        {activePoint && (() => {
          const dateStr = activePoint.fullDate || activePoint.label;
          const valStr = `${activePoint.value.toFixed(2)} ${unit}`;
          const boxWidth = Math.max(105, Math.max(dateStr.length * 6.5, valStr.length * 7.5) + 16);
          const boxHeight = 36;
          const boxX = Math.max(6, Math.min(CARD_WIDTH - 32 - boxWidth - 6, activePoint.x - boxWidth / 2));
          const boxY = Math.max(2, activePoint.y - 42);

          return (
            <React.Fragment>
              <Rect
                x={boxX}
                y={boxY}
                width={boxWidth}
                height={boxHeight}
                rx={8}
                fill={colors.bgCard}
                stroke={strokeColor}
                strokeWidth={1.5}
              />
              <SvgText
                x={boxX + boxWidth / 2}
                y={boxY + 14}
                fontSize={9.5}
                fontWeight="600"
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {dateStr}
              </SvgText>
              <SvgText
                x={boxX + boxWidth / 2}
                y={boxY + 28}
                fontSize={11.5}
                fontWeight="800"
                fill={colors.textMain}
                textAnchor="middle"
              >
                {valStr}
              </SvgText>
            </React.Fragment>
          );
        })()}
      </Svg>
    </TouchableOpacity>
  );
};

export const StatsView: React.FC = () => {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<PeriodType>('month');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [history, setHistory] = useState<Refueling[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, historyData] = await Promise.all([
          getStats(period),
          getRefuelings(period),
        ]);

        setStats(statsData);
        setHistory(historyData);
      } catch (err) {
        console.error('Błąd podczas pobierania statystyk:', err);
        setError('Nie udało się pobrać statystyk.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const chartData = history
    .slice()
    .reverse()
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString('pl-PL', { month: 'numeric', day: 'numeric' }),
      fullDate: new Date(item.date).toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' }),
      cost: item.cost,
      liters: item.liters,
      pricePerLiter: item.price_per_liter,
      mileage: item.mileage,
      l100km: item.stats?.fuel_consumption_l_per_100km ?? null,
      pricePerKm: item.stats?.cost_per_km ?? null,
      distance: item.stats?.distance ?? null,
    }));

  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [contentHeight, setContentHeight] = useState<number>(0);

  const needsScroll = contentHeight > 0 && containerHeight > 0 && contentHeight > containerHeight;
  const dynamicPaddingBottom = needsScroll ? 80 : 16;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgApp }]}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: dynamicPaddingBottom },
        ]}
        onContentSizeChange={(_w, h) => setContentHeight(h)}
        alwaysBounceVertical={needsScroll}
        showsVerticalScrollIndicator={needsScroll}
        overScrollMode={needsScroll ? 'auto' : 'never'}
        scrollEnabled={needsScroll}
      >
        <Text style={[styles.title, { color: colors.textMain }]}>Statystyki i Analiza</Text>

        {/* Period Tabs */}
        <View
          style={[
            styles.periodTabs,
            { backgroundColor: colors.bgCardSecondary, borderColor: colors.borderColor },
          ]}
        >
          <TouchableOpacity
            style={[styles.tabBtn, period === 'month' && [styles.tabActive, { backgroundColor: colors.bgCard }]]}
            onPress={() => setPeriod('month')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, period === 'month' ? { color: colors.primary } : { color: colors.textMuted }]}>
              Miesiąc
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, period === 'year' && [styles.tabActive, { backgroundColor: colors.bgCard }]]}
            onPress={() => setPeriod('year')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, period === 'year' ? { color: colors.primary } : { color: colors.textMuted }]}>
              Rok
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, period === 'all' && [styles.tabActive, { backgroundColor: colors.bgCard }]]}
            onPress={() => setPeriod('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, period === 'all' ? { color: colors.primary } : { color: colors.textMuted }]}>
              Wszystko
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Obliczanie podsumowania...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={24} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : stats ? (
          <>
            {/* KPI Cards Carousel */}
            <ScrollView
              horizontal
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + CARD_GAP}
              snapToAlignment="start"
              showsHorizontalScrollIndicator={false}
              style={styles.swiper}
              contentContainerStyle={styles.swiperContainer}
            >
              {/* Card 1 */}
              <View
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.bgCard, borderColor: colors.cardBorder },
                ]}
              >
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.textMuted }]}>Całkowity Koszt</Text>
                  <DollarSign color={colors.accent} size={24} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  {stats.total_cost.toFixed(2)} PLN
                </Text>
                <View style={[styles.kpiSubGrid, { backgroundColor: colors.statsBg }]}>
                  <View style={styles.kpiSubItem}>
                    <Text style={[styles.subLabel, { color: colors.textMuted }]}>Średnia cena/l</Text>
                    <Text style={[styles.subVal, { color: colors.textMain }]}>
                      {stats.average_price_per_liter.toFixed(2)} PLN
                    </Text>
                  </View>
                  <View style={styles.kpiSubItem}>
                    <Text style={[styles.subLabel, { color: colors.textMuted }]}>Liczba tankowań</Text>
                    <Text style={[styles.subVal, { color: colors.textMain }]}>
                      {stats.total_refuelings}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card 2 */}
              <View
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.bgCard, borderColor: colors.cardBorder },
                ]}
              >
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.textMuted }]}>
                    Efektywność i Zużycie
                  </Text>
                  <TrendingUp color="#10b981" size={24} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  {stats.average_fuel_consumption != null
                    ? `${stats.average_fuel_consumption.toFixed(2)} l/100km`
                    : 'b/d'}
                </Text>
                <View style={[styles.kpiSubGrid, { backgroundColor: colors.statsBg }]}>
                  <View style={styles.kpiSubItem}>
                    <Text style={[styles.subLabel, { color: colors.textMuted }]}>Średni koszt / 1 km</Text>
                    <Text style={[styles.subVal, { color: colors.textMain }]}>
                      {stats.average_price_per_km != null
                        ? `${stats.average_price_per_km.toFixed(2)} PLN`
                        : 'b/d'}
                    </Text>
                  </View>
                  <View style={styles.kpiSubItem}>
                    <Text style={[styles.subLabel, { color: colors.textMuted }]}>Pokonany dystans</Text>
                    <Text style={[styles.subVal, { color: colors.textMain }]}>
                      {stats.period_distance.toLocaleString('pl-PL')} km
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card 3 */}
              <View
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.bgCard, borderColor: colors.cardBorder, marginRight: 0 },
                ]}
              >
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: colors.textMuted }]}>
                    Łączne Litry Paliwa
                  </Text>
                  <Droplet color="#3b82f6" size={24} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  {stats.total_liters.toFixed(2)} l
                </Text>
                <View style={[styles.kpiSubGrid, { backgroundColor: colors.statsBg }]}>
                  <View style={styles.kpiSubItem}>
                    <Text style={[styles.subLabel, { color: colors.textMuted }]}>Dystans w okresie</Text>
                    <Text style={[styles.subVal, { color: colors.textMain }]}>
                      {stats.period_distance.toLocaleString('pl-PL')} km
                    </Text>
                  </View>
                  <View style={styles.kpiSubItem}>
                    <Text style={[styles.subLabel, { color: colors.textMuted }]}>Średnie zatankowanie</Text>
                    <Text style={[styles.subVal, { color: colors.textMain }]}>
                      {stats.total_refuelings > 0
                        ? (stats.total_liters / stats.total_refuelings).toFixed(1)
                        : 0}{' '}
                      l
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Charts Carousel */}
            {chartData.length === 0 ? (
              <View style={[styles.chartCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
                <Text style={[styles.noChartText, { color: colors.textMuted }]}>
                  Brak wystarczających danych do wygenerowania wykresów dla wskazanego okresu.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + CARD_GAP}
                snapToAlignment="start"
                showsHorizontalScrollIndicator={false}
                style={styles.swiper}
                contentContainerStyle={styles.swiperContainer}
              >
                {/* Chart 1: Trend Wydatków */}
                <View
                  style={[
                    styles.chartCard,
                    { backgroundColor: colors.bgCard, borderColor: colors.borderColor },
                  ]}
                >
                  <View style={styles.chartHeader}>
                    <View style={styles.chartTitleBox}>
                      <View style={[styles.iconBox, { backgroundColor: colors.bgCardSecondary }]}>
                        <DollarSign size={18} color="#2563eb" />
                      </View>
                      <View>
                        <Text style={[styles.chartTitle, { color: colors.textMain }]}>
                          Trend Wydatków
                        </Text>
                        <Text style={[styles.chartSub, { color: colors.textMuted }]}>
                          Koszt poszczególnych tankowań
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.bgCardSecondary }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {stats.total_cost.toFixed(2)} PLN
                      </Text>
                    </View>
                  </View>

                  <AreaChartItem
                    data={chartData.map((d) => ({ label: d.date, fullDate: d.fullDate, value: d.cost }))}
                    strokeColor="#2563eb"
                    gradientId="gradCost"
                    unit="PLN"
                    colors={colors}
                  />
                </View>

                {/* Chart 2: Efektywność Paliwowa */}
                <View
                  style={[
                    styles.chartCard,
                    { backgroundColor: colors.bgCard, borderColor: colors.borderColor },
                  ]}
                >
                  <View style={styles.chartHeader}>
                    <View style={styles.chartTitleBox}>
                      <View style={[styles.iconBox, { backgroundColor: colors.bgCardSecondary }]}>
                        <Gauge size={18} color="#10b981" />
                      </View>
                      <View>
                        <Text style={[styles.chartTitle, { color: colors.textMain }]}>
                          Efektywność Paliwowa
                        </Text>
                        <Text style={[styles.chartSub, { color: colors.textMuted }]}>
                          Zużycie paliwa w l/100km
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.bgCardSecondary }]}>
                      <Text style={[styles.badgeText, { color: '#10b981' }]}>
                        {stats.average_fuel_consumption != null
                          ? `${stats.average_fuel_consumption.toFixed(2)} l/100km`
                          : 'b/d'}
                      </Text>
                    </View>
                  </View>

                  <AreaChartItem
                    data={chartData.map((d) => ({ label: d.date, fullDate: d.fullDate, value: d.l100km }))}
                    strokeColor="#10b981"
                    gradientId="gradL100"
                    unit="l/100km"
                    colors={colors}
                  />
                </View>

                {/* Chart 3: Cena za Litr */}
                <View
                  style={[
                    styles.chartCard,
                    { backgroundColor: colors.bgCard, borderColor: colors.borderColor },
                  ]}
                >
                  <View style={styles.chartHeader}>
                    <View style={styles.chartTitleBox}>
                      <View style={[styles.iconBox, { backgroundColor: colors.bgCardSecondary }]}>
                        <Fuel size={18} color="#f59e0b" />
                      </View>
                      <View>
                        <Text style={[styles.chartTitle, { color: colors.textMain }]}>
                          Cena Paliwa na Stacji
                        </Text>
                        <Text style={[styles.chartSub, { color: colors.textMuted }]}>
                          Zmienność ceny za 1 litr (PLN/l)
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.bgCardSecondary }]}>
                      <Text style={[styles.badgeText, { color: '#d97706' }]}>
                        Śr: {stats.average_price_per_liter.toFixed(2)} PLN/l
                      </Text>
                    </View>
                  </View>

                  <AreaChartItem
                    data={chartData.map((d) => ({ label: d.date, fullDate: d.fullDate, value: d.pricePerLiter }))}
                    strokeColor="#f59e0b"
                    gradientId="gradPrice"
                    unit="PLN/l"
                    colors={colors}
                  />
                </View>

                {/* Chart 4: Koszt Przejechania 1 km */}
                <View
                  style={[
                    styles.chartCard,
                    { backgroundColor: colors.bgCard, borderColor: colors.borderColor, marginRight: 0 },
                  ]}
                >
                  <View style={styles.chartHeader}>
                    <View style={styles.chartTitleBox}>
                      <View style={[styles.iconBox, { backgroundColor: colors.bgCardSecondary }]}>
                        <Zap size={18} color="#8b5cf6" />
                      </View>
                      <View>
                        <Text style={[styles.chartTitle, { color: colors.textMain }]}>
                          Koszt Przejechania 1 km
                        </Text>
                        <Text style={[styles.chartSub, { color: colors.textMuted }]}>
                          Wydatek na kilometr (PLN/km)
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.bgCardSecondary }]}>
                      <Text style={[styles.badgeText, { color: '#7c3aed' }]}>
                        {stats.average_price_per_km != null
                          ? `${stats.average_price_per_km.toFixed(2)} PLN`
                          : 'b/d'}
                      </Text>
                    </View>
                  </View>

                  <AreaChartItem
                    data={chartData.map((d) => ({ label: d.date, fullDate: d.fullDate, value: d.pricePerKm }))}
                    strokeColor="#8b5cf6"
                    gradientId="gradKmCost"
                    unit="PLN/km"
                    colors={colors}
                  />
                </View>
              </ScrollView>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  periodTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 4,
    borderRadius: 14,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '600',
  },
  swiper: {
    marginHorizontal: -20,
    marginBottom: 20,
  },
  swiperContainer: {
    paddingHorizontal: 20,
  },
  kpiCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 16,
    marginRight: CARD_GAP,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  kpiSubGrid: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  kpiSubItem: {
    flex: 1,
    gap: 2,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  subVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginRight: CARD_GAP,
    gap: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  chartSub: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noChartText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
