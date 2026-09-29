import { SiteFooter } from '@/components/site/Site.jsx';
import { branchView } from '@/lib/branch.js';
import { SITE } from '@/lib/content.js';
import { getSiteData } from '@/lib/data.js';

export const revalidate = 3600;

export const metadata = {
  title: 'Privacy policy - Vaitik Dental Care',
  description: 'How Vaitik Dental Care collects, uses and deletes the details you give us when booking an appointment.',
};

export default async function PrivacyPage() {
  const data = await getSiteData();
  const branches = data.branches.map((b) => branchView(b));
  const months = SITE.retentionMonths;
  return (
    <>
      <header className="site-header">
        <div className="header-bar">
          <a href="/" aria-label="Vaitik Dental Care home" className="logo">
            <span className="logo-word">VAITIK</span>
            <span className="logo-sub">dental care</span>
          </a>
          <a href="/book" className="nav-book" style={{ textDecoration: 'none' }}>
            Book<span className="odia">ବୁକ୍ କରନ୍ତୁ</span>
          </a>
        </div>
      </header>
      <main className="prose">
        <h1>Privacy policy</h1>
        <p className="muted">
          This policy explains what Vaitik Dental Care (&ldquo;we&rdquo;) does with the personal data you give us through this website, in line with India&rsquo;s Digital
          Personal Data Protection Act, 2023.
        </p>

        <h2>What we collect</h2>
        <p>When you book an appointment online we collect only what the booking form asks for:</p>
        <ul>
          <li>your name and mobile number</li>
          <li>the branch, the treatment or concern you chose, and your preferred date and time</li>
          <li>the optional note you write (please do not include medical history; we discuss that in person)</li>
          <li>your consent to be contacted about the appointment</li>
        </ul>
        <p>
          To stop automated abuse of the booking form we also keep a scrambled (hashed) form of your internet address for one day. We do not collect medical records
          through this website, and we do not use advertising trackers.
        </p>

        <h2>Why we use it</h2>
        <p>
          Only to arrange your appointment: to confirm it by phone or WhatsApp, to reschedule it if needed, and to keep a record of your visits at our clinic. We do not
          sell your data or use it for marketing.
        </p>

        <h2>Who can see it</h2>
        <p>
          Our doctors and front-desk staff. Your data is stored with the service providers that run this website: Supabase (database), Netlify (hosting) and Resend
          (booking emails to the clinic). If you pay a booking fee online, Razorpay processes the payment; we never see your card or UPI details.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep your booking details for {months} months after your last appointment, then delete them, unless the law requires us to keep them longer.
        </p>

        <h2>Your rights</h2>
        <p>You can ask us at any time to:</p>
        <ul>
          <li>tell you what data we hold about you</li>
          <li>correct it if it is wrong</li>
          <li>delete it, and withdraw your consent to be contacted</li>
        </ul>
        <p>
          Contact {SITE.grievanceOfficer} at <a href={'mailto:' + SITE.privacyEmail}>{SITE.privacyEmail}</a>, or call either branch
          {branches.length ? ' (' + branches.map((b) => b.name + ' ' + b.phone).join(', ') + ')' : ''}. We will reply within 30 days. If you are not satisfied with our
          response, you may complain to the Data Protection Board of India.
        </p>

        <p className="small muted">Last updated: [DATE]</p>
      </main>
      <SiteFooter branches={branches} emergencyNumber={data.settings.emergencyNumber} />
    </>
  );
}
