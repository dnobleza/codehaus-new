import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import heroPilandok from '@/assets/hero-pilandok.png';
import { Container } from './Container';
import { EYEBROW_CLASS } from './Eyebrow';
import { HeroBackgroundEffects } from './HeroBackgroundEffects';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative z-10 overflow-x-clip bg-background">
      {/*
        Hero accent treatment: bounded gradient/glass panel behind the
        headline + showcase. Base page background stays the warm cream
        `--background` everywhere — this decorative layer is intentionally
        scoped and does not extend across the full section. `overflow-x-clip`
        (not `overflow-hidden`) on the section lets the product showcase
        below intentionally bleed past the section's bottom edge into
        Services — see §7.11 of design-system.md.
      */}
      <BrandGradientAccent
        intensity="strong"
        layers={['linear', 'radial', 'stripe', 'grid']}
        className="inset-x-0 top-0 -z-10 h-[38rem] rounded-b-[4rem] ring-1 ring-glass-border sm:h-[42rem]"
      />
      {/*
        Bottom whisper fade: bleeds the Hero accent past its own rounded
        bottom edge so it blends into Services' top wash instead of cutting
        off abruptly.
      */}
      <BrandGradientAccent
        intensity="whisper"
        layers={['radial']}
        className="inset-x-0 -bottom-24 -z-10 h-48"
      />
      {/*
        Slow-drifting glow + sparse light-speck layer — extends the two
        accents above rather than replacing them. See §7.19.
      */}
      <HeroBackgroundEffects />

      {/* The mascot column is deliberately wider than the copy column
          (`1fr` vs `1.35fr`): the illustration is the hero's centerpiece, and
          an even 50/50 split left it reading as a sidebar next to the
          headline. `minmax(0,...)` on both tracks so a long unbroken word in
          the copy can't blow the grid out past the container. */}
      {/*
        `pt-36 sm:pt-44 lg:pt-48`: the header is now `fixed` and overlays the
        Hero instead of pushing it down (see Navbar.tsx), so the Hero's own
        top padding is the only thing keeping its content clear of the bar.
        Bumped by the header's ~4rem height over the previous `pt-20/28/32`
        so the copy lands the same visual distance from the viewport top as
        it did when the header still occupied its own flow row.
      */}
      <Container className="grid grid-cols-1 items-center gap-4 pt-36 pb-8 sm:pt-44 sm:pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-8 lg:pt-48 lg:pb-16">
        {/* Left: copy + CTAs */}
        {/*
          No panel behind the copy — the type sits directly on the gradient
          wash, the same way the header is transparent over the hero. The
          frosted card that used to be here boxed the headline in and put a
          hard edge through the middle of the composition; without it the wash
          and the light-specks read as one continuous surface behind both the
          words and the mascot.

          Contrast is unaffected: `--foreground` (#2a2a2a) and
          `--muted-foreground` (#6b5d4f) were already being read against this
          same wash through the panel's 0.55-alpha fill.

          `order-2 lg:order-1`: on a phone the mascot leads and the copy
          follows. Stacked in source order the headline alone filled the whole
          first viewport and pushed the image roughly a screen and a half down,
          so the thing meant to greet a visitor was the one thing they never
          saw. On desktop the two sit side by side and source order is restored.
        */}
        <div className="order-2 flex flex-col items-center gap-8 py-4 text-center lg:order-1 lg:items-start lg:py-8 lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={EYEBROW_CLASS}
          >
            Software delivery, without the guesswork
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            // 4xl on the smallest screens: at 5xl this ran seven lines on a
            // 390px viewport and owned the entire fold on its own.
            className="max-w-3xl text-4xl leading-[1.12] font-bold tracking-tight text-foreground sm:text-5xl sm:leading-[1.1] lg:text-6xl lg:leading-[1.05]"
          >
            One workspace to quote, build, and bill every client project.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl text-lg leading-8 text-muted-foreground"
          >
            CodeHaus is the one workspace where software agencies quote, build, and bill every
            client project — with transparent, instant pricing clients can see before work begins.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            {/* Claymorphic CTAs (§7.3): padding-heavy, fully rounded, moulded
                depth that spreads on hover and presses inward on click. */}
            <Button variant="cta" size="cta" onClick={() => navigate('/register')}>
              Get started free
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="cta-outline" size="cta" onClick={() => navigate('/login')}>
              Log in
            </Button>
          </motion.div>
        </div>

        {/* Right: mascot illustration — the hero's centerpiece. Purely
            decorative (no informational content beyond the surrounding copy),
            so it takes an empty alt. `fetchPriority="high"` + `loading="eager"`
            because this is the largest above-the-fold element and the likely
            LCP candidate; width/height reserve its 1536x1024 aspect ratio to
            prevent layout shift while the (currently unoptimized — see
            asset-size note in the PR) file downloads. */}
        {/* `lg:-mr-*`: the illustration runs past the container's right gutter
            toward the viewport edge, which buys it real width without stealing
            any from the copy. Safe because the section is `overflow-x-clip`, so
            the bleed is clipped rather than producing a horizontal scrollbar. */}
        <div className="order-1 flex items-center justify-center lg:order-2 lg:-mr-12 xl:-mr-24">
          <img
            src={heroPilandok}
            alt=""
            width={1536}
            height={1024}
            fetchPriority="high"
            loading="eager"
            /* Turned slightly to face right: the plane rotates about its own
               Y axis so its left edge recedes and the surface angles outward,
               toward the right of the page. Not a horizontal flip -- the
               artwork is mostly a dashboard full of readable labels, and
               mirroring reverses every one of them. A rotation keeps all the
               text the right way round.

               Only from `lg` up: below that the illustration stacks above
               centred copy, where a perspective turn has nothing to angle away
               from and just reads as a rendering error. */
            className="w-full max-w-xl sm:max-w-2xl lg:max-w-none lg:[transform:perspective(1400px)_rotateY(-10deg)]"
          />
        </div>
      </Container>
    </section>
  );
}
