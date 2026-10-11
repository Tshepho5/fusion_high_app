import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

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

interface SchoolContextType {
  currentSchool: SchoolProfile;
  schoolsList: SchoolProfile[];
  loading: boolean;
  setSchoolById: (id: number) => void;
  setSchoolBySlug: (slug: string) => void;
  refreshSchools: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schoolsList, setSchoolsList] = useState<SchoolProfile[]>(() => {
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
    try {
      const saved = localStorage.getItem('active_school_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (_) {}
    return DEFAULT_SCHOOLS[0] || DEFAULT_SCHOOL;
  });

  const [loading, setLoading] = useState(false);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/schools');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const incoming = res.data;
        const merged: SchoolProfile[] = [...incoming];
        DEFAULT_SCHOOLS.forEach(defSchool => {
          const exists = merged.some(s => s.id === defSchool.id || s.slug === defSchool.slug || (s.name && s.name.toLowerCase() === defSchool.name.toLowerCase()));
          if (!exists) {
            merged.push(defSchool);
          }
        });
        setSchoolsList(merged);
        localStorage.setItem('cached_schools_list', JSON.stringify(merged));
        const savedId = localStorage.getItem('active_school_id');
        const matched = merged.find((s: SchoolProfile) => String(s.id) === savedId || s.slug === savedId) || merged[0];
        setCurrentSchoolState(matched);
        localStorage.setItem('active_school_profile', JSON.stringify(matched));
        localStorage.setItem('active_school_id', String(matched.id));
      } else {
        setSchoolsList(DEFAULT_SCHOOLS);
        const savedId = localStorage.getItem('active_school_id');
        const matched = DEFAULT_SCHOOLS.find((s: SchoolProfile) => String(s.id) === savedId || s.slug === savedId) || DEFAULT_SCHOOLS[0];
        setCurrentSchoolState(matched);
      }
    } catch (err) {
      console.warn('Could not fetch schools list, using fallback defaults:', err);
      if (!schoolsList || schoolsList.length === 0) {
        setSchoolsList(DEFAULT_SCHOOLS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

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

  const setSchoolById = (id: number) => {
    const found = schoolsList.find(s => s.id === id);
    if (found) {
      setCurrentSchoolState(found);
      localStorage.setItem('active_school_profile', JSON.stringify(found));
      localStorage.setItem('active_school_id', String(found.id));
      api.defaults.headers.common['x-school-id'] = String(found.id);
    }
  };

  const setSchoolBySlug = (slug: string) => {
    const found = schoolsList.find(s => s.slug === slug);
    if (found) {
      setCurrentSchoolState(found);
      localStorage.setItem('active_school_profile', JSON.stringify(found));
      localStorage.setItem('active_school_id', String(found.id));
      api.defaults.headers.common['x-school-id'] = String(found.id);
    }
  };

  return (
    <SchoolContext.Provider
      value={{
        currentSchool,
        schoolsList,
        loading,
        setSchoolById,
        setSchoolBySlug,
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
