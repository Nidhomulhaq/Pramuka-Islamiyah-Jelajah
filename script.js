function emptyDashboardData() {
  return {
    teams: [],
    standings: { Putra: [], Putri: [] },
    scores: [],
    history: [],
    approvalQueue: []
  };
}

function showDashboardError(message) {
  const errorMessage = document.getElementById('dashboardError');
  if (!errorMessage) return;
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

let appState = emptyDashboardData();
let currentRole = 'guest';
let currentUser = null;
let selectedTeamName = '';
let editingTeamMembers = [];
let editingScoreHistory = null;
let dashboardLoadPromise = null;
let qrScanner = null;
let scannerRunning = false;
let scanProcessing = false;
const accessTokenKey = 'jelajahAccessToken';
const scoringCriteriaByStation = {
  1: ['Kesesuaian logistik', 'Yel-yel', 'Desain ID card', 'Kerapian'],
  2: ['Hafalan', 'Kekompakan', 'Pengerjaan sandi'],
  3: ['Gerakan', 'Kekompakan', 'Aba-aba', 'Pengerjaan sandi'],
  4: ['Kebersihan', 'Kedisiplinan dalam perjalanan', 'Kesopanan']
};

function authorizedFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem(accessTokenKey);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function updateAccessState() {
  const loginButton = document.getElementById('loginBtn');
  if (loginButton) {
    loginButton.textContent = currentUser
      ? `Keluar (${currentUser.username})`
      : 'Login Panitia';
  }

  document.querySelectorAll('.main-nav [data-view="pos-view"]').forEach((link) => {
    link.hidden = currentRole !== 'pos';
  });
  document.querySelectorAll('.main-nav [data-view="center-view"]').forEach((link) => {
    link.hidden = currentRole !== 'center';
  });
  const assignedPosLabel = currentUser?.stationPos
    ? `Pos ${currentUser.stationPos}`
    : 'Pos ditentukan dari akun panitia.';
  const scorePosition = document.getElementById('scorePosDisplay');
  if (scorePosition) scorePosition.textContent = assignedPosLabel;
  renderScoreCriteria(currentUser?.stationPos);
  const checkpointPosition = document.getElementById('checkpointPosDisplay');
  if (checkpointPosition) checkpointPosition.textContent = assignedPosLabel;
  if (currentRole !== 'center') {
    document.getElementById('teamQrList')?.replaceChildren();
    const printButton = document.getElementById('printTeamQrBtn');
    if (printButton) printButton.disabled = true;
    const status = document.getElementById('teamQrStatus');
    if (status) status.textContent = '';
  }
  const nameInput = document.getElementById('teamDetailName');
  const addInput = document.getElementById('newMemberName');
  const addButton = document.getElementById('addTeamMemberBtn');
  const saveButton = document.getElementById('saveTeamDetailsBtn');
  if (nameInput) nameInput.readOnly = currentRole !== 'center';
  if (addInput) addInput.disabled = currentRole !== 'center';
  if (addButton) addButton.hidden = currentRole !== 'center';
  if (saveButton) saveButton.hidden = currentRole !== 'center';
  renderTeamMembers();
}

function renderScoreCriteria(stationPos) {
  const criteria = scoringCriteriaByStation[stationPos] || [];
  for (let index = 1; index <= 4; index += 1) {
    const field = document.getElementById(`criteriaField${index}`);
    const label = document.getElementById(`criteriaLabel${index}`);
    const input = document.getElementById(`criteria${index}`);
    if (!field || !label || !input) continue;

    const active = index <= criteria.length;
    field.hidden = !active;
    input.disabled = !active;
    input.required = active;
    if (active) label.textContent = criteria[index - 1];
  }
}

function canAccessView(viewId) {
  if (viewId === 'public-view' || viewId === 'public-dashboard-view') return true;
  if (viewId === 'pos-view') return currentRole === 'pos';
  if (viewId === 'center-view') return currentRole === 'center';
  return true;
}

function activateView(viewId) {
  if (viewId !== 'pos-view') stopQrScanner();
  document.querySelectorAll('.main-nav [data-view-link]').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === viewId);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === viewId);
  });
}

function getStatusTone(status = '') {
  const normalized = String(status).toLowerCase();
  if (normalized.includes('approved') || normalized.includes('selesai') || normalized.includes('finish')) return 'status-live';
  if (normalized.includes('menunggu') || normalized.includes('pending')) return 'status-pending';
  if (normalized.includes('revisi')) return 'status-danger';
  return 'status-live';
}

async function loadDashboard() {
  if (dashboardLoadPromise) return dashboardLoadPromise;

  const errorMessage = document.getElementById('dashboardError');
  dashboardLoadPromise = (async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Data dashboard gagal dimuat.');
      }
      const data = await response.json();
      if (currentRole === 'pos') {
        const historyResponse = await authorizedFetch('/api/pos-history');
        if (!historyResponse.ok) {
          const result = await historyResponse.json();
          throw new Error(result.error || 'Riwayat nilai pos gagal dimuat.');
        }
        const historyData = await historyResponse.json();
        data.history = historyData.history;
      }
      appState = data;
      if (errorMessage) errorMessage.hidden = true;
    } catch (error) {
      appState = emptyDashboardData();
      showDashboardError(error.message);
    }

    renderAll();
  })();

  try {
    await dashboardLoadPromise;
  } finally {
    dashboardLoadPromise = null;
  }
}

function renderAll() {
  renderCurationStatus();
  renderLiveTracking();
  renderStandings();
  renderDetailScores();
  renderPosHistory();
  renderCheckpointHistory();
  renderApprovalQueue();
  renderTeamCards();
  updateTeamSelects();
  updateScoreFormAvailability();
  updateAccessState();
}

function renderCurationStatus() {
  const count = document.getElementById('curatedScoreCount');
  const summary = document.getElementById('curationStatusSummary');
  const updatedAt = document.getElementById('curationUpdatedAt');
  if (!count || !summary || !updatedAt) return;

  const scores = appState.scores || [];
  const approvedCount = scores.filter((score) =>
    String(score.status || '').toLowerCase() === 'approved'
  ).length;
  const pendingCount = scores.filter((score) =>
    String(score.status || '').toLowerCase().includes('menunggu kurasi')
  ).length;
  const uncuratedCount = Math.max(appState.teams.length - approvedCount - pendingCount, 0);

  count.textContent = `${approvedCount}/${appState.teams.length}`;
  summary.textContent = `${pendingCount} menunggu · ${uncuratedCount} belum terkurasi`;
  updatedAt.textContent = `Diperbarui ${new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })} WIB`;
}

function renderTeamCards() {
  const container = document.getElementById('teamCards');
  if (!container) return;

  const activeFilter = document.querySelector('.filter-btn.active')?.dataset.category || 'Semua';
  const visibleTeams = activeFilter === 'Semua'
    ? appState.teams
    : appState.teams.filter((team) => team.category === activeFilter);

  container.innerHTML = visibleTeams.map((team) => {
    const statusText = team.status || 'Dalam perjalanan';

    return `
      <article class="team-card">
        <div class="team-card-header">
          <span class="badge ${escapeHtml(team.category.toLowerCase())}">${escapeHtml(team.category)}</span>
          <span class="mini-status ${escapeHtml(team.badge || getStatusTone(statusText))}">${escapeHtml(statusText)}</span>
        </div>
        <div>
          <button class="team-name-trigger" type="button" data-team-index="${appState.teams.indexOf(team)}" aria-haspopup="dialog">${escapeHtml(team.name)}</button>
          <small>${escapeHtml(team.location || 'Pos 1')} · ${(team.members || []).length} anggota</small>
        </div>
      </article>
    `;
  }).join('');
}

function updateTeamSelects() {
  ['scoreTeam', 'overrideTeam'].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const selectedName = select.value;
    select.replaceChildren(...appState.teams.map((team) => {
      const option = document.createElement('option');
      option.value = team.name;
      option.textContent = team.name;
      return option;
    }));
    if (appState.teams.some((team) => team.name === selectedName)) select.value = selectedName;
  });
}

function renderTeamMembers() {
  const list = document.getElementById('teamMemberList');
  if (!list) return;
  list.replaceChildren();

  if (!editingTeamMembers.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'member-empty';
    emptyItem.textContent = 'Belum ada anggota yang ditambahkan.';
    list.append(emptyItem);
    return;
  }

  editingTeamMembers.forEach((member, index) => {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = member;
    item.append(name);
    if (currentRole === 'center') {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'member-remove-btn';
      removeButton.textContent = 'Hapus';
      removeButton.setAttribute('aria-label', `Hapus anggota ${member}`);
      removeButton.addEventListener('click', () => {
        editingTeamMembers.splice(index, 1);
        renderTeamMembers();
      });
      item.append(removeButton);
    }
    list.append(item);
  });
}

function bindTeamDetails() {
  const modal = document.getElementById('teamDetailModal');
  const form = document.getElementById('teamDetailsForm');
  const nameInput = document.getElementById('teamDetailName');
  const memberInput = document.getElementById('newMemberName');
  const addButton = document.getElementById('addTeamMemberBtn');
  const status = document.getElementById('teamDetailStatus');
  const teamCards = document.getElementById('teamCards');
  if (!modal || !form || !nameInput || !memberInput || !addButton || !status || !teamCards) return;

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    status.textContent = '';
    form.reset();
    selectedTeamName = '';
    editingTeamMembers = [];
  };

  teamCards.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-team-index]');
    if (!trigger) return;
    const team = appState.teams[Number(trigger.dataset.teamIndex)];
    if (!team) return;

    selectedTeamName = team.name;
    editingTeamMembers = Array.isArray(team.members) ? [...team.members] : [];
    nameInput.value = team.name;
    nameInput.readOnly = currentRole !== 'center';
    memberInput.value = '';
    memberInput.disabled = currentRole !== 'center';
    addButton.hidden = currentRole !== 'center';
    document.getElementById('saveTeamDetailsBtn').hidden = currentRole !== 'center';
    status.textContent = '';
    document.getElementById('teamDetailTitle').textContent = 'Data Regu';
    renderTeamMembers();
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    if (currentRole === 'center') nameInput.focus();
    else document.querySelector('[data-team-modal-close]').focus();
  });

  document.querySelectorAll('[data-team-modal-close]').forEach((element) => {
    element.addEventListener('click', closeModal);
  });

  addButton.addEventListener('click', () => {
    const memberName = memberInput.value.trim();
    if (!memberName) {
      status.textContent = 'Masukkan nama anggota terlebih dahulu.';
      memberInput.focus();
      return;
    }
    if (memberName.length > 100) {
      status.textContent = 'Nama anggota maksimal 100 karakter.';
      memberInput.focus();
      return;
    }
    if (editingTeamMembers.some((member) => member.toLocaleLowerCase() === memberName.toLocaleLowerCase())) {
      status.textContent = 'Nama anggota tersebut sudah ada.';
      memberInput.focus();
      return;
    }
    if (editingTeamMembers.length >= 100) {
      status.textContent = 'Jumlah anggota maksimal 100 orang.';
      return;
    }
    editingTeamMembers.push(memberName);
    memberInput.value = '';
    status.textContent = '';
    renderTeamMembers();
    memberInput.focus();
  });

  memberInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addButton.click();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (currentRole !== 'center') return;

    const saveButton = document.getElementById('saveTeamDetailsBtn');
    saveButton.disabled = true;
    status.textContent = 'Menyimpan data regu...';
    try {
      const response = await authorizedFetch('/api/teams/details', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentName: selectedTeamName,
          name: nameInput.value.trim(),
          members: editingTeamMembers
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Data regu gagal disimpan.');
      const selectedScoreTeam = document.getElementById('scoreTeam').value;
      const selectedOverrideTeam = document.getElementById('overrideTeam').value;
      await loadDashboard();
      if (selectedScoreTeam === selectedTeamName) {
        document.getElementById('scoreTeam').value = result.team.name;
      }
      if (selectedOverrideTeam === selectedTeamName) {
        document.getElementById('overrideTeam').value = result.team.name;
      }
      closeModal();
      if (document.querySelector('#teamQrList img')) {
        document.getElementById('loadTeamQrBtn').click();
      }
    } catch (error) {
      status.textContent = error.message;
    } finally {
      saveButton.disabled = false;
    }
  });
}

function renderLiveTracking() {
  const body = document.getElementById('live-tracking-body');
  if (!body) return;

  body.innerHTML = appState.teams.map((team) => `
    <tr>
      <td><strong>${escapeHtml(team.name)}</strong></td>
      <td>${escapeHtml(team.category)}</td>
      <td>${escapeHtml(team.location)}</td>
      <td><span class="status-badge ${escapeHtml(team.badge || getStatusTone(team.status))}">${escapeHtml(team.status)}</span></td>
    </tr>
  `).join('');
}

function renderStandings() {
  const putraBody = document.getElementById('standings-putra');
  const putriBody = document.getElementById('standings-putri');
  const putraPodium = document.getElementById('standings-podium-putra');
  const putriPodium = document.getElementById('standings-podium-putri');

  if (!putraBody || !putriBody || !putraPodium || !putriPodium) return;

  const sortedPutra = (appState.standings?.Putra || [])
    .slice()
    .sort((a, b) => Number(b.score) - Number(a.score));
  const sortedPutri = (appState.standings?.Putri || [])
    .slice()
    .sort((a, b) => Number(b.score) - Number(a.score));

  renderPodium(putraPodium, sortedPutra);
  renderPodium(putriPodium, sortedPutri);

  putraBody.innerHTML = sortedPutra
    .map((team, index) => `
      <tr>
        <td>#${index + 1}</td>
        <td>${escapeHtml(team.name)}</td>
        <td>${team.score}</td>
        <td><span class="status-badge ${getStatusTone(team.status)}">${team.status}</span></td>
      </tr>
    `)
    .join('');

  putriBody.innerHTML = sortedPutri
    .map((team, index) => `
      <tr>
        <td>#${index + 1}</td>
        <td>${escapeHtml(team.name)}</td>
        <td>${team.score}</td>
        <td><span class="status-badge ${getStatusTone(team.status)}">${team.status}</span></td>
      </tr>
    `)
    .join('');
}

function renderPodium(container, teams) {
  const topFive = teams.slice(0, 5);
  const signature = JSON.stringify(topFive.map((team) => [team.name, team.score]));
  if (container.dataset.podiumSignature === signature) return;
  container.dataset.podiumSignature = signature;

  container.innerHTML = topFive.map((team, index) => {
    const rank = index + 1;
    return `
      <article class="podium-entry podium-rank-${rank}" style="--podium-delay:${index * 90}ms">
        <div class="podium-team">
          <span class="podium-medal" aria-hidden="true">${rank <= 3 ? ['🥇', '🥈', '🥉'][index] : `#${rank}`}</span>
          <strong>${escapeHtml(team.name)}</strong>
          <span>${escapeHtml(team.score)} poin</span>
        </div>
        <div class="podium-step" aria-label="Peringkat ${rank}">
          <span>${rank}</span>
        </div>
      </article>
    `;
  }).join('');
}

function renderDetailScores() {
  const body = document.getElementById('detail-scores-body');
  if (!body) return;

  body.innerHTML = (appState.scores || []).map((team) => `
    <tr>
      <td>${escapeHtml(team.name)}</td>
      <td>${team.pos1 || '-'}</td>
      <td>${team.pos2 || '-'}</td>
      <td>${team.pos3 || '-'}</td>
      <td>${team.pos4 || '-'}</td>
      <td>${team.total || '-'}</td>
      <td><span class="status-badge ${getStatusTone(team.status)}">${team.status}</span></td>
    </tr>
  `).join('');
}

function renderPosHistory() {
  const body = document.getElementById('pos-history-body');
  if (!body) return;

  body.innerHTML = (appState.history || []).map((entry, index) => {
    const posNumber = Number(String(entry.pos).match(/[1-4]/)?.[0]);
    const score = appState.scores.find((item) => item.name === entry.team);
    const criteria = score?.criteriaByPos?.[`pos${posNumber}`] || entry.criteria;
    const editable = currentRole === 'pos' &&
      entry.status === 'Menunggu Kurasi' &&
      Array.isArray(criteria) &&
      criteria.length === scoringCriteriaByStation[posNumber]?.length;

    return `
      <tr>
        <td>${escapeHtml(entry.team)}</td>
        <td>${escapeHtml(entry.pos)}</td>
        <td>${escapeHtml(entry.value)}</td>
        <td><span class="status-badge ${getStatusTone(entry.status)}">${escapeHtml(entry.status)}</span></td>
        <td>${escapeHtml(entry.time)}</td>
        <td>${editable
          ? `<button class="secondary-btn history-edit-btn" type="button" data-history-edit-index="${index}">Edit Kriteria</button>`
          : entry.status === 'Menunggu Kurasi'
            ? '<span class="legacy-score-note">Rincian kriteria tidak tersedia</span>'
            : '-'}</td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('[data-history-edit-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const entry = appState.history[Number(button.dataset.historyEditIndex)];
      if (!entry) return;
      const posNumber = Number(String(entry.pos).match(/[1-4]/)?.[0]);
      const score = appState.scores.find((item) => item.name === entry.team);
      const criteria = score?.criteriaByPos?.[`pos${posNumber}`] || entry.criteria;
      openScoreEditModal({ ...entry, posNumber, criteria });
    });
  });
}

function openScoreEditModal(entry) {
  const modal = document.getElementById('scoreEditModal');
  const title = document.getElementById('scoreEditTitle');
  const fields = document.getElementById('scoreEditCriteriaFields');
  const status = document.getElementById('scoreEditStatus');
  if (!modal || !title || !fields || !status) return;

  editingScoreHistory = entry;
  title.textContent = `${entry.team} · Pos ${entry.posNumber}`;
  status.textContent = '';
  fields.innerHTML = scoringCriteriaByStation[entry.posNumber]
    .map((label, index) => `
      <label>
        ${escapeHtml(label)}
        <input type="number" min="1" max="100" step="1" data-edit-criterion="${index}" value="${escapeHtml(entry.criteria[index])}" required />
      </label>
    `).join('');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  fields.querySelector('input')?.focus();
}

function bindScoreEditModal() {
  const modal = document.getElementById('scoreEditModal');
  const form = document.getElementById('scoreEditForm');
  const status = document.getElementById('scoreEditStatus');
  const saveButton = document.getElementById('saveScoreEditBtn');
  if (!modal || !form || !status || !saveButton) return;

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    form.reset();
    status.textContent = '';
    editingScoreHistory = null;
  };
  document.querySelectorAll('[data-score-modal-close]').forEach((button) => {
    button.addEventListener('click', closeModal);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editingScoreHistory) return;

    const values = Array.from(fieldsForEdit(), (input) => Number(input.value));
    if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 100)) {
      status.textContent = 'Setiap nilai kriteria harus berupa bilangan bulat 1 sampai 100.';
      return;
    }

    saveButton.disabled = true;
    status.textContent = 'Menyimpan perubahan nilai...';
    try {
      const response = await authorizedFetch('/api/score', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team: editingScoreHistory.team,
          pos: editingScoreHistory.posNumber,
          values
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nilai gagal diperbarui.');
      await loadDashboard();
      closeModal();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      saveButton.disabled = false;
    }
  });

  function fieldsForEdit() {
    return form.querySelectorAll('[data-edit-criterion]');
  }
}

function updateScoreFormAvailability() {
  const teamSelect = document.getElementById('scoreTeam');
  const submitButton = document.querySelector('#scoreForm button[type="submit"]');
  if (!teamSelect || !submitButton) return;

  const posName = currentUser?.stationPos ? `Pos ${currentUser.stationPos}` : '';
  const alreadyScored = (appState.history || []).some((entry) =>
    entry.team === teamSelect.value && entry.pos === posName
  );
  submitButton.disabled = alreadyScored;
  submitButton.textContent = alreadyScored ? 'Nilai Sudah Dikirim' : 'Simpan Nilai';
}

function renderCheckpointHistory() {
  const container = document.getElementById('checkpoint-history-groups');
  if (!container) return;

  const checkpoints = appState.teams.flatMap((team) =>
    (Array.isArray(team.journeyCheckpoints) ? team.journeyCheckpoints : [])
      .map((checkpoint) => ({ ...checkpoint, teamName: team.name, category: team.category }))
  );

  const formatTime = (value) => {
    const time = Date.parse(value);
    return Number.isNaN(time)
      ? 'Waktu tidak tersedia'
      : `${new Date(time).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23'
        })} WIB`;
  };

  container.innerHTML = [1, 2, 3, 4].map((pos) => {
    const posCheckpoints = checkpoints
      .filter((checkpoint) => Number(checkpoint.pos) === pos)
      .sort((a, b) => {
        const timeA = Date.parse(a.time);
        const timeB = Date.parse(b.time);
        if (!Number.isFinite(timeA)) return Number.isFinite(timeB) ? 1 : 0;
        if (!Number.isFinite(timeB)) return -1;
        return timeB - timeA;
      });
    const rows = posCheckpoints.length
      ? posCheckpoints.map((checkpoint) => {
          const checkpointLabel = checkpoint.action === 'Keluar' && pos === 4
            ? 'Keluar · Finish'
            : checkpoint.action;
          return `
            <tr>
              <td><strong>${escapeHtml(checkpoint.teamName)}</strong></td>
              <td>${escapeHtml(checkpoint.category)}</td>
              <td>${escapeHtml(checkpointLabel)}</td>
              <td>${escapeHtml(formatTime(checkpoint.time))}</td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="4">Belum ada catatan checkpoint.</td></tr>';

    return `
      <section class="checkpoint-history-group" aria-labelledby="checkpoint-pos-${pos}">
        <div class="checkpoint-history-heading">
          <h4 id="checkpoint-pos-${pos}">Pos ${pos}${pos === 4 ? ' · Finish' : ''}</h4>
          <span>${posCheckpoints.length} catatan</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Regu</th>
                <th>Kategori</th>
                <th>Checkpoint</th>
                <th>Waktu (WIB)</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    `;
  }).join('');
}

function renderApprovalQueue() {
  const queue = document.getElementById('approval-queue');
  if (!queue) return;

  const items = appState.approvalQueue || [];
  if (!items.length) {
    queue.innerHTML = '<p class="empty-approval-queue">Belum ada nilai yang menunggu kurasi.</p>';
    return;
  }

  const itemDetails = items.map((item, index) => {
    const posNumber = Number(String(item.pos).match(/[1-4]/)?.[0]);
    const score = appState.scores.find((entry) => entry.name === item.name);
    const criteria = item.criteria || score?.criteriaByPos?.[`pos${posNumber}`];
    const labels = scoringCriteriaByStation[posNumber] || [];
    return { item, index, posNumber, criteria, labels };
  });
  queue.innerHTML = [1, 2, 3, 4].map((pos) => {
    const posItems = itemDetails.filter((entry) => entry.posNumber === pos);
    if (!posItems.length) return '';

    return `
      <section class="approval-pos-group" aria-labelledby="approval-pos-${pos}">
        <div class="checkpoint-history-heading">
          <h4 id="approval-pos-${pos}">Pos ${pos}${pos === 4 ? ' · Finish' : ''}</h4>
          <span>${posItems.length} nilai menunggu</span>
        </div>
        <div class="approval-pos-list">
          ${posItems.map(({ item, index, criteria, labels }) => {
            const hasCriteria = Array.isArray(criteria) && criteria.length === labels.length;
            return `
              <article class="approval-item">
                <div class="approval-meta">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${escapeHtml(item.pos)} · ${escapeHtml(item.source || 'Panitia Pos')}</span>
                  <span>Total nilai: <strong data-approval-total="${index}">${escapeHtml(item.total)}</strong></span>
                </div>
                ${hasCriteria
                  ? `<form class="curation-score-form" data-curation-index="${index}">
                      <div class="curation-criteria-grid">
                        ${labels.map((label, criterionIndex) => `
                          <label>
                            ${escapeHtml(label)}
                            <input type="number" min="1" max="100" step="1" value="${escapeHtml(criteria[criterionIndex])}" data-curation-criterion="${criterionIndex}" required />
                          </label>
                        `).join('')}
                      </div>
                      <div class="approval-actions">
                        <button class="secondary-btn curation-save-btn" type="submit">Simpan Revisi Nilai</button>
                        <button class="approve-btn" type="button" data-approve-index="${index}">Setujui</button>
                      </div>
                    </form>`
                  : `<p class="legacy-score-note">Nilai ini berasal dari data lama tanpa rincian kriteria, sehingga belum dapat direvisi per kriteria.</p>
                    <div class="approval-actions">
                      <button class="approve-btn" type="button" data-approve-index="${index}">Setujui</button>
                    </div>`}
              </article>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }).join('');

  queue.querySelectorAll('.curation-score-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const index = Number(form.dataset.curationIndex);
      const item = items[index];
      if (!item) return;

      const values = Array.from(form.querySelectorAll('[data-curation-criterion]'), (input) => Number(input.value));
      if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 100)) {
        showDashboardError('Setiap nilai kriteria harus berupa bilangan bulat 1 sampai 100.');
        return;
      }

      const saveButton = form.querySelector('.curation-save-btn');
      saveButton.disabled = true;
      try {
        const response = await authorizedFetch('/api/curation-score', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team: item.name,
            pos: Number(String(item.pos).match(/[1-4]/)?.[0]),
            values
          })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Revisi nilai gagal disimpan.');
        await loadDashboard();
      } catch (error) {
        showDashboardError(error.message);
      } finally {
        saveButton.disabled = false;
      }
    });
  });

  queue.querySelectorAll('.approve-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.approveIndex);
      const item = items[index];
      if (!item) return;

      try {
        const response = await authorizedFetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: item.name, pos: item.pos })
        });
        if (!response.ok) {
          const result = await response.json();
          showDashboardError(result.error || 'Nilai gagal disetujui.');
          return;
        }
        await loadDashboard();
      } catch (error) {
        showDashboardError(error.message);
      }
    });
  });
}

function bindTabs() {
  document.querySelectorAll('.tab-btn, [data-view-link]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const viewId = button.dataset.view;
      if (!viewId) return;
      if (!canAccessView(viewId)) {
        event.preventDefault();
        const message = document.getElementById('loginMessage');
        if (message) {
          message.textContent = 'Akses dibatasi. Login sebagai Panitia Pos atau Admin Pusat terlebih dahulu.';
          message.classList.remove('success');
        }
        document.getElementById('loginBtn')?.click();
        return;
      }

      if (button.tagName === 'A') event.preventDefault();
      activateView(viewId);
      const scrollTarget = button.dataset.scrollTarget || viewId;
      document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bindDashboardPanelTabs() {
  const tabs = Array.from(document.querySelectorAll('[data-dashboard-panel]'));
  if (!tabs.length) return;

  const activatePanel = (tab) => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.dataset.dashboardPanel).hidden = !active;
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activatePanel(tab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;

      event.preventDefault();
      tabs[nextIndex].focus();
      activatePanel(tabs[nextIndex]);
    });
  });
}

function bindCategoryFilters() {
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((item) => {
        item.classList.toggle('active', item === button);
      });
      renderTeamCards();
    });
  });
}

function bindScanActions() {
  const status = document.getElementById('scannerStatus');
  const scanButton = document.getElementById('scanQrBtn');
  const stopButton = document.getElementById('stopScanBtn');
  const checkpointAction = document.getElementById('checkpointAction');

  if (!status || !scanButton || !stopButton || !checkpointAction) return;

  scanButton.addEventListener('click', async () => {
    if (currentRole !== 'pos') {
      status.textContent = 'Login sebagai panitia pos untuk menggunakan kamera.';
      return;
    }
    if (!window.Html5Qrcode) {
      status.textContent = 'Pemindai QR gagal dimuat. Muat ulang halaman dan coba lagi.';
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      status.textContent = 'Akses kamera memerlukan koneksi HTTPS atau localhost dan browser yang mendukung kamera.';
      return;
    }

    scanButton.disabled = true;
    status.textContent = 'Meminta izin kamera...';
    const scanner = new Html5Qrcode('scanner-reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false
    });
    qrScanner = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        async (decodedText) => {
          const team = appState.teams.find((item) => item.name === decodedText.trim());
          if (!team) {
            status.textContent = 'QR tidak dikenali. Gunakan QR regu yang diterbitkan pusat kurasi.';
            return;
          }

          document.getElementById('scoreTeam').value = team.name;
          if (scanProcessing) return;
          scanProcessing = true;
          await stopQrScanner();
          status.classList.remove('success', 'error');
          status.textContent = 'Menyimpan checkpoint...';
          try {
            const response = await authorizedFetch('/api/checkpoint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                team: team.name,
                pos: currentUser.stationPos,
                action: checkpointAction.value
              })
            });
            const result = await response.json();
            if (!response.ok) {
              if (result.nextCheckpoint) {
                checkpointAction.value = result.nextCheckpoint.action;
              }
              throw new Error(result.error || 'Checkpoint gagal disimpan.');
            }

            status.classList.add('success');
            status.textContent = `✓ Berhasil checkpoint: ${team.name} · ${result.message}`;
            if (result.nextCheckpoint) {
              checkpointAction.value = result.nextCheckpoint.action;
            }
            await loadDashboard();
          } catch (error) {
            status.classList.add('error');
            status.textContent = `Checkpoint belum berhasil: ${error.message}`;
          } finally {
            scanProcessing = false;
          }
        },
        () => {}
      );
      if (qrScanner !== scanner) {
        await scanner.stop();
        await scanner.clear();
        return;
      }
      scannerRunning = true;
      scanButton.hidden = true;
      stopButton.hidden = false;
      status.textContent = 'Kamera aktif. Arahkan ke QR code regu.';
    } catch (error) {
      if (qrScanner === scanner) {
        qrScanner = null;
        scannerRunning = false;
      }
      scanButton.disabled = false;
      status.textContent = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
        ? 'Izin kamera ditolak. Izinkan akses kamera dari pengaturan browser lalu coba lagi.'
        : 'Kamera tidak dapat dibuka. Pastikan kamera tidak sedang digunakan aplikasi lain.';
    }
  });

  stopButton.addEventListener('click', () => stopQrScanner());
}

async function stopQrScanner() {
  const scanButton = document.getElementById('scanQrBtn');
  const stopButton = document.getElementById('stopScanBtn');
  if (qrScanner && scannerRunning) {
    try {
      await qrScanner.stop();
      await qrScanner.clear();
    } catch (error) {
      console.error('Gagal menghentikan kamera pemindai:', error);
    }
  }
  qrScanner = null;
  scannerRunning = false;
  if (scanButton) {
    scanButton.hidden = false;
    scanButton.disabled = false;
  }
  if (stopButton) stopButton.hidden = true;
}

function bindTeamQrCodes() {
  const loadButton = document.getElementById('loadTeamQrBtn');
  const printButton = document.getElementById('printTeamQrBtn');
  const status = document.getElementById('teamQrStatus');
  const list = document.getElementById('teamQrList');
  if (!loadButton || !printButton || !status || !list) return;

  loadButton.addEventListener('click', async () => {
    loadButton.disabled = true;
    status.textContent = 'Memuat QR regu...';
    try {
      const response = await authorizedFetch('/api/team-qrs');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'QR regu gagal dimuat.');

      list.replaceChildren();
      result.teams.forEach((team) => {
        const card = document.createElement('article');
        card.className = 'team-qr-card';
        const image = document.createElement('img');
        image.src = team.qrCode;
        image.alt = `QR Code ${team.name}`;
        const title = document.createElement('h4');
        title.textContent = team.name;
        const category = document.createElement('p');
        category.textContent = team.category;
        card.append(image, title, category);
        list.append(card);
      });
      printButton.disabled = result.teams.length === 0;
      status.textContent = result.teams.length
        ? `${result.teams.length} QR regu siap dicetak.`
        : 'Belum ada data regu untuk dibuatkan QR.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      loadButton.disabled = false;
    }
  });

  printButton.addEventListener('click', () => window.print());
}

function bindResetScores() {
  const button = document.getElementById('resetScoresBtn');
  const status = document.getElementById('resetScoresStatus');
  if (!button || !status) return;

  button.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Reset seluruh nilai yang tersimpan? Nilai, riwayat input, dan antrean kurasi akan dihapus. Data regu dan status perjalanan tetap dipertahankan.'
    );
    if (!confirmed) return;

    button.disabled = true;
    status.textContent = 'Mereset nilai...';
    try {
      const response = await authorizedFetch('/api/reset-scores', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nilai gagal direset.');
      await loadDashboard();
      status.textContent = result.message;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

function bindManualOverride() {
  const form = document.getElementById('overrideForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const team = document.getElementById('overrideTeam').value;
    const location = document.getElementById('overrideLocation').value;
    const status = document.getElementById('overrideStatus').value;

    const target = appState.teams.find((item) => item.name === team);
    if (!target) return;

    target.location = location;
    target.status = status === 'Selesai'
      ? 'Selesai (Finish)'
      : status === 'Menunggu Kurasi'
        ? 'Menunggu kurasi'
        : `Sedang melakukan tugas di ${location}`;
    target.badge = status === 'Selesai' ? 'status-finish' : status === 'Menunggu Kurasi' ? 'status-pending' : 'status-live';

    renderLiveTracking();
  });
}

function bindScoreForm() {
  const form = document.getElementById('scoreForm');
  if (!form) return;

  document.getElementById('scoreTeam').addEventListener('change', updateScoreFormAvailability);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const criteriaCount = scoringCriteriaByStation[currentUser?.stationPos]?.length || 0;
    if (!criteriaCount) {
      showDashboardError('Akun pos belum memiliki pos penugasan untuk penilaian.');
      return;
    }
    if ((appState.history || []).some((entry) =>
      entry.team === document.getElementById('scoreTeam').value &&
      entry.pos === `Pos ${currentUser.stationPos}`
    )) {
      showDashboardError('Regu ini sudah menerima nilai dari pos Anda.');
      updateScoreFormAvailability();
      return;
    }

    const payload = {
      team: document.getElementById('scoreTeam').value,
      pos: `Pos ${currentUser?.stationPos}`,
      values: Array.from({ length: criteriaCount }, (_, index) =>
        Number(document.getElementById(`criteria${index + 1}`).value)
      )
    };

    try {
      const response = await authorizedFetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const result = await response.json();
        showDashboardError(result.error || 'Nilai gagal disimpan.');
        return;
      }
      await loadDashboard();
      form.reset();
    } catch (error) {
      showDashboardError(error.message);
    }
  });
}

function bindLoginModal() {
  const modal = document.getElementById('loginModal');
  const loginBtn = document.getElementById('loginBtn');
  const form = document.getElementById('loginForm');
  const message = document.getElementById('loginMessage');

  if (!modal || !loginBtn || !form || !message) return;

  const openModal = () => {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('loginUsername').focus();
  };

  const logout = () => {
    localStorage.removeItem(accessTokenKey);
    currentUser = null;
    currentRole = 'guest';
    document.querySelector('[data-team-modal-close]')?.click();
    activateView('public-view');
    updateAccessState();
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    form.reset();
    message.textContent = '';
    message.classList.remove('success');
  };

  loginBtn.addEventListener('click', () => {
    if (currentUser) {
      logout();
      return;
    }
    openModal();
  });
  document.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', closeModal);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';
    message.classList.remove('success');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('loginUsername').value.trim(),
          password: document.getElementById('loginPassword').value
        })
      });
      const result = await response.json();
      if (!response.ok) {
        message.textContent = result.error || 'Login gagal. Periksa username dan password.';
        return;
      }

      localStorage.setItem(accessTokenKey, result.token);
      currentUser = result.user;
      currentRole = result.user.role;
      message.textContent = currentRole === 'pos'
        ? 'Login berhasil. Anda masuk ke dasbor panitia pos.'
        : 'Login berhasil. Anda masuk ke meja kurasi pusat.';
      message.classList.add('success');
      updateAccessState();
      const nextView = currentRole === 'pos' ? 'pos-view' : 'center-view';
      activateView(nextView);
      setTimeout(closeModal, 700);
    } catch (error) {
      message.textContent = 'Tidak dapat menghubungi server. Coba lagi.';
    }
  });
}

async function restoreSession() {
  const token = localStorage.getItem(accessTokenKey);
  if (!token) return;

  try {
    const response = await authorizedFetch('/api/session');
    if (!response.ok) throw new Error('Sesi tidak valid.');
    const result = await response.json();
    currentUser = result.user;
    currentRole = result.user.role;
    const viewId = currentRole === 'pos' ? 'pos-view' : 'center-view';
    activateView(viewId);
  } catch (error) {
    localStorage.removeItem(accessTokenKey);
    currentUser = null;
    currentRole = 'guest';
    activateView('public-view');
  }

  updateAccessState();
}

window.addEventListener('storage', (event) => {
  if (event.key !== accessTokenKey) return;
  if (!event.newValue) {
    currentUser = null;
    currentRole = 'guest';
    activateView('public-view');
    updateAccessState();
    return;
  }
  restoreSession();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') loadDashboard();
});

window.setInterval(() => {
  if (document.visibilityState === 'visible') loadDashboard();
}, 5000);

bindTabs();
bindDashboardPanelTabs();
bindCategoryFilters();
bindTeamDetails();
bindLoginModal();
bindScoreForm();
bindScoreEditModal();
bindScanActions();
bindTeamQrCodes();
bindResetScores();
bindManualOverride();
updateAccessState();
restoreSession();
loadDashboard();
