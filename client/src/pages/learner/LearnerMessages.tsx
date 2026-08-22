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
  Users,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  MessageSquare,
  ArrowLeft,
  AlertCircle,
  Clock,
  Palette,
  Check,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Image as ImageIcon,
  FileText,
  File as FileIcon,
  Download,
  Trash2,
  X,
  Maximize2,
  Loader2,
  Volume2
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

// Audio Voice Note Player Component
const VoiceNotePlayer: React.FC<{
  audioUrl: string;
  duration?: number;
  isMe: boolean;
}> = ({ audioUrl, duration, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
        setAudioDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-1 min-w-[200px] sm:min-w-[240px]">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={() => {
          if (audioRef.current?.duration && !isNaN(audioRef.current.duration)) {
            setAudioDuration(audioRef.current.duration);
          }
        }}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
          isMe ? 'bg-white text-emerald-800' : 'bg-brand-500 text-white'
        }`}
        title={isPlaying ? 'Pause' : 'Play voice note'}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1">
        {/* Visualizer Waveform Bar / Slider */}
        <div className="relative flex items-center h-4">
          <input
            type="range"
            min="0"
            max={audioDuration || 1}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/20 accent-brand-400"
          />
        </div>
        <div className="flex items-center justify-between text-[10px] opacity-80 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-cyan-300" />
            {formatTime(audioDuration || duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const LearnerMessages: React.FC = () => {
  const { user } = useAuth();
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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // Attachment Staging State
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl?: string;
    type: 'image' | 'document' | 'voice_note';
    name: string;
    size: string;
  } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // File Inputs
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const [chatTheme, setChatTheme] = useState<string>(() => {
    return localStorage.getItem('fusion_chat_theme') || (appTheme === 'navy' ? 'indigo' : appTheme === 'light' ? 'teal' : 'emerald');
  });

  // Keep chat theme in sync if parent changes dashboard theme
  useEffect(() => {
    const savedChatTheme = localStorage.getItem('fusion_chat_theme');
    if (!savedChatTheme) {
      if (appTheme === 'navy') setChatTheme('indigo');
      else if (appTheme === 'light') setChatTheme('teal');
      else setChatTheme('emerald');
    }
  }, [appTheme]);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevMessageCountRef = useRef<number>(0);
  const initialLoadDoneRef = useRef<boolean>(false);

  // Play outgoing message sent chime (soft modern "pop" chime)
  const playSendChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  };

  // Play incoming message received chime (melodic double-bell chime)
  const playReceiveChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.07, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.09);
      gain2.gain.setValueAtTime(0.09, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.25);
    } catch (_) {}
  };

  const selectedContactRef = useRef<any | null>(null);
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

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
        const raw = Array.isArray(res) ? res : res.contacts || [];
        const uniqueContacts = raw.filter(
          (c: any, index: number, self: any[]) => index === self.findIndex((o: any) => o.id === c.id)
        );
        setContacts(uniqueContacts);
        
        // NEVER overwrite or jump away from an already active contact selection!
        setSelectedContact((prev: any) => {
          if (prev && prev.id) {
            const updated = uniqueContacts.find((c: any) => c.id === prev.id);
            return updated ? { ...prev, ...updated } : prev;
          }
          if (uniqueContacts.length > 0) {
            const firstWithHistory = uniqueContacts.find((c: any) => c.last_message || c.last_activity) || uniqueContacts[0];
            return firstWithHistory;
          }
          return null;
        });
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
    const interval = setInterval(fetchContacts, 12000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversation = (contactId: number) => {
    userService.getConversation(contactId)
      .then((res) => {
        const msgs = Array.isArray(res) ? res : res.messages || [];
        const uniqueMsgs = msgs.filter(
          (m: any, index: number, self: any[]) => index === self.findIndex((o: any) => o.id === m.id)
        );

        if (initialLoadDoneRef.current && uniqueMsgs.length > prevMessageCountRef.current) {
          const lastMsg = uniqueMsgs[uniqueMsgs.length - 1];
          if (lastMsg && lastMsg.sender_id !== user?.id) {
            playReceiveChime();
          }
        }
        initialLoadDoneRef.current = true;
        prevMessageCountRef.current = uniqueMsgs.length;

        setConversation(uniqueMsgs);
        setTimeout(() => scrollToBottom(false), 50);
      })
      .catch((err) => {
        console.error('Failed to load conversation:', err);
      });
  };

  useEffect(() => {
    if (selectedContact?.id) {
      initialLoadDoneRef.current = false;
      prevMessageCountRef.current = 0;
      fetchConversation(selectedContact.id);
      const interval = setInterval(() => {
        const currentTargetId = selectedContactRef.current?.id || selectedContact?.id;
        if (currentTargetId) {
          fetchConversation(currentTargetId);
        }
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [selectedContact?.id]);

  // Voice Note Recording Controls
  const startVoiceRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      setError('Microphone permission denied or audio recording unavailable.');
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  const stopAndSendVoiceRecording = async () => {
    const targetContact = selectedContactRef.current || selectedContact;
    if (!mediaRecorderRef.current || !isRecording || !targetContact?.id) return;

    const targetRecipientId = targetContact.id;
    const targetRecipientName = targetContact.full_name || 'User';

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const finalDuration = recordingDuration;
    setIsRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });

      setSending(true);
      playSendChime();

      try {
        const formData = new FormData();
        formData.append('file', audioFile);
        const uploadRes = await userService.uploadAttachment(formData);

        await userService.sendMessage({
          recipient_id: targetRecipientId,
          receiver_id: targetRecipientId,
          body: `🎤 Voice Note (${Math.floor(finalDuration / 60)}:${(finalDuration % 60).toString().padStart(2, '0')})`,
          attachment_url: uploadRes.file_url,
          attachment_name: `Voice Note (${finalDuration}s)`,
          attachment_type: 'voice_note',
          file_size: uploadRes.file_size,
          voice_duration: finalDuration,
          subject: `Voice Note to ${targetRecipientName}`
        });

        fetchConversation(targetRecipientId);
        fetchContacts();
      } catch (err: any) {
        console.error('Error sending voice note:', err);
        setError('Failed to send voice note: ' + err.message);
      } finally {
        setSending(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
      }
    };

    mediaRecorderRef.current.stop();
  };

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 25) {
      setError('Selected file exceeds the 25 MB limit.');
      return;
    }

    const previewUrl = type === 'image' ? URL.createObjectURL(file) : undefined;
    const formattedSize = sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;

    setPendingAttachment({
      file,
      previewUrl,
      type,
      name: file.name,
      size: formattedSize
    });
    setShowAttachMenu(false);
    e.target.value = '';
  };

  // Main Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent, customBody?: string) => {
    if (e) e.preventDefault();
    const textToSend = customBody || inputText;
    const targetContact = selectedContactRef.current || selectedContact;
    if ((!textToSend.trim() && !pendingAttachment) || !targetContact?.id || sending) return;

    const targetRecipientId = targetContact.id;
    const targetRecipientName = targetContact.full_name || 'User';

    setSending(true);
    playSendChime();

    let uploadedUrl: string | undefined = undefined;
    let uploadedName: string | undefined = undefined;
    let uploadedType: string | undefined = undefined;
    let uploadedSize: string | undefined = undefined;

    // Upload attachment if present
    if (pendingAttachment) {
      setUploadingAttachment(true);
      try {
        const formData = new FormData();
        formData.append('file', pendingAttachment.file);
        const uploadRes = await userService.uploadAttachment(formData);
        uploadedUrl = uploadRes.file_url;
        uploadedName = pendingAttachment.name;
        uploadedType = pendingAttachment.type;
        uploadedSize = uploadRes.file_size || pendingAttachment.size;
      } catch (err: any) {
        console.error('Error uploading file attachment:', err);
        setError('Failed to upload attachment: ' + err.message);
        setSending(false);
        setUploadingAttachment(false);
        return;
      }
      setUploadingAttachment(false);
    }

    const tempMsg = {
      id: Date.now(),
      sender_id: user?.id,
      recipient_id: targetRecipientId,
      body: textToSend.trim() || (uploadedType === 'image' ? `📷 Photo` : `📎 ${uploadedName}`),
      content: textToSend.trim(),
      attachment_url: uploadedUrl,
      attachment_name: uploadedName,
      attachment_type: uploadedType,
      file_size: uploadedSize,
      created_at: new Date().toISOString(),
      is_me: true
    };

    setConversation(prev => [...prev, tempMsg]);
    if (!customBody) setInputText('');
    setPendingAttachment(null);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      await userService.sendMessage({
        recipient_id: targetRecipientId,
        receiver_id: targetRecipientId,
        body: textToSend.trim(),
        content: textToSend.trim(),
        subject: `Message to ${targetRecipientName}`,
        attachment_url: uploadedUrl,
        attachment_name: uploadedName,
        attachment_type: uploadedType,
        file_size: uploadedSize
      });
      fetchConversation(targetRecipientId);
      fetchContacts();
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

  if (loading) return <LoadingSpinner text="Opening School Chat & Communication Hub..." />;

  const recentContacts = contacts.filter(c => c.last_message || c.last_activity);
  const learnerContacts = contacts.filter(c => (c.role_name || c.role || '').toLowerCase() === 'learner');
  const teacherContacts = contacts.filter(c => (c.role_name || c.role || '').toLowerCase() === 'teacher');
  const parentContacts = contacts.filter(c => (c.role_name || c.role || '').toLowerCase() === 'parent');
  const adminContacts = contacts.filter(c => (c.role_name || c.role || '').toLowerCase() === 'admin');

  const filteredContacts = (() => {
    let list = [];
    switch (activeCategory) {
      case 'recent': list = recentContacts.length > 0 ? recentContacts : contacts; break;
      case 'teachers': list = teacherContacts; break;
      case 'learners': list = learnerContacts; break;
      case 'parents': list = parentContacts; break;
      case 'admins': list = adminContacts; break;
      default: list = contacts;
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.surname || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.role_name || c.role || '').toLowerCase().includes(q) ||
      (c.tag_name || '').toLowerCase().includes(q)
    );
  })();

  const getRoleBadge = (contact: any) => {
    const r = (contact.role_name || contact.role || '').toLowerCase();
    if (r === 'admin') return <Badge variant="rose" size="sm">Admin</Badge>;
    if (r === 'teacher') return <Badge variant="cyan" size="sm">Teacher</Badge>;
    if (r === 'parent') return <Badge variant="amber" size="sm">Parent</Badge>;
    return <Badge variant="indigo" size="sm">Learner</Badge>;
  };

  const handleCategorySwitch = (cat: 'recent' | 'learners' | 'teachers' | 'parents' | 'admins') => {
    setActiveCategory(cat);
    let targetList = [];
    switch (cat) {
      case 'recent': targetList = recentContacts.length > 0 ? recentContacts : contacts; break;
      case 'teachers': targetList = teacherContacts; break;
      case 'learners': targetList = learnerContacts; break;
      case 'parents': targetList = parentContacts; break;
      case 'admins': targetList = adminContacts; break;
    }
    if (targetList.length > 0) {
      const match = targetList.find(c => c.id === selectedContact?.id) || targetList[0];
      setSelectedContact(match);
      fetchConversation(match.id);
    }
  };

  const isLight = appTheme === 'light';
  const isNavy = appTheme === 'navy';

  const cardBg = isLight ? 'bg-white border-slate-200 shadow-xl' : isNavy ? 'bg-[#0a1936] border-blue-500/20' : 'bg-[#111b21] border-white/10';
  const sidebarBg = isLight ? 'bg-slate-50 border-slate-200' : isNavy ? 'bg-[#0c1e40] border-blue-500/20' : 'bg-[#111b21] border-white/5';
  const headerBg = isLight ? 'bg-slate-100 border-slate-200 text-slate-900' : isNavy ? 'bg-[#11244d] border-blue-500/20 text-white' : 'bg-[#202c33] border-white/5 text-white';
  const searchInputBg = isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : isNavy ? 'bg-[#0a1936] border-blue-500/30 text-white placeholder-blue-300' : 'bg-[#202c33] border-transparent text-white placeholder-slate-400';
  const chatBgColor = isLight ? '#f8fafc' : activeThemeObj.chatBg;
  const theirBubbleStyle = isLight ? 'bg-white text-slate-900 border border-slate-200 shadow-sm' : activeThemeObj.theirBubble;
  const myBubbleStyle = activeThemeObj.myBubble;
  const composerBg = isLight ? 'bg-slate-100 border-slate-200' : isNavy ? 'bg-[#11244d] border-blue-500/20' : 'bg-[#202c33] border-white/5';
  const composerInputBg = isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-brand-500' : isNavy ? 'bg-[#0a1936] border border-blue-500/30 text-white placeholder-blue-300' : 'bg-[#2a3942] border-transparent text-white placeholder-slate-400';

  return (
    <div className="space-y-4">
      {/* Hidden File Inputs for Sharing Pictures and Documents */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'document')}
      />

      {/* Top Banner */}
      <div className={`p-4 rounded-2xl ${cardBg} border flex items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center text-white shadow-sm">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-extrabold font-display ${isLight ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
              Communication & Messaging Hub
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                Theme: {activeThemeObj.name}
              </span>
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Instant communication with voice notes, photo sharing, and documents across Teachers, Parents, and Learners.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
            Active Channel
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Messaging Container */}
      <div className={`grid grid-cols-1 md:grid-cols-12 rounded-3xl ${cardBg} border overflow-hidden shadow-2xl h-[calc(100vh-250px)] min-h-[550px]`}>
        
        {/* Left Directory & Contact List */}
        <div className={`md:col-span-5 lg:col-span-4 ${sidebarBg} border-r flex flex-col h-full overflow-hidden ${
          showMobileChat ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Directory Header & Categories */}
          <div className={`p-4 ${headerBg} border-b space-y-3 shrink-0`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
                <span>Conversations</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isLight ? 'bg-slate-200 text-slate-800' : 'bg-white/10 text-white'}`}>
                  {contacts.length}
                </span>
              </h3>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <button
                onClick={() => handleCategorySwitch('recent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'recent'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : isLight ? 'bg-slate-200 text-slate-700 hover:text-slate-900' : 'bg-[#202c33] text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Recent</span>
                {recentContacts.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === 'recent' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {recentContacts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleCategorySwitch('teachers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'teachers'
                    ? 'bg-cyan-600 text-white shadow-sm font-bold'
                    : isLight ? 'bg-slate-200 text-slate-700 hover:text-slate-900' : 'bg-[#202c33] text-slate-400 hover:text-white'
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
                onClick={() => handleCategorySwitch('learners')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'learners'
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : isLight ? 'bg-slate-200 text-slate-700 hover:text-slate-900' : 'bg-[#202c33] text-slate-400 hover:text-white'
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
                onClick={() => handleCategorySwitch('parents')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'parents'
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : isLight ? 'bg-slate-200 text-slate-700 hover:text-slate-900' : 'bg-[#202c33] text-slate-400 hover:text-white'
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
                onClick={() => handleCategorySwitch('admins')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'admins'
                    ? 'bg-rose-600 text-white shadow-sm font-bold'
                    : isLight ? 'bg-slate-200 text-slate-700 hover:text-slate-900' : 'bg-[#202c33] text-slate-400 hover:text-white'
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

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search people, staff, parents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs pl-10 pr-4 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${searchInputBg}`}
              />
            </div>
          </div>

          {/* Contact Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => {
                const isSelected = selectedContact?.id === contact.id;
                const pfp = getProfilePictureUrl(contact.profile_picture_path || contact.profile_picture);
                const hasUnread = Number(contact.unread_count) > 0;

                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact);
                      setShowMobileChat(true);
                    }}
                    className={`w-full p-3.5 flex items-center gap-3 text-left transition-all relative ${
                      isSelected
                        ? isLight ? 'bg-emerald-50 text-emerald-950 border-l-4 border-emerald-600' : 'bg-[#2a3942] text-white border-l-4 border-emerald-500'
                        : isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-[#202c33] text-slate-200'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {pfp ? (
                        <img src={pfp} alt={contact.full_name} className="w-11 h-11 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
                          {(contact.full_name || 'U')[0]}{(contact.surname || '')[0]}
                        </div>
                      )}
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#111b21] absolute bottom-0 right-0" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {contact.full_name} {contact.surname}
                        </h4>
                        {contact.last_activity && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(contact.last_activity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-[11px] truncate ${hasUnread ? 'font-bold text-emerald-400' : 'text-slate-400'}`}>
                          {contact.last_message || contact.tag_name || contact.email}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {getRoleBadge(contact)}
                          {hasUnread && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                              {contact.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No contacts found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Active Conversation Area */}
        <div className={`md:col-span-7 lg:col-span-8 flex flex-col h-full overflow-hidden ${
          !showMobileChat ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className={`py-3 px-4 md:px-6 ${headerBg} border-b flex items-center justify-between gap-3 shrink-0 shadow-sm`}>
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    {selectedContact.profile_picture_path || selectedContact.profile_picture ? (
                      <img
                        src={getProfilePictureUrl(selectedContact.profile_picture_path || selectedContact.profile_picture)!}
                        alt={selectedContact.full_name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                        {(selectedContact.full_name || 'U')[0]}{(selectedContact.surname || '')[0]}
                      </div>
                    )}
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#111b21] absolute bottom-0 right-0" />
                  </div>

                  <div className="min-w-0">
                    <h3 className={`text-xs md:text-sm font-extrabold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {selectedContact.full_name} {selectedContact.surname}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{selectedContact.tag_name || selectedContact.email}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Theme Selector Palette */}
                <div className="relative flex items-center gap-1.5">
                  <button
                    onClick={() => setShowColorMenu(!showColorMenu)}
                    className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Change Chat Color Theme"
                  >
                    <Palette className="w-4 h-4" />
                  </button>

                  {showColorMenu && (
                    <div className="absolute right-0 top-12 z-50 w-52 p-3 rounded-2xl bg-surface-dark/95 backdrop-blur-xl border border-white/10 shadow-2xl space-y-2 animate-fade-in text-white">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                        Chat Theme
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {CHAT_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => handleSelectTheme(theme.id)}
                            className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                              chatTheme === theme.id
                                ? 'bg-white/15 border-white/30 text-white font-bold'
                                : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-3.5 h-3.5 rounded-full ${theme.preview}`} />
                              <span className="text-[11px]">{theme.name.split(' ')[0]}</span>
                            </div>
                            {chatTheme === theme.id && <Check className="w-3 h-3 text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Template Replies Bar */}
              {showQuickPills && (
                <div className={`py-2 px-4 ${headerBg} border-b flex items-center gap-1.5 overflow-x-auto custom-scrollbar animate-fade-in shrink-0`}>
                  {QUICK_RESPONSES.map((qr, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        handleSendMessage(undefined, qr);
                        setShowQuickPills(false);
                      }}
                      className="px-3 py-1 rounded-full text-[11px] bg-white/10 hover:bg-white/20 text-slate-200 transition-colors whitespace-nowrap shrink-0 border border-white/5"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}

              {/* Messages Feed View */}
              <div
                ref={messagesContainerRef}
                className="flex-1 p-4 md:p-6 overflow-y-auto space-y-3 custom-scrollbar"
                style={{
                  backgroundColor: chatBgColor,
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 1px, transparent 1px)`,
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

                    const hasAttachment = !!msg.attachment_url;
                    const isVoiceNote = msg.attachment_type === 'voice_note' || (msg.attachment_url && msg.attachment_url.includes('/voice/'));
                    const isImage = msg.attachment_type === 'image' || (msg.attachment_url && (msg.attachment_url.match(/\.(jpg|jpeg|png|webp|gif)$/i) || msg.attachment_url.includes('/images/')));
                    const isDoc = hasAttachment && !isVoiceNote && !isImage;

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] py-2.5 px-3.5 md:py-3 md:px-4 text-xs relative shadow-md ${
                            isMe
                              ? `${myBubbleStyle} rounded-2xl rounded-tr-none`
                              : `${theirBubbleStyle} rounded-2xl rounded-tl-none`
                          }`}
                        >
                          {/* Image Attachment Rendering */}
                          {isImage && msg.attachment_url && (
                            <div className="mb-2 rounded-xl overflow-hidden group relative cursor-pointer shadow-md bg-black/20" onClick={() => setLightboxImage({ url: msg.attachment_url, name: msg.attachment_name || 'Photo' })}>
                              <img
                                src={msg.attachment_url}
                                alt={msg.attachment_name || 'Shared Image'}
                                className="max-h-60 sm:max-h-72 w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                                <Maximize2 className="w-5 h-5 drop-shadow-md" />
                                <span className="text-[11px] font-bold">Zoom</span>
                              </div>
                            </div>
                          )}

                          {/* Voice Note Audio Player Rendering */}
                          {isVoiceNote && msg.attachment_url && (
                            <VoiceNotePlayer
                              audioUrl={msg.attachment_url}
                              duration={msg.voice_duration}
                              isMe={isMe}
                            />
                          )}

                          {/* Document Attachment Rendering */}
                          {isDoc && msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              download={msg.attachment_name || 'document'}
                              className="flex items-center gap-3 p-2.5 mb-2 rounded-xl bg-black/20 hover:bg-black/30 transition-all border border-white/10 group text-white"
                            >
                              <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs truncate">{msg.attachment_name || 'School Document'}</p>
                                <p className="text-[10px] opacity-70 font-mono">{msg.file_size || 'Document'}</p>
                              </div>
                              <Download className="w-4 h-4 text-cyan-300 shrink-0 group-hover:translate-y-0.5 transition-transform" />
                            </a>
                          )}

                          {/* Text Message Content (if not a pure placeholder) */}
                          {msg.body && !msg.body.startsWith('🎤 Voice Note') && !msg.body.startsWith('📷 Photo') && !msg.body.startsWith('📎 Document') && (
                            <p className="leading-relaxed whitespace-pre-wrap break-words text-xs md:text-sm">
                              {msg.body || msg.content}
                            </p>
                          )}

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
                    <p className="text-[11px] text-slate-500">Send a message, voice note, or photo to start conversation with {selectedContact.full_name}.</p>
                  </div>
                )}
              </div>

              {/* Pending Attachment Preview Strip */}
              {pendingAttachment && (
                <div className={`py-2 px-4 md:px-6 ${composerBg} border-t flex items-center justify-between gap-3 animate-fade-in`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {pendingAttachment.type === 'image' ? (
                      <img src={pendingAttachment.previewUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{pendingAttachment.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{pendingAttachment.size} • Ready to send</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPendingAttachment(null)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Message Composer Footer / Voice Note Recorder */}
              {isRecording ? (
                <div className={`py-3 px-4 md:px-6 ${composerBg} border-t flex items-center justify-between gap-3 shrink-0 animate-fade-in`}>
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                      Recording Voice Note
                      <span className="font-mono text-sm text-white">
                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelVoiceRecording}
                      className="py-2 px-3 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Discard</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopAndSendVoiceRecording}
                      disabled={sending}
                      className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition-all"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Send Audio</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className={`py-3 px-4 md:px-6 ${composerBg} border-t flex items-center gap-2.5 shrink-0 relative`}
                >
                  {/* Attachment Modal Popover */}
                  {showAttachMenu && (
                    <div className="absolute left-4 bottom-16 z-50 p-2 rounded-2xl bg-surface-dark/95 backdrop-blur-xl border border-white/10 shadow-2xl space-y-1 animate-fade-in text-white w-48">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full p-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-white/10 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <span>Photo / Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        className="w-full p-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-white/10 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span>Document / PDF</span>
                      </button>
                    </div>
                  )}

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
                      onClick={() => setShowAttachMenu(!showAttachMenu)}
                      className={`p-1.5 rounded-full transition-colors ${showAttachMenu ? 'bg-white/20 text-white' : 'hover:bg-white/10 hover:text-white'}`}
                      title="Share Photos & Documents"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={pendingAttachment ? "Add a caption (optional)..." : "Type a message..."}
                    className={`flex-1 text-xs md:text-sm px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${composerInputBg}`}
                  />

                  {/* Dynamic Mic or Send Button */}
                  {inputText.trim() || pendingAttachment ? (
                    <button
                      type="submit"
                      disabled={sending || uploadingAttachment}
                      className={`w-10 h-10 rounded-full ${activeThemeObj.sendBtn} text-white flex items-center justify-center shadow-md disabled:opacity-40 transition-all shrink-0 hover:scale-105`}
                      title="Send message"
                    >
                      {sending || uploadingAttachment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center shadow-md hover:scale-105 transition-all shrink-0"
                      title="Hold or click to record Voice Note"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
              <div className="w-14 h-14 rounded-full bg-surface-dark flex items-center justify-center text-emerald-400 mb-3 shadow-xl">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'} mb-1`}>Fusion High School Messenger</h3>
              <p className="text-slate-400 max-w-sm text-xs">
                Select a contact from the category list on the left to start sending and receiving messages, voice recordings, photos, and assignments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setLightboxImage(null)}>
          <div className="absolute top-4 right-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <a
              href={lightboxImage.url}
              download={lightboxImage.name}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Download Image"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close Lightbox"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.name}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-3 text-xs font-mono text-slate-300">{lightboxImage.name}</p>
        </div>
      )}
    </div>
  );
};
