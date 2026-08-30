const db = require('../db/db');

async function testEach() {
  const schoolId = 1;
  const queries = [
    { name: '1. roles & users', q: "SELECT r.name AS role, COUNT(u.id) AS count FROM roles r LEFT JOIN users u ON u.role_id = r.id AND u.school_id = $1 WHERE r.name IN ('admin', 'teacher', 'parent') GROUP BY r.name;", params: [schoolId] },
    { name: '2. announcements is_assignment', q: "SELECT COUNT(*) FROM announcements WHERE is_assignment = TRUE AND school_id = $1", params: [schoolId] },
    { name: '3. textbooks', q: "SELECT COUNT(*) FROM textbooks WHERE school_id = $1", params: [schoolId] },
    { name: '4. progress', q: "SELECT COUNT(*) FROM progress p JOIN children c ON p.child_id = c.id WHERE c.school_id = $1", params: [schoolId] },
    { name: '5. enrolledLearnersStats', q: "SELECT GREATEST((SELECT COUNT(*) FROM children WHERE school_id = $1), (SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'learner' AND u.school_id = $1)) AS count", params: [schoolId] },
    { name: '6. classes', q: "SELECT COUNT(*) FROM classes WHERE school_id = $1", params: [schoolId] },
    { name: '7. attendance rate', q: "SELECT COALESCE(ROUND((COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0)), 0) as attendance_rate FROM attendance a JOIN children c ON a.child_id = c.id WHERE c.school_id = $1;", params: [schoolId] },
    { name: '8. grade attendance', q: "SELECT c.grade, COALESCE(ROUND((COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0)), 0) as rate FROM children c LEFT JOIN attendance a ON c.id = a.child_id WHERE c.school_id = $1 GROUP BY c.grade ORDER BY c.grade;", params: [schoolId] },
    { name: '9. registration trends', q: "SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '6 months' AND school_id = $1 GROUP BY month ORDER BY month;", params: [schoolId] },
    { name: '10. attendance status count', q: "SELECT a.status, COUNT(*) as count FROM attendance a JOIN children c ON a.child_id = c.id WHERE c.school_id = $1 GROUP BY a.status;", params: [schoolId] },
    { name: '11. top classes', q: "SELECT COALESCE(cl.name, 'Grade ' || c.grade) as name, ROUND(AVG(p.grade), 1) as avg_grade FROM progress p JOIN children c ON p.child_id = c.id LEFT JOIN classes cl ON c.class_id = cl.id WHERE c.school_id = $1 GROUP BY COALESCE(cl.name, 'Grade ' || c.grade) ORDER BY avg_grade DESC LIMIT 5;", params: [schoolId] },
    { name: '12. recent reports', q: "SELECT p.id, c.full_name as student_name, c.surname as student_surname, p.subject, p.grade, p.date FROM progress p JOIN children c ON p.child_id = c.id WHERE c.school_id = $1 ORDER BY p.date DESC LIMIT 5;", params: [schoolId] },
    { name: '13. behavior incidents', q: "SELECT COUNT(*) FROM behavior_incidents WHERE school_id = $1", params: [schoolId] },
    { name: '14. recent announcements', q: "SELECT a.id, a.title, a.content, a.created_at, COALESCE(CONCAT(u.full_name, ' ', u.surname), 'Principal Admin') AS author_name FROM announcements a LEFT JOIN users u ON a.author_id = u.id WHERE a.school_id = $1 ORDER BY a.created_at DESC LIMIT 3;", params: [schoolId] },
    { name: '15. timetables', q: "SELECT id, name, timetable_data FROM timetables WHERE school_id = $1 ORDER BY created_at DESC LIMIT 1;", params: [schoolId] },
    { name: '16. applications', q: "SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved, COUNT(CASE WHEN status = 'enrolled' THEN 1 END) as enrolled, COUNT(CASE WHEN status IN ('submitted', 'action_required', 'waitlisted') THEN 1 END) as pending FROM applications WHERE school_id = $1;", params: [schoolId] }
  ];

  for (const item of queries) {
    try {
      await db.query(item.q, item.params);
      console.log('✅ Passed:', item.name);
    } catch(err) {
      console.error('❌ FAILED:', item.name, '-->', err.message);
    }
  }
  process.exit(0);
}

testEach();
