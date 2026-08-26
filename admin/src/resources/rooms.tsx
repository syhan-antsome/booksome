import { Datagrid, DateField, FunctionField, List, SearchInput, SelectInput, TextField, useRecordContext } from 'react-admin';

import { RowAction } from '../components/RowAction';
import { StatusBadge } from '../components/StatusBadge';

const filters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="북룸 이름 검색" />,
  <SelectInput key="visibility" source="visibility" label="공개 상태" choices={[
    { id: 'public', name: '공개' }, { id: 'unlisted', name: '링크 공개' }, { id: 'private', name: '비공개' },
  ]} />,
];

function RoomAction() {
  const record = useRecordContext<{ visibility: string }>();
  if (!record) return null;
  return record.visibility === 'public'
    ? <RowAction resource="rooms" label="숨기기" data={{ visibility: 'unlisted' }} color="warning" />
    : <RowAction resource="rooms" label="공개" data={{ visibility: 'public' }} />;
}

export function RoomList() {
  return (
    <List title="북룸" filters={filters} perPage={25} sort={{ field: 'createdAt', order: 'DESC' }} actions={false}>
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <TextField source="title" label="북룸" sx={{ fontWeight: 650 }} />
        <TextField source="subtitle" label="도서·부제" emptyText="—" />
        <TextField source="founderName" label="운영자" emptyText="—" />
        <TextField source="memberCount" label="회원" textAlign="right" />
        <TextField source="postCount" label="게시물" textAlign="right" />
        <FunctionField source="visibility" label="공개 상태" render={() => <StatusBadge source="visibility" />} />
        <DateField source="createdAt" label="생성일" showTime locales="ko-KR" />
        <FunctionField label="관리" render={() => <RoomAction />} />
      </Datagrid>
    </List>
  );
}
