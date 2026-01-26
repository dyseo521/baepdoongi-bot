'use client';

import { type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  isLoading = false,
  variant = 'danger',
}: ConfirmModalProps) {
  const variantConfig = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
      buttonVariant: 'danger' as const,
      bgColor: 'bg-red-50',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
      buttonVariant: 'primary' as const,
      bgColor: 'bg-yellow-50',
    },
    default: {
      icon: null,
      buttonVariant: 'primary' as const,
      bgColor: 'bg-gray-50',
    },
  };

  const config = variantConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <div className="flex gap-3 w-full">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {config.icon && (
            <div className={`p-3 rounded-full ${config.bgColor}`}>
              {config.icon}
            </div>
          )}
          <div className="flex-1 text-gray-600">{message}</div>
        </div>
      </div>
    </Modal>
  );
}
