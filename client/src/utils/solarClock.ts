/** Solar position for the Geleza campus sky, using the device clock. */

const LATITUDE = -26.2041;
const LONGITUDE = 28.0473;

export type SkyMoment = {
  altitude: number;
  x: number;
  y: number;
  daylight: number;
  lights: number;
  label: 'Morning' | 'Day' | 'Afternoon' | 'Evening' | 'Night';
  clock: string;
  skyTop: string;
  skyBottom: string;
  sun: string;
};

/** Building lights are on from 16:30 until 08:30 the next day. */
export function campusLights(date = new Date()): number {
  const minutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const offAt = 8 * 60 + 30;
  const onAt = 16 * 60 + 30;
  const fade = 2;
  if (minutes >= offAt - fade && minutes < offAt) return 1 - (minutes - (offAt - fade)) / fade;
  if (minutes >= onAt - fade && minutes < onAt) return (minutes - (onAt - fade)) / fade;
  if (minutes >= offAt && minutes < onAt) return 0;
  return 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mix(from: [number, number, number], to: [number, number, number], amount: number): string {
  const t = clamp(amount, 0, 1);
  const channel = (index: 0 | 1 | 2) => Math.round(from[index] + (to[index] - from[index]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

export function readSky(date = new Date()): SkyMoment {
  const n = dayOfYear(date);
  const lat = (LATITUDE * Math.PI) / 180;
  const decl = ((23.44 * Math.PI) / 180) * Math.sin(((2 * Math.PI) / 365) * (n - 81));
  const b = ((2 * Math.PI) / 365) * (n - 81);
  const equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const timezoneMeridian = (-date.getTimezoneOffset() / 60) * 15;
  const correction = 4 * (LONGITUDE - timezoneMeridian) + equationOfTime;
  const localMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const solarMinutes = localMinutes + correction;
  const hourAngle = (((solarMinutes / 60) - 12) * 15 * Math.PI) / 180;

  const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  const altitude = Math.asin(clamp(sinAlt, -1, 1)) * (180 / Math.PI);
  const daylight = clamp((altitude + 6) / 32, 0, 1);
  const solarHour = solarMinutes / 60;
  const warmth = clamp(1 - altitude / 36, 0, 1);

  let label: SkyMoment['label'] = 'Night';
  if (altitude < -4) label = 'Night';
  else if (solarHour < 11) label = 'Morning';
  else if (solarHour < 15) label = 'Day';
  else if (solarHour < 17.5) label = 'Afternoon';
  else label = 'Evening';

  const night: [number, number, number] = [7, 10, 22];
  const dawn: [number, number, number] = [244, 164, 116];
  const noon: [number, number, number] = [110, 186, 232];
  const gold: [number, number, number] = [242, 176, 92];
  const dusk: [number, number, number] = [88, 62, 120];
  const groundNight: [number, number, number] = [8, 10, 16];
  const groundDay: [number, number, number] = [214, 228, 236];

  const rising = hourAngle < 0;
  const dayColor = rising ? mix(noon, dawn, warmth) : mix(noon, gold, warmth * 0.9);
  const skyTop = altitude < 0
    ? mix(night, rising ? dawn : dusk, clamp((altitude + 12) / 12, 0, 1))
    : dayColor;
  const skyBottom = mix(groundNight, groundDay, daylight);

  const clock = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const risen = clamp(altitude, 0, 75) / 75;

  return {
    altitude,
    x: 50 + Math.sin(hourAngle) * 22,
    y: altitude <= 0 ? 6 : 12.5 - risen * 5.5,
    daylight,
    lights: campusLights(date),
    label,
    clock,
    skyTop,
    skyBottom,
    sun: altitude > 25 ? '#fff4c8' : '#ffd27a',
  };
}
