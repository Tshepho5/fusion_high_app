'use strict';

function subjectiveHomeworkReview({ submissionText, fileName }) {
  const textContent = String(submissionText || '').trim();
  const wordCount = textContent ? textContent.split(/\s+/).length : 0;
  return {
    ai_score: null,
    ai_percentage: null,
    score_recorded: false,
    official_mark: false,
    scoring_method: 'teacher_review',
    ai_feedback: wordCount > 0 || fileName
      ? 'The submission was received. It is not an objective question, so no mark was given.'
      : 'No answer text was received.',
    ai_strengths: null,
    ai_areas_for_improvement: 'A teacher needs to mark this answer against the assignment rubric.'
  };
}

module.exports = { subjectiveHomeworkReview };
