import { RefreshCw, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

interface QuickActionsProps {
  onSyncMembers: () => void;
  onCreateEvent: () => void;
  onWarnInvalidNames: () => void;
  isSyncing?: boolean;
  invalidNameCount?: number;
}

export function QuickActions({
  onSyncMembers,
  onCreateEvent,
  onWarnInvalidNames,
  isSyncing,
  invalidNameCount = 0,
}: QuickActionsProps) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={onSyncMembers}
          {...(isSyncing && { isLoading: isSyncing })}
        >
          회원 동기화
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Calendar className="w-4 h-4" />}
          onClick={onCreateEvent}
        >
          이벤트 생성
        </Button>
        {invalidNameCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
            onClick={onWarnInvalidNames}
          >
            이름 경고 발송 ({invalidNameCount}명)
          </Button>
        )}
      </div>
    </div>
  );
}
