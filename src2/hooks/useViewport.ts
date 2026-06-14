// ══════════════════════════════════════════════════════════════
//  useViewport — Breakpoint detection para layouts responsive
//
//  Target tablet 10": 1280×800 landscape, 800×1280 portrait.
//  - 'mobile':  <768  (portrait phone)
//  - 'tablet':  768-1279 (portrait tablet 10", landscape phone)
//  - 'desktop': ≥1280 (landscape tablet 10", desktop)
//
//  Helpers:
//   - isMobile     → <768
//   - isTabletDown → <1280 (tablet o menor — usar para single-col)
//   - isDesktop    → ≥1280
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768)  return 'mobile';
  if (w < 1280) return 'tablet';
  return 'desktop';
}

export function useViewport(): {
  breakpoint:   Breakpoint;
  isMobile:     boolean;
  isTablet:     boolean;
  isDesktop:    boolean;
  /** True si tablet o menor (single column recommended). */
  isTabletDown: boolean;
  width:        number;
} {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint);
  const [width, setWidth]           = useState(() => typeof window === 'undefined' ? 1280 : window.innerWidth);

  useEffect(() => {
    const onResize = () => {
      setBreakpoint(getBreakpoint());
      setWidth(window.innerWidth);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    breakpoint,
    isMobile:     breakpoint === 'mobile',
    isTablet:     breakpoint === 'tablet',
    isDesktop:    breakpoint === 'desktop',
    isTabletDown: breakpoint !== 'desktop',
    width,
  };
}
