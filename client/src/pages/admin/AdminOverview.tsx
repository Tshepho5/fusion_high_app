import React, { useState, useEffect, useRef, useMemo } from 'react';
import { adminService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AdminOverviewSkeleton } from '../../components/admin/AdminOverviewSkeleton';
import { Modal } from '../../components/common/Modal';
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
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

export type SubjectViewMode = 'carousel' | 'grid' | 'compact' | 'list';
export type AdminModuleViewMode = 'grid' | 'compact' | 'list';

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
  average_mark: number;
  pass_rate: number;
  status: string;
}

interface AdminOverviewProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const metricsCarouselRef = useRef<HTMLDivElement>(null);
  const subjectsCarouselRef = useRef<HTMLDivElement>(null);

  // Subject Exploration Controls
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [subjectSearch, setSubjectSearch] = useState<string>('');
  const [subjectsViewMode, setSubjectsViewMode] = useState<SubjectViewMode>(() => {
    return (localStorage.getItem('admin_subjects_view_mode') as SubjectViewMode) || 'grid';
  });

  // Selected Subject for "View More" Command Center Modal
  const [viewMoreSubject, setViewMoreSubject] = useState<SchoolSubjectItem | null>(null);

  // Administrative Modules View Mode
  const [modulesViewMode, setModulesViewMode] = useState<AdminModuleViewMode>(() => {
    return (localStorage.getItem('admin_modules_view_mode') as AdminModuleViewMode) || 'grid';
  });

  const handleSetSubjectsViewMode = (mode: SubjectViewMode) => {
    setSubjectsViewMode(mode);
    try {
      localStorage.setItem('admin_subjects_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleSetModulesViewMode = (mode: AdminModuleViewMode) => {
    setModulesViewMode(mode);
    try {
      localStorage.setItem('admin_modules_view_mode', mode);
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

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      adminService.getOverviewStats(),
      adminService.getSubjectsSummary()
    ])
      .then(([statsRes, subjectsRes]) => {
        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value);
        }
        if (subjectsRes.status === 'fulfilled' && subjectsRes.value?.subjects) {
          setApiSubjects(subjectsRes.value.subjects);
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

    // If API returned real database subjects, update matches or append unique records
    if (apiSubjects && apiSubjects.length > 0) {
      const merged = [...rawList];
      apiSubjects.forEach((apiSub: any) => {
        const foundIdx = merged.findIndex(
          (m) => m.name.toLowerCase() === apiSub.name?.toLowerCase() && Number(m.grade) === Number(apiSub.grade)
        );
        if (foundIdx >= 0) {
          merged[foundIdx] = {
            ...merged[foundIdx],
            learner_count: apiSub.learner_count ?? merged[foundIdx].learner_count,
            teacher_name: apiSub.teacher_name || merged[foundIdx].teacher_name,
            average_mark: apiSub.average_mark ? Number(apiSub.average_mark) : merged[foundIdx].average_mark,
            pass_rate: apiSub.pass_rate ? Number(apiSub.pass_rate) : merged[foundIdx].pass_rate,
            code: apiSub.code || merged[foundIdx].code,
            status: apiSub.status || merged[foundIdx].status
          };
        } else {
          merged.push({
            id: `api-${apiSub.id || apiSub.name}-${apiSub.grade}`,
            name: apiSub.name,
            code: apiSub.code || `CAPS-${apiSub.name.substring(0, 3).toUpperCase()}-G${apiSub.grade}`,
            grade: Number(apiSub.grade) || 10,
            category: 'stem',
            stream: apiSub.stream || 'Curriculum Subject',
            teacher_name: apiSub.teacher_name || 'Department Lead',
            learner_count: apiSub.learner_count || 35,
            average_mark: apiSub.average_mark ? Number(apiSub.average_mark) : 72,
            pass_rate: apiSub.pass_rate ? Number(apiSub.pass_rate) : 88,
            status: apiSub.status || 'Active'
          });
        }
      });
      return merged;
    }

    return rawList;
  }, [apiSubjects]);

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

  // ADMIN MODULES (ICON + NAME ONLY)
  const isSuperAdmin = !!user?.is_superadmin;

  const adminModules = [
    ...(isSuperAdmin
      ? [{ id: 'command-center', label: 'Multi-School Command', icon: Building2, color: 'text-purple-400 bg-purple-500/20 border-purple-500/40' }]
      : []),
    { id: 'inter-school', label: 'Inter-School Derbies & League', icon: Swords, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'consultations', label: 'Parent-Educator Consultations', icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'subjects', label: 'School Curriculum & Subjects', icon: BookOpen, color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
    { id: 'marks', label: 'CAPS Mark Audits & Report Cards', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
    { id: 'users', label: 'User Directory & Roles', icon: Users, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'finance', label: 'School Fees & Invoicing', icon: CreditCard, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'timetable', label: 'Timetable Allocations', icon: Clock, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
    { id: 'matric-projector', label: 'Matric Pass Rate Projector', icon: TrendingUp, color: 'text-pink-400 bg-pink-500/15 border-pink-500/30' },
    { id: 'leave-relief', label: 'Staff Leave & Relief Duty', icon: Briefcase, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'exam-seating', label: 'Exam Seating Master', icon: Award, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
    { id: 'bursaries', label: 'Tertiary Bursary Engine', icon: GraduationCap, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
    { id: 'textbooks', label: 'Textbook Inventory', icon: HardDrive, color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' },
    { id: 'sports', label: 'Sports & Extracurriculars', icon: Trophy, color: 'text-green-400 bg-green-500/15 border-green-500/30' },
    { id: 'calendar', label: 'School Calendar', icon: Calendar, color: 'text-violet-400 bg-violet-500/15 border-violet-500/30' },
    { id: 'announcements', label: 'Official Broadcasts', icon: Megaphone, color: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30' },
    { id: 'messages', label: 'Communication Hub', icon: ShieldCheck, color: 'text-brand-400 bg-brand-500/15 border-brand-500/30' },
    { id: 'settings', label: 'Technical Settings', icon: Settings, color: 'text-slate-300 bg-slate-700/30 border-slate-600/30' }
  ];

  return (
    <div className="space-y-8 animate-fade-in text-slate-900 dark:text-slate-100 pb-16">

      {/* 1. HORIZONTAL CAROUSEL OF SCHOOL METRIC CARDS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-slate-900 dark:text-white tracking-tight">
              School Performance Metrics
            </h2>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollMetricsCarousel(-1)}
              className="p-2 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollMetricsCarousel(1)}
              className="p-2 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metrics Carousel Container */}
        <div
          ref={metricsCarouselRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin custom-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {metricCards.map((m, idx) => {
            const IconComp = m.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigateTab(m.tab)}
                className="min-w-[270px] max-w-[300px] shrink-0 snap-start rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 p-4 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group space-y-3 cursor-pointer animated-border-card"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{m.title}</span>
                  <div className={`p-2 rounded-xl bg-slate-100 dark:bg-white/5 ${m.color}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{m.value}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{m.sub}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-300">
                  <span className="font-semibold">Manage in {m.title}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SCHOOL CURRICULUM SUBJECTS & GRADE EXPLORATION (NEW ADMIN FEATURE)     */}
      {/* ========================================================================= */}
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
                            {sub.learner_count}
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
                            {sub.teacher_name}
                          </p>
                        </div>
                      </div>

                      {/* Card Content & Quick Actions */}
                      <div className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
                            {sub.code}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/20 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                            {sub.pass_rate}% Pass Rate
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
                            Avg Mark: <strong className="text-slate-900 dark:text-white font-bold">{sub.average_mark}%</strong>
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
                            {sub.learner_count}
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
                            {sub.teacher_name}
                          </p>
                        </div>
                      </div>

                      {/* Card Content & Quick Actions */}
                      <div className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
                            {sub.code}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/20 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                            {sub.pass_rate}% Pass Rate
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
                            Avg Mark: <strong className="text-slate-900 dark:text-white font-bold">{sub.average_mark}%</strong>
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
                          {sub.pass_rate}%
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
                            Educator: <span className="font-semibold text-slate-900 dark:text-white">{sub.teacher_name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-300 dark:border-white/10">
                        <div className="text-right hidden md:block">
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{sub.learner_count} Learners</span>
                          </div>
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {sub.pass_rate}% Pass Rate
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

      {/* ========================================================================= */}
      {/* 3. ADMINISTRATIVE CONTROL SERVICES (MODULES DIRECTORY WITH GRID VIEWS)    */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold font-display text-slate-900 dark:text-white tracking-tight">
              Administrative Control Services
            </h2>
          </div>

          {/* Optional Grid View Selectors */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
            <button
              onClick={() => handleSetModulesViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                modulesViewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Standard Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetModulesViewMode('compact')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                modulesViewMode === 'compact'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Compact App Tiles"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetModulesViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                modulesViewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Mode 1: Standard Grid (Icon + Name) */}
        {modulesViewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {adminModules.map((func) => {
              const IconComp = func.icon;
              return (
                <div
                  key={func.id}
                  onClick={() => onNavigateTab(func.id)}
                  className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-surface-darker transition-all cursor-pointer flex items-center gap-3 shadow-sm group animated-border-card"
                >
                  <div className={`w-10 h-10 rounded-xl ${func.color} border flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors leading-tight">
                    {func.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* View Mode 2: Compact App Tiles */}
        {modulesViewMode === 'compact' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {adminModules.map((func) => {
              const IconComp = func.icon;
              return (
                <div
                  key={func.id}
                  onClick={() => onNavigateTab(func.id)}
                  className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-surface-darker transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 shadow-sm group animated-border-card"
                >
                  <div className={`w-11 h-11 rounded-2xl ${func.color} border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight">
                    {func.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* View Mode 3: List View */}
        {modulesViewMode === 'list' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {adminModules.map((func) => {
              const IconComp = func.icon;
              return (
                <div
                  key={func.id}
                  onClick={() => onNavigateTab(func.id)}
                  className="p-3 px-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-surface-darker transition-all cursor-pointer flex items-center justify-between shadow-sm group animated-border-card"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${func.color} border flex items-center justify-center shrink-0`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {func.label}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. TWO-COLUMN ADMIN LOWER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Timetables & Schedule Engine */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Automated Timetable Generation</span>
              </h3>
              <button
                onClick={() => onNavigateTab('timetable')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Launch Builder
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">Weekly Schedule Engine</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium">Grades 8 - 12</span>
            </div>
          </div>
        </div>

        {/* Right Column: Fees & Financial Invoicing */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-500" />
                <span>School Financials & Fee Invoicing</span>
              </h3>
              <button
                onClick={() => onNavigateTab('finance')}
                className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-semibold cursor-pointer"
              >
                Fee Overview
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-semibold">Tuition & Invoicing</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium">Audit Reconciled</span>
            </div>
          </div>
        </div>

      </div>

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
                    <span>Lead Educator: {viewMoreSubject.teacher_name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-400 font-bold block">
                    {viewMoreSubject.pass_rate}% Pass Rate
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {viewMoreSubject.learner_count} Learners
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-center">
                <span className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold">Total Enrolled</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{viewMoreSubject.learner_count} Students</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-300 dark:border-white/10 text-center">
                <span className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold">Class Average</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{viewMoreSubject.average_mark}%</span>
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
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors block truncate">
                      CAPS Marks & SBA Audits
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Grade {viewMoreSubject.grade} Marksheets</span>
                  </div>
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
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors block truncate">
                      Report Card Studio
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Term 1 - 4 Termly Reports</span>
                  </div>
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
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors block truncate">
                      Curriculum Registers & Roster
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Class Enrollment Records</span>
                  </div>
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
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors block truncate">
                      Master Timetable Allocation
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Periods & Room Scheduling</span>
                  </div>
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
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors block truncate">
                      Textbook Asset Inventory
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Barcode Check-In & Tracking</span>
                  </div>
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
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors block truncate">
                      Exam Seating Planner
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Exam Hall Seating Arranger</span>
                  </div>
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
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-300 transition-colors block truncate">
                        Matric Pass Rate Projector
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Grade 12 Target Forecasting</span>
                    </div>
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
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors block truncate">
                      Educator Relief Duty
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Staff Absence Coverage</span>
                  </div>
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
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors block truncate">
                      Academic Olympiads
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Provincial Derbies & League</span>
                  </div>
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
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors block truncate">
                      Parent Consultations
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Educator Academic Bookings</span>
                  </div>
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

    </div>
  );
};
