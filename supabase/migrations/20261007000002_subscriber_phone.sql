-- Optional phone number and SMS marketing consent on a subscriber.
--
-- Nullable: the phone is optional in the popup, and a signup that gives only
-- an email is the normal case, not a partial record.
alter table email_subscribers
  add column if not exists phone text;

-- Consent is stored as a TIMESTAMP, not a boolean.
--
-- US SMS marketing (TCPA) requires proof of express written consent, and
-- "true" is not proof — what has to be defensible later is that THIS person
-- agreed at THIS moment. Null means never consented. A timestamp also makes
-- a withdrawal legible: clearing it records that consent no longer stands,
-- while the row itself stays for the email list.
alter table email_subscribers
  add column if not exists sms_consent_at timestamptz;

-- The exact wording the person agreed to, captured at signup.
--
-- Consent is to a specific disclosure, and that text will be reworded over
-- time; proving consent means showing what was on screen then, not what the
-- component renders today. Storing it per row is the only way that survives
-- a copy edit.
alter table email_subscribers
  add column if not exists sms_consent_text text;

-- A phone can be shared or mistyped into someone else's number, so unlike
-- email it is NOT unique and NOT an identity here: the email remains the
-- primary key and the thing that decides who gets a code.
create index if not exists email_subscribers_phone_idx
  on email_subscribers (phone)
  where phone is not null;
