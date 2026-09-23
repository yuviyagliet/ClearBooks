import { Analytics } from '@vercel/analytics/react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import { Login, Signup, ForgotPassword, UpdatePassword } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import IncomePage from './pages/Income'
import ExpensesPage from './pages/Expenses'
import ClientsPage from './pages/Clients'
import InvoicesPage from './pages/Invoices'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import { Privacy, Terms, Security } from './pages/StaticPages'
import ErrorBoundary from './components/ErrorBoundary'

function Protected({ children }){
  const { user, loading } = useAuth()
  if(loading) return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Loading…</div>
  if(!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function PublicOnly({ children }){
  const { user, loading } = useAuth()
  if(loading) return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Loading…</div>
  if(user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App(){
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/security" element={<Security />} />
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
              <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="/income" element={<Protected><IncomePage /></Protected>} />
              <Route path="/expenses" element={<Protected><ExpensesPage /></Protected>} />
              <Route path="/clients" element={<Protected><ClientsPage /></Protected>} />
              <Route path="/invoices" element={<Protected><InvoicesPage /></Protected>} />
              <Route path="/reports" element={<Protected><Reports /></Protected>} />
              <Route path="/settings" element={<Protected><Settings /></Protected>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Analytics />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
