require('dotenv').config();

const express = require('express');
const path = require('path');
const { getDashboardData, saveDashboardData } = require('./lib/dataStore');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Jelajah API ready' });
});

app.get('/api/dashboard', async (req, res) => {
  const data = await getDashboardData();
  res.json(data);
});

app.post('/api/score', async (req, res) => {
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
});

app.post('/api/approve', async (req, res) => {
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
});

app.post('/api/revise', async (req, res) => {
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
