import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  style,
  ...props
}) => {
  const theme = useTheme();
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.surfaceVariant,
            borderColor: error ? theme.error : isFocused ? theme.primary : theme.border,
            borderWidth: isFocused || error ? 1.5 : 1,
          },
          isFocused && !error && { ...theme.elevation.glow, shadowColor: theme.primary, shadowOpacity: 0.18 },
        ]}
      >
        {icon && (
          <Ionicons name={icon} size={20} color={isFocused ? theme.primary : theme.textTertiary} style={styles.leftIcon} />
        )}
        <TextInput
          showSoftInputOnFocus
          {...props}
          secureTextEntry={isSecure}
          style={[
            styles.input,
            { color: theme.text },
            icon && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
            style,
          ]}
          placeholderTextColor={theme.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            style={styles.rightIcon}
          >
            <Ionicons
              name={isSecure ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.textTertiary}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    marginLeft: 16,
  },
  rightIcon: {
    padding: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 6,
  },
});
