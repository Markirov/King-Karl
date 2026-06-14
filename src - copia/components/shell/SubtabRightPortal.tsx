import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SUBTAB_RIGHT_SLOT_ID } from './SectionTabs';

/**
 * Renderiza children dentro del slot derecho de SectionTabs.
 * No renderiza nada si la página no está montada bajo un SectionTabs.
 */
export function SubtabRightPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById(SUBTAB_RIGHT_SLOT_ID);
    setTarget(el);
    // Re-check on resize/route change in case slot is re-mounted
    const ro = new MutationObserver(() => {
      const cur = document.getElementById(SUBTAB_RIGHT_SLOT_ID);
      if (cur !== target) setTarget(cur);
    });
    ro.observe(document.body, { childList: true, subtree: true });
    return () => ro.disconnect();
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
