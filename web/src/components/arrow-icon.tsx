export function ArrowIcon({ direction = 'right' }: { direction?: 'right' | 'down' }) {
  return (
    <svg
      aria-hidden="true"
      className={`arrow-icon arrow-icon--${direction}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}
