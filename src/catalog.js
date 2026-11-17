export const FISH = [
  ['madai','真鲷','海里的红衣绅士','Pagrus major'],
  ['aji','竹荚鱼','闪着银光的小小巡游家','Trachurus japonicus'],
  ['seabass','日本花鲈','慢慢游，也很有气场','Lateolabrax japonicus','suzuki'],
  ['saba','日本鲭','把海浪穿在身上','Scomber japonicus'],
  ['buri','鰤鱼','一尾有力量的蓝色','Seriola quinqueradiata'],
  ['hiramasa','黄条鰤','沿着金色侧线出发','Seriola lalandi'],
  ['kihada','黄鳍金枪鱼','今天也不必游得那么快','Thunnus albacares'],
  ['kurodai','黑鲷','银灰色的安静时刻','Acanthopagrus schlegelii'],
  ['mebaru','眼张鱼','大眼睛，慢生活','Sebastes inermis'],
  ['kasago','褐菖鲉','藏在礁石旁的小脾气','Sebastiscus marmoratus'],
  ['magochi','鲬鱼','贴着海底发一会儿呆','Platycephalus sp.'],
  ['kamasu','魣鱼','修长的身形，利落的转身','Sphyraena sp.'],
  ['sawara','蓝点马鲛','带着斑点穿过海流','Scomberomorus niphonius'],
  ['tachiuo','带鱼','一条会游泳的银色丝带','Trichiurus lepturus'],
  // ['katakuchi','日本鳀','小小一条，也自在','Engraulis japonicus'], // 暂无完整资源，暂不展示
  ['isaki','三线矶鲈','在浅海里偷个闲','Parapristipoma trilineatum']
].map(([id,name,note,latin,file]) => ({id,name,note,latin,file:file || id}));
export const MOTIONS = [
  {id:'swim',name:'悠闲巡游',symbol:'≈',hint:'不赶时间，慢慢游'},
  {id:'power',name:'全速游动',symbol:'»',hint:'摆动鱼尾，全力向前'},
  {id:'landed',name:'扑腾',symbol:'↝',hint:'翻个身，再跳一下'},
  {id:'turn',name:'转身',symbol:'↶',hint:'换个方向，继续摸鱼'}
];
