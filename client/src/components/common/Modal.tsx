import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  alignTop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  alignTop = false,
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
          ? 'items-start pt-1.5 sm:pt-6'
          : 'items-start sm:items-center pt-2 sm:pt-0'
      } justify-center px-2 py-1.5 sm:p-6 overflow-y-auto`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} ${
          alignTop ? 'mt-1 mb-4 sm:my-4' : 'my-1 sm:my-auto'
        } rounded-2xl sm:rounded-3xl bg-surface-dark border border-white/10 shadow-2xl z-10 max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-fade-in`}
      >
        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3.5 sm:py-4 bg-surface-darker/70 shrink-0">
          <h3 className="text-base sm:text-lg font-extrabold font-display text-white tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
};
