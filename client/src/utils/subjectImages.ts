/**
 * Subject imagery, classification, and styling utility for South African CAPS curriculum.
 * Provides curated high-resolution photography and color palettes for each subject.
 */

export interface SubjectMetadata {
  name: string;
  category: 'sciences' | 'languages' | 'commerce' | 'humanities' | 'services' | 'general';
  categoryLabel: string;
  imageUrl: string;
  accent: {
    gradient: string;
    badge: string;
    border: string;
    glow: string;
  };
}

const SUBJECT_IMAGE_MAP: Record<string, SubjectMetadata> = {
  // 1. Sciences & Mathematics
  'life sciences': {
    name: 'Life Sciences',
    category: 'sciences',
    categoryLabel: 'Natural Sciences',
    imageUrl: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-emerald-600/90 to-teal-900/90',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      border: 'hover:border-emerald-500/60',
      glow: 'shadow-emerald-900/20',
    },
  },
  'biology': {
    name: 'Biology',
    category: 'sciences',
    categoryLabel: 'Natural Sciences',
    imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-emerald-600/90 to-teal-900/90',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      border: 'hover:border-emerald-500/60',
      glow: 'shadow-emerald-900/20',
    },
  },
  'physical sciences': {
    name: 'Physical Sciences',
    category: 'sciences',
    categoryLabel: 'Physical & Chemical',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-cyan-600/90 to-blue-950/90',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      border: 'hover:border-cyan-500/60',
      glow: 'shadow-cyan-900/20',
    },
  },
  'physics': {
    name: 'Physics',
    category: 'sciences',
    categoryLabel: 'Physical Sciences',
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-blue-600/90 to-indigo-950/90',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      border: 'hover:border-blue-500/60',
      glow: 'shadow-blue-900/20',
    },
  },
  'chemistry': {
    name: 'Chemistry',
    category: 'sciences',
    categoryLabel: 'Chemical Sciences',
    imageUrl: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-teal-600/90 to-cyan-950/90',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      border: 'hover:border-teal-500/60',
      glow: 'shadow-teal-900/20',
    },
  },
  'mathematics': {
    name: 'Mathematics',
    category: 'sciences',
    categoryLabel: 'Mathematical Sciences',
    imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-indigo-600/90 to-purple-950/90',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      border: 'hover:border-indigo-500/60',
      glow: 'shadow-indigo-900/20',
    },
  },
  'technical mathematics': {
    name: 'Technical Mathematics',
    category: 'sciences',
    categoryLabel: 'Engineering Mathematics',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-violet-600/90 to-slate-950/90',
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      border: 'hover:border-violet-500/60',
      glow: 'shadow-violet-900/20',
    },
  },
  'mathematical literacy': {
    name: 'Mathematical Literacy',
    category: 'sciences',
    categoryLabel: 'Applied Mathematics',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-violet-600/90 to-purple-950/90',
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      border: 'hover:border-violet-500/60',
      glow: 'shadow-violet-900/20',
    },
  },
  'information technology': {
    name: 'Information Technology',
    category: 'sciences',
    categoryLabel: 'Computer Science',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-sky-600/90 to-blue-950/90',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      border: 'hover:border-sky-500/60',
      glow: 'shadow-sky-900/20',
    },
  },
  'computer applications technology': {
    name: 'Computer Applications Technology',
    category: 'sciences',
    categoryLabel: 'Digital Productivity',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-cyan-600/90 to-slate-950/90',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      border: 'hover:border-cyan-500/60',
      glow: 'shadow-cyan-900/20',
    },
  },
  'cat': {
    name: 'Computer Applications Technology',
    category: 'sciences',
    categoryLabel: 'Digital Productivity',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-cyan-600/90 to-slate-950/90',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      border: 'hover:border-cyan-500/60',
      glow: 'shadow-cyan-900/20',
    },
  },

  // 2. Commercial & Business Studies
  'accounting': {
    name: 'Accounting',
    category: 'commerce',
    categoryLabel: 'Financial Accounting',
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-emerald-700/90 to-slate-950/90',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      border: 'hover:border-emerald-500/60',
      glow: 'shadow-emerald-900/20',
    },
  },
  'business studies': {
    name: 'Business Studies',
    category: 'commerce',
    categoryLabel: 'Enterprise & Strategy',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-blue-700/90 to-slate-950/90',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      border: 'hover:border-blue-500/60',
      glow: 'shadow-blue-900/20',
    },
  },
  'economics': {
    name: 'Economics',
    category: 'commerce',
    categoryLabel: 'Macro & Micro Economics',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-teal-700/90 to-emerald-950/90',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      border: 'hover:border-teal-500/60',
      glow: 'shadow-teal-900/20',
    },
  },

  // 3. Languages
  'english': {
    name: 'English',
    category: 'languages',
    categoryLabel: 'Language & Literature',
    imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-rose-600/90 to-purple-950/90',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      border: 'hover:border-rose-500/60',
      glow: 'shadow-rose-900/20',
    },
  },
  'english home language': {
    name: 'English Home Language',
    category: 'languages',
    categoryLabel: 'Home Language',
    imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-rose-600/90 to-purple-950/90',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      border: 'hover:border-rose-500/60',
      glow: 'shadow-rose-900/20',
    },
  },
  'english first additional language': {
    name: 'English First Additional Language',
    category: 'languages',
    categoryLabel: 'First Additional Language',
    imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-pink-600/90 to-purple-950/90',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      border: 'hover:border-pink-500/60',
      glow: 'shadow-pink-900/20',
    },
  },
  'afrikaans': {
    name: 'Afrikaans',
    category: 'languages',
    categoryLabel: 'Taal en Letterkunde',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-indigo-600/90 to-violet-950/90',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      border: 'hover:border-indigo-500/60',
      glow: 'shadow-indigo-900/20',
    },
  },
  'isizulu': {
    name: 'isiZulu',
    category: 'languages',
    categoryLabel: 'Ulimi Lwasekhaya',
    imageUrl: 'https://images.unsplash.com/photo-1516054575922-f0b8eeadec1a?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-violet-600/90 to-purple-950/90',
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      border: 'hover:border-violet-500/60',
      glow: 'shadow-violet-900/20',
    },
  },
  'isixhosa': {
    name: 'isiXhosa',
    category: 'languages',
    categoryLabel: 'Ulwimi Lwenkobe',
    imageUrl: 'https://images.unsplash.com/photo-1516054575922-f0b8eeadec1a?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-purple-600/90 to-indigo-950/90',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      border: 'hover:border-purple-500/60',
      glow: 'shadow-purple-900/20',
    },
  },
  'sepedi': {
    name: 'Sepedi',
    category: 'languages',
    categoryLabel: 'Leleme la Gae',
    imageUrl: 'https://images.unsplash.com/photo-1516054575922-f0b8eeadec1a?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-emerald-600/90 to-teal-950/90',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      border: 'hover:border-emerald-500/60',
      glow: 'shadow-emerald-900/20',
    },
  },
  'sesotho': {
    name: 'Sesotho',
    category: 'languages',
    categoryLabel: 'Puo ya Lapeng',
    imageUrl: 'https://images.unsplash.com/photo-1516054575922-f0b8eeadec1a?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-blue-600/90 to-indigo-950/90',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      border: 'hover:border-blue-500/60',
      glow: 'shadow-blue-900/20',
    },
  },
  'setswana': {
    name: 'Setswana',
    category: 'languages',
    categoryLabel: 'Puo ya Gae',
    imageUrl: 'https://images.unsplash.com/photo-1516054575922-f0b8eeadec1a?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-teal-600/90 to-cyan-950/90',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      border: 'hover:border-teal-500/60',
      glow: 'shadow-teal-900/20',
    },
  },

  // 4. Humanities & Social Sciences
  'geography': {
    name: 'Geography',
    category: 'humanities',
    categoryLabel: 'Earth & Climatology',
    imageUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-emerald-700/90 to-sky-950/90',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      border: 'hover:border-emerald-500/60',
      glow: 'shadow-emerald-900/20',
    },
  },
  'history': {
    name: 'History',
    category: 'humanities',
    categoryLabel: 'Heritage & Society',
    imageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-amber-800/90 to-stone-950/90',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      border: 'hover:border-amber-500/60',
      glow: 'shadow-amber-900/20',
    },
  },
  'tourism': {
    name: 'Tourism',
    category: 'services',
    categoryLabel: 'Hospitality & Travel',
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-cyan-600/90 to-teal-950/90',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      border: 'hover:border-cyan-500/60',
      glow: 'shadow-cyan-900/20',
    },
  },
  'agricultural sciences': {
    name: 'Agricultural Sciences',
    category: 'sciences',
    categoryLabel: 'Agronomy & Ecology',
    imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-lime-600/90 to-emerald-950/90',
      badge: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
      border: 'hover:border-lime-500/60',
      glow: 'shadow-lime-900/20',
    },
  },
  'consumer studies': {
    name: 'Consumer Studies',
    category: 'services',
    categoryLabel: 'Food, Fashion & Finance',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-rose-600/90 to-purple-950/90',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      border: 'hover:border-rose-500/60',
      glow: 'shadow-rose-900/20',
    },
  },
  'life orientation': {
    name: 'Life Orientation',
    category: 'general',
    categoryLabel: 'Wellness & Citizenship',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-violet-600/90 to-fuchsia-950/90',
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      border: 'hover:border-violet-500/60',
      glow: 'shadow-violet-900/20',
    },
  },
  'visual arts': {
    name: 'Visual Arts',
    category: 'humanities',
    categoryLabel: 'Fine Arts & Design',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-pink-600/90 to-purple-950/90',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      border: 'hover:border-pink-500/60',
      glow: 'shadow-pink-900/20',
    },
  },
  'dramatic arts': {
    name: 'Dramatic Arts',
    category: 'humanities',
    categoryLabel: 'Theater & Performance',
    imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-purple-600/90 to-indigo-950/90',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      border: 'hover:border-purple-500/60',
      glow: 'shadow-purple-900/20',
    },
  },
  'music': {
    name: 'Music',
    category: 'humanities',
    categoryLabel: 'Performing Arts',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    accent: {
      gradient: 'from-blue-600/90 to-violet-950/90',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      border: 'hover:border-blue-500/60',
      glow: 'shadow-blue-900/20',
    },
  },
};

// Generic fallback if subject is not explicitly mapped
const DEFAULT_FALLBACK: SubjectMetadata = {
  name: 'General Studies',
  category: 'general',
  categoryLabel: 'CAPS Curriculum',
  imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
  accent: {
    gradient: 'from-indigo-600/90 to-slate-950/90',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    border: 'hover:border-indigo-500/60',
    glow: 'shadow-indigo-900/20',
  },
};

/**
 * Returns metadata, high-res photography URL, and styling tokens for any subject.
 * Defensively guarded against null, undefined, objects, or non-string inputs.
 */
export const getSubjectMetadata = (subjectName?: any): SubjectMetadata => {
  if (!subjectName) return DEFAULT_FALLBACK;
  let str = '';
  if (typeof subjectName === 'string') {
    str = subjectName;
  } else if (typeof subjectName === 'object' && subjectName !== null) {
    str = subjectName.name || subjectName.subject_name || subjectName.title || '';
  } else {
    str = String(subjectName);
  }

  const trimmed = str.trim();
  if (!trimmed) return DEFAULT_FALLBACK;
  const key = trimmed.toLowerCase();

  // 1. Direct exact match
  if (SUBJECT_IMAGE_MAP[key]) {
    const matched = SUBJECT_IMAGE_MAP[key];
    return {
      ...DEFAULT_FALLBACK,
      ...matched,
      accent: {
        ...DEFAULT_FALLBACK.accent,
        ...(matched.accent || {})
      }
    };
  }

  // 2. Partial keyword matching
  const matchingKey = Object.keys(SUBJECT_IMAGE_MAP).find((k) => key.includes(k) || k.includes(key));
  if (matchingKey && SUBJECT_IMAGE_MAP[matchingKey]) {
    const matched = SUBJECT_IMAGE_MAP[matchingKey];
    return {
      ...DEFAULT_FALLBACK,
      ...matched,
      accent: {
        ...DEFAULT_FALLBACK.accent,
        ...(matched.accent || {})
      }
    };
  }

  // 3. Fallback
  return {
    ...DEFAULT_FALLBACK,
    name: trimmed,
  };
};

export const getSubjectImage = (subjectName?: any): string => {
  return getSubjectMetadata(subjectName).imageUrl;
};

