import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Sun, Moon, ArrowUp } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kk-theme')
      if (saved === 'dark' || saved === 'light') return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  const [showBackToTop, setShowBackToTop] = useState(false)
  const location = useLocation()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kk-theme', theme)
  }, [theme])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <Link to="/privacy" className="header-brand">
            <div className="brand-icon">
              <ShoppingCart size={20} />
            </div>
            <div className="brand-text">
              <span className="brand-name">Kart Kirana</span>
              <span className="brand-subtitle">Privacy & Legal</span>
            </div>
          </Link>

          <div className="header-actions">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand">
              <div className="footer-brand-icon">
                <ShoppingCart size={16} />
              </div>
              <span className="footer-brand-name">Kart Kirana</span>
            </div>
            <p className="footer-text">
              India's hyperlocal grocery delivery platform. Connecting customers with local kirana stores for instant 15-minute deliveries.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-links-group">
              <h4>Privacy Policies</h4>
              <ul>
                <li><Link to="/privacy/customer">Customer App</Link></li>
                <li><Link to="/privacy/shopkeeper">Shopkeeper App</Link></li>
                <li><Link to="/privacy/rider">Delivery Rider App</Link></li>
              </ul>
            </div>
            <div className="footer-links-group">
              <h4>Contact</h4>
              <ul>
                <li><a href="mailto:support@kartkirana.com">support@kartkirana.com</a></li>
                <li><a href="https://kartkirana.com">kartkirana.com</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Kart Kirana. All rights reserved.</span>
          <span>Made with ❤️ in India</span>
        </div>
      </footer>

      {/* Back to Top */}
      <button
        className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <ArrowUp size={20} />
      </button>
    </div>
  )
}
