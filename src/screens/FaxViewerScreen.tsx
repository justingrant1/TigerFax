/**
 * FaxViewerScreen
 * Full-screen in-app PDF viewer for both received (inbox) and sent faxes.
 * Uses react-native-webview + Google Docs Viewer to render PDFs without native PDF libs.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { deleteReceivedFax } from '../services/inbox';

type Props = NativeStackScreenProps<RootStackParamList, 'FaxViewer'>;

type ActionState = 'idle' | 'downloading' | 'sharing' | 'deleting';

export default function FaxViewerScreen({ route, navigation }: Props) {
  const { faxId, documentUrl, from, receivedAt, pages, isInbox } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [webViewLoading, setWebViewLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(false);
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Format the date nicely
  const formattedDate = receivedAt
    ? new Date(receivedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // Google Docs Viewer URL — renders any publicly accessible PDF inline
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  }, [toastAnim]);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setActionState('downloading');
      setDownloadProgress(0);

      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to save faxes.'
        );
        setActionState('idle');
        return;
      }

      const filename = `fax_${faxId}_${Date.now()}.pdf`;
      const localUri = FileSystem.documentDirectory + filename;

      // Download with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        documentUrl,
        localUri,
        {},
        (progress) => {
          const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
          setDownloadProgress(pct);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Download failed');

      // Save to device Files (Documents directory is accessible via Files app)
      // On iOS, save to media library so it appears in Files
      if (Platform.OS === 'ios') {
        await MediaLibrary.saveToLibraryAsync(result.uri);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('✓ Saved to Files');
    } catch (error: any) {
      console.error('Download error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Download Failed', 'Could not download the fax. Please try again.');
    } finally {
      setActionState('idle');
      setDownloadProgress(0);
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActionState('sharing');

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Not Available', 'Sharing is not available on this device.');
        setActionState('idle');
        return;
      }

      // Download to temp location first, then share
      const filename = `fax_${faxId}.pdf`;
      const localUri = FileSystem.cacheDirectory + filename;

      const existing = await FileSystem.getInfoAsync(localUri);
      if (!existing.exists) {
        await FileSystem.downloadAsync(documentUrl, localUri);
      }

      await Sharing.shareAsync(localUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Fax from ${from}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Could not share the fax. Please try again.');
    } finally {
      setActionState('idle');
    }
  };

  // ── Print (via Share → AirPrint) ──────────────────────────────────────────
  const handlePrint = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Download to temp, then share — iOS will show AirPrint in the share sheet
      const filename = `fax_${faxId}_print.pdf`;
      const localUri = FileSystem.cacheDirectory + filename;

      const existing = await FileSystem.getInfoAsync(localUri);
      if (!existing.exists) {
        await FileSystem.downloadAsync(documentUrl, localUri);
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Print Fax',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Not Available', 'Printing is not available on this device.');
      }
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Failed', 'Could not open print dialog. Please try again.');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Fax',
      'Are you sure you want to permanently delete this fax?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              setActionState('deleting');
              await deleteReceivedFax(user.uid, faxId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete fax. Please try again.');
              setActionState('idle');
            }
          },
        },
      ]
    );
  };

  const isLoading = actionState !== 'idle';

  return (
    <View className="flex-1 bg-gray-900">
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* ── Header ── */}
      <View
        style={{ paddingTop: insets.top }}
        className="bg-gray-900 border-b border-gray-700"
      >
        <View className="flex-row items-center px-4 py-3">
          {/* Close */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-800 mr-3"
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>

          {/* Metadata */}
          <View className="flex-1">
            <Text className="text-white font-semibold text-base" numberOfLines={1}>
              {isInbox ? `From: ${from}` : `To: ${from}`}
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              {formattedDate}
              {pages > 0 ? `  ·  ${pages} page${pages !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>

          {/* Page count badge */}
          {pages > 0 && (
            <View className="bg-gray-700 rounded-full px-3 py-1 ml-2">
              <Text className="text-gray-300 text-xs font-medium">
                {pages}p
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── PDF Viewer ── */}
      <View className="flex-1 relative">
        <WebView
          source={{ uri: viewerUrl }}
          style={{ flex: 1, backgroundColor: '#1f2937' }}
          onLoadStart={() => {
            setWebViewLoading(true);
            setWebViewError(false);
          }}
          onLoadEnd={() => setWebViewLoading(false)}
          onError={() => {
            setWebViewLoading(false);
            setWebViewError(true);
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          scalesPageToFit
          allowsInlineMediaPlayback
          mixedContentMode="always"
          originWhitelist={['*']}
        />

        {/* Loading overlay */}
        {webViewLoading && (
          <View className="absolute inset-0 bg-gray-900 items-center justify-center">
            <View className="w-20 h-20 bg-gray-800 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="document-text" size={40} color="#3B82F6" />
            </View>
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginBottom: 12 }} />
            <Text className="text-gray-400 text-sm">Loading fax...</Text>
          </View>
        )}

        {/* Error state */}
        {webViewError && !webViewLoading && (
          <View className="absolute inset-0 bg-gray-900 items-center justify-center px-8">
            <View className="w-20 h-20 bg-red-900/40 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="alert-circle" size={40} color="#EF4444" />
            </View>
            <Text className="text-white font-semibold text-lg mb-2 text-center">
              Could Not Load Fax
            </Text>
            <Text className="text-gray-400 text-sm text-center mb-6 leading-5">
              The fax could not be displayed in the viewer. You can still download or share it.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setWebViewError(false);
                setWebViewLoading(true);
              }}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Download progress overlay */}
        {actionState === 'downloading' && (
          <View className="absolute inset-0 bg-black/60 items-center justify-center">
            <View className="bg-gray-800 rounded-2xl p-6 mx-8 w-64 items-center">
              <ActivityIndicator size="large" color="#3B82F6" style={{ marginBottom: 12 }} />
              <Text className="text-white font-semibold mb-3">Downloading...</Text>
              {/* Progress bar */}
              <View className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <View
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.round(downloadProgress * 100)}%` }}
                />
              </View>
              <Text className="text-gray-400 text-sm mt-2">
                {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
          </View>
        )}

        {/* Toast notification */}
        {toastMessage && (
          <Animated.View
            style={{ opacity: toastAnim }}
            className="absolute top-4 left-0 right-0 items-center"
          >
            <View className="bg-gray-800 border border-gray-600 rounded-full px-5 py-2.5 shadow-lg">
              <Text className="text-white font-medium text-sm">{toastMessage}</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* ── Bottom Action Toolbar ── */}
      <View
        style={{ paddingBottom: insets.bottom + 8 }}
        className="bg-gray-900 border-t border-gray-700 px-4 pt-3"
      >
        <View className="flex-row justify-around">
          {/* Download */}
          <ActionButton
            icon="download-outline"
            label="Download"
            onPress={handleDownload}
            disabled={isLoading}
            loading={actionState === 'downloading'}
            color="#3B82F6"
          />

          {/* Share */}
          <ActionButton
            icon="share-outline"
            label="Share"
            onPress={handleShare}
            disabled={isLoading}
            loading={actionState === 'sharing'}
            color="#10B981"
          />

          {/* Print */}
          <ActionButton
            icon="print-outline"
            label="Print"
            onPress={handlePrint}
            disabled={isLoading}
            color="#F59E0B"
          />

          {/* Delete — only for inbox faxes */}
          {isInbox && (
            <ActionButton
              icon="trash-outline"
              label="Delete"
              onPress={handleDelete}
              disabled={isLoading}
              loading={actionState === 'deleting'}
              color="#EF4444"
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ── ActionButton sub-component ────────────────────────────────────────────────
interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
}

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
  loading,
  color = 'white',
}: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="items-center py-2 px-4"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View
        className="w-12 h-12 rounded-2xl items-center justify-center mb-1"
        style={{ backgroundColor: `${color}22` }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Ionicons name={icon} size={24} color={color} />
        )}
      </View>
      <Text className="text-gray-400 text-xs font-medium">{label}</Text>
    </TouchableOpacity>
  );
}
