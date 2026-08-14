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
  Image,
  Dimensions,
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
  X,
  Plus,
  Trash2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useScroll } from '../context/ScrollContext';
import { useViewControl } from '../context/ViewControlContext';
import { analyzePhotos, createRefueling, MobileImageFile, uploadPhotosFast, getRefuelings } from '../services/api';

import { DatePickerModal } from '../components/DatePickerModal';
import { VehicleCard } from '../components/Header';

// Stałe siatki zdjęć: 3 równe sloty na pełną szerokość
const GRID_GAP = 8;
const PHOTO_SLOT_W = Math.floor(
  (Dimensions.get('window').width - 40 - 2 * GRID_GAP) / 3
);
// Szerokość przycisku dodawania przy N wolnych slotach
const addBtnW = (n: number) => PHOTO_SLOT_W * n + GRID_GAP * (n - 1);

interface AddRefuelingViewProps {
  onSuccess: () => void;
  carRefreshTrigger?: number;
}

export const AddRefuelingView: React.FC<AddRefuelingViewProps> = ({ onSuccess, carRefreshTrigger = 0 }) => {
  const { colors } = useTheme();
  const { getScrollY, setScrollY } = useScroll();
  const { addFormDraft, setAddFormDraft, resetAddFormDraft } = useViewControl();

  const {
    date,
    cost,
    liters,
    pricePerLiter,
    mileage,
    photos,
    receiptImageUrl,
    dashboardImageUrl,
    hasAnalyzedCurrentPhotos,
  } = addFormDraft;

  const setDate = (val: string) => setAddFormDraft(prev => ({ ...prev, date: val }));
  const setCost = (val: string) => setAddFormDraft(prev => ({ ...prev, cost: val }));
  const setLiters = (val: string) => setAddFormDraft(prev => ({ ...prev, liters: val }));
  const setPricePerLiter = (val: string) => setAddFormDraft(prev => ({ ...prev, pricePerLiter: val }));
  const setMileage = (val: string) => setAddFormDraft(prev => ({ ...prev, mileage: val }));
  const setPhotos = (val: MobileImageFile[] | ((prev: MobileImageFile[]) => MobileImageFile[])) => {
    setAddFormDraft(prev => ({
      ...prev,
      photos: typeof val === 'function' ? val(prev.photos) : val,
    }));
  };
  const setReceiptImageUrl = (val: string | null) => setAddFormDraft(prev => ({ ...prev, receiptImageUrl: val }));
  const setDashboardImageUrl = (val: string | null) => setAddFormDraft(prev => ({ ...prev, dashboardImageUrl: val }));
  const setHasAnalyzedCurrentPhotos = (val: boolean) => setAddFormDraft(prev => ({ ...prev, hasAnalyzedCurrentPhotos: val }));

  // UI Modals state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [existingPhotosMap, setExistingPhotosMap] = useState<Map<string, { date: string; id: number }>>(new Map());

  // Pobranie listy istniejących tankowań aby weryfikować unikalność zdjęć
  useEffect(() => {
    const loadExistingPhotos = async () => {
      try {
        const list = await getRefuelings('all');
        const map = new Map<string, { date: string; id: number }>();
        list.forEach(r => {
          const rDate = new Date(r.date).toISOString().split('T')[0];
          if (r.receipt_image_url) {
            const raw = r.receipt_image_url.split('/').pop() || '';
            const clean = raw.includes('___') ? raw.split('___').slice(1).join('___') : raw;
            if (clean) map.set(clean.toLowerCase(), { date: rDate, id: r.id });
          }
          if (r.dashboard_image_url) {
            const raw = r.dashboard_image_url.split('/').pop() || '';
            const clean = raw.includes('___') ? raw.split('___').slice(1).join('___') : raw;
            if (clean) map.set(clean.toLowerCase(), { date: rDate, id: r.id });
          }
        });
        setExistingPhotosMap(map);
      } catch (_) {}
    };
    loadExistingPhotos();
  }, [carRefreshTrigger]);

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
      setIsPhotoModalOpen(false);
    });
  };

  useEffect(() => {
    if (isPhotoModalOpen) {
      photoSlideAnim.setValue(450);
      Animated.timing(photoSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isPhotoModalOpen]);

  // Loading & Error States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiCooldown, setAiCooldown] = useState<number>(0);

  // Timer cooldownu dla ponowienia analizy AI
  useEffect(() => {
    if (aiCooldown <= 0) return;
    const timer = setInterval(() => {
      setAiCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [aiCooldown]);

  const handleCostOrLitersChange = (newCost: string, newLiters: string) => {
    const numCost = parseFloat(newCost);
    const numLiters = parseFloat(newLiters);
    if (!isNaN(numCost) && !isNaN(numLiters) && numLiters > 0) {
      setPricePerLiter((numCost / numLiters).toFixed(2));
    }
  };

  const extractDeviceFileName = (asset: ImagePicker.ImagePickerAsset, fallbackPrefix = 'photo'): string => {
    if (asset.fileName && asset.fileName.trim().length > 0) {
      return asset.fileName.trim();
    }
    const uriParts = asset.uri.split('/');
    const lastPart = uriParts[uriParts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      try {
        return decodeURIComponent(lastPart.split('?')[0]);
      } catch (_) {
        return lastPart.split('?')[0];
      }
    }
    const ext = asset.mimeType?.split('/')[1] || 'jpg';
    const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
    return `${fallbackPrefix}_${Date.now()}.${cleanExt}`;
  };

  const checkDuplicateAsset = (
    asset: ImagePicker.ImagePickerAsset,
    currentPhotos: MobileImageFile[] = photos
  ): string | null => {
    const candidateName = extractDeviceFileName(asset);
    const candidateLower = candidateName.toLowerCase();

    // 1. Sprawdź duplikat na bieżącej liście wyboru
    const inCurrent = currentPhotos.some(p => {
      const pName = (p.name || p.uri.split('/').pop() || '').toLowerCase();
      if (pName === candidateLower || p.uri === asset.uri) return true;
      if (
        asset.fileSize &&
        p.fileSize &&
        asset.fileSize === p.fileSize &&
        asset.width === p.width &&
        asset.height === p.height
      ) {
        return true;
      }
      return false;
    });

    if (inCurrent) {
      return `Zdjęcie "${candidateName}" zostało już wcześniej wybrane w tym formularzu.`;
    }

    // 2. Sprawdź duplikat w istniejących tankowaniach w bazie
    const inDb = existingPhotosMap.get(candidateLower);
    if (inDb) {
      return `Zdjęcie "${candidateName}" zostało już wcześniej wykorzystane w tankowaniu z dnia ${inDb.date} (ID: ${inDb.id}) i nie zostało dołączone.`;
    }

    return null;
  };

  const processPhotosWithAI = async (photoList: MobileImageFile[]) => {
    if (photoList.length === 0) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setAiSuccessMsg(null);

      const result = await analyzePhotos(photoList);

      if (result.date) {
        try {
          const parsedD = new Date(result.date);
          if (!isNaN(parsedD.getTime())) {
            setDate(parsedD.toISOString().split('T')[0]);
          }
        } catch (_) { }
      }
      if (result.cost != null && result.cost > 0) {
        setCost(result.cost.toString());
      }
      if (result.liters != null && result.liters > 0) {
        setLiters(result.liters.toString());
      }
      if (result.price_per_liter != null && result.price_per_liter > 0) {
        setPricePerLiter(result.price_per_liter.toString());
      } else if (result.cost != null && result.liters != null && result.liters > 0) {
        setPricePerLiter((result.cost / result.liters).toFixed(2));
      }
      if (result.mileage != null && result.mileage > 0) {
        setMileage(result.mileage.toString());
      }
      if (result.receipt_image_url) {
        setReceiptImageUrl(result.receipt_image_url);
      }
      if (result.dashboard_image_url) {
        setDashboardImageUrl(result.dashboard_image_url);
      }

      setHasAnalyzedCurrentPhotos(true);
      setAiSuccessMsg(`Dane ze zdjęć (${photoList.length}) zostały automatycznie odczytane przez AI!`);
    } catch (err: any) {
      console.error('Błąd podczas analizy AI:', err);
      setErrorMsg(err?.message || 'Nie udało się przeanalizować zdjęć. Uzupełnij dane ręcznie.');
      setAiCooldown(5);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    if (photos.length >= 3) return;

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

      if (useCamera) {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const duplicateErr = checkDuplicateAsset(asset);
          if (duplicateErr) {
            setErrorMsg(duplicateErr);
            return;
          }

          const photoName = extractDeviceFileName(asset, 'camera');
          const newPhoto: MobileImageFile = {
            uri: asset.uri,
            name: photoName,
            type: asset.mimeType || 'image/jpeg',
            fileSize: asset.fileSize,
            width: asset.width,
            height: asset.height,
          };
          const updated = [...photos, newPhoto].slice(0, 3);
          setPhotos(updated);
          setHasAnalyzedCurrentPhotos(false);
        }
      } else {
        const remainingLimit = 3 - photos.length;
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: remainingLimit,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const duplicates: string[] = [];
          const validAssets: ImagePicker.ImagePickerAsset[] = [];
          const currentCombined = [...photos];

          for (const asset of result.assets) {
            const dupErr = checkDuplicateAsset(asset, currentCombined);
            if (dupErr) {
              duplicates.push(dupErr);
            } else {
              validAssets.push(asset);
              currentCombined.push({
                uri: asset.uri,
                name: extractDeviceFileName(asset),
                type: asset.mimeType || 'image/jpeg',
                fileSize: asset.fileSize,
                width: asset.width,
                height: asset.height,
              });
            }
          }

          if (duplicates.length > 0) {
            setErrorMsg(duplicates.join('\n'));
            if (validAssets.length === 0) return;
          }

          const newFiles: MobileImageFile[] = validAssets.map((asset, idx) => ({
            uri: asset.uri,
            name: extractDeviceFileName(asset, `gallery_${idx + 1}`),
            type: asset.mimeType || 'image/jpeg',
            fileSize: asset.fileSize,
            width: asset.width,
            height: asset.height,
          }));
          const updated = [...photos, ...newFiles].slice(0, 3);
          setPhotos(updated);
          setHasAnalyzedCurrentPhotos(false);
        }
      }
    } catch (err) {
      console.error('Błąd wyboru zdjęcia:', err);
    } finally {
      handleClosePhotoModal();
    }
  };

  const removePhoto = (index: number) => {
    if (isAnalyzing) return;
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    setHasAnalyzedCurrentPhotos(false);
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
      let finalReceiptUrl = receiptImageUrl;
      let finalDashboardUrl = dashboardImageUrl;

      // Pominięcie ewentualnych duplikatów ze zdjęć przed wysłaniem
      const uniquePhotosToUpload = photos.filter(p => {
        const pName = (p.name || p.uri.split('/').pop() || '').toLowerCase();
        return !existingPhotosMap.has(pName);
      });

      // Jeśli dołączono zdjęcia lokalne, przesłanie unikalnych plików
      if (uniquePhotosToUpload.length > 0) {
        const uploadRes = await uploadPhotosFast(uniquePhotosToUpload);
        if (uploadRes.receipt_image_url) finalReceiptUrl = uploadRes.receipt_image_url;
        if (uploadRes.dashboard_image_url) finalDashboardUrl = uploadRes.dashboard_image_url;
      }

      await createRefueling({
        date: new Date(date).toISOString(),
        cost: numCost,
        liters: numLiters,
        price_per_liter: !isNaN(numPrice) ? numPrice : numCost / numLiters,
        mileage: numMileage,
        receipt_image_url: finalReceiptUrl,
        dashboard_image_url: finalDashboardUrl,
      });

      resetAddFormDraft();
      onSuccess();
    } catch (err: any) {
      console.error('Błąd zapisu tankowania:', err);
      setErrorMsg(err?.message || 'Nie udało się zapisać tankowania. Sprawdź poprawność danych.');
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: getScrollY('add') }}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y, 'add')}
        scrollEventThrottle={16}
      >
        <VehicleCard refreshTrigger={carRefreshTrigger} />
        <Text style={[styles.title, { color: colors.textMain }]}>Dodaj nowe tankowanie</Text>

        {/* Unified Multi-Photo Upload Area (1-3 photos) */}
        <View style={styles.multiPhotoSection}>
          <View style={styles.multiPhotoHeader}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ZDJĘCIA (MAX 3: PARAGON / DYSTRYBUTOR / LICZNIK)</Text>
            <Text style={[styles.photoCounterBadge, { color: colors.primary }]}>{photos.length}/3</Text>
          </View>

          <View style={styles.thumbnailsContainer}>
            {photos.map((p, idx) => (
              <View key={idx} style={[styles.thumbnailWrapper, { borderColor: colors.accent }]}>
                <Image source={{ uri: p.uri }} style={styles.thumbnailImg} />
                <TouchableOpacity
                  style={styles.thumbnailRemoveBtn}
                  onPress={() => removePhoto(idx)}
                  activeOpacity={0.8}
                  disabled={isAnalyzing || isSubmitting}
                >
                  <X size={14} color="#ffffff" />
                </TouchableOpacity>
                <View style={[styles.thumbnailBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.thumbnailBadgeText}>#{idx + 1}</Text>
                </View>
                <View style={styles.thumbnailNameBar}>
                  <Text style={styles.thumbnailNameText} numberOfLines={1} ellipsizeMode="middle">
                    {p.name || `photo_${idx + 1}.jpg`}
                  </Text>
                </View>
              </View>
            ))}

            {photos.length < 3 && (
              <TouchableOpacity
                style={[
                  styles.addPhotoButton,
                  { width: addBtnW(3 - photos.length) },
                  {
                    backgroundColor: colors.bgCardSecondary,
                    borderColor: colors.borderColor,
                  },
                ]}
                onPress={() => setIsPhotoModalOpen(true)}
                disabled={isAnalyzing || isSubmitting}
                activeOpacity={0.8}
              >
                <Camera size={24} color={colors.primary} />
                <Text style={[styles.addPhotoButtonText, { color: colors.primary }]}>
                  {photos.length === 0 ? 'Dodaj zdjęcia (1-3)' : '+ Dodaj kolejne'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Przycisk ręcznego uruchomienia analizy AI - znika po udanej analizie */}
          {!hasAnalyzedCurrentPhotos && photos.length > 0 && (
            <TouchableOpacity
              style={[
                styles.analyzeAiBtn,
                { backgroundColor: aiCooldown > 0 ? '#6b7280' : colors.accent },
                (isAnalyzing || isSubmitting || aiCooldown > 0) && { opacity: 0.8 },
              ]}
              onPress={() => processPhotosWithAI(photos)}
              disabled={isAnalyzing || isSubmitting || aiCooldown > 0}
              activeOpacity={0.8}
            >
              {aiCooldown > 0 ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.analyzeAiBtnText}>Spróbuj ponownie za {aiCooldown}s...</Text>
                </>
              ) : (
                <>
                  <Sparkles size={18} color="#ffffff" />
                  <Text style={styles.analyzeAiBtnText}>Przeanalizuj zdjęcia przez AI ({photos.length})</Text>
                </>
              )}
            </TouchableOpacity>
          )}
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
          <View
            style={[
              styles.errorBanner,
              errorMsg.includes('Przekroczono limit') && {
                backgroundColor: '#fffbebfb',
                borderColor: '#fcd34d',
              },
            ]}
          >
            <AlertTriangle
              size={20}
              color={errorMsg.includes('Przekroczono limit') ? '#d97706' : '#dc2626'}
            />
            <View style={{ flex: 1 }}>
              {errorMsg.includes('Przekroczono limit') && (
                <Text style={{ fontWeight: '800', color: '#b45309', fontSize: 13, marginBottom: 2 }}>
                  ⚠️ Osiągnięto limit zapytań Gemini API
                </Text>
              )}
              <Text
                style={[
                  styles.errorText,
                  errorMsg.includes('Przekroczono limit') && { color: '#92400e' },
                ]}
              >
                {errorMsg}
              </Text>
            </View>
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
        visible={isPhotoModalOpen}
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
                  Dodaj zdjęcie ({photos.length + 1}/3)
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Możesz dodać od 1 do 3 zdjęć (np. paragon, dystrybutor, licznik) do automatycznej analizy AI:
                </Text>

                <TouchableOpacity
                  style={[styles.modalOption, { backgroundColor: colors.bgCardSecondary }]}
                  onPress={() => handleClosePhotoModal(() => pickImage(true))}
                >
                  <Camera size={22} color={colors.primary} />
                  <Text style={[styles.modalOptionText, { color: colors.textMain }]}>
                    Zrób zdjęcie (Aparat)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalOption, { backgroundColor: colors.bgCardSecondary }]}
                  onPress={() => handleClosePhotoModal(() => pickImage(false))}
                >
                  <ImageIcon size={22} color={colors.primary} />
                  <Text style={[styles.modalOptionText, { color: colors.textMain }]}>
                    Wybierz z galerii (możesz zaznaczyć do {3 - photos.length})
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
    paddingTop: 12,
    paddingBottom: 90,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  multiPhotoSection: {
    marginBottom: 12,
  },
  multiPhotoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  photoCounterBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: PHOTO_SLOT_W,
    height: 84,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  thumbnailRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  thumbnailBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    zIndex: 10,
  },
  thumbnailBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  thumbnailNameBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  thumbnailNameText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  addPhotoButton: {
    height: 84,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  addPhotoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  analyzeAiBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  analyzeAiBtnText: {
    color: '#ffffff',
    fontSize: 14,
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
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
    marginBottom: 2,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
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
    fontWeight: '600',
  },
  modalCancelBtn: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
