export function MouseButtonIcon({button}:{button:'left'|'right'}) {
  return <svg viewBox="0 0 24 30" width="18" height="23" fill="none" aria-hidden="true">
    <path d={button==='left'?'M12 3H11a8 8 0 0 0-8 8v4h9V3Z':'M12 3h1a8 8 0 0 1 8 8v4h-9V3Z'} fill="#cf6643"/>
    <rect x="3" y="3" width="18" height="24" rx="8" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 3v12M3 15h18" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="10.8" y="6" width="2.4" height="6" rx="1.2" fill="currentColor"/>
  </svg>;
}
