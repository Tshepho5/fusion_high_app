import React, { useState, useEffect, useRef } from 'react';
import { learnerService } from '../../services/api';
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
  Play,
  Pause,
  Sliders,
  Square
} from 'lucide-react';

interface LearnerAITutorProps {
  initialSubject?: string;
  initialTopicId?: string;
  initialTopicName?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isQuiz?: boolean;
  quizData?: any;
}

export const SA_OFFICIAL_LANGUAGES = [
  { id: 'isizulu', name: 'isiZulu', label: 'isiZulu (Zulu)', greeting: 'Sawubona! Ngingu-Fusion AI Subject Specialist wesiZulu.' },
  { id: 'isixhosa', name: 'isiXhosa', label: 'isiXhosa (Xhosa)', greeting: 'Molo! Ndingu-Fusion AI Subject Specialist wesiXhosa.' },
  { id: 'afrikaans', name: 'Afrikaans', label: 'Afrikaans', greeting: 'Hallo! Ek is jou Fusion AI Vakspesialis vir Afrikaans.' },
  { id: 'english', name: 'English', label: 'English', greeting: 'Hello! I am your Fusion AI Subject Specialist for English.' },
  { id: 'sepedi', name: 'Sepedi', label: 'Sepedi (Sesotho sa Leboa)', greeting: 'Dumela! Ke nna Fusion AI Subject Specialist ya Sepedi.' },
  { id: 'setswana', name: 'Setswana', label: 'Setswana (Tswana)', greeting: 'Dumela! Ke nna Fusion AI Subject Specialist ya Setswana.' },
  { id: 'sesotho', name: 'Sesotho', label: 'Sesotho (Southern Sotho)', greeting: 'Dumela! Ke nna Fusion AI Subject Specialist ya Sesotho.' },
  { id: 'xitsonga', name: 'Xitsonga', label: 'Xitsonga (Tsonga)', greeting: 'Avuxeni! Hi mina Fusion AI Subject Specialist ya Xitsonga.' },
  { id: 'siswati', name: 'siSwati', label: 'siSwati (Swati)', greeting: 'Sawubona! Ngingu-Fusion AI Subject Specialist wesiSwati.' },
  { id: 'tshivenda', name: 'Tshivenda', label: 'Tshivenda (Venda)', greeting: 'Ndaa / Aa! Ndi nne Fusion AI Subject Specialist ya Tshivenda.' },
  { id: 'isindebele', name: 'isiNdebele', label: 'isiNdebele (Ndebele)', greeting: 'Lotjhani! Ngingu-Fusion AI Subject Specialist wesiNdebele.' },
];

const SUBJECT_LIST = [
  'Mathematics',
  'Mathematical Literacy',
  'Physical Sciences',
  'Life Sciences',
  'Accounting',
  'Business Studies',
  'Economics',
  'Tourism',
  'Geography',
  'History',
  'Home Language (HL)',
  'First Additional Language (FAL)',
  'Life Orientation'
];

const SUBJECT_PROMPTS: Record<string, string[]> = {
  'Life Sciences': [
    'Explain DNA replication and the role of helicase step-by-step.',
    'How does negative feedback regulate blood glucose with insulin and glucagon?',
    'What is the difference between Transcription and Translation in protein synthesis?',
    'Explain chromosome non-disjunction during meiosis with an example.'
  ],
  'Mathematics': [
    'Explain how to solve quadratic inequalities using a critical values number line.',
    'Show me how to prove the Sine Rule in trigonometry step-by-step.',
    'How do I calculate derivatives from first principles f\'(x)?',
    'Explain how to calculate future value annuities with compound interest.'
  ],
  'Physical Sciences': [
    'Explain Newton’s Second Law with a 2-block pulley tension example.',
    'How do I apply Le Chatelier’s Principle when temperature and pressure change?',
    'What is the Doppler Effect equation when an ambulance moves towards an observer?',
    'Explain how a Galvanic electrochemical cell generates current.'
  ],
  'Accounting': [
    'How do I record asset disposal when equipment is sold at a loss?',
    'Explain the difference between Solvency Ratio and Acid Test Ratio.',
    'How do I prepare a Cash Flow Statement from Operating Activities?',
    'Explain King IV corporate governance audit requirements for public companies.'
  ],
  'Tourism': [
    'How do I calculate arrival local time across Greenwich Mean Time (GMT) zones?',
    'Explain the 3Ps pillars of Sustainable Tourism (People, Planet, Profit).',
    'How do I convert South African Rand (ZAR) to US Dollars using BSR vs BBR?',
    'What are the key world heritage sites in South Africa?'
  ],
  'Business Studies': [
    'Explain the difference between Micro, Market, and Macro business environments.',
    'What are the eight business functions and their key management responsibilities?',
    'Explain the recruitment and selection process in Human Resources.'
  ],
  'Economics': [
    'Explain the Circular Flow Model in an open economy with foreign markets.',
    'What is the difference between Demand-Pull and Cost-Push inflation?',
    'Explain the four phases of a Business Cycle and economic forecasting.'
  ],
  'Geography': [
    'Explain how Mid-latitude Cyclones form and their weather impact on South Africa.',
    'What is the difference between dendritic and trellis river drainage patterns?',
    'Explain how to calculate map gradient and real-world distance.'
  ],
  'History': [
    'Explain the causes and consequences of the Cuban Missile Crisis during the Cold War.',
    'What were the key ideas of the Black Consciousness Movement in South Africa?',
    'Explain the Truth and Reconciliation Commission (TRC) process.'
  ],
  'Mathematical Literacy': [
    'How do I calculate income tax using the SARS annual tax brackets?',
    'Explain how to read municipal water and electricity tariff tables.',
    'How do I calculate loan repayments with compound interest?'
  ],
  // SA 11 Official Languages Specific Prompts
  'isiZulu': [
    'Chaza izinhlobo zezabizwana (zoqobo, zokukhomba, zokubala) nohlelo lolwimi lwesiZulu.',
    'Ngicela ungichazele ngezaga nezisho zesiZulu kanye nezincazelo zazo zehlolo.',
    'Amasu okubhala indaba yokulandisa / yokuphikisa ephepheni lesi-3 (Paper 3).',
    'Ukuhlaziya izinkondlo zesiZulu (isigqi, ifanamsindo, ifanangwaqa, izifengqo).'
  ],
  'isiXhosa': [
    'Chaza izivumelanisi zentloko nezinto kuhlelo lolwimi lwesiXhosa.',
    'Izafobe nezaci zesiXhosa kunye neentsingiselo zazo zeemviwo.',
    'Ukubhalwa kwesincoko (indaba) kwiPhepha lesi-3 lesiXhosa.',
    'Uhlalutyo lwemibongo yocwecwe (izafobe, isingqisho, umxholo).'
  ],
  'Afrikaans': [
    'Verduidelik STOMPI reëls en die korrekte woordorde in Afrikaans.',
    'Hoe werk Lydende en Bedrywende Vorm (Passief en Aktief)?',
    'Verduidelik Direkte en Indirekte Rede met duidelike voorbeelde.',
    'Wenke vir die skryf van \'n Opstel en Transaksionele teks (Vraestel 3).'
  ],
  'English': [
    'Explain figurative devices: Metaphor, Simile, Personification, Irony, and Oxymoron.',
    'How do I structure an argumentative essay for Paper 3?',
    'Explain Active vs Passive Voice and Direct vs Indirect speech conversion.',
    'How do I approach unseen poetry analysis and identify tone and mood?'
  ],
  'Sepedi': [
    'Hlalosa mahlaodi le mašala go ya ka popopolelo ya Sepedi.',
    'Maele le diema tša Sepedi le ditlhaloso tša tšona tša ditlhahlobo.',
    'Mekgwa ya go ngwala taodišo (essay) pampiring ya boraro (Paper 3).',
    'Tshekatsheko ya direto tša Sepedi (morumokwano, poeletšo, dithekniki).'
  ],
  'Setswana': [
    'Tlhalosa popopolelo ya Setswana le ditlhopha tsa maina (Noun classes).',
    'Diane le maele a Setswana le bokao jwa tsone mo ditlhatlhobong.',
    'Ditaelo tsa go kwala tlhamo (indaba/essay) le ditemana tsa go tlhaloganya.',
    'Tshekatsheko ya maboko le dipapadi tsa Setswana.'
  ],
  'Sesotho': [
    'Hlalosa popopolelo ya Sesotho le mabitso a dikarolo tsa puo.',
    'Maele le maelana a Sesotho le mehlala ya tshebediso ya ona.',
    'Tataiso ya ho ngola moqoqo le ditemana tsa puisano (Pampiri ya 3).',
    'Tshekatsheko ya dithothokiso tsa Sesotho bakeng sa dihlahlobo.'
  ],
  'Xitsonga': [
    'Hlamusela swiaki swa maviti na mavulavulelo eka ririmi ra Xitsonga.',
    'Swivuriso na swihitana swa Xitsonga na tinhlamuselo ta swona.',
    'Madyondziselo yo tsala xitsalwana (essay) na matsalwa ya le henhla.',
    'Nxopaxopo wa swithlokovetselo swa Xitsonga eka swikambelo.'
  ],
  'siSwati': [
    'Chaza luhlelo lwelulwimi lwesiSwati netigaba temabito.',
    'Taga netisho tesiSwati netinchazelo tato tekuhlola.',
    'Kubhala tindzaba tekuticambela netindlela tekuphendvula umbhalo wesivivinyo.',
    'Kuhlatiya tinkondlo tesiSwati (imvumelwano, sisingciso, umoya wenkondlo).'
  ],
  'Tshivenda': [
    'Talutshedzani maitele a girama ya Tshivenda na zwipida zwa tshirendi.',
    'Mirero na maambele a Tshivenda na thalutshedzo dzazwo dza mulingo.',
    'Ndivho ya u ṅwala tshirendi na maanea (essay) kha Bammbiri 3.',
    'U saukanya vhudetembi ha Tshivenda na zwiga zwa luambo.'
  ],
  'isiNdebele': [
    'Hlathulula izakhi zelimi lekhethu lesiNdebele neenhlobo zamabizo.',
    'Izaga nezitjho zesiNdebele kanye neencazelo zazo zehlolweni.',
    'Indlela yokutlola i-eseyi (indaba) kanyana nemitlamo yePhepha 3.',
    'Ukuhluza izinkondlo zesiNdebele zomnyanya welimi.'
  ]
};

const cleanHumanMath = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  let s = text;

  // 1. Remove LaTeX font tags
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\textbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathit\{([^}]+)\}/g, '$1');

  // 2. Fractions: \frac{a}{b} -> a / b
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 / $2');

  // 3. Geometry & Angles
  s = s.replace(/\\triangle\s*([A-Za-z0-9]+)/g, 'Triangle $1');
  s = s.replace(/\\hat\{([A-Za-z0-9]+)\}/g, 'Angle $1');
  s = s.replace(/\\angle\s*([A-Za-z0-9]+)/g, 'Angle $1');

  // 4. Mathematical Operators and Symbols
  s = s.replace(/\^\\circ/g, '°');
  s = s.replace(/\\circ/g, '°');
  s = s.replace(/\\times/g, ' × ');
  s = s.replace(/\\cdot/g, ' • ');
  s = s.replace(/\\approx/g, ' ≈ ');
  s = s.replace(/\\Rightarrow/g, ' => ');
  s = s.replace(/\\rightarrow/g, ' -> ');
  s = s.replace(/\\Leftrightarrow/g, ' <=> ');
  s = s.replace(/\\leq?/g, ' ≤ ');
  s = s.replace(/\\geq?/g, ' ≥ ');
  s = s.replace(/\\neq/g, ' ≠ ');
  s = s.replace(/\\pm/g, ' ± ');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  s = s.replace(/\\sqrt/g, '√');
  s = s.replace(/\\quad/g, ' ');
  s = s.replace(/\\qquad/g, '  ');
  s = s.replace(/\\theta/g, 'θ');
  s = s.replace(/\\alpha/g, 'α');
  s = s.replace(/\\beta/g, 'β');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\Delta/g, 'Δ');
  s = s.replace(/\\delta/g, 'δ');
  s = s.replace(/\\Sigma/g, 'Σ');
  s = s.replace(/\\sigma/g, 'σ');
  s = s.replace(/\\infty/g, '∞');

  // 5. Strip LaTeX math delimiters
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  s = s.replace(/\$([^\$\n]+)\$/g, '$1');

  // 6. Clean up residual backslashes
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  return s;
};

export const LearnerAITutor: React.FC<LearnerAITutorProps> = ({
  initialSubject = 'Mathematics',
  initialTopicId,
  initialTopicName = 'General Curriculum',
}) => {
  const [subject, setSubject] = useState(initialSubject);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('isiZulu');
  const [currentTopic, setCurrentTopic] = useState(initialTopicName);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Hello! I am your dedicated **Fusion AI ${initialSubject} Specialist**.\n\nI can help you master tough ${initialSubject} concepts, solve homework problems step-by-step, explain formulas, or generate practice quizzes. What would you like to explore today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Speech-to-Text (STT) Voice Dictation State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Text-to-Speech (TTS) Read-Aloud State
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Speech-to-Text Voice Dictation Starter
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechError('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    try {
      setSpeechError(null);
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;

      // Match language if it is a South African language subject
      if (isLanguageSubject && selectedLanguage.toLowerCase() === 'afrikaans') {
        recognition.lang = 'af-ZA';
      } else if (isLanguageSubject && selectedLanguage.toLowerCase() === 'isizulu') {
        recognition.lang = 'zu-ZA';
      } else {
        recognition.lang = 'en-ZA';
      }

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInputText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[SPEECH RECOGNITION ERROR]:', event.error);
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice input: ${event.error}`);
          setTimeout(() => setSpeechError(null), 4000);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      setSpeechError('Microphone access unavailable.');
      setIsListening(false);
    }
  };

  // Text-to-Speech (TTS) Synthesizer
  const toggleReadAloud = (messageId: string, fullText: string) => {
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

    // Strip markdown formatting for natural speech flow
    const cleanText = fullText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s?/g, '')
      .replace(/```[\s\S]*?```/g, 'Code example omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[\d+\s*Marks?\]/gi, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices();
    if (isLanguageSubject && selectedLanguage.toLowerCase() === 'afrikaans') {
      const afVoice = voices.find(v => v.lang.includes('af') || v.name.includes('Afrikaans'));
      if (afVoice) utterance.voice = afVoice;
    } else {
      const zaVoice = voices.find(v => v.lang === 'en-ZA' || v.name.includes('South Africa') || v.lang.includes('en'));
      if (zaVoice) utterance.voice = zaVoice;
    }

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

  // Stop speech when unmounting or switching topics
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const isLanguageSubject = subject.toLowerCase().includes('language') || 
                            subject.toLowerCase().includes('hl') || 
                            subject.toLowerCase().includes('fal') ||
                            SA_OFFICIAL_LANGUAGES.some(l => l.name.toLowerCase() === subject.toLowerCase());

  // When subject changes, reset conversation with a fresh tailored welcome message
  const handleSwitchSubject = (newSub: string) => {
    if (newSub === subject) return;
    setSubject(newSub);
    setCurrentTopic('General Curriculum');
    setActiveQuiz(null);
    setQuizSubmitted(false);

    let greeting = `Switched to **${newSub}**.\n\nI am your dedicated **Fusion AI ${newSub} Specialist**. I will guide you through ${newSub} topics, definitions, equations, and practice tests. How can I help you today?`;
    if (newSub.toLowerCase().includes('language') || newSub.toLowerCase().includes('hl') || newSub.toLowerCase().includes('fal')) {
      const currentLangObj = SA_OFFICIAL_LANGUAGES.find(l => l.name === selectedLanguage) || SA_OFFICIAL_LANGUAGES[0];
      greeting = `${currentLangObj.greeting}\n\nI specialize in **${currentLangObj.name}** (Paper 1 Grammar, Paper 2 Literature & Poetry, Paper 3 Creative Writing, and Idioms/Proverbs). Please choose your language or ask any question!`;
    }

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  const handleSwitchLanguage = (langName: string) => {
    setSelectedLanguage(langName);
    const langObj = SA_OFFICIAL_LANGUAGES.find(l => l.name === langName) || SA_OFFICIAL_LANGUAGES[0];
    setActiveQuiz(null);
    setQuizSubmitted(false);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `${langObj.greeting}\n\nI am ready to help you with **${langObj.name}** Grade-specific curriculum, including Paper 1 (Language & Grammar), Paper 2 (Literature & Poetry), Paper 3 (Creative Writing), and cultural idioms/proverbs. What would you like to study?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  // Determine prompt suggestions
  const suggestedPrompts = isLanguageSubject
    ? (SUBJECT_PROMPTS[selectedLanguage] || SUBJECT_PROMPTS['isiZulu'])
    : (SUBJECT_PROMPTS[subject] || [
        `Explain the fundamental concepts of ${subject} step-by-step.`,
        `Generate a 3-question multiple choice revision quiz on ${subject}.`,
        `What are the most common exam mistakes students make in ${subject}?`
      ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeQuiz]);

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
      const response = await learnerService.askTutor({
        prompt: query,
        question: query,
        subject: isLanguageSubject ? `${selectedLanguage} (${subject})` : subject,
        topic: currentTopic,
        language: isLanguageSubject ? selectedLanguage : undefined
      });

      let aiText = response.answer || response.response || response.message || '';
      aiText = cleanHumanMath(aiText);
      
      // If AI returned JSON or quiz format
      let parsedQuiz = null;
      if (response.quiz || response.questions) {
        parsedQuiz = response.quiz || response.questions;
      } else if (aiText.includes('```json')) {
        try {
          const jsonStr = aiText.split('```json')[1].split('```')[0].trim();
          parsedQuiz = JSON.parse(jsonStr);
        } catch (e) {}
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isQuiz: !!parsedQuiz,
        quizData: parsedQuiz,
      };

      setMessages(prev => [...prev, aiMessage]);

      if (parsedQuiz && Array.isArray(parsedQuiz.questions || parsedQuiz)) {
        setActiveQuiz(parsedQuiz);
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);
      }
    } catch (err: any) {
      const errMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `I had trouble connecting to the tutor engine. Please try asking your question again!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPracticeQuiz = async () => {
    const targetLabel = isLanguageSubject ? selectedLanguage : subject;
    await handleSendMessage(`Please create a 3-question multiple choice practice quiz for ${targetLabel} on "${currentTopic}". Provide 4 options (A, B, C, D) for each with clear explanations and correct answers.`);
  };

  const handleExplainConcept = async () => {
    const targetLabel = isLanguageSubject ? selectedLanguage : subject;
    await handleSendMessage(`Please provide a comprehensive study guide and concept explanation for ${targetLabel} on "${currentTopic}". Include key definitions, rules, examples, and exam tips.`);
  };

  const handleSelectQuizAnswer = (qIndex: number, optionKey: string) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [String(qIndex)]: optionKey }));
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    const questions = activeQuiz.questions || activeQuiz;
    let score = 0;

    questions.forEach((q: any, idx: number) => {
      const selected = quizAnswers[String(idx)];
      const correct = q.correct_answer || q.answer || q.correctOption;
      if (selected && correct && selected.toLowerCase().trim() === correct.toLowerCase().trim()) {
        score += 1;
      }
    });

    const percentage = Math.round((score / questions.length) * 100);
    setQuizScore(percentage);
    setQuizSubmitted(true);

    if (percentage >= 70) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Subject / Language Configuration */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-glow-indigo">
              <FusionAIIcon className="w-6 h-6 text-white" variant="pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display text-white">
                  Fusion AI Subject Specialist
                </h2>
                <Badge variant="cyan" size="sm">High School</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Personalized explanations, step-by-step problem solutions, and 11 SA Official Languages
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Subject Selector */}
            <select
              value={subject}
              onChange={(e) => handleSwitchSubject(e.target.value)}
              className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SUBJECT_LIST.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            {/* 11 Official SA Language Selector Dropdown (When Language Subject Selected) */}
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
          </div>
        </div>

        {/* 11 Official SA Language Quick Selection Bar */}
        {isLanguageSubject && (
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select from South Africa's 11 Official Languages:
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {SA_OFFICIAL_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.name;
                return (
                  <button
                    key={lang.id}
                    onClick={() => handleSwitchLanguage(lang.name)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-glow-indigo'
                        : 'bg-surface-darker hover:bg-white/10 text-slate-300 border border-white/5'
                    }`}
                  >
                    {lang.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Center Chat Pane (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-surface-dark border border-white/10 shadow-xl flex flex-col h-[600px] overflow-hidden">
          {/* Active Context Bar */}
          <div className="px-5 py-3 border-b border-white/10 bg-surface-darker/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white font-display">
                {isLanguageSubject ? `${selectedLanguage} Specialist` : `${subject} Specialist`}
              </span>
              <span className="text-[11px] text-slate-400">• {currentTopic}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExplainConcept}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 font-bold text-[11px] border border-brand-500/30 transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                <span>Explain Topic</span>
              </button>
              <button
                onClick={handleStartPracticeQuiz}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] border border-cyan-500/30 transition-colors"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Quick Quiz</span>
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
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      isAi
                        ? 'bg-surface-darker border border-white/10 text-slate-200'
                        : 'bg-brand-600 text-white shadow-glow-indigo'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1.5 opacity-60 text-[10px]">
                      <span className="font-bold">
                        {isAi ? `Fusion AI ${isLanguageSubject ? selectedLanguage : subject} Specialist` : 'You'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className="whitespace-pre-wrap space-y-2">
                      {msg.text}
                    </div>

                    {isAi && (
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                        {/* Audio Read-Aloud Speaker Button */}
                        <button
                          type="button"
                          onClick={() => toggleReadAloud(msg.id, msg.text)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            speakingMsgId === msg.id && isSpeaking
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald animate-pulse'
                              : 'bg-white/5 hover:bg-white/10 text-emerald-300'
                          }`}
                          title={speakingMsgId === msg.id && isSpeaking ? "Stop Voice Read-Aloud" : "Listen / Read Aloud"}
                        >
                          {speakingMsgId === msg.id && isSpeaking ? (
                            <>
                              <VolumeX className="w-3 h-3 text-white" />
                              <span>Speaking...</span>
                              <span className="flex items-center gap-0.5 ml-1">
                                <span className="w-0.5 h-2.5 bg-white animate-bounce" />
                                <span className="w-0.5 h-3.5 bg-white animate-bounce delay-75" />
                                <span className="w-0.5 h-2 bg-white animate-bounce delay-150" />
                              </span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3 text-emerald-400" />
                              <span>Read Aloud</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleSendMessage(`Explain this simpler with a clear example: "${msg.text.slice(0, 80)}..."`)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-brand-300 font-medium transition-colors"
                        >
                          <Lightbulb className="w-3 h-3" />
                          <span>Explain Simpler</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage(`Give me 2 practice questions on this: "${msg.text.slice(0, 80)}..."`)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-cyan-300 font-medium transition-colors"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Practice Questions</span>
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
                  <span>Fusion AI is formatting response in {isLanguageSubject ? selectedLanguage : subject}...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-surface-darker/60 border-t border-white/5 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Quick Prompts:
            </span>
            {suggestedPrompts.slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] text-slate-300 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Live Voice Dictation Banner */}
          {isListening && (
            <div className="px-4 py-2 bg-rose-500/20 border-t border-rose-500/30 flex items-center justify-between animate-fade-in text-rose-300 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>Listening to your voice... Speak your question now</span>
              </div>
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500/50 text-white"
              >
                Done
              </button>
            </div>
          )}

          {speechError && (
            <div className="px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{speechError}</span>
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
              {/* Speech-to-Text Microphone Button */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all shadow-md shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse shadow-glow-rose ring-2 ring-rose-400'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                }`}
                title={isListening ? "Listening... Click to stop" : "Click to speak your question (Voice Dictation)"}
              >
                {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-rose-400" />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? "Listening... (Speaking will populate text)" : `Ask anything about ${isLanguageSubject ? selectedLanguage : subject} (e.g., Grammar, Literature, Essays)...`}
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

        {/* Right Sidebar: Active Quiz & Study Prompts (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Interactive Practice Quiz Card */}
          {activeQuiz ? (
            <div className="rounded-3xl bg-surface-dark border border-brand-500/30 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Active Quiz</h3>
                </div>
                {quizScore !== null && (
                  <Badge variant={quizScore >= 70 ? 'emerald' : 'amber'} size="sm">
                    Score: {quizScore}%
                  </Badge>
                )}
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {(activeQuiz.questions || activeQuiz).map((q: any, idx: number) => {
                  const selected = quizAnswers[String(idx)];
                  const options = q.options || ['A', 'B', 'C', 'D'];
                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-surface-darker border border-white/5 space-y-2.5">
                      <p className="text-xs font-bold text-white leading-snug">
                        {idx + 1}. {q.question || q.question_text || q.text}
                      </p>

                      <div className="space-y-1.5">
                        {options.map((opt: any, oIdx: number) => {
                          const optText = typeof opt === 'string' ? opt : opt.text || opt.option || String(opt);
                          const optKey = optText.charAt(0).toUpperCase();
                          const isOptionSelected = selected === optKey || selected === optText;
                          const isCorrect = q.correct_answer === optKey || q.answer === optKey;

                          let btnStyle = 'bg-surface-dark hover:bg-white/10 text-slate-300 border-white/5';
                          if (isOptionSelected) {
                            btnStyle = 'bg-brand-600 text-white border-brand-500';
                          }
                          if (quizSubmitted) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold';
                            } else if (isOptionSelected && !isCorrect) {
                              btnStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-300';
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectQuizAnswer(idx, optKey)}
                              disabled={quizSubmitted}
                              className={`w-full text-left p-2 rounded-xl text-xs border transition-all ${btnStyle}`}
                            >
                              {optText}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && q.explanation && (
                        <p className="text-[11px] text-cyan-300 bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/20">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {!quizSubmitted ? (
                <button
                  onClick={handleSubmitQuiz}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
                >
                  Submit Quiz & Check Score
                </button>
              ) : (
                <button
                  onClick={() => {
                    setActiveQuiz(null);
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                    setQuizScore(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start New Practice Quiz</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-400" />
                <span>Syllabus Quick Focus</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Click any topic below to have the Fusion AI Tutor explain it or create a customized practice quiz:
              </p>
              <div className="space-y-1.5">
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p)}
                    className="w-full text-left p-2.5 rounded-xl bg-surface-darker hover:bg-brand-600/20 hover:border-brand-500/30 text-xs text-slate-300 border border-white/5 transition-all flex items-start gap-2"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
