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
    teams: (Array.isArray(data.teams) ? data.teams : fallback.teams).map((team) => ({
      ...team,
      members: Array.isArray(team.members)
        ? team.members.filter((member) => typeof member === 'string')
        : []
    })),
    standings: data.standings && typeof data.standings === 'object' ? {
      Putra: Array.isArray(data.standings.Putra) ? data.standings.Putra : fallback.standings.Putra,
      Putri: Array.isArray(data.standings.Putri) ? data.standings.Putri : fallback.standings.Putri
    } : fallback.standings,
    scores: (Array.isArray(data.scores) ? data.scores : fallback.scores).map((score) => ({
      ...score,
      criteriaByPos: score.criteriaByPos && typeof score.criteriaByPos === 'object'
        ? score.criteriaByPos
        : {}
    })),
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
      criteriaByPos: {},
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

async function recordTeamScore({ teamName, pos, values, username }) {
  const client = await connectMongo();
  const collection = client
    .db(process.env.MONGODB_DB || 'jelajah_pramuka')
    .collection(process.env.MONGODB_COLLECTION || 'dashboard');
  const posName = `Pos ${pos}`;
  const posKey = `pos${pos}`;
  const scoreTotal = values.reduce((sum, value) => sum + value, 0);
  const historyEntry = {
    team: teamName,
    pos: posName,
    value: String(scoreTotal),
    status: 'Menunggu Kurasi',
    criteria: values,
    time: new Date().toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit'
    }),
    by: username
  };
  const queueEntry = {
    name: teamName,
    pos: posName,
    total: String(scoreTotal),
    criteria: values,
    source: 'Panitia Pos Manual'
  };
  const scoreField = (key) => ({
    $convert: { input: `$$updated.${key}`, to: 'double', onError: 0, onNull: 0 }
  });

  const result = await collection.updateOne(
    {
      teams: { $elemMatch: { name: teamName } },
      scores: { $elemMatch: { name: teamName } },
      history: { $not: { $elemMatch: { team: teamName, pos: posName } } }
    },
    [{
      $set: {
        scores: {
          $map: {
            input: '$scores',
            as: 'score',
            in: {
              $cond: [
                { $eq: ['$$score.name', { $literal: teamName }] },
                {
                  $let: {
                    vars: {
                      updated: {
                        $mergeObjects: [
                          '$$score',
                          {
                            [posKey]: { $literal: String(scoreTotal) },
                            criteriaByPos: {
                              $mergeObjects: [
                                { $ifNull: ['$$score.criteriaByPos', {}] },
                                { [posKey]: { $literal: values } }
                              ]
                            }
                          }
                        ]
                      }
                    },
                    in: {
                      $mergeObjects: [
                        '$$updated',
                        {
                          total: {
                            $toString: {
                              $add: ['pos1', 'pos2', 'pos3', 'pos4'].map(scoreField)
                            }
                          },
                          status: 'Menunggu Kurasi'
                        }
                      ]
                    }
                  }
                },
                '$$score'
              ]
            }
          }
        },
        history: {
          $concatArrays: [[{ $literal: historyEntry }], { $ifNull: ['$history', []] }]
        },
        approvalQueue: {
          $concatArrays: [[{ $literal: queueEntry }], { $ifNull: ['$approvalQueue', []] }]
        },
        updatedAt: '$$NOW'
      }
    }]
  );

  if (!result.matchedCount) {
    const data = await getDashboardData();
    if (!data.teams.some((item) => item.name === teamName)) {
      return { error: 'Regu tidak ditemukan.', status: 404 };
    }
    if (data.history.some((entry) => entry.team === teamName && entry.pos === posName)) {
      return { error: `${teamName} sudah menerima nilai dari ${posName}.`, status: 409 };
    }
    return { error: 'Nilai regu berubah saat diproses. Muat ulang lalu coba kembali.', status: 409 };
  }

  return {
    success: true,
    data: { team: teamName, pos: posName, total: scoreTotal }
  };
}

async function updatePendingTeamScore({ teamName, pos, values, username }) {
  const client = await connectMongo();
  const collection = client
    .db(process.env.MONGODB_DB || 'jelajah_pramuka')
    .collection(process.env.MONGODB_COLLECTION || 'dashboard');
  const posName = `Pos ${pos}`;
  const posKey = `pos${pos}`;
  const total = values.reduce((sum, value) => sum + value, 0);
  const updatedHistory = {
    value: String(total),
    criteria: values,
    editedBy: username,
    editedAt: new Date().toISOString()
  };
  const updatedQueue = {
    total: String(total),
    criteria: values,
    editedBy: username
  };
  const scoreField = (key) => ({
    $convert: { input: `$$updated.${key}`, to: 'double', onError: 0, onNull: 0 }
  });

  const result = await collection.updateOne(
    {
      scores: {
        $elemMatch: {
          name: teamName,
          status: 'Menunggu Kurasi',
          [`criteriaByPos.${posKey}`]: { $exists: true }
        }
      },
      history: { $elemMatch: { team: teamName, pos: posName } },
      approvalQueue: { $elemMatch: { name: teamName, pos: posName } }
    },
    [{
      $set: {
        scores: {
          $map: {
            input: '$scores',
            as: 'score',
            in: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$$score.name', { $literal: teamName }] },
                    { $eq: ['$$score.status', 'Menunggu Kurasi'] }
                  ]
                },
                {
                  $let: {
                    vars: {
                      updated: {
                        $mergeObjects: [
                          '$$score',
                          {
                            [posKey]: { $literal: String(total) },
                            criteriaByPos: {
                              $mergeObjects: [
                                { $ifNull: ['$$score.criteriaByPos', {}] },
                                { [posKey]: { $literal: values } }
                              ]
                            }
                          }
                        ]
                      }
                    },
                    in: {
                      $mergeObjects: [
                        '$$updated',
                        {
                          total: {
                            $toString: {
                              $add: ['pos1', 'pos2', 'pos3', 'pos4'].map(scoreField)
                            }
                          }
                        }
                      ]
                    }
                  }
                },
                '$$score'
              ]
            }
          }
        },
        history: {
          $map: {
            input: '$history',
            as: 'entry',
            in: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$$entry.team', { $literal: teamName }] },
                    { $eq: ['$$entry.pos', posName] }
                  ]
                },
                { $mergeObjects: ['$$entry', { $literal: updatedHistory }] },
                '$$entry'
              ]
            }
          }
        },
        approvalQueue: {
          $map: {
            input: '$approvalQueue',
            as: 'entry',
            in: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$$entry.name', { $literal: teamName }] },
                    { $eq: ['$$entry.pos', posName] }
                  ]
                },
                { $mergeObjects: ['$$entry', { $literal: updatedQueue }] },
                '$$entry'
              ]
            }
          }
        },
        updatedAt: '$$NOW'
      }
    }]
  );

  if (!result.matchedCount) {
    const data = await getDashboardData();
    const score = data.scores.find((item) => item.name === teamName);
    if (!score) return { error: 'Regu tidak ditemukan.', status: 404 };
    if (score.status !== 'Menunggu Kurasi' ||
        !Array.isArray(score.criteriaByPos?.[posKey]) ||
        !data.approvalQueue.some((item) => item.name === teamName && item.pos === posName)) {
      return {
        error: 'Nilai tidak dapat diedit. Nilai mungkin sudah dikurasi atau berasal dari data lama tanpa rincian kriteria.',
        status: 409
      };
    }
    return { error: 'Nilai berubah saat diedit. Muat ulang lalu coba kembali.', status: 409 };
  }

  return { success: true, data: { team: teamName, pos: posName, total } };
}

async function updateTeamDetails({ currentName, name, members }) {
  const client = await connectMongo();
  const collection = client
    .db(process.env.MONGODB_DB || 'jelajah_pramuka')
    .collection(process.env.MONGODB_COLLECTION || 'dashboard');
  const data = await getDashboardData();
  const team = data.teams.find((item) => item.name === currentName);
  if (!team) return { error: 'Regu tidak ditemukan.', status: 404 };

  const duplicateName = data.teams.some((item) =>
    item.name !== currentName && item.name.toLocaleLowerCase() === name.toLocaleLowerCase()
  );
  if (duplicateName) return { error: 'Nama regu sudah digunakan.', status: 409 };

  const literal = (value) => ({ $literal: value });
  const renameEntries = (input, field) => ({
    $map: {
      input: { $ifNull: [input, []] },
      as: 'entry',
      in: {
        $cond: [
          { $eq: [`$$entry.${field}`, literal(currentName)] },
          { $mergeObjects: ['$$entry', { [field]: literal(name) }] },
          '$$entry'
        ]
      }
    }
  });
  const update = await collection.updateOne(
    {
      teams: { $elemMatch: { name: currentName } },
      $expr: {
        $eq: [
          {
            $size: {
              $filter: {
                input: '$teams',
                as: 'team',
                cond: {
                  $and: [
                    { $ne: ['$$team.name', literal(currentName)] },
                    { $eq: [{ $toLower: '$$team.name' }, literal(name.toLocaleLowerCase())] }
                  ]
                }
              }
            }
          },
          0
        ]
      }
    },
    [{
      $set: {
        teams: {
          $map: {
            input: '$teams',
            as: 'team',
            in: {
              $cond: [
                { $eq: ['$$team.name', literal(currentName)] },
                { $mergeObjects: ['$$team', { name: literal(name), members: literal(members) }] },
                '$$team'
              ]
            }
          }
        },
        'standings.Putra': renameEntries('$standings.Putra', 'name'),
        'standings.Putri': renameEntries('$standings.Putri', 'name'),
        scores: renameEntries('$scores', 'name'),
        history: renameEntries('$history', 'team'),
        approvalQueue: renameEntries('$approvalQueue', 'name'),
        updatedAt: '$$NOW'
      }
    }]
  );

  if (!update.matchedCount) {
    return {
      error: 'Nama regu sudah digunakan atau datanya berubah. Muat ulang lalu coba kembali.',
      status: 409
    };
  }

  const updatedData = await getDashboardData();
  return { success: true, team: updatedData.teams.find((item) => item.name === name) };
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
  recordTeamScore,
  updatePendingTeamScore,
  updateTeamDetails,
  recordTeamCheckpoint
};
