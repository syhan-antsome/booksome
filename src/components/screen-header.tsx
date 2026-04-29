import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton } from './back-button';

type ScreenHeaderTone = 'forest' | 'paper' | 'clay' | 'sage' | 'ink';

type ScreenHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
  tone?: ScreenHeaderTone;
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
  subtitle,
  title,
  tone = 'forest',
}: ScreenHeaderProps) {
  const colors = toneStyles[tone];

  return (
    <View style={styles.shell}>
      <View style={styles.topRow}>
        <BackButton />
        <View style={styles.titleSlot}>
          <Text style={[styles.topTitle, colors.title]} numberOfLines={1}>
            {title}
          </Text>
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
