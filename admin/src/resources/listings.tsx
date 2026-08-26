import { Datagrid, DateField, FunctionField, List, NumberField, SearchInput, SelectInput, TextField, useRecordContext } from 'react-admin';

import { RowAction } from '../components/RowAction';
import { StatusBadge } from '../components/StatusBadge';

const filters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="제목·저자·판매자 검색" />,
  <SelectInput key="status" source="status" label="거래 상태" choices={[
    { id: 'available', name: '거래 가능' }, { id: 'reserved', name: '예약' }, { id: 'completed', name: '완료' }, { id: 'hidden', name: '숨김' },
  ]} />,
];

function ListingAction() {
  const record = useRecordContext<{ status: string }>();
  if (!record) return null;
  return record.status === 'hidden'
    ? <RowAction resource="listings" label="다시 게시" data={{ status: 'available' }} />
    : <RowAction resource="listings" label="숨김" data={{ status: 'hidden' }} color="error" />;
}

export function ListingList() {
  return (
    <List title="거래" filters={filters} perPage={25} sort={{ field: 'createdAt', order: 'DESC' }} actions={false}>
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <FunctionField source="type" label="유형" render={() => <StatusBadge source="type" />} />
        <TextField source="title" label="도서" sx={{ fontWeight: 650 }} />
        <TextField source="author" label="저자" emptyText="—" />
        <TextField source="sellerName" label="판매자" />
        <NumberField source="price" label="가격" options={{ style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }} emptyText="—" />
        <TextField source="areaLabel" label="지역" />
        <FunctionField source="status" label="상태" render={() => <StatusBadge source="status" />} />
        <TextField source="threadCount" label="문의" textAlign="right" />
        <DateField source="createdAt" label="등록일" showTime locales="ko-KR" />
        <FunctionField label="관리" render={() => <ListingAction />} />
      </Datagrid>
    </List>
  );
}
