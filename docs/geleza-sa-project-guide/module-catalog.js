/**
 * Per-role module narratives for GSA-DOC-PROJECT-001.
 * Each entry becomes a documentation page with prose + screenshot.
 */
module.exports = {
  learner: {
    role: 'Learner',
    route: '/dashboard/learner',
    colour: '#0e7490',
    tester: 'Lerato Walters (learner.walters@gelezasa.co.za) — Grade 10 Science, Makgoka High (GSA-MKG-001)',
    intro:
      'The learner portal is a personal academic cockpit. Geleza SA shows verified school data only — never invented marks — and groups every academic, study, and campus-life tool under Home and the More hub.',
    homeShot: { file: '10-learner-home.png', caption: 'Learner Home — enrolled subjects carousel, Resources / AI Tutor / Marks shortcuts, and pinned Favorite Modules.' },
    moreShot: { file: '11-learner-more.png', caption: 'Learner Main Navigation Menu — academics, study/AI, campus life, finance, and profile modules.' },
    modules: [
      {
        file: 'L01-subjects.png',
        title: 'My Enrolled Subjects Workspace',
        why: 'Learners need one place per CAPS subject instead of scattered files and chat groups.',
        talk:
          'In Geleza SA, each enrolled subject opens as a focused workspace. From here learners reach subject resources, past papers, AI tutor shortcuts, and marks for that subject. The module reinforces curriculum identity (subject name, grade, stream) so study time stays CAPS-aligned rather than generic browsing.',
        how: 'Open More → My Enrolled Subjects, or tap a subject card on Home. Use Resources for materials, AI Tutor for revision, and Marks for verified results when the school has published them.'
      },
      {
        file: '12-learner-performance.png',
        title: 'Academic Performance & Marks',
        why: 'Trust collapses when portals show placeholder scores.',
        talk:
          'The Subject Academic Performance view surfaces SBA and term results only after the school uploads verified assessment data. Until then, Geleza SA shows an honest pending state. This design choice is central to the product: learners and parents see the same truth the school recorded.',
        how: 'Home or More → Academic Performance. Filter by subject. Contact Admin if a published mark looks wrong after school confirmation.'
      },
      {
        file: 'L02-reports.png',
        title: 'CAPS Term Report Cards',
        why: 'Families historically wait for paper reports or informal photos of mark sheets.',
        talk:
          'When the principal publishes CAPS report cards from the Report Card Studio, learners open the official term report digitally. Layout and levels follow CAPS language so the on-screen document matches what the school would print.',
        how: 'More → CAPS Term Report Cards. Select the published term. Download or view when the school has released the cycle.'
      },
      {
        file: 'L03-assignments.png',
        title: 'Homework & Digital Assignments',
        why: 'Homework deadlines get lost across WhatsApp and paper diaries.',
        talk:
          'The Homework & Digital Assignments Hub lists teacher-issued tasks, due dates, and submission status. Learners work inside Geleza SA so teachers and parents share one assignment timeline instead of fragmented reminders.',
        how: 'More → Homework & Digital Assignments. Open a task, attach or complete work, and watch status update after teacher review.'
      },
      {
        file: 'L04-ai-tutor.png',
        title: 'CAPS AI Study Tutor',
        why: 'After-hours revision support is uneven across households.',
        talk:
          'Geleza SA’s CAPS AI Study Tutor and Exam Studios guide Grade 8–12 revision with curriculum-aware prompts. AI is positioned as study support under school academic-integrity rules — not a substitute for honest assessment.',
        how: 'More → CAPS AI Study Tutor, or use subject shortcuts on Home. Prefer practice explanations; never paste controlled-test answers into AI tools against school policy.'
      },
      {
        file: 'L05-timetable.png',
        title: 'Weekly Class Timetable',
        why: 'Period changes and room moves confuse learners without a live grid.',
        talk:
          'The Weekly Class Timetable shows the learner’s published period grid once the school allocates and publishes the timetable. It anchors the rest of the day: attendance, subjects, and exam seating all reference the same schedule world.',
        how: 'More → Weekly Class Timetable (also available from Home highlights when configured).'
      },
      {
        file: 'L06-calendar.png',
        title: 'School Calendar',
        why: 'Term dates, sports fixtures, and exam windows live in too many places.',
        talk:
          'The School Calendar consolidates institutional events, term boundaries, and key academic dates. Learners use it to plan study blocks around real school life, not rumour.',
        how: 'Bottom navigation Calendar tab or More → School Calendar.'
      },
      {
        file: 'L07-messages.png',
        title: 'Message Hub',
        why: 'Important school messages drown in personal chat apps.',
        talk:
          'Message Hub keeps institutional and peer messaging inside Geleza SA. Learners receive school-context conversations without mixing them into private social channels.',
        how: 'Messages tab or More → Message Hub. Use Help → Contact Admin for account/data mistakes rather than messaging casually.'
      },
      {
        file: 'L08-bursaries.png',
        title: 'NSFAS & Bursary Finder',
        why: 'FET learners need early visibility of tertiary funding options.',
        talk:
          'The NSFAS & Tertiary Bursary Finder surfaces funding and bursary information for senior learners. It connects career aspiration (APS guidance elsewhere) with practical next-step discovery.',
        how: 'More → NSFAS & Tertiary Bursary Finder. Explore listings and follow official application channels outside the app where required.'
      },
      {
        file: 'L09-finance.png',
        title: 'School Fee Statements',
        why: 'Fee opacity creates tension between school and home.',
        talk:
          'Where the school enables fee modules, learners can view statements and receipts that match the finance records parents and admins see. Geleza SA treats fees as school-truth data, not marketing placeholders.',
        how: 'More → School Fee Statements & Receipts when the module is enabled for the school.'
      },
      {
        file: 'L10-sports.png',
        title: 'Sports & Extracurriculars',
        why: 'Campus life is part of school belonging, not an afterthought.',
        talk:
          'Sports & Extracurricular Clubs let learners discover and follow school activities. Together with inter-school derbies (where enabled), this module keeps non-academic participation visible in the same app as academics.',
        how: 'More → Sports & Extracurricular Clubs.'
      },
      {
        file: 'L11-settings.png',
        title: 'App & Technical Settings',
        why: 'Accessibility and security preferences differ per device and learner.',
        talk:
          'Settings cover theme, notifications, security, and Help & Support. From here learners reach FAQs, Geleza SA AI help, and Contact Admin when profile or access data is wrong.',
        how: 'More → App & Technical Settings, or Profile → Settings.'
      },
      {
        file: 'L12-exam-seating.png',
        title: 'Exam Seating & Candidate Slips',
        why: 'Exam-day anxiety rises when seating is announced only on paper boards.',
        talk:
          'Exam Seating & Candidate Slips show hall grids and admission tickets once the school publishes seating. Learners confirm venue and seat before exam day inside Geleza SA.',
        how: 'More → Exam Seating & Candidate Slips after the school releases the seating plan.'
      },
      {
        file: '13-learner-profile.png',
        title: 'My Profile & Digital Student ID',
        why: 'Learners need a clear identity card for school interactions.',
        talk:
          'The learner profile presents a digital student ID with learner number, grade, contacts, and SA ID fields the school holds. It is the identity anchor for login, seating, and support tickets.',
        how: 'Profile tab. Use Contact Admin if any identity field is incorrect.'
      }
    ]
  },

  parent: {
    role: 'Parent / Guardian',
    route: '/dashboard/parent',
    colour: '#7c3aed',
    tester: 'Sarah Walters (parent.walters@gelezasa.co.za) — linked to Lerato Walters',
    intro:
      'Parents enter Geleza SA after a Parent Portal Application is approved (or after registration and child linkage). The Family Learning Hub centres linked children so guardians oversee marks, attendance, fees, and consultations without visiting the office for every update.',
    homeShot: { file: '14-parent-home.png', caption: 'Parent Family Learning Hub — registered learner card with Attendance and Report Card actions.' },
    moreShot: { file: '15-parent-more.png', caption: 'Parent Main Navigation Menu — children & academics, fees, school life, communications, and account.' },
    modules: [
      {
        file: 'P01-children.png',
        title: 'My Children & Marks',
        why: 'Guardians need one verified view of each linked learner.',
        talk:
          'My Children & Marks is the parent’s primary academic surface. Linked learners appear with access to marks and related actions. Visibility follows school publication rules — the same verified-data principle used on the learner portal.',
        how: 'Home learner cards or More → My Children & Marks. Switch child if multiple learners are linked.'
      },
      {
        file: 'P02-reports.png',
        title: 'CAPS Report Cards',
        why: 'Parents previously relied on paper collection days or informal shares.',
        talk:
          'Published CAPS report cards appear for each linked child. Parents read the same official document the school produced in the Report Card Studio, supporting transparent family conversations about progress.',
        how: 'More → CAPS Report Cards, or Report Card action on the child card.'
      },
      {
        file: 'P03-attendance.png',
        title: 'Attendance Records',
        why: 'Absence patterns are hard to spot from occasional SMS notes.',
        talk:
          'Attendance Records show presence history captured by teachers’ registers. Parents can spot trends early and engage the school before academic impact compounds.',
        how: 'More → Attendance Records or Attendance on the child card.'
      },
      {
        file: 'P04-timetable.png',
        title: 'Student Timetable',
        why: 'Parents support homework and transport when they know the period grid.',
        talk:
          'The Student Timetable mirrors the learner’s published weekly schedule so guardians can plan afternoons, sport, and study support around real class times.',
        how: 'More → Student Timetable.'
      },
      {
        file: 'P05-finance.png',
        title: 'School Fees & Statements',
        why: 'Fee queries drive many office visits.',
        talk:
          'Where enabled, School Fees & Statements give parents invoices, balances, and receipts aligned to school finance records. Combined with Contact Admin, fee disputes have a structured path instead of lost emails.',
        how: 'More → School Fees & Statements.'
      },
      {
        file: 'P06-ptc.png',
        title: 'Parent-Teacher Consultations',
        why: 'Booking meetings by WhatsApp is unreliable at scale.',
        talk:
          'Parent-Teacher Consultations let guardians book and manage academic meetings with educators inside Geleza SA, keeping schedules visible to both sides.',
        how: 'More → Parent-Teacher Consultations.'
      },
      {
        file: 'P07-messages.png',
        title: 'Message Hub',
        why: 'School–home communication needs an audit-friendly channel.',
        talk:
          'Message Hub & Teacher Chat keep parent–school dialogue in context. For wrong application details (email, phone, ID), parents should use Contact Admin so the Support Desk can correct records formally.',
        how: 'Messages tab or More → Message Hub. Help → Contact Admin for data corrections.'
      },
      {
        file: 'P08-calendar.png',
        title: 'School Calendar',
        why: 'Guardians miss events announced only at assemblies.',
        talk:
          'The School Calendar surfaces term dates, meetings, and school events so family planning matches institutional reality.',
        how: 'Calendar tab or More → School Calendar.'
      },
      {
        file: 'P09-bursaries.png',
        title: 'NSFAS & Bursary Hub',
        why: 'Parents co-drive tertiary funding research for FET learners.',
        talk:
          'The NSFAS & Bursary Hub helps families explore funding options alongside their child’s academic journey in Geleza SA.',
        how: 'More → NSFAS & Bursary Hub.'
      },
      {
        file: 'P10-settings.png',
        title: 'Portal Settings',
        why: 'Parents need secure, readable preferences on phone and desktop.',
        talk:
          'Portal Settings cover theme, security, and Help & Support. This is also the path into FAQs and Contact Admin when an application used the wrong email, phone, or ID.',
        how: 'More → Portal Settings → Help & Support / Contact Admin as needed.'
      }
    ]
  },

  teacher: {
    role: 'Teacher / Educator',
    route: '/dashboard/teacher',
    colour: '#0369a1',
    tester: 'Thabang Maetane (teacher.science@gelezasa.co.za) — Physical Sciences / Life Sciences / Mathematics',
    intro:
      'Teachers work from a classroom-first Educator Workspace. Geleza SA scopes marksheets, attendance, assignments, conduct, and AI lesson tools to the classes and subjects assigned by the school.',
    homeShot: { file: '16-teacher-home.png', caption: 'Educator Workspace — assigned teaching classes with Register and Marks actions.' },
    moreShot: { file: '17-teacher-more.png', caption: 'Educator Main Navigation Menu — grading, classroom ops, curriculum/AI, and school system modules.' },
    modules: [
      {
        file: 'T01-assessments.png',
        title: 'SBA Marksheets & Grading',
        why: 'CAPS SBA capture is the spine of secondary assessment.',
        talk:
          'Learner Assessment & Performance Matrix lets teachers select class and subject, review formal assessment averages, term composites, and AI activity averages, then capture marks against the CAPS Formal Assessment Schedule by term. Data feeds learner/parent views only when verified and published per school process.',
        how: 'Home class → Marks, or More → SBA Marksheets & Grading. Choose class, subject, term, then Capture New Marks.'
      },
      {
        file: 'T02-attendance.png',
        title: 'Class Attendance Register',
        why: 'Paper registers delay parent visibility and leadership oversight.',
        talk:
          'The Class Attendance Register captures period presence for the teacher’s classes. Attendance feeds parent records and school analytics, closing the loop between classroom reality and family oversight.',
        how: 'Home → Register on a class card, or More → Class Attendance Register.'
      },
      {
        file: 'T03-assignments.png',
        title: 'Homework & Assignment Hub',
        why: 'Issuing and marking homework across channels wastes teaching time.',
        talk:
          'Teachers create, issue, and review digital assignments in one hub. Learner submissions and feedback stay attached to the class context inside Geleza SA.',
        how: 'More → Homework & Assignment Hub.'
      },
      {
        file: 'T04-ai-tools.png',
        title: 'AI Lesson & Test Paper Studio',
        why: 'Lesson prep and draft papers consume evenings.',
        talk:
          'AI Lesson & Test Paper Studio helps educators draft CAPS-oriented lessons and practice papers. Outputs are starting points for professional judgment — teachers remain accountable for final assessment quality.',
        how: 'More → AI Lesson & Test Paper Studio.'
      },
      {
        file: 'T05-early-warning.png',
        title: 'AI Early-Warning Radar',
        why: 'At-risk learners are often noticed too late.',
        talk:
          'AI Early-Warning Radar highlights learners who may need intervention based on academic signals available in the system, supporting pastoral and subject support before failure consolidates.',
        how: 'More → AI Early-Warning Radar. Follow school intervention protocols after reviewing signals.'
      },
      {
        file: 'T06-timetable.png',
        title: 'Educator Timetable',
        why: 'Teaching load and venues must be clear each day.',
        talk:
          'Educator Timetable & Rooms shows the teacher’s allocated periods and venues from the school’s published timetable — the same source learners and parents consult.',
        how: 'More → Educator Timetable & Rooms.'
      },
      {
        file: 'T07-messages.png',
        title: 'Message Hub',
        why: 'Staff–parent messaging needs structure.',
        talk:
          'Teachers use Message Hub for staff and parent communications without losing context in personal messaging apps.',
        how: 'Messages tab or More → Message Hub.'
      },
      {
        file: 'T08-conduct.png',
        title: 'Merit & Disciplinary Conduct',
        why: 'Conduct records must be fair, dated, and visible to leadership.',
        talk:
          'Merit & Disciplinary Conduct records positive and corrective events against learners. This supports consistent behaviour management across the school.',
        how: 'More → Merit & Disciplinary Conduct.'
      },
      {
        file: 'T09-ptc.png',
        title: 'Parent-Teacher Consultations',
        why: 'Consultation slots collapse without a shared booking surface.',
        talk:
          'Teachers manage consultation availability and meetings with parents inside Geleza SA, aligning with the parent PTC module.',
        how: 'More → Parent-Teacher Consultations.'
      },
      {
        file: 'T10-settings.png',
        title: 'App Settings',
        why: 'Educators need the same help and security controls as other roles.',
        talk:
          'App Settings cover theme, notifications, security, and Help & Support — including Contact Admin for account issues.',
        how: 'More → App & Technical Settings.'
      }
    ]
  },

  principal: {
    role: 'Principal / School Admin',
    route: '/dashboard/admin',
    colour: '#b45309',
    tester: 'K. E. Molepo (principal@makgoka.co.za) — Makgoka High school admin',
    intro:
      'Principals and school admins operate the Administrative Control Center. After Geleza SA approves the school, leadership governs users, admissions, parent applications, academics, fees, communications, and the User Support Desk from one role-based portal.',
    homeShot: { file: '18-principal-home.png', caption: 'Principal Home — School Subjects Intelligence Hub with Marks and Reports actions.' },
    moreShot: { file: '19-principal-more.png', caption: 'Executive Portal menu — User Directory, Support Desk, Multi-School Command, and operations modules.' },
    modules: [
      {
        file: '20-principal-users.png',
        title: 'User Directory & Roles',
        why: 'Schools cannot run without governed employee, learner, and parent accounts.',
        talk:
          'User Directory & Roles is the people spine of Geleza SA for a school: employees/teachers, learners, parents, admissions, parent applications, and school admins. From here principals enrol staff, lock profiles when needed, and move into Parent Applications for Accept & Link / Reject / Correct workflows.',
        how: 'More → User Directory & Roles. Use Parent Applications for guardian onboarding and corrections.'
      },
      {
        file: '21-principal-support-desk.png',
        title: 'User Support Desk',
        why: 'Wrong email/phone/ID on applications previously stranded users.',
        talk:
          'User Support Desk is the human recovery lane. Tickets from Contact Admin land here. Admins correct mistaken application fields, add resolution notes, and restore access without forcing families to restart from zero. This privilege is intentional for principals and Geleza SA platform staff.',
        how: 'More → User Support Desk. Open ticket → Correct linked application or resolve with message to the requester.'
      },
      {
        file: 'A01-marks.png',
        title: 'CAPS Mark Audits',
        why: 'Leadership must moderate SBA quality before families see results.',
        talk:
          'CAPS Mark Audits give principals oversight of assessment capture across subjects and classes. This is where school truth is protected before learner and parent portals reflect marks.',
        how: 'More → CAPS Mark Audits & Report Cards / Marks pathways from Home subject cards.'
      },
      {
        file: 'A02-reports.png',
        title: 'CAPS Report Card Studio',
        why: 'Official reports must be composed and published deliberately.',
        talk:
          'Report Card Studio is where the school composes and publishes CAPS term reports. Publication is the event that unlocks learner and parent report views.',
        how: 'More → CAPS Report Card Studio or Home → Reports actions.'
      },
      {
        file: 'A03-classes.png',
        title: 'Dynamic Classes & Homerooms',
        why: 'Class structures change every year and mid-year.',
        talk:
          'Dynamic Classes & Homerooms manage streams, class teachers, and learner placement. Timetable, attendance, and marksheets all depend on this structure.',
        how: 'More → Dynamic Classes & Homerooms.'
      },
      {
        file: 'A04-timetable.png',
        title: 'Timetable Allocations',
        why: 'A school runs on a published period grid.',
        talk:
          'Timetable Allocations let leadership build and publish the school-wide timetable that teachers, learners, and parents then consume in their portals.',
        how: 'More → Timetable Allocations. Publish only when ready for campus-wide use.'
      },
      {
        file: 'A05-finance.png',
        title: 'School Fees & Invoicing',
        why: 'Collections and statements need a school-owned system of record.',
        talk:
          'School Fees & Invoicing supports term invoices, reminders, and collections analytics where the school enables finance modules. Parent and learner fee views read from this operational truth.',
        how: 'More → School Fees & Invoicing.'
      },
      {
        file: 'A06-announcements.png',
        title: 'Official Broadcasts',
        why: 'Critical notices must reach cohorts reliably.',
        talk:
          'Official Broadcasts / announcements push school news to the right audiences. This reduces dependency on informal social channels for institutional messages.',
        how: 'More → Official Broadcasts.'
      },
      {
        file: 'A07-exam-seating.png',
        title: 'Exam Seating Master',
        why: 'Exam logistics are high-stakes and error-prone on paper alone.',
        talk:
          'Exam Seating Master builds hall grids and candidate slips that learners later view in their Exam Seating module.',
        how: 'More → Exam Seating Master. Publish seating before exam week.'
      },
      {
        file: 'A08-staff-invites.png',
        title: 'Faculty & Coach Invites',
        why: 'Staff onboarding should be controlled and auditable.',
        talk:
          'Faculty & Coach Invites manage teacher and coach invitation workflows so new educators join with the correct subjects and grades.',
        how: 'More → Faculty & Coach Invites, or enrol actions in User Directory.'
      },
      {
        file: 'A09-calendar.png',
        title: 'School Calendar',
        why: 'Leadership owns the institutional calendar of record.',
        talk:
          'The admin School Calendar maintains master events that cascade into learner, parent, and teacher calendar views.',
        how: 'More → School Calendar.'
      },
      {
        file: 'A10-settings.png',
        title: 'Technical Settings',
        why: 'School portals need consistent theme, security, and help access for admins too.',
        talk:
          'Technical Settings cover preferences, security, and Help pathways for school administrators operating Geleza SA daily.',
        how: 'More → Technical Settings.'
      }
    ]
  }
};
