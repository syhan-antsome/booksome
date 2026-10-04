'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowIcon } from '@/components/arrow-icon';
import { authHref, safeNextPath } from '@/lib/navigation';

export function LoginForm({ nextPath = '/' }: { nextPath?: string }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') })
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message || '로그인하지 못했습니다.');
      window.location.assign(safeNextPath(nextPath));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그인하지 못했습니다.');
    } finally { setPending(false); }
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-busy={pending}>
      <label>이메일<input autoComplete="email" name="email" required type="email" /></label>
      <label>비밀번호<input autoComplete="current-password" name="password" required type="password" /></label>
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
      <button className="button button--wide" disabled={pending} type="submit">
        {pending ? '로그인 중…' : <>로그인 <ArrowIcon /></>}
      </button>
      <div className="auth-form__links"><Link href="/password-reset">비밀번호 찾기</Link><Link href={authHref('signup', nextPath)}>처음 오셨나요?</Link></div>
    </form>
  );
}
