export const woodOptions=[{id:'oak',name:'밝은 원목',color:'#d5b88c'},{id:'walnut',name:'짙은 월넛',color:'#79523b'},{id:'ivory',name:'아이보리',color:'#e7dfce'},{id:'ash',name:'차분한 애쉬',color:'#a9a396'}] as const;
export const wallOptions=[{id:'cream',name:'크림',color:'#efe8d9'},{id:'sage',name:'세이지',color:'#a9b69d'},{id:'mist',name:'안개빛',color:'#b3bfc5'},{id:'clay',name:'살구빛',color:'#d5b39d'}] as const;
export const rugColors=[{id:'sand',name:'모래빛',color:'#ddcbb0'},{id:'sage',name:'세이지',color:'#a7b29a'},{id:'terracotta',name:'테라코타',color:'#c18b6b'}] as const;
export const roomThemes=[
  {id:'warm',name:'포근한 원목',settings:{wood:'oak',wall:'cream',wallTexture:'plaster',floor:'oak',rugColor:'sand',rugPattern:'woven',accent:'#d97750'}},
  {id:'quiet',name:'고요한 월넛',settings:{wood:'walnut',wall:'cream',wallTexture:'linen',floor:'walnut',rugColor:'sand',rugPattern:'grid',accent:'#6f8977'}},
  {id:'airy',name:'가벼운 초록',settings:{wood:'ivory',wall:'sage',wallTexture:'plaster',floor:'herringbone',rugColor:'sage',rugPattern:'stripes',accent:'#6f8977'}},
] as const;
