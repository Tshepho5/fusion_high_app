/** Live campus weather from the visitor's location, with Johannesburg as the Geleza fallback. */

import api from '../services/api';

export type WeatherKind = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'storm' | 'fog' | 'snow';

export type CampusWeather = {
  ready: boolean;
  place: string;
  temperature: number | null;
  cloudCover: number;
  precipitation: number;
  code: number;
  label: string;
  kind: WeatherKind;
  upcoming: string;
};

export type ForecastPayload = {
  place: string;
  utcOffsetSeconds: number;
  hours: Array<{ time: string; code: number; cover: number; rain: number; temp: number }>;
  fetchedAt: number;
};

const CAMPUS = { latitude: -26.2041, longitude: 28.0473, place: 'Johannesburg' };
const STORAGE_KEY = 'geleza_campus_forecast';

export const CAMPUS_WEATHER_FALLBACK: CampusWeather = {
  ready: false,
  place: CAMPUS.place,
  temperature: null,
  cloudCover: 0.22,
  precipitation: 0,
  code: 1,
  label: 'Reading the sky',
  kind: 'clear',
  upcoming: '',
};

export function describeWeather(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: 'Clear', kind: 'clear' };
  if (code === 1) return { label: 'Mainly clear', kind: 'clear' };
  if (code === 2) return { label: 'Partly cloudy', kind: 'cloudy' };
  if (code === 3) return { label: 'Overcast', kind: 'overcast' };
  if (code === 45 || code === 48) return { label: 'Fog', kind: 'fog' };
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { label: code >= 80 ? 'Showers' : code >= 61 ? 'Rain' : 'Drizzle', kind: 'rain' };
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { label: 'Snow', kind: 'snow' };
  if (code >= 95) return { label: 'Thunderstorm', kind: 'storm' };
  return { label: 'Cloudy', kind: 'cloudy' };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function locationStamp(date: Date, utcOffsetSeconds: number) {
  const shifted = new Date(date.getTime() + utcOffsetSeconds * 1000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}`;
}

function clockLabel(time: string) {
  const hour = Number(time.slice(11, 13));
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12} ${suffix}`;
}

export function projectWeather(payload: ForecastPayload, date = new Date()): CampusWeather {
  const stamp = locationStamp(date, payload.utcOffsetSeconds);
  let index = payload.hours.findIndex((hour) => hour.time.startsWith(stamp));
  if (index < 0) index = 0;
  const current = payload.hours[index];
  const next = payload.hours[index + 1] || current;
  const shifted = new Date(date.getTime() + payload.utcOffsetSeconds * 1000);
  const blend = shifted.getUTCMinutes() / 60;
  const described = describeWeather(current?.code ?? 0);
  const cloudCover = ((current?.cover ?? 0) * (1 - blend) + (next?.cover ?? 0) * blend) / 100;
  const precipitation = (current?.rain ?? 0) * (1 - blend) + (next?.rain ?? 0) * blend;
  let upcoming = '';
  for (let step = index + 1; step < Math.min(payload.hours.length, index + 12); step += 1) {
    const later = describeWeather(payload.hours[step].code);
    if (later.kind !== described.kind) {
      upcoming = `${later.label} from ${clockLabel(payload.hours[step].time)}`;
      break;
    }
  }
  const temperature = current ? Math.round(current.temp * (1 - blend) + next.temp * blend) : null;
  return {
    ready: true,
    place: payload.place,
    temperature,
    cloudCover: Math.max(0, Math.min(1, cloudCover)),
    precipitation,
    code: current?.code ?? 0,
    label: described.label,
    kind: precipitation > 0.3 && described.kind === 'clear' ? 'rain' : described.kind,
    upcoming,
  };
}

function readCache(): ForecastPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ForecastPayload;
    if (!parsed?.hours?.length || Date.now() - parsed.fetchedAt > 30 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function fetchForecast(latitude: number, longitude: number): Promise<ForecastPayload> {
  const { data } = await api.get('/api/campus-weather', { params: { lat: latitude, lon: longitude } });
  const payload: ForecastPayload = {
    place: data.place || CAMPUS.place,
    utcOffsetSeconds: Number(data.utcOffsetSeconds) || 2 * 3600,
    fetchedAt: Date.now(),
    hours: Array.isArray(data.hours) ? data.hours : [],
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* The sky still updates if storage is full. */
  }
  return payload;
}

function locate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(CAMPUS);
      return;
    }
    const timer = window.setTimeout(() => resolve(CAMPUS), 4500);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timer);
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => {
        window.clearTimeout(timer);
        resolve(CAMPUS);
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

export function startCampusForecast(onUpdate: (payload: ForecastPayload) => void): () => void {
  let stopped = false;
  const publish = (payload: ForecastPayload) => {
    if (!stopped && payload.hours.length) onUpdate(payload);
  };

  fetchForecast(CAMPUS.latitude, CAMPUS.longitude).then(publish).catch(() => {});

  locate().then(async (spot) => {
    const moved = Math.abs(spot.latitude - CAMPUS.latitude) > 0.35 || Math.abs(spot.longitude - CAMPUS.longitude) > 0.35;
    if (!moved || stopped) return;
    publish(await fetchForecast(spot.latitude, spot.longitude));
  }).catch(() => {});

  return () => {
    stopped = true;
  };
}

export function cachedForecast(): ForecastPayload | null {
  return readCache();
}
