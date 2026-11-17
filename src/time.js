export function dayKey(now = Date.now()) { return new Date(now + 8 * 3600000).toISOString().slice(0,10); }
export function nextMidnight(now) { return Date.parse(dayKey(now)+'T00:00:00+08:00') + 86400000; }
export function cleanRecord(value, now) {
  const day = dayKey(now);
  return { day, ms: value && value.day === day && Number.isFinite(value.ms) ? Math.min(86400000,Math.max(0,value.ms)) : 0 };
}
export class DailyClock {
  constructor(record, wall=Date.now(), mono=performance.now()) { this.record=cleanRecord(record,wall); this.wall=wall; this.mono=mono; }
  tick(wall,mono,visible) {
    const elapsed = Math.min(Math.max(0,mono-this.mono),Math.max(0,wall-this.wall));
    if (this.record.day !== dayKey(wall)) {
      this.record = {day:dayKey(wall),ms:visible ? Math.min(elapsed,Math.max(0,wall-(nextMidnight(wall)-86400000))) : 0};
    } else if (visible) this.record.ms = Math.min(86400000,this.record.ms + elapsed);
    this.wall=wall; this.mono=mono;
    return this.record;
  }
}
export function formatTime(ms) { const s=Math.floor(ms/1000); return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':'); }
