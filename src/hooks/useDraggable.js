'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook for making an element draggable.
 * Distinguishes between clicks/taps and drags using a movement threshold.
 * 
 * @param {Object} options
 * @param {number} options.threshold - Pixel threshold to distinguish click from drag (default: 5)
 * @returns {{ pos, isDragging, hasMoved, handlers }}
 */
export default function useDraggable({ threshold = 5 } = {}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const elementStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    dragStart.current = { x: point.clientX, y: point.clientY };
    elementStart.current = { x: pos.x, y: pos.y };
    hasMoved.current = false;
    setIsDragging(true);
  }, [pos.x, pos.y]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      const dx = point.clientX - dragStart.current.x;
      const dy = point.clientY - dragStart.current.y;

      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        hasMoved.current = true;
      }

      setPos({
        x: elementStart.current.x + dx,
        y: elementStart.current.y + dy,
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, threshold]);

  const handlers = {
    onMouseDown: handleDragStart,
    onTouchStart: handleDragStart,
  };

  return { pos, isDragging, hasMoved, handlers };
}
