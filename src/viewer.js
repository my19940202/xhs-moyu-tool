import * as THREE from 'three';
import {loadFish,createFish,releaseFish} from './vendor/fish-kit.js';

export class FishViewer {
  constructor(canvas,onStatus) {
    this.canvas=canvas;this.onStatus=onStatus;this.actor=null;this.current=null;this.target=null;
    this.busy=false;this.enabled=false;this.paused=false;this.motion='swim';this.frame=0;this.last=0;this.transition=null;
    this.low=false;this.samples=[];this.badWindows=0;this.losses=0;this.readyAt=0;this.yaw=-Math.PI/2;this.pitch=0;this.zoom=1;
    this.scene=new THREE.Scene();this.pivot=new THREE.Group();this.scene.add(this.pivot);
    this.camera=new THREE.PerspectiveCamera(32,1,.01,50);this.camera.position.set(0,.1,2.2);this.camera.lookAt(0,0,0);
    this.scene.add(new THREE.HemisphereLight(0xe9ffff,0x658a8c,2.5));
    const light=new THREE.DirectionalLight(0xfff4e4,3);light.position.set(-2,3,4);this.scene.add(light);
    const fill=new THREE.DirectionalLight(0xa5d5e7,1.4);fill.position.set(3,1,-2);this.scene.add(fill);
    const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,preserveDrawingBuffer:false});
    if(!gl) {this.failed=true;return;}
    try {
      this.renderer=new THREE.WebGLRenderer({canvas,context:gl,alpha:true,antialias:false});
      this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
      this.renderer.debug.onShaderError=()=>this.fail('当前设备暂不支持动态鱼，已显示静态预览');
    } catch {this.failed=true;return;}
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();this.losses++;this.stop();
      if(this.losses>1) {this.fail('图形显示中断，已切换静态预览');return;}
      this.onStatus('图形显示恢复中…');
      this.restoreTimer=setTimeout(()=>this.fail('图形显示暂不可用，已切换静态预览'),2500);
    });
    canvas.addEventListener('webglcontextrestored',()=>{
      clearTimeout(this.restoreTimer);if(this.failed)return;this.onStatus('');this.last=0;this.start();
    });
  }
  resize() {
    if(!this.renderer)return;
    const w=this.canvas.parentElement.clientWidth,h=this.canvas.parentElement.clientHeight;
    if(!w||!h)return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,this.low?1:1.5,Math.sqrt((this.low?1000000:2000000)/(w*h))));
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.applyView();
  }
  applyView() {
    this.pivot.rotation.set(this.pitch,this.yaw,0);
    // Keep a 1 m specimen within a narrow or wide stage, without distorting it.
    const aspect=this.camera.aspect||1;
    const distance=Math.max(1.45,1.05/(2*Math.tan(16*Math.PI/180)*aspect))*1.25/this.zoom;
    this.camera.position.set(0,.06,distance);this.camera.lookAt(0,0,0);
  }
  reset(){this.yaw=-Math.PI/2;this.pitch=0;this.zoom=1;this.applyView();}
  rotate(x,y){this.yaw+=x*.008;this.pitch=Math.max(-1.2,Math.min(1.2,this.pitch+y*.008));this.applyView();}
  scale(factor){this.zoom=Math.max(.6,Math.min(1.7,this.zoom*factor));this.applyView();}
  setMotion(id){this.motion=id;if(this.actor&&!this.transition)this.actor.setMotion(id);}
  setPaused(value){this.paused=value;}
  setEnabled(value){this.enabled=value;if(value)this.start();else this.stop();}
  start(){if(!this.frame&&this.enabled&&!document.hidden&&!this.failed)this.frame=requestAnimationFrame(t=>this.tick(t));}
  stop(){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}
  fail(message){this.failed=true;this.stop();this.finishTransition();this.onStatus(message,true);}
  animateTransition(kind) {
    if(!this.actor||this.failed||window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    return new Promise(resolve=>{this.transition={kind,time:0,resolve,entryDistance:this.entryDistance()};this.start();});
  }
  entryDistance(){return Math.max(1.5,this.camera.position.z*Math.tan(16*Math.PI/180)*this.camera.aspect+1);}
  finishTransition(){if(this.transition){const {resolve}=this.transition;this.transition=null;resolve();}}
  async select(fish){
    this.target=fish;
    if(this.busy)return;
    this.busy=true;
    try {
      while(this.target && this.target.id!==this.current?.id) {
        const next=this.target;
        if(this.actor) {
          this.actor.setMotion('air');await this.animateTransition('out');
          const old=this.current.id;this.actor.dispose();releaseFish(old);this.actor=null;
          this.renderer.render(this.scene,this.camera);
        }
        this.current=null;this.onStatus('正在请这条鱼过来…');
        if(this.failed){this.current=next;this.onStatus('当前设备使用静态预览',true);break;}
        await loadFish('./assets/fish/',[next.id]);
        if(this.target.id!==next.id){releaseFish(next.id);continue;}
        this.actor=createFish(next.id,100);this.actor.setDetail('low');
        this.actor.setMotion(this.motion);
        // Apply the first animated pose before the model can be rendered.
        this.actor.update(0);
        // Start off-screen so the first rendered frame cannot flash at the center.
        this.reset();
        if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.actor.object.position.set(0,0,-this.entryDistance());
        this.current=next;this.pivot.add(this.actor.object);
        this.onStatus('');this.readyAt=performance.now();
        await this.animateTransition('in');
      }
    } catch(error) {
      if(this.actor){this.actor.dispose();this.actor=null;}
      if(this.target)releaseFish(this.target.id);
      this.current=null;this.onStatus('这条鱼暂时没游过来，请重试。',false,true);
    } finally {this.busy=false;}
  }
  tick(now){
    this.frame=0;if(!this.enabled||document.hidden||this.failed)return;
    const raw=this.last?(now-this.last)/1000:0;this.last=now;const dt=Math.min(raw,.05);
    if(this.actor) {
      if(!this.paused||this.transition)this.actor.update(dt);
      if(this.transition){
        const tr=this.transition;tr.time+=dt;const p=Math.min(1,tr.time/.8);const eased=p*p*(3-2*p);
        if(tr.kind==='out'){this.actor.object.position.set(.25*eased,1.6*eased,0);}
        else this.actor.object.position.set(0,0,-tr.entryDistance*(1-eased));
        if(p===1){this.actor.object.position.set(0,0,0);this.finishTransition();}
      }
    }
    try {this.renderer.render(this.scene,this.camera);}catch{this.fail('图形显示暂不可用，已切换静态预览');return;}
    if(raw>0 && !this.busy && now-this.readyAt>2500) {
      this.samples.push(raw);
      if(this.samples.length>=120){
        const mean=this.samples.reduce((a,b)=>a+b,0)/this.samples.length;this.samples=[];
        this.badWindows=mean>.05?this.badWindows+1:0;
        if(this.badWindows>=2){if(!this.low){this.low=true;this.resize();this.badWindows=0;}else this.fail('已切换静态预览，让设备休息一下');}
      }
    }
    this.start();
  }
  capture(){
    if(!this.renderer||this.failed||!this.actor) return null;
    this.renderer.render(this.scene,this.camera);
    return this.canvas.toDataURL('image/png');
  }
  stats(){return {current:this.current?.id,busy:this.busy,motion:this.motion,failed:!!this.failed,low:this.low,drawCalls:this.renderer?.info.render.calls,triangles:this.renderer?.info.render.triangles,textures:this.renderer?.info.memory.textures,geometries:this.renderer?.info.memory.geometries};}
}
