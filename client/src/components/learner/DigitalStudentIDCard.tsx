import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import confetti from 'canvas-confetti';
import {
  QrCode,
  Download,
  ShieldCheck,
  Sparkles,
  RotateCw,
  Phone,
  Heart,
  UserCheck,
  CheckCircle2,
  Calendar,
  Building,
  Maximize2
} from 'lucide-react';

interface DigitalStudentIDCardProps {
  learner: {
    id?: number | string;
    full_name?: string;
    surname?: string;
    name?: string;
    learner_number?: string;
    id_number?: string;
    grade?: string | number;
    stream?: string;
    class_name?: string;
    profile_picture?: string;
    profile_picture_path?: string;
    emergency_contact?: string;
    guardian_phone?: string;
    dob?: string;
  };
}

export const DigitalStudentIDCard: React.FC<DigitalStudentIDCardProps> = ({ learner }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEnlargedQR, setIsEnlargedQR] = useState(false);

  const fullName = `${learner.name || learner.full_name || 'Learner'} ${learner.surname || ''}`.trim();
  const learnerNumber = learner.learner_number || '2026-094';
  const idNumber = learner.id_number || '0809245189087';
  const grade = learner.grade || '10';
  const stream = learner.stream || 'Physical Sciences & Mathematics';
  const profilePic = learner.profile_picture_path || learner.profile_picture;
  const emergencyPhone = learner.guardian_phone || learner.emergency_contact || '+27 82 555 1920';

  // QR Code Payload that the teacher's scanner reads
  const qrPayload = JSON.stringify({
    type: 'FUSION_STUDENT_ID',
    id: learner.id || 1,
    learner_number: learnerNumber,
    name: fullName,
    grade: grade,
    stream: stream,
    verified: true,
    issued: '2026-01-15',
    expires: '2026-12-31'
  });

  const handleDownloadCard = () => {
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    const textData =
      `=======================================================\n` +
      `               FUSION HIGH SCHOOL                      \n` +
      `       OFFICIAL DIGITAL STUDENT SMART CARD             \n` +
      `   ONE SCHOOL • ONE CONNECTION • LIMITLESS POTENTIAL   \n` +
      `=======================================================\n\n` +
      `LEARNER NAME   : ${fullName.toUpperCase()}\n` +
      `LEARNER NUMBER : ${learnerNumber}\n` +
      `SA ID NUMBER   : ${idNumber}\n` +
      `GRADE & STREAM : Grade ${grade} (${stream})\n` +
      `ACADEMIC YEAR  : 2026\n` +
      `EMERGENCY TEL  : ${emergencyPhone}\n` +
      `STATUS         : ACTIVE & CAPS ENROLLED\n` +
      `QR VERIFY CODE : ${qrPayload}\n` +
      `=======================================================\n`;

    const blob = new Blob([textData], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FusionHigh_Student_ID_${learnerNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 3D Smart Card Container */}
      <div
        className="w-full max-w-md perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full aspect-[1.586/1] rounded-3xl p-6 transition-transform duration-700 transform-style-3d shadow-2xl border border-white/20 select-none ${
            isFlipped ? 'rotate-y-180' : ''
          } bg-gradient-to-br from-slate-900 via-indigo-950 to-brand-950 text-white overflow-hidden`}
        >
          {/* Holographic Watermark Glows */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

          {/* FRONT OF CARD */}
          {!isFlipped ? (
            <div className="h-full flex flex-col justify-between relative z-10">
              {/* Header with FH Crest and School Title */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 p-1 border border-white/20 shadow-glow-indigo flex items-center justify-center">
                    <img src="/assets/FH.png" alt="FH Crest" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-black tracking-tight text-white leading-tight">
                      FUSION HIGH SCHOOL
                    </h3>
                    <p className="text-[8px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                      STUDENT IDENTIFICATION CARD
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    2026 ACTIVE
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono mt-0.5">CAPS Verified</span>
                </div>
              </div>

              {/* Middle Section: Photo & Learner Credentials */}
              <div className="flex items-center gap-4 my-auto">
                {/* Photo with Smart Microchip Graphic */}
                <div className="relative shrink-0">
                  <div className="w-20 h-24 rounded-2xl border-2 border-cyan-400/40 bg-gradient-to-tr from-brand-700 to-indigo-700 overflow-hidden flex items-center justify-center text-white font-black text-2xl shadow-lg ring-2 ring-white/10">
                    {profilePic ? (
                      <img
                        src={getProfilePictureUrl(profilePic)}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{fullName.charAt(0)}</span>
                    )}
                  </div>

                  {/* Microchip Graphic */}
                  <div className="absolute -bottom-2 -right-2 w-7 h-6 rounded-lg bg-amber-400/80 border border-amber-300 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full border border-amber-600/50 rounded flex flex-col justify-between p-0.5">
                      <div className="w-full h-0.5 bg-amber-600" />
                      <div className="w-full h-0.5 bg-amber-600" />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Learner Name</p>
                  <h4 className="text-base font-extrabold font-display text-white truncate leading-tight">
                    {fullName}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-semibold">Learner ID</p>
                      <p className="text-xs font-mono font-bold text-cyan-300">{learnerNumber}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-semibold">Grade & Class</p>
                      <p className="text-xs font-mono font-bold text-white">Grade {grade}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase text-slate-400 font-semibold">National SA ID</p>
                    <p className="text-[10px] font-mono text-slate-300 tracking-wider">
                      {idNumber.slice(0, 6)}••••••{idNumber.slice(-1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Footer with Barcode & Slogan */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[8.5px] font-mono text-slate-400">
                <span className="text-cyan-400 font-bold">ONE SCHOOL • ONE CONNECTION</span>
                <span className="text-slate-400 flex items-center gap-1">
                  <RotateCw className="w-2.5 h-2.5" /> Tap to view QR & Back
                </span>
              </div>
            </div>
          ) : (
            /* BACK OF CARD: QR Code for Scanner & Emergency Info */
            <div className="h-full flex flex-col justify-between relative z-10">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>Teacher & Gate QR Pass</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">Scan for Instant Roll Call</span>
              </div>

              {/* Centered Large QR Code */}
              <div className="flex items-center justify-center gap-6 my-auto">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEnlargedQR(true);
                  }}
                  className="w-24 h-24 rounded-2xl bg-white p-2 border-2 border-cyan-400 shadow-glow-cyan flex items-center justify-center cursor-pointer hover:scale-105 transition-transform group"
                  title="Click to enlarge QR Code"
                >
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      qrPayload
                    )}`}
                    alt="Learner QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-1.5 text-left text-xs">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Stream / Track</p>
                    <p className="text-[11px] font-bold text-white">{stream}</p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Emergency Contact</p>
                    <p className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {emergencyPhone}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Expiry Date</p>
                    <p className="text-[10px] font-mono text-slate-300">31 December 2026</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[8px] text-slate-400">
                <span>Property of Fusion High School. If found, return to school admin.</span>
                <span className="text-cyan-400">Tap to flip</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-dark hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs border border-white/10 transition-all shadow-md"
        >
          <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isFlipped ? 'Show Front of Card' : 'Show QR Code Pass'}</span>
        </button>

        <button
          onClick={handleDownloadCard}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save Digital ID Card</span>
        </button>
      </div>

      {/* Enlarged QR Code Modal */}
      {isEnlargedQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsEnlargedQR(false)}
        >
          <div
            className="p-8 rounded-3xl bg-surface-dark border border-cyan-500/40 text-center space-y-4 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-extrabold text-white">Student Roll-Call QR Code</h4>
            <p className="text-xs text-slate-300">
              Hold this QR code up to your educator's device camera to mark your attendance.
            </p>

            <div className="w-56 h-56 mx-auto rounded-3xl bg-white p-4 border-4 border-cyan-400 shadow-glow-cyan flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  qrPayload
                )}`}
                alt="Enlarged QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-3 rounded-xl bg-surface-darker border border-white/5">
              <p className="text-xs font-bold text-white">{fullName}</p>
              <p className="text-[10px] font-mono text-cyan-400">Learner ID: {learnerNumber} • Grade {grade}</p>
            </div>

            <button
              onClick={() => setIsEnlargedQR(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
