import './polyfills.js';
import {FISH,MOTIONS} from './catalog.js';
import {FishViewer} from './viewer.js';
import {DailyClock,dayKey,formatTime} from './time.js';
import {Platform} from './platform.js';
const $=id=>document.getElementById(id);
const platform=new Platform();let clock=new DailyClock(null),selected=0,view=null,rotated=false,visible=!document.hidden,modalReturn=null,shareData=null;
let toastTimer,tickTimer,saveBusy=false,publishing=false;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function thumbnail(fish){return './assets/thumbs/'+fish.file+'_head.webp';}
const placeholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="130" viewBox="0 0 300 130"><path d="M55 67Q125 7 222 65Q132 124 55 67L25 32V100Z" fill="#a5c3c4"/><circle cx="197" cy="58" r="4" fill="#385c66"/><path d="M168 41Q154 65 171 90" fill="none" stroke="#648f95" stroke-width="2"/></svg>');
function fallbackImage(img){img.addEventListener('error',()=>{if(img.src!==placeholder)img.src=placeholder;});}
function makeGallery(){
  FISH.forEach((fish,index)=>{
    const button=document.createElement('button');button.className='fish-card';button.dataset.fish=fish.id;button.setAttribute('aria-label','查看'+fish.name);
    const number=document.createElement('span');number.className='ordinal';number.textContent=String(index+1).padStart(2,'0');
    const images=document.createElement('span');images.className='fish-images';
    const img=document.createElement('img');img.alt='';
    const cover=document.createElement('img');cover.alt='';cover.className='fish-cover';
    let imageFailed=false;
    const showPlaceholder=()=>{if(imageFailed)return;imageFailed=true;cover.hidden=true;img.src=placeholder;};
    img.addEventListener('error',showPlaceholder);cover.addEventListener('error',showPlaceholder);
    images.append(img,cover);img.src=thumbnail(fish);cover.src='./assets/thumbs/'+fish.file+'_cover.webp';
    const name=document.createElement('strong');name.textContent=fish.name;
    const arrow=document.createElement('span');arrow.className='card-arrow';arrow.textContent='↗';
    button.append(number,images,name,arrow);button.addEventListener('click',()=>openFish(index));$('fish-list').appendChild(button);
  });
  MOTIONS.forEach(m=>{
    const button=document.createElement('button');button.className='motion-button';button.dataset.motion=m.id;button.setAttribute('aria-pressed',String(m.id==='swim'));
    const icon=document.createElement('span');icon.textContent=m.symbol;icon.setAttribute('aria-hidden','true');button.appendChild(icon);button.appendChild(document.createTextNode(m.name));
    button.addEventListener('click',()=>{
      if(view?.failed){toast('当前为静态预览，无法切换动作');return;}
      document.querySelectorAll('.motion-button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      view?.setMotion(m.id);$('motion-hint').textContent=m.hint;
    });$('motions').appendChild(button);
  });
}
let nativeInsets=null;
function resize(){
  const w=window.innerWidth,h=window.innerHeight;rotated=false;
  const logicalW=rotated?h:w,logicalH=rotated?w:h;
  const app=$('app');app.style.width=logicalW+'px';app.style.height=logicalH+'px';app.style.transform=rotated?`translateX(${w}px) rotate(90deg)`:'none';
  app.classList.toggle('compact',logicalH<520);
  const css=getComputedStyle($('safe-probe'));let s=nativeInsets||{top:parseFloat(css.paddingTop)||0,right:parseFloat(css.paddingRight)||0,bottom:parseFloat(css.paddingBottom)||0,left:parseFloat(css.paddingLeft)||0};
  if(rotated)s={top:s.right,right:s.bottom,bottom:s.left,left:s.top};
  app.style.padding=`${Math.max(10,s.top+8)}px ${Math.max(logicalH<520?20:32,s.right+12)}px ${Math.max(10,s.bottom+6)}px ${Math.max(logicalH<520?20:32,s.left+12)}px`;
  view?.resize();
}
async function windowInfo(){
  if(!platform.supports('getWindowInfo',9490))return;
  try {
    const info=await platform.call('getWindowInfo',{}),safe=info.safeArea;
    if(safe)nativeInsets={left:Math.max(0,safe.left),top:Math.max(0,safe.top),right:Math.max(0,info.windowWidth-safe.right),bottom:Math.max(0,info.windowHeight-safe.bottom)};
    // Reserve the native controls' top strip before rotating the content.
    const buttons=Object.values(info.menuButtons||{}).filter(Boolean);
    if(buttons.length) {nativeInsets=nativeInsets||{left:0,top:0,right:0,bottom:0};nativeInsets.top=Math.max(nativeInsets.top,...buttons.map(b=>b.bottom));}
    resize();
  }catch{}
}
let loadingTimer;
function clearLoading(){clearTimeout(loadingTimer);loadingTimer=null;if ($('load-message').textContent==='正在请这条鱼过来…') $('load-state').hidden=true;}
function status(message,fallback=false,retry=false){
  clearLoading();
  const loading=message==='正在请这条鱼过来…';
  $('load-message').textContent=message;$('retry').hidden=!retry;
  $('load-state').hidden=!message || loading;
  if(loading) loadingTimer=setTimeout(()=>{loadingTimer=null;$('load-state').hidden=false;},300);
  $('fallback-image').hidden=!fallback;$('scene').hidden=fallback;
  if(fallback){$('fallback-image').src=thumbnail(FISH[selected]);document.querySelectorAll('.motion-button').forEach(b=>b.disabled=true);}
}
function openFish(index){
  if(view?.busy) clearLoading();
  selected=(index+FISH.length)%FISH.length;const fish=FISH[selected];
  if(view) view.setMotion('swim');
  document.querySelectorAll('.motion-button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.motion==='swim')));
  $('motion-hint').textContent=MOTIONS.find(m=>m.id==='swim').hint;
  $('gallery').hidden=true;$('viewer').hidden=false;
  $('fish-name').textContent=fish.name;
  $('fish-number').textContent='海洋朋友 / '+String(selected+1).padStart(2,'0');
  if(!view){view=new FishViewer($('scene'),status);bindGestures();}
  view.setEnabled(true);resize();view.select(fish);
  if(view.failed)status('当前设备使用静态预览',true);
}
function home(){
  clearLoading();
  $('gallery').hidden=false;$('viewer').hidden=true;
  view?.finishTransition();view?.setEnabled(false);closeModal();resize();
}
function bindGestures(){
  const points=new Map();let lastDistance=0;
  const point=e=>rotated?{x:e.clientY,y:window.innerWidth-e.clientX}:{x:e.clientX,y:e.clientY};
  const stage=$('stage');
  stage.addEventListener('pointerdown',e=>{points.set(e.pointerId,point(e));stage.setPointerCapture?.(e.pointerId);lastDistance=0;});
  stage.addEventListener('pointermove',e=>{
    const old=points.get(e.pointerId);if(!old)return;const next=point(e);points.set(e.pointerId,next);
    if(points.size===1)view.rotate(next.x-old.x,next.y-old.y);
    else {const p=Array.from(points.values()),d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(lastDistance>0)view.scale(d/lastDistance);lastDistance=d;}
  });
  const end=e=>{points.delete(e.pointerId);lastDistance=0;};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('lostpointercapture',end);
  stage.addEventListener('wheel',e=>{e.preventDefault();view.scale(e.deltaY>0?.92:1.08);},{passive:false});
  stage.addEventListener('keydown',e=>{const delta={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(delta){e.preventDefault();view.rotate(...delta);}});
}
function updateClock(){const old=clock.record.day;clock.tick(Date.now(),performance.now(),visible);$('timer').textContent=formatTime(clock.record.ms);if(old!==clock.record.day){platform.cache=null;if(!$('rank-panel').hidden&&!$('modal').hidden)loadRank();}return clock.record;}
async function save(){if(saveBusy)return;saveBusy=true;try{await platform.save({...clock.record});}catch{toast('时长暂未保存，本次摸鱼仍在计时');}finally{saveBusy=false;}}
function updateRankVisibility(){$('rank-open').hidden=!platform.rankingAvailable;}
async function syncScore(force=false){try{await platform.submit({...clock.record},force);}catch{updateRankVisibility();}}
function schedule(){clearInterval(tickTimer);if(!visible)return;tickTimer=setInterval(()=>{updateClock();if(Math.floor(clock.record.ms/1000)%15===0)save();syncScore();},1000);}
function showModal(title,panel){modalReturn=document.activeElement;$('dialog-title').textContent=title;$('rank-panel').hidden=panel!=='rank';$('share-panel').hidden=panel!=='share';$('modal').hidden=false;$('modal-close').focus();}
function closeModal(){$('modal').hidden=true;if(modalReturn?.focus)modalReturn.focus();}
async function loadRank(){
  $('rank-list').textContent='';$('rank-status').textContent='正在看看谁最会摸鱼…';$('rank-retry').hidden=true;
  const day=dayKey();
  try {
    await syncScore();if(platform.denied) throw new Error('排行榜未授权');const rows=(await platform.rank(day)).slice(0,100);
    if(day!==dayKey())return loadRank();
    $('rank-status').textContent=rows.length?'':'今天还没有人上榜，你可以成为第一个。';
    rows.forEach(row=>{
      const li=document.createElement('li');
      for(const [className,value] of [['rank-number',row.rank===1?'冠军':String(row.rank)],['rank-name',row.nickname||'匿名摸鱼人'],['rank-score',Number(row.score).toFixed(1)+' 分钟']]){const span=document.createElement('span');span.className=className;span.textContent=value;li.appendChild(span);}
      $('rank-list').appendChild(li);
    });
  } catch(error){updateRankVisibility();$('rank-status').textContent=platform.denied?'今日榜单暂未开放，你的本地时长会继续记录。':error?.errCode===2002?'榜单还在准备中，请稍后再试。':'暂时没能加载榜单，请稍后重试。';$('rank-retry').hidden=platform.denied;}
}
async function imageFrom(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}
async function makePoster(){
  const fish=FISH[selected],canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#eaf4f3';ctx.fillRect(0,0,900,1200);ctx.fillStyle='#173e49';ctx.font='24px sans-serif';ctx.fillText('摸鱼模拟器',65,85);
  ctx.font='54px sans-serif';ctx.fillText('今天，和'+fish.name+'一起',65,180);ctx.fillText('游离一会儿。',65,255);
  let source=view?.capture();if(!source)source=thumbnail(fish);
  let img;try{img=await imageFrom(source);}catch{img=await imageFrom(placeholder);}
  const scale=Math.min(850/img.width,510/img.height);ctx.drawImage(img,(900-img.width*scale)/2,330+(510-img.height*scale)/2,img.width*scale,img.height*scale);
  ctx.strokeStyle='#b9d4d3';ctx.beginPath();ctx.moveTo(65,875);ctx.lineTo(835,875);ctx.stroke();
  ctx.fillStyle='#607e85';ctx.font='23px sans-serif';ctx.fillText('今日已摸鱼',65,935);ctx.fillText(dayKey().replace(/-/g,'.'),660,935);
  ctx.fillStyle='#173e49';ctx.font='68px monospace';ctx.fillText(formatTime(clock.record.ms),65,1030);ctx.font='22px sans-serif';ctx.fillText('不用赶路，游到哪里都好。',65,1130);
  return canvas.toDataURL('image/jpeg',.88);
}
async function share(){
  if(view?.busy){toast('等这条鱼游过来再分享');return;}
  try{updateClock();shareData=await makePoster();$('share-preview').src=shareData;$('share-status').textContent='';$('publish').disabled=!platform.supports('postNote');$('native-share').hidden=!platform.supports('share',9530);if(!platform.supports('postNote'))$('share-status').textContent='预览已生成，请在小红书小工具中发布笔记。';showModal('我的摸鱼时刻','share');}
  catch{toast('海报没能生成，请稍后重试');}
}
makeGallery();fallbackImage($('fallback-image'));resize();openFish(0);
$('home').addEventListener('click',()=>openFish(selected));$('directory').addEventListener('click',home);
$('previous').addEventListener('click',()=>openFish(selected-1));$('next').addEventListener('click',()=>openFish(selected+1));
$('retry').addEventListener('click',()=>openFish(selected));
$('rank-open').addEventListener('click',()=>{showModal('今日摸鱼排行榜','rank');loadRank();});$('rank-retry').addEventListener('click',loadRank);
$('share-open').addEventListener('click',share);$('modal-close').addEventListener('click',closeModal);
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
document.addEventListener('keydown',e=>{
  if($('modal').hidden)return;
  if(e.key==='Escape')closeModal();
  if(e.key==='Tab'){
    const items=Array.from($('modal').querySelectorAll('button:not(:disabled)')).filter(b=>b.getClientRects().length);const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
$('publish').addEventListener('click',async()=>{
  if(publishing)return;publishing=true;$('publish').disabled=true;$('share-status').textContent='正在打开笔记发布页…';
  try{await platform.publish(shareData,'今日摸鱼时刻',`和${FISH[selected].name}一起摸鱼 ${formatTime(clock.record.ms)}。不用赶路，游到哪里都好。 #摸鱼模拟器`);$('share-status').textContent='发布流程已返回，最终结果以小红书为准。';}
  catch(e){$('share-status').textContent=e?.errMsg||e?.message||'未能打开发布页，请重试。';}
  finally{publishing=false;$('publish').disabled=false;}
});
$('native-share').addEventListener('click',async()=>{
  $('native-share').disabled=true;
  try{await platform.call('share',{type:'card'});$('share-status').textContent='分享流程已返回。';}catch{$('share-status').textContent='分享暂不可用，请在全屏小工具中重试。';}finally{$('native-share').disabled=false;}
});
window.addEventListener('resize',()=>{resize();windowInfo();});
document.addEventListener('visibilitychange',()=>{updateClock();visible=!document.hidden;clock.tick(Date.now(),performance.now(),false);save();if(visible){view?.start();schedule();}else{clearInterval(tickTimer);view?.stop();syncScore();}});
window.addEventListener('pagehide',()=>{updateClock();visible=false;clearInterval(tickTimer);save();view?.stop();});
window.addEventListener('pageshow',()=>{visible=!document.hidden;clock.tick(Date.now(),performance.now(),false);schedule();view?.start();});
(async()=>{
  await platform.init();
  try{const saved=await platform.read();const current=clock.tick(Date.now(),performance.now(),visible);const old=new DailyClock(saved);if(old.record.day===current.day)current.ms=Math.min(86400000,current.ms+old.record.ms);}
  catch{toast('历史时长暂不可用，本次仍可继续摸鱼');}
  updateRankVisibility();windowInfo();updateClock();schedule();
})();
// Read-only observability and replay helpers for the bundled verification suite.
window.moyu={getState:()=>({selected:FISH[selected].id,record:{...clock.record},rotated,view:view?.stats(),version:platform.version}),openFish,capture:()=>view?.capture(),catalog:FISH};
