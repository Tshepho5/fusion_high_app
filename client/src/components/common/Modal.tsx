import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  alignTop?: boolean;
  bodyClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  alignTop = false,
  bodyClassName = '',
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
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex ${
        alignTop
          ? 'items-start pt-1 sm:pt-4'
          : 'items-start sm:items-center pt-1.5 sm:pt-0'
      } justify-center p-1 sm:p-3 overflow-y-auto`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} ${
          alignTop ? 'my-0.5 sm:my-2' : 'my-1 sm:my-auto'
        } rounded-2xl sm:rounded-3xl bg-surface-dark border border-white/10 shadow-2xl z-10 max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-fade-in`}
      >
        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-5 py-2.5 sm:py-3 bg-surface-darker/70 shrink-0">
          <h3 className="text-sm sm:text-base font-extrabold font-display text-white tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className={`p-3 sm:p-4 overflow-y-auto ${bodyClassName} custom-scrollbar text-slate-200`}>
          {children}
        </div>
      </div>
    </div>
  );
};
