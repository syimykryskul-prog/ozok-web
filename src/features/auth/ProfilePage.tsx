import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAppSelector } from '../../app/hooks'
import { Badge, Button, Card, CardTitle, Dl, Input, PageHeader } from '../../components/ui'
import { ROLES } from '../../lib/status'
import { useAct } from '../common/useAct'
import { baseApi } from '../../api/baseApi'
import { useAppDispatch } from '../../app/hooks'
import { useT } from '../../i18n'

interface Setup { otpauth_url?: string; otpauth?: string; uri?: string; secret?: string }

export default function ProfilePage() {
  const t = useT()
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const { act, busy } = useAct()
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState('')
  const enabled = !!(user?.otp_enabled ?? user?.two_factor_enabled)

  const refreshMe = () => dispatch(baseApi.util.invalidateTags(['Me']))
  const start = async () => { const r = await act<Setup>('auth/2fa/setup/'); if (r) setSetup(r) }
  const enable = async () => {
    const r = await act('auth/2fa/enable/', { code: code.trim() }, t('profile.enabledMsg'))
    if (r !== undefined) { setSetup(null); setCode(''); refreshMe() }
  }
  const disable = async () => {
    const r = await act('auth/2fa/disable/', { code: code.trim() }, t('profile.disabledMsg'))
    if (r !== undefined) { setCode(''); refreshMe() }
  }
  const link = setup?.otpauth_url ?? setup?.otpauth ?? setup?.uri

  return (
    <div className="page">
      <PageHeader eyebrow={t('profile.eyebrow')} title={t('profile.title')} />
      <div className="grid grid--2" style={{ alignItems: 'start' }}>
        <Card white>
          <CardTitle>{t('profile.data')}</CardTitle>
          <Dl items={[[t('profile.name'), user?.full_name], [t('common.email'), user?.email], [t('profile.role'), ROLES[user?.role ?? ''] ?? user?.role], [t('profile.partner'), user?.franchisee?.name ?? user?.partner?.name ?? 'OZOK']]} />
        </Card>
        <Card white>
          <CardTitle actions={enabled ? <Badge tone="success" icon={ShieldCheck}>{t('profile.on')}</Badge> : <Badge>{t('profile.off')}</Badge>}>{t('profile.twoFa')}</CardTitle>
          <div className="stack">
            <p className="muted">{t('profile.twoFaNote')}</p>
            {!enabled && !setup && <Button onClick={start} loading={busy}>{t('profile.setup')}</Button>}
            {setup && (
              <div className="stack">
                <div className="hint-box">
                  {t('profile.step1')}<br />
                  {link && <><a href={link} className="link-strong" style={{ wordBreak: 'break-all' }}>{link}</a><br /></>}
                  {setup.secret && <>{t('profile.key')} <strong>{setup.secret}</strong><br /></>}
                  {t('profile.step2')}
                </div>
                <Input label={t('profile.code')} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
                <div className="row"><Button onClick={enable} loading={busy} disabled={code.trim().length < 6}>{t('profile.enable')}</Button><Button variant="secondary" onClick={() => setSetup(null)}>{t('common.cancel')}</Button></div>
              </div>
            )}
            {enabled && (
              <div className="stack">
                <Input label={t('profile.disableCode')} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
                <div><Button variant="danger" onClick={disable} loading={busy} disabled={code.trim().length < 6}>{t('profile.disable')}</Button></div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
