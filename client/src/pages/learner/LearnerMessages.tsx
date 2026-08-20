import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { userService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import {
  Search,
  Send,
  CheckCheck,
  MoreVertical,
  Paperclip,
  Smile,
  Sparkles,
  Users,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  MessageSquare,
  ArrowLeft,
  AlertCircle,
  Clock,
  Palette,
  Check
} from 'lucide-react';

const QUICK_RESPONSES = [
  'Good day, thank you for the update!',
  'Please let me know when you are available for a consultation.',
  'I have submitted the required assessment.',
  'Could you please clarify the homework instructions?',
  'Thank you, noted with thanks.',
];

interface ChatColorTheme {
  id: string;
  name: string;
  myBubble: string;
  theirBubble: string;
  chatBg: string;
  accent: string;
  sendBtn: string;
  preview: string;
}

const CHAT_THEMES: ChatColorTheme[] = [
  {
    id: 'emerald',
    name: 'Emerald Green',
    myBubble: 'bg-[#005c4b] text-white',
    theirBubble: 'bg-[#202c33] text-slate-100 border border-white/5',
    chatBg: '#0b141a',
    accent: 'text-emerald-400',
    sendBtn: 'bg-emerald-600 hover:bg-emerald-500',
    preview: 'bg-[#005c4b]'
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    myBubble: 'bg-indigo-600 text-white',
    theirBubble: 'bg-[#181d36] text-slate-100 border border-indigo-500/20',
    chatBg: '#0d1124',
    accent: 'text-indigo-400',
    sendBtn: 'bg-indigo-600 hover:bg-indigo-500',
    preview: 'bg-indigo-600'
  },
  {
    id: 'teal',
    name: 'Ocean Teal',
    myBubble: 'bg-teal-700 text-white',
    theirBubble: 'bg-[#13272e] text-slate-100 border border-teal-500/20',
    chatBg: '#081a24',
    accent: 'text-teal-400',
    sendBtn: 'bg-teal-600 hover:bg-teal-500',
    preview: 'bg-teal-700'
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    myBubble: 'bg-amber-700 text-white',
    theirBubble: 'bg-[#261c14] text-slate-100 border border-amber-500/20',
    chatBg: '#17110c',
    accent: 'text-amber-400',
    sendBtn: 'bg-amber-600 hover:bg-amber-500',
    preview: 'bg-amber-700'
  },
  {
    id: 'rose',
    name: 'Velvet Rose',
    myBubble: 'bg-rose-700 text-white',
    theirBubble: 'bg-[#2b141d] text-slate-100 border border-rose-500/20',
    chatBg: '#170b12',
    accent: 'text-rose-400',
    sendBtn: 'bg-rose-600 hover:bg-rose-500',
    preview: 'bg-rose-700'
  },
  {
    id: 'slate',
    name: 'Clean Slate',
    myBubble: 'bg-slate-700 text-white',
    theirBubble: 'bg-[#1e293b] text-slate-100 border border-white/5',
    chatBg: '#0f172a',
    accent: 'text-cyan-400',
    sendBtn: 'bg-slate-600 hover:bg-slate-500',
    preview: 'bg-slate-700'
  }
];

export const LearnerMessages: React.FC = () => {
  const { user, role } = useAuth();
  const { theme: appTheme } = useTheme();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [conversation, setConversation] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'recent' | 'learners' | 'teachers' | 'parents' | 'admins'>('recent');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickPills, setShowQuickPills] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [chatTheme, setChatTheme] = useState<string>(() => {
    return localStorage.getItem('fusion_chat_theme') || (appTheme === 'navy' ? 'indigo' : appTheme === 'cyberpunk' ? 'rose' : appTheme === 'light' ? 'teal' : 'emerald');
  });

  // Keep chat theme in sync if parent changes dashboard theme
  useEffect(() => {
    const savedChatTheme = localStorage.getItem('fusion_chat_theme');
    if (!savedChatTheme) {
      if (appTheme === 'navy') setChatTheme('indigo');
      else if (appTheme === 'cyberpunk') setChatTheme('rose');
      else if (appTheme === 'light') setChatTheme('teal');
      else setChatTheme('emerald');
    }
  }, [appTheme]);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Scoped internal scroll: ONLY scrolls the inner messages container, NEVER the window or page
  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  const fetchContacts = () => {
    userService.getContacts()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.contacts || [];
        // Deduplicate contacts strictly by ID
        const uniqueContacts = list.filter(
          (c: any, index: number, self: any[]) => index === self.findIndex((o: any) => o.id === c.id)
        );
        setContacts(uniqueContacts);
        if (uniqueContacts.length > 0 && !selectedContact) {
          const firstWithActivity = uniqueContacts.find((c: any) => c.last_message || c.last_activity) || uniqueContacts[0];
          setSelectedContact(firstWithActivity);
        }
      })
      .catch((err) => {
        console.error('Failed to load communication contacts:', err);
        setError('Could not connect to messaging service.');
        setContacts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversation = (contactId: number) => {
    userService.getConversation(contactId)
      .then((res) => {
        const msgs = Array.isArray(res) ? res : res.messages || [];
        // Deduplicate messages strictly by ID
        const uniqueMsgs = msgs.filter(
          (m: any, index: number, self: any[]) => index === self.findIndex((o: any) => o.id === m.id)
        );
        setConversation(uniqueMsgs);
        setTimeout(() => scrollToBottom(false), 50);
      })
      .catch((err) => {
        console.error('Failed to load conversation:', err);
      });
  };

  useEffect(() => {
    if (selectedContact?.id) {
      fetchConversation(selectedContact.id);
      const interval = setInterval(() => {
        if (selectedContact?.id) {
          fetchConversation(selectedContact.id);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedContact?.id]);

  const handleSendMessage = async (e?: React.FormEvent, customBody?: string) => {
    if (e) e.preventDefault();
    const textToSend = customBody || inputText;
    if (!textToSend.trim() || !selectedContact?.id || sending) return;

    setSending(true);
    const tempMsg = {
      id: Date.now(),
      sender_id: user?.id,
      recipient_id: selectedContact.id,
      body: textToSend.trim(),
      created_at: new Date().toISOString(),
      is_me: true
    };

    setConversation(prev => [...prev, tempMsg]);
    if (!customBody) setInputText('');
    setTimeout(() => scrollToBottom(true), 50);

    try {
      await userService.sendMessage({
        recipient_id: selectedContact.id,
        body: textToSend.trim(),
        subject: `Message to ${selectedContact.full_name || 'User'}`
      });
      fetchConversation(selectedContact.id);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleSelectTheme = (themeId: string) => {
    setChatTheme(themeId);
    localStorage.setItem('fusion_chat_theme', themeId);
    setShowColorMenu(false);
  };

  const activeThemeObj = CHAT_THEMES.find(t => t.id === chatTheme) || CHAT_THEMES[0];

  if (loading) return <LoadingSpinner text="Opening Teacher Chat..." />;

  const recentChats = contacts.filter(c => c.last_message || c.last_activity);
  const learnerContacts = contacts.filter(c => (c.role_name || c.role || '').toLowerCase() === 'learner');
  const teacherContacts = contacts.filter(c => (c.role_name || c.role || '').toLowerCase() === 'teacher');
  const parentContacts = contacts.filter(c => (c.role_name || c.role || '').toLowerCase() === 'parent');
  const adminContacts = contacts.filter(c => (c.role_name || c.role || '').toLowerCase() === 'admin');

  const getDisplayedContacts = () => {
    let baseList: any[] = [];
    switch (activeCategory) {
      case 'recent':
        baseList = recentChats.length > 0 ? recentChats : contacts;
        break;
      case 'teachers':
        baseList = teacherContacts;
        break;
      case 'learners':
        baseList = learnerContacts;
        break;
      case 'parents':
        baseList = parentContacts;
        break;
      case 'admins':
        baseList = adminContacts;
        break;
      default:
        baseList = contacts;
    }

    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase();
    return baseList.filter((c: any) =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.surname || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.role_name || c.role || '').toLowerCase().includes(q) ||
      (c.tag_name || '').toLowerCase().includes(q)
    );
  };

  const displayedContacts = getDisplayedContacts();

  const getContactRoleBadge = (contact: any) => {
    const r = (contact.role_name || contact.role || '').toLowerCase();
    if (r === 'admin') return <Badge variant="rose" size="sm">Admin</Badge>;
    if (r === 'teacher') return <Badge variant="cyan" size="sm">Teacher</Badge>;
    if (r === 'parent') return <Badge variant="amber" size="sm">Parent</Badge>;
    return <Badge variant="indigo" size="sm">Learner</Badge>;
  };

  const handleCategoryChange = (category: typeof activeCategory) => {
    setActiveCategory(category);
    let listForCategory: any[] = [];
    switch (category) {
      case 'recent': listForCategory = recentChats.length > 0 ? recentChats : contacts; break;
      case 'teachers': listForCategory = teacherContacts; break;
      case 'learners': listForCategory = learnerContacts; break;
      case 'parents': listForCategory = parentContacts; break;
      case 'admins': listForCategory = adminContacts; break;
    }
    if (listForCategory.length > 0) {
      const match = listForCategory.find(c => c.id === selectedContact?.id) || listForCategory[0];
      setSelectedContact(match);
      fetchConversation(match.id);
    }
  };

  // Dynamic Theme Styling Variables based on Dashboard App Theme
  const isLight = appTheme === 'light';
  const isNavy = appTheme === 'navy';
  const isCyber = appTheme === 'cyberpunk';

  const containerBg = isLight
    ? 'bg-white border-slate-200 shadow-xl'
    : isNavy
    ? 'bg-[#0a1936] border-blue-500/20'
    : isCyber
    ? 'bg-[#0e0e24] border-cyan-500/25'
    : 'bg-[#111b21] border-white/10';

  const sidebarBg = isLight
    ? 'bg-slate-50 border-slate-200'
    : isNavy
    ? 'bg-[#0c1e40] border-blue-500/20'
    : isCyber
    ? 'bg-[#12122d] border-cyan-500/20'
    : 'bg-[#111b21] border-white/5';

  const headerBg = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-900'
    : isNavy
    ? 'bg-[#11244d] border-blue-500/20 text-white'
    : isCyber
    ? 'bg-[#1a1a3e] border-cyan-500/20 text-white'
    : 'bg-[#202c33] border-white/5 text-white';

  const searchBoxBg = isLight
    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
    : isNavy
    ? 'bg-[#0a1936] border-blue-500/30 text-white placeholder-blue-300'
    : isCyber
    ? 'bg-[#0a0a1f] border-cyan-500/30 text-white placeholder-purple-300'
    : 'bg-[#202c33] border-transparent text-white placeholder-slate-400';

  const chatActualBg = isLight ? '#f8fafc' : activeThemeObj.chatBg;
  const theirBubbleStyle = isLight
    ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
    : activeThemeObj.theirBubble;
  const myBubbleStyle = activeThemeObj.myBubble;

  const composerBg = isLight
    ? 'bg-slate-100 border-slate-200'
    : isNavy
    ? 'bg-[#11244d] border-blue-500/20'
    : isCyber
    ? 'bg-[#1a1a3e] border-cyan-500/20'
    : 'bg-[#202c33] border-white/5';

  const composerInputBg = isLight
    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-brand-500'
    : isNavy
    ? 'bg-[#0a1936] border border-blue-500/30 text-white placeholder-blue-300'
    : isCyber
    ? 'bg-[#0a0a1f] border border-cyan-500/30 text-white placeholder-purple-300'
    : 'bg-[#2a3942] border-transparent text-white placeholder-slate-400';

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className={`p-4 rounded-2xl ${containerBg} border flex items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center text-white shadow-sm">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-extrabold font-display ${isLight ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
              Teacher Chat & Communication Hub
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                Active Theme: {appTheme.toUpperCase()}
              </span>
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              One school, one connection — instant direct communication with teachers, parents, and learners.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
            Live Messaging
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Messaging Container */}
      <div className={`grid grid-cols-1 md:grid-cols-12 rounded-3xl ${containerBg} border overflow-hidden shadow-2xl h-[calc(100vh-250px)] min-h-[550px]`}>
        
        {/* Left Contacts Sidebar */}
        <div className={`md:col-span-5 lg:col-span-4 ${sidebarBg} border-r flex flex-col h-full overflow-hidden ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header & Categories */}
          <div className={`p-4 ${headerBg} border-b space-y-3 shrink-0`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
                <span>Conversations</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isLight ? 'bg-slate-200 text-slate-800' : 'bg-white/10 text-white'}`}>
                  {contacts.length}
                </span>
              </h3>
            </div>

            {/* Category Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <button
                onClick={() => handleCategoryChange('recent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'recent'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:text-slate-900'
                    : 'bg-[#202c33] text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Recent</span>
                {recentChats.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'recent' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {recentChats.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleCategoryChange('teachers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'teachers'
                    ? 'bg-cyan-600 text-white shadow-sm font-bold'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:text-slate-900'
                    : 'bg-[#202c33] text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Staff</span>
                {teacherContacts.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'teachers' ? 'bg-white/20 text-white' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {teacherContacts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleCategoryChange('learners')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'learners'
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:text-slate-900'
                    : 'bg-[#202c33] text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Learners</span>
                {learnerContacts.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'learners' ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {learnerContacts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleCategoryChange('parents')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'parents'
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:text-slate-900'
                    : 'bg-[#202c33] text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Parents</span>
                {parentContacts.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'parents' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'}`}>
                    {parentContacts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleCategoryChange('admins')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'admins'
                    ? 'bg-rose-600 text-white shadow-sm font-bold'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:text-slate-900'
                    : 'bg-[#202c33] text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
                {adminContacts.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'admins' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-400'}`}>
                    {adminContacts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-2.5 shrink-0 border-b border-white/5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, role, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs pl-9 pr-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${searchBoxBg}`}
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {displayedContacts.length > 0 ? (
              displayedContacts.map((contact) => {
                const isSelected = selectedContact?.id === contact.id;
                const contactName = `${contact.full_name || contact.name || ''} ${contact.surname || ''}`.trim() || contact.email;
                const initial = (contact.full_name || contact.name || 'U').charAt(0).toUpperCase();
                const lastMsg = contact.last_message || contact.tag_name || `Tap to message ${contact.role_name || contact.role || 'user'}`;

                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact);
                      setShowMobileChat(true);
                      fetchConversation(contact.id);
                    }}
                    className={`flex items-center gap-3 p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? isLight ? 'bg-slate-200 border-l-4 border-emerald-600' : 'bg-[#2a3942] border-l-4 border-emerald-500'
                        : isLight ? 'hover:bg-slate-100' : 'hover:bg-[#202c33]/70'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600/60 to-cyan-500/60 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-white/10">
                        {contact.profile_picture_path ? (
                          <img src={getProfilePictureUrl(contact.profile_picture_path)} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface-dark" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'} truncate`}>
                          {contactName}
                        </p>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {contact.last_activity ? new Date(contact.last_activity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'} truncate pr-2`}>
                          {lastMsg}
                        </p>
                        {getContactRoleBadge(contact)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                <p className="font-semibold text-slate-400">No contacts in this category.</p>
                <p className="text-[11px] text-slate-500 mt-1">Try selecting another tab or search by name.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Active Conversation Panel */}
        <div
          className={`md:col-span-7 lg:col-span-8 flex flex-col h-full overflow-hidden relative ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
          style={{ backgroundColor: chatActualBg }}
        >
          {selectedContact ? (
            <>
              {/* Chat Top Header */}
              <div className={`py-3 px-4 md:px-6 ${headerBg} border-b flex items-center justify-between z-10 shrink-0`}>
                <div className="flex items-center gap-3.5 min-w-0">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="p-1 text-slate-400 hover:text-white md:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-white/10 shrink-0">
                      {selectedContact.profile_picture_path ? (
                        <img src={getProfilePictureUrl(selectedContact.profile_picture_path)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (selectedContact.full_name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-surface-dark" />
                  </div>

                  <div className="min-w-0">
                    <h3 className={`text-xs md:text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'} leading-tight truncate`}>
                      {`${selectedContact.full_name || ''} ${selectedContact.surname || ''}`.trim() || selectedContact.email}
                    </h3>
                    <p className={`text-[10px] ${activeThemeObj.accent} flex items-center gap-1 font-medium mt-0.5`}>
                      <span>Online</span>
                      <span className="text-slate-400">•</span>
                      <span className="capitalize truncate text-slate-400">{selectedContact.tag_name || selectedContact.role || 'Educator'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Theme Color Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowColorMenu(!showColorMenu)}
                      className={`px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                        isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                      }`}
                      title="Change Chat Color Theme"
                    >
                      <Palette className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Color</span>
                    </button>

                    {showColorMenu && (
                      <div className={`absolute right-0 mt-2 w-48 rounded-2xl ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-[#111b21] border-white/10 shadow-2xl'} border p-2 z-50 animate-fade-in text-xs space-y-1`}>
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Chat Color Theme
                        </p>
                        {CHAT_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => handleSelectTheme(theme.id)}
                            className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left transition-all ${
                              chatTheme === theme.id
                                ? isLight ? 'bg-slate-100 text-slate-900 font-bold' : 'bg-white/10 text-white font-bold'
                                : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-3.5 h-3.5 rounded-full ${theme.preview} border border-white/20`} />
                              <span className="text-[11px]">{theme.name}</span>
                            </div>
                            {chatTheme === theme.id && <Check className="w-3 h-3 text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowQuickPills(!showQuickPills)}
                    className={`px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                      isLight ? 'bg-slate-200 text-cyan-700 hover:bg-slate-300' : 'hover:bg-white/5 text-cyan-400'
                    }`}
                    title="Quick Templates"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Templates</span>
                  </button>
                  <button className={`p-1.5 rounded-xl transition-colors ${isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Template Pills */}
              {showQuickPills && (
                <div className={`py-2.5 px-4 ${headerBg} border-b flex gap-2 overflow-x-auto text-xs animate-fade-in shrink-0`}>
                  {QUICK_RESPONSES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(undefined, tmpl)}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] whitespace-nowrap transition-all ${
                        isLight
                          ? 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200'
                          : 'bg-[#202c33] hover:bg-emerald-600/30 hover:border-emerald-500/50 border-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              )}

              {/* Messages Feed View */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto py-4 px-4 md:px-6 space-y-3 relative"
                style={{
                  backgroundImage: isLight
                    ? 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)'
                    : 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }}
              >
                <div className="flex justify-center my-2">
                  <span className={`px-3 py-1 rounded-lg border text-[9px] font-mono uppercase tracking-wider font-semibold shadow-sm ${
                    isLight ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-[#182229] border-white/5 text-slate-400'
                  }`}>
                    Today • Encrypted School Channel
                  </span>
                </div>

                {conversation.length > 0 ? (
                  conversation.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.id || msg.is_me;
                    const timeStr = msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-[65%] py-2.5 px-3.5 md:py-3 md:px-4 text-xs relative shadow-md ${
                            isMe
                              ? `${myBubbleStyle} rounded-2xl rounded-tr-none`
                              : `${theirBubbleStyle} rounded-2xl rounded-tl-none`
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap break-words text-xs md:text-sm">
                            {msg.body || msg.content || msg.message}
                          </p>

                          <div className="flex items-center justify-end gap-1 text-[10px] opacity-70 mt-1">
                            <span className="font-mono text-[9px]">{timeStr}</span>
                            {isMe && (
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
                    <MessageSquare className="w-12 h-12 text-slate-500 mb-2 opacity-40" />
                    <p className="font-bold text-slate-400">No messages yet</p>
                    <p className="text-[11px] text-slate-500">Send a greeting to start your conversation with {selectedContact.full_name}.</p>
                  </div>
                )}
              </div>

              {/* Message Composer Footer */}
              <form
                onSubmit={handleSendMessage}
                className={`py-3 px-4 md:px-6 ${composerBg} border-t flex items-center gap-2.5 shrink-0`}
              >
                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    type="button"
                    onClick={() => setShowQuickPills(!showQuickPills)}
                    className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                    title="Quick Templates"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                    title="Attach File"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className={`flex-1 text-xs md:text-sm px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${composerInputBg}`}
                />

                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className={`w-10 h-10 rounded-full ${activeThemeObj.sendBtn} text-white flex items-center justify-center shadow-md disabled:opacity-40 transition-all shrink-0 hover:scale-105`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
              <div className="w-14 h-14 rounded-full bg-surface-dark flex items-center justify-center text-emerald-400 mb-3 shadow-xl">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'} mb-1`}>Fusion High School Messenger</h3>
              <p className="text-slate-400 max-w-sm text-xs">
                Select a contact from the category list on the left to start sending and receiving messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
