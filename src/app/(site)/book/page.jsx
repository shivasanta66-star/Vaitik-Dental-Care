import { redirect } from 'next/navigation';
import { SITE } from '@/lib/content.js';

// Appointments are booked on ClinicDesk. Old links to /book land there.
export default function BookPage() {
  redirect(SITE.bookingUrl);
}
