import { Link } from 'react-router-dom'
import { useT } from '../../i18n'

/** Текстовая заглушка логотипа — всегда на белой подложке. Заменить на assets/ozok-logo.png, когда файл появится. */
export function Logo() {
  const t = useT()
  return (
    <Link to="/" className="logo" aria-label={t('nav.home')}>
      <span className="logo__mark" aria-hidden />
      OZOK
    </Link>
  )
}
