import type { ReactNode } from 'react';
import { Image, type ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton } from './back-button';

type ScreenHeaderTone = 'forest' | 'paper' | 'clay' | 'sage' | 'ink';

type ScreenHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
  tone?: ScreenHeaderTone;
  expressiveTitle?: boolean;
  titleImage?: string | number | ImageSourcePropType;
  titleImageWidth?: number;
};

const toneStyles = {
  forest: {
    accent: { backgroundColor: '#103D2B' },
    eyebrow: { color: '#116653' },
    title: { color: '#14251B' },
    subtitle: { color: '#526154' },
  },
  paper: {
    accent: { backgroundColor: '#D8BE88' },
    eyebrow: { color: '#8F6A42' },
    title: { color: '#14251B' },
    subtitle: { color: '#667167' },
  },
  clay: {
    accent: { backgroundColor: '#8F6A42' },
    eyebrow: { color: '#8F6A42' },
    title: { color: '#14251B' },
    subtitle: { color: '#66594A' },
  },
  sage: {
    accent: { backgroundColor: '#91A889' },
    eyebrow: { color: '#116653' },
    title: { color: '#10281C' },
    subtitle: { color: '#526154' },
  },
  ink: {
    accent: { backgroundColor: '#142326' },
    eyebrow: { color: '#35504D' },
    title: { color: '#142326' },
    subtitle: { color: '#5E6766' },
  },
} satisfies Record<ScreenHeaderTone, Record<string, object>>;

export function ScreenHeader({
  action,
  eyebrow,
  expressiveTitle = false,
  subtitle,
  title,
  titleImage,
  titleImageWidth = 160,
  tone = 'forest',
}: ScreenHeaderProps) {
  const colors = toneStyles[tone];
  const letteringWidth = Math.max(72, Math.min(122, title.length * 28));
  const titleImageSource =
    typeof titleImage === 'string' || typeof titleImage === 'number'
      ? toImageSource(titleImage)
      : titleImage;

  return (
    <View style={styles.shell}>
      <View style={styles.topRow}>
        <BackButton />
        <View style={styles.titleSlot}>
          {titleImageSource ? (
            <Image
              accessibilityLabel={title}
              resizeMode="contain"
              source={titleImageSource}
              style={[styles.titleImage, { width: titleImageWidth }]}
            />
          ) : expressiveTitle ? (
            <View style={styles.letteringWrap}>
              <Text
                style={[
                  styles.letteringShadow,
                  colors.eyebrow,
                  { marginLeft: -letteringWidth / 2 },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text style={[styles.letteringTitle, colors.title]} numberOfLines={1}>
                {title}
              </Text>
              <View style={[styles.letteringStroke, colors.accent, { width: letteringWidth }]} />
            </View>
          ) : (
            <Text style={[styles.topTitle, colors.title]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
        <View style={styles.actionSlot}>{action ?? <View style={styles.actionSpacer} />}</View>
      </View>

      <View style={styles.copyBlock}>
        <View style={[styles.accent, colors.accent]} />
        <View style={styles.copyText}>
          {eyebrow ? <Text style={[styles.eyebrow, colors.eyebrow]}>{eyebrow}</Text> : null}
          {subtitle ? (
            <Text style={[styles.subtitle, colors.subtitle]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function toImageSource(image: string | number): ImageSourcePropType {
  return typeof image === 'string' ? { uri: image } : image;
}

export function HeaderIconButton({ label, symbol }: { label: string; symbol: string }) {
  return (
    <Pressable accessibilityLabel={label} style={styles.iconButton}>
      <Text style={styles.iconText}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginBottom: 20,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  titleSlot: {
    flex: 1,
    minWidth: 0,
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  titleImage: {
    alignSelf: 'center',
    height: 64,
  },
  letteringWrap: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  letteringTitle: {
    fontSize: 27,
    fontStyle: 'italic',
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 34,
    transform: [{ rotate: '-2deg' }],
  },
  letteringShadow: {
    fontSize: 27,
    fontStyle: 'italic',
    fontWeight: '900',
    left: '50%',
    letterSpacing: 0,
    lineHeight: 34,
    opacity: 0.22,
    position: 'absolute',
    top: 7,
    transform: [{ rotate: '2deg' }],
  },
  letteringStroke: {
    bottom: 5,
    height: 4,
    opacity: 0.72,
    position: 'absolute',
    transform: [{ rotate: '-2deg' }],
  },
  actionSlot: {
    alignItems: 'flex-end',
    width: 44,
  },
  actionSpacer: {
    height: 44,
    width: 44,
  },
  copyBlock: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingLeft: 2,
  },
  accent: {
    height: 54,
    marginTop: 3,
    width: 3,
  },
  copyText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 28,
    marginTop: 7,
    maxWidth: 310,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'rgba(16,61,43,0.16)',
    borderWidth: 1,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconText: {
    color: '#103D2B',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 25,
  },
});
