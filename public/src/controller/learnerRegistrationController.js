'use strict';

const registrationService = require('../services/learnerRegistrationService');
const { resolveSchoolId } = require('../services/schoolScope');
const { isSchoolAdminRole, normalizeRole } = require('../../../lib/learnerRegistrationWorkflow');

function handleServiceError(res, err, fallbackMessage) {
  const status = Number(err?.status) || 500;
  if (status >= 500) {
    console.error('[LEARNER REGISTRATION CONTROLLER ERROR]:', err);
  }
  return res.status(status).json({
    error: err?.message || fallbackMessage,
    code: err?.code || undefined,
    details: err?.details || undefined
  });
}

exports.getMyRegistrations = async (req, res) => {
  try {
    const data = await registrationService.getMyRegistrations(req.user);
    return res.json(data);
  } catch (err) {
    return handleServiceError(res, err, 'Failed to load learner registrations.');
  }
};

exports.getRegistrationContext = async (req, res) => {
  try {
    const applicationId = parseInt(req.params.applicationId, 10);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({ error: 'Invalid application ID.' });
    }
    const context = await registrationService.getRegistrationContext({
      applicationId,
      actor: req.user
    });
    return res.json(context);
  } catch (err) {
    return handleServiceError(res, err, 'Failed to load learner registration details.');
  }
};

exports.completeRegistration = async (req, res) => {
  try {
    const applicationId = parseInt(req.params.applicationId, 10);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({ error: 'Invalid application ID.' });
    }
    const result = await registrationService.completeLearnerRegistration({
      applicationId,
      actor: req.user,
      payload: req.body || {}
    });
    return res.json(result);
  } catch (err) {
    return handleServiceError(res, err, 'Failed to complete learner registration.');
  }
};

exports.downloadAcceptanceLetter = async (req, res) => {
  try {
    const applicationId = parseInt(req.params.applicationId, 10);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({ error: 'Invalid application ID.' });
    }
    const pdf = await registrationService.generateAcceptanceLetterForActor({
      applicationId,
      actor: req.user
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(pdf.buffer);
  } catch (err) {
    return handleServiceError(res, err, 'Failed to generate acceptance letter PDF.');
  }
};

exports.getSchoolDashboard = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (!isSchoolAdminRole(role) && !req.user?.is_superadmin) {
      return res.status(403).json({ error: 'School administration permissions are required.' });
    }
    const requestedHeaderSchool = req.headers['x-school-id'] || req.query.school_id;
    if (
      !req.user?.is_superadmin &&
      requestedHeaderSchool !== undefined &&
      requestedHeaderSchool !== null &&
      String(requestedHeaderSchool).trim() !== '' &&
      Number(requestedHeaderSchool) !== Number(req.user?.school_id)
    ) {
      return res.status(403).json({ error: 'Cross-school registration access is prohibited.' });
    }
    const schoolId = resolveSchoolId(req) || req.user.school_id;
    const data = await registrationService.getSchoolRegistrationDashboard({
      schoolId,
      actor: req.user
    });
    return res.json(data);
  } catch (err) {
    return handleServiceError(res, err, 'Failed to load school registration dashboard.');
  }
};

exports.listDeregistrations = async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req) || req.user?.school_id || null;
    const rows = await registrationService.listDeregistrationRequests({
      actor: req.user,
      schoolId
    });
    return res.json({ requests: rows });
  } catch (err) {
    return handleServiceError(res, err, 'Failed to list deregistration requests.');
  }
};

exports.createDeregistration = async (req, res) => {
  try {
    const childId = parseInt(req.body?.child_id || req.body?.childId, 10);
    if (!Number.isInteger(childId) || childId <= 0) {
      return res.status(400).json({ error: 'A valid learner record ID is required.' });
    }
    const created = await registrationService.createDeregistrationRequest({
      actor: req.user,
      childId,
      requestType: req.body?.request_type || req.body?.requestType || 'deregistration',
      reason: req.body?.reason || '',
      targetSchoolName: req.body?.target_school_name || req.body?.targetSchoolName || null
    });
    return res.status(201).json({
      success: true,
      request: created,
      message: 'Your deregistration request has been submitted for Class Teacher review and Principal approval.'
    });
  } catch (err) {
    return handleServiceError(res, err, 'Failed to submit deregistration request.');
  }
};

exports.teacherReviewDeregistration = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ error: 'Invalid deregistration request ID.' });
    }
    const updated = await registrationService.reviewDeregistrationAsTeacher({
      requestId,
      actor: req.user,
      notes: req.body?.notes || req.body?.teacher_notes || ''
    });
    return res.json({
      success: true,
      request: updated,
      message: 'Class teacher review recorded. Forwarded to Principal / School Administration for final approval.'
    });
  } catch (err) {
    return handleServiceError(res, err, 'Failed to record class teacher review.');
  }
};

exports.adminDecideDeregistration = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ error: 'Invalid deregistration request ID.' });
    }
    const updated = await registrationService.decideDeregistrationAsAdmin({
      requestId,
      actor: req.user,
      decision: req.body?.decision,
      notes: req.body?.notes || req.body?.admin_decision_notes || ''
    });
    return res.json({
      success: true,
      request: updated,
      message: updated.status === 'approved'
        ? 'Deregistration approved. Historical records remain preserved and active enrollment has been closed.'
        : 'Deregistration request has been declined. The learner remains actively enrolled.'
    });
  } catch (err) {
    return handleServiceError(res, err, 'Failed to process deregistration decision.');
  }
};
