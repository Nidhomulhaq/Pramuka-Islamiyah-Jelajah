require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { getDashboardData, saveDashboardData } = require('./lib/dataStore');
const scannerLibraryPath = require.resolve('html5-qrcode/html5-qrcode.min.js');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.get('/vendor/html5-qrcode.min.js', (req, res) => res.sendFile(scannerLibraryPath));
app.use(express.static(__dirname));

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
  }

  if (accounts.filter((account) => account.role === 'center').length !== 2 ||
      accounts.filter((account) => account.role === 'pos').length !== 4) {
    throw new Error('AUTH_ACCOUNTS must contain two center and four pos accounts.');
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
    return { username: payload.sub, role: payload.role };
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
      exp: Date.now() + 12 * 60 * 60 * 1000
    });
    res.json({
      token,
      user: { username: account.username, role: account.role }
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
  res.json(data);
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

app.post('/api/score', requireRole('pos'), asyncRoute(async (req, res) => {
  const { team, pos, values } = req.body || {};

  if (!team || !pos || !Array.isArray(values)) {
    return res.status(400).json({ error: 'Data tidak lengkap.' });
  }

  const data = await getDashboardData();
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  const posName = pos.split(' - ')[0];
  const posKey = `pos${posName.replace(/\D/g, '')}`;

  const scoreEntry = data.scores.find((item) => item.name === team);
  if (scoreEntry) {
    scoreEntry[posKey] = String(total);
    scoreEntry.total = String(total);
    scoreEntry.status = 'Menunggu Kurasi';
  }

  data.history.unshift({
    team,
    pos: posName,
    value: String(total),
    status: 'Menunggu Kurasi',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  data.approvalQueue.unshift({
    name: team,
    pos: posName,
    total: String(total),
    source: 'Panitia Pos Manual'
  });

  await saveDashboardData(data);
  res.json({ success: true, data: { team, pos: posName, total } });
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
