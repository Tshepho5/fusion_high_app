const db = require('../../../../db/db');

class RagService {
    /**
     * Search approved school documents, curriculum standards, and policies with strict tenant isolation
     */
    async searchKnowledge({ query, schoolId = null, subject = null, grade = null, limit = 4 }) {
        if (!query || !query.trim()) {
            return [];
        }

        const cleanQuery = query.trim().replace(/[^\w\s]/g, ' ');
        const effectiveLimit = Math.min(limit || 4, 8);

        // Build multi-tenant SQL query with full-text search + term fallback
        let sql = `
            SELECT c.id, c.topic, c.subtopic, c.content, c.metadata,
                   d.title, d.document_type, d.subject, d.grade, d.school_id,
                   ts_rank_cd(c.search_vector, plainto_tsquery('english', $1)) as rank
            FROM school_document_chunks c
            JOIN school_documents d ON c.document_id = d.id
            WHERE (d.school_id IS NULL OR d.school_id = $2)
              AND (
                  c.search_vector @@ plainto_tsquery('english', $1)
                  OR c.content ILIKE $3
                  OR c.topic ILIKE $3
              )
        `;

        const params = [cleanQuery, schoolId ? parseInt(schoolId, 10) : null, `%${cleanQuery.split(/\s+/)[0]}%`];

        if (subject) {
            params.push(`%${subject}%`);
            sql += ` AND (d.subject ILIKE $${params.length} OR d.subject IS NULL)`;
        }

        if (grade) {
            params.push(parseInt(grade, 10));
            sql += ` AND (d.grade = $${params.length} OR d.grade IS NULL)`;
        }

        sql += ` ORDER BY rank DESC, c.id ASC LIMIT ${effectiveLimit}`;

        try {
            const res = await db.query(sql, params);
            return res.rows.map(r => ({
                id: r.id,
                title: r.title,
                type: r.document_type,
                subject: r.subject,
                grade: r.grade,
                topic: r.topic,
                subtopic: r.subtopic,
                snippet: r.content.length > 500 ? r.content.substring(0, 497) + '...' : r.content,
                fullContent: r.content,
                metadata: r.metadata,
                citation: `[Source: ${r.title} — ${r.topic}${r.subtopic ? ` (${r.subtopic})` : ''}]`,
                relevanceScore: parseFloat(r.rank || 0).toFixed(3)
            }));
        } catch (err) {
            console.warn('[RAG SEARCH ERROR]:', err.message);
            return [];
        }
    }

    /**
     * Ingest a custom school policy or document for a specific institution
     */
    async ingestSchoolDocument({ schoolId, title, documentType, grade = null, subject = null, textContent }) {
        if (!title || !textContent) {
            throw new Error('Title and content are required for document ingestion.');
        }

        const docRes = await db.query(
            `INSERT INTO school_documents (school_id, title, document_type, grade, subject)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [schoolId ? parseInt(schoolId, 10) : null, title, documentType || 'school_policy', grade, subject]
        );
        const docId = docRes.rows[0].id;

        // Chunking strategy: split into paragraphs / sections (~400 words)
        const paragraphs = textContent.split(/\n\s*\n/).filter(p => p.trim().length > 30);
        const chunks = paragraphs.length > 0 ? paragraphs : [textContent];

        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i].trim();
            await db.query(
                `INSERT INTO school_document_chunks (document_id, chunk_index, topic, content, search_vector)
                 VALUES ($1, $2, $3, $4, to_tsvector('english', $5))`,
                [docId, i + 1, title, chunkText, `${title} ${chunkText}`]
            );
        }

        return {
            documentId: docId,
            totalChunksIndexed: chunks.length,
            title
        };
    }
}

module.exports = new RagService();
