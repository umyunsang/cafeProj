import React from 'react';

// TODO: 필요한 타입 정의 (예: OperationHours, ValidationErrors)
// interface OperationHours {
//   weekdayStartTime: string;
//   weekdayEndTime: string;
//   weekendStartTime: string;
//   weekendEndTime: string;
//   closedDays: string; // 또는 string[] 등 휴무일 관리 방식에 따라 변경
//   orderDeadline: string;
// }

// interface OperationHoursValidationErrors {
//   weekdayStartTime?: string;
//   weekdayEndTime?: string;
//   weekendStartTime?: string;
//   weekendEndTime?: string;
//   closedDays?: string;
//   orderDeadline?: string;
//   timeSequence?: string; // 예: 시작 시간이 종료 시간보다 늦을 경우
// }

interface OperationHoursFormProps {
  initialData: any; // 실제 타입으로 교체 필요
  onDataChange: (field: string, value: string) => void; // 휴무일 등 복잡한 데이터는 value 타입 변경 필요
  validationErrors: any; // 실제 타입으로 교체 필요
}

const OperationHoursForm: React.FC<OperationHoursFormProps> = ({
  initialData,
  onDataChange,
  validationErrors,
}) => {
  // TODO: initialData를 사용하여 내부 상태 관리 또는 직접 initialData 사용
  // TODO: Input (type="time"), Textarea 등 UI 요소 사용하여 폼 구현
  // 각 필드 변경 시 onDataChange 호출
  // validationErrors를 사용하여 오류 메시지 표시
  // 휴무일 관리를 위한 로직 (예: 목록 추가/삭제) 구현 필요 시 여기에 포함

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">운영 시간</h3>
      {/* 평일 운영 시간 */}
      <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
        <div>
          <label htmlFor="weekdayStartTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            평일 시작 시간
          </label>
          <input
            type="time"
            id="weekdayStartTime"
            name="weekdayStartTime"
            value={initialData?.weekdayStartTime || ''}
            onChange={(e) => onDataChange('weekdayStartTime', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
          />
          {validationErrors?.weekdayStartTime && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.weekdayStartTime}</p>
          )}
        </div>
        <div>
          <label htmlFor="weekdayEndTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            평일 종료 시간
          </label>
          <input
            type="time"
            id="weekdayEndTime"
            name="weekdayEndTime"
            value={initialData?.weekdayEndTime || ''}
            onChange={(e) => onDataChange('weekdayEndTime', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
          />
          {validationErrors?.weekdayEndTime && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.weekdayEndTime}</p>
          )}
        </div>
      </div>

      {/* 주말 운영 시간 */}
      <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
        <div>
          <label htmlFor="weekendStartTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            주말 시작 시간
          </label>
          <input
            type="time"
            id="weekendStartTime"
            name="weekendStartTime"
            value={initialData?.weekendStartTime || ''}
            onChange={(e) => onDataChange('weekendStartTime', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
          />
          {validationErrors?.weekendStartTime && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.weekendStartTime}</p>
          )}
        </div>
        <div>
          <label htmlFor="weekendEndTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            주말 종료 시간
          </label>
          <input
            type="time"
            id="weekendEndTime"
            name="weekendEndTime"
            value={initialData?.weekendEndTime || ''}
            onChange={(e) => onDataChange('weekendEndTime', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
          />
          {validationErrors?.weekendEndTime && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.weekendEndTime}</p>
          )}
        </div>
      </div>
      {validationErrors?.timeSequence && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.timeSequence}</p>
      )}

      {/* 휴무일 */}
      <div>
        <label htmlFor="closedDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          휴무일 (쉼표로 구분)
        </label>
        <textarea
          id="closedDays"
          name="closedDays"
          rows={2}
          value={initialData?.closedDays || ''} // 휴무일이 배열이라면 .join(', ') 등 처리 필요
          onChange={(e) => onDataChange('closedDays', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
          placeholder="예: 매주 월요일, 1월 1일, 추석 당일"
        />
        {validationErrors?.closedDays && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.closedDays}</p>
        )}
      </div>

      {/* 주문 마감 시간 */}
      <div>
        <label htmlFor="orderDeadline" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          주문 마감 시간 (영업 종료 시간 기준, 분 단위)
        </label>
        <input
          type="number"
          id="orderDeadline"
          name="orderDeadline"
          value={initialData?.orderDeadline || ''}
          onChange={(e) => onDataChange('orderDeadline', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
          placeholder="예: 30 (영업 종료 30분 전 마감)"
        />
        {validationErrors?.orderDeadline && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.orderDeadline}</p>
        )}
      </div>
    </div>
  );
};

export default OperationHoursForm; 