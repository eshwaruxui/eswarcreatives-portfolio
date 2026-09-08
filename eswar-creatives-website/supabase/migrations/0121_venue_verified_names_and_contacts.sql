-- 0121_venue_verified_names_and_contacts.sql
-- Build 2 fix pass, Fix 1: the venue seed used the old unverified names.
-- docs/Newgen_Venue_Directory.md (verified 8 Sept from Google Maps
-- listings) is the source of truth; the build prompt explicitly said NOT
-- to seed "Selvi Mahal" — two unrelated Chennai venues carry that exact
-- name and outrank the partner, so that spelling points a client at the
-- wrong business. The partner is Selvi Thirumana Mahal, Keelkattalai.
--
-- Renames happen IN PLACE (no drop/recreate): a quotation already
-- references CPM Royal Palace, and rows may acquire references at any
-- time. quotations.venue is free text by design, so historical
-- quotations keep whatever name they were issued under.
--
-- Illam is ONE Google listing with four halls; the four rows stay
-- (the hall determines the scope of work) and share one phone and
-- address.

alter table public.quotation_venues
  add column if not exists phone   text,
  add column if not exists address text;

update public.quotation_venues set name = v.new_name
from (values
  ('Selvi Mahal',                 'Selvi Thirumana Mahal'),
  ('Sri Venkatesh Mahal',         'Shree Venkatesh Mahal'),
  ('MKS Grand Palace',            'M.K.S Grand Palace'),
  ('NRP Mahal',                   'NRP MAHAL'),
  ('Illam Hospitality Priyam',    'Illam Hospitality, Priyam'),
  ('Illam Hospitality Varham',    'Illam Hospitality, Varham'),
  ('Illam Hospitality Shivam',    'Illam Hospitality, Shivam'),
  ('Illam Hospitality Amazonite', 'Illam Hospitality, Amazonite')
) as v(old_name, new_name)
where quotation_venues.name = v.old_name;

update public.quotation_venues set phone = v.phone, address = v.address
from (values
  ('Shree Venkatesh Mahal', null,
   '110/1 & 2, 200 Feet Radial Rd, Pallava Garden, Perumal Nagar Zamin, Pallavaram, Tambaram, Tamil Nadu 600129'),
  ('M.K.S Grand Palace', '097908 01015',
   '1/25, Veeramani Nagar, Kovilambakkam, Nanmangalam, Tamil Nadu 600129'),
  ('NRP MAHAL', '098844 42774',
   'No.1, near Himayam Matriculation School Peria, 513, Sunnambu Kolathur Main Rd, Kovilambakkam, Tambaram, Tamil Nadu 600129'),
  ('Selvi Thirumana Mahal', '099940 53832',
   'Ambedkar Main Rd, Perumal Nagar, Keelkattalai, Tambaram, Tamil Nadu 600117'),
  ('CPM Royal Palace', '086081 23222',
   '6/161A, Ottiambakkam Main Rd, Sithalapakkam, Sittalapakkam, Tamil Nadu 600131'),
  ('Illam Hospitality, Priyam', '098410 53871',
   'Kailash OMR, #132, Rajiv Gandhi Salai, OMR, Sholinganallur, Chennai, Tamil Nadu 600119'),
  ('Illam Hospitality, Varham', '098410 53871',
   'Kailash OMR, #132, Rajiv Gandhi Salai, OMR, Sholinganallur, Chennai, Tamil Nadu 600119'),
  ('Illam Hospitality, Shivam', '098410 53871',
   'Kailash OMR, #132, Rajiv Gandhi Salai, OMR, Sholinganallur, Chennai, Tamil Nadu 600119'),
  ('Illam Hospitality, Amazonite', '098410 53871',
   'Kailash OMR, #132, Rajiv Gandhi Salai, OMR, Sholinganallur, Chennai, Tamil Nadu 600119')
) as v(name, phone, address)
where quotation_venues.name = v.name;

notify pgrst, 'reload schema';
