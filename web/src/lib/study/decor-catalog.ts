export const decorCategories=['화분','액자','오브제','조명'] as const;
export const decorCatalog=[
  {id:'pothos',name:'초록 포토스',category:'화분',colors:['#eee2cc','#b16e4a','#697f72']},
  {id:'succulent',name:'작은 다육이',category:'화분',colors:['#b97652','#e9e0ce','#737b91']},
  {id:'mini-tree',name:'나의 작은 나무',category:'화분',colors:['#d6c8b3','#a97650','#657b71']},
  {id:'fern',name:'포근한 고사리',category:'화분',colors:['#eee4cf','#ae7658','#858f70']},
  {id:'botanical',name:'식물 드로잉',category:'액자',colors:['#b38b5d','#72513d','#e7dfd1']},
  {id:'sunset',name:'노을의 풍경',category:'액자',colors:['#b38b5d','#72513d','#e7dfd1']},
  {id:'abstract',name:'느긋한 모양',category:'액자',colors:['#b38b5d','#72513d','#e7dfd1']},
  {id:'ceramic-vase',name:'곡선 도자기',category:'오브제',colors:['#ece2cf','#b87659','#7d9587']},
  {id:'stone-arch',name:'작은 아치',category:'오브제',colors:['#d9cbb5','#b37656','#84958b']},
  {id:'bird',name:'책장 위의 새',category:'오브제',colors:['#ba946c','#876349','#dcd1bd']},
  {id:'orbit',name:'작은 우주',category:'오브제',colors:['#ab8155','#77766c','#b07354']},
  {id:'moon',name:'달의 조각',category:'오브제',colors:['#e7dfcf','#c59373','#91a298']},
  {id:'mushroom',name:'버섯 조명',category:'조명',colors:['#eee0c8','#bc7456','#809889']},
  {id:'candle',name:'조용한 촛불',category:'조명',colors:['#e9dfc9','#c58a6b','#a7b5a2']},
] as const;
export type DecorType=(typeof decorCatalog)[number]['id'];
export type StudyDecoration={id:string;type:DecorType;slotId:string;page:number;color:number;rotation:number};
export const findDecor=(id:string)=>decorCatalog.find(item=>item.id===id);
