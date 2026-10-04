'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowIcon } from '@/components/arrow-icon';
import { authHref, safeNextPath } from '@/lib/navigation';

export function SignupForm({ nextPath = '/library/add' }: { nextPath?: string }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: data.get('displayName'), email: data.get('email'), password: data.get('password') })
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message || '가입하지 못했습니다.');
      window.location.assign(safeNextPath(nextPath, '/library/add'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '가입하지 못했습니다.');
    } finally { setPending(false); }
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-busy={pending}>
      <label>닉네임<input autoComplete="nickname" maxLength={24} minLength={2} name="displayName" placeholder="책 이야기에서 불릴 이름" required /></label>
      <label>이메일<input autoComplete="email" name="email" required type="email" /></label>
      <label>비밀번호<input autoComplete="new-password" maxLength={128} minLength={10} name="password" required type="password" /><small>10자 이상 입력해주세요.</small></label>
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
      <button className="button button--wide" disabled={pending} type="submit">{pending ? '서재 만드는 중…' : <>내 서재 만들기 <ArrowIcon /></>}</button>
      <p className="auth-form__center">이미 계정이 있나요? <Link href={authHref('login', nextPath)}>로그인</Link></p>
    </form>
  );
}
