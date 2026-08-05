import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  Animated,
} from 'react-native';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface DatePickerModalProps {
  visible: boolean;
  currentDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  currentDate,
  onSelectDate,
  onClose,
}) => {
  const { colors } = useTheme();

  const slideAnim = useRef(new Animated.Value(450)).current;

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 450],
    outputRange: [1, 0],
  });

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(450);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Parse initial date
  const initialDateObj = () => {
    const parts = currentDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    return new Date();
  };

  const parsed = initialDateObj();
  const [viewYear, setViewYear] = useState<number>(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed.getMonth()); // 0-11

  // Handle month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generate days grid
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 = Pn, 6 = Nd
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOfWeek(viewYear, viewMonth);

  const handleCloseWithAnimation = (callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 450,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (callback) callback();
      onClose();
    });
  };

  const handleDayClick = (dayNum: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    const formatted = `${viewYear}-${mm}-${dd}`;
    handleCloseWithAnimation(() => onSelectDate(formatted));
  };

  const handleSetToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    handleCloseWithAnimation(() => onSelectDate(formatted));
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    handleCloseWithAnimation(() => onSelectDate(formatted));
  };

  const selectedParts = currentDate.split('-');
  const selYear = parseInt(selectedParts[0], 10);
  const selMonth = parseInt(selectedParts[1], 10) - 1;
  const selDay = parseInt(selectedParts[2], 10);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => handleCloseWithAnimation()}
    >
      <TouchableWithoutFeedback onPress={() => handleCloseWithAnimation()}>
        <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.bgCard,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleBox}>
                  <CalendarIcon size={20} color={colors.primary} />
                  <Text style={[styles.title, { color: colors.textMain }]}>Wybierz datę</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleCloseWithAnimation()}
                  style={styles.closeBtn}
                >
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Quick Select Buttons */}
              <View style={styles.quickButtonsRow}>
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: colors.bgCardSecondary }]}
                  onPress={handleSetToday}
                >
                  <Text style={[styles.quickBtnText, { color: colors.primary }]}>Dzisiaj</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: colors.bgCardSecondary }]}
                  onPress={handleSetYesterday}
                >
                  <Text style={[styles.quickBtnText, { color: colors.textMain }]}>Wczoraj</Text>
                </TouchableOpacity>
              </View>

              {/* Month Header Navigation */}
              <View style={[styles.monthNav, { backgroundColor: colors.bgCardSecondary }]}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
                  <ChevronLeft size={22} color={colors.textMain} />
                </TouchableOpacity>

                <Text style={[styles.monthTitle, { color: colors.textMain }]}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
                  <ChevronRight size={22} color={colors.textMain} />
                </TouchableOpacity>
              </View>

              {/* Days of Week Header */}
              <View style={styles.weekHeader}>
                {DAY_LABELS.map((d) => (
                  <Text key={d} style={[styles.weekLabel, { color: colors.textMuted }]}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.grid}>
                {/* Empty offset cells */}
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected =
                    selYear === viewYear && selMonth === viewMonth && selDay === dayNum;

                  return (
                    <TouchableOpacity
                      key={dayNum}
                      style={[
                        styles.dayCell,
                        isSelected && [styles.selectedDayCell, { backgroundColor: colors.primary }],
                      ]}
                      onPress={() => handleDayClick(dayNum)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: isSelected ? '#ffffff' : colors.textMain },
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 14,
  },
  navArrowBtn: {
    padding: 6,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekLabel: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  selectedDayCell: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDayText: {
    fontWeight: '800',
  },
});
