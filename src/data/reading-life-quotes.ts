export type ReadingLifeQuote = {
  text: string;
  source: '북썸 자체 문장';
};

export const readingLifeQuotes: ReadingLifeQuote[] = [
  { text: '책장을 넘기는 동안, 마음도 조금씩 자리를 바꿉니다.', source: '북썸 자체 문장' },
  { text: '혼자 읽은 문장이 누군가와 나눌 이야기가 됩니다.', source: '북썸 자체 문장' },
  { text: '좋은 책은 끝나도 한동안 내 안에서 계속 읽힙니다.', source: '북썸 자체 문장' },
  { text: '오늘 읽은 한 페이지가 내일의 나를 조금 다르게 만듭니다.', source: '북썸 자체 문장' },
  { text: '책은 조용하지만, 마음속에서는 자주 큰 소리로 말합니다.', source: '북썸 자체 문장' },
  { text: '읽는 시간은 사라지는 시간이 아니라 쌓이는 시간입니다.', source: '북썸 자체 문장' },
  { text: '한 권의 책은 작은 방이고, 우리는 그 안에서 넓어집니다.', source: '북썸 자체 문장' },
  { text: '문장 하나가 하루 전체의 온도를 바꿀 때가 있습니다.', source: '북썸 자체 문장' },
  { text: '읽다 멈춘 곳도 독서의 일부입니다. 마음이 머문 자리니까요.', source: '북썸 자체 문장' },
  { text: '책을 읽는다는 건 다른 삶의 창가에 잠시 기대는 일입니다.', source: '북썸 자체 문장' },
  { text: '같은 책을 읽어도 각자의 밑줄은 서로 다른 길을 냅니다.', source: '북썸 자체 문장' },
  { text: '오늘의 문장은 오늘의 나를 오래 기억하게 합니다.', source: '북썸 자체 문장' },
  { text: '책 속의 낯선 세계는 결국 내 안의 새로운 방이 됩니다.', source: '북썸 자체 문장' },
  { text: '좋은 이야기는 페이지 밖으로 나와 사람 사이에 앉습니다.', source: '북썸 자체 문장' },
  { text: '독서는 마음이 급하지 않아도 된다고 알려주는 습관입니다.', source: '북썸 자체 문장' },
  { text: '책 한 권을 끝내는 일보다, 다시 펼치고 싶은 마음이 더 오래갑니다.', source: '북썸 자체 문장' },
  { text: '우리는 책을 읽으며 잊고 있던 질문을 다시 만납니다.', source: '북썸 자체 문장' },
  { text: '짧은 문장도 오래 머물면 긴 여행이 됩니다.', source: '북썸 자체 문장' },
  { text: '책은 답을 주기도 하지만, 좋은 질문을 남길 때 더 깊어집니다.', source: '북썸 자체 문장' },
  { text: '읽은 만큼 쌓이고, 나눈 만큼 넓어집니다.', source: '북썸 자체 문장' },
  { text: '문장에 밑줄을 긋는 일은 마음의 위치를 표시하는 일입니다.', source: '북썸 자체 문장' },
  { text: '책을 덮은 뒤 시작되는 생각이 진짜 독서일지도 모릅니다.', source: '북썸 자체 문장' },
  { text: '오늘 읽지 못한 책도 내일의 책상 위에서 나를 기다립니다.', source: '북썸 자체 문장' },
  { text: '한 페이지를 읽는 동안 세상은 조금 조용해집니다.', source: '북썸 자체 문장' },
  { text: '책은 멀리 데려가지만, 결국 나 자신에게 돌아오게 합니다.', source: '북썸 자체 문장' },
  { text: '좋은 독서는 속도가 아니라 오래 남는 울림으로 기억됩니다.', source: '북썸 자체 문장' },
  { text: '책을 함께 읽는다는 건 같은 장면 앞에 나란히 서는 일입니다.', source: '북썸 자체 문장' },
  { text: '내가 고른 책들이 모이면, 나의 계절도 보입니다.', source: '북썸 자체 문장' },
  { text: '문장을 모으는 일은 흩어진 하루를 천천히 정리하는 일입니다.', source: '북썸 자체 문장' },
  { text: '책으로 시작한 대화는 생각보다 오래 따뜻합니다.', source: '북썸 자체 문장' },
];

export function getDailyReadingLifeQuote(date = new Date()) {
  const dayIndex = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return readingLifeQuotes[dayIndex % readingLifeQuotes.length];
}
