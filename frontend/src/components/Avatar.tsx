import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

interface AvatarProps {
  source: string | null;
  name: string;
  size?: number;
  showBorder?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ source, name, size = 40, showBorder = false }) => {
  const theme = useTheme();
  const initials = name.slice(0, 2).toUpperCase();
  const fontSize = size * 0.38;

  if (source) {
    const imageUri = source.startsWith('data:') ? source : `data:image/jpeg;base64,${source}`;
    
    if (showBorder) {
      return (
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientBorder,
            { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={[
              styles.image,
              { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.surfaceVariant }
            ]}
          />
        </LinearGradient>
      );
    }
    
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.surfaceVariant }
        ]}
      />
    );
  }

  if (showBorder) {
    return (
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradientBorder,
          { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }
        ]}
      >
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.surfaceVariant,
            }
          ]}
        >
          <Text style={[styles.initials, { fontSize, color: theme.primary }]}>{initials}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        }
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  image: {},
  gradientBorder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
