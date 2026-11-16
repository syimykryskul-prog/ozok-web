import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { useT } from '../../i18n'
import { cls } from '../../lib/format'

export function Modal({
  open, title, onClose, children, footer, wide,
}: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        const list = Array.from(f).filter((x) => !x.hasAttribute('disabled'))
        if (!list.length) return
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>('input:not([disabled]), select, textarea')
      ;(el ?? ref.current)?.focus()
    }, 30)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={cls('modal', wide && 'modal--wide')} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="modal__head">
          <h2 style={{ fontSize: 22 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}><X size={22} /></button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open, title, text, confirmLabel, danger, loading, onConfirm, onClose,
}: {
  open: boolean; title: string; text: ReactNode; confirmLabel?: string; danger?: boolean
  loading?: boolean; onConfirm: () => void; onClose: () => void
}) {
  const t = useT()
  return (
    <Modal
      open={open} title={title} onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.back')}</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel ?? t('common.confirm')}</Button>
        </>
      }
    >
      <p>{text}</p>
    </Modal>
  )
}
