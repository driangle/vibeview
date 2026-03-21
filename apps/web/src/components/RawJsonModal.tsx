import { Modal } from './Modal';

interface RawJsonModalProps {
  data: unknown;
  onClose: () => void;
}

export function RawJsonModal({ data, onClose }: RawJsonModalProps) {
  return (
    <Modal onClose={onClose} className="w-full max-w-2xl bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Raw message</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
      <pre className="overflow-auto p-4 text-xs text-gray-700 dark:text-gray-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </Modal>
  );
}
