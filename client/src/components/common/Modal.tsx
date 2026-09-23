import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | 'full';
  alignTop?: boolean;
  bodyClassName?: string;
  hideHeader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  alignTop = false,
  bodyClassName = '',
  hideHeader = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-[96vw]',
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[99999] flex ${
        alignTop
          ? 'items-start pt-2 sm:pt-6'
          : 'items-start sm:items-center pt-2 sm:pt-0'
      } justify-center p-2 sm:p-4 overflow-y-auto`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} ${
          alignTop ? 'my-1 sm:my-3' : 'my-2 sm:my-auto'
        } rounded-2xl sm:rounded-3xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/15 shadow-2xl z-10 max-h-[96vh] sm:max-h-[94vh] flex flex-col overflow-hidden animate-fade-in`}
      >
        {/* Modal Header */}
        {!hideHeader && (
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-100 dark:bg-surface-darker/80 shrink-0">
            <h3 className="text-sm sm:text-base font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        )}

        {/* Modal Body (Scrollable) */}
        <div className={`p-3 sm:p-5 overflow-y-auto ${bodyClassName} custom-scrollbar text-slate-800 dark:text-slate-200`}>
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
