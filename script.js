const fallbackData = {
  teams: [
    { name: 'Regu Bebek', category: 'Putra', location: 'Pos 2', status: 'Sedang melakukan tugas di Pos 2', badge: 'status-live' },
    { name: 'Regu Kupu-Kupu', category: 'Putra', location: 'Pos 3', status: 'Sedang melakukan tugas di Pos 3', badge: 'status-live' },
    { name: 'Regu Garuda', category: 'Putra', location: 'Pos 1', status: 'Sedang melakukan tugas di Pos 1', badge: 'status-live' },
    { name: 'Regu Tokek', category: 'Putra', location: 'Pos 4', status: 'Selesai (Finish)', badge: 'status-finish' },
    { name: 'Regu Jerapah', category: 'Putra', location: 'Menunggu', status: 'Menunggu check-in', badge: 'status-pending' },
    { name: 'Regu Kamboja', category: 'Putri', location: 'Pos 4', status: 'Selesai (Finish)', badge: 'status-finish' },
    { name: 'Regu Anggrek', category: 'Putri', location: 'Pos 2', status: 'Sedang melakukan tugas di Pos 2', badge: 'status-live' },
    { name: 'Regu Pompom', category: 'Putri', location: 'Pos 1', status: 'Sedang melakukan tugas di Pos 1', badge: 'status-live' },
    { name: 'Regu Lavender', category: 'Putri', location: 'Menunggu', status: 'Menunggu check-in', badge: 'status-pending' },
    { name: 'Regu Kenikir', category: 'Putri', location: 'Pos 3', status: 'Sedang melakukan tugas di Pos 3', badge: 'status-live' }
  ],
  standings: {
    Putra: [
      { name: 'Regu Bebek', score: 930, status: 'Approved' },
      { name: 'Regu Garuda', score: 912, status: 'Approved' },
      { name: 'Regu Kupu-Kupu', score: 887, status: 'Menunggu Kurasi' },
      { name: 'Regu Tokek', score: 868, status: 'Approved' },
      { name: 'Regu Jerapah', score: 841, status: 'Approved' }
    ],
    Putri: [
      { name: 'Regu Anggrek', score: 915, status: 'Approved' },
      { name: 'Regu Kamboja', score: 904, status: 'Approved' },
      { name: 'Regu Kenikir', score: 891, status: 'Menunggu Kurasi' },
      { name: 'Regu Lavender', score: 876, status: 'Approved' },
      { name: 'Regu Pompom', score: 853, status: 'Approved' }
    ]
  },
  scores: [
    { name: 'Regu Bebek', pos1: '92', pos2: '95', pos3: '90', pos4: '92', total: '369', status: 'Approved' },
    { name: 'Regu Kupu-Kupu', pos1: '88', pos2: '90', pos3: '85', pos4: 'Menunggu Kurasi', total: '263', status: 'Menunggu Kurasi' },
    { name: 'Regu Garuda', pos1: '94', pos2: '91', pos3: '92', pos4: '89', total: '366', status: 'Approved' },
    { name: 'Regu Tokek', pos1: '86', pos2: '84', pos3: '88', pos4: '90', total: '348', status: 'Approved' },
    { name: 'Regu Jerapah', pos1: '82', pos2: '83', pos3: '87', pos4: '84', total: '336', status: 'Approved' },
    { name: 'Regu Kamboja', pos1: '90', pos2: '94', pos3: '91', pos4: '92', total: '367', status: 'Approved' },
    { name: 'Regu Anggrek', pos1: '89', pos2: '93', pos3: '90', pos4: '89', total: '361', status: 'Approved' },
    { name: 'Regu Pompom', pos1: '84', pos2: '87', pos3: '88', pos4: '86', total: '345', status: 'Approved' },
    { name: 'Regu Lavender', pos1: '85', pos2: '88', pos3: '89', pos4: '83', total: '345', status: 'Approved' },
    { name: 'Regu Kenikir', pos1: '86', pos2: '90', pos3: '87', pos4: 'Menunggu Kurasi', total: '263', status: 'Menunggu Kurasi' }
  ],
  history: [
    { team: 'Regu Bebek', pos: 'Pos 2', value: '93', status: 'Approved', time: '08:40' },
    { team: 'Regu Anggrek', pos: 'Pos 1', value: '89', status: 'Approved', time: '08:25' },
    { team: 'Regu Kenikir', pos: 'Pos 4', value: '86', status: 'Menunggu Kurasi', time: '08:12' },
    { team: 'Regu Kupu-Kupu', pos: 'Pos 3', value: '87', status: 'Menunggu Kurasi', time: '08:08' }
  ],
  approvalQueue: [
    { name: 'Regu Kupu-Kupu', pos: 'Pos 3', total: '287', source: 'Panitia Pos 3' },
    { name: 'Regu Kenikir', pos: 'Pos 4', total: '263', source: 'Panitia Pos 4' },
    { name: 'Regu Garuda', pos: 'Pos 4', total: '294', source: 'Panitia Pos 4' }
  ]
};

let appState = { ...fallbackData, standings: { ...fallbackData.standings } };
let currentRole = 'guest';
let currentUser = null;
let qrScanner = null;
let scannerRunning = false;
const accessTokenKey = 'jelajahAccessToken';

function authorizedFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem(accessTokenKey);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

function updateAccessState() {
  const loginButton = document.getElementById('loginBtn');
  if (loginButton) {
    loginButton.textContent = currentUser
      ? `Keluar (${currentUser.username})`
      : 'Login Panitia';
  }

  document.querySelectorAll('.tab-btn[data-view="pos-view"]').forEach((tab) => {
    tab.hidden = currentRole !== 'pos';
  });
  document.querySelectorAll('.tab-btn[data-view="center-view"]').forEach((tab) => {
    tab.hidden = currentRole !== 'center';
  });
  if (currentRole !== 'center') {
    document.getElementById('teamQrList')?.replaceChildren();
    const printButton = document.getElementById('printTeamQrBtn');
    if (printButton) printButton.disabled = true;
    const status = document.getElementById('teamQrStatus');
    if (status) status.textContent = '';
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
  document.querySelectorAll('.tab-btn').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === viewId);
  });
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
  try {
    const response = await fetch('/api/dashboard');
    if (!response.ok) throw new Error('API gagal dimuat');
    const data = await response.json();
    appState = data;
  } catch (error) {
    appState = JSON.parse(JSON.stringify(fallbackData));
  }

  renderAll();
}

function renderAll() {
  renderLiveTracking();
  renderStandings();
  renderDetailScores();
  renderPosHistory();
  renderApprovalQueue();
  renderTeamCards();
  updateAccessState();
}

function renderTeamCards() {
  const container = document.getElementById('teamCards');
  if (!container) return;

  const activeFilter = document.querySelector('.filter-btn.active')?.dataset.category || 'Semua';
  const visibleTeams = activeFilter === 'Semua'
    ? appState.teams
    : appState.teams.filter((team) => team.category === activeFilter);

  container.innerHTML = visibleTeams.map((team) => {
    const scoreEntry = (appState.scores || []).find((item) => item.name === team.name);
    const totalScore = Number(scoreEntry?.total || team.totalScore || 0);
    const statusText = team.status || 'Dalam perjalanan';

    return `
      <article class="team-card">
        <div class="team-card-header">
          <span class="badge ${team.category.toLowerCase()}">${team.category}</span>
          <span class="mini-status ${team.badge || getStatusTone(statusText)}">${statusText}</span>
        </div>
        <div>
          <strong>${team.name}</strong>
          <small>${team.location || 'Pos 1'} • ${team.rangerCount || 10} anggota</small>
        </div>
        <div class="score-line">
          <span>Nilai total</span>
          <strong>${totalScore}</strong>
        </div>
      </article>
    `;
  }).join('');
}

function renderLiveTracking() {
  const body = document.getElementById('live-tracking-body');
  if (!body) return;

  body.innerHTML = appState.teams.map((team) => `
    <tr>
      <td><strong>${team.name}</strong></td>
      <td>${team.category}</td>
      <td>${team.location}</td>
      <td><span class="status-badge ${team.badge || getStatusTone(team.status)}">${team.status}</span></td>
    </tr>
  `).join('');
}

function renderStandings() {
  const putraBody = document.getElementById('standings-putra');
  const putriBody = document.getElementById('standings-putri');

  if (!putraBody || !putriBody) return;

  putraBody.innerHTML = (appState.standings?.Putra || [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((team, index) => `
      <tr>
        <td>#${index + 1}</td>
        <td>${team.name}</td>
        <td>${team.score}</td>
        <td><span class="status-badge ${getStatusTone(team.status)}">${team.status}</span></td>
      </tr>
    `)
    .join('');

  putriBody.innerHTML = (appState.standings?.Putri || [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((team, index) => `
      <tr>
        <td>#${index + 1}</td>
        <td>${team.name}</td>
        <td>${team.score}</td>
        <td><span class="status-badge ${getStatusTone(team.status)}">${team.status}</span></td>
      </tr>
    `)
    .join('');
}

function renderDetailScores() {
  const body = document.getElementById('detail-scores-body');
  if (!body) return;

  body.innerHTML = (appState.scores || []).map((team) => `
    <tr>
      <td>${team.name}</td>
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

  body.innerHTML = (appState.history || []).map((entry) => `
    <tr>
      <td>${entry.team}</td>
      <td>${entry.pos}</td>
      <td>${entry.value}</td>
      <td><span class="status-badge ${getStatusTone(entry.status)}">${entry.status}</span></td>
      <td>${entry.time}</td>
    </tr>
  `).join('');
}

function renderApprovalQueue() {
  const queue = document.getElementById('approval-queue');
  if (!queue) return;

  queue.innerHTML = (appState.approvalQueue || []).map((item, index) => `
    <div class="approval-item">
      <div class="approval-meta">
        <strong>${item.name}</strong>
        <span>${item.pos} · ${item.source}</span>
        <span>Total nilai: ${item.total}</span>
      </div>
      <div class="approval-actions">
        <button class="approve-btn" type="button" data-approve-index="${index}">Setujui</button>
        <button class="reject-btn" type="button" data-reject-index="${index}">Revisi</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.approve-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.approveIndex);
      const item = appState.approvalQueue[index];
      if (!item) return;

      const response = await authorizedFetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name })
      });

      if (response.ok) {
        await loadDashboard();
      }
    });
  });

  document.querySelectorAll('.reject-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.rejectIndex);
      const item = appState.approvalQueue[index];
      if (!item) return;

      const response = await authorizedFetch('/api/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name })
      });

      if (response.ok) {
        await loadDashboard();
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

  if (!status || !scanButton || !stopButton) return;

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
          status.textContent = `QR berhasil dipindai: ${team.name}. Lanjutkan dengan mengisi nilai.`;
          await stopQrScanner();
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      team: document.getElementById('scoreTeam').value,
      pos: document.getElementById('scorePos').value,
      values: [
        Number(document.getElementById('criteria1').value || 0),
        Number(document.getElementById('criteria2').value || 0),
        Number(document.getElementById('criteria3').value || 0),
        Number(document.getElementById('criteria4').value || 0)
      ]
    };

    const response = await authorizedFetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      await loadDashboard();
      form.reset();
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

bindTabs();
bindCategoryFilters();
bindLoginModal();
bindScoreForm();
bindScanActions();
bindTeamQrCodes();
bindManualOverride();
updateAccessState();
restoreSession();
loadDashboard();
