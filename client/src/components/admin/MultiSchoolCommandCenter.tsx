import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  DollarSign,
  TrendingUp,
  Award,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  MapPin
} from 'lucide-react';
import { commandCenterService } from '../../services/api';
import { useSchool } from '../../context/SchoolContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';

interface SchoolStat {
  id: number;
  name: string;
  slug: string;
  circuit: string;
  district: string;
  province: string;
  emis_number: string;
  principal_name: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  motto: string;
  learners_count: number;
  staff_count: number;
  classes_count: number;
  parents_count: number;
  total_invoiced: string;
  total_collected: string;
  avg_attendance_pct: string;
  subadmins: Array<{ id: number; name: string; email: string; phone: string }>;
}

interface MacroTotals {
  total_schools: number;
  total_learners: number;
  total_staff: number;
  total_classes: number;
  total_invoiced: number;
  total_collected: number;
  collection_rate_pct: number;
}

export const MultiSchoolCommandCenter: React.FC = () => {
  const { currentSchool, setSchoolBySlug } = useSchool();
  const [macroTotals, setMacroTotals] = useState<MacroTotals | null>(null);
  const [schools, setSchools] = useState<SchoolStat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCircuit, setSelectedCircuit] = useState<string>('all');

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await commandCenterService.getCommandCenterStats();
      if (res.success) {
        setMacroTotals(res.macro_totals);
        setSchools(res.schools || []);
      }
    } catch (err: any) {
      console.error('Failed to load multi-school command center:', err);
      setError(err.response?.data?.error || err.message || 'Failed to retrieve multi-school analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const circuits = Array.from(new Set(schools.map(s => s.circuit).filter(Boolean)));

  const filteredSchools = schools.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.circuit || '').toLowerCase().includes(q) ||
      (s.district || '').toLowerCase().includes(q) ||
      (s.province || '').toLowerCase().includes(q) ||
      (s.principal_name || '').toLowerCase().includes(q);
    const matchesCircuit = selectedCircuit === 'all' || s.circuit === selectedCircuit;
    return matchesSearch && matchesCircuit;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase tracking-wider border border-purple-500/30 flex items-center gap-1">
              <Shield className="w-3 h-3 text-purple-400" />
              Main Executive Admin Hub
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2 mt-1">
            <Building2 className="w-6 h-6 text-brand-400" />
            Multi-School Command Center
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time comparative oversight across all 12 registered high schools in Limpopo & Gauteng provinces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-all border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Data</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Macro System Overview Cards */}
      {macroTotals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/30 via-surface-dark to-surface-dark border border-purple-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-300">Registered Institutions</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-white mt-2">{macroTotals.total_schools}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Active DBE-compliant campuses</span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-900/30 via-surface-dark to-surface-dark border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-300">Total Enrolled Learners</span>
              <GraduationCap className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-white mt-2">{macroTotals.total_learners}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Verified student profiles</span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-900/30 via-surface-dark to-surface-dark border border-brand-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-brand-300">Total Academic Staff</span>
              <Briefcase className="w-4 h-4 text-brand-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-white mt-2">{macroTotals.total_staff}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Educators & staff profiles</span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/30 via-surface-dark to-surface-dark border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300">Total Fee Collections</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-white mt-2">
              R{Number(macroTotals.total_collected).toLocaleString()}
            </p>
            <span className="text-[10px] text-emerald-400/80 mt-1 block">
              {macroTotals.collection_rate_pct}% collection efficiency
            </span>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCircuit('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCircuit === 'all'
                ? 'bg-purple-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Circuits ({schools.length})
          </button>
          {circuits.map(circuit => (
            <button
              key={circuit}
              onClick={() => setSelectedCircuit(circuit)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCircuit === circuit
                  ? 'bg-purple-600 text-white shadow-glow-indigo'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {circuit}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by school name, district, principal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Comparative Schools Table */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl">
        {loading ? (
          <LoadingSpinner text="Retrieving multi-school analytics from PostgreSQL..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">School Institution</th>
                  <th className="pb-3 px-3">Circuit / District</th>
                  <th className="pb-3 px-3 text-center">Learners</th>
                  <th className="pb-3 px-3 text-center">Staff</th>
                  <th className="pb-3 px-3 text-center">Classes</th>
                  <th className="pb-3 px-3 text-center">Avg Attendance</th>
                  <th className="pb-3 px-3">Fee Status (Collected / Invoiced)</th>
                  <th className="pb-3 px-3">Appointed SubAdmins</th>
                  <th className="pb-3 px-3 text-right">Jurisdiction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSchools.map((sch) => {
                  const isCurrent = currentSchool?.id === sch.id;
                  return (
                    <tr
                      key={sch.id}
                      className={`hover:bg-white/5 transition-colors ${
                        isCurrent ? 'bg-purple-500/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          {sch.logo_url ? (
                            <img
                              src={sch.logo_url}
                              alt={sch.name}
                              className="w-8 h-8 rounded-xl object-contain bg-white/5 p-1 border border-white/10 shrink-0"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                              style={{ backgroundColor: sch.primary_color || '#3b82f6' }}
                            >
                              {sch.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-white text-sm flex items-center gap-1.5">
                              {sch.name}
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                                  Current View
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              EMIS: {sch.emis_number || 'Pending'} • Principal: {sch.principal_name || 'Acting'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-200">{sch.circuit || 'Circuit'}</span>
                        <span className="text-slate-500 block text-[10px]">
                          {sch.district || 'District'}, {sch.province || 'Limpopo'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-cyan-400 text-sm">{sch.learners_count}</span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-brand-400 text-sm">{sch.staff_count}</span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono text-slate-300">{sch.classes_count}</span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={
                            Number(sch.avg_attendance_pct) >= 90
                              ? 'emerald'
                              : Number(sch.avg_attendance_pct) >= 80
                              ? 'cyan'
                              : 'amber'
                          }
                          size="sm"
                        >
                          {sch.avg_attendance_pct}%
                        </Badge>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold">
                            R{Number(sch.total_collected).toLocaleString()}
                          </span>
                          <span className="text-slate-500"> / R{Number(sch.total_invoiced).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {sch.subadmins && sch.subadmins.length > 0 ? (
                          <div className="space-y-0.5">
                            {sch.subadmins.map(adm => (
                              <div key={adm.id} className="text-[11px] text-purple-300 font-medium flex items-center gap-1">
                                <Shield className="w-3 h-3 text-purple-400 shrink-0" />
                                <span>{adm.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            Awaiting SubAdmin Appointment
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setSchoolBySlug(sch.slug)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all border border-white/10 flex items-center gap-1.5 ml-auto"
                        >
                          <span>Manage</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSchoolCommandCenter;
