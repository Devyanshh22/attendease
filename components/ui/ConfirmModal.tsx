'use client'

import { Modal } from './Modal'
import { Button } from './Button'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
}

export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', loading }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[13px] text-[#6B6B6B] mb-5">{description}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={loading}>
          {loading ? 'Deleting…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
