import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {Writable} from 'node:stream';
import {createInterface} from 'node:readline/promises';
import {projectRoot} from './environment.mjs';
import {databaseArgs} from './configuration.mjs';
import {hashPassword,validPassword} from '../lib/password.mjs';
const args=new Set(process.argv.slice(2));
if([...args].some(x=>!['--reset','--stdin-json','--remote'].includes(x)))throw new Error('Usage: npm run admin:create -- [--reset] [--remote]');
const targetArgs=databaseArgs(args.has('--remote'));
let input;
if(args.has('--stdin-json')){let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>4096)throw new Error('Input is too long.')}input=JSON.parse(raw)}
else{
 if(!process.stdin.isTTY)throw new Error('Run in an interactive terminal, or pass --stdin-json for automation.');
 let hidden=false;
 const output=new Writable({write(chunk,encoding,callback){if(!hidden)process.stdout.write(chunk);callback()}});
 const rl=createInterface({input:process.stdin,output,terminal:true});
 try{const name=await rl.question('Administrator name: '),email=await rl.question('Administrator email: ');process.stdout.write('Password (12–128 characters, hidden): ');hidden=true;const password=await rl.question('');hidden=false;process.stdout.write('\nConfirm password (hidden): ');hidden=true;const confirm=await rl.question('');hidden=false;process.stdout.write('\n');if(password!==confirm)throw new Error('Passwords do not match.');input={name,email,password}}finally{rl.close()}
}
const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase();
if(!name||name.length>100||email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Provide a name and valid email.');
if(!validPassword(input.password))throw new Error('Use a password of 12 to 128 characters.');
const quote=s=>"'"+String(s).replaceAll("'","''")+"'",hash=await hashPassword(input.password),now=new Date().toISOString();
const sql=`INSERT INTO auth_users (id,email,name,password_hash,is_admin,active,created_at) VALUES ('workspace-administrator',${quote(email)},${quote(name)},${quote(hash)},1,1,${quote(now)})${args.has('--reset')?' ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name,password_hash=excluded.password_hash,active=1':''};\nDELETE FROM auth_sessions WHERE user_id='workspace-administrator';`;
const dir=mkdtempSync(path.join(projectRoot,'.runtime/admin-')),file=path.join(dir,'setup.sql');
try{writeFileSync(file,sql,{mode:0o600});const result=spawnSync(process.execPath,[path.join(projectRoot,'node_modules/wrangler/bin/wrangler.js'),'d1','execute','DB',...targetArgs,'--file',file],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'true'}});if(result.error)throw result.error;if(result.status!==0){const output=String(result.stdout)+String(result.stderr);throw new Error(output.includes('UNIQUE')?'An administrator already exists. Use --reset only if you intend to replace its credentials.':'Administrator setup failed. Apply migrations to the selected database first and try again.')}console.log('Administrator account saved. Start the app and sign in with your email and password.')}finally{rmSync(dir,{recursive:true,force:true})}
