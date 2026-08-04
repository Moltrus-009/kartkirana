import React from 'react'
import {
  Bike, FileText, Database, MapPin, Camera,
  HardDrive, Settings, CreditCard, Link2, Shield, Clock,
  UserCheck, Baby, RefreshCw, Mail, Share2,
  Globe, Scale, Trash2, ShieldX, Bell, Wifi,
  Cookie, Building2, AlertTriangle,
  Navigation, IdCard, Truck, Radio, PhoneCall
} from 'lucide-react'
import { SEOHead } from '../components/SEOHead'
import { PolicyLayout } from '../components/PolicyLayout'
import { PolicySection } from '../components/PolicySection'

const tocItems = [
  { id: 'introduction', number: 1, title: 'Introduction' },
  { id: 'information-collect', number: 2, title: 'Information We Collect' },
  { id: 'not-collect', number: 3, title: 'What We Do NOT Collect' },
  { id: 'location', number: 4, title: 'Location Data and GPS Tracking' },
  { id: 'background-location', number: 5, title: 'Background Location Policy' },
  { id: 'permissions', number: 6, title: 'Device Permissions' },
  { id: 'identity', number: 7, title: 'Identity Verification' },
  { id: 'vehicle', number: 8, title: 'Vehicle Information' },
  { id: 'payment', number: 9, title: 'Earnings and Payouts' },
  { id: 'how-we-use', number: 10, title: 'How We Use Your Information' },
  { id: 'navigation', number: 11, title: 'Navigation and Routes' },
  { id: 'availability', number: 12, title: 'Availability Status' },
  { id: 'sharing', number: 13, title: 'How We Share Information' },
  { id: 'third-party', number: 14, title: 'Third-Party Services' },
  { id: 'security', number: 15, title: 'Data Security' },
  { id: 'retention', number: 16, title: 'Data Retention' },
  { id: 'deletion', number: 17, title: 'Data Deletion' },
  { id: 'your-rights', number: 18, title: 'Your Rights' },
  { id: 'children', number: 19, title: "Children's Privacy" },
  { id: 'emergency', number: 20, title: 'Emergency Support' },
  { id: 'cookies', number: 21, title: 'Cookies (Website)' },
  { id: 'transfers', number: 22, title: 'International Transfers' },
  { id: 'legal-basis', number: 23, title: 'Legal Basis for Processing' },
  { id: 'data-safety', number: 24, title: 'Google Play Data Safety' },
  { id: 'grievance', number: 25, title: 'Grievance Officer' },
  { id: 'changes', number: 26, title: 'Changes to This Policy' },
  { id: 'contact', number: 27, title: 'Contact Us' },
]

export const RiderPrivacy: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Delivery Rider App Privacy Policy"
        description="Privacy Policy for the Kart Kirana Delivery Rider App. Learn how Kart Kirana handles GPS tracking, live location sharing, rider identity, earnings, and delivery data."
        path="/privacy/rider"
      />

      <PolicyLayout
        title="Privacy Policy – Kart Kirana Delivery Rider App"
        subtitle="How we protect your personal and location data on the Kart Kirana Delivery Rider application"
        icon={Bike}
        iconVariant="rider"
        breadcrumbLabel="Delivery Rider App"
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
              Location tracked only during active deliveries
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              OTP authentication via Firebase
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              Identity documents stored securely
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              You can delete your account from the app
            </div>
            <div className="privacy-summary-item">
              <span className="privacy-summary-check">✓</span>
              Earnings processed via secure payouts
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
        <PolicySection id="introduction" number={1} title="Introduction" icon={FileText} iconColor="gold">
          <p>
            This Privacy Policy explains how Kart Kirana ("we," "our," or "us") collects and processes information from delivery partners using the Kart Kirana Delivery Rider App (the "App"), available on the Google Play Store. The App enables delivery partners to accept, navigate, and complete grocery deliveries from partner stores to customers.
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
        <PolicySection id="information-collect" number={2} title="Information We Collect" icon={Database} iconColor="gold">
          <p>We may collect:</p>

          <p><strong>Personal Information</strong></p>
          <ul>
            <li>Full name</li>
            <li>Mobile number</li>
            <li>Email address (if provided)</li>
            <li>Profile photograph</li>
            <li>Government-issued identification (if required for verification)</li>
            <li>Vehicle information (if applicable)</li>
            <li>Bank account details required for payouts (if applicable)</li>
          </ul>

          <p><strong>Delivery and Performance Data</strong></p>
          <ul>
            <li>Delivery history and completed orders</li>
            <li>Delivery timestamps and route data</li>
            <li>Earnings, tips, incentives, and bonuses</li>
            <li>Customer ratings and feedback received</li>
            <li>Delivery acceptance and completion rates</li>
            <li>Cash collected for COD orders</li>
          </ul>

          <p><strong>Location Data</strong></p>
          <ul>
            <li>Real-time GPS coordinates during active deliveries (see Section 4)</li>
          </ul>

          <p><strong>Device and Technical Information</strong></p>
          <ul>
            <li>Device model and operating system</li>
            <li>App version</li>
            <li>IP address and device identifiers</li>
            <li>Crash logs and diagnostic information</li>
            <li>Network connection type</li>
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

        {/* 4. Location Data and GPS Tracking */}
        <PolicySection id="location" number={4} title="Location Data and GPS Tracking" icon={MapPin} iconColor="gold">
          <p><strong>This section contains important information about how we use your location.</strong></p>
          <p>The Rider App collects your precise GPS location while you are online or actively completing deliveries to:</p>
          <ul>
            <li>Assign nearby delivery orders based on your proximity to stores</li>
            <li>Provide turn-by-turn navigation to the store and customer</li>
            <li>Track active deliveries in real-time</li>
            <li>Improve delivery efficiency and route optimisation</li>
            <li>Verify completed deliveries at pickup and drop-off locations</li>
            <li>Help customers monitor delivery progress on a live map</li>
            <li>Calculate delivery distance for earnings computation</li>
          </ul>
          <p><strong>Important:</strong> Your real-time location is shared with the customer only during an active delivery. Once the delivery is marked as complete, live tracking stops immediately.</p>
        </PolicySection>

        {/* 5. Background Location Policy */}
        <PolicySection id="background-location" number={5} title="Background Location Policy" icon={Radio} iconColor="orange">
          <p>Location collection may continue in the background while a delivery is active, if permitted by your device settings. This is necessary to:</p>
          <ul>
            <li>Maintain GPS tracking continuity when you switch to a navigation app (e.g., Google Maps)</li>
            <li>Ensure uninterrupted delivery tracking when the app is minimised</li>
          </ul>
          <p><strong>Background location is only used during active deliveries.</strong> When you are offline or do not have an active delivery assignment, your location is not tracked.</p>
          <p>On Android 10 and above, the App may request the ACCESS_BACKGROUND_LOCATION permission for this purpose. You can manage this permission through your device settings.</p>
        </PolicySection>

        {/* 6. Device Permissions */}
        <PolicySection id="permissions" number={6} title="Device Permissions" icon={Settings} iconColor="purple">
          <p>The App requires the following permissions:</p>
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
                  <td>Order assignment, navigation, live tracking, delivery verification (required)</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><Camera size={14} /> Camera</span></td>
                  <td>Profile photo, proof of delivery, identity documents, delivery issue reports</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><HardDrive size={14} /> Photos / Storage</span></td>
                  <td>Select images for profile or document upload from gallery</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><Bell size={14} /> Notifications</span></td>
                  <td>New delivery assignments, order updates, earnings alerts</td>
                </tr>
                <tr>
                  <td><span className="permission-name"><Wifi size={14} /> Internet</span></td>
                  <td>Core app functionality, real-time tracking, data sync</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '1rem' }}><strong>Note:</strong> Location permission is <strong>required</strong> for the Rider App to function. Without it, you cannot receive or complete delivery assignments.</p>
        </PolicySection>

        {/* 7. Identity Verification */}
        <PolicySection id="identity" number={7} title="Identity Verification" icon={IdCard} iconColor="gold">
          <p>During rider onboarding, we may collect identity verification documents including:</p>
          <ul>
            <li>Government-issued photo ID (e.g., Aadhaar card, PAN card, driving licence)</li>
            <li>Selfie or photograph for profile verification</li>
          </ul>
          <p>These documents are securely uploaded and stored with restricted access. They are <strong>not</strong> visible to customers or shopkeepers and are used solely for identity verification and platform compliance.</p>
        </PolicySection>

        {/* 8. Vehicle Information */}
        <PolicySection id="vehicle" number={8} title="Vehicle Information" icon={Truck} iconColor="gold">
          <p>If applicable, we may collect:</p>
          <ul>
            <li>Vehicle type (bicycle, motorcycle, etc.)</li>
            <li>Vehicle registration number</li>
            <li>Vehicle photographs</li>
          </ul>
          <p>This information is used for rider verification and is not shared with customers.</p>
        </PolicySection>

        {/* 9. Earnings and Payouts */}
        <PolicySection id="payment" number={9} title="Earnings and Payouts" icon={CreditCard} iconColor="gold">
          <p>We process and display:</p>
          <ul>
            <li>Per-delivery earnings based on distance and order value</li>
            <li>Tips received from customers</li>
            <li>Incentives, bonuses, and promotional rewards</li>
            <li>Payout and settlement history</li>
            <li>Cash collected for Cash-on-Delivery (COD) orders</li>
          </ul>
          <p>Bank account details for payouts (if applicable) are handled through separate, secure onboarding processes. Kart Kirana does not store customer payment credentials.</p>
        </PolicySection>

        {/* 10. How We Use Information */}
        <PolicySection id="how-we-use" number={10} title="How We Use Your Information" icon={Settings} iconColor="gold">
          <p>We use your information to:</p>
          <ul>
            <li>Verify your rider account and identity</li>
            <li>Assign delivery orders based on proximity and availability</li>
            <li>Provide navigation to stores and customer addresses</li>
            <li>Share your real-time location with customers during active deliveries</li>
            <li>Calculate and process earnings and payouts</li>
            <li>Send delivery assignments, order updates, and earnings alerts</li>
            <li>Track delivery performance and quality metrics</li>
            <li>Improve route optimisation and delivery efficiency</li>
            <li>Resolve delivery disputes and customer complaints</li>
            <li>Prevent fraud, abuse, and unauthorised access</li>
            <li>Comply with legal and regulatory obligations</li>
          </ul>
        </PolicySection>

        {/* 11. Navigation and Routes */}
        <PolicySection id="navigation" number={11} title="Navigation and Routes" icon={Navigation} iconColor="gold">
          <p>The App uses GPS and mapping services to provide:</p>
          <ul>
            <li>Turn-by-turn navigation from your location to the pickup store</li>
            <li>Turn-by-turn navigation from the store to the customer's delivery address</li>
            <li>Route distance calculation for earnings computation</li>
            <li>Estimated time of arrival (ETA) for customer visibility</li>
          </ul>
          <p>Route data from completed deliveries may be retained temporarily for quality assurance and dispute resolution.</p>
        </PolicySection>

        {/* 12. Availability Status */}
        <PolicySection id="availability" number={12} title="Availability Status" icon={Radio} iconColor="green">
          <p>Your online/offline availability status is tracked to:</p>
          <ul>
            <li>Determine whether you are available to accept new delivery orders</li>
            <li>Manage order distribution across active riders</li>
            <li>Calculate active hours for earnings and incentive eligibility</li>
          </ul>
          <p>When you go offline, order assignments stop and location tracking ceases.</p>
        </PolicySection>

        {/* 13. How We Share Information */}
        <PolicySection id="sharing" number={13} title="How We Share Information" icon={Share2} iconColor="gold">
          <p>We may share limited information with:</p>
          <ul>
            <li><strong>Customers:</strong> Rider name, profile photo, and real-time location during active deliveries.</li>
            <li><strong>Shopkeepers:</strong> Rider name for pickup coordination.</li>
            <li><strong>Razorpay:</strong> Transaction and settlement processing.</li>
            <li><strong>Firebase (Google):</strong> Authentication, data storage, and crash diagnostics.</li>
            <li><strong>Google Maps Platform:</strong> Location data for navigation and route calculation.</li>
            <li><strong>Government Authorities:</strong> Where required by law, regulation, or court order.</li>
          </ul>
          <p><strong>We never sell personal information to third parties.</strong></p>
          <p>Customer phone numbers shared for delivery coordination may be masked or limited to prevent misuse.</p>
        </PolicySection>

        {/* 14. Third-Party Services */}
        <PolicySection id="third-party" number={14} title="Third-Party Services" icon={Link2} iconColor="purple">
          <p>The App integrates with:</p>
          <div className="third-party-grid">
            <div className="third-party-card">
              <div className="third-party-name">Firebase Authentication</div>
              <div className="third-party-desc">Phone verification, rider session management, and secure login.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Firebase Firestore</div>
              <div className="third-party-desc">Cloud database for rider profiles, delivery records, earnings, and order data.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Firebase Storage</div>
              <div className="third-party-desc">Secure storage for profile photos, identity documents, and vehicle images.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Firebase Crashlytics</div>
              <div className="third-party-desc">Crash reporting and diagnostics for app stability during deliveries.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Google Maps Platform</div>
              <div className="third-party-desc">Real-time map, turn-by-turn navigation, route calculation, and geocoding.</div>
            </div>
            <div className="third-party-card">
              <div className="third-party-name">Razorpay</div>
              <div className="third-party-desc">Payment infrastructure for settlements and COD reconciliation (if applicable).</div>
            </div>
          </div>
          <p style={{ marginTop: '1rem' }}>
            <strong>Third-party privacy policies:</strong>{' '}
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">Firebase Privacy</a>{' · '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>{' · '}
            <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay Privacy Policy</a>
          </p>
        </PolicySection>

        {/* 15. Data Security */}
        <PolicySection id="security" number={15} title="Data Security" icon={Shield} iconColor="green">
          <p>Given the sensitive nature of real-time location data, we implement reasonable safeguards:</p>
          <ul>
            <li><strong>Encrypted Connections:</strong> All data, including GPS coordinates, is transmitted via HTTPS.</li>
            <li><strong>Firebase Security Rules:</strong> Access controls ensuring riders can only access their own data.</li>
            <li><strong>Location Data Access:</strong> Real-time location is shared only with the customer during an active delivery.</li>
            <li><strong>Identity Document Security:</strong> Verification documents are stored with restricted access and are not visible to customers or merchants.</li>
            <li><strong>Masked Contact Information:</strong> Customer phone numbers shared for coordination are masked or limited.</li>
            <li><strong>Authentication:</strong> Secure session management via Firebase Authentication.</li>
          </ul>
          <p>No online system can guarantee absolute security, but we are committed to protecting your data.</p>
        </PolicySection>

        {/* 16. Data Retention */}
        <PolicySection id="retention" number={16} title="Data Retention" icon={Clock} iconColor="teal">
          <p>Delivery records, earnings information, and related account data may be retained as required for:</p>
          <ul>
            <li>Operational purposes and service delivery</li>
            <li>Legal, tax, and accounting requirements</li>
            <li>Dispute resolution and quality assurance</li>
          </ul>
          <p>Real-time GPS tracking data from completed deliveries is retained temporarily for dispute resolution, then deleted. Identity documents are retained for the duration of your active partnership plus any legally required retention period.</p>
        </PolicySection>

        {/* 17. Data Deletion */}
        <PolicySection id="deletion" number={17} title="Data Deletion" icon={Trash2} iconColor="red">
          <p>You can delete your account directly from the app:</p>
          <ul>
            <li>Open the Kart Kirana Delivery Rider App.</li>
            <li>Go to <strong>Settings → Delete Account</strong>.</li>
            <li>Follow the on-screen instructions to confirm deletion.</li>
          </ul>
          <p>Alternatively, you can request account closure by emailing <a href="mailto:support@kartkirana.com">support@kartkirana.com</a>.</p>
          <p><strong>Data that may be retained:</strong> Profile data, photos, and vehicle information will be removed. Delivery records, earnings, and identity documents may be retained as required by law.</p>
        </PolicySection>

        {/* 18. Your Rights */}
        <PolicySection id="your-rights" number={18} title="Your Rights" icon={UserCheck} iconColor="gold">
          <p>You may request:</p>
          <ul>
            <li><strong>Access:</strong> View your profile, delivery history, earnings, and performance data in the App.</li>
            <li><strong>Correction:</strong> Update your profile and vehicle information through the App.</li>
            <li><strong>Deletion:</strong> Delete your account via the app (Settings → Delete Account) or by contacting us.</li>
            <li><strong>Withdrawal of Consent:</strong> Deactivate your account or revoke permissions. Note: revoking location will prevent deliveries.</li>
            <li><strong>Permission Management:</strong> Manage all permissions through device settings.</li>
            <li><strong>Grievance Redressal:</strong> Contact our Grievance Officer (see Section 25).</li>
          </ul>
        </PolicySection>

        {/* 19. Children's Privacy */}
        <PolicySection id="children" number={19} title="Children's Privacy" icon={Baby} iconColor="red">
          <p>
            The Rider App is intended only for individuals who meet the minimum legal age and eligibility requirements to perform delivery services. We do not knowingly collect data from minors.
          </p>
        </PolicySection>

        {/* 20. Emergency Support */}
        <PolicySection id="emergency" number={20} title="Emergency Support" icon={PhoneCall} iconColor="red">
          <p>
            In the event of an emergency during a delivery (e.g., accident, safety concern), your location data and delivery details may be shared with emergency services or designated support personnel to assist you.
          </p>
          <p>For emergency support, contact <a href="mailto:support@kartkirana.com">support@kartkirana.com</a> or use the in-app support feature.</p>
        </PolicySection>

        {/* 21. Cookies (Website) */}
        <PolicySection id="cookies" number={21} title="Cookies (Website)" icon={Cookie} iconColor="orange">
          <p>
            The Rider App does not use browser cookies. If you access our website (<a href="https://kartkirana.com" target="_blank" rel="noopener noreferrer">kartkirana.com</a>), essential cookies may be used for session management. No advertising cookies are used.
          </p>
        </PolicySection>

        {/* 22. International Transfers */}
        <PolicySection id="transfers" number={22} title="International Transfers" icon={Globe} iconColor="gold">
          <p>
            Your data may be processed on secure cloud infrastructure (Google Cloud / Firebase) across multiple data centre regions, protected using HTTPS.
          </p>
        </PolicySection>

        {/* 23. Legal Basis for Processing */}
        <PolicySection id="legal-basis" number={23} title="Legal Basis for Processing" icon={Scale} iconColor="indigo">
          <p>We process data based on:</p>
          <ul>
            <li><strong>Consent:</strong> When you register, grant location permissions, and accept this policy.</li>
            <li><strong>Contractual Necessity:</strong> To assign deliveries, process earnings, and operate the platform.</li>
            <li><strong>Legal Obligations:</strong> Tax, identity verification, and regulatory compliance.</li>
            <li><strong>Legitimate Interests:</strong> Fraud prevention, delivery quality, and rider safety.</li>
          </ul>
        </PolicySection>

        {/* 24. Google Play Data Safety */}
        <PolicySection id="data-safety" number={24} title="Google Play Data Safety" icon={Shield} iconColor="green">
          <p>The information declared in our Google Play Data Safety section is consistent with this Privacy Policy:</p>
          <ul>
            <li><strong>Data collected:</strong> Name, phone number, email (optional), profile photo, government ID (if collected), vehicle info (if collected), delivery history, earnings, location (foreground and background during active deliveries), device info, crash logs.</li>
            <li><strong>Data shared:</strong> Rider name, photo, and live location shared with customers during deliveries. Rider name shared with shopkeepers for pickup. Payment data shared with Razorpay. Location shared with Google Maps.</li>
            <li><strong>Purpose:</strong> Delivery operations, identity verification, earnings processing, navigation, analytics, fraud prevention, and legal compliance.</li>
            <li><strong>Security:</strong> Data is transmitted over encrypted connections (HTTPS). Users can request data deletion.</li>
          </ul>
        </PolicySection>

        {/* 25. Grievance Officer */}
        <PolicySection id="grievance" number={25} title="Grievance Officer" icon={Building2} iconColor="gold">
          <p>In accordance with applicable Indian law:</p>
          <div className="grievance-card">
            <p><strong>Designation:</strong> Kart Kirana Grievance Officer</p>
            <p><strong>Email:</strong> <a href="mailto:grievance@kartkirana.com">grievance@kartkirana.com</a></p>
            <p><strong>Response Time:</strong> We aim to acknowledge all grievances promptly and resolve them within 30 days.</p>
          </div>
        </PolicySection>

        {/* 26. Changes to This Policy */}
        <PolicySection id="changes" number={26} title="Changes to This Policy" icon={RefreshCw} iconColor="teal">
          <p>
            We may update this Privacy Policy periodically. Any changes will be posted on our website and within the application. Changes affecting location tracking practices will be prominently communicated.
          </p>
        </PolicySection>

        {/* 27. Contact Us */}
        <PolicySection id="contact" number={27} title="Contact Us" icon={Mail} iconColor="gold">
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
