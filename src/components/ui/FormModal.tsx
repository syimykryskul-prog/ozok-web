import { useId } from 'react'
import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import { useT } from '../../i18n'


export function FormModal({
  title, onClose, onSubmit, saving, error, children, left, wide, submitLabel,
}: {
  title: string; onClose: () => void; onSubmit: () => void; saving?: boolean; error?: string
  children: ReactNode; left?: ReactNode; wide?: boolean; submitLabel?: string
}) {
  const t = useT()
  const fid = useId()
  return (
    <Modal
      open title={title} onClose={onClose} wide={wide}
      footer={
        <>
          {left && <div style={{ marginRight: 'auto' }}>{left}</div>}
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form={fid} loading={saving}>{submitLabel ?? t('common.save')}</Button>
        </>
      }
    >
      <form id={fid} noValidate onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="stack">
        {error && <div className="alert alert--error" role="alert"><TriangleAlert size={18} aria-hidden />{error}</div>}
        {children}
      </form>
    </Modal>
  )
}
