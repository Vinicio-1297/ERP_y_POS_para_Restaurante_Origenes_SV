import { useEffect, useRef } from 'react';

export default function useGestionModal(open, close) {
  const dialogRef = useRef(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return undefined;
    const before = document.activeElement;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const selector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const findFocusables = () => [...dialog.querySelectorAll(selector)];
    (findFocusables()[0] || dialog).focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const controls = findFocusables();
      if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); before?.focus?.(); };
  }, [open]);
  return dialogRef;
}
