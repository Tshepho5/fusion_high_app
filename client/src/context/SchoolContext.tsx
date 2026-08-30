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
  // 1. Limpopo (Polokwane & Mankweng - Capricorn South District)
  {
    id: 1,
    name: 'Fusion High School',
    slug: 'fusion-high',
    domain: 'fusion-high.co.za',
    emis_number: '911220001',
    circuit: 'Polokwane Central Circuit',
    district: 'Capricorn South',
    province: 'Limpopo',
    physical_address: 'Polokwane Central, Limpopo, 0700',
    contact_email: 'admin@fusionhigh.co.za',
    contact_phone: '+27 15 291 0000',
    principal_name: 'Dr. T. Makola',
    logo_url: '/assets/schools/fusion-high.svg',
    badge_url: '/assets/schools/fusion-high.svg',
    primary_color: '#4f46e5',
    secondary_color: '#06b6d4',
    accent_color: '#f59e0b',
    motto: 'Innovate, Lead, Transform',
    curriculum_type: 'CAPS (DBE Limpopo)',
    grade_range: '8-12',
    is_active: true,
    enrolled_learners_count: 1,
    staff_count: 5,
    classes_count: 13,
    parents_count: 1
  },
  {
    id: 2,
    name: 'Mountainview Senior Secondary School',
    slug: 'mountainview-high',
    domain: 'mountainview.co.za',
    emis_number: '923241054',
    circuit: 'Mankweng Circuit',
    district: 'Capricorn South',
    province: 'Limpopo',
    physical_address: 'Mankweng Unit B/C, Polokwane, 0727',
    contact_email: 'info@mountainviewhigh.co.za',
    contact_phone: '+27 15 267 1100',
    principal_name: 'Mr. M. S. Phasha',
    logo_url: '/assets/schools/mountainview-high.svg',
    badge_url: '/assets/schools/mountainview-high.svg',
    primary_color: '#1e40af',
    secondary_color: '#3b82f6',
    accent_color: '#f59e0b',
    motto: 'Strive for Excellence',
    curriculum_type: 'CAPS (DBE Limpopo)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 3,
    name: 'Makgoka High School',
    slug: 'makgoka-high',
    domain: 'makgoka.co.za',
    emis_number: '923240457',
    circuit: 'Molepo Circuit',
    district: 'Capricorn South',
    province: 'Limpopo',
    physical_address: 'Maclean Farm, Boyne, Mankweng Area, 0727',
    contact_email: 'admin@makgoka.co.za',
    contact_phone: '+27 15 266 0022',
    principal_name: 'Mrs. K. E. Molepo',
    logo_url: '/assets/schools/makgoka-high.svg',
    badge_url: '/assets/schools/makgoka-high.svg',
    primary_color: '#065f46',
    secondary_color: '#10b981',
    accent_color: '#fbbf24',
    motto: 'Thuto Ke Lesedi',
    curriculum_type: 'CAPS (DBE Limpopo)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 4,
    name: 'Turfloop High School',
    slug: 'turfloop-high',
    domain: 'turfloop.co.za',
    emis_number: '923240890',
    circuit: 'Mankweng Circuit',
    district: 'Capricorn South',
    province: 'Limpopo',
    physical_address: 'University Road, Turfloop, Mankweng, 0727',
    contact_email: 'principal@turfloophigh.co.za',
    contact_phone: '+27 15 267 3300',
    principal_name: 'Mr. N. J. Mamabolo',
    logo_url: '/assets/schools/turfloop-high.svg',
    badge_url: '/assets/schools/turfloop-high.svg',
    primary_color: '#1e1b4b',
    secondary_color: '#4338ca',
    accent_color: '#991b1b',
    motto: 'Education for Progress',
    curriculum_type: 'CAPS (DBE Limpopo)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 5,
    name: 'Hwiti High School',
    slug: 'hwiti-high',
    domain: 'hwiti.co.za',
    emis_number: '923240150',
    circuit: 'Mankweng Circuit',
    district: 'Capricorn South',
    province: 'Limpopo',
    physical_address: '118 Zone 1, Hwiti St, Mankweng/Sovenga, 0727',
    contact_email: 'info@hwitisecondary.co.za',
    contact_phone: '+27 15 267 4400',
    principal_name: 'Mrs. R. M. Ramokgopa',
    logo_url: '/assets/schools/hwiti-high.svg',
    badge_url: '/assets/schools/hwiti-high.svg',
    primary_color: '#581c87',
    secondary_color: '#9333ea',
    accent_color: '#06b6d4',
    motto: 'Tsebo Ke Maatla',
    curriculum_type: 'CAPS (DBE Limpopo)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 6,
    name: 'Ngwana Mohube Secondary School',
    slug: 'ngwana-mohube',
    domain: 'ngwanamohube.co.za',
    emis_number: '923260994',
    circuit: 'Mankweng Circuit',
    district: 'Capricorn South',
    province: 'Limpopo',
    physical_address: 'Gamphahlele, Seleteng, Limpopo, 0734',
    contact_email: 'admin@ngwanamohube.co.za',
    contact_phone: '+27 15 267 5500',
    principal_name: 'Mr. S. P. Mohube',
    logo_url: '/assets/schools/ngwana-mohube.svg',
    badge_url: '/assets/schools/ngwana-mohube.svg',
    primary_color: '#991b1b',
    secondary_color: '#ef4444',
    accent_color: '#0f172a',
    motto: 'Thuto Ke Maatla',
    curriculum_type: 'CAPS (DBE Limpopo)',
    grade_range: '8-12',
    is_active: true
  },
  // 2. Gauteng (Lotus Gardens & Atteridgeville, Pretoria - GDE)
  {
    id: 7,
    name: 'Fusion Secondary School (Lotus Gardens)',
    slug: 'fusion-secondary-lotus',
    domain: 'fusionsecondary.co.za',
    emis_number: '700232348',
    circuit: 'Tshwane West District',
    district: 'Tshwane West',
    province: 'Gauteng',
    physical_address: '809 Cyme Crescent, Lotus Gardens, Pretoria, 0008',
    contact_email: 'admin@fusionsecondary.co.za',
    contact_phone: '+27 12 373 0000',
    principal_name: 'Dr. T. Makola',
    logo_url: '/assets/schools/fusion-secondary-lotus.svg',
    badge_url: '/assets/schools/fusion-secondary-lotus.svg',
    primary_color: '#4f46e5',
    secondary_color: '#06b6d4',
    accent_color: '#f59e0b',
    motto: 'Innovate, Aspire, Achieve',
    curriculum_type: 'CAPS (GDE Gauteng)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 8,
    name: 'Saulridge Secondary School',
    slug: 'saulridge-secondary',
    domain: 'saulridge.co.za',
    emis_number: '700232223',
    circuit: 'Tshwane South District (D4)',
    district: 'Tshwane South',
    province: 'Gauteng',
    physical_address: 'Ramokgopa St, Saulsville, Atteridgeville, Pretoria, 0008',
    contact_email: 'info@saulridge.co.za',
    contact_phone: '+27 12 375 6000',
    principal_name: 'Mr. K. E. Masemola',
    logo_url: '/assets/schools/saulridge-secondary.svg',
    badge_url: '/assets/schools/saulridge-secondary.svg',
    primary_color: '#1e3a8a',
    secondary_color: '#f59e0b',
    accent_color: '#3b82f6',
    motto: 'Knowledge is Power',
    curriculum_type: 'CAPS (GDE Gauteng)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 9,
    name: 'Phelindaba Secondary School',
    slug: 'phelindaba-secondary',
    domain: 'phelindaba.co.za',
    emis_number: '700232124',
    circuit: 'Tshwane South District (D4)',
    district: 'Tshwane South',
    province: 'Gauteng',
    physical_address: 'Kgwale St, Atteridgeville, Pretoria, 0008',
    contact_email: 'admin@phelindaba.co.za',
    contact_phone: '+27 12 373 8100',
    principal_name: 'Mrs. M. T. Sithole',
    logo_url: '/assets/schools/phelindaba-secondary.svg',
    badge_url: '/assets/schools/phelindaba-secondary.svg',
    primary_color: '#14532d',
    secondary_color: '#eab308',
    accent_color: '#10b981',
    motto: 'Strive for Success',
    curriculum_type: 'CAPS (GDE Gauteng)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 10,
    name: 'Flavius Mareka Secondary School',
    slug: 'flavius-mareka',
    domain: 'flaviusmareka.co.za',
    emis_number: '700231670',
    circuit: 'Tshwane South District (D4)',
    district: 'Tshwane South',
    province: 'Gauteng',
    physical_address: 'Khoza St, Atteridgeville, Pretoria, 0008',
    contact_email: 'principal@flaviusmareka.co.za',
    contact_phone: '+27 12 373 9200',
    principal_name: 'Mr. L. N. Maluleke',
    logo_url: '/assets/schools/flavius-mareka.svg',
    badge_url: '/assets/schools/flavius-mareka.svg',
    primary_color: '#1d4ed8',
    secondary_color: '#38bdf8',
    accent_color: '#fbbf24',
    motto: 'Excellence in Action',
    curriculum_type: 'CAPS (GDE Gauteng)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 11,
    name: 'Dr. W.F. Nkomo Secondary School',
    slug: 'wf-nkomo-secondary',
    domain: 'wfnkomo.co.za',
    emis_number: '700231613',
    circuit: 'Tshwane South District (D4)',
    district: 'Tshwane South',
    province: 'Gauteng',
    physical_address: '84 Khudu St, Atteridgeville, Pretoria, 0008',
    contact_email: 'info@wfnkomo.co.za',
    contact_phone: '+27 12 375 7300',
    principal_name: 'Mr. D. M. Ndlovu',
    logo_url: '/assets/schools/wf-nkomo-secondary.svg',
    badge_url: '/assets/schools/wf-nkomo-secondary.svg',
    primary_color: '#881337',
    secondary_color: '#f43f5e',
    accent_color: '#fbbf24',
    motto: 'Labor Omnia Vincit',
    curriculum_type: 'CAPS (GDE Gauteng)',
    grade_range: '8-12',
    is_active: true
  },
  {
    id: 12,
    name: 'Hofmeyr Secondary School',
    slug: 'hofmeyr-secondary',
    domain: 'hofmeyr.co.za',
    emis_number: '700231746',
    circuit: 'Tshwane South District (D4)',
    district: 'Tshwane South',
    province: 'Gauteng',
    physical_address: '1 Mngadi and Mafole St, Atteridgeville, Pretoria, 0008',
    contact_email: 'admin@hofmeyr.co.za',
    contact_phone: '+27 12 373 7400',
    principal_name: 'Mrs. S. R. Mogale',
    logo_url: '/assets/schools/hofmeyr-secondary.svg',
    badge_url: '/assets/schools/hofmeyr-secondary.svg',
    primary_color: '#581c87',
    secondary_color: '#14b8a6',
    accent_color: '#f59e0b',
    motto: 'Education for Liberation',
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
        return JSON.parse(saved);
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
        setSchoolsList(res.data);
        
        // Match active school in list or update it
        const savedId = localStorage.getItem('active_school_id');
        const matched = res.data.find(s => String(s.id) === savedId || s.slug === savedId) || res.data[0];
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
