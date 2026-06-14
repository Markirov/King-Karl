import { useEffect, type RefObject } from 'react';

/**
 * Cierra un panel/modal cuando el usuario hace click fuera o pulsa ESC.
 * Reutilizable en cualquier popover del simulador.
 *
 *   const ref = useRef<HTMLDivElement>(null);
 *   useDismissable(ref, open, onClose);
 *   return open ? <div ref={ref}>…</div> : null;
 */
export function useDismissable(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      const node = ref.current;
      if (node && !node.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // mousedown para que cierre antes de que el target reciba el click
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose, ref]);
}
