const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(__dirname));

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Jelajah API ready' });
});

app.get('/api/dashboard', (req, res) => {
  res.json(readData());
});

app.post('/api/score', (req, res) => {
  const { team, pos, values } = req.body || {};

  if (!team || !pos || !Array.isArray(values)) {
    return res.status(400).json({ error: 'Data tidak lengkap.' });
  }

  const data = readData();
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

  writeData(data);
  res.json({ success: true, data: { team, pos: posName, total } });
});

app.post('/api/approve', (req, res) => {
  const { name } = req.body || {};
  const data = readData();

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
  writeData(data);

  res.json({ success: true, message: `${name} telah disetujui.` });
});

app.post('/api/revise', (req, res) => {
  const { name } = req.body || {};
  const data = readData();

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
  writeData(data);

  res.json({ success: true, message: `${name} dikembalikan untuk revisi.` });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Jelajah API running at http://localhost:${PORT}`);
});
