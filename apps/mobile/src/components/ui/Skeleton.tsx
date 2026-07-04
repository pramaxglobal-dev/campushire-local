import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { useEffect, useRef } from "react";

interface SkeletonProps {
  height?: number;
  width?: number | `${number}%` | "auto";
  style?: ViewStyle;
}

export function Skeleton({ height = 16, width = "100%", style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { opacity, height, width },
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#E2E8F0",
    borderRadius: 8
  }
});
