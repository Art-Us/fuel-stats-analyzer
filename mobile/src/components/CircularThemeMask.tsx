import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Easing } from 'react-native';

interface CircularThemeMaskProps {
  cx: number;
  cy: number;
  onComplete: () => void;
  children: React.ReactNode;
}

export const CircularThemeMask = React.memo<CircularThemeMaskProps>(({
  cx,
  cy,
  onComplete,
  children,
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  const maxDistanceX = Math.max(cx, SCREEN_WIDTH - cx);
  const maxDistanceY = Math.max(cy, SCREEN_HEIGHT - cy);
  const maxRadius = Math.ceil(Math.hypot(maxDistanceX, maxDistanceY)) + 40;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      onComplete();
    });
  }, []);

  const left = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [cx, cx - maxRadius],
  });

  const top = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [cy, cy - maxRadius],
  });

  const size = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxRadius * 2],
  });

  const borderRadius = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxRadius],
  });

  const childLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-cx, maxRadius - cx],
  });

  const childTop = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-cy, maxRadius - cy],
  });

  return (
    <View style={styles.overlayContainer} pointerEvents="auto">
      <Animated.View
        style={[
          styles.maskContainer,
          {
            left,
            top,
            width: size,
            height: size,
            borderRadius,
          },
        ]}
        pointerEvents="none"
      >
        <Animated.View
          style={[
            styles.childContainer,
            {
              left: childLeft,
              top: childTop,
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
            },
          ]}
          pointerEvents="none"
        >
          {children}
        </Animated.View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  maskContainer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  childContainer: {
    position: 'absolute',
  },
});
