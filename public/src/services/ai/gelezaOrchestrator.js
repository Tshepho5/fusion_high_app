const aiProvider = require('./aiProvider');
const toolRegistry = require('./toolRegistry');
const aiTutorService = require('../aiTutorService');
const db = require('../../../../db/db');

/**
 * Builds the customized system prompt based on user role and context
 */
function buildSystemPrompt(user, role, schoolName = 'Geleza SA') {
    const userRole = (role || 'learner').toLowerCase();
    const name = user?.full_name || user?.name || 'User';

    const basePrompt = `You are Geleza AI, the official intelligent educational and school-management assistant for ${schoolName} in South Africa.
Current Date: 2026-10-09.
All curriculum standards follow South Africa's DBE CAPS (Curriculum and Assessment Policy Statement) for Grades 8 through 12.
Format your responses using clean GitHub Markdown with clear section headings, lists, tables, bold key concepts, and formatted mathematical/scientific notation.
Never invent school records, marks, policies, or student data. When exact records are needed, use your tools or state that records are not available.`;

    if (userRole === 'learner') {
        return `${basePrompt}
CURRENT USER: ${name} (Role: Learner/Student).
YOUR ROLE: Socratic CAPS Educational Tutor & Student Guide.
BEHAVIOR GUIDELINES:
1. Explain concepts step-by-step according to the learner's grade and subject.
2. Encourage understanding rather than just giving direct answers to homework or tests.
3. Provide hints, breakdown formulas, and guide the student through each step.
4. If the learner asks about their schedule, homework, or marks, use your authorized tools:
   - get_my_timetable
   - get_my_assignments
   - get_my_marks_summary
   - get_curriculum_topics
5. Support explanations in official South African languages (English, isiZulu, isiXhosa, Afrikaans, Sepedi, Setswana) whenever requested.`;
    }

    if (userRole === 'teacher') {
        return `${basePrompt}
CURRENT USER: ${name} (Role: Educator/Teacher).
YOUR ROLE: Geleza Teacher Copilot.
BEHAVIOR GUIDELINES:
1. Help teachers draft CAPS-aligned lesson plans, worksheets, and assessment papers.
2. Align test questions with Bloom's Taxonomy cognitive levels (Knowledge, Routine Procedure, Complex Procedure, Problem Solving).
3. Include realistic mark allocations (e.g. [2 Marks], [4 Marks]) and marking guidelines/memoranda.
4. Help draft constructive feedback for learners and communications for parents.
5. Remind educators that generated assessments, marks, and official notes remain subject to teacher review and approval.
6. Use authorized teacher tools:
   - get_teacher_classes
   - get_curriculum_topics
   - get_school_announcements`;
    }

    if (userRole === 'parent') {
        return `${basePrompt}
CURRENT USER: ${name} (Role: Parent/Guardian).
YOUR ROLE: Geleza Parent Academic Assistant.
BEHAVIOR GUIDELINES:
1. Provide empathetic, clear, and reassuring updates about the parent's enrolled children.
2. Explain South African CAPS achievement ratings (Level 7: 80-100%, Level 6: 70-79%, Level 5: 60-69%, Level 4: 50-59%, Level 3: 40-49%, Level 2: 30-39%, Level 1: 0-29%).
3. Always verify child identity using your tools before discussing records:
   - get_parent_children
   - get_child_academic_summary
4. Never reveal information about children not authorized for this parent.
5. Help draft respectful messages or consultation requests to educators.`;
    }

    if (userRole === 'admin' || userRole === 'superadmin') {
        return `${basePrompt}
CURRENT USER: ${name} (Role: Administrator / Leadership).
YOUR ROLE: Geleza Executive Administrative Assistant.
BEHAVIOR GUIDELINES:
1. Provide operational summaries, attendance metrics, and policy guidance.
2. Use authorized tools:
   - get_school_overview_stats
   - get_school_announcements
   - get_curriculum_topics
3. Uphold strict institutional data privacy and POPIA compliance.`;
    }

    return `${basePrompt}
CURRENT USER: Guest Visitor.
YOUR ROLE: Geleza SA Campus Navigator and Information Guide.
Help visitors understand school offerings, CAPS curriculum streams, and registration procedures.`;
}

class GelezaOrchestrator {
    /**
     * Orchestrates chat request: manages session, tools, LLM inference, and response formatting
     */
    async processChat({
        user,
        role,
        message,
        conversationId = null,
        schoolName = 'Geleza SA',
        contextData = {}
    }) {
        const effectiveRole = (role || (user && user.role) || 'learner').toLowerCase();
        let userId = null;
        if (user && user.id) {
            const parsed = parseInt(user.id, 10);
            if (!isNaN(parsed)) userId = parsed;
        }
        const schoolId = user && user.school_id ? parseInt(user.school_id, 10) : 1;

        // 1. Resolve or create conversation record
        let activeConvId = conversationId;
        if (!activeConvId) {
            try {
                const convRes = await db.query(
                    `INSERT INTO geleza_ai_conversations (user_id, role, school_id, title, context_data)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id`,
                    [
                        userId,
                        effectiveRole,
                        schoolId,
                        message.length > 50 ? `${message.substring(0, 47)}...` : message,
                        JSON.stringify(contextData)
                    ]
                );
                activeConvId = convRes.rows[0].id;
            } catch (convErr) {
                console.warn('[GELEZA AI] DB conversation insert warning:', convErr.message);
                activeConvId = Math.floor(Math.random() * 900000) + 100000;
            }
        }

        // 2. Persist user message
        try {
            await db.query(
                `INSERT INTO geleza_ai_messages (conversation_id, sender, content)
                 VALUES ($1, 'user', $2)`,
                [activeConvId, message]
            );
        } catch (msgErr) {
            console.warn('[GELEZA AI] DB user message insert warning:', msgErr.message);
        }

        // 3. Load recent conversation history (last 8 messages)
        let history = [];
        try {
            const histRes = await db.query(
                `SELECT sender, content 
                 FROM geleza_ai_messages 
                 WHERE conversation_id = $1 
                 ORDER BY created_at ASC 
                 LIMIT 10`,
                [activeConvId]
            );
            history = histRes.rows.slice(0, -1).map(r => ({
                role: r.sender === 'assistant' ? 'assistant' : 'user',
                content: r.content
            }));
        } catch (_) {}

        // 4. Resolve role-authorized tools
        const roleTools = toolRegistry.getToolsForRole(effectiveRole);
        const systemPrompt = buildSystemPrompt(user, effectiveRole, schoolName);

        // 5. Query AI model with tools, falling back to rich offline knowledge engine if unavailable
        let response = null;
        const toolCallsMade = [];

        try {
            response = await aiProvider.generateContent({
                systemInstruction: systemPrompt,
                prompt: message,
                history,
                tools: roleTools.length > 0 ? roleTools : null
            });

            // 6. If model requested tool execution (function calling loop)
            if (response && response.functionCalls && response.functionCalls.length > 0) {
                for (const call of response.functionCalls) {
                    try {
                        const toolResult = await toolRegistry.executeTool(call.name, call.args || {}, {
                            user: { ...user, role: effectiveRole, school_id: schoolId }
                        });

                        toolCallsMade.push({
                            tool: call.name,
                            args: call.args,
                            result: toolResult
                        });

                        // Follow up with tool results to synthesize grounded final answer
                        const followUpPrompt = `TOOL RESULT for ${call.name}:\n${JSON.stringify(toolResult, null, 2)}\n\nPlease synthesize a clear, helpful response for ${user?.full_name || 'the user'} based on these verified facts.`;
                        const followUpRes = await aiProvider.generateContent({
                            systemInstruction: systemPrompt,
                            prompt: followUpPrompt,
                            history: [
                                ...history,
                                { role: 'user', content: message }
                            ]
                        });

                        if (followUpRes && followUpRes.text) {
                            response.text = followUpRes.text;
                        }
                    } catch (toolErr) {
                        console.warn(`[GELEZA AI] Tool execution error (${call.name}):`, toolErr.message);
                    }
                }
            }
        } catch (providerErr) {
            console.warn('[GELEZA AI] AI Provider unavailable or rate-limited, activating intelligent offline engine:', providerErr.message);
            response = await this._generateOfflineResponse(message, effectiveRole, user, schoolName, history);
        }

        if (!response || !response.text) {
            response = await this._generateOfflineResponse(message, effectiveRole, user, schoolName, history);
        }

        const replyText = response.text || "I'm here to help you. What would you like to explore?";

        // Extract action links: [Label](action:tab_id)
        const linkRegex = /\[([^\]]+)\]\(action:([a-zA-Z0-9_-]+)\)/g;
        const actionLinks = [];
        let m;
        while ((m = linkRegex.exec(replyText)) !== null) {
            actionLinks.push({ label: m[1].trim(), tab: m[2].trim() });
        }

        // 7. Contextual follow-up suggestions based on role
        const suggestions = (response.suggestions && response.suggestions.length > 0)
            ? response.suggestions
            : this._generateSuggestions(effectiveRole, message);

        // 8. Persist assistant message with metadata
        let messageId = Date.now();
        let messageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        try {
            const metadata = {
                toolCalls: toolCallsMade,
                modelUsed: response.modelUsed || 'geleza-offline-knowledge-engine',
                suggestions,
                actionLinks
            };

            const msgRes = await db.query(
                `INSERT INTO geleza_ai_messages (conversation_id, sender, content, metadata)
                 VALUES ($1, 'assistant', $2, $3)
                 RETURNING id, created_at`,
                [activeConvId, replyText, JSON.stringify(metadata)]
            );

            if (msgRes.rows.length > 0) {
                messageId = msgRes.rows[0].id;
                messageTime = new Date(msgRes.rows[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            await db.query(
                `UPDATE geleza_ai_conversations SET updated_at = NOW() WHERE id = $1`,
                [activeConvId]
            );
        } catch (saveErr) {
            console.warn('[GELEZA AI] Assistant message DB persist warning:', saveErr.message);
        }

        return {
            conversationId: activeConvId,
            messageId,
            reply: replyText,
            answer: replyText,
            sender: 'ai',
            timestamp: messageTime,
            suggestions,
            actionLinks,
            toolCalls: toolCallsMade,
            model: response.modelUsed || 'geleza-offline-knowledge-engine'
        };
    }

    /**
     * Resilient offline academic and portal response generator
     */
    async _generateOfflineResponse(message, role, user, schoolName = 'Geleza SA', history = []) {
        const query = (message || '').trim();
        const lower = query.toLowerCase();
        const userName = user?.full_name || user?.name || '';
        const detectedGrade = lower.includes('grade 10') || lower.includes('gr 10') 
            ? 10 
            : (lower.includes('grade 11') || lower.includes('gr 11') 
                ? 11 
                : (lower.includes('grade 12') || lower.includes('gr 12') 
                    ? 12 
                    : (parseInt(user?.grade, 10) || 10)));
        const grade = detectedGrade;

        // 1. Check if greeting
        if (aiTutorService.isGreetingText(query)) {
            const greeting = aiTutorService.getGreetingResponse('General Academics', grade, userName, role);
            return {
                text: greeting.reply,
                suggestions: greeting.suggestions,
                modelUsed: 'geleza-offline-knowledge-engine'
            };
        }

        // 2. Check academic subjects first (Life Sciences, Physical Sciences, Mathematics)
        const isLifeScience = lower.includes('life science') || lower.includes('biology') || lower.includes('mitosis') || lower.includes('osmosis') || lower.includes('photosynthesis') || lower.includes('enzyme') || lower.includes('leaf') || lower.includes('meiosis') || lower.includes('dna');
        const isPhysics = lower.includes('physics') || lower.includes('physical science') || lower.includes('chemistry') || lower.includes('circuit') || lower.includes('wave') || lower.includes('stoichiometry') || lower.includes('newton') || lower.includes('velocity');
        const isMath = lower.includes('math') || lower.includes('algebra') || lower.includes('geometry') || lower.includes('trigonometry') || lower.includes('calculus') || lower.includes('equation');
        const isAcademicSubject = isLifeScience || isPhysics || isMath;

        if (isLifeScience) {
            const kbItem = grade === 10 ? aiTutorService.queryLifeSciencesGrade10Model(query) : aiTutorService.queryLifeSciencesModel(query, grade);
            if (aiTutorService.isPracticeQuestionRequest(query)) {
                const pq = aiTutorService.getPracticeQuestionResponse('Life Sciences', grade, kbItem, query);
                return {
                    text: pq.reply,
                    suggestions: pq.suggestions,
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
            if (aiTutorService.isExplainTopicRequest(query)) {
                const et = aiTutorService.getExplainTopicResponse('Life Sciences', grade);
                return {
                    text: et.reply,
                    suggestions: et.suggestions,
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
            if (kbItem) {
                return {
                    text: `### 🧬 Life Sciences (Grade ${grade}): ${kbItem.topic} (${kbItem.subtopic})\n\n${kbItem.model_answer}\n\n---\n#### 📋 Official DBE CAPS Marking Rubric Breakdown:\n${kbItem.rubric_points.map(p => `• ${p}`).join('\n')}\n\n💡 **CAPS Exam Tip**:\n${kbItem.common_misconceptions}\n\n🤝 *Teacher Note: ${kbItem.human_guidance}*`,
                    suggestions: aiTutorService.generateAcademicSuggestions(kbItem.topic, 'Life Sciences', grade),
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
        }

        if (isPhysics) {
            const kbItem = grade === 10 ? aiTutorService.queryPhysicalSciencesGrade10Model(query) : aiTutorService.queryPhysicalSciencesModel(query, grade);
            if (aiTutorService.isPracticeQuestionRequest(query)) {
                const pq = aiTutorService.getPracticeQuestionResponse('Physical Sciences', grade, kbItem, query);
                return {
                    text: pq.reply,
                    suggestions: pq.suggestions,
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
            if (aiTutorService.isExplainTopicRequest(query)) {
                const et = aiTutorService.getExplainTopicResponse('Physical Sciences', grade);
                return {
                    text: et.reply,
                    suggestions: et.suggestions,
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
            if (kbItem) {
                return {
                    text: `### ⚛️ Physical Sciences (Grade ${grade}): ${kbItem.topic} (${kbItem.subtopic})\n\n${kbItem.model_answer}\n\n---\n#### 📋 Official DBE CAPS Marking Rubric Breakdown:\n${kbItem.rubric_points.map(p => `• ${p}`).join('\n')}\n\n💡 **CAPS Exam Tip**:\n${kbItem.common_misconceptions}\n\n🤝 *Teacher Note: ${kbItem.human_guidance}*`,
                    suggestions: aiTutorService.generateAcademicSuggestions(kbItem.topic, 'Physical Sciences', grade),
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
        }

        if (isMath) {
            const kbItem = aiTutorService.queryMathematicsModel(query);
            if (aiTutorService.isPracticeQuestionRequest(query)) {
                const pq = aiTutorService.getPracticeQuestionResponse('Mathematics', grade, kbItem, query);
                return {
                    text: pq.reply,
                    suggestions: pq.suggestions,
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
            if (kbItem) {
                return {
                    text: `### 📐 Mathematics (Grade ${grade}): ${kbItem.topic} (${kbItem.subtopic})\n\n${kbItem.model_answer}\n\n---\n#### 📋 Official DBE CAPS Marking Rubric Breakdown:\n${kbItem.rubric_points.map(p => `• ${p}`).join('\n')}\n\n💡 **CAPS Exam Tip**:\n${kbItem.common_misconceptions}\n\n🤝 *Teacher Note: ${kbItem.human_guidance}*`,
                    suggestions: aiTutorService.generateAcademicSuggestions(kbItem.topic, 'Mathematics', grade),
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
        }

        // 3. Check if portal / navigation question (if not an academic subject question)
        if (!isAcademicSubject) {
            const portalAns = aiTutorService.resolvePortalOrAppAnswer(query, role);
            if (portalAns && portalAns.text) {
                return {
                    text: portalAns.text,
                    suggestions: portalAns.suggestions || [],
                    actionLinks: portalAns.actionLinks || [],
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
        }

        // 4. Role-based fallback
        if (role === 'teacher') {
            if (lower.includes('lesson') || lower.includes('plan')) {
                return {
                    text: `### 📋 DBE CAPS Lesson Plan Generator\n\n**Subject:** Life Sciences / Physical Sciences / Mathematics\n**Phase:** FET Phase (Grade 10-12)\n**Duration:** 60 Minutes (Double Period)\n\n#### 1. CAPS Curriculum Alignment\n- **Curriculum Statement:** DBE CAPS Topic Outline & Annual Teaching Plan (ATP)\n- **Cognitive Levels (Bloom's Taxonomy):**\n  * 40% Knowledge & Recall\n  * 35% Routine Procedures & Comprehension\n  * 25% Complex Procedures & Problem Solving\n\n#### 2. Lesson Structure\n1. **Hook & Prior Knowledge (10 mins):** Socratic diagnostic review of prerequisite concepts.\n2. **Direct Instruction & Demonstration (20 mins):** Step-by-step concept breakdown with real-world South African examples.\n3. **Guided Practice (15 mins):** Collaborative problem solving in pairs with immediate educator feedback.\n4. **Independent Assessment & Wrap-up (15 mins):** 5-mark exit ticket testing core competency.\n\n👉 [Open AI Assessment Tools](action:ai-tools)\n👉 [School Subjects Manager](action:school-subjects)`,
                    suggestions: ["Generate Bloom's cognitive questions", 'Draft homework worksheet', 'Summarize lesson targets'],
                    modelUsed: 'geleza-offline-knowledge-engine'
                };
            }
        }

        if (role === 'parent') {
            return {
                text: `### 👨‍👩‍👧 Geleza Parent Academic Portal\n\nWelcome to your parent portal assistant. Here is how you can support your child's academic journey:\n\n- **Attendance Registers:** Check daily and period attendance records.\n- **DBE CAPS Report Cards:** View official Term 1 to Term 4 marks against the 7-Point Rating Scale (Level 7: 80-100%, Level 6: 70-79%, Level 5: 60-69%, Level 4: 50-59%, Level 3: 40-49%, Level 2: 30-39%, Level 1: 0-29%).\n- **Educator Consultations:** Request an appointment with your child's subject teacher.\n\n👉 [View CAPS Report Cards](action:reports)\n👉 [Schedule Consultation](action:consultations)`,
                suggestions: ['View latest term report card', 'Show attendance records', 'Schedule parent-teacher consultation'],
                modelUsed: 'geleza-offline-knowledge-engine'
            };
        }

        // Default intelligent assistance
        return {
            text: `### 🤖 Geleza AI 24/7 Educational Assistant\n\nI am here to help you across all areas of **${schoolName}**!\n\nHere are some of the things you can ask me:\n- 📖 **Curriculum & Study Help:** Ask any concept, equation, or exam question in Life Sciences, Physical Sciences, Mathematics, Commerce, or Languages.\n- 📅 **Schedules & Deadlines:** Check your timetable, upcoming assignments, and term calendar.\n- 📊 **Academic Performance:** View your term averages and DBE CAPS performance levels.\n\n👉 [Open Timetable](action:timetable)\n👉 [Go to Assignments](action:assignments)\n👉 [View CAPS Report Cards](action:reports)`,
            suggestions: ['Generate a Grade 10 exam question', 'Where is my timetable?', 'View my CAPS report cards'],
            modelUsed: 'geleza-offline-knowledge-engine'
        };
    }

    _generateSuggestions(role, userQuery) {
        const lower = userQuery.toLowerCase();
        if (role === 'learner') {
            if (lower.includes('math') || lower.includes('algebra') || lower.includes('geometry')) {
                return ['Show another practice question', 'Explain with formula breakdown', 'Show CAPS mark breakdown'];
            }
            if (lower.includes('timetable') || lower.includes('schedule')) {
                return ['Show tomorrow\'s schedule', 'What is my next period?', 'Are there any timetable changes?'];
            }
            return ['Show my homework deadlines', 'Explain a difficult topic step-by-step', 'View my term averages'];
        }

        if (role === 'parent') {
            return ['Show attendance breakdown', 'View latest term report card', 'Draft a note to the class teacher'];
        }

        if (role === 'teacher') {
            return ['Generate Bloom\'s cognitive test questions', 'Draft CAPS lesson plan template', 'Summarize class performance'];
        }

        if (role === 'admin') {
            return ['Show school overview statistics', 'Recent school announcements', 'View academic calendar fixtures'];
        }

        return ['How do I register a learner?', 'What CAPS streams are offered?', 'How does the parent portal work?'];
    }

    /**
     * Retrieve all conversations for an authenticated user
     */
    async getUserConversations(userId, role) {
        const uid = parseInt(userId, 10);
        if (isNaN(uid)) return [];
        const res = await db.query(
            `SELECT c.id, c.title, c.module, c.role, c.created_at, c.updated_at,
                    (SELECT content FROM geleza_ai_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
             FROM geleza_ai_conversations c
             WHERE c.user_id = $1
             ORDER BY c.updated_at DESC LIMIT 30`,
            [uid]
        );
        return res.rows;
    }

    /**
     * Retrieve messages for a specific conversation session
     */
    async getConversationMessages(conversationId, userId) {
        // Verify ownership
        const convRes = await db.query(
            `SELECT id, title, role, user_id FROM geleza_ai_conversations WHERE id = $1 LIMIT 1`,
            [conversationId]
        );
        if (convRes.rows.length === 0) {
            return null;
        }

        const conv = convRes.rows[0];
        if (conv.user_id && String(conv.user_id) !== String(userId)) {
            throw new Error('Access denied: You do not own this conversation.');
        }

        const msgRes = await db.query(
            `SELECT id, sender, content, metadata, created_at 
             FROM geleza_ai_messages 
             WHERE conversation_id = $1 
             ORDER BY created_at ASC`,
            [conversationId]
        );

        return {
            conversation: conv,
            messages: msgRes.rows.map(m => ({
                id: `msg-${m.id}`,
                sender: m.sender === 'assistant' ? 'ai' : m.sender,
                text: m.content,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                metadata: m.metadata,
                suggestions: m.metadata?.suggestions || []
            }))
        };
    }

    /**
     * Delete a conversation session
     */
    async deleteConversation(conversationId, userId) {
        const uid = parseInt(userId, 10);
        if (isNaN(uid)) return false;
        const res = await db.query(
            `DELETE FROM geleza_ai_conversations 
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [conversationId, uid]
        );
        return res.rows.length > 0;
    }
}

module.exports = new GelezaOrchestrator();
