import { Datagrid, DateField, FunctionField, List, SearchInput, SelectInput, TextField, useRecordContext } from 'react-admin';

import { RowAction } from '../components/RowAction';

const filters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="사유·신고자 검색" />,
  <SelectInput key="state" source="state" label="처리 상태" choices={[
    { id: 'open', name: '처리 대기' }, { id: 'resolved', name: '처리 완료' },
  ]} />,
];

function ReportAction() {
  const record = useRecordContext<{ resolved: boolean }>();
  if (!record) return null;
  return record.resolved
    ? <RowAction resource="reports" label="다시 열기" data={{ resolved: false }} color="warning" />
    : <RowAction resource="reports" label="처리 완료" data={{ resolved: true }} />;
}

export function ReportList() {
  return (
    <List title="신고" filters={filters} filterDefaultValues={{ state: 'open' }} perPage={25} sort={{ field: 'createdAt', order: 'DESC' }} actions={false}>
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <TextField source="targetType" label="유형" />
        <TextField source="targetLabel" label="신고 대상" sx={{ display: 'block', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }} />
        <TextField source="reason" label="사유" />
        <TextField source="reporterName" label="신고자" emptyText="알 수 없음" />
        <FunctionField source="resolved" label="상태" render={(record: { resolved: boolean }) => record.resolved ? '처리 완료' : '처리 대기'} />
        <DateField source="createdAt" label="접수일" showTime locales="ko-KR" />
        <FunctionField label="관리" render={() => <ReportAction />} />
      </Datagrid>
    </List>
  );
}
