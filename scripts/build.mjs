import { mkdir,readFile,writeFile,rm,copyFile,stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { FISH } from '../src/catalog.js';
const root=new URL('../',import.meta.url);
process.chdir(root.pathname);
await rm('dist',{recursive:true,force:true});
await mkdir('dist/assets/fish',{recursive:true});
await mkdir('dist/assets/thumbs',{recursive:true});
const report={models:[],source:'https://cda-social.github.io/fish/kit/fish-kit.zip',format:'local glTF scripts with separate texture files'};
for(const fish of FISH) {
  let source=`assets/${fish.file}_lo.glb`;
  try { await stat(source); } catch { source=`assets/${fish.file}.glb`; }
  const glb=await readFile(source);
  if(glb.readUInt32LE(0)!==0x46546c67) throw new Error(source+' invalid GLB');
  const jsonSize=glb.readUInt32LE(12);
  const gltf=JSON.parse(glb.subarray(20,20+jsonSize).toString());
  const binary=glb.subarray(28+jsonSize);
  const views=gltf.bufferViews;
  const imageViews=new Set();
  for(let i=0;i<(gltf.images||[]).length;i++) {
    const img=gltf.images[i],view=views[img.bufferView]; imageViews.add(img.bufferView);
    const extension=img.mimeType==='image/png'?'png':img.mimeType==='image/webp'?'webp':'jpg';
    const file=`${fish.file}_texture_${i}.${extension}`;
    await writeFile('dist/assets/fish/'+file,binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength));
    gltf.images[i]={uri:file};
  }
  // Remap geometry views to a compact buffer, keeping 4-byte alignment.
  const chunks=[];let offset=0;
  for(let i=0;i<views.length;i++) {
    const v=views[i];
    if(imageViews.has(i)) { v.byteOffset=0;v.byteLength=4;continue; }
    const bytes=binary.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
    v.byteOffset=offset;chunks.push(bytes);offset+=bytes.length;
    const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}
  }
  const geometry=Buffer.concat(chunks);
  if(geometry.length>1048576) throw new Error('Geometry exceeds per-asset limit');
  gltf.buffers=[{byteLength:geometry.length}];
  const payload={gltf,buffers:[geometry.toString('base64')]};
  await writeFile(`dist/assets/fish/${fish.file}.js`,`window.__moyuModels[${JSON.stringify(fish.file)}]=${JSON.stringify(payload)};\n`);
  for(const kind of ['head','cover']) {
    try { await copyFile(`assets/thumbs/${fish.file}_${kind}.webp`,`dist/assets/fish/${fish.file}_${kind}.webp`); }
    catch { if(fish.id!=='katakuchi') throw new Error('Missing photo '+fish.file); }
  }
  for (const kind of ['head','cover']) {
    try { await copyFile(`assets/thumbs/${fish.file}_${kind}.webp`,`dist/assets/thumbs/${fish.file}_${kind}.webp`); }
    catch { if (fish.id !== 'katakuchi') throw new Error('Missing thumbnail '+fish.file+'_'+kind); }
  }
  report.models.push({id:fish.id,source,geometryBytes:geometry.length});
}
await build({entryPoints:['src/main.js'],bundle:true,format:'iife',target:['chrome61','safari12'],supported:{'destructuring':true},outfile:'dist/app.js',minify:true,legalComments:'none',logLevel:'warning'});
await copyFile('index.html','dist/index.html');await copyFile('src/style.css','dist/style.css');
const notices=(await readFile('licenses/fish-kit.txt','utf8'))+'\n'+(await readFile('licenses/three.txt','utf8'));
await writeFile('dist/licenses.json',JSON.stringify({notices}));
await rm('moyu-mini.zip',{force:true});
execFileSync('zip',['-qr','../moyu-mini.zip','.'],{cwd:'dist'});
report.zipBytes=(await stat('moyu-mini.zip')).size;
if(report.zipBytes>10*1048576) throw new Error('ZIP exceeds 10 MiB');
await mkdir('qa',{recursive:true});await writeFile('qa/build-report.json',JSON.stringify(report,null,2));
console.log('Built moyu-mini.zip', (report.zipBytes/1048576).toFixed(2),'MiB');
