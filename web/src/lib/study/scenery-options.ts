export const newYorkCube=['px','nx','py','ny','pz','nz'].map(face=>`/study/scenery/new-york-cube-v1/${face}.webp`);
export const sceneryOptions=[
  {id:'forest',name:'숲',description:'햇살이 머무는 나의 서재',photo:null,cubeFaces:null,sky:'#eee7d8',horizon:'#eee7d8',sun:'#fff0d5',ambient:'#fff9ef',ground:'#b7ad98',sunScale:1,skyScale:1,lamp:0},
  {id:'new-york',name:'뉴욕',description:'맨해튼의 펜트하우스 서재',photo:'/study/scenery/new-york-photo-v1.webp',cubeFaces:newYorkCube,sky:'#71899e',horizon:'#dfb4a0',sun:'#ffd19c',ambient:'#d8c4bb',ground:'#9a8b83',sunScale:1.08,skyScale:1.3,lamp:2},
  {id:'tokyo',name:'도쿄',description:'작은 불빛이 모인 도시의 밤',photo:'/study/scenery/tokyo-photo-v1.webp',cubeFaces:null,sky:'#172b46',horizon:'#526a85',sun:'#f0caa5',ambient:'#b6c5db',ground:'#667383',sunScale:.38,skyScale:1.35,lamp:5},
  {id:'london',name:'런던',description:'테임즈강을 감싸는 아침빛',photo:'/study/scenery/london-photo-v1.webp',cubeFaces:null,sky:'#819398',horizon:'#c0c4bd',sun:'#e7d6b6',ambient:'#d1d8d3',ground:'#8d948d',sunScale:.85,skyScale:1.4,lamp:2},
] as const;
