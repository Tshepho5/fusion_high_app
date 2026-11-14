'use strict';

const streams = require('../services/academicStreamService');

function schoolIdFrom(req) {
  const schoolId = parseInt(req.params.id, 10);
  if (!schoolId) {
    const error = new Error('A valid school is required.');
    error.status = 400;
    throw error;
  }
  if (!req.user?.is_superadmin && Number(req.user.school_id) !== schoolId) {
    const error = new Error('You can only manage subject streams for your own school.');
    error.status = 403;
    throw error;
  }
  return schoolId;
}

function sendError(res, error) {
  const status = error.status || 500;
  if (status >= 500) console.error('[ACADEMIC STREAMS]', error.message);
  return res.status(status).json({
    error: status >= 500 ? 'The subject stream could not be saved.' : error.message,
    errors: error.errors || undefined
  });
}

exports.catalogue = (req, res) => {
  res.json(streams.catalogue);
};

exports.published = async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    const year = parseInt(req.query.year, 10);
    const grade = parseInt(req.query.grade, 10);
    if (!schoolId || !year || ![10, 11, 12].includes(grade)) {
      return res.status(400).json({ error: 'Choose the school, academic year and Grade 10, 11 or 12.' });
    }
    const [offerings, published] = await Promise.all([
      streams.readOfferings(schoolId, year, grade),
      streams.listStreams(schoolId, year, grade, { publishedOnly: true })
    ]);
    res.json({
      academic_year: year,
      grade,
      languages: offerings.languages,
      mathematics: offerings.mathematics,
      streams: published,
      empty: published.length === 0
    });
  } catch (error) {
    sendError(res, error);
  }
};

exports.configuration = async (req, res) => {
  try {
    const schoolId = schoolIdFrom(req);
    const year = parseInt(req.query.year, 10);
    const grade = parseInt(req.query.grade, 10);
    const [summary, offerings, configured] = await Promise.all([
      streams.configurationSummary(schoolId, year),
      streams.readOfferings(schoolId, year, grade),
      streams.listStreams(schoolId, year, grade)
    ]);
    res.json({ summary, offerings, streams: configured, catalogue: streams.catalogue });
  } catch (error) {
    sendError(res, error);
  }
};

exports.saveOfferings = async (req, res) => {
  try {
    const schoolId = schoolIdFrom(req);
    const offerings = await streams.saveOfferings(schoolId, req.user.id, req.body || {});
    res.json({ offerings });
  } catch (error) {
    sendError(res, error);
  }
};

exports.saveStream = async (req, res) => {
  try {
    const schoolId = schoolIdFrom(req);
    const streamId = req.params.streamId ? parseInt(req.params.streamId, 10) : null;
    const stream = await streams.writeStream(schoolId, req.user.id, req.body || {}, streamId);
    res.status(streamId ? 200 : 201).json({ stream });
  } catch (error) {
    sendError(res, error);
  }
};

exports.publishStream = async (req, res) => {
  try {
    const stream = await streams.setStreamStatus(schoolIdFrom(req), parseInt(req.params.streamId, 10), 'published');
    res.json({ stream });
  } catch (error) {
    sendError(res, error);
  }
};

exports.archiveStream = async (req, res) => {
  try {
    const stream = await streams.setStreamStatus(schoolIdFrom(req), parseInt(req.params.streamId, 10), 'archived');
    res.json({ stream });
  } catch (error) {
    sendError(res, error);
  }
};

exports.approveSubjectChange = async (req, res) => {
  try {
    const approval = await streams.approveSubjectChange(schoolIdFrom(req), req.user.id, req.body || {});
    res.status(201).json({ approval });
  } catch (error) {
    sendError(res, error);
  }
};
