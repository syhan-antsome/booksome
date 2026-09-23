import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import Svg, { Path } from 'react-native-svg';
import { booksomeColors as c } from '../theme/booksome';

export const collectorPaper = require('../../assets/collector/paper.png');
export const collectorForest = require('../../assets/collector/forest.png');

export function PaperGrain() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={collectorPaper} resizeMode="cover" accessible={false} style={styles.grain} /></View>;
}

export function TornEdge({ color = c.paperStrong, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  return <View pointerEvents="none" style={[styles.edgeFrame, style]}><Svg width="100%" height={12} viewBox="0 0 430 12" preserveAspectRatio="none">
    <Path fill={color} d="M0 5L7 4.3L15 5.6L27 4.2L38 5L51 4L65 5.2L78 4.6L89 5.3L103 4.1L116 4.8L130 4.4L145 5.6L158 4L170 5.1L186 4.3L201 5.2L217 4.1L231 4.9L246 4.2L260 5.4L277 4.5L291 5.2L307 4.1L321 4.8L338 4.4L355 5.3L370 4.2L385 5.1L401 4.5L417 5.2L430 4.3V12H0Z" />
  </Svg></View>;
}

export function PaperSlip({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.slip, style]}><PaperGrain /><TornEdge style={styles.edge} />{children}</View>;
}

export function Cloth({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.cloth, style]}><View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={collectorForest} resizeMode="cover" accessible={false} style={styles.fillImage} /></View>{children}</View>;
}

const styles = StyleSheet.create({
  grain: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.32 },
  fillImage: { width: '100%', height: '100%' },
  edgeFrame: { height: 12 },
  slip: { backgroundColor: c.paperStrong, padding: 22, borderRadius: 2, boxShadow: '0px 6px 14px rgba(12,35,25,0.12)' },
  edge: { position: 'absolute', top: -8, left: 0, right: 0 },
  cloth: { backgroundColor: c.cloth },
});
