-- supabase/migrations/20260915_002_seed_programs.sql
-- Seed popular loyalty programs catalog

INSERT INTO public.loyalty_programs (
  name, category, logo_initial, accent_color, default_expiry_months, 
  point_value_inr, seller_domain, email_parser_enabled, sms_detector_enabled
) VALUES
-- ─── Airlines ─────────────────────────────────────────────────
('InterMiles Airline', 'airlines', '✈️', '#01A2FB', 18, 0.25, 'intermiles.com', TRUE, FALSE),
('Air India Flying Returns', 'airlines', '🇮🇳', '#E31837', 24, 0.45, 'airindia.com', TRUE, FALSE),
('Club Vistara', 'airlines', '💜', '#5B1C56', 36, 0.60, 'vistara.com', TRUE, FALSE),
('IndiGo 6E Rewards', 'airlines', '💙', '#00529B', 24, 0.35, '6e-airlines.com', TRUE, FALSE),
-- ─── Hotels ───────────────────────────────────────────────────
('Marriott Bonvoy', 'hotels', '🏨', '#9C4EBD', 24, 0.70, 'marriott.com', TRUE, FALSE),
('Hilton Honors', 'hotels', '💎', '#002B49', 24, 0.40, 'hilton.com', TRUE, FALSE),
('Taj Epicure', 'hotels', '👑', '#B38F48', 12, 1.00, 'tajhotels.com', TRUE, FALSE),
('Accor Live Limitless', 'hotels', '🌟', '#122A4E', 12, 1.80, 'accor.com', TRUE, FALSE),
-- ─── Banking & Cards ────────────────────────────────────────
('HDFC Regalia Points', 'banking', '💳', '#004C8F', 24, 1.00, 'hdfcbank.com', TRUE, TRUE),
('SBI Card Reward Points', 'banking', '🔵', '#280071', 24, 0.25, 'sbicard.com', TRUE, TRUE),
('ICICI i-Points', 'banking', '🟠', '#B32800', 36, 0.25, 'icicibank.com', TRUE, TRUE),
('Axis EDGE REWARDS', 'banking', '🔴', '#97144D', 36, 0.20, 'axisbank.com', TRUE, TRUE),
('Amex Membership Rewards', 'banking', '🟦', '#0077A6', 0, 0.50, 'americanexpress.in', TRUE, FALSE),
-- ─── Shopping & Retail ──────────────────────────────────────
('Flipkart SuperCoins', 'shopping', '🛍️', '#2874F0', 12, 1.00, 'flipkart.com', TRUE, TRUE),
('Amazon Pay Rewards', 'shopping', '📦', '#FF9900', 12, 1.00, 'amazon.in', TRUE, FALSE),
('Reliance R-One', 'shopping', '🛒', '#E21836', 12, 0.35, 'reliancerewards.com', TRUE, FALSE),
-- ─── Food & Dining ──────────────────────────────────────────
('Swiggy One Points', 'food_delivery', '🛵', '#FC8019', 6, 1.00, 'swiggy.com', TRUE, TRUE),
('Zomato Gold', 'dining', '🍽️', '#CB202D', 6, 1.00, 'zomato.com', TRUE, TRUE),
('Dominos Payback', 'dining', '🍕', '#0072BC', 12, 0.50, 'dominos.com', TRUE, TRUE),
-- ─── Fuel ────────────────────────────────────────────────────
('IndianOil XTRAREWARDS', 'fuel', '⛽', '#EE1C25', 12, 0.30, 'indianoil.in', TRUE, FALSE),
('BPCL SmartDrive', 'fuel', '🚗', '#FDB813', 12, 0.30, 'bpcl.co.in', TRUE, FALSE),
-- ─── Entertainment ──────────────────────────────────────────
('BookMyShow Rewards', 'entertainment', '🎬', '#EC1C24', 12, 1.00, 'bookmyshow.com', TRUE, TRUE),
-- ─── Health & Telecom ───────────────────────────────────────
('Cult.fit FitCoins', 'health', '💪', '#FF3269', 12, 0.50, 'cult.fit', TRUE, TRUE),
('Airtel Thanks', 'telecom', '📶', '#E40000', 12, 0.25, 'airtel.in', TRUE, TRUE),
('Jio Rewards', 'telecom', '🔴', '#FDB813', 12, 0.25, 'jio.com', TRUE, TRUE)
ON CONFLICT (name, category) DO NOTHING;

-- Verify seed
SELECT COUNT(*) as programs_seeded FROM public.loyalty_programs;
