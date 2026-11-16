import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import './styles/tokens.css'
import './styles/global.css'
import { store } from './app/store'
import { router } from './app/router'
import { ToastProvider } from './components/ui'
import { useLang } from './i18n'

/** Смена языка перемонтирует интерфейс: все подписи пересчитываются. */
function Root() {
  const lang = useLang()
  return <RouterProvider key={lang} router={router} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </Provider>
  </StrictMode>,
)
