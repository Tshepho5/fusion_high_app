import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

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
  settings?: Record<string, any>;
  enrolled_learners_count?: number;
  staff_count?: number;
  classes_count?: number;
  parents_count?: number;
}

export const DEFAULT_SCHOOLS: SchoolProfile[] = [
  {
    id: 1,
    name: 'Geleza SA',
    slug: 'geleza-sa',
    domain: 'gelezasa.co.za',
    emis_number: '911220001',
    circuit: 'Polokwane Central Circuit',
    district: 'Capricorn South',
    province: 'Limpopo',
    physical_address: 'Polokwane Central, Limpopo, 0700',
    contact_email: 'admin@gelezasa.co.za',
    contact_phone: '+27 15 291 0000',
    principal_name: 'Dr. T. Makola',
    logo_url: '/assets/schools/geleza-sa.svg',
    badge_url: '/assets/schools/geleza-sa.svg',
    primary_color: '#0284c7',
    secondary_color: '#06b6d4',
    accent_color: '#f59e0b',
    motto: 'Geleza Smart, The Future Is Thine',
    curriculum_type: 'CAPS (DBE Limpopo)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 2,
    name: 'Fusion High School',
    slug: 'fusion-high',
    domain: 'fusionhigh.co.za',
    emis_number: '700232348',
    circuit: 'Tshwane West District',
    district: 'Tshwane West',
    province: 'Gauteng',
    physical_address: '809 Cyme Crescent, Lotus Gardens, Pretoria, 0008',
    contact_email: 'admin@fusionhigh.co.za',
    contact_phone: '+27 12 373 0000',
    principal_name: 'Tshepho Letlalo Makula',
    logo_url: '/assets/schools/fusion-secondary-lotus.svg',
    badge_url: '/assets/schools/fusion-secondary-lotus.svg',
    primary_color: '#4f46e5',
    secondary_color: '#06b6d4',
    accent_color: '#f59e0b',
    motto: 'Innovate, Aspire, Achieve',
    curriculum_type: 'CAPS (GDE Gauteng)',
    grade_range: '8-12',
    is_active: true
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
  const [schoolsList, setSchoolsList] = useState<SchoolProfile[]>(DEFAULT_SCHOOLS);
  const [currentSchool, setCurrentSchoolState] = useState<SchoolProfile>(() => {
    const saved = localStorage.getItem('active_school_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id === 1 || parsed.slug === 'fusion-high' || parsed.slug === 'geleza-sa') {
          return {
            ...parsed,
            name: 'Geleza SA',
            motto: 'Geleza Smart, The Future Is Thine',
            domain: 'geleza-sa.co.za',
            contact_email: 'admin@geleza-sa.co.za',
            logo_url: '/assets/schools/geleza-sa.svg',
            badge_url: '/assets/schools/geleza-sa.svg'
          };
        }
        return parsed;
      } catch (_) {}
    }
    return DEFAULT_SCHOOL;
  });
  const [loading, setLoading] = useState(false);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/schools');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const sanitized = res.data.map(s => {
          if (s.id === 1 || s.slug === 'fusion-high' || s.name === 'Fusion High School') {
            return {
              ...s,
              name: 'Geleza SA',
              motto: 'Geleza Smart, The Future Is Thine',
              domain: 'geleza-sa.co.za',
              contact_email: 'admin@geleza-sa.co.za',
              logo_url: '/assets/schools/geleza-sa.svg',
              badge_url: '/assets/schools/geleza-sa.svg'
            };
          }
          return s;
        });
        setSchoolsList(sanitized);
        
        // Match active school in list or update it
        const savedId = localStorage.getItem('active_school_id');
        const matched = sanitized.find(s => String(s.id) === savedId || s.slug === savedId) || sanitized[0];
        if (matched) {
          setCurrentSchoolState(matched);
          localStorage.setItem('active_school_profile', JSON.stringify(matched));
          localStorage.setItem('active_school_id', String(matched.id));
        }
      }
    } catch (err) {
      console.warn('Could not fetch schools list, using fallback defaults:', err);
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
      axios.defaults.headers.common['x-school-id'] = String(found.id);
    }
  };

  const setSchoolBySlug = (slug: string) => {
    const found = schoolsList.find(s => s.slug === slug);
    if (found) {
      setCurrentSchoolState(found);
      localStorage.setItem('active_school_profile', JSON.stringify(found));
      localStorage.setItem('active_school_id', String(found.id));
      axios.defaults.headers.common['x-school-id'] = String(found.id);
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
