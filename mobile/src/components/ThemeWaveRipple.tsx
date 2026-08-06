import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Easing } from 'react-native';

interface ThemeWaveRippleProps {
  cx: number;
  cy: number;
  rippleColor: string;
  onComplete: () => void;
}

export const ThemeWaveRipple: React.FC<ThemeWaveRippleProps> = ({
  cx,
  cy,
  rippleColor,
  onComplete,
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  const maxDistanceX = Math.max(cx, SCREEN_WIDTH - cx);
  const maxDistanceY = Math.max(cy, SCREEN_HEIGHT - cy);
  const maxRadius = Math.ceil(Math.hypot(maxDistanceX, maxDistanceY)) + 40;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  }, []);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.05],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.65, 0.5, 0.25, 0],
  });

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      <Animated.View
        style={[
          styles.rippleCircle,
          {
            left: cx - maxRadius,
            top: cy - maxRadius,
            width: maxRadius * 2,
            height: maxRadius * 2,
            borderRadius: maxRadius,
            borderColor: rippleColor,
            borderWidth: 6,
            backgroundColor: 'transparent',
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  rippleCircle: {
    position: 'absolute',
  },
});
