const aiProvider = require('./aiProvider');
const toolRegistry = require('./toolRegistry');
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
        }

        // 2. Persist user message
        await db.query(
            `INSERT INTO geleza_ai_messages (conversation_id, sender, content)
             VALUES ($1, 'user', $2)`,
            [activeConvId, message]
        );

        // 3. Load recent conversation history (last 8 messages)
        const histRes = await db.query(
            `SELECT sender, content 
             FROM geleza_ai_messages 
             WHERE conversation_id = $1 
             ORDER BY created_at ASC 
             LIMIT 10`,
            [activeConvId]
        );

        const history = histRes.rows.slice(0, -1).map(r => ({
            role: r.sender === 'assistant' ? 'assistant' : 'user',
            content: r.content
        }));

        // 4. Resolve role-authorized tools
        const roleTools = toolRegistry.getToolsForRole(effectiveRole);
        const systemPrompt = buildSystemPrompt(user, effectiveRole, schoolName);

        // 5. Query AI model with tools
        let response = await aiProvider.generateContent({
            systemInstruction: systemPrompt,
            prompt: message,
            history,
            tools: roleTools.length > 0 ? roleTools : null
        });

        const toolCallsMade = [];

        // 6. If model requested tool execution (function calling loop)
        if (response.functionCalls && response.functionCalls.length > 0) {
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

                    if (followUpRes.text) {
                        response.text = followUpRes.text;
                    }
                } catch (toolErr) {
                    console.warn(`[GELEZA AI] Tool execution error (${call.name}):`, toolErr.message);
                }
            }
        }

        const replyText = response.text || "I'm here to help you. What would you like to explore?";

        // 7. Contextual follow-up suggestions based on role
        const suggestions = this._generateSuggestions(effectiveRole, message);

        // 8. Persist assistant message with metadata
        const metadata = {
            toolCalls: toolCallsMade,
            modelUsed: response.modelUsed,
            suggestions
        };

        const msgRes = await db.query(
            `INSERT INTO geleza_ai_messages (conversation_id, sender, content, metadata)
             VALUES ($1, 'assistant', $2, $3)
             RETURNING id, created_at`,
            [activeConvId, replyText, JSON.stringify(metadata)]
        );

        // Update conversation updated_at
        await db.query(
            `UPDATE geleza_ai_conversations SET updated_at = NOW() WHERE id = $1`,
            [activeConvId]
        );

        return {
            conversationId: activeConvId,
            messageId: msgRes.rows[0].id,
            reply: replyText,
            sender: 'ai',
            timestamp: new Date(msgRes.rows[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestions,
            toolCalls: toolCallsMade,
            model: response.modelUsed
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
