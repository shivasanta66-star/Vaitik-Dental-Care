'use client';

import { useEffect, useRef, useState } from 'react';
import { branchView } from '@/lib/branch.js';
import { FAQS, SITE, real, withoutPlaceholders } from '@/lib/content.js';
import { clinicNow } from '@/lib/time.js';
import ImageSlot from '../ImageSlot.jsx';
import BookingSection, { HoursTable, useBooking } from './Booking.jsx';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  // 64px sticky header plus a little air, so the section title is never hidden behind it.
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

// Clinic time, refreshed every minute so "Open now" badges stay correct.
// Starts from the server's clock so the first render matches the HTML.
function useClinicNow(serverNow) {
  const [now, setNow] = useState(() => clinicNow(new Date(serverNow)));
  useEffect(() => {
    setNow(clinicNow());
    const t = setInterval(() => setNow(clinicNow()), 60000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const REVIEW_PREVIEW_CHARS = 200;

/** First ~200 characters of a review, cut at a word boundary. Full text stays on Google Maps. */
function preview(text) {
  if (text.length <= REVIEW_PREVIEW_CHARS) return text;
  return text.slice(0, REVIEW_PREVIEW_CHARS).replace(/\s+\S*$/, '').replace(/[\s,.;:-]+$/, '') + '… ';
}

export default function Site({ data, view = 'home', serverNow }) {
  const isHome = view === 'home';
  const now = useClinicNow(serverNow);
  const booking = useBooking(data.settings);
  const [menu, setMenu] = useState(false);
  const [chooser, setChooser] = useState(null); // 'wa' | 'call' | null
  const [faq, setFaq] = useState(0);
  const [mapTab, setMapTab] = useState(data.branches[0]?.slug);
  const [lightbox, setLightbox] = useState(null);
  const lbClose = useRef(null);

  const branches = data.branches.map((b) => branchView(b, now));
  const mapB = branches.find((b) => b.slug === mapTab) || branches[0];
  // Each before/after pair shows as two photos, up to six on the page.
  // Pairs without both real photos are skipped, so no stand-in art is ever shown as a patient result.
  const photos = data.gallery.filter((g) => g.before && g.after).slice(0, 3).flatMap((g) => [
    { id: g.id + '-b', src: g.before, caption: g.caption + ' · before', alt: 'Before: ' + g.caption + ' (shown with patient consent)' },
    { id: g.id + '-a', src: g.after, caption: g.caption + ' · after', alt: 'After: ' + g.caption },
  ]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setLightbox(null);
        setChooser(null);
        setMenu(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (lightbox != null) lbClose.current?.focus();
  }, [lightbox]);

  const goBook = () => {
    setMenu(false);
    setChooser(null);
    scrollToId('book');
    setTimeout(() => document.getElementById('bk-name')?.focus({ preventScroll: true }), 500);
  };
  const openWa = () => {
    setChooser('wa');
    setMenu(false);
  };
  const openCall = () => {
    setChooser('call');
    setMenu(false);
  };
  const bookTreatment = (name) => {
    booking.setF('treatment', name);
    if (booking.phase !== 'form' && !booking.ref) booking.setPhase('form');
    goBook();
  };
  const tabKeys = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = branches.findIndex((b) => b.slug === mapTab);
    const n = branches[(i + (e.key === 'ArrowRight' ? 1 : branches.length - 1)) % branches.length].slug;
    setMapTab(n);
    setTimeout(() => document.getElementById('tab-' + n)?.focus(), 0);
  };

  // Section links point back to the home page when this is the booking-only page.
  const home = isHome ? '' : '/';
  const lbItem = lightbox != null ? photos[lightbox] : null;

  return (
    <>
      <header className="site-header">
        <div className="header-bar">
          <a href={isHome ? '#top' : '/'} aria-label="Vaitik Dental Care home" className="logo">
            <span className="logo-word">VAITIK</span>
            <span className="logo-sub">dental care</span>
          </a>
          <nav aria-label="Main" className="nav-desktop">
            <a href={home + '#treatments'}>Treatments</a>
            <a href={home + '#doctors'}>Doctors</a>
            <a href={home + '#branches'}>Branches</a>
            <a href={home + '#reviews'}>Reviews</a>
            <a href={home + '#visit'}>Visit us</a>
            <button type="button" onClick={goBook} className="nav-book">
              Book<span className="odia">ବୁକ୍ କରନ୍ତୁ</span>
            </button>
          </nav>
          <div className="nav-phone">
            <button type="button" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(!menu)} className="icon-btn">
              <i className={'ph-duotone ' + (menu ? 'ph-x' : 'ph-list')} />
            </button>
          </div>
        </div>
        {menu && (
          <nav aria-label="Mobile" className="nav-mobile">
            {[
              ['#treatments', 'Treatments'],
              ['#doctors', 'Doctors'],
              ['#branches', 'Branches'],
              ['#reviews', 'Reviews'],
              ['#visit', 'Visit us · map and hours'],
            ].map(([href, label]) => (
              <a key={href} href={home + href} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
            <button type="button" onClick={goBook}>
              Book appointment · <span className="odia">ବୁକ୍ କରନ୍ତୁ</span>
            </button>
          </nav>
        )}
      </header>

      <main id="top">
        {isHome && (
          <>
            <section aria-labelledby="hero-title" className="hero">
              <div className="wrap hero-inner">
                <div className="hero-copy">
                  <p className="hero-kicker">
                    Koraput · <span className="odia">କୋରାପୁଟ</span> · Semiliguda · <span className="odia">ସେମିଳିଗୁଡ଼ା</span>
                  </p>
                  <h1 id="hero-title">Gentle dental care in Koraput and Semiliguda, explained before we begin.</h1>
                  <p className="hero-lead">We check your teeth, show you the X-ray and give you the plan and cost in writing. Treatment starts only when you say yes.</p>
                  <p className="hero-facts">
                    <strong>{SITE.ratings.koraput.score} ★</strong> from {SITE.ratings.koraput.count} Google reviews at Koraput
                    {branches[0] && <> <span aria-hidden="true">/</span> {branches[0].summary}</>}
                  </p>
                  <div className="hero-ctas">
                    <button type="button" onClick={openWa} className="btn btn-wa hero-wa">
                      <i className="ph-duotone ph-whatsapp-logo" />
                      WhatsApp us
                    </button>
                    <button type="button" onClick={goBook} className="btn btn-stack hero-book">
                      Book appointment<span className="odia">ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକ୍ କରନ୍ତୁ</span>
                    </button>
                  </div>
                </div>
                {SITE.heroImage && (
                  <div className="hero-photo">
                    <ImageSlot src={SITE.heroImage} alt="The treatment chair room at the Koraput clinic" />
                  </div>
                )}
              </div>
            </section>

            <section id="branches" aria-labelledby="branches-title" className="anchor">
              <div className="wrap stack gap-24">
                <div className="stack gap-8">
                  <h2 id="branches-title" className="h2">
                    Choose your nearest branch
                  </h2>
                  <p className="muted">Pick the one that is easier to reach.</p>
                </div>
                <div className="grid branch-grid">
                  {branches.map((b) => (
                    <article key={b.slug} className="card branch-card">
                      <div className="branch-top">
                        <div>
                          <h3 className="h3">
                            {b.name} <span className="odia">{b.odia}</span>
                          </h3>
                          <p className="small muted">{b.tag}</p>
                        </div>
                        <span className={'status-badge' + (b.isOpen ? ' is-open' : '')}>
                          <span aria-hidden="true" className="status-dot" />
                          {b.statusLabel}
                        </span>
                      </div>
                      <p className="icon-line">
                        <i className="ph-duotone ph-map-pin" aria-hidden="true" />
                        <span>{b.addr}</span>
                      </p>
                      <p className="icon-line">
                        <i className="ph-duotone ph-clock" aria-hidden="true" />
                        <span>
                          <strong>Today ({b.dayName}):</strong> {b.todayHours}
                        </span>
                      </p>
                      <div className="branch-actions">
                        <a href={b.telHref} className="btn btn-outline">
                          <i className="ph-duotone ph-phone" aria-hidden="true" />
                          Call
                        </a>
                        <a href={b.waHref} target="_blank" rel="noopener" className="btn btn-wa">
                          <i className="ph-duotone ph-whatsapp-logo" aria-hidden="true" />
                          WhatsApp
                        </a>
                        <a href={b.dirHref} target="_blank" rel="noopener" className="btn btn-outline">
                          <i className="ph-duotone ph-navigation-arrow" aria-hidden="true" />
                          Directions
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section aria-label="Our promises" className="promise-strip">
              <ul className="promises">
                {['Plan and cost explained before treatment', 'No unnecessary procedures', 'Evening and Sunday appointments'].map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </section>

            <section id="treatments" aria-labelledby="treat-title" className="anchor">
              <div className="wrap stack gap-24">
                <div className="split-head">
                  <h2 id="treat-title" className="h2">
                    Treatments
                  </h2>
                  <p className="muted">Prices are starting points. Your final cost is explained after the check-up, before anything is done.</p>
                </div>
                <ul className="treat-list">
                  {data.treatments.map((t) => (
                    <li key={t.name} className="treat-row">
                      <h3 className="treat-name">{t.name}</h3>
                      <p className="treat-desc">{t.desc}</p>
                      <p className="treat-price">{real(t.price)}</p>
                      <button type="button" onClick={() => bookTreatment(t.name)} className="btn-link treat-book" aria-label={'Book ' + t.name}>
                        Book
                        <i className="ph-duotone ph-arrow-right" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section aria-labelledby="nervous-title" className="tint">
              <div className="wrap stack gap-32">
                <div className="stack gap-8 head-narrow">
                  <h2 id="nervous-title" className="h2">
                    Nervous about pain?
                  </h2>
                  <p>Many of our patients are. This is exactly what happens at your first visit. Nothing is done without your agreement, and you can ask us to stop at any time.</p>
                </div>
                <ol className="steps">
                  {[
                    ['Check-up', 'The doctor looks at your teeth and gums and listens to what is bothering you.'],
                    ['Explanation with X-ray', 'If needed, we take an X-ray and show you on screen what we found, in plain words.'],
                    ['Written plan with cost', 'You get the options, the number of visits and the cost on paper. Take it home and think.'],
                    ['Treatment only after you agree', 'We numb the area when a procedure needs it. Raise your hand and we pause.'],
                  ].map(([title, text], i) => (
                    <li key={title}>
                      <span aria-hidden="true" className="step-num">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="h3">{title}</h3>
                      <p>{text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {data.doctors.length > 0 && (
              <section id="doctors" aria-labelledby="doc-title" className="anchor">
                <div className="wrap stack gap-24">
                  <h2 id="doc-title" className="h2">
                    Your doctors
                  </h2>
                  <div className="grid doc-grid">
                    {data.doctors.map((d) => (
                      <article key={d.id} className="card doc-card">
                        <div className="doc-photo">
                          <ImageSlot variant="doctor" src={d.photo} alt={d.name} placeholder={d.name} />
                        </div>
                        <div className="doc-body">
                          <h3 className="h3">{withoutPlaceholders(d.name)}</h3>
                          {real(d.credentials) && <p className="small muted">{d.credentials}</p>}
                          {real(d.days) && <p className="small doc-days">{d.days}</p>}
                          {real(d.focus) && <p>{d.focus}</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {photos.length > 0 && (
              <section aria-labelledby="gal-title" className="tint">
                <div className="wrap stack gap-24">
                  <div className="stack gap-8">
                    <h2 id="gal-title" className="h2">
                      Before and after
                    </h2>
                    <p className="muted">Real patients of this clinic, shown with patient consent. Every mouth is different.</p>
                  </div>
                  <div className="grid gal-grid">
                    {photos.map((g, i) => (
                      <figure key={g.id} className="gal-item">
                        <div className="gal-media">
                          <ImageSlot src={g.src} alt={g.alt} placeholder={g.alt} />
                          <button type="button" aria-label={'Enlarge ' + g.caption} onClick={() => setLightbox(i)} className="gal-zoom">
                            <i className="ph-duotone ph-arrows-out" />
                          </button>
                        </div>
                        <figcaption>{g.caption}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {data.reviews.length > 0 && (
              <section id="reviews" aria-labelledby="rev-title" className="anchor">
                <div className="wrap stack gap-24">
                  <div className="rev-head">
                    <div className="stack gap-8">
                      <h2 id="rev-title" className="h2">
                        What patients say
                      </h2>
                      <p className="muted">A few from Google. Koraput rated {SITE.ratings.koraput.score} from {SITE.ratings.koraput.count} reviews, Semiliguda {SITE.ratings.semiliguda.score} from {SITE.ratings.semiliguda.count}.</p>
                    </div>
                    <div className="rev-links">
                      <a href={SITE.reviewsKoraput} target="_blank" rel="noopener">
                        Read all on Google (Koraput)
                      </a>
                      <a href={SITE.reviewsSemiliguda} target="_blank" rel="noopener">
                        Read all on Google (Semiliguda)
                      </a>
                    </div>
                  </div>
                  <div className="rev-layout">
                    {data.reviews.map((r, i) => (
                      <figure key={i} className={'rev-card' + (i === 0 ? ' is-lead' : '')}>
                        <blockquote>
                          {preview(r.text)}
                          {r.text.length > REVIEW_PREVIEW_CHARS && (
                            <>
                              {' '}
                              <a
                                className="rev-more"
                                href={r.branch === 'Semiliguda' ? SITE.reviewsSemiliguda : SITE.reviewsKoraput}
                                target="_blank"
                                rel="noopener"
                                aria-label={'Read the full review by ' + r.initial + ' on Google Maps'}
                              >
                                Read more
                              </a>
                            </>
                          )}
                        </blockquote>
                        <figcaption>
                          <strong>{r.initial}</strong>
                          {r.branch ? ', ' + r.branch : ''}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <BookingSection booking={booking} branches={data.branches} treatments={data.treatments} settings={data.settings} now={now} />

        {isHome && (
          <>
            <section id="faq" aria-labelledby="faq-title">
              <div className="faq-wrap stack gap-24">
                <h2 id="faq-title" className="h2">
                  Common questions
                </h2>
                <div>
                  {FAQS.filter((q) => real(q.a)).map((q, i) => {
                    const open = faq === i;
                    return (
                      <div key={q.q} className="faq-item">
                        <h3>
                          <button type="button" id={'faq-b' + i} aria-expanded={open} aria-controls={'faq-p' + i} onClick={() => setFaq(open ? -1 : i)} className="faq-q">
                            {q.q}
                            <i className={'ph-duotone ' + (open ? 'ph-minus' : 'ph-plus')} aria-hidden="true" />
                          </button>
                        </h3>
                        {open && (
                          <div id={'faq-p' + i} role="region" aria-labelledby={'faq-b' + i} className="faq-a">
                            <p>{q.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {mapB && (
              <section id="visit" aria-labelledby="visit-title" className="tint anchor">
                <div className="wrap stack gap-24">
                  <h2 id="visit-title" className="h2">
                    Map and hours
                  </h2>
                  <div role="tablist" aria-label="Branch" onKeyDown={tabKeys} className="tabs">
                    {branches.map((b) => {
                      const sel = mapB.slug === b.slug;
                      return (
                        <button key={b.slug} type="button" role="tab" id={'tab-' + b.slug} aria-selected={sel} aria-controls="map-panel" tabIndex={sel ? 0 : -1} onClick={() => setMapTab(b.slug)} className="tab">
                          {b.name} <span className="odia">{b.odia}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div id="map-panel" role="tabpanel" aria-labelledby={'tab-' + mapB.slug} className="map-panel">
                    <div className="map-frame">
                      <iframe
                        title={'Map of Vaitik Dental Care, ' + mapB.name}
                        src={mapB.mapSrc}
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                    <div className="map-info">
                      <p style={{ fontWeight: 600 }}>{mapB.addr}</p>
                      <p className="small">
                        <strong>How to find us:</strong> {withoutPlaceholders(mapB.landmark)}
                      </p>
                      <HoursTable caption="Weekly hours" week={mapB.week} />
                      <a href={mapB.dirHref} target="_blank" rel="noopener" className="btn btn-outline">
                        <i className="ph-duotone ph-navigation-arrow" aria-hidden="true" />
                        Open in Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <SiteFooter branches={branches} emergencyNumber={data.settings.emergencyNumber} />

      {chooser && (
        <>
          <div onClick={() => setChooser(null)} className="scrim" />
          <div role="dialog" aria-modal="true" aria-labelledby="chooser-title" className="chooser">
            <div className="chooser-head">
              <p id="chooser-title" className="chooser-title">
                Which branch?
              </p>
              <button type="button" aria-label="Close" onClick={() => setChooser(null)} className="chooser-close">
                <i className="ph-duotone ph-x" />
              </button>
            </div>
            {branches.map((b) => {
              const call = chooser === 'call';
              return (
                <a key={b.slug} href={call ? b.telHref : b.waHref} target={call ? '_self' : '_blank'} rel="noopener" onClick={() => setChooser(null)} className={'chooser-item' + (call ? '' : ' is-wa')}>
                  <i className={'ph-duotone ' + (call ? 'ph-phone' : 'ph-whatsapp-logo')} aria-hidden="true" />
                  <span>
                    <strong>
                      {b.name} <span className="odia">{b.odia}</span>
                    </strong>
                    <span className="small">{call ? b.phone + ' · ' + b.statusLabel : b.statusLabel}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </>
      )}

      <button type="button" aria-label="WhatsApp us" onClick={openWa} className="fab">
        <i className="ph-duotone ph-whatsapp-logo" />
      </button>

      <nav aria-label="Quick actions" className="quick-bar">
        <button type="button" onClick={openCall} className="quick-call">
          <i className="ph-duotone ph-phone" aria-hidden="true" />
          Call
        </button>
        <button type="button" onClick={openWa} className="quick-wa">
          <i className="ph-duotone ph-whatsapp-logo" aria-hidden="true" />
          WhatsApp
        </button>
        <button type="button" onClick={goBook} className="quick-book">
          <i className="ph-duotone ph-calendar-check" aria-hidden="true" />
          Book
        </button>
      </nav>

      {lbItem && (
        <div role="dialog" aria-modal="true" aria-label={lbItem.caption} onClick={() => setLightbox(null)} className="lightbox">
          <div onClick={(e) => e.stopPropagation()} className="lightbox-media">
            <ImageSlot src={lbItem.src} alt={lbItem.alt} placeholder={lbItem.alt} />
          </div>
          <p>{lbItem.caption} · shown with patient consent</p>
          <button type="button" ref={lbClose} onClick={() => setLightbox(null)}>
            Close
          </button>
        </div>
      )}
    </>
  );
}

export function SiteFooter({ branches, emergencyNumber }) {
  return (
    <footer className="site-footer">
      {real(emergencyNumber) && (
        <div className="emergency">
          <p>
            <i className="ph-duotone ph-first-aid" aria-hidden="true" />
            Dental emergency? Call <a href={'tel:' + emergencyNumber.replace(/[^\d+]/g, '')}>{emergencyNumber}</a>
          </p>
        </div>
      )}
      <div className="footer-grid">
        <div className="stack gap-8">
          <p className="logo">
            <span className="logo-word">VAITIK</span>
            <span className="logo-sub">dental care</span>
          </p>
          <p className="footer-muted">Gentle, clearly explained dental care.{real(SITE.established) && ' Since ' + SITE.established + '.'}</p>
          <div className="footer-links">
            {[['Facebook', SITE.facebook], ['Instagram', SITE.instagram], ['YouTube', SITE.youtube]].map(([label, href]) => real(href) && <a key={label} href={href}>{label}</a>)}
          </div>
        </div>
        {branches.map((b) => (
          <div key={b.slug} className="stack gap-8">
            <p className="footer-branch-name">
              {b.name} <span className="odia">{b.odia}</span>
            </p>
            <p className="footer-muted">{b.addr}</p>
            <p className="footer-muted">{b.summary}</p>
            <a href={b.telHref} className="footer-phone">
              {b.phone}
            </a>
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <p>© Vaitik Dental Care</p>
        <div>
          <a id="privacy" href="/privacy">
            Privacy policy
          </a>
          <a href="/admin">Staff login</a>
        </div>
      </div>
    </footer>
  );
}
