import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import { Badge } from '../common/Badge';
import {
  Camera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  X,
  RefreshCw,
  UserCheck,
  UserX,
  Volume2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Search,
  ScanLine
} from 'lucide-react';

interface LearnerRecord {
  id: number;
  full_name?: string;
  surname?: string;
  name?: string;
  learner_number: string;
  status: 'present' | 'late' | 'absent';
  scannedAt?: string;
  scanMethod?: 'qr' | 'manual';
}

interface TeacherQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  learners: LearnerRecord[];
  selectedClass: string;
  subjectName?: string;
  onApplyAttendance: (updatedLearners: LearnerRecord[], notificationSent: boolean) => void;
}

export const TeacherQRScannerModal: React.FC<TeacherQRScannerModalProps> = ({
  isOpen,
  onClose,
  learners,
  selectedClass,
  subjectName = 'Mathematics',
  onApplyAttendance
}) => {
  const [localRoster, setLocalRoster] = useState<LearnerRecord[]>([]);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedLearner, setLastScannedLearner] = useState<LearnerRecord | null>(null);
  const [periodTimeRemaining, setPeriodTimeRemaining] = useState<number>(42 * 60); // 42 mins in seconds
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<boolean>(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('Align Student QR code in viewfinder');
  const [successScanPopup, setSuccessScanPopup] = useState<LearnerRecord | null>(null);
  const successTimerRef = useRef<any>(null);

  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [photoScanning, setPhotoScanning] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const localRosterRef = useRef<LearnerRecord[]>([]);

  // Keep localRosterRef synchronized for instant scanner lookup
  useEffect(() => {
    localRosterRef.current = localRoster;
  }, [localRoster]);

  // Initialize roster state from props
  useEffect(() => {
    if (isOpen) {
      const initialRoster = learners.map((l) => ({
        ...l,
        status: l.status || 'absent'
      }));
      setLocalRoster(initialRoster);
      localRosterRef.current = initialRoster;
      setDispatchSuccess(false);
      setLastScannedLearner(null);
      setSuccessScanPopup(null);
      setScanStatusMessage('Camera active — waiting for student QR code...');
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, learners]);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Sound chime for successful scan
  const playScanBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioCtxRef.current || new AudioContextClass();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // High A6 chime

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
  };

  // Handle successful student QR Code scan
  const handleLearnerScanned = useCallback((learnerId: number, customName?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setLocalRoster((prev) =>
      prev.map((l) => {
        if (l.id === learnerId) {
          const updated: LearnerRecord = {
            ...l,
            status: 'present',
            scannedAt: timeStr,
            scanMethod: 'qr'
          };
          setLastScannedLearner(updated);
          setSuccessScanPopup(updated);
          
          if (successTimerRef.current) clearTimeout(successTimerRef.current);
          successTimerRef.current = setTimeout(() => {
            setSuccessScanPopup(null);
          }, 3200);

          const studentDisplayName = updated.full_name || updated.name || customName || `Learner #${learnerId}`;
          setScanStatusMessage(`✓ Marked Present: ${studentDisplayName} at ${timeStr}`);
          return updated;
        }
        return l;
      })
    );

    playScanBeep();
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  }, []);

  // Process decoded QR payload string and automatically match with student
  const processDecodedQR = useCallback((rawData: string) => {
    if (!rawData || typeof rawData !== 'string') return;
    const trimmed = rawData.trim();
    if (!trimmed) return;

    const now = Date.now();
    // Debounce duplicate scans of the exact same code within 2.5 seconds
    if (trimmed === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
      return;
    }

    let targetLearnerNumber = '';
    let targetId: number | null = null;
    let targetName = '';

    // Attempt JSON parse for official digital student cards
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.learner_number) targetLearnerNumber = String(parsed.learner_number).trim();
        if (parsed.id) targetId = parseInt(String(parsed.id), 10);
        if (parsed.name) targetName = String(parsed.name).trim();
      }
    } catch (_) {}

    // Fallback if not JSON or plain string
    if (!targetLearnerNumber && !targetId) {
      targetLearnerNumber = trimmed;
      if (/^\d+$/.test(trimmed)) {
        targetId = parseInt(trimmed, 10);
      }
    }

    const currentList = localRosterRef.current;
    const matched = currentList.find((l) => {
      const lNum = (l.learner_number || '').toLowerCase();
      const tNum = targetLearnerNumber.toLowerCase();
      const lName = `${l.full_name || l.name || ''} ${l.surname || ''}`.toLowerCase();
      const tName = targetName.toLowerCase();

      if (tNum && lNum && (lNum === tNum || lNum.includes(tNum) || tNum.includes(lNum))) return true;
      if (targetId && l.id === targetId) return true;
      if (tName && lName && (lName.includes(tName) || tName.includes(lName))) return true;
      return false;
    });

    if (matched) {
      lastScannedCodeRef.current = trimmed;
      lastScannedTimeRef.current = now;
      handleLearnerScanned(matched.id, matched.full_name || matched.name);
    } else {
      // If code was recognized but student is from a different class
      if (trimmed !== lastScannedCodeRef.current || now - lastScannedTimeRef.current > 3000) {
        lastScannedCodeRef.current = trimmed;
        lastScannedTimeRef.current = now;
        setScanStatusMessage(`⚠️ QR Scanned (${targetLearnerNumber || trimmed.substring(0, 15)}), but not enrolled in Class ${selectedClass}.`);
      }
    }
  }, [handleLearnerScanned, selectedClass]);

  // Continuous frame analysis scan loop using jsQR
  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          processDecodedQR(code.data);
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(scanLoop);
  }, [processDecodedQR]);

  // Start device camera with continuous scanning loop
  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    setCameraError(null);
    stopCamera();

    const targetFacing = overrideFacing || facingMode;

    const requestStream = async (): Promise<MediaStream | null> => {
      // 1. Try modern navigator.mediaDevices.getUserMedia with ideal facing mode
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: targetFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          });
        } catch (e1) {
          console.warn('Ideal facing mode failed, trying simple video constraint:', e1);
        }

        try {
          return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (e2) {
          console.warn('Simple video constraint failed:', e2);
        }
      }

      // 2. Try legacy navigator.getUserMedia
      const legacyGetUserMedia =
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia;

      if (legacyGetUserMedia) {
        return new Promise((resolve) => {
          legacyGetUserMedia.call(
            navigator,
            { video: true },
            (s: MediaStream) => resolve(s),
            (err: any) => {
              console.warn('Legacy getUserMedia error:', err);
              resolve(null);
            }
          );
        });
      }

      return null;
    };

    try {
      const stream = await requestStream();
      if (stream) {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
              animationFrameIdRef.current = requestAnimationFrame(scanLoop);
            }).catch((playErr) => console.warn('Video play note:', playErr));
          };
        }
        setCameraActive(true);
        setCameraError(null);
      } else {
        setCameraActive(false);
        setCameraError(
          'Live camera feed is unavailable. You can tap "Take Photo / Select Image" to scan instantly, or use Quick-Tap below.'
        );
      }
    } catch (err: any) {
      console.warn('Camera startup note:', err);
      setCameraActive(false);
      setCameraError('Camera access denied or unavailable. Tap "Take Photo / Select Image" below.');
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Stop device camera & cancel animation frame loop
  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Handle Photo Snap upload with jsQR image decoding
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoScanning(true);
    setScanStatusMessage('Analyzing photo for Student QR Code...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });

          setPhotoScanning(false);
          if (code && code.data) {
            processDecodedQR(code.data);
          } else {
            setScanStatusMessage('⚠️ No QR code detected in the photo. Please ensure clear lighting.');
          }
        } else {
          setPhotoScanning(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle manual Barcode / Learner Number Input submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    processDecodedQR(barcodeInput.trim());
    setBarcodeInput('');
  };

  // Manual status override
  const handleSetStatus = (learnerId: number, status: 'present' | 'late' | 'absent') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLocalRoster((prev) =>
      prev.map((l) =>
        l.id === learnerId
          ? { ...l, status, scannedAt: status === 'present' || status === 'late' ? timeStr : undefined }
          : l
      )
    );
  };

  // Finalize Period Attendance and Notify Parents
  const handleFinalizeAndNotify = () => {
    setIsFinalizing(true);
    setTimeout(() => {
      setIsFinalizing(false);
      setDispatchSuccess(true);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });

      setTimeout(() => {
        onApplyAttendance(localRoster, true);
        onClose();
      }, 2000);
    }, 1200);
  };

  if (!isOpen) return null;

  const scannedCount = localRoster.filter((l) => l.status === 'present').length;
  const lateCount = localRoster.filter((l) => l.status === 'late').length;
  const onHoldCount = localRoster.filter((l) => l.status === 'absent').length;
  const totalCount = localRoster.length || 1;
  const scannedRate = Math.round(((scannedCount + lateCount) / totalCount) * 100);

  const filteredRoster = localRoster.filter((l) => {
    const name = `${l.full_name || l.name || ''} ${l.surname || ''}`.toLowerCase();
    return name.includes(filterSearch.toLowerCase()) || l.learner_number.toLowerCase().includes(filterSearch.toLowerCase());
  });

  const periodMinutes = Math.floor(periodTimeRemaining / 60);
  const periodSeconds = periodTimeRemaining % 60;
  const formattedPeriodTime = `${periodMinutes.toString().padStart(2, '0')}:${periodSeconds
    .toString()
    .padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-3xl bg-surface-dark border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-surface-darker/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shadow-glow-cyan">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold font-display text-white">
                  Class Roll-Call Camera Scanner
                </h3>
                <Badge variant="cyan" size="sm">Class {selectedClass}</Badge>
                <Badge variant="indigo" size="sm">{subjectName}</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Scan each student's Digital ID Card QR Code to mark present instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-surface-dark border border-white/10 text-center">
              <p className="text-[9px] uppercase font-bold text-slate-400">Period Timer</p>
              <p className="text-xs font-mono font-extrabold text-amber-300">{formattedPeriodTime} Left</p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns (Left: Camera Scanner, Right: Live Roll-Call & Hold Queue) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 6 COLS: Live Camera Viewfinder */}
          <div className="lg:col-span-6 space-y-4">
            {/* Viewfinder Frame */}
            <div className="relative aspect-[4/3] rounded-3xl bg-slate-950 border-2 border-cyan-500/40 overflow-hidden shadow-2xl flex items-center justify-center group">
              {/* Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {/* Viewfinder Holographic Laser Scanner Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                <div className="w-full flex justify-between">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                </div>

                {/* Animated Laser Scanning Line */}
                <div className="w-3/4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-glow-cyan animate-laser-scan" />

                <div className="w-full flex justify-between">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
                </div>
              </div>

              {/* Top Camera Controls when Active */}
              {cameraActive && (
                <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                  <button
                    onClick={toggleFacingMode}
                    className="px-3 py-1.5 rounded-xl bg-surface-darker/90 backdrop-blur-md hover:bg-white/20 text-cyan-300 font-bold text-[11px] border border-cyan-500/40 shadow-lg flex items-center gap-1.5 transition-all"
                    title="Flip camera"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Flip ({facingMode === 'environment' ? 'Rear' : 'Front'})</span>
                  </button>
                </div>
              )}

              {/* Camera Fallback / Status Indicator */}
              {!cameraActive && (
                <div className="text-center p-6 space-y-3 z-10">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center">
                    <Smartphone className="w-6 h-6 animate-bounce" />
                  </div>
                  <p className="text-xs text-slate-300 font-semibold max-w-xs mx-auto">
                    {cameraError || 'Camera scanner is ready for roll-call.'}
                  </p>
                  
                  <div className="flex items-center justify-center gap-2.5 pt-1 flex-wrap">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-brand-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-black shadow-glow-cyan transition-all transform hover:scale-105 flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{photoScanning ? 'Scanning...' : 'Open Device Camera'}</span>
                    </button>

                    <button
                      onClick={() => startCamera()}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Retry Live Video</span>
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoCapture}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Real-Time Scanner Status Bar */}
              <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-darker/90 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-[11px] font-mono shadow-md">
                <ScanLine className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="truncate max-w-[200px] sm:max-w-xs">{scanStatusMessage}</span>
              </div>

              {/* Centered Holographic Scan-Success Animation Pop-up */}
              {successScanPopup && (
                <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in pointer-events-none">
                  <div className="relative w-full max-w-xs rounded-3xl bg-slate-900/95 border-2 border-emerald-400 p-5 text-center shadow-2xl shadow-emerald-500/40 overflow-hidden transform animate-bounce-short">
                    {/* Glowing Aura Rings */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyan-500/30 rounded-full blur-xl animate-pulse" />

                    <div className="relative z-10 flex flex-col items-center">
                      {/* Pulse Shield */}
                      <div className="relative mb-2.5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/50">
                          <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute -inset-1.5 rounded-2xl border-2 border-emerald-400/70 animate-ping pointer-events-none" />
                      </div>

                      <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black tracking-wider uppercase">
                        ✓ VERIFIED & RECORDED
                      </span>

                      <h4 className="text-base font-extrabold text-white mt-1.5 leading-tight">
                        {successScanPopup.full_name || successScanPopup.name} {successScanPopup.surname || ''}
                      </h4>
                      <p className="text-xs font-mono text-cyan-300 font-bold mt-0.5">
                        {successScanPopup.learner_number}
                      </p>

                      <div className="mt-2.5 w-full py-1 px-3 rounded-xl bg-surface-dark border border-white/10 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Logged Time:</span>
                        <span className="font-mono font-bold text-emerald-400">{successScanPopup.scannedAt}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                        <Send className="w-3 h-3 text-cyan-400 animate-pulse" />
                        <span>Parent confirmation email dispatched</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Scanned Student Banner */}
              {lastScannedLearner && !successScanPopup && (
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-2xl bg-surface-darker/95 border border-emerald-500/40 shadow-xl flex items-center justify-between animate-fade-in z-20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-white">
                        {lastScannedLearner.full_name || lastScannedLearner.name} {lastScannedLearner.surname}
                      </p>
                      <p className="text-[10px] font-mono text-emerald-400">
                        Scanned Present at {lastScannedLearner.scannedAt}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    VERIFIED
                  </span>
                </div>
              )}
            </div>

            {/* Barcode & Manual ID Input Bar */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan / Type Learner ID or Name (e.g. 2026-094)..."
                className="flex-1 px-3.5 py-2.5 bg-surface-darker border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-glow-cyan transition-all flex items-center gap-1.5 shrink-0"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan ID</span>
              </button>
            </form>

            {/* Quick Tap Scanner (Simulates Instant Student Barcode Tap) */}
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  Quick Tap Selector (Click student to mark present):
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {onHoldCount} Remaining
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {localRoster
                  .filter((l) => l.status === 'absent')
                  .map((learner) => {
                    const name = `${learner.full_name || learner.name || ''} ${learner.surname || ''}`.trim();
                    return (
                      <button
                        key={learner.id}
                        onClick={() => handleLearnerScanned(learner.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-surface-dark hover:bg-cyan-600/30 text-slate-300 hover:text-cyan-200 border border-white/5 hover:border-cyan-500/40 text-[11px] font-semibold transition-all flex items-center gap-1.5"
                      >
                        <QrCode className="w-3 h-3 text-cyan-400" />
                        <span>{name}</span>
                      </button>
                    );
                  })}
                {onHoldCount === 0 && (
                  <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 py-1">
                    <CheckCircle2 className="w-4 h-4" />
                    All students in Class {selectedClass} have been scanned present!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT 6 COLS: Real-Time Roster & Period Hold Queue */}
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Telemetry Stats Bar */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-2xl bg-surface-darker border border-emerald-500/30 text-center">
                  <p className="text-[9px] uppercase font-bold text-slate-400">Scanned Present</p>
                  <p className="text-lg font-black text-emerald-400 font-mono">{scannedCount}</p>
                </div>
                <div className="p-3 rounded-2xl bg-surface-darker border border-amber-500/30 text-center">
                  <p className="text-[9px] uppercase font-bold text-slate-400">Marked Late</p>
                  <p className="text-lg font-black text-amber-400 font-mono">{lateCount}</p>
                </div>
                <div className="p-3 rounded-2xl bg-surface-darker border border-rose-500/30 text-center">
                  <p className="text-[9px] uppercase font-bold text-slate-400">On Hold (Unscanned)</p>
                  <p className="text-lg font-black text-rose-400 font-mono">{onHoldCount}</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Filter student list..."
                  className="w-full pl-9 pr-3 py-2 bg-surface-darker border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Student Roll-Call List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredRoster.map((learner) => {
                  const name = `${learner.full_name || learner.name || ''} ${learner.surname || ''}`.trim();
                  return (
                    <div
                      key={learner.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
                        learner.status === 'present'
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : learner.status === 'late'
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-surface-darker/60 border-white/5 opacity-85'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white truncate">{name}</p>
                          {learner.scannedAt && (
                            <span className="text-[9px] font-mono text-emerald-400">
                              [{learner.scannedAt}]
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-400">{learner.learner_number}</p>
                      </div>

                      {/* Status Override Pills */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleLearnerScanned(learner.id)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                            learner.status === 'present'
                              ? 'bg-emerald-500 text-slate-950 shadow-glow-emerald'
                              : 'bg-surface-dark text-slate-400 hover:text-white'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleSetStatus(learner.id, 'late')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                            learner.status === 'late'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-surface-dark text-slate-400 hover:text-white'
                          }`}
                        >
                          Late
                        </button>
                        <button
                          onClick={() => handleSetStatus(learner.id, 'absent')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                            learner.status === 'absent'
                              ? 'bg-rose-500 text-white'
                              : 'bg-surface-dark text-slate-400 hover:text-white'
                          }`}
                        >
                          On Hold
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Period Finalize & Notify Parents Footer */}
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-3 mt-auto">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-400">
                  When the period concludes, unscanned learners remaining on hold are finalized as <strong>Absent</strong>. The system will automatically dispatch instant notifications to their parents.
                </p>
              </div>

              {dispatchSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Period Finalized! Parent notifications dispatched via SMS & Email.</span>
                </div>
              ) : (
                <button
                  onClick={handleFinalizeAndNotify}
                  disabled={isFinalizing}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-cyan-600 to-indigo-600 hover:from-brand-500 text-white font-extrabold text-xs shadow-glow-indigo transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isFinalizing ? (
                    <span>Finalizing Attendance & Dispatching Alerts...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Finalize Period Attendance & Notify Parents ({onHoldCount} Absent / {lateCount} Late)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
