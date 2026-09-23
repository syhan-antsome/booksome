import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { booksomeColors as c, booksomeType } from '../theme/booksome';
const collectorCover = require('../../assets/collector/cover-art.png');

type Props = { title: string; author?: string | null; uri?: string | null; width?: number; tilt?: number; progress?: number };

export function BookObject({ title, author, uri, width = 140, tilt = 0, progress }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const height = width * 1.48, depth = Math.max(4, width * 0.046);
  return <View accessibilityLabel={`${title} 책 표지`} style={{ width: width + depth + 4, height: height + depth + 4 }}>
    <View style={[styles.object, { width, height, transform: [{ rotate: `${tilt}deg` }] }]}>
      <View style={[styles.pages, { left: depth + 1, right: -depth, bottom: -depth, top: depth }]}>
        {Array.from({ length: 5 }, (_, i) => <View key={i} style={[styles.pageLine, { right: i * depth / 5, borderRightWidth: 0.5, borderBottomWidth: 0.5, bottom: i * depth / 5 }]} />)}
      </View>
      <View style={styles.cover}>
        {uri && !failed ? <Image onError={() => setFailed(true)} source={{ uri }} resizeMode="cover" style={styles.image} /> : <View style={styles.fallback}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={collectorCover} resizeMode="cover" accessible={false} style={styles.image} /></View>
          <Text numberOfLines={2} style={[styles.fallbackTitle, { fontSize: Math.max(14, width * 0.14), lineHeight: Math.max(20, width * 0.21) }]}>{title}</Text>
          <Text numberOfLines={2} style={[styles.author, { fontSize: Math.max(9, width * 0.055) }]}>{author || '나의 문장이 쌓이는 곳'}</Text>
          <View style={styles.coverBand}><Text style={[styles.edition, { fontSize: Math.max(9, width * 0.06) }]}>BookSome</Text></View>
        </View>}
        <LinearGradient pointerEvents="none" colors={['rgba(5,21,15,.76)', 'rgba(5,21,15,.35)', 'rgba(255,255,255,.23)', 'rgba(0,0,0,.06)', 'transparent']} locations={[0, 0.21, 0.44, 0.64, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.spine, { width: Math.max(12, width * 0.095) }]} />
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,.16)', 'transparent', 'rgba(0,0,0,.08)']} style={StyleSheet.absoluteFill} />
      </View>
      {typeof progress === 'number' ? <View style={[styles.ribbon, { width: Math.max(36, width * 0.24), right: width * 0.07 }]}>
        <Text style={[styles.progress, { fontSize: Math.max(12, width * 0.085) }]}>{Math.round(progress)}%</Text>
        <View style={styles.ribbonRule} />
        <Svg width="100%" height={15} viewBox="0 0 50 15" preserveAspectRatio="none" style={styles.ribbonTip}><Path d="M0 0H50V15L25 4L0 15Z" fill={c.forest} /></Svg>
      </View> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  object: { position: 'relative', boxShadow: '3px 13px 17px rgba(35,40,20,0.25)', borderRadius: 2 },
  pages: { position: 'absolute', backgroundColor: '#E6DEBF', borderColor: '#B9AD8D', borderBottomWidth: 1, borderRightWidth: 1, borderBottomRightRadius: 2 },
  pageLine: { position: 'absolute', top: 0, left: 0, borderColor: 'rgba(129,111,70,0.34)' },
  cover: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 2, borderWidth: 0.5, borderColor: 'rgba(24,40,24,0.25)', backgroundColor: c.paperStrong },
  image: { width: '100%', height: '100%' },
  spine: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  fallback: { flex: 1, paddingHorizontal: '15%', paddingTop: '17%' },
  fallbackTitle: { fontFamily: booksomeType.serif, color: c.forest },
  author: { color: '#586C5A' },
  coverBand: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%', justifyContent: 'center', paddingLeft: '16%' },
  edition: { color: c.paperStrong, fontFamily: booksomeType.serif, letterSpacing: 1.2 },
  ribbon: { position: 'absolute', top: -10, backgroundColor: c.forest, paddingTop: 16, paddingBottom: 10, alignItems: 'center', boxShadow: '2px 3px 4px rgba(0,0,0,0.16)' },
  progress: { color: c.paperStrong, fontWeight: '600' },
  ribbonRule: { backgroundColor: 'rgba(255,250,235,.65)', height: 1, width: '55%', marginTop: 10 },
  ribbonTip: { position: 'absolute', bottom: -14, left: 0, right: 0 },
});
