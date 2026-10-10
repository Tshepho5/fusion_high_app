import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import { DigitalStudentIDCard } from '../../components/learner/DigitalStudentIDCard';
import {
  User,
  Mail,
  Lock,
  KeyRound,
  CheckCircle,
  Shield,
  ShieldCheck,
  Camera,
  Phone,
  MapPin,
  Sparkles,
  QrCode,
  Eye,
  EyeOff,
  Calendar,
  IdCard,
  Users,
  Database
} from 'lucide-react';

const formatDob = (raw: string | undefined | null) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

type DetailRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 py-3.5 border-b border-white/5 last:border-b-0">
    <span className="w-9 h-9 rounded-xl bg-surface-darker border border-white/10 flex items-center justify-center shrink-0 text-slate-400">
      {icon}
    </span>
    <span className="flex-1 text-sm text-slate-400">{label}</span>
    <span className="text-sm font-semibold text-white text-right max-w-[55%] break-words">{value || '—'}</span>
  </div>
);

export const LearnerProfile: React.FC = () => {
  const { user, updateUser, role } = useAuth();
  const [profile, setProfile] = useState<any>(user || {});
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [nameFieldErrors, setNameFieldErrors] = useState<Record<string, string>>({});

  const setProfileName = (field: 'full_name' | 'surname', value: string) => {
    if (/\d/.test(value)) {
      setNameFieldErrors(prev => ({ ...prev, [field]: 'Numbers are not allowed in this field. Please use letters only.' }));
      setProfile((prev: any) => ({ ...prev, [field]: value.replace(/\d/g, '') }));
      return;
    }
    setNameFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  };
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    userService.getProfile()
      .then((res) => {
        const data = res.user || res;
        setProfile(data);
        const pic = data.profile_picture || data.profile_picture_path;
        if (pic && (!user?.profile_picture || user.profile_picture !== pic)) {
          updateUser({ ...user, profile_picture: pic, profile_picture_path: pic });
        }
      })
      .catch(() => {});
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'Picture must be smaller than 5MB.' });
      return;
    }

    setUploadingPhoto(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const res = await userService.uploadProfilePicture(formData);
      const newPath = res.profile_picture || res.profile_picture_path || res.user?.profile_picture || res.user?.profile_picture_path;
      setProfile((prev: any) => ({ ...prev, profile_picture: newPath, profile_picture_path: newPath }));
      updateUser({ ...user, profile_picture: newPath, profile_picture_path: newPath });
      setStatusMsg({ type: 'success', text: 'Profile picture updated permanently across all portals!' });
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Failed to upload photo.' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const isProfileUnlocked = Boolean(profile.profile_edit_unlocked || user?.profile_edit_unlocked || role === 'admin');

  const handleUpdatePersonalDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    const payload: any = {
      phone: profile.phone || '',
      physical_address: profile.physical_address || '',
    };

    if (isProfileUnlocked) {
      payload.full_name = profile.full_name || '';
      payload.surname = profile.surname || '';
    }

    try {
      await userService.updateProfile(payload);
      updateUser({ ...user, ...payload });
      setStatusMsg({
        type: 'success',
        text: isProfileUnlocked
          ? 'Profile details and official credentials saved successfully!'
          : 'Contact details and residential address saved successfully!'
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const curr = currentPassword.trim();
    const next = newPassword.trim();
    const conf = confirmPassword.trim();

    if (!curr || !next || !conf) {
      setStatusMsg({ type: 'error', text: 'All password fields are required.' });
      return;
    }

    if (next !== conf) {
      setStatusMsg({ type: 'error', text: 'New password and confirmation password do not match.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      await userService.changePassword({
        current_password: curr,
        new_password: next,
        confirm_password: conf,
        currentPassword: curr,
        newPassword: next,
        confirmPassword: conf
      });
      setStatusMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || err.message || 'Failed to change password.' });
    } finally {
      setLoading(false);
    }
  };

  const pfp = getProfilePictureUrl(profile.profile_picture_path || user?.profile_picture_path);
  const fullName = profile.full_name || profile.name || 'Learner';
  const surname = profile.surname || '';
  const displayName = `${fullName}${surname ? ` ${surname}` : ''}`.trim();
  const idNumber = profile.id_number || '—';
  const learnerNumber = profile.learner_number || profile.academic?.learner_number || '—';
  const grade = profile.grade || profile.academic?.grade || '—';
  const stream = profile.stream || profile.academic?.stream || 'General';
  const email = profile.email || '—';
  const phone = profile.phone || '—';
  const dob = formatDob(profile.dob || profile.date_of_birth);
  const gender = profile.gender || '—';
  const address = profile.physical_address || '—';
  const initial = fullName.charAt(0).toUpperCase();

  const classLine =
    role === 'learner'
      ? `Grade ${grade}${stream && stream !== '—' ? ` · ${stream}` : ''}`
      : role === 'teacher'
        ? 'Educator'
        : role === 'parent'
          ? 'Parent'
          : role === 'admin'
            ? 'Administrator'
            : (role || 'User').toString();

  return (
    <div className="space-y-6 max-w-lg mx-auto w-full animate-fade-in pb-8">
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Shield className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Avatar + name + class */}
      <div className="flex flex-col items-center text-center pt-2 space-y-3">
        <div className="relative group">
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-brand-600 to-cyan-500 border-2 border-brand-400/50 shadow-glow-cyan flex items-center justify-center text-white font-extrabold text-3xl overflow-hidden relative">
            <span className="select-none">{initial}</span>
            {pfp && (
              <img
                src={pfp}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute -bottom-1 -right-1 p-2.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white shadow-lg border-2 border-surface-dark transition-transform hover:scale-110"
            title="Upload Profile Picture"
          >
            {uploadingPhoto ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-bold font-display text-white tracking-tight">
            {displayName}
          </h3>
          <p className="text-sm text-slate-400">{classLine}</p>
        </div>
      </div>

      {/* Detail rows */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 px-4 shadow-xl">
        {role === 'learner' ? (
          <>
            <DetailRow icon={<IdCard className="w-4 h-4" />} label="Student ID" value={String(learnerNumber)} />
            <DetailRow icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={dob} />
            <DetailRow icon={<Users className="w-4 h-4" />} label="Gender" value={String(gender)} />
            <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={String(email)} />
            <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={String(phone)} />
            <DetailRow icon={<ShieldCheck className="w-4 h-4" />} label="National SA ID" value={String(idNumber)} />
            <DetailRow icon={<MapPin className="w-4 h-4" />} label="Address" value={String(address)} />
          </>
        ) : (
          <>
            <DetailRow icon={<User className="w-4 h-4" />} label="Name" value={displayName} />
            <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={String(email)} />
            <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={String(phone)} />
            <DetailRow icon={<MapPin className="w-4 h-4" />} label="Address" value={String(address)} />
            {idNumber && idNumber !== '—' && (
              <DetailRow icon={<ShieldCheck className="w-4 h-4" />} label="National SA ID" value={String(idNumber)} />
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsEditing((v) => !v)}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-sm shadow-glow-cyan transition-all active:scale-[0.99]"
      >
        {isEditing ? 'Close Edit Profile' : 'Edit Profile'}
      </button>

      {/* Edit panels — same fields & colours, shown on demand */}
      {isEditing && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-5">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${isProfileUnlocked ? 'text-emerald-400' : 'text-cyan-400'}`} />
                <h3 className="text-sm font-bold font-display text-white">
                  {role === 'teacher' ? 'Educator Credentials & Information' : role === 'parent' ? 'Parent Information & Contact' : role === 'admin' ? 'Administrator Account Details' : 'Learner Profile & Credentials'}
                </h3>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                isProfileUnlocked
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
              }`}>
                {isProfileUnlocked ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Profile Unlocked by Admin
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-amber-400" /> Profile Locked (Read-Only)
                  </>
                )}
              </span>
            </div>

            <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
              isProfileUnlocked
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-200/90'
            }`}>
              {isProfileUnlocked ? (
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 leading-relaxed text-[11px]">
                <p className={`font-bold ${isProfileUnlocked ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {isProfileUnlocked ? 'Admin Clearance Active: Profile Editing Enabled' : 'Official School Records Safeguarded'}
                </p>
                <p className="text-slate-300">
                  {isProfileUnlocked
                    ? 'Your School Administrator has granted permission to update your profile details. You can now edit your First Name, Surname, Phone, and Residential Address.'
                    : 'Legal identity records (Full Name, Surname, National SA ID, Student Number, Grade, and School Email) are locked by administration. To request legal changes, please contact your School Administrator.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdatePersonalDetails} className="space-y-4">
              <div className="space-y-3 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  {isProfileUnlocked ? <Sparkles className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-slate-500" />}
                  {isProfileUnlocked ? 'Personal Information (Editable)' : 'Verified School Credentials (Read-Only)'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <span>First Name</span>
                      <span className={`text-[9px] font-mono ${isProfileUnlocked ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                        {isProfileUnlocked ? 'EDITABLE' : 'LOCKED'}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profile.full_name !== undefined ? profile.full_name : fullName}
                        onChange={(e) => isProfileUnlocked && setProfileName('full_name', e.target.value)}
                        disabled={!isProfileUnlocked}
                        readOnly={!isProfileUnlocked}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all ${
                          isProfileUnlocked
                            ? 'bg-surface-darker border border-emerald-500/40 focus:ring-2 focus:ring-emerald-500'
                            : 'bg-surface-darker/60 border border-white/5 text-slate-300 cursor-not-allowed select-none opacity-80'
                        }`}
                      />
                      {!isProfileUnlocked && <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />}
                    </div>
                    {nameFieldErrors.full_name && (
                      <p className="mt-1 text-[11px] font-semibold text-rose-400">{nameFieldErrors.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <span>Surname</span>
                      <span className={`text-[9px] font-mono ${isProfileUnlocked ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                        {isProfileUnlocked ? 'EDITABLE' : 'LOCKED'}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profile.surname !== undefined ? profile.surname : surname}
                        onChange={(e) => isProfileUnlocked && setProfileName('surname', e.target.value)}
                        disabled={!isProfileUnlocked}
                        readOnly={!isProfileUnlocked}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all ${
                          isProfileUnlocked
                            ? 'bg-surface-darker border border-emerald-500/40 focus:ring-2 focus:ring-emerald-500'
                            : 'bg-surface-darker/60 border border-white/5 text-slate-300 cursor-not-allowed select-none opacity-80'
                        }`}
                      />
                      {!isProfileUnlocked && <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />}
                    </div>
                    {nameFieldErrors.surname && (
                      <p className="mt-1 text-[11px] font-semibold text-rose-400">{nameFieldErrors.surname}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <span>National SA ID</span>
                      <span className="text-[9px] text-cyan-400 font-mono">VERIFIED</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={idNumber}
                        disabled
                        readOnly
                        className="w-full rounded-xl bg-surface-darker/60 border border-white/5 px-3.5 py-2.5 text-xs text-slate-300 font-mono cursor-not-allowed select-none opacity-80"
                      />
                      <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />
                    </div>
                  </div>

                  {role === 'learner' && (
                    <>
                      <div>
                        <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          <span>Student Number</span>
                          <span className="text-[9px] text-cyan-400/80 font-mono">OFFICIAL</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={learnerNumber}
                            disabled
                            readOnly
                            className="w-full rounded-xl bg-surface-darker/60 border border-white/5 px-3.5 py-2.5 text-xs text-cyan-300 font-mono font-bold cursor-not-allowed select-none opacity-80"
                          />
                          <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          <span>Grade & Stream</span>
                          <span className="text-[9px] text-cyan-400/80 font-mono">CAPS</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={`Grade ${grade} (${stream})`}
                            disabled
                            readOnly
                            className="w-full rounded-xl bg-surface-darker/60 border border-white/5 px-3.5 py-2.5 text-xs text-slate-300 cursor-not-allowed select-none opacity-80"
                          />
                          <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <span>Registered Email</span>
                      <span className="text-[9px] text-amber-400/80 font-mono">LOCKED</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        disabled
                        readOnly
                        className="w-full rounded-xl bg-surface-darker/60 border border-white/5 px-3.5 py-2.5 text-xs text-slate-300 font-mono cursor-not-allowed select-none opacity-80"
                      />
                      <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Contact & Residential Information
                  </p>
                  <span className="text-[9px] text-slate-400 font-mono">Modify anytime</span>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Contact Phone Number</span>
                  </label>
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="e.g. 082 123 4567"
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Physical Residential Address</span>
                  </label>
                  <input
                    type="text"
                    value={profile.physical_address || ''}
                    onChange={(e) => setProfile({ ...profile, physical_address: e.target.value })}
                    placeholder="e.g. 123 School Lane, Polokwane, Limpopo"
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {loading ? 'Saving Profile Details...' : isProfileUnlocked ? 'Save Official Profile Changes' : 'Save Contact Details'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4">
            <div className="border-b border-white/10 pb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-display text-white">
                Security & Password
              </h3>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Maintain your account safety by regularly updating your password with a strong mix of letters and numbers.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full rounded-xl bg-surface-darker border border-white/10 pl-3.5 pr-11 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create new password (min 6 chars)"
                    required
                    className="w-full rounded-xl bg-surface-darker border border-white/10 pl-3.5 pr-11 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full rounded-xl bg-surface-darker border border-white/10 pl-3.5 pr-11 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-surface-darker border border-white/15 text-white hover:bg-white/10 font-bold text-xs transition-all disabled:opacity-50 active:scale-[0.99] mt-2"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>

            <div className="p-3 rounded-2xl bg-surface-darker/60 border border-white/5 text-[10px] text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Encrypted with SHA-256 JWT Authentication.</span>
            </div>
          </div>
        </div>
      )}

      {/* Learner academic ribbon + digital ID — kept, below the profile summary */}
      {role === 'learner' && (
        <>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Grade</span>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">Grade {grade}</p>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">{stream} Stream</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Learner Number</span>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{learnerNumber}</p>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">Verified Active</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Term Average</span>
              <p className={`text-xl font-extrabold ${profile.overall_average != null || profile.academic?.overall_average != null ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {profile.overall_average != null || profile.academic?.overall_average != null
                  ? `${profile.overall_average ?? profile.academic?.overall_average}%`
                  : '—'}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {profile.overall_average != null || profile.academic?.overall_average != null
                  ? 'From school marks'
                  : 'Awaiting school upload'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Attendance Rate</span>
              <p className={`text-xl font-extrabold ${profile.attendance_percentage != null ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                {profile.attendance_percentage != null ? `${profile.attendance_percentage}% Present` : '—'}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {profile.attendance_percentage != null ? 'School attendance record' : 'Awaiting school upload'}
              </span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-cyan-500/30 shadow-sm dark:shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white">
                    Official Digital Student Smart Card
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Present this card or its QR Code to educators during class roll-call or gate entry.
                  </p>
                </div>
              </div>
              <Badge variant="cyan" size="sm">Academic Year 2026</Badge>
            </div>

            <DigitalStudentIDCard learner={profile} />
          </div>
        </>
      )}
    </div>
  );
};
