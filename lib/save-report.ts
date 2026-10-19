import {Capacitor,registerPlugin} from '@/vendor/capacitor-core.mjs';
const downloads=registerPlugin<{save(options:{filename:string;mimeType:string;base64:string}):Promise<{saved?:boolean;cancelled?:boolean}>}>('ReportDownload');
export async function saveReport(blob:Blob,filename:string):Promise<string>{
 if(Capacitor.getPlatform()==='android'){
  if(!Capacitor.isPluginAvailable('ReportDownload'))throw new Error('Install the updated Android app to save reports, or open this website in Chrome and download there.');
  const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not prepare this file.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob)});
  const result=await downloads.save({filename,mimeType:blob.type.split(';')[0],base64});
  return result.cancelled?'Save cancelled.':result.saved?'Report saved to your selected location.':'File was not saved.';
 }
 const href=URL.createObjectURL(blob),link=document.createElement('a');link.href=href;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
 return 'Download requested. Check your browser Downloads.';
}
