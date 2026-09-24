-- supabase/migrations/20260915_004_security_and_slugs.sql
-- P0/P1 remediation:
--   1. Dedicated IV/tag columns for the encrypted Gmail refresh token. Previously
--      only the access token's IV/tag were persisted, so refresh-token decrypts
--      failed after ~1h and the sync died.
--      NOTE: refresh tokens encrypted before this migration used a per-token IV
--      that was never saved and are unrecoverable — reconnect Gmail once.
--   2. Canonical `slug` column on loyalty_programs. SMS rules and the mobile
--      catalog use stable string slugs; the DB uses random UUIDs. The two never
--      matched, so SMS detection 500'd and frontend account mapping always fell
--      back to a generic stub.

ALTER TABLE public.email_sync_accounts
  ADD COLUMN IF NOT EXISTS refresh_encryption_iv TEXT,
  ADD COLUMN IF NOT EXISTS refresh_encryption_tag TEXT;

ALTER TABLE public.loyalty_programs
  ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.loyalty_programs SET slug = CASE name
  -- Airlines
  WHEN 'InterMiles Airline'            THEN 'intermills'
  WHEN 'Air India Flying Returns'      THEN 'air_india'
  WHEN 'Club Vistara'                  THEN 'club_vistara'
  WHEN 'IndiGo 6E Rewards'             THEN 'indigo_6e'
  -- Hotels
  WHEN 'Marriott Bonvoy'               THEN 'marriott_bonvoy'
  WHEN 'Hilton Honors'                 THEN 'hilton_honors'
  WHEN 'Taj Epicure'                   THEN 'taj_epicure'
  WHEN 'Accor Live Limitless'          THEN 'accor_live_limitless'
  -- Banking & Cards
  WHEN 'HDFC Regalia Points'           THEN 'hdfc_mycards'
  WHEN 'SBI Card Reward Points'        THEN 'sbi_rewardz'
  WHEN 'ICICI i-Points'                THEN 'icici_rewards'
  WHEN 'Axis EDGE REWARDS'             THEN 'axis_edge'
  WHEN 'Amex Membership Rewards'       THEN 'amex_mr'
  -- Shopping & Retail
  WHEN 'Flipkart SuperCoins'           THEN 'flipkart_supercoins'
  WHEN 'Amazon Pay Rewards'            THEN 'amazon_pay_rewards'
  WHEN 'Reliance R-One'                THEN 'reliance_rone'
  -- Food & Dining
  WHEN 'Swiggy One Points'             THEN 'swiggy_one'
  WHEN 'Zomato Gold'                   THEN 'zomato_gold'
  WHEN 'Dominos Payback'               THEN 'dominos_payback'
  -- Fuel
  WHEN 'IndianOil XTRAREWARDS'         THEN 'indianoil_xtra'
  WHEN 'BPCL SmartDrive'               THEN 'bpcl_smartdrive'
  -- Entertainment
  WHEN 'BookMyShow Rewards'            THEN 'bookmyshow'
  -- Health & Telecom
  WHEN 'Cult.fit FitCoins'             THEN 'cult_fit'
  WHEN 'Airtel Thanks'                 THEN 'airtel_thanks'
  WHEN 'Jio Rewards'                   THEN 'jio_rewards'
  ELSE NULL
END
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_programs_slug_key
  ON public.loyalty_programs (slug);

-- Verify
SELECT COUNT(*) AS programs_with_slug FROM public.loyalty_programs WHERE slug IS NOT NULL;