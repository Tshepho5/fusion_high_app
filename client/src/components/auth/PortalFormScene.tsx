import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { FusionAppIcon } from '../common/FusionAppIcon';
import { GelezaSplashWaves } from '../landing/GelezaSplashWaves';
import { useTheme } from '../../context/ThemeContext';
import { CAMPUS_WEATHER_FALLBACK, cachedForecast, projectWeather, startCampusForecast, type CampusWeather, type ForecastPayload } from '../../utils/campusWeather';

export const PortalFormScene: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const forecastRef = useRef<ForecastPayload | null>(cachedForecast());
  const [weather, setWeather] = useState<CampusWeather>(() => {
    const cached = forecastRef.current;
    return cached ? projectWeather(cached) : CAMPUS_WEATHER_FALLBACK;
  });

  useEffect(() => {
    const apply = (payload: ForecastPayload) => {
      forecastRef.current = payload;
      setWeather(projectWeather(payload));
    };
    let stop = startCampusForecast(apply);
    const timer = window.setInterval(() => {
      stop();
      stop = startCampusForecast(apply);
    }, 10 * 60 * 1000);
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="portal-scene min-h-screen relative flex flex-col overflow-x-hidden font-sans bg-[#f6f1e6] dark:bg-[#07080d]">
      <GelezaSplashWaves weather={weather} />
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-8 md:px-12 pt-5 pb-3 max-w-7xl mx-auto w-full">
        <Link
          to="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 border ${
            isLight
              ? 'bg-white/80 hover:bg-white text-slate-900 border-white/70 shadow-black/10'
              : 'bg-black/40 hover:bg-black/60 text-white border-white/25 shadow-black/30'
          }`}
        >
          <ArrowLeft className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-cyan-300'}`} />
          <span>Back to Home</span>
        </Link>
        <div
          className={`hidden sm:flex items-center gap-2.5 px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg border ${
            isLight
              ? 'bg-white/80 border-white/70 text-slate-900'
              : 'bg-black/40 border-white/25 text-white'
          }`}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden bg-blue-500/15 p-0.5 flex items-center justify-center">
            <FusionAppIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-extrabold tracking-wider uppercase">GELEZA SA</span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer border ${
            isLight
              ? 'bg-white/80 hover:bg-white text-slate-900 border-white/70 shadow-black/10'
              : 'bg-black/40 hover:bg-black/60 text-white border-white/25 shadow-black/30'
          }`}
          title="Toggle Theme"
        >
          {isLight ? (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-300" />
              <span>Light Mode</span>
            </>
          )}
        </button>
      </header>
      <main className="relative z-20 flex-1 w-full">{children}</main>
    </div>
  );
};
