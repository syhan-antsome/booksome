const cube=(id:string,version='v1')=>['px','nx','py','ny','pz','nz'].map(face=>`/study/scenery/${id}-cube-${version}/${face}.webp`);
export const TREEHOUSE_HEIGHT=18;
export const newYorkCube=cube('new-york');
export const sceneryOptions=[
  {id:'forest',name:'숲',description:'나무 위에서 바라보는 먼 숲',photo:'/study/scenery/forest-photo-v2.webp',cubeFaces:cube('forest','v2'),panorama:'/study/scenery/forest-panorama-v2.webp',rotation:.88,architecture:'treehouse',
    sky:'#a9bbb0',horizon:'#8b9676',sun:'#ffedc6',ambient:'#e0e8d0',ground:'#646d45',sunScale:.86,skyScale:1.1,lamp:0,exposure:.78,stone:'#999481',metal:'#645d45'},
  {id:'new-york',name:'뉴욕',description:'맨해튼의 펜트하우스 서재',photo:'/study/scenery/new-york-photo-v1.webp',cubeFaces:newYorkCube,panorama:'/study/scenery/new-york-panorama-v1.webp',rotation:.88,architecture:'penthouse',
    sky:'#71899e',horizon:'#dfb4a0',sun:'#ffd19c',ambient:'#d8c4bb',ground:'#9a8b83',sunScale:1.08,skyScale:1.3,lamp:2,exposure:.75,stone:'#b4aca2',metal:'#39372f'},
  {id:'tokyo',name:'도쿄',description:'도쿄타워와 도시의 저녁 불빛',photo:'/study/scenery/tokyo-photo-v2.webp',cubeFaces:cube('tokyo','v2'),panorama:'/study/scenery/tokyo-panorama-v2.webp',rotation:.35,architecture:'penthouse',
    sky:'#172b46',horizon:'#526a85',sun:'#b8c7ea',ambient:'#a6b8d7',ground:'#667383',sunScale:.32,skyScale:1.25,lamp:5,exposure:.72,stone:'#8b96a5',metal:'#2c343f'},
  {id:'london',name:'런던',description:'테임즈강을 감싸는 아침빛',photo:'/study/scenery/london-photo-v2.webp',cubeFaces:cube('london','v2'),panorama:'/study/scenery/london-panorama-v2.webp',rotation:1.0,architecture:'penthouse',
    sky:'#819398',horizon:'#c0c4bd',sun:'#f7e4c4',ambient:'#d1d8d3',ground:'#8d948d',sunScale:.92,skyScale:1.3,lamp:1,exposure:.78,stone:'#bbb6a6',metal:'#4c4e46'},
  {id:'seoul',name:'서울',description:'한강과 남산 너머로 번지는 노을',photo:'/study/scenery/seoul-photo-v1.webp',cubeFaces:cube('seoul'),panorama:'/study/scenery/seoul-panorama-v1.webp',rotation:1.05,architecture:'penthouse',
    sky:'#7d92af',horizon:'#e5b39b',sun:'#ffd4a2',ambient:'#e0c9c0',ground:'#8c969c',sunScale:1.02,skyScale:1.25,lamp:2,exposure:.76,stone:'#aab0b4',metal:'#414951'},
] as const;
