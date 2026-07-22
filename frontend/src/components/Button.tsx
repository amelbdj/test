import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  gradient?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  gradient = true,
}) => {
  const theme = useTheme();

  const getTextColor = () => {
    if (disabled) return theme.textTertiary;
    switch (variant) {
      case 'primary':
      case 'secondary':
        return '#FFFFFF';
      case 'outline':
        return theme.primary;
      case 'ghost':
        return theme.text;
      default:
        return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 10, paddingHorizontal: 18 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 32 };
      default:
        return { paddingVertical: 14, paddingHorizontal: 24 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 17;
      default:
        return 16;
    }
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            { color: getTextColor(), fontSize: getFontSize() },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </>
  );

  if (variant === 'primary' && gradient && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          theme.elevation.glow,
          { shadowColor: theme.primary },
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            getPadding(),
            fullWidth && styles.fullWidth,
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const getBackgroundColor = () => {
    if (disabled) return theme.surfaceVariant;
    switch (variant) {
      case 'primary':
        return theme.primary;
      case 'secondary':
        return theme.secondary;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return theme.primary;
    }
  };

  const isSolid = (variant === 'primary' || variant === 'secondary') && !disabled;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === 'outline' ? theme.primary : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        isSolid && theme.elevation.sm,
        fullWidth && styles.fullWidth,
        style,
      ]}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
