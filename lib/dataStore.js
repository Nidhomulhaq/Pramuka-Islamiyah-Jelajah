const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function readInitialData() {
  if (!fs.existsSync(DATA_FILE)) return defaultSeedData();
  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Existing data.json is not a valid dashboard data object.');
  }
  return normalizeData(parsed);
}

function defaultSeedData() {
  return {
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
        { name: 'Regu Kupu-Kupu', score: 887, status: 'Approved' },
        { name: 'Regu Tokek', score: 868, status: 'Approved' },
        { name: 'Regu Jerapah', score: 841, status: 'Approved' }
      ],
      Putri: [
        { name: 'Regu Anggrek', score: 915, status: 'Approved' },
        { name: 'Regu Kamboja', score: 904, status: 'Approved' },
        { name: 'Regu Kenikir', score: 891, status: 'Approved' },
        { name: 'Regu Lavender', score: 876, status: 'Approved' },
        { name: 'Regu Pompom', score: 853, status: 'Approved' }
      ]
    },
    scores: [
      { name: 'Regu Bebek', pos1: '92', pos2: '95', pos3: '90', pos4: '92', total: '369', status: 'Approved' },
      { name: 'Regu Kupu-Kupu', pos1: '88', pos2: '90', pos3: '85', pos4: 'Menunggu Kurasi', total: '263', status: 'Approved' },
      { name: 'Regu Garuda', pos1: '94', pos2: '91', pos3: '92', pos4: '89', total: '366', status: 'Approved' },
      { name: 'Regu Tokek', pos1: '86', pos2: '84', pos3: '88', pos4: '90', total: '348', status: 'Approved' },
      { name: 'Regu Jerapah', pos1: '82', pos2: '83', pos3: '87', pos4: '84', total: '336', status: 'Approved' },
      { name: 'Regu Kamboja', pos1: '90', pos2: '94', pos3: '91', pos4: '92', total: '367', status: 'Approved' },
      { name: 'Regu Anggrek', pos1: '89', pos2: '93', pos3: '90', pos4: '89', total: '361', status: 'Approved' },
      { name: 'Regu Pompom', pos1: '84', pos2: '87', pos3: '88', pos4: '86', total: '345', status: 'Approved' },
      { name: 'Regu Lavender', pos1: '85', pos2: '88', pos3: '89', pos4: '83', total: '345', status: 'Approved' },
      { name: 'Regu Kenikir', pos1: '86', pos2: '90', pos3: '87', pos4: 'Menunggu Kurasi', total: '263', status: 'Approved' }
    ],
    history: [
      { team: 'Regu Bebek', pos: 'Pos 2', value: '93', status: 'Approved', time: '08:40' },
      { team: 'Regu Anggrek', pos: 'Pos 1', value: '89', status: 'Approved', time: '08:25' },
      { team: 'Regu Kenikir', pos: 'Pos 4', value: '86', status: 'Menunggu Kurasi', time: '08:12' },
      { team: 'Regu Kupu-Kupu', pos: 'Pos 3', value: '87', status: 'Menunggu Kurasi', time: '08:08' }
    ],
    approvalQueue: []
  };
}

function normalizeData(data) {
  const fallback = defaultSeedData();
  if (!data || typeof data !== 'object') return fallback;

  return {
    teams: Array.isArray(data.teams) ? data.teams : fallback.teams,
    standings: data.standings && typeof data.standings === 'object' ? {
      Putra: Array.isArray(data.standings.Putra) ? data.standings.Putra : fallback.standings.Putra,
      Putri: Array.isArray(data.standings.Putri) ? data.standings.Putri : fallback.standings.Putri
    } : fallback.standings,
    scores: Array.isArray(data.scores) ? data.scores : fallback.scores,
    history: Array.isArray(data.history) ? data.history : fallback.history,
    approvalQueue: Array.isArray(data.approvalQueue) ? data.approvalQueue : fallback.approvalQueue
  };
}

function resetScores(data) {
  const resetStatus = 'Belum Dinilai';
  return {
    ...data,
    teams: data.teams.map((team) => ({
      ...team,
      location: 'Menunggu',
      status: 'Menunggu check-in Pos 1',
      badge: 'status-pending',
      journeyCheckpoints: []
    })),
    standings: {
      Putra: data.standings.Putra.map((team) => ({ ...team, score: 0, status: resetStatus })),
      Putri: data.standings.Putri.map((team) => ({ ...team, score: 0, status: resetStatus }))
    },
    scores: data.scores.map((team) => ({
      ...team,
      pos1: '-',
      pos2: '-',
      pos3: '-',
      pos4: '-',
      total: '0',
      status: resetStatus
    })),
    history: [],
    approvalQueue: []
  };
}

let mongoClient = null;
let mongoReady = null;

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required. Local storage fallback is disabled.');
  }

  if (!mongoReady) {
    mongoReady = (async () => {
      mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      return mongoClient;
    })();
    mongoReady.catch(() => {
      mongoReady = null;
      mongoClient = null;
    });
  }

  return mongoReady;
}

async function getDashboardData() {
  const client = await connectMongo();
  const db = client.db(process.env.MONGODB_DB || 'jelajah_pramuka');
  const collection = db.collection(process.env.MONGODB_COLLECTION || 'dashboard');
  let document = await collection.findOne({});

  if (!document) {
    const initialData = readInitialData();
    try {
      await collection.insertOne({ _id: 'dashboard', ...initialData, updatedAt: new Date() });
      return initialData;
    } catch (error) {
      if (error.code !== 11000) throw error;
      document = await collection.findOne({});
      if (!document) throw error;
    }
  }

  const { _id, updatedAt, ...data } = document;
  return normalizeData(data);
}

async function saveDashboardData(data) {
  const client = await connectMongo();
  const db = client.db(process.env.MONGODB_DB || 'jelajah_pramuka');
  const collection = db.collection(process.env.MONGODB_COLLECTION || 'dashboard');
  const normalized = normalizeData(data);
  await collection.updateOne(
    {},
    { $set: { ...normalized, updatedAt: new Date() } },
    { upsert: true }
  );
  return normalized;
}

async function recordTeamCheckpoint({ teamName, pos, action, username }) {
  const client = await connectMongo();
  const collection = client
    .db(process.env.MONGODB_DB || 'jelajah_pramuka')
    .collection(process.env.MONGODB_COLLECTION || 'dashboard');
  const data = await getDashboardData();
  const team = data.teams.find((item) => item.name === teamName);
  if (!team) return { error: 'Regu tidak ditemukan.', status: 404 };

  const checkpoints = Array.isArray(team.journeyCheckpoints) ? team.journeyCheckpoints : [];
  if (checkpoints.length >= 8) {
    return { error: `${team.name} sudah menyelesaikan seluruh checkpoint hingga finish.`, status: 409 };
  }

  const expectedPos = Math.floor(checkpoints.length / 2) + 1;
  const expectedAction = checkpoints.length % 2 === 0 ? 'Masuk' : 'Keluar';
  if (pos !== expectedPos || action !== expectedAction) {
    return {
      error: `Urutan checkpoint belum sesuai. ${team.name} harus check ${expectedAction.toLowerCase()} Pos ${expectedPos} terlebih dahulu.`,
      status: 409,
      nextCheckpoint: { pos: expectedPos, action: expectedAction }
    };
  }

  const checkpoint = { pos, action, time: new Date().toISOString(), by: username };
  let location;
  let status;
  let badge;
  if (action === 'Masuk') {
    location = `Pos ${pos}`;
    status = `Check-in Pos ${pos}`;
    badge = 'status-live';
  } else if (pos === 4) {
    location = 'Finish';
    status = 'Selesai (Finish)';
    badge = 'status-finish';
  } else {
    location = `Perjalanan ke Pos ${pos + 1}`;
    status = `Menuju Pos ${pos + 1}`;
    badge = 'status-pending';
  }

  const teamMatch = checkpoints.length
    ? { name: teamName, journeyCheckpoints: checkpoints }
    : {
        name: teamName,
        $or: [
          { journeyCheckpoints: [] },
          { journeyCheckpoints: { $exists: false } }
        ]
      };
  const result = await collection.updateOne(
    { teams: { $elemMatch: teamMatch } },
    {
      $set: {
        'teams.$.location': location,
        'teams.$.status': status,
        'teams.$.badge': badge
      },
      $push: { 'teams.$.journeyCheckpoints': checkpoint },
      $currentDate: { updatedAt: true }
    }
  );

  if (!result.matchedCount) {
    const latestData = await getDashboardData();
    const latestTeam = latestData.teams.find((item) => item.name === teamName);
    const latestCheckpoints = latestTeam?.journeyCheckpoints || [];
    const nextCheckpoint = latestCheckpoints.length < 8
      ? {
          pos: Math.floor(latestCheckpoints.length / 2) + 1,
          action: latestCheckpoints.length % 2 === 0 ? 'Masuk' : 'Keluar'
        }
      : null;
    return {
      error: 'Checkpoint regu berubah saat diproses. Periksa checkpoint berikutnya lalu coba kembali.',
      status: 409,
      nextCheckpoint
    };
  }

  const nextIndex = checkpoints.length + 1;
  return {
    success: true,
    message: `${teamName} berhasil check ${action.toLowerCase()} di ${pos === 4 && action === 'Keluar' ? 'Finish' : `Pos ${pos}`}.`,
    team: { name: teamName, location, status, badge },
    nextCheckpoint: nextIndex < 8
      ? { pos: Math.floor(nextIndex / 2) + 1, action: nextIndex % 2 === 0 ? 'Masuk' : 'Keluar' }
      : null
  };
}

module.exports = {
  defaultSeedData,
  normalizeData,
  resetScores,
  getDashboardData,
  saveDashboardData,
  recordTeamCheckpoint
};
