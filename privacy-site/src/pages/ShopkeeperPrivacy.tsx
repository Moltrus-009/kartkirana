import React from 'react'
import {
  Store, FileText, Database, MapPin, Camera,
  Settings, CreditCard, Link2, Shield, Clock,
  UserCheck, RefreshCw, Mail, Share2, Baby,
  Globe, Scale, Trash2, ShieldX, Bell, Wifi,
  HardDrive, Cookie, Building2, AlertTriangle,
  Package
} from 'lucide-react'
import { SEOHead } from '../components/SEOHead'
import { PolicyLayout } from '../components/PolicyLayout'
import { PolicySection } from '../components/PolicySection'

const tocItems = [
  { id: 'introduction', number: 1, title: 'Introduction' },
  { id: 'information-collect', number: 2, title: 'Information We Collect' },
  { id: 'not-collect', number: 3, title: 'What We Do NOT Collect' },
  { id: 'location', number: 4, title: 'Location Data' },
  { id: 'permissions', number: 5, title: 'Device Permissions' },
  { id: 'payment', number: 6, title: 'Payment and Earnings' },
  { id: 'how-we-use', number: 7, title: 'How We Use Your Information' },
  { id: 'business-data', number: 8, title: 'Business Information' },
  { id: 'inventory', number: 9, title: 'Inventory and Sales Data' },
  { id: 'sharing', number: 10, title: 'How We Share Information' },
  { id: 'third-party', number: 11, title: 'Third-Party Services' },
  { id: 'security', number: 12, title: 'Data Security' },
  { id: 'retention', number: 13, title: 'Data Retention' },
  { id: 'deletion', number: 14, title: 'Data Deletion' },
  { id: 'your-rights', number: 15, title: 'Your Rights' },
  { id: 'children', number: 16, title: "Children's Privacy" },
  { id: 'cookies', number: 17, title: 'Cookies (Website)' },
  { id: 'transfers', number: 18, title: 'International Transfers' },
  { id: 'legal-basis', number: 19, title: 'Legal Basis for Processing' },
  { id: 'data-safety', number: 20, title: 'Google Play Data Safety' },
  { id: 'grievance', number: 21, title: 'Grievance Officer' },
  { id: 'changes', number: 22, title: 'Changes to This Policy' },
  { id: 'contact', number: 23, title: 'Contact Us' },
]

export const ShopkeeperPrivacy: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Shopkeeper App Privacy Policy"
        description="Privacy Policy for the Kart Kirana Shopkeeper App. Learn how we collect, use, store, and protect your business information, inventory, earnings, and order management data."
        path="/privacy/shopkeeper"
      />

      <PolicyLayout
        title="Privacy Policy – Kart Kirana Shopkeeper App"
        subtitle="How we protect your business data on the Kart Kirana Shopkeeper application"
        icon={Store}
        iconVariant="shopkeeper"
        breadcrumbLabel="Shopkeeper App"
        tocItems={tocItems}
        effectiveDate="August 2, 2026"
        lastUpdated="August 3, 2026"
      >
        {/* Privacy Summary Card */}
        <div className="privacy-summary">
          <div className="privacy-summary-title">
            <ShieldX size={18} />
            Privacy at a Glance
          </div>
          <div className="privacy-summary-grid">
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              We never sell your business data
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              Settlements are processed securely
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              OTP authentication via Firebase
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              You control device permissions
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              You can delete your account from the app
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              Sensitive payment credentials never stored
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <span className="updated-badge">
            <RefreshCw size={12} />
            Last Updated: August 3, 2026
          </span>
        </div>

        {/* 1. Introduction */}
        <PolicySection id="introduction" number={1} title="Introduction" icon={FileText} iconColor="green">
          <p>
            This Privacy Policy explains how Kart Kirana ("we," "our," or "us") collects, uses, stores, and protects information when you use the Kart Kirana Shopkeeper App (the "App"), available on the Google Play Store. The App is designed for kirana store owners and managers to manage inventory, receive orders, track earnings, and coordinate deliveries.
          </p>
          <p>
            <strong>Effective Date:</strong> This policy is effective from August 2, 2026. The "Last Updated" date reflects the most recent revision.
          </p>
          <p>By using the App, you agree to the collection and use of information in accordance with this Privacy Policy.</p>
          <div className="legal-entity">
            <strong>Operator</strong>
            Kart Kirana Technologies<br />
            Bengaluru, Karnataka, India<br />
            <a href="https://kartkirana.com" target="_blank" rel="noopener noreferrer">https://kartkirana.com</a>
          </div>
        </PolicySection>

        {/* 2. Information We Collect */}
        <PolicySection id="information-collect" number={2} title="Information We Collect" icon={Database} iconColor="green">
          <p>We may collect the following information:</p>

          <p><strong>Business and Personal Information</strong></p>
          <ul>
            <li>Shop name</li>
            <li>Business owner name</li>
            <li>Mobile number</li>
            <li>Email address (if provided)</li>
            <li>Shop address and business location</li>
            <li>GST or other tax information (if provided)</li>
            <li>Bank account details required for payouts (if applicable)</li>
            <li>Store logo, banner, and profile images</li>
          </ul>

          <p><strong>Inventory and Catalog Data</strong></p>
          <ul>
            <li>Product names, descriptions, and categories</li>
            <li>Product prices (MRP and selling price)</li>
            <li>Stock quantities and availability status</li>
            <li>Product images</li>
          </ul>

          <p><strong>Order and Financial Data</strong></p>
          <ul>
            <li>Incoming and completed orders</li>
            <li>Order values, items, and timestamps</li>
            <li>Sales reports and earnings summaries</li>
            <li>Settlement and payout history</li>
            <li>Transaction IDs and payment statuses</li>
          </ul>

          <p><strong>Device and Technical Information</strong></p>
          <ul>
            <li>Device model and operating system</li>
            <li>App version</li>
            <li>IP address and device identifiers</li>
            <li>Crash logs and diagnostic information</li>
            <li>App usage patterns</li>
          </ul>
        </PolicySection>

        {/* 3. What We Do NOT Collect */}
        <PolicySection id="not-collect" number={3} title="What We Do NOT Collect" icon={ShieldX} iconColor="red">
          <p>Kart Kirana does <strong>not</strong> collect, store, or have access to:</p>
          <div className="do-not-collect">
            <div className="do-not-collect-title">
              <AlertTriangle size={14} />
              We never store:
            </div>
            <div className="do-not-collect-grid">
              <div className="do-not-collect-item"><span className="do-not-collect-x">✗</span> Passwords</div>
              <div className="do-not-collect-item"><span className="do-not-collect-x">✗</span> Bank Passwords</div>
              <div className="do-not-collect-item"><span className="do-not-collect-x">✗</span> UPI PIN</div>
              <div className="do-not-collect-item"><span className="do-not-collect-x">✗</span> Credit / Debit Card Numbers</div>
              <div className="do-not-collect-item"><span className="do-not-collect-x">✗</span> CVV / CVC Codes</div>
              <div className="do-not-collect-item"><span className="do-not-collect-x">✗</span> Biometric Information</div>
            </div>
          </div>
        </PolicySection>

        {/* 4. Location Data */}
        <PolicySection id="location" number={4} title="Location Data" icon={MapPin} iconColor="green">
          <p>With your permission, the App accesses your device's location to:</p>
          <ul>
            <li>Verify and place your store accurately on the map for customer discovery</li>
            <li>Calculate delivery radius and estimated delivery times</li>
            <li>Display nearby customer order requests</li>
            <li>Improve delivery coordination</li>
          </ul>
          <p>Background location is <strong>not</strong> collected by the Shopkeeper App. You may manually enter your store address instead of using GPS-based detection.</p>
        </PolicySection>

        {/* 5. Device Permissions */}
        <PolicySection id="permissions" number={5} title="Device Permissions" icon={Settings} iconColor="purple">
          <p>The App may request the following permissions:</p>
          <div className="permissions-table-wrapper">
            <table className="permissions-table">
              <thead>
                <tr>
                  <th>Permission</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="permission-name"><MapPin size={14} /> Location</span></td>
                  <td>Verify store placement on map, delivery radius</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><Camera size={14} /> Camera</span></td>
                  <td>Capture product photos, store logo, and banner images</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><HardDrive size={14} /> Photos / Storage</span></td>
                  <td>Select existing product or store images from gallery</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><Bell size={14} /> Notifications</span></td>
                  <td>New order alerts, order status updates, platform announcements</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><Wifi size={14} /> Internet</span></td>
                  <td>Core app functionality, real-time order management</td>
                </tr>
              </tbody>
            </table>
          </div>
        </PolicySection>

        {/* 6. Payment and Earnings */}
        <PolicySection id="payment" number={6} title="Payment and Earnings" icon={CreditCard} iconColor="gold">
          <p>Customer payments are processed securely by <strong>Razorpay</strong>. Kart Kirana does not store customer payment credentials.</p>
          <p>We process and display:</p>
          <ul>
            <li>Order payment statuses</li>
            <li>Commission calculations and settlement amounts</li>
            <li>Daily, weekly, and monthly earnings summaries</li>
            <li>Payout and settlement history</li>
          </ul>
          <p>Bank account details for payouts (if applicable) are handled through separate, secure onboarding processes.</p>
        </PolicySection>

        {/* 7. How We Use Information */}
        <PolicySection id="how-we-use" number={7} title="How We Use Your Information" icon={Settings} iconColor="green">
          <p>We use your information to:</p>
          <ul>
            <li>Register and manage your store on the platform</li>
            <li>Display your store and products to nearby customers</li>
            <li>Receive and process customer orders in real-time</li>
            <li>Calculate and display earnings and settlements</li>
            <li>Coordinate with delivery riders for order pickup</li>
            <li>Send new order notifications and platform updates</li>
            <li>Provide business analytics and sales insights</li>
            <li>Improve platform quality and merchant experience</li>
            <li>Prevent fraud and misuse</li>
            <li>Comply with legal and regulatory obligations</li>
          </ul>
        </PolicySection>

        {/* 8. Business Information */}
        <PolicySection id="business-data" number={8} title="Business Information" icon={Building2} iconColor="green">
          <p>The following business information may be collected and used as part of your merchant profile:</p>
          <ul>
            <li><strong>Store Registration:</strong> Store name, category, operating hours, and delivery radius settings.</li>
            <li><strong>GST Information:</strong> GST number or other tax registration details, if voluntarily provided for invoicing purposes.</li>
            <li><strong>Store Address:</strong> Complete store address including street, city, and pincode for accurate map placement.</li>
            <li><strong>Store Images:</strong> Logo, banner, and storefront photos uploaded for customer-facing visibility.</li>
            <li><strong>Bank Account:</strong> If applicable, bank account details provided for settlement payouts are handled through secure onboarding processes.</li>
          </ul>
          <p>Business information is used solely for platform operations and is not shared for advertising purposes.</p>
        </PolicySection>

        {/* 9. Inventory and Sales Data */}
        <PolicySection id="inventory" number={9} title="Inventory and Sales Data" icon={Package} iconColor="green">
          <p>The App processes and stores the following operational data:</p>
          <ul>
            <li><strong>Product Catalog:</strong> Product names, descriptions, categories, images, and pricing managed by you.</li>
            <li><strong>Inventory Levels:</strong> Stock quantities and product availability status.</li>
            <li><strong>Order Fulfilment:</strong> Order acceptance, preparation, and dispatch records.</li>
            <li><strong>Sales Analytics:</strong> Aggregate sales reports, popular products, and order trend data to help grow your business.</li>
          </ul>
          <p>This data is visible only to you and authorised Kart Kirana personnel. Product listings and images are publicly visible to customers browsing your store.</p>
        </PolicySection>

        {/* 10. How We Share Information */}
        <PolicySection id="sharing" number={10} title="How We Share Information" icon={Share2} iconColor="green">
          <p>We may share limited information with:</p>
          <ul>
            <li><strong>Customers:</strong> Store name, address, product listings, prices, and store images for order placement.</li>
            <li><strong>Delivery Riders:</strong> Store address and order details for pickup coordination.</li>
            <li><strong>Razorpay:</strong> Transaction processing and settlement data.</li>
            <li><strong>Firebase (Google):</strong> Authentication, data storage, and crash diagnostics.</li>
            <li><strong>Google Maps Platform:</strong> Store location for map display.</li>
            <li><strong>Government Authorities:</strong> Where required by law, regulation, or court order.</li>
          </ul>
          <p><strong>We never sell business or personal information to third parties.</strong></p>
        </PolicySection>

        {/* 11. Third-Party Services */}
        <PolicySection id="third-party" number={11} title="Third-Party Services" icon={Link2} iconColor="purple">
          <p>The App integrates with:</p>
          <div className="third-party-grid">
            <div className="third-party-card">
              <div className="third-party-name">Firebase Authentication</div>
              <div className="third-party-desc">Phone number verification and merchant session management.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Firebase Firestore</div>
              <div className="third-party-desc">Cloud database for store profiles, product catalogs, orders, and earnings.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Firebase Storage</div>
              <div className="third-party-desc">Cloud storage for product images, store logos, and banners.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Firebase Crashlytics</div>
              <div className="third-party-desc">Crash reporting and diagnostics for app stability.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Google Maps Platform</div>
              <div className="third-party-desc">Store location mapping, address geocoding, and delivery coordination.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Razorpay</div>
              <div className="third-party-desc">Payment processing for customer transactions and merchant settlements.</div>
            </div>
          </div>
          <p style={{ marginTop: '1rem' }}>
            <strong>Third-party privacy policies:</strong>{' '}
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">Firebase Privacy</a>{' · '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>{' · '}
            <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay Privacy Policy</a>
          </p>
        </PolicySection>

        {/* 12. Data Security */}
        <PolicySection id="security" number={12} title="Data Security" icon={Shield} iconColor="green">
          <p>We implement reasonable technical and organisational safeguards:</p>
          <ul>
            <li><strong>Encrypted Connections:</strong> All data in transit uses HTTPS.</li>
            <li><strong>Firebase Security Rules:</strong> Merchants can only access their own store data.</li>
            <li><strong>Authentication:</strong> Secure session management via Firebase Authentication.</li>
            <li><strong>Customer Data Isolation:</strong> Customer personal details visible to merchants are limited to what is necessary for order fulfilment.</li>
          </ul>
          <p>No online system can guarantee absolute security, but we are committed to implementing best practices.</p>
        </PolicySection>

        {/* 13. Data Retention */}
        <PolicySection id="retention" number={13} title="Data Retention" icon={Clock} iconColor="teal">
          <p>Business information is retained only as long as necessary to:</p>
          <ul>
            <li>Provide services and maintain your store on the platform</li>
            <li>Maintain order, earnings, and settlement records</li>
            <li>Satisfy accounting, taxation, and legal requirements</li>
            <li>Resolve disputes and enforce agreements</li>
          </ul>
          <p>Product catalog and store images are retained while your account is active and removed upon account closure. Inactive merchant accounts may be flagged for deletion after an extended period of inactivity.</p>
        </PolicySection>

        {/* 14. Data Deletion */}
        <PolicySection id="deletion" number={14} title="Data Deletion" icon={Trash2} iconColor="red">
          <p>You can delete your account directly from the app:</p>
          <ul>
            <li>Open the Kart Kirana Shopkeeper App.</li>
            <li>Go to <strong>Settings → Delete Account</strong>.</li>
            <li>Follow the on-screen instructions to confirm deletion.</li>
          </ul>
          <p>Alternatively, you can request account closure by emailing <a href="mailto:support@kartkirana.com">support@kartkirana.com</a>.</p>
          <p><strong>Data that may be retained:</strong> Your store profile, product catalog, and images will be removed. Certain records (order history, earnings, settlements) may be retained as required by law.</p>
        </PolicySection>

        {/* 15. Your Rights */}
        <PolicySection id="your-rights" number={15} title="Your Rights" icon={UserCheck} iconColor="green">
          <p>You may have the right to:</p>
          <ul>
            <li><strong>Access:</strong> View your store information, catalog, orders, and earnings data within the App.</li>
            <li><strong>Correction:</strong> Update your store details, product information, and profile at any time.</li>
            <li><strong>Deletion:</strong> Delete your account via the app (Settings → Delete Account) or by contacting us.</li>
            <li><strong>Withdrawal of Consent:</strong> Revoke device permissions or close your account.</li>
            <li><strong>Permission Management:</strong> Manage camera, location, and storage permissions via device settings.</li>
            <li><strong>Grievance Redressal:</strong> Contact our Grievance Officer (see Section 21).</li>
          </ul>
        </PolicySection>

        {/* 16. Children's Privacy */}
        <PolicySection id="children" number={16} title="Children's Privacy" icon={Baby} iconColor="red">
          <p>
            The Kart Kirana Shopkeeper App is designed for business use by adults. We do not knowingly collect personal information from individuals below the age required by applicable law.
          </p>
        </PolicySection>

        {/* 17. Cookies (Website) */}
        <PolicySection id="cookies" number={17} title="Cookies (Website)" icon={Cookie} iconColor="orange">
          <p>
            The Shopkeeper App does not use browser cookies. If you access our website (<a href="https://kartkirana.com" target="_blank" rel="noopener noreferrer">kartkirana.com</a>), essential cookies may be used for session management. No advertising cookies are used.
          </p>
        </PolicySection>

        {/* 18. International Transfers */}
        <PolicySection id="transfers" number={18} title="International Transfers" icon={Globe} iconColor="green">
          <p>
            Your data may be processed on secure cloud infrastructure (Google Cloud / Firebase) across multiple data centre regions, protected using HTTPS.
          </p>
        </PolicySection>

        {/* 19. Legal Basis for Processing */}
        <PolicySection id="legal-basis" number={19} title="Legal Basis for Processing" icon={Scale} iconColor="indigo">
          <p>We process data based on:</p>
          <ul>
            <li><strong>Consent:</strong> When you register and accept this policy.</li>
            <li><strong>Contractual Necessity:</strong> To manage your store, process orders, and calculate settlements.</li>
            <li><strong>Legal Obligations:</strong> Tax, accounting, and regulatory compliance.</li>
            <li><strong>Legitimate Interests:</strong> Fraud prevention, service improvement, and platform security.</li>
          </ul>
        </PolicySection>

        {/* 20. Google Play Data Safety */}
        <PolicySection id="data-safety" number={20} title="Google Play Data Safety" icon={Shield} iconColor="green">
          <p>The information declared in our Google Play Data Safety section is consistent with this Privacy Policy:</p>
          <ul>
            <li><strong>Data collected:</strong> Store name, owner name, phone number, email (optional), shop address, GST (optional), bank details (optional), product catalog, orders, earnings, device info, crash logs, location.</li>
            <li><strong>Data shared:</strong> Store details and products shared with customers. Order details shared with riders. Payment data shared with Razorpay. Location shared with Google Maps.</li>
            <li><strong>Purpose:</strong> Store management, order processing, earnings tracking, delivery coordination, analytics, fraud prevention, and legal compliance.</li>
            <li><strong>Security:</strong> Data is transmitted over encrypted connections (HTTPS). Users can request data deletion.</li>
          </ul>
        </PolicySection>

        {/* 21. Grievance Officer */}
        <PolicySection id="grievance" number={21} title="Grievance Officer" icon={Building2} iconColor="green">
          <p>In accordance with applicable Indian law:</p>
          <div className="grievance-card">
            <p><strong>Designation:</strong> Kart Kirana Grievance Officer</p>
            <p><strong>Email:</strong> <a href="mailto:grievance@kartkirana.com">grievance@kartkirana.com</a></p>
            <p><strong>Response Time:</strong> We aim to acknowledge all grievances promptly and resolve them within 30 days.</p>
          </div>
        </PolicySection>

        {/* 22. Changes to This Policy */}
        <PolicySection id="changes" number={22} title="Changes to This Policy" icon={RefreshCw} iconColor="teal">
          <p>
            We may revise this Privacy Policy periodically. Updates will be published on our website and within the application. Continued use after changes constitutes acceptance.
          </p>
        </PolicySection>

        {/* 23. Contact Us */}
        <PolicySection id="contact" number={23} title="Contact Us" icon={Mail} iconColor="green">
          <p>For questions or requests regarding this Privacy Policy:</p>
          <div className="legal-entity">
            <strong>Kart Kirana Technologies</strong>
            Email: <a href="mailto:support@kartkirana.com">support@kartkirana.com</a><br />
            Website: <a href="https://kartkirana.com" target="_blank" rel="noopener noreferrer">https://kartkirana.com</a><br />
            Bengaluru, Karnataka, India<br />
            Business Hours: Monday to Saturday, 9:00 AM – 6:00 PM IST
          </div>
        </PolicySection>
      </PolicyLayout>
    </>
  )
}
