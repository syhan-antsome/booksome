import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { useLogin } from 'react-admin';

import { publicRequest } from '../api';

type View = 'login' | 'request-reset' | 'confirm-reset';

export function LoginPage() {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<View>('login');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setPending(true);
    try {
      if (view === 'login') {
        await login({ username: email.trim(), password });
        return;
      }

      if (view === 'request-reset') {
        await requestResetCode();
        setView('confirm-reset');
        setNotice('가입 이메일로 8자리 인증 코드를 보냈습니다. 코드는 15분 동안 유효합니다.');
        return;
      }

      if (newPassword !== newPasswordConfirm) {
        setError('새 비밀번호가 서로 일치하지 않습니다.');
        return;
      }
      await publicRequest<void>('/api/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), code, newPassword }),
      });
      setView('login');
      setPassword('');
      setCode('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setNotice('비밀번호를 변경했습니다. 새 비밀번호로 로그인해주세요.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '요청을 처리하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  async function requestResetCode() {
    await publicRequest<{ accepted: boolean }>('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  }

  function showResetRequest() {
    setView('request-reset');
    setPassword('');
    setError('');
    setNotice('');
  }

  function showLogin() {
    setView('login');
    setCode('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setError('');
    setNotice('');
  }

  const isLogin = view === 'login';
  const isRequest = view === 'request-reset';
  const heading = isLogin ? '관리자 로그인' : isRequest ? '비밀번호 재설정' : '인증 코드 확인';
  const description = isLogin
    ? '관리자 권한이 등록된 북썸 계정을 사용해주세요.'
    : isRequest
      ? '가입한 이메일로 비밀번호 재설정 코드를 보내드립니다.'
      : `${email.trim()}로 받은 인증 코드와 새 비밀번호를 입력해주세요.`;

  return (
    <Box sx={{ display: 'grid', minHeight: '100vh', gridTemplateColumns: { xs: '1fr', md: 'minmax(360px, 0.8fr) minmax(520px, 1.2fr)' } }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          bgcolor: '#123c2b',
          color: '#fff',
          p: '56px 64px',
        }}
      >
        <Typography sx={{ fontSize: 23, fontWeight: 760, letterSpacing: '-0.04em' }}>
          BookSome <Box component="span" sx={{ color: '#e3a62a' }}>Admin</Box>
        </Typography>
        <Box sx={{ maxWidth: 460 }}>
          <AutoStoriesOutlinedIcon sx={{ color: '#e3a62a', fontSize: 40, mb: 2.5 }} />
          <Typography variant="h1" sx={{ color: '#fff', fontSize: '2.6rem', lineHeight: 1.18 }}>
            책을 중심으로 모인 사람들을 더 안전하게 운영합니다.
          </Typography>
          <Typography sx={{ color: '#b9cabf', fontSize: 16, lineHeight: 1.7, mt: 2.5 }}>
            회원, 북룸, 게시물, 신고와 거래 현황을 한곳에서 확인하세요.
          </Typography>
        </Box>
        <Typography sx={{ color: '#779284', fontSize: 12 }}>BookSome operations console</Typography>
      </Box>

      <Box sx={{ display: 'grid', placeItems: 'center', bgcolor: '#f7f5ef', p: 3 }}>
        <Paper component="form" onSubmit={submit} variant="outlined" sx={{ width: '100%', maxWidth: 430, p: { xs: 3, sm: 5 } }}>
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4 }}>
            <Typography sx={{ color: '#174b37', fontSize: 21, fontWeight: 760 }}>BookSome Admin</Typography>
          </Box>
          <Box sx={{ display: 'flex', width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 1, bgcolor: '#e8efe9', color: '#174b37', mb: 2.5 }}>
            {view === 'confirm-reset' ? <MarkEmailReadOutlinedIcon fontSize="small" /> : <LockOutlinedIcon fontSize="small" />}
          </Box>
          <Typography variant="h2">{heading}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3.5 }}>
            {description}
          </Typography>
          {error ? <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert> : null}
          {notice ? <Alert severity="success" sx={{ mb: 2.5 }}>{notice}</Alert> : null}
          {view !== 'confirm-reset' ? (
            <TextField
              autoFocus
              fullWidth
              required
              type="email"
              label="이메일"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              sx={{ mb: 2 }}
            />
          ) : null}
          {isLogin ? (
            <TextField
              fullWidth
              required
              type="password"
              label="비밀번호"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          ) : null}
          {view === 'confirm-reset' ? (
            <>
              <TextField
                autoFocus
                fullWidth
                required
                label="8자리 인증 코드"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]{8}', autoComplete: 'one-time-code' } }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                required
                type="password"
                label="새 비밀번호"
                helperText="10자 이상 입력해주세요."
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                slotProps={{ htmlInput: { minLength: 10, maxLength: 128 } }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                required
                type="password"
                label="새 비밀번호 확인"
                autoComplete="new-password"
                value={newPasswordConfirm}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
                slotProps={{ htmlInput: { minLength: 10, maxLength: 128 } }}
              />
            </>
          ) : null}
          <Button fullWidth type="submit" variant="contained" disabled={pending} size="large" sx={{ mt: 3, py: 1.25 }}>
            {pending ? '처리 중…' : isLogin ? '운영 콘솔 시작' : isRequest ? '인증 코드 받기' : '새 비밀번호 저장'}
          </Button>
          {isLogin ? (
            <Button fullWidth type="button" onClick={showResetRequest} sx={{ mt: 1.2 }}>
              비밀번호를 잊으셨나요?
            </Button>
          ) : (
            <Button fullWidth type="button" onClick={showLogin} startIcon={<ArrowBackOutlinedIcon />} sx={{ mt: 1.2 }}>
              로그인으로 돌아가기
            </Button>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
