import React, { useEffect, useState } from 'react';
import { Fingerprint, CheckCircle2, AlertCircle } from 'lucide-react';
import { startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';
import { authService } from '../../services/api';

type DeviceRow = { id: string; label: string; createdAt?: string };

export const FingerprintSignInCard: React.FC = () => {
  const [supported, setSupported] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    const status = await authService.fingerprintStatus();
    setDevices(Array.isArray(status?.devices) ? status.devices : []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const webauthn = browserSupportsWebAuthn();
      const platform = webauthn ? await platformAuthenticatorIsAvailable().catch(() => false) : false;
      if (cancelled) return;
      setSupported(webauthn);
      setScannerReady(platform);
      try {
        await loadStatus();
      } catch {
        if (!cancelled) setError('Fingerprint status could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    setConfirmOff(false);
    try {
      const started = await authService.fingerprintRegisterOptions();
      const credential = await startRegistration({ optionsJSON: started.options });
      await authService.fingerprintRegisterVerify({
        challengeId: started.challengeId,
        response: credential,
      });
      await loadStatus();
      setMessage('Fingerprint sign-in is on for this device. The next visit can use it instead of the password.');
    } catch (err: any) {
      const cancelled = err?.name === 'NotAllowedError' || err?.code === 'ERROR_CEREMONY_ABORTED';
      setError(
        cancelled
          ? 'Fingerprint setup was cancelled. Email and password still work.'
          : err?.response?.data?.error || 'The fingerprint scanner could not be turned on. Enable it in this device’s settings, then try again here.'
      );
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await authService.fingerprintDisable();
      setDevices([]);
      setConfirmOff(false);
      setMessage('Fingerprint sign-in is off. Email and password remain the way in.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Fingerprint sign-in could not be turned off.');
    } finally {
      setBusy(false);
    }
  };

  const enabled = devices.length > 0;

  return (
    <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-sm space-y-4 lg:col-span-2">
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Fingerprint className="w-5 h-5 text-cyan-300" />
          <h3 className="text-sm font-bold font-display text-white">Fingerprint sign-in</h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            enabled
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {loading ? 'Checking' : enabled ? 'On' : 'Off'}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-slate-300">
        Turn this on once, on the phone or computer you use. After the fingerprint matches, Geleza SA opens the right portal for that account. Email and password stay available.
        The fingerprint itself stays on the device.
      </p>

      {!supported && (
        <p className="text-xs text-amber-200">This browser cannot use a fingerprint scanner.</p>
      )}
      {supported && !scannerReady && (
        <p className="text-xs text-amber-200">
          Turn on the fingerprint scanner in this device’s own settings first. Then enable it here.
        </p>
      )}

      {enabled && (
        <ul className="space-y-1.5">
          {devices.map((device) => (
            <li key={device.id} className="text-xs text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{device.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={enable}
          disabled={!supported || !scannerReady || busy || loading}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 disabled:opacity-40 cursor-pointer"
        >
          {busy ? 'Waiting for the scanner…' : enabled ? 'Add this device' : 'Enable fingerprint scanner'}
        </button>
        {enabled && !confirmOff && (
          <button
            type="button"
            onClick={() => setConfirmOff(true)}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-white/15 text-slate-200 cursor-pointer"
          >
            Turn off
          </button>
        )}
        {confirmOff && (
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white cursor-pointer"
          >
            Confirm turn off
          </button>
        )}
      </div>

      {message && (
        <p className="text-xs text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{message}</span>
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
