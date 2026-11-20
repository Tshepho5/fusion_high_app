export interface AvatarIdentity {
  id?: number | string | null;
  user_id?: number | string | null;
  full_name?: string | null;
  surname?: string | null;
  name?: string | null;
  email?: string | null;
  profile_picture?: string | null;
  profile_picture_path?: string | null;
}

export function formatUserDisplayName(user: AvatarIdentity | null | undefined): string {
  if (!user) return 'User';
  const first = String(user.full_name || user.name || '').trim();
  const last = String(user.surname || '').trim();
  if (first && last) {
    if (first.toLowerCase().endsWith(last.toLowerCase())) return first;
    return `${first} ${last}`.trim();
  }
  if (first) return first;
  if (last) return last;
  const emailLocal = String(user.email || '').split('@')[0]?.trim();
  return emailLocal || 'User';
}

export function getUserInitials(user: AvatarIdentity | null | undefined): string {
  const full = formatUserDisplayName(user);
  const parts = full
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return 'U';
}

export function resolveRawAvatarPath(user: AvatarIdentity | null | undefined): string {
  if (!user) return '';
  const pic = typeof user.profile_picture === 'string' ? user.profile_picture.trim() : '';
  if (pic) return pic;
  const path = typeof user.profile_picture_path === 'string' ? user.profile_picture_path.trim() : '';
  return path;
}

const AVATAR_TONES = [
  'bg-[#168BFF]',
  'bg-sky-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-blue-700',
] as const;

export function getAvatarToneClass(user: AvatarIdentity | null | undefined): string {
  const seed = String(user?.user_id ?? user?.id ?? formatUserDisplayName(user));
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
