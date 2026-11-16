import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { useSend } from '../../api/hooks'
import { Button, Input } from '../../components/ui'
import { Logo } from '../../components/layout/Logo'
import { errorMessage } from '../../lib/errors'
import { setUser } from './authSlice'
import { useT } from '../../i18n'

/** Смена пароля: обязательна при первом входе с временным паролем (must_change_password). */
export default function ChangePasswordPage() {
  const t = useT()
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from
  const [send] = useSend()
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (!user) return <Navigate to="/login" replace />
  const forced = !!user.must_change_password
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    if (pw === cur) return setErr(t('chpwd.mustDiffer'))
    if (pw.length < 8) return setErr(t('chpwd.minLength'))
    if (pw !== pw2) return setErr(t('chpwd.mismatch'))
    setBusy(true)
    try {
      await send('auth/change-password/', { old_password: cur, new_password: pw })
      dispatch(setUser({ ...user, must_change_password: false }))
      navigate(from && from !== '/change-password' ? from : '/', { replace: true })
    } catch (error) { setErr(errorMessage(error)) } finally { setBusy(false) }
  }
  return (
    <div className="login">
      <form className="login__card stack" onSubmit={submit} noValidate style={{ maxWidth: 420, margin: '10vh auto', padding: 32, background: 'var(--surface)', borderRadius: 20 }}>
        <Logo />
        <h1 style={{ margin: 0 }}>{forced ? t('chpwd.forcedTitle') : t('chpwd.title')}</h1>
        {forced && <p className="muted" style={{ margin: 0 }}>{t('chpwd.forcedNote')}</p>}
        {err && <div className="alert alert--error" role="alert"><TriangleAlert size={18} aria-hidden />{err}</div>}
        <Input label={forced ? t('chpwd.tempPassword') : t('chpwd.currentPassword')} type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <Input label={t('chpwd.newPassword')} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Input label={t('chpwd.repeatPassword')} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <Button type="submit" loading={busy}>{t('chpwd.submit')}</Button>
      </form>
    </div>
  )
}
