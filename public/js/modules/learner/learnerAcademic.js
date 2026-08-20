/**
 * Learner Dashboard - Academic & Subjects Module
 */

export async function loadLearnerMySubjectsOverview() {
    if (typeof window.loadLearnerMySubjectsOverview === 'function' && window.loadLearnerMySubjectsOverview !== loadLearnerMySubjectsOverview) {
        return window.loadLearnerMySubjectsOverview();
    }
}
