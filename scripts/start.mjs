import {spawn} from 'node:child_process';
import path from 'node:path';
import {projectRoot} from './environment.mjs';
const child=spawn(process.execPath,[path.join(projectRoot,'node_modules/wrangler/bin/wrangler.js'),'dev','--config',path.join(projectRoot,'dist/server/wrangler.json'),'--local','--persist-to',path.join(projectRoot,'.wrangler/state'),'--ip','127.0.0.1','--port','5173','--inspector-port','0'],{cwd:projectRoot,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.once('error',error=>{console.error(error.message);process.exitCode=1});
child.once('exit',code=>{process.exitCode=code??0});
