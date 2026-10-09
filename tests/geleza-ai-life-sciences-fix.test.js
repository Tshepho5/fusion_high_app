const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();

const aiTutorService = require('../public/src/services/aiTutorService');

describe('Geleza AI: Life Sciences Specialist & Behavior Fixes', () => {

    afterEach(() => {
        aiTutorService.setMockProvider(null);
    });

    test('TEST A: Generate a Grade 10 Life Sciences practice question about photosynthesis worth 5 marks', async () => {
        aiTutorService.setMockProvider(async (prompt) => {
            assert.ok(prompt.includes('Photosynthesis') || prompt.includes('Life Sciences'), 'Prompt must contain Life Sciences curriculum');
            assert.ok(prompt.includes('Grade 10'), 'Prompt must reflect Grade 10 context');
            assert.ok(prompt.includes('5 marks'), 'Prompt must include requested 5 marks');
            return {
                text: "### 🌿 Grade 10 Life Sciences Examination Practice\n**Topic: Photosynthesis (Light & Dark Phases)**\n**Total: [5 Marks]**\n\n1. Name the organelle where photosynthesis takes place. [1 Mark]\n2. Differentiate between the exact location of the light phase and the dark phase within this organelle. [2 Marks]\n3. State TWO environmental factors that limit the rate of photosynthesis. [2 Marks]\n\n[SUGGESTIONS: Show me the marking memorandum | Explain the role of light intensity and CO2 | Give me a harder photosynthesis question]"
            };
        });

        const response = await aiTutorService.chatWithSubjectTutor({
            learnerUserId: null,
            role: 'learner',
            fullName: 'Thabo',
            subject: 'Life Sciences',
            grade: 10,
            stream: 'Science',
            message: 'Generate a Grade 10 Life Sciences practice question about photosynthesis worth 5 marks.',
            conversationId: null,
            conversationHistory: [],
            schoolName: 'Geleza High School'
        });

        assert.ok(response && response.reply, 'Response must have reply text');
        assert.ok(
            !response.reply.includes("What specific equation, concept, or subject question are you tackling?"),
            'Must NOT return the generic canned question placeholder'
        );

        const lowerReply = response.reply.toLowerCase();
        assert.ok(
            lowerReply.includes('photosynthesis') && (lowerReply.includes('organelle') || lowerReply.includes('light')),
            'Must contain photosynthesis topic concepts'
        );
        assert.ok(
            lowerReply.includes('5 mark') || lowerReply.includes('[5 marks]'),
            'Must include the requested 5 marks allocation'
        );

        assert.ok(Array.isArray(response.suggestions), 'Suggestions must be an array');
        const suggStr = response.suggestions.join(' ').toLowerCase();
        assert.ok(!suggStr.includes('timetable'), 'Suggestions must NOT suggest timetable for academic question');
        assert.ok(!suggStr.includes('report card'), 'Suggestions must NOT suggest report card for academic question');
        assert.ok(
            suggStr.includes('photosynthesis') || suggStr.includes('memorandum') || suggStr.includes('light'),
            'Suggestions must relate to the academic topic'
        );
    });

    test('TEST B: Explain the difference between mitosis and meiosis', async () => {
        aiTutorService.setMockProvider(async (prompt) => {
            assert.ok(prompt.includes('mitosis') && prompt.includes('meiosis'), 'Prompt must pass user question');
            return {
                text: "### 🔬 Mitosis vs Meiosis: Core CAPS Differences\n\n1. **Purpose**: Mitosis produces somatic cells for growth and tissue repair, while meiosis produces gametes (sperm and egg cells) for sexual reproduction.\n2. **Daughter Cells**: Mitosis results in TWO genetically identical diploid (2n) daughter cells. Meiosis results in FOUR genetically unique haploid (n) daughter cells.\n3. **Divisions**: Mitosis consists of one nuclear division; meiosis involves two successive divisions (Meiosis I and Meiosis II) with crossing over.\n\n[SUGGESTIONS: Compare Prophase in mitosis vs Meiosis I | What causes non-disjunction? | Give me a 5-mark cell division practice question]"
            };
        });

        const response = await aiTutorService.chatWithSubjectTutor({
            learnerUserId: null,
            role: 'learner',
            fullName: 'Ayanda',
            subject: 'Life Sciences',
            grade: 10,
            stream: 'Science',
            message: 'Explain the difference between mitosis and meiosis.',
            conversationId: null,
            conversationHistory: [],
            schoolName: 'Geleza High School'
        });

        assert.ok(response && response.reply, 'Response must have reply text');
        assert.ok(
            !response.reply.includes("What specific equation, concept, or subject question are you tackling?"),
            'Must NOT return generic canned deflection'
        );

        const lowerReply = response.reply.toLowerCase();
        assert.ok(lowerReply.includes('mitosis') && lowerReply.includes('meiosis'), 'Must discuss both mitosis and meiosis');
        assert.ok(
            lowerReply.includes('diploid') || lowerReply.includes('haploid') || lowerReply.includes('daughter cells'),
            'Must provide comparative explanation'
        );
        assert.ok(!response.suggestions.join(' ').toLowerCase().includes('timetable'), 'No timetable suggestions');
    });

    test('TEST C: Explain osmosis using a simple example', async () => {
        aiTutorService.setMockProvider(async (prompt) => {
            return {
                text: "### 💧 Understanding Osmosis in Plant Biology\n\n**Definition**: Osmosis is the movement of water molecules from an area of higher water potential to an area of lower water potential through a selectively permeable membrane.\n\n**Simple Example (The Potato Cylinder)**:\nImagine placing a fresh 10 g potato cylinder in distilled water. Because water potential is higher outside, water moves into the potato cells by osmosis, causing the potato to become stiff (turgid) and gain mass. If placed in concentrated salt solution, water exits and the cells plasmolyse.\n\n[SUGGESTIONS: Explain turgor pressure vs plasmolysis | How do I calculate percentage mass change? | Give me a 5-mark osmosis exam question]"
            };
        });

        const response = await aiTutorService.chatWithSubjectTutor({
            learnerUserId: null,
            role: 'learner',
            fullName: 'Lindiwe',
            subject: 'Life Sciences',
            grade: 10,
            stream: 'Science',
            message: 'Explain osmosis using a simple example.',
            conversationId: null,
            conversationHistory: [],
            schoolName: 'Geleza High School'
        });

        assert.ok(response && response.reply, 'Response must have reply text');
        assert.ok(
            !response.reply.includes("What specific equation, concept, or subject question are you tackling?"),
            'Must NOT return generic canned deflection'
        );

        const lowerReply = response.reply.toLowerCase();
        assert.ok(lowerReply.includes('osmosis'), 'Must explain osmosis');
        assert.ok(lowerReply.includes('water') && lowerReply.includes('membrane'), 'Must explain membrane transport');
        assert.ok(lowerReply.includes('potato') || lowerReply.includes('example'), 'Must include simple example');
    });

    test('TEST D: Give me a difficult question about human nutrition worth 10 marks', async () => {
        aiTutorService.setMockProvider(async (prompt) => {
            return {
                text: "### 🍎 Grade 10 Life Sciences: Advanced Human Nutrition Assessment\n**Topic: Human Alimentary Canal & Chemical Digestion**\n**Total: [10 Marks]**\n\n**Scenario**: A patient had surgical removal of the gall bladder and is investigating digestive changes.\n\n1. Explain the physiological role of bile in lipid digestion and why removal of the gall bladder impairs fat breakdown. [4 Marks]\n2. Describe TWO structural adaptations of the ileum villi that maximize the absorption of digested nutrients into the bloodstream and lacteals. [4 Marks]\n3. State the enzyme responsible for digesting starch in the duodenum and name the organ that secretes it. [2 Marks]\n\n[SUGGESTIONS: Explain chemical digestion by pancreatic enzymes | Explain structural adaptations of small intestine villi | Give me a 10-mark question on human nutrition]"
            };
        });

        const response = await aiTutorService.chatWithSubjectTutor({
            learnerUserId: null,
            role: 'learner',
            fullName: 'Bongani',
            subject: 'Life Sciences',
            grade: 10,
            stream: 'Science',
            message: 'Give me a difficult question about human nutrition worth 10 marks.',
            conversationId: null,
            conversationHistory: [],
            schoolName: 'Geleza High School'
        });

        assert.ok(response && response.reply, 'Response must have reply text');
        const lowerReply = response.reply.toLowerCase();
        assert.ok(
            lowerReply.includes('nutrition') || lowerReply.includes('digest') || lowerReply.includes('villi') || lowerReply.includes('bile'),
            'Must be about human nutrition'
        );
        assert.ok(
            lowerReply.includes('10 mark') || lowerReply.includes('[10 marks]'),
            'Must allocate 10 marks'
        );
    });

    test('TEST E: Hi (Natural Greeting)', async () => {
        aiTutorService.setMockProvider(async (prompt) => {
            return {
                text: "Sawubona Thabo! Great to study with you today. I am your Grade 10 Life Sciences tutor. What topic or exam question would you like to explore today?\n\n[SUGGESTIONS: Give me a Grade 10 Life Sciences practice question | Explain cell structure and organelles | What are the core exam topics for Term 3?]"
            };
        });

        const response = await aiTutorService.chatWithSubjectTutor({
            learnerUserId: null,
            role: 'learner',
            fullName: 'Thabo',
            subject: 'Life Sciences',
            grade: 10,
            stream: 'Science',
            message: 'Hi.',
            conversationId: null,
            conversationHistory: [],
            schoolName: 'Geleza High School'
        });

        assert.ok(response && response.reply, 'Response must have reply text');
        const lowerReply = response.reply.toLowerCase();
        assert.ok(
            lowerReply.includes('sawubona') || lowerReply.includes('hello') || lowerReply.includes('great') || lowerReply.includes('hi'),
            'Must return natural friendly greeting'
        );
        assert.ok(response.suggestions.length > 0, 'Must have contextual starter suggestions');
    });

    test('TEST F: Explain it more simply (Contextual Simplification)', async () => {
        aiTutorService.setMockProvider(async (prompt) => {
            assert.ok(prompt.includes('Explain it more simply'), 'Must pass user request');
            return {
                text: "Think of osmosis like a crowded room! Imagine water molecules as energetic dancers. If one room is full of pure water and another room has salty cordial with a doorway (the membrane) that only lets dancers through, the dancers naturally spread out into the room with less water until both rooms balance out. In plants, this is how roots drink water from soil without needing a pump!\n\n[SUGGESTIONS: Explain turgor pressure vs plasmolysis | Give me a 5-mark osmosis exam question | Explain xylem water conduction]"
            };
        });

        const response = await aiTutorService.chatWithSubjectTutor({
            learnerUserId: null,
            role: 'learner',
            fullName: 'Sipho',
            subject: 'Life Sciences',
            grade: 10,
            stream: 'Science',
            message: 'Explain it more simply.',
            conversationId: null,
            conversationHistory: [
                {
                    sender: 'user',
                    text: 'Explain osmosis.'
                },
                {
                    sender: 'ai',
                    text: 'Osmosis is the net movement of solvent molecules through a selectively permeable membrane along a water potential gradient.'
                }
            ],
            schoolName: 'Geleza High School'
        });

        assert.ok(response && response.reply, 'Response must have reply text');
        assert.ok(
            !response.reply.includes("What specific equation, concept, or subject question are you tackling?"),
            'Must NOT deflect with canned text'
        );
        const lowerReply = response.reply.toLowerCase();
        assert.ok(
            lowerReply.includes('water') && (lowerReply.includes('spread') || lowerReply.includes('room') || lowerReply.includes('balance') || lowerReply.includes('dancers') || lowerReply.includes('roots')),
            'Must re-explain using accessible explanation or analogy'
        );
    });

    test('TEST G: Model provider failure transparent handling', async () => {
        // Force provider to throw a simulated outage error
        aiTutorService.setMockProvider(async () => {
            const err = new Error('Simulated Gemini 429 Quota Exceeded');
            err.code = 429;
            throw err;
        });

        const response = await aiTutorService.chatWithSubjectTutor({
            learnerUserId: null,
            role: 'learner',
            fullName: 'Thabo',
            subject: 'Life Sciences',
            grade: 10,
            stream: 'Science',
            message: 'Describe what occurs when a turgid plant cell is placed in a concentrated hypertonic salt solution. [5 Marks]',
            conversationId: null,
            conversationHistory: [],
            schoolName: 'Geleza High School'
        });

        assert.ok(response && response.reply, 'Must return response even during provider failure');
        // Must NOT pretend it was a generic success greeting!
        assert.ok(
            !response.reply.includes("I'm right here with you! Let's work through this problem step-by-step. What specific equation, concept, or subject question are you tackling?"),
            'Must NOT return the fake generic canned placeholder'
        );
        // Must contain transparent notice and verified CAPS curriculum study guide fallback
        assert.ok(
            response.reply.includes('Note:') || response.reply.includes('Notice') || response.reply.includes('CAPS') || response.reply.includes('plasmolys'),
            'Must honestly inform the learner and provide verified CAPS study guide'
        );
        // Suggestions must remain academic
        assert.ok(response.suggestions.length > 0, 'Must have academic suggestions');
        const suggStr = response.suggestions.join(' ').toLowerCase();
        assert.ok(!suggStr.includes('timetable'), 'Must NOT fall back to timetable suggestion');
    });
});
