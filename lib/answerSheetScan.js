'use strict';

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function matchRosterLearner({ learnerNumber, surname, roster }) {
  const number = clean(learnerNumber).toLowerCase();
  if (!number) {
    return {
      status: 'mismatch',
      child_id: null,
      reason: 'A learner number is required. A surname on its own is not used.'
    };
  }
  const matches = (Array.isArray(roster) ? roster : []).filter((row) => clean(row.learner_number).toLowerCase() === number);
  if (!matches.length) {
    return {
      status: 'mismatch',
      child_id: null,
      reason: 'No learner on this assessment roster has that learner number.'
    };
  }
  if (matches.length > 1) {
    return {
      status: 'manual_review',
      child_id: null,
      reason: 'More than one roster learner has that learner number.'
    };
  }
  const learner = matches[0];
  const givenSurname = clean(surname).toLowerCase();
  const rosterSurname = clean(learner.surname).toLowerCase();
  if (givenSurname && rosterSurname && givenSurname !== rosterSurname) {
    return {
      status: 'manual_review',
      child_id: learner.child_id,
      reason: 'The surname does not match the learner number on the roster.'
    };
  }
  return { status: 'matched', child_id: learner.child_id, learner_number: learner.learner_number };
}

function prepareScan({ match, statedMark, maximum, documentHash, existingHashes, confirmedChildIds }) {
  const hash = clean(documentHash).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    return { ok: false, status: 'invalid', error: 'The answer sheet needs a document fingerprint before it can be registered.' };
  }
  if ((existingHashes || []).some((item) => clean(item).toLowerCase() === hash)) {
    return { ok: false, status: 'duplicate', error: 'This answer sheet was already registered for the assessment.' };
  }
  if (!match || match.status !== 'matched') {
    return {
      ok: true,
      status: match && match.status === 'manual_review' ? 'manual_review' : 'mismatch',
      child_id: match && match.child_id ? match.child_id : null,
      stated_mark: null,
      confidence: 'unrecognized',
      reason: match && match.reason
    };
  }
  if ((confirmedChildIds || []).map(Number).includes(Number(match.child_id))) {
    return {
      ok: true,
      status: 'manual_review',
      child_id: match.child_id,
      stated_mark: null,
      confidence: 'learner_mismatch',
      reason: 'This learner already has a confirmed answer sheet for the assessment.'
    };
  }
  if (statedMark === '' || statedMark === null || statedMark === undefined) {
    return {
      ok: true,
      status: 'awaiting_verification',
      child_id: match.child_id,
      stated_mark: null,
      confidence: 'unrecognized'
    };
  }
  const value = Number(statedMark);
  const max = Number(maximum);
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(max) || max <= 0 || value > max) {
    return {
      ok: true,
      status: 'invalid',
      child_id: match.child_id,
      stated_mark: null,
      confidence: 'invalid_mark',
      reason: 'The reading is outside the assessment total.'
    };
  }
  return {
    ok: true,
    status: 'awaiting_verification',
    child_id: match.child_id,
    stated_mark: value,
    confidence: 'manual'
  };
}

function confirmScan({ status, childId, statedMark, maximum, correctedMark }) {
  if (status === 'confirmed') return { ok: false, error: 'This answer sheet is already confirmed.' };
  if (status === 'rejected' || status === 'mismatch' || status === 'manual_review' || status === 'duplicate' || status === 'invalid') {
    return { ok: false, error: 'Match one enrolled learner and a valid mark before confirming this answer sheet.' };
  }
  if (!childId) return { ok: false, error: 'Match the answer sheet to one enrolled learner before confirming.' };
  const mark = correctedMark === undefined || correctedMark === null || correctedMark === '' ? statedMark : correctedMark;
  if (mark === '' || mark === null || mark === undefined) {
    return { ok: false, error: 'Enter the mark before confirming. A blank is not zero.' };
  }
  const value = Number(mark);
  const max = Number(maximum);
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(max) || value > max) {
    return { ok: false, error: 'A mark cannot be higher than the assessment total.' };
  }
  return { ok: true, score: value, child_id: Number(childId) };
}

function scanBatch({ roster, scans }) {
  const active = (Array.isArray(scans) ? scans : []).filter((row) => row.status !== 'rejected');
  const byChild = new Map();
  active.forEach((row) => {
    if (!row.child_id) return;
    const id = Number(row.child_id);
    if (!byChild.has(id)) byChild.set(id, []);
    byChild.get(id).push(row);
  });
  const missing = (Array.isArray(roster) ? roster : []).filter((learner) => {
    const rows = byChild.get(Number(learner.child_id)) || [];
    return !rows.some((row) => row.status === 'confirmed' || row.status === 'awaiting_verification');
  }).map((learner) => ({
    child_id: learner.child_id,
    learner_number: learner.learner_number || null,
    surname: learner.surname || null
  }));
  const multiple = [];
  byChild.forEach((rows, childId) => {
    if (rows.length > 1) multiple.push({ child_id: childId, count: rows.length });
  });
  const confirmable = active.filter((row) => (
    row.status === 'awaiting_verification'
    && row.child_id
    && row.stated_mark !== null
    && row.stated_mark !== undefined
    && row.stated_mark !== ''
  )).map((row) => row.id);
  const learners = Array.isArray(roster) ? roster : [];
  const complete = learners.length > 0
    && missing.length === 0
    && multiple.length === 0
    && learners.every((learner) => (byChild.get(Number(learner.child_id)) || []).some((row) => row.status === 'confirmed'));
  return { missing, multiple, confirmable, complete };
}

function rejectScan(status) {
  if (status === 'confirmed') {
    return { ok: false, error: 'A confirmed answer sheet stays on record. Correct the mark on the marksheet.' };
  }
  if (status === 'rejected') return { ok: false, error: 'This answer sheet is already rejected.' };
  return { ok: true, status: 'rejected' };
}

module.exports = { matchRosterLearner, prepareScan, confirmScan, scanBatch, rejectScan };
