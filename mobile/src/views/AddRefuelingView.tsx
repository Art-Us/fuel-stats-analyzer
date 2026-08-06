import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {
  Camera,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  Fuel,
  Gauge,
  Save,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useScroll } from '../context/ScrollContext';
import { analyzePhotos, createRefueling, MobileImageFile } from '../services/api';

import { DatePickerModal } from '../components/DatePickerModal';

interface AddRefuelingViewProps {
  onSuccess: () => void;
}

export const AddRefuelingView: React.FC<AddRefuelingViewProps> = ({ onSuccess }) => {
  const { colors } = useTheme();
  const { getScrollY, setScrollY } = useScroll();

  // Form state
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [cost, setCost] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [pricePerLiter, setPricePerLiter] = useState<string>('');
  const [mileage, setMileage] = useState<string>('');
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [dashboardImageUrl, setDashboardImageUrl] = useState<string | null>(null);

  // Photos & Modals
  const [receiptFile, setReceiptFile] = useState<MobileImageFile | null>(null);
  const [dashboardFile, setDashboardFile] = useState<MobileImageFile | null>(null);
  const [activePhotoModal, setActivePhotoModal] = useState<'receipt' | 'dashboard' | null>(null);

  const photoSlideAnim = useRef(new Animated.Value(450)).current;

  const photoBackdropOpacity = photoSlideAnim.interpolate({
    inputRange: [0, 450],
    outputRange: [1, 0],
  });

  const handleClosePhotoModal = (callback?: () => void) => {
    Animated.timing(photoSlideAnim, {
      toValue: 450,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (callback) callback();
      setActivePhotoModal(null);
    });
  };

  useEffect(() => {
    if (activePhotoModal != null) {
      photoSlideAnim.setValue(450);
      Animated.timing(photoSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [activePhotoModal]);

  // Layout height calculation for dynamic scroll lock
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const needsScroll = contentHeight > containerHeight && containerHeight > 0;

  // Loading & Error States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCostOrLitersChange = (newCost: string, newLiters: string) => {
    const numCost = parseFloat(newCost);
    const numLiters = parseFloat(newLiters);
    if (!isNaN(numCost) && !isNaN(numLiters) && numLiters > 0) {
      setPricePerLiter((numCost / numLiters).toFixed(2));
    }
  };

  const processPhotosWithAI = async (
    rFile: MobileImageFile | null,
    dFile: MobileImageFile | null
  ) => {
    if (!rFile && !dFile) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setAiSuccessMsg(null);

      const result = await analyzePhotos(rFile, dFile);

      if (result.date) {
        const formattedDate = new Date(result.date).toISOString().split('T')[0];
        setDate(formattedDate);
      }
      if (result.cost != null) {
        setCost(result.cost.toString());
      }
      if (result.liters != null) {
        setLiters(result.liters.toString());
      }
      if (result.price_per_liter != null) {
        setPricePerLiter(result.price_per_liter.toString());
      } else if (result.cost != null && result.liters != null && result.liters > 0) {
        setPricePerLiter((result.cost / result.liters).toFixed(2));
      }
      if (result.mileage != null) {
        setMileage(result.mileage.toString());
      }
      if (result.receipt_image_url) {
        setReceiptImageUrl(result.receipt_image_url);
      }
      if (result.dashboard_image_url) {
        setDashboardImageUrl(result.dashboard_image_url);
      }

      setAiSuccessMsg('Dane ze zdjęć zostały automatycznie odczytane przez AI!');
    } catch (err) {
      console.error('Błąd podczas analizy AI:', err);
      setErrorMsg('Nie udało się przeanalizować zdjęć. Uzupełnij dane ręcznie.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async (target: 'receipt' | 'dashboard', useCamera: boolean) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        setErrorMsg(
          useCamera
            ? 'Brak dostępu do aparatu.'
            : 'Brak dostępu do galerii zdjęć.'
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileObj: MobileImageFile = {
          uri: asset.uri,
          name: asset.fileName || `${target}_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };

        if (target === 'receipt') {
          setReceiptFile(fileObj);
          processPhotosWithAI(fileObj, dashboardFile);
        } else {
          setDashboardFile(fileObj);
          processPhotosWithAI(receiptFile, fileObj);
        }
      }
    } catch (err) {
      console.error('Błąd wyboru zdjęcia:', err);
    } finally {
      setActivePhotoModal(null);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    const numCost = parseFloat(cost);
    const numLiters = parseFloat(liters);
    const numMileage = parseFloat(mileage);
    const numPrice = parseFloat(pricePerLiter);

    if (isNaN(numCost) || isNaN(numLiters) || isNaN(numMileage)) {
      setErrorMsg('Wypełnij wymagane pola: Kwota, Litry oraz Aktualny przebieg.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createRefueling({
        date: new Date(date).toISOString(),
        cost: numCost,
        liters: numLiters,
        price_per_liter: !isNaN(numPrice) ? numPrice : numCost / numLiters,
        mileage: numMileage,
        receipt_image_url: receiptImageUrl,
        dashboard_image_url: dashboardImageUrl,
      });

      onSuccess();
    } catch (err) {
      console.error('Błąd zapisu tankowania:', err);
      setErrorMsg('Nie udało się zapisać tankowania. Sprawdź poprawność danych.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.bgApp }]}
    >
      <ScrollView
        scrollEnabled={needsScroll}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: needsScroll ? 90 : 16 },
        ]}
        contentOffset={{ x: 0, y: getScrollY('add') }}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y, 'add')}
        scrollEventThrottle={16}
      >
        <Text style={[styles.title, { color: colors.textMain }]}>Dodaj nowe tankowanie</Text>

        {/* Photo Buttons Grid */}
        <View style={styles.photoGrid}>
          <TouchableOpacity
            style={[
              styles.photoBtn,
              {
                backgroundColor: colors.bgCardSecondary,
                borderColor: colors.accent,
              },
            ]}
            onPress={() => setActivePhotoModal('receipt')}
            disabled={isAnalyzing || isSubmitting}
            activeOpacity={0.8}
          >
            <Camera size={24} color={colors.primary} />
            <Text style={[styles.photoBtnText, { color: colors.primary }]}>
              {receiptFile ? '✓ Paragon dodany' : 'Zdjęcie: Paragon'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.photoBtn,
              {
                backgroundColor: colors.bgCardSecondary,
                borderColor: colors.accent,
              },
            ]}
            onPress={() => setActivePhotoModal('dashboard')}
            disabled={isAnalyzing || isSubmitting}
            activeOpacity={0.8}
          >
            <Camera size={24} color={colors.primary} />
            <Text style={[styles.photoBtnText, { color: colors.primary }]}>
              {dashboardFile ? '✓ Licznik dodany' : 'Zdjęcie: Licznik'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* AI Loading Banner */}
        {isAnalyzing && (
          <View style={[styles.aiBanner, { backgroundColor: colors.primaryLight }]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <View style={{ flex: 1 }}>
              <View style={styles.aiHeader}>
                <Sparkles size={16} color={colors.accent} />
                <Text style={[styles.aiTitle, { color: colors.primary }]}>
                  Analiza zdjęć przez AI...
                </Text>
              </View>
              <Text style={[styles.aiSub, { color: colors.textMuted }]}>
                Odczytywanie kwoty, litrów i przebiegu z obrazu
              </Text>
            </View>
          </View>
        )}

        {/* Feedback Banners */}
        {aiSuccessMsg && !isAnalyzing && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color="#059669" />
            <Text style={styles.successText}>{aiSuccessMsg}</Text>
          </View>
        )}

        {errorMsg && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={18} color="#dc2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>DATA TANKOWANIA</Text>
          <TouchableOpacity
            style={styles.inputWrapper}
            onPress={() => setIsDatePickerOpen(true)}
            activeOpacity={0.8}
          >
            <Calendar size={18} color={colors.primary} style={styles.inputIcon} />
            <View
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.borderColor,
                  justifyContent: 'center',
                },
              ]}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textMain }}>
                {date || 'Wybierz datę...'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <DatePickerModal
          visible={isDatePickerOpen}
          currentDate={date}
          onSelectDate={(newDate) => setDate(newDate)}
          onClose={() => setIsDatePickerOpen(false)}
        />

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>CAŁKOWITA KWOTA (PLN)</Text>
          <View style={styles.inputWrapper}>
            <DollarSign size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.borderColor,
                  color: colors.textMain,
                },
              ]}
              value={cost}
              onChangeText={(val) => {
                setCost(val);
                handleCostOrLitersChange(val, liters);
              }}
              keyboardType="numeric"
              placeholder="np. 185.50"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>ILOŚĆ LITRÓW (L)</Text>
          <View style={styles.inputWrapper}>
            <Fuel size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.borderColor,
                  color: colors.textMain,
                },
              ]}
              value={liters}
              onChangeText={(val) => {
                setLiters(val);
                handleCostOrLitersChange(cost, val);
              }}
              keyboardType="numeric"
              placeholder="np. 28.75"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>CENA ZA LITR (PLN/L)</Text>
          <View style={styles.inputWrapper}>
            <DollarSign size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.borderColor,
                  color: colors.textMain,
                },
              ]}
              value={pricePerLiter}
              onChangeText={setPricePerLiter}
              keyboardType="numeric"
              placeholder="np. 6.45"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>AKTUALNY PRZEBIEG (KM)</Text>
          <View style={styles.inputWrapper}>
            <Gauge size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.borderColor,
                  color: colors.textMain,
                },
              ]}
              value={mileage}
              onChangeText={setMileage}
              keyboardType="numeric"
              placeholder="np. 195439"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary },
            (isAnalyzing || isSubmitting) && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={isAnalyzing || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Zapisz tankowanie</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Source Picker */}
      <Modal
        visible={activePhotoModal != null}
        transparent
        animationType="none"
        onRequestClose={() => handleClosePhotoModal()}
      >
        <TouchableWithoutFeedback onPress={() => handleClosePhotoModal()}>
          <Animated.View style={[styles.modalOverlay, { opacity: photoBackdropOpacity }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalSheet,
                  {
                    backgroundColor: colors.bgCard,
                    transform: [{ translateY: photoSlideAnim }],
                  },
                ]}
              >
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                  {activePhotoModal === 'receipt' ? 'Zdjęcie paragonu' : 'Zdjęcie licznika'}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Wybierz opcję dodania zdjęcia do automatycznej analizy AI:
                </Text>

                <TouchableOpacity
                  style={[styles.modalOption, { backgroundColor: colors.bgCardSecondary }]}
                  onPress={() => activePhotoModal && handleClosePhotoModal(() => pickImage(activePhotoModal, true))}
                >
                  <Camera size={22} color={colors.primary} />
                  <Text style={[styles.modalOptionText, { color: colors.textMain }]}>
                    Zrób zdjęcie (Aparat)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalOption, { backgroundColor: colors.bgCardSecondary }]}
                  onPress={() => activePhotoModal && handleClosePhotoModal(() => pickImage(activePhotoModal, false))}
                >
                  <ImageIcon size={22} color={colors.primary} />
                  <Text style={[styles.modalOptionText, { color: colors.textMain }]}>
                    Wybierz gotowe zdjęcie (Galeria)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.bgApp }]}
                  onPress={() => handleClosePhotoModal()}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Anuluj</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoBtn: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiBanner: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  aiSub: {
    fontSize: 12,
    marginTop: 2,
  },
  successBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 2,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingLeft: 42,
    paddingRight: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 8,
  },
  modalOption: {
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelBtn: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
