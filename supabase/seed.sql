-- Starting data: both branches with hours, the treatment list, settings,
-- and placeholder doctors and reviews to replace from the admin panel.
-- Safe to run more than once.

insert into public.branches (slug, name, name_odia, tagline, short_label, address, landmark, phone, whatsapp, maps_url, lat, lng, sort) values
  ('koraput', 'Koraput', 'କୋରାପୁଟ', 'Main branch · 4.9★ (56 Google reviews)', 'Masjid Road · open daily',
   'Masjid Road, in front of Roshini Tailor, Koraput, Odisha 764020',
   'On Masjid Road, directly in front of Roshini Tailor. [ADD A SECOND LANDMARK, e.g. distance from Koraput bus stand]',
   '+91 82494 20328', '918249420328',
   'https://www.google.com/maps/dir/?api=1&destination=18.8131623,82.7099606', 18.8131623, 82.7099606, 1),
  ('semiliguda', 'Semiliguda', 'ସେମିଳିଗୁଡ଼ା', '5.0★ (7 Google reviews)', 'Main Road · Sun evenings',
   'Main Road, Semiliguda, Odisha 764036',
   'On Main Road, Semiliguda. [ADD NEARBY LANDMARK]',
   '+91 81204 41939', '918120441939',
   'https://www.google.com/maps/dir/?api=1&destination=18.7038004,82.8570261', 18.7038004, 82.8570261, 2)
on conflict (slug) do nothing;

-- Koraput: every day 9:00 AM – 9:30 PM
insert into public.branch_hours (branch_id, weekday, opens, closes, slot_minutes)
select b.id, d, '09:00', '21:30', 30
  from public.branches b, generate_series(0, 6) d
 where b.slug = 'koraput'
on conflict (branch_id, weekday) do nothing;

-- Semiliguda: Mon–Sat 10:00 AM – 8:30 PM, Sunday 5:00 – 8:30 PM
insert into public.branch_hours (branch_id, weekday, opens, closes, slot_minutes)
select b.id, d, case when d = 0 then '17:00'::time else '10:00'::time end, '20:30', 30
  from public.branches b, generate_series(0, 6) d
 where b.slug = 'semiliguda'
on conflict (branch_id, weekday) do nothing;

insert into public.treatments (name, slug, blurb, icon, price_text, sort) values
  ('Check-up and X-ray', 'check-up-and-x-ray', 'We look at every tooth and take an X-ray if needed, so nothing is guessed.', 'ph-magnifying-glass', 'From Rs [PRICE]', 1),
  ('Root canal', 'root-canal', 'Clears infection from inside the tooth so you can keep it instead of removing it.', 'ph-tooth', 'From Rs [PRICE]', 2),
  ('Tooth extraction and wisdom tooth', 'tooth-extraction', 'When a tooth cannot be saved, we remove it carefully under local anaesthesia.', 'ph-first-aid-kit', 'From Rs [PRICE]', 3),
  ('Braces and aligners', 'braces-and-aligners', 'Metal, ceramic or clear aligners to straighten teeth. We explain which suits you.', 'ph-smiley', 'Price after check-up', 4),
  ('Fillings', 'fillings', 'The cavity is cleaned and filled with tooth-coloured material, usually in one visit.', 'ph-drop-half', 'From Rs [PRICE]', 5),
  ('Crowns and bridges', 'crowns-and-bridges', 'A cap to protect a weak tooth, or a bridge to replace a missing one.', 'ph-crown-simple', 'From Rs [PRICE]', 6),
  ('Dentures', 'dentures', 'Full or partial removable teeth, made and adjusted to fit your mouth.', 'ph-smiley-wink', 'From Rs [PRICE]', 7),
  ('Implants', 'implants', 'A fixed replacement for a missing tooth, placed in the jaw bone.', 'ph-anchor-simple', 'Price after check-up', 8),
  ('Cleaning and whitening', 'cleaning-and-whitening', 'Scaling removes hard deposits that brushing cannot. Whitening is optional.', 'ph-sparkle', 'From Rs [PRICE]', 9),
  ('Kids'' dentistry', 'kids-dentistry', 'Check-ups, fillings and fluoride for children, done slowly and at their pace.', 'ph-baby', 'From Rs [PRICE]', 10)
on conflict (slug) do nothing;

insert into public.settings (key, value) values
  ('emergency_number', '"[EMERGENCY NUMBER]"'),
  ('booking_fee_enabled', 'false'),
  ('booking_fee_amount', '0')
on conflict (key) do nothing;

insert into public.doctors (name, qualification, reg_no, schedule_text, focus, branch_ids, sort)
select v.name, v.qualification, v.reg_no, v.schedule_text, v.focus,
       array(select id from public.branches order by sort), v.sort
  from (values
    ('Dr Ch Kartik', '[QUALIFICATION]', '[REG. NO.]', '[BRANCH DAYS, e.g. Koraput Mon–Sat, Semiliguda Sun evening]', '[ONE LINE ON FOCUS, e.g. root canal treatment and extractions]', 1),
    ('Dr Vaishali [SURNAME]', '[QUALIFICATION]', '[REG. NO.]', '[BRANCH DAYS]', '[ONE LINE ON FOCUS, e.g. children''s dentistry and braces]', 2)
  ) as v(name, qualification, reg_no, schedule_text, focus, sort)
 where not exists (select 1 from public.doctors);

insert into public.reviews (author_initial, text, branch_id, sort)
select v.initial, v.text, (select id from public.branches where slug = v.branch), v.sort
  from (values
    ('[A.]', '[Paraphrase of a Google review — e.g. about a root canal and how it was explained]', 'koraput', 1),
    ('[S.]', '[Paraphrase of a Google review — e.g. about bringing a child for a check-up]', 'koraput', 2),
    ('[P.]', '[Paraphrase of a Google review — e.g. about an evening appointment after work]', 'semiliguda', 3),
    ('[R.]', '[Paraphrase of a Google review — e.g. about cost being told upfront]', 'koraput', 4)
  ) as v(initial, text, branch, sort)
 where not exists (select 1 from public.reviews);
