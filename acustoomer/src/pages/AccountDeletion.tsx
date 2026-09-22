import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { Logo } from '../components/ui/Logo';
import { SEOHead } from '../components/privacy/SEOHead';
import { deletionApi, deletionError, endDeletionVerification, makeDeletionVerifier, sendDeletionOTP, verifyDeletionOTP, type AccountType, type DeletionStatus } from '../services/accountDeletion';
import '../account-deletion.css';

const labels = { customer: 'Customer', shopkeeper: 'Shopkeeper', rider: 'Rider' };
const blockers: Record<string,string> = {
  ACTIVE_ORDER_OR_DELIVERY: 'An order or delivery is still active. Finish or cancel it through the normal order process.',
  ACTIVE_DELIVERY_BATCH: 'A delivery batch is still active. Complete your deliveries first.',
  ACTIVE_DISPATCH_OFFER: 'A delivery offer is still pending. Respond to it or wait for it to expire.',
  UNRESOLVED_PAYOUT_REFUND_OR_DISPUTE: 'A payout, refund, support complaint or dispute needs resolution.',
  PAYMENT_RECONCILIATION_PENDING: 'A payment or refund is still being reconciled.',
  UNSETTLED_BALANCE: 'An account balance or cash settlement needs to be resolved.',
  CLOSE_SHOP_FIRST: 'Close your shop to new orders before final deletion. Existing order and product records will be preserved.'
};
export default function AccountDeletion() {
  const { accountType } = useParams();
  const type = Object.hasOwn(labels, accountType || '') ? accountType as AccountType : null;
  const [phone,setPhone] = useState('+91');
  const [otp,setOtp] = useState('');
  const [confirmation,setConfirmation] = useState<ConfirmationResult | null>(null);
  const [status,setStatus] = useState<DeletionStatus | null>(null);
  const [accepted,setAccepted] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [resendAt,setResendAt] = useState(0);
  const [clock,setClock] = useState(Date.now());
  const captcha = useRef<HTMLDivElement>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  useEffect(() => {
    const timer = window.setInterval(()=>setClock(Date.now()),1000);
    return () => { clearInterval(timer); verifier.current?.clear(); verifier.current=null; void endDeletionVerification(); };
  },[]);
  async function run(task:()=>Promise<void>) {
    setBusy(true);setError('');
    try { await task(); } catch(e) { setError(deletionError(e)); } finally { setBusy(false); }
  }
  const send = () => run(async()=>{
    if (!captcha.current) return;
    verifier.current?.clear();
    verifier.current = makeDeletionVerifier(captcha.current);
    const result = await sendDeletionOTP(phone.trim(),verifier.current);
    setConfirmation(result);setOtp('');setResendAt(Date.now()+60000);
  });
  const verify = () => run(async()=>{
    if (!confirmation || !type) return;
    await verifyDeletionOTP(confirmation,otp);
    setConfirmation(null);setOtp('');
    setStatus(await deletionApi(type));
    verifier.current?.clear();verifier.current=null;
  });
  const submit = () => run(async()=>{ if (type && accepted) setStatus(await deletionApi(type,true)); });
  const title = type ? `KartKirana ${labels[type]} Account Deletion` : 'KartKirana Account Deletion';
  return <div className="deletion-page">
    <SEOHead title={title} description="Request deletion of your KartKirana account and associated personal information. Verify your registered phone securely." path={type ? `/delete-account/${type}` : '/delete-account'} />
    <header><a href="/delete-account" aria-label="KartKirana account deletion home"><Logo size="sm" variant="horizontal" /></a><a href={type ? `/privacy/${type}` : '/privacy'}>Privacy policy</a></header>
    <main>
      <p className="deletion-eyebrow">YOUR ACCOUNT · YOUR CHOICE</p><h1>{title}</h1>
      <p className="deletion-intro">Request deletion of your {type ? labels[type].toLowerCase() : 'KartKirana'} account and its associated personal information. You can use this page without installing or signing in to the app.</p>
      {!type ? <section className="deletion-choices" aria-label="Choose your account">
        {accountType && <p role="alert">Choose one of the supported account types below.</p>}
        {(Object.keys(labels) as AccountType[]).map(t=><a key={t} href={`/delete-account/${t}`}><h2>{labels[t]}</h2><p>{t==='customer'?'Shopping, addresses and preferences':t==='shopkeeper'?'Store partnership and personal profile':'Delivery partnership and rider profile'}</p><strong>Delete {labels[t]} Account →</strong></a>)}
      </section> : <div className="deletion-grid">
        <div className="deletion-explainer">
          <section><h2>How deletion works</h2><ol><li>Verify your registered phone using an SMS code.</li><li>Review the consequences and confirm your request.</li><li>Our team checks outstanding orders, settlements, disputes and retention obligations.</li><li>After approval, secure cleanup runs automatically. Keep your request reference. You can check status here while your sign-in exists, or contact support after deletion.</li></ol>
          <p>Requests are recorded immediately. Final deletion is not immediate: review and unresolved obligations determine the processing time. Approved requests enter the next scheduled cleanup run, normally within 15 minutes; service interruptions may delay completion. Contact support with your reference for a processing update.</p></section>
          <section><h2>What will be deleted</h2><ul><li>Your {labels[type].toLowerCase()} profile, personal phone/contact details, preferences and device/notification identifiers stored with it.</li>{type==='customer' && <li>Saved addresses, profile data, reviews and offer targeting associated with your customer account.</li>}{type==='rider' && <li>Rider profile photos, document uploads and current location information after outstanding obligations and document-retention needs have been reviewed.</li>}<li>Unnecessary delivery contact details and location snapshots in completed orders; associated operational chats and call signalling.</li><li>Personal files exclusively belonging to the deleted account, where no retention obligation applies.</li></ul></section>
          <section><h2>What may be retained, and why</h2><p>Orders, invoices, payments, payouts, taxation/accounting records, disputes, fraud/security evidence and a minimal deletion audit may be retained for reconciliation, legal obligations and resolving claims. Required financial and business documents are not automatically erased.</p>
          <p>{type==='shopkeeper'?'Shops, inventory, products and business history are preserved. An owned shop must be closed first; its personal owner/contact association is removed during cleanup. ':''}Your other KartKirana app accounts are preserved. Shared sign-in and shared files remain while another account uses them; Firebase Authentication is deleted when the final account is removed.</p><p>Cart, wishlist and other device-only data on a different phone cannot be remotely erased by this website. Clear that app’s storage after deletion. Retained records follow the applicable purpose and legal retention period; contact support for details relevant to your records.</p></section>
        </div>
        <section className="deletion-form" aria-labelledby="request-heading">
          <h2 id="request-heading">Request account deletion</h2>
          <p>Deletion is permanent once processed. Active orders, deliveries, unresolved payouts, refunds or disputes can delay it. A request does not cancel an order or waive money owed to you.</p>
          {error && <p className="deletion-error" role="alert">{error}</p>}
          {!status ? <>
            <form onSubmit={e=>{e.preventDefault();void send();}}>
              <label htmlFor="deletion-phone">Registered phone number</label>
              <input id="deletion-phone" type="tel" autoComplete="tel" value={phone} onChange={e=>{setPhone(e.target.value);setConfirmation(null);}} maxLength={16} disabled={busy} required aria-describedby="phone-help" />
              <p id="phone-help">Include your country code. We verify ownership before accepting a request.</p>
              <div ref={captcha} className="deletion-captcha" />
              <button disabled={busy || clock < resendAt} type="submit">{busy?'Please wait…':clock<resendAt?`Resend available in ${Math.ceil((resendAt-clock)/1000)}s`:confirmation?'Send a new code':'Send verification code'}</button>
            </form>
            {confirmation && <form onSubmit={e=>{e.preventDefault();void verify();}}><label htmlFor="deletion-otp">SMS verification code</label><input id="deletion-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} required disabled={busy}/><button disabled={busy || otp.length!==6}>Verify ownership</button></form>}
          </> : status.request ? <div aria-live="polite" className="deletion-receipt"><h3>{status.request.status==='COMPLETED'?'Account deletion completed':'Deletion request received'}</h3><p>Status: <strong>{status.request.status.replaceAll('_',' ')}</strong></p><p>Reference: <code>{status.request.id}</code></p><p>Keep this reference for support. You do not need to submit another request.</p><ul>{(status.request.blockers || []).map(b=><li key={b}>{blockers[b] || b}</li>)}</ul>{status.request.authRetained && <p>Your shared sign-in remains for your other KartKirana account(s).</p>}<button disabled={busy} onClick={()=>void run(async()=>setStatus(await deletionApi(type)))}>Refresh status</button></div> : !status.exists ? <p role="status">There is no {labels[type].toLowerCase()} account for this verified sign-in, or it has already been deleted. No deletion request was created.</p> : <>
            <p className="deletion-verified">Phone ownership verified · {phone.replace(/.(?=.{4})/g,'•')}</p>
            {(status.blockers || []).length>0 && <div role="status"><h3>Before final deletion</h3><ul>{status.blockers?.map(b=><li key={b}>{blockers[b] || b}</li>)}</ul><p>You can still submit a request. Your account stays available while these obligations are resolved.</p></div>}
            <label className="deletion-consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} disabled={busy}/><span>I request permanent deletion of my KartKirana {labels[type]} account and associated personal information. I understand the retention and other-account exceptions explained above.</span></label>
            <button className="deletion-danger" disabled={!accepted || busy} onClick={()=>void submit()}>Confirm deletion request</button>
          </>}
          {status && <button className="deletion-secondary" disabled={busy} onClick={()=>void run(async()=>{await endDeletionVerification();setStatus(null);setConfirmation(null);setAccepted(false);})}>Verify again / use another number</button>}
          <p className="deletion-help">Need assistance or cannot access your phone? <a href="mailto:support@kartkirana.com">support@kartkirana.com</a>. Support will verify ownership; never send anyone your OTP.</p>
        </section>
      </div>}
      <footer><a href="/delete-account">All account types</a><span> · </span><a href="/privacy">Privacy policies</a><p>KartKirana · Account and personal data requests</p></footer>
    </main>
  </div>;
}
