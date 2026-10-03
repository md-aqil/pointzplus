// services/pushNotifications.ts – Expo Push Notifications (backed by local PostgreSQL API)
import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { storage } from '../lib/storage';
import { apiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

// Local dedup ledger so we don't re-notify for the same account+tier on every app open.
// SecureStore values are size-capped (notably ~2KB on Android), so the ledger is
// pruned by age and entry count to keep writes small.
const SENT_ALERTS_KEY = 'pointzplus_sent_expiry_alerts';
const LEDGER_MAX_AGE_MS = 120 * 24 * 60 * 60 * 1000; // 120 days
const LEDGER_MAX_ENTRIES = 20;
const LEDGER_MAX_BYTES = 1800;

function pruneSentAlerts(entries: Record<string, string>): Record<string, string> {
  const cutoff = Date.now() - LEDGER_MAX_AGE_MS;
  return Object.fromEntries(
    Object.entries(entries)
      .filter(([, timestamp]) => {
        const t = new Date(timestamp).getTime();
        return Number.isFinite(t) && t >= cutoff;
      })
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .slice(0, LEDGER_MAX_ENTRIES)
  );
}

async function getSentAlerts(): Promise<Record<string, string>> {
  try {
    const raw = await storage.getItemAsync(SENT_ALERTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return pruneSentAlerts(parsed as Record<string, string>);
  } catch {
    return {};
  }
}

async function markAlertSent(key: string): Promise<void> {
  try {
    const current = await getSentAlerts();
    current[key] = new Date().toISOString();
    const payload = JSON.stringify(pruneSentAlerts(current));
    // Skip oversized writes rather than letting SecureStore reject them silently.
    if (payload.length > LEDGER_MAX_BYTES) return;
    await storage.setItemAsync(SENT_ALERTS_KEY, payload);
  } catch {
    // Non-fatal
  }
}

// Configure notification behavior
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationSettings {
  expiryAlertsEnabled: boolean;
  expiryWarningDays: number[];
  earningAlertsEnabled: boolean;
  offerAlertsEnabled: boolean;
}

const DEFAULT_SETTINGS: PushNotificationSettings = {
  expiryAlertsEnabled: true,
  expiryWarningDays: [15, 30, 45, 90],
  earningAlertsEnabled: true,
  offerAlertsEnabled: true,
};

// Request permissions and get push token
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.log('Push notification permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await ExpoNotifications.setNotificationChannelAsync('expiry-alerts', {
      name: 'Expiry Alerts',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#02EFF4',
    });

    await ExpoNotifications.setNotificationChannelAsync('earning-alerts', {
      name: 'Earning Alerts',
      importance: ExpoNotifications.AndroidImportance.DEFAULT,
    });

    await ExpoNotifications.setNotificationChannelAsync('offers', {
      name: 'Special Offers',
      importance: ExpoNotifications.AndroidImportance.DEFAULT,
    });
  }

  if (!Device.isDevice) {
    // Local notifications work in simulators; only remote Expo tokens do not.
    return null;
  }

  const pushToken = await ExpoNotifications.getExpoPushTokenAsync();

  // Save push token via the local API
  await savePushToken(pushToken.data);

  return pushToken.data;
}

async function savePushToken(token: string) {
  try {
    await apiClient.registerPushToken(token);
  } catch (error) {
    logger.error('Error saving push token:', error);
  }
}

async function ensureNotificationChannel(channelId: string) {
  if (Platform.OS !== 'android') return;
  if (channelId === 'earning-alerts') {
    await ExpoNotifications.setNotificationChannelAsync(channelId, {
      name: 'Earning Alerts',
      importance: ExpoNotifications.AndroidImportance.DEFAULT,
    });
  } else if (channelId === 'offers') {
    await ExpoNotifications.setNotificationChannelAsync(channelId, {
      name: 'Special Offers',
      importance: ExpoNotifications.AndroidImportance.DEFAULT,
    });
  } else if (channelId === 'expiry-alerts') {
    await ExpoNotifications.setNotificationChannelAsync(channelId, {
      name: 'Expiry Alerts',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#02EFF4',
    });
  }
}

// Send local notification (immediate)
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId: string = 'default'
) {
  await ensureNotificationChannel(channelId);
  await ExpoNotifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    // null schedules immediately; Android channel selection is configured above.
    trigger: null,
  });
}

// Schedule expiry alert notification
export async function scheduleExpiryAlert(
  programName: string,
  pointsExpiry: number,
  expiryDate: string,
  daysUntilExpiry: number
) {
  const title = `⚠️ ${pointsExpiry} Points Expiring Soon!`;
  const body = `Your ${programName} points will expire on ${expiryDate}. Use them before it's too late!`;

  await sendLocalNotification(
    title,
    body,
    { type: 'expiry_alert', programName, pointsExpiry, expiryDate },
    'expiry-alerts'
  );
}

// Send earning notification (respects the user's earning-alert setting)
export async function notifyPointsEarned(
  programName: string,
  pointsEarned: number
) {
  try {
    if (pointsEarned <= 0) return;
    const settings = await getNotificationSettings();
    if (!settings.earningAlertsEnabled) return;

    const { status } = await ExpoNotifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const title = `🎉 +${pointsEarned} Points Earned!`;
    const body = `Great news! You just earned ${pointsEarned} points with ${programName}.`;

    await sendLocalNotification(
      title,
      body,
      { type: 'earning_alert', programName, pointsEarned },
      'earning-alerts'
    );
  } catch (error) {
    logger.error('Error sending earning notification:', error);
  }
}

// Notify about new offer (respects the user's offer-alert setting)
export async function notifySpecialOffer(
  offerTitle: string,
  offerDescription: string,
  partnerName: string
) {
  try {
    const settings = await getNotificationSettings();
    if (!settings.offerAlertsEnabled) return;

    const { status } = await ExpoNotifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const title = `🎁 ${offerTitle}`;
    const body = `${offerDescription} - Valid at ${partnerName}`;

    await sendLocalNotification(
      title,
      body,
      { type: 'offer', partnerName, offerTitle },
      'offers'
    );
  } catch (error) {
    logger.error('Error sending offer notification:', error);
  }
}

// Check and trigger expiry alerts (runs on app open after auth)
export async function checkAndTriggerExpiryAlerts() {
  try {
    const settings = await getNotificationSettings();
    if (!settings.expiryAlertsEnabled || settings.expiryWarningDays.length === 0) return;

    const warningWindow = Math.max(...settings.expiryWarningDays);
    const expiringAccounts = await apiClient.getExpiryAlerts(warningWindow);
    if (!Array.isArray(expiringAccounts) || expiringAccounts.length === 0) return;

    const sentAlerts = await getSentAlerts();

    for (const account of expiringAccounts) {
      const daysUntilExpiry = Math.ceil(
        (new Date(account.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Bucketed thresholds: smallest configured threshold that covers the
      // expiry, so alerts fire on any day (exact-match checks almost never fired).
      const alertDays = [...settings.expiryWarningDays].sort((a, b) => a - b);
      const tier = alertDays.find((t) => daysUntilExpiry <= t);
      if (!tier) continue;

      const dedupKey = `expiry:${account.id}:${tier}days`;
      if (sentAlerts[dedupKey]) continue;

      await scheduleExpiryAlert(
        account.program_name || 'Loyalty Program',
        account.expiring_points,
        account.expiry_date,
        daysUntilExpiry
      );

      // Mirror the alert server-side so /notifications/history reflects it even
      // when the cron (/api/notifications/check-expiry) has not run yet.
      try {
        await apiClient.recordExpiryAlert({
          accountId: account.id,
          alertType: `${tier}days`,
          pointsAtRisk: account.expiring_points,
        });
      } catch {
        // Best-effort mirror; the local banner already fired.
      }

      await markAlertSent(dedupKey);
    }
  } catch (error) {
    logger.error('Error checking expiry alerts:', error);
  }
}

// Notification response handler (when user taps notification)
export function setupNotificationResponseHandler(
  onNotificationTap: (data: Record<string, any>) => void
) {
  // Cold start: the app may have been launched by a notification tap, in which
  // case the listener below would never fire for it.
  try {
    const last = ExpoNotifications.getLastNotificationResponse();
    const coldStartData = last?.notification.request.content.data;
    if (coldStartData) {
      onNotificationTap(coldStartData);
      ExpoNotifications.clearLastNotificationResponse();
    }
  } catch {
    // Non-fatal: cold-start replay is best-effort.
  }

  return ExpoNotifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data) {
      onNotificationTap(data);
    }
  });
}

// Get notification settings from the local API
export async function getNotificationSettings(): Promise<PushNotificationSettings> {
  try {
    const data = await apiClient.getNotificationSettings();
    if (!data) return DEFAULT_SETTINGS;

    return {
      expiryAlertsEnabled: data.expiry_alerts_enabled ?? true,
      expiryWarningDays: (data.expiry_warning_days ?? [15, 30, 45, 90]).map(Number),
      earningAlertsEnabled: data.earning_alerts_enabled ?? true,
      offerAlertsEnabled: data.offer_alerts_enabled ?? true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Update notification settings
export async function updateNotificationSettings(settings: Partial<PushNotificationSettings>) {
  await apiClient.updateNotificationSettings(settings);
}