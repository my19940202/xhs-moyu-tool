// Only APIs actually required by the local Fish Kit / three.js runtime.
if (!Array.prototype.flatMap) Object.defineProperty(Array.prototype,'flatMap',{value:function(fn,ctx){return this.reduce((a,v,i)=>a.concat(fn.call(ctx,v,i,this)),[]);},configurable:true,writable:true});
if (!Array.prototype.at) Object.defineProperty(Array.prototype,'at',{value:function(i){i=Math.trunc(i)||0;return this[i<0?this.length+i:i];},configurable:true,writable:true});
