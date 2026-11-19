import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { readAuthValue, storeHoldingToken } from '../utils/authStorage';

export interface SchoolProfile {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  emis_number?: string;
  circuit?: string;
  district?: string;
  province?: string;
  physical_address?: string;
  contact_email?: string;
  contact_phone?: string;
  principal_name?: string;
  logo_url?: string;
  badge_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  motto?: string;
  curriculum_type?: string;
  grade_range?: string;
  is_active: boolean;
  offered_subjects?: string[] | string | null;
  offered_streams?: string[] | string | null;
  offered_languages?: string[] | string | null;
  teacher_modules?: string[] | null;
  learner_modules?: string[] | null;
  settings?: Record<string, any>;
  enrolled_learners_count?: number;
  staff_count?: number;
  classes_count?: number;
  parents_count?: number;
  registry?: boolean;
}

export const DEFAULT_SCHOOLS: SchoolProfile[] = [
  {
    id: 14,
    name: 'Walters High School',
    slug: 'walters-high-school',
    domain: 'walters-high-school.co.za',
    emis_number: '592409761',
    circuit: 'Polokwane Central Circuit',
    district: 'Capricorn South (Polokwane/Mankweng)',
    province: 'Limpopo',
    physical_address: '555 Makobo street, Polokwane, Limpopo',
    contact_email: 'mothopeng.bont13@gmail.com',
    contact_phone: '+27610512832',
    principal_name: 'Bontle Mothopeng',
    primary_color: '#0284c7',
    secondary_color: '#06b6d4',
    accent_color: '#f59e0b',
    motto: 'Knowledge is Power, Education is Freedom',
    curriculum_type: 'CAPS (DBE)',
    grade_range: '8-12',
    is_active: true,
    offered_languages: ['English FAL', 'Sepedi Home Language'],
    offered_subjects: ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 'Business Studies', 'Economics', 'Geography', 'History', 'English FAL', 'Sepedi Home Language', 'Life Orientation'],
    offered_streams: ['Science', 'Commerce', 'General']
  },
  {
    id: 15,
    name: 'Tshilidzi Secondary School',
    slug: 'tshilidzi-secondary-school',
    domain: 'tshilidzi-secondary-school.co.za',
    emis_number: '923987654',
    circuit: 'Vhembe Central Circuit',
    district: 'Vhembe East',
    province: 'Limpopo',
    physical_address: 'Tshilidzi Stand 12, Thohoyandou, 0950',
    contact_email: 'principal@tshilidzi.co.za',
    contact_phone: '+27159620000',
    principal_name: 'N. Tshilidzi',
    primary_color: '#0284c7',
    secondary_color: '#06b6d4',
    accent_color: '#f59e0b',
    motto: 'Excellence in Education',
    curriculum_type: 'CAPS (DBE)',
    grade_range: '8-12',
    is_active: true,
    offered_languages: ['English Home Language', 'English FAL', 'Sepedi Home Language', 'Tshivenda Home Language'],
    offered_subjects: ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 'Business Studies', 'Economics', 'English FAL', 'Sepedi Home Language', 'Life Orientation'],
    offered_streams: ['Science', 'Commerce', 'General']
  }
];

export const DEFAULT_SCHOOL: SchoolProfile = DEFAULT_SCHOOLS[0];

const WORKSPACE_KEY = 'geleza_school_workspace';

interface SchoolContextType {
  currentSchool: SchoolProfile;
  schoolsList: SchoolProfile[];
  loading: boolean;
  workspaceSchoolId: number | null;
  setSchoolById: (id: number) => void;
  setSchoolBySlug: (slug: string) => void;
  enterRegisteredSchool: (school: Partial<SchoolProfile> & { id: number }) => boolean;
  leaveRegisteredSchool: () => void;
  refreshSchools: () => Promise<void>;
}

function readWorkspaceId() {
  try {
    const id = parseInt(sessionStorage.getItem(WORKSPACE_KEY) || '', 10);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch (_) {
    return null;
  }
}

function writeWorkspaceId(id: number | null) {
  try {
    if (!id) sessionStorage.removeItem(WORKSPACE_KEY);
    else sessionStorage.setItem(WORKSPACE_KEY, String(id));
  } catch (_) {}
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

function rememberSchool(profile: SchoolProfile | null) {
  if (!profile) {
    try {
      localStorage.removeItem('active_school_profile');
      localStorage.removeItem('active_school_id');
      sessionStorage.removeItem('active_school_profile');
      sessionStorage.removeItem('active_school_id');
    } catch (_) {}
    return;
  }
  try {
    const holder = storeHoldingToken(localStorage, sessionStorage);
    holder.setItem('active_school_profile', JSON.stringify(profile));
    holder.setItem('active_school_id', String(profile.id));
  } catch (_) {}
}

export const SchoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.is_superadmin);
  const [workspaceSchoolId, setWorkspaceSchoolId] = useState<number | null>(readWorkspaceId);
  const [schoolsList, setSchoolsList] = useState<SchoolProfile[]>(() => {
    if (user && !isSuperAdmin) return [];
    try {
      const saved = localStorage.getItem('cached_schools_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasWalters = parsed.some((s: any) => s.name?.toLowerCase().includes('walters') || s.slug === 'walters-high-school');
          if (hasWalters) return parsed;
          return [...parsed, ...DEFAULT_SCHOOLS.filter(d => !parsed.some((p: any) => p.id === d.id || p.slug === d.slug))];
        }
      }
    } catch (_) {}
    return DEFAULT_SCHOOLS;
  });

  const [currentSchool, setCurrentSchoolState] = useState<SchoolProfile>(() => {
    const ownId = Number(user?.school_id);
    try {
      const saved = localStorage.getItem('active_school_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && (!user || isSuperAdmin || Number(parsed.id) === ownId)) return parsed;
      }
    } catch (_) {}
    if (user && !isSuperAdmin && ownId > 0) {
      return {
        id: ownId,
        name: 'Your school',
        slug: '',
        primary_color: '#4f46e5',
        secondary_color: '#06b6d4',
        accent_color: '#f59e0b',
        is_active: true
      };
    }
    return DEFAULT_SCHOOLS[0] || DEFAULT_SCHOOL;
  });

  const [loading, setLoading] = useState(false);

  const applySchool = (profile: SchoolProfile) => {
    setCurrentSchoolState(profile);
    rememberSchool(profile);
    api.defaults.headers.common['x-school-id'] = String(profile.id);
  };

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/schools');
      const incoming = Array.isArray(res.data)
        ? res.data.map((school: SchoolProfile) => ({ ...school, registry: true }))
        : [];
      const ownId = Number(user?.school_id);
      const superAdmin = Boolean(user?.is_superadmin);

      if (user && !superAdmin) {
        writeWorkspaceId(null);
        setWorkspaceSchoolId(null);
        const own = incoming.find((school) => Number(school.id) === ownId) || null;
        setSchoolsList(own ? [own] : []);
        if (own) applySchool(own);
        else if (ownId > 0) {
          applySchool({
            id: ownId,
            name: 'Your school',
            slug: '',
            primary_color: '#4f46e5',
            secondary_color: '#06b6d4',
            accent_color: '#f59e0b',
            is_active: true
          });
        }
        return;
      }

      const merged: SchoolProfile[] = [...incoming];
      if (!user) {
        DEFAULT_SCHOOLS.forEach((defSchool) => {
          const exists = merged.some((school) => school.id === defSchool.id || school.slug === defSchool.slug || (school.name && school.name.toLowerCase() === defSchool.name.toLowerCase()));
          if (!exists) merged.push(defSchool);
        });
      }
      const nextList = merged.length > 0 ? merged : DEFAULT_SCHOOLS;
      setSchoolsList(nextList);
      try {
        localStorage.setItem('cached_schools_list', JSON.stringify(nextList));
      } catch (_) {}

      const workspaceId = readWorkspaceId();
      const entered = superAdmin
        ? incoming.find((school) => Number(school.id) === Number(workspaceId))
        : null;
      if (entered) {
        setWorkspaceSchoolId(entered.id);
        applySchool(entered);
        return;
      }
      if (superAdmin && workspaceId) writeWorkspaceId(null);
      setWorkspaceSchoolId(null);
      const savedId = readAuthValue('active_school_id', [localStorage, sessionStorage]);
      const matched = nextList.find((school) => String(school.id) === savedId || school.slug === savedId)
        || nextList.find((school) => Number(school.id) === ownId)
        || nextList[0];
      if (matched) applySchool(matched);
    } catch (err) {
      console.warn('Could not fetch schools list, using fallback defaults:', err);
      if (!user) setSchoolsList((current) => (current && current.length > 0 ? current : DEFAULT_SCHOOLS));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [user?.id, user?.is_superadmin, user?.school_id]);

  // Dynamically apply school theme color tokens to CSS root
  useEffect(() => {
    const root = document.documentElement;
    if (currentSchool) {
      root.style.setProperty('--school-primary', currentSchool.primary_color || '#4f46e5');
      root.style.setProperty('--school-secondary', currentSchool.secondary_color || '#06b6d4');
      root.style.setProperty('--school-accent', currentSchool.accent_color || '#f59e0b');
      root.setAttribute('data-school-slug', currentSchool.slug || 'fusion-high');
    }
  }, [currentSchool]);

  const enterRegisteredSchool = (school: Partial<SchoolProfile> & { id: number }) => {
    if (!isSuperAdmin) return false;
    const id = Number(school.id);
    if (!Number.isInteger(id) || id <= 0) return false;
    const known = schoolsList.find((item) => Number(item.id) === id);
    if (known && !known.registry) return false;
    const profile: SchoolProfile = {
      primary_color: '#4f46e5',
      secondary_color: '#06b6d4',
      accent_color: '#f59e0b',
      is_active: true,
      name: known?.name || 'Registered school',
      slug: known?.slug || '',
      ...(known || {}),
      ...school,
      id,
      registry: true
    };
    if (!known) setSchoolsList((current) => [...current, profile]);
    writeWorkspaceId(id);
    setWorkspaceSchoolId(id);
    applySchool(profile);
    return true;
  };

  const leaveRegisteredSchool = () => {
    writeWorkspaceId(null);
    setWorkspaceSchoolId(null);
    const ownId = Number(user?.school_id);
    const home = schoolsList.find((item) => Number(item.id) === ownId);
    if (home) applySchool(home);
  };

  const setSchoolById = (id: number) => {
    const ownId = Number(user?.school_id);
    if (user && !isSuperAdmin && Number(id) !== ownId) return;
    const found = schoolsList.find((school) => Number(school.id) === Number(id));
    if (!found) return;
    applySchool(found);
  };

  const setSchoolBySlug = (slug: string) => {
    const found = schoolsList.find((school) => school.slug === slug);
    if (!found) return;
    if (user && !isSuperAdmin && Number(found.id) !== Number(user.school_id)) return;
    applySchool(found);
  };

  return (
    <SchoolContext.Provider
      value={{
        currentSchool,
        schoolsList,
        loading,
        workspaceSchoolId,
        setSchoolById,
        setSchoolBySlug,
        enterRegisteredSchool,
        leaveRegisteredSchool,
        refreshSchools: fetchSchools
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
