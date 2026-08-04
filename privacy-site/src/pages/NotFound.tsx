import React from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { SEOHead } from '../components/SEOHead'

export const NotFound: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Page Not Found"
        description="The page you're looking for doesn't exist. Return to the Kart Kirana Privacy Policies."
        path="/404"
      />

      <div className="not-found">
        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-desc">
          The page you're looking for doesn't exist or has been moved. Head back to our privacy policies.
        </p>
        <Link to="/privacy" className="btn-primary">
          <Home size={18} />
          Back to Privacy Policies
        </Link>
      </div>
    </>
  )
}
