import { About } from './components/About';
import { Contact } from './components/Contact';
import { Hero } from './components/Hero';
import { Pricing } from './components/Pricing';
import { Services } from './components/Services';

/**
 * Single scrolling Apple-style landing page. Per explicit product direction
 * this supersedes the architecture doc's §3 route table (which lists
 * /pricing /about /contact as separate routes) — Services/Pricing/About/
 * Contact are sections within this one page, linked via the Navbar's anchor
 * links rather than routed pages.
 */
export function LandingPage() {
  return (
    <>
      <Hero />
      <Services />
      <Pricing />
      <About />
      <Contact />
    </>
  );
}

export default LandingPage;
