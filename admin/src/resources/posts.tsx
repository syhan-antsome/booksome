import { Box } from '@mui/material';
import { Datagrid, DateField, FunctionField, List, SearchInput, SelectInput, TextField, useRecordContext } from 'react-admin';

import { RowAction } from '../components/RowAction';
import { StatusBadge } from '../components/StatusBadge';

const filters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="내용·북룸·작성자 검색" />,
  <SelectInput key="moderationStatus" source="moderationStatus" label="검토 상태" choices={[
    { id: 'approved', name: '승인' }, { id: 'pending', name: '대기' }, { id: 'needs_review', name: '검토 필요' }, { id: 'rejected', name: '거절' },
  ]} />,
  <SelectInput key="visibility" source="visibility" label="공개 상태" choices={[
    { id: 'public', name: '공개' }, { id: 'pending', name: '대기' }, { id: 'hidden', name: '숨김' },
  ]} />,
];

function PostActions() {
  const record = useRecordContext<{ moderationStatus: string; visibility: string }>();
  if (!record) return null;
  return (
    <Box sx={{ display: 'flex', gap: 0.3 }}>
      {record.moderationStatus !== 'approved' || record.visibility !== 'public'
        ? <RowAction resource="posts" label="승인" data={{ moderationStatus: 'approved', visibility: 'public' }} />
        : null}
      {record.visibility !== 'hidden'
        ? <RowAction resource="posts" label="숨김" data={{ moderationStatus: 'rejected', visibility: 'hidden' }} color="error" />
        : null}
    </Box>
  );
}

export function PostList() {
  return (
    <List title="게시물" filters={filters} perPage={25} sort={{ field: 'createdAt', order: 'DESC' }} actions={false}>
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <TextField source="roomTitle" label="북룸" />
        <TextField source="authorName" label="작성자" emptyText="탈퇴 회원" />
        <TextField source="body" label="내용" sx={{ display: 'block', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }} />
        <TextField source="kind" label="유형" />
        <FunctionField source="moderationStatus" label="검토" render={() => <StatusBadge source="moderationStatus" />} />
        <FunctionField source="visibility" label="공개" render={() => <StatusBadge source="visibility" />} />
        <TextField source="reportCount" label="신고" textAlign="right" />
        <DateField source="createdAt" label="작성일" showTime locales="ko-KR" />
        <FunctionField label="관리" render={() => <PostActions />} />
      </Datagrid>
    </List>
  );
}
