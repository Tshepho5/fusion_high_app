const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const schoolsDir = path.join(__dirname, '..', 'public', 'assets', 'schools');
if (!fs.existsSync(schoolsDir)) {
  fs.mkdirSync(schoolsDir, { recursive: true });
}

// 12 School Brand Definitions with distinctive SVGs
const SCHOOL_LOGOS = [
  {
    id: 1,
    slug: 'fusion-high',
    name: 'Fusion High School',
    motto: 'Innovate, Lead, Transform',
    primary: '#4f46e5',
    secondary: '#06b6d4',
    accent: '#f59e0b',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="fh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="fh-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="fh-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#0f172a" stroke="url(#fh-gold)" stroke-width="6" filter="url(#fh-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="url(#fh-grad)" stroke-width="3" stroke-dasharray="6,4"/>
  
  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#fh-grad)" stroke="url(#fh-gold)" stroke-width="4"/>
  
  <!-- Shield Internal Accent -->
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#090d16" opacity="0.45"/>

  <!-- Atom Orbital Rings -->
  <ellipse cx="200" cy="180" rx="48" ry="18" fill="none" stroke="#38bdf8" stroke-width="2.5" transform="rotate(-30 200 180)"/>
  <ellipse cx="200" cy="180" rx="48" ry="18" fill="none" stroke="#a78bfa" stroke-width="2.5" transform="rotate(30 200 180)"/>
  <circle cx="200" cy="180" r="7" fill="url(#fh-gold)"/>

  <!-- Open Book of Knowledge -->
  <path d="M165 240 Q200 230 200 245 Q200 230 235 240 V270 Q200 260 200 275 Q200 260 165 270 Z" fill="#ffffff" stroke="url(#fh-gold)" stroke-width="2"/>
  <line x1="200" y1="245" x2="200" y2="275" stroke="#4f46e5" stroke-width="2"/>

  <!-- Central Star Cluster -->
  <polygon points="200,105 204,117 217,117 206,124 210,136 200,128 190,136 194,124 183,117 196,117" fill="url(#fh-gold)"/>
  <polygon points="160,125 163,133 172,133 164,138 167,146 160,141 153,146 156,138 148,133 157,133" fill="url(#fh-gold)" transform="scale(0.8) translate(40,15)"/>
  <polygon points="240,125 243,133 252,133 244,138 247,146 240,141 233,146 236,138 228,133 237,133" fill="url(#fh-gold)" transform="scale(0.8) translate(60,15)"/>

  <!-- Top Title Banner Arc -->
  <path id="fh-arc" d="M 60 200 A 140 140 0 0 1 340 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="19" font-weight="900" letter-spacing="2">
    <textPath href="#fh-arc" startOffset="50%" text-anchor="middle">FUSION HIGH SCHOOL</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M100 340 L130 325 L200 345 L270 325 L300 340 L285 365 L200 352 L115 365 Z" fill="#0f172a" stroke="url(#fh-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#fh-gold)" font-family="Arial, sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="1">INNOVATE • LEAD • TRANSFORM</text>
</svg>`
  },
  {
    id: 2,
    slug: 'mountainview-high',
    name: 'Mountainview Senior Secondary School',
    motto: 'Strive for Excellence',
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#f59e0b',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="mv-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e40af" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="mv-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="mv-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#091428" stroke="url(#mv-gold)" stroke-width="6" filter="url(#mv-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="url(#mv-grad)" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#mv-grad)" stroke="url(#mv-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#040b17" opacity="0.45"/>

  <!-- Sun Rays & Rising Sun Behind Mountain -->
  <circle cx="200" cy="160" r="28" fill="url(#mv-gold)"/>
  
  <!-- Mountain Peaks (Mankweng Hills) -->
  <polygon points="200,135 245,215 155,215" fill="#1e293b" stroke="url(#mv-gold)" stroke-width="2"/>
  <polygon points="160,155 205,215 125,215" fill="#334155" opacity="0.9"/>
  <polygon points="235,160 275,215 195,215" fill="#0f172a" opacity="0.8"/>
  <!-- Mountain Snow/Peak Caps -->
  <polygon points="200,135 212,158 203,154 197,158 188,158" fill="#ffffff"/>

  <!-- Torch of Excellence -->
  <path d="M195 240 L205 240 L202 275 L198 275 Z" fill="url(#mv-gold)"/>
  <path d="M192 238 Q200 220 200 215 Q208 220 208 238 Z" fill="#ef4444"/>
  <path d="M196 235 Q200 225 200 220 Q204 225 204 235 Z" fill="#facc15"/>

  <!-- Open Book at Base -->
  <path d="M160 265 Q200 255 200 270 Q200 255 240 265 V295 Q200 285 200 300 Q200 285 160 295 Z" fill="#ffffff" stroke="url(#mv-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="mv-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="900" letter-spacing="1.5">
    <textPath href="#mv-arc" startOffset="50%" text-anchor="middle">MOUNTAINVIEW SENIOR SEC</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M110 340 L140 325 L200 345 L260 325 L290 340 L275 365 L200 352 L125 365 Z" fill="#040b17" stroke="url(#mv-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#mv-gold)" font-family="Arial, sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="1">STRIVE FOR EXCELLENCE</text>
</svg>`
  },
  {
    id: 3,
    slug: 'makgoka-high',
    name: 'Makgoka High School',
    motto: 'Thuto Ke Lesedi',
    primary: '#065f46',
    secondary: '#10b981',
    accent: '#fbbf24',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="mk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#065f46" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
    <linearGradient id="mk-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <filter id="mk-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#032014" stroke="url(#mk-gold)" stroke-width="6" filter="url(#mk-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="url(#mk-grad)" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#mk-grad)" stroke="url(#mk-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#02140d" opacity="0.45"/>

  <!-- Radiant Lamp / Sun of Knowledge -->
  <path d="M170 185 Q200 145 200 120 Q200 145 230 185 Q200 175 170 185 Z" fill="url(#mk-gold)"/>
  <circle cx="200" cy="140" r="8" fill="#ffffff"/>
  
  <!-- Classic Oil Lamp of Wisdom -->
  <path d="M165 200 H235 L225 220 H175 Z" fill="url(#mk-gold)" stroke="#065f46" stroke-width="1.5"/>
  <path d="M150 200 Q165 190 175 200" stroke="url(#mk-gold)" stroke-width="3" fill="none"/>
  
  <!-- Laurel / Olive Wreath of Wisdom -->
  <path d="M140 180 Q130 230 165 260" fill="none" stroke="url(#mk-gold)" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M260 180 Q270 230 235 260" fill="none" stroke="url(#mk-gold)" stroke-width="3.5" stroke-linecap="round"/>

  <!-- Open Book at Base -->
  <path d="M160 250 Q200 240 200 255 Q200 240 240 250 V280 Q200 270 200 285 Q200 270 160 280 Z" fill="#ffffff" stroke="url(#mk-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="mk-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="18" font-weight="900" letter-spacing="2">
    <textPath href="#mk-arc" startOffset="50%" text-anchor="middle">MAKGOKA HIGH SCHOOL</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M115 340 L145 325 L200 345 L255 325 L285 340 L270 365 L200 352 L130 365 Z" fill="#02140d" stroke="url(#mk-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#mk-gold)" font-family="Arial, sans-serif" font-size="11.5" font-weight="800" text-anchor="middle" letter-spacing="1">THUTO KE LESEDI</text>
</svg>`
  },
  {
    id: 4,
    slug: 'turfloop-high',
    name: 'Turfloop High School',
    motto: 'Education for Progress',
    primary: '#1e1b4b',
    secondary: '#4338ca',
    accent: '#991b1b',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="tf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#4338ca" />
    </linearGradient>
    <linearGradient id="tf-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
    <filter id="tf-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#0b0a1d" stroke="url(#tf-gold)" stroke-width="6" filter="url(#tf-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="#991b1b" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#tf-grad)" stroke="url(#tf-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#090817" opacity="0.45"/>

  <!-- Mortarboard / Academic Cap -->
  <polygon points="200,120 250,140 200,160 150,140" fill="url(#tf-gold)"/>
  <polygon points="175,150 200,162 225,150 225,168 200,180 175,168" fill="#ffffff"/>
  <line x1="240" y1="145" x2="245" y2="175" stroke="#991b1b" stroke-width="2.5"/>
  <circle cx="245" cy="177" r="3.5" fill="#991b1b"/>

  <!-- University Quill & Scroll -->
  <path d="M170 210 Q200 195 230 210 V235 Q200 220 170 235 Z" fill="#f8fafc" stroke="url(#tf-gold)" stroke-width="1.5"/>
  <line x1="220" y1="185" x2="185" y2="245" stroke="url(#tf-gold)" stroke-width="3"/>

  <!-- Open Book of Higher Learning -->
  <path d="M160 250 Q200 240 200 255 Q200 240 240 250 V280 Q200 270 200 285 Q200 270 160 280 Z" fill="#ffffff" stroke="url(#tf-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="tf-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="18" font-weight="900" letter-spacing="2">
    <textPath href="#tf-arc" startOffset="50%" text-anchor="middle">TURFLOOP HIGH SCHOOL</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M105 340 L135 325 L200 345 L265 325 L295 340 L280 365 L200 352 L120 365 Z" fill="#090817" stroke="url(#tf-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#tf-gold)" font-family="Arial, sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="1">EDUCATION FOR PROGRESS</text>
</svg>`
  },
  {
    id: 5,
    slug: 'hwiti-high',
    name: 'Hwiti High School',
    motto: 'Tsebo Ke Maatla',
    primary: '#581c87',
    secondary: '#9333ea',
    accent: '#06b6d4',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="hw-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#581c87" />
      <stop offset="100%" stop-color="#9333ea" />
    </linearGradient>
    <linearGradient id="hw-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="hw-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#180726" stroke="url(#hw-gold)" stroke-width="6" filter="url(#hw-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="#06b6d4" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#hw-grad)" stroke="url(#hw-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#10041b" opacity="0.45"/>

  <!-- Imperial Crown of Perseverance -->
  <path d="M165 160 L175 130 L200 148 L225 130 L235 160 Z" fill="url(#hw-gold)" stroke="#ffffff" stroke-width="1.5"/>
  <circle cx="175" cy="128" r="3.5" fill="#06b6d4"/>
  <circle cx="200" cy="146" r="3.5" fill="#06b6d4"/>
  <circle cx="225" cy="128" r="3.5" fill="#06b6d4"/>

  <!-- Crossed Torches & Quill -->
  <line x1="165" y1="235" x2="235" y2="185" stroke="url(#hw-gold)" stroke-width="3" stroke-linecap="round"/>
  <line x1="235" y1="235" x2="165" y2="185" stroke="#06b6d4" stroke-width="3" stroke-linecap="round"/>

  <!-- Open Book at Base -->
  <path d="M160 250 Q200 240 200 255 Q200 240 240 250 V280 Q200 270 200 285 Q200 270 160 280 Z" fill="#ffffff" stroke="url(#hw-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="hw-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="19" font-weight="900" letter-spacing="2">
    <textPath href="#hw-arc" startOffset="50%" text-anchor="middle">HWITI HIGH SCHOOL</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M105 340 L135 325 L200 345 L265 325 L295 340 L280 365 L200 352 L120 365 Z" fill="#10041b" stroke="url(#hw-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#hw-gold)" font-family="Arial, sans-serif" font-size="12" font-weight="800" text-anchor="middle" letter-spacing="1">TSEBO KE MAATLA</text>
</svg>`
  },
  {
    id: 6,
    slug: 'ngwana-mohube',
    name: 'Ngwana Mohube Secondary School',
    motto: 'Thuto Ke Maatla',
    primary: '#991b1b',
    secondary: '#ef4444',
    accent: '#0f172a',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="nm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#991b1b" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
    <linearGradient id="nm-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="nm-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#200505" stroke="url(#nm-gold)" stroke-width="6" filter="url(#nm-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="url(#nm-grad)" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#nm-grad)" stroke="url(#nm-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#120202" opacity="0.45"/>

  <!-- Soaring Eagle of Seleteng / Forward Wing -->
  <path d="M200 130 Q170 120 145 145 Q175 155 190 170 Q200 155 200 130 Z" fill="url(#nm-gold)"/>
  <path d="M200 130 Q230 120 255 145 Q225 155 210 170 Q200 155 200 130 Z" fill="url(#nm-gold)"/>
  <circle cx="200" cy="140" r="5" fill="#ffffff"/>

  <!-- Radiant Rising Dawn Rays -->
  <line x1="200" y1="180" x2="200" y2="215" stroke="url(#nm-gold)" stroke-width="3"/>
  <line x1="180" y1="190" x2="165" y2="215" stroke="url(#nm-gold)" stroke-width="2"/>
  <line x1="220" y1="190" x2="235" y2="215" stroke="url(#nm-gold)" stroke-width="2"/>

  <!-- Open Book at Base -->
  <path d="M160 250 Q200 240 200 255 Q200 240 240 250 V280 Q200 270 200 285 Q200 270 160 280 Z" fill="#ffffff" stroke="url(#nm-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="nm-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="900" letter-spacing="1">
    <textPath href="#nm-arc" startOffset="50%" text-anchor="middle">NGWANA MOHUBE SEC</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M105 340 L135 325 L200 345 L265 325 L295 340 L280 365 L200 352 L120 365 Z" fill="#120202" stroke="url(#nm-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#nm-gold)" font-family="Arial, sans-serif" font-size="12" font-weight="800" text-anchor="middle" letter-spacing="1">THUTO KE MAATLA</text>
</svg>`
  },
  {
    id: 7,
    slug: 'fusion-secondary-lotus',
    name: 'Fusion Secondary School (Lotus Gardens)',
    motto: 'Innovate, Aspire, Achieve',
    primary: '#4f46e5',
    secondary: '#06b6d4',
    accent: '#f59e0b',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="fsl-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="fsl-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="fsl-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#0b1120" stroke="url(#fsl-gold)" stroke-width="6" filter="url(#fsl-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="url(#fsl-grad)" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#fsl-grad)" stroke="url(#fsl-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#060913" opacity="0.45"/>

  <!-- Lotus Blossom Emblem (Lotus Gardens) -->
  <path d="M200 135 C190 160 180 185 200 205 C220 185 210 160 200 135 Z" fill="url(#fsl-gold)"/>
  <path d="M200 160 C175 165 155 180 165 205 C185 205 195 190 200 160 Z" fill="#38bdf8"/>
  <path d="M200 160 C225 165 245 180 235 205 C215 205 205 190 200 160 Z" fill="#38bdf8"/>

  <!-- Technology Nodes / Connection Lines -->
  <circle cx="160" cy="225" r="4" fill="url(#fsl-gold)"/>
  <circle cx="240" cy="225" r="4" fill="url(#fsl-gold)"/>
  <line x1="160" y1="225" x2="200" y2="245" stroke="#38bdf8" stroke-width="2"/>
  <line x1="240" y1="225" x2="200" y2="245" stroke="#38bdf8" stroke-width="2"/>

  <!-- Open Book of Knowledge -->
  <path d="M160 250 Q200 240 200 255 Q200 240 240 250 V280 Q200 270 200 285 Q200 270 160 280 Z" fill="#ffffff" stroke="url(#fsl-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="fsl-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="15.5" font-weight="900" letter-spacing="1">
    <textPath href="#fsl-arc" startOffset="50%" text-anchor="middle">FUSION SEC - LOTUS GARDENS</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M105 340 L135 325 L200 345 L265 325 L295 340 L280 365 L200 352 L120 365 Z" fill="#060913" stroke="url(#fsl-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#fsl-gold)" font-family="Arial, sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="1">INNOVATE • ASPIRE • ACHIEVE</text>
</svg>`
  },
  {
    id: 8,
    slug: 'saulridge-secondary',
    name: 'Saulridge Secondary School',
    motto: 'Knowledge is Power',
    primary: '#1e3a8a',
    secondary: '#f59e0b',
    accent: '#3b82f6',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="sr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="sr-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="sr-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#08132b" stroke="url(#sr-gold)" stroke-width="6" filter="url(#sr-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="url(#sr-gold)" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#sr-grad)" stroke="url(#sr-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#040b1a" opacity="0.45"/>

  <!-- Fortress of Saulridge Ridge & Lightning Bolt of Power -->
  <path d="M175 140 H225 V185 H175 Z" fill="url(#sr-gold)"/>
  <rect x="170" y="130" width="12" height="15" fill="url(#sr-gold)"/>
  <rect x="194" y="130" width="12" height="15" fill="url(#sr-gold)"/>
  <rect x="218" y="130" width="12" height="15" fill="url(#sr-gold)"/>
  <!-- Lightning Bolt -->
  <polygon points="208,135 190,165 204,165 192,195 215,160 200,160" fill="#ffffff"/>

  <!-- Open Book at Base -->
  <path d="M160 240 Q200 230 200 245 Q200 230 240 240 V270 Q200 260 200 275 Q200 260 160 270 Z" fill="#ffffff" stroke="url(#sr-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="sr-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="17" font-weight="900" letter-spacing="1.5">
    <textPath href="#sr-arc" startOffset="50%" text-anchor="middle">SAULRIDGE SECONDARY</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M110 340 L140 325 L200 345 L260 325 L290 340 L275 365 L200 352 L125 365 Z" fill="#040b1a" stroke="url(#sr-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#sr-gold)" font-family="Arial, sans-serif" font-size="11.5" font-weight="800" text-anchor="middle" letter-spacing="1">KNOWLEDGE IS POWER</text>
</svg>`
  },
  {
    id: 9,
    slug: 'phelindaba-secondary',
    name: 'Phelindaba Secondary School',
    motto: 'Strive for Success',
    primary: '#14532d',
    secondary: '#eab308',
    accent: '#10b981',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="ph-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14532d" />
      <stop offset="100%" stop-color="#16a34a" />
    </linearGradient>
    <linearGradient id="ph-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
    <filter id="ph-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#082313" stroke="url(#ph-gold)" stroke-width="6" filter="url(#ph-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#ph-grad)" stroke="url(#ph-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#04120a" opacity="0.45"/>

  <!-- Golden Sunrise Over Green Hills (Atteridgeville) -->
  <path d="M150 195 Q200 160 250 195 Z" fill="url(#ph-gold)"/>
  <circle cx="200" cy="155" r="18" fill="url(#ph-gold)"/>
  
  <!-- Laurel / Unity Leaves of Phelindaba -->
  <path d="M165 210 Q200 230 235 210" fill="none" stroke="url(#ph-gold)" stroke-width="3" stroke-linecap="round"/>

  <!-- Open Book at Base -->
  <path d="M160 240 Q200 230 200 245 Q200 230 240 240 V270 Q200 260 200 275 Q200 260 160 270 Z" fill="#ffffff" stroke="url(#ph-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="ph-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="16.5" font-weight="900" letter-spacing="1">
    <textPath href="#ph-arc" startOffset="50%" text-anchor="middle">PHELINDABA SECONDARY</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M110 340 L140 325 L200 345 L260 325 L290 340 L275 365 L200 352 L125 365 Z" fill="#04120a" stroke="url(#ph-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#ph-gold)" font-family="Arial, sans-serif" font-size="11.5" font-weight="800" text-anchor="middle" letter-spacing="1">STRIVE FOR SUCCESS</text>
</svg>`
  },
  {
    id: 10,
    slug: 'flavius-mareka',
    name: 'Flavius Mareka Secondary School',
    motto: 'Excellence in Action',
    primary: '#1d4ed8',
    secondary: '#38bdf8',
    accent: '#fbbf24',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="fm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1d4ed8" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="fm-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <filter id="fm-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#081735" stroke="url(#fm-gold)" stroke-width="6" filter="url(#fm-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="url(#fm-grad)" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#fm-grad)" stroke="url(#fm-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#040b1c" opacity="0.45"/>

  <!-- Classical Pillars of Learning & Action -->
  <rect x="160" y="145" width="14" height="60" fill="url(#fm-gold)"/>
  <rect x="193" y="135" width="14" height="70" fill="url(#fm-gold)"/>
  <rect x="226" y="145" width="14" height="60" fill="url(#fm-gold)"/>
  <!-- Pediment on Top of Pillars -->
  <polygon points="200,115 245,135 155,135" fill="#ffffff" stroke="url(#fm-gold)" stroke-width="2"/>

  <!-- Flaming Beacon of Truth -->
  <circle cx="200" cy="120" r="6" fill="#f59e0b"/>

  <!-- Open Book at Base -->
  <path d="M160 245 Q200 235 200 250 Q200 235 240 245 V275 Q200 265 200 280 Q200 265 160 275 Z" fill="#ffffff" stroke="url(#fm-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="fm-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="900" letter-spacing="1">
    <textPath href="#fm-arc" startOffset="50%" text-anchor="middle">FLAVIUS MAREKA SEC</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M110 340 L140 325 L200 345 L260 325 L290 340 L275 365 L200 352 L125 365 Z" fill="#040b1c" stroke="url(#fm-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#fm-gold)" font-family="Arial, sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="1">EXCELLENCE IN ACTION</text>
</svg>`
  },
  {
    id: 11,
    slug: 'wf-nkomo-secondary',
    name: 'Dr. W.F. Nkomo Secondary School',
    motto: 'Labor Omnia Vincit (Work Conquers All)',
    primary: '#881337',
    secondary: '#f43f5e',
    accent: '#fbbf24',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="wfn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#881337" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>
    <linearGradient id="wfn-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <filter id="wfn-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#20040e" stroke="url(#wfn-gold)" stroke-width="6" filter="url(#wfn-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="url(#wfn-grad)" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#wfn-grad)" stroke="url(#wfn-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#120207" opacity="0.45"/>

  <!-- Medical Caduceus & Scholarly Torch (In Honor of Dr. William Frederick Nkomo) -->
  <line x1="200" y1="125" x2="200" y2="230" stroke="url(#wfn-gold)" stroke-width="4" stroke-linecap="round"/>
  <path d="M180 150 Q200 135 220 150 Q200 165 180 180 Q200 195 220 210" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  
  <!-- Dr. W.F. Nkomo Torch Flame -->
  <circle cx="200" cy="120" r="8" fill="url(#wfn-gold)"/>

  <!-- Open Book of Knowledge -->
  <path d="M160 245 Q200 235 200 250 Q200 235 240 245 V275 Q200 265 200 280 Q200 265 160 275 Z" fill="#ffffff" stroke="url(#wfn-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="wfn-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="900" letter-spacing="1">
    <textPath href="#wfn-arc" startOffset="50%" text-anchor="middle">DR. W.F. NKOMO SEC</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M105 340 L135 325 L200 345 L265 325 L295 340 L280 365 L200 352 L120 365 Z" fill="#120207" stroke="url(#wfn-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#wfn-gold)" font-family="Arial, sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="1">LABOR OMNIA VINCIT</text>
</svg>`
  },
  {
    id: 12,
    slug: 'hofmeyr-secondary',
    name: 'Hofmeyr Secondary School',
    motto: 'Education for Liberation',
    primary: '#581c87',
    secondary: '#14b8a6',
    accent: '#f59e0b',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="hf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#581c87" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>
    <linearGradient id="hf-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="hf-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Outer Gold Rim -->
  <circle cx="200" cy="200" r="190" fill="#150624" stroke="url(#hf-gold)" stroke-width="6" filter="url(#hf-shadow)"/>
  <circle cx="200" cy="200" r="176" fill="none" stroke="#14b8a6" stroke-width="3" stroke-dasharray="6,4"/>

  <!-- Central Shield -->
  <path d="M200 65 L285 105 V220 C285 285 200 325 200 325 C200 325 115 285 115 220 V105 Z" fill="url(#hf-grad)" stroke="url(#hf-gold)" stroke-width="4"/>
  <path d="M200 80 L270 115 V215 C270 268 200 305 200 305 C200 305 130 268 130 215 V115 Z" fill="#0d0317" opacity="0.45"/>

  <!-- Unbroken Chain to Open Wings of Liberation -->
  <path d="M165 160 Q200 130 235 160" fill="none" stroke="url(#hf-gold)" stroke-width="3.5"/>
  <circle cx="170" cy="160" r="5" fill="#14b8a6"/>
  <circle cx="230" cy="160" r="5" fill="#14b8a6"/>
  
  <!-- Torch of Liberation -->
  <polygon points="196,170 204,170 201,210 199,210" fill="url(#hf-gold)"/>
  <path d="M192 168 Q200 145 200 140 Q208 145 208 168 Z" fill="#ef4444"/>

  <!-- Open Book at Base -->
  <path d="M160 245 Q200 235 200 250 Q200 235 240 245 V275 Q200 265 200 280 Q200 265 160 275 Z" fill="#ffffff" stroke="url(#hf-gold)" stroke-width="2"/>

  <!-- Arc Text -->
  <path id="hf-arc" d="M 55 200 A 145 145 0 0 1 345 200" fill="none"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="16.5" font-weight="900" letter-spacing="1">
    <textPath href="#hf-arc" startOffset="50%" text-anchor="middle">HOFMEYR SECONDARY</textPath>
  </text>

  <!-- Motto Ribbon -->
  <path d="M105 340 L135 325 L200 345 L265 325 L295 340 L280 365 L200 352 L120 365 Z" fill="#0d0317" stroke="url(#hf-gold)" stroke-width="2.5"/>
  <text x="200" y="353" fill="url(#hf-gold)" font-family="Arial, sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="1">EDUCATION FOR LIBERATION</text>
</svg>`
  }
];

async function generateAndSeedLogos() {
  console.log('[LOGOS] Generating 12 school badge logo assets...');
  
  for (const school of SCHOOL_LOGOS) {
    const filename = `${school.slug}.svg`;
    const filePath = path.join(schoolsDir, filename);
    fs.writeFileSync(filePath, school.svg.trim(), 'utf8');
    console.log(`  ✓ Written ${filePath}`);
  }

  console.log('[LOGOS] Updating PostgreSQL database with motto, logo_url, and badge_url...');
  for (const school of SCHOOL_LOGOS) {
    const logoUrl = `/assets/schools/${school.slug}.svg`;
    const badgeUrl = `/assets/schools/${school.slug}.svg`;

    await pool.query(
      `UPDATE schools 
       SET logo_url = $1, badge_url = $2, motto = $3 
       WHERE id = $4 OR slug = $5`,
      [logoUrl, badgeUrl, school.motto, school.id, school.slug]
    );
    console.log(`  ✓ Updated DB for School ID ${school.id} (${school.name}) -> Motto: "${school.motto}", Logo: ${logoUrl}`);
  }

  // Verify rows
  const result = await pool.query('SELECT id, name, slug, motto, logo_url FROM schools ORDER BY id');
  console.log('\n[LOGOS] Final Database State:');
  console.table(result.rows);

  await pool.end();
  console.log('\n[LOGOS] Complete!');
}

generateAndSeedLogos().catch(err => {
  console.error('[LOGOS ERROR]:', err);
  process.exit(1);
});
