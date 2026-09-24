// services/pushNotifications.ts – Expo Push Notifications & Firebase Cloud Messaging
import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

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

  // Save push token to Supabase
  await savePushToken(pushToken.data);

  return pushToken.data;
}

async function savePushToken(token: string) {
  const { user } = useAuthStore.getState();
  if (!user?.id) return;

  try {
    await supabase
      .from('push_notification_settings')
      .upsert({
        user_id: user.id,
        push_token: token,
        last_token_refresh_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
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
  const { user } = useAuthStore.getState();
  if (!user?.id) return;

  try {
    // Get accounts with expiring points
    const { data: expiringAccounts } = await supabase
      .from('linked_accounts')
      .select(`
        id,
        program_id,
        programs:loyalty_programs(name),
        current_balance,
        expiring_points,
        expiry_date
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expiring_points', 0)
      .lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());

    if (!expiringAccounts) return;

    for (const account of expiringAccounts) {
      const daysUntilExpiry = Math.ceil(
        (new Date(account.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Check if we should alert (15, 30, 45, 90 days)
      const alertDays = [15, 30, 45, 90];
      if (alertDays.includes(daysUntilExpiry)) {
        // Check if we already sent this alert
        const { data: existingAlert } = await supabase
          .from('expiry_alerts')
          .select('id')
          .eq('linked_account_id', account.id)
          .eq('alert_type', `${daysUntilExpiry}days`)
          .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (!existingAlert) {
          await scheduleExpiryAlert(
            (account as any).programs?.name || (account as any).program?.name || 'Loyalty Program',
            account.expiring_points,
            account.expiry_date,
            daysUntilExpiry
          );

          // Log alert in database
          await supabase.from('expiry_alerts').insert({
            user_id: user.id,
            linked_account_id: account.id,
            alert_type: `${daysUntilExpiry}days`,
            points_at_risk: account.expiring_points,
            sent_push_notification: true,
          });
        }
      }
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

// Get notification settings from Supabase
export async function getNotificationSettings(): Promise<PushNotificationSettings> {
  const { user } = useAuthStore.getState();
  if (!user?.id) return DEFAULT_SETTINGS;

  try {
    const { data, error } = await supabase
      .from('push_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return DEFAULT_SETTINGS;

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
  const { user } = useAuthStore.getState();
  if (!user?.id) return;

  try {
    await supabase
      .from('push_notification_settings')
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch (error) {
    console.error('Error updating notification settings:', error);
  }
}