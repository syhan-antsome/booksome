import { Box, Typography } from '@mui/material';
import { useRecordContext } from 'react-admin';

const labels: Record<string, string> = {
  active: '활성',
  suspended: '정지',
  deleted: '탈퇴',
  USER: '일반',
  ADMIN: '관리자',
  reading: '읽는 중',
  finished: '완독',
  public: '공개',
  private: '비공개',
  unlisted: '링크 공개',
  pending: '대기',
  approved: '승인',
  rejected: '거절',
  needs_review: '검토 필요',
  failed: '실패',
  hidden: '숨김',
  available: '거래 가능',
  reserved: '예약',
  completed: '완료',
  offer: '판매',
  wanted: '구해요',
};

const tones: Record<string, { color: string; background: string }> = {
  active: { color: '#326b3c', background: '#edf6ed' },
  approved: { color: '#326b3c', background: '#edf6ed' },
  public: { color: '#326b3c', background: '#edf6ed' },
  available: { color: '#326b3c', background: '#edf6ed' },
  ADMIN: { color: '#885b08', background: '#fff4dc' },
  pending: { color: '#885b08', background: '#fff4dc' },
  needs_review: { color: '#885b08', background: '#fff4dc' },
  reserved: { color: '#885b08', background: '#fff4dc' },
  suspended: { color: '#a13f36', background: '#faecea' },
  rejected: { color: '#a13f36', background: '#faecea' },
  failed: { color: '#a13f36', background: '#faecea' },
  hidden: { color: '#5f625e', background: '#efefec' },
  deleted: { color: '#5f625e', background: '#efefec' },
};

export function StatusBadge({ source }: { source: string }) {
  const record = useRecordContext<Record<string, unknown>>();
  const value = String(record?.[source] ?? '');
  const tone = tones[value] || { color: '#56615a', background: '#eef1ed' };
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7, borderRadius: '5px', bgcolor: tone.background, px: 1, py: 0.45 }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tone.color }} />
      <Typography component="span" sx={{ color: tone.color, fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap' }}>
        {labels[value] || value || '—'}
      </Typography>
    </Box>
  );
}
