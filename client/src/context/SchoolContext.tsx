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

export const DEFAULT_SCHOOLS: SchoolProfile[] = [];

export const DEFAULT_SCHOOL: SchoolProfile = {
  id: 0,
  name: 'No school registered yet',
  slug: '',
  primary_color: '#0284c7',
  secondary_color: '#06b6d4',
  accent_color: '#f59e0b',
  motto: 'Geleza Smart, The Future Is Thine',
  is_active: false
};

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
  const [schoolsList, setSchoolsList] = useState<SchoolProfile[]>([]);
  const [currentSchool, setCurrentSchoolState] = useState<SchoolProfile>(DEFAULT_SCHOOL);
  const [loading, setLoading] = useState(false);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/schools');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSchoolsList(res.data);
        const savedId = localStorage.getItem('active_school_id');
        const matched = res.data.find((s: SchoolProfile) => String(s.id) === savedId || s.slug === savedId) || res.data[0];
        setCurrentSchoolState(matched);
        localStorage.setItem('active_school_profile', JSON.stringify(matched));
        localStorage.setItem('active_school_id', String(matched.id));
      } else {
        setSchoolsList([]);
        setCurrentSchoolState(DEFAULT_SCHOOL);
        localStorage.removeItem('active_school_profile');
        localStorage.removeItem('active_school_id');
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
