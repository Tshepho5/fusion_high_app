/** Daytime plate: the night photograph with window and path lights switched off. */

const CACHE_KEY = 'geleza_campus_lights_off';

function isLamp(r: number, g: number, b: number) {
  const warmth = r - b;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const windowGlow = lum > 132 && warmth > 24 && r > 148 && g > 96 && r > g - 10;
  const pathLight = lum > 168 && warmth > 36 && r > 176 && g > 130;
  return windowGlow || pathLight;
}

export function unlightCampus(src = '/assets/campus-night.jpg'): Promise<string> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return Promise.resolve(cached);
  } catch {
    /* Storage can be blocked. The plate is built in memory. */
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        reject(new Error('Campus canvas is unavailable'));
        return;
      }
      context.drawImage(image, 0, 0);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = frame.data;
      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        if (!isLamp(red, green, blue)) continue;
        const strength = red > 210 ? 0.9 : 0.78;
        pixels[index] = red * (1 - strength) + 58 * strength;
        pixels[index + 1] = green * (1 - strength) + 72 * strength;
        pixels[index + 2] = blue * (1 - strength) + 96 * strength;
      }
      context.putImageData(frame, 0, 0);
      const url = canvas.toDataURL('image/jpeg', 0.86);
      try {
        sessionStorage.setItem(CACHE_KEY, url);
      } catch {
        /* A large plate can exceed storage. The canvas result is still used. */
      }
      resolve(url);
    };
    image.onerror = () => reject(new Error('Campus photograph failed to load'));
    image.src = src;
  });
}
