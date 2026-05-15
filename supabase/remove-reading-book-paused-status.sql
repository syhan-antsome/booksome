update public.reading_books
set status = 'reading'::public.reading_book_status,
    updated_at = now()
where status::text = 'paused';
