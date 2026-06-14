import { useState, useCallback, useRef, useEffect } from 'react';

export interface Transform { x: number; y: number; scale: number; }

interface PanZoomHandlers {
  onWheel:       (e: React.WheelEvent<SVGSVGElement>) => void;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp:   (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerLeave:(e: React.PointerEvent<SVGSVGElement>) => void;
}

export function usePanZoom(options?: {
  minScale?: number;
  maxScale?: number;
  initialTransform?: Transform;
}): [Transform, PanZoomHandlers, (t: Transform) => void] {
  const { minScale = 0.25, maxScale = 20 } = options ?? {};

  const [tf, setTf] = useState<Transform>(
    options?.initialTransform ?? { x: 0, y: 0, scale: 1 }
  );

  // Sync when initialTransform changes (e.g. fitToRoute / resetView).
  // Compare by value so reference churn from useMemo doesn't cause resets.
  const prevInit = useRef<Transform | undefined>(undefined);
  useEffect(() => {
    const t = options?.initialTransform;
    if (!t) return;
    const prev = prevInit.current;
    if (prev && prev.x === t.x && prev.y === t.y && prev.scale === t.scale) return;
    prevInit.current = t;
    setTf(t);
  }, [options?.initialTransform]);

  const dragging = useRef(false);
  const lastPos  = useRef({ x: 0, y: 0 });

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    // Capture DOM values BEFORE the setState callback — currentTarget is
    // nullified by the browser once the handler returns.
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setTf(prev => {
      const newScale = Math.min(maxScale, Math.max(minScale, prev.scale * factor));
      const dx = cx - prev.x;
      const dy = cy - prev.y;
      return {
        scale: newScale,
        x: prev.x + dx - dx * (newScale / prev.scale),
        y: prev.y + dy - dy * (newScale / prev.scale),
      };
    });
  }, [minScale, maxScale]);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    dragging.current = true;
    lastPos.current  = { x: e.clientX, y: e.clientY };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTf(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onPointerUp    = useCallback(() => { dragging.current = false; }, []);
  const onPointerLeave = useCallback(() => { dragging.current = false; }, []);

  return [tf, { onWheel, onPointerDown, onPointerMove, onPointerUp, onPointerLeave }, setTf];
}
