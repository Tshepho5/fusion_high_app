const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../public/src/services/lessonPlanning/lessonPlanningRules');

const teacher = { userId: 4, schoolId: 2, role: 'teacher', isSuperadmin: false };
const admin = { userId: 9, schoolId: 2, role: 'admin', isSuperadmin: false };
const otherSchool = { userId: 4, schoolId: 3, role: 'teacher', isSuperadmin: false };

describe('lesson planning access', () => {
  const plan = { school_id: 2, teacher_id: 4 };

  it('keeps a teacher inside their own plans and school', () => {
    assert.equal(rules.canReadPlan(teacher, plan), true);
    assert.equal(rules.canWritePlan(teacher, plan), true);
    assert.equal(rules.canReadPlan(teacher, { school_id: 2, teacher_id: 8 }), false);
    assert.equal(rules.canReadPlan(otherSchool, plan), false);
  });

  it('lets a school administrator read, and only the owner write', () => {
    assert.equal(rules.canReadPlan(admin, { school_id: 2, teacher_id: 8 }), true);
    assert.equal(rules.canWritePlan(admin, { school_id: 2, teacher_id: 8 }), false);
    assert.equal(rules.canReadPlan(admin, { school_id: 7, teacher_id: 8 }), false);
  });
});

describe('lesson planning allocations', () => {
  const allocations = [
    { subject_name: 'Mathematics', grade: 10, class_name: '10A', class_id: 15 }
  ];

  it('accepts only an allocated subject and class', () => {
    assert.equal(rules.allocationMatches(allocations, { subject_name: 'Mathematics', grade: 10, class_name: '10A' }), true);
    assert.equal(rules.allocationMatches(allocations, { subject_name: 'Tourism', grade: 10, class_name: '10A' }), false);
    assert.equal(rules.allocationMatches(allocations, { subject_name: 'Mathematics', grade: 11, class_name: '10A' }), false);
  });
});

describe('lesson planning preparation rules', () => {
  it('warns when presentation time exceeds the lesson duration and still allows a draft', () => {
    const timing = rules.timeWarning(45, [{ duration_minutes: 30 }, { duration_minutes: 20 }]);
    assert.equal(timing.exceeds, true);
    assert.equal(timing.allocated, 50);
    const input = rules.normalisePlanInput({
      subject_name: 'Mathematics',
      grade: 10,
      class_name: '10A',
      academic_year: 2026,
      term: 1,
      duration_minutes: 45,
      save_as: 'draft',
      stages: [{ stage_name: 'Practice', duration_minutes: 50, teacher_activities: 'Guide', learner_activities: 'Work' }]
    });
    assert.deepEqual(rules.validatePlanInput(input), []);
    assert.equal(rules.resolveStatus(input, null), 'draft');
  });

  it('does not mark objectives achieved unless the teacher records it', () => {
    const input = rules.normalisePlanInput({ reflection: { what_went_well: 'The examples landed.' } });
    assert.equal(input.reflection.objectives_achieved_flag, null);
    const gaps = rules.preparationGaps({
      status: 'completed',
      topic: 'Algebra',
      objectives: [],
      evaluations: [],
      stages: [],
      reflection: null
    });
    assert.ok(gaps.some((gap) => /objectives/i.test(gap)));
    assert.ok(gaps.some((gap) => /reflection/i.test(gap)));
  });

  it('stores template structure without school or teacher identity', () => {
    const content = rules.buildTemplateContent({
      school_name: 'Registered School',
      teacher_first_name: 'A',
      teacher_surname: 'Teacher',
      duration_minutes: 60,
      objectives: [{ objective: 'Solve a linear equation.' }],
      stages: [],
      materials: [],
      methods: [],
      references: [],
      evaluations: [],
      assignments: []
    });
    assert.equal(rules.templateHasIdentity(content), false);
    assert.equal(content.objectives[0].objective, 'Solve a linear equation.');
    const applied = rules.applyTemplateContent(content, {
      subject_name: 'Mathematics',
      grade: 10,
      class_name: '10A',
      academic_year: 2026,
      term: 2,
      topic: 'Equations'
    });
    assert.equal(applied.subject_name, 'Mathematics');
    assert.equal(applied.topic, 'Equations');
    assert.equal(applied.save_as, 'draft');
  });
});

describe('lesson planning assistant request', () => {
  it('refuses to invent a lesson when the topic is missing', () => {
    const request = rules.buildAiRequest('objectives', { subject_name: 'Life Sciences', grade: 11 });
    assert.equal(request.ok, false);
    assert.ok(request.warnings.some((warning) => /topic/i.test(warning)));
  });

  it('includes the supplied subject and topic and forbids an official compliance claim', () => {
    const request = rules.buildAiRequest('stages', {
      subject_name: 'Accounting',
      grade: 10,
      topic: 'Cash receipts journal',
      duration_minutes: 45,
      objectives: [{ objective: 'Record a cash sale.' }]
    });
    assert.equal(request.ok, true);
    assert.match(request.prompt, /Accounting/);
    assert.match(request.prompt, /Cash receipts journal/);
    assert.match(request.prompt, /Do not claim official curriculum compliance/);
  });
});

describe('lesson planning input cleaning', () => {
  it('strips markup from teacher text', () => {
    assert.equal(rules.cleanText('<script>alert(1)</script> Photosynthesis', 100), 'alert(1) Photosynthesis');
  });
});
