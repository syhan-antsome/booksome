export type StudyView = 'room' | 'shelves' | 'desk';
export type StudyBook = { id: string; title: string; author: string; totalPages: number | null; status: 'reading' | 'finished' | 'want'; coverUrl?: string | null; libraryId?: string };
export type StudySettings = { plants: boolean; rug: boolean; light: number; accent: string };
export function studyBookHref(book: StudyBook) { return book.libraryId ? `/library/${encodeURIComponent(book.libraryId)}` : `/study/books/${encodeURIComponent(book.id)}`; }
export const defaultStudySettings: StudySettings = { plants: true, rug: true, light: 100, accent: '#d97750' };

const titles = ['칼의 노래', '하드보일드 하드 럭', '소유냐 존재냐', '데미안', '어린 왕자', '동물농장', '노인과 바다', '모모', '변신', '이방인', '싯다르타', '1984', '남한산성', '연금술사', '페스트', '위대한 개츠비', '자전거 여행', '오만과 편견', '죄와 벌', '프랑켄슈타인', '월든', '보물섬', '햄릿', '리어 왕', '제인 에어', '폭풍의 언덕', '돈키호테', '걸리버 여행기', '작은 아씨들', '인간 실격', '멋진 신세계', '책 읽는 사람', '긴 산책', '내가 남긴 문장', '마음의 지도', '천천히 읽는 시간', '읽고 싶은 이야기', '나의 첫 서재', '기억의 책갈피', '일요일의 독서', '봄의 기록', '여름의 문장'];
const moreTitles=['인간의 대지','야간비행','그리스인 조르바','수레바퀴 아래서','황야의 이리','젊은 베르테르의 슬픔','파우스트','변신 이야기','일리아스','오디세이아','신곡','백년의 고독','눈먼 자들의 도시','참을 수 없는 존재의 가벼움','노르웨이의 숲','설국','라쇼몽','고도를 기다리며','맥베스','로미오와 줄리엣','이성과 감성','설득','에마','레 미제라블','적과 흑','마담 보바리','차라투스트라는 이렇게 말했다','자기만의 방','등대로','읽는 사람의 마음'];
export const demoStudyBooks: StudyBook[] = [...titles,...moreTitles].map((title, index) => ({ id: `demo-${index}`, title, author: index === 0 ? '김훈' : index === 1 ? '요시모토 바나나' : index === 2 ? '에리히 프롬' : '', totalPages: null, status: index < 3 ? 'reading' : index % 3 ? 'want' : 'finished' }));
