import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { apiClient } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    
    // Trigger haptic feedback based on notification type
    try {
      if (Platform.OS !== 'web') {
        switch (data?.type) {
          case 'like':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'comment':
          case 'message':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'milestone':
            // Triple vibration for milestones!
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 200);
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
            break;
          case 'friend_request':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          default:
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (e) {
      // Haptics might not be available
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);
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
      notificationListener.current?.remove();
      responseListener.current?.remove();
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
    } else if (data?.screen === 'streak') {
      router.push('/streak');
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
      // Main channel for social interactions
      await Notifications.setNotificationChannelAsync('social', {
        name: 'Social',
        description: 'Likes, commentaires et demandes d\'amis',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#FF3B5C',
        sound: 'default',
      });

      // Messages channel
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'Messages prives',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 150, 50, 150],
        lightColor: '#8B5CF6',
        sound: 'default',
      });

      // Milestones channel
      await Notifications.setNotificationChannelAsync('milestones', {
        name: 'Milestones',
        description: 'Recompenses et milestones de streak',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 100, 300, 100, 300],
        lightColor: '#FFD700',
        sound: 'default',
      });

      // Default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
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
