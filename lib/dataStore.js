const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function readLocalData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : defaultSeedData();
  } catch (error) {
    return defaultSeedData();
  }
}

function writeLocalData(data) {
  const normalized = normalizeData(data);
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalized, null, 2));
  return normalized;
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

let mongoClient = null;
let mongoReady = null;

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (!mongoReady) {
    mongoReady = (async () => {
      mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      return mongoClient;
    })();
  }

  return mongoReady;
}

async function getDashboardData() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return readLocalData();

  try {
    const client = await connectMongo();
    if (!client) return readLocalData();

    const db = client.db(process.env.MONGODB_DB || 'jelajah_pramuka');
    const collection = db.collection(process.env.MONGODB_COLLECTION || 'dashboard');
    const document = await collection.findOne({});

    if (document) {
      const { _id, updatedAt, ...rest } = document;
      return normalizeData(rest);
    }

    const seed = readLocalData();
    await collection.updateOne({}, { $set: { ...seed, updatedAt: new Date() } }, { upsert: true });
    return seed;
  } catch (error) {
    console.warn('MongoDB fallback activated:', error.message);
    return readLocalData();
  }
}

async function saveDashboardData(data) {
  const normalized = normalizeData(data);
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return writeLocalData(normalized);
  }

  try {
    const client = await connectMongo();
    if (!client) return writeLocalData(normalized);

    const db = client.db(process.env.MONGODB_DB || 'jelajah_pramuka');
    const collection = db.collection(process.env.MONGODB_COLLECTION || 'dashboard');
    const result = await collection.updateOne(
      {},
      { $set: { ...normalized, updatedAt: new Date() } },
      { upsert: true }
    );

    if (result && result.upsertedId) {
      return normalized;
    }

    return normalized;
  } catch (error) {
    console.warn('MongoDB write fallback activated:', error.message);
    return writeLocalData(normalized);
  }
}

module.exports = {
  defaultSeedData,
  normalizeData,
  readLocalData,
  writeLocalData,
  getDashboardData,
  saveDashboardData
};
