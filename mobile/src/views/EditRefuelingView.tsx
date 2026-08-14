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
  Image,
  Dimensions,
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
  X,
  Maximize2,
  Eye,
  Plus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useScroll } from '../context/ScrollContext';
import {
  getRefuelingById,
  updateRefueling,
  deleteRefueling,
  deleteRefuelingPhoto,
  analyzePhotos,
  uploadPhotosFast,
  getImageUrl,
  getRefuelings,
  MobileImageFile,
} from '../services/api';

import { DatePickerModal } from '../components/DatePickerModal';

// Stałe siatki zdjęć: 3 równe sloty na pełną szerokość
const GRID_GAP = 8;
const PHOTO_SLOT_W = Math.floor(
  (Dimensions.get('window').width - 40 - 2 * GRID_GAP) / 3
);
const addBtnW = (n: number) => PHOTO_SLOT_W * n + GRID_GAP * (n - 1);

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

  // Multi-Photo Upload State (1-3 photos)
  const [photos, setPhotos] = useState<MobileImageFile[]>([]);
  const [initialPhotoNames, setInitialPhotoNames] = useState<string[]>([]);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [hasAnalyzedCurrentPhotos, setHasAnalyzedCurrentPhotos] = useState<boolean>(false);
  const [otherRefuelingsPhotoMap, setOtherRefuelingsPhotoMap] = useState<Map<string, { date: string; id: number }>>(new Map());

  // Pobranie listy zdjęć z pozostałych tankowań do walidacji duplikatów
  useEffect(() => {
    const loadOtherPhotos = async () => {
      try {
        const list = await getRefuelings('all');
        const map = new Map<string, { date: string; id: number }>();
        list.forEach(r => {
          if (r.id === id) return; // pomiń obecnie edytowane tankowanie
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
        setOtherRefuelingsPhotoMap(map);
      } catch (_) {}
    };
    loadOtherPhotos();
  }, [id]);

  // Full-Screen Zoom Lightbox Modal & Delete Confirmation Modal State
  const [activeZoomImage, setActiveZoomImage] = useState<{
    url: string;
    title: string;
    type?: 'receipt' | 'dashboard' | 'local';
    index?: number;
  } | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<{
    type: 'receipt' | 'dashboard' | 'local';
    label: string;
    index?: number;
  } | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<boolean>(false);

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

  // Loading & UI States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
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

  const getCleanDisplayName = (urlOrName?: string | null): string => {
    if (!urlOrName) return '';
    const base = urlOrName.split('/').pop() || urlOrName;
    return base.includes('___') ? base.split('___').slice(1).join('___') : base;
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

  useEffect(() => {
    const fetchRefueling = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await getRefuelingById(id);

        const initialReceipt = data.receipt_image_url || null;
        let initialDashboard = data.dashboard_image_url || null;

        // Zapobiegaj dublowaniu tego samego zdjęcia z bazy danych
        if (initialReceipt && initialDashboard) {
          const rClean = getCleanDisplayName(initialReceipt).toLowerCase();
          const dClean = getCleanDisplayName(initialDashboard).toLowerCase();
          if (rClean === dClean || initialReceipt === initialDashboard) {
            initialDashboard = null;
          }
        }

        const formattedDate = new Date(data.date).toISOString().split('T')[0];
        setDate(formattedDate);
        setCost(data.cost ? data.cost.toString() : '');
        setLiters(data.liters ? data.liters.toString() : '');
        setPricePerLiter(data.price_per_liter ? data.price_per_liter.toString() : '');
        setMileage(data.mileage ? data.mileage.toString() : '');
        setReceiptImageUrl(initialReceipt);
        setDashboardImageUrl(initialDashboard);

        const initialList: string[] = [];
        if (initialReceipt) {
          initialList.push(getCleanDisplayName(initialReceipt));
        }
        if (initialDashboard) {
          initialList.push(getCleanDisplayName(initialDashboard));
        }
        setInitialPhotoNames(initialList);
      } catch (err) {
        console.error('Błąd podczas pobierania wpisu:', err);
        setErrorMsg('Nie udało się pobrać szczegółów tankowania.');
      } finally {
        setLoading(false);
      }
    };

    fetchRefueling();
  }, [id]);

  const getCurrentPhotoNames = () => {
    const list: string[] = [];
    if (receiptImageUrl) {
      list.push(getCleanDisplayName(receiptImageUrl));
    }
    if (dashboardImageUrl) {
      list.push(getCleanDisplayName(dashboardImageUrl));
    }
    photos.forEach(p => {
      const name = p.name || getCleanDisplayName(p.uri);
      list.push(name);
    });
    return list;
  };

  const handleCostOrLitersChange = (newCost: string, newLiters: string) => {
    const numCost = parseFloat(newCost);
    const numLiters = parseFloat(newLiters);
    if (!isNaN(numCost) && !isNaN(numLiters) && numLiters > 0) {
      setPricePerLiter((numCost / numLiters).toFixed(2));
    }
  };

  const processPhotosWithAI = async (photoList: MobileImageFile[]) => {
    const existingServerUrls = [receiptImageUrl, dashboardImageUrl].filter((u): u is string => !!u);
    if (photoList.length === 0 && existingServerUrls.length === 0) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const result = await analyzePhotos(photoList, existingServerUrls);

      if (result.date) {
        const formattedDate = new Date(result.date).toISOString().split('T')[0];
        setDate(formattedDate);
      }
      if (result.cost != null && result.cost > 0) setCost(result.cost.toString());
      if (result.liters != null && result.liters > 0) setLiters(result.liters.toString());
      if (result.price_per_liter != null && result.price_per_liter > 0) {
        setPricePerLiter(result.price_per_liter.toString());
      } else if (result.cost != null && result.liters != null && result.liters > 0) {
        setPricePerLiter((result.cost / result.liters).toFixed(2));
      }
      if (result.mileage != null && result.mileage > 0) setMileage(result.mileage.toString());
      if (result.receipt_image_url) setReceiptImageUrl(result.receipt_image_url);
      if (result.dashboard_image_url) setDashboardImageUrl(result.dashboard_image_url);

      // Po zakończeniu analizy AI czyścimy lokalną listę photos, gdyż zdjęcia są teraz w receiptImageUrl / dashboardImageUrl
      setPhotos([]);
      setHasAnalyzedCurrentPhotos(true);
    } catch (err: any) {
      console.error('Błąd analizy AI:', err);
      setErrorMsg(err?.message || 'Nie udało się przeanalizować zdjęć. Wprowadź dane ręcznie.');
      setAiCooldown(5);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkDuplicateAsset = (
    asset: ImagePicker.ImagePickerAsset,
    currentPhotos: MobileImageFile[] = photos
  ): string | null => {
    const candidateName = extractDeviceFileName(asset);
    const candidateLower = candidateName.toLowerCase();

    // 1. Sprawdź z zapisanymi na serwerze zdjęciami tego wpisu
    const activeServerUrls = [receiptImageUrl, dashboardImageUrl].filter((u): u is string => !!u);
    for (const sUrl of activeServerUrls) {
      const sCleanName = getCleanDisplayName(sUrl).toLowerCase();
      if (sCleanName === candidateLower || sUrl === asset.uri) {
        return `Zdjęcie "${candidateName}" jest już przypisane do tego tankowania.`;
      }
    }

    // 2. Sprawdź z dołączonymi lokalnymi zdjęciami
    for (const p of currentPhotos) {
      const pName = (p.name || getCleanDisplayName(p.uri)).toLowerCase();
      if (pName === candidateLower || p.uri === asset.uri) {
        return `Zdjęcie "${candidateName}" zostało już wybrane w formularzu.`;
      }
      if (
        asset.fileSize &&
        p.fileSize &&
        asset.fileSize === p.fileSize &&
        asset.width === p.width &&
        asset.height === p.height
      ) {
        return `Zdjęcie "${candidateName}" zostało już wybrane w formularzu.`;
      }
    }

    // 3. Sprawdź z innymi tankowaniami w bazie
    const inOther = otherRefuelingsPhotoMap.get(candidateLower);
    if (inOther) {
      return `Zdjęcie "${candidateName}" zostało już wcześniej wykorzystane w tankowaniu z dnia ${inOther.date} (ID: ${inOther.id}) i nie zostało dołączone.`;
    }

    return null;
  };

  const pickImage = async (useCamera: boolean) => {
    const currentTotalCount = (receiptImageUrl ? 1 : 0) + (dashboardImageUrl ? 1 : 0) + photos.length;
    if (currentTotalCount >= 3) return;

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

      const remainingLimit = 3 - currentTotalCount;

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
          setPhotos(prev => [...prev, newPhoto].slice(0, remainingLimit));
          setHasAnalyzedCurrentPhotos(false);
        }
      } else {
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
          setPhotos(prev => [...prev, ...newFiles].slice(0, remainingLimit));
          setHasAnalyzedCurrentPhotos(false);
        }
      }
    } catch (err) {
      console.error('Błąd wyboru zdjęcia:', err);
    } finally {
      handleClosePhotoModal();
    }
  };

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      setIsDeletingPhoto(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      if (photoToDelete.type === 'receipt' || photoToDelete.type === 'dashboard') {
        await deleteRefuelingPhoto(id, photoToDelete.type);

        if (photoToDelete.type === 'receipt') {
          setReceiptImageUrl(null);
        } else if (photoToDelete.type === 'dashboard') {
          setDashboardImageUrl(null);
        }
        setSuccessMsg(`Usunięto ${photoToDelete.label}.`);
      } else if (photoToDelete.type === 'local' && photoToDelete.index != null) {
        const idxToRemove = photoToDelete.index;
        setPhotos(prev => prev.filter((_, i) => i !== idxToRemove));
        setHasAnalyzedCurrentPhotos(false);
        setSuccessMsg(`Usunięto ${photoToDelete.label}.`);
      }

      setActiveZoomImage(null);
      setPhotoToDelete(null);
    } catch (err: any) {
      console.error('Błąd usuwania zdjęcia:', err);
      setErrorMsg('Nie udało się usunąć zdjęcia.');
    } finally {
      setIsDeletingPhoto(false);
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
      let finalReceiptUrl = receiptImageUrl;
      let finalDashboardUrl = dashboardImageUrl;

      // Jeśli dołączono nowe zdjęcia lokalne, wyślij tylko te unikalne
      const uniquePhotosToUpload = photos.filter(p => {
        const pName = (p.name || getCleanDisplayName(p.uri)).toLowerCase();
        return !otherRefuelingsPhotoMap.has(pName);
      });

      if (uniquePhotosToUpload.length > 0) {
        const existingServerUrls = [receiptImageUrl, dashboardImageUrl].filter((u): u is string => !!u);
        const uploadRes = await uploadPhotosFast(uniquePhotosToUpload, existingServerUrls);
        if (uploadRes.receipt_image_url) finalReceiptUrl = uploadRes.receipt_image_url;
        if (uploadRes.dashboard_image_url) finalDashboardUrl = uploadRes.dashboard_image_url;
      }

      await updateRefueling(id, {
        date: new Date(date).toISOString(),
        cost: numCost,
        liters: numLiters,
        price_per_liter: !isNaN(numPrice) ? numPrice : numCost / numLiters,
        mileage: numMileage,
        receipt_image_url: finalReceiptUrl,
        dashboard_image_url: finalDashboardUrl,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Błąd aktualizacji tankowania:', err);
      setErrorMsg(err?.message || 'Nie udało się zapisać zmian. Sprawdź dane.');
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

        {/* Unified Multi-Photo Upload Area (1-3 photos) */}
        {(() => {
          const uniqueLocalPhotos = photos.filter(p => {
            const pName = (p.name || getCleanDisplayName(p.uri)).toLowerCase();
            const rName = getCleanDisplayName(receiptImageUrl).toLowerCase();
            const dName = getCleanDisplayName(dashboardImageUrl).toLowerCase();
            return pName !== rName && pName !== dName;
          });
          const totalPhotosCount = (receiptImageUrl ? 1 : 0) + (dashboardImageUrl ? 1 : 0) + uniqueLocalPhotos.length;
          const initialSorted = [...initialPhotoNames].sort().join(',');
          const currentSorted = getCurrentPhotoNames().sort().join(',');
          const hasPhotoSetChanged = initialSorted !== currentSorted;

          return (
            <View style={styles.multiPhotoSection}>
              <View style={styles.multiPhotoHeader}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  ZDJĘCIA (MAX 3)
                </Text>
                <Text style={[styles.photoCounterBadge, { color: colors.primary }]}>{totalPhotosCount}/3</Text>
              </View>

              <View style={styles.thumbnailsContainer}>
                {/* Saved Receipt Image */}
                {receiptImageUrl && (
                  <View style={[styles.thumbnailWrapper, { borderColor: colors.primary }]}>
                    <TouchableOpacity
                      style={{ width: '100%', height: '100%' }}
                      onPress={() => setActiveZoomImage({
                        url: getImageUrl(receiptImageUrl)!,
                        title: 'Zdjęcie #1',
                        type: 'receipt'
                      })}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: getImageUrl(receiptImageUrl)! }} style={styles.thumbnailImg} />
                      <View style={styles.zoomOverlayBadge}>
                        <Maximize2 size={12} color="#ffffff" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.thumbnailRemoveBtn}
                      onPress={() => setPhotoToDelete({ type: 'receipt', label: 'Zdjęcie #1' })}
                      activeOpacity={0.8}
                      disabled={isAnalyzing || isSubmitting}
                    >
                      <X size={14} color="#ffffff" />
                    </TouchableOpacity>

                    <View style={[styles.thumbnailBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.thumbnailBadgeText}>#1</Text>
                    </View>

                    <View style={styles.thumbnailNameBar}>
                      <Text style={styles.thumbnailNameText} numberOfLines={1} ellipsizeMode="middle">
                        {getCleanDisplayName(receiptImageUrl)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Saved Dashboard Image */}
                {dashboardImageUrl && (
                  <View style={[styles.thumbnailWrapper, { borderColor: colors.primary }]}>
                    <TouchableOpacity
                      style={{ width: '100%', height: '100%' }}
                      onPress={() => setActiveZoomImage({
                        url: getImageUrl(dashboardImageUrl)!,
                        title: `Zdjęcie #${receiptImageUrl ? 2 : 1}`,
                        type: 'dashboard'
                      })}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: getImageUrl(dashboardImageUrl)! }} style={styles.thumbnailImg} />
                      <View style={styles.zoomOverlayBadge}>
                        <Maximize2 size={12} color="#ffffff" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.thumbnailRemoveBtn}
                      onPress={() => setPhotoToDelete({ type: 'dashboard', label: `Zdjęcie #${receiptImageUrl ? 2 : 1}` })}
                      activeOpacity={0.8}
                      disabled={isAnalyzing || isSubmitting}
                    >
                      <X size={14} color="#ffffff" />
                    </TouchableOpacity>

                    <View style={[styles.thumbnailBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.thumbnailBadgeText}>#{receiptImageUrl ? 2 : 1}</Text>
                    </View>

                    <View style={styles.thumbnailNameBar}>
                      <Text style={styles.thumbnailNameText} numberOfLines={1} ellipsizeMode="middle">
                        {getCleanDisplayName(dashboardImageUrl)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Newly added local photos */}
                {uniqueLocalPhotos.map((p, idx) => {
                  const slotIdx = (receiptImageUrl ? 1 : 0) + (dashboardImageUrl ? 1 : 0) + idx + 1;
                  return (
                    <View key={idx} style={[styles.thumbnailWrapper, { borderColor: colors.accent }]}>
                      <TouchableOpacity
                        style={{ width: '100%', height: '100%' }}
                        onPress={() => setActiveZoomImage({
                          url: p.uri,
                          title: `Zdjęcie #${slotIdx}`,
                          type: 'local',
                          index: idx
                        })}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: p.uri }} style={styles.thumbnailImg} />
                        <View style={styles.zoomOverlayBadge}>
                          <Maximize2 size={12} color="#ffffff" />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.thumbnailRemoveBtn}
                        onPress={() => setPhotoToDelete({
                          type: 'local',
                          label: `Zdjęcie #${slotIdx}`,
                          index: idx
                        })}
                        activeOpacity={0.8}
                        disabled={isAnalyzing || isSubmitting}
                      >
                        <X size={14} color="#ffffff" />
                      </TouchableOpacity>

                      <View style={[styles.thumbnailBadge, { backgroundColor: colors.accent }]}>
                        <Text style={styles.thumbnailBadgeText}>#{slotIdx}</Text>
                      </View>

                      <View style={styles.thumbnailNameBar}>
                        <Text style={styles.thumbnailNameText} numberOfLines={1} ellipsizeMode="middle">
                          {p.name || `photo_${slotIdx}.jpg`}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {/* Add Photo Slot Button if total < 3 */}
                {totalPhotosCount < 3 && (
                  <TouchableOpacity
                    style={[
                      styles.addPhotoButton,
                      { width: addBtnW(3 - totalPhotosCount) },
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
                      {totalPhotosCount === 0 ? 'Dodaj zdjęcia' : '+ Dodaj'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Przycisk ręcznego uruchomienia analizy AI - znika po udanej analizie */}
              {hasPhotoSetChanged && totalPhotosCount > 0 && !hasAnalyzedCurrentPhotos && (
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
                      <Text style={styles.analyzeAiBtnText}>Przeanalizuj zdjęcia przez AI ({totalPhotosCount})</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

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
                  Wybierz opcję dodania zdjęcia do nowej analizy AI:
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

      {/* Full-Screen Zoom Lightbox Modal */}
      <Modal
        visible={activeZoomImage != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveZoomImage(null)}
      >
        <View style={styles.lightboxOverlay}>
          <View style={styles.lightboxHeader}>
            <View style={styles.lightboxTitleCol}>
              <Text style={styles.lightboxTitle}>{activeZoomImage?.title || 'Podgląd zdjęcia'}</Text>
              {activeZoomImage?.url ? (
                <Text style={styles.lightboxSubtitle} numberOfLines={1} ellipsizeMode="middle">
                  {getCleanDisplayName(activeZoomImage.url)}
                </Text>
              ) : null}
            </View>
            <View style={styles.lightboxActions}>
              {activeZoomImage?.type && (
                <TouchableOpacity
                  style={styles.lightboxDeleteBtn}
                  onPress={() => setPhotoToDelete({
                    type: activeZoomImage.type!,
                    label: activeZoomImage.title,
                    index: activeZoomImage.index,
                  })}
                  activeOpacity={0.8}
                >
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => setActiveZoomImage(null)}
                activeOpacity={0.8}
              >
                <X size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {activeZoomImage?.url && (
            <Image
              source={{ uri: activeZoomImage.url }}
              style={styles.lightboxFullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Modal Potwierdzenia Usunięcia Zdjęcia */}
      <Modal
        visible={photoToDelete != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoToDelete(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPhotoToDelete(null)}>
          <View style={styles.centerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.dialogCard, { backgroundColor: colors.bgCard }]}>
                <View style={styles.dialogHeader}>
                  <AlertTriangle size={28} color="#dc2626" />
                  <Text style={[styles.dialogTitle, { color: colors.textMain }]}>
                    Usunięcie zdjęcia
                  </Text>
                </View>
                <Text style={[styles.dialogSub, { color: colors.textMuted }]}>
                  {photoToDelete?.type === 'local'
                    ? `Czy na pewno chcesz usunąć zdjęcie (${photoToDelete?.label})?`
                    : `Czy na pewno chcesz trwale usunąć zdjęcie (${photoToDelete?.label}) z tego tankowania? Plik zostanie usunięty z dysku serwera.`}
                </Text>
                <View style={styles.dialogActions}>
                  <TouchableOpacity
                    style={[styles.dialogCancelBtn, { backgroundColor: colors.bgApp, borderColor: colors.borderColor }]}
                    onPress={() => setPhotoToDelete(null)}
                    disabled={isDeletingPhoto}
                  >
                    <Text style={[styles.dialogCancelText, { color: colors.textMain }]}>
                      Anuluj
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dialogConfirmBtn}
                    onPress={handleConfirmDeletePhoto}
                    disabled={isDeletingPhoto}
                  >
                    {isDeletingPhoto ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.dialogConfirmText}>Usuń zdjęcie</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Refueling Confirmation Modal */}
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
  savedPhotosCard: {
    marginBottom: 16,
  },
  savedThumbnailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  savedThumbnailBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  savedThumbnailClick: {
    position: 'relative',
    height: 120,
    width: '100%',
  },
  savedThumbnailImg: {
    width: '100%',
    height: '100%',
  },
  zoomOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomOverlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  savedThumbnailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  savedThumbnailTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  deletePhotoIconBtn: {
    padding: 4,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxHeader: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lightboxTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  lightboxTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  lightboxSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  lightboxActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lightboxDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 20,
    padding: 8,
  },
  lightboxCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  lightboxFullImage: {
    width: '100%',
    height: '80%',
  },
});
