import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
  Calendar,
  DollarSign,
  Fuel,
  Gauge,
  Save,
  Trash2,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useScroll } from '../context/ScrollContext';
import {
  getRefuelingById,
  updateRefueling,
  deleteRefueling,
  analyzePhotos,
  MobileImageFile,
} from '../services/api';

import { DatePickerModal } from '../components/DatePickerModal';

interface EditRefuelingViewProps {
  id: number;
  onBack: () => void;
  onSuccess: () => void;
}

export const EditRefuelingView: React.FC<EditRefuelingViewProps> = ({
  id,
  onBack,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const { getScrollY, setScrollY } = useScroll();

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState<string>('');
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

  // UI States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    const fetchRefueling = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await getRefuelingById(id);

        const formattedDate = new Date(data.date).toISOString().split('T')[0];
        setDate(formattedDate);
        setCost(data.cost ? data.cost.toString() : '');
        setLiters(data.liters ? data.liters.toString() : '');
        setPricePerLiter(data.price_per_liter ? data.price_per_liter.toString() : '');
        setMileage(data.mileage ? data.mileage.toString() : '');
        setReceiptImageUrl(data.receipt_image_url || null);
        setDashboardImageUrl(data.dashboard_image_url || null);
      } catch (err) {
        console.error('Błąd podczas pobierania wpisu:', err);
        setErrorMsg('Nie udało się pobrać szczegółów tankowania.');
      } finally {
        setLoading(false);
      }
    };

    fetchRefueling();
  }, [id]);

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
      setSuccessMsg(null);

      const result = await analyzePhotos(rFile, dFile);

      if (result.date) {
        const formattedDate = new Date(result.date).toISOString().split('T')[0];
        setDate(formattedDate);
      }
      if (result.cost != null) setCost(result.cost.toString());
      if (result.liters != null) setLiters(result.liters.toString());
      if (result.price_per_liter != null) {
        setPricePerLiter(result.price_per_liter.toString());
      } else if (result.cost != null && result.liters != null && result.liters > 0) {
        setPricePerLiter((result.cost / result.liters).toFixed(2));
      }
      if (result.mileage != null) setMileage(result.mileage.toString());
      if (result.receipt_image_url) setReceiptImageUrl(result.receipt_image_url);
      if (result.dashboard_image_url) setDashboardImageUrl(result.dashboard_image_url);

      setSuccessMsg('Dane zostały zaktualizowane ze zdjęć przez AI!');
    } catch (err) {
      console.error('Błąd analizy AI:', err);
      setErrorMsg('Nie udało się przeanalizować zdjęć. Wprowadź dane ręcznie.');
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
          useCamera ? 'Brak dostępu do aparatu.' : 'Brak dostępu do galerii zdjęć.'
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
    setSuccessMsg(null);

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
      await updateRefueling(id, {
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
      console.error('Błąd aktualizacji tankowania:', err);
      setErrorMsg('Nie udało się zapisać zmian. Sprawdź dane.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteRefueling(id);
      onSuccess();
    } catch (err) {
      console.error('Błąd usuwania tankowania:', err);
      setErrorMsg('Nie udało się usunąć tankowania z bazy.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerBox, { backgroundColor: colors.bgApp }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Ładowanie danych...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.bgApp }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: getScrollY('edit') }}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y, 'edit')}
        scrollEventThrottle={16}
      >
        {/* Header Bar */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={colors.textMain} />
            <Text style={[styles.backBtnText, { color: colors.textMain }]}>Powrót</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textMain }]}>Edycja tankowania</Text>
        </View>

        {/* Photo Buttons */}
        <View style={styles.photoGrid}>
          <TouchableOpacity
            style={[
              styles.photoBtn,
              { backgroundColor: colors.bgCardSecondary, borderColor: colors.accent },
            ]}
            onPress={() => setActivePhotoModal('receipt')}
            disabled={isAnalyzing || isSubmitting}
            activeOpacity={0.8}
          >
            <Camera size={24} color={colors.primary} />
            <Text style={[styles.photoBtnText, { color: colors.primary }]}>
              {receiptFile ? '✓ Paragon zmieniony' : 'Zmień zdjęcie: Paragon'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.photoBtn,
              { backgroundColor: colors.bgCardSecondary, borderColor: colors.accent },
            ]}
            onPress={() => setActivePhotoModal('dashboard')}
            disabled={isAnalyzing || isSubmitting}
            activeOpacity={0.8}
          >
            <Camera size={24} color={colors.primary} />
            <Text style={[styles.photoBtnText, { color: colors.primary }]}>
              {dashboardFile ? '✓ Licznik zmieniony' : 'Zmień zdjęcie: Licznik'}
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
                  Analizowanie ze zdjęć...
                </Text>
              </View>
              <Text style={[styles.aiSub, { color: colors.textMuted }]}>
                Model AI odczytuje nowe dane z paragonu / licznika...
              </Text>
            </View>
          </View>
        )}

        {/* Success / Error Messages */}
        {successMsg && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color="#059669" />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {errorMsg && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#dc2626" />
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
          <Text style={[styles.label, { color: colors.textMuted }]}>KWOTA ZAPŁACONA (PLN)</Text>
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
              placeholder="np. 250.00"
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
              placeholder="np. 40.5"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>CENA ZA 1 LITR (PLN/L)</Text>
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
              placeholder="np. 6.17"
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
              placeholder="np. 125000"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              (isSubmitting || isAnalyzing) && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || isAnalyzing}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Zapisz zmiany</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: '#ef4444' }]}
            onPress={() => setShowDeleteConfirm(true)}
            disabled={isDeleting || isSubmitting}
            activeOpacity={0.8}
          >
            <Trash2 size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.deleteBtnText}>Usuń tankowanie z bazy</Text>
          </TouchableOpacity>
        </View>
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDeleteConfirm(false)}>
          <View style={styles.centerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.dialogCard, { backgroundColor: colors.bgCard }]}>
                <View style={styles.dialogHeader}>
                  <AlertTriangle size={28} color="#dc2626" />
                  <Text style={[styles.dialogTitle, { color: colors.textMain }]}>
                    Potwierdzenie usunięcia
                  </Text>
                </View>
                <Text style={[styles.dialogSub, { color: colors.textMuted }]}>
                  Czy na pewno chcesz usunąć to tankowanie z bazy danych? Ta operacja jest nieodwracalna.
                </Text>
                <View style={styles.dialogActions}>
                  <TouchableOpacity
                    style={[styles.dialogCancelBtn, { backgroundColor: colors.bgApp, borderColor: colors.borderColor }]}
                    onPress={() => setShowDeleteConfirm(false)}
                  >
                    <Text style={[styles.dialogCancelText, { color: colors.textMain }]}>
                      Anuluj
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dialogConfirmBtn}
                    onPress={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.dialogConfirmText}>Usuń</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
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
    paddingTop: 12,
    paddingBottom: 90,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  backBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  photoBtn: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 10,
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
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  successText: {
    color: '#166534',
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
    marginBottom: 12,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 12,
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
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  actionGrid: {
    gap: 10,
    marginTop: 10,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  deleteBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 15,
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
  centerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 14,
    elevation: 10,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  dialogSub: {
    fontSize: 14,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dialogCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dialogCancelText: {
    fontWeight: '700',
    fontSize: 14,
  },
  dialogConfirmBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dialogConfirmText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
