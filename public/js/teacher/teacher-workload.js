import { apiCall } from '../api.js';

let cachedSubjectCards = [];

export async function loadMySubjectsSection() {
    const container = document.getElementById('subjects-grid') || document.getElementById('my-subjects-cards-container');
    if (!container) return;

    try {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2.5rem; color: #94a3b8;"><i class="fas fa-spinner fa-spin fa-2x" style="color: #ef4444;"></i><p style="margin-top: 12px; font-weight: 600;">Loading your assigned subjects from database...</p></div>`;
        
        const cards = await apiCall('/teacher/my-subjects-overview');
        if (!cards || !Array.isArray(cards)) {
            container.innerHTML = `<p style="color:#94a3b8; text-align:center; grid-column: 1 / -1; padding:2rem;">No subject data received from server.</p>`;
            return;
        }

        cachedSubjectCards = cards;

        if (cards.length === 0) {
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: #0f172a; border-radius: 12px; border: 1px dashed #334155; color: #94a3b8;">
                <i class="fas fa-book-open fa-3x" style="color: #475569; margin-bottom: 1rem;"></i>
                <h3 style="color: #f8fafc; margin: 0 0 0.5rem 0;">No Assigned Subjects Found</h3>
                <p style="margin: 0; font-size: 0.9rem;">There are no subjects currently assigned to your teacher profile in the database.</p>
            </div>`;
            return;
        }

        renderSubjectCards(cards);

        const syncFooter = document.querySelector('.sync-timestamp-footer');
        if (syncFooter) {
            syncFooter.textContent = `Last synced: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    } catch (err) {
        console.error('Error loading my subjects section:', err);
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #ef4444;">
            <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom: 0.5rem;"></i>
            <p>Failed to load assigned subjects from database: ${err.message}</p>
        </div>`;
    }
}

export function renderSubjectCards(cards) {
    const container = document.getElementById('subjects-grid') || document.getElementById('my-subjects-cards-container');
    if (!container) return;

    if (!cards || cards.length === 0) {
        container.innerHTML = `<p style="color:#94a3b8; text-align:center; grid-column: 1 / -1; padding:2rem;">No matching subjects found.</p>`;
        return;
    }

    container.innerHTML = cards.map((c) => {
        const safeCode = (c.code || `${c.subject_name.substring(0,4)}${c.grade}`).replace(/[^a-zA-Z0-9]/g, '');
        const sectionId = `subject-learners-container-${c.grade}-${safeCode}`;
        const listId = `subject-learners-list-${c.grade}-${safeCode}`;

        return `
        <div class="teacher-subject-card" data-subject="${c.subject_name}" data-code="${c.code}" data-grade="${c.grade}">
            <div class="card-subject-header">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <span class="badge" style="background:#312e81; color:#a5b4fc; font-size:0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: 600;">Grade ${c.grade} • ${c.code}</span>
                        <h3 style="color:#ffffff; font-size:1.2rem; font-weight:700; margin: 0.4rem 0 0 0;">${c.subject_name}</h3>
                    </div>
                    <span class="badge" style="background:#065f46; color:#34d399; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">Avg: ${c.recent_class_avg}%</span>
                </div>
            </div>

            <div class="subject-details-list" style="margin-bottom: 0.75rem;">
                <div style="display:flex; justify-content:space-between; color:#cbd5e1; font-size:0.85rem; background:#1e293b; padding:0.5rem 0.75rem; border-radius:6px; border: 1px solid #334155;">
                    <span>Class: <strong style="color:#f8fafc;">${c.class_name || '10A'}</strong></span>
                    <span>Learners: <strong style="color:#38bdf8;">${c.learner_count}</strong></span>
                </div>
            </div>

            <div class="curriculum-progress-wrapper" style="margin-bottom: 0.75rem;">
                <div class="curriculum-progress-labels">
                    <span>CAPS Curriculum Pace</span>
                    <span>${c.curriculum_progress}%</span>
                </div>
                <div class="curriculum-progress-bar-bg">
                    <div class="curriculum-progress-bar-fill" style="width: ${c.curriculum_progress}%;"></div>
                </div>
            </div>

            <div class="student-count-box" style="margin-bottom: 1rem; cursor:pointer;" onclick="window.toggleSubjectLearnersSection('${c.subject_name}', ${c.grade}, '${sectionId}', '${listId}')">
                <div class="student-count-value">
                    <i class="fas fa-users" style="color: #6366f1;"></i> ${c.learner_count} Enrolled Learners <span style="font-size:0.75rem; color:#38bdf8; font-weight:normal; margin-left:auto;"><i class="fas fa-chevron-down"></i> Expand Roster</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#94a3b8; margin-top:4px;">
                    <span>Ungraded: <strong style="color:${c.ungraded_submissions > 0 ? '#f87171' : '#4ade80'};">${c.ungraded_submissions}</strong></span>
                    <span>Upcoming Tests: <strong style="color:#60a5fa;">${c.upcoming_tests}</strong></span>
                </div>
            </div>

            <div class="subject-card-actions">
                <button type="button" class="btn-primary-cta" onclick="window.openClassMarkSheet('${c.subject_name}', ${c.grade})">
                    <i class="fas fa-file-signature"></i> Mark Register <span class="cta-tag">Grade ${c.grade}</span>
                </button>
                <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-top:4px;">
                    <button type="button" class="btn-secondary-card btn-learners-toggle" style="flex:1; min-width:110px;" onclick="window.toggleSubjectLearnersSection('${c.subject_name}', ${c.grade}, '${sectionId}', '${listId}', this)">
                        <i class="fas fa-users" style="color:#6366f1;"></i> Learners (${c.learner_count})
                    </button>
                    <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.openSubjectAttendance('${c.subject_name}', ${c.grade})">
                        <i class="fas fa-user-check" style="color:#22c55e;"></i> Mark Attendance
                    </button>
                    <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.openTextbookManager('${c.subject_name}', ${c.grade})">
                        <i class="fas fa-cloud-upload-alt" style="color:#a855f7;"></i> Upload Resources
                    </button>
                    <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.openSubjectAnnouncement('${c.subject_name}', ${c.grade})">
                        <i class="fas fa-bullhorn"></i> Announcement
                    </button>
                    <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.openSubjectAIWorkspace('${c.subject_name}', ${c.grade})">
                        <i class="fas fa-robot"></i> AI Workspace
                    </button>
                </div>
            </div>

            <!-- Embedded Subject Learners Roster Section inside this Subject Card -->
            <div id="${sectionId}" class="embedded-subject-learners" style="display:none; background:#0f172a; border-radius:10px; padding:1rem; border:1px solid #334155; margin-top:0.9rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; border-bottom:1px solid #1e293b; padding-bottom:0.5rem;">
                    <h5 style="color:#f8fafc; margin:0; font-size:0.92rem; font-weight:700;">
                        <i class="fas fa-user-graduate" style="color:#6366f1;"></i> Enrolled Learners in ${c.subject_name} (Grade ${c.grade})
                    </h5>
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.viewSubjectLearners('${c.subject_name}', ${c.grade})" style="font-size:0.75rem;">
                        <i class="fas fa-expand"></i> Modal View
                    </button>
                </div>
                <div id="${listId}" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:0.75rem;">
                    <div style="text-align:center; color:#94a3b8; padding:1rem; grid-column:1/-1;"><i class="fas fa-spinner fa-spin"></i> Loading learners for ${c.subject_name}...</div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

export async function toggleSubjectLearnersSection(subject, grade, sectionId, listId, btnEl) {
    const container = document.getElementById(sectionId);
    const listEl = document.getElementById(listId);
    if (!container || !listEl) return;

    const isHidden = container.style.display === 'none' || container.style.display === '';

    if (isHidden) {
        container.style.display = 'block';
        if (btnEl) {
            btnEl.innerHTML = `<i class="fas fa-chevron-up" style="color:#ef4444;"></i> Hide Learners`;
        }

        listEl.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:1rem; grid-column:1/-1;"><i class="fas fa-spinner fa-spin fa-lg" style="color:#6366f1;"></i><p style="margin-top:6px; font-size:0.85rem;">Fetching class roster...</p></div>`;

        try {
            let learners = await apiCall(`/teacher/my-learners?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
            if (!learners || !Array.isArray(learners) || learners.length === 0) {
                const allRes = await apiCall('/teacher/my-learners');
                learners = allRes || [];
            }

            let filtered = (learners || []).filter(l => 
                parseInt(l.grade, 10) === parseInt(grade, 10) &&
                (!l.subjects || l.subjects.length === 0 || l.subjects.some(s => s.toLowerCase() === subject.toLowerCase()))
            );

            if (filtered.length === 0 && learners && learners.length > 0) {
                filtered = learners.filter(l => parseInt(l.grade, 10) === parseInt(grade, 10));
            }

            if (filtered.length === 0) {
                listEl.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:1.5rem; color:#94a3b8; font-size:0.85rem;">
                    <i class="fas fa-user-slash me-1"></i> No registered learners currently found for ${subject} Grade ${grade}.
                </div>`;
                return;
            }

            listEl.innerHTML = filtered.map(l => `
                <div class="card" style="background:#1e293b; border-radius:10px; padding:0.9rem; border:1px solid #334155; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.5rem;">
                            <div style="width:38px; height:38px; border-radius:50%; background:#334155; display:flex; align-items:center; justify-content:center; color:#38bdf8; font-weight:700; font-size:0.9rem; border:2px solid #6366f1;">
                                ${(l.learner_name || 'L').charAt(0)}${(l.learner_surname || '').charAt(0)}
                            </div>
                            <div>
                                <h5 style="color:#f8fafc; margin:0; font-size:0.9rem; font-weight:700;">${l.learner_name} ${l.learner_surname}</h5>
                                <span style="color:#94a3b8; font-size:0.75rem;">ID: ${l.learner_number || 'N/A'} • Grade ${l.grade}</span>
                            </div>
                        </div>

                        <div style="background:#0f172a; padding:0.5rem 0.65rem; border-radius:6px; display:grid; grid-template-columns:1fr 1fr; gap:0.35rem; font-size:0.75rem; margin-bottom:0.5rem; border:1px solid #1e293b;">
                            <div><span style="color:#94a3b8;">Class:</span> <strong style="color:#f8fafc;">${l.class_name || 'Unassigned'}</strong></div>
                            <div><span style="color:#94a3b8;">Stream:</span> <strong style="color:#38bdf8;">${l.stream || 'General'}</strong></div>
                            <div><span style="color:#94a3b8;">Avg:</span> <strong style="color:${l.performance_avg >= 60 ? '#4ade80' : '#f87171'};">${l.performance_avg}%</strong></div>
                            <div><span style="color:#94a3b8;">Att:</span> <strong style="color:${l.attendance_pct >= 80 ? '#60a5fa' : '#fbbf24'};">${l.attendance_pct}%</strong></div>
                        </div>

                        <div style="font-size:0.75rem; color:#cbd5e1;">
                            <i class="fas fa-user-shield me-1" style="color:#a855f7;"></i> <strong>Parent:</strong> ${l.guardian_name || 'Not linked'}
                        </div>
                    </div>

                    <div style="display:flex; gap:0.4rem; margin-top:0.5rem; padding-top:0.4rem; border-top:1px solid #334155;">
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.viewLearnerProgress(${l.id}, '${l.learner_name} ${l.learner_surname}')" style="flex:1; font-size:0.72rem; padding:4px 6px;">
                            <i class="fas fa-chart-line me-1"></i> Report
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.contactParent('${l.guardian_name}', ${l.id})" style="flex:1; font-size:0.72rem; padding:4px 6px;">
                            <i class="fas fa-comment me-1"></i> Contact
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error('Error toggling subject learners:', err);
            listEl.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#ef4444; padding:1rem; font-size:0.85rem;">Failed to load learners list.</div>`;
        }
    } else {
        container.style.display = 'none';
        if (btnEl) {
            btnEl.innerHTML = `<i class="fas fa-users" style="color:#6366f1;"></i> Learners`;
        }
    }
}

export function filterTeacherSubjects(query) {
    if (!query) {
        renderSubjectCards(cachedSubjectCards);
        return;
    }
    const q = query.toLowerCase().trim();
    const filtered = cachedSubjectCards.filter(c => 
        (c.subject_name && c.subject_name.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.grade && c.grade.toString().includes(q)) ||
        (c.class_name && c.class_name.toLowerCase().includes(q))
    );
    renderSubjectCards(filtered);
}

export function setSubjectView(mode) {
    const grid = document.getElementById('subjects-grid');
    const btnGrid = document.getElementById('btn-grid-view');
    const btnList = document.getElementById('btn-list-view');

    if (!grid) return;

    if (mode === 'list') {
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';
        grid.style.gap = '1rem';
        if (btnGrid) btnGrid.classList.remove('active');
        if (btnList) btnList.classList.add('active');
    } else {
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
        grid.style.gap = '1.25rem';
        if (btnGrid) btnGrid.classList.add('active');
        if (btnList) btnList.classList.remove('active');
    }
}

export function openSubjectAttendance(subject, grade) {
    if (window.switchTab) {
        window.switchTab('attendance');
    }

    const classSelect = document.getElementById('att-class-select');
    if (classSelect) {
        let option = Array.from(classSelect.options).find(o => 
            o.value == grade || o.value == `${grade}A` || o.text.includes(`Grade ${grade}`)
        );
        if (!option) {
            option = new Option(`Grade ${grade} (${subject})`, `${grade}A`);
            classSelect.add(option);
        }
        classSelect.value = option.value;
    }

    if (window.loadAttendanceRegister) {
        window.loadAttendanceRegister();
    }
}

export function openSubjectAnnouncement(subject, grade) {
    if (window.switchTab) {
        window.switchTab('announcements');
    }

    const titleInput = document.getElementById('annTitle');
    const gradeSelect = document.getElementById('annGrade');
    const subjectSelect = document.getElementById('annSubject');

    if (titleInput) {
        titleInput.value = `[Grade ${grade} ${subject}] `;
        titleInput.focus();
    }

    if (gradeSelect) {
        let option = Array.from(gradeSelect.options).find(o => o.value == grade);
        if (!option) {
            option = new Option(`Grade ${grade}`, grade);
            gradeSelect.add(option);
        }
        gradeSelect.value = grade;
    }

    if (subjectSelect) {
        let option = Array.from(subjectSelect.options).find(o => o.value.toLowerCase() === subject.toLowerCase());
        if (!option) {
            option = new Option(subject, subject);
            subjectSelect.add(option);
        }
        subjectSelect.value = subject;
    }
}

export function openSubjectAIWorkspace(subject, grade) {
    const listView = document.getElementById('subjects-list-view');
    const aiView = document.getElementById('subject-ai-workspace');
    const displayEl = document.getElementById('active-subject-display');
    const subjInput = document.getElementById('asSubject');
    const gradeInput = document.getElementById('asGrade');

    if (listView) listView.style.display = 'none';
    if (aiView) aiView.style.display = 'block';

    if (displayEl) displayEl.innerText = `${subject} Grade ${grade}`;
    if (subjInput) subjInput.value = subject;
    if (gradeInput) gradeInput.value = grade;

    loadSubjectCAPSTopics(subject, grade);
}

const clientCAPSTopicsMap = {
    'Life Sciences': {
        '10': ['Molecules of Life', 'Cell Structure & Organelles', 'Plant & Animal Tissues', 'Support & Transport in Plants (Xylem/Phloem)', 'Human Skeleton & Muscles'],
        '11': ['Biodiversity of Micro-organisms (Viruses, Bacteria, Fungi)', 'Photosynthesis (Thylakoids & Stroma)', 'Cellular Respiration (Glycolysis & ATP)', 'Human Nutrition & Digestion', 'Gaseous Exchange & Respiration', 'Population Ecology'],
        '12': ['DNA: Code of Life & Double Helix', 'RNA & Protein Synthesis (Transcription & Translation)', 'Meiosis & Chromosome Nondisjunction', 'Genetics & Inheritance (Monohybrid, Dihybrid, Punnett Squares)', 'Human Nervous System & Reflex Arc', 'Sense Organs (Eye Accommodation & Ear)', 'Endocrine System & Homeostasis', 'Human Reproduction (Menstrual Cycle & Fertilization)', 'Evolution by Natural Selection & Hominid Fossils']
    },
    'Physical Sciences': {
        '10': ['Transverse Pulses & Wave Speed', 'Sound Waves & Ultrasound', 'Electrostatics & Charge Conservation', 'Electric Circuits (Current, Voltage, Resistance)', 'Classification of Matter & Periodic Table', 'Chemical Bonding & Molar Mass'],
        '11': ['Vectors in 2D & Resultant Force', 'Newton 1st, 2nd & 3rd Laws of Motion (Fnet = ma)', 'Newtons Law of Universal Gravitation', 'Geometric Optics & Snells Law', 'Intermolecular Forces & Hydrogen Bonding', 'Ideal Gas Laws (PV = nRT)'],
        '12': ['Vertical Projectile Motion in 1D', 'Momentum, Impulse & Momentum Conservation', 'Work, Energy & Power (Work-Energy Theorem)', 'Doppler Effect (Sound & Light)', 'Electrodynamics (AC/DC Generators & Motors)', 'Photoelectric Effect & Emission Spectra', 'Organic Chemistry (IUPAC Naming & Functional Groups)', 'Organic Reactions (Esterification & Addition)', 'Reaction Rates & Activation Energy', 'Chemical Equilibrium (Kc & Le Chatelier)', 'Electrochemical Cells (Galvanic & Electrolytic)']
    },
    'Mathematics': {
        '10': ['Algebraic Trinomial Factorization', 'Linear & Simultaneous Equations', 'Number Patterns & Linear Sequences', 'Functions (Straight Line, Parabola, Hyperbola)', 'Trigonometry (SOHCAHTOA)', 'Analytical Geometry', 'Euclidean Geometry (Quadrilaterals)'],
        '11': ['Quadratic Equations & Inequalities', 'Exponents & Surds Equations', 'Quadratic Number Patterns (Tn = an^2 + bn + c)', 'Functions (Parabola Shifts & Exponential)', 'Trigonometric Reduction Formulas & Equations', 'Sine, Cosine & Area Rules', 'Euclidean Circle Geometry (Theorems 1-9)'],
        '12': ['Arithmetic & Geometric Sequences (Sigma & Sum to Infinity)', 'Functions & Inverse Functions (f^-1)', 'Differential Calculus (First Principles)', 'Cubic Polynomials & Curve Sketching', 'Calculus Optimization (Maxima & Minima)', 'Financial Mathematics (Annuities & Loans)', 'Trigonometry (Compound & Double Angle Identities)', 'Euclidean Geometry (Proportionality & Similarity)']
    },
    'Accounting': {
        '10': ['Accounting Equation (Assets = Owner Equity + Liabilities)', 'Subsidiary Journals (CRJ, CPJ, DJ, CJ)', 'General Ledger Posting & Trial Balance', 'Credit Transactions & Debtors Reconciliation'],
        '11': ['Partnerships Financial Statements & Current Accounts', 'Asset Disposal & Depreciation Methods', 'Inventory Valuation (Perpetual vs Periodic)', 'Bank Reconciliation Statements'],
        '12': ['Public Companies Financial Statements (Income Statement & Balance Sheet)', 'Cash Flow Statements (Operating, Investing & Financing)', 'Analysis of Financial Indicators (Solvency, Liquidity, ROSH, EPS, NAV)', 'Corporate Governance & King IV Audit Reports', 'Manufacturing Accounts & Cost Statements', 'Cash Budgets & Projected Statements']
    },
    'Tourism': {
        '10': ['Introduction to Tourism & Tourist Profiles', 'Mapwork & Greenwich Mean Time (GMT/UTC) Basics', 'Tourism Sectors (Transport, Accommodation, F&B)', 'South African Heritage Sites'],
        '11': ['Regional Tourism & SADC Country Attractions', 'Foreign Exchange Calculations & Currency Rates', 'Marketing South Africa Destination (SATourism)', 'Cultural & Heritage Tourism'],
        '12': ['World Famous Icons & International Attractions', 'Global Events & World Tourism Impact', 'Advanced Foreign Exchange Calculations & Bank Buying/Selling Rates', 'World Time Zones, DST & Jet Lag Calculations', 'Sustainable & Responsible Tourism (3Ps)', 'Customer Feedback Analysis & Service Standards']
    }
};

export async function loadSubjectCAPSTopics(subject, grade) {
    const selectEl = document.getElementById('asTopicSelect');
    const topicsListEl = document.getElementById('topicsList');
    const topicInput = document.getElementById('asTopic');

    if (selectEl) selectEl.innerHTML = `<option value="">-- Loading CAPS Syllabus Topics --</option>`;
    if (topicsListEl) topicsListEl.innerHTML = `<span style="color:#cbd5e1; font-size:0.8rem;">Loading CAPS topics...</span>`;

    let topics = [];

    // Instant local client lookup
    const cleanSub = Object.keys(clientCAPSTopicsMap).find(k => k.toLowerCase() === (subject||'').toLowerCase() || k.toLowerCase().includes((subject||'').toLowerCase()) || (subject||'').toLowerCase().includes(k.toLowerCase()));
    if (cleanSub && clientCAPSTopicsMap[cleanSub] && clientCAPSTopicsMap[cleanSub][grade]) {
        topics = clientCAPSTopicsMap[cleanSub][grade];
    }

    try {
        const data = await apiCall(`/teacher/topics?subject=${encodeURIComponent(subject)}&grade=${grade}`);
        if (data?.topics && data.topics.length > 0) {
            topics = data.topics;
        }
    } catch (err) {
        console.warn('API topics fetch error, using client fallback:', err.message);
    }

    if (topics.length === 0) {
        if (selectEl) selectEl.innerHTML = `<option value="">-- Type custom topic below --</option>`;
        if (topicsListEl) topicsListEl.innerHTML = `<span style="color:#94a3b8; font-size:0.8rem;">No pre-loaded topics. Enter topic manually above.</span>`;
        return;
    }

    if (selectEl) {
        selectEl.innerHTML = `
            <option value="">-- Choose Grade ${grade} ${subject} CAPS Topic --</option>
            ${topics.map(t => `<option value="${t}">${t}</option>`).join('')}
        `;
    }

    if (topicsListEl) {
        topicsListEl.innerHTML = topics.map(t => `
            <button type="button" class="btn btn-sm btn-outline-info" onclick="window.selectCAPSTopic('${t.replace(/'/g, "\\'")}')" style="font-size:0.78rem; padding:4px 10px; border-radius:12px; background:#0f172a; color:#38bdf8; border:1px solid #334155; cursor:pointer;">
                <i class="fas fa-tag me-1"></i> ${t}
            </button>
        `).join('');
    }

    if (topics.length > 0 && topicInput) {
        topicInput.value = topics[0];
        if (selectEl) selectEl.value = topics[0];
    }
}

export function selectCAPSTopic(topic) {
    const topicInput = document.getElementById('asTopic');
    const selectEl = document.getElementById('asTopicSelect');
    if (topicInput) topicInput.value = topic;
    if (selectEl && topic) selectEl.value = topic;
}

export function backToSubjects() {
    const listView = document.getElementById('subjects-list-view');
    const aiView = document.getElementById('subject-ai-workspace');
    const tbView = document.getElementById('subject-textbook-workspace');

    if (listView) listView.style.display = 'block';
    if (aiView) aiView.style.display = 'none';
    if (tbView) tbView.style.display = 'none';
}

let currentAIMode = 'quiz';
let currentLessonPlanData = null;
let currentTestPaperData = null;
let currentQuizQuestionsData = null;

export function setAIMode(mode) {
    currentAIMode = mode;
    const btnQuiz = document.getElementById('ai-mode-quiz');
    const btnMCQ = document.getElementById('ai-mode-mcq');
    const btnLesson = document.getElementById('ai-mode-lesson');
    const btnTest = document.getElementById('ai-mode-test');
    const actionBtn = document.getElementById('btn-generate-ai-action');
    const configControls = document.getElementById('quiz-config-controls');

    [btnQuiz, btnMCQ, btnLesson, btnTest].forEach(b => {
        if (b) {
            b.style.background = 'transparent';
            b.style.color = '#94a3b8';
            b.classList.remove('active');
        }
    });

    if (configControls) {
        configControls.style.display = (mode === 'quiz' || mode === 'mcq') ? 'flex' : 'none';
    }

    if (mode === 'mcq') {
        if (btnMCQ) { btnMCQ.style.background = '#6366f1'; btnMCQ.style.color = '#fff'; btnMCQ.classList.add('active'); }
        if (actionBtn) actionBtn.innerHTML = `<i class="fas fa-list-check me-1"></i> Generate Multiple Choice Quiz`;
    } else if (mode === 'lesson') {
        if (btnLesson) { btnLesson.style.background = '#6366f1'; btnLesson.style.color = '#fff'; btnLesson.classList.add('active'); }
        if (actionBtn) actionBtn.innerHTML = `<i class="fas fa-book-reader me-1"></i> Generate CAPS Lesson Plan`;
    } else if (mode === 'test') {
        if (btnTest) { btnTest.style.background = '#6366f1'; btnTest.style.color = '#fff'; btnTest.classList.add('active'); }
        if (actionBtn) actionBtn.innerHTML = `<i class="fas fa-print me-1"></i> Generate Test Paper & Memo`;
    } else {
        if (btnQuiz) { btnQuiz.style.background = '#6366f1'; btnQuiz.style.color = '#fff'; btnQuiz.classList.add('active'); }
        if (actionBtn) actionBtn.innerHTML = `<i class="fas fa-magic me-1"></i> Generate Interactive Quiz`;
    }
}
window.setAIMode = setAIMode;

export async function executeAIGeneration() {
    const subject = document.getElementById('asSubject')?.value;
    const grade = document.getElementById('asGrade')?.value;
    const topic = document.getElementById('asTopic')?.value?.trim();

    if (!topic) {
        alert('Please enter or select a topic first.');
        return;
    }

    const inputStep = document.getElementById('genInputStep');
    const loadingStep = document.getElementById('genLoading');
    const reviewQuiz = document.getElementById('genReviewStep');
    const reviewLesson = document.getElementById('lessonPlanReviewStep');
    const reviewTest = document.getElementById('testPaperReviewStep');

    if (inputStep) inputStep.style.display = 'none';
    if (loadingStep) loadingStep.style.display = 'block';

    try {
        if (currentAIMode === 'lesson') {
            const data = await apiCall('/teacher/ai/generate-lesson-plan', {
                method: 'POST',
                body: JSON.stringify({ subject, grade, topic, duration: '60 Minutes' })
            });

            if (loadingStep) loadingStep.style.display = 'none';
            if (!data || !data.lesson_plan) throw new Error('Failed to parse lesson plan from AI.');

            currentLessonPlanData = data.lesson_plan;
            renderLessonPlanPreview(data.lesson_plan);
            if (reviewLesson) reviewLesson.style.display = 'block';

        } else if (currentAIMode === 'test') {
            const data = await apiCall('/teacher/ai/generate-test-paper', {
                method: 'POST',
                body: JSON.stringify({ subject, grade, topic, total_marks: 50 })
            });

            if (loadingStep) loadingStep.style.display = 'none';
            if (!data || !data.test_paper) throw new Error('Failed to parse test paper from AI.');

            currentTestPaperData = data.test_paper;
            renderTestPaperPreview(data.test_paper);
            if (reviewTest) reviewTest.style.display = 'block';

        } else {
            const count = parseInt(document.getElementById('asQuestionCount')?.value, 10) || 5;
            const marks_per_question = parseInt(document.getElementById('asMarksPerQuestion')?.value, 10) || 2;

            const data = await apiCall('/teacher/ai/generate-assignment-questions', {
                method: 'POST',
                body: JSON.stringify({ subject, grade, topic, count, marks_per_question })
            });

            if (loadingStep) loadingStep.style.display = 'none';
            const questions = data?.questions || [];
            currentQuizQuestionsData = questions;

            const titleInput = document.getElementById('asTitle');
            if (titleInput) titleInput.value = `${subject} Grade ${grade}: ${topic} MCQ Quiz`;

            renderQuizQuestionsPreview(questions);
            if (reviewQuiz) reviewQuiz.style.display = 'block';
        }
    } catch (err) {
        console.error('Error generating AI content:', err);
        alert('Failed to generate AI content: ' + err.message);
        if (loadingStep) loadingStep.style.display = 'none';
        if (inputStep) inputStep.style.display = 'block';
    }
}

export function backToGen() {
    const inputStep = document.getElementById('genInputStep');
    const loadingStep = document.getElementById('genLoading');
    const reviewQuiz = document.getElementById('genReviewStep');
    const reviewLesson = document.getElementById('lessonPlanReviewStep');
    const reviewTest = document.getElementById('testPaperReviewStep');

    if (inputStep) inputStep.style.display = 'block';
    if (loadingStep) loadingStep.style.display = 'none';
    if (reviewQuiz) reviewQuiz.style.display = 'none';
    if (reviewLesson) reviewLesson.style.display = 'none';
    if (reviewTest) reviewTest.style.display = 'none';
}

window.updateQuestionMark = function(index, newMarks) {
    if (currentQuizQuestionsData && currentQuizQuestionsData[index]) {
        currentQuizQuestionsData[index].marks = parseInt(newMarks, 10) || 1;
        renderQuizQuestionsPreview(currentQuizQuestionsData);
    }
};

export async function publishAssignment() {
    const subject = document.getElementById('asSubject')?.value || 'Subject';
    const grade = document.getElementById('asGrade')?.value || '10';
    const titleInput = document.getElementById('asTitle')?.value?.trim();
    const title = titleInput || `${subject} Grade ${grade} AI Quiz`;

    if (!currentQuizQuestionsData || !Array.isArray(currentQuizQuestionsData) || currentQuizQuestionsData.length === 0) {
        alert('No quiz questions generated to publish. Please click Generate first.');
        return;
    }

    try {
        await apiCall('/teacher/assignments', {
            method: 'POST',
            body: JSON.stringify({
                title,
                subject,
                grade,
                questions: currentQuizQuestionsData,
                stream_target: 'General'
            })
        });

        alert(`Successfully published "${title}" Multiple Choice Assessment to Grade ${grade} ${subject} learners!`);
        backToGen();
    } catch (err) {
        console.error('Error publishing assignment:', err);
        alert('Failed to publish assignment: ' + err.message);
    }
}

function renderQuizQuestionsPreview(questions) {
    const container = document.getElementById('questionsPreview');
    if (!container) return;

    if (!Array.isArray(questions) || questions.length === 0) {
        container.innerHTML = `<p style="color:#cbd5e1; text-align:center;">No questions generated.</p>`;
        return;
    }

    const totalMarks = questions.reduce((sum, q) => sum + (parseInt(q.marks, 10) || 2), 0);

    container.innerHTML = `
        <div style="background:#1e293b; padding:0.75rem 1rem; border-radius:8px; border:1px solid #334155; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#f8fafc; font-weight:700; font-size:0.95rem;"><i class="fas fa-tasks me-1" style="color:#6366f1;"></i> ${questions.length} Multiple Choice Questions</span>
            <span style="background:#312e81; color:#a5b4fc; padding:4px 12px; border-radius:12px; font-weight:700; font-size:0.85rem;"><i class="fas fa-award me-1" style="color:#f59e0b;"></i> Total Assessment Marks: ${totalMarks}</span>
        </div>
        ${questions.map((q, idx) => `
            <div class="question-preview-item" style="background:#0f172a; padding:1rem; border-radius:8px; border:1px solid #334155; margin-bottom:0.85rem;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.6rem; flex-wrap:wrap; gap:0.5rem;">
                    <div style="font-weight:700; color:#38bdf8; font-size:0.95rem; flex:1;">
                        Q${idx + 1}: ${q.question_text || q.question}
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; background:#1e293b; padding:4px 10px; border-radius:6px; border:1px solid #334155;">
                        <label style="font-size:0.8rem; color:#cbd5e1; font-weight:600; margin:0;">Question Marks:</label>
                        <input type="number" min="1" max="50" class="form-control" value="${q.marks || 2}" onchange="window.updateQuestionMark(${idx}, this.value)" style="width:65px; background:#0f172a; color:#f59e0b; border:1px solid #475569; padding:2px 6px; font-weight:700; font-size:0.85rem; border-radius:4px;">
                    </div>
                </div>
                ${Array.isArray(q.options) && q.options.length > 0 ? `
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.6rem;">
                        ${q.options.map(opt => `
                            <div style="background:#1e293b; padding:8px 12px; border-radius:6px; font-size:0.85rem; color:#e2e8f0; border:1px solid #334155; display:flex; align-items:center; gap:6px;">
                                <i class="far fa-circle" style="color:#64748b; font-size:0.75rem;"></i> ${opt}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <div style="font-size:0.82rem; color:#34d399; font-weight:600; background:#064e3b; padding:4px 10px; border-radius:4px; display:inline-block;">
                    <i class="fas fa-check-circle me-1"></i> Correct Answer Choice: ${q.answer || 'Option A'}
                </div>
            </div>
        `).join('')}
    `;
}

function renderLessonPlanPreview(lp) {
    const container = document.getElementById('lessonPlanPreview');
    if (!container) return;

    container.innerHTML = `
        <div style="border-bottom:2px solid #6366f1; padding-bottom:0.75rem; margin-bottom:1rem;">
            <h2 style="color:#f8fafc; margin:0 0 4px 0;">${lp.title || 'CAPS Lesson Plan'}</h2>
            <div style="color:#a5b4fc; font-weight:600; font-size:0.9rem;">
                ${lp.subject} Grade ${lp.grade} • Duration: ${lp.duration} • ${lp.term_week || 'Term 3'}
            </div>
        </div>

        <div style="margin-bottom:1rem;">
            <h4 style="color:#38bdf8; margin:0 0 4px 0;">Learning Outcomes (CAPS Goals):</h4>
            <ul style="margin:0; padding-left:1.25rem; color:#cbd5e1;">
                ${(lp.learning_outcomes || []).map(o => `<li>${o}</li>`).join('')}
            </ul>
        </div>

        <div style="margin-bottom:1rem;">
            <h4 style="color:#38bdf8; margin:0 0 4px 0;">Teacher Activities:</h4>
            <div style="background:#0f172a; padding:0.75rem; border-radius:6px; font-size:0.88rem; color:#e2e8f0;">
                <p><strong>Introduction:</strong> ${lp.teacher_activities?.intro || lp.teacher_activities?.Introduction || 'Introduce key concepts.'}</p>
                <p><strong>Presentation:</strong> ${lp.teacher_activities?.presentation || lp.teacher_activities?.Presentation || 'Present main theory.'}</p>
                <p><strong>Conclusion:</strong> ${lp.teacher_activities?.conclusion || lp.teacher_activities?.Conclusion || 'Summarize key takeaways.'}</p>
            </div>
        </div>

        <div style="margin-bottom:1rem;">
            <h4 style="color:#38bdf8; margin:0 0 4px 0;">Learner Activities & Homework:</h4>
            <div style="background:#0f172a; padding:0.75rem; border-radius:6px; font-size:0.88rem; color:#e2e8f0;">
                <p><strong>Classwork:</strong> ${lp.learner_activities?.classwork || 'Individual exercises.'}</p>
                <p><strong>Homework Task:</strong> ${lp.learner_activities?.homework || 'End of chapter questions.'}</p>
            </div>
        </div>
    `;
}

function renderTestPaperPreview(tp) {
    const container = document.getElementById('testPaperPreview');
    if (!container) return;

    const sectionsHtml = (tp.sections || []).map(sec => `
        <div style="margin-bottom:1.25rem; background:#0f172a; padding:1rem; border-radius:8px; border:1px solid #334155;">
            <h4 style="color:#f8fafc; margin:0 0 0.5rem 0; border-bottom:1px solid #334155; padding-bottom:4px;">${sec.section_title || 'Section'}</h4>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
                ${(sec.questions || []).map(q => `
                    <div style="display:flex; justify-content:space-between; font-size:0.88rem; color:#e2e8f0;">
                        <span><strong>Q${q.q_num || ''}:</strong> ${q.question_text || q.question}</span>
                        <strong style="color:#38bdf8;">[${q.marks || 5} Marks]</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    const memoHtml = (tp.marking_memo || []).map(m => `
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:4px 0; border-bottom:1px dashed #334155; color:#cbd5e1;">
            <span><strong>Q${m.q_num}:</strong> ${m.expected_answer || m.answer}</span>
            <span style="color:#34d399; font-weight:700;">${m.mark_breakdown || 'Full Marks'}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div style="border-bottom:2px solid #22c55e; padding-bottom:0.75rem; margin-bottom:1rem;">
            <h2 style="color:#f8fafc; margin:0 0 4px 0;">${tp.test_header?.school || 'FUSION HIGH SCHOOL'} - FORMAL CLASS TEST</h2>
            <div style="color:#34d399; font-weight:600; font-size:0.9rem;">
                Subject: ${tp.test_header?.subject || ''} Grade ${tp.test_header?.grade || ''} • Total Marks: ${tp.test_header?.total_marks || 50} Marks
            </div>
        </div>

        <h3 style="color:#38bdf8;">QUESTION PAPER</h3>
        ${sectionsHtml}

        <h3 style="color:#34d399; margin-top:1.5rem;">MARKING MEMORANDUM</h3>
        <div style="background:#0f172a; padding:1rem; border-radius:8px; border:1px solid #334155;">
            ${memoHtml}
        </div>
    `;
}

export function printAILessonPlan() {
    if (!currentLessonPlanData) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return alert('Please allow popups to print lesson plan.');

    const lp = currentLessonPlanData;
    printWin.document.write(`
        <html>
        <head>
            <title>CAPS Lesson Plan - ${lp.title}</title>
            <style>
                body { font-family: sans-serif; padding: 2rem; color: #0f172a; line-height: 1.5; }
                h1 { color: #312e81; border-bottom: 2px solid #312e81; padding-bottom: 8px; }
                .box { border: 1px solid #cbd5e1; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; background: #f8fafc; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <button class="no-print" onclick="window.print()" style="padding:8px 16px; background:#10b981; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer; margin-bottom:1rem;">🖨️ Print Lesson Plan (PDF)</button>
            <h1>CAPS OFFICIAL LESSON PLAN</h1>
            <p><strong>Title:</strong> ${lp.title}</p>
            <p><strong>Subject:</strong> ${lp.subject} Grade ${lp.grade} | <strong>Duration:</strong> ${lp.duration}</p>
            <div class="box">
                <h3>Learning Outcomes:</h3>
                <ul>${(lp.learning_outcomes || []).map(o => `<li>${o}</li>`).join('')}</ul>
            </div>
            <div class="box">
                <h3>Teacher Activities:</h3>
                <p><strong>Presentation:</strong> ${lp.teacher_activities?.presentation || 'Main lesson content.'}</p>
            </div>
            <div class="box">
                <h3>Learner Activities & Homework:</h3>
                <p><strong>Classwork:</strong> ${lp.learner_activities?.classwork || 'Exercises.'}</p>
                <p><strong>Homework:</strong> ${lp.learner_activities?.homework || 'Chapter review.'}</p>
            </div>
            <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
    `);
    printWin.document.close();
}

export function printAITestPaper() {
    if (!currentTestPaperData) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return alert('Please allow popups to print test paper.');

    const tp = currentTestPaperData;
    printWin.document.write(`
        <html>
        <head>
            <title>CAPS Test Paper & Memo</title>
            <style>
                body { font-family: sans-serif; padding: 2rem; color: #0f172a; line-height: 1.5; }
                h1 { color: #1e1b4b; border-bottom: 2px solid #1e1b4b; padding-bottom: 8px; }
                .q-row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 6px 0; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <button class="no-print" onclick="window.print()" style="padding:8px 16px; background:#10b981; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer; margin-bottom:1rem;">🖨️ Print Test Paper & Memo (PDF)</button>
            <h1>${tp.test_header?.school || 'FUSION HIGH SCHOOL'} - FORMAL ASSESSMENT TEST</h1>
            <p><strong>Subject:</strong> ${tp.test_header?.subject || ''} Grade ${tp.test_header?.grade || ''} | <strong>Total:</strong> ${tp.test_header?.total_marks || 50} Marks</p>
            <h2>QUESTION PAPER</h2>
            ${(tp.sections || []).map(sec => `
                <h3>${sec.section_title || 'Section'}</h3>
                ${(sec.questions || []).map(q => `<div class="q-row"><span><strong>Q${q.q_num || ''}:</strong> ${q.question_text || q.question}</span><strong>[${q.marks || 5} Marks]</strong></div>`).join('')}
            `).join('')}

            <h2 style="margin-top:2rem; page-break-before:always;">MARKING MEMORANDUM</h2>
            ${(tp.marking_memo || []).map(m => `<div class="q-row"><span><strong>Q${m.q_num}:</strong> ${m.expected_answer || m.answer}</span><strong>[${m.mark_breakdown || 'Marks'}]</strong></div>`).join('')}
            <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
    `);
    printWin.document.close();
}

export function switchSubjectSubTab(tabName) {
    const btnSubjects = document.getElementById('subtab-btn-subjects');
    const btnLearners = document.getElementById('subtab-btn-learners');
    const btnMarks = document.getElementById('subtab-btn-marks');
    const btnAttendance = document.getElementById('subtab-btn-attendance');

    const viewSubjects = document.getElementById('subjects-list-view');
    const viewLearners = document.getElementById('subtab-view-learners');
    const viewMarks = document.getElementById('subtab-view-marks');
    const viewAttendance = document.getElementById('subtab-view-attendance');

    [btnSubjects, btnLearners, btnMarks, btnAttendance].forEach(b => {
        if (b) {
            b.style.background = 'transparent';
            b.style.color = '#94a3b8';
            b.classList.remove('active');
        }
    });

    [viewSubjects, viewLearners, viewMarks, viewAttendance].forEach(v => {
        if (v) v.style.display = 'none';
    });

    if (tabName === 'learners') {
        if (btnLearners) { btnLearners.style.background = '#6366f1'; btnLearners.style.color = '#fff'; btnLearners.classList.add('active'); }
        if (viewLearners) viewLearners.style.display = 'block';
        if (window.loadMyLearnersCards) window.loadMyLearnersCards();
    } else if (tabName === 'marks') {
        if (btnMarks) { btnMarks.style.background = '#6366f1'; btnMarks.style.color = '#fff'; btnMarks.classList.add('active'); }
        if (viewMarks) viewMarks.style.display = 'block';
        const firstCard = cachedSubjectCards[0];
        if (firstCard && window.openClassMarkSheet) {
            window.openClassMarkSheet(firstCard.subject_name, firstCard.grade);
        }
    } else if (tabName === 'attendance') {
        if (btnAttendance) { btnAttendance.style.background = '#6366f1'; btnAttendance.style.color = '#fff'; btnAttendance.classList.add('active'); }
        if (viewAttendance) viewAttendance.style.display = 'block';
        const firstCard = cachedSubjectCards[0];
        if (firstCard && window.openSubjectAttendance) {
            window.openSubjectAttendance(firstCard.subject_name, firstCard.grade);
        }
    } else {
        if (btnSubjects) { btnSubjects.style.background = '#6366f1'; btnSubjects.style.color = '#fff'; btnSubjects.classList.add('active'); }
        if (viewSubjects) viewSubjects.style.display = 'block';
    }
}
