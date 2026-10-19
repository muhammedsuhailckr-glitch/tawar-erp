import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {projectRoot} from './environment.mjs';
import {runtimeConfig} from './configuration.mjs';

const [command, ...extra] = process.argv.slice(2);
if (!['build', 'check', 'deploy'].includes(command) || extra.length) {
  throw new Error('Use npm run build:production, npm run deploy:check, or npm run deploy.');
}
runtimeConfig(true);
function run(args, env = process.env) {
  const result = spawnSync(process.execPath, args, {cwd: projectRoot, stdio: 'inherit', env});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(['scripts/framework.mjs', 'build'], {...process.env, TAWAR_TARGET: 'production'});
if (command !== 'build') {
  run([
    path.join(projectRoot, 'node_modules/wrangler/bin/wrangler.js'),
    'deploy', '--config', path.join(projectRoot, 'dist/server/wrangler.json'),
    ...(command === 'check' ? ['--dry-run'] : []),
  ]);
}
