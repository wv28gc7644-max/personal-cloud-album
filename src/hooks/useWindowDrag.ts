import { useRef, useEffect, useState, useCallback } from 'react';
import { useOS } from '@/hooks/useOS';

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startWindowX: number;
  startWindowY: number;
}

interface ResizeState {
  isResizing: boolean;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startWindowX: number;
  startWindowY: number;
  direction: string;
}

export const useWindowDrag = (windowId: string, initialX: number, initialY: number) => {
  const { updateWindowPosition, focusWindow } = useOS();
  const dragState = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startWindowX: initialX,
    startWindowY: initialY,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    focusWindow(windowId);
    
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startWindowX: initialX,
      startWindowY: initialY,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current.isDragging) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      const newX = Math.max(0, dragState.current.startWindowX + dx);
      const newY = Math.max(28, dragState.current.startWindowY + dy); // 28px = menubar height
      updateWindowPosition(windowId, newX, newY);
    };

    const handleMouseUp = () => {
      dragState.current.isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [windowId, initialX, initialY, updateWindowPosition, focusWindow]);

  return { handleMouseDown };
};

export const useWindowResize = (
  windowId: string,
  currentWidth: number,
  currentHeight: number,
  currentX: number,
  currentY: number,
  minWidth = 400,
  minHeight = 300
) => {
  const { updateWindowSize, updateWindowPosition } = useOS();
  const resizeState = useRef<ResizeState>({
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: currentWidth,
    startHeight: currentHeight,
    startWindowX: currentX,
    startWindowY: currentY,
    direction: '',
  });

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    resizeState.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
      startWindowX: currentX,
      startWindowY: currentY,
      direction,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeState.current.isResizing) return;
      const dx = e.clientX - resizeState.current.startX;
      const dy = e.clientY - resizeState.current.startY;
      const { direction: dir, startWidth, startHeight, startWindowX, startWindowY } = resizeState.current;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startWindowX;
      let newY = startWindowY;

      if (dir.includes('e')) newWidth = Math.max(minWidth, startWidth + dx);
      if (dir.includes('s')) newHeight = Math.max(minHeight, startHeight + dy);
      if (dir.includes('w')) {
        newWidth = Math.max(minWidth, startWidth - dx);
        newX = startWindowX + (startWidth - newWidth);
      }
      if (dir.includes('n')) {
        newHeight = Math.max(minHeight, startHeight - dy);
        newY = Math.max(28, startWindowY + (startHeight - newHeight));
      }

      updateWindowSize(windowId, newWidth, newHeight);
      if (dir.includes('w') || dir.includes('n')) {
        updateWindowPosition(windowId, newX, newY);
      }
    };

    const handleMouseUp = () => {
      resizeState.current.isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [windowId, currentWidth, currentHeight, currentX, currentY, minWidth, minHeight, updateWindowSize, updateWindowPosition]);

  return { handleResizeMouseDown };
};
