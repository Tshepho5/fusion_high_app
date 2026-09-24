const fs = require('fs');
const path = require('path');

// Exact vector GSA App Icon matching user screenshot
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Background Outer Glow & Rim Gradient -->
    <linearGradient id="gsa-rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3E66" />
      <stop offset="50%" stop-color="#132640" />
      <stop offset="100%" stop-color="#1A385C" />
    </linearGradient>

    <!-- Electric Azure Blue Letters Gradient -->
    <linearGradient id="gsa-blue" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#42B2FF" />
      <stop offset="100%" stop-color="#2D9BFF" />
    </linearGradient>

    <!-- Center Wave Gradient -->
    <linearGradient id="wave-blue" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#4AC2FF" />
      <stop offset="50%" stop-color="#38A5FF" />
      <stop offset="100%" stop-color="#2995FF" />
    </linearGradient>

    <!-- Dark Obsidian Canvas -->
    <radialGradient id="bg-vignette" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#04070D" />
      <stop offset="85%" stop-color="#020306" />
      <stop offset="100%" stop-color="#010204" />
    </radialGradient>
  </defs>

  <!-- 1. Outer App Squircle Border (iOS/Android rounded profile) -->
  <rect x="16" y="16" width="480" height="480" rx="108" ry="108" fill="url(#bg-vignette)" stroke="url(#gsa-rim)" stroke-width="16" />

  <!-- 2. Inner Edge Accent Line -->
  <rect x="25" y="25" width="462" height="462" rx="99" ry="99" fill="none" stroke="#081422" stroke-width="2.5" />

  <!-- 3. Emblem Group: G - S (with Wave) - A in Electric Azure Blue -->
  <g fill="url(#gsa-blue)">

    <!-- ==================== LETTER "G" ==================== -->
    <path d="
      M 202,188
      C 186,166 163,154 134,154
      C 82,154 48,198 48,258
      C 48,318 82,362 134,362
      C 168,362 194,346 206,324
      L 206,244
      L 142,244
      L 142,274
      L 174,274
      L 174,312
      C 164,324 150,332 133,332
      C 102,332 82,304 82,258
      C 82,212 102,184 133,184
      C 152,184 168,192 178,206
      Z
    " />

    <!-- ==================== LETTER "S" (TOP HOOK) ==================== -->
    <path d="
      M 334,178
      C 320,162 299,153 273,153
      C 238,153 218,171 218,195
      C 218,214 231,227 257,235
      C 275,241 289,245 299,251
      C 285,251 271,248 259,242
      C 249,237 241,228 238,220
      L 212,220
      C 215,236 226,251 242,260
      C 256,268 273,272 291,272
      C 299,272 308,271 316,268
      C 319,252 321,237 321,222
      C 321,212 316,203 306,198
      C 291,190 274,186 257,181
      C 248,178 244,173 244,168
      C 244,162 253,156 268,156
      C 284,156 297,163 308,174
      Z
    " />

    <!-- ==================== THE WAVE FLOURISH IN THE "S" ==================== -->
    <path fill="url(#wave-blue)" d="
      M 208,266
      C 214,250 227,242 244,242
      C 260,242 274,250 288,258
      C 298,264 308,267 317,263
      C 324,259 328,251 329,239
      C 329,228 327,219 324,212
      C 328,219 330,229 330,241
      C 329,258 321,270 309,275
      C 297,280 284,277 272,269
      C 258,260 246,255 236,256
      C 225,257 217,263 211,272
      Z
    " />

    <!-- ==================== LETTER "S" (BOTTOM HOOK) ==================== -->
    <path d="
      M 242,308
      C 255,326 276,335 301,335
      C 322,335 336,327 344,316
      C 350,307 352,295 348,278
      C 338,284 326,288 312,289
      C 316,298 314,306 308,310
      C 302,314 294,316 284,316
      C 271,316 261,311 254,302
      C 248,295 245,286 244,276
      L 220,276
      C 221,288 228,299 242,308
      Z
    " />

    <!-- ==================== LETTER "A" ==================== -->
    <path d="
      M 390,154
      L 358,154
      L 316,360
      L 349,360
      L 364,302
      L 416,302
      L 431,360
      L 464,360
      Z
      M 371,274
      L 390,202
      L 409,274
      Z
    " />

  </g>
</svg>
`;

// Export to public and client locations
const paths = [
  path.join(__dirname, '..', 'public', 'assets', 'gsa-logo.svg'),
  path.join(__dirname, '..', 'public', 'assets', 'geleza-logo.svg'),
  path.join(__dirname, '..', 'public', 'favicon.svg'),
  path.join(__dirname, '..', 'client', 'public', 'assets', 'gsa-logo.svg'),
  path.join(__dirname, '..', 'client', 'public', 'assets', 'geleza-logo.svg'),
  path.join(__dirname, '..', 'client', 'public', 'favicon.svg')
];

for (const p of paths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, svgContent.trim(), 'utf8');
}

console.log('Successfully wrote GSA SVG vector file to all asset and favicon locations!');
