// Content that is not stored in the database, plus the fallback data the
// website shows when Supabase is not configured (local development, previews).
// Branches, hours, treatments, doctors, reviews, gallery and settings are
// managed in the admin panel once Supabase is connected.
// Values in [SQUARE BRACKETS] still need real details from the clinic.

export const SITE = {
  name: 'Vaitik Dental Care',
  established: '[YEAR]',
  facebook: '[FACEBOOK LINK]',
  instagram: '[INSTAGRAM LINK]',
  youtube: '[YOUTUBE LINK]',
  reviewsKoraput: 'https://maps.app.goo.gl/un9H1U9F6WPHQBRL9',
  reviewsSemiliguda: 'https://maps.app.goo.gl/3uNzFLx3curaQ5u29',
  // Shown on the privacy policy page.
  privacyEmail: '[CLINIC EMAIL]',
  grievanceOfficer: '[NAME OF PERSON RESPONSIBLE FOR DATA REQUESTS]',
  retentionMonths: 12,
  // Shown on the booking fee step (only when the fee is switched on).
  refundPolicy: '[CONFIRM REFUND POLICY]',
  // Photo for the treatment chair room (public/images/…), or null for the placeholder.
  heroImage: null,
};

export const FAQS = [
  { q: 'How much will my treatment cost?', a: 'It depends on what the tooth needs. After the check-up we give you a written plan with the cost before we start. The "from" prices on this page are starting points only.' },
  { q: 'Will it hurt?', a: 'For procedures that need it, we numb the area with local anaesthesia first. Most people feel pressure rather than sharp pain. If you feel anything, raise your hand and we stop.' },
  { q: 'How long do braces take?', a: 'It depends on how much your teeth need to move. After the check-up and X-ray we give you an estimate and a visit schedule.' },
  { q: 'How many sittings does a root canal need?', a: 'Often one to three sittings, depending on the infection. A crown is usually placed afterwards to protect the tooth. We tell you the number at the start.' },
  { q: 'When should my child first see a dentist?', a: 'Around the first birthday, or when the first teeth come in. Early visits are short and gentle, so children get used to the chair.' },
  { q: 'How can I pay?', a: '[CONFIRM PAYMENT MODES, e.g. cash, UPI, debit/credit card]' },
  { q: 'Is there parking?', a: '[CONFIRM PARKING AT KORAPUT AND SEMILIGUDA, e.g. two-wheeler parking in front]' },
];

const every = (o, c) => [0, 1, 2, 3, 4, 5, 6].map(() => [o, c]);

export const FALLBACK = {
  live: false,
  settings: { emergencyNumber: '[EMERGENCY NUMBER]', feeEnabled: false, feeAmount: 0 },
  branches: [
    {
      id: 'koraput', slug: 'koraput', name: 'Koraput', odia: 'କୋରାପୁଟ',
      tag: 'Main branch · 4.9★ (56 Google reviews)', short: 'Masjid Road · open daily',
      addr: 'Masjid Road, in front of Roshini Tailor, Koraput, Odisha 764020',
      landmark: 'On Masjid Road, directly in front of Roshini Tailor. [ADD A SECOND LANDMARK, e.g. distance from Koraput bus stand]',
      phone: '+91 82494 20328', tel: '+918249420328', wa: '918249420328',
      lat: 18.8131623, lng: 82.7099606, hours: every(540, 1290), blocked: {},
    },
    {
      id: 'semiliguda', slug: 'semiliguda', name: 'Semiliguda', odia: 'ସେମିଳିଗୁଡ଼ା',
      tag: '5.0★ (7 Google reviews)', short: 'Main Road · Sun evenings',
      addr: 'Main Road, Semiliguda, Odisha 764036',
      landmark: 'On Main Road, Semiliguda. [ADD NEARBY LANDMARK]',
      phone: '+91 81204 41939', tel: '+918120441939', wa: '918120441939',
      lat: 18.7038004, lng: 82.8570261, hours: every(600, 1230).map((h, d) => (d === 0 ? [1020, 1230] : h)), blocked: {},
    },
  ],
  treatments: [
    { name: 'Check-up and X-ray', icon: 'ph-magnifying-glass', desc: 'We look at every tooth and take an X-ray if needed, so nothing is guessed.', price: 'From Rs [PRICE]' },
    { name: 'Root canal', icon: 'ph-tooth', desc: 'Clears infection from inside the tooth so you can keep it instead of removing it.', price: 'From Rs [PRICE]' },
    { name: 'Tooth extraction and wisdom tooth', icon: 'ph-first-aid-kit', desc: 'When a tooth cannot be saved, we remove it carefully under local anaesthesia.', price: 'From Rs [PRICE]' },
    { name: 'Braces and aligners', icon: 'ph-smiley', desc: 'Metal, ceramic or clear aligners to straighten teeth. We explain which suits you.', price: 'Price after check-up' },
    { name: 'Fillings', icon: 'ph-drop-half', desc: 'The cavity is cleaned and filled with tooth-coloured material, usually in one visit.', price: 'From Rs [PRICE]' },
    { name: 'Crowns and bridges', icon: 'ph-crown-simple', desc: 'A cap to protect a weak tooth, or a bridge to replace a missing one.', price: 'From Rs [PRICE]' },
    { name: 'Dentures', icon: 'ph-smiley-wink', desc: 'Full or partial removable teeth, made and adjusted to fit your mouth.', price: 'From Rs [PRICE]' },
    { name: 'Implants', icon: 'ph-anchor-simple', desc: 'A fixed replacement for a missing tooth, placed in the jaw bone.', price: 'Price after check-up' },
    { name: 'Cleaning and whitening', icon: 'ph-sparkle', desc: 'Scaling removes hard deposits that brushing cannot. Whitening is optional.', price: 'From Rs [PRICE]' },
    { name: "Kids' dentistry", icon: 'ph-baby', desc: 'Check-ups, fillings and fluoride for children, done slowly and at their pace.', price: 'From Rs [PRICE]' },
  ],
  doctors: [
    { id: 'd1', name: 'Dr Ch Kartik', credentials: '[QUALIFICATION] · Dental Council Reg. No. [REG. NO.]', days: '[BRANCH DAYS, e.g. Koraput Mon–Sat, Semiliguda Sun evening]', focus: '[ONE LINE ON FOCUS, e.g. root canal treatment and extractions]', photo: null },
    { id: 'd2', name: 'Dr Vaishali [SURNAME]', credentials: '[QUALIFICATION] · Dental Council Reg. No. [REG. NO.]', days: '[BRANCH DAYS]', focus: "[ONE LINE ON FOCUS, e.g. children's dentistry and braces]", photo: null },
  ],
  reviews: [
    { text: 'The clinic is hygienic ,clean with patient friendly environment. The dentist Ch Kartik sir was  gentle & highly professional, explain everything clearly, and don\'t push unnecessary treatments."The doctor & staff of this clinic behave politely with patients.They use modern techniques that make the treatment much faster.The doctors confident & motivation act like a shield against fear.\n\nHIGHLY  RECOMMENDED\nThank you', initial: 'Nirmala G', branch: 'Koraput' },
    { text: 'My mother had a very complex dental condition when we first visited the clinic. She only had 7 teeth in the upper jaw and 2 teeth  in the lower jaw. The doctors, Ch Kartik and Dr Vaishali carefully planned her treatment, which included root canal procedures, a surgery, teeth extractions and other dental work and provided the best treatment as per her age and her bone health.\n\nThroughout the entire process, they along with their staff were too friendly, patient and supportive and handled with extreme care and hygiene. They explained every step clearly and made sure my mother was comfortable during the treatment.\n\nToday, the results are truly amazing. My mother can smile and eat properly again after a long time. Thank you so much Kartik bro and Vaishali bhabi.\n\nI highly recommend Vaitik clinic to anyone looking for high quality dental treatment in and around Koraput and Semiliguda.', initial: 'K Deepak Choudhury', branch: 'Koraput' },
    { text: 'Finally after long queries and search... I found the perfect dental clinic in Koraput recomended by one of my friend who is also a dentist. I recently went there for my dental treatment and had the best experience. Not only it was the professional behaviour but also the transperency which was their benchmark. Before starting the treatment they explained about my issues followed by a proper treatment plan along with the cost of treatment which was quite affordable. Although I was worried about the procedure which is usually very painful, but thanks to the doctors for their exquisite hand work.Thank You Dr. Ch. Kartik , Dr. Vaishali Shukla, owners of Vaitik Dental Care and to their assistant Ritu for helping me throughout my treatment. I will recomend others to visit the clinic for any dental related issues.', initial: 'Niharika Panda', branch: 'Koraput' },
    { text: 'recently visited Vatika Dendral Clinic, and my experience was excellent from start to finish. The staff were very professional, friendly, and attentive, making me feel comfortable , The specialists took the time to carefully understand my problem and  provided me a detailed consultation before suggesting treatment.The treatment itself was effective and done with great care. You most visit Vaitik Dental Care', initial: 'Sumit Turuk', branch: 'Koraput' },
  ],
  gallery: [
    { id: 'g1', caption: 'Braces', before: null, after: null },
    { id: 'g2', caption: 'Crown', before: null, after: null },
    { id: 'g3', caption: 'Dentures', before: null, after: null },
  ],
};
