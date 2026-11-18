import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { AboutUsModal } from '../../components/landing/AboutUsModal';
import { TermsAgreementModal } from '../../components/common/TermsAgreementModal';
import { FusionAppIcon } from '../../components/common/FusionAppIcon';
import { GelezaSplashWaves } from '../../components/landing/GelezaSplashWaves';
import { GetStartedCircularMenu } from '../../components/landing/GetStartedCircularMenu';
import {
  Sun,
  Moon,
  HelpCircle,
  Lock,
  ShieldAlert,
  LogIn
} from 'lucide-react';
import { HelpSupportModal } from '../../components/common/HelpSupportModal';
import { SchoolRegistrationModal } from '../../components/landing/SchoolRegistrationModal';
import { systemControlService } from '../../services/api';
import { intakeClosed, intakeReason } from '../../utils/admissionGate';
import { readSky } from '../../utils/solarClock';
import { CAMPUS_WEATHER_FALLBACK, cachedForecast, projectWeather, startCampusForecast, type CampusWeather, type ForecastPayload } from '../../utils/campusWeather';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentSchool, schoolsList, setSchoolById } = useSchool();

  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);
  const [isFaqOpen, setIsFaqOpen] = useState<boolean>(false);
  const [isSchoolRegisterOpen, setIsSchoolRegisterOpen] = useState<boolean>(false);

  // Executive Portal Control Lock State
  const [schoolRegLock, setSchoolRegLock] = useState<{ is_locked?: boolean; effectively_closed?: boolean; locked_reason?: string; public_reason?: string } | null>(null);
  const [showLockedModal, setShowLockedModal] = useState<boolean>(false);

  const [sky, setSky] = useState(() => readSky());
  const forecastRef = useRef<ForecastPayload | null>(cachedForecast());
  const [weather, setWeather] = useState<CampusWeather>(() => {
    const cached = forecastRef.current;
    return cached ? projectWeather(cached) : CAMPUS_WEATHER_FALLBACK;
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setSky(readSky(now));
      if (forecastRef.current) setWeather(projectWeather(forecastRef.current, now));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  useEffect(() => {
    systemControlService.getPortalLocks().then(res => {
      if (res.success && res.controls?.school_registration) {
        setSchoolRegLock(res.controls.school_registration);
      }
    }).catch(() => {});
  }, []);

  const schoolIntakeClosed = intakeClosed(schoolRegLock);

  return (
    <div
      className="min-h-screen text-slate-900 dark:text-white flex flex-col justify-between selection:bg-amber-600 selection:text-white relative overflow-hidden transition-colors duration-300 bg-[#f6f1e6] dark:bg-[#07080d]"
    >
      <GelezaSplashWaves weather={weather} />

      {/* Modals */}
      <AboutUsModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <TermsAgreementModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} isMandatoryGate={false} />
      <HelpSupportModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} defaultTab="faq" />
      <SchoolRegistrationModal isOpen={isSchoolRegisterOpen} onClose={() => setIsSchoolRegisterOpen(false)} />

      {/* Geleza SA Executive Lock Advisory Modal */}
      {showLockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                Executive Gatekeeper Active
              </span>
              <h3 className="text-lg font-black text-white font-display">
                Institutional Registration Locked
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {intakeReason(schoolRegLock, 'School registration is currently closed.')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
              <p className="font-bold text-slate-200">How to proceed:</p>
              <p>• Institutional school registration is opened during scheduled accreditation windows.</p>
              <p>• If your school received an onboarding invitation, contact Geleza SA Executive Support.</p>
              <p>• Registered schools and users can access their portal uninterrupted.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLockedModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <Link
                to="/login"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Go to Login</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Global Header (Adapts smoothly to light & dark mode) */}
      <header className="relative z-30 px-4 md:px-8 py-3.5 bg-transparent transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl p-1 border border-[#c6a15b]/40 bg-[#f6f1e6] dark:bg-[#14110c] flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
              <FusionAppIcon className="w-8 h-8 md:w-9 md:h-9" />
            </div>
            <div>
              <span className="font-display text-base md:text-lg font-black tracking-tight text-white text-always-white block leading-tight uppercase group-hover:text-[#e7c56a] transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                GELEZA SA
              </span>
            </div>
          </Link>

          {/* Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 transition-all border border-slate-200 dark:border-white/15 backdrop-blur-md shadow-xs cursor-pointer"
              title="Switch Theme"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex flex-col justify-center items-center px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full text-center">
        <div className="space-y-8 w-full flex flex-col items-center">
          <div className="space-y-3">
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-medium tracking-tight text-white text-always-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]">
              Geleza SA
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.35em] text-[#e7c56a] drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
              Geleza Smart, The Future Is Thine
            </p>
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase tabular-nums text-[#f6e6b4] text-always-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
              {sky.clock} · {sky.label}
            </p>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#f6e6b4] text-always-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
              {weather.temperature == null
                ? 'Reading the sky'
                : `${weather.label} · ${weather.temperature}°C · ${weather.place}${weather.upcoming ? ` · ${weather.upcoming}` : ''}`}
            </p>
          </div>
          <GetStartedCircularMenu
            onRegisterSchool={() => {
              if (schoolIntakeClosed) setShowLockedModal(true);
              else setIsSchoolRegisterOpen(true);
            }}
          />
        </div>
      </main>

      {/* Clean Minimal 1-Line Footer (Adapts cleanly to light and dark modes) */}
      <footer className="py-4 px-4 bg-transparent text-xs text-white/80 text-always-white w-full relative z-20 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left text-white/80 text-always-white font-medium">
            &copy; {new Date().getFullYear()} Geleza SA Academic Network.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-semibold">
            <button onClick={() => setIsAboutOpen(true)} className="hover:text-[#e7c56a] transition-colors text-white/80 text-always-white cursor-pointer">
              About Us
            </button>
            <span className="text-white/35">•</span>
            <button onClick={() => setIsTermsOpen(true)} className="hover:text-[#e7c56a] transition-colors text-white/80 text-always-white cursor-pointer">
              Terms & Conditions
            </button>
            <span className="text-white/35">•</span>
            <button
              onClick={() => setIsFaqOpen(true)}
              className="hover:text-[#e7c56a] transition-colors text-white/80 text-always-white flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#e7c56a]" />
              <span>View FAQs</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

