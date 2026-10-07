-- Email capture from the homepage popup, and the welcome code each signup got.
--
-- The email is the PRIMARY KEY rather than a uuid with a unique index on
-- email. The address IS the identity here: there is no concept of two
-- subscriber rows for one address, and making that unrepresentable at the
-- database level is what stops the popup from minting a second 15%-off code
-- for someone who submits twice. Serverless makes that guarantee matter:
-- application-level "have I seen this email?" checks race across instances,
-- but a primary key conflict cannot.
--
-- Addresses are stored lowercased and trimmed by the caller, so
-- `Greg@X.com` and `greg@x.com` collide as the same subscriber rather than
-- earning two codes.
create table if not exists email_subscribers (
  email text primary key,
  -- The unique, single-use promotion code minted for this person. Kept so
  -- a repeat submit can show them the SAME code again instead of silently
  -- failing or issuing another one — the popup's "you already signed up"
  -- path needs something to show.
  discount_code text,
  -- Where they signed up from. One value today ('popup'), but recording it
  -- now means a future footer form or checkout opt-in does not require a
  -- migration to tell the sources apart.
  source text not null default 'popup',
  created_at timestamptz not null default now()
);

create index if not exists email_subscribers_created_at_idx
  on email_subscribers (created_at desc);

-- Same trust model as orders/products/site_settings: the anon key is public,
-- so every read and write goes through the service-role client, which
-- bypasses RLS. This denies anon/authenticated entirely — important here
-- because the table is a marketing list, and a readable one would be a
-- scrapeable list of customer email addresses.
alter table email_subscribers enable row level security;
alter table email_subscribers force row level security;

-- Popup on/off, on the existing settings singleton.
--
-- Default FALSE so deploying this does not put a popup in front of
-- customers before Greg has looked at it.
alter table site_settings
  add column if not exists email_popup_enabled boolean not null default false;
