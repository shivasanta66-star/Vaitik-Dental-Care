import Site from '@/components/site/Site.jsx';
import { getSiteData } from '@/lib/data.js';
import { dentistJsonLd } from './jsonLd.js';

// Rebuild the page at most once a minute; admin changes also refresh it straight away.
export const revalidate = 60;

const description =
  'Gentle, clearly explained dental care at two branches: Masjid Road, Koraput (open every day till 9:30 PM) and Main Road, Semiliguda. Book online or WhatsApp us.';

export const metadata = {
  title: 'Vaitik Dental Care - Dentist in Koraput and Semiliguda',
  description,
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    title: 'Vaitik Dental Care - Dentist in Koraput and Semiliguda',
    description: 'Check-up, X-ray, written plan and cost before any treatment. Book at Koraput or Semiliguda.',
  },
};

export default async function HomePage() {
  const data = await getSiteData();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dentistJsonLd(data.branches)).replace(/</g, '\\u003c') }} />
      <Site data={data} view="home" serverNow={Date.now()} />
    </>
  );
}
