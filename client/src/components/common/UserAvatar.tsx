import React, { useEffect, useState } from 'react';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import {
  type AvatarIdentity,
  formatUserDisplayName,
  getAvatarToneClass,
  getUserInitials,
  resolveRawAvatarPath,
} from '../../utils/userAvatarModel';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface UserAvatarProps {
  user: AvatarIdentity | null | undefined;
  size?: UserAvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-10 h-10 text-xs',
  lg: 'w-12 h-12 text-sm',
};

/**
 * Identity-isolated circular user avatar bound strictly to the supplied user record.
 * Renders the user's real profile photo if present, or clean high-contrast initials
 * derived exclusively from that user's own name.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'sm',
  className = '',
}) => {
  const rawPath = resolveRawAvatarPath(user);
  const resolvedUrl = rawPath ? getProfilePictureUrl(rawPath) : '';
  const identityKey = `${user?.user_id ?? user?.id ?? ''}:${resolvedUrl}`;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [identityKey]);

  const displayName = formatUserDisplayName(user);
  const initials = getUserInitials(user);
  const toneClass = getAvatarToneClass(user);

  return (
    <div
      data-theme-preserve="true"
      aria-label={displayName}
      title={displayName}
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold tracking-tight text-white text-always-white border border-slate-200/80 dark:border-white/15 shadow-xs select-none ${toneClass} ${SIZE_CLASSES[size]} ${className}`}
    >
      <span className="text-white text-always-white leading-none">{initials}</span>
      {resolvedUrl && !imageFailed && (
        <img
          key={identityKey}
          src={resolvedUrl}
          alt={displayName}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
};
