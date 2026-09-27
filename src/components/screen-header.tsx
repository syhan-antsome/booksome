import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { booksomeColors as c } from '../theme/booksome';
import { BackButton } from './back-button';
type ScreenHeaderProps = {
  title: string; subtitle?: string; action?: ReactNode;
  eyebrow?: string; tone?: 'forest' | 'paper' | 'clay' | 'sage' | 'ink';
  expressiveTitle?: boolean; titleImage?: string | number | ImageSourcePropType; titleImageWidth?: number;
};
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return <View style={styles.shell}>
    <View style={styles.row}><BackButton /><Text accessibilityRole="header" numberOfLines={2} style={styles.title}>{title}</Text><View style={styles.action}>{action}</View></View>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>;
}
export function HeaderIconButton({ label, symbol }: { label: string; symbol: string }) {
  return <View accessibilityLabel={label}><Text style={{ color: c.ink, fontSize: 22 }}>{symbol}</Text></View>;
}
const styles = StyleSheet.create({
  shell: { marginBottom: 20 }, row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 10 },
  title: { color: c.ink, fontSize: 18, lineHeight: 25, fontWeight: '700', flex: 1, textAlign: 'center' },
  action: { minWidth: 44, alignItems: 'flex-end' }, subtitle: { color: c.muted, fontSize: 14, lineHeight: 22, marginTop: 18 },
});
