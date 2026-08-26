import {
  BooleanField,
  Datagrid,
  DateField,
  FunctionField,
  List,
  SearchInput,
  SelectInput,
  TextField,
  useRecordContext,
} from 'react-admin';

import { RowAction } from '../components/RowAction';
import { StatusBadge } from '../components/StatusBadge';

const filters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="이름·이메일 검색" />,
  <SelectInput key="status" source="status" label="회원 상태" choices={[
    { id: 'active', name: '활성' }, { id: 'suspended', name: '정지' }, { id: 'deleted', name: '탈퇴' },
  ]} />,
  <SelectInput key="role" source="role" label="권한" choices={[
    { id: 'USER', name: '일반' }, { id: 'ADMIN', name: '관리자' },
  ]} />,
];

function UserAction() {
  const record = useRecordContext<{ status: string; role: string }>();
  if (!record || record.role === 'ADMIN') return null;
  return record.status === 'active'
    ? <RowAction resource="users" label="정지" data={{ status: 'suspended' }} color="error" />
    : <RowAction resource="users" label="활성화" data={{ status: 'active' }} />;
}

export function UserList() {
  return (
    <List title="회원" filters={filters} perPage={25} sort={{ field: 'createdAt', order: 'DESC' }} actions={false}>
      <Datagrid bulkActionButtons={false} rowClick={false} sx={{ '& .column-displayName': { fontWeight: 650 } }}>
        <TextField source="displayName" label="회원" />
        <TextField source="email" label="이메일" />
        <BooleanField source="emailVerified" label="이메일 인증" valueLabelTrue="완료" valueLabelFalse="대기" />
        <FunctionField source="role" label="권한" render={() => <StatusBadge source="role" />} />
        <FunctionField source="status" label="상태" render={() => <StatusBadge source="status" />} />
        <TextField source="readingBookCount" label="등록 도서" textAlign="right" />
        <TextField source="roomCount" label="참여 북룸" textAlign="right" />
        <DateField source="createdAt" label="가입일" showTime locales="ko-KR" />
        <FunctionField label="관리" render={() => <UserAction />} />
      </Datagrid>
    </List>
  );
}
