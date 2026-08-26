import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Title } from 'react-admin';

import { authorizedRequest } from '../api';
import type { SystemOverview } from '../types';

function duration(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return [days ? `${days}일` : '', hours ? `${hours}시간` : '', `${minutes}분`].filter(Boolean).join(' ');
}

export function SystemPage() {
  const [data, setData] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await authorizedRequest<SystemOverview>('/api/admin/system'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '시스템 상태를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <Box>
      <Title title="시스템" />
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography variant="h1">시스템</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.7 }}>서버의 주요 구성요소를 읽기 전용으로 확인합니다.</Typography>
        </Box>
        <Button onClick={() => void load()} startIcon={<RefreshOutlinedIcon />} disabled={loading}>새로고침</Button>
      </Box>
      {loading && !data ? <Box sx={{ display: 'grid', minHeight: 280, placeItems: 'center' }}><CircularProgress /></Box> : null}
      {error ? <Paper variant="outlined" sx={{ p: 2, color: 'error.main' }}>{error}</Paper> : null}
      {data ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
          {data.services.map((service) => {
            const color = service.status === 'healthy' ? '#3f824d' : service.status === 'degraded' ? '#c7830e' : service.status === 'disabled' ? '#777d78' : '#b44940';
            return (
              <Paper key={service.id} variant="outlined" sx={{ p: 2.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h3">{service.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{service.status === 'healthy' ? '정상' : service.status === 'degraded' ? '주의' : service.status === 'disabled' ? '꺼짐' : '확인 필요'}</Typography>
                  </Box>
                </Box>
                <Typography color="text.secondary" sx={{ mt: 1.6 }}>{service.detail}</Typography>
              </Paper>
            );
          })}
          <Paper variant="outlined" sx={{ p: 2.4 }}>
            <Typography variant="h3">API 가동 시간</Typography>
            <Typography sx={{ mt: 1.5, fontSize: 24, fontWeight: 720 }}>{duration(data.uptimeSeconds)}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 12.5 }}>마지막 서버 시작 이후</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.4 }}>
            <Typography variant="h3">백업</Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.65 }}>
              백업 실행과 복구 검증은 서버 자동화 단계에서 연결합니다. 이 화면에서는 아직 임의의 성공 상태를 표시하지 않습니다.
            </Typography>
          </Paper>
        </Box>
      ) : null}
    </Box>
  );
}
