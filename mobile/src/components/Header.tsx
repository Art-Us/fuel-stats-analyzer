import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Fuel, Settings, Save, AlertCircle, Sun, Moon, Eye, EyeOff, Key, Download, Upload, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useViewControl } from '../context/ViewControlContext';
import { getCarInfo, updateCarInfo, getExportBackupUrl, importBackup } from '../services/api';

interface TopNavBarProps {
  title?: string;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ title = 'Statystyki Paliwa' }) => {
  const { theme, colors, toggleTheme } = useTheme();

  return (
    <View style={[styles.topNavBarContainer, { backgroundColor: colors.bgApp }]}>
      <Text style={[styles.headerTitle, { color: colors.textMain }]}>{title}</Text>
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: colors.bgCardSecondary }]}
        onPress={(e) => {
          const { pageX, pageY } = e.nativeEvent;
          toggleTheme({ cx: pageX, cy: pageY });
        }}
        activeOpacity={0.7}
      >
        {theme === 'dark' ? (
          <Sun size={20} color="#f59e0b" />
        ) : (
          <Moon size={20} color={colors.textMain} />
        )}
      </TouchableOpacity>
    </View>
  );
};

interface VehicleCardProps {
  refreshTrigger?: number;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ refreshTrigger = 0 }) => {
  const { colors } = useTheme();
  const { cachedCarInfo, setCachedCarInfo, setCachedHistory, setCachedStats, setCachedStatsHistory } = useViewControl();

  const [carName, setCarName] = useState<string>(cachedCarInfo?.name || 'Mój Samochód');
  const [latestMileage, setLatestMileage] = useState<number | null>(cachedCarInfo?.latest_mileage ?? null);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>(cachedCarInfo?.gemini_api_key || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(450)).current;

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 450],
    outputRange: [1, 0],
  });

  useEffect(() => {
    if (isSettingsOpen) {
      slideAnim.setValue(450);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isSettingsOpen]);

  const fetchCarData = async () => {
    try {
      const data = await getCarInfo();
      const name = data.name || 'Mój Samochód';
      setCarName(name);
      setLatestMileage(data.latest_mileage);
      setCachedCarInfo({
        name,
        latest_mileage: data.latest_mileage,
        gemini_api_key: data.gemini_api_key || '',
      });
    } catch (err) {
      console.error('Błąd podczas pobierania danych samochodu:', err);
    }
  };

  useEffect(() => {
    fetchCarData();
  }, [refreshTrigger]);

  const handleCloseSettings = () => {
    Animated.timing(slideAnim, {
      toValue: 450,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsSettingsOpen(false);
    });
  };

  const handleOpenSettings = () => {
    setNameInput(carName);
    setApiKeyInput(cachedCarInfo?.gemini_api_key || '');
    setShowApiKey(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSettingsOpen(true);
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const url = getExportBackupUrl();
      await Linking.openURL(url);
    } catch (err) {
      console.error('Błąd podczas otwierania eksportu ZIP:', err);
      setErrorMsg('Nie udało się pobrać pliku eksportu.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const fileAsset = res.assets[0];
      setIsImporting(true);

      const result = await importBackup({
        uri: fileAsset.uri,
        name: fileAsset.name,
        type: fileAsset.mimeType || 'application/zip',
      });

      setSuccessMsg(`Pomyślnie zaimportowano ${result.imported_refuelings} tankowań!`);
      await fetchCarData();
      setCachedHistory([]);
      setCachedStats(null);
      setCachedStatsHistory([]);
    } catch (err: any) {
      console.error('Błąd podczas importu archiwum ZIP:', err);
      setErrorMsg(err?.message || 'Nie udało się zaimportować pliku ZIP.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!nameInput.trim()) {
      setErrorMsg('Nazwa samochodu nie może być pusta.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await updateCarInfo(nameInput.trim(), apiKeyInput.trim());
      setCarName(updated.name);
      setLatestMileage(updated.latest_mileage);
      setCachedCarInfo({
        name: updated.name,
        latest_mileage: updated.latest_mileage,
        gemini_api_key: updated.gemini_api_key || '',
      });
      handleCloseSettings();
    } catch (err) {
      console.error('Błąd podczas zapisu ustawień:', err);
      setErrorMsg('Nie udało się zapisać ustawień.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.vehicleCardContainer}>
      <View
        style={[
          styles.vehicleCard,
          {
            backgroundColor: colors.bgCardSecondary,
            borderColor: colors.borderColor,
          },
        ]}
      >
        <View style={styles.vehicleInfo}>
          <View style={[styles.vehicleAvatar, { backgroundColor: colors.primary }]}>
            <Fuel size={20} color="#ffffff" />
          </View>
          <View style={styles.vehicleDetails}>
            <Text style={[styles.vehicleName, { color: colors.textMain }]}>{carName}</Text>
            <Text style={[styles.vehicleMileage, { color: colors.textMuted }]}>
              {latestMileage != null
                ? `${latestMileage.toLocaleString('pl-PL')} km`
                : 'Brak tankowań w bazie'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={handleOpenSettings}
          activeOpacity={0.7}
        >
          <Settings size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isSettingsOpen}
        transparent
        animationType="none"
        onRequestClose={handleCloseSettings}
      >
        <TouchableWithoutFeedback onPress={handleCloseSettings}>
          <Animated.View style={[styles.modalOverlay, { opacity: backdropOpacity }]}>
            <Animated.View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: colors.bgCard,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                    Ustawienia aplikacji
                  </Text>
                  <View style={styles.backupButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.backupBtn,
                        {
                          backgroundColor: colors.bgCardSecondary,
                          borderColor: colors.borderColor,
                        },
                      ]}
                      onPress={handleExportBackup}
                      disabled={isExporting || isImporting}
                      activeOpacity={0.7}
                      accessibilityLabel="Eksportuj kopię zapasową (ZIP)"
                    >
                      {isExporting ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Download size={14} color={colors.primary} />
                          <Text style={[styles.backupBtnText, { color: colors.primary }]}>Eksport</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.backupBtn,
                        {
                          backgroundColor: colors.bgCardSecondary,
                          borderColor: colors.borderColor,
                        },
                      ]}
                      onPress={handleImportBackup}
                      disabled={isExporting || isImporting}
                      activeOpacity={0.7}
                      accessibilityLabel="Importuj kopię zapasową (ZIP)"
                    >
                      {isImporting ? (
                        <ActivityIndicator size="small" color="#16a34a" />
                      ) : (
                        <>
                          <Upload size={14} color="#16a34a" />
                          <Text style={[styles.backupBtnText, { color: '#16a34a' }]}>Import</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  Dostosuj dane pojazdu, klucz API lub wykonaj kopię zapasową / import danych.
                </Text>

                {errorMsg && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={16} color="#991b1b" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                {successMsg && (
                  <View style={styles.successBox}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <Text style={styles.successText}>{successMsg}</Text>
                  </View>
                )}

                <Text style={[styles.label, { color: colors.textMuted }]}>
                  NAZWA SAMOCHODU
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bgCardSecondary,
                      borderColor: colors.borderColor,
                      color: colors.textMain,
                    },
                  ]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Wpisz nazwę (np. Audi A4)"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />

                <Text style={[styles.label, { color: colors.textMuted, marginTop: 4 }]}>
                  KLUCZ GEMINI API (OPCJONALNIE)
                </Text>
                <View
                  style={[
                    styles.apiKeyInputContainer,
                    {
                      backgroundColor: colors.bgCardSecondary,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.apiKeyInput,
                      { color: colors.textMain },
                    ]}
                    value={apiKeyInput}
                    onChangeText={setApiKeyInput}
                    placeholder="Wklej swój klucz API Gemini (AI Studio)"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowApiKey(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    {showApiKey ? (
                      <EyeOff size={20} color={colors.textMuted} />
                    ) : (
                      <Eye size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={[styles.inputHint, { color: colors.textMuted }]}>
                  Jeśli podasz własny klucz, zostanie on użyty do analizy zdjęć przez AI.
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.btnSave, { backgroundColor: colors.primary }]}
                    onPress={handleSaveSettings}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Save size={18} color="#ffffff" />
                        <Text style={styles.btnSaveText}>Zapisz</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnCancel, { borderColor: colors.borderColor }]}
                    onPress={handleCloseSettings}
                    disabled={isSaving}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.btnCancelText, { color: colors.textMuted }]}>
                      Anuluj
                    </Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </Animated.View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

interface HeaderProps {
  title?: string;
  refreshTrigger?: number;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Statystyki Paliwa', refreshTrigger = 0 }) => {
  return (
    <View>
      <TopNavBar title={title} />
      <View style={{ paddingHorizontal: 20 }}>
        <VehicleCard refreshTrigger={refreshTrigger} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topNavBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleCardContainer: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleDetails: {
    gap: 2,
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: '700',
  },
  vehicleMileage: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  settingsBtn: {
    padding: 6,
    borderRadius: 20,
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
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  backupButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  backupBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  successText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  apiKeyInputContainer: {
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  apiKeyInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 6,
  },
  inputHint: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    flex: 1,
  },
  modalActions: {
    gap: 8,
  },
  btnSave: {
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSaveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnCancel: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
