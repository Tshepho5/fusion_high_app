import React, { useState, useEffect, useRef } from 'react';
import { aiTutorService, learnerService } from '../../services/api';
import { AdaptivePracticePanel } from '../../components/learner/AdaptivePracticePanel';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import confetti from 'canvas-confetti';
import {
  Send,
  HelpCircle,
  BookOpen,
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCcw,
  Zap,
  Award,
  ChevronRight,
  BrainCircuit,
  MessageSquare,
  FileText,
  Target,
  AlertTriangle,
  Languages,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PlusCircle,
  Trash2,
  History,
  GraduationCap,
  Dna,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileCheck,
  Atom,
  Calculator,
  Sigma
} from 'lucide-react';

interface LearnerAITutorProps {
  initialSubject?: string;
  initialTopicId?: string;
  initialTopicName?: string;
}

interface Message {
  id: string | number;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestions?: string[];
  isQuiz?: boolean;
  quizData?: any;
}

interface ConversationItem {
  id: number;
  subject_name: string;
  grade: number;
  stream: string;
  topic: string;
  title: string;
  message_count: number;
  last_message_preview?: string;
  updated_at: string;
}

interface SubjectSyllabusItem {
  name: string;
  normalized: string;
  topicsCount: number;
  topics: Array<{ id: string; topic: string; grade: number; stream: string }>;
}

export const SA_OFFICIAL_LANGUAGES = [
  { id: 'english', name: 'English', label: 'English (HL / FAL)', greeting: 'Hello! Select a topic or ask any question on English curriculum.' },
  { id: 'afrikaans', name: 'Afrikaans', label: 'Afrikaans (Huistaal / EAT)', greeting: 'Goeiedag! Kies \'n onderwerp of vra enige vraag oor Afrikaans.' },
  { id: 'isizulu', name: 'isiZulu', label: 'isiZulu (UL / FAL)', greeting: 'Sawubona! Khetha isihloko noma buza umbuzo ngesiZulu.' },
  { id: 'isixhosa', name: 'isiXhosa', label: 'isiXhosa (UL / FAL)', greeting: 'Molo! Khetha isihloko okanye ubuze umbuzo ngesiXhosa.' },
  { id: 'sepedi', name: 'Sepedi', label: 'Sepedi (Northern Sotho)', greeting: 'Dumela! Kgetha hlogo goba o botse potso ka Sepedi.' },
  { id: 'sesotho', name: 'Sesotho', label: 'Sesotho (Southern Sotho)', greeting: 'Dumela! Kgetha sehlooho kapa o botse potso ka Sesotho.' },
  { id: 'setswana', name: 'Setswana', label: 'Setswana (Tswana)', greeting: 'Dumela! Tlhopha setlhogo kgotsa o botse potso ka Setswana.' },
  { id: 'siswati', name: 'siSwati', label: 'siSwati (Swati)', greeting: 'Sawubona! Khetsa sihloko nome ubute umbuto ngesiSwati.' },
  { id: 'xitsonga', name: 'Xitsonga', label: 'Xitsonga (Tsonga)', greeting: 'Avuxeni! Hlawula nhlokomhaka kumbe u vutisa xivutiso hi Xitsonga.' },
  { id: 'tshivenda', name: 'Tshivenda', label: 'Tshivenda (Venda)', greeting: 'Ndaa / Aa! Nangani tshiṱoho kana vhudzisani mbudziso nga Tshivenḓa.' },
  { id: 'isindebele', name: 'isiNdebele', label: 'isiNdebele (Ndebele)', greeting: 'Lotjhani! Khetha isihloko nofana ubuze umbuzo ngesiNdebele.' },
];

export const cleanHumanMath = (rawText: string): string => {
  if (!rawText) return '';
  let s = rawText;
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\div/g, '÷');
  s = s.replace(/\\pm/g, '±');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\leq/g, '≤');
  s = s.replace(/\\geq/g, '≥');
  s = s.replace(/\\neq/g, '≠');
  s = s.replace(/\\degree/g, '°');
  s = s.replace(/\\circ/g, '°');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\theta/g, 'θ');
  s = s.replace(/\\alpha/g, 'α');
  s = s.replace(/\\beta/g, 'β');
  s = s.replace(/\\Delta/g, 'Δ');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  s = s.replace(/\$([^\$\n]+)\$/g, '$1');
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');
  return s;
};

export const LearnerAITutor: React.FC<LearnerAITutorProps> = ({
  initialSubject = 'Mathematics',
  initialTopicName = 'General Curriculum',
}) => {
  // Learner Enrolled Context
  const [subjectsList, setSubjectsList] = useState<SubjectSyllabusItem[]>([]);
  const [learnerGrade, setLearnerGrade] = useState<number>(10);
  const [learnerStream, setLearnerStream] = useState<string>('Science');
  const [schoolName, setSchoolName] = useState<string>('Fusion High School');

  const [subject, setSubject] = useState<string>(initialSubject);
  const [currentTopic, setCurrentTopic] = useState<string>(initialTopicName);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  // Conversation Session State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(false);

  // Chat Messages State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-init',
      sender: 'ai',
      text: `Welcome to **${initialSubject}** (Grade 10). Select any topic from your CAPS syllabus or ask a question to get step-by-step solutions, formulas, and exam guidance.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        `Explain the core concepts of ${initialSubject} step-by-step`,
        `Give me a Grade 10 practice question with marking memo`,
        `What are the most common exam mistakes in this topic?`
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Active Tab & Subject Studios State
  const [activeTab, setActiveTab] = useState<'chat' | 'physics-studio' | 'math-studio' | 'life-sciences-studio' | 'adaptive'>('chat');

  // Dedicated Subject AI Studio State (Grade 12 Physical Sciences)
  const [physicsData, setPhysicsData] = useState<any[]>([]);
  const [selectedPhysicsItem, setSelectedPhysicsItem] = useState<any | null>(null);
  const [studentPhysicsAnswerText, setStudentPhysicsAnswerText] = useState<string>('');
  const [physicsEvaluationResult, setPhysicsEvaluationResult] = useState<any | null>(null);
  const [evaluatingPhysics, setEvaluatingPhysics] = useState<boolean>(false);
  const [physicsPaperFilter, setPhysicsPaperFilter] = useState<'all' | 'Paper 1 (Physics)' | 'Paper 2 (Chemistry)'>('all');
  const [showPhysicsModelAnswer, setShowPhysicsModelAnswer] = useState<boolean>(false);
  const [loadingPhysicsData, setLoadingPhysicsData] = useState<boolean>(false);

  // Dedicated Subject AI Studio State (Grade 12 Mathematics)
  const [mathData, setMathData] = useState<any[]>([]);
  const [selectedMathItem, setSelectedMathItem] = useState<any | null>(null);
  const [studentMathAnswerText, setStudentMathAnswerText] = useState<string>('');
  const [mathEvaluationResult, setMathEvaluationResult] = useState<any | null>(null);
  const [evaluatingMath, setEvaluatingMath] = useState<boolean>(false);
  const [mathPaperFilter, setMathPaperFilter] = useState<'all' | 'Paper 1 (Maths)' | 'Paper 2 (Maths)'>('all');
  const [showMathModelAnswer, setShowMathModelAnswer] = useState<boolean>(false);
  const [loadingMathData, setLoadingMathData] = useState<boolean>(false);

  // Dedicated Subject AI Studio State (Grade 12 Life Sciences)
  const [lifeSciencesData, setLifeSciencesData] = useState<any[]>([]);
  const [selectedLsItem, setSelectedLsItem] = useState<any | null>(null);
  const [studentAnswerText, setStudentAnswerText] = useState<string>('');
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [paperFilter, setPaperFilter] = useState<'all' | 'Paper 1' | 'Paper 2'>('all');
  const [showModelAnswer, setShowModelAnswer] = useState<boolean>(false);
  const [showRubricDetails, setShowRubricDetails] = useState<boolean>(false);
  const [loadingLsData, setLoadingLsData] = useState<boolean>(false);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: Fetch Subjects, Syllabus Topics, and Saved Conversations
  useEffect(() => {
    loadSyllabus();
  }, []);

  useEffect(() => {
    if (subject) {
      loadSavedConversations(subject);
      const subLower = subject.toLowerCase();
      if (subLower.includes('math') || subLower.includes('algebra') || subLower.includes('calculus')) {
        loadMathStudio();
      } else if (subLower.includes('physic') || subLower.includes('chem') || (subLower.includes('science') && !subLower.includes('life'))) {
        loadPhysicsStudio();
      } else if (subLower.includes('life sc') || subLower.includes('bio')) {
        loadLifeSciencesStudio();
      }
    }
  }, [subject]);

  const loadMathStudio = async () => {
    setLoadingMathData(true);
    try {
      const res = await aiTutorService.getMathTopics();
      if (res && res.topics) {
        setMathData(res.topics);
        if (res.topics.length > 0) {
          setSelectedMathItem((prev: any) => prev || res.topics[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load Mathematics studio topics:', err);
    } finally {
      setLoadingMathData(false);
    }
  };

  const handleEvaluateMathAnswer = async () => {
    if (!selectedMathItem || !studentMathAnswerText.trim()) return;
    setEvaluatingMath(true);
    try {
      const res = await aiTutorService.evaluateMathAnswer({
        itemId: selectedMathItem.id,
        studentAnswer: studentMathAnswerText
      });
      setMathEvaluationResult(res);
      const pct = parseInt(res.percentage || '0', 10);
      if (pct >= 75) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 }
        });
      }
    } catch (err) {
      console.error('Math answer evaluation failed:', err);
    } finally {
      setEvaluatingMath(false);
    }
  };

  const handleSelectMathQuestion = (item: any) => {
    setSelectedMathItem(item);
    setStudentMathAnswerText('');
    setMathEvaluationResult(null);
    setShowMathModelAnswer(false);
  };

  const loadPhysicsStudio = async () => {
    setLoadingPhysicsData(true);
    try {
      const res = await aiTutorService.getPhysicsTopics();
      if (res && res.topics) {
        setPhysicsData(res.topics);
        if (res.topics.length > 0) {
          setSelectedPhysicsItem((prev: any) => prev || res.topics[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load Physical Sciences studio topics:', err);
    } finally {
      setLoadingPhysicsData(false);
    }
  };

  const handleEvaluatePhysicsAnswer = async () => {
    if (!selectedPhysicsItem || !studentPhysicsAnswerText.trim()) return;
    setEvaluatingPhysics(true);
    try {
      const res = await aiTutorService.evaluatePhysicsAnswer({
        itemId: selectedPhysicsItem.id,
        studentAnswer: studentPhysicsAnswerText
      });
      setPhysicsEvaluationResult(res);
      const pct = parseInt(res.percentage || '0', 10);
      if (pct >= 75) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 }
        });
      }
    } catch (err) {
      console.error('Physics answer evaluation failed:', err);
    } finally {
      setEvaluatingPhysics(false);
    }
  };

  const handleSelectPhysicsQuestion = (item: any) => {
    setSelectedPhysicsItem(item);
    setStudentPhysicsAnswerText('');
    setPhysicsEvaluationResult(null);
    setShowPhysicsModelAnswer(false);
  };

  const loadLifeSciencesStudio = async () => {
    setLoadingLsData(true);
    try {
      const res = await aiTutorService.getLifeSciencesTopics();
      if (res && res.topics) {
        setLifeSciencesData(res.topics);
        if (res.topics.length > 0) {
          setSelectedLsItem((prev: any) => prev || res.topics[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load Life Sciences studio topics:', err);
    } finally {
      setLoadingLsData(false);
    }
  };

  const handleEvaluateAnswer = async () => {
    if (!selectedLsItem || !studentAnswerText.trim()) return;
    setEvaluating(true);
    try {
      const res = await aiTutorService.evaluateLifeSciencesAnswer({
        itemId: selectedLsItem.id,
        studentAnswer: studentAnswerText
      });
      setEvaluationResult(res);
      const pct = parseInt(res.percentage || '0', 10);
      if (pct >= 75) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 }
        });
      }
    } catch (err) {
      console.error('Answer evaluation failed:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSelectLsQuestion = (item: any) => {
    setSelectedLsItem(item);
    setStudentAnswerText('');
    setEvaluationResult(null);
    setShowModelAnswer(false);
    setShowRubricDetails(false);
  };

  const loadSyllabus = async () => {
    try {
      const data = await aiTutorService.getSubjectsWithSyllabus();
      if (data) {
        setLearnerGrade(data.grade || 10);
        setLearnerStream(data.stream || 'Science');
        setSchoolName(data.schoolName || 'Fusion High School');
        if (data.subjects && data.subjects.length > 0) {
          setSubjectsList(data.subjects);
          const hasCurrent = data.subjects.find((s: SubjectSyllabusItem) => s.name.toLowerCase() === subject.toLowerCase());
          if (!hasCurrent && data.subjects[0]) {
            setSubject(data.subjects[0].name);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load subjects syllabus from backend:', err);
    }
  };

  const loadSavedConversations = async (targetSubject: string) => {
    setLoadingConversations(true);
    try {
      const res = await aiTutorService.getConversations(targetSubject);
      if (res && Array.isArray(res.conversations)) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.warn('Could not fetch conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSelectConversation = async (conv: ConversationItem) => {
    setActiveConversationId(conv.id);
    setCurrentTopic(conv.topic || 'General Curriculum');
    setLoading(true);
    try {
      const details = await aiTutorService.getConversationDetails(conv.id);
      if (details && Array.isArray(details.messages)) {
        const mapped: Message[] = details.messages.map((m: any) => ({
          id: m.id,
          sender: m.sender,
          text: cleanHumanMath(m.message_text),
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: m.metadata?.suggestions || []
        }));
        setMessages(mapped);
      }
    } catch (err) {
      console.error('Error fetching conversation details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewSession = async (customTopic?: string) => {
    const topicToUse = customTopic || currentTopic || 'General Subject Help';
    setActiveConversationId(null);
    setCurrentTopic(topicToUse);

    const welcomeMsg: Message = {
      id: `welcome-${Date.now()}`,
      sender: 'ai',
      text: `Started a new consultation for **${subject}** (Grade ${learnerGrade}, Topic: *${topicToUse}*).\n\nEnter any question or problem you are working on to get step-by-step guidance.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        `Explain ${topicToUse} step-by-step with formulas`,
        `Generate a Grade ${learnerGrade} CAPS exam problem on this topic`,
        `What are the key definitions and formulas I must memorize?`
      ]
    };

    setMessages([welcomeMsg]);
  };

  const handleDeleteSession = async (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this saved study conversation?')) return;
    try {
      await aiTutorService.deleteSession(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        handleStartNewSession();
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const isLanguageSubject = subject.toLowerCase().includes('language') || 
                            subject.toLowerCase().includes('hl') || 
                            subject.toLowerCase().includes('fal') ||
                            SA_OFFICIAL_LANGUAGES.some(l => l.name.toLowerCase() === subject.toLowerCase());

  const isPhysicsSubject = subject.toLowerCase().includes('physic') || 
                           subject.toLowerCase().includes('chem') || 
                           (subject.toLowerCase().includes('science') && !subject.toLowerCase().includes('life'));

  const isMathSubject = subject.toLowerCase().includes('math') || 
                        subject.toLowerCase().includes('algebra') || 
                        subject.toLowerCase().includes('calculus');

  const isLifeSciencesSubject = subject.toLowerCase().includes('life sc') || 
                                subject.toLowerCase().includes('bio');

  // Active Subject Topics List
  const activeSubjectItem = subjectsList.find(s => s.name.toLowerCase() === subject.toLowerCase());
  const activeTopics = activeSubjectItem ? activeSubjectItem.topics : [];

  const handleSwitchSubject = (newSub: string) => {
    if (newSub === subject) return;
    setSubject(newSub);
    setCurrentTopic('General Curriculum');
    setActiveConversationId(null);
    setEvaluationResult(null);
    setStudentAnswerText('');
    setPhysicsEvaluationResult(null);
    setStudentPhysicsAnswerText('');
    setMathEvaluationResult(null);
    setStudentMathAnswerText('');

    const newLower = newSub.toLowerCase();
    const isNewPhys = newLower.includes('physic') || newLower.includes('chem') || (newLower.includes('science') && !newLower.includes('life'));
    const isNewMath = newLower.includes('math') || newLower.includes('algebra') || newLower.includes('calculus');
    const isNewLs = newLower.includes('life sc') || newLower.includes('bio');

    if (activeTab === 'math-studio' && !isNewMath) {
      setActiveTab('chat');
    } else if (activeTab === 'physics-studio' && !isNewPhys) {
      setActiveTab('chat');
    } else if (activeTab === 'life-sciences-studio' && !isNewLs) {
      setActiveTab('chat');
    }

    let greeting = `Switched to **${newSub}** (Grade ${learnerGrade}). Select a CAPS topic or ask a question to explore formulas, concepts, or practice problems.`;
    let suggestions = [
      `Explain the foundational concepts of ${newSub}`,
      `Give me a Grade ${learnerGrade} exam practice question`,
      `What are the most common exam mistakes students make?`
    ];

    if (isNewMath) {
      greeting = `Switched to **Mathematics** (Grade ${learnerGrade}). You can study Paper 1 (Algebra, Sequences & Series, Functions, Finance, Calculus, Probability) or Paper 2 (Statistics, Analytical Geometry, Trigonometry, Euclidean Geometry). Enter any equation, theorem, or problem for step-by-step guidance!`;
      suggestions = [
        `Explain derivative from first principles for 3x² - 2x`,
        `How do I solve home loan balance outstanding in Financial Maths?`,
        `Prove the Euclidean Geometry theorem that angle at centre is twice angle at circumference`
      ];
    } else if (isNewPhys) {
      greeting = `Switched to **Physical Sciences** (Grade ${learnerGrade}). You can study Paper 1 (Physics: Projectiles, Momentum, Work-Energy, Doppler, Circuits, Electrodynamics) or Paper 2 (Chemistry: Organics, Reaction Rates, Equilibrium). Enter any calculation or theoretical question for step-by-step guidance!`;
      suggestions = [
        `Explain Vertical Projectile Motion sign conventions step-by-step`,
        `How do I calculate Kc in Chemical Equilibrium with an ICE table?`,
        `Show me the step-by-step calculation for an electric circuit with internal resistance`
      ];
    } else if (isNewLs) {
      greeting = `Switched to **Life Sciences** (Grade ${learnerGrade}). You can study Paper 1 (Reproduction, Endocrine System, Homeostasis, Response to Environment) or Paper 2 (DNA, Meiosis, Genetics, Evolution). Ask any biological question for detailed guidance!`;
      suggestions = [
        `Explain the negative feedback mechanism of blood glucose`,
        `What is the difference between transcription and translation?`,
        `Explain the steps of a reflex arc with an example`
      ];
    } else if (newSub.toLowerCase().includes('language') || newSub.toLowerCase().includes('hl') || newSub.toLowerCase().includes('fal')) {
      const currentLangObj = SA_OFFICIAL_LANGUAGES.find(l => l.name === selectedLanguage) || SA_OFFICIAL_LANGUAGES[0];
      greeting = `${currentLangObj.greeting}\n\nSelect a topic or ask a question on **${currentLangObj.name}** (Grammar, Literature, Poetry, or Writing).`;
    }

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions
      }
    ]);
  };

  const handleSwitchLanguage = (langName: string) => {
    setSelectedLanguage(langName);
    const langObj = SA_OFFICIAL_LANGUAGES.find(l => l.name === langName) || SA_OFFICIAL_LANGUAGES[0];
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `${langObj.greeting}\n\nI am ready to help you with **${langObj.name}** Grade-specific curriculum, including Paper 1 (Language & Grammar), Paper 2 (Literature & Poetry), Paper 3 (Creative Writing), and cultural idioms/proverbs. What would you like to study?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          `Explain Paper 1 Grammar rules in ${langObj.name}`,
          `Help me analyze a prescribed poetry piece`,
          `Give me essay writing structure tips for Paper 3`
        ]
      }
    ]);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle Send Message to Gemini AI Tutor
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const response = await aiTutorService.sendChat({
        subject: isLanguageSubject ? `${selectedLanguage} (${subject})` : subject,
        grade: learnerGrade,
        stream: learnerStream,
        topic: currentTopic,
        message: query,
        conversationId: activeConversationId,
        language: isLanguageSubject ? selectedLanguage : 'english'
      });

      let aiText = response.reply || response.answer || response.message || '';
      aiText = cleanHumanMath(aiText);

      if (response.conversationId && response.conversationId !== activeConversationId) {
        setActiveConversationId(response.conversationId);
        loadSavedConversations(subject);
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions || []
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('[AI TUTOR ERROR]', err);
      const errMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `I had trouble connecting to the curriculum tutor engine. Please check your network and try again!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Text-to-Speech (TTS) Synthesizer
  const toggleReadAloud = (messageId: string | number, fullText: string) => {
    if (!('speechSynthesis' in window)) {
      setSpeechError('Text-to-speech voice synthesis is not supported in your browser.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (speakingMsgId === messageId && isSpeaking) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = fullText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s?/g, '')
      .replace(/```[\s\S]*?```/g, 'Code example omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[\d+\s*Marks?\]/gi, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const zaVoice = voices.find(v => v.lang === 'en-ZA' || v.name.includes('South Africa') || v.lang.includes('en'));
    if (zaVoice) utterance.voice = zaVoice;

    utterance.onstart = () => {
      setSpeakingMsgId(messageId);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setSpeakingMsgId(null);
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeakingMsgId(null);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Speech-to-Text (STT) Dictation
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechError('Speech recognition is not supported in this browser.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      setSpeechError(null);
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-ZA';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) setInputText(transcript);
      };
      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice input: ${event.error}`);
          setTimeout(() => setSpeechError(null), 4000);
        }
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err: any) {
      setSpeechError('Microphone access unavailable.');
      setIsListening(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Subject / Language Selector */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-glow-indigo">
              <FusionAIIcon className="w-6 h-6 text-white" variant="pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display text-white">
                  CAPS Subject Tutor
                </h2>
                <Badge variant="cyan" size="sm">Grade {learnerGrade} {learnerStream}</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Subject Selector */}
            <select
              value={subject}
              onChange={(e) => handleSwitchSubject(e.target.value)}
              className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {subjectsList.length > 0 ? (
                subjectsList.map((sub) => (
                  <option key={sub.name} value={sub.name}>
                    {sub.name} ({sub.topicsCount} Topics)
                  </option>
                ))
              ) : (
                <option value={subject}>{subject}</option>
              )}
            </select>

            {/* 11 Official SA Language Selector (When Language Subject Selected) */}
            {isLanguageSubject && (
              <div className="flex items-center gap-1.5 bg-brand-600/20 border border-brand-500/40 rounded-xl px-3 py-1.5">
                <Languages className="w-4 h-4 text-cyan-300" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleSwitchLanguage(e.target.value)}
                  className="bg-transparent text-xs font-bold text-cyan-200 focus:outline-none cursor-pointer"
                >
                  {SA_OFFICIAL_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.name} className="bg-surface-darker text-white">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* New Study Session Button */}
            <button
              onClick={() => handleStartNewSession()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Studio & Chat Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
          <button
            onClick={() => setActiveTab('adaptive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'adaptive'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-surface-darker hover:bg-white/5 text-cyan-200 border border-cyan-500/20'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Adaptive practice</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'chat'
                ? 'bg-brand-600 text-white shadow-glow-indigo'
                : 'bg-surface-darker hover:bg-white/5 text-slate-300 border border-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>24/7 Subject AI Chat</span>
          </button>

          {/* Dynamic Studio Tab Buttons: Mathematics, Physical Sciences & Life Sciences */}
          {(isMathSubject || (!isMathSubject && !isPhysicsSubject && !isLifeSciencesSubject)) && (
            <button
              onClick={() => {
                setActiveTab('math-studio');
                if (!isMathSubject) {
                  setSubject('Mathematics');
                }
                loadMathStudio();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'math-studio'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-glow-amber border border-amber-400/40'
                  : 'bg-surface-darker hover:bg-white/5 text-amber-400 border border-amber-500/20'
              }`}
            >
              <Calculator className="w-4 h-4 text-amber-300" />
              <span>Grade 12 Mathematics Studio</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DBE Exam Lab & Formulas
              </span>
            </button>
          )}

          {(isPhysicsSubject || (!isMathSubject && !isPhysicsSubject && !isLifeSciencesSubject)) && (
            <button
              onClick={() => {
                setActiveTab('physics-studio');
                if (!isPhysicsSubject) {
                  setSubject('Physical Sciences');
                }
                loadPhysicsStudio();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'physics-studio'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-glow-indigo border border-cyan-400/40'
                  : 'bg-surface-darker hover:bg-white/5 text-cyan-400 border border-cyan-500/20'
              }`}
            >
              <Atom className="w-4 h-4 text-cyan-300" />
              <span>Grade 12 Physical Sciences Studio</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                DBE Exam Lab & Formulas
              </span>
            </button>
          )}

          {(isLifeSciencesSubject || (!isMathSubject && !isPhysicsSubject && !isLifeSciencesSubject)) && (
            <button
              onClick={() => {
                setActiveTab('life-sciences-studio');
                if (!isLifeSciencesSubject) {
                  setSubject('Life Sciences');
                }
                loadLifeSciencesStudio();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'life-sciences-studio'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald border border-emerald-400/40'
                  : 'bg-surface-darker hover:bg-white/5 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              <Dna className="w-4 h-4 text-emerald-300" />
              <span>Grade 12 Life Sciences Studio</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AI Rubric Marker
              </span>
            </button>
          )}
        </div>

        {/* CAPS Syllabus Topics Bar for Selected Subject */}
        {activeTopics.length > 0 && (
          <div className="pt-3 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                <GraduationCap className="w-4 h-4 text-brand-400" />
                <span>Grade {learnerGrade} CAPS Syllabus Topics ({subject}):</span>
              </div>
              <span className="text-[11px] text-cyan-300 font-mono">Active: {currentTopic}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {activeTopics.map((t) => {
                const isActive = currentTopic.toLowerCase() === t.topic.toLowerCase();
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setCurrentTopic(t.topic);
                      handleSendMessage(`Let's study the topic: "${t.topic}". Please give me a clear breakdown of the core concepts, formulas, and what is tested in formal exams.`);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      isActive
                        ? 'bg-brand-600 text-white border-brand-400 shadow-glow-indigo'
                        : 'bg-surface-darker hover:bg-white/10 text-slate-300 border-white/5'
                    }`}
                  >
                    {t.topic}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Render Main Content: Either Dedicated Studios OR 24/7 Chat Grid */}
      {activeTab === 'adaptive' ? (
        <AdaptivePracticePanel subject={subject} grade={learnerGrade} />
      ) : activeTab === 'math-studio' ? (
        <div className="space-y-4">
          {/* Mathematics Studio Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-orange-950/80 border border-amber-500/30 p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    DBE CAPS NSC Lab 2026
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    Paper 1 & Paper 2
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    7 Official Textbooks & Memos
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-400" />
                  <span>Grade 12 Mathematics NSC Exam Studio & AI Formula Lab</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Master Algebra & Inequalities, Sequences & Series, Functions & Inverses, Financial Maths, Differential Calculus, Probability, Statistics, Analytical Geometry, Trigonometry, and Euclidean Geometry. Write your full algebraic steps, critical values, and geometric reasons in brackets to receive instant marks against official DBE marking guidelines.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-surface-darker/90 border border-white/10 p-1.5 rounded-2xl shrink-0">
                {(['all', 'Paper 1 (Maths)', 'Paper 2 (Maths)'] as const).map((pf) => (
                  <button
                    key={pf}
                    onClick={() => setMathPaperFilter(pf)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      mathPaperFilter === pf
                        ? 'bg-amber-600 text-white shadow-glow-amber'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {pf === 'all' ? 'All Papers' : pf === 'Paper 1 (Maths)' ? 'Paper 1 (Maths)' : 'Paper 2 (Maths)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Studio Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Question Explorer (5 Cols) */}
            <div className="lg:col-span-5 rounded-3xl bg-surface-dark border border-white/10 p-4 shadow-xl flex flex-col h-[680px]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase text-white tracking-wider">
                    Official Exam Questions ({mathData.filter(x => mathPaperFilter === 'all' || x.paper === mathPaperFilter).length})
                  </span>
                </div>
                <button
                  onClick={loadMathStudio}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                  title="Refresh Questions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMathData ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {mathData
                  .filter(item => mathPaperFilter === 'all' || item.paper === mathPaperFilter)
                  .map((item) => {
                    const isSelected = selectedMathItem?.id === item.id;
                    const isP1 = item.paper.includes('Paper 1');
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectMathQuestion(item)}
                        className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500/60 shadow-glow-amber ring-1 ring-amber-500/40'
                            : 'bg-surface-darker hover:bg-white/5 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isP1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {isP1 ? 'Paper 1 • Maths' : 'Paper 2 • Maths'}
                          </span>
                          <span className="text-[10px] font-bold text-cyan-400">
                            [{item.rubric_points?.length || 5} Marks]
                          </span>
                        </div>
                        <p className="font-bold text-white text-xs line-clamp-1">{item.topic} — {item.subtopic}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.question}</p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right: Answer & Rubric Grading Workspace (7 Cols) */}
            <div className="lg:col-span-7 rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl flex flex-col h-[680px] overflow-y-auto space-y-4">
              {selectedMathItem ? (
                <>
                  {/* Selected Question Header */}
                  <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedMathItem.paper.includes('Paper 1') ? 'amber' : 'emerald'} size="sm">
                          {selectedMathItem.paper}
                        </Badge>
                        <span className="text-xs font-bold text-slate-300">{selectedMathItem.topic} • {selectedMathItem.subtopic}</span>
                      </div>
                      <span className="text-xs font-bold text-cyan-400">
                        Total: {selectedMathItem.rubric_points?.length || 5} Marks
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {selectedMathItem.question}
                    </h4>

                    {/* Formula Sheet & Prescribed Definition Box */}
                    {(selectedMathItem.formula || selectedMathItem.prescribed_definition) && (
                      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 space-y-1 text-xs">
                        {selectedMathItem.formula && (
                          <div className="flex items-start gap-1.5 text-amber-200">
                            <span className="font-bold text-amber-400 shrink-0">Formula Sheet:</span>
                            <span className="font-mono text-[11.5px]">{selectedMathItem.formula}</span>
                          </div>
                        )}
                        {selectedMathItem.constants && (
                          <div className="flex items-start gap-1.5 text-slate-300 text-[11px]">
                            <span className="font-bold text-slate-400 shrink-0">Standard Form / Conditions:</span>
                            <span className="font-mono">{selectedMathItem.constants}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Student Answer Input Form */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Your Full Algebraic Working / Proof:</span>
                      <span className="text-[11px] font-normal text-slate-400">Show formulas, substitutions, critical values, and reasons in brackets [Reason]</span>
                    </label>
                    <textarea
                      value={studentMathAnswerText}
                      onChange={(e) => setStudentMathAnswerText(e.target.value)}
                      rows={5}
                      placeholder="Step 1: State standard formula from formula sheet\nStep 2: Substitute values with signs\nStep 3: Simplify and state critical values or reasons in brackets e.g. [line || one side of Δ]...\nFinal Answer: stated clearly in simplest form"
                      className="w-full rounded-2xl bg-surface-darker border border-white/10 p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed resize-none font-mono"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleEvaluateMathAnswer}
                          disabled={evaluatingMath || !studentMathAnswerText.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white text-xs font-bold shadow-glow-amber disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                        >
                          {evaluatingMath ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <span>Marking with CAPS Rubric...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Grade Solution with CAPS Rubric</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('chat');
                            handleSendMessage(`Can you explain the Grade 12 Mathematics problem: "${selectedMathItem.question}" (${selectedMathItem.paper} - ${selectedMathItem.topic})? Please provide the full step-by-step algebraic solution with reasons and matric exam guidance.`);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 text-xs font-bold transition-all"
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span>Ask AI in Chat</span>
                        </button>
                      </div>

                      <button
                        onClick={() => setShowMathModelAnswer(!showMathModelAnswer)}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        {showMathModelAnswer ? 'Hide Marking Memo' : 'View CAPS Marking Memo'}
                      </button>
                    </div>
                  </div>

                  {/* Evaluation Results Card */}
                  {mathEvaluationResult && (
                    <div className="rounded-2xl bg-surface-darker border border-amber-500/40 p-4 space-y-3 shadow-lg animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Official DBE Marking Result</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-amber-400">
                            {mathEvaluationResult.estimatedMark} Marks
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            ({mathEvaluationResult.percentage})
                          </span>
                        </div>
                      </div>

                      {/* Feedback banner */}
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {mathEvaluationResult.feedback}
                      </p>

                      {/* Human guidance note */}
                      {mathEvaluationResult.humanGuidance && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11.5px] leading-relaxed">
                            <span className="font-bold text-amber-300">Teacher's Advice: </span>
                            {mathEvaluationResult.humanGuidance}
                          </p>
                        </div>
                      )}

                      {/* Keyword Breakdown */}
                      <div className="space-y-2 pt-1">
                        <div>
                          <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mb-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Matched Mathematical Terms & Steps ({mathEvaluationResult.matchedTerms?.length || 0}):</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {mathEvaluationResult.matchedTerms?.length > 0 ? (
                              mathEvaluationResult.matchedTerms.map((term: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                  ✓ {term}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500">None detected. Check algebraic factors and standard notation.</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] font-bold text-violet-400 flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Missing Technical Steps to Include ({mathEvaluationResult.missingTerms?.length || 0}):</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {mathEvaluationResult.missingTerms?.map((term: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/25 text-[10px] font-medium">
                                • {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Rubric Checklist */}
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>DBE Step-by-Step Marking Breakdown:</span>
                        </span>
                        <div className="space-y-1 bg-surface-dark/80 p-3 rounded-xl border border-white/5">
                          {mathEvaluationResult.rubricChecklist?.map((point: string, idx: number) => (
                            <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                              <span className="text-amber-400 font-bold">•</span>
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Common Misconception Warning Banner */}
                  {selectedMathItem.common_misconceptions && (
                    <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Common Matric Examination Trap / Pitfall:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-100/90">
                        {selectedMathItem.common_misconceptions}
                      </p>
                    </div>
                  )}

                  {/* Official Model Answer Drawer */}
                  {showMathModelAnswer && (
                    <div className="p-4 rounded-2xl bg-surface-darker border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                          Official CAPS Marking Memorandum
                        </span>
                        <Badge variant="amber" size="sm">DBE Standard</Badge>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-mono bg-surface-dark/60 p-3 rounded-xl">
                        {selectedMathItem.model_answer}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs space-y-2">
                  <Calculator className="w-8 h-8 mx-auto text-slate-600" />
                  <p>Select a Mathematics question from the left panel to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'physics-studio' ? (
        <div className="space-y-4">
          {/* Physical Sciences Studio Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-cyan-950/80 border border-cyan-500/30 p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    DBE CAPS NSC Lab 2026
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Paper 1 (Physics) & Paper 2 (Chemistry)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    8 Official Textbooks & Memos
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Atom className="w-5 h-5 text-cyan-400" />
                  <span>Grade 12 Physical Sciences NSC Exam Studio & AI Formula Lab</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Practice high-frequency national examination calculations and definitions across Vertical Projectile Motion, Momentum & Impulse, Work-Energy-Power, Doppler Effect, Electric Circuits, Electrodynamics, Photoelectric Effect, Organic Chemistry, Reaction Rates, and Chemical Equilibrium. Receive step-by-step grading against official DBE marking guidelines.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-surface-darker/90 border border-white/10 p-1.5 rounded-2xl shrink-0">
                {(['all', 'Paper 1 (Physics)', 'Paper 2 (Chemistry)'] as const).map((pf) => (
                  <button
                    key={pf}
                    onClick={() => setPhysicsPaperFilter(pf)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      physicsPaperFilter === pf
                        ? 'bg-cyan-600 text-white shadow-glow-indigo'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {pf === 'all' ? 'All Papers' : pf === 'Paper 1 (Physics)' ? 'Paper 1 (Physics)' : 'Paper 2 (Chemistry)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Studio Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Question Explorer (5 Cols) */}
            <div className="lg:col-span-5 rounded-3xl bg-surface-dark border border-white/10 p-4 shadow-xl flex flex-col h-[680px]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase text-white tracking-wider">
                    Official Exam Questions ({physicsData.filter(x => physicsPaperFilter === 'all' || x.paper === physicsPaperFilter).length})
                  </span>
                </div>
                <button
                  onClick={loadPhysicsStudio}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                  title="Refresh Questions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPhysicsData ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {physicsData
                  .filter(item => physicsPaperFilter === 'all' || item.paper === physicsPaperFilter)
                  .map((item) => {
                    const isSelected = selectedPhysicsItem?.id === item.id;
                    const isP1 = item.paper.includes('Paper 1');
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectPhysicsQuestion(item)}
                        className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/60 shadow-glow-indigo ring-1 ring-cyan-500/40'
                            : 'bg-surface-darker hover:bg-white/5 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isP1 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}>
                            {isP1 ? 'Paper 1 • Physics' : 'Paper 2 • Chemistry'}
                          </span>
                          <span className="text-[10px] font-bold text-amber-400">
                            [{item.rubric_points?.length || 5} Marks]
                          </span>
                        </div>
                        <p className="font-bold text-white text-xs line-clamp-1">{item.topic} — {item.subtopic}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.question}</p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right: Answer & Rubric Grading Workspace (7 Cols) */}
            <div className="lg:col-span-7 rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl flex flex-col h-[680px] overflow-y-auto space-y-4">
              {selectedPhysicsItem ? (
                <>
                  {/* Selected Question Header */}
                  <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedPhysicsItem.paper.includes('Paper 1') ? 'cyan' : 'indigo'} size="sm">
                          {selectedPhysicsItem.paper}
                        </Badge>
                        <span className="text-xs font-bold text-slate-300">{selectedPhysicsItem.topic} • {selectedPhysicsItem.subtopic}</span>
                      </div>
                      <span className="text-xs font-bold text-amber-400">
                        Total: {selectedPhysicsItem.rubric_points?.length || 5} Marks
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {selectedPhysicsItem.question}
                    </h4>

                    {/* Formula Sheet & Constants Box */}
                    {(selectedPhysicsItem.formula || selectedPhysicsItem.constants) && (
                      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-1 text-xs">
                        {selectedPhysicsItem.formula && (
                          <div className="flex items-start gap-1.5 text-cyan-200">
                            <span className="font-bold text-cyan-400 shrink-0">Prescribed Formula:</span>
                            <span className="font-mono text-[11.5px]">{selectedPhysicsItem.formula}</span>
                          </div>
                        )}
                        {selectedPhysicsItem.constants && (
                          <div className="flex items-start gap-1.5 text-slate-300 text-[11px]">
                            <span className="font-bold text-slate-400 shrink-0">Physical Constants:</span>
                            <span className="font-mono">{selectedPhysicsItem.constants}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Student Answer Input Form */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Your Solution / Working / Scientific Definition:</span>
                      <span className="text-[11px] font-normal text-slate-400">State formula, substitution with directional signs (+/-), and SI units</span>
                    </label>
                    <textarea
                      value={studentPhysicsAnswerText}
                      onChange={(e) => setStudentPhysicsAnswerText(e.target.value)}
                      rows={5}
                      placeholder="Step 1: Formula from data sheet (e.g. Wnet = ΔK)\nStep 2: Substitution with direction signs\nStep 3: Final calculated answer with SI unit (e.g. 4.49 s, 25.5 J, 1.83 m·s⁻¹ east)..."
                      className="w-full rounded-2xl bg-surface-darker border border-white/10 p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed resize-none font-mono"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleEvaluatePhysicsAnswer}
                          disabled={evaluatingPhysics || !studentPhysicsAnswerText.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white text-xs font-bold shadow-glow-indigo disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                        >
                          {evaluatingPhysics ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <span>Marking with CAPS Rubric...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Grade Solution with CAPS Rubric</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('chat');
                            handleSendMessage(`Can you explain the Grade 12 Physical Sciences concept: "${selectedPhysicsItem.question}" (${selectedPhysicsItem.paper} - ${selectedPhysicsItem.topic})? Please provide the full step-by-step calculation with formula, signs, units, and matric exam advice.`);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 text-xs font-bold transition-all"
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span>Ask AI in Chat</span>
                        </button>
                      </div>

                      <button
                        onClick={() => setShowPhysicsModelAnswer(!showPhysicsModelAnswer)}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        {showPhysicsModelAnswer ? 'Hide Marking Memo' : 'View CAPS Marking Memo'}
                      </button>
                    </div>
                  </div>

                  {/* Evaluation Results Card */}
                  {physicsEvaluationResult && (
                    <div className="rounded-2xl bg-surface-darker border border-cyan-500/40 p-4 space-y-3 shadow-lg animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Official DBE Marking Result</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-cyan-400">
                            {physicsEvaluationResult.estimatedMark} Marks
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            ({physicsEvaluationResult.percentage})
                          </span>
                        </div>
                      </div>

                      {/* Feedback banner */}
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {physicsEvaluationResult.feedback}
                      </p>

                      {/* Human guidance note */}
                      {physicsEvaluationResult.humanGuidance && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11.5px] leading-relaxed">
                            <span className="font-bold text-amber-300">Teacher's Advice: </span>
                            {physicsEvaluationResult.humanGuidance}
                          </p>
                        </div>
                      )}

                      {/* Keyword Breakdown */}
                      <div className="space-y-2 pt-1">
                        <div>
                          <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 mb-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Matched Technical Variables & Terms ({physicsEvaluationResult.matchedTerms?.length || 0}):</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {physicsEvaluationResult.matchedTerms?.length > 0 ? (
                              physicsEvaluationResult.matchedTerms.map((term: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                                  ✓ {term}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500">None detected. Check formula symbols and units.</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] font-bold text-violet-400 flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Missing Technical Terms to Include ({physicsEvaluationResult.missingTerms?.length || 0}):</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {physicsEvaluationResult.missingTerms?.map((term: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/25 text-[10px] font-medium">
                                • {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Rubric Checklist */}
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>DBE Step-by-Step Marking Breakdown:</span>
                        </span>
                        <div className="space-y-1 bg-surface-dark/80 p-3 rounded-xl border border-white/5">
                          {physicsEvaluationResult.rubricChecklist?.map((point: string, idx: number) => (
                            <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                              <span className="text-cyan-400 font-bold">•</span>
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Common Misconception Warning Banner */}
                  {selectedPhysicsItem.common_misconceptions && (
                    <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Common Matric Examination Trap / Pitfall:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-100/90">
                        {selectedPhysicsItem.common_misconceptions}
                      </p>
                    </div>
                  )}

                  {/* Official Model Answer Drawer */}
                  {showPhysicsModelAnswer && (
                    <div className="p-4 rounded-2xl bg-surface-darker border border-cyan-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          Official CAPS Marking Memorandum
                        </span>
                        <Badge variant="cyan" size="sm">DBE Standard</Badge>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-mono bg-surface-dark/60 p-3 rounded-xl">
                        {selectedPhysicsItem.model_answer}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs space-y-2">
                  <Atom className="w-8 h-8 mx-auto text-slate-600" />
                  <p>Select a Physical Sciences question from the left panel to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'life-sciences-studio' ? (
        <div className="space-y-4">
          {/* Life Sciences Studio Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-emerald-950/70 via-surface-dark to-surface-darker border border-emerald-500/30 p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    DBE CAPS Model 2026
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Paper 1 & Paper 2
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Dna className="w-5 h-5 text-emerald-400" />
                  <span>Grade 12 Life Sciences NSC Exam Practice & AI Rubric Studio</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Practice high-frequency national examination questions across Human Reproduction, Endocrine Negative Feedback, Reflex Arcs, Protein Synthesis, and Genetics. Write your answer and receive immediate grading against official DBE marking criteria.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-surface-darker/90 border border-white/10 p-1.5 rounded-2xl shrink-0">
                {(['all', 'Paper 1', 'Paper 2'] as const).map((pf) => (
                  <button
                    key={pf}
                    onClick={() => setPaperFilter(pf)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      paperFilter === pf
                        ? 'bg-emerald-600 text-white shadow-glow-emerald'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {pf === 'all' ? 'All Papers' : pf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Studio Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Question Explorer (5 Cols) */}
            <div className="lg:col-span-5 rounded-3xl bg-surface-dark border border-white/10 p-4 shadow-xl flex flex-col h-[680px]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase text-white tracking-wider">
                    Official Exam Questions ({lifeSciencesData.filter(x => paperFilter === 'all' || x.paper === paperFilter).length})
                  </span>
                </div>
                <button
                  onClick={loadLifeSciencesStudio}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                  title="Refresh Questions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLsData ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {lifeSciencesData
                  .filter(item => paperFilter === 'all' || item.paper === paperFilter)
                  .map((item) => {
                    const isSelected = selectedLsItem?.id === item.id;
                    const isP1 = item.paper === 'Paper 1';
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectLsQuestion(item)}
                        className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/60 shadow-glow-emerald ring-1 ring-emerald-500/40'
                            : 'bg-surface-darker hover:bg-white/5 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isP1 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {item.paper}
                          </span>
                          <span className="text-[10px] font-bold text-violet-400">
                            [{item.rubric_points?.length || 5} Marks]
                          </span>
                        </div>
                        <p className="font-bold text-white text-xs line-clamp-1">{item.subtopic}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.question}</p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right: Answer & Rubric Grading Workspace (7 Cols) */}
            <div className="lg:col-span-7 rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl flex flex-col h-[680px] overflow-y-auto space-y-4">
              {selectedLsItem ? (
                <>
                  {/* Selected Question Header */}
                  <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedLsItem.paper === 'Paper 1' ? 'emerald' : 'cyan'} size="sm">
                          {selectedLsItem.paper}
                        </Badge>
                        <span className="text-xs font-bold text-slate-300">{selectedLsItem.topic} • {selectedLsItem.subtopic}</span>
                      </div>
                      <span className="text-xs font-bold text-violet-400">
                        Total: {selectedLsItem.rubric_points?.length || 6} Marks
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {selectedLsItem.question}
                    </h4>
                  </div>

                  {/* Student Answer Input Form */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Your Biological Explanation / Answer:</span>
                      <span className="text-[11px] font-normal text-slate-400">Include exact scientific terminology</span>
                    </label>
                    <textarea
                      value={studentAnswerText}
                      onChange={(e) => setStudentAnswerText(e.target.value)}
                      rows={5}
                      placeholder="Type your complete answer here. Mention specific enzymes, hormones, base pairings, or biological steps..."
                      className="w-full rounded-2xl bg-surface-darker border border-white/10 p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-none"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleEvaluateAnswer}
                          disabled={evaluating || !studentAnswerText.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold shadow-glow-emerald disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                        >
                          {evaluating ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <span>Marking with CAPS Rubric...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Grade My Answer with AI Rubric</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('chat');
                            handleSendMessage(`Can you explain the Grade 12 Life Sciences concept: "${selectedLsItem.question}" (${selectedLsItem.paper} - ${selectedLsItem.subtopic})? Please provide the full step-by-step breakdown and matric exam advice.`);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 text-xs font-bold transition-all"
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span>Ask AI in Chat</span>
                        </button>
                      </div>

                      <button
                        onClick={() => setShowModelAnswer(!showModelAnswer)}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        {showModelAnswer ? 'Hide Memo' : 'View CAPS Model Memo'}
                      </button>
                    </div>
                  </div>

                  {/* Evaluation Results Card */}
                  {evaluationResult && (
                    <div className="rounded-2xl bg-surface-darker border border-emerald-500/40 p-4 space-y-3 shadow-lg animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-violet-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">CAPS Rubric Evaluation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-emerald-400">
                            {evaluationResult.estimatedMark} Marks
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            ({evaluationResult.percentage})
                          </span>
                        </div>
                      </div>

                      {/* Feedback banner */}
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {evaluationResult.feedback}
                      </p>

                      {/* Keyword Breakdown */}
                      <div className="space-y-2 pt-1">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mb-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Matched Scientific Keywords ({evaluationResult.matchedTerms?.length || 0}):</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {evaluationResult.matchedTerms?.length > 0 ? (
                              evaluationResult.matchedTerms.map((term: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                  ✓ {term}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500">None detected.</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] font-bold text-violet-400 flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Missing Technical Terms to Include ({evaluationResult.missingTerms?.length || 0}):</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {evaluationResult.missingTerms?.map((term: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/25 text-[10px] font-medium">
                                • {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Rubric Checklist Accordion */}
                      <div className="pt-2 border-t border-white/5">
                        <button
                          onClick={() => setShowRubricDetails(!showRubricDetails)}
                          className="flex items-center justify-between w-full text-xs font-bold text-slate-300 hover:text-white"
                        >
                          <span>Official DBE Marking Criteria ({evaluationResult.rubricChecklist?.length} Points)</span>
                          {showRubricDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {showRubricDetails && (
                          <div className="mt-2 space-y-1 bg-surface-dark/80 p-3 rounded-xl border border-white/5">
                            {evaluationResult.rubricChecklist?.map((point: string, idx: number) => (
                              <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                                <span className="text-emerald-400 font-bold">•</span>
                                <span>{point}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Common Misconception Warning Banner */}
                  {selectedLsItem.common_misconceptions && (
                    <div className="p-3.5 rounded-2xl bg-violet-950/40 border border-violet-500/30 text-violet-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-violet-300">
                        <AlertTriangle className="w-4 h-4 text-violet-400 shrink-0" />
                        <span>Common NSC Candidate Trap / Pitfall:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-violet-100/90">
                        {selectedLsItem.common_misconceptions}
                      </p>
                    </div>
                  )}

                  {/* Official Model Answer Drawer */}
                  {showModelAnswer && (
                    <div className="p-4 rounded-2xl bg-surface-darker border border-cyan-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          Official CAPS Model Memo
                        </span>
                        <Badge variant="cyan" size="sm">DBE Standard</Badge>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-mono bg-surface-dark/60 p-3 rounded-xl">
                        {selectedLsItem.model_answer}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs space-y-2">
                  <Dna className="w-8 h-8 mx-auto text-slate-600" />
                  <p>Select a Life Sciences question from the left panel to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Main Chat Interface Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left / Center Chat Pane (8 Cols) */}
          <div className="lg:col-span-8 rounded-3xl bg-surface-dark border border-white/10 shadow-xl flex flex-col h-[650px] overflow-hidden">
            {/* Active Context Bar */}
            <div className="px-5 py-3 border-b border-white/10 bg-surface-darker/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white font-display">
                  {isLanguageSubject ? `${selectedLanguage} Specialist` : `${subject} Specialist`}
                </span>
                <span className="text-[11px] text-slate-400 truncate max-w-[280px]">• {currentTopic}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSendMessage(`Please provide a comprehensive study guide for ${subject} on "${currentTopic}". Include key definitions, formulas, rules, and exam tips.`)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 font-bold text-[11px] border border-brand-500/30 transition-colors"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Explain Topic</span>
                </button>
                <button
                  onClick={() => handleSendMessage(`Generate a South African CAPS examination practice question for Grade ${learnerGrade} ${subject} on "${currentTopic}". Include mark allocation [e.g. 5 Marks] and test my problem solving.`)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] border border-cyan-500/30 transition-colors"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Practice Exam Question</span>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isAi = msg.sender === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAi && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 shadow-sm">
                        <FusionAIIcon className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed ${
                        isAi
                          ? 'bg-surface-darker border border-white/10 text-slate-200'
                          : 'bg-brand-600 text-white shadow-glow-indigo'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1.5 opacity-60 text-[10px]">
                        <span className="font-bold">
                          {isAi ? `${isLanguageSubject ? selectedLanguage : subject} Tutor` : 'You'}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className="whitespace-pre-wrap space-y-2">
                        {msg.text}
                      </div>

                      {/* Interactive AI Suggestion Action Pills */}
                      {isAi && msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                          <p className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Suggested Next Steps:</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.suggestions.map((sugg, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => handleSendMessage(sugg)}
                                className="px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/25 text-brand-300 text-[11px] font-medium border border-brand-500/20 text-left transition-all hover:scale-[1.02]"
                              >
                                {sugg}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {isAi && (
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => toggleReadAloud(msg.id, msg.text)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              speakingMsgId === msg.id && isSpeaking
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald animate-pulse'
                                : 'bg-white/5 hover:bg-white/10 text-emerald-300'
                            }`}
                          >
                            {speakingMsgId === msg.id && isSpeaking ? (
                              <>
                                <VolumeX className="w-3 h-3 text-white" />
                                <span>Speaking...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-emerald-400" />
                                <span>Read Aloud</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleSendMessage(`Can you explain this simpler with a simple South African real-world analogy: "${msg.text.slice(0, 70)}..."`)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-brand-300 font-medium transition-colors"
                          >
                            <Lightbulb className="w-3 h-3" />
                            <span>Explain with Analogy</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-600/30 flex items-center justify-center text-brand-400">
                    <FusionAIIcon className="w-4 h-4 text-cyan-400" variant="pulse" />
                  </div>
                  <div className="rounded-2xl bg-surface-darker border border-white/10 p-3 text-xs text-slate-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Reviewing Grade {learnerGrade} {subject} syllabus and solving...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Speech Error Banner */}
            {speechError && (
              <div className="px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{typeof speechError === 'string' ? speechError : (speechError as any)?.message || String(speechError)}</span>
              </div>
            )}

            {/* Voice Listening Banner */}
            {isListening && (
              <div className="px-4 py-2 bg-rose-500/20 border-t border-rose-500/30 flex items-center justify-between text-rose-300 text-xs">
                <div className="flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>Listening to your voice... Speak clearly</span>
                </div>
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/30 text-white"
                >
                  Done
                </button>
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="p-4 border-t border-white/10 bg-surface-darker">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all shadow-md shrink-0 ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-glow-rose ring-2 ring-rose-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                  }`}
                  title="Voice Dictation (Speech-to-Text)"
                >
                  {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-rose-400" />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Ask anything about ${subject} (e.g. explain formula, test me, step-by-step calculation)...`}
                  className="flex-1 rounded-xl bg-surface-dark border border-white/10 px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />

                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-glow-indigo disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Saved Conversations & Syllabus Guide (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Saved Conversations Drawer */}
            <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-brand-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Saved Sessions ({subject})
                  </h3>
                </div>
                <button
                  onClick={() => handleStartNewSession()}
                  className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              {loadingConversations ? (
                <div className="py-6 flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : conversations.length > 0 ? (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {conversations.map((c) => {
                    const isSelected = activeConversationId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectConversation(c)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-brand-600/20 border-brand-500/50 shadow-glow-indigo'
                            : 'bg-surface-darker hover:bg-white/5 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="font-bold text-white line-clamp-1">{c.title || c.topic}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{c.last_message_preview || 'No messages yet'}</p>
                          <div className="flex items-center gap-2 text-[9.5px] text-cyan-400">
                            <span>{c.message_count || 0} messages</span>
                            <span>•</span>
                            <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteSession(e, c.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-5 text-center text-slate-400 text-xs space-y-1">
                  <MessageSquare className="w-6 h-6 mx-auto text-slate-600" />
                  <p>No saved conversations for {subject} yet.</p>
                  <p className="text-[10px] text-slate-500">Every question you ask will be saved automatically here.</p>
                </div>
              )}
            </div>

            {/* Academic CAPS Guidelines Card */}
            <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                <span>CAPS Tutor Capabilities</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-surface-darker border border-white/5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Syllabus-Aligned Answers</p>
                    <p className="text-[10.5px] text-slate-400">Explanations strictly adhere to the South African Department of Basic Education standards.</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-darker border border-white/5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Strict Academic Focus</p>
                    <p className="text-[10.5px] text-slate-400">Guards against off-topic distractions to maximize your study productivity.</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-darker border border-white/5 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Persistent Multi-Session Memory</p>
                    <p className="text-[10.5px] text-slate-400">Continue previous study sessions or start fresh whenever you tackle new topics.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

