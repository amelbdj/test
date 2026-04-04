import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface AvatarProps {
  source: string | null;
  name: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ source, name, size = 40 }) => {
  const theme = useTheme();
  const initials = name.slice(0, 2).toUpperCase();

  if (source) {
    const imageUri = source.startsWith('data:') ? source : `data:image/jpeg;base64,${source}`;
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 }
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.primary,
        }
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#E0E0E0',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
