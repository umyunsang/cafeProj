import React from 'react';

// TODO: 필요한 타입 정의 (예: StoreInfo, ValidationErrors)
// interface StoreInfo {
//   name: string;
//   contact: string;
//   address: string;
//   description: string;
// }

// interface ValidationErrors {
//   name?: string;
//   contact?: string;
//   address?: string;
//   description?: string;
// }

interface StoreInfoFormProps {
  initialData: any; // 실제 타입으로 교체 필요
  onDataChange: (field: string, value: string) => void;
  validationErrors: any; // 실제 타입으로 교체 필요
}

const StoreInfoForm: React.FC<StoreInfoFormProps> = ({
  initialData,
  onDataChange,
  validationErrors,
}) => {
  // TODO: initialData를 사용하여 내부 상태 관리 (필요한 경우) 또는 직접 initialData 사용
  // 예시: const [name, setName] = React.useState(initialData.name);

  // TODO: Input, Textarea 등 UI 요소 사용하여 폼 구현
  // 각 필드 변경 시 onDataChange 호출
  // validationErrors를 사용하여 오류 메시지 표시

  return (
    <div className="space-y-4">
      {/* 예시 필드 */}
      <div>
        <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          매장 이름
        </label>
        <input
          type="text"
          id="storeName"
          name="name"
          value={initialData?.name || ''}
          onChange={(e) => onDataChange('name', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
        />
        {validationErrors?.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="storeContact" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          연락처
        </label>
        <input
          type="text"
          id="storeContact"
          name="contact"
          value={initialData?.contact || ''}
          onChange={(e) => onDataChange('contact', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
        />
        {validationErrors?.contact && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.contact}</p>
        )}
      </div>

      <div>
        <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          주소
        </label>
        <input
          type="text"
          id="storeAddress"
          name="address"
          value={initialData?.address || ''}
          onChange={(e) => onDataChange('address', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
        />
        {validationErrors?.address && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.address}</p>
        )}
      </div>

      <div>
        <label htmlFor="storeDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          매장 소개
        </label>
        <textarea
          id="storeDescription"
          name="description"
          rows={3}
          value={initialData?.description || ''}
          onChange={(e) => onDataChange('description', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
        />
        {validationErrors?.description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.description}</p>
        )}
      </div>
      {/* 나머지 매장 정보 필드들 추가 */}
    </div>
  );
};

export default StoreInfoForm; 