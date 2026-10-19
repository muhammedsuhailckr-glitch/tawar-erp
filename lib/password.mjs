const ITERATIONS=100000;
const encode=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export function validPassword(password){return typeof password==='string'&&password.length>=12&&password.length<=128}
export async function hashPassword(password){
 if(!validPassword(password))throw new Error('Use a password of 12 to 128 characters.');
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},key,256);
 return `pbkdf2_sha256$${ITERATIONS}$${encode(salt)}$${encode(bits)}`;
}
export async function verifyPassword(password,stored){
 if(typeof password!=='string'||password.length>128)return false;
 try{
  const [algorithm,count,saltText,expectedText,...extra]=stored.split('$');
  if(algorithm!=='pbkdf2_sha256'||Number(count)!==ITERATIONS||extra.length)return false;
  const salt=decode(saltText),expected=decode(expectedText);if(salt.length!==16||expected.length!==32)return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const actual=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},key,256));
  let difference=0;for(let i=0;i<expected.length;i++)difference|=actual[i]^expected[i];return difference===0;
 }catch{return false}
}
export async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}
export function secretToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')}
