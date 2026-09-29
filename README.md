# Vaitik Dental Care website

The website for Vaitik Dental Care (Koraput and Semiliguda), built from the Claude Design handoff. It's a static React + Vite site with three pages:

| Page | What it is |
| --- | --- |
| `index.html` | Public site: hero, branches with live "Open now" status, treatments, first-visit steps, doctors, before/after gallery, reviews, booking form, FAQ, map and hours |
| `book.html` | The same booking form on its own page (good for sharing a direct booking link) |
| `admin.html` | Staff panel: dashboard, appointments (table and calendar), patients and CSV export, treatments and prices, schedule and holidays, reviews, gallery with consent, settings |

## Run it

```bash
npm install
npm run dev       # local dev server
npm run build     # production build in dist/
npm run preview   # serve the built site
```

`dist/` is plain static files with relative paths, so it can be hosted anywhere: GitHub Pages, Netlify, Vercel or any web host.

## Editing content

Clinic details live in **`src/shared/content.js`**: branches, phone numbers, hours, treatments, doctors, gallery, reviews, FAQs and links.

Values in `[SQUARE BRACKETS]` are placeholders from the design and still need real details:

- Emergency number, year established, and the Facebook, Instagram, YouTube and privacy policy links
- Google review links for each branch
- Treatment prices (`From Rs [PRICE]`)
- Doctors' qualifications, registration numbers, branch days and focus, and Dr Vaishali's surname
- Review paraphrases, plus the payment modes and parking answers in the FAQ
- A second landmark for each branch
- The booking fee amount and refund policy, used only if `BOOKING.fee` is turned on

**Photos:** put files in `public/images/` and set their paths in `IMAGES` and `GALLERY` in `content.js` (for example `'images/hero-chair.webp'`). Until then, each photo spot shows a labelled placeholder. Add a 1200×630 clinic photo at `public/images/og.jpg` for link previews on social media.

## Connecting a backend

The booking form and the admin panel work in the browser, but nothing is saved yet. `src/shared/api.js` holds placeholder functions for the endpoints the design expects. Replace them with real calls:

- `POST /api/bookings`: create a booking
- `GET /api/slots?branch=&date=`: return the booked slot times (minutes after midnight). Until this is connected, the form marks some demo slots as booked.
- `POST /api/payments`: booking fee (optional)
- `POST /api/auth/login`: staff login. **The admin panel currently accepts any email and password, and it shows demo appointments.**
- `PATCH /api/bookings/:id`, `PUT /api/{treatments,reviews,gallery,schedule,settings}`: admin changes

Testing helpers: add `?simulateError` to the site URL to see the booking error screen, and `?demo` to the admin URL to skip the login screen.
