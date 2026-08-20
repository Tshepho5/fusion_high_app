import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
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
  Upload,
  Phone,
  MapPin,
  Sparkles,
  QrCode,
  GraduationCap,
  Info,
  AlertCircle
} from 'lucide-react';

export const LearnerProfile: React.FC = () => {
  const { user, updateUser, role } = useAuth();
  const [profile, setProfile] = useState<any>(user || {});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    userService.getProfile()
      .then((res) => {
        const data = res.user || res;
        setProfile(data);
        if (data.profile_picture_path && (!user?.profile_picture_path || user.profile_picture_path !== data.profile_picture_path)) {
          updateUser({ ...user, profile_picture_path: data.profile_picture_path });
        }
      })
      .catch(() => {});
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
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
      const newPath = res.profile_picture_path || res.user?.profile_picture_path;
      setProfile((prev: any) => ({ ...prev, profile_picture_path: newPath }));
      updateUser({ ...user, profile_picture_path: newPath });
      setStatusMsg({ type: 'success', text: 'Profile picture updated across all portals!' });
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Failed to upload photo.' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateContactDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    // Safeguard: Only submit non-sensitive, editable contact fields
    const editablePayload = {
      phone: profile.phone || '',
      physical_address: profile.physical_address || '',
    };

    try {
      await userService.updateProfile(editablePayload);
      updateUser({ ...user, ...editablePayload });
      setStatusMsg({ type: 'success', text: 'Contact details and residential address saved successfully!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update contact details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      await userService.changePassword({ currentPassword, newPassword });
      setStatusMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' });
    } finally {
      setLoading(false);
    }
  };

  const pfp = getProfilePictureUrl(profile.profile_picture_path || user?.profile_picture_path);
  const fullName = profile.full_name || profile.name || 'Learner';
  const surname = profile.surname || '';
  const idNumber = profile.id_number || '0809245189087';
  const learnerNumber = profile.learner_number || profile.academic?.learner_number || '2026-001';
  const grade = profile.grade || profile.academic?.grade || '10';
  const stream = profile.stream || profile.academic?.stream || 'General';
  const email = profile.email || 'learner@fusionhigh.co.za';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fade-in">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-brand-400" />
          {role === 'teacher' ? 'Educator Profile & Settings' : role === 'parent' ? 'Parent Account & Settings' : role === 'admin' ? 'Administrator Settings' : 'Account & Profile Settings'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Review your official profile identification, security credentials, and contact information.
        </p>
      </div>

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

      {/* Profile Photo Header Card */}
      <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-brand-600 to-cyan-500 border-2 border-brand-400/50 shadow-glow-indigo flex items-center justify-center text-white font-extrabold text-3xl overflow-hidden">
            {pfp ? (
              <img src={pfp} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white shadow-lg border-2 border-surface-dark transition-transform hover:scale-110"
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

        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-lg font-bold font-display text-white">
              {fullName} {surname}
            </h3>
            <Badge variant="cyan" size="sm">
              {(role || 'user').toUpperCase()} PROFILE
            </Badge>
            {role === 'learner' && (
              <Badge variant="indigo" size="sm">
                Grade {grade}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono">{email}</p>
          <p className="text-[11px] text-slate-500 pt-1">
            Click the camera icon to upload a personal photo. It will appear across your identification, registers, and messages.
          </p>
        </div>
      </div>

      {/* Official Digital Student Smart Card Section - Restricted to Learner */}
      {role === 'learner' && (
        <div className="p-6 rounded-3xl bg-surface-dark border border-cyan-500/30 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display text-white">
                  Official Digital Student Smart Card
                </h3>
                <p className="text-[11px] text-slate-400">
                  Present this card or its QR Code to educators during class roll-call or gate entry.
                </p>
              </div>
            </div>
            <Badge variant="cyan" size="sm">Academic Year 2026</Badge>
          </div>

          <DigitalStudentIDCard learner={profile} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Personal Details & Contact Card */}
        <div className="lg:col-span-7 rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-5">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-display text-white">
                {role === 'teacher' ? 'Educator Credentials & Information' : role === 'parent' ? 'Parent Information & Contact' : role === 'admin' ? 'Administrator Account Details' : 'Learner Profile & Credentials'}
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Lock className="w-3 h-3" /> Credentials Locked
            </span>
          </div>

          {/* Security Notice Box */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed text-[11px]">
              <p className="font-bold text-amber-300">Official Student Records Safeguarded</p>
              <p className="text-slate-300">
                Legal identity records (Full Name, Surname, National SA ID, Student Number, Grade, and School Email) are locked to protect institutional and academic integrity. To request legal credential updates, please visit the Administration Office.
              </p>
            </div>
          </div>

          {/* Section: Locked Official Identity Credentials */}
          <div className="space-y-3 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-500" />
              Verified School Credentials (Read-Only)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                  <span>First Name</span>
                  <span className="text-[9px] text-amber-400/80 font-mono">LOCKED</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    disabled
                    readOnly
                    className="w-full rounded-xl bg-surface-darker/60 border border-white/5 px-3.5 py-2.5 text-xs text-slate-300 cursor-not-allowed select-none opacity-80"
                  />
                  <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                  <span>Surname</span>
                  <span className="text-[9px] text-amber-400/80 font-mono">LOCKED</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={surname}
                    disabled
                    readOnly
                    className="w-full rounded-xl bg-surface-darker/60 border border-white/5 px-3.5 py-2.5 text-xs text-slate-300 cursor-not-allowed select-none opacity-80"
                  />
                  <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                  <span>National SA ID</span>
                  <span className="text-[9px] text-amber-400/80 font-mono">VERIFIED</span>
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

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                  <span>Grade & Stream</span>
                  <span className="text-[9px] text-indigo-400/80 font-mono">CAPS</span>
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

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
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

          {/* Section: Editable Contact & Residential Details */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Editable Contact Information
              </p>
              <span className="text-[9px] text-slate-400 font-mono">You can modify these fields</span>
            </div>

            <form onSubmit={handleUpdateContactDetails} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
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
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs shadow-glow-indigo transition-all disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? 'Saving Contact Details...' : 'Save Contact Details'}
              </button>
            </form>
          </div>
        </div>

        {/* Password & Security Card */}
        <div className="lg:col-span-5 rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
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
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-surface-darker border border-white/15 text-white hover:bg-white/10 font-bold text-xs transition-all disabled:opacity-50 active:scale-[0.99] mt-2"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="p-3 rounded-2xl bg-surface-darker/60 border border-white/5 text-[10px] text-slate-400 flex items-center gap-2 mt-4">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted with SHA-256 JWT Authentication.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
