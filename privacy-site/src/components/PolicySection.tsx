import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface PolicySectionProps {
  id: string
  number: number
  title: string
  icon: LucideIcon
  iconColor: string
  children: React.ReactNode
}

export const PolicySection: React.FC<PolicySectionProps> = ({
  id,
  number,
  title,
  icon: Icon,
  iconColor,
  children
}) => {
  return (
    <section className="policy-section" id={id}>
      <div className="section-header">
        <div className={`section-icon ${iconColor}`}>
          <Icon size={18} />
        </div>
        <div>
          <span className="section-number">Section {number}</span>
          <h2 className="section-title">{title}</h2>
        </div>
      </div>
      <div className="section-body">
        {children}
      </div>
    </section>
  )
}
