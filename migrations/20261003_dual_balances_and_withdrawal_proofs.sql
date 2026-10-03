-- Additive migration for separate deposit/withdrawal balances, product
-- categories, deferred product returns, and daily withdrawal-proof reviews.
--
-- Existing users.balance is intentionally preserved and is now treated as the
-- deposit balance. This migration does not move or delete existing balances.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS withdrawal_balance integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'fixed';

ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS pending_returns integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.withdrawal_proofs (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  submitted_day varchar(10) NOT NULL,
  website_image_data bytea NOT NULL,
  website_image_mime_type text NOT NULL,
  sms_image_data bytea NOT NULL,
  sms_image_mime_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  commission integer NOT NULL DEFAULT 0,
  admin_notes text,
  processed_by varchar(36) REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_proofs_user_day_unique
  ON public.withdrawal_proofs (user_id, submitted_day);