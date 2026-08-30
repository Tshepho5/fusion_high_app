const db = require('../../../db/db');

/**
 * Returns all inter-school competitions, derby fixtures, and academic olympiads.
 * Supports filtering by category ('sports', 'academics', 'cultural') or school_id.
 */
exports.getCompetitions = async (req, res) => {
  try {
    const { category, status, school_id } = req.query;
    let query = `
      SELECT 
        c.id,
        c.title,
        c.activity_type,
        c.category,
        c.event_date,
        c.venue,
        c.home_score,
        c.away_score,
        c.status,
        c.trophy_title,
        c.highlights,
        c.created_at,
        h.id AS home_school_id,
        h.name AS home_school_name,
        h.slug AS home_school_slug,
        h.logo_url AS home_school_logo,
        h.primary_color AS home_school_color,
        h.circuit AS home_school_circuit,
        a.id AS away_school_id,
        a.name AS away_school_name,
        a.slug AS away_school_slug,
        a.logo_url AS away_school_logo,
        a.primary_color AS away_school_color,
        a.circuit AS away_school_circuit
      FROM inter_school_competitions c
      JOIN schools h ON c.home_school_id = h.id
      JOIN schools a ON c.away_school_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all' && category !== 'undefined') {
      params.push(String(category).trim().toLowerCase());
      query += ` AND LOWER(c.category) = $${params.length}`;
    }

    if (status && status !== 'all' && status !== 'undefined') {
      params.push(String(status).trim().toLowerCase());
      query += ` AND LOWER(c.status) = $${params.length}`;
    }

    if (school_id && school_id !== 'all' && school_id !== 'undefined') {
      const parsedSchoolId = parseInt(school_id, 10);
      if (!isNaN(parsedSchoolId) && parsedSchoolId > 0) {
        params.push(parsedSchoolId);
        query += ` AND (c.home_school_id = $${params.length}::integer OR c.away_school_id = $${params.length}::integer)`;
      }
    }

    query += ` ORDER BY c.event_date DESC;`;

    const { rows } = await db.query(query, params);
    res.json({ success: true, competitions: rows });
  } catch (err) {
    console.error('Error fetching inter-school competitions:', err);
    res.status(500).json({ error: 'Failed to retrieve inter-school competitions: ' + err.message });
  }
};

/**
 * Creates and schedules an inter-school fixture / derby match / academic competition.
 */
exports.createCompetition = async (req, res) => {
  try {
    const {
      title,
      activity_type,
      category = 'sports',
      home_school_id,
      away_school_id,
      event_date,
      venue,
      trophy_title,
      highlights
    } = req.body;

    if (!title || !activity_type || !home_school_id || !away_school_id || !event_date) {
      return res.status(400).json({
        error: 'Title, activity type, home school, away school, and event date are required.'
      });
    }

    if (parseInt(home_school_id, 10) === parseInt(away_school_id, 10)) {
      return res.status(400).json({ error: 'Home school and Away school must be distinct institutions.' });
    }

    const query = `
      INSERT INTO inter_school_competitions (
        title, activity_type, category, home_school_id, away_school_id,
        event_date, venue, trophy_title, highlights, created_by, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled')
      RETURNING *;
    `;

    const { rows } = await db.query(query, [
      title.trim(),
      activity_type.trim(),
      category.toLowerCase().trim(),
      parseInt(home_school_id, 10),
      parseInt(away_school_id, 10),
      new Date(event_date),
      venue ? venue.trim() : 'Neutral Venue / Host School Grounds',
      trophy_title ? trophy_title.trim() : null,
      highlights ? highlights.trim() : null,
      req.user?.id || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Inter-school competition fixture scheduled successfully.',
      competition: rows[0]
    });
  } catch (err) {
    console.error('Error creating competition:', err);
    res.status(500).json({ error: 'Failed to create inter-school competition: ' + err.message });
  }
};

/**
 * Updates match score, status, and highlights.
 */
exports.updateScoreAndStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { home_score, away_score, status, highlights } = req.body;

    const query = `
      UPDATE inter_school_competitions
      SET 
        home_score = COALESCE($1, home_score),
        away_score = COALESCE($2, away_score),
        status = COALESCE($3, status),
        highlights = COALESCE($4, highlights)
      WHERE id = $5
      RETURNING *;
    `;

    const { rows } = await db.query(query, [
      home_score !== undefined ? parseInt(home_score, 10) : null,
      away_score !== undefined ? parseInt(away_score, 10) : null,
      status || null,
      highlights || null,
      parseInt(id, 10)
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Competition fixture not found.' });
    }

    res.json({
      success: true,
      message: 'Competition scores and status updated successfully.',
      competition: rows[0]
    });
  } catch (err) {
    console.error('Error updating competition:', err);
    res.status(500).json({ error: 'Failed to update competition: ' + err.message });
  }
};

/**
 * Computes inter-school championship standings and leaderboard points.
 * Standard Points system: Win = 3 pts, Draw = 1 pt, Loss = 0 pts.
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { category } = req.query;

    let catFilter = '';
    const params = [];
    if (category && category !== 'all' && category !== 'undefined') {
      params.push(String(category).trim().toLowerCase());
      catFilter = ` AND LOWER(c.category) = $1`;
    }

    const query = `
      WITH matches AS (
        SELECT 
          home_school_id AS school_id,
          CASE 
            WHEN home_score > away_score THEN 3
            WHEN home_score = away_score THEN 1
            ELSE 0
          END AS points,
          CASE WHEN home_score > away_score THEN 1 ELSE 0 END AS won,
          CASE WHEN home_score = away_score THEN 1 ELSE 0 END AS drawn,
          CASE WHEN home_score < away_score THEN 1 ELSE 0 END AS lost,
          home_score AS scored,
          away_score AS conceded,
          CASE WHEN trophy_title IS NOT NULL AND home_score > away_score THEN 1 ELSE 0 END AS trophies
        FROM inter_school_competitions c
        WHERE c.status = 'completed' ${catFilter}

        UNION ALL

        SELECT 
          away_school_id AS school_id,
          CASE 
            WHEN away_score > home_score THEN 3
            WHEN away_score = home_score THEN 1
            ELSE 0
          END AS points,
          CASE WHEN away_score > home_score THEN 1 ELSE 0 END AS won,
          CASE WHEN away_score = home_score THEN 1 ELSE 0 END AS drawn,
          CASE WHEN away_score < home_score THEN 1 ELSE 0 END AS lost,
          away_score AS scored,
          home_score AS conceded,
          CASE WHEN trophy_title IS NOT NULL AND away_score > home_score THEN 1 ELSE 0 END AS trophies
        FROM inter_school_competitions c
        WHERE c.status = 'completed' ${catFilter}
      )
      SELECT 
        s.id AS school_id,
        s.name AS school_name,
        s.slug AS school_slug,
        s.circuit,
        s.district,
        s.province,
        s.logo_url,
        s.primary_color,
        COALESCE(COUNT(m.school_id), 0)::int AS played,
        COALESCE(SUM(m.won), 0)::int AS won,
        COALESCE(SUM(m.drawn), 0)::int AS drawn,
        COALESCE(SUM(m.lost), 0)::int AS lost,
        COALESCE(SUM(m.scored), 0)::int AS score_for,
        COALESCE(SUM(m.conceded), 0)::int AS score_against,
        (COALESCE(SUM(m.scored), 0) - COALESCE(SUM(m.conceded), 0))::int AS score_diff,
        COALESCE(SUM(m.points), 0)::int AS points,
        COALESCE(SUM(m.trophies), 0)::int AS trophies_count
      FROM schools s
      LEFT JOIN matches m ON s.id = m.school_id
      WHERE s.is_active = TRUE
      GROUP BY s.id
      ORDER BY points DESC, score_diff DESC, won DESC, s.name ASC;
    `;

    const { rows } = await db.query(query, params);
    res.json({ success: true, leaderboard: rows });
  } catch (err) {
    console.error('Error calculating inter-school leaderboard:', err);
    res.status(500).json({ error: 'Failed to calculate leaderboard: ' + err.message });
  }
};
