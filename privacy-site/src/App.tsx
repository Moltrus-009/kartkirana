import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PrivacyHub } from './pages/PrivacyHub'
import { CustomerPrivacy } from './pages/CustomerPrivacy'
import { ShopkeeperPrivacy } from './pages/ShopkeeperPrivacy'
import { RiderPrivacy } from './pages/RiderPrivacy'
import { NotFound } from './pages/NotFound'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/privacy" replace />} />
        <Route path="/privacy" element={<PrivacyHub />} />
        <Route path="/privacy/customer" element={<CustomerPrivacy />} />
        <Route path="/privacy/shopkeeper" element={<ShopkeeperPrivacy />} />
        <Route path="/privacy/rider" element={<RiderPrivacy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default App
