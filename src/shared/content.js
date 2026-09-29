// All clinic content lives here. Values in [SQUARE BRACKETS] are placeholders
// from the design handoff and still need real details from the clinic.

// Photos: put files in public/images/ and set the path, e.g. 'images/hero-chair.webp'.
// Leave as null to show the labelled placeholder.
export const IMAGES = {
  heroChair: null,
  docKartik: null,
  docVaishali: null,
};

export const SITE = {
  emergencyNumber: '[EMERGENCY NUMBER]',
  established: '[YEAR]',
  facebook: '[FACEBOOK LINK]',
  instagram: '[INSTAGRAM LINK]',
  youtube: '[YOUTUBE LINK]',
  privacyPolicy: '[PRIVACY POLICY LINK]',
  reviewsKoraput: '[KORAPUT REVIEWS LINK]',
  reviewsSemiliguda: '[SEMILIGUDA REVIEWS LINK]',
};

// Online booking fee step (Step 2 of 2). When false, the form books directly.
export const BOOKING = {
  fee: false,
  feeAmount: '[AMOUNT]',
  refundPolicy: '[CONFIRM REFUND POLICY]',
};

// Opening hours are minutes after midnight: [open, close]. `hours(day)` gets 0 = Sunday … 6 = Saturday.
export const BRANCHES = {
  koraput: {
    id: 'koraput',
    name: 'Koraput',
    odia: 'କୋରାପୁଟ',
    tag: 'Main branch · 4.9★ (56 Google reviews)',
    short: 'Masjid Road · open daily',
    addr: 'Masjid Road, in front of Roshini Tailor, Koraput, Odisha 764020',
    phone: '+91 82494 20328',
    tel: '+918249420328',
    wa: '918249420328',
    lat: 18.8131623,
    lng: 82.7099606,
    hours: () => [540, 1290],
    summary: 'Every day, 9:00 AM – 9:30 PM',
    landmark: 'On Masjid Road, directly in front of Roshini Tailor. [ADD A SECOND LANDMARK, e.g. distance from Koraput bus stand]',
  },
  semiliguda: {
    id: 'semiliguda',
    name: 'Semiliguda',
    odia: 'ସେମିଳିଗୁଡ଼ା',
    tag: '5.0★ (7 Google reviews)',
    short: 'Main Road · Sun evenings',
    addr: 'Main Road, Semiliguda, Odisha 764036',
    phone: '+91 81204 41939',
    tel: '+918120441939',
    wa: '918120441939',
    lat: 18.7038004,
    lng: 82.8570261,
    hours: (d) => (d === 0 ? [1020, 1230] : [600, 1230]),
    summary: 'Mon–Sat 10:00 AM – 8:30 PM · Sun 5:00 – 8:30 PM',
    landmark: 'On Main Road, Semiliguda. [ADD NEARBY LANDMARK]',
  },
};

export const TREATMENTS = [
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
];

export const DOCTORS = [
  {
    name: 'Dr Ch Kartik',
    photo: 'docKartik',
    photoAlt: 'Photo: Dr Ch Kartik at the clinic',
    credentials: '[QUALIFICATION] · Dental Council Reg. No. [REG. NO.]',
    days: '[BRANCH DAYS, e.g. Koraput Mon–Sat, Semiliguda Sun evening]',
    focus: '[ONE LINE ON FOCUS, e.g. root canal treatment and extractions]',
  },
  {
    name: 'Dr Vaishali [SURNAME]',
    photo: 'docVaishali',
    photoAlt: 'Photo: Dr Vaishali at the clinic',
    credentials: '[QUALIFICATION] · Dental Council Reg. No. [REG. NO.]',
    days: '[BRANCH DAYS]',
    focus: "[ONE LINE ON FOCUS, e.g. children's dentistry and braces]",
  },
];

// Before/after photos. Only publish with written patient consent. Set `src` e.g. 'images/braces-before.webp'.
export const GALLERY = [
  { id: 'gal-braces-before', src: null, caption: 'Braces · before', alt: 'Before: crowded front teeth, prior to braces (patient consent on file)' },
  { id: 'gal-braces-after', src: null, caption: 'Braces · after', alt: 'After: the same teeth after braces treatment' },
  { id: 'gal-crown-before', src: null, caption: 'Crown · before', alt: 'Before: broken back tooth, prior to crown' },
  { id: 'gal-crown-after', src: null, caption: 'Crown · after', alt: 'After: the same tooth with a crown fitted' },
  { id: 'gal-denture-before', src: null, caption: 'Dentures · before', alt: 'Before: missing teeth, prior to dentures' },
  { id: 'gal-denture-after', src: null, caption: 'Dentures · after', alt: 'After: the same patient wearing new dentures' },
];

export const REVIEWS = [
  { text: '[Paraphrase of a Google review — e.g. about a root canal and how it was explained]', initial: '[A.]', branch: 'Koraput' },
  { text: '[Paraphrase of a Google review — e.g. about bringing a child for a check-up]', initial: '[S.]', branch: 'Koraput' },
  { text: '[Paraphrase of a Google review — e.g. about an evening appointment after work]', initial: '[P.]', branch: 'Semiliguda' },
  { text: '[Paraphrase of a Google review — e.g. about cost being told upfront]', initial: '[R.]', branch: 'Koraput' },
];

export const FAQS = [
  { q: 'How much will my treatment cost?', a: 'It depends on what the tooth needs. After the check-up we give you a written plan with the cost before we start. The "from" prices on this page are starting points only.' },
  { q: 'Will it hurt?', a: 'For procedures that need it, we numb the area with local anaesthesia first. Most people feel pressure rather than sharp pain. If you feel anything, raise your hand and we stop.' },
  { q: 'How long do braces take?', a: 'It depends on how much your teeth need to move. After the check-up and X-ray we give you an estimate and a visit schedule.' },
  { q: 'How many sittings does a root canal need?', a: 'Often one to three sittings, depending on the infection. A crown is usually placed afterwards to protect the tooth. We tell you the number at the start.' },
  { q: 'When should my child first see a dentist?', a: 'Around the first birthday, or when the first teeth come in. Early visits are short and gentle, so children get used to the chair.' },
  { q: 'How can I pay?', a: '[CONFIRM PAYMENT MODES, e.g. cash, UPI, debit/credit card]' },
  { q: 'Is there parking?', a: '[CONFIRM PARKING AT KORAPUT AND SEMILIGUDA, e.g. two-wheeler parking in front]' },
];
