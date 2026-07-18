-- Seed the three default packages plus the "Custom Project" catch-all, with
-- their pages and features, per the product spec's package descriptions.
--
-- Pricing/timeline assumptions (only Business Website's ₱45,000 is given
-- directly in the spec's worked example; the other two are not priced in
-- the spec and are placeholders for the Team Lead/product owner to adjust
-- via the admin UI):
--   - Starter Website: ₱25,000. Chosen as roughly 55% of the Business
--     Website price, reflecting a smaller scope (6 pages vs 10, no
--     CMS/blog/SEO-analytics tier) and the shortest timeline (1-2 weeks).
--   - Business Website: ₱45,000. Given directly in the spec's worked
--     quotation example -- not an assumption.
--   - Corporate Website: ₱85,000. Chosen as roughly 1.9x the Business
--     Website price, reflecting more pages (12 vs 10), a longer timeline
--     (4-8 weeks vs 2-4), and materially more complex features (multi-user
--     CMS, search, performance optimization) than Business.
-- Timelines are converted to day ranges (7 days/week) so the columns stay
-- sortable/filterable per the brief: 1-2 weeks -> 7-14 days,
-- 2-4 weeks -> 14-28 days, 4-8 weeks -> 28-56 days.

INSERT INTO project_packages
  (id, name, slug, description, base_price, estimated_timeline_min_days, estimated_timeline_max_days, display_order, is_custom)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Starter Website', 'starter-website',
   'A lean, essential website for small businesses and individuals getting online for the first time.',
   25000.00, 7, 14, 10, false),
  ('11111111-1111-1111-1111-111111111102', 'Business Website', 'business-website',
   'A full-featured business website with blog/CMS and analytics for growing companies.',
   45000.00, 14, 28, 20, false),
  ('11111111-1111-1111-1111-111111111103', 'Corporate Website', 'corporate-website',
   'A large-scale corporate site with advanced content management, search, and multi-user publishing.',
   85000.00, 28, 56, 30, false),
  ('11111111-1111-1111-1111-111111111104', 'Custom Project', 'custom-project',
   'Tailored solution scoped individually with the client; pricing and timeline are determined during the quotation process.',
   NULL, NULL, NULL, 40, true);

-- Starter Website: pages
INSERT INTO package_pages (package_id, name, display_order) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Home', 10),
  ('11111111-1111-1111-1111-111111111101', 'About', 20),
  ('11111111-1111-1111-1111-111111111101', 'Services', 30),
  ('11111111-1111-1111-1111-111111111101', 'Gallery/Portfolio', 40),
  ('11111111-1111-1111-1111-111111111101', 'Testimonials', 50),
  ('11111111-1111-1111-1111-111111111101', 'Contact', 60);

-- Starter Website: features
INSERT INTO package_features (package_id, name, display_order) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Responsive Design', 10),
  ('11111111-1111-1111-1111-111111111101', 'Contact Form', 20),
  ('11111111-1111-1111-1111-111111111101', 'Google Maps', 30),
  ('11111111-1111-1111-1111-111111111101', 'Basic SEO', 40),
  ('11111111-1111-1111-1111-111111111101', 'SSL Ready', 50),
  ('11111111-1111-1111-1111-111111111101', 'Social Media Links', 60);

-- Business Website: pages
INSERT INTO package_pages (package_id, name, display_order) VALUES
  ('11111111-1111-1111-1111-111111111102', 'Home', 10),
  ('11111111-1111-1111-1111-111111111102', 'About', 20),
  ('11111111-1111-1111-1111-111111111102', 'Services', 30),
  ('11111111-1111-1111-1111-111111111102', 'Portfolio', 40),
  ('11111111-1111-1111-1111-111111111102', 'Pricing', 50),
  ('11111111-1111-1111-1111-111111111102', 'FAQ', 60),
  ('11111111-1111-1111-1111-111111111102', 'Blog', 70),
  ('11111111-1111-1111-1111-111111111102', 'Contact', 80),
  ('11111111-1111-1111-1111-111111111102', 'Privacy Policy', 90),
  ('11111111-1111-1111-1111-111111111102', 'Terms & Conditions', 100);

-- Business Website: features
INSERT INTO package_features (package_id, name, display_order) VALUES
  ('11111111-1111-1111-1111-111111111102', 'Responsive Design', 10),
  ('11111111-1111-1111-1111-111111111102', 'Contact Forms', 20),
  ('11111111-1111-1111-1111-111111111102', 'Blog Management', 30),
  ('11111111-1111-1111-1111-111111111102', 'CMS Integration', 40),
  ('11111111-1111-1111-1111-111111111102', 'SEO Optimization', 50),
  ('11111111-1111-1111-1111-111111111102', 'Google Analytics', 60),
  ('11111111-1111-1111-1111-111111111102', 'Social Media Integration', 70);

-- Corporate Website: pages
INSERT INTO package_pages (package_id, name, display_order) VALUES
  ('11111111-1111-1111-1111-111111111103', 'Home', 10),
  ('11111111-1111-1111-1111-111111111103', 'Company Profile', 20),
  ('11111111-1111-1111-1111-111111111103', 'Services', 30),
  ('11111111-1111-1111-1111-111111111103', 'Industries', 40),
  ('11111111-1111-1111-1111-111111111103', 'Case Studies', 50),
  ('11111111-1111-1111-1111-111111111103', 'Careers', 60),
  ('11111111-1111-1111-1111-111111111103', 'Blog', 70),
  ('11111111-1111-1111-1111-111111111103', 'Contact', 80),
  ('11111111-1111-1111-1111-111111111103', 'FAQ', 90),
  ('11111111-1111-1111-1111-111111111103', 'Privacy Policy', 100),
  ('11111111-1111-1111-1111-111111111103', 'Terms & Conditions', 110),
  ('11111111-1111-1111-1111-111111111103', 'Cookie Policy', 120);

-- Corporate Website: features
INSERT INTO package_features (package_id, name, display_order) VALUES
  ('11111111-1111-1111-1111-111111111103', 'Responsive Design', 10),
  ('11111111-1111-1111-1111-111111111103', 'CMS', 20),
  ('11111111-1111-1111-1111-111111111103', 'Advanced Forms', 30),
  ('11111111-1111-1111-1111-111111111103', 'Analytics', 40),
  ('11111111-1111-1111-1111-111111111103', 'Search Functionality', 50),
  ('11111111-1111-1111-1111-111111111103', 'Multi-user Content Management', 60),
  ('11111111-1111-1111-1111-111111111103', 'Performance Optimization', 70);
