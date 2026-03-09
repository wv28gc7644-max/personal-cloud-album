import React, { useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { useOS } from '@/hooks/useOS';
import { OSWindow } from '@/types/os';
import { useWindowDrag, useWindowResize } from '@/hooks/useWindowDrag';
import { cn } from '@/lib/utils';

interface OSWindowFrameProps {
  window: OSWindow;
  children: React.ReactNode;
}

const ResizeHandle = memo(({ 
  direction, 
  onMouseDown, 
  className 
}: { 
  direction: string; 
  onMouseDown: (e: React.MouseEvent, dir: string) => void;
  className: string;
}) => (
  <div
    className={cn('absolute z-10', className)}
    onMouseDown={(e) => onMouseDown(e, direction)}
  />
));
ResizeHandle.displayName = 'ResizeHandle';

export const OSWindowFrame = memo(({ window: win, children }: OSWindowFrameProps) => {
  const { closeWindow, minimizeWindow, maximizeWindow, restoreWindow, focusWindow } = useOS();
  const { handleMouseDown: handleDragMouseDown } = useWindowDrag(win.id, win.x, win.y);
  const { handleResizeMouseDown } = useWindowResize(
    win.id, win.width, win.height, win.x, win.y, win.minWidth, win.minHeight
  );

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    closeWindow(win.id);
  }, [closeWindow, win.id]);

  const handleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    minimizeWindow(win.id);
  }, [minimizeWindow, win.id]);

  const handleMaximize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (win.isMaximized) {
      restoreWindow(win.id);
    } else {
      maximizeWindow(win.id);
    }
  }, [maximizeWindow, restoreWindow, win.id, win.isMaximized]);

  const handleFocus = useCallback(() => {
    if (!win.isActive) focusWindow(win.id);
  }, [focusWindow, win.id, win.isActive]);

  if (win.isMinimized) return null;

  const style: React.CSSProperties = win.isMaximized
    ? {
        position: 'fixed',
        top: 28, // menubar
        left: 0,
        right: 0,
        bottom: 80, // dock
        width: 'auto',
        height: 'auto',
        zIndex: win.zIndex,
      }
    : {
        position: 'fixed',
        top: win.y,
        left: win.x,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      };

  return (
    <AnimatePresence>
      <motion.div
        key={win.id}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={style}
        className={cn(
          'flex flex-col rounded-xl overflow-hidden select-none',
          'shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(255,255,255,0.1)]',
          win.isActive ? 'ring-0' : 'brightness-90'
        )}
        onMouseDown={handleFocus}
      >
        {/* Window Chrome / Title Bar */}
        <div
          className={cn(
            'flex items-center px-3 gap-2 h-11 shrink-0 cursor-default',
            'bg-[rgba(30,30,35,0.85)] backdrop-blur-xl border-b border-white/10',
            win.isActive ? 'bg-[rgba(30,30,35,0.9)]' : 'bg-[rgba(20,20,25,0.85)]'
          )}
          onMouseDown={handleDragMouseDown}
          onDoubleClick={handleMaximize}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-2 group shrink-0">
            <button
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57] border border-[rgba(0,0,0,0.2)] flex items-center justify-center"
              onClick={handleClose}
            >
              <X className="opacity-0 group-hover:opacity-100 w-2 h-2 text-[#4d0000]" strokeWidth={3} />
            </button>
            <button
              className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E] border border-[rgba(0,0,0,0.2)] flex items-center justify-center"
              onClick={handleMinimize}
            >
              <Minus className="opacity-0 group-hover:opacity-100 w-2 h-2 text-[#4d3000]" strokeWidth={3} />
            </button>
            <button
              className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#28C840] border border-[rgba(0,0,0,0.2)] flex items-center justify-center"
              onClick={handleMaximize}
            >
              <Maximize2 className="opacity-0 group-hover:opacity-100 w-2 h-2 text-[#003300]" strokeWidth={3} />
            </button>
          </div>

          {/* Title */}
          <div className="flex-1 text-center text-sm font-medium text-white/90 truncate pointer-events-none">
            {win.title}
          </div>

          {/* Spacer to balance title */}
          <div className="w-14 shrink-0" />
        </div>

        {/* Window Content */}
        <div className="flex-1 overflow-hidden bg-background">
          {children}
        </div>

        {/* Resize handles (not when maximized) */}
        {!win.isMaximized && (
          <>
            <ResizeHandle direction="n"  onMouseDown={handleResizeMouseDown} className="top-0 left-2 right-2 h-1 cursor-n-resize" />
            <ResizeHandle direction="s"  onMouseDown={handleResizeMouseDown} className="bottom-0 left-2 right-2 h-1 cursor-s-resize" />
            <ResizeHandle direction="e"  onMouseDown={handleResizeMouseDown} className="right-0 top-2 bottom-2 w-1 cursor-e-resize" />
            <ResizeHandle direction="w"  onMouseDown={handleResizeMouseDown} className="left-0 top-2 bottom-2 w-1 cursor-w-resize" />
            <ResizeHandle direction="se" onMouseDown={handleResizeMouseDown} className="bottom-0 right-0 w-3 h-3 cursor-se-resize" />
            <ResizeHandle direction="sw" onMouseDown={handleResizeMouseDown} className="bottom-0 left-0 w-3 h-3 cursor-sw-resize" />
            <ResizeHandle direction="ne" onMouseDown={handleResizeMouseDown} className="top-0 right-0 w-3 h-3 cursor-ne-resize" />
            <ResizeHandle direction="nw" onMouseDown={handleResizeMouseDown} className="top-0 left-0 w-3 h-3 cursor-nw-resize" />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
});
OSWindowFrame.displayName = 'OSWindowFrame';
