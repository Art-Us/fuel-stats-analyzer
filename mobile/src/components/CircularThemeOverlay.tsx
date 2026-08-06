import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { darkColors, lightColors } from '../theme/colors';

interface CircularThemeOverlayProps {
  cx: number;
  cy: number;
  nextTheme: 'light' | 'dark';
  onBackgroundCovered: () => void;
  onComplete: () => void;
}

export const CircularThemeOverlay: React.FC<CircularThemeOverlayProps> = ({
  cx,
  cy,
  nextTheme,
  onBackgroundCovered,
  onComplete,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  const maxDistanceX = Math.max(cx, SCREEN_WIDTH - cx);
  const maxDistanceY = Math.max(cy, SCREEN_HEIGHT - cy);
  const maxRadius = Math.ceil(Math.hypot(maxDistanceX, maxDistanceY)) + 40;

  const nextColors = nextTheme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    // 1. Expand circle filled with new background color over 750ms
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // 2. Circle covers 100% of the screen. Trigger theme elements update now!
      onBackgroundCovered();

      // 3. Smoothly fade out overlay to reveal updated UI elements
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          onComplete();
        });
      }, 40);
    });
  }, []);

  const scale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.05],
  });

  return (
    <Animated.View style={[styles.overlayContainer, { opacity: fadeAnim }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.circle,
          {
            left: cx - maxRadius,
            top: cy - maxRadius,
            width: maxRadius * 2,
            height: maxRadius * 2,
            borderRadius: maxRadius,
            backgroundColor: nextColors.bgApp,
            transform: [{ scale }],
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  circle: {
    position: 'absolute',
  },
});
