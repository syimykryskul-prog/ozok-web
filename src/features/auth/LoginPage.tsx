import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { Button, Input } from '../../components/ui'
import { Logo } from '../../components/layout/Logo'
import { useT } from '../../i18n'
import { LangSwitch } from '../ui/LangSwitch'
import { ThemeToggle } from '../ui/ThemeToggle'
import { errorMessage } from '../../lib/errors'
import { setCredentials } from './authSlice'
import { useLoginMutation, useLoginOtpMutation } from './authApi'

export default function LoginPage() {
  const t = useT()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const authed = useAppSelector((s) => !!s.auth.access)
  const [login, { isLoading }] = useLoginMutation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginOtp, { isLoading: otpLoading }] = useLoginOtpMutation()
  const [error, setError] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [code, setCode] = useState('')

  const user = useAppSelector((s) => s.auth.user)
  const fromState = (location.state as { from?: string } | null)?.from
  // рабочий экран роли открывается первым: финансист — Касса
  const from = fromState ?? (user?.role === 'finance' ? '/cash' : '/')
  if (authed) return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (otpToken) {
        const res = await loginOtp({ otp_token: otpToken, code: code.trim() }).unwrap()
        dispatch(setCredentials(res))
        navigate(from, { replace: true })
        return
      }
      const res = await login({ email: email.trim(), password }).unwrap()
      if (res.otp_required) {
        setOtpToken(res.otp_token)
        return
      }
      dispatch(setCredentials({ access: res.access, refresh: res.refresh, user: res.user }))
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="login">
      <div className="login__side" style={{ position: 'relative' }}>
        <div className="login__logo"><Logo /></div>
        <div className="login__tools"><LangSwitch /><ThemeToggle /></div>
        <div className="login__form-wrap">
          <div className="page-header__text">
            <span className="eyebrow">{t('login.eyebrow')}</span>
            <h1>{t('login.title')}</h1>
            <p className="muted">{t('login.lead')}</p>
          </div>
          <form className="login__card" onSubmit={submit} noValidate>
            {error && (
              <div className="alert alert--error" role="alert"><TriangleAlert size={18} aria-hidden />{error}</div>
            )}
            {otpToken ? (
              <>
                <p className="muted">{t('login.otpHint')}</p>
                <Input label={t('login.otpLabel')} inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
                <Button type="submit" size="lg" loading={otpLoading} disabled={code.trim().length < 6}>{t('common.confirm')}</Button>
                <Button variant="ghost" onClick={() => { setOtpToken(''); setCode(''); setError('') }}>{t('common.back')}</Button>
              </>
            ) : (
              <>
                <Input label={t('login.email')} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@ozok.kg" />
                <Input label={t('login.password')} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Button type="submit" size="lg" loading={isLoading} disabled={!email || !password}>{t('login.submit')}</Button>
              </>
            )}
            <p className="login__hint">
              {t('login.demo1')} <strong>admin@ozok.kg</strong> — OZOK, <strong>osh@ozok.kg</strong> — {t('login.demoFr')}.<br />{t('login.password')}: <strong>demo12345</strong>
            </p>
          </form>
        </div>
      </div>
      <aside className="login__hero on-dark">
        <span className="eyebrow">OZOK Network</span>
        <h2>{t('login.heroTitle')}</h2>
        <p>{t('login.heroText')}</p>
        <ul className="bullets">
          <li>{t('login.b1')}</li>
          <li>{t('login.b2')}</li>
          <li>{t('login.b3')}</li>
        </ul>
      </aside>
    </div>
  )
}
