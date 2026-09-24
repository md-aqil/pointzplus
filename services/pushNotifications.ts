// services/pushNotifications.ts – Expo Push Notifications (backed by local PostgreSQL API)
import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../lib/apiClient';

// Local dedup ledger so we don't re-notify for the same account+tier on every app open
const SENT_ALERTS_KEY = 'pointzplus_sent_expiry_alerts';

async function getSentAlerts(): Promise<Record<string, string>> {
  try {
    const raw = await SecureStore.getItemAsync(SENT_ALERTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function markAlertSent(key: string): Promise<void> {
  try {
    const current = await getSentAlerts();
    current[key] = new Date().toISOString();
    await SecureStore.setItemAsync(SENT_ALERTS_KEY, JSON.stringify(current));
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

interface PushNotificationSettings {
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
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
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

  const pushToken = await ExpoNotifications.getExpoPushTokenAsync();
  console.log('Push token obtained:', pushToken.data);

  // Save push token via the local API
  await savePushToken(pushToken.data);

  return pushToken.data;
}

async function savePushToken(token: string) {
  try {
    await apiClient.registerPushToken(token);
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

// Send local notification (immediate)
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId: string = 'default'
) {
  await ExpoNotifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // null = immediate
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

// Send earning notification
export async function notifyPointsEarned(
  programName: string,
  pointsEarned: number
) {
  const title = `🎉 +${pointsEarned} Points Earned!`;
  const body = `Great news! You just earned ${pointsEarned} points with ${programName}.`;

  await sendLocalNotification(
    title,
    body,
    { type: 'earning_alert', programName, pointsEarned },
    'earning-alerts'
  );
}

// Notify about new offer
export async function notifySpecialOffer(
  offerTitle: string,
  offerDescription: string,
  partnerName: string
) {
  const title = `🎁 ${offerTitle}`;
  const body = `${offerDescription} - Valid at ${partnerName}`;

  await sendLocalNotification(
    title,
    body,
    { type: 'offer', partnerName, offerTitle },
    'offers'
  );
}

// Check and trigger expiry alerts (run on app open/background sync)
export async function checkAndTriggerExpiryAlerts() {
  try {
    // Accounts with points expiring within 90 days (from local PostgreSQL API)
    const expiringAccounts = await apiClient.getExpiryAlerts();
    if (!Array.isArray(expiringAccounts) || expiringAccounts.length === 0) return;

    const sentAlerts = await getSentAlerts();

    for (const account of expiringAccounts) {
      const daysUntilExpiry = Math.ceil(
        (new Date(account.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Bucketed thresholds: smallest of 15/30/45/90 that is >= daysUntil,
      // so alerts fire on any day (exact-match checks almost never fired).
      const alertDays = [15, 30, 45, 90];
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
      await markAlertSent(dedupKey);
      // The server-side cron (/api/notifications/check-expiry) records the
      // expiry_alerts row; the client only schedules the local notification.
    }
  } catch (error) {
    console.error('Error checking expiry alerts:', error);
  }
}

// Notification response handler (when user taps notification)
export function setupNotificationResponseHandler(
  onNotificationTap: (data: Record<string, any>) => void
) {
  ExpoNotifications.addNotificationResponseReceivedListener(response => {
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
      expiryWarningDays: data.expiry_warning_days ?? [15, 30, 45, 90],
      earningAlertsEnabled: data.earning_alerts_enabled ?? true,
      offerAlertsEnabled: data.offer_alerts_enabled ?? true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Update notification settings
export async function updateNotificationSettings(settings: Partial<PushNotificationSettings>) {
  try {
    await apiClient.updateNotificationSettings(settings);
  } catch (error) {
    console.error('Error updating notification settings:', error);
  }
}