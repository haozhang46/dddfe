import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { AppDepsProvider } from './presentation/AppDepsContext'
import { createAppDeps } from './presentation/createAppDeps'
import { AuthProvider } from './presentation/auth/AuthContext'

const appDeps = createAppDeps()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppDepsProvider deps={appDeps}>
        <AuthProvider deps={appDeps.auth}>
          <App />
        </AuthProvider>
      </AppDepsProvider>
    </BrowserRouter>
  </StrictMode>,
)
