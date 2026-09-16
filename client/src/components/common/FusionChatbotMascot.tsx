import React, { useState, useEffect, useRef } from 'react';

export interface FusionChatbotMascotProps {
  size?: number;
  className?: string;
  isHovered?: boolean;
  onMascotClick?: () => void;
  showSpeechBubble?: boolean;
  onSpeechBubbleClose?: () => void;
}

/**
 * FusionChatbotMascot:
 * An interactive, 3D-styled animated mascot inspired by circular porthole robot designs,
 * fully customized with official Fusion High School branding (FH Monogram & Crest).
 * 
 * Features:
 * 1. Waves hand on hover, on mouse proximity movement, and every 30 seconds automatically.
 * 2. Expressive facial expressions: eye-pupil parallax cursor tracking, natural blinks, happy squint & blush.
 * 3. Joyful open smile and glossy 3D helmet with specular highlights.
 */
export const FusionChatbotMascot: React.FC<FusionChatbotMascotProps> = ({
  size = 64,
  className = '',
  isHovered: externalHovered,
  onMascotClick,
  showSpeechBubble = false,
  onSpeechBubbleClose,
}) => {
  const [internalHovered, setInternalHovered] = useState(false);
  const [isWavingPeriodically, setIsWavingPeriodically] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [pupilOffset, setPupilOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [localSpeechBubble, setLocalSpeechBubble] = useState(false);
  const mascotRef = useRef<HTMLDivElement>(null);

  const isHovered = externalHovered ?? internalHovered;
  const isWaving = isHovered || isWavingPeriodically;

  // 1. Natural eye blink cycle every 3.8 to 5.5 seconds
  useEffect(() => {
    let blinkTimer: NodeJS.Timeout;
    const scheduleNextBlink = () => {
      const delay = 3500 + Math.random() * 2000;
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 180);
      }, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(blinkTimer);
  }, []);

  // 2. Periodic greeting wave every 30 seconds
  useEffect(() => {
    const waveInterval = setInterval(() => {
      setIsWavingPeriodically(true);
      setLocalSpeechBubble(true);

      // Wave for 3.5 seconds then rest
      setTimeout(() => {
        setIsWavingPeriodically(false);
      }, 3500);

      // Auto-hide speech bubble after 5.5 seconds
      setTimeout(() => {
        setLocalSpeechBubble(false);
      }, 5500);
    }, 30000);

    return () => clearInterval(waveInterval);
  }, []);

  // 3. Eye pupil parallax tracking: pupil follows the user's cursor across the screen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mascotRef.current) return;
      const rect = mascotRef.current.getBoundingClientRect();
      const mascotCenterX = rect.left + rect.width / 2;
      const mascotCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - mascotCenterX;
      const deltaY = e.clientY - mascotCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Max eye travel limit: ±3.2 pixels
      const maxOffset = 3.2;
      const factor = Math.min(distance / 250, 1);
      const angle = Math.atan2(deltaY, deltaX);

      setPupilOffset({
        x: Math.cos(angle) * maxOffset * factor,
        y: Math.sin(angle) * maxOffset * factor,
      });

      // If user cursor gets very close (< 90px), wave playfully
      if (distance < 90 && !isWavingPeriodically) {
        setIsWavingPeriodically(true);
        setTimeout(() => setIsWavingPeriodically(false), 2200);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isWavingPeriodically]);

  const activeSpeech = showSpeechBubble || localSpeechBubble;

  return (
    <div
      ref={mascotRef}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setInternalHovered(true)}
      onMouseLeave={() => setInternalHovered(false)}
      onClick={onMascotClick}
    >
      {/* Pop-out Speech Bubble for Periodic / Hover Greeting */}
      {activeSpeech && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSpeechBubbleClose?.();
            setLocalSpeechBubble(false);
            onMascotClick?.();
          }}
          className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3.5 py-2 rounded-2xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl border border-cyan-400/40 whitespace-nowrap cursor-pointer z-50 backdrop-blur-md animate-mascot-speech group-hover:scale-105 transition-transform"
        >
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">👋</span>
            <div className="flex flex-col">
              <span className="text-cyan-300 font-extrabold text-[11px] uppercase tracking-wider">Fusion AI</span>
              <span className="text-white text-[12px]">Hi! How can I help you?</span>
            </div>
          </div>
          {/* Arrow pointing to mascot */}
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-slate-900 border-t border-r border-cyan-400/40 rotate-45" />
        </div>
      )}

      {/* SVG Mascot Character inside Porthole */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-xl transition-transform duration-300 ${
          isHovered ? 'scale-105' : ''
        }`}
      >
        <defs>
          {/* 1. Deep Porthole Ambient Gradient */}
          <radialGradient id="portholeDarkGrad" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#070A12" />
            <stop offset="90%" stopColor="#030509" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>

          {/* 2. Helmet Glossy Crimson-to-Ruby Gradient */}
          <radialGradient id="helmetRedGrad" cx="38%" cy="28%" r="68%">
            <stop offset="0%" stopColor="#FF4A4A" />
            <stop offset="42%" stopColor="#E11D48" />
            <stop offset="85%" stopColor="#9F1239" />
            <stop offset="100%" stopColor="#881337" />
          </radialGradient>

          {/* 3. Helmet 3D Specular Highlight Curve */}
          <linearGradient id="specularHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* 4. White Face Porcelain Radial Shading */}
          <radialGradient id="faceShading" cx="52%" cy="45%" r="52%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="82%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </radialGradient>

          {/* 5. Glove Shading */}
          <linearGradient id="gloveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="80%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          {/* 6. Fusion Emblem Monogram Gradient */}
          <linearGradient id="fhEmblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#9F1239" />
          </linearGradient>

          {/* Glow Shadow Filter */}
          <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* ============================================================ */}
        {/* A. CIRCULAR PORTHOLE BASE (matching reference photo)         */}
        {/* ============================================================ */}
        <circle cx="60" cy="60" r="58" fill="#0B0F19" />
        <circle cx="60" cy="60" r="56" fill="url(#portholeDarkGrad)" stroke="#1E293B" strokeWidth="2.5" />
        {/* Soft rim glow highlight on inner ring */}
        <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="1" />

        {/* ============================================================ */}
        {/* B. WAVING ROBOTIC GLOVE HAND (Left side of porthole)          */}
        {/* ============================================================ */}
        <g
          id="mascotWavingHand"
          className={isWaving ? 'animate-mascot-wave' : 'transition-transform duration-300'}
          style={{
            transformOrigin: '26px 74px',
            transform: !isWaving ? 'rotate(-6deg)' : undefined,
          }}
        >
          {/* Glove Drop Shadow */}
          <path
            d="M20 75 C16 68 15 57 19 50 C21 46 25 47 26 52 C27 46 31 46 32 51 C34 47 38 48 38 53 C38 60 41 62 44 65 C45 68 44 72 38 75 Z"
            fill="rgba(0,0,0,0.35)"
            transform="translate(1, 2)"
          />

          {/* Gloved Hand Silhouette (Palm + 3 Fingers + Thumb) */}
          <path
            d="M22 74 C17 68 16 57 20 49 C21.5 45 25.5 46.5 26.5 51 C27.5 45 32 45 33 50 C34.5 46 39 47 39 52 C39 59 42 61 45 64 C46 67.5 44 71 38 74 C33 76.5 26 77 22 74 Z"
            fill="url(#gloveGrad)"
            stroke="#CBD5E1"
            strokeWidth="0.8"
          />

          {/* Finger details / creases */}
          <path d="M26.5 53 C26.5 59 27 64 28 67" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M33 52 C33 58 33.5 63 34 66" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
          {/* Thumb joint definition */}
          <path d="M39 63 C41 65 42 67 42 69" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />

          {/* Glove Wrist Cuff */}
          <ellipse cx="30" cy="74" rx="9" ry="3.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.8" />
        </g>

        {/* ============================================================ */}
        {/* C. ROBOT HEAD & GLOSSY 3D HELMET                            */}
        {/* ============================================================ */}
        <g id="mascotHead" filter="url(#softGlow)">
          {/* 1. Outer Curved Helmet Shell */}
          <path
            d="M37 70 C34 52 42 22 66 22 C90 22 98 52 95 70 C94 77 88 79 84 72 C80 64 77 62 66 62 C55 62 52 64 48 72 C44 79 38 77 37 70 Z"
            fill="url(#helmetRedGrad)"
          />

          {/* Helmet 3D Lighting & Specular Curves */}
          <path
            d="M44 32 C50 24 60 23 70 23 C80 23 88 28 92 35 C88 28 78 24 66 24 C54 24 47 28 44 32 Z"
            fill="url(#specularHighlight)"
          />
          <ellipse cx="66" cy="27" rx="18" ry="4" fill="#FFFFFF" opacity="0.32" />

          {/* Cheek & Chin Visor Shadow */}
          <path
            d="M38 68 C39 74 44 78 48 73 C52 67 55 64 66 64 C77 64 80 67 84 73 C88 78 93 74 94 68 C94 63 93 58 92 53 C87 63 78 68 66 68 C54 68 45 63 40 53 C39 58 38 63 38 68 Z"
            fill="#7F1D1D"
            opacity="0.65"
          />

          {/* 2. White Robot Face (Porthole cutout) */}
          <ellipse cx="66" cy="63" rx="23" ry="20" fill="url(#faceShading)" />
          {/* Top brow shadow on face from helmet */}
          <path
            d="M45 54 C51 48 59 46 66 46 C73 46 81 48 87 54 C81 50 74 48 66 48 C58 48 51 50 45 54 Z"
            fill="#CBD5E1"
            opacity="0.75"
          />

          {/* 3. Helmet Front Lip Framing the Face */}
          <path
            d="M44 54 C50 48 58 46 66 46 C74 46 82 48 88 54 C88 53 87 49 84 46 C78 41 73 39 66 39 C59 39 54 41 48 46 C45 49 44 53 44 54 Z"
            fill="#B91C1C"
          />

          {/* ============================================================ */}
          {/* D. FUSION HIGH OFFICIAL CREST EMBLEM ON FOREHEAD            */}
          {/* (Replaces the external telecom logo with Fusion High Monogram)*/}
          {/* ============================================================ */}
          <g id="fusionHighHelmetCrest" transform="translate(66, 36)">
            {/* White Circular Badge Base */}
            <circle cx="0" cy="0" r="11" fill="#FFFFFF" filter="url(#softGlow)" />
            <circle cx="0" cy="0" r="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.6" />

            {/* Fusion High "FH" Stylized Academic Monogram */}
            <g transform="translate(0, 0) scale(0.65)">
              {/* Mortarboard Mini Crown atop Monogram */}
              <polygon points="0,-12 8,-8 0,-4 -8,-8" fill="url(#fhEmblemGrad)" />
              {/* Tassel cord */}
              <path d="M0,-8 Q4,-7 5,-4" fill="none" stroke="#E11D48" strokeWidth="1" strokeLinecap="round" />

              {/* Letter 'F' */}
              <path
                d="M-6 -3 H-1 V-1 H-4 V1 H-2 V3 H-4 V8 H-6 Z"
                fill="url(#fhEmblemGrad)"
              />
              {/* Letter 'H' */}
              <path
                d="M0 -3 H2 V1 H4 V-3 H6 V8 H4 V3 H2 V8 H0 Z"
                fill="url(#fhEmblemGrad)"
              />
            </g>
          </g>

          {/* ============================================================ */}
          {/* E. EXPRESSIVE ROBOT FACE (Eyes, Blinking, Smile, Blush)      */}
          {/* ============================================================ */}
          <g id="robotFacialExpression">
            {/* Eyebrows that perk up when hovered or waving */}
            <path
              d={isHovered ? "M 52 51 Q 57 48 62 52" : "M 53 52 Q 57 50 61 52"}
              fill="none"
              stroke="#64748B"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d={isHovered ? "M 70 52 Q 75 48 80 51" : "M 71 52 Q 75 50 79 52"}
              fill="none"
              stroke="#64748B"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Glowing Rosy Blushing Cheeks (Active on hover or waving) */}
            <ellipse
              cx="50"
              cy="67"
              rx="4.5"
              ry="2.4"
              fill="#FB7185"
              opacity={isHovered || isWaving ? 0.8 : 0.35}
              className="transition-opacity duration-300"
            />
            <ellipse
              cx="82"
              cy="67"
              rx="4.5"
              ry="2.4"
              fill="#FB7185"
              opacity={isHovered || isWaving ? 0.8 : 0.35}
              className="transition-opacity duration-300"
            />

            {/* EYES: Blinking or Happy Arcs or Interactive Tracking Pupils */}
            {isBlinking ? (
              // Blinking line
              <g stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round">
                <line x1="53" y1="59" x2="61" y2="59" />
                <line x1="71" y1="59" x2="79" y2="59" />
              </g>
            ) : isHovered ? (
              // Happy joyful eye squint arcs (^^ expression)
              <g stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" fill="none">
                <path d="M 52 61 Q 57 54 62 61" />
                <path d="M 70 61 Q 75 54 80 61" />
              </g>
            ) : (
              // Friendly Round Dark Eyes with Parallax Gaze Pupil Tracking
              <g>
                {/* Left Eye */}
                <circle cx="57" cy="59" r="5" fill="#0F172A" />
                {/* Left Pupil Catchlight with dynamic offset */}
                <circle
                  cx={55.5 + pupilOffset.x}
                  cy={57.5 + pupilOffset.y}
                  r="1.7"
                  fill="#FFFFFF"
                />
                <circle
                  cx={58.5 + pupilOffset.x * 0.7}
                  cy={60.5 + pupilOffset.y * 0.7}
                  r="0.8"
                  fill="#FFFFFF"
                  opacity="0.7"
                />

                {/* Right Eye */}
                <circle cx="75" cy="59" r="5" fill="#0F172A" />
                {/* Right Pupil Catchlight with dynamic offset */}
                <circle
                  cx={73.5 + pupilOffset.x}
                  cy={57.5 + pupilOffset.y}
                  r="1.7"
                  fill="#FFFFFF"
                />
                <circle
                  cx={76.5 + pupilOffset.x * 0.7}
                  cy={60.5 + pupilOffset.y * 0.7}
                  r="0.8"
                  fill="#FFFFFF"
                  opacity="0.7"
                />
              </g>
            )}

            {/* MOUTH: Big Joyful Open Crescent Smile (matching reference photo) */}
            <g id="mascotSmile">
              {isHovered ? (
                // Super wide delighted grin on hover
                <path
                  d="M 52 66 Q 66 84 80 66 Q 66 73 52 66 Z"
                  fill="#0F172A"
                />
              ) : (
                // Warm, cheerful open smile
                <path
                  d="M 54 67 Q 66 81 78 67 Q 66 73 54 67 Z"
                  fill="#0F172A"
                />
              )}

              {/* Cute Pink Tongue Inside Smile */}
              <path
                d="M 60 74 Q 66 70 72 74 Q 66 78 60 74 Z"
                fill="#F43F5E"
                opacity="0.9"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
