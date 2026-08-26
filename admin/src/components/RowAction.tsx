import { Button } from '@mui/material';
import { useNotify, useRecordContext, useRefresh, useUpdate } from 'react-admin';

type Props = {
  resource: string;
  label: string;
  data: Record<string, unknown>;
  color?: 'primary' | 'warning' | 'error' | 'inherit';
};

export function RowAction({ resource, label, data, color = 'primary' }: Props) {
  const record = useRecordContext();
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  if (!record) return null;

  return (
    <Button
      size="small"
      color={color}
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        update(
          resource,
          { id: record.id, data, previousData: record },
          {
            mutationMode: 'pessimistic',
            onSuccess: () => {
              notify('상태가 변경되었습니다.', { type: 'success' });
              refresh();
            },
            onError: (error) => notify(error instanceof Error ? error.message : '변경하지 못했습니다.', { type: 'error' }),
          },
        );
      }}
      sx={{ minWidth: 0, whiteSpace: 'nowrap' }}
    >
      {label}
    </Button>
  );
}
