import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Save, FileText, CheckCircle, Search, X, WifiOff } from 'lucide-react';

interface Note {
  id: string;
  subject: string;
  title: string;
  content: string;
  updatedAt: string;
}

interface OfflineNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubject?: string;
}

const STORAGE_KEY = 'fusion_offline_notes';

export const OfflineNotesModal: React.FC<OfflineNotesModalProps> = ({
  isOpen,
  onClose,
  defaultSubject = 'General',
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubject, setActiveSubject] = useState<string>(defaultSubject);
  const [isSaved, setIsSaved] = useState(false);

  // Form State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSubject, setNoteSubject] = useState(defaultSubject);

  // Load from local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Note[] = JSON.parse(raw);
        setNotes(parsed);
        if (parsed.length > 0) {
          setSelectedNote(parsed[0]);
          setNoteTitle(parsed[0].title);
          setNoteContent(parsed[0].content);
          setNoteSubject(parsed[0].subject);
        }
      }
    } catch (e) {
      console.warn('Failed to load offline notes:', e);
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultSubject) {
      setActiveSubject(defaultSubject);
      setNoteSubject(defaultSubject);
    }
  }, [defaultSubject]);

  // Save changes to localStorage
  const handleSaveNote = () => {
    if (!noteTitle.trim()) return;

    let updatedNotes: Note[];
    const now = new Date().toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (selectedNote) {
      updatedNotes = notes.map((n) =>
        n.id === selectedNote.id
          ? { ...n, title: noteTitle, content: noteContent, subject: noteSubject, updatedAt: now }
          : n
      );
    } else {
      const newNote: Note = {
        id: 'note_' + Date.now(),
        title: noteTitle,
        content: noteContent,
        subject: noteSubject || activeSubject,
        updatedAt: now,
      };
      updatedNotes = [newNote, ...notes];
      setSelectedNote(newNote);
    }

    setNotes(updatedNotes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Create new note
  const handleCreateNew = () => {
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteSubject(activeSubject);
  };

  // Delete note
  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = notes.filter((n) => n.id !== id);
    setNotes(filtered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    if (selectedNote?.id === id) {
      if (filtered.length > 0) {
        setSelectedNote(filtered[0]);
        setNoteTitle(filtered[0].title);
        setNoteContent(filtered[0].content);
        setNoteSubject(filtered[0].subject);
      } else {
        handleCreateNew();
      }
    }
  };

  // Select note to view/edit
  const handleSelect = (note: Note) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteSubject(note.subject);
  };

  if (!isOpen) return null;

  const filteredNotes = notes.filter(
    (n) =>
      (n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (activeSubject === 'All' || n.subject.toLowerCase() === activeSubject.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl h-[85vh] bg-surface-dark border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-surface-darker">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-glow-indigo font-black">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-display text-white tracking-wide">
                  Offline Study Notes & Summaries
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <WifiOff className="w-2.5 h-2.5" />
                  Available Offline
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Notes are saved directly to your device and remain accessible anytime without active data.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Note List */}
          <div className="w-72 border-r border-white/10 bg-surface-darker/60 flex flex-col">
            <div className="p-3 border-b border-white/10 space-y-2">
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Note</span>
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search saved notes..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-dark border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Note items list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No notes saved for this subject yet.
                </div>
              ) : (
                filteredNotes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleSelect(n)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all flex items-start justify-between group ${
                      selectedNote?.id === n.id
                        ? 'bg-brand-600/20 border border-brand-500/40 text-white'
                        : 'bg-surface-dark hover:bg-white/5 border border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-brand-300 font-mono">
                          {n.subject}
                        </span>
                        <span className="text-[10px] text-slate-500">{n.updatedAt}</span>
                      </div>
                      <h4 className="text-xs font-bold truncate text-white">{n.title || 'Untitled Note'}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{n.content || 'Empty note content...'}</p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteNote(n.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Editor: Write / Edit Note */}
          <div className="flex-1 flex flex-col p-6 bg-surface-dark">
            <div className="flex items-center justify-between mb-4 gap-4">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note Title (e.g. Calculus Derivatives & Rules)"
                className="flex-1 text-base font-extrabold font-display bg-transparent border-b border-white/10 pb-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={noteSubject}
                  onChange={(e) => setNoteSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-36 text-xs bg-surface-darker border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />

                <button
                  onClick={handleSaveNote}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  {isSaved ? <CheckCircle className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
                  <span>{isSaved ? 'Saved!' : 'Save Note'}</span>
                </button>
              </div>
            </div>

            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your study notes, formulas, lesson summaries, or homework pointers here... (Auto-saved for offline study)"
              className="flex-1 w-full bg-surface-darker rounded-2xl border border-white/10 p-4 text-xs leading-relaxed text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
