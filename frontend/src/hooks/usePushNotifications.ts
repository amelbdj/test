import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { apiClient } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) {
        setExpoPushToken(token);
        registerTokenOnServer(token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    if (data?.screen === 'drop' && data?.drop_id) {
      router.push(`/drop/${data.drop_id}`);
    } else if (data?.screen === 'chat' && data?.conversation_id) {
      router.push(`/chat/${data.conversation_id}`);
    } else if (data?.screen === 'friends') {
      router.push('/(tabs)/friends');
    } else {
      router.push('/notifications');
    }
  };

  return { expoPushToken, notification };
}

async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.log('Error getting push token:', error);
    return null;
  }
}

async function registerTokenOnServer(token: string) {
  try {
    await apiClient.post('/push-token', { token });
    console.log('Push token registered on server');
  } catch (error) {
    console.log('Error registering push token:', error);
  }
}
