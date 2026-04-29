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
    shell: { backgroundColor: '#103D2B' },
    eyebrow: { color: '#D8BE88' },
    title: { color: '#FFFFFF' },
    subtitle: { color: 'rgba(255,255,255,0.74)' },
  },
  paper: {
    shell: { backgroundColor: '#F8F3E9' },
    eyebrow: { color: '#8F6A42' },
    title: { color: '#14251B' },
    subtitle: { color: '#667167' },
  },
  clay: {
    shell: { backgroundColor: '#8F6A42' },
    eyebrow: { color: '#F2DDA7' },
    title: { color: '#FFFFFF' },
    subtitle: { color: 'rgba(255,255,255,0.76)' },
  },
  sage: {
    shell: { backgroundColor: '#DDE6D4' },
    eyebrow: { color: '#116653' },
    title: { color: '#10281C' },
    subtitle: { color: '#526154' },
  },
  ink: {
    shell: { backgroundColor: '#142326' },
    eyebrow: { color: '#F4D38A' },
    title: { color: '#FFFFFF' },
    subtitle: { color: 'rgba(255,255,255,0.72)' },
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
    <View style={[styles.shell, colors.shell]}>
      <View style={styles.topRow}>
        <BackButton />
        <View style={styles.titleSlot}>
          <Text style={[styles.topTitle, colors.title]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.actionSlot}>{action ?? <View style={styles.actionSpacer} />}</View>
      </View>

      {eyebrow ? <Text style={[styles.eyebrow, colors.eyebrow]}>{eyebrow}</Text> : null}
      {subtitle ? (
        <Text style={[styles.subtitle, colors.subtitle]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
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
    borderRadius: 30,
    marginBottom: 20,
    overflow: 'hidden',
    padding: 14,
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
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 20,
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
    backgroundColor: 'rgba(247,241,229,0.92)',
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
