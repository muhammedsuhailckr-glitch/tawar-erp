import './environment.mjs';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2).filter(v=>v!=='--');let port='5173';
if(args.length){if(args.length!==2||args[0]!=='--port')throw new Error('Usage: npm run dev -- --port 5173');port=args[1]}
if(!/^\d+$/.test(port)||Number(port)<1024||Number(port)>65535)throw new Error('Choose a port from 1024 to 65535.');
const launcher=fileURLToPath(new URL('./framework.mjs',import.meta.url));
process.argv=[process.execPath,launcher,'dev','--hostname','127.0.0.1','--port',port];
await import('./framework.mjs');
