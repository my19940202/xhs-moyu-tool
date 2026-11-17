const KEY='moyu.today.v1';
export class Platform {
  constructor() { this.version=0; this.denied=false; this.cache=null; this.rankPending=null; this.lastSubmit=0; this.submitting=false; this.lastScore=-1; }
  get api() { return window.xhs && window.xhs.miniTool; }
  async init() {
    let launch=window.xhs && window.xhs.launchOptions;
    if (!launch?.miniToolEnv?.buildVersion && this.api?.getLaunchOptions) {
      try { launch=await this.call('getLaunchOptions',{}); } catch {}
    }
    this.version=Math.floor((Number(launch?.miniToolEnv?.buildVersion)||0)/1000);
  }
  supports(name,min=0) { return this.version>=min && typeof this.api?.[name]==='function'; }
  call(name,args) {
    return new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(new Error('请求超时，请稍后重试')),10000);
      const ok=v=>{clearTimeout(timer);resolve(v);};
      const fail=e=>{clearTimeout(timer);reject(e);};
      try {
        const result=this.api[name]({...args,success:ok,fail});
        if (result?.then) result.then(ok,fail);
      } catch(e) { fail(e); }
    });
  }
  async read() {
    if(this.supports('getStorage',9460)) {
      const result=await this.call('getStorage',{key:KEY});
      return result.data ? JSON.parse(result.data) : null;
    }
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  }
  async save(record) {
    const data=JSON.stringify(record);
    if(this.supports('setStorage',9460)) return this.call('setStorage',{key:KEY,data});
    localStorage.setItem(KEY,data);
  }
  get rankingAvailable() { return !this.denied && this.supports('getRankList',9510) && this.supports('submitScore',9510); }
  handleError(error) { if([1005,1006,10003].includes(error?.errCode)) this.denied=true; }
  async submit(record,force=false) {
    if(!this.rankingAvailable || this.submitting || record.ms<1000) return;
    const score=Math.floor(record.ms/1000)/60;
    if(!force && Date.now()-this.lastSubmit<60000) return;
    if(this.lastDay===record.day && score<=this.lastScore) return;
    this.lastSubmit=Date.now(); this.submitting=true;
    try { await this.call('submitScore',{board:1,score}); this.lastDay=record.day;this.lastScore=score; }
    catch(e) { this.handleError(e);throw e; }
    finally { this.submitting=false; }
  }
  async rank(day) {
    if(this.cache?.day===day && Date.now()-this.cache.at<45000) return this.cache.data;
    if(this.rankPending) return this.rankPending;
    this.rankPending=(async()=>{
      for(let attempt=0;attempt<4;attempt++) {
        try {
          const result=await this.call('getRankList',{board:1,period:'day'});
          if(!Array.isArray(result.data)) throw new Error('榜单数据暂不可用');
          this.cache={day,at:Date.now(),data:result.data}; return result.data;
        } catch(e) {
          this.handleError(e);
          if(e?.errCode!==2002 || attempt===3) throw e;
          await new Promise(resolve=>setTimeout(resolve,500*Math.pow(2,attempt)));
        }
      }
    })();
    try { return await this.rankPending; } finally { this.rankPending=null; }
  }
  async publish(image,title,content) {
    if(!this.supports('postNote')) throw new Error('请在小红书小工具内发布笔记');
    let url=image;
    if(this.supports('writeTempFile')) url=(await this.call('writeTempFile',{data:image})).filePath;
    return this.call('postNote',{title,content,pageType:'photo_publish',mediaInfo:{image_resources:[{url}]}});
  }
}
