-- Seed the shared add-on catalog per the spec's "Additional Features"
-- section. Only four prices are given directly in the spec's worked example
-- (Client Dashboard ₱12,000, Admin Dashboard ₱18,000, Google Analytics
-- ₱2,500, Live Chat ₱4,000) -- everything else below is a placeholder price
-- for the Team Lead/product owner to adjust later via the admin UI. Pricing
-- tiers were inferred from the four given anchors:
--   ~₱2,000-2,500 : thin wrapper around an existing third-party embed/widget
--                   (Google Maps, Facebook Pixel; matches Google Analytics).
--   ~₱2,500-3,500 : small, mostly self-contained auth/notification unit
--                   (Login, Registration, Forgot Password, Email
--                   Verification, Email Notifications, PDF/Excel Export,
--                   Bank Transfer manual-proof flow -- matches this app's
--                   own payments.proof_of_payment_url pattern).
--   ~₱4,000-6,000 : feature with its own UI/state and real-time or
--                   gateway-integration complexity (matches Live Chat;
--                   Internal Messaging, SMS Notifications, GCash, Maya,
--                   Stripe, PayPal, Email Marketing, Dashboard Analytics).
--   ~₱8,000+      : multi-step / cross-cutting complexity (Role-Based
--                   Access Control touches every protected route; CRM
--                   Integration requires custom field mapping per provider).
--   Dashboards priced directly between/around the two given anchors
--   (Client ₱12,000, Admin ₱18,000): Staff Dashboard sits in between at
--   ₱15,000, reflecting more capability than a client view but less than
--   full admin control.
-- "Third-party APIs" is a deliberately generic catch-all bucket in the spec
-- (no specific integration named) -- priced at the upper end of the
-- moderate tier as a starting estimate, expected to be quoted per-integration
-- in practice.

INSERT INTO addons (category, name, price, display_order) VALUES
  -- Authentication
  ('authentication', 'Login', 3000.00, 10),
  ('authentication', 'Registration', 3000.00, 20),
  ('authentication', 'Forgot Password', 2000.00, 30),
  ('authentication', 'Email Verification', 2500.00, 40),
  ('authentication', 'Role-Based Access Control', 8000.00, 50),

  -- Dashboard
  ('dashboard', 'Client Dashboard', 12000.00, 10),
  ('dashboard', 'Admin Dashboard', 18000.00, 20),
  ('dashboard', 'Staff Dashboard', 15000.00, 30),

  -- Payments
  ('payments', 'GCash', 5000.00, 10),
  ('payments', 'Maya', 5000.00, 20),
  ('payments', 'Bank Transfer', 3000.00, 30),
  ('payments', 'Stripe', 6000.00, 40),
  ('payments', 'PayPal', 6000.00, 50),

  -- Reports
  ('reports', 'Dashboard Analytics', 6000.00, 10),
  ('reports', 'PDF Export', 3000.00, 20),
  ('reports', 'Excel Export', 3000.00, 30),

  -- Communication
  ('communication', 'Live Chat', 4000.00, 10),
  ('communication', 'Internal Messaging', 5000.00, 20),
  ('communication', 'Email Notifications', 2500.00, 30),
  ('communication', 'SMS Notifications', 3500.00, 40),

  -- Integrations
  ('integrations', 'Google Maps', 2000.00, 10),
  ('integrations', 'Google Analytics', 2500.00, 20),
  ('integrations', 'Facebook Pixel', 2000.00, 30),
  ('integrations', 'CRM Integration', 8000.00, 40),
  ('integrations', 'Email Marketing', 4000.00, 50),
  ('integrations', 'Third-party APIs', 5000.00, 60);
