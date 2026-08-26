import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, Title } from 'react-admin';

import { authorizedRequest } from '../api';
import type { DashboardData, ServiceStatus } from '../types';

const number = new Intl.NumberFormat('ko-KR');
const dateTime = new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function Metric({ label, value, icon, accent }: { label: string; value: number; icon: ReactNode; accent?: boolean }) {
  return (
    <Paper variant="outlined" sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 2, p: 2.2 }}>
      <Box sx={{ display: 'grid', width: 40, height: 40, flex: '0 0 auto', placeItems: 'center', color: accent ? '#a16606' : '#305d45', bgcolor: accent ? '#fff4dd' : '#edf3ee', borderRadius: 1 }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>{label}</Typography>
        <Typography sx={{ fontSize: 25, fontWeight: 720, letterSpacing: '-0.035em' }}>{number.format(value)}</Typography>
      </Box>
    </Paper>
  );
}

function Section({ title, action, children, sx }: { title: string; action?: ReactNode; children: ReactNode; sx?: object }) {
  return (
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: 'hidden', ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', px: 2.2, py: 1.7 }}>
        <Typography variant="h3">{title}</Typography>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

function SystemRow({ service }: { service: ServiceStatus }) {
  const healthy = service.status === 'healthy';
  const color = healthy ? '#3f824d' : service.status === 'degraded' ? '#c7830e' : service.status === 'disabled' ? '#777d78' : '#b44940';
  const label = healthy ? '정상' : service.status === 'degraded' ? '주의' : service.status === 'disabled' ? '꺼짐' : '확인 필요';
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 1fr) auto', gap: 2, alignItems: 'center', px: 2.2, py: 1.65, '& + &': { borderTop: '1px solid #ebe8e1' } }}>
      <Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 650 }}>{service.name}</Typography>
        <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>{service.detail}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, color }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{label}</Typography>
      </Box>
    </Box>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      setData(await authorizedRequest<DashboardData>('/api/admin/dashboard'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '대시보드를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Box>
      <Title title="운영 대시보드" />
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography variant="h1">운영 대시보드</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.7 }}>북썸의 핵심 현황과 확인이 필요한 항목입니다.</Typography>
        </Box>
        <Button
          onClick={() => void load()}
          startIcon={<RefreshOutlinedIcon />}
          disabled={loading}
          aria-label="새로고침"
          sx={{ minWidth: { xs: 40, sm: 64 }, px: { xs: 1, sm: 1.5 }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: 0 } }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>새로고침</Box>
        </Button>
      </Box>

      {loading && !data ? <Box sx={{ display: 'grid', minHeight: 360, placeItems: 'center' }}><CircularProgress size={34} /></Box> : null}
      {error ? <Paper variant="outlined" sx={{ borderColor: '#e3b8b4', color: 'error.main', p: 2 }}>{error}</Paper> : null}
      {data ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5, mb: 1.8 }}>
            <Metric label="전체 회원" value={data.metrics.totalUsers} icon={<PeopleAltOutlinedIcon />} />
            <Metric label="등록 도서" value={data.metrics.registeredBooks} icon={<LibraryBooksOutlinedIcon />} />
            <Metric label="운영 북룸" value={data.metrics.activeRooms} icon={<AutoStoriesOutlinedIcon />} />
            <Metric label="검토 대기 신고" value={data.metrics.openReports} icon={<FlagOutlinedIcon />} accent />
            <Metric label="오늘 가입" value={data.metrics.todaySignups} icon={<PersonAddAltOutlinedIcon />} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.08fr 0.92fr' }, gap: 1.8, mb: 1.8 }}>
            <Section title="최근 가입 회원" action={<Button component={Link} to="/users" size="small">전체 보기</Button>}>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: { xs: 620, lg: 0 } }}>
                  <TableHead><TableRow><TableCell>회원</TableCell><TableCell>이메일</TableCell><TableCell>인증</TableCell><TableCell align="right">도서</TableCell><TableCell>가입일</TableCell></TableRow></TableHead>
                  <TableBody>
                    {data.recentUsers.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell sx={{ fontWeight: 650 }}>{user.displayName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell sx={{ color: user.emailVerified ? 'success.main' : 'warning.main', fontWeight: 650 }}>{user.emailVerified ? '완료' : '대기'}</TableCell>
                        <TableCell align="right">{user.readingBookCount}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateTime.format(new Date(user.createdAt))}</TableCell>
                      </TableRow>
                    ))}
                    {!data.recentUsers.length ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>가입 회원이 없습니다.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </Box>
            </Section>

            <Section title="신고·검토 대기" action={<Button component={Link} to="/reports" size="small">전체 보기</Button>}>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: { xs: 620, lg: 0 } }}>
                  <TableHead><TableRow><TableCell>유형</TableCell><TableCell>대상</TableCell><TableCell>사유</TableCell><TableCell>접수</TableCell></TableRow></TableHead>
                  <TableBody>
                    {data.openReports.map((report) => (
                      <TableRow key={report.id} hover>
                        <TableCell>{report.targetType}</TableCell>
                        <TableCell sx={{ maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.targetLabel}</TableCell>
                        <TableCell sx={{ color: 'warning.dark', fontWeight: 650 }}>{report.reason}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateTime.format(new Date(report.createdAt))}</TableCell>
                      </TableRow>
                    ))}
                    {!data.openReports.length ? <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>대기 중인 신고가 없습니다.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </Box>
            </Section>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '0.8fr 1.2fr' }, gap: 1.8 }}>
            <Section title="시스템 상태" action={<Button component={Link} to="/system" size="small">상세 보기</Button>}>
              {data.services.map((service) => <SystemRow key={service.id} service={service} />)}
            </Section>
            <Section title="최근 운영 활동">
              <Box sx={{ px: 2.2, py: 0.6 }}>
                {data.recentActivity.map((item, index) => (
                  <Box key={`${item.kind}-${item.id}`} sx={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr) auto', gap: 1.3, alignItems: 'start', py: 1.45, borderBottom: index === data.recentActivity.length - 1 ? 0 : '1px solid #ebe8e1' }}>
                    <Box sx={{ width: 8, height: 8, mt: 0.7, borderRadius: '50%', bgcolor: item.kind === 'report' ? '#c7830e' : '#4d795f' }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 650 }}>{item.title}</Typography>
                      <Typography color="text.secondary" sx={{ overflow: 'hidden', fontSize: 12.5, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail}</Typography>
                    </Box>
                    <Typography color="text.secondary" sx={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>{dateTime.format(new Date(item.createdAt))}</Typography>
                  </Box>
                ))}
                {!data.recentActivity.length ? <Typography color="text.secondary" align="center" sx={{ py: 4 }}>최근 활동이 없습니다.</Typography> : null}
              </Box>
            </Section>
          </Box>
        </>
      ) : null}
    </Box>
  );
}
