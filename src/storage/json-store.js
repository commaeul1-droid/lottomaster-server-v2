import fs from 'node:fs/promises';
import { DRAWS_PATH, LATEST_PATH, STATUS_PATH } from '../lib/constants.js';

export async function writeDataFiles(rows, latest, status) {
  const updatedAt = new Date().toISOString();
  await Promise.all([
    writeJson(LATEST_PATH, { schemaVersion: 2, updatedAt, latest }),
    writeJson(DRAWS_PATH, { schemaVersion: 2, updatedAt, latestRound: latest.round, count: rows.length, draws: [...rows].reverse() }),
    writeJson(STATUS_PATH, { schemaVersion: 2, updatedAt, ...status, latestRound: latest.round }),
  ]);
}

export async function writeStatus(status) {
  await writeJson(STATUS_PATH, { schemaVersion: 2, updatedAt: new Date().toISOString(), ...status });
}

async function writeJson(path, value) {
  await fs.writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
