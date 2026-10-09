import React, { useState, useEffect, useRef, useMemo } from 'react';
import { adminService, schoolRegistrationService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AdminOverviewSkeleton } from '../../components/admin/AdminOverviewSkeleton';
import { Modal } from '../../components/common/Modal';
import { FavoriteModulesSection } from '../../components/common/FavoriteModulesSection';
import { HomeGreeting } from '../../components/layout/WorkspaceChrome';
import { MasterAdminExecutiveHub } from '../../components/admin/MasterAdminExecutiveHub';
import { SchoolModulePreferences } from '../../components/admin/SchoolModulePreferences';
import {
  readModuleList,
  TEACHER_MODULES,
  LEARNER_MODULES,
  LEARNER_CHOICE_MODULES,
  getModuleIcon,
  defaultTeacherModules,
  defaultLearnerModules,
  modulesReceivedByLearners,
} from '../../utils/schoolModules';
import {
  Users,
  GraduationCap,
  Briefcase,
  CalendarCheck,
  Award,
  Clock,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  FileSpreadsheet,
  Megaphone,
  CreditCard,
  Calendar,
  Settings,
  LayoutGrid,
  Grid3X3,
  List,
  HardDrive,
  Trophy,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  CheckCircle2,
  Check,
  Building2,
  Swords,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Eye,
  Sparkles,
  Layers,
  Filter,
  UserCheck,
  MapPin,
  School,
  Globe,
  RefreshCw,
  ExternalLink,
  Shield,
  Tag,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool, SchoolProfile } from '../../context/SchoolContext';
import { Subject3DCoverFlow } from '../../components/subject/Subject3DCoverFlow';

export type SubjectViewMode = '3d-flow' | 'carousel' | 'grid' | 'compact' | 'list';

/**
 * Returns clean list of offered subjects for any registered school.
 */
export const getSchoolOfferedSubjects = (school: SchoolProfile): string[] => {
  let list: string[] = [];
  if (Array.isArray(school.offered_subjects)) {
    list = school.offered_subjects.filter(Boolean);
  } else if (typeof school.offered_subjects === 'string') {
    try {
      const parsed = JSON.parse(school.offered_subjects);
      if (Array.isArray(parsed)) list = parsed.filter(Boolean);
      else list = school.offered_subjects.split(',').map(s => s.trim()).filter(Boolean);
    } catch {
      list = school.offered_subjects.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return list;
};

export const getSchoolOfferedStreams = (school: SchoolProfile): string[] => {
  let list: string[] = [];
  if (Array.isArray(school.offered_streams)) {
    list = school.offered_streams.filter(Boolean);
  } else if (typeof school.offered_streams === 'string') {
    try {
      const parsed = JSON.parse(school.offered_streams);
      if (Array.isArray(parsed)) list = parsed.filter(Boolean);
      else list = school.offered_streams.split(',').map(s => s.trim()).filter(Boolean);
    } catch {
      list = school.offered_streams.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return list;
};

export const getSchoolOfferedLanguages = (school: SchoolProfile): string[] => {
  let list: string[] = [];
  if (Array.isArray(school.offered_languages)) {
    list = school.offered_languages.filter(Boolean);
  } else if (typeof school.offered_languages === 'string') {
    try {
      const parsed = JSON.parse(school.offered_languages);
      if (Array.isArray(parsed)) list = parsed.filter(Boolean);
      else list = school.offered_languages.split(',').map(s => s.trim()).filter(Boolean);
    } catch {
      list = school.offered_languages.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return list;
};

export const categorizeSchoolSubjects = (subjects: string[]) => {
  const categories: Record<string, string[]> = {
    'STEM & Sciences': [],
    'Commerce & Management': [],
    'Languages & Literacy': [],
    'Humanities & Social': [],
    'Technical & Vocational': []
  };

  subjects.forEach(sub => {
    const s = sub.toLowerCase();
    if (s.includes('math') || s.includes('physic') || s.includes('chem') || s.includes('natural science') || s.includes('tech science') || s.includes('life science') || s.includes('bio') || s.includes('information tech') || s.includes('cat') || s.includes('computer')) {
      categories['STEM & Sciences'].push(sub);
    } else if (s.includes('account') || s.includes('business') || s.includes('econom') || s.includes('ems') || s.includes('finance')) {
      categories['Commerce & Management'].push(sub);
    } else if (s.includes('english') || s.includes('afrikaans') || s.includes('zulu') || s.includes('xhosa') || s.includes('sepedi') || s.includes('sotho') || s.includes('tswana') || s.includes('venda') || s.includes('tsonga') || s.includes('swati') || s.includes('ndebele') || s.includes('language') || s.includes('fal') || s.includes('hl')) {
      categories['Languages & Literacy'].push(sub);
    } else if (s.includes('history') || s.includes('geograph') || s.includes('social science') || s.includes('tourism') || s.includes('life orient') || s.includes('religion')) {
      categories['Humanities & Social'].push(sub);
    } else {
      categories['Technical & Vocational'].push(sub);
    }
  });

  return categories;
};

/**
 * Returns a high-definition cover image reflecting the subject's academic field.
 */
export const getSubjectCoverImage = (subjectName: string = ''): string => {
  const s = subjectName.toLowerCase();

  // Physical Sciences / Chemistry / Natural Sciences / Physics
  if (s.includes('physic') || s.includes('chem') || s.includes('natural science') || s.includes('tech science')) {
    return 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
  }

  // Mathematics / Mathematical Literacy / Tech Maths / Algebra / Geometry
  if (s.includes('math') || s.includes('algebra') || s.includes('calculus') || s.includes('geometry')) {
    return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80';
  }

  // Life Sciences / Biology / Life Orientation / Health
  if (s.includes('life science') || s.includes('bio') || s.includes('living')) {
    return 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=600&q=80';
  }

  // Accounting / Business Studies / Economics / EMS / Commerce
  if (s.includes('account') || s.includes('business') || s.includes('econom') || s.includes('ems') || s.includes('finance')) {
    return 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80';
  }

  // English / Languages / FAL / Literature / African Languages
  if (
    s.includes('english') ||
    s.includes('language') ||
    s.includes('fal') ||
    s.includes('literature') ||
    s.includes('sepedi') ||
    s.includes('zulu') ||
    s.includes('afrikaans') ||
    s.includes('xhosa') ||
    s.includes('sotho')
  ) {
    return 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80';
  }

  // Geography / Earth Sciences
  if (s.includes('geograph') || s.includes('earth') || s.includes('map')) {
    return 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80';
  }

  // History / Social Sciences / Heritage
  if (s.includes('histor') || s.includes('social') || s.includes('heritage')) {
    return 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80';
  }

  // Information Technology (IT) / Computer Applications Technology (CAT) / Robotics / Technology
  if (s.includes('it') || s.includes('cat') || s.includes('comput') || s.includes('coding') || s.includes('robot') || s.includes('technol')) {
    return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80';
  }

  // Tourism / Hospitality / Consumer Studies
  if (s.includes('tour') || s.includes('hospit') || s.includes('consumer')) {
    return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';
  }

  // Life Orientation
  if (s.includes('orient') || s.includes('guidance')) {
    return 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80';
  }

  // Arts / Creative Arts / Music / Drama / EGD
  if (s.includes('art') || s.includes('drama') || s.includes('music') || s.includes('creative') || s.includes('egd') || s.includes('graphic')) {
    return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80';
  }

  // Agricultural Sciences
  if (s.includes('agri') || s.includes('farm')) {
    return 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80';
  }

  // Default
  return 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80';
};

export interface SchoolSubjectItem {
  id: string;
  name: string;
  code: string;
  grade: number;
  category: 'stem' | 'commerce' | 'humanities' | 'languages' | 'technical';
  stream: string;
  teacher_name: string;
  learner_count: number;
  average_mark: number | null;
  pass_rate: number | null;
  status: string;
}

interface AdminOverviewProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { currentSchool, schoolsList, setSchoolById, refreshSchools } = useSchool();
  const isSuperAdmin = Boolean(user?.is_superadmin);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const metricsCarouselRef = useRef<HTMLDivElement>(null);
  const subjectsCarouselRef = useRef<HTMLDivElement>(null);

  // Subject Exploration Controls (For School Admin)
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [subjectSearch, setSubjectSearch] = useState<string>('');
  const [subjectsViewMode, setSubjectsViewMode] = useState<SubjectViewMode>(() => {
    return (localStorage.getItem('admin_subjects_view_mode') as SubjectViewMode) || 'grid';
  });

  // Selected Subject for "View More" Command Center Modal
  const [viewMoreSubject, setViewMoreSubject] = useState<SchoolSubjectItem | null>(null);

  // Registered Schools Exploration Controls (For Geleza SA Platform Admin)
  const [schoolsViewMode, setSchoolsViewMode] = useState<SubjectViewMode>(() => {
    return (localStorage.getItem('admin_schools_view_mode') as SubjectViewMode) || 'grid';
  });
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>('');
  const [selectedSchoolProvince, setSelectedSchoolProvince] = useState<string>('all');
  const [selectedSchoolCircuit, setSelectedSchoolCircuit] = useState<string>('all');
  const [selectedSchoolForCurriculum, setSelectedSchoolForCurriculum] = useState<SchoolProfile | null>(null);
  const [schoolDossierTab, setSchoolDossierTab] = useState<'modules' | 'subjects' | 'configure'>('modules');
  const [isRefreshingSchools, setIsRefreshingSchools] = useState<boolean>(false);
  const [expandedSchoolIds, setExpandedSchoolIds] = useState<Record<number, boolean>>({});

  const toggleSchoolExpand = (schoolId: number) => {
    setExpandedSchoolIds(prev => ({ ...prev, [schoolId]: !prev[schoolId] }));
  };

  const handleSetSchoolsViewMode = (mode: SubjectViewMode) => {
    setSchoolsViewMode(mode);
    try {
      localStorage.setItem('admin_schools_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleSetSubjectsViewMode = (mode: SubjectViewMode) => {
    setSubjectsViewMode(mode);
    try {
      localStorage.setItem('admin_subjects_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const scrollMetricsCarousel = (direction: number) => {
    if (metricsCarouselRef.current) {
      metricsCarouselRef.current.scrollBy({ left: direction * 320, behavior: 'smooth' });
    }
  };

  const scrollSubjectsCarousel = (direction: number) => {
    if (subjectsCarouselRef.current) {
      subjectsCarouselRef.current.scrollBy({ left: direction * 340, behavior: 'smooth' });
    }
  };

  // Raw API subjects state
  const [apiSubjects, setApiSubjects] = useState<any[]>([]);
  const [pendingSchoolApps, setPendingSchoolApps] = useState<any[]>([]);

  const handleRefreshSchools = async () => {
    setIsRefreshingSchools(true);
    try {
      await refreshSchools();
      const appsRes = await schoolRegistrationService.getAllApplications().catch(() => []);
      const rows = Array.isArray(appsRes) ? appsRes : (appsRes?.applications || []);
      setPendingSchoolApps(rows.filter((a: any) => {
        const s = (a.status || '').toLowerCase();
        return s === 'pending' || s === 'pending_review' || s === 'under_review' || s === 'awaiting_review';
      }));
    } catch (err) {
      console.warn('Failed to refresh registered schools network:', err);
    } finally {
      setIsRefreshingSchools(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      adminService.getOverviewStats(),
      adminService.getSubjectsSummary(),
      schoolRegistrationService.getAllApplications().catch(() => [])
    ])
      .then(([statsRes, subjectsRes, appsRes]) => {
        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value);
        }
        if (subjectsRes.status === 'fulfilled' && subjectsRes.value?.subjects) {
          setApiSubjects(subjectsRes.value.subjects);
        }
        if (appsRes.status === 'fulfilled') {
          const rows = Array.isArray(appsRes.value) ? appsRes.value : (appsRes.value?.applications || []);
          setPendingSchoolApps(rows.filter((a: any) => {
            const s = (a.status || '').toLowerCase();
            return s === 'pending' || s === 'pending_review' || s === 'under_review' || s === 'awaiting_review';
          }));
        }
      })
      .catch((err) => {
        console.error('Failed to load admin overview data:', err);
      })
      .finally(() => setLoading(false));
  }, [currentSchool?.id]);

  // Master Comprehensive CAPS School Subjects Registry (Grades 8 - 12)
  const masterSubjects: SchoolSubjectItem[] = useMemo(() => {
    const rawList: SchoolSubjectItem[] = [
      // -------------------------------------------------------------
      // GRADE 8 (Senior Phase / GET)
      // -------------------------------------------------------------
      { id: 'g8-math', name: 'Mathematics', code: 'CAPS-MAT-G08', grade: 8, category: 'stem', stream: 'General GET', teacher_name: 'Mr. T. Khumalo', learner_count: 142, average_mark: 71, pass_rate: 88, status: 'Active' },
      { id: 'g8-ns', name: 'Natural Sciences', code: 'CAPS-NSC-G08', grade: 8, category: 'stem', stream: 'General GET', teacher_name: 'Dr. M. Dlamini', learner_count: 142, average_mark: 74, pass_rate: 91, status: 'Active' },
      { id: 'g8-tech', name: 'Technology', code: 'CAPS-TEC-G08', grade: 8, category: 'technical', stream: 'General GET', teacher_name: 'Mr. P. Molefe', learner_count: 142, average_mark: 78, pass_rate: 94, status: 'Active' },
      { id: 'g8-eng', name: 'English Home Language', code: 'CAPS-ENG-G08', grade: 8, category: 'languages', stream: 'General GET', teacher_name: 'Ms. S. Pillay', learner_count: 142, average_mark: 76, pass_rate: 95, status: 'Active' },
      { id: 'g8-afr', name: 'Afrikaans First Additional Language', code: 'CAPS-AFR-G08', grade: 8, category: 'languages', stream: 'General GET', teacher_name: 'Mev. H. van der Merwe', learner_count: 94, average_mark: 68, pass_rate: 86, status: 'Active' },
      { id: 'g8-zul', name: 'IsiZulu First Additional Language', code: 'CAPS-ZUL-G08', grade: 8, category: 'languages', stream: 'General GET', teacher_name: 'Mrs. N. Buthelezi', learner_count: 48, average_mark: 79, pass_rate: 96, status: 'Active' },
      { id: 'g8-ss', name: 'Social Sciences (History & Geography)', code: 'CAPS-SOC-G08', grade: 8, category: 'humanities', stream: 'General GET', teacher_name: 'Mr. J. Naidoo', learner_count: 142, average_mark: 72, pass_rate: 90, status: 'Active' },
      { id: 'g8-ems', name: 'Economic & Management Sciences (EMS)', code: 'CAPS-EMS-G08', grade: 8, category: 'commerce', stream: 'General GET', teacher_name: 'Ms. R. Baloyi', learner_count: 142, average_mark: 73, pass_rate: 89, status: 'Active' },
      { id: 'g8-lo', name: 'Life Orientation', code: 'CAPS-LOR-G08', grade: 8, category: 'technical', stream: 'General GET', teacher_name: 'Mr. K. Sithole', learner_count: 142, average_mark: 84, pass_rate: 99, status: 'Active' },
      { id: 'g8-ca', name: 'Creative Arts', code: 'CAPS-CTA-G08', grade: 8, category: 'technical', stream: 'General GET', teacher_name: 'Ms. C. Botha', learner_count: 142, average_mark: 81, pass_rate: 97, status: 'Active' },

      // -------------------------------------------------------------
      // GRADE 9 (Senior Phase / GET)
      // -------------------------------------------------------------
      { id: 'g9-math', name: 'Mathematics', code: 'CAPS-MAT-G09', grade: 9, category: 'stem', stream: 'General GET', teacher_name: 'Mr. T. Khumalo', learner_count: 138, average_mark: 69, pass_rate: 85, status: 'Active' },
      { id: 'g9-ns', name: 'Natural Sciences', code: 'CAPS-NSC-G09', grade: 9, category: 'stem', stream: 'General GET', teacher_name: 'Dr. M. Dlamini', learner_count: 138, average_mark: 72, pass_rate: 89, status: 'Active' },
      { id: 'g9-tech', name: 'Technology', code: 'CAPS-TEC-G09', grade: 9, category: 'technical', stream: 'General GET', teacher_name: 'Mr. P. Molefe', learner_count: 138, average_mark: 77, pass_rate: 93, status: 'Active' },
      { id: 'g9-eng', name: 'English Home Language', code: 'CAPS-ENG-G09', grade: 9, category: 'languages', stream: 'General GET', teacher_name: 'Ms. S. Pillay', learner_count: 138, average_mark: 75, pass_rate: 94, status: 'Active' },
      { id: 'g9-afr', name: 'Afrikaans First Additional Language', code: 'CAPS-AFR-G09', grade: 9, category: 'languages', stream: 'General GET', teacher_name: 'Mev. H. van der Merwe', learner_count: 89, average_mark: 67, pass_rate: 84, status: 'Active' },
      { id: 'g9-zul', name: 'IsiZulu First Additional Language', code: 'CAPS-ZUL-G09', grade: 9, category: 'languages', stream: 'General GET', teacher_name: 'Mrs. N. Buthelezi', learner_count: 49, average_mark: 80, pass_rate: 97, status: 'Active' },
      { id: 'g9-ss', name: 'Social Sciences (History & Geography)', code: 'CAPS-SOC-G09', grade: 9, category: 'humanities', stream: 'General GET', teacher_name: 'Mr. J. Naidoo', learner_count: 138, average_mark: 70, pass_rate: 88, status: 'Active' },
      { id: 'g9-ems', name: 'Economic & Management Sciences (EMS)', code: 'CAPS-EMS-G09', grade: 9, category: 'commerce', stream: 'General GET', teacher_name: 'Ms. R. Baloyi', learner_count: 138, average_mark: 71, pass_rate: 87, status: 'Active' },
      { id: 'g9-lo', name: 'Life Orientation', code: 'CAPS-LOR-G09', grade: 9, category: 'technical', stream: 'General GET', teacher_name: 'Mr. K. Sithole', learner_count: 138, average_mark: 85, pass_rate: 99, status: 'Active' },
      { id: 'g9-ca', name: 'Creative Arts', code: 'CAPS-CTA-G09', grade: 9, category: 'technical', stream: 'General GET', teacher_name: 'Ms. C. Botha', learner_count: 138, average_mark: 82, pass_rate: 98, status: 'Active' },

      // -------------------------------------------------------------
      // GRADE 10 (FET Phase)
      // -------------------------------------------------------------
      { id: 'g10-math', name: 'Mathematics', code: 'CAPS-MAT-G10', grade: 10, category: 'stem', stream: 'Science Stream', teacher_name: 'Mrs. K. Ndlovu', learner_count: 88, average_mark: 68, pass_rate: 82, status: 'Active' },
      { id: 'g10-mlit', name: 'Mathematical Literacy', code: 'CAPS-MLT-G10', grade: 10, category: 'stem', stream: 'General Stream', teacher_name: 'Mr. V. Mokoena', learner_count: 46, average_mark: 74, pass_rate: 92, status: 'Active' },
      { id: 'g10-phys', name: 'Physical Sciences', code: 'CAPS-PSC-G10', grade: 10, category: 'stem', stream: 'Science Stream', teacher_name: 'Dr. L. Mthembu', learner_count: 88, average_mark: 70, pass_rate: 84, status: 'Active' },
      { id: 'g10-life', name: 'Life Sciences', code: 'CAPS-LSC-G10', grade: 10, category: 'stem', stream: 'Science Stream', teacher_name: 'Ms. A. Govender', learner_count: 92, average_mark: 73, pass_rate: 89, status: 'Active' },
      { id: 'g10-it', name: 'Information Technology (IT)', code: 'CAPS-INF-G10', grade: 10, category: 'stem', stream: 'Technical STEM', teacher_name: 'Mr. D. Sithole', learner_count: 36, average_mark: 79, pass_rate: 94, status: 'Active' },
      { id: 'g10-cat', name: 'Computer Applications Technology (CAT)', code: 'CAPS-CAT-G10', grade: 10, category: 'stem', stream: 'Commerce Stream', teacher_name: 'Mrs. M. Venter', learner_count: 52, average_mark: 75, pass_rate: 93, status: 'Active' },
      { id: 'g10-acc', name: 'Accounting', code: 'CAPS-ACC-G10', grade: 10, category: 'commerce', stream: 'Commerce Stream', teacher_name: 'Mr. B. Mazibuko', learner_count: 45, average_mark: 72, pass_rate: 87, status: 'Active' },
      { id: 'g10-bus', name: 'Business Studies', code: 'CAPS-BUS-G10', grade: 10, category: 'commerce', stream: 'Commerce Stream', teacher_name: 'Ms. N. Zwane', learner_count: 58, average_mark: 76, pass_rate: 91, status: 'Active' },
      { id: 'g10-eco', name: 'Economics', code: 'CAPS-ECO-G10', grade: 10, category: 'commerce', stream: 'Commerce Stream', teacher_name: 'Mr. S. Cele', learner_count: 42, average_mark: 69, pass_rate: 85, status: 'Active' },
      { id: 'g10-geo', name: 'Geography', code: 'CAPS-GEO-G10', grade: 10, category: 'humanities', stream: 'Humanities', teacher_name: 'Mrs. T. Moagi', learner_count: 64, average_mark: 71, pass_rate: 88, status: 'Active' },
      { id: 'g10-hist', name: 'History', code: 'CAPS-HIS-G10', grade: 10, category: 'humanities', stream: 'Humanities', teacher_name: 'Mr. E. Mabasa', learner_count: 40, average_mark: 74, pass_rate: 90, status: 'Active' },
      { id: 'g10-tour', name: 'Tourism', code: 'CAPS-TRM-G10', grade: 10, category: 'humanities', stream: 'Humanities', teacher_name: 'Ms. F. Daniels', learner_count: 38, average_mark: 78, pass_rate: 95, status: 'Active' },
      { id: 'g10-eng', name: 'English Home Language', code: 'CAPS-ENG-G10', grade: 10, category: 'languages', stream: 'All Streams', teacher_name: 'Ms. J. Smith', learner_count: 134, average_mark: 75, pass_rate: 93, status: 'Active' },
      { id: 'g10-afr', name: 'Afrikaans First Additional Language', code: 'CAPS-AFR-G10', grade: 10, category: 'languages', stream: 'Language Stream', teacher_name: 'Mev. H. van der Merwe', learner_count: 85, average_mark: 68, pass_rate: 86, status: 'Active' },
      { id: 'g10-zul', name: 'IsiZulu First Additional Language', code: 'CAPS-ZUL-G10', grade: 10, category: 'languages', stream: 'Language Stream', teacher_name: 'Mrs. N. Buthelezi', learner_count: 49, average_mark: 81, pass_rate: 97, status: 'Active' },
      { id: 'g10-lo', name: 'Life Orientation', code: 'CAPS-LOR-G10', grade: 10, category: 'technical', stream: 'Compulsory', teacher_name: 'Mr. K. Sithole', learner_count: 134, average_mark: 83, pass_rate: 99, status: 'Active' },
      { id: 'g10-egd', name: 'Engineering Graphics & Design (EGD)', code: 'CAPS-EGD-G10', grade: 10, category: 'technical', stream: 'Technical STEM', teacher_name: 'Mr. H. Fourie', learner_count: 32, average_mark: 77, pass_rate: 92, status: 'Active' },
      { id: 'g10-agri', name: 'Agricultural Sciences', code: 'CAPS-AGR-G10', grade: 10, category: 'technical', stream: 'Agri Sciences', teacher_name: 'Mr. P. Radebe', learner_count: 28, average_mark: 73, pass_rate: 89, status: 'Active' },

      // -------------------------------------------------------------
      // GRADE 11 (FET Phase)
      // -------------------------------------------------------------
      { id: 'g11-math', name: 'Mathematics', code: 'CAPS-MAT-G11', grade: 11, category: 'stem', stream: 'Science Stream', teacher_name: 'Mrs. K. Ndlovu', learner_count: 84, average_mark: 67, pass_rate: 80, status: 'Active' },
      { id: 'g11-mlit', name: 'Mathematical Literacy', code: 'CAPS-MLT-G11', grade: 11, category: 'stem', stream: 'General Stream', teacher_name: 'Mr. V. Mokoena', learner_count: 44, average_mark: 75, pass_rate: 93, status: 'Active' },
      { id: 'g11-phys', name: 'Physical Sciences', code: 'CAPS-PSC-G11', grade: 11, category: 'stem', stream: 'Science Stream', teacher_name: 'Dr. L. Mthembu', learner_count: 84, average_mark: 69, pass_rate: 83, status: 'Active' },
      { id: 'g11-life', name: 'Life Sciences', code: 'CAPS-LSC-G11', grade: 11, category: 'stem', stream: 'Science Stream', teacher_name: 'Ms. A. Govender', learner_count: 88, average_mark: 74, pass_rate: 90, status: 'Active' },
      { id: 'g11-it', name: 'Information Technology (IT)', code: 'CAPS-INF-G11', grade: 11, category: 'stem', stream: 'Technical STEM', teacher_name: 'Mr. D. Sithole', learner_count: 34, average_mark: 80, pass_rate: 95, status: 'Active' },
      { id: 'g11-cat', name: 'Computer Applications Technology (CAT)', code: 'CAPS-CAT-G11', grade: 11, category: 'stem', stream: 'Commerce Stream', teacher_name: 'Mrs. M. Venter', learner_count: 50, average_mark: 76, pass_rate: 94, status: 'Active' },
      { id: 'g11-acc', name: 'Accounting', code: 'CAPS-ACC-G11', grade: 11, category: 'commerce', stream: 'Commerce Stream', teacher_name: 'Mr. B. Mazibuko', learner_count: 42, average_mark: 73, pass_rate: 88, status: 'Active' },
      { id: 'g11-bus', name: 'Business Studies', code: 'CAPS-BUS-G11', grade: 11, category: 'commerce', stream: 'Commerce Stream', teacher_name: 'Ms. N. Zwane', learner_count: 56, average_mark: 77, pass_rate: 92, status: 'Active' },
      { id: 'g11-eco', name: 'Economics', code: 'CAPS-ECO-G11', grade: 11, category: 'commerce', stream: 'Commerce Stream', teacher_name: 'Mr. S. Cele', learner_count: 40, average_mark: 70, pass_rate: 86, status: 'Active' },
      { id: 'g11-geo', name: 'Geography', code: 'CAPS-GEO-G11', grade: 11, category: 'humanities', stream: 'Humanities', teacher_name: 'Mrs. T. Moagi', learner_count: 60, average_mark: 72, pass_rate: 89, status: 'Active' },
      { id: 'g11-hist', name: 'History', code: 'CAPS-HIS-G11', grade: 11, category: 'humanities', stream: 'Humanities', teacher_name: 'Mr. E. Mabasa', learner_count: 38, average_mark: 75, pass_rate: 91, status: 'Active' },
      { id: 'g11-tour', name: 'Tourism', code: 'CAPS-TRM-G11', grade: 11, category: 'humanities', stream: 'Humanities', teacher_name: 'Ms. F. Daniels', learner_count: 36, average_mark: 79, pass_rate: 96, status: 'Active' },
      { id: 'g11-eng', name: 'English Home Language', code: 'CAPS-ENG-G11', grade: 11, category: 'languages', stream: 'All Streams', teacher_name: 'Ms. J. Smith', learner_count: 128, average_mark: 76, pass_rate: 94, status: 'Active' },
      { id: 'g11-afr', name: 'Afrikaans First Additional Language', code: 'CAPS-AFR-G11', grade: 11, category: 'languages', stream: 'Language Stream', teacher_name: 'Mev. H. van der Merwe', learner_count: 80, average_mark: 69, pass_rate: 87, status: 'Active' },
      { id: 'g11-zul', name: 'IsiZulu First Additional Language', code: 'CAPS-ZUL-G11', grade: 11, category: 'languages', stream: 'Language Stream', teacher_name: 'Mrs. N. Buthelezi', learner_count: 48, average_mark: 82, pass_rate: 98, status: 'Active' },
      { id: 'g11-lo', name: 'Life Orientation', code: 'CAPS-LOR-G11', grade: 11, category: 'technical', stream: 'Compulsory', teacher_name: 'Mr. K. Sithole', learner_count: 128, average_mark: 84, pass_rate: 99, status: 'Active' },
      { id: 'g11-egd', name: 'Engineering Graphics & Design (EGD)', code: 'CAPS-EGD-G11', grade: 11, category: 'technical', stream: 'Technical STEM', teacher_name: 'Mr. H. Fourie', learner_count: 30, average_mark: 78, pass_rate: 93, status: 'Active' },
      { id: 'g11-agri', name: 'Agricultural Sciences', code: 'CAPS-AGR-G11', grade: 11, category: 'technical', stream: 'Agri Sciences', teacher_name: 'Mr. P. Radebe', learner_count: 26, average_mark: 74, pass_rate: 90, status: 'Active' },

      // -------------------------------------------------------------
      // GRADE 12 (Matric Candidate Class)
      // -------------------------------------------------------------
      { id: 'g12-math', name: 'Mathematics', code: 'CAPS-MAT-G12', grade: 12, category: 'stem', stream: 'Science Stream', teacher_name: 'Mrs. K. Ndlovu', learner_count: 76, average_mark: 71, pass_rate: 86, status: 'Matric Target 90%' },
      { id: 'g12-mlit', name: 'Mathematical Literacy', code: 'CAPS-MLT-G12', grade: 12, category: 'stem', stream: 'General Stream', teacher_name: 'Mr. V. Mokoena', learner_count: 48, average_mark: 78, pass_rate: 96, status: 'Matric Target 95%' },
      { id: 'g12-phys', name: 'Physical Sciences', code: 'CAPS-PSC-G12', grade: 12, category: 'stem', stream: 'Science Stream', teacher_name: 'Dr. L. Mthembu', learner_count: 76, average_mark: 73, pass_rate: 88, status: 'Matric Target 90%' },
      { id: 'g12-life', name: 'Life Sciences', code: 'CAPS-LSC-G12', grade: 12, category: 'stem', stream: 'Science Stream', teacher_name: 'Ms. A. Govender', learner_count: 82, average_mark: 76, pass_rate: 92, status: 'Matric Target 95%' },
      { id: 'g12-it', name: 'Information Technology (IT)', code: 'CAPS-INF-G12', grade: 12, category: 'stem', stream: 'Technical STEM', teacher_name: 'Mr. D. Sithole', learner_count: 30, average_mark: 83, pass_rate: 98, status: 'Matric Target 100%' },
      { id: 'g12-cat', name: 'Computer Applications Technology (CAT)', code: 'CAPS-CAT-G12', grade: 12, category: 'stem', stream: 'Commerce Stream', teacher_name: 'Mrs. M. Venter', learner_count: 45, average_mark: 79, pass_rate: 97, status: 'Matric Target 100%' },
      { id: 'g12-acc', name: 'Accounting', code: 'CAPS-ACC-G12', grade: 12, category: 'commerce', stream: 'Commerce Stream', teacher_name: 'Mr. B. Mazibuko', learner_count: 38, average_mark: 75, pass_rate: 90, status: 'Matric Target 92%' },
      { id: 'g12-bus', name: 'Business Studies', code: 'CAPS-BUS-G12', grade: 12, category: 'commerce', stream: 'Commerce Stream', teacher_name: 'Ms. N. Zwane', learner_count: 52, average_mark: 80, pass_rate: 95, status: 'Matric Target 96%' },
      { id: 'g12-eco', name: 'Economics', code: 'CAPS-ECO-G12', grade: 12, category: 'commerce', stream: 'Commerce Stream', teacher_name: 'Mr. S. Cele', learner_count: 36, average_mark: 72, pass_rate: 88, status: 'Matric Target 90%' },
      { id: 'g12-geo', name: 'Geography', code: 'CAPS-GEO-G12', grade: 12, category: 'humanities', stream: 'Humanities', teacher_name: 'Mrs. T. Moagi', learner_count: 55, average_mark: 75, pass_rate: 91, status: 'Matric Target 94%' },
      { id: 'g12-hist', name: 'History', code: 'CAPS-HIS-G12', grade: 12, category: 'humanities', stream: 'Humanities', teacher_name: 'Mr. E. Mabasa', learner_count: 34, average_mark: 77, pass_rate: 93, status: 'Matric Target 95%' },
      { id: 'g12-tour', name: 'Tourism', code: 'CAPS-TRM-G12', grade: 12, category: 'humanities', stream: 'Humanities', teacher_name: 'Ms. F. Daniels', learner_count: 32, average_mark: 82, pass_rate: 98, status: 'Matric Target 100%' },
      { id: 'g12-eng', name: 'English Home Language', code: 'CAPS-ENG-G12', grade: 12, category: 'languages', stream: 'All Streams', teacher_name: 'Ms. J. Smith', learner_count: 124, average_mark: 78, pass_rate: 96, status: 'Matric Target 98%' },
      { id: 'g12-afr', name: 'Afrikaans First Additional Language', code: 'CAPS-AFR-G12', grade: 12, category: 'languages', stream: 'Language Stream', teacher_name: 'Mev. H. van der Merwe', learner_count: 75, average_mark: 71, pass_rate: 90, status: 'Matric Target 92%' },
      { id: 'g12-zul', name: 'IsiZulu First Additional Language', code: 'CAPS-ZUL-G12', grade: 12, category: 'languages', stream: 'Language Stream', teacher_name: 'Mrs. N. Buthelezi', learner_count: 49, average_mark: 84, pass_rate: 99, status: 'Matric Target 100%' },
      { id: 'g12-lo', name: 'Life Orientation', code: 'CAPS-LOR-G12', grade: 12, category: 'technical', stream: 'Compulsory', teacher_name: 'Mr. K. Sithole', learner_count: 124, average_mark: 87, pass_rate: 100, status: 'Matric Target 100%' },
      { id: 'g12-egd', name: 'Engineering Graphics & Design (EGD)', code: 'CAPS-EGD-G12', grade: 12, category: 'technical', stream: 'Technical STEM', teacher_name: 'Mr. H. Fourie', learner_count: 28, average_mark: 81, pass_rate: 96, status: 'Matric Target 98%' },
      { id: 'g12-agri', name: 'Agricultural Sciences', code: 'CAPS-AGR-G12', grade: 12, category: 'technical', stream: 'Agri Sciences', teacher_name: 'Mr. P. Radebe', learner_count: 24, average_mark: 76, pass_rate: 92, status: 'Matric Target 95%' }
    ];

    const realNumber = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    // Filter strictly by the subjects the principal has actually chosen for this school
    const offeredSubjects = currentSchool && currentSchool.id !== 0
      ? getSchoolOfferedSubjects(currentSchool)
      : [];

    let subjectSourceList = rawList;
    if (offeredSubjects.length > 0) {
      const lowerOffered = offeredSubjects.map(s => s.toLowerCase().trim());
      subjectSourceList = rawList.filter(item => {
        const itemName = item.name.toLowerCase().trim();
        return lowerOffered.some(off => 
          itemName === off ||
          itemName.includes(off) ||
          off.includes(itemName)
        );
      });

      // Dynamically accommodate any offered subject selected by the principal not present in rawList
      const gradesToPopulate = [8, 9, 10, 11, 12];
      offeredSubjects.forEach(offName => {
        const lower = offName.toLowerCase().trim();
        const hasMatch = subjectSourceList.some(f => f.name.toLowerCase().trim() === lower || f.name.toLowerCase().includes(lower) || lower.includes(f.name.toLowerCase()));
        if (!hasMatch) {
          const codeSub = offName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'SUB';
          gradesToPopulate.forEach(gr => {
            let cat: 'stem' | 'commerce' | 'humanities' | 'languages' | 'technical' = 'stem';
            if (lower.includes('acc') || lower.includes('bus') || lower.includes('eco')) cat = 'commerce';
            else if (lower.includes('eng') || lower.includes('afr') || lower.includes('zul') || lower.includes('sepedi') || lower.includes('sotho') || lower.includes('lang')) cat = 'languages';
            else if (lower.includes('geo') || lower.includes('hist') || lower.includes('tour')) cat = 'humanities';
            else if (lower.includes('lo') || lower.includes('orient') || lower.includes('agri') || lower.includes('tech')) cat = 'technical';

            subjectSourceList.push({
              id: `offered-${codeSub.toLowerCase()}-g${gr}`,
              name: offName,
              code: `CAPS-${codeSub}-G${gr}`,
              grade: gr,
              category: cat,
              stream: 'Curriculum Stream',
              teacher_name: '',
              learner_count: 0,
              average_mark: null,
              pass_rate: null,
              status: 'Active'
            });
          });
        }
      });
    }

    // Catalog names stay. Invented averages, pass rates, class sizes, and teacher names do not.
    const catalog: SchoolSubjectItem[] = subjectSourceList.map((subject) => ({
      ...subject,
      teacher_name: '',
      learner_count: 0,
      average_mark: null,
      pass_rate: null,
    }));

    if (apiSubjects && apiSubjects.length > 0) {
      const merged = [...catalog];
      apiSubjects.forEach((apiSub: any) => {
        const average = realNumber(apiSub.average_mark);
        const pass = realNumber(apiSub.pass_rate);
        const learners = realNumber(apiSub.learner_count);
        const foundIdx = merged.findIndex(
          (m) => m.name.toLowerCase() === apiSub.name?.toLowerCase() && Number(m.grade) === Number(apiSub.grade)
        );
        if (foundIdx >= 0) {
          merged[foundIdx] = {
            ...merged[foundIdx],
            learner_count: learners ?? 0,
            teacher_name: apiSub.teacher_name || '',
            average_mark: average,
            pass_rate: pass,
            code: apiSub.code || merged[foundIdx].code,
            status: apiSub.status || merged[foundIdx].status
          };
        } else {
          merged.push({
            id: `api-${apiSub.id || apiSub.name}-${apiSub.grade}`,
            name: apiSub.name,
            code: apiSub.code || `CAPS-${String(apiSub.name || 'SUB').substring(0, 3).toUpperCase()}-G${apiSub.grade}`,
            grade: Number(apiSub.grade) || 10,
            category: 'stem',
            stream: apiSub.stream || 'Curriculum Subject',
            teacher_name: apiSub.teacher_name || '',
            learner_count: learners ?? 0,
            average_mark: average,
            pass_rate: pass,
            status: apiSub.status || 'Active'
          });
        }
      });
      return merged;
    }

    return catalog;
  }, [apiSubjects, currentSchool]);

  // Filtered list based on Grade, Category, and Search
  const filteredSubjects = useMemo(() => {
    return masterSubjects.filter((item) => {
      // Grade filter
      if (selectedGrade !== 'all' && String(item.grade) !== selectedGrade) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (subjectSearch.trim()) {
        const query = subjectSearch.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesTeacher = item.teacher_name.toLowerCase().includes(query);
        const matchesCode = item.code.toLowerCase().includes(query);
        if (!matchesName && !matchesTeacher && !matchesCode) {
          return false;
        }
      }
      return true;
    });
  }, [masterSubjects, selectedGrade, selectedCategory, subjectSearch]);

  // Registered schools only (active verified partner campuses on Geleza SA)
  const registeredSchools = useMemo(() => {
    return (schoolsList || []).filter(s => s.is_active && s.id !== 0);
  }, [schoolsList]);

  const filteredRegisteredSchools = useMemo(() => {
    return registeredSchools.filter(s => {
      const q = schoolSearchQuery.toLowerCase().trim();
      const offeredSubs = getSchoolOfferedSubjects(s).map(sub => sub.toLowerCase());
      const matchesSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        (s.emis_number || '').toLowerCase().includes(q) ||
        (s.principal_name || '').toLowerCase().includes(q) ||
        (s.circuit || '').toLowerCase().includes(q) ||
        (s.district || '').toLowerCase().includes(q) ||
        (s.province || '').toLowerCase().includes(q) ||
        offeredSubs.some(sub => sub.includes(q));

      const matchesProvince = selectedSchoolProvince === 'all' || s.province === selectedSchoolProvince;
      const matchesCircuit = selectedSchoolCircuit === 'all' || s.circuit === selectedSchoolCircuit;

      return matchesSearch && matchesProvince && matchesCircuit;
    });
  }, [registeredSchools, schoolSearchQuery, selectedSchoolProvince, selectedSchoolCircuit]);

  const schoolProvinces = useMemo(() => {
    const set = new Set<string>();
    registeredSchools.forEach(s => {
      if (s.province) set.add(s.province);
    });
    return Array.from(set);
  }, [registeredSchools]);

  const schoolCircuits = useMemo(() => {
    const set = new Set<string>();
    registeredSchools.forEach(s => {
      if (s.circuit) set.add(s.circuit);
    });
    return Array.from(set);
  }, [registeredSchools]);

  if (loading) return <AdminOverviewSkeleton />;

  const totalLearners = stats?.enrolled_learners !== undefined 
    ? Number(stats.enrolled_learners) 
    : (stats?.total_learners !== undefined ? Number(stats.total_learners) : (stats?.totalLearners !== undefined ? Number(stats.totalLearners) : 0));
  const totalTeachers = stats?.teacher !== undefined 
    ? Number(stats.teacher) 
    : (stats?.role_counts?.teacher !== undefined ? Number(stats.role_counts.teacher) : (stats?.totalTeachers !== undefined ? Number(stats.totalTeachers) : 0));
  const totalClasses = stats?.total_classes !== undefined 
    ? Number(stats.total_classes) 
    : (stats?.classes !== undefined ? Number(stats.classes) : 0);
  const overallAttendance = stats?.overall_attendance !== undefined && stats.overall_attendance !== null 
    ? `${stats.overall_attendance}%` 
    : (stats?.attendance_rate !== undefined && stats.attendance_rate !== null ? `${stats.attendance_rate}%` : '0%');

  const metricCards = [
    { title: 'Enrolled Learners', value: totalLearners, sub: 'Active CAPS Students', icon: GraduationCap, color: 'text-indigo-400', tab: 'users' },
    { title: 'Teaching Staff', value: totalTeachers, sub: 'Subject Specialists', icon: Briefcase, color: 'text-cyan-400', tab: 'users' },
    { title: 'Class Units', value: totalClasses, sub: 'Grade 8-12 Rooms', icon: BookOpen, color: 'text-emerald-400', tab: 'timetable' },
    { title: 'School Attendance', value: overallAttendance, sub: 'Daily Average', icon: CalendarCheck, color: 'text-amber-400', tab: 'marks' },
  ];

  // Grade Filter Options
  const grades = [
    { id: 'all', label: 'All Grades (8 - 12)' },
    { id: '8', label: 'Grade 8' },
    { id: '9', label: 'Grade 9' },
    { id: '10', label: 'Grade 10' },
    { id: '11', label: 'Grade 11' },
    { id: '12', label: 'Grade 12' }
  ];

  // Subject Categories
  const categories = [
    { id: 'all', label: 'All Subjects' },
    { id: 'stem', label: 'STEM & Sciences' },
    { id: 'commerce', label: 'Commerce & Accounting' },
    { id: 'humanities', label: 'Humanities & Social' },
    { id: 'languages', label: 'Languages & Lit' },
    { id: 'technical', label: 'Applied & Creative' }
  ];



  return (
    <div className="space-y-8 animate-fade-in text-slate-900 dark:text-slate-100 pb-16">
      <HomeGreeting />

      {/* Pending School Admissions Alert Banner */}
      {pendingSchoolApps.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Building2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Admissions Action Required
                </span>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {pendingSchoolApps.length} School Registration{pendingSchoolApps.length > 1 ? 's' : ''} Awaiting Review
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                <strong className="text-slate-900 dark:text-white">{pendingSchoolApps[0].school_name}</strong> (Principal {pendingSchoolApps[0].principal_first_name || pendingSchoolApps[0].principal_name} {pendingSchoolApps[0].principal_surname}) registered their campus and is awaiting formal admission.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('school-admissions')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <span>Review & Admit School</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. GELEZA SA SUPERADMIN vs SCHOOL ADMIN OVERVIEW SPACE                     */}
      {/* ========================================================================= */}
      {isSuperAdmin ? (
        /* ========================================================================= */
        /* GELEZA SA PLATFORM ADMIN: REGISTERED PARTNER SCHOOLS DIRECTORY            */
        /* (In place of flat subjects: Only registered schools, with subjects inside)*/
        /* ========================================================================= */
        <section className="space-y-4 rounded-3xl bg-slate-100 dark:bg-surface-darker border border-slate-300 dark:border-white/10 p-5 sm:p-6 shadow-sm relative overflow-hidden transition-colors">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Geleza SA Executive Governance • Institutional Network</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span>Registered Partner Schools Directory</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {registeredSchools.length} Verified {registeredSchools.length === 1 ? 'Campus' : 'Campuses'}
                </span>
              </h2>
            </div>

            {/* Controls: Search, View Mode, Refresh */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={schoolSearchQuery}
                  onChange={(e) => setSchoolSearchQuery(e.target.value)}
                  placeholder="Search school, EMIS, province, or subject..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all w-52 sm:w-64"
                />
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center p-1 rounded-xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleSetSchoolsViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    schoolsViewMode === 'grid'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetSchoolsViewMode('compact')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    schoolsViewMode === 'compact'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title="Compact View"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Compact</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetSchoolsViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    schoolsViewMode === 'list'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title="Detailed List View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">List</span>
                </button>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleRefreshSchools}
                disabled={isRefreshingSchools}
                className="p-2 rounded-xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all shadow-sm cursor-pointer"
                title="Sync Schools Network"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSchools ? 'animate-spin text-purple-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Filter Pills (Provinces & Circuits) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedSchoolProvince('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedSchoolProvince === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white'
              }`}
            >
              All Provinces ({registeredSchools.length})
            </button>
            {schoolProvinces.map(prov => (
              <button
                key={prov}
                onClick={() => setSelectedSchoolProvince(prov)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSchoolProvince === prov
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          {/* Incoming Schools Alert (if pending applications exist) */}
          {pendingSchoolApps.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  {pendingSchoolApps.length} New Incoming School {pendingSchoolApps.length === 1 ? 'Registration' : 'Registrations'} Awaiting Geleza SA Accreditation
                </span>
                <span className="hidden md:inline text-slate-500 dark:text-slate-400">
                  • Once approved, new schools will immediately appear in this space with their offered subjects.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('school-admissions')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-sm flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <span>Accredit Incoming Schools</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Registered Schools Output Rendering */}
          {filteredRegisteredSchools.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {schoolSearchQuery ? 'No Registered Schools Match Filter' : 'No Schools Registered Yet'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                {schoolSearchQuery
                  ? 'Try adjusting your search query, province filter, or subject name.'
                  : 'Schools register through the public registration portal and appear here immediately once accredited by Geleza SA Executives.'}
              </p>
              {pendingSchoolApps.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('school-admissions')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Review {pendingSchoolApps.length} Pending School Applications</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* VIEW MODE 1: GRID VIEW */}
              {schoolsViewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredRegisteredSchools.map((school) => {
                    const offeredSubjects = getSchoolOfferedSubjects(school);
                    const offeredStreams = getSchoolOfferedStreams(school);
                    const isExpanded = Boolean(expandedSchoolIds[school.id]);
                    const displayedSubjects = isExpanded ? offeredSubjects : offeredSubjects.slice(0, 6);
                    const remainingCount = offeredSubjects.length - 6;
                    const teacherModIds = readModuleList(school.teacher_modules) ?? defaultTeacherModules();
                    const learnerModIds = readModuleList(school.learner_modules) ?? defaultLearnerModules();
                    const totalActiveMods = teacherModIds.length + learnerModIds.length;

                    return (
                      <div
                        key={school.id}
                        className="rounded-3xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-purple-500/40 transition-all shadow-sm hover:shadow-lg flex flex-col justify-between overflow-hidden group"
                      >
                        {/* School Card Top Banner */}
                        <div
                          className="p-5 border-b border-slate-200 dark:border-white/10 relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${school.primary_color || '#4f46e5'}20 0%, ${school.secondary_color || '#06b6d4'}15 100%)`
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 relative z-10">
                            <div className="flex items-center gap-3">
                              {/* Logo / Emblem */}
                              <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-md shrink-0 border border-white/20 overflow-hidden"
                                style={{ backgroundColor: school.primary_color || '#4f46e5' }}
                              >
                                {school.logo_url ? (
                                  <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{school.name.slice(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                                  {school.name}
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 italic truncate">
                                  {school.motto || 'Excellence in Education'}
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          </div>

                          {/* Location & EMIS badges */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-black/5 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300">
                            {school.province && (
                              <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/30 border border-slate-300 dark:border-white/10 font-semibold flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-purple-500" />
                                {school.province}
                              </span>
                            )}
                            {school.circuit && (
                              <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/30 border border-slate-300 dark:border-white/10 font-semibold">
                                Circuit: {school.circuit}
                              </span>
                            )}
                            {school.emis_number && (
                              <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/30 border border-slate-300 dark:border-white/10 font-mono font-bold text-slate-700 dark:text-slate-300">
                                EMIS: {school.emis_number}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* School Body: Macro Metrics */}
                        <div className="p-5 space-y-4 flex-1">
                          {/* 3 Metric Pills */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/5 text-center">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Learners</span>
                              <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                                {school.enrolled_learners_count || 0}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/5 text-center">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Staff</span>
                              <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                                {school.staff_count || 0}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/5 text-center">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Classes</span>
                              <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                                {school.classes_count || 0}
                              </span>
                            </div>
                          </div>

                          {/* Principal & Curriculum */}
                          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Principal:</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {school.principal_name || 'Principal unassigned'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Curriculum:</span>
                              <span className="font-bold text-purple-700 dark:text-purple-300">
                                {school.curriculum_type || 'CAPS (DBE)'} ({school.grade_range || 'Grades 8 - 12'})
                              </span>
                            </div>
                          </div>

                          {/* Streams Badges */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-white/10">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                              Academic Streams Offered:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {offeredStreams.map((st, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                                >
                                  {st}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Active Campus Modules Preview with Icons */}
                          <div className="p-3.5 rounded-2xl bg-cyan-500/5 dark:bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-cyan-950 dark:text-cyan-200 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                                <span>Active Modules ({totalActiveMods})</span>
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                                {teacherModIds.length} Staff • {learnerModIds.length} Learner
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {teacherModIds.slice(0, 4).map((modId) => {
                                const Icon = getModuleIcon(modId);
                                const opt = TEACHER_MODULES.find(m => m.id === modId);
                                return (
                                  <span
                                    key={modId}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-surface-dark border border-cyan-500/20 text-slate-800 dark:text-slate-200 shadow-2xs"
                                    title={`Staff Tool: ${opt?.label || modId}`}
                                  >
                                    <Icon className="w-3 h-3 text-cyan-500 shrink-0" />
                                    <span className="truncate max-w-[105px]">{opt?.label || modId}</span>
                                  </span>
                                );
                              })}
                              {learnerModIds.slice(0, 3).map((modId) => {
                                const Icon = getModuleIcon(modId);
                                const opt = LEARNER_MODULES.find(m => m.id === modId);
                                return (
                                  <span
                                    key={modId}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-surface-dark border border-purple-500/20 text-slate-800 dark:text-slate-200 shadow-2xs"
                                    title={`Learner Tool: ${opt?.label || modId}`}
                                  >
                                    <Icon className="w-3 h-3 text-purple-500 shrink-0" />
                                    <span className="truncate max-w-[105px]">{opt?.label || modId}</span>
                                  </span>
                                );
                              })}
                              {totalActiveMods > 7 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSchoolForCurriculum(school);
                                    setSchoolDossierTab('modules');
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:underline cursor-pointer"
                                >
                                  +{totalActiveMods - 7} more
                                </button>
                              )}
                            </div>
                          </div>

                          {/* ========================================================= */}
                          {/* SUBJECTS THIS SCHOOL OFFERS (Crucial Request Implementation) */}
                          {/* ========================================================= */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Offered Subjects ({offeredSubjects.length})</span>
                              </span>
                              {offeredSubjects.length > 6 && (
                                <button
                                  type="button"
                                  onClick={() => toggleSchoolExpand(school.id)}
                                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  <span>{isExpanded ? 'Show Less' : `+${remainingCount} More`}</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>

                            {/* Subjects Pills Grid */}
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                              {displayedSubjects.map((subName, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 shadow-2xs hover:border-indigo-500/40 transition-colors"
                                >
                                  {subName}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="p-4 bg-slate-50 dark:bg-surface-darker border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchoolForCurriculum(school);
                              setSchoolDossierTab('modules');
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Inspect School & Modules</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSchoolById(school.id);
                              onNavigateTab('users');
                            }}
                            className="py-2 px-3 rounded-xl bg-white dark:bg-surface-dark hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Manage School Roster & Users"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Roster</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW MODE 2: COMPACT TILES */}
              {schoolsViewMode === 'compact' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredRegisteredSchools.map((school) => {
                    const offeredSubjects = getSchoolOfferedSubjects(school);
                    const teacherModIds = readModuleList(school.teacher_modules) ?? defaultTeacherModules();
                    const learnerModIds = readModuleList(school.learner_modules) ?? defaultLearnerModules();
                    const totalActiveMods = teacherModIds.length + learnerModIds.length;

                    return (
                      <div
                        key={school.id}
                        onClick={() => {
                          setSelectedSchoolForCurriculum(school);
                          setSchoolDossierTab('modules');
                        }}
                        className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-purple-500/50 transition-all shadow-sm hover:shadow-md cursor-pointer space-y-3 group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                            style={{ backgroundColor: school.primary_color || '#4f46e5' }}
                          >
                            {school.logo_url ? (
                              <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              school.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                              {school.name}
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                              {school.province || 'National'} • {school.circuit || 'General'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200 dark:border-white/10">
                          <span className="font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-500" />
                            {totalActiveMods} Modules
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px]">
                            {offeredSubjects.length} Subjects
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW MODE 3: DETAILED LIST VIEW */}
              {schoolsViewMode === 'list' && (
                <div className="space-y-3">
                  {filteredRegisteredSchools.map((school) => {
                    const offeredSubjects = getSchoolOfferedSubjects(school);
                    const teacherModIds = readModuleList(school.teacher_modules) ?? defaultTeacherModules();
                    const learnerModIds = readModuleList(school.learner_modules) ?? defaultLearnerModules();
                    const totalActiveMods = teacherModIds.length + learnerModIds.length;

                    return (
                      <div
                        key={school.id}
                        className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-purple-500/50 transition-all shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-md"
                            style={{ backgroundColor: school.primary_color || '#4f46e5' }}
                          >
                            {school.logo_url ? (
                              <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                              school.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                                {school.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                Verified
                              </span>
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                EMIS: {school.emis_number || 'N/A'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {school.province || 'National'} • Circuit: {school.circuit || 'General'} • Principal: {school.principal_name || 'Unassigned'}
                            </p>

                            {/* Active modules preview */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-cyan-500" />
                                Modules ({totalActiveMods}):
                              </span>
                              {teacherModIds.slice(0, 3).map((modId) => {
                                const Icon = getModuleIcon(modId);
                                const opt = TEACHER_MODULES.find(m => m.id === modId);
                                return (
                                  <span
                                    key={modId}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 text-cyan-800 dark:text-cyan-200"
                                  >
                                    <Icon className="w-2.5 h-2.5 text-cyan-500" />
                                    <span>{opt?.label || modId}</span>
                                  </span>
                                );
                              })}
                              {learnerModIds.slice(0, 2).map((modId) => {
                                const Icon = getModuleIcon(modId);
                                const opt = LEARNER_MODULES.find(m => m.id === modId);
                                return (
                                  <span
                                    key={modId}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-800 dark:text-purple-200"
                                  >
                                    <Icon className="w-2.5 h-2.5 text-purple-500" />
                                    <span>{opt?.label || modId}</span>
                                  </span>
                                );
                              })}
                              {totalActiveMods > 5 && (
                                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                                  +{totalActiveMods - 5} more
                                </span>
                              )}
                            </div>

                            {/* Offered subjects preview */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Subjects ({offeredSubjects.length}):
                              </span>
                              {offeredSubjects.slice(0, 4).map((sub, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200"
                                >
                                  {sub}
                                </span>
                              ))}
                              {offeredSubjects.length > 4 && (
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                  +{offeredSubjects.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-white/10">
                          <div className="text-right hidden sm:block">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              {school.enrolled_learners_count || 0} Learners
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {school.staff_count || 0} Staff • {school.classes_count || 0} Classes
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSchoolForCurriculum(school);
                                setSchoolDossierTab('modules');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Inspect School & Modules</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSchoolById(school.id);
                                onNavigateTab('users');
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Roster
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        /* ========================================================================= */
        /* SCHOOL ADMIN / PRINCIPAL: SCHOOL CURRICULUM SUBJECTS & GRADE EXPLORATION  */
        /* (Preserved view: school admin sees their own school's curriculum subjects)*/
        /* ========================================================================= */
        <section className="space-y-4 rounded-3xl bg-slate-100 dark:bg-surface-darker border border-slate-300 dark:border-white/10 p-5 sm:p-6 shadow-sm relative overflow-hidden transition-colors">
        
        {/* Section Top Header with Title and View Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>CAPS Curriculum & Academic Subjects</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
              School Subjects Intelligence Hub
            </h2>
          </div>

          {/* Controls: Search & View Mode Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search subject or educator..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all w-44 sm:w-56"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 shadow-sm">
              <button
                type="button"
                onClick={() => handleSetSubjectsViewMode('3d-flow')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  subjectsViewMode === '3d-flow'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="3D Perspective Flow View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">3D Flow</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetSubjectsViewMode('carousel')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  subjectsViewMode === 'carousel'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Carousel View"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Carousel</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetSubjectsViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  subjectsViewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Standard Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Grid</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetSubjectsViewMode('compact')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  subjectsViewMode === 'compact'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Compact Tiles"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Compact</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetSubjectsViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  subjectsViewMode === 'list'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">List</span>
              </button>
            </div>

            {/* Carousel navigation controls (visible in carousel mode) */}
            {subjectsViewMode === 'carousel' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollSubjectsCarousel(-1)}
                  className="p-2 rounded-xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollSubjectsCarousel(1)}
                  className="p-2 rounded-xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Grade Exploration Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {grades.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGrade(g.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedGrade === g.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:border-indigo-500/40'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Academic Subject Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500'
                  : 'bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Subject Cards Output Rendering */}
        {filteredSubjects.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Subjects Found</h3>
            <span className="text-xs text-slate-600 dark:text-slate-400">Try adjusting your grade, category, or search filters.</span>
          </div>
        ) : (
          <>
            {/* View Mode: 3D Perspective Flow */}
            {subjectsViewMode === '3d-flow' && (
              <Subject3DCoverFlow
                subjects={filteredSubjects}
                role="principal"
                onOpenSubject={(sub) => setViewMoreSubject(sub)}
                onAction={(action, sub) => {
                  if (action === 'marks') {
                    onNavigateTab('marks', { subject: sub.name, grade: sub.grade });
                  } else if (action === 'reports') {
                    onNavigateTab('reports', { subject: sub.name, grade: sub.grade });
                  } else {
                    setViewMoreSubject(sub);
                  }
                }}
                title="School Subjects 3D Intelligence Flow"
                subtitle={`Interactive 3D Perspective Review for ${currentSchool?.name || 'Academic Network'} • Tap Expand to inspect educator allocation and curriculum metrics.`}
              />
            )}

            {/* View Mode 1: Horizontal Carousel */}
            {subjectsViewMode === 'carousel' && (
              <div
                ref={subjectsCarouselRef}
                className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin custom-scrollbar snap-x snap-mandatory scroll-smooth"
              >
                {filteredSubjects.map((sub) => {
                  const coverImage = getSubjectCoverImage(sub.name);
                  return (
                    <div
                      key={sub.id}
                      className="min-w-[320px] max-w-[350px] shrink-0 snap-start rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-indigo-500/50 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group overflow-hidden animated-border-card"
                    >
                      {/* Subject Background Picture Banner */}
                      <div className="relative h-32 w-full overflow-hidden bg-slate-900">
                        <img
                          src={coverImage}
                          alt={sub.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-600 text-white shadow-sm">
                              Grade {sub.grade}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
                              {sub.stream}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 backdrop-blur-md">
                            <Users className="w-3 h-3 text-emerald-400" />
                            {sub.learner_count > 0 ? sub.learner_count : '—'}
                          </span>
                        </div>

                        {/* Bottom Banner Title */}
                        <div className="absolute bottom-2 inset-x-3">
                          <h3
                            onClick={() => setViewMoreSubject(sub)}
                            className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors cursor-pointer truncate drop-shadow-md"
                            title={`Inspect ${sub.name}`}
                          >
                            {sub.name}
                          </h3>
                          <p className="text-[11px] text-slate-200 font-medium truncate">
                            {sub.teacher_name || 'Educator not assigned'}
                          </p>
                        </div>
                      </div>

                      {/* Card Content & Quick Actions */}
                      <div className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
                            {sub.code}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${sub.pass_rate == null ? 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/15' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30'}`}>
                            {sub.pass_rate == null ? 'No marks yet' : `${sub.pass_rate}% Pass Rate`}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => onNavigateTab('marks', { subject: sub.name, grade: sub.grade })}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            title={`Marks Audit for ${sub.name}`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Marks</span>
                          </button>
                          <button
                            onClick={() => onNavigateTab('reports', { subject: sub.name, grade: sub.grade })}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            title={`Report Cards for ${sub.name}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>Reports</span>
                          </button>
                        </div>

                        {/* View More Button */}
                        <div className="pt-2 border-t border-slate-300 dark:border-white/10 flex items-center justify-between">
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            Avg Mark: <strong className="text-slate-900 dark:text-white font-bold">{sub.average_mark == null ? 'No marks yet' : `${sub.average_mark}%`}</strong>
                          </span>
                          <button
                            onClick={() => setViewMoreSubject(sub)}
                            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer hover:underline"
                            title="View more modules & tools for this subject"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-500" />
                            <span>View More</span>
                            <ChevronRight className="w-3 h-3 text-cyan-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* View Mode 2: Standard Responsive Grid */}
            {subjectsViewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSubjects.map((sub) => {
                  const coverImage = getSubjectCoverImage(sub.name);
                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-indigo-500/50 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group overflow-hidden animated-border-card"
                    >
                      {/* Subject Background Picture Banner */}
                      <div className="relative h-32 w-full overflow-hidden bg-slate-900">
                        <img
                          src={coverImage}
                          alt={sub.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-600 text-white shadow-sm">
                              Grade {sub.grade}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
                              {sub.stream}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 backdrop-blur-md">
                            <Users className="w-3 h-3 text-emerald-400" />
                            {sub.learner_count > 0 ? sub.learner_count : '—'}
                          </span>
                        </div>

                        {/* Bottom Banner Title */}
                        <div className="absolute bottom-2 inset-x-3">
                          <h3
                            onClick={() => setViewMoreSubject(sub)}
                            className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors cursor-pointer truncate drop-shadow-md"
                            title={`Inspect ${sub.name}`}
                          >
                            {sub.name}
                          </h3>
                          <p className="text-[11px] text-slate-200 font-medium truncate">
                            {sub.teacher_name || 'Educator not assigned'}
                          </p>
                        </div>
                      </div>

                      {/* Card Content & Quick Actions */}
                      <div className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
                            {sub.code}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${sub.pass_rate == null ? 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/15' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30'}`}>
                            {sub.pass_rate == null ? 'No marks yet' : `${sub.pass_rate}% Pass Rate`}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => onNavigateTab('marks', { subject: sub.name, grade: sub.grade })}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            title={`Marks Audit for ${sub.name}`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Marks</span>
                          </button>
                          <button
                            onClick={() => onNavigateTab('reports', { subject: sub.name, grade: sub.grade })}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            title={`Report Cards for ${sub.name}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>Reports</span>
                          </button>
                        </div>

                        {/* View More Button */}
                        <div className="pt-2 border-t border-slate-300 dark:border-white/10 flex items-center justify-between">
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            Avg Mark: <strong className="text-slate-900 dark:text-white font-bold">{sub.average_mark == null ? 'No marks yet' : `${sub.average_mark}%`}</strong>
                          </span>
                          <button
                            onClick={() => setViewMoreSubject(sub)}
                            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer hover:underline"
                            title="View more modules & tools for this subject"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-500" />
                            <span>View More</span>
                            <ChevronRight className="w-3 h-3 text-cyan-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* View Mode 3: Compact Tiles */}
            {subjectsViewMode === 'compact' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredSubjects.map((sub) => {
                  const coverImage = getSubjectCoverImage(sub.name);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setViewMoreSubject(sub)}
                      className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-indigo-500/50 transition-all shadow-sm hover:shadow-md cursor-pointer group overflow-hidden flex flex-col justify-between animated-border-card"
                    >
                      <div className="relative h-20 w-full overflow-hidden bg-slate-900">
                        <img
                          src={coverImage}
                          alt={sub.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                          Gr {sub.grade}
                        </span>
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-emerald-300 border border-emerald-500/30">
                          {sub.pass_rate == null ? 'No marks' : `${sub.pass_rate}%`}
                        </span>
                      </div>

                      <div className="p-2.5 space-y-1.5 text-center">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-cyan-300 transition-colors">
                          {sub.name}
                        </h4>
                        <div className="flex items-center justify-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">
                          <Eye className="w-3 h-3" />
                          <span>View More</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* View Mode 4: List View */}
            {subjectsViewMode === 'list' && (
              <div className="space-y-2">
                {filteredSubjects.map((sub) => {
                  const coverImage = getSubjectCoverImage(sub.name);
                  return (
                    <div
                      key={sub.id}
                      className="p-3 sm:px-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-indigo-500/50 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 group animated-border-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative bg-slate-900">
                          <img
                            src={coverImage}
                            alt={sub.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white">
                              Grade {sub.grade}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                              {sub.code}
                            </span>
                            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 dark:bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">
                              {sub.stream}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {sub.name}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                            Educator: <span className="font-semibold text-slate-900 dark:text-white">{sub.teacher_name || 'Educator not assigned'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-300 dark:border-white/10">
                        <div className="text-right hidden md:block">
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{sub.learner_count > 0 ? sub.learner_count : '—'} Learners</span>
                          </div>
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {sub.pass_rate == null ? 'No marks yet' : `${sub.pass_rate}% Pass Rate`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onNavigateTab('marks', { subject: sub.name, grade: sub.grade })}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 transition-all cursor-pointer"
                            title={`Marks Audit for ${sub.name}`}
                          >
                            Marks
                          </button>
                          <button
                            onClick={() => setViewMoreSubject(sub)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            title="Open Subject Operations"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View More</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    )}

      {/* Campus Active Modules for School Admin */}
      {!isSuperAdmin && currentSchool?.id > 0 && (
        <div className="space-y-4">
          <SchoolModulePreferences
            school={currentSchool}
            onSaved={refreshSchools}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FAVORITE MODULES SECTION (QUICK ACCESS FOR ADMIN)                     */}
      {/* ========================================================================= */}
      <FavoriteModulesSection role="admin" onNavigateTab={onNavigateTab} />



      {/* ========================================================================= */}
      {/* 5. ADMIN SUBJECT COMMAND CENTER ("VIEW MORE" MODAL)                       */}
      {/* ========================================================================= */}
      {viewMoreSubject && (
        <Modal
          isOpen={!!viewMoreSubject}
          onClose={() => setViewMoreSubject(null)}
          title={`Subject Control Center • ${viewMoreSubject.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-slate-900 dark:text-white">
            
            {/* Subject Cover Header Banner */}
            <div className="relative h-36 -mt-2 -mx-2 sm:-mx-4 rounded-2xl overflow-hidden bg-slate-900 shadow-md">
              <img
                src={getSubjectCoverImage(viewMoreSubject.name)}
                alt={viewMoreSubject.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />

              <div className="absolute top-3 inset-x-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-md">
                    Grade {viewMoreSubject.grade}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-black/60 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
                    {viewMoreSubject.stream}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-black/60 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                  {viewMoreSubject.code}
                </span>
              </div>

              <div className="absolute bottom-3 inset-x-4 flex items-end justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">
                    {viewMoreSubject.name}
                  </h3>
                  <p className="text-xs text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Lead Educator: {viewMoreSubject.teacher_name || 'Educator not assigned'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-400 font-bold block">
                    {viewMoreSubject.pass_rate == null ? 'No marks yet' : `${viewMoreSubject.pass_rate}% Pass Rate`}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {viewMoreSubject.learner_count > 0 ? `${viewMoreSubject.learner_count} Learners` : 'Enrolment not recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-center">
                <span className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold">Total Enrolled</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{viewMoreSubject.learner_count > 0 ? `${viewMoreSubject.learner_count} Students` : '—'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-center">
                <span className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold">Class Average</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{viewMoreSubject.average_mark == null ? 'No marks yet' : `${viewMoreSubject.average_mark}%`}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-center">
                <span className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold">CAPS Status</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{viewMoreSubject.status}</span>
              </div>
            </div>

            {/* Administrative Subject Operations Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Administrative Operations & Departmental Tools
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                
                {/* 1. Marks & Assessment Audits */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewMoreSubject;
                    setViewMoreSubject(null);
                    onNavigateTab('marks', { subject: target.name, grade: target.grade });
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors block truncate">
                    CAPS Marks & SBA Audits
                  </span>
                </button>

                {/* 2. Official Report Card Studio */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewMoreSubject;
                    setViewMoreSubject(null);
                    onNavigateTab('reports', { subject: target.name, grade: target.grade });
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors block truncate">
                    Report Card Studio
                  </span>
                </button>

                {/* 3. School Curriculum & Subject Registers */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewMoreSubject;
                    setViewMoreSubject(null);
                    onNavigateTab('subjects', { subject: target.name, grade: target.grade });
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-cyan-500/50 hover:bg-cyan-50/50 dark:hover:bg-cyan-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors block truncate">
                    Curriculum Registers & Roster
                  </span>
                </button>

                {/* 4. Master Timetable Allocation */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewMoreSubject;
                    setViewMoreSubject(null);
                    onNavigateTab('timetable', { subject: target.name, grade: target.grade });
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-sky-500/50 hover:bg-sky-50/50 dark:hover:bg-sky-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors block truncate">
                    Master Timetable Allocation
                  </span>
                </button>

                {/* 5. Textbook Asset Tracker */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewMoreSubject;
                    setViewMoreSubject(null);
                    onNavigateTab('textbooks', { subject: target.name, grade: target.grade });
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-teal-500/50 hover:bg-teal-50/50 dark:hover:bg-teal-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors block truncate">
                    Textbook Asset Inventory
                  </span>
                </button>

                {/* 6. Examination Seating Planner */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewMoreSubject;
                    setViewMoreSubject(null);
                    onNavigateTab('exam-seating', { subject: target.name, grade: target.grade });
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors block truncate">
                    Exam Seating Planner
                  </span>
                </button>

                {/* 7. Matric Candidate Pass Rate Projector (for FET grades) */}
                {viewMoreSubject.grade >= 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewMoreSubject;
                      setViewMoreSubject(null);
                      onNavigateTab('matric-projector', { subject: target.name });
                    }}
                    className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-pink-500/50 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-300 transition-colors block truncate">
                      Matric Pass Rate Projector
                    </span>
                  </button>
                )}

                {/* 8. Educator Leave & Relief Manager */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewMoreSubject;
                    setViewMoreSubject(null);
                    onNavigateTab('leave-relief', { subject: target.name, grade: target.grade });
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors block truncate">
                    Educator Relief Duty
                  </span>
                </button>

                {/* 9. Inter-School Academic Olympiads */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewMoreSubject;
                    setViewMoreSubject(null);
                    onNavigateTab('inter-school', { subject: target.name });
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors block truncate">
                    Academic Olympiads
                  </span>
                </button>

                {/* 10. Parent Consultations Schedule */}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewMoreSubject;
                    setViewMoreSubject(null);
                    onNavigateTab('consultations', { subject: target.name, grade: target.grade });
                  }}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 hover:border-violet-500/50 hover:bg-violet-50/50 dark:hover:bg-violet-500/10 transition-all cursor-pointer shadow-sm flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors block truncate">
                    Parent Consultations
                  </span>
                </button>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setViewMoreSubject(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close Control Center
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 6. GELEZA SA ACCREDITED SCHOOL DOSSIER, MODULES & CURRICULUM MODAL         */}
      {/* ========================================================================= */}
      {selectedSchoolForCurriculum && (
        <Modal
          isOpen={!!selectedSchoolForCurriculum}
          onClose={() => setSelectedSchoolForCurriculum(null)}
          title={`Campus Dossier & Modules • ${selectedSchoolForCurriculum.name}`}
          maxWidth="4xl"
        >
          {(() => {
            const school = selectedSchoolForCurriculum;
            const allSubjects = getSchoolOfferedSubjects(school);
            const allStreams = getSchoolOfferedStreams(school);
            const allLanguages = getSchoolOfferedLanguages(school);
            const categorized = categorizeSchoolSubjects(allSubjects);

            const teacherModIds = readModuleList(school.teacher_modules) ?? defaultTeacherModules();
            const learnerModIds = readModuleList(school.learner_modules) ?? defaultLearnerModules();
            const activeTeacherModules = TEACHER_MODULES.filter(m => teacherModIds.includes(m.id));
            const receivedByLearners = modulesReceivedByLearners(teacherModIds);
            const activeLearnerOnlyModules = LEARNER_CHOICE_MODULES.filter(m => learnerModIds.includes(m.id));
            const totalActiveModules = activeTeacherModules.length + activeLearnerOnlyModules.length;

            return (
              <div className="space-y-6 text-slate-900 dark:text-white">
                {/* Header Brand Bar */}
                <div
                  className="p-5 -mt-2 -mx-2 sm:-mx-4 rounded-2xl relative overflow-hidden border border-slate-200 dark:border-white/10"
                  style={{
                    background: `linear-gradient(135deg, ${school.primary_color || '#4f46e5'}25 0%, ${school.secondary_color || '#06b6d4'}15 100%)`
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-md shrink-0 border border-white/20 overflow-hidden"
                        style={{ backgroundColor: school.primary_color || '#4f46e5' }}
                      >
                        {school.logo_url ? (
                          <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{school.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {school.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            Accredited Partner
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                          {school.motto || 'Excellence in Education'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {school.province || 'National'} • Circuit: {school.circuit || 'General'} • EMIS: <span className="font-mono">{school.emis_number || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">Enrolled Learners</span>
                      <span className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
                        {school.enrolled_learners_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Nav Tabs */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setSchoolDossierTab('modules')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      schoolDossierTab === 'modules'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Active Modules ({totalActiveModules})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchoolDossierTab('subjects')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      schoolDossierTab === 'subjects'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Curriculum & Subjects ({allSubjects.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchoolDossierTab('configure')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      schoolDossierTab === 'configure'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-white'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Configure Modules</span>
                  </button>
                </div>

                {/* TAB 1: ACTIVE CAMPUS MODULES ACCORDING TO WHAT THIS SCHOOL HAS SELECTED */}
                {schoolDossierTab === 'modules' && (
                  <div className="space-y-6">
                    {/* Notice bar */}
                    <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Active Tools for {school.name}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            Only these modules with their icons are activated and accessible to staff and learners for this specific campus.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSchoolDossierTab('configure')}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Customize Modules</span>
                      </button>
                    </div>

                    {/* Section 1: Modules for Teachers */}
                    <div className="space-y-3">
                      <div className="pb-1 border-b border-slate-200 dark:border-white/10">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4 h-4 text-cyan-500" />
                          <span>Modules for Teachers ({activeTeacherModules.length} Active)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Attendance, conduct, leave, parent meetings, and the lesson studio stay with teachers. When teachers send marks, homework, notices, or a timetable, learners receive that automatically.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {activeTeacherModules.map((mod) => {
                          const Icon = mod.icon || getModuleIcon(mod.id);
                          return (
                            <div
                              key={mod.id}
                              className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs hover:border-cyan-500/40 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {mod.label}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>Active</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 2: Learners receive these */}
                    <div className="space-y-3 pt-2">
                      <div className="pb-1 border-b border-slate-200 dark:border-white/10">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span>Learners receive these ({receivedByLearners.length})</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          These are on because the matching teacher module is on. They are not a separate choice.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {receivedByLearners.map((mod) => {
                          const Icon = mod.icon || getModuleIcon(mod.id);
                          return (
                            <span
                              key={mod.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-800 dark:text-purple-200 border border-purple-500/30"
                            >
                              <Icon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>{mod.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 3: Modules for learners only */}
                    <div className="space-y-3 pt-2">
                      <div className="pb-1 border-b border-slate-200 dark:border-white/10">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>Modules for learners only ({activeLearnerOnlyModules.length} Active)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          These are learner tools. They do not open teacher marksheets, attendance, or other staff work. Home, subjects, profile, and settings stay on.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {activeLearnerOnlyModules.map((mod) => {
                          const Icon = mod.icon || getModuleIcon(mod.id);
                          return (
                            <div
                              key={mod.id}
                              className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-500/40 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {mod.label}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                                <Check className="w-3 h-3 text-amber-500" />
                                <span>Learner Active</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CURRICULUM & OFFERED SUBJECTS */}
                {schoolDossierTab === 'subjects' && (
                  <div className="space-y-6">
                    {/* Institutional & Curriculum Metadata */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Curriculum Framework</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {school.curriculum_type || 'CAPS (DBE)'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Grade Range</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {school.grade_range || 'Grades 8 - 12'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Principal / Lead</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {school.principal_name || 'Unassigned'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Total Subjects</span>
                        <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                          {allSubjects.length} Registered
                        </span>
                      </div>
                    </div>

                    {/* Offered Academic Streams */}
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-500" />
                        <span>Academic Streams Offered by {school.name}</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {allStreams.map((stream, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                            <span>{stream}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Categorized Offered Subjects */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-white/10">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Subjects Taught at this Campus ({allSubjects.length})</span>
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          DBE / CAPS Compliant
                        </span>
                      </div>

                      <div className="space-y-4 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                        {Object.entries(categorized).map(([catName, subs]) => {
                          if (subs.length === 0) return null;
                          return (
                            <div key={catName} className="space-y-2">
                              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                <span>{catName}</span>
                                <span className="text-[10px] text-slate-500 font-normal">({subs.length})</span>
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {subs.map((sub, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-darker border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 shadow-2xs"
                                  >
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {sub}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shrink-0">
                                      CAPS Gr {school.grade_range || '8-12'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Languages of Instruction */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Languages of Learning and Teaching (LOLT) & Additional Languages</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {allLanguages.map((lang, lIdx) => (
                          <span
                            key={lIdx}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: CONFIGURE MODULES FOR THIS SCHOOL */}
                {schoolDossierTab === 'configure' && (
                  <div className="space-y-4">
                    <SchoolModulePreferences
                      school={school}
                      onSaved={async () => {
                        await handleRefreshSchools();
                        const updated = schoolsList.find(s => s.id === school.id);
                        if (updated) setSelectedSchoolForCurriculum(updated);
                      }}
                    />
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSchoolById(school.id);
                        setSelectedSchoolForCurriculum(null);
                        onNavigateTab('users');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Switch Context to {school.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchoolForCurriculum(null);
                        onNavigateTab('command-center');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Command Center</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSchoolForCurriculum(null)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs transition-colors cursor-pointer self-end sm:self-auto"
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

    </div>
  );
};
