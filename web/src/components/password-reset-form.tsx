'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowIcon } from '@/components/arrow-icon';

export function PasswordResetForm() {
  const [stage, setStage] = useState<'request' | 'confirm' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true);
    try {
      await submitJson('/api/auth/password-reset/request', { email });
      setStage('confirm');
    } catch (cause) { setError(message(cause)); } finally { setPending(false); }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      await submitJson('/api/auth/password-reset/confirm', { email, code: data.get('code'), newPassword: data.get('newPassword') });
      setStage('done');
    } catch (cause) { setError(message(cause)); } finally { setPending(false); }
  }

  if (stage === 'done') {
    return <div className="auth-success"><h2>비밀번호를 변경했습니다.</h2><p>새 비밀번호로 북썸에 로그인해주세요.</p><Link className="button" href="/login">로그인 <ArrowIcon /></Link></div>;
  }

  if (stage === 'request') {
    return (
      <form className="auth-form" onSubmit={requestCode}>
        <label>가입한 이메일<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
        <button className="button button--wide" disabled={pending} type="submit">{pending ? '보내는 중…' : <>인증 코드 받기 <ArrowIcon /></>}</button>
        <p className="auth-form__center"><Link href="/login">로그인으로 돌아가기</Link></p>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={confirm}>
      <p className="form-message">{email}로 전송된 8자리 코드를 입력해주세요.</p>
      <label>인증 코드<input autoComplete="one-time-code" inputMode="numeric" maxLength={8} minLength={8} name="code" pattern="[0-9]{8}" required /></label>
      <label>새 비밀번호<input autoComplete="new-password" maxLength={128} minLength={10} name="newPassword" required type="password" /><small>10자 이상 입력해주세요.</small></label>
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
      <button className="button button--wide" disabled={pending} type="submit">{pending ? '변경 중…' : <>비밀번호 변경 <ArrowIcon /></>}</button>
      <button className="text-button" onClick={() => setStage('request')} type="button">이메일 다시 입력하기</button>
    </form>
  );
}

async function submitJson(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = (await response.json()) as { message?: string };
  if (!response.ok) throw new Error(payload.message || '요청을 처리하지 못했습니다.');
}

function message(cause: unknown) { return cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다.'; }
