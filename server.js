require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const {
  getDashboardData,
  recordTeamCheckpoint,
  recordTeamScore,
  resetScores,
  saveDashboardData,
  updateTeamDetails
} = require('./lib/dataStore');
const scannerLibraryPath = require.resolve('html5-qrcode/html5-qrcode.min.js');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.get('/vendor/html5-qrcode.min.js', (req, res) => res.sendFile(scannerLibraryPath));
app.use(express.static(__dirname));

function getAssignedPos(account) {
  if (account.role !== 'pos') return null;
  const configuredPos = account.pos ?? account.station;
  if (Number.isInteger(configuredPos)) return configuredPos;
  if (typeof configuredPos === 'string') {
    const configuredMatch = configuredPos.match(/(?:pos|station)\s*[-_]?\s*([1-4])/i);
    if (configuredMatch) return Number(configuredMatch[1]);
  }
  const usernameMatch = account.username.match(/(?:^|[-_ ])pos[-_ ]?([1-4])(?:$|[-_ ])/i);
  return usernameMatch ? Number(usernameMatch[1]) : null;
}

function getAuthAccounts() {
  let accounts;
  try {
    accounts = JSON.parse(process.env.AUTH_ACCOUNTS || '');
  } catch (error) {
    throw new Error('AUTH_ACCOUNTS must contain a valid JSON array.');
  }

  if (!Array.isArray(accounts) || accounts.length !== 6) {
    throw new Error('AUTH_ACCOUNTS must contain exactly six accounts.');
  }

  const usernames = new Set();
  for (const account of accounts) {
    if (
      !account ||
      typeof account.username !== 'string' ||
      typeof account.password !== 'string' ||
      !['pos', 'center'].includes(account.role) ||
      !account.username.trim() ||
      !account.password
    ) {
      throw new Error('Each AUTH_ACCOUNTS entry must have a username, password, and valid role.');
    }
    const username = account.username.toLowerCase();
    if (usernames.has(username)) throw new Error('AUTH_ACCOUNTS usernames must be unique.');
    usernames.add(username);
    if (account.role === 'pos') {
      account.stationPos = getAssignedPos(account);
      if (!account.stationPos || account.stationPos < 1 || account.stationPos > 4) {
        throw new Error('Each pos account must have a pos (1-4) or a username such as pos-1.');
      }
    }
  }

  if (accounts.filter((account) => account.role === 'center').length !== 2 ||
      accounts.filter((account) => account.role === 'pos').length !== 4) {
    throw new Error('AUTH_ACCOUNTS must contain two center and four pos accounts.');
  }
  const assignedPositions = accounts
    .filter((account) => account.role === 'pos')
    .map((account) => account.stationPos);
  if (new Set(assignedPositions).size !== 4) {
    throw new Error('Each pos account must be assigned a different position from 1 to 4.');
  }

  return accounts;
}

function getTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_TOKEN_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function signToken(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getTokenSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  const [encodedPayload, providedSignature, extra] = String(token || '').split('.');
  if (!encodedPayload || !providedSignature || extra) return null;

  const expectedSignature = crypto
    .createHmac('sha256', getTokenSecret())
    .update(encodedPayload)
    .digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(providedSignature, 'base64url');
  } catch (error) {
    return null;
  }
  if (
    actualSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(actualSignature, expectedSignature)
  ) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (typeof payload.sub !== 'string' || !['pos', 'center'].includes(payload.role) ||
        typeof payload.exp !== 'number' || payload.exp <= Date.now()) return null;
    if (payload.role === 'pos' &&
        (!Number.isInteger(payload.stationPos) || payload.stationPos < 1 || payload.stationPos > 4)) return null;
    return {
      username: payload.sub,
      role: payload.role,
      ...(payload.role === 'pos' ? { stationPos: payload.stationPos } : {})
    };
  } catch (error) {
    return null;
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    let user;
    try {
      const authorization = req.get('authorization') || '';
      const match = authorization.match(/^Bearer (.+)$/i);
      user = match ? verifyToken(match[1]) : null;
    } catch (error) {
      console.error('Authentication configuration error:', error.message);
      return res.status(503).json({ error: 'Autentikasi belum dikonfigurasi dengan benar.' });
    }

    if (!user) return res.status(401).json({ error: 'Silakan login kembali.' });
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Akun Anda tidak memiliki akses untuk tindakan ini.' });
    }
    req.user = user;
    next();
  };
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Jelajah API ready' });
});

app.post('/api/login', (req, res) => {
  try {
    const accounts = getAuthAccounts();
    const secret = getTokenSecret();
    const { username, password } = req.body || {};
    const account = accounts.find((item) =>
      item.username.toLowerCase() === String(username || '').trim().toLowerCase()
    );
    const provided = Buffer.from(String(password || ''));
    const expected = Buffer.from(account?.password || crypto.randomBytes(32));
    const passwordMatches = provided.length === expected.length &&
      crypto.timingSafeEqual(provided, expected);

    if (!account || !passwordMatches) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const token = signToken({
      sub: account.username,
      role: account.role,
      ...(account.role === 'pos' ? { stationPos: account.stationPos } : {}),
      exp: Date.now() + 12 * 60 * 60 * 1000
    });
    res.json({
      token,
      user: {
        username: account.username,
        role: account.role,
        ...(account.role === 'pos' ? { stationPos: account.stationPos } : {})
      }
    });
  } catch (error) {
    console.error('Login configuration error:', error.message);
    res.status(503).json({ error: 'Autentikasi belum dikonfigurasi. Hubungi administrator.' });
  }
});

app.get('/api/session', requireRole('pos', 'center'), (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/dashboard', asyncRoute(async (req, res) => {
  const data = await getDashboardData();
  res.set('Cache-Control', 'no-store');
  res.json(data);
}));

app.get('/api/pos-history', requireRole('pos'), asyncRoute(async (req, res) => {
  const data = await getDashboardData();
  const posName = `Pos ${req.user.stationPos}`;
  res.set('Cache-Control', 'private, no-store');
  res.json({
    history: data.history.filter((entry) => entry.pos === posName)
  });
}));

app.patch('/api/teams/details', requireRole('center'), asyncRoute(async (req, res) => {
  const { currentName, name, members } = req.body || {};
  if (
    typeof currentName !== 'string' ||
    !currentName.trim() ||
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 80 ||
    !Array.isArray(members) ||
    members.length > 100 ||
    members.some((member) => typeof member !== 'string' || !member.trim() || member.trim().length > 100)
  ) {
    return res.status(400).json({ error: 'Nama regu atau daftar anggota tidak valid.' });
  }

  const normalizedMembers = members.map((member) => member.trim());
  if (new Set(normalizedMembers.map((member) => member.toLocaleLowerCase())).size !== normalizedMembers.length) {
    return res.status(400).json({ error: 'Nama anggota tidak boleh duplikat.' });
  }

  const result = await updateTeamDetails({
    currentName: currentName.trim(),
    name: name.trim(),
    members: normalizedMembers
  });
  if (!result.success) return res.status(result.status).json({ error: result.error });
  res.json({ success: true, team: result.team, message: 'Data regu berhasil diperbarui.' });
}));

app.get('/api/team-qrs', requireRole('center'), async (req, res) => {
  try {
    const data = await getDashboardData();
    const teams = await Promise.all(data.teams.map(async (team) => ({
      name: team.name,
      category: team.category,
      qrCode: await QRCode.toDataURL(team.name, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 320
      })
    })));
    res.set('Cache-Control', 'private, no-store');
    res.json({ teams });
  } catch (error) {
    console.error('Team QR generation error:', error.message);
    res.status(500).json({ error: 'QR regu gagal dibuat. Silakan coba kembali.' });
  }
});

app.post('/api/checkpoint', requireRole('pos'), asyncRoute(async (req, res) => {
  const { team: teamName, pos, action } = req.body || {};
  const posNumber = Number(pos);
  if (!teamName || !Number.isInteger(posNumber) || posNumber < 1 || posNumber > 4 ||
      !['Masuk', 'Keluar'].includes(action)) {
    return res.status(400).json({ error: 'Regu, pos, atau jenis checkpoint tidak valid.' });
  }
  if (posNumber !== req.user.stationPos) {
    return res.status(403).json({ error: `Akun Anda hanya dapat memproses checkpoint Pos ${req.user.stationPos}.` });
  }

  const result = await recordTeamCheckpoint({
    teamName,
    pos: posNumber,
    action,
    username: req.user.username
  });
  if (!result.success) {
    return res.status(result.status).json({
      error: result.error,
      ...(result.nextCheckpoint ? { nextCheckpoint: result.nextCheckpoint } : {})
    });
  }
  res.json(result);
}));

app.post('/api/score', requireRole('pos'), asyncRoute(async (req, res) => {
  const { team, pos, values } = req.body || {};

  const posMatch = typeof pos === 'string' && pos.match(/^Pos\s*([1-4])(?:\s*-.*)?$/i);
  if (!team || !posMatch || !Array.isArray(values)) {
    return res.status(400).json({ error: 'Data tidak lengkap.' });
  }
  const posNumber = Number(posMatch[1]);
  if (posNumber !== req.user.stationPos) {
    return res.status(403).json({ error: `Akun Anda hanya dapat mengisi nilai Pos ${req.user.stationPos}.` });
  }
  const criteriaCountByPosition = { 1: 4, 2: 3, 3: 4, 4: 3 };
  if (
    values.length !== criteriaCountByPosition[posNumber] ||
    values.some((value) => !Number.isFinite(value) || value < 1 || value > 100)
  ) {
    return res.status(400).json({
      error: `Nilai Pos ${posNumber} harus berisi ${criteriaCountByPosition[posNumber]} kriteria dengan skor 1 sampai 100.`
    });
  }

  const result = await recordTeamScore({
    teamName: team,
    pos: posNumber,
    values,
    username: req.user.username
  });
  if (!result.success) return res.status(result.status).json({ error: result.error });
  res.json({ success: true, data: result.data });
}));

app.post('/api/approve', requireRole('center'), asyncRoute(async (req, res) => {
  const { name } = req.body || {};
  const data = await getDashboardData();

  data.scores = data.scores.map((item) =>
    item.name === name ? { ...item, status: 'Approved' } : item
  );

  data.standings.Putra = data.standings.Putra.map((item) =>
    item.name === name ? { ...item, status: 'Approved' } : item
  );

  data.standings.Putri = data.standings.Putri.map((item) =>
    item.name === name ? { ...item, status: 'Approved' } : item
  );

  data.approvalQueue = data.approvalQueue.filter((item) => item.name !== name);
  await saveDashboardData(data);

  res.json({ success: true, message: `${name} telah disetujui.` });
}));

app.post('/api/revise', requireRole('center'), asyncRoute(async (req, res) => {
  const { name } = req.body || {};
  const data = await getDashboardData();

  data.scores = data.scores.map((item) =>
    item.name === name ? { ...item, status: 'Menunggu Kurasi' } : item
  );

  data.standings.Putra = data.standings.Putra.map((item) =>
    item.name === name ? { ...item, status: 'Menunggu Kurasi' } : item
  );

  data.standings.Putri = data.standings.Putri.map((item) =>
    item.name === name ? { ...item, status: 'Menunggu Kurasi' } : item
  );

  data.approvalQueue = data.approvalQueue.filter((item) => item.name !== name);
  await saveDashboardData(data);

  res.json({ success: true, message: `${name} dikembalikan untuk revisi.` });
}));

app.post('/api/reset-scores', requireRole('center'), asyncRoute(async (req, res) => {
  const data = await getDashboardData();
  const resetData = resetScores(data);
  await saveDashboardData(resetData);
  res.json({ success: true, message: 'Nilai, status perjalanan, riwayat input, dan antrean kurasi seluruh regu telah direset.' });
}));

app.use((error, req, res, next) => {
  console.error('API request failed:', error.message);
  if (res.headersSent) return next(error);
  res.status(503).json({
    error: 'Database MongoDB tidak tersedia. Data tidak dibaca atau disimpan secara lokal.'
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Jelajah API running at http://localhost:${PORT}`);
  });
}

module.exports = app;
