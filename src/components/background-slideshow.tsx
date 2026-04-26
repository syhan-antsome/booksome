import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';

type BackgroundSlideshowProps = {
  sources: ImageSourcePropType[];
};

export function BackgroundSlideshow({ sources }: BackgroundSlideshowProps) {
  const source = sources[0];

  if (!source) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image resizeMode="cover" source={source} style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    bottom: -32,
    height: '112%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: -32,
    width: '100%',
  },
});
