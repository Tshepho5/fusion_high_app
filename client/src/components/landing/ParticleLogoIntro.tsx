import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface ParticleLogoIntroProps {
  onComplete: () => void;
}

interface Particle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetRadius: number;
  targetAngle: number;
  currentAngle: number;
  speed: number;
  size: number;
  color: string;
  alpha: number;
}

export const ParticleLogoIntro: React.FC<ParticleLogoIntroProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showLogo, setShowLogo] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 4000; // 4 seconds

    // Set canvas dimensions
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const centerX = width / 2;
    const centerY = height / 2 - 40;

    // Brand color palette
    const colors = ['#6366F1', '#4F46E5', '#06B6D4', '#10B981', '#E0E7FF', '#FFFFFF'];

    // Generate 240 particles distributed to the right of the screen
    const particleCount = 260;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const startAngle = (Math.random() * Math.PI * 2);
      const startDist = Math.random() * (width * 0.6) + width * 0.4;
      const startX = width + Math.random() * 300;
      const startY = centerY + (Math.random() - 0.5) * height * 0.9;

      // Target circular formation around the logo
      const ring = i % 4;
      const ringRadii = [75, 95, 115, 135];
      const targetRadius = ringRadii[ring] + (Math.random() - 0.5) * 16;
      const targetAngle = (i / particleCount) * Math.PI * 2 * 3;

      particles.push({
        x: startX,
        y: startY,
        startX,
        startY,
        targetRadius,
        targetAngle,
        currentAngle: startAngle,
        speed: 1.5 + Math.random() * 2.5,
        size: 1.5 + Math.random() * 2.5,
        color: colors[i % colors.length],
        alpha: 0.2 + Math.random() * 0.8
      });
    }

    // Timeline triggers for logo and welcoming text
    const timerLogo = setTimeout(() => setShowLogo(true), 2200);
    const timerMessage = setTimeout(() => setShowMessage(true), 2600);
    const timerFade = setTimeout(() => setIsFadingOut(true), 3700);
    const timerDone = setTimeout(() => onComplete(), 4100);

    const render = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, width, height);

      // Draw subtle circular target guide rings as time progresses
      if (progress > 0.3) {
        const ringAlpha = Math.min((progress - 0.3) * 2, 0.25);
        ctx.strokeStyle = `rgba(99, 102, 241, ${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 85, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(6, 182, 212, ${ringAlpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Update and draw particles
      particles.forEach((p) => {
        // Spiral converging animation from right into concentric circles
        if (progress < 0.65) {
          const t = progress / 0.65;
          const ease = t * t * (3 - 2 * t); // Smooth easing
          const currentDistX = p.startX + (centerX - p.startX) * ease;
          const currentDistY = p.startY + (centerY - p.startY) * ease;

          p.currentAngle += p.speed * 0.05;
          const spiralRadius = (1 - ease) * 180 + p.targetRadius;

          p.x = currentDistX + Math.cos(p.currentAngle) * spiralRadius * 0.4;
          p.y = currentDistY + Math.sin(p.currentAngle) * spiralRadius * 0.4;
        } else {
          // Orbiting circular logo formation
          p.currentAngle += p.speed * 0.02;
          p.x = centerX + Math.cos(p.currentAngle) * p.targetRadius;
          p.y = centerY + Math.sin(p.currentAngle) * p.targetRadius;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby particles with subtle lines for structure
        ctx.restore();
      });

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timerLogo);
      clearTimeout(timerMessage);
      clearTimeout(timerFade);
      clearTimeout(timerDone);
      window.removeEventListener('resize', handleResize);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b14] text-white transition-opacity duration-500 overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Canvas for Particle Orbit Simulation */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
      >
        <span>Skip Intro</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {/* Central Assembled Logo (Enlarged) */}
      <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none -mt-20">
        <div
          className={`w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-3xl bg-slate-900/95 border border-white/25 p-6 shadow-2xl shadow-indigo-500/20 flex items-center justify-center transition-all duration-700 transform ${
            showLogo
              ? 'scale-100 opacity-100 rotate-0'
              : 'scale-50 opacity-0 rotate-45'
          }`}
        >
          <img
            src="/assets/FH.png"
            alt="Fusion High School Logo"
            className="w-full h-full object-contain drop-shadow-2xl"
          />
        </div>

        {/* Welcoming Message Banner */}
        <div
          className={`mt-6 text-center space-y-2 transition-all duration-700 transform ${
            showMessage
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Welcome to</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
            FUSION HIGH SCHOOL
          </h1>
          <p className="text-xs sm:text-sm text-cyan-400 font-mono font-semibold uppercase tracking-widest">
            One School • Limitless Potential
          </p>
        </div>
      </div>
    </div>
  );
};
