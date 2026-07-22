import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * React Native Web does not implement Alert.alert's UI - it silently no-ops,
 * so any onPress callback attached to a button (e.g. a redirect after saving)
 * never fires there. This wraps Alert.alert with a window.alert/confirm
 * fallback on web so the callback still runs.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const fullMessage = [title, message].filter(Boolean).join('\n\n');
  const actionable = (buttons || []).filter((b) => b.style !== 'cancel');

  if (!buttons || buttons.length === 0) {
    window.alert(fullMessage);
    return;
  }

  if (actionable.length <= 1) {
    window.alert(fullMessage);
    actionable[0]?.onPress?.();
    return;
  }

  // Multiple non-cancel actions: fall back to confirm (OK -> first action, Cancel -> last).
  if (window.confirm(fullMessage)) {
    actionable[0]?.onPress?.();
  } else {
    buttons.find((b) => b.style === 'cancel')?.onPress?.();
  }
}
