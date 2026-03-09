import React, { useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2 } from 'lucide-react';
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
        top: 25,
        left: 0,
        right: 0,
        bottom: 0,
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
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={style}
        className={cn(
          'flex flex-col select-none',
          win.isMaximized ? 'rounded-none' : 'rounded-[10px]',
          'overflow-hidden'
        )}
        onMouseDown={handleFocus}
      >
        {/* macOS Liquid Glass shadow and border */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: win.isMaximized ? 0 : 10,
            boxShadow: win.isActive 
              ? '0 24px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.15), inset 0 0.5px 0 rgba(255,255,255,0.1)'
              : '0 12px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.08)',
          }}
        />

        {/* Window Chrome / Title Bar - Liquid Glass */}
        <div
          className={cn(
            'flex items-center px-3 gap-2 h-[38px] shrink-0 cursor-default relative',
          )}
          style={{
            background: win.isActive 
              ? 'linear-gradient(180deg, rgba(60,60,67,0.55) 0%, rgba(45,45,52,0.65) 100%)'
              : 'linear-gradient(180deg, rgba(50,50,57,0.4) 0%, rgba(40,40,47,0.5) 100%)',
            backdropFilter: 'blur(60px) saturate(200%)',
            WebkitBackdropFilter: 'blur(60px) saturate(200%)',
            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          }}
          onMouseDown={handleDragMouseDown}
          onDoubleClick={handleMaximize}
        >
          {/* Traffic lights - pixel-perfect macOS */}
          <div className="flex items-center gap-[8px] group shrink-0">
            <button
              className={cn(
                'w-[12px] h-[12px] rounded-full flex items-center justify-center transition-colors',
                win.isActive 
                  ? 'bg-[#FF5F57] border border-[#E0443E]' 
                  : 'bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.08)]'
              )}
              onClick={handleClose}
            >
              <X className="opacity-0 group-hover:opacity-100 w-[8px] h-[8px] text-[rgba(77,0,0,0.7)]" strokeWidth={2.5} />
            </button>
            <button
              className={cn(
                'w-[12px] h-[12px] rounded-full flex items-center justify-center transition-colors',
                win.isActive 
                  ? 'bg-[#FEBC2E] border border-[#DEA123]' 
                  : 'bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.08)]'
              )}
              onClick={handleMinimize}
            >
              <Minus className="opacity-0 group-hover:opacity-100 w-[8px] h-[8px] text-[rgba(77,48,0,0.7)]" strokeWidth={2.5} />
            </button>
            <button
              className={cn(
                'w-[12px] h-[12px] rounded-full flex items-center justify-center transition-colors',
                win.isActive 
                  ? 'bg-[#28C840] border border-[#1AAB29]' 
                  : 'bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.08)]'
              )}
              onClick={handleMaximize}
            >
              <Maximize2 className="opacity-0 group-hover:opacity-100 w-[7px] h-[7px] text-[rgba(0,51,0,0.7)]" strokeWidth={2.5} />
            </button>
          </div>

          {/* Title */}
          <div className="flex-1 text-center text-[13px] font-normal text-white/80 truncate pointer-events-none">
            {win.title}
          </div>

          {/* Spacer to balance traffic lights */}
          <div className="w-[52px] shrink-0" />
        </div>

        {/* Window Content */}
        <div className="flex-1 overflow-hidden bg-background relative">
          {children}
        </div>

        {/* Resize handles (not when maximized) */}
        {!win.isMaximized && (
          <>
            <ResizeHandle direction="n"  onMouseDown={handleResizeMouseDown} className="top-0 left-2 right-2 h-1 cursor-n-resize" />
            <ResizeHandle direction="s"  onMouseDown={handleResizeMouseDown} className="bottom-0 left-2 right-2 h-1 cursor-s-resize" />
            <ResizeHandle direction="e"  onMouseDown={handleResizeMouseDown} className="right-0 top-2 bottom-2 w-1 cursor-e-resize" />
            <ResizeHandle direction="w"  onMouseDown={handleResizeMouseDown} className="left-0 top-2 bottom-2 w-1 cursor-w-resize" />
            <ResizeHandle direction="se" onMouseDown={handleResizeMouseDown} className="bottom-0 right-0 w-4 h-4 cursor-se-resize" />
            <ResizeHandle direction="sw" onMouseDown={handleResizeMouseDown} className="bottom-0 left-0 w-4 h-4 cursor-sw-resize" />
            <ResizeHandle direction="ne" onMouseDown={handleResizeMouseDown} className="top-0 right-0 w-4 h-4 cursor-ne-resize" />
            <ResizeHandle direction="nw" onMouseDown={handleResizeMouseDown} className="top-0 left-0 w-4 h-4 cursor-nw-resize" />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
});
OSWindowFrame.displayName = 'OSWindowFrame';
