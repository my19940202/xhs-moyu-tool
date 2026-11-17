import { LoadingManager, TextureLoader } from 'three';
import { GLTFLoader as Parser } from 'three/addons/loaders/GLTFLoader.js';

// Build-time GLB conversion keeps textures as ordinary image files. Geometry is
// a small, per-fish local script, loaded without fetch, eval, WASM or workers.
const pending = new Map();
window.__moyuModels = Object.create(null);
export class GLTFLoader {
  async loadAsync(url) {
    const file = url.split('/').pop().replace(/\.glb$/, '');
    if (!/^[a-z_]+$/.test(file)) throw new Error('Invalid local model');
    const folder = url.slice(0, url.lastIndexOf('/') + 1);
    if (!window.__moyuModels[file]) {
      if (!pending.has(file)) pending.set(file, new Promise((resolve,reject) => {
        const script = document.createElement('script');
        const timer = setTimeout(() => done(new Error('模型加载超时')), 15000);
        const done = (error) => { clearTimeout(timer); script.remove(); pending.delete(file); error ? reject(error) : resolve(); };
        script.src = folder + file + '.js';
        script.onload = () => done(window.__moyuModels[file] ? null : new Error('模型数据缺失'));
        script.onerror = () => done(new Error('模型加载失败'));
        document.head.appendChild(script);
      }));
      await pending.get(file);
    }
    const data = window.__moyuModels[file];
    const manager = new LoadingManager();
    manager.addHandler(/\.(?:webp|png|jpe?g)$/i, new TextureLoader(manager));
    const loader = new Parser(manager);
    loader.register(parser => {
      parser.loadBuffer = async index => {
        const raw = atob(data.buffers[index]);
        const bytes = new Uint8Array(raw.length);
        for (let i=0;i<raw.length;i++) bytes[i] = raw.charCodeAt(i);
        return bytes.buffer;
      };
      return { name:'MOYU_LOCAL_BUFFERS' };
    });
    return new Promise((resolve,reject) => loader.parse(data.gltf, folder, resolve, reject));
  }
}
