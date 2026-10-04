'use client';

import Form from 'next/form';
import { useFormStatus } from 'react-dom';
import { ArrowIcon } from '@/components/arrow-icon';

function SearchButton() {
  const { pending } = useFormStatus();
  return <button className="button" type="submit" disabled={pending}>{pending ? '찾는 중…' : '책 찾기'} <ArrowIcon /></button>;
}

export function SearchForm({ query = '', home = false }: { query?: string; home?: boolean }) {
  return <Form action="/books" className="book-search">
    <label htmlFor={home ? 'home-query' : 'book-query'}>{home ? '어떤 책을 읽고 있나요?' : '책 제목 또는 ISBN'}</label>
    <div><input id={home ? 'home-query' : 'book-query'} name="query" type="search" defaultValue={query} placeholder="책 제목 또는 ISBN" required minLength={2} maxLength={80} /><SearchButton /></div>
  </Form>;
}
