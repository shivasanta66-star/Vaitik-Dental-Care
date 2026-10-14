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
          <a href={SITE.bookingUrl} target="_blank" rel="noopener noreferrer" className="nav-book">
            Book Appointment<span className="odia">ବୁକ୍ କରନ୍ତୁ</span>
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
        <p>
          The &ldquo;Ask us a question&rdquo; form does not send anything from this website. It opens WhatsApp with your name, mobile number and question typed in, and
          nothing reaches us until you press Send in WhatsApp. Your message is then handled by WhatsApp and seen by our staff on the branch&rsquo;s WhatsApp number.
          Please do not include medical history; we discuss that in person. We do not collect medical records
          through this website, and we do not use advertising trackers.
        </p>

        <h2>Why we use it</h2>
        <p>
          Only to answer your question and to arrange your appointments: to reply by phone or WhatsApp, to confirm or reschedule a visit, and to keep a record of your
          visits at our clinic. We do not
          sell your data or use it for marketing.
        </p>

        <h2>Who can see it</h2>
        <p>
          Our doctors and front-desk staff. Questions you send us on WhatsApp are carried by WhatsApp. Appointments you book online are handled by our booking system,
          ClinicDesk. This website is hosted on Netlify.
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
