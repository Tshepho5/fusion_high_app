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

function sendError(res, error, fallbackMessage = 'The curriculum request could not be completed.') {
  const status = error.status || 500;
  if (status >= 500) console.error('[ACADEMIC STREAMS]', error.message);
  if (error.code === 'SCHEMA_OUT_OF_DATE') {
    return res.status(503).json({
      error: error.message,
      code: error.code
    });
  }
  return res.status(status).json({
    error: status >= 500 ? fallbackMessage : error.message,
    errors: error.errors || undefined
  });
}

exports.catalogue = (req, res) => {
  res.json(streams.catalogue);
};

exports.published = async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    const requestedYear = parseInt(req.query.year, 10) || new Date().getFullYear();
    const rawGrade = req.query.grade !== undefined && req.query.grade !== '' ? parseInt(req.query.grade, 10) : null;

    if (!schoolId) {
      return res.status(400).json({ error: 'Choose a valid school.' });
    }
    if (rawGrade !== null && ![8, 9, 10, 11, 12].includes(rawGrade)) {
      return res.status(400).json({ error: 'Choose Grade 8, 9, 10, 11 or 12.' });
    }

    const isFet = rawGrade !== null && [10, 11, 12].includes(rawGrade);
    if (!isFet) {
      const langData = await streams.readApplicantLanguages(schoolId, requestedYear, rawGrade);
      return res.json({
        academic_year: langData.year || requestedYear,
        requested_year: requestedYear,
        grade: rawGrade,
        languages: langData.languages,
        language_source: langData.source,
        mathematics: langData.mathematics || [],
        streams: [],
        empty: false
      });
    }

    const available = await streams.streamsForApplicants(schoolId, requestedYear, rawGrade);
    const offerings = await streams.readApplicantLanguages(schoolId, available.year, rawGrade);
    res.json({
      academic_year: available.year || offerings.year || requestedYear,
      requested_year: requestedYear,
      grade: rawGrade,
      languages: offerings.languages,
      language_source: offerings.source,
      mathematics: offerings.mathematics,
      streams: available.streams,
      empty: available.streams.length === 0
    });
  } catch (error) {
    sendError(res, error, 'The school offerings could not be loaded.');
  }
};

exports.configuration = async (req, res) => {
  try {
    const schoolId = schoolIdFrom(req);
    const availableYears = await streams.getConfiguredYears(schoolId);
    const now = new Date();
    const defaultYear = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
    const rawYear = req.query.year;
    let year = (rawYear && rawYear !== 'auto') ? parseInt(rawYear, 10) : NaN;
    if (!Number.isInteger(year)) {
      year = availableYears.length ? availableYears[0] : defaultYear;
    }
    const rawGrade = parseInt(req.query.grade, 10);
    const grade = [8, 9, 10, 11, 12].includes(rawGrade) ? rawGrade : 10;

    const [summary, offerings, allGradeOfferings, configured, allStreams, registrationProfile] = await Promise.all([
      streams.configurationSummary(schoolId, year),
      streams.readOfferings(schoolId, year, grade),
      streams.readAllGradeOfferings(schoolId, year),
      streams.listStreams(schoolId, year, grade),
      streams.listStreams(schoolId, year, null),
      streams.getSchoolRegistrationProfile(schoolId)
    ]);

    res.json({
      academic_year: year,
      grade,
      available_years: availableYears,
      summary,
      offerings,
      all_grade_offerings: allGradeOfferings,
      streams: configured,
      all_streams: allStreams,
      registration_profile: registrationProfile,
      catalogue: streams.catalogue
    });
  } catch (error) {
    sendError(res, error, 'The school academic configuration could not be loaded.');
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

exports.copyYear = async (req, res) => {
  try {
    const schoolId = schoolIdFrom(req);
    const sourceYear = parseInt(req.body?.source_year, 10);
    const targetYear = parseInt(req.body?.target_year, 10);
    const result = await streams.copyYearConfiguration(schoolId, req.user.id, sourceYear, targetYear);
    res.json(result);
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
