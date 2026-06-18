/* 
   LeaveIQ — app.js
   Multi-user leave management with localStorage persistence
 */

//  CONSTANTS 
const STORAGE_KEY = 'leaveiq_requests';
const CHIP_COLORS = ['chip-amber','chip-green','chip-blue','chip-purple','chip-red'];
const AVATAR_COLORS = [
  { bg:'rgba(52,211,153,0.15)', color:'#6ee7b7' },
  { bg:'rgba(251,191,36,0.1)',  color:'#fbbf24' },
  { bg:'rgba(248,113,113,0.15)',color:'#f87171' },
  { bg:'rgba(96,165,250,0.12)', color:'#93c5fd' },
  { bg:'rgba(167,139,250,0.12)',color:'#c4b5fd' },
];
const COVERAGE_MAP = {
  'Batch Trainer':    ['Priya Kapoor','Ankit Shah'],
  'Sr. Trainer':      ['Ravi Kumar','Neha Patel'],
  'Developer':        ['Arjun Verma','Ravi Kumar'],
  'Sales Lead':       ['Arjun Verma','Priya Kapoor'],
  'Project Manager':  ['Ankit Shah','Neha Patel'],
  'Designer':         ['Ankit Shah','Arjun Verma'],
  'QA Engineer':      ['Ankit Shah','Priya Kapoor'],
  'HR Executive':     ['Neha Patel','Arjun Verma'],
};

//  STATE 
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let stepTimer = null;
let currentStep = 0;

//  STORAGE HELPERS 
function loadLeaves() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveLeaves(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}
function addLeave(req) {
  const arr = loadLeaves();
  arr.push(req);
  saveLeaves(arr);
}
function deleteLeave(id) {
  const arr = loadLeaves().filter(r => r.id !== id);
  saveLeaves(arr);
}

//  UTILITIES 
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function initials(name) {
  return name.trim().split(/\s+/).slice(0,2).map(w => w[0].toUpperCase()).join('');
}
function avatarStyle(name) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  const c = AVATAR_COLORS[idx];
  return `background:${c.bg};color:${c.color}`;
}
function chipClass(name) {
  const idx = name.charCodeAt(0) % CHIP_COLORS.length;
  return CHIP_COLORS[idx];
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function daysBetween(start, end) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}
function getImpact(days, sessions, projects) {
  const score = (days >= 5 ? 2 : days >= 3 ? 1 : 0)
              + (sessions >= 3 ? 2 : sessions >= 1 ? 1 : 0)
              + (projects >= 2 ? 2 : projects >= 1 ? 1 : 0);
  if (score >= 4) return { level:'HIGH',   cls:'imp-high', emoji:'' };
  if (score >= 2) return { level:'MEDIUM', cls:'imp-med',  emoji:'' };
  return              { level:'LOW',    cls:'imp-low',  emoji:'' };
}
function getCoverage(role) {
  return COVERAGE_MAP[role] || ['Team Member A','Team Member B'];
}

//  PARTICLES 
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      animation-duration:${Math.random()*12+8}s;
      animation-delay:${Math.random()*10}s;
      opacity:0;
    `;
    container.appendChild(p);
  }
}

//  MOBILE MENU 
function toggleMenu() { document.getElementById('mobileMenu').classList.toggle('open'); }
function closeMenu()  { document.getElementById('mobileMenu').classList.remove('open'); }
function scrollToDemo()     { document.getElementById('demo').scrollIntoView({ behavior:'smooth' }); }
function scrollToCalendar() { document.getElementById('calendar').scrollIntoView({ behavior:'smooth' }); }

//  STAT COUNTER 
function animateStats() {
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    let current = 0;
    const step = Math.max(1, target / 40);
    const iv = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(iv); }
      el.textContent = Math.floor(current) + suffix;
    }, 30);
  });
}
const statsObs = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) { animateStats(); statsObs.disconnect(); }
}, { threshold: 0.3 });

//  HOW IT WORKS STEPS 
function setStep(n) {
  document.getElementById('sn' + currentStep).classList.remove('active');
  document.getElementById('pp' + currentStep).classList.remove('active');
  currentStep = n;
  document.getElementById('sn' + n).classList.add('active');
  document.getElementById('pp' + n).classList.add('active');
}
function startStepRotation() {
  if (stepTimer) clearInterval(stepTimer);
  stepTimer = setInterval(() => setStep((currentStep + 1) % 4), 3000);
}

//  MODAL 
function openLeaveModal() {
  const modal = document.getElementById('leaveModal');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('fStart').min = today;
  document.getElementById('fEnd').min   = today;
  updateFormImpactPreview();
}
function closeLeaveModal() {
  document.getElementById('leaveModal').classList.remove('open');
  document.body.style.overflow = '';
}
function handleModalClick(e) {
  if (e.target === document.getElementById('leaveModal')) closeLeaveModal();
}

// Live impact preview inside form
function updateFormImpactPreview() {
  const start    = document.getElementById('fStart').value;
  const end      = document.getElementById('fEnd').value;
  const sessions = parseInt(document.getElementById('fSessions').value) || 0;
  const projects = parseInt(document.getElementById('fProjects').value) || 0;
  const role     = document.getElementById('fRole').value;
  const preview  = document.getElementById('formImpactPreview');
  const pill     = document.getElementById('fipPill');
  const cov      = document.getElementById('fipCoverage');

  if (!start || !end || !role) { preview.style.display = 'none'; return; }
  const days   = daysBetween(start, end);
  const impact = getImpact(days, sessions, projects);
  const coverage = getCoverage(role);

  preview.style.display = 'block';
  pill.className = 'impact-pill ' + impact.cls;
  pill.textContent = impact.emoji + ' ' + impact.level + ' Impact  ' + days + ' day' + (days > 1 ? 's' : '');
  cov.textContent = ' Coverage: ' + coverage[0] + ' (primary)';
}

//  LEAVE FORM SUBMIT 
function submitLeave(e) {
  e.preventDefault();
  const name     = document.getElementById('fName').value.trim();
  const role     = document.getElementById('fRole').value;
  const start    = document.getElementById('fStart').value;
  const end      = document.getElementById('fEnd').value;
  const reason   = document.getElementById('fReason').value;
  const notes    = document.getElementById('fNotes').value.trim();
  const sessions = parseInt(document.getElementById('fSessions').value) || 0;
  const projects = parseInt(document.getElementById('fProjects').value) || 0;

  if (new Date(end) < new Date(start)) {
    showToast(' End date must be after start date', true);
    return;
  }

  const days     = daysBetween(start, end);
  const impact   = getImpact(days, sessions, projects);
  const coverage = getCoverage(role);

  const req = {
    id: uid(),
    name, role, start, end, reason, notes,
    sessions, projects, days,
    impact: impact.level,
    impactCls: impact.cls,
    impactEmoji: impact.emoji,
    coverage,
    submittedAt: new Date().toISOString(),
  };

  addLeave(req);
  closeLeaveModal();
  document.getElementById('leaveForm').reset();
  document.getElementById('formImpactPreview').style.display = 'none';

  showToast(' Leave request submitted! Coverage auto-assigned to ' + coverage[0]);
  renderCalendar();
  renderLeaveList();
  updateHeroCard();
  updateTicker();
}

//  TOAST 
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.style.borderColor = isError ? 'var(--red)' : 'var(--green)';
  t.style.color       = isError ? 'var(--red)' : 'var(--green2)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

//  BIG CALENDAR 
function changeMonth(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  const leaves = loadLeaves();
  const today  = new Date();
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday-first

  // Update header
  document.getElementById('calMonthDisplay').textContent =
    firstDay.toLocaleDateString('en-IN', { month:'long', year:'numeric' });

  // Build a map: "YYYY-MM-DD" -> [leave objects]
  const leaveMap = {};
  leaves.forEach(req => {
    const s = new Date(req.start + 'T00:00:00');
    const e = new Date(req.end   + 'T00:00:00');
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      if (!leaveMap[key]) leaveMap[key] = [];
      leaveMap[key].push(req);
    }
  });

  // Build calendar HTML
  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let html = '<div class="big-cal-header">';
  dows.forEach(d => { html += `<div class="big-cal-dow">${d}</div>`; });
  html += '</div><div class="big-cal-grid">';

  // Prev month padding
  const prevLast = new Date(calYear, calMonth, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    html += `<div class="big-cal-cell other-month"><div class="cell-date">${prevLast - i}</div></div>`;
  }

  // Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = (today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day);
    const dayLeaves = leaveMap[dateStr] || [];
    const multi = dayLeaves.length > 1;

    let cls = 'big-cal-cell';
    if (isToday) cls += ' today';

    let chipsHtml = '';
    dayLeaves.slice(0, 3).forEach(req => {
      const cc = chipClass(req.name);
      chipsHtml += `<div class="cell-leave-chip ${cc}" title="${req.name} — ${req.reason}">${initials(req.name)}</div>`;
    });
    if (dayLeaves.length > 3) {
      chipsHtml += `<div class="cell-leave-chip chip-amber">+${dayLeaves.length - 3}</div>`;
    }

    html += `<div class="${cls}">
      <div class="cell-date">${day}</div>
      <div class="cell-leaves">${chipsHtml}</div>
      ${multi ? `<div class="multi-out-badge">${dayLeaves.length}</div>` : ''}
    </div>`;
  }

  // Next month padding
  const totalCells = startDow + lastDay.getDate();
  const remaining  = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="big-cal-cell other-month"><div class="cell-date">${i}</div></div>`;
  }

  html += '</div>';
  document.getElementById('bigCalendar').innerHTML = html;
}

//  LEAVE LIST 
function renderLeaveList() {
  const leaves = loadLeaves();
  const container = document.getElementById('leaveListContainer');

  if (leaves.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"></div>
        <p>No leave requests yet. Be the first to submit one!</p>
      </div>`;
    return;
  }

  const sorted = [...leaves].sort((a,b) => new Date(b.start) - new Date(a.start));

  let html = '<div class="leave-cards">';
  sorted.forEach(req => {
    const avStyle   = avatarStyle(req.name);
    const ini       = initials(req.name);
    const primary   = req.coverage[0];
    const backup    = req.coverage[1];
    const priIni    = primary.split(' ').map(w=>w[0]).join('');
    const bakIni    = backup.split(' ').map(w=>w[0]).join('');
    const sessionLine = req.sessions > 0
      ? `${req.sessions} session${req.sessions > 1 ? 's' : ''} to be taken over by ${primary}`
      : 'No sessions affected';
    const projectLine = req.projects > 0
      ? `${req.projects} active project${req.projects > 1 ? 's' : ''} — ${primary} briefed`
      : 'No active project impact';

    html += `
    <div class="leave-card" id="lc-${req.id}">

      <!-- Card top: person + impact -->
      <div class="lc-top">
        <div class="lc-person">
          <div class="lc-avatar" style="${avStyle}">${ini}</div>
          <div>
            <div class="lc-name">${req.name}</div>
            <div class="lc-role">${req.role}</div>
          </div>
        </div>
        <span class="impact-pill ${req.impactCls}" style="margin-bottom:0">${req.impactEmoji} ${req.impact}</span>
      </div>

      <!-- Dates + reason -->
      <div class="lc-body">
        <span> ${formatDate(req.start)} ${formatDate(req.end)} &nbsp;&nbsp; ${req.days} day${req.days > 1 ? 's' : ''}</span>
        <span> ${req.reason}</span>
        ${req.notes ? `<span> ${req.notes}</span>` : ''}
      </div>

      <!-- Coverage avatars row -->
      <div class="lc-coverage-row">
        <div class="lc-cov-person">
          <div class="lc-cov-avatar av-green">${priIni}</div>
          <div>
            <div class="lc-cov-name">${primary}</div>
            <div class="lc-cov-tag primary-tag">Primary</div>
          </div>
        </div>
        <div class="lc-cov-divider"></div>
        <div class="lc-cov-person">
          <div class="lc-cov-avatar av-amber">${bakIni}</div>
          <div>
            <div class="lc-cov-name">${backup}</div>
            <div class="lc-cov-tag backup-tag">Backup</div>
          </div>
        </div>
      </div>

      <!-- Handoff note box (like the screenshot) -->
      <div class="handoff-box">
        <div class="handoff-title">HANDOFF NOTE — ${req.name.toUpperCase()} | ${req.days} DAY${req.days > 1 ? 'S' : ''} LEAVE</div>
        <div class="handoff-line">Coverage: ${primary} (primary), ${backup} (backup)</div>
        <div class="handoff-line">Sessions: ${sessionLine}</div>
        <div class="handoff-line">Projects: ${projectLine}</div>
        <div class="handoff-line">This note has been auto-sent to ${primary}, ${backup}, and the manager.</div>
        <div class="handoff-status">Status: <span class="handoff-approved">APPROVED</span></div>
      </div>

      <!-- Footer: remove button -->
      <div class="lc-footer">
        <span style="font-size:0.75rem;color:var(--text3)">Submitted ${new Date(req.submittedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
        <button class="delete-btn" onclick="removeLeave('${req.id}')"> Remove</button>
      </div>

    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function removeLeave(id) {
  deleteLeave(id);
  renderCalendar();
  renderLeaveList();
  updateHeroCard();
  updateTicker();
  showToast('Leave request removed.');
}

//  HERO CARD LIVE UPDATE 
function updateHeroCard() {
  const leaves = loadLeaves();
  const total  = leaves.length;

  // Active Leaves = total submitted requests
  document.getElementById('heroActiveLeaves').textContent = total || '0';

  if (total > 0) {
    const last = leaves[leaves.length - 1];
    document.getElementById('heroLastRequest').textContent = last.name.split(' ')[0];
    document.getElementById('heroCardFooter').textContent =
      total + ' request' + (total > 1 ? 's' : '') + ' tracked. Coverage auto-assigned.';
  } else {
    document.getElementById('heroLastRequest').textContent = '--';
    document.getElementById('heroCardFooter').textContent =
      'Submit a leave request to see real-time impact assessment.';
  }
}

function updateTicker() {
  const leaves = loadLeaves();
  const total  = leaves.length;
  document.getElementById('tickerText').textContent =
    `Monitoring ${Math.max(5, total + 5)} team members  ${total} leave${total !== 1 ? 's' : ''} tracked`;
}
//  CROSS-TAB SYNC (storage event) 
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    renderCalendar();
    renderLeaveList();
    updateHeroCard();
    updateTicker();
  }
});

//  INIT 
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  renderCalendar();
  renderLeaveList();
  updateHeroCard();
  updateTicker();
  startStepRotation();

  // Stats observer
  const statsEl = document.querySelector('.stats');
  if (statsEl) statsObs.observe(statsEl);

  // Form live impact preview listeners
  ['fStart','fEnd','fRole','fSessions','fProjects'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateFormImpactPreview);
  });

  // Keyboard close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLeaveModal();
  });
});
