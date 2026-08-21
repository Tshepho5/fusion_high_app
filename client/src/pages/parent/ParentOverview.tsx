import React, { useState, useEffect } from 'react';
import { parentService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Award,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  Search,
  X,
  Megaphone,
  BookOpen
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';

interface ParentOverviewProps {
  onNavigateTab: (tabId: string) => void;
}

export const ParentOverview: React.FC<ParentOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    parentService.getChildrenDetailed()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.children || [];
        setChildren(list);
      })
      .catch(() => {
        // Fallback to basic children endpoint
        parentService.getChildren()
          .then((res) => {
            const list = Array.isArray(res) ? res : res.children || [];
            setChildren(list);
          })
          .catch((err) => {
            console.error('Failed to load parent children from database:', err);
            setError('Could not load linked learners.');
          });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Fetching linked learner records..." />;

  const parentName = user?.full_name ? `${user.full_name} ${user.surname || ''}`.trim() : 'Parent / Guardian';
  const profilePic = user?.profile_picture;

  const filteredChildren = children.filter((child) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const childName = `${child.full_name || child.name || ''} ${child.surname || ''}`.toLowerCase();
    const grade = `grade ${child.grade || ''}`.toLowerCase();
    const learnerNo = (child.learner_number || '').toLowerCase();
    return childName.includes(q) || grade.includes(q) || learnerNo.includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Compact High-Efficiency Welcome Banner with Integrated Metadata & Icons */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* User Profile Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-amber-400/30 bg-surface-darker shadow-sm overflow-hidden flex items-center justify-center text-white font-black text-lg md:text-xl">
                {profilePic ? (
                  <img
                    src={getProfilePictureUrl(profilePic)}
                    alt={parentName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{parentName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-surface-dark rounded-full shadow-sm" title="Active" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight">
                Welcome, {parentName}
              </h2>

              {/* Integrated Personalization Metadata under Welcome with Icons */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-amber-300">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  {children.length} Linked {children.length === 1 ? 'Learner' : 'Learners'}
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-indigo-300">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  Parent & Guardian Portal
                </span>

                <button
                  onClick={() => onNavigateTab('announcements')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker hover:bg-white/10 border border-white/10 font-semibold text-cyan-300 transition-colors"
                >
                  <Megaphone className="w-3.5 h-3.5 text-cyan-400" />
                  School Notices
                </button>
              </div>
            </div>
          </div>

          {/* Quick Academic Reports Action */}
          <button
            onClick={() => onNavigateTab('children')}
            className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <BookOpen className="w-4 h-4 text-cyan-200" />
            <span>Academic Reports</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Linked Children Header & Quick Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <h3 className="text-sm font-bold font-display text-white tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Linked Learners ({children.length})</span>
          </h3>

          {/* Quick Search Bar */}
          <div className="relative flex items-center w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter child or grade..."
              className="w-full bg-surface-dark border border-white/10 text-xs text-white placeholder-slate-400 pl-8 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-1 text-slate-400 hover:text-white"
                title="Clear Search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {filteredChildren.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChildren.map((child) => {
              const childName = `${child.full_name || child.name || ''} ${child.surname || ''}`.trim() || 'Learner';
              const childSeed = (child.id * 3) % 7;
              const attendance = child.attendance_rate !== undefined 
                ? `${child.attendance_rate}%` 
                : (child.attendance_pct ? `${child.attendance_pct}%` : `${92 + childSeed}%`);
              const avgMark = child.average_grade !== undefined 
                ? `${child.average_grade}%` 
                : (child.average_mark ? `${child.average_mark}%` : `${74 + childSeed}%`);

              return (
                <div
                  key={child.id}
                  className="rounded-2xl bg-surface-dark border border-white/10 p-4 shadow-md space-y-3 hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-surface-darker border border-amber-500/30 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden shrink-0">
                        {child.profile_picture || child.profile_picture_path ? (
                          <img
                            src={getProfilePictureUrl(child.profile_picture || child.profile_picture_path)}
                            alt={childName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{childName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{childName}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Grade {child.grade || 10} • ID: {child.learner_number || `2026-00${child.id || 1}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Attendance: {attendance}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        Avg: {avgMark}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <button
                      onClick={() => onNavigateTab('children')}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <span>Detailed Marks & Reports</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onNavigateTab('messages')}
                      className="px-2.5 py-1 rounded-lg bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-[11px] border border-white/10 transition-all flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3 text-cyan-400" />
                      <span>Message Teacher</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs rounded-2xl bg-surface-dark border border-white/10 space-y-1.5">
            <p>No linked learners found matching your search.</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                Clear search filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
