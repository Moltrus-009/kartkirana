import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronDown, Calendar, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface TOCItem {
  id: string
  number: number
  title: string
}

interface PolicyLayoutProps {
  title: string
  subtitle: string
  icon: LucideIcon
  iconVariant: 'customer' | 'shopkeeper' | 'rider'
  breadcrumbLabel: string
  tocItems: TOCItem[]
  effectiveDate: string
  lastUpdated: string
  children: React.ReactNode
}

export const PolicyLayout: React.FC<PolicyLayoutProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconVariant,
  breadcrumbLabel,
  tocItems,
  effectiveDate,
  lastUpdated,
  children
}) => {
  const [mobileTocOpen, setMobileTocOpen] = useState(false)

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setMobileTocOpen(false)
    }
  }

  return (
    <div className="privacy-app">
      {/* Policy Header */}
      <div className="policy-header" style={{ paddingTop: '2rem' }}>
        {/* Breadcrumb */}
        <nav className="policy-breadcrumb">
          <Link to="/privacy">Privacy Policies</Link>
          <span className="policy-breadcrumb-sep"><ChevronRight size={14} /></span>
          <span>{breadcrumbLabel}</span>
        </nav>

        {/* Title Block */}
        <div className="policy-title-block">
          <div className={`policy-icon-box ${iconVariant}`}>
            <Icon size={28} />
          </div>
          <div>
            <h1 className="policy-title">{title}</h1>
            <p className="policy-subtitle">{subtitle}</p>
            <div className="policy-meta">
              <span className="policy-meta-item">
                <Calendar size={14} />
                Effective: {effectiveDate}
              </span>
              <span className="policy-meta-item">
                <Clock size={14} />
                Updated: {lastUpdated}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile TOC */}
      <div className="mobile-toc">
        <button
          className={`mobile-toc-toggle ${mobileTocOpen ? 'open' : ''}`}
          onClick={() => setMobileTocOpen(!mobileTocOpen)}
        >
          <span>📑 Table of Contents</span>
          <ChevronDown size={16} />
        </button>
        <div className={`mobile-toc-list ${mobileTocOpen ? 'open' : ''}`}>
          {tocItems.map(item => (
            <button
              key={item.id}
              className="mobile-toc-link"
              onClick={() => scrollToSection(item.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: 'transparent' }}
            >
              {item.number}. {item.title}
            </button>
          ))}
        </div>
      </div>

      {/* Content Layout */}
      <div className="policy-layout">
        {/* Desktop Sidebar TOC */}
        <aside className="policy-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-title">Table of Contents</h3>
            <ul className="sidebar-nav">
              {tocItems.map(item => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="sidebar-link"
                    onClick={(e) => {
                      e.preventDefault()
                      scrollToSection(item.id)
                    }}
                  >
                    <span className="sidebar-link-number">{item.number}.</span>
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Policy Sections */}
        <div className="policy-content">
          {children}
        </div>
      </div>
    </div>
  )
}
