'use strict';

const $ = s => document.querySelector(s), app = $('#app');
let S = null, view = 'overview', mode = 'login', selectedAssignment = '',
    reportData = null, candidate = null, activeExam = null,
    clock = null, noticeTimer;

const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const attr = E;
const opts = (arr, current) => arr.map(x =>
  `<option value="${attr(x.id)}" ${String(current) === String(x.id) ? 'selected' : ''}>${E(x.name)}</option>`
).join('');

const field = (name, label, value = '', type = 'text', extra = '') =>
  `<label>${E(label)}<input name="${name}" type="${type}" value="${attr(value)}" ${extra}></label>`;

const select = (name, label, arr, value) =>
  `<label>${E(label)}<select name="${name}">${opts(arr, value)}</select></label>`;

const textarea = (name, label, v = '') =>
  `<label>${E(label)}<textarea name="${name}">${E(v)}</textarea></label>`;

const classOpts = ['SS1', 'SS2', 'SS3'].map(x => ({ id: x, name: x }));
const termOpts = [1, 2, 3].map(x => ({ id: x, name: 'Term ' + x }));

const empty = t => `<div class="empty">${E(t)}</div>`;
const button = (cmd, label, id = '', cls = 'secondary') =>
  `<button class="${cls}" data-cmd="${cmd}" data-id="${attr(id)}">${E(label)}</button>`;

const subjectName = id => S.subjects.find(x => x.id === id)?.name || id;
const teacherName = id => S.users.find(x => x.id === id)?.name || 'Assigned teacher';

function toast(msg, error = false) {
  const n = $('#notice');
  n.textContent = msg;
  n.className = error ? 'error' : '';
  n.style.display = 'block';
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => n.style.display = 'none', 6500);
}

async function networkApi(action, data = {}) {
  const res = await fetch('/.netlify/functions/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
    signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(55000) : undefined
  });

  let r;
  try {
    r = await res.json();
  } catch {
    throw Error('The portal needs a Netlify deployment with its server function.');
  }

  if (!res.ok || r.error) throw Error(r.error || 'Request failed');
  return r;
}

async function api(action, data = {}) {
  if (action === 'saveScores' && S?.user.role === 'teacher' && Offline.unlocked) {
    return Offline.saveDraft(data.assignmentId, data.rows);
  }
  if (action === 'state' && Offline.unlocked && !navigator.onLine) return Offline.overlay();
  const result = await networkApi(action, data);
  if (action === 'state' && Offline.unlocked) {
    await Offline.remember(result);
    return Offline.overlay();
  }
  return result;
}

async function refresh(local = false) {
  S = local && Offline.unlocked ? Offline.overlay() : await api('state');
  render();
}

let publicSchool = {
  name: 'Christ Anglican College, Gwagwalada',
  session: '2026/2027',
  contact: 'exam.sscacgwa@gmail.com',
  message: 'Let every mark tell the truth, every effort receive fair recognition, and every learner grow in wisdom and character. Our calling is to develop gifts faithfully and serve with integrity.',
  scripture: 'Whatever you do, work at it with all your heart. — Colossians 3:23'
};

function home() {
  app.innerHTML = `
    <section class="inspiration-hero" aria-label="A message from the Principal">
      <div class="principal-message">
        <p class="eyebrow">Diligence in learning · Faith in God</p>
        <h1>READ LIKE IT ALL DEPENDS ON YOU AND <em>PRAY LIKE IT ALL DEPENDS ON GOD.</em></h1>
        <p class="attribution"><strong>Rev. Canon Ukule P.(2026)</strong><br>Principal, CACG · Dir. Admin, AICTI</p>
      </div>
      <div class="hero-photographs">
        <figure><img src="assets/students-reading.webp" width="1400" height="558" alt="CACG students reading together in the library" fetchpriority="high"><figcaption>READ WITH PURPOSE</figcaption></figure>
        <figure><img src="assets/students-praying.webp" width="1400" height="558" alt="CACG students bowing their heads in prayer"><figcaption>PRAY WITH FAITH</figcaption></figure>
      </div>
    </section>
    <section class="hero">
      <div>
        <p class="eyebrow">Senior secondary · SS1–SS3</p>
        <h1>Every effort counted.<br><em>Every result trusted.</em></h1>
        <p>A clear path from continuous assessment to terminal and annual results. Accurate records, fair recognition, and timely communication with every family.</p>
        <div class="actions">
          <span class="badge">CA 10 + 10 + 10</span>
          <span class="badge">Examination 70</span>
          <span class="badge">Total 100</span>
        </div>
        <p class="small">Teachers work within their assigned classes and subjects. Examination officers review, publish, print, and deliver results.</p>
      </div>

      <section class="card login-card">
        <p class="eyebrow">Authenticated workspace</p>
        <h2>${mode === 'candidate' ? 'Candidate examination' : mode === 'activate' ? 'Verify your account' : 'Staff sign in'}</h2>

        <form id="auth-form">
          ${mode === 'candidate'
            ? field('admission', 'Admission number', '', 'text', 'required')
              + field('session', 'Academic session', publicSchool.session, 'text', 'required')
              + field('pin', 'Examination PIN', '', 'password', 'required autocomplete="off"')
            : field(
                'email',
                'Registered email',
                new URLSearchParams(location.search).get('email') || '',
                'email',
                'required autocomplete="username"'
              )
              + (mode === 'activate'
                  ? field(
                      'otp',
                      'Six-digit verification code',
                      '',
                      'text',
                      'required inputmode="numeric" pattern="[0-9]{6}" maxlength="6"'
                    )
                  : '')
              + field(
                  'password',
                  mode === 'activate' ? 'Set a password (12–128 characters)' : 'Password',
                  '',
                  'password',
                  'required minlength="12" maxlength="128" autocomplete="'
                    + (mode === 'activate' ? 'new-password' : 'current-password')
                    + '"'
                )
          }

          <div class="actions">
            <button type="submit">
              ${mode === 'candidate'
                ? 'Enter examination'
                : mode === 'activate'
                  ? 'Verify & set password'
                  : 'Sign in'}
            </button>
            ${mode === 'activate' ? button('otp', 'Send verification code', '', 'secondary') : ''}
          </div>
        </form>

        <div class="actions">
          ${button(
            'mode',
            mode === 'activate' ? 'Back to sign in' : 'First access / reset password',
            'activate',
            'text-link'
          )}
          ${button(
            'mode',
            mode === 'candidate' ? 'Staff sign in' : 'Candidate CBT',
            mode === 'candidate' ? 'login' : 'candidate',
            'text-link'
          )}
        </div>

        <div class="offline-entry">${button('offlineUnlock', 'Open saved teacher workspace', '', 'text-link')}</div>
        <p class="small">Only accounts registered by the Chief Examination Officer or Senior Secondary Examination Officer can activate staff access.</p>
      </section>
    </section>

    <section class="leadership">
      <img
        src="assets/proprietors.webp"
        loading="lazy"
        alt="Rt. Rev. Dr. Moses B. Tabwaye and Mrs. Rebecca P. Tabwaye"
      >
      <div>
        <p class="eyebrow">Our Baba & Mama · Christian formation</p>
        <h2>Knowledge with character.<br>Excellence with integrity.</h2>
        <p>${E(publicSchool.message)}</p>
        <p><strong>${E(publicSchool.scripture)}</strong></p>
        <p class="small">
          Rt. Rev. Dr. Moses B. Tabwaye · Proprietor & Bishop<br>
          Mrs. Rebecca P. Tabwaye · President, MU/WG/GG OG
Gwagwalada Diocese
        </p>
        <a
          class="button gold"
          href="https://cacgwa.com.ng/proprietor"
          target="_blank"
          rel="noopener"
        >Meet our Baba & Mama ↗</a>
      </div>
    </section>

    <section class="steps">
      <div class="card">
        <span>01 · CAPTURE</span>
        <h3>One trusted record</h3>
        <p class="small">Students, subjects and teaching assignments organised by class, session and term.</p>
      </div>
      <div class="card">
        <span>02 · REVIEW</span>
        <h3>Complete before publication</h3>
        <p class="small">Automatic totals and grading with missing assessments clearly identified.</p>
      </div>
      <div class="card">
        <span>03 · COMMUNICATE</span>
        <h3>Results delivered on time</h3>
        <p class="small">Print-ready result cards, class rankings and tracked email delivery.</p>
      </div>
    </section>`;
}

function render() {
  if (!S) {
    home();
    return;
  }

  const role = S.user.role;
  const nav = role === 'teacher'
    ? ['overview', 'scores']
    : [
        'overview', 'students', 'subjects', 'staff', 'assignments',
        'scores', 'cbt', 'results', 'mail',
        ...(role === 'admin' ? ['settings', 'audit'] : [])
      ];

  app.innerHTML = `
    <div class="workspace">
      <aside class="sidebar">
        <div class="user">
          <strong>${E(S.user.name)}</strong>
          <small>${E(
            role === 'admin'
              ? 'Chief Examination Officer'
              : role === 'officer'
                ? 'SSS Examination Officer'
                : 'Subject teacher'
          )}</small>
        </div>

        ${nav.map(n => button(
          'view',
          ({
            cbt: 'CBT examinations',
            staff: 'Staff & invitations',
            mail: 'Result delivery',
            scores: 'Assessment sheets',
            settings: 'School settings'
          })[n] || n[0].toUpperCase() + n.slice(1),
          n,
          view === n ? 'active' : ''
        )).join('')}

        ${button('logout', 'Sign out', '', 'secondary')}
      </aside>

      <section id="workspace-main"></section>
    </div>`;

  const target = $('#workspace-main');
  target.innerHTML = offlineToolbar() + ({
    overview, students, subjects, staff, assignments, scores,
    cbt, results, mail, settings, audit
  })[view]();

  if (view === 'results' && reportData) drawReport();
}

function head(title, sub, act = '') {
  return `
    <div class="page-head">
      <div>
        <h2>${title}</h2>
        <p class="small">${sub}</p>
      </div>
      <div class="actions">${act}</div>
    </div>`;
}

function stat(n, label) {
  return `<div class="stat"><strong>${E(n)}</strong><span>${E(label)}</span></div>`;
}

function overview() {
  const relevant = S.assignments.filter(a => a.session === S.config.session);

  const expected = relevant.reduce((n, a) =>
    n + S.students.filter(s =>
      s.active
      && s.session === a.session
      && s.className === a.className
      && s.subjectIds.includes(a.subjectId)
    ).length,
    0
  );

  const complete = S.scores.filter(s =>
    relevant.some(a => a.id === s.assignmentId)
    && Assessment.total(s) !== null
  ).length;

  return head(
    'Assessment control centre',
    `${E(S.config.session)} · ${E(S.config.name)}`,
    button('refresh', 'Refresh')
  ) + `
    <div class="stats">
      ${stat(S.students.filter(s => s.active && s.session === S.config.session).length, 'Active learners')}
      ${stat(relevant.length, 'Subject / class assignments')}
      ${stat(complete, 'Complete assessment records')}
      ${stat(Math.max(0, expected - complete), 'Awaiting full assessment')}
    </div>

    <div class="two-cols">
      <section class="card">
        <p class="eyebrow">Your next action</p>
        <h3>${S.user.role === 'teacher' ? 'Complete your subject assessment sheets' : 'Keep the term moving'}</h3>
        <p class="small">${S.user.role === 'teacher'
          ? 'Enter scores for each assigned student. Blank entries remain incomplete; zero is a valid assessed score. Your subject profile shows the officer’s instructions and deadline.'
          : 'Register students and subjects, invite teachers, then match each subject/class/term to a teacher. Review every missing score before publishing results.'
        }</p>
        ${button('view', 'Open assessment sheets', 'scores', 'gold')}
      </section>

      <section class="card">
        <p class="eyebrow">Assessment policy</p>
        <h3>30% continuous assessment · 70% exam</h3>
        <p class="small">Enter weighted marks directly: CA1 /10, CA2 /10, CA3 /10 and examination /70. Annual subject scores use the equal average of all three complete term totals. Tied scores share the same position.</p>
        <div class="actions">
          ${S.config.bands.map(b =>
            `<span class="badge">${E(b.grade)}: ${b.min}+</span>`
          ).join('')}
        </div>
      </section>
    </div>

    <div class="help">Published terms are locked. Examination officers must unpublish before making corrections, then review and republish. Every score edit records its author and time.</div>`;
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`;
}

function students() {
  return head(
    'Student register',
    'Class, admission number, subjects and parent / result email.',
    button('editStudent', 'Add student') + button('importRoster', 'Import CSV')
  )
  + field('studentSearch', 'Search name / admission number', '', 'search')
  + (S.students.length
    ? table(
        ['Admission', 'Student', 'Class / session', 'Subjects', 'Result email', 'Status', ''],
        S.students.map(s => `
          <tr class="student-row" data-search="${attr((s.name + ' ' + s.admission).toLowerCase())}">
            <td>${E(s.admission)}</td>
            <td>${E(s.name)}</td>
            <td>${E(s.className)} · ${E(s.session)}</td>
            <td>${s.subjectIds.length}</td>
            <td>${E(s.email) || '—'}</td>
            <td>${s.active ? 'Active' : 'Inactive'}</td>
            <td>${button('editStudent', 'Edit', s.id)}</td>
          </tr>`)
      )
    : empty('Add subjects first, then register learners.'))
  + `<div class="help">Assign only the subjects each student offers. Result delivery goes to the verified parent or student email you enter. Use a new six-digit or longer PIN for candidate CBT access.</div>`;
}

function subjects() {
  return head(
    'Subject catalogue',
    'Create or update subjects used in student enrolments and teaching assignments.',
    button('editSubject', 'Add subject')
  ) + (S.subjects.length
    ? table(
        ['Subject', 'Status', ''],
        S.subjects.map(s => `
          <tr>
            <td>${E(s.name)}</td>
            <td>${s.active ? 'Active' : 'Inactive'}</td>
            <td>${button('editSubject', 'Edit', s.id)}</td>
          </tr>`)
      )
    : empty('No subjects registered.'));
}

function staff() {
  return head(
    'Staff & invitations',
    'Chief registers examination officers. Officers register and manage subject teachers.',
    button('editUser', 'Register staff')
  ) + (S.users.length
    ? table(
        ['Name', 'Role', 'Email', 'Phone', 'Status', ''],
        S.users.map(u => `
          <tr>
            <td>${E(u.name)}</td>
            <td>${E(u.role)}</td>
            <td>${E(u.email)}</td>
            <td>${E(u.phone)}</td>
            <td>${u.active ? 'Active' : 'Inactive'}</td>
            <td>${u.role === 'admin' || u.role === 'officer' && S.user.role !== 'admin'
              ? '—'
              : button('editUser', 'Edit / invite', u.id)
            }</td>
          </tr>`)
      )
    : empty('No staff registered.'));
}

function assignments() {
  return head(
    'Teaching assignments',
    'One teacher per subject, class, session and term. Set instructions and submission windows.',
    button('editAssignment', 'Add assignment')
  ) + (S.assignments.length
    ? table(
        ['Subject', 'Class', 'Term / session', 'Teacher', 'Window', ''],
        S.assignments.map(a => `
          <tr>
            <td>${E(subjectName(a.subjectId))}</td>
            <td>${E(a.className)}</td>
            <td>${a.term} · ${E(a.session)}</td>
            <td>${E(teacherName(a.teacherId))}</td>
            <td>${a.open ? 'Open' : 'Closed'}</td>
            <td>${button('editAssignment', 'Edit', a.id)}</td>
          </tr>`)
      )
    : empty('Create subjects and teachers before adding teaching assignments.'));
}

function assignmentOpts() {
  return S.assignments.map(a => ({
    id: a.id,
    name: `${a.className} · ${subjectName(a.subjectId)} · Term ${a.term} · ${a.session}`
  }));
}

function scores() {
  if (!selectedAssignment && S.assignments.length) {
    selectedAssignment = S.assignments[0].id;
  }

  const a = S.assignments.find(a => a.id === selectedAssignment);

  return head(
    'Assessment sheets',
    'CA1 /10 + CA2 /10 + CA3 /10 + examination /70 = total /100.'
  )
  + select('scoreAssignment', 'Choose subject profile', assignmentOpts(), selectedAssignment)
  + (a
    ? scoreSheet(a)
    : empty('Your subject/class assignments will appear here after the examination officer assigns them.'));
}

function scoreSheet(a) {
  const students = S.students.filter(s =>
    s.active
    && s.className === a.className
    && s.session === a.session
    && s.subjectIds.includes(a.subjectId)
  );

  const locked = S.publications.some(p =>
    p.published
    && p.className === a.className
    && p.session === a.session
    && [String(a.term), 'annual'].includes(p.term)
  );

  const closed = S.user.role === 'teacher'
    && (!a.open || a.deadline && Date.now() > Date.parse(a.deadline));

  return `
    <div class="help">
      <strong>${E(subjectName(a.subjectId))} · ${E(a.className)} · Term ${a.term}</strong><br>
      ${E(a.instructions) || 'Enter each assessment component and check the computed total before saving.'}<br>
      Deadline: ${a.deadline ? E(new Date(a.deadline).toLocaleString()) : 'No deadline set'} ·
      ${locked ? 'Published — locked' : closed ? 'Submission window closed' : 'Accepting scores'}
    </div>

    <form id="scores-form">
      ${students.length
        ? table(
            ['Admission', 'Student', 'CA1 /10', 'CA2 /10', 'CA3 /10', 'Exam /70', 'Total', 'Grade'],
            students.map(st => {
              const s = S.scores.find(s =>
                s.assignmentId === a.id && s.studentId === st.id
              ) || {};

              return `
                <tr data-student="${attr(st.id)}">
                  <td>${E(st.admission)}</td>
                  <td>${E(st.name)}</td>
                  ${['ca1', 'ca2', 'ca3', 'exam'].map((k, i) => `
                    <td>
                      <input
                        aria-label="${attr(st.name + ' ' + k)}"
                        data-component="${k}"
                        name="${k}"
                        type="number"
                        min="0"
                        max="${[10, 10, 10, 70][i]}"
                        step="0.01"
                        value="${s[k] ?? ''}"
                        ${locked || closed || k === 'exam' && s.examSource === 'cbt' ? 'disabled' : ''}
                      >
                    </td>`).join('')}
                  <td class="computed-total">${Assessment.total(s) ?? '—'}</td>
                  <td class="computed-grade">${E(Assessment.grade(Assessment.total(s), S.config.bands).grade)}</td>
                </tr>`;
            })
          )
        : empty('No enrolled students for this assignment.')
      }

      <div class="actions no-print">
        <button type="submit" ${locked || closed || !students.length ? 'disabled' : ''}>${Offline.unlocked && S.user.role === 'teacher' ? 'Save draft on this device' : 'Save assessment sheet'}</button>
        ${button('scoresCsv', 'Download CSV')}
        ${!locked && !closed ? button('uploadScores', 'Upload score CSV') : ''}
      </div>
    </form>

    <p class="small">Empty cells mean missing assessment; they do not become zero. CBT marks are recorded by the server and are read-only here.</p>`;
}

function cbt() {
  return head(
    'CBT examinations',
    'Timed, one-attempt examinations. Server marking writes the score out of 70 into the correct subject sheet.',
    button('editExam', 'Create examination')
  ) + (S.exams.length
    ? table(
        ['Examination', 'Assignment', 'Duration', 'Questions', 'Status', ''],
        S.exams.map(e => `
          <tr>
            <td>${E(e.title)}</td>
            <td>${E(assignmentOpts().find(a => a.id === e.assignmentId)?.name)}</td>
            <td>${e.minutes} min</td>
            <td>${e.questionCount}</td>
            <td>${e.active ? 'Active' : 'Inactive'}</td>
            <td>${button('editExam', 'Replace settings', e.id)}</td>
          </tr>`)
      )
    : empty('No CBT examinations created.'))
  + `<div class="help">Create four-option questions using the supplied JSON format. Correct answers stay on the server. Candidates enter their admission number, session and personal PIN. Set opening/closing times and tell candidates to submit before their deadline.</div>`;
}

function results() {
  return head(
    'Results & analysis',
    'Complete subject totals, shared positions, term and annual reports.',
    button('print', 'Print results') + button('exportResults', 'Export score sheet')
  ) + `
    <form id="report-form" class="filters">
      ${field('session', 'Session', S.config.session, 'text', 'required')}
      ${select('className', 'Class', classOpts, 'SS1')}
      ${select(
        'term',
        'Report period',
        [...termOpts, { id: 'annual', name: 'Annual · three-term mean' }],
        1
      )}
      <button type="submit">Generate analysis</button>
    </form>

    <div id="report-output">
      ${empty('Select a class and report period to generate the score sheet, rankings and result cards.')}
    </div>`;
}

let reportFilter = null;

function drawReport() {
  const r = reportData;

  $('#report-output').innerHTML = `
    <div class="stats">
      ${stat(r.summary.students, 'Students')}
      ${stat(r.summary.complete, 'Complete results')}
      ${stat(r.summary.highest ?? '—', 'Highest class average')}
      ${stat(r.summary.classMean ?? '—', 'Mean of complete results')}
    </div>

    <div class="actions no-print">
      ${button(
        'publish',
        r.published ? 'Unpublish for corrections' : 'Publish reviewed results',
        '',
        r.published ? 'secondary' : 'gold'
      )}
      ${button('queue', 'Queue bulk result emails', '', 'secondary')}
      <span class="badge ${r.published ? '' : 'warn'}">${r.published ? 'Published' : 'Draft — not released'}</span>
    </div>

    <div class="help no-print">
      ${r.summary.incomplete} incomplete result(s). Rankings use complete student averages; subject ranks use complete subject totals. Ties use competition ranking (1, 1, 3). Annual publication requires all three terms.
    </div>

    <div class="card grade-chart">
      <h3>Grade distribution · complete class results</h3>
      ${r.summary.grades.map(g => `
        <div class="bar-row">
          <strong>${E(g.grade)}</strong>
          <meter
            class="bar"
            min="0"
            max="${Math.max(1, r.summary.complete)}"
            value="${g.count}"
            aria-label="${E(g.grade)} grade count"
          ></meter>
          <span>${g.count}</span>
        </div>`).join('')}
    </div>

    <div class="card no-print">
      <h3>Highest in each subject</h3>
      ${subjectLeaders(r)}
    </div>

    <h3 class="no-print">Class score sheet</h3>

    <div class="no-print">
      ${table(
        ['Student', 'Admission', 'Average', 'Position', 'Grade', 'Completion'],
        r.rows.map(row => `
          <tr>
            <td>${E(row.student.name)}</td>
            <td>${E(row.student.admission)}</td>
            <td>${row.average ?? '—'}</td>
            <td>${row.position ?? '—'}</td>
            <td>${E(row.grade)}</td>
            <td>
              <span class="badge ${row.complete ? '' : 'warn'}">${row.complete ? 'Complete' : 'Incomplete'}</span>
            </td>
          </tr>`)
      )}
    </div>

    ${r.rows.map(row => resultCard(row)).join('')}`;
}

function subjectLeaders(r) {
  const ids = [...new Set(r.rows.flatMap(row => row.entries.map(e => e.subjectId)))];

  return table(
    ['Subject', 'Highest score', 'Student(s)'],
    ids.map(id => {
      const entries = r.rows.map(row => ({
        name: row.student.name,
        e: row.entries.find(e => e.subjectId === id)
      })).filter(x => x.e && x.e.total !== null);

      const high = entries.length
        ? Math.max(...entries.map(x => x.e.total))
        : null;

      return `
        <tr>
          <td>${E(entries[0]?.e.subject || subjectName(id))}</td>
          <td>${high ?? '—'}</td>
          <td>${E(entries.filter(x => x.e.total === high).map(x => x.name).join(', ')) || 'Awaiting complete scores'}</td>
        </tr>`;
    })
  );
}

function resultCard(row) {
  const c = reportData.config;
  const annual = String(reportFilter.term) === 'annual';

  return `
    <article class="report-card">
      <div class="report-heading">
        <img src="assets/school.png" alt="School crest">
        <div>
          <h3>${E(c.name)}</h3>
          <small>
            Diocese of Gwagwalada (Anglican Communion)<br>
            Faith · Discipline · Excellence · Service
          </small>
        </div>
      </div>

      <div class="report-meta">
        <span><strong>Name:</strong> ${E(row.student.name)}</span>
        <span><strong>Admission:</strong> ${E(row.student.admission)}</span>
        <span><strong>Class / session:</strong> ${E(reportFilter.className)} · ${E(reportFilter.session)}</span>
        <span><strong>Period:</strong> ${annual ? 'Annual' : 'Term ' + E(reportFilter.term)} · ${reportData.published ? 'Published' : 'DRAFT'}</span>
      </div>

      ${table(
        annual
          ? ['Subject', 'Term 1', 'Term 2', 'Term 3', 'Annual /100', 'Grade', 'Subject rank']
          : ['Subject', 'CA1 /10', 'CA2 /10', 'CA3 /10', 'Exam /70', 'Total /100', 'Grade', 'Subject rank'],
        row.entries.map(e => `
          <tr>
            <td>${E(e.subject)}</td>
            ${(annual
              ? e.terms.map(t => t.total)
              : ['ca1', 'ca2', 'ca3', 'exam'].map(k => e.terms[0][k])
            ).map(x => `<td>${x ?? '—'}</td>`).join('')}
            <td>${e.total ?? '—'}</td>
            <td>${E(e.grade)}</td>
            <td>${e.position ?? '—'}</td>
          </tr>`)
      )}

      <div class="report-foot">
        <strong>Average: ${row.average ?? '—'}% · Position: ${row.position ?? '—'} · ${E(row.remark)}</strong>
        <p>${E(row.decision)}${annual ? ' · Annual scores are equal means of three complete terms.' : ''}</p>
        <p>${E(c.scripture)}</p>
        <div class="signatures">
          <span>Examination Officer</span>
          <span>Principal</span>
        </div>
      </div>
    </article>`;
}

function mail() {
  return head(
    'Result delivery',
    'Publish results, queue emails from the Results page, then send in batches of up to 10.',
    button('sendMail', 'Send next batch', '', 'gold')
  ) + (S.mail.length
    ? table(
        ['Recipient', 'Class / session', 'Period', 'Status', 'Sent / error'],
        S.mail.map(m => `
          <tr>
            <td>${E(m.to)}</td>
            <td>${E(m.className)} · ${E(m.session)}</td>
            <td>${E(m.term)}</td>
            <td>${E(m.status)}</td>
            <td>${E(m.error) || (m.sent ? E(new Date(m.sent).toLocaleString()) : '—')}</td>
          </tr>`)
      )
    : empty('No result emails queued.'))
  + `<div class="help">Email batches respect the Google account’s remaining daily quota. Sent recipients are skipped when queueing the same report again. Failed deliveries can be requeued from Results; unresolved “sending” entries require administrator review before retrying.</div>`;
}

function settings() {
  const c = S.config;

  return head(
    'School settings',
    'Chief Examination Officer controls branding text, grading and annual progression policy.'
  ) + `
    <form id="settings-form" class="card">
      <div class="two-cols">
        ${field('name', 'School name', c.name)}
        ${field('session', 'Current academic session', c.session)}
        ${field('contact', 'Exam reply-to email', c.contact, 'email')}
        ${field(
          'promotionMinimum',
          'Progression review threshold (%)',
          c.promotionMinimum,
          'number',
          'min="0" max="100"'
        )}
      </div>

      ${textarea('message', 'Proprietor welcome message', c.message)}
      ${field('scripture', 'Biblical anchor', c.scripture)}
      ${textarea('bands', 'Grade bands (JSON, highest threshold first)', JSON.stringify(c.bands, null, 2))}

      <button type="submit">Save school policy</button>
    </form>`;
}

function audit() {
  return head(
    'Audit trail',
    'Latest 100 actions. Full history remains in the private sheet.'
  ) + table(
    ['When', 'Actor', 'Action', 'Details'],
    [...S.audit].reverse().map(a => `
      <tr>
        <td>${E(new Date(a.at).toLocaleString())}</td>
        <td>${E(a.user)}</td>
        <td>${E(a.action)}</td>
        <td>${E(JSON.stringify(a.detail))}</td>
      </tr>`)
  );
}

let submitEditor = null;

function modal(title, html, handler) {
  $('#dialog-title').textContent = title;
  $('#fields').innerHTML = html;
  submitEditor = handler;
  $('#dialog').showModal();
}

function checkbox(name, label, checked = true) {
  return `<label><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>${E(label)}</label>`;
}

function formObject(f) {
  const obj = Object.fromEntries(new FormData(f));

  f.querySelectorAll('input[type=checkbox]').forEach(i => {
    obj[i.name] = i.checked;
  });

  return obj;
}

function subjectChecks(ids = []) {
  return `
    <label>Subjects offered</label>
    <div class="check-grid">
      ${S.subjects.filter(s => s.active || ids.includes(s.id)).map(s => `
        <label>
          <input
            type="checkbox"
            name="subjects"
            value="${attr(s.id)}"
            ${ids.includes(s.id) ? 'checked' : ''}
          >${E(s.name)}
        </label>`).join('')}
    </div>`;
}

async function command(cmd, id) {
  if (await offlineCommand(cmd, id)) return;
  if (cmd === 'mode') {
    mode = id === 'activate' && mode === 'activate' ? 'login' : id;
    home();
    return;
  }

  if (cmd === 'otp') {
    const em = $('[name=email]').value;
    const r = await api('requestOtp', { email: em });
    toast(r.message);
    return;
  }

  if (cmd === 'view') {
    await flushDraft();
    view = id;
    render();
    return;
  }

  if (cmd === 'refresh') {
    await flushDraft();
    await refresh();
    return;
  }

  if (cmd === 'logout') {
    if (navigator.onLine) await networkApi('logout');
    await flushDraft();
    Offline.lock();
    selectedAssignment = '';
    S = null;
    reportData = null;
    home();
    return;
  }

  if (cmd === 'editSubject') {
    const s = S.subjects.find(x => x.id === id) || {};

    modal(
      'Subject',
      field('name', 'Subject name', s.name, 'text', 'required')
        + checkbox('active', 'Active subject', s.active !== false),
      async o => api('saveSubject', { ...o, id: s.id })
    );
  }

  if (cmd === 'editUser') {
    const u = S.users.find(x => x.id === id) || {};

    modal(
      'Staff profile & invitation',
      field('name', 'Full name', u.name, 'text', 'required')
        + field('email', 'Registered email', u.email, 'email', 'required')
        + field('phone', 'Phone', u.phone, 'tel')
        + select(
            'role',
            'Role',
            S.user.role === 'admin'
              ? [
                  { id: 'teacher', name: 'Teacher' },
                  { id: 'officer', name: 'SSS Examination Officer' }
                ]
              : [{ id: 'teacher', name: 'Teacher' }],
            u.role || 'teacher'
          )
        + checkbox('active', 'Active account', u.active !== false)
        + checkbox('invite', 'Send signup invitation email', !u.id),
      async o => api('saveUser', { ...o, id: u.id })
    );
  }

  if (cmd === 'editStudent') {
    const s = S.students.find(x => x.id === id) || {};

    modal(
      'Student profile',
      `<div class="two-cols">
        ${field('name', 'Full name', s.name, 'text', 'required')}
        ${field('admission', 'Admission number', s.admission, 'text', 'required')}
        ${select('className', 'Class', classOpts, s.className || 'SS1')}
        ${field('session', 'Academic session', s.session || S.config.session, 'text', 'required')}
        ${field('dob', 'Date of birth', s.dob, 'date')}
        ${field('email', 'Parent / result email', s.email, 'email')}
        ${field('phone', 'Parent / student phone', s.phone, 'tel')}
        ${field(
          'newPin',
          'Set / replace CBT PIN (6–12 digits)',
          '',
          'password',
          'pattern="[0-9]{6,12}"'
        )}
      </div>`
        + subjectChecks(s.subjectIds)
        + checkbox('active', 'Active learner', s.active !== false),
      async (o, f) => {
        o.subjectIds = [...f.querySelectorAll('[name=subjects]:checked')]
          .map(x => x.value);

        delete o.subjects;
        return api('saveStudent', { ...o, id: s.id });
      }
    );
  }

  if (cmd === 'editAssignment') {
    const a = S.assignments.find(x => x.id === id) || {};

    modal(
      'Teaching assignment',
      `<div class="two-cols">
        ${select(
          'teacherId',
          'Teacher',
          S.users.filter(u => u.active && u.role === 'teacher'),
          a.teacherId
        )}
        ${select(
          'subjectId',
          'Subject',
          S.subjects.filter(s => s.active),
          a.subjectId
        )}
        ${select('className', 'Class', classOpts, a.className || 'SS1')}
        ${select('term', 'Term', termOpts, a.term || 1)}
        ${field('session', 'Academic session', a.session || S.config.session, 'text', 'required')}
        ${field('deadline', 'Submission deadline', toLocal(a.deadline), 'datetime-local')}
      </div>`
        + textarea('instructions', 'Officer instructions', a.instructions)
        + checkbox('open', 'Accept teacher submissions', a.open !== false),
      async o => api('saveAssignment', {
        ...o,
        id: a.id,
        deadline: o.deadline ? new Date(o.deadline).toISOString() : ''
      })
    );
  }

  if (cmd === 'editExam') {
    const e = S.exams.find(x => x.id === id) || {};

    modal(
      'CBT examination',
      field('title', 'Exam title', e.title, 'text', 'required')
        + select('assignmentId', 'Matched subject profile', assignmentOpts(), e.assignmentId)
        + `<div class="two-cols">
            ${field('minutes', 'Duration in minutes', e.minutes || 40, 'number', 'required min="1" max="180"')}
            ${field('opens', 'Opens (local time)', toLocal(e.opens), 'datetime-local', 'required')}
            ${field('closes', 'Closes (local time)', toLocal(e.closes), 'datetime-local', 'required')}
          </div>`
        + textarea('questions', 'Questions JSON — prompt, options[4], answer 0–3', '')
        + `<p class="small">Load the complete question list for new or edited examinations. Answer keys are never returned to the frontend.</p>`
        + checkbox('active', 'Activate exam', e.active || false),
      async o => api('saveExam', {
        ...o,
        id: e.id,
        opens: new Date(o.opens).toISOString(),
        closes: new Date(o.closes).toISOString(),
        questions: JSON.parse(o.questions)
      })
    );
  }

  if (cmd === 'print') {
    if (!reportData) throw Error('Generate a report first');
    window.print();
  }

  if (cmd === 'exportResults') {
    if (!reportData) throw Error('Generate a report first');

    const allSubjects = [...new Set(
      reportData.rows.flatMap(r => r.entries.map(e => e.subject))
    )];

    downloadCSV('CACG_score_sheet.csv', [
      ['Admission', 'Name', ...allSubjects, 'Average', 'Class position', 'Grade', 'Completion'],
      ...reportData.rows.map(r => [
        r.student.admission,
        r.student.name,
        ...allSubjects.map(s => r.entries.find(e => e.subject === s)?.total ?? ''),
        r.average ?? '',
        r.position ?? '',
        r.grade,
        r.complete ? 'Complete' : 'Incomplete'
      ])
    ]);
  }

  if (cmd === 'publish') {
    if (!reportData) throw Error('Generate a report first');

    await api('publish', {
      ...reportFilter,
      published: !reportData.published
    });

    reportData = await api('reports', reportFilter);
    S = await api('state');
    drawReport();

    toast(reportData.published
      ? 'Results published and locked.'
      : 'Results unpublished for corrections.');
  }

  if (cmd === 'queue') {
    if (!reportData) throw Error('Generate a report first');

    const r = await api('queueEmail', reportFilter);

    toast(`${r.queued} emails queued; ${r.skipped} skipped (missing email or already queued / sent).`);
  }

  if (cmd === 'sendMail') {
    const r = await api('sendEmailBatch');
    await refresh();

    toast(`${r.sent} sent, ${r.failed} failed, ${r.remaining} queued. Remaining daily quota before batch: ${r.quota}.`);
  }

  if (cmd === 'scoresCsv') {
    const a = S.assignments.find(x => x.id === selectedAssignment);

    downloadCSV('CACG_assessment.csv', [
      ['admission', 'name', 'ca1', 'ca2', 'ca3', 'exam'],
      ...S.students.filter(s =>
        s.active
        && s.session === a.session
        && s.className === a.className
        && s.subjectIds.includes(a.subjectId)
      ).map(s => {
        const v = S.scores.find(v =>
          v.studentId === s.id && v.assignmentId === a.id
        ) || {};

        return [
          s.admission,
          s.name,
          ...['ca1', 'ca2', 'ca3', 'exam'].map(k => v[k] ?? '')
        ];
      })
    ]);
  }

  if (cmd === 'uploadScores') {
    chooseFile('.csv', async file => {
      const rows = parseCSV(await file.text());
      const headers = rows.shift().map(h => h.trim().toLowerCase());

      assertHeaders(headers, ['admission', 'ca1', 'ca2', 'ca3', 'exam']);

      const a = S.assignments.find(x => x.id === selectedAssignment);

      const payload = rows.filter(r => r.some(x => x.trim())).map(r => {
        const o = Object.fromEntries(headers.map((h, i) => [h, r[i] || '']));

        const s = S.students.find(s =>
          s.admission === o.admission
          && s.session === a.session
          && s.className === a.className
        );

        if (!s) throw Error('Unknown admission: ' + o.admission);

        return {
          studentId: s.id,
          ...Object.fromEntries(['ca1', 'ca2', 'ca3', 'exam'].map(k => [k, o[k]]))
        };
      });

      const result = await api('saveScores', {
        assignmentId: a.id,
        rows: payload
      });
      await refresh(!!result.queued);
      toast(result.queued ? 'CSV marks saved on this device.' : 'Assessment CSV saved.');
    });
  }

  if (cmd === 'importRoster') {
    modal(
      'Import student register',
      `<p>Upload a CSV with: admission, name, className, session, email, dob, phone, subjects. Separate subject names with a semicolon. Existing admissions in the same session are updated.</p>
       <label>Student roster CSV<input type="file" name="roster" accept=".csv" required></label>
       <p class="small">Register subject names first. Import in batches of up to 100 students. Review the private legacy file before converting it to the roster format.</p>`,
      async (o, f) => {
        const rows = parseCSV(await f.roster.files[0].text());
        const h = rows.shift().map(x => x.trim());

        assertHeaders(h, ['admission', 'name', 'className', 'session', 'subjects']);

        const entries = rows.filter(r => r.some(x => x.trim())).map(r => {
          const x = Object.fromEntries(h.map((k, i) => [k, r[i] || '']));

          x.subjectIds = x.subjects.split(';').map(n => {
            const sub = S.subjects.find(s =>
              s.name.toLowerCase() === n.trim().toLowerCase()
            );

            if (!sub) throw Error('Unknown subject: ' + n);
            return sub.id;
          });

          return x;
        });

        return api('importStudents', { students: entries });
      }
    );
  }

  if (cmd === 'startCandidateExam') {
    await startCandidateExam(id);
  }

  if (cmd === 'exitCandidate') {
    candidate = null;
    activeExam = null;
    sessionStorage.removeItem('cacg_candidate');
    clearInterval(clock);
    home();
  }
}

function toLocal(s) {
  if (!s) return '';

  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return '';

  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function downloadCSV(name, rows) {
  const csv = rows.map(row => row.map(v => {
    let s = String(v ?? '');

    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;

    return '"' + s.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');

  const url = URL.createObjectURL(
    new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  );

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseCSV(str) {
  str = str.replace(/^\ufeff/, '');

  let rows = [], row = [], v = '', quoted = false;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];

    if (c === '"') {
      if (quoted && str[i + 1] === '"') {
        v += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === ',' && !quoted) {
      row.push(v);
      v = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && str[i + 1] === '\n') i++;

      row.push(v);
      rows.push(row);
      row = [];
      v = '';
    } else {
      v += c;
    }
  }

  if (quoted) throw Error('Malformed CSV quotation');

  if (v || row.length) {
    row.push(v);
    rows.push(row);
  }

  return rows;
}

function assertHeaders(headers, required) {
  required.forEach(h => {
    if (!headers.includes(h)) throw Error('CSV missing column: ' + h);
  });
}

function chooseFile(accept, handler) {
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = accept;
  i.onchange = () => handler(i.files[0]).catch(e => toast(e.message, true));
  i.click();
}

function candidateHome() {
  app.innerHTML = head(
    'Candidate examination',
    `${E(candidate.student.name)} · ${E(candidate.student.className)}`,
    button('exitCandidate', 'Exit')
  ) + (candidate.exams.length
    ? candidate.exams.map(e => `
        <section class="card">
          <h3>${E(e.title)}</h3>
          <p>${e.questionCount} questions · ${e.minutes} minutes · Exam /70</p>
          <p class="small">
            Opens: ${E(new Date(e.opens).toLocaleString())}<br>
            Closes: ${E(new Date(e.closes).toLocaleString())}
          </p>
          ${button('startCandidateExam', 'Start / resume', e.id, 'gold')}
        </section>`).join('')
    : empty('No active examinations available.'));
}

async function startCandidateExam(id) {
  const e = await api('startExam', {
    candidateToken: candidate.candidateToken,
    examId: id
  });

  activeExam = { ...e, id };

  let saved = {};
  try {
    saved = JSON.parse(sessionStorage.getItem('cacg_answers:' + id) || '{}');
  } catch {}

  app.innerHTML = `
    <div class="exam-clock">
      <span>${E(e.title)}</span>
      <strong id="time-left"></strong>
    </div>

    <form id="exam-form">
      ${e.questions.map((q, i) => `
        <section class="question">
          <h3>${i + 1}. ${E(q.prompt)}</h3>
          ${q.options.map((o, j) => `
            <label>
              <input
                type="radio"
                name="q${i}"
                value="${j}"
                ${String(saved[i]) === String(j) ? 'checked' : ''}
              >${E(o)}
            </label>`).join('')}
        </section>`).join('')}

      <div class="actions">
        <button type="submit" class="gold">Submit examination</button>
        <span class="small">One attempt. Review all answers before submitting.</span>
      </div>
    </form>`;

  clearInterval(clock);

  clock = setInterval(() => {
    const secs = Math.max(0, Math.ceil((e.deadline - Date.now()) / 1000));

    $('#time-left').textContent =
      `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} remaining`;

    if (secs === 0) {
      clearInterval(clock);
      submitExam().catch(err => toast(err.message, true));
    }
  }, 1000);
}

async function submitExam() {
  const f = $('#exam-form');
  if (!f) return;

  f.querySelector('button').disabled = true;

  const answers = activeExam.questions.map((q, i) => {
    const v = f.querySelector(`[name=q${i}]:checked`);
    return v ? Number(v.value) : null;
  });

  try {
    const r = await api('submitExam', {
      candidateToken: candidate.candidateToken,
      examId: activeExam.id,
      answers
    });

    clearInterval(clock);
    sessionStorage.removeItem('cacg_answers:' + activeExam.id);

    app.innerHTML = `
      <div class="card">
        <p class="eyebrow">Submission received</p>
        <h2>Your examination is complete.</h2>
        <p>Examination score: <strong>${r.score} / 70</strong></p>
        <p class="small">Your score has been added to your subject assessment record.</p>
        ${button('exitCandidate', 'Exit examination')}
      </div>`;
  } catch (e) {
    f.querySelector('button').disabled = false;
    throw e;
  }
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-cmd]');
  if (!b) return;

  e.preventDefault();
  b.disabled = true;

  try {
    await command(b.dataset.cmd, b.dataset.id);
  } catch (err) {
    toast(err.message, true);
  } finally {
    b.disabled = false;
  }
});

$('#close-dialog').onclick = $('#cancel-dialog').onclick = () => {
  $('#dialog').close();
};

document.addEventListener('submit', async e => {
  e.preventDefault();

  const f = e.target;
  const b = f.querySelector('button[type=submit]');
  if (b) b.disabled = true;

  try {
    if (f.id === 'auth-form') {
      const o = formObject(f);

      if (mode === 'candidate') {
        candidate = await api('candidateLogin', o);
        sessionStorage.setItem('cacg_candidate', JSON.stringify(candidate));
        candidateHome();
      } else {
        await api(mode === 'activate' ? 'activate' : 'login', o);
        await refresh();
      }
    }

    if (f.id === 'editor') {
      const result = await submitEditor(formObject(f), f);
      $('#dialog').close();
      if (result?.local) { S = Offline.overlay(); render(); } else await refresh();
      toast('Saved successfully.');
    }

    if (f.id === 'scores-form') {
      const rows = [...f.querySelectorAll('tr[data-student]')].map(tr => ({
        studentId: tr.dataset.student,
        ...Object.fromEntries(
          [...tr.querySelectorAll('[data-component]')]
            .map(i => [i.dataset.component, i.value])
        )
      }));

      const result = await api('saveScores', {
        assignmentId: selectedAssignment,
        rows
      });
      await refresh(!!result.queued);
      toast(result.queued ? 'Draft saved on this device. Use Send saved changes when connected.' : 'Assessment sheet saved.');
    }

    if (f.id === 'report-form') {
      reportFilter = formObject(f);
      reportData = await api('reports', reportFilter);
      drawReport();
    }

    if (f.id === 'settings-form') {
      const o = formObject(f);
      o.messageStatus = 'Approved';
      o.bands = JSON.parse(o.bands);

      await api('settings', o);
      await refresh();
      toast('School settings updated.');
    }

    if (f.id === 'exam-form') {
      await submitExam();
    }
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (b) b.disabled = false;
  }
});

document.addEventListener('change', e => {
  if (e.target.name === 'scoreAssignment') {
    flushDraft().then(() => { selectedAssignment = e.target.value; render(); }).catch(err => toast(err.message, true));
  }

  if (activeExam && e.target.name?.startsWith('q')) {
    const f = $('#exam-form');

    if (f) {
      const answers = {};

      activeExam.questions.forEach((q, i) => {
        const v = f.querySelector(`[name=q${i}]:checked`);
        if (v) answers[i] = Number(v.value);
      });

      sessionStorage.setItem('cacg_answers:' + activeExam.id, JSON.stringify(answers));
    }
  }
});

document.addEventListener('input', e => {
  if (e.target.name === 'studentSearch') {
    document.querySelectorAll('.student-row').forEach(tr => {
      tr.hidden = !tr.dataset.search.includes(e.target.value.toLowerCase());
    });
  }

  if (e.target.dataset.component) {
    scheduleDraft();
    const tr = e.target.closest('tr');
    const obj = Object.fromEntries(
      [...tr.querySelectorAll('[data-component]')]
        .map(i => [i.dataset.component, i.value])
    );

    try {
      const n = Assessment.total(obj);
      tr.querySelector('.computed-total').textContent = n ?? '—';
      tr.querySelector('.computed-grade').textContent =
        Assessment.grade(n, S.config.bands).grade;
    } catch {
      tr.querySelector('.computed-total').textContent = 'Invalid';
      tr.querySelector('.computed-grade').textContent = '—';
    }
  }
});

(async () => {
  home();

  try {
    candidate = JSON.parse(sessionStorage.getItem('cacg_candidate') || 'null');

    updateConnection();
    if (candidate && navigator.onLine) {
      candidateHome();
      return;
    }
  } catch {}

  try {
    const p = await api('public');
    publicSchool = { ...publicSchool, ...p.school };
    home();

    try {
      S = await api('state');
      render();
    } catch {}
  } catch {}
})();
let draftTimer = null, syncing = false;
function offlineToolbar() {
  if (S?.user.role !== 'teacher') return '';
  const enabled = Offline.unlocked;
  return `<div class="offline-toolbar"><div><strong>${enabled ? 'Your offline workspace' : 'Work offline on this device'}</strong><small id="draft-status">${enabled ? `${Offline.changes} changed mark(s) saved · ${Offline.pending} sheet(s) awaiting send` : 'Save your assigned score sheets, then enter marks without using data.'}</small></div><div class="actions">${enabled ? button('offlineSync', 'Send saved changes', '', 'gold') + button('offlineLock', 'Lock workspace') : button('offlineEnable', 'Enable offline work', '', 'gold') + button('offlineUnlock', 'Unlock saved workspace')}${enabled ? button('offlineForget', 'Remove saved workspace') : ''}</div></div>`;
}
function updateConnection() {
  const el = $('#connection-badge');
  if (el) { el.textContent = navigator.onLine ? 'Connected' : 'Offline'; el.className = 'connection-badge' + (navigator.onLine ? '' : ' offline'); }
}
function draftRows() {
  return [...document.querySelectorAll('#scores-form tr[data-student]')].map(tr => ({ studentId: tr.dataset.student, ...Object.fromEntries([...tr.querySelectorAll('[data-component]')].map(i => [i.dataset.component, i.value])) }));
}
function scheduleDraft() {
  if (!Offline.unlocked || S?.user.role !== 'teacher' || syncing) return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => flushDraft().catch(err => toast('Draft could not be saved: ' + err.message, true)), 650);
}
async function flushDraft() {
  clearTimeout(draftTimer);
  draftTimer = null;
  if (!Offline.unlocked || S?.user.role !== 'teacher' || !$('#scores-form')) return;
  await Offline.saveDraft(selectedAssignment, draftRows());
  S = Offline.overlay();
  const el = $('#draft-status');
  if (el) el.textContent = `${Offline.changes} changed mark(s) saved · ${Offline.pending} sheet(s) awaiting send`;
}
function showConflict(result) {
  const rows = result.conflicts.map(c => `<tr><td>${E(S.students.find(s => s.id === c.studentId)?.name || c.studentId)}</td><td>${E(c.component.toUpperCase())}</td><td>${c.value ?? '—'}</td><td>${c.server ?? '—'}</td></tr>`);
  modal('Review changed marks', `<p>These marks changed on the server after your workspace was saved. Choose which values to keep, then send again.</p>${table(['Student','Assessment','Your saved mark','Server mark'],rows)}${select('policy','Use these values',[{id:'server',name:'Use server values for these conflicts'},{id:'mine',name:'Keep my saved marks for these conflicts'}],'server')}`, async o => { await Offline.resolve(result.assignmentId, result.conflicts, o.policy); S = Offline.overlay(); return {local:true}; });
}
async function offlineCommand(cmd) {
  if (cmd === 'install') { await window.CACGInstall(); return true; }
  if (cmd === 'closeInstall') { $('#install-dialog').close(); return true; }
  if (cmd === 'offlineEnable') {
    if (!navigator.onLine) throw Error('Connect once to enable offline work.');
    modal('Enable offline teacher work', `<p>Your assigned students and score sheets will be saved securely on this device. Use this on your own phone or computer.</p>${field('passphrase','Choose an offline passphrase','','password','required minlength="12" autocomplete="new-password"')}${field('confirm','Repeat offline passphrase','','password','required minlength="12" autocomplete="new-password"')}<p class="small">Use at least 12 characters. You will need this passphrase to unlock saved records after closing or signing out. It is separate from your portal password.</p>`, async o => { if (o.passphrase !== o.confirm) throw Error('The passphrases do not match.'); const current = await networkApi('state'); await Offline.enable(current, o.passphrase); S = Offline.overlay(); return {local:true}; });
    return true;
  }
  if (cmd === 'offlineUnlock') {
    modal('Open saved teacher workspace', `${field('email','Registered teacher email',S?.user.email || '', 'email','required autocomplete="username"')}${field('passphrase','Offline passphrase','','password','required autocomplete="current-password"')}`, async o => { S = await Offline.unlock(o.email, o.passphrase); view = 'scores'; selectedAssignment = ''; reportData = null; return {local:true}; });
    return true;
  }
  if (cmd === 'offlineLock') { await flushDraft(); Offline.lock(); S = null; home(); return true; }
  if (cmd === 'offlineForget') {
    modal('Remove this saved workspace', `<p>This removes the student records and ${Offline.changes} unsent changed mark(s) saved on this device. Server records remain available.</p>${checkbox('confirmed','Remove my saved workspace and unsent drafts',false)}`, async o => { if (!o.confirmed) throw Error('Select the removal checkbox to continue.'); await Offline.forget(S.user.email); return {local:true}; });
    return true;
  }
  if (cmd === 'offlineSync') {
    if (syncing) return true;
    if (!navigator.onLine) throw Error('Connect to send saved changes.');
    await flushDraft();
    syncing = true;
    const controls = [...document.querySelectorAll('#scores-form input, #scores-form button')].map(el => ({el,disabled:el.disabled}));
    controls.forEach(x => x.el.disabled = true);
    try {
      const result = await Offline.sync(networkApi);
      S = Offline.overlay(); render();
      if (result.conflicts.length) showConflict(result);
      else toast(Offline.pending ? `${result.sent} assessment sheet(s) confirmed; ${Offline.pending} newer draft(s) remain to send.` : `${result.sent} assessment sheet(s) sent. All saved changes are confirmed.`);
    } catch (err) {
      if (/Session expired|Account unavailable/.test(err.message)) throw Error('Your changes are safe on this device. Sign in online, unlock your offline workspace, then send again.');
      throw err;
    } finally { syncing = false; controls.forEach(x => { if(x.el.isConnected) x.el.disabled=x.disabled; }); }
    return true;
  }
  return false;
}
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
window.addEventListener('cacg-drafts', () => {
  const el = $('#draft-status');
  if (el && Offline.unlocked) el.textContent = `${Offline.changes} changed mark(s) saved · ${Offline.pending} sheet(s) awaiting send`;
});
window.addEventListener('beforeunload', event => { if (draftTimer) { event.preventDefault(); event.returnValue = ''; } });
updateConnection();
