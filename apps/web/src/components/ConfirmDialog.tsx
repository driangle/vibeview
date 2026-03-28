import { useEffect, useRef } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <Modal onClose={onCancel} className="w-full max-w-sm bg-card">
      <div role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div className="p-6">
          <h2 id="confirm-title" className="text-sm font-semibold text-fg">
            {title}
          </h2>
          <p id="confirm-message" className="mt-2 text-sm text-muted-fg">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-fg transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-destructive/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
