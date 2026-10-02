import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export const WhatsAppContactCard: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const businessLink = 'https://wa.me/27766064212';

  useEffect(() => {
    api.get('/api/whatsapp/me').then((res) => {
      if (res.data?.phone) {
        setSavedPhone(res.data.phone);
        setVerified(Boolean(res.data.verified));
        setPhone(res.data.phone);
      }
    }).catch(() => {});
  }, []);

  const linkNumber = async () => {
    setError('');
    setMessage('');
    try {
      const res = await api.post('/api/whatsapp/link', { phone });
      setWaiting(true);
      setMessage(res.data?.message || 'Check WhatsApp for the code.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The number could not be linked.');
    }
  };

  const confirmCode = async () => {
    setError('');
    setMessage('');
    try {
      const res = await api.post('/api/whatsapp/confirm', { code });
      setVerified(true);
      setSavedPhone(res.data?.phone || phone);
      setWaiting(false);
      setMessage(res.data?.message || 'WhatsApp is ready for notices.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'That code was not accepted.');
    }
  };

  return (
    <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-sm space-y-4 lg:col-span-2">
      <div>
        <h3 className="text-sm font-bold font-display text-white">WhatsApp notices</h3>
        <p className="text-xs text-slate-400 mt-1">
          Add the mobile number that is on WhatsApp. Geleza sends the same OTPs, application results, registration updates, and payment deadlines there and by email.
          The help line is <a className="text-cyan-300 underline" href={businessLink} target="_blank" rel="noreferrer">076 606 4212</a>.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="0766064212"
          inputMode="tel"
          className="flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
        />
        <button type="button" onClick={linkNumber} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950">
          Send code
        </button>
      </div>
      {waiting && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="6-digit code"
            inputMode="numeric"
            className="flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <button type="button" onClick={confirmCode} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950">
            Confirm number
          </button>
        </div>
      )}
      {savedPhone && verified && (
        <p className="text-xs text-emerald-300">Notices go to {savedPhone} and to your email.</p>
      )}
      {message && <p className="text-xs text-cyan-200">{message}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
};
