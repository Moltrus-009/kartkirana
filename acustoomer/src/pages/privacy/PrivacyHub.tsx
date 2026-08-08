import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Store, Bike, ArrowRight, Shield } from 'lucide-react'
import { SEOHead } from '../../components/privacy/SEOHead'

export const PrivacyHub: React.FC = () => {
  return (
    <div className="privacy-app">
      <SEOHead
        title="Privacy Policies"
        description="Read how Kart Kirana protects your data across our Customer, Shopkeeper, and Delivery Rider applications. Compliant with Google Play, GDPR, and Indian DPDP Act."
        path="/privacy"
      />

      {/* Hero Section */}
      <section className="hub-hero">
        <div className="hub-badge">
          <Shield size={14} />
          Data Protection & Privacy
        </div>
        <h1 className="hub-title">Privacy Policies</h1>
        <p className="hub-description">
          At Kart Kirana, transparency and trust are at the core of everything we do. Read our privacy policies to understand how we collect, use, and protect your data across our platform.
        </p>
      </section>

      {/* Cards Grid */}
      <div className="hub-grid">
        {/* Customer Card */}
        <Link to="/privacy/customer" className="hub-card customer">
          <div className="hub-card-icon">
            <ShoppingBag size={24} />
          </div>
          <h2 className="hub-card-title">Customer App</h2>
          <p className="hub-card-desc">
            How we handle your profile, delivery addresses, order history, payment information, and live order tracking data.
          </p>
          <span className="hub-card-link">
            Read Policy <ArrowRight size={16} />
          </span>
        </Link>

        {/* Shopkeeper Card */}
        <Link to="/privacy/shopkeeper" className="hub-card shopkeeper">
          <div className="hub-card-icon">
            <Store size={24} />
          </div>
          <h2 className="hub-card-title">Shopkeeper App</h2>
          <p className="hub-card-desc">
            How we handle your business information, product inventory, earnings data, order management, and product photographs.
          </p>
          <span className="hub-card-link">
            Read Policy <ArrowRight size={16} />
          </span>
        </Link>

        {/* Rider Card */}
        <Link to="/privacy/rider" className="hub-card rider">
          <div className="hub-card-icon">
            <Bike size={24} />
          </div>
          <h2 className="hub-card-title">Delivery Rider App</h2>
          <p className="hub-card-desc">
            How we handle your GPS location during deliveries, rider profile, earnings, order history, and navigation data.
          </p>
          <span className="hub-card-link">
            Read Policy <ArrowRight size={16} />
          </span>
        </Link>
      </div>

      {/* Compliance Banner */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto 3rem',
        padding: '1.5rem 2rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Our privacy policies comply with the <strong>Google Play User Data Policy</strong>, <strong>GDPR</strong> principles, the <strong>Indian Digital Personal Data Protection Act, 2023</strong>, and <strong>Firebase</strong> best practices. We are committed to protecting your personal information with industry-standard security measures.
        </p>
      </div>
    </div>
  )
}
