import { About } from './components/About';
import { ClosingCta } from './components/ClosingCta';
import { Contact } from './components/Contact';
import { Hero } from './components/Hero';
import { Pricing } from './components/Pricing';
import { Services } from './components/Services';
import { SocialProof } from './components/SocialProof';
import { Workflow } from './components/Workflow';

/**
 * Single scrolling Apple-style landing page. Per explicit product direction
 * this supersedes the architecture doc's §3 route table (which lists
 * /pricing /about /contact as separate routes) — Services/Pricing/About/
 * Contact are sections within this one page, linked via the Navbar's anchor
 * links rather than routed pages.
 *
 * Section order (design-system.md §7.11): Hero → Services → Workflow →
 * SocialProof (logos, stats, testimonials) → Pricing → ClosingCta →
 * About → Contact, so the page builds trust and momentum before the
 * pricing ask, and closes with a dedicated conversion moment ahead of the
 * lower-intent About/Contact sections and the Footer.
 */
export function LandingPage() {
  return (
    <>
      <Hero />
      <Services />
      <Workflow />
      <SocialProof />
      <Pricing />
      <ClosingCta />
      <About />
      <Contact />
    </>
  );
}

export default LandingPage;
