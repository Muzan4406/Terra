-- Additive migration for scheduled activity launches and immutable purchase
-- terms. Existing balances, investment states, and pending returns are not
-- changed; each historical purchase gets the product's current terms.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS activity_available_at timestamptz;

ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS product_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS activity_launch_version integer;

UPDATE public.user_products AS investment
SET product_snapshot = jsonb_build_object(
  'name', product.name,
  'level', product.level,
  'price', product.price,
  'dailyReturn', product.daily_return,
  'duration', product.duration,
  'totalReturn', product.total_return,
  'category', product.category,
  'imageUrl', product.image_url
)
FROM public.products AS product
WHERE investment.product_id = product.id
  AND investment.product_snapshot IS NULL;

UPDATE public.user_products AS investment
SET activity_launch_version = 1
WHERE investment.activity_launch_version IS NULL
  AND investment.assigned_by_admin = false
  AND investment.product_snapshot->>'category' = 'activities';

INSERT INTO public.platform_settings (key, value)
VALUES ('activityLaunchVersion', '1')
ON CONFLICT (key) DO NOTHING;