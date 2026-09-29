import Site from '@/components/site/Site.jsx';
import { getSiteData } from '@/lib/data.js';

export const revalidate = 60;

export const metadata = {
  title: 'Book an appointment - Vaitik Dental Care',
  description: 'Book a dental appointment at Vaitik Dental Care, Koraput or Semiliguda. Takes under a minute; we call or WhatsApp you to confirm.',
};

export default async function BookPage() {
  const data = await getSiteData();
  return <Site data={data} view="book" serverNow={Date.now()} />;
}
