import React from 'react';
import { X, Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';

interface ContactUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactUsModal: React.FC<ContactUsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-surface-dark border border-cyan-500/30 p-6 md:p-8 shadow-2xl overflow-hidden">
        {/* Glow Auras */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shadow-glow-cyan">
              <Phone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white">Contact & Support</h3>
              <p className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                Fusion High Administration Desk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Directory */}
        <div className="mt-5 space-y-3.5 text-xs text-slate-300">
          <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-white">School Campus Address</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fusion High School Grounds, Main Academic Ave, Johannesburg, South Africa
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-white">Admissions & Office</p>
                <p className="text-[11px] font-mono text-emerald-400 mt-0.5">+27 (0) 11 555 0192</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-white">Email Enquiries</p>
                <p className="text-[11px] font-mono text-cyan-300 mt-0.5">info@fusionhigh.co.za</p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-white">Academic Office Hours</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Monday – Friday: 07:30 AM – 16:00 PM (CAT)
              </p>
            </div>
          </div>

          {/* Quick Message Help Note */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-900/40 to-brand-900/40 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
              <MessageCircle className="w-4 h-4 text-cyan-400" />
              <span>Need Direct Teacher Chat?</span>
            </div>
            <span className="text-[10px] text-slate-300 font-medium">Use Message Center</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400">Emergency lines active 24/7</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
