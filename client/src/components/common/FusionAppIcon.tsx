import React from 'react';

interface FusionAppIconProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

/**
 * G~SA Official App Icon
 * Exact vector representation generated directly from the authentic app icon.
 */
export const FusionAppIcon: React.FC<FusionAppIconProps> = ({
  className = 'w-10 h-10',
  size,
  alt = 'G~SA App Logo',
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 540 551"
      className={`inline-block shrink-0 select-none transition-transform duration-300 hover:scale-105 ${className}`}
      style={style}
      role="img"
      aria-label={alt}
    >
      <defs>
        <linearGradient id="gsa-rim-exact" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1b3558" />
          <stop offset="50%" stopColor="#12253e" />
          <stop offset="100%" stopColor="#1a3556" />
        </linearGradient>
        <linearGradient id="gsa-blue-exact" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3cb2ff" />
          <stop offset="50%" stopColor="#31a4f5" />
          <stop offset="100%" stopColor="#248ed8" />
        </linearGradient>
        <linearGradient id="gsa-bg-exact" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0c1726" />
          <stop offset="50%" stopColor="#060c14" />
          <stop offset="100%" stopColor="#020408" />
        </linearGradient>
        <radialGradient id="gsa-core-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#1e3a63" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer Squircle with Deep Navy Rim */}
      <rect
        x="14"
        y="14"
        width="512"
        height="523"
        rx="112"
        ry="112"
        fill="url(#gsa-bg-exact)"
        stroke="url(#gsa-rim-exact)"
        strokeWidth="18"
      />
      <rect
        x="14"
        y="14"
        width="512"
        height="523"
        rx="112"
        ry="112"
        fill="url(#gsa-core-glow)"
      />
      <rect
        x="22"
        y="22"
        width="496"
        height="507"
        rx="104"
        ry="104"
        fill="none"
        stroke="#1a3250"
        strokeWidth="2.5"
        strokeOpacity="0.6"
      />

      {/* G ~ S A Letterforms */}
      <g fill="url(#gsa-blue-exact)" fillRule="evenodd">
        {/* Letter "G" */}
        <path d="M 138,177 L 119,182 L 102,190 L 92,197 L 74,216 L 65,232 L 60,247 L 58,257 L 59,291 L 65,310 L 75,328 L 85,339 L 99,350 L 118,359 L 138,364 L 157,365 L 180,362 L 193,358 L 203,353 L 212,347 L 215,343 L 215,263 L 152,262 L 150,264 L 150,285 L 151,286 L 179,286 L 180,287 L 180,332 L 176,336 L 165,340 L 146,340 L 136,337 L 123,330 L 115,323 L 106,311 L 102,303 L 97,284 L 96,265 L 98,250 L 101,240 L 107,228 L 115,217 L 127,207 L 137,202 L 148,199 L 165,199 L 176,202 L 189,210 L 204,228 L 209,228 L 210,227 L 210,192 L 199,185 L 178,178 L 165,176 Z" />
        
        {/* The Wave Ribbon "~" */}
        <path d="M 332,249 L 329,250 L 329,257 L 326,264 L 319,271 L 309,274 L 296,272 L 263,255 L 253,254 L 245,256 L 234,263 L 228,271 L 224,281 L 224,291 L 225,292 L 229,291 L 242,280 L 254,279 L 263,283 L 276,292 L 288,297 L 308,296 L 319,290 L 329,277 L 333,264 Z" />
        
        {/* Lower hook of "S" */}
        <path d="M 349,269 L 342,264 L 339,277 L 334,287 L 325,298 L 329,309 L 329,320 L 325,330 L 318,337 L 308,341 L 298,341 L 290,339 L 281,334 L 271,324 L 267,317 L 263,313 L 257,314 L 257,349 L 260,352 L 277,360 L 295,364 L 318,363 L 325,361 L 342,351 L 353,338 L 359,325 L 361,317 L 360,289 L 355,277 Z" />
        
        {/* Upper hook of "S" */}
        <path d="M 322,177 L 305,177 L 286,183 L 273,193 L 267,201 L 262,213 L 261,229 L 263,237 L 268,246 L 275,252 L 298,264 L 302,265 L 315,264 L 319,260 L 321,255 L 320,250 L 315,245 L 305,239 L 296,230 L 293,224 L 294,210 L 301,202 L 311,198 L 318,198 L 325,200 L 338,211 L 345,222 L 350,221 L 352,188 L 338,181 Z" />
        
        {/* Letter "A" with inner counter */}
        <path d="M 407,179 L 367,283 L 370,293 L 371,310 L 366,331 L 357,347 L 345,360 L 346,361 L 365,360 L 379,318 L 383,312 L 429,312 L 449,361 L 487,361 L 487,357 L 441,248 L 416,184 L 413,179 Z M 405,248 L 407,249 L 409,253 L 412,264 L 421,286 L 420,288 L 391,288 L 390,287 L 401,255 Z" />
      </g>
    </svg>
  );
};
