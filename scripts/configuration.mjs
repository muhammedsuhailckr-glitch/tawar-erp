import {readFileSync} from 'node:fs';
import path from 'node:path';
import {projectRoot} from './environment.mjs';

export function runtimeConfig(remote = false) {
  const configPath = path.join(projectRoot, 'config', remote ? 'production.json' : 'runtime.json');
  let config;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    if (remote && error.code === 'ENOENT') {
      throw new Error('Copy config/production.example.json to config/production.json and enter your own resource identifiers. See docs/DEPLOYMENT.md.');
    }
    throw error;
  }
  if (remote) {
    const db = config.d1_databases?.find(item => item.binding === 'DB');
    const bucket = config.r2_buckets?.find(item => item.binding === 'BUCKET');
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(config.name ?? '') || !db?.database_name ||
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(db?.database_id ?? '') ||
        db.database_id === '00000000-0000-4000-8000-000000000000' || (bucket && !bucket.bucket_name)) {
      throw new Error('Set a valid Worker name and your D1 database name/UUID in config/production.json. If adding R2, also set its bucket name.');
    }
  }
  return {config, configPath};
}

export function databaseArgs(remote = false) {
  const {configPath} = runtimeConfig(remote);
  return remote
    ? ['--remote', '--config', configPath]
    : ['--local', '--config', configPath, '--persist-to', path.join(projectRoot, '.wrangler/state')];
}
