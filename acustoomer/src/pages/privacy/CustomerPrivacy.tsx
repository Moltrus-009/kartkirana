import React from 'react'
import {
  ShoppingBag, FileText, Database, MapPin, Camera,
  Phone, CreditCard, Settings, Link2, Shield, Clock,
  Baby, UserCheck, RefreshCw, Mail, Share2,
  Globe, Scale, Trash2, ShieldX, Bell, Wifi,
  HardDrive, Cookie, Building2, AlertTriangle
} from 'lucide-react'
import { SEOHead } from '../../components/privacy/SEOHead'
import { PolicyLayout } from '../../components/privacy/PolicyLayout'
import { PolicySection } from '../../components/privacy/PolicySection'

const tocItems = [
  { id: 'introduction', number: 1, title: 'Introduction' },
  { id: 'information-collect', number: 2, title: 'Information We Collect' },
  { id: 'not-collect', number: 3, title: 'What We Do NOT Collect' },
  { id: 'location', number: 4, title: 'Location Data' },
  { id: 'permissions', number: 5, title: 'Device Permissions' },
  { id: 'phone-auth', number: 6, title: 'Phone Authentication' },
  { id: 'payment', number: 7, title: 'Payment Information' },
  { id: 'how-we-use', number: 8, title: 'How We Use Your Information' },
  { id: 'sharing', number: 9, title: 'How We Share Information' },
  { id: 'third-party', number: 10, title: 'Third-Party Services' },
  { id: 'security', number: 11, title: 'Data Security' },
  { id: 'retention', number: 12, title: 'Data Retention' },
  { id: 'deletion', number: 13, title: 'Data Deletion' },
  { id: 'your-rights', number: 14, title: 'Your Rights' },
  { id: 'children', number: 15, title: "Children's Privacy" },
  { id: 'cookies', number: 16, title: 'Cookies (Website)' },
  { id: 'transfers', number: 17, title: 'International Transfers' },
  { id: 'legal-basis', number: 18, title: 'Legal Basis for Processing' },
  { id: 'data-safety', number: 19, title: 'Google Play Data Safety' },
  { id: 'grievance', number: 20, title: 'Grievance Officer' },
  { id: 'changes', number: 21, title: 'Changes to This Policy' },
  { id: 'contact', number: 22, title: 'Contact Us' },
]

export const CustomerPrivacy: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Customer App Privacy Policy"
        description="Privacy Policy for the Kart Kirana Customer App. Learn how we collect, use, and protect your personal data including delivery addresses, order history, payment information, and live tracking."
        path="/privacy/customer"
      />

      <PolicyLayout
        title="Privacy Policy – Kart Kirana Customer App"
        subtitle="How we protect your personal data on the Kart Kirana Customer application"
        icon={ShoppingBag}
        iconVariant="customer"
        breadcrumbLabel="Customer App"
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
              We never sell your personal data
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              Payments are securely processed by Razorpay
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              OTP authentication is handled by Firebase
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              You control location permissions
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              You can delete your account from the app
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              Background location is NOT collected
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
        <PolicySection id="introduction" number={1} title="Introduction" icon={FileText} iconColor="blue">
          <p>
            Welcome to Kart Kirana. Your privacy is important to us. This Privacy Policy explains how Kart Kirana ("we," "our," or "us") collects, uses, stores, and protects your information when you use the Kart Kirana Customer App (the "App"), available on the Google Play Store.
          </p>
          <p>
            <strong>Effective Date:</strong> This policy is effective from August 2, 2026. The "Last Updated" date reflects the most recent revision.
          </p>
          <p>
            By downloading, installing, or using the App, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with this policy, please do not use the App.
          </p>
          <div className="legal-entity">
            <strong>Operator</strong>
            Kart Kirana Technologies<br />
            Bengaluru, Karnataka, India<br />
            <a href="https://kartkirana.com" target="_blank" rel="noopener noreferrer">https://kartkirana.com</a>
          </div>
        </PolicySection>

        {/* 2. Information We Collect */}
        <PolicySection id="information-collect" number={2} title="Information We Collect" icon={Database} iconColor="blue">
          <p>We may collect the following categories of information:</p>

          <p><strong>Personal Information</strong></p>
          <ul>
            <li>Full Name</li>
            <li>Mobile Number</li>
            <li>Email Address (if provided)</li>
            <li>Delivery Addresses</li>
            <li>Profile Photo (optional)</li>
          </ul>

          <p><strong>Order and Transaction Information</strong></p>
          <ul>
            <li>Products purchased</li>
            <li>Order history and order values</li>
            <li>Delivery instructions</li>
            <li>Payment method type (UPI, Card, COD)</li>
            <li>Transaction IDs and payment status</li>
          </ul>

          <p><strong>Device and Technical Information</strong></p>
          <ul>
            <li>Device model and manufacturer</li>
            <li>Operating system and version</li>
            <li>App version</li>
            <li>IP address</li>
            <li>Device identifiers</li>
            <li>Crash logs and diagnostic information</li>
            <li>App usage patterns and session data</li>
          </ul>

          <p><strong>Location Information</strong></p>
          <ul>
            <li>GPS location (with your permission — see Section 4)</li>
          </ul>
        </PolicySection>

        {/* 3. What We Do NOT Collect */}
        <PolicySection id="not-collect" number={3} title="What We Do NOT Collect" icon={ShieldX} iconColor="red">
          <p>Kart Kirana does <strong>not</strong> collect, store, or have access to the following:</p>
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
        <PolicySection id="location" number={4} title="Location Data" icon={MapPin} iconColor="blue">
          <p><strong>Foreground Location</strong></p>
          <p>With your permission, the App collects your device's precise or approximate location in the foreground to:</p>
          <ul>
            <li>Find nearby stores</li>
            <li>Display delivery availability</li>
            <li>Calculate delivery ETA</li>
            <li>Track your order in real time</li>
            <li>Improve delivery accuracy</li>
          </ul>
          <p><strong>Background Location</strong></p>
          <p>The Kart Kirana Customer App does <strong>not</strong> collect location data in the background. Location is accessed only when the app is actively in use and you have granted permission.</p>
          <p>You may disable location access at any time through your device settings, although some features (such as nearby store discovery) may not function correctly without it.</p>
        </PolicySection>

        {/* 5. Device Permissions */}
        <PolicySection id="permissions" number={5} title="Device Permissions" icon={Settings} iconColor="purple">
          <p>The App may request the following device permissions. All permissions can be managed through your device settings at any time.</p>
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
                  <td>Find nearby stores, delivery tracking, ETA calculation</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><Camera size={14} /> Camera</span></td>
                  <td>Upload profile photos, report delivery issues</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><HardDrive size={14} /> Photos / Storage</span></td>
                  <td>Select profile pictures or image attachments from gallery</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><Bell size={14} /> Notifications</span></td>
                  <td>Order status updates, delivery alerts, promotional offers</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><Wifi size={14} /> Internet</span></td>
                  <td>Core app functionality, data synchronisation, real-time updates</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '1rem' }}>Permissions marked as optional (Camera, Photos) are only requested when you initiate the related action.</p>
        </PolicySection>

        {/* 6. Phone Authentication */}
        <PolicySection id="phone-auth" number={6} title="Phone Authentication" icon={Phone} iconColor="green">
          <p>
            Kart Kirana uses <strong>Firebase Authentication</strong> to verify your mobile number using a One-Time Password (OTP) sent via SMS. The OTP is processed by Firebase and is not stored by Kart Kirana.
          </p>
        </PolicySection>

        {/* 7. Payment Information */}
        <PolicySection id="payment" number={7} title="Payment Information" icon={CreditCard} iconColor="gold">
          <p>
            Payments are processed securely by <strong>Razorpay</strong>. Kart Kirana does <strong>not</strong> store:
          </p>
          <ul>
            <li>Debit card or credit card numbers</li>
            <li>CVV / CVC security codes</li>
            <li>UPI PIN</li>
            <li>Bank account passwords or net banking credentials</li>
          </ul>
          <p>We only store the payment method type (e.g., "UPI", "Card", "COD"), transaction reference ID, and payment status for order records.</p>
        </PolicySection>

        {/* 8. How We Use Your Information */}
        <PolicySection id="how-we-use" number={8} title="How We Use Your Information" icon={Settings} iconColor="green">
          <p>We use your information to:</p>
          <ul>
            <li>Create and manage your account</li>
            <li>Process and deliver orders</li>
            <li>Provide real-time order tracking</li>
            <li>Provide customer support</li>
            <li>Send order status notifications and delivery updates</li>
            <li>Display nearby stores and relevant products</li>
            <li>Process payments and refunds</li>
            <li>Improve our services and user experience</li>
            <li>Analyse usage patterns for app performance optimisation</li>
            <li>Prevent fraud, abuse, and unauthorised access</li>
            <li>Comply with legal and regulatory obligations</li>
          </ul>
        </PolicySection>

        {/* 9. How We Share Information */}
        <PolicySection id="sharing" number={9} title="How We Share Information" icon={Share2} iconColor="blue">
          <p>We may share limited information with the following parties solely to fulfil orders and provide services:</p>
          <ul>
            <li><strong>Shopkeepers:</strong> Order details and delivery address for item preparation and packing.</li>
            <li><strong>Delivery Riders:</strong> Customer name, phone number, and delivery address for order delivery.</li>
            <li><strong>Razorpay:</strong> Payment tokens for processing transactions.</li>
            <li><strong>Firebase (Google):</strong> Authentication data, database storage, and crash diagnostics.</li>
            <li><strong>Google Maps Platform:</strong> Location data for map rendering and route calculations.</li>
            <li><strong>Government Authorities:</strong> Where required by law, regulation, court order, or government request.</li>
          </ul>
          <p><strong>We never sell personal information to third parties for advertising, marketing, or any other commercial purpose.</strong></p>
        </PolicySection>

        {/* 10. Third-Party Services */}
        <PolicySection id="third-party" number={10} title="Third-Party Services" icon={Link2} iconColor="purple">
          <p>The App integrates with the following third-party services. Each operates under its own privacy policy:</p>
          <div className="third-party-grid">
            <div className="third-party-card">
              <div className="third-party-name">Firebase Authentication</div>
              <div className="third-party-desc">Phone number verification via OTP. Manages user sessions and login.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Firebase Firestore</div>
              <div className="third-party-desc">Cloud database for storing user profiles, orders, addresses, and app data.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Firebase Storage</div>
              <div className="third-party-desc">Cloud storage for profile images and user-uploaded content.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Firebase Crashlytics</div>
              <div className="third-party-desc">Crash reporting and diagnostics for app stability monitoring.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Google Maps Platform</div>
              <div className="third-party-desc">Map display, store location markers, delivery route calculation, and geocoding.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Google Play Services</div>
              <div className="third-party-desc">Core Android services including location services and app updates.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Razorpay</div>
              <div className="third-party-desc">Payment gateway for UPI, cards, net banking, and COD.</div>
            </div>
          </div>
          <p style={{ marginTop: '1rem' }}>
            <strong>Third-party privacy policies:</strong>{' '}
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">Firebase Privacy</a>{' · '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>{' · '}
            <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay Privacy Policy</a>
          </p>
        </PolicySection>

        {/* 11. Data Security */}
        <PolicySection id="security" number={11} title="Data Security" icon={Shield} iconColor="green">
          <p>We implement reasonable technical, administrative, and organisational safeguards to protect your information:</p>
          <ul>
            <li><strong>Encrypted Connections:</strong> All data transmitted between the App and our servers uses HTTPS.</li>
            <li><strong>Firebase Security Rules:</strong> Strict read/write access controls ensuring users can only access their own data.</li>
            <li><strong>Authentication:</strong> Secure session management via Firebase Authentication.</li>
            <li><strong>Access Controls:</strong> Internal access to user data is restricted to authorised personnel only.</li>
          </ul>
          <p>While we strive to use commercially acceptable means to protect your personal data, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security but are committed to implementing best practices.</p>
        </PolicySection>

        {/* 12. Data Retention */}
        <PolicySection id="retention" number={12} title="Data Retention" icon={Clock} iconColor="teal">
          <p>We retain personal information only as long as necessary to:</p>
          <ul>
            <li>Provide our services to you</li>
            <li>Maintain transaction and order records for legal, accounting, and tax purposes</li>
            <li>Resolve disputes and enforce agreements</li>
            <li>Comply with applicable legal and regulatory requirements</li>
          </ul>
          <p>Inactive accounts may eventually be flagged for deletion after an extended period of inactivity, subject to prior notification.</p>
        </PolicySection>

        {/* 13. Data Deletion */}
        <PolicySection id="deletion" number={13} title="Data Deletion" icon={Trash2} iconColor="red">
          <p>You can delete your account directly from the app:</p>
          <ul>
            <li>Open the Kart Kirana Customer App.</li>
            <li>Go to <strong>Settings → Delete Account</strong>.</li>
            <li>Follow the on-screen instructions to confirm deletion.</li>
          </ul>
          <p>Alternatively, you can request deletion by emailing <a href="mailto:support@kartkirana.com">support@kartkirana.com</a> from your registered phone number or email.</p>
          <p><strong>Data that may be retained after deletion:</strong> Certain information such as transaction records and order history may be retained as required by applicable tax, accounting, or legal obligations, even after account deletion.</p>
        </PolicySection>

        {/* 14. Your Rights */}
        <PolicySection id="your-rights" number={14} title="Your Rights" icon={UserCheck} iconColor="blue">
          <p>Depending on applicable law, you may have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information.</li>
            <li><strong>Deletion:</strong> Delete your account via the app (Settings → Delete Account) or by contacting us.</li>
            <li><strong>Withdrawal of Consent:</strong> Withdraw consent for data processing at any time by deleting your account or revoking device permissions.</li>
            <li><strong>Permission Management:</strong> Manage location, camera, storage, and notification permissions through your device settings.</li>
            <li><strong>Grievance Redressal:</strong> Contact our Grievance Officer for any data handling concerns (see Section 20).</li>
          </ul>
          <p>To exercise any of these rights, please contact us at <a href="mailto:support@kartkirana.com">support@kartkirana.com</a>.</p>
        </PolicySection>

        {/* 15. Children's Privacy */}
        <PolicySection id="children" number={15} title="Children's Privacy" icon={Baby} iconColor="red">
          <p>
            Kart Kirana is not intended for use by individuals below the age required by applicable law to consent to data processing (18 years in India). We do not knowingly collect personal information from children. If we become aware that a child has provided personal information, we will take steps to delete such data promptly.
          </p>
        </PolicySection>

        {/* 16. Cookies (Website) */}
        <PolicySection id="cookies" number={16} title="Cookies (Website)" icon={Cookie} iconColor="orange">
          <p>
            As a native mobile application, the Kart Kirana Customer App does <strong>not</strong> use browser cookies.
          </p>
          <p>
            If you access our privacy policy or any content through our website (<a href="https://kartkirana.com" target="_blank" rel="noopener noreferrer">kartkirana.com</a>), the website may use essential cookies for basic functionality such as session management and security. No advertising or tracking cookies are used.
          </p>
        </PolicySection>

        {/* 17. International Transfers */}
        <PolicySection id="transfers" number={17} title="International Transfers" icon={Globe} iconColor="blue">
          <p>
            Your data may be processed and stored on secure cloud infrastructure (Google Cloud Platform / Firebase) which may operate across multiple data centre regions. All data transfers are protected using HTTPS and are subject to the data protection commitments of our cloud service providers.
          </p>
        </PolicySection>

        {/* 18. Legal Basis for Processing */}
        <PolicySection id="legal-basis" number={18} title="Legal Basis for Processing" icon={Scale} iconColor="indigo">
          <p>We process your personal data on the following legal grounds:</p>
          <ul>
            <li><strong>Consent:</strong> You provide consent when you create an account, grant device permissions, or accept this Privacy Policy.</li>
            <li><strong>Contractual Necessity:</strong> Processing is necessary to fulfil your orders and provide our delivery services.</li>
            <li><strong>Legal Obligations:</strong> Processing is required to comply with applicable tax, accounting, and regulatory requirements.</li>
            <li><strong>Legitimate Interests:</strong> Processing for fraud prevention, service improvement, and platform security.</li>
          </ul>
        </PolicySection>

        {/* 19. Google Play Data Safety */}
        <PolicySection id="data-safety" number={19} title="Google Play Data Safety" icon={Shield} iconColor="green">
          <p>The information declared in our Google Play Data Safety section is consistent with this Privacy Policy:</p>
          <ul>
            <li><strong>Data collected:</strong> Name, phone number, email (optional), delivery addresses, order history, transaction IDs, device info, IP address, crash logs, location (foreground only).</li>
            <li><strong>Data shared:</strong> Order details shared with shopkeepers and riders for delivery. Payment tokens shared with Razorpay. Location shared with Google Maps.</li>
            <li><strong>Purpose:</strong> Account management, order processing, delivery, payments, analytics, fraud prevention, and legal compliance.</li>
            <li><strong>Security:</strong> Data is transmitted over encrypted connections (HTTPS). Users can request data deletion.</li>
          </ul>
        </PolicySection>

        {/* 20. Grievance Officer */}
        <PolicySection id="grievance" number={20} title="Grievance Officer" icon={Building2} iconColor="blue">
          <p>In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, the details of the Grievance Officer are:</p>
          <div className="grievance-card">
            <p><strong>Designation:</strong> Kart Kirana Grievance Officer</p>
            <p><strong>Email:</strong> <a href="mailto:grievance@kartkirana.com">grievance@kartkirana.com</a></p>
            <p><strong>Response Time:</strong> We aim to acknowledge all grievances promptly and resolve them within 30 days.</p>
          </div>
        </PolicySection>

        {/* 21. Changes to This Policy */}
        <PolicySection id="changes" number={21} title="Changes to This Policy" icon={RefreshCw} iconColor="teal">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or services. The updated version will be posted within the application and on our website. The "Last Updated" date at the top of this policy will be revised. Continued use of the App after any changes constitutes acceptance of the updated policy.
          </p>
        </PolicySection>

        {/* 22. Contact Us */}
        <PolicySection id="contact" number={22} title="Contact Us" icon={Mail} iconColor="blue">
          <p>For questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact:</p>
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
