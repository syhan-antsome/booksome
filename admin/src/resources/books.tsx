import { Datagrid, DateField, FunctionField, List, SearchInput, SelectInput, TextField } from 'react-admin';

import { StatusBadge } from '../components/StatusBadge';

const filters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="제목·저자·ISBN 검색" />,
  <SelectInput key="status" source="status" label="독서 상태" choices={[
    { id: 'reading', name: '읽는 중' }, { id: 'finished', name: '완독' },
  ]} />,
];

export function BookList() {
  return (
    <List title="도서" filters={filters} perPage={25} sort={{ field: 'updatedAt', order: 'DESC' }} actions={false}>
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <TextField source="title" label="제목" sx={{ fontWeight: 650 }} />
        <TextField source="author" label="저자" />
        <TextField source="isbn13" label="ISBN" emptyText="—" />
        <TextField source="ownerName" label="등록 회원" />
        <FunctionField source="status" label="독서 상태" render={() => <StatusBadge source="status" />} />
        <TextField source="progressPercent" label="진행률(%)" textAlign="right" />
        <TextField source="source" label="정보 출처" emptyText="직접 입력" />
        <DateField source="updatedAt" label="최근 변경" showTime locales="ko-KR" />
      </Datagrid>
    </List>
  );
}
