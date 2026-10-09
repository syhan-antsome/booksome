'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ReadingIcon } from './reading-icon';
import styles from './reading-experience.module.css';

export function ReadingDialog({ open, title, onClose, busy, focusId, children }: {
  open: boolean; title: string; onClose: () => void; busy: boolean; focusId: string; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) {
      element.showModal();
      element.querySelector<HTMLElement>(`#${focusId}`)?.focus();
    } else if (!open && element?.open) element.close();
  }, [open, focusId]);
  return <dialog ref={dialog} className={styles.dialog} aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header><h2>{title}</h2><button className={styles.iconButton} type="button" onClick={onClose} disabled={busy} aria-label="닫기"><ReadingIcon name="close" /></button></header>
    {children}
  </dialog>;
}
