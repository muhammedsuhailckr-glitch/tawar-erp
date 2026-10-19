// Rebuild these contrast overrides after changing the inherited workspace styles.
// Document/print styles are intentionally excluded so bills remain white on paper.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const postcss=createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const files=['app/globals.css','app/dashboards.css','app/workspace-theme.css'];
function rgb(hex){let h=hex.slice(1);if(h.length===3||h.length===4)h=[...h].map(c=>c+c).join('');return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255,h.length===8?parseInt(h.slice(6),16)/255:1];}
function hsl([r,g,b]){const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;}return[h,s,l];}
function hsla(h,s,l,a=1){return `hsl(${Math.round(h)} ${Math.round(s*100)}% ${Math.round(l*100)}%${a<1?' / '+a.toFixed(2):''})`;}
function tone(hex,prop){const rgba=rgb(hex),[h,s,l]=hsl(rgba),alpha=rgba[3];if(alpha<.7)return hex;
 if(prop==='color'||prop==='fill'||prop==='stroke'){
  if(l>.78)return hex;
  if(s<.2)return l<.36?'#eeebf4':'#b6aec3';
  return hsla(h,Math.min(.76,Math.max(.4,s)),l<.42?.79:.74,alpha);
 }
 if(prop.includes('border')||prop.includes('outline')){
  if(l>.66)return '#443b53';
  if(s>.4)return hsla(h,s,.5,alpha);
  return '#665a76';
 }
 if(prop.includes('background')){
  if(l>.78){if(s>.18)return hsla(h,Math.min(.35,s),l>.92?.15:.19,alpha);return l>.94?'#211e29':'#2b2635';}
  return hex;
 }
 return hex;
}
function transform(node){
 if(node.type==='atrule'){
  if(node.name!=='media'&&node.name!=='supports')return null;
  const children=(node.nodes||[]).map(transform).filter(Boolean);if(!children.length)return null;return node.clone({nodes:children});
 }
 if(node.type!=='rule'||node.selector===':root'||node.selector.startsWith('@'))return null;
 const declarations=node.nodes.filter(d=>d.type==='decl'&&!d.prop.startsWith('--')&&/^(color|background.*|border.*|outline.*|fill|stroke)$/.test(d.prop)).map(d=>{
  const value=d.value.replace(/#[\da-f]{3,8}\b/gi,color=>tone(color,d.prop)).replace(/\bwhite\b/g,d.prop.includes('background')?'#211e29':'#fff').replace(/\bblack\b/g,d.prop==='color'?'#eeebf4':'#000');
  return value===d.value?null:d.clone({value});
 }).filter(Boolean);
 if(!declarations.length)return null;
 return node.clone({selector:node.selectors.map(selector=>`:root[data-theme="dark"] ${selector}`).join(', '),nodes:declarations});
}
const result=postcss.root();result.append(postcss.comment({text:'Generated dark colour overrides. Regenerate with node scripts/generate-dark-theme.mjs.'}));
for(const file of files){const root=postcss.parse(fs.readFileSync(file,'utf8'));for(const node of root.nodes){const next=transform(node);if(next)result.append(next);}}
fs.writeFileSync('app/dark-theme.css',result.toString()+'\n');
