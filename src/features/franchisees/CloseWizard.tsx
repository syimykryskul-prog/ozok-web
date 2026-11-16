import { useState } from 'react'
import { useList } from '../../api/hooks'
import type { Franchisee, FranchiseeSummary } from '../../api/types'
import { Dl, ErrorAlert, FormModal, Input, Select, Textarea } from '../../components/ui'
import { toISODate } from '../../lib/format'
import { FranchiseeSelect, NbsUserSelect } from '../common/pickers'
import { useAct } from '../common/useAct'
import { useT } from '../../i18n'

type Step = 1 | 2 | 3 | 4
interface Moved { users_blocked?: number; branches?: number; clients?: number; tickets?: number; leads?: number }

/** Мастер «Закрыть сотрудничество»: дата, причина, кому передать, предпросмотр переносимого. POST franchisees/{id}/close/ */
export function CloseWizard({ fr, summary, onClose }: { fr: Franchisee; summary?: FranchiseeSummary; onClose: () => void }) {
  const t = useT()
  const { act, busy } = useAct()
  const [step, setStep] = useState<Step>(1)
  const [date, setDate] = useState(toISODate(new Date()))
  const [reason, setReason] = useState('')
  const [target, setTarget] = useState<'partner' | 'user'>('partner')
  const [toPartner, setToPartner] = useState('')
  const [toUser, setToUser] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const [result, setResult] = useState<Moved | null>(null)

  const on = step >= 3
  const branches = useList<unknown>('branches/', { responsible_partner: fr.id, page_size: 1 }, { skip: !on })
  const clients = useList<unknown>('clients/', { franchisee: fr.id, page_size: 1 }, { skip: !on })
  const leads = useList<unknown>('leads/', { franchisee: fr.id, page_size: 1 }, { skip: !on })
  const tickets = useList<unknown>('tickets/', { franchisee: fr.id, status: 'open', page_size: 1 }, { skip: !on })
  const partners = useList<Franchisee>('franchisees/', { status: 'franchisee', page_size: 100 }, { skip: !on || target !== 'partner' })

  const next = () => {
    const e: Record<string, string> = {}
    if (step === 1) {
      if (!date) e.date = t('franchisees.close.dateRequired')
      if (!reason.trim()) e.reason = t('franchisees.tier.reasonRequired')
    }
    if (step === 2) {
      if (target === 'partner' && !toPartner) e.to = t('franchisees.close.pickPartner')
      if (target === 'user' && !toUser) e.to = t('franchisees.close.pickUser')
    }
    setErr(e)
    if (Object.keys(e).length === 0) setStep((s) => (s + 1) as Step)
  }

  const submit = async () => {
    const r = await act<{ transfer?: Moved }>(`franchisees/${fr.id}/close/`, {
      closed_at: date, reason: reason.trim(),
      ...(target === 'partner' ? { transfer_to_partner: Number(toPartner) } : { transfer_to_user: Number(toUser) }),
    }, t('franchisees.close.closed'))
    if (r) { setResult(r.transfer ?? {}); setStep(4) }
  }

  const targetName = target === 'partner'
    ? (partners.rows ?? []).find((p) => String(p.id) === toPartner)?.name ?? t('franchisees.close.partnerNo', { id: toPartner })
    : t('franchisees.close.userNo', { id: toUser })
  const activeContracts = (summary?.contracts ?? []).filter((c) => c.status === 'active').length

  if (step === 4) {
    return (
      <FormModal title={t('franchisees.close.closed')} onClose={onClose} onSubmit={onClose} submitLabel={t('common.done')}>
        <Dl items={[
          [t('franchisees.close.usersBlocked'), result?.users_blocked ?? 0], [t('franchisees.close.branches'), result?.branches ?? 0], [t('franchisees.close.clients'), result?.clients ?? 0],
          [t('franchisees.close.tickets'), result?.tickets ?? 0], [t('franchisees.close.leads'), result?.leads ?? 0],
        ]} />
      </FormModal>
    )
  }

  return (
    <FormModal title={t('franchisees.close.stepTitle', { step })} onClose={onClose} onSubmit={step === 3 ? submit : next} saving={busy}
      submitLabel={step === 3 ? t('franchisees.closeCoop') : t('common.next')}
      left={step > 1 ? <button type="button" className="link-strong" onClick={() => setStep((s) => (s - 1) as Step)}>{t('common.back')}</button> : undefined}>
      <p className="muted" style={{ margin: 0 }}>{fr.name}</p>
      {step === 1 && (
        <>
          <Input label={t('franchisees.close.date')} type="date" value={date} error={err.date} onChange={(e) => setDate(e.target.value)} hint={t('franchisees.close.dateHint')} />
          <Textarea label={t('common.reason')} value={reason} error={err.reason} onChange={(e) => setReason(e.target.value)} />
        </>
      )}
      {step === 2 && (
        <>
          <Select label={t('franchisees.close.whom')} options={[{ value: 'partner', label: t('franchisees.close.toPartner') }, { value: 'user', label: t('franchisees.close.toUser') }]} value={target} onChange={(e) => setTarget(e.target.value as 'partner' | 'user')} />
          {target === 'partner'
            ? <FranchiseeSelect label={t('franchisees.close.receiver')} value={toPartner} onChange={setToPartner} error={err.to} onlyActive />
            : <NbsUserSelect label={t('franchisees.close.nbsUser')} value={toUser} onChange={setToUser} error={err.to} />}
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('franchisees.close.note')}</p>
        </>
      )}
      {step === 3 && (
        <>
          <ErrorAlert error={branches.error ?? clients.error} />
          <div className="hint-box">
            <strong>{t('franchisees.close.willHappen', { date })}</strong>
            <ul className="list" style={{ marginTop: 8 }}>
              <li className="list__item"><span>{t('franchisees.close.accessBlocked')}</span><strong>{summary?.employees?.filter((u) => u.is_active).length ?? '—'}</strong></li>
              <li className="list__item"><span>{t('franchisees.close.contractsClosed')}</span><strong>{summary ? activeContracts : '—'}</strong></li>
              <li className="list__item"><span>{t('franchisees.close.branchesMoved')}</span><strong>{branches.data?.count ?? '…'}</strong></li>
              {target === 'partner' && <li className="list__item"><span>{t('franchisees.close.clientsMoved')}</span><strong>{clients.data?.count ?? '…'}</strong></li>}
              <li className="list__item"><span>{t('franchisees.close.openTickets')}</span><strong>{tickets.data?.count ?? '…'}</strong></li>
              <li className="list__item"><span>{t('franchisees.close.leadsReassigned')}</span><strong>{leads.data?.count ?? '…'}</strong></li>
            </ul>
            <p style={{ margin: '8px 0 0' }}>{t('franchisees.close.recipient', { name: targetName, reason })}</p>
          </div>
        </>
      )}
    </FormModal>
  )
}
