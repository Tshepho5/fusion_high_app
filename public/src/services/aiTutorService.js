const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');
const db = require('../../../db/db');
require('dotenv').config();

const scienceCurriculum = require('../curriculum/science');
const generalCurriculum = require('../curriculum/general');
const commerceCurriculum = require('../curriculum/commerce');
const tourismCurriculum = require('../curriculum/tourism');

const curricula = [scienceCurriculum, generalCurriculum, commerceCurriculum, tourismCurriculum];
const aiCurriculum = {};
const activeAssessments = new Map();

curricula.forEach(curric => {
  for (const subject in curric) {
    aiCurriculum[subject] = [...(aiCurriculum[subject] || []), ...curric[subject]];
  }
});

// Load Dedicated Grade 12 Life Sciences AI Model Knowledge Base
let lifeSciencesKB = [];
try {
  const lsPath = path.join(__dirname, '../../../data/life_sciences_grade12_kb.json');
  if (fs.existsSync(lsPath)) {
    lifeSciencesKB = JSON.parse(fs.readFileSync(lsPath, 'utf8'));
    console.info(`[AI SERVICE] Loaded Grade 12 Life Sciences AI Knowledge Base (${lifeSciencesKB.length} CAPS core topics).`);
  }
} catch (e) {
  console.warn('[AI SERVICE] Could not load Life Sciences KB:', e.message);
}

// Load Dedicated Grade 10 Life Sciences AI Model Knowledge Base (RAG)
let lifeSciencesGrade10KB = [];
try {
  const ls10Path = path.join(__dirname, '../../../data/life_sciences_grade10_kb.json');
  if (fs.existsSync(ls10Path)) {
    lifeSciencesGrade10KB = JSON.parse(fs.readFileSync(ls10Path, 'utf8'));
    console.info(`[AI SERVICE] Loaded Grade 10 Life Sciences AI Knowledge Base (${lifeSciencesGrade10KB.length} CAPS core topics).`);
  }
} catch (e) {
  console.warn('[AI SERVICE] Could not load Grade 10 Life Sciences KB:', e.message);
}

// Load Dedicated Grade 12 Physical Sciences AI Model Knowledge Base (RAG)
let physicalSciencesKB = [];
try {
  const psPath = path.join(__dirname, '../../../data/physical_sciences_grade12_kb.json');
  if (fs.existsSync(psPath)) {
    physicalSciencesKB = JSON.parse(fs.readFileSync(psPath, 'utf8'));
    console.info(`[AI SERVICE] Loaded Grade 12 Physical Sciences AI Knowledge Base (${physicalSciencesKB.length} CAPS core topics).`);
  }
} catch (e) {
  console.warn('[AI SERVICE] Could not load Physical Sciences KB:', e.message);
}

// Load Dedicated Grade 10 Physical Sciences AI Model Knowledge Base (RAG)
let physicalSciencesGrade10KB = [];
try {
  const ps10Path = path.join(__dirname, '../../../data/physical_sciences_grade10_kb.json');
  if (fs.existsSync(ps10Path)) {
    physicalSciencesGrade10KB = JSON.parse(fs.readFileSync(ps10Path, 'utf8'));
    console.info(`[AI SERVICE] Loaded Grade 10 Physical Sciences AI Knowledge Base (${physicalSciencesGrade10KB.length} CAPS core topics).`);
  }
} catch (e) {
  console.warn('[AI SERVICE] Could not load Grade 10 Physical Sciences KB:', e.message);
}

function queryPhysicalSciencesGrade10Model(userText) {
  if (!physicalSciencesGrade10KB || physicalSciencesGrade10KB.length === 0 || !userText) return null;
  const lower = userText.toLowerCase();
  let bestItem = null;
  let maxMatches = 0;

  for (const item of physicalSciencesGrade10KB) {
    let matches = 0;
    for (const kw of item.keywords) {
      if (lower.includes(kw.toLowerCase())) matches += 1.8;
    }
    const words = (item.topic + ' ' + item.subtopic + ' ' + item.question).toLowerCase().split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && lower.includes(w)) matches += 0.5;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestItem = item;
    }
  }

  return maxMatches >= 1.5 && bestItem ? { ...bestItem, matchScore: maxMatches, grade: 10 } : null;
}

function evaluatePhysicalSciencesGrade10Answer(itemId, studentAnswer) {
  const item = physicalSciencesGrade10KB.find(x => x.id === itemId);
  if (!item) return { error: `Topic/Question ID ${itemId} not found in Grade 10 Physical Sciences KB.` };

  const lower = (studentAnswer || '').toLowerCase();
  const matched = item.keywords.filter(k => lower.includes(k.toLowerCase()));
  const missing = item.keywords.filter(k => !lower.includes(k.toLowerCase()));
  const total = item.rubric_points.length;
  const keywordPct = matched.length / Math.max(1, item.keywords.length);
  const estimatedMark = Math.min(total, Math.round(keywordPct * total));
  const percentage = Math.round((estimatedMark / total) * 100);

  return {
    itemId: item.id,
    topic: item.topic,
    subtopic: item.subtopic,
    paper: item.paper,
    grade: 10,
    prescribedDefinition: item.prescribed_definition,
    formula: item.formula,
    constants: item.constants,
    estimatedMark: `${estimatedMark}/${total}`,
    percentage: `${percentage}%`,
    matchedTerms: matched,
    missingTerms: missing,
    rubricChecklist: item.rubric_points,
    modelAnswer: item.model_answer,
    commonMisconceptions: item.common_misconceptions,
    humanGuidance: item.human_guidance,
    feedback: percentage >= 80 
      ? "Outstanding Grade 10 mastery! Your steps and units follow official DBE CAPS examination guidelines perfectly."
      : percentage >= 50
        ? "Good conceptual work! Make sure to write down the standard formula, substitution with signs, and final SI unit to capture full rubric marks."
        : "Needs revision. In Grade 10 examinations, markers require the explicit formula from the formula sheet and correct SI units."
  };
}

function queryPhysicalSciencesModel(userText, grade = null) {
  if (!userText) return null;
  const isGr10 = grade === 10 || grade === '10';
  const isGr12 = grade === 12 || grade === '12';

  if (isGr10) {
    return queryPhysicalSciencesGrade10Model(userText);
  }

  if (isGr12) {
    if (!physicalSciencesKB || physicalSciencesKB.length === 0) return null;
    const lower = userText.toLowerCase();
    let bestItem = null;
    let maxMatches = 0;

    for (const item of physicalSciencesKB) {
      let matches = 0;
      for (const kw of item.keywords) {
        if (lower.includes(kw.toLowerCase())) matches += 1.8;
      }
      const words = (item.topic + ' ' + item.subtopic + ' ' + item.question).toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && lower.includes(w)) matches += 0.5;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestItem = item;
      }
    }
    return maxMatches >= 1.5 && bestItem ? { ...bestItem, matchScore: maxMatches, grade: 12 } : null;
  }

  // If grade not specified, check both and pick highest match
  const gr10Match = queryPhysicalSciencesGrade10Model(userText);
  let gr12Match = null;
  if (physicalSciencesKB && physicalSciencesKB.length > 0) {
    const lower = userText.toLowerCase();
    let bestItem = null;
    let maxMatches = 0;
    for (const item of physicalSciencesKB) {
      let matches = 0;
      for (const kw of item.keywords) {
        if (lower.includes(kw.toLowerCase())) matches += 1.8;
      }
      const words = (item.topic + ' ' + item.subtopic + ' ' + item.question).toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && lower.includes(w)) matches += 0.5;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestItem = item;
      }
    }
    if (maxMatches >= 1.5 && bestItem) {
      gr12Match = { ...bestItem, matchScore: maxMatches, grade: 12 };
    }
  }

  if (gr10Match && gr12Match) {
    return gr10Match.matchScore >= gr12Match.matchScore ? gr10Match : gr12Match;
  }
  return gr10Match || gr12Match;
}

function evaluatePhysicalSciencesAnswer(itemId, studentAnswer) {
  if (itemId && itemId.startsWith('PS10_')) {
    return evaluatePhysicalSciencesGrade10Answer(itemId, studentAnswer);
  }
  const item = physicalSciencesKB.find(x => x.id === itemId);
  if (!item) return { error: `Topic/Question ID ${itemId} not found in Physical Sciences KB.` };

  const lower = (studentAnswer || '').toLowerCase();
  const matched = item.keywords.filter(k => lower.includes(k.toLowerCase()));
  const missing = item.keywords.filter(k => !lower.includes(k.toLowerCase()));
  const total = item.rubric_points.length;
  const keywordPct = matched.length / Math.max(1, item.keywords.length);
  const estimatedMark = Math.min(total, Math.round(keywordPct * total));
  const percentage = Math.round((estimatedMark / total) * 100);

  return {
    itemId: item.id,
    topic: item.topic,
    subtopic: item.subtopic,
    paper: item.paper,
    prescribedDefinition: item.prescribed_definition,
    formula: item.formula,
    constants: item.constants,
    estimatedMark: `${estimatedMark}/${total}`,
    percentage: `${percentage}%`,
    matchedTerms: matched,
    missingTerms: missing,
    rubricChecklist: item.rubric_points,
    modelAnswer: item.model_answer,
    commonMisconceptions: item.common_misconceptions,
    humanGuidance: item.human_guidance,
    feedback: percentage >= 80 
      ? "Outstanding mastery! Your steps and units follow official DBE CAPS examination guidelines perfectly."
      : percentage >= 50
        ? "Good conceptual work! Make sure to write down the standard formula, substitution with signs, and final SI unit to capture full rubric marks."
        : "Needs revision. In the matric exam, markers require the explicit formula from the formula sheet and correct SI units."
  };
}

// Load Dedicated Grade 12 Mathematics AI Model Knowledge Base (RAG)
let mathematicsKB = [];
try {
  const mathPath = path.join(__dirname, '../../../data/mathematics_grade12_kb.json');
  if (fs.existsSync(mathPath)) {
    mathematicsKB = JSON.parse(fs.readFileSync(mathPath, 'utf8'));
    console.info(`[AI SERVICE] Loaded Grade 12 Mathematics AI Knowledge Base (${mathematicsKB.length} CAPS core topics).`);
  }
} catch (e) {
  console.warn('[AI SERVICE] Could not load Mathematics KB:', e.message);
}

function queryMathematicsModel(userText) {
  if (!mathematicsKB || mathematicsKB.length === 0 || !userText) return null;
  const lower = userText.toLowerCase();
  let bestItem = null;
  let maxMatches = 0;

  for (const item of mathematicsKB) {
    let matches = 0;
    for (const kw of item.keywords) {
      if (lower.includes(kw.toLowerCase())) matches += 1.8;
    }
    const words = (item.topic + ' ' + item.subtopic + ' ' + item.question).toLowerCase().split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && lower.includes(w)) matches += 0.5;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestItem = item;
    }
  }

  return maxMatches >= 1.5 && bestItem ? { ...bestItem, matchScore: maxMatches } : null;
}

function evaluateMathematicsAnswer(itemId, studentAnswer) {
  const item = mathematicsKB.find(x => x.id === itemId);
  if (!item) return { error: `Topic/Question ID ${itemId} not found in Mathematics KB.` };

  const lower = (studentAnswer || '').toLowerCase();
  const matched = item.keywords.filter(k => lower.includes(k.toLowerCase()));
  const missing = item.keywords.filter(k => !lower.includes(k.toLowerCase()));
  const total = item.rubric_points.length;
  const keywordPct = matched.length / Math.max(1, item.keywords.length);
  const estimatedMark = Math.min(total, Math.round(keywordPct * total));
  const percentage = Math.round((estimatedMark / total) * 100);

  return {
    itemId: item.id,
    topic: item.topic,
    subtopic: item.subtopic,
    paper: item.paper,
    prescribedDefinition: item.prescribed_definition,
    formula: item.formula,
    constants: item.constants,
    estimatedMark: `${estimatedMark}/${total}`,
    percentage: `${percentage}%`,
    matchedTerms: matched,
    missingTerms: missing,
    rubricChecklist: item.rubric_points,
    modelAnswer: item.model_answer,
    commonMisconceptions: item.common_misconceptions,
    humanGuidance: item.human_guidance,
    feedback: percentage >= 80 
      ? "Outstanding mathematical mastery! Your algebraic steps, reasoning, and standard form follow official DBE CAPS marking criteria."
      : percentage >= 50
        ? "Good working! Ensure all intermediate algebraic steps, critical values/signs, and geometric reasons [in brackets] are explicitly stated to earn full method marks."
        : "Needs revision. In the matric mathematics examination, full marks require standard formula substitution, correct sign conventions, and explicit mathematical justifications."
  };
}

function queryLifeSciencesGrade10Model(userText) {
  if (!lifeSciencesGrade10KB || lifeSciencesGrade10KB.length === 0 || !userText) return null;
  const lower = userText.toLowerCase();
  let bestItem = null;
  let maxMatches = 0;

  for (const item of lifeSciencesGrade10KB) {
    let matches = 0;
    for (const kw of item.keywords) {
      if (lower.includes(kw.toLowerCase())) matches += 1.8;
    }
    const words = (item.topic + ' ' + item.subtopic + ' ' + item.question).toLowerCase().split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && lower.includes(w)) matches += 0.5;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestItem = item;
    }
  }

  return maxMatches >= 1.5 && bestItem ? { ...bestItem, matchScore: maxMatches, grade: 10 } : null;
}

function evaluateLifeSciencesGrade10Answer(itemId, studentAnswer) {
  const item = lifeSciencesGrade10KB.find(x => x.id === itemId);
  if (!item) return { error: `Topic/Question ID ${itemId} not found in Grade 10 Life Sciences KB.` };

  const lower = (studentAnswer || '').toLowerCase();
  const matched = item.keywords.filter(k => lower.includes(k.toLowerCase()));
  const missing = item.keywords.filter(k => !lower.includes(k.toLowerCase()));
  const total = item.rubric_points.length;
  const keywordPct = matched.length / Math.max(1, item.keywords.length);
  const estimatedMark = Math.min(total, Math.round(keywordPct * total));
  const percentage = Math.round((estimatedMark / total) * 100);

  return {
    itemId: item.id,
    topic: item.topic,
    subtopic: item.subtopic,
    paper: item.paper,
    grade: 10,
    prescribedDefinition: item.prescribed_definition,
    formula: item.formula,
    constants: item.constants,
    estimatedMark: `${estimatedMark}/${total}`,
    percentage: `${percentage}%`,
    matchedTerms: matched,
    missingTerms: missing,
    rubricChecklist: item.rubric_points,
    modelAnswer: item.model_answer,
    commonMisconceptions: item.common_misconceptions,
    humanGuidance: item.human_guidance,
    feedback: percentage >= 80 
      ? "Outstanding biological mastery! Your Grade 10 terminology and conceptual explanations follow official DBE CAPS guidelines."
      : percentage >= 50
        ? "Good conceptual work! Ensure you state precise scientific keywords and biological cause-and-effect to gain full rubric marks."
        : "Needs revision. Official CAPS markers require exact scientific definitions and correct organelle/process terminology."
  };
}

function queryLifeSciencesModel(userText, grade = null) {
  if (!userText) return null;
  const isGr10 = grade === 10 || grade === '10';
  const isGr12 = grade === 12 || grade === '12';

  if (isGr10) {
    return queryLifeSciencesGrade10Model(userText);
  }

  if (isGr12) {
    if (!lifeSciencesKB || lifeSciencesKB.length === 0) return null;
    const lower = userText.toLowerCase();
    let bestItem = null;
    let maxMatches = 0;

    for (const item of lifeSciencesKB) {
      let matches = 0;
      for (const kw of item.keywords) {
        if (lower.includes(kw.toLowerCase())) matches += 1.5;
      }
      const words = (item.topic + ' ' + item.subtopic + ' ' + item.question).toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && lower.includes(w)) matches += 0.5;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestItem = item;
      }
    }
    return maxMatches >= 1.5 && bestItem ? { ...bestItem, matchScore: maxMatches, grade: 12 } : null;
  }

  // If grade not specified, compare both
  const gr10Match = queryLifeSciencesGrade10Model(userText);
  let gr12Match = null;
  if (lifeSciencesKB && lifeSciencesKB.length > 0) {
    const lower = userText.toLowerCase();
    let bestItem = null;
    let maxMatches = 0;
    for (const item of lifeSciencesKB) {
      let matches = 0;
      for (const kw of item.keywords) {
        if (lower.includes(kw.toLowerCase())) matches += 1.5;
      }
      const words = (item.topic + ' ' + item.subtopic + ' ' + item.question).toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && lower.includes(w)) matches += 0.5;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestItem = item;
      }
    }
    if (maxMatches >= 1.5 && bestItem) {
      gr12Match = { ...bestItem, matchScore: maxMatches, grade: 12 };
    }
  }

  if (gr10Match && gr12Match) {
    return gr10Match.matchScore >= gr12Match.matchScore ? gr10Match : gr12Match;
  }
  return gr10Match || gr12Match;
}

function evaluateLifeSciencesAnswer(itemId, studentAnswer) {
  if (itemId && itemId.startsWith('LS10_')) {
    return evaluateLifeSciencesGrade10Answer(itemId, studentAnswer);
  }
  const item = lifeSciencesKB.find(x => x.id === itemId);
  if (!item) return { error: `Topic/Question ID ${itemId} not found in Life Sciences KB.` };

  const lower = (studentAnswer || '').toLowerCase();
  const matched = item.keywords.filter(k => lower.includes(k.toLowerCase()));
  const missing = item.keywords.filter(k => !lower.includes(k.toLowerCase()));
  const total = item.rubric_points.length;
  const keywordPct = matched.length / Math.max(1, item.keywords.length);
  const estimatedMark = Math.min(total, Math.round(keywordPct * total));
  const percentage = Math.round((estimatedMark / total) * 100);

  return {
    itemId: item.id,
    topic: item.topic,
    subtopic: item.subtopic,
    paper: item.paper,
    prescribedDefinition: item.prescribed_definition,
    formula: item.formula,
    constants: item.constants,
    estimatedMark: `${estimatedMark}/${total}`,
    percentage: `${percentage}%`,
    matchedTerms: matched,
    missingTerms: missing,
    rubricChecklist: item.rubric_points,
    modelAnswer: item.model_answer,
    commonMisconceptions: item.common_misconceptions,
    humanGuidance: item.human_guidance,
    feedback: percentage >= 80 
      ? "Outstanding biological mastery! You used official DBE CAPS scientific terminology accurately and concisely."
      : percentage >= 50
        ? "Good conceptual understanding! Ensure you include the missing technical keywords and state cause-and-effect clearly to gain full marks."
        : "Needs revision. Official CAPS markers deduct marks if key biological terms and sequential phases are missing."
  };
}

function getGenAI() {
  const rawKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).replace(/^["']|["']$/g, '').trim();
  return rawKey ? new GoogleGenerativeAI(rawKey) : null;
}

async function callAI(prompt, isJson = false, modelOverride = null) {
  const genAI = getGenAI();
  if (!genAI) {
    console.warn("[AI SERVICE] AI service is disabled. GEMINI_API_KEY is not set.");
    throw new Error("AI service is currently disabled by configuration.");
  }

  const modelCandidates = modelOverride
    ? [modelOverride]
    : ['gemini-3.5-flash', 'gemini-3.8-flash'];
  let lastError = null;

  for (const targetModel of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.info(`[AI MODEL START] targetModel=${targetModel} attempt=${attempt + 1} promptLength=${prompt ? prompt.length : 0}`);
        const model = genAI.getGenerativeModel({ model: targetModel });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.info(`[AI MODEL SUCCESS] targetModel=${targetModel} responseLength=${text.length}`);

        if (isJson) {
          const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            return JSON.parse(cleanedText);
          } catch (e) {
            throw new Error('AI returned invalid JSON: ' + e.message);
          }
        }
        return { text };
      } catch (err) {
        lastError = err;
        const errMsg = err.message || '';
        const isTransient = errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('high demand');
        if (isTransient && attempt === 0) {
          console.warn(`[AI SERVICE] Model ${targetModel} busy (${errMsg}). Retrying in 800ms...`);
          await sleep(800);
          continue;
        }
        console.warn(`[AI SERVICE] Model ${targetModel} attempt failed: ${errMsg}. Trying next candidate...`);
        break;
      }
    }
  }

  throw lastError || new Error("All AI model attempts failed.");
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function generateCAPSLocalFallback(prompt, explicitSubject, explicitGrade, explicitTopic, explicitCount, explicitMarks) {
  console.info('[AI SERVICE] Using resilient Grade-Sensitive CAPS local fallback content generator...');
  const isLesson = prompt.includes('Lesson Plan') || prompt.includes('learning_outcomes');
  const isTest = prompt.includes('Test Paper') || prompt.includes('marking_memo');

  let subject = explicitSubject;
  let grade = explicitGrade ? String(explicitGrade) : null;
  let topic = explicitTopic;

  // 1. Primary extraction: If not passed explicitly, parse strictly from "Subject: <SubjectName>" line!
  if (!subject) {
    const subjMatch = prompt.match(/Subject:\s*([^\n\r]+)/i);
    if (subjMatch) {
      subject = subjMatch[1].replace(/Grade.*/i, '').replace(/Topic.*/i, '').replace(/Target.*/i, '').trim();
    }
  }

  // 2. Secondary extraction only if still missing
  if (!subject) {
    const promptLower = prompt.toLowerCase();
    if (promptLower.includes('physical science') || promptLower.includes('physics')) {
      subject = 'Physical Sciences';
    } else if (promptLower.includes('life science') || promptLower.includes('biology')) {
      subject = 'Life Sciences';
    } else if (promptLower.includes('math') || promptLower.includes('mathematics')) {
      subject = 'Mathematics';
    } else if (promptLower.includes('accounting') || promptLower.includes('account')) {
      subject = 'Accounting';
    } else if (promptLower.includes('business')) {
      subject = 'Business Studies';
    } else if (promptLower.includes('economic')) {
      subject = 'Economics';
    } else if (promptLower.includes('tourism')) {
      subject = 'Tourism';
    } else if (promptLower.includes('english')) {
      subject = 'English FAL';
    }
  }

  subject = normalizeSubject(subject) || subject || 'Physical Sciences';

  if (!grade) {
    const gradeMatch = prompt.match(/Grade:\s*([0-9]{1,2})/i) || prompt.match(/Grade[:\s]+([0-9]{1,2})/i) || prompt.match(/Grade\s*([0-9]{1,2})/i);
    if (gradeMatch) grade = String(gradeMatch[1]).trim();
  }
  grade = grade || '10';

  if (!topic) {
    const topicMatch = prompt.match(/Topic:\s*"([^"]+)"/i) || prompt.match(/topic:\s*"([^"]+)"/i) || prompt.match(/Topic:\s*([^\n\r]+)/i);
    if (topicMatch) {
      topic = topicMatch[1].replace(/Duration.*/i, '').replace(/Total.*/i, '').replace(/Target.*/i, '').replace(/Lesson Plan.*/i, '').replace(/Test Paper.*/i, '').replace(/Generate.*/i, '').trim() || topic;
    }
  }
  topic = topic || 'Core Curriculum';

  const subLower = subject.toLowerCase();
  const isPhysics = subLower.includes('physic') || subLower.includes('physics');
  const isLifeScience = !isPhysics && (subLower.includes('life') || subLower.includes('bio'));
  const isCommerce = subLower.includes('account') || subLower.includes('business') || subLower.includes('econ');
  const isMath = subLower.includes('math');
  const isTourism = subLower.includes('tour');
  const isGeography = subLower.includes('geograph');
  const isHistory = subLower.includes('histor');
  const isEnglish = subLower.includes('english');

  const countMatch = prompt.match(/Target Question Count:\s*([0-9]+)/i) || prompt.match(/count[:\s]+([0-9]+)/i) || prompt.match(/Generate EXACTLY ([0-9]+) multiple choice/i) || prompt.match(/Generate ([0-9]+)/i);
  const requestedCount = explicitCount ? parseInt(explicitCount, 10) : (countMatch ? parseInt(countMatch[1], 10) : 5);

  const marksMatch = prompt.match(/Marks per Question:\s*([0-9]+)/i) || prompt.match(/marks.*:?\s*([0-9]+)/i) || prompt.match(/Set the 'marks' for each question to ([0-9]+)/i);
  const requestedMarks = explicitMarks ? parseInt(explicitMarks, 10) : (marksMatch ? parseInt(marksMatch[1], 10) : 2);

  const topicQuestionTemplates = [
    {
      stem: (g, s, t, i) => `Which fundamental CAPS principle defines the core behavior of ${t}?`,
      correct: (t, i) => `A) Standard CAPS Law of ${t} (Rule ${i})`,
      wrong: (t, i) => [`B) Inverse Exponential Decay of ${t}`, `C) Non-linear Static Equilibrium`, `D) Arbitrary Constant Model`]
    },
    {
      stem: (g, s, t, i) => `In a practical experiment on ${t}, what happens when key parameters double?`,
      correct: (t, i) => `A) The measured output doubles proportionally`,
      wrong: (t, i) => [`B) Output decreases to zero`, `C) Output quadruples exponentially`, `D) No observable change occurs`]
    },
    {
      stem: (g, s, t, i) => `Which unit of measurement or standard analytical indicator evaluates ${t}?`,
      correct: (t, i) => `A) Official CAPS SI Unit for ${t}`,
      wrong: (t, i) => [`B) Uncalibrated Percentage Ratio`, `C) Empirical Index B`, `D) Dimensionless Coefficient D`]
    },
    {
      stem: (g, s, t, i) => `When solving Grade ${g} exam scenarios on ${t}, which initial step is essential?`,
      correct: (t, i) => `A) State standard formula for ${t} and convert to SI units`,
      wrong: (t, i) => [`B) Multiply all raw values without conversion`, `C) Omit SI unit labels`, `D) Estimate without mathematical derivation`]
    },
    {
      stem: (g, s, t, i) => `What is the primary cause of system changes in ${t} according to CAPS theory?`,
      correct: (t, i) => `A) Fluctuations in system energy or core variables`,
      wrong: (t, i) => [`B) Constant room temperature`, `C) Zero net force acting on system`, `D) Equal pressure equilibrium`]
    },
    {
      stem: (g, s, t, i) => `Which statement correctly distinguishes primary vs secondary factors in ${t}?`,
      correct: (t, i) => `A) Primary factors directly control the rate of change in ${t}`,
      wrong: (t, i) => [`B) Secondary factors have zero influence`, `C) Both factors are identical`, `D) Neither factor affects ${t}`]
    },
    {
      stem: (g, s, t, i) => `In an official DBE assessment on ${t}, how is the net rate of change calculated?`,
      correct: (t, i) => `A) Net Rate = Total Change / Time Elapsed`,
      wrong: (t, i) => [`B) Net Rate = Time * Constant`, `C) Net Rate = Initial Value + Final Value`, `D) Net Rate = Zero`]
    },
    {
      stem: (g, s, t, i) => `How does increasing temperature or energy affect the rate of process in ${t}?`,
      correct: (t, i) => `A) Increases particle kinetic energy, leading to more effective interactions`,
      wrong: (t, i) => [`B) Decreases molecular movement`, `C) Causes complete cessation of process`, `D) Has no thermal impact`]
    },
    {
      stem: (g, s, t, i) => `Which graphical trend best illustrates the relationship between key variables in ${t}?`,
      correct: (t, i) => `A) Direct linear proportionality graph passing through the origin`,
      wrong: (t, i) => [`B) Horizontal flat line with zero slope`, `C) Random scattered dots`, `D) Negative hyperbola curve`]
    },
    {
      stem: (g, s, t, i) => `Which safety or methodology rule must be observed during tasks on ${t}?`,
      correct: (t, i) => `A) Calibrate instruments and wear required protective equipment`,
      wrong: (t, i) => [`B) Mix reagents without measuring`, `C) Ignore control group data`, `D) Discard raw measurements`]
    },
    {
      stem: (g, s, t, i) => `What is the structural impact of introducing a catalyst or external agent to ${t}?`,
      correct: (t, i) => `A) Lowers activation energy required for ${t} without being consumed`,
      wrong: (t, i) => [`B) Stops reaction completely`, `C) Permanently alters chemical composition of products`, `D) Reduces yield to zero`]
    },
    {
      stem: (g, s, t, i) => `In financial or quantitative modeling of ${t}, how is net yield determined?`,
      correct: (t, i) => `A) Net Yield = Total Inflow - Total Outflow`,
      wrong: (t, i) => [`B) Net Yield = Inflow * 0`, `C) Net Yield = Outflow / 2`, `D) Net Yield = Gross Cost`]
    },
    {
      stem: (g, s, t, i) => `Which conservation law applies directly to physical/chemical processes in ${t}?`,
      correct: (t, i) => `A) Law of Conservation of Mass and Energy`,
      wrong: (t, i) => [`B) Law of Variable Friction`, `C) Rule of Static Loss`, `D) Constant Entropy Reduction`]
    },
    {
      stem: (g, s, t, i) => `What happens to ${t} when an isolated system reaches dynamic equilibrium?`,
      correct: (t, i) => `A) Forward and reverse process rates become equal`,
      wrong: (t, i) => [`B) All movement stops permanently`, `C) Reactants disappear completely`, `D) Pressure drops to absolute zero`]
    },
    {
      stem: (g, s, t, i) => `Which recommendation guarantees maximum marks when solving structured questions on ${t}?`,
      correct: (t, i) => `A) Show formula, substitution, final answer with correct units`,
      wrong: (t, i) => [`B) Write final answer without working`, `C) Omit unit labels`, `D) Guess without calculation`]
    }
  ];

  function expandQuestionPool(baseQuestions) {
    const result = [];
    for (let i = 0; i < requestedCount; i++) {
      if (i < baseQuestions.length) {
        const base = baseQuestions[i];
        const opts = Array.isArray(base.options) && base.options.length >= 4 
          ? base.options 
          : [`A) ${base.answer || 'Option A'}`, `B) Alternative Option 1`, `C) Alternative Option 2`, `D) Alternative Option 3`].slice(0, 4);

        result.push({
          id: i + 1,
          question: base.question,
          type: 'multiple_choice',
          options: opts,
          answer: base.answer || opts[0],
          marks: requestedMarks
        });
      } else {
        const qNum = i + 1;
        const tmpl = topicQuestionTemplates[(qNum - 1) % topicQuestionTemplates.length];
        const correctOpt = tmpl.correct(topic, qNum);
        const wrongOpts = tmpl.wrong(topic, qNum);

        const opts = [correctOpt, ...wrongOpts].sort(() => Math.random() - 0.5);

        result.push({
          id: qNum,
          question: tmpl.stem(grade, subject, topic, qNum),
          type: 'multiple_choice',
          options: opts,
          answer: correctOpt,
          marks: requestedMarks
        });
      }
    }
    return { questions: result };
  }

  if (isLesson) {
    let outcomes = [
      `Understand DBE CAPS Grade ${grade} theoretical standards for ${topic}.`,
      `Apply Grade ${grade} cognitive levels and problem-solving techniques to ${topic}.`,
      `Demonstrate CAPS exam-level proficiency in answering Grade ${grade} questions.`
    ];

    if (isLifeScience) {
      if (grade === '12') {
        outcomes = [
          `Master Grade 12 CAPS concepts of ${topic} (e.g. DNA replication, protein synthesis, genetic inheritance & meiosis).`,
          `Analyze Grade 12 biological diagrams, genetic crosses (Punnett squares), and nucleotide sequences.`,
          `Apply Grade 12 cognitive skills to evaluate genetic mutations, homeostasis, and natural selection.`
        ];
      } else if (grade === '11') {
        outcomes = [
          `Understand Grade 11 CAPS biodiversity standards, micro-organisms, cellular respiration, and human nutrition.`,
          `Describe light-dependent thylakoid reactions in photosynthesis and nutrient absorption in the human gut.`,
          `Demonstrate Grade 11 scientific inquiry skills in biological experimentation.`
        ];
      } else {
        outcomes = [
          `Understand Grade 10 CAPS fundamentals of organic molecules, cell organelles, and plant/animal tissues.`,
          `Identify microscopic cell structures and differentiate plant vs animal organ systems.`,
          `Demonstrate Grade 10 introductory biological classification techniques.`
        ];
      }
    } else if (isCommerce) {
      if (grade === '12') {
        outcomes = [
          `Prepare Grade 12 Public Company Financial Statements (Income Statement, Balance Sheet, Cash Flow Statement).`,
          `Calculate and interpret Grade 12 financial indicators (Solvency, Liquidity, Debt-Equity, ROSH).`,
          `Evaluate corporate governance principles under the King IV Code.`
        ];
      } else if (grade === '11') {
        outcomes = [
          `Prepare Grade 11 Partnership Financial Statements and partner Current Accounts.`,
          `Calculate Asset Disposal and Depreciation (Diminishing Balance vs Equal Installments).`,
          `Perform Bank Reconciliation Statements and Perpetual Inventory adjustments.`
        ];
      } else {
        outcomes = [
          `Understand Grade 10 Accounting Equation fundamentals (Assets = Owner's Equity + Liabilities).`,
          `Record cash and credit transactions in primary subsidiary journals (CRJ, CPJ, DJ, CJ).`,
          `Post journal entries to the General Ledger and draft a Trial Balance.`
        ];
      }
    }

    return {
      lesson_plan: {
        title: `DBE CAPS Grade ${grade} ${subject}: ${topic} Lesson Plan`,
        subject,
        grade,
        duration: '60 Minutes',
        term_week: `Term 3 (Grade ${grade} CAPS Standard)`,
        learning_outcomes: outcomes,
        prior_knowledge: `Prerequisite Grade ${parseInt(grade) - 1 || 9} ${subject} foundation knowledge.`,
        teacher_activities: {
          intro: `Introduce ${topic} at Grade ${grade} CAPS difficulty level using real-world context.`,
          presentation: `Deliver formal Grade ${grade} theory presentation, structural diagrams, and step-by-step worked examples.`,
          practice: `Facilitate pairs problem-solving using Grade ${grade} CAPS past exam items.`,
          conclusion: `Summarize Grade ${grade} key takeaways and assign homework exercise.`
        },
        learner_activities: {
          classwork: `Complete Grade ${grade} Textbook Practice Exercise on ${topic}.`,
          homework: `Solve Grade ${grade} CAPS Examination Preparation Questions 1-5.`
        },
        assessment_strategy: `Formative evaluation aligned with Grade ${grade} DBE CAPS cognitive weightings.`,
        resources_needed: [`CAPS Grade ${grade} ${subject} Textbook`, `Grade ${grade} Exam Study Guide`, `Scientific/Financial Calculator`]
      }
    };
  } else if (isTest) {
    let sections = [];
    let memo = [];

    if (isLifeScience) {
      if (grade === '12') {
        sections = [
          {
            section_title: `SECTION A: Grade 12 Genetics & DNA Terminology (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `Which enzyme unwinds the DNA double helix during DNA replication in ${topic}?`, marks: 5 },
              { q_num: '1.2', question_text: `If a heterozygous black guinea pig (Bb) is crossed with a white guinea pig (bb), what is the probability of white offspring?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 12 Protein Synthesis & Genetic Crosses (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `Describe the process of transcription during protein synthesis in Grade 12 Life Sciences.`, marks: 10 },
              { q_num: '2.2', question_text: `Explain non-disjunction during Meiosis I and state its genetic consequence in humans.`, marks: 15 },
              { q_num: '2.3', question_text: `Differentiate between Darwinian evolution by natural selection and Lamarckian theory.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'DNA Helicase', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: '50% (Ratio 1:1)', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'DNA unwinds (2m), mRNA forms complementary strand (4m), moves to ribosome (4m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Homologous chromosome pairs fail to separate (5m), resulting in gametes with n+1 or n-1 chromosomes e.g. Down Syndrome (10m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'Darwin: natural variation & survival of fittest (8m); Lamarck: acquired traits inherited (7m).', mark_breakdown: '15 Marks' }
        ];
      } else if (grade === '11') {
        sections = [
          {
            section_title: `SECTION A: Grade 11 Biodiversity & Micro-organisms (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `Which structural feature distinguishes viruses from bacteria in Grade 11 Life Sciences?`, marks: 5 },
              { q_num: '1.2', question_text: `Where do the light-dependent reactions of photosynthesis take place in plant cells?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 11 Respiration & Digestion Processes (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `Explain the structural adaptations of villi in the small intestine for nutrient absorption.`, marks: 10 },
              { q_num: '2.2', question_text: `Describe the steps of anaerobic respiration (fermentation) in yeast cells vs human muscle cells.`, marks: 15 },
              { q_num: '2.3', question_text: `Analyze the role of nitrogen-fixing bacteria in ecological nutrient cycles.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'Viruses are acellular with protein capsids; bacteria are cellular prokaryotes with cell walls.', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: 'Thylakoid Membrane inside Chloroplasts', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'Large surface area (3m), thin epithelial layer (3m), dense blood capillaries & lacteals (4m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Yeast produces ethanol + CO2 (7m); Muscle produces lactic acid (8m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'Converts atmospheric N2 into nitrates usable by plants for protein synthesis.', mark_breakdown: '15 Marks' }
        ];
      } else {
        sections = [
          {
            section_title: `SECTION A: Grade 10 Cell Biology & Monomers (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `Which organelle is the site of cellular respiration in plant and animal cells?`, marks: 5 },
              { q_num: '1.2', question_text: `What organic monomer unit forms proteins when linked by peptide bonds?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 10 Plant/Animal Tissues & Organs (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `State three structural differences between plant cells and animal cells.`, marks: 10 },
              { q_num: '2.2', question_text: `Describe the structure and transport function of xylem tissue in vascular plants.`, marks: 15 },
              { q_num: '2.3', question_text: `Explain the importance of water as an inorganic molecule for metabolic reactions.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'Mitochondrion', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: 'Amino Acids', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'Plant: cell wall (3m), chloroplasts (3m), large central vacuole (4m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Lignified dead vessel elements (7m) transport water & minerals upward (8m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'Universal solvent (5m), temperature buffer (5m), reactant in hydrolysis (5m).', mark_breakdown: '15 Marks' }
        ];
      }
    } else if (isCommerce) {
      if (grade === '12') {
        sections = [
          {
            section_title: `SECTION A: Grade 12 Corporate Financial Ratios (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `Which financial ratio measures a public company's return on share capital equity?`, marks: 5 },
              { q_num: '1.2', question_text: `In a Cash Flow Statement, cash paid for dividends is classified under which activity?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 12 Companies Statements & Audit Reports (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `Prepare the Retained Income Note for a Public Company in Grade 12 Accounting.`, marks: 10 },
              { q_num: '2.2', question_text: `Calculate Solvency Ratio and Debt-Equity Ratio from provided Balance Sheet figures.`, marks: 15 },
              { q_num: '2.3', question_text: `Evaluate an Independent Auditor's Qualified Report according to the King IV Code.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'Return on Shareholders Equity (ROSH)', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: 'Operating Activities', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'Balance at start (2m) + Net profit after tax (4m) - Dividends (4m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Total Assets : Total Liabilities (7m); Non-current Liabilities : Shareholders Equity (8m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'Qualified opinion indicates material misstatement or scope limitation in financial records.', mark_breakdown: '15 Marks' }
        ];
      } else {
        sections = [
          {
            section_title: `SECTION A: Grade 10 Accounting Equation & Journals (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `If a business purchases equipment for R5,000 cash, what is the net change in total Assets?`, marks: 5 },
              { q_num: '1.2', question_text: `Which subsidiary journal is used to record cash sales of merchandise?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 10 General Ledger & Trial Balance (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `Explain the rule of Double Entry Accounting for Assets and Owner's Equity.`, marks: 10 },
              { q_num: '2.2', question_text: `Post cash transactions from CRJ into the Bank General Ledger account.`, marks: 15 },
              { q_num: '2.3', question_text: `Draft a Trial Balance and verify debit and credit equality.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'R0 (Equipment increases by R5,000, Cash decreases by R5,000)', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: 'Cash Receipts Journal (CRJ)', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'Assets increase on Debit side (5m); Owner Equity increases on Credit side (5m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Opening balance (3m) + Total Receipts (6m) = Closing Balance (6m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'All debit balances listed (7m), credit balances listed (7m), totals match (1m).', mark_breakdown: '15 Marks' }
        ];
      }
    } else {
      sections = [
        {
          section_title: `SECTION A: Grade ${grade} CAPS Multiple Choice (10 Marks)`,
          questions: [
            { q_num: '1.1', question_text: `Which Grade ${grade} principle governs core calculations in ${topic}?`, marks: 5 },
            { q_num: '1.2', question_text: `What is the standard Grade ${grade} formula applied to ${topic}?`, marks: 5 }
          ]
        },
        {
          section_title: `SECTION B: Grade ${grade} Structured Application (40 Marks)`,
          questions: [
            { q_num: '2.1', question_text: `State the Grade ${grade} CAPS definition for ${topic}.`, marks: 10 },
            { q_num: '2.2', question_text: `Solve a Grade ${grade} exam scenario problem for ${topic}. Show all working.`, marks: 15 },
            { q_num: '2.3', question_text: `Analyze the Grade ${grade} practical application of ${topic} variables.`, marks: 15 }
          ]
        }
      ];
      memo = [
        { q_num: '1.1', expected_answer: `Grade ${grade} CAPS Standard Rule`, mark_breakdown: '5 Marks' },
        { q_num: '1.2', expected_answer: `Standard Grade ${grade} Equation`, mark_breakdown: '5 Marks' },
        { q_num: '2.1', expected_answer: `Grade ${grade} formal statement of theory.`, mark_breakdown: '10 Marks' },
        { q_num: '2.2', expected_answer: 'Formula (3m) + Substitution (6m) + Correct Answer (6m).', mark_breakdown: '15 Marks' },
        { q_num: '2.3', expected_answer: `Detailed Grade ${grade} logical explanation.`, mark_breakdown: '15 Marks' }
      ];
    }

    return {
      test_paper: {
        test_header: {
          school: 'FUSION HIGH SCHOOL',
          subject,
          grade,
          topic,
          total_marks: 50,
          duration: '60 Minutes'
        },
        sections,
        marking_memo: memo
      }
    };
  } else {
    // Interactive Quiz Questions - Subject & Grade Sensitive
    if (isLifeScience) {
      if (grade === '12') {
        return expandQuestionPool([
          { id: 1, question: `Which enzyme unwinds the DNA double helix and breaks hydrogen bonds during replication in ${topic}?`, type: 'multiple_choice', options: ['DNA Helicase', 'DNA Polymerase', 'RNA Polymerase', 'DNA Ligase'], answer: 'DNA Helicase' },
          { id: 2, question: `In genetic crosses for ${topic}, if a heterozygous black guinea pig (Bb) is crossed with a white guinea pig (bb), what percentage of offspring will be white?`, type: 'multiple_choice', options: ['50%', '25%', '75%', '100%'], answer: '50%' },
          { id: 3, question: `Describe non-disjunction during Meiosis I and its genetic impact on chromosome numbers.`, type: 'multiple_choice', options: ['A) Chromosomes fail to separate producing n+1/n-1 gametes', 'B) DNA multiplies exponentially', 'C) Mitotic spindle fails completely', 'D) Gametes lose all chromosomes'], answer: 'A) Chromosomes fail to separate producing n+1/n-1 gametes' }
        ]);
      } else if (grade === '11') {
        return expandQuestionPool([
          { id: 1, question: `Which micro-organisms are acellular particles composed of a protein capsid enclosing viral nucleic acid?`, type: 'multiple_choice', options: ['Viruses', 'Bacteria', 'Fungi', 'Protists'], answer: 'Viruses' },
          { id: 2, question: `Where do the light-dependent reactions of photosynthesis occur inside plant chloroplasts?`, type: 'multiple_choice', options: ['Thylakoid Membrane', 'Stroma', 'Mitochondrial Matrix', 'Cytoplasm'], answer: 'Thylakoid Membrane' },
          { id: 3, question: `How are villi in the human small intestine adapted for absorbing digested nutrients?`, type: 'multiple_choice', options: ['A) Large surface area with microvilli & dense capillaries', 'B) Thick muscle layer with no blood vessels', 'C) Impermeable cell membrane', 'D) Single vacuole without blood supply'], answer: 'A) Large surface area with microvilli & dense capillaries' }
        ]);
      } else {
        return expandQuestionPool([
          { id: 1, question: `Which cell organelle is responsible for cellular respiration and synthesizing ATP energy?`, type: 'multiple_choice', options: ['Mitochondrion', 'Chloroplast', 'Ribosome', 'Golgi Body'], answer: 'Mitochondrion' },
          { id: 2, question: `What organic monomers join via peptide bonds to form protein macromolecules?`, type: 'multiple_choice', options: ['Amino Acids', 'Monosaccharides', 'Fatty Acids & Glycerol', 'Nucleotides'], answer: 'Amino Acids' },
          { id: 3, question: `Which structures are present in plant cells but absent in animal cells?`, type: 'multiple_choice', options: ['A) Rigid cell wall & chloroplasts', 'B) Mitochondrion & ribosomes', 'C) Nucleus & cytoplasm', 'D) Cell membrane & centrioles'], answer: 'A) Rigid cell wall & chloroplasts' }
        ]);
      }
    } else if (isPhysics) {
      if (grade === '12') {
        return expandQuestionPool([
          { id: 1, question: `As an ambulance emitting frequency f moves TOWARDS a stationary observer, the observed Doppler frequency will be:`, type: 'multiple_choice', options: ['Higher than f', 'Lower than f', 'Equal to f', 'Zero'], answer: 'Higher than f' },
          { id: 2, question: `According to the Work-Energy Theorem (Wnet = ΔK), net work done on an object equals the change in its:`, type: 'multiple_choice', options: ['Kinetic Energy', 'Potential Energy', 'Linear Momentum', 'Acceleration'], answer: 'Kinetic Energy' },
          { id: 3, question: `According to Le Chateliers Principle, increasing pressure on a gaseous equilibrium system shifts the equilibrium to the side with:`, type: 'multiple_choice', options: ['A) Fewer gas moles', 'B) More gas moles', 'C) Zero moles', 'D) Higher temperature'], answer: 'A) Fewer gas moles' }
        ]);
      } else if (grade === '11') {
        return expandQuestionPool([
          { id: 1, question: `According to Newton's Second Law of Motion (Fnet = ma), when the net force acting on an object is doubled, its acceleration:`, type: 'multiple_choice', options: ['Doubles', 'Halves', 'Remains unchanged', 'Decreases to zero'], answer: 'Doubles' },
          { id: 2, question: `Which intermolecular force is the strongest among non-ionic molecular compounds?`, type: 'multiple_choice', options: ['Hydrogen Bonding', 'Dipole-Dipole Forces', 'London Dispersion Forces', 'Induced Dipole Forces'], answer: 'Hydrogen Bonding' },
          { id: 3, question: `According to Boyle's Law, for a fixed mass of gas at constant temperature, pressure is:`, type: 'multiple_choice', options: ['A) Inversely proportional to volume', 'B) Directly proportional to volume', 'C) Independent of volume', 'D) Equal to temperature'], answer: 'A) Inversely proportional to volume' }
        ]);
      } else {
        return expandQuestionPool([
          { id: 1, question: `What is the speed of a transverse wave with a frequency of 5 Hz and a wavelength of 2 meters?`, type: 'multiple_choice', options: ['10 m/s', '2.5 m/s', '7 m/s', '0.4 m/s'], answer: '10 m/s' },
          { id: 2, question: `Which law states that the total electric charge in an isolated system remains constant?`, type: 'multiple_choice', options: ['Law of Conservation of Charge', 'Coulombs Law', 'Ohms Law', 'Newtons First Law'], answer: 'Law of Conservation of Charge' },
          { id: 3, question: `In a transverse pulse, particles vibrate:`, type: 'multiple_choice', options: ['A) Perpendicular to wave direction', 'B) Parallel to wave direction', 'C) In circular orbits', 'D) In random directions'], answer: 'A) Perpendicular to wave direction' }
        ]);
      }
    } else if (isMath) {
      if (grade === '12') {
        return expandQuestionPool([
          { id: 1, question: `Evaluate the derivative: d/dx (4x^3 - 5x^2 + 7x - 2).`, type: 'multiple_choice', options: ['12x^2 - 10x + 7', '12x^3 - 10x^2 + 7', '4x^2 - 5x + 7', '12x^2 - 10x'], answer: '12x^2 - 10x + 7' },
          { id: 2, question: `What is the sum to infinity (S_∞) of the convergent geometric series: 16 + 8 + 4 + 2 + ...?`, type: 'multiple_choice', options: ['32', '64', '24', '16'], answer: '32' },
          { id: 3, question: `Which expression represents the compound angle expansion identity for cos(A + B)?`, type: 'multiple_choice', options: ['A) cos(A)cos(B) - sin(A)sin(B)', 'B) cos(A)cos(B) + sin(A)sin(B)', 'C) sin(A)cos(B) + cos(A)sin(B)', 'D) tan(A) + tan(B)'], answer: 'A) cos(A)cos(B) - sin(A)sin(B)' }
        ]);
      } else {
        return expandQuestionPool([
          { id: 1, question: `Factorize the quadratic expression: x^2 - 7x + 12.`, type: 'multiple_choice', options: ['(x - 3)(x - 4)', '(x + 3)(x + 4)', '(x - 2)(x - 6)', '(x - 1)(x - 12)'], answer: '(x - 3)(x - 4)' },
          { id: 2, question: `In a right-angled triangle, if sin(θ) = 3/5, what is cos(θ)?`, type: 'multiple_choice', options: ['4/5', '3/4', '5/3', '4/3'], answer: '4/5' },
          { id: 3, question: `Solve for x in the linear equation: 3x - 5 = 16.`, type: 'multiple_choice', options: ['A) x = 7', 'B) x = 5', 'C) x = 9', 'D) x = 3'], answer: 'A) x = 7' }
        ]);
      }
    } else if (isCommerce) {
      if (grade === '12') {
        return expandQuestionPool([
          { id: 1, question: `In a Public Company's Cash Flow Statement, cash paid for dividends is classified under:`, type: 'multiple_choice', options: ['Operating Activities', 'Financing Activities', 'Investing Activities', 'Capital Reserve'], answer: 'Operating Activities' },
          { id: 2, question: `Which financial indicator measures profitability relative to shareholders' equity investment?`, type: 'multiple_choice', options: ['Return on Shareholders Equity (ROSH)', 'Solvency Ratio', 'Acid Test Ratio', 'Debt-Equity Ratio'], answer: 'Return on Shareholders Equity (ROSH)' },
          { id: 3, question: `According to King IV corporate governance, independent external auditors must:`, type: 'multiple_choice', options: ['A) Provide objective, conflict-free audit opinions', 'B) Manage daily company operations', 'C) Approve executive salary packages', 'D) Prepare monthly VAT returns'], answer: 'A) Provide objective, conflict-free audit opinions' }
        ]);
      } else {
        return expandQuestionPool([
          { id: 1, question: `According to the Accounting Equation (Assets = Owner's Equity + Liabilities), purchasing equipment for R5,000 cash causes total Assets to:`, type: 'multiple_choice', options: ['Remain unchanged (R0 net change)', 'Increase by R5,000', 'Decrease by R5,000', 'Double'], answer: 'Remain unchanged (R0 net change)' },
          { id: 2, question: `Which subsidiary journal is used to record cash received from customers?`, type: 'multiple_choice', options: ['Cash Receipts Journal (CRJ)', 'Cash Payments Journal (CPJ)', 'Debtors Journal (DJ)', 'Creditors Journal (CJ)'], answer: 'Cash Receipts Journal (CRJ)' },
          { id: 3, question: `The primary purpose of preparing a Trial Balance is to:`, type: 'multiple_choice', options: ['A) Verify debit and credit mathematical equality', 'B) Calculate net annual profit', 'C) Record daily transactions', 'D) Audit bank statements'], answer: 'A) Verify debit and credit mathematical equality' }
        ]);
      }
    } else if (isTourism) {
      return expandQuestionPool([
        { id: 1, question: `In Greenwich Mean Time (GMT) calculations, travelling EAST across time zones requires you to:`, type: 'multiple_choice', options: ['Add 1 hour per 15 degrees longitude', 'Subtract 1 hour per 15 degrees longitude', 'Keep time unchanged', 'Add 24 hours'], answer: 'Add 1 hour per 15 degrees longitude' },
        { id: 2, question: `Which 3Ps pillar of Sustainable Tourism focuses on minimizing environmental impact on local ecosystems?`, type: 'multiple_choice', options: ['Planet', 'People', 'Profit', 'Promotion'], answer: 'Planet' },
        { id: 3, question: `Foreign currency exchange rate at which banks buy foreign currency from tourists is called:`, type: 'multiple_choice', options: ['A) Bank Buying Rate (BBR)', 'B) Bank Selling Rate (BSR)', 'C) Inflation Rate', 'D) Prime Lending Rate'], answer: 'A) Bank Buying Rate (BBR)' }
      ]);
    } else {
      return expandQuestionPool([
        { id: 1, question: `Which key CAPS principle governs theoretical concepts in ${topic}?`, type: 'multiple_choice', options: [`A) ${topic} Core Rule 1`, `B) ${topic} Alternative Principle`, `C) ${topic} Secondary Rule`, `D) ${topic} Empirical Standard`], answer: `A) ${topic} Core Rule 1` },
        { id: 2, question: `What is the primary analytical application associated with ${topic}?`, type: 'multiple_choice', options: [`A) Quantitative Analysis of ${topic}`, `B) Qualitative Overview`, `C) Comparative Evaluation`, `D) Systematic Review`], answer: `A) Quantitative Analysis of ${topic}` },
        { id: 3, question: `State the fundamental CAPS examination definition for ${topic}.`, type: 'multiple_choice', options: [`A) Formal Grade ${grade} CAPS definition for ${topic}`, `B) Informal Summary`, `C) Historical Context`, `D) Secondary Variable`], answer: `A) Formal Grade ${grade} CAPS definition for ${topic}` }
      ]);
    }
  }
}

function resolvePortalOrAppAnswer(query, role = 'user') {
  const lower = (query || '').toLowerCase();

  // School registration, admissions, partner schools directory
  if (lower.includes('school') && (lower.includes('add') || lower.includes('register') || lower.includes('admit') || lower.includes('application') || lower.includes('admission') || lower.includes('new school'))) {
    return {
      text: `### 🏫 Registering & Admitting Schools in Geleza SA\n\nTo onboard a new school onto the Geleza SA platform:\n\n1. **Submit or Review Applications**: Incoming institutions apply with their DBE EMIS number and provincial circuit details. Super Admins can review pending requests and approve them under **School Admissions**.\n2. **Approval & Instant Sync**: Once accredited and admitted, the school immediately appears in the **Registered Partner Schools Directory**.\n3. **Curriculum & Streams**: The school administrator can then configure academic phases (GET/FET) and subjects.\n\n👉 [Review School Admissions](action:school-admissions)\n👉 [Registered Partner Schools Directory](action:overview)`,
      actionLinks: [
        { label: 'Review School Admissions', tab: 'school-admissions' },
        { label: 'Partner Schools Directory', tab: 'overview' }
      ],
      suggestions: ['How do I configure school subjects?', 'How do I add school administrators?', 'Where is the Multi-School Command Center?']
    };
  }

  if (lower.includes('directory') || (lower.includes('partner') && lower.includes('school')) || lower.includes('campus')) {
    return {
      text: `### 🏛️ Registered Partner Schools Directory\n\nThe **Registered Partner Schools Directory** displays all verified, DBE-accredited partner campuses on the Geleza SA network. Each school card showcases:\n- Official DBE EMIS registration and province\n- Academic streams (Science, Commerce, General, Technical)\n- All active subjects taught on that campus\n\nYou can search, filter by province, and switch between Grid, Compact, and List views.\n\n👉 [Open Partner Schools Directory](action:overview)`,
      actionLinks: [{ label: 'Partner Schools Directory', tab: 'overview' }],
      suggestions: ['How do I admit a new school?', 'How do I manage campus users?', 'How do I view curriculum streams?']
    };
  }

  if (lower.includes('user') || lower.includes('account') || lower.includes('role') || (lower.includes('teacher') && (lower.includes('add') || lower.includes('create') || lower.includes('invite'))) || lower.includes('staff')) {
    return {
      text: `### 👥 User Directory & Role Management\n\nIn Geleza SA, access permissions are governed by role-based controls (Super Admin, Principal/Campus Admin, HOD, Educator, Parent, Learner):\n\n1. Go to **User Management** in your navigation bar.\n2. Click **Create User** or **Invite Staff** to provision new accounts with secure Single Sign-On (SSO).\n3. To enroll full grades or classes at once, use the automated **SA-SAMS CSV Import**.\n\n👉 [Manage Users](action:users)\n👉 [Import Learners (SA-SAMS)](action:import-learners)`,
      actionLinks: [
        { label: 'Manage Users', tab: 'users' },
        { label: 'Import Learners', tab: 'import-learners' }
      ],
      suggestions: ['How do I import learners via SA-SAMS?', 'How do I assign teachers to classes?', 'How do parents link to children?']
    };
  }

  if (lower.includes('import') || lower.includes('sams') || lower.includes('csv')) {
    return {
      text: `### 📥 Bulk Learner Import (SA-SAMS CSV)\n\nYou can import learners into Geleza SA without manual data entry:\n\n1. Export your learner records from SA-SAMS into a standard .csv file.\n2. Navigate to **Import Learners** in the Admin dashboard.\n3. Drag and drop the file. Geleza SA validates learner IDs, grades, streams, and parental contact details before importing.\n\n👉 [Import Learners from SA-SAMS](action:import-learners)`,
      actionLinks: [{ label: 'Import Learners', tab: 'import-learners' }],
      suggestions: ['How do I create individual users?', 'Where is the class timetable?', 'How do I assign subjects?']
    };
  }

  if (lower.includes('timetable') || lower.includes('schedule') || lower.includes('period')) {
    return {
      text: `### 📅 Timetable & Period Schedules\n\n- **Learners & Teachers**: View your daily timetable, classroom venues, and period slots directly.\n- **Admins**: Use the **Master Timetable Allocations** tool to schedule classes, prevent teacher clashes, and allocate venues.\n\n👉 [Open Timetable](action:timetable)`,
      actionLinks: [{ label: 'Open Timetable', tab: 'timetable' }],
      suggestions: ['How do I check my next period?', 'Where do I view school calendar events?', 'How do I manage educator relief?']
    };
  }

  if (lower.includes('report') || lower.includes('mark') || lower.includes('grade card') || lower.includes('sba')) {
    return {
      text: `### 📊 CAPS Report Cards & Term Assessments\n\nGeleza SA automatically computes term marks according to Department of Basic Education (DBE) weighting:\n\n- **DBE 7-Point Rating Scale**:\n  • Level 7 (80–100% Outstanding)\n  • Level 6 (70–79% Meritorious)\n  • Level 5 (60–69% Substantial)\n  • Level 4 (50–59% Adequate)\n  • Level 3 (40–49% Moderate)\n  • Level 2 (30–39% Elementary)\n  • Level 1 (0–29% Not Achieved)\n- Official term report cards can be generated, signed, and downloaded as PDFs.\n\n👉 [View CAPS Report Cards](action:reports)\n👉 [Open Report Card Studio](action:report-studio)`,
      actionLinks: [
        { label: 'View CAPS Report Cards', tab: 'reports' },
        { label: 'Report Card Studio', tab: 'report-studio' }
      ],
      suggestions: ['How are term marks calculated?', 'Where do teachers enter marks?', 'How do I check subject performance?']
    };
  }

  if (lower.includes('fee') || lower.includes('finance') || lower.includes('payment') || lower.includes('bursar') || lower.includes('statement')) {
    return {
      text: `### 💳 School Fees, Statements & Bursaries\n\n- **Parents**: Track tuition balances, download official statements, and make secure instant payments.\n- **Admins**: Monitor collection rates, issue receipts, and manage fee exemptions.\n- **Tertiary Bursaries**: Explore verified South African bursaries and university financial aid in the catalog.\n\n👉 [Open Fee Management](action:finance)\n👉 [Explore Bursaries](action:bursaries)`,
      actionLinks: [
        { label: 'Open Fee Management', tab: 'finance' },
        { label: 'Explore Bursaries', tab: 'bursaries' }
      ],
      suggestions: ['How do I download a fee statement?', 'Where are bursary applications?', 'How do parents make payments?']
    };
  }

  if (lower.includes('attendance') || lower.includes('absent') || lower.includes('present') || lower.includes('roll call')) {
    return {
      text: `### 📋 Classroom Attendance & Registers\n\n- **Teachers**: Take daily period attendance in seconds with one-click bulk status or QR scanning.\n- **Parents**: Receive automated SMS and push notifications if a learner is marked absent or late.\n- **Admins**: View campus-wide attendance trends and compliance reports.\n\n👉 [View Attendance Register](action:attendance)`,
      actionLinks: [{ label: 'View Attendance', tab: 'attendance' }],
      suggestions: ['How do parents see attendance alerts?', 'Where is the master timetable?', 'How do I download attendance reports?']
    };
  }

  if (lower.includes('homework') || lower.includes('assignment') || lower.includes('task')) {
    return {
      text: `### 📚 Assignments & Homework Hub\n\n- **Learners**: View due dates, teacher instructions, rubric guidelines, and upload completed assignments.\n- **Teachers**: Post homework tasks with attachments and grade student submissions directly.\n\n👉 [Go to Assignments](action:assignments)`,
      actionLinks: [{ label: 'Go to Assignments', tab: 'assignments' }],
      suggestions: ['How do I submit an assignment?', 'How do I ask the AI Tutor for help?', 'Where do I find study guides?']
    };
  }

  if (lower.includes('geleza') || lower.includes('about the app') || lower.includes('what is this') || lower.includes('how does this app work') || lower.includes('features')) {
    return {
      text: `### 🌟 Welcome to Geleza SA\n\n**Geleza SA** is South Africa's comprehensive, DBE CAPS-aligned digital school operating system and educational ecosystem. It unifies:\n\n- **Institutional Governance**: Multi-school command centers, partner school directories, and automated admissions.\n- **Academic Excellence**: DBE CAPS syllabus tracking (Grades 8–12), 24/7 AI Tutor, past exam prep, and automatic 7-point report cards.\n- **Classroom Operations**: Master conflict-free timetables, daily attendance, educator leave relief, and asset tracking.\n- **Connected Community**: Real-time parent portal, instant fee reconciliation, bursary databases, and student message hub.\n\n👉 [Partner Schools Directory](action:overview)\n👉 [Open Technical Settings](action:settings)`,
      actionLinks: [
        { label: 'Partner Schools Directory', tab: 'overview' },
        { label: 'Technical Settings', tab: 'settings' }
      ],
      suggestions: ['How do I add a school?', 'Where is the Master Timetable?', 'How do report cards work?']
    };
  }

  return null;
}

let mockAIProvider = null;

function setMockProvider(fn) {
  mockAIProvider = fn;
}

async function safeAICall(prompt, isJson = false, retries = 1) {
  if (typeof mockAIProvider === 'function') {
    return await mockAIProvider(prompt, isJson);
  }

  const models = ['gemini-3.5-flash', 'gemini-3.8-flash'];
  let lastError = null;

  for (const m of models) {
    try {
      console.log(`[AI SERVICE] Attempting online AI generation (${m})...`);
      const result = await callAI(prompt, isJson, m);
      if (result && !result.error) return result;
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('503'))) {
        console.info(`[AI SERVICE] Quota limit/spike encountered on ${m}. Cascading...`);
      } else {
        console.warn(`[AI SERVICE] Model ${m} error: ${err.message}`);
      }
    }
  }

  // Only use local fallback generator for structured test/lesson generation if explicitly requested
  if (isJson || prompt.includes('Lesson Plan') || prompt.includes('Test Paper') || prompt.includes('learning_outcomes')) {
    try {
      const fb = generateCAPSLocalFallback(prompt);
      if (fb) return fb;
    } catch (fallbackErr) {
      console.error('[AI FALLBACK ERROR]', fallbackErr);
    }
  }

  // For real user conversational requests, NEVER return fake generic placeholders. Throw provider error instead.
  const providerErr = lastError || new Error('AI provider connection is temporarily unavailable.');
  providerErr.isProviderFailure = true;
  throw providerErr;
}

async function getTextCompletion(prompt) {
  const result = await safeAICall(prompt, false);
  if (result.error) throw new Error(result.error);
  return result.text;
}

function normalizeSubject(subject) {
  const subLower = (subject || "").toLowerCase().trim();
  if (subLower === 'maths' || subLower === 'mathematics') return 'Mathematics';
  if (subLower === 'physics' || subLower === 'physical sciences') return 'Physical Sciences';
  return subject;
}

async function getTextbookContent(filePath, maxLength = 10000, topicSearch = null) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdf(dataBuffer);
  const fullText = pdfData.text || "";

  if (topicSearch) {
    const topicIndex = fullText.toLowerCase().indexOf(topicSearch.toLowerCase());
    if (topicIndex !== -1) {
      const start = Math.max(0, topicIndex - 500);
      return fullText.substring(start, Math.min(fullText.length, start + maxLength));
    }
  }
  return fullText.substring(0, maxLength);
}

function parseAIJSON(response) {
  if (!response) return {};
  const rawData = typeof response === 'string' ? JSON.parse(response) : response;
  if (Array.isArray(rawData)) return rawData;
  if (rawData.lesson_plan) return rawData.lesson_plan;
  if (rawData.test_paper) return rawData.test_paper;
  if (rawData.questions) return rawData.questions;
  return rawData.topics || rawData.chapters || rawData.lessons || rawData.tasks || rawData;
}

function cleanHumanMath(text) {
  if (!text || typeof text !== 'string') return text;
  let s = text;

  // 1. Remove LaTeX font commands
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\textbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathit\{([^}]+)\}/g, '$1');

  // 2. Fractions: \frac{a}{b} -> a / b
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 / $2');

  // 3. Angles, Triangles, Geometry
  s = s.replace(/\\triangle\s*([A-Za-z0-9]+)/g, 'Triangle $1');
  s = s.replace(/\\hat\{([A-Za-z0-9]+)\}/g, 'Angle $1');
  s = s.replace(/\\angle\s*([A-Za-z0-9]+)/g, 'Angle $1');

  // 4. Symbols and Operations
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

  // 5. Strip leftover LaTeX dollar math delimiters ($$ and $)
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  s = s.replace(/\$([^\$\n]+)\$/g, '$1');

  // 6. Clean up residual backslashes
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  return s;
}

const SA_OFFICIAL_LANGUAGES_MAP = {
  'isizulu': { name: 'isiZulu', desc: 'isiZulu Home Language / FAL (Uhlelo Lolwimi, Izaga Nezisho, Ubuciko Bencwadi, Izinkondlo, Izindaba)' },
  'isixhosa': { name: 'isiXhosa', desc: 'isiXhosa Home Language / FAL (Uhlelo Lolwimi, Izaci Namaqhalo, Iincwadi, Izibongo, Izincoko)' },
  'afrikaans': { name: 'Afrikaans', desc: 'Afrikaans Huistaal / EAT (STOMPI Woordorde, Taalleer, Direkte en Indirekte Rede, Gedigte, Prosa, Opstelle)' },
  'english': { name: 'English', desc: 'English Home Language / FAL (Language Structures, Comprehension, Poetry, Novels, Drama, Essays)' },
  'sepedi': { name: 'Sepedi', desc: 'Sepedi / Sesotho sa Leboa Home Language (Popopolelo, Maele le Diema, Dingwalo, Direto, Ditaodišo)' },
  'setswana': { name: 'Setswana', desc: 'Setswana Home Language (Popopolelo, Diane le Maele, Ditlhamo, Maboko, Dipapadi)' },
  'sesotho': { name: 'Sesotho', desc: 'Sesotho Home Language (Popopolelo, Maele le Maelana, Dithothokiso, Dingolwa, Meqoqo)' },
  'xitsonga': { name: 'Xitsonga', desc: 'Xitsonga Home Language (Swiaki swa Ririmi, Swivuriso na Swihitana, Matsalwa, Swithlokovetselo, Switsalwana)' },
  'siswati': { name: 'siSwati', desc: 'siSwati Home Language (Luhlelo Lwelulwimi, Taga neTisho, Tinkondlo, Tindzaba, Umbhalo wetiNcwadzi)' },
  'tshivenda': { name: 'Tshivenda', desc: 'Tshivenda Home Language (Maitele a Luambo, Mirero na Maambele, Vhudetembi, Ngano, Maanea)' },
  'isindebele': { name: 'isiNdebele', desc: 'isiNdebele Home Language (Izakhi Zelimi, Izaga neZitjho, Izinkondlo, Iindaba, Ukutlola)' }
};

async function answerSubjectQuestion(subject, grade, question, topicContext = '', history = [], schoolContext = null) {
  const normSubject = normalizeSubject(subject || 'Mathematics');
  const normGrade = String(grade || '10').replace(/Grade\s*/i, '');
  const subLower = normSubject.toLowerCase();

  let matchedLangKey = null;
  for (const langKey of Object.keys(SA_OFFICIAL_LANGUAGES_MAP)) {
    if (subLower.includes(langKey)) {
      matchedLangKey = langKey;
      break;
    }
  }

  const langInfo = matchedLangKey ? SA_OFFICIAL_LANGUAGES_MAP[matchedLangKey] : null;

  const schoolName = schoolContext?.name || 'Fusion High School';
  const schoolCircuit = schoolContext?.circuit ? `${schoolContext.circuit}, ${schoolContext?.province || 'Limpopo'}` : 'Mankweng Circuit, Limpopo';
  const schoolMotto = schoolContext?.motto || 'Knowledge is Power';

  const schoolPromptSection = `
INSTITUTION & MULTI-TENANT CONTEXT:
- You are the official AI Academic Specialist for "${schoolName}" (${schoolCircuit}). School Motto: "${schoolMotto}".
- STRICT MULTI-TENANT ISOLATION: You represent "${schoolName}" exclusively. Never mention or confuse this school with other schools. All academic advice, teacher guidance, exam preparation, and study resources are tailored strictly to the students, faculty, and academic standards of ${schoolName} under the South African Department of Basic Education (CAPS).
`;

  const languagePromptSection = langInfo ? `
OFFICIAL SOUTH AFRICAN LANGUAGE CURRICULUM SPECIALIST:
- You are a specialized, fluent high school educator in "${langInfo.name}" (${langInfo.desc}) for Grade ${normGrade}.
- Comprehensive Syllabus Mastery:
  1. Paper 1: Language in Context, Comprehension, Summary Writing, Grammar & Syntax (Uhlelo Lolwimi / Popopolelo / Taalleer / Grammatika / Noun Classes / Concords / Tenses).
  2. Paper 2: Literature Study (Prescribed Novels, Dramas, Short Stories, Folklore, and Poetry Analysis - meter, rhyme, metaphors, themes).
  3. Paper 3: Creative & Transactional Writing (Essays, Narratives, Discursive Arguments, Letters, Speech Writing, Dialogues, Reviews).
  4. Cultural Expressions: Proverbs, Idioms, and Figures of Speech (Izaga nezisho / Maele le diema / Idioom en spreuke / Swivuriso na swihitana / Mirero na maambele).
- Respond in accurate, authentic, high-quality ${langInfo.name} (or provide bilingual explanations with English if requested by the student) so the learner masters their examinations with confidence.
` : '';

  const prompt = `
You are the Dedicated Subject Academic AI Specialist for "${normSubject}" (Grade ${normGrade}) at ${schoolName}.
${schoolPromptSection}
${languagePromptSection}
STRICT IDENTITY & FORMATTING POLICIES:
1. IDENTITY: Your official identity is "${schoolName} AI Subject Specialist". NEVER mention "Gemini", "Google", "Google AI", "OpenAI", or any external LLM name under any circumstances.
2. HUMAN-READABLE WRITING (CRITICAL):
   - Write like an inspiring, highly experienced high school educator explaining concepts directly to a student.
   - NEVER USE RAW LATEX SYNTAX ($$, $, \\frac{}{}, \\text{}, \\mathbf{}, \\quad, \\Rightarrow, \\hat{}, \\triangle, ^\\circ).
   - Write clean, standard plain-text mathematics and prose:
     - Write fractions as "a / b" (e.g. sin(35°) = BC / 12)
     - Write equations on clean, separate lines (e.g. x^2 - 5x - 6 = 0)
     - Write powers as "^" (e.g. x^2, 10^5)
     - Write degrees as "°" (e.g. 35°, 90°)
     - Write multiplication as "×" and arrows as "=>" or "->"
     - Write geometry terms simply as "Triangle ABC", "Angle A = 35°"
   - Do NOT repeat robotic headers like "CAPS Approach" on every single line. Explain clearly, step-by-step, with numbered steps (Step 1, Step 2, Step 3).

3. STRICT SUBJECT ISOLATION & CONFINEMENT (ZERO SUBJECT DRIFT):
   - You are bound 100% EXCLUSIVELY to "${normSubject}" (Grade ${normGrade}).
   - If "${normSubject}" is Life Sciences: You must ONLY teach, quiz, and discuss Life Sciences (Genetics, Cell Biology, Human Body Systems, Evolution, Reproduction, Ecology, Plant/Animal Tissues). Under NO circumstances provide Mathematics calculations, Chemistry equations, or other subjects.
   - If "${normSubject}" is Mathematics: You must ONLY teach, quiz, and solve Mathematics (Algebra, Functions, Calculus, Trigonometry, Euclidean Geometry, Finance, Probability, Analytical Geometry).
   - If "${normSubject}" is Physical Sciences: You must ONLY teach, quiz, and solve Physics & Chemistry (Newtonian Mechanics, Electric Circuits, Chemical Change, Organic Chemistry, Waves/Light, Quantitative Chemistry).
   - If "${normSubject}" is Accounting: Financial accounting, General Ledger, Balance Sheet, Income Statement, Cash Flow, Financial Ratios, Cost Accounting.
   - If "${normSubject}" is Business Studies: Business environments, Operations, Marketing, Human Resources, Legislation (BCEA, LRA, COIDA), Business Ventures.
   - If "${normSubject}" is Economics: Macroeconomics, Microeconomics, Circular Flow, Business Cycles, Public Sector, Economic Growth.
   - If "${normSubject}" is Geography: Climatology, Geomorphology, Mapwork & GIS, Settlement, Economic Geography of South Africa.
   - If "${normSubject}" is History: Cold War, Civil Rights, Apartheid South Africa, Independence in Africa, Globalisation.
   - If "${normSubject}" is an Official South African Language: Grammar/Syntax, Literature & Prescribed Works, Poetry, Creative Writing, Proverbs/Idioms.
   - If the student asks for something from an unrelated subject: Politely remind them:
     "I am your ${schoolName} AI Subject Specialist for ${normSubject} (Grade ${normGrade}). I am specialized to assist and test you exclusively on ${normSubject}. Please ask a question related to ${normSubject}, or switch to the corresponding subject in your portal."

4. OFFICIAL PAST-PAPER & TEXTBOOK QUIZ MODE (CRITICAL REQUIREMENTS):
   - If the learner asks for a QUIZ, TEST, PRACTICE QUESTION, or PROBLEM to solve:
     - Generate a real, high-quality examination question modeled directly on South African CAPS official past examination question papers and textbook modules for "${normSubject}" (Grade ${normGrade}).
     - STRICT ANONYMITY REQUIREMENT: NEVER reveal, state, or hint at where the question came from (DO NOT say "From 2018 Paper 1", "From November 2021 Exam", or "From DBE Question Bank"). Simply present the question directly.
     - State the total marks allocated (e.g. "[5 Marks]" or "[4 Marks]").
     - State the Question clearly with necessary givens/diagram description.
     - DO NOT provide the answer or memorandum immediately when first presenting the question; ask the learner to reply with their solution/answer.
   - If the learner has SUBMITTED an answer to a previously asked quiz question or problem:
     - Grade their answer accurately against the official South African CAPS examination marking guideline standards.
     - Award their score clearly (e.g. "**Score: 4 / 5 Marks**" or "**Score: 5 / 5 Marks (Full Marks!)**").
     - Provide the **Official Step-by-Step Marking Memorandum & Solution**:
       - Breakdown showing each tick / mark awarded (e.g. "✓ 1 Mark for formula", "✓ 1 Mark for substitution", "✓ 1 Mark for correct simplification", "✓ 1 Mark for final value with SI unit").
       - Explain common pitfalls and how to ensure maximum marks in formal exams.
     - Then, ask if they would like another practice question on this topic or a different ${normSubject} topic.

School: ${schoolName} (${schoolCircuit})
Subject: ${normSubject}
${langInfo ? `Official Language: ${langInfo.name}` : ''}
Target Grade: Grade ${normGrade}
${topicContext ? `Current Module / Chapter Topic: ${topicContext}` : ''}
Learner Message: ${question}

Response:
`;

  try {
    const result = await safeAICall(prompt, false);
    if (result && result.text) {
      let cleaned = result.text.replace(/gemini/gi, 'Fusion AI');
      cleaned = cleaned.replace(/google ai/gi, 'Fusion Academic AI');
      cleaned = cleanHumanMath(cleaned);
      return cleaned;
    }
  } catch (err) {
    console.error('Error in answerSubjectQuestion:', err);
  }
  return `I am your Fusion AI Subject Specialist for ${normSubject} (Grade ${normGrade}). I am ready to help you with ${normSubject} concepts, revision, or quiz you with official examination-style questions. What topic in ${normSubject} would you like to explore or practice today?`;
}

/**
 * Retrieves all curriculum topics for a specific subject, grade, and stream.
 */
function getCurriculumTopics(grade, stream, subject) {
  const normSubject = normalizeSubject(subject);
  const targetGrade = parseInt(grade, 10) || 10;
  const targetStream = (stream || 'General').toLowerCase();

  // Search all loaded curricula
  const allCurricula = [scienceCurriculum, generalCurriculum, commerceCurriculum, tourismCurriculum];
  const matchedTopics = [];

  for (const curric of allCurricula) {
    for (const subName in curric) {
      if (normalizeSubject(subName).toLowerCase() === normSubject.toLowerCase()) {
        const topics = curric[subName] || [];
        for (const t of topics) {
          if (t.grade === targetGrade && (!t.stream || t.stream.toLowerCase() === targetStream || targetStream === 'general')) {
            if (!matchedTopics.find(m => m.id === t.id)) {
              matchedTopics.push(t);
            }
          }
        }
      }
    }
  }

  // Fallback if specific grade-stream combo has no exact matches
  if (matchedTopics.length === 0) {
    for (const curric of allCurricula) {
      for (const subName in curric) {
        if (normalizeSubject(subName).toLowerCase() === normSubject.toLowerCase()) {
          const topics = curric[subName] || [];
          for (const t of topics) {
            if (t.grade === targetGrade) {
              if (!matchedTopics.find(m => m.id === t.id)) matchedTopics.push(t);
            }
          }
        }
      }
    }
  }

  return matchedTopics;
}

/**
 * Retrieves past conversation sessions for a learner and specific subject.
 */
async function getLearnerConversations(learnerUserId, subjectName) {
  const normSubject = normalizeSubject(subjectName);
  const res = await db.query(`
    SELECT 
      c.id, 
      c.subject_name, 
      c.grade, 
      c.stream, 
      c.topic, 
      c.title, 
      c.language,
      c.created_at, 
      c.updated_at,
      COUNT(m.id) as message_count,
      (
        SELECT message_text 
        FROM learner_ai_messages 
        WHERE conversation_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) as last_message_preview
    FROM learner_ai_conversations c
    LEFT JOIN learner_ai_messages m ON c.id = m.conversation_id
    WHERE c.learner_user_id = $1 
      AND (c.subject_name ILIKE $2 OR c.subject_name ILIKE '%' || $2 || '%')
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `, [learnerUserId, normSubject]);

  return res.rows;
}

/**
 * Retrieves the full message thread for a specific conversation session.
 */
async function getConversationDetails(conversationId, learnerUserId) {
  const convRes = await db.query(`
    SELECT id, subject_name, grade, stream, topic, title, language, created_at, updated_at
    FROM learner_ai_conversations
    WHERE id = $1 AND learner_user_id = $2
  `, [conversationId, learnerUserId]);

  if (convRes.rows.length === 0) {
    return null;
  }

  const conversation = convRes.rows[0];

  const msgRes = await db.query(`
    SELECT id, sender, message_text, metadata, created_at
    FROM learner_ai_messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
  `, [conversationId]);

  return {
    ...conversation,
    messages: msgRes.rows
  };
}

/**
 * Starts a new subject consultation conversation session.
 */
async function startNewConversation(learnerUserId, { subject_name, grade, stream, topic, title, language }) {
  const normSubject = normalizeSubject(subject_name || 'General');
  const targetGrade = parseInt(grade, 10) || 10;
  const targetStream = stream || 'General';
  const targetTopic = topic || 'General Subject Help';
  const targetTitle = title || `Consultation: ${targetTopic}`;
  const targetLang = language || 'english';

  const res = await db.query(`
    INSERT INTO learner_ai_conversations (
      learner_user_id, subject_name, grade, stream, topic, title, language, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id, subject_name, grade, stream, topic, title, language, created_at, updated_at
  `, [learnerUserId, normSubject, targetGrade, targetStream, targetTopic, targetTitle, targetLang]);

  return res.rows[0];
}

/**
 * Deletes a conversation session and all its messages.
 */
async function deleteConversation(conversationId, learnerUserId) {
  const res = await db.query(`
    DELETE FROM learner_ai_conversations
    WHERE id = $1 AND learner_user_id = $2
    RETURNING id
  `, [conversationId, learnerUserId]);

  return res.rows.length > 0;
}

function generateAcademicSuggestions(userText, normSubject, normGrade) {
  const lower = (userText || '').toLowerCase();
  const subLower = (normSubject || '').toLowerCase();

  if (subLower.includes('life') || subLower.includes('bio')) {
    if (lower.includes('photo') || lower.includes('light') || lower.includes('chloroplast')) {
      return [
        'Show me the marking memorandum for this question',
        'Explain the role of light intensity and CO2',
        'Give me a harder photosynthesis practice question'
      ];
    }
    if (lower.includes('mito') || lower.includes('meio') || lower.includes('cell division')) {
      return [
        'Compare Prophase in mitosis vs Meiosis I',
        'What causes non-disjunction in cell division?',
        'Give me a 5-mark cell division practice question'
      ];
    }
    if (lower.includes('osmo') || lower.includes('diffus') || lower.includes('water potential')) {
      return [
        'Explain turgor pressure vs plasmolysis in plant cells',
        'How do I calculate percentage mass change in potato cylinders?',
        'Give me a 5-mark osmosis exam question'
      ];
    }
    if (lower.includes('nutri') || lower.includes('digest') || lower.includes('enzyme') || lower.includes('villi')) {
      return [
        'Explain chemical digestion by pancreatic enzymes',
        'Explain structural adaptations of the small intestine villi',
        'Give me a 10-mark question on human nutrition'
      ];
    }
    if (lower.includes('hi') || lower.includes('hello') || lower.includes('help')) {
      return [
        `Give me a Grade ${normGrade} Life Sciences practice question`,
        'Explain cell structure and organelles',
        'What are the core exam topics for Term 3?'
      ];
    }
    return [
      `Give me a 5-mark Grade ${normGrade} CAPS exam question`,
      'Explain this biological concept with an analogy',
      'Show me the marking criteria and exam tips'
    ];
  }

  if (subLower.includes('physic') || subLower.includes('chem')) {
    if (lower.includes('wave') || lower.includes('sound') || lower.includes('light')) {
      return [
        'Show me how to calculate wave speed with v = fλ',
        'Explain the principle of superposition',
        'Give me a 5-mark waves practice problem'
      ];
    }
    if (lower.includes('circuit') || lower.includes('resist') || lower.includes('current')) {
      return [
        'Solve equivalent resistance in a parallel branch',
        'Explain internal resistance and lost volts',
        'Give me a circuit calculation problem with memo'
      ];
    }
    return [
      `Show me the step-by-step formula and substitution`,
      `Give me a Grade ${normGrade} Physical Sciences practice problem`,
      `What common exam mistakes do students make here?`
    ];
  }

  if (subLower.includes('math')) {
    return [
      'Show the step-by-step algebraic working',
      'Give me another practice problem with solutions',
      'Explain the key theorem or formula used here'
    ];
  }

  return [
    `Give me a Grade ${normGrade} practice question in ${normSubject}`,
    `Explain this concept step-by-step`,
    `What are the high-yield exam tips for this topic?`
  ];
}

/**
 * Main Interactive Role-Based Academic AI Assistant & Chat Engine:
 * - Powered by Google Gemini API (gemini-3.6-flash).
 * - Role-Based Access Control (RBAC) awareness: learner, teacher, admin, parent.
 * - Deeply understanding of the human user, emotionally intelligent, warm, positive (zero negative energy).
 * - Multi-subject education & CAPS syllabus support.
 * - Provides interactive navigation links to portal modules: [Button Label](action:tab_id).
 * - Anti-repetition engine for questions and quizzes.
 * - Persists conversation threads in PostgreSQL & returns structured navigation links and suggestions.
 */
async function chatWithSubjectTutor({
  learnerUserId,
  role = 'learner',
  fullName = '',
  subject,
  grade,
  stream = 'General',
  topic = null,
  message,
  conversationId = null,
  conversationHistory = [],
  previous_questions = [],
  language = 'english',
  schoolName = 'Fusion High School'
}) {
  const normSubject = normalizeSubject(subject || 'General School & Academics');
  const normGrade = parseInt(grade, 10) || 10;
  const normStream = stream || 'General';
  const normRole = (role || 'learner').toLowerCase();
  const userText = (message || '').trim();

  if (!userText) {
    throw new Error('Message text is required.');
  }

  // 1. Resolve or create active conversation session in DB (with graceful resilience)
  let activeConv = null;
  if (conversationId && learnerUserId) {
    try {
      const convRes = await db.query(`
        SELECT id, subject_name, grade, stream, topic, title, language
        FROM learner_ai_conversations
        WHERE id = $1 AND learner_user_id = $2
      `, [conversationId, learnerUserId]);

      if (convRes.rows.length > 0) {
        activeConv = convRes.rows[0];
      }
    } catch (_) {}
  }

  if (!activeConv && learnerUserId) {
    try {
      const snippet = userText.slice(0, 50).replace(/[^\w\s]/g, '').trim() || 'Consultation';
      const initialTitle = snippet.length > 0 ? snippet.charAt(0).toUpperCase() + snippet.slice(1) : `${normSubject} Assistant`;
      const initialTopic = topic || 'General Help & Support';

      activeConv = await startNewConversation(learnerUserId, {
        subject_name: normSubject,
        grade: normGrade,
        stream: normStream,
        topic: initialTopic,
        title: initialTitle,
        language: language || 'english'
      });
    } catch (dbErr) {
      console.warn('[AI TUTOR DB WARN] Using in-memory session due to DB constraint:', dbErr.message);
      activeConv = {
        id: `sess-${Date.now()}`,
        subject_name: normSubject,
        grade: normGrade,
        stream: normStream,
        topic: topic || 'General Help',
        title: 'Consultation',
        language: language || 'english'
      };
    }
  }

  if (!activeConv) {
    activeConv = {
      id: `sess-${Date.now()}`,
      subject_name: normSubject,
      grade: normGrade,
      stream: normStream,
      topic: topic || 'General Help',
      title: 'Consultation',
      language: language || 'english'
    };
  }

  // 2. Load recent message history for multi-turn conversational context
  let historyPrompt = '';
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recentTurns = conversationHistory.slice(-8);
    historyPrompt = '\n--- RECENT CONVERSATION HISTORY ---\n' +
      recentTurns.map(m => {
        const senderName = m.sender === 'user' ? (fullName || normRole || 'User') : 'Fusion AI';
        return `${senderName}: ${m.text || m.message_text || ''}`;
      }).join('\n') +
      '\n--- END RECENT CONVERSATION HISTORY ---\n';
  } else if (activeConv && typeof activeConv.id === 'number') {
    try {
      const historyRes = await db.query(`
        SELECT sender, message_text, created_at
        FROM learner_ai_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        LIMIT 10
      `, [activeConv.id]);

      if (historyRes.rows.length > 0) {
        historyPrompt = '\n--- PREVIOUS CONVERSATION CONTEXT ---\n' + 
          historyRes.rows.map(m => `${m.sender === 'user' ? (fullName || normRole || 'User') : 'Fusion AI'}: ${m.message_text}`).join('\n') + 
          '\n--- END CONVERSATION CONTEXT ---\n';
      }
    } catch (_) {}
  }

  // 3. Retrieve CAPS curriculum topics for context
  const availableTopics = getCurriculumTopics(normGrade, normStream, normSubject);
  const topicsSummary = availableTopics.map(t => t.topic).slice(0, 15).join(', ');

  // 4. Anti-Repetition Exclusion Block
  let antiRepetitionPrompt = '';
  if (Array.isArray(previous_questions) && previous_questions.length > 0) {
    const cleanPrevious = previous_questions.slice(-10).map(q => `"${String(q).replace(/\n/g, ' ')}"`);
    antiRepetitionPrompt = `
### STRICT ANTI-REPETITION MANDATE (MANDATORY):
- The user has already encountered or generated these questions recently:
${cleanPrevious.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}
- You MUST NOT repeat, duplicate, rephrase, or replicate ANY of the questions above.
- Ensure any question or quiz generated explores a completely different sub-concept or problem scenario with fresh numerical values and distinct answer options.
`;
  }

  // 5. Construct Comprehensive Role-Based, Empathetic, Highly Responsive System Prompt
  const systemPrompt = `
You are the 24/7 Intelligent AI Academic & Portal Assistant for ${schoolName}.
You are interacting in real-time with:
- Name: "${fullName || 'User'}"
- Role: "${normRole.toUpperCase()}" (Role-Based Access Control Environment: ${normRole})
- Academic Subject Context: "${normSubject}"
- Target Grade: Grade ${normGrade} (Stream: ${normStream})
- Preferred Language: "${language || 'english'}"

### 1. CORE PERSONALITY, EMPATHY & POSITIVE ENERGY (MANDATORY):
- Be highly responsive, emotionally intelligent, warm, encouraging, positive, and deeply understanding of the human user.
- Responsive to energy: Match the user's energy constructively. If they are eager or excited, match their enthusiasm. If they feel anxious, stressed, confused, or struggling with exams/marks/homework, respond with calm reassurance, clarity, kindness, and motivating encouragement.
- STRICT ZERO NEGATIVE ENERGY MANDATE: Under no circumstances express irritation, coldness, sarcasm, dismissiveness, or negativity. Foster a safe, inspiring environment where every learner, educator, parent, and admin feels supported.
- NEVER start with robotic self-introductions like "Hello, I am an AI model..." or "As an AI...". Provide direct, warm, natural human-like assistance immediately.

### 2. COMPREHENSIVE GELEZA SA PLATFORM ARCHITECTURE & ROLES (MANDATORY):
Geleza SA is South Africa's DBE CAPS-integrated digital school operating system and institutional governance network.
You possess deep, authoritative knowledge of all platform workflows, pages, and features. Always provide direct, step-by-step guidance and interactive action links:

- INSTITUTIONAL GOVERNANCE & NETWORK:
  * "Registered Partner Schools Directory": Lists verified DBE-accredited partner campuses, their EMIS numbers, provincial circuits, academic streams (Science, Commerce, General, Technical), and active subjects taught on campus: [Partner Schools Directory](action:overview).
  * "School Admissions & Accreditation": Where incoming schools submit registrations. Super Admins review EMIS credentials and approve/admit campuses: [Review School Admissions](action:school-admissions). Once approved, schools appear immediately in the Partner Schools Directory.
  * "Multi-School Command Center": Cross-campus benchmarking, district pass rates, and provincial governance: [Command Center](action:command-center).
  * "School Subjects & Curriculum": Managing subject offerings per grade, assigning HODs and subject heads: [School Subjects](action:school-subjects).

- USER ACCOUNTS & ADMISSIONS:
  * Role permissions: Super Admin, School Principal/Campus Admin, HOD, Teacher, Parent/Guardian, Learner.
  * Creating & managing users: [Manage Users](action:users).
  * Bulk Learner Import: Seamless onboarding of entire grades via official SA-SAMS CSV file import: [Import Learners](action:import-learners).

- TIMETABLE & CLASSROOM OPERATIONS:
  * Master Timetabling: Conflict-free scheduling of teachers, classes, periods, and venues: [Master Timetable](action:timetable).
  * Daily Attendance: Period-by-period registers, QR scanning, and instant parent alerts: [Attendance Register](action:attendance).
  * Educator Leave & Relief: Automated substitute rosters: [Leave Relief](action:leave-relief).

- ACADEMICS & CAPS REPORT CARDS:
  * DBE CAPS 7-Point Rating Scale: Level 7 (80-100% Outstanding), Level 6 (70-79% Meritorious), Level 5 (60-69% Substantial), Level 4 (50-59% Adequate), Level 3 (40-49% Moderate), Level 2 (30-39% Elementary), Level 1 (0-29% Not Achieved).
  * Term Report Cards: Generated automatically from teacher marks, complete with comments and principal verification: [CAPS Report Cards](action:reports) / [Report Card Studio](action:report-studio).
  * Matric Pass Rate Projector: AI-driven predictive modeling for Bachelor, Diploma, and Higher Certificate pass rates: [Matric Projector](action:matric-projector).

- FINANCE & BURSARIES:
  * School Fees: Balance tracking, statements, fee exemptions, and online payments: [Open Fee Management](action:finance).
  * Bursaries & Tertiary Aid: National catalog of accredited South African university bursaries: [Explore Bursaries](action:bursaries).

- PARENTS & LEARNERS:
  * Parents track child attendance, view term marks, and book Parent-Teacher Consultations: [Consultations](action:consultations).
  * Learners view class schedules, complete assignments: [Go to Assignments](action:assignments), access AI tutor study guides, and play curriculum games in [Fusion Arcade](action:arcade).

### 3. INTERACTIVE NAVIGATION LINKS (CRITICAL):
Whenever the user asks where to find something, how to access a feature, view documents, or navigate their dashboard, explain clearly AND ALWAYS provide interactive navigation links in this exact syntax:
[Button Label](action:<tab_id>)

Supported <tab_id> values:
- "overview" -> Partner Schools Directory & Executive Overview e.g. [Partner Schools Directory](action:overview)
- "school-admissions" -> School Admissions & Campus Applications e.g. [Review School Admissions](action:school-admissions)
- "command-center" -> Multi-School Command Center e.g. [Command Center](action:command-center)
- "users" -> School User Management & Permissions e.g. [Manage Users](action:users)
- "import-learners" -> Bulk Learner SA-SAMS CSV Import e.g. [Import Learners](action:import-learners)
- "timetable" -> Timetable & class schedule e.g. [Open Timetable](action:timetable)
- "reports" -> CAPS Report Cards & term averages e.g. [View CAPS Report Cards](action:reports)
- "report-studio" -> Report Card Studio e.g. [Open Report Card Studio](action:report-studio)
- "performance" -> Subject Performance & marks e.g. [Check Subject Performance](action:performance)
- "assignments" -> Assignments & homework e.g. [Go to Assignments](action:assignments)
- "subjects" -> Enrolled Subjects & syllabus e.g. [Open Subjects & Syllabus](action:subjects)
- "school-subjects" -> School Subjects Manager e.g. [School Subjects](action:school-subjects)
- "matric-projector" -> Matric Pass Rate Projector e.g. [Matric Projector](action:matric-projector)
- "leave-relief" -> Educator Leave & Relief e.g. [Leave Relief](action:leave-relief)
- "ai-tools" -> Teacher AI Assessment & Quiz Tools e.g. [Open AI Assessment Tools](action:ai-tools)
- "ai-tutor" -> Learner AI Tutor Session e.g. [Open AI Tutor](action:ai-tutor)
- "finance" -> School Fees & payment records e.g. [Open Fee Management](action:finance)
- "bursaries" -> Bursaries & Scholarships e.g. [Explore Bursaries](action:bursaries)
- "attendance" -> Attendance Register e.g. [View Attendance](action:attendance)
- "calendar" -> School Calendar & term dates e.g. [Open School Calendar](action:calendar)
- "messages" -> School Messages & announcements e.g. [Open Messages](action:messages)
- "consultations" -> Parent-Teacher Consultations e.g. [Schedule Consultation](action:consultations)
- "settings" -> Technical Settings & security e.g. [Open Technical Settings](action:settings)
- "profile" -> User Profile e.g. [View Profile](action:profile)
- "arcade" -> Educational Games (learners) e.g. [Open Fusion Arcade](action:arcade)

### 4. ACADEMIC EXCELLENCE & CAPS CURRICULUM:
- Answer ALL subject questions accurately (Math, Physics, Chemistry, Life Sciences/Biology, Economics, Business Studies, Accounting, Geography, History, Tourism, Languages, etc.).
- Use clear human-readable notation (fractions as a/b, powers as x^2, equations on clean lines, numbered steps **Step 1**, **Step 2**...).
- When helpful, include a "💡 **CAPS Exam Tip**" highlighting common examination pitfalls.
${antiRepetitionPrompt}
${topicsSummary ? `Available Subject Topics (Grade ${normGrade}): ${topicsSummary}` : ''}

### 5. INTERACTIVE FOLLOW-UP SUGGESTIONS:
- At the very end of your response, provide 3 helpful follow-up prompts formatted exactly as:
  [SUGGESTIONS: <Prompt 1> | <Prompt 2> | <Prompt 3>]

${(() => {
  const subLower = (normSubject || '').toLowerCase();
  const isPhysics = subLower.includes('physic') || subLower.includes('chem') || (subLower.includes('science') && !subLower.includes('life'));
  const isLifeScience = !isPhysics && (subLower.includes('life') || subLower.includes('bio'));
  const isMath = subLower.includes('math') || subLower.includes('algebra') || subLower.includes('calculus') || subLower.includes('geometry') || subLower.includes('trigonometry');

  if (isPhysics) {
    const isGr10 = normGrade === 10 || normGrade === '10';
    const psMatch = queryPhysicalSciencesModel(userText, normGrade);
    const matchedGr10 = isGr10 || (psMatch && psMatch.id && psMatch.id.startsWith('PS10_'));
    if (psMatch) {
      return `
### ⚛️ DEDICATED GRADE ${matchedGr10 ? '10' : '12'} PHYSICAL SCIENCES SPECIALIST KNOWLEDGE BASE (STRICT DBE CAPS RAG):
- Target Topic: "${psMatch.topic}" (${psMatch.paper}) — Subtopic: "${psMatch.subtopic}"
- Official DBE Prescribed Definition: "${psMatch.prescribed_definition}"
- Standard Formula: ${psMatch.formula}
- Constants / Given: ${psMatch.constants}
- Official DBE Marking Guidelines / Rubric:
${psMatch.rubric_points.map(p => `  * ${p}`).join('\n')}
- Prescribed Model Solution & Step-by-Step Calculation:
${psMatch.model_answer}
- Common Candidate Trap / Misconception:
  "${psMatch.common_misconceptions}"
- Human Educator Warmth & Guidance:
  "${psMatch.human_guidance}"

### STRICT SUBJECT ISOLATION DIRECTIVE:
You are strictly in the Grade ${matchedGr10 ? '10' : '12'} Physical Sciences (Physics Paper 1 & Chemistry Paper 2) classroom.
Under NO circumstances mention biology, cell structures, DNA, genetics, reproduction, or Life Sciences.
Respond with human warmth, empathy, and mathematical clarity. Show every algebraic step with SI units.
`;
    } else if (matchedGr10) {
      return `
### ⚛️ GRADE 10 PHYSICAL SCIENCES (PHYSICS P1 & CHEMISTRY P2) CLASSROOM:
- Official CAPS Curriculum: Physical Sciences Grade 10 (Paper 1 Physics: Transverse & Longitudinal Waves, Sound & Ultrasound, Electromagnetic Radiation & Photons, Magnetism & Electrostatics, Electric Circuits, Motion in 1D & Equations of Motion, Mechanical Energy Ep + Ek; Paper 2 Chemistry: Classification of Matter, States of Matter & Kinetic Molecular Theory, Atomic Structure & Electron Configurations, Chemical Bonding & Lewis Diagrams, Quantitative Chemistry / The Mole Concept & Stoichiometry, Physical & Chemical Change).
- Marking Standard: State formula first (1m), substitution with correct signs and values (1m), final answer with SI unit (1m).
- Strict subject boundary: Do NOT discuss biology or Life Sciences.
`;
    } else {
      return `
### ⚛️ GRADE 12 PHYSICAL SCIENCES (PHYSICS P1 & CHEMISTRY P2) CLASSROOM:
- Official CAPS Curriculum: Physical Sciences Grade 12 (Paper 1 Physics: Vertical Projectile Motion, Momentum & Impulse, Work-Energy-Power, Doppler Effect, Electric Circuits, Electrodynamics, Photoelectric Effect; Paper 2 Chemistry: Organic Chemistry, Rates of Reaction, Chemical Equilibrium, Acids & Bases, Electrochemical Cells).
- Marking Standard: State formula first (1m), substitution with correct signs (1m), final answer with SI unit (1m).
- Strict subject boundary: Do NOT discuss biology or Life Sciences.
`;
    }
  } else if (isMath) {
    const mathMatch = queryMathematicsModel(userText);
    if (mathMatch) {
      return `
### 📐 DEDICATED GRADE 12 MATHEMATICS SPECIALIST KNOWLEDGE BASE (STRICT DBE CAPS RAG):
- Target Topic: "${mathMatch.topic}" (${mathMatch.paper}) — Subtopic: "${mathMatch.subtopic}"
- Official DBE Prescribed Theorem / Rule: "${mathMatch.prescribed_definition}"
- Standard Examination Formula: ${mathMatch.formula}
- Constants / Conditions: ${mathMatch.constants}
- Official DBE Marking Guidelines / Method Rubric:
${mathMatch.rubric_points.map(p => `  * ${p}`).join('\n')}
- Prescribed Model Solution & Step-by-Step Algebraic Working:
${mathMatch.model_answer}
- Common Candidate Trap / Misconception:
  "${mathMatch.common_misconceptions}"
- Human Educator Warmth & Guidance:
  "${mathMatch.human_guidance}"

### STRICT SUBJECT ISOLATION DIRECTIVE:
You are strictly in the Grade 12 Mathematics (Paper 1 & Paper 2) classroom.
Under NO circumstances mention biology, Life Sciences, chemistry, or unrelated subjects.
Write every algebraic step explicitly with clear sign rules, critical values, and geometric reasons in brackets e.g. [line || one side of Δ].
Respond with human warmth, encouragement, and pedagogical excellence.
`;
    } else {
      return `
### 📐 GRADE 12 MATHEMATICS (PAPER 1 & PAPER 2) CLASSROOM:
- Official CAPS Curriculum: Mathematics Grade 12 (Paper 1: Algebra, Equations & Inequalities, Sequences & Series, Functions & Inverses, Financial Maths, Differential Calculus, Probability; Paper 2: Statistics & Regression, Analytical Geometry, Trigonometry, Euclidean Geometry).
- Marking Standard: State formula first (1m), substitution (1m), intermediate algebraic working (1m), final answer in simplest form (1m).
- In Euclidean Geometry: ALWAYS provide geometric reasons in brackets [Reason] for every single statement.
- Strict subject boundary: Do NOT discuss biology or Life Sciences.
`;
    }
  } else if (isLifeScience) {
    const isGr10 = normGrade === 10 || normGrade === '10';
    const lsMatch = queryLifeSciencesModel(userText, normGrade);
    const matchedGr10 = isGr10 || (lsMatch && lsMatch.id && lsMatch.id.startsWith('LS10_'));
    if (lsMatch) {
      return `
### 🧬 DEDICATED GRADE ${matchedGr10 ? '10' : '12'} LIFE SCIENCES SPECIALIST KNOWLEDGE BASE (STRICT DBE CAPS RAG):
- Target Topic: "${lsMatch.topic}" (${lsMatch.paper}) — Subtopic: "${lsMatch.subtopic}"
- Official DBE Prescribed Definition: "${lsMatch.prescribed_definition}"
- Biological Process / Formula: ${lsMatch.formula}
- Biological Constants / Conditions: ${lsMatch.constants}
- Official DBE CAPS Marking Guidelines / Rubric:
${lsMatch.rubric_points.map(p => `  * ${p}`).join('\n')}
- Prescribed Model Solution & Step-by-Step Biological Explanation:
${lsMatch.model_answer}
- Common Candidate Trap / Misconception:
  "${lsMatch.common_misconceptions}"
- Human Educator Warmth & Guidance:
  "${lsMatch.human_guidance}"

### STRICT SUBJECT ISOLATION DIRECTIVE:
You are strictly in the Grade ${matchedGr10 ? '10' : '12'} Life Sciences classroom.
Under NO circumstances discuss Physical Sciences physics formulas, velocity/momentum calculations, or mathematics Euclidean geometry proofs.
Use accurate CAPS biological terminology (chloroplast, thylakoids, stroma, osmosis, plasmolysis, turgor pressure, selectively permeable, mitosis, metaphase, anaphase, xylem, phloem, villi, enzymes, etc.) and explain with empathy, clarity, and pedagogical excellence.
`;
    } else if (matchedGr10) {
      return `
### 🧬 GRADE 10 LIFE SCIENCES (PAPER 1 & PAPER 2) CLASSROOM:
- Official CAPS Curriculum: Life Sciences Grade 10:
  * Term 1 / Chemistry of Life: Inorganic compounds (Water as solvent, lubricant & temperature buffer; Minerals like Fe, Ca, N, P, I), Organic compounds (Carbohydrates - monosaccharides, disaccharides, polysaccharides; Lipids - fats, oils, cholesterol; Proteins - amino acids, peptide bonds; Enzymes - biological catalysts, active site, lock-and-key model, denaturation above 45°C or extreme pH; Nucleic acids - DNA, RNA).
  * Term 2 / Cells & Tissues: Cell structure & organelles (Microscopy, Cell wall, Plasma membrane, Fluid Mosaic model, Nucleus, Mitochondria / cellular respiration, Chloroplasts / photosynthesis, Ribosomes, Endoplasmic reticulum, Golgi body, Vacuole; Plant vs Animal cells). Movement across membranes (Diffusion, Osmosis, Water potential gradient, Selectively permeable membrane, Turgor pressure, Plasmolysis, Active transport). Cell Division / Mitosis (Interphase, Prophase, Metaphase, Anaphase, Telophase, Cytokinesis; Biological importance in growth, repair, and asexual reproduction; Cancer as uncontrolled mitosis). Plant tissues (Meristematic, Epidermis & guard cells, Xylem vessels & tracheids, Phloem sieve tubes & companion cells, Parenchyma, Sclerenchyma, Collenchyma). Animal tissues (Epithelial, Connective, Muscle, Nerve).
  * Term 3 / Plant & Animal Organs: Dicotyledonous Leaf anatomy & adaptations for photosynthesis; Uptake of water & mineral salts in roots (root hair absorption, xylem conduction, transpiration pull); Transpiration & environmental factors (temperature, light intensity, humidity, wind); Support systems in animals (Hydrostatic, Exoskeleton, Endoskeleton; Human axial and appendicular skeleton, joints); Transport systems in mammals (Heart anatomy, Cardiac cycle, Blood vessels - arteries, veins, capillaries; Pulmonary and systemic circulation).
  * Term 4 / Biosphere to Ecosystems & History of Life: Biosphere, Biomes of South Africa, Ecosystem trophic structure; History of life on Earth (Fossils, Geological timescale, Mass extinctions).
- Marking Standard: State biological definitions accurately, show explicit mark allocations (e.g. [5 Marks], [10 Marks]), describe sequential biological processes in clear numbered steps, explain cause-and-effect clearly.
- Strict subject boundary: Do NOT discuss physics or mathematics calculations or unrelated subjects.
`;
    } else {
      return `
### 🧬 GRADE 12 LIFE SCIENCES (PAPER 1 & PAPER 2) CLASSROOM:
- Official CAPS Curriculum: Life Sciences Grade 12 (Paper 1: Meiosis, Reproduction in Vertebrates, Human Reproduction, Nervous System, Senses, Endocrine System & Homeostasis, Plant Responses; Paper 2: DNA: Code of Life, Meiosis, Genetics and Inheritance, Evolution by Natural Selection, Human Evolution).
- Marking Standard: State biological definitions accurately, describe sequential processes in clear numbered steps, highlight key biological terminology, explain cause-and-effect in homeostatic negative feedback loops.
- Strict subject boundary: Do NOT discuss physics or physical science calculations or unrelated subjects.
`;
    }
  }
  return '';
})()}

### 6. CRITICAL USER INTENT & PEDAGOGICAL DIRECTIVES (MANDATORY):
1. Understand the user's specific request before responding:
   - If the user asks to GENERATE a practice question, exam problem, or quiz (e.g. "Generate a South African CAPS examination practice question for Grade 10 Life Sciences... Include mark allocation [e.g. 5 Marks] and test my problem solving"), GENERATE THE ACTUAL QUESTION IMMEDIATELY with the requested mark allocation and scenario! NEVER ask what question they want, and NEVER respond with generic greeting deflection!
   - If the user asks for an EXPLANATION (e.g. "Explain the difference between mitosis and meiosis" or "Explain osmosis using a simple example"), PROVIDE THE DIRECT SCIENTIFIC EXPLANATION IMMEDIATELY using appropriate CAPS scientific terminology, analogies, and structured comparisons.
   - If the user asks a difficult question on a topic (e.g. "Give me a difficult question about human nutrition worth 10 marks"), generate a high-order cognitive question with a comprehensive 10-mark breakdown and memorandum.
   - If the user greets naturally (e.g. "Hi", "Hello"), respond with a warm, natural greeting and offer help without forcing an unrelated academic question.
   - If the user says "Explain it more simply", review the preceding answer and re-explain the concept using simpler language and concrete real-world analogies.
2. Avoid repeating introductory greetings ("I'm right here with you", "Hello learner") on every message.
3. Do not treat every user question as a request for step-by-step coaching on an unspecified problem. If they asked a question or asked for a question to be generated, answer or generate it directly!
4. Only ask clarifying questions if essential information is genuinely missing to formulate an answer.

${historyPrompt}
${fullName || normRole}: ${userText}

Detailed, Warm, Helpful Response:
`;

  let aiReplyText = '';
  let suggestions = [];
  let actionLinks = [];

  function stripSelfIntroduction(rawText) {
    if (!rawText) return '';
    let cleaned = rawText;
    cleaned = cleaned.replace(/gemini[\s-]*(3\.[\d]+|2\.[\d]+|1\.[\d]+)?[\s-]*(flash|pro|preview)?/gi, '');
    cleaned = cleaned.replace(/google\s+generative\s+ai/gi, '');
    cleaned = cleaned.replace(/google\s+ai/gi, '');
    cleaned = cleaned.replace(/^(hello|greetings|welcome|hi|good day|sawubona|dumela|molo)[^\.\n]*?(as your|i am your|i'm your|as an?)[^\.\n]*?[\.\!\?]\s*/i, '');
    cleaned = cleaned.replace(/^i am your (dedicated )?[^\.\n]*?[\.\!\?]\s*/i, '');
    cleaned = cleaned.replace(/^as your (dedicated )?[^\.\n]*?[\.\!\?]\s*/i, '');
    return cleaned.trim();
  }

  try {
    const result = await safeAICall(systemPrompt, false);
    if (result && result.text) {
      aiReplyText = stripSelfIntroduction(result.text);
      aiReplyText = cleanHumanMath(aiReplyText);

      // Extract suggestions tag
      const suggMatch = aiReplyText.match(/\[SUGGESTIONS:\s*([^\]]+)\]/i);
      if (suggMatch) {
        suggestions = suggMatch[1].split('|').map(s => s.trim()).filter(s => s.length > 0);
        aiReplyText = aiReplyText.replace(/\[SUGGESTIONS:\s*[^\]]+\]/i, '').trim();
      }

      // Extract action links: [Label](action:tab_id)
      const linkRegex = /\[([^\]]+)\]\(action:([a-zA-Z0-9_-]+)\)/g;
      let m;
      while ((m = linkRegex.exec(aiReplyText)) !== null) {
        actionLinks.push({ label: m[1].trim(), tab: m[2].trim() });
      }
    }
  } catch (err) {
    console.error('[AI TUTOR ERROR]', err);
    // Check if the query is a portal/app question first
    const portalAns = resolvePortalOrAppAnswer(userText, normRole);
    const subLower = (normSubject || '').toLowerCase();
    const isPhysics = subLower.includes('physic') || subLower.includes('chem') || (subLower.includes('science') && !subLower.includes('life'));
    const isLifeScience = !isPhysics && (subLower.includes('life') || subLower.includes('bio'));
    const isMath = subLower.includes('math') || subLower.includes('algebra') || subLower.includes('calculus') || subLower.includes('geometry') || subLower.includes('trigonometry');

    const isAcademicSubject = isPhysics || isLifeScience || isMath || subLower.includes('account') || subLower.includes('business') || subLower.includes('econ') || subLower.includes('geograph') || subLower.includes('histor') || subLower.includes('tour') || subLower.includes('english');

    if (!isAcademicSubject && portalAns && portalAns.text) {
      aiReplyText = portalAns.text;
      actionLinks = portalAns.actionLinks || [];
      suggestions = portalAns.suggestions || [];
    } else {
      // Academic Subject Fallback: Do NOT mask provider failure with a generic fake greeting!
      // Check if we have verified CAPS curriculum KB match
      let matchedKB = null;
      let subjectLabel = normSubject;
      if (isLifeScience) {
        matchedKB = queryLifeSciencesModel(userText, normGrade);
        subjectLabel = `Life Sciences (Grade ${normGrade})`;
      } else if (isPhysics) {
        matchedKB = queryPhysicalSciencesModel(userText, normGrade);
        subjectLabel = `Physical Sciences (Grade ${normGrade})`;
      } else if (isMath) {
        matchedKB = queryMathematicsModel(userText);
        subjectLabel = `Mathematics (Grade ${normGrade})`;
      }

      if (matchedKB) {
        aiReplyText = `⚠️ **Note: The live AI model is temporarily experiencing high traffic (${err.message || 'Rate limit'}). Here is the official DBE CAPS curriculum study guide for your topic:**\n\n### 🧬 ${subjectLabel}: ${matchedKB.topic} (${matchedKB.subtopic})\n\n${matchedKB.model_answer}\n\n---\n#### 📋 Official DBE CAPS Marking Rubric Breakdown:\n${matchedKB.rubric_points.map(p => `• ${p}`).join('\n')}\n\n💡 **CAPS Exam Tip**:\n${matchedKB.common_misconceptions}\n\n🤝 *Teacher Note: ${matchedKB.human_guidance}*`;
      } else {
        aiReplyText = `⚠️ **Geleza AI Connection Notice**\n\nThe AI model provider is currently experiencing temporary rate limits or connectivity issues (${err.message || 'Service temporarily unavailable'}).\n\nYour question about **${normSubject}** could not be completed by the live model. Please try again shortly or choose a study topic below.`;
      }
      suggestions = generateAcademicSuggestions(userText, normSubject, normGrade);
    }
  }

  // Fallback / Auto-detection of navigation intent ONLY if not an academic subject or if explicitly asking about the portal
  const lowerText = userText.toLowerCase();
  const subLower = (normSubject || '').toLowerCase();
  const isAcademic = subLower.includes('life') || subLower.includes('physic') || subLower.includes('chem') || subLower.includes('math') || subLower.includes('account');

  if (actionLinks.length === 0 && !isAcademic) {
    if (lowerText.includes('school') && (lowerText.includes('add') || lowerText.includes('register') || lowerText.includes('admit') || lowerText.includes('application') || lowerText.includes('admission'))) {
      actionLinks.push({ label: 'Review School Admissions', tab: 'school-admissions' });
    } else if (lowerText.includes('partner') || (lowerText.includes('school') && (lowerText.includes('directory') || lowerText.includes('campus')))) {
      actionLinks.push({ label: 'Partner Schools Directory', tab: 'overview' });
    } else if (lowerText.includes('import') || lowerText.includes('sams') || lowerText.includes('csv')) {
      actionLinks.push({ label: 'Import Learners from SA-SAMS', tab: 'import-learners' });
    } else if (lowerText.includes('user') || lowerText.includes('account') || lowerText.includes('role') || lowerText.includes('teacher') || lowerText.includes('staff')) {
      actionLinks.push({ label: 'Manage Users', tab: 'users' });
    } else if (lowerText.includes('attendance') || lowerText.includes('absent')) {
      actionLinks.push({ label: 'View Attendance', tab: 'attendance' });
    } else if (lowerText.includes('consultation') || lowerText.includes('meeting') || lowerText.includes('parent-teacher')) {
      actionLinks.push({ label: 'Schedule Consultation', tab: 'consultations' });
    } else if (lowerText.includes('matric') || lowerText.includes('projector') || lowerText.includes('pass rate')) {
      actionLinks.push({ label: 'Matric Pass Rate Projector', tab: 'matric-projector' });
    } else if (lowerText.includes('timetable') || lowerText.includes('schedule') || lowerText.includes('period')) {
      actionLinks.push({ label: 'Open Timetable', tab: 'timetable' });
    } else if (lowerText.includes('report') || lowerText.includes('mark') || lowerText.includes('result')) {
      actionLinks.push({ label: 'View CAPS Report Cards', tab: 'reports' });
    } else if (lowerText.includes('fee') || lowerText.includes('payment') || lowerText.includes('statement') || lowerText.includes('finance')) {
      actionLinks.push({ label: 'Open Fee Management', tab: 'finance' });
    } else if (lowerText.includes('bursar')) {
      actionLinks.push({ label: 'Explore Bursaries', tab: 'bursaries' });
    } else if (lowerText.includes('assignment') || lowerText.includes('homework')) {
      actionLinks.push({ label: 'Go to Assignments', tab: 'assignments' });
    } else if (lowerText.includes('subject') || lowerText.includes('curriculum')) {
      actionLinks.push({ label: 'Open Subjects & Syllabus', tab: 'subjects' });
    } else if (lowerText.includes('password') || lowerText.includes('setting') || lowerText.includes('theme')) {
      actionLinks.push({ label: 'Open Technical Settings', tab: 'settings' });
    } else if (lowerText.includes('quiz') || lowerText.includes('test') || lowerText.includes('exam generator')) {
      actionLinks.push({ label: normRole === 'teacher' ? 'Open AI Assessment Tools' : 'Open AI Tutor', tab: normRole === 'teacher' ? 'ai-tools' : 'ai-tutor' });
    }
  }

  if (suggestions.length === 0) {
    suggestions = generateAcademicSuggestions(userText, normSubject, normGrade);
  }

  // 6. Persist user message and AI response into PostgreSQL database if valid session
  if (activeConv && typeof activeConv.id === 'number') {
    try {
      await db.query(`
        INSERT INTO learner_ai_messages (conversation_id, sender, message_text, metadata, created_at)
        VALUES ($1, 'user', $2, $3, CURRENT_TIMESTAMP)
      `, [activeConv.id, userText, JSON.stringify({ role: normRole, topic: topic || activeConv.topic })]);

      await db.query(`
        INSERT INTO learner_ai_messages (conversation_id, sender, message_text, metadata, created_at)
        VALUES ($1, 'ai', $2, $3, CURRENT_TIMESTAMP)
      `, [activeConv.id, aiReplyText, JSON.stringify({ suggestions, actionLinks, topic: topic || activeConv.topic })]);

      await db.query(`
        UPDATE learner_ai_conversations
        SET updated_at = CURRENT_TIMESTAMP,
            topic = COALESCE($2, topic)
        WHERE id = $1
      `, [activeConv.id, topic || activeConv.topic]);
    } catch (dbErr) {
      console.warn('[AI TUTOR DB WARN] Failed to persist message:', dbErr.message);
    }
  }

  return {
    conversationId: activeConv.id,
    reply: aiReplyText,
    actionLinks,
    subject: normSubject,
    grade: normGrade,
    stream: normStream,
    topic: topic || activeConv.topic,
    title: activeConv.title,
    suggestions,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  setMockProvider,
  aiCurriculum,
  activeAssessments,
  safeAICall,
  generateCAPSLocalFallback,
  getTextCompletion,
  normalizeSubject,
  getTextbookContent,
  parseAIJSON,
  answerSubjectQuestion,
  cleanHumanMath,
  getCurriculumTopics,
  getLearnerConversations,
  getConversationDetails,
  startNewConversation,
  deleteConversation,
  chatWithSubjectTutor,
  queryLifeSciencesModel,
  queryLifeSciencesGrade10Model,
  evaluateLifeSciencesAnswer,
  evaluateLifeSciencesGrade10Answer,
  getLifeSciencesKnowledgeBase: () => lifeSciencesKB,
  getLifeSciencesGrade10KnowledgeBase: () => lifeSciencesGrade10KB,
  queryPhysicalSciencesModel,
  queryPhysicalSciencesGrade10Model,
  evaluatePhysicalSciencesAnswer,
  evaluatePhysicalSciencesGrade10Answer,
  getPhysicalSciencesKnowledgeBase: () => physicalSciencesKB,
  getPhysicalSciencesGrade10KnowledgeBase: () => physicalSciencesGrade10KB,
  queryMathematicsModel,
  evaluateMathematicsAnswer,
  getMathematicsKnowledgeBase: () => mathematicsKB
};