import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { HeroBackgroundEffects } from './HeroBackgroundEffects';
import { ProductShowcase } from './ProductShowcase';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative z-10 overflow-x-clip bg-background">
      {/*
        Hero accent treatment: bounded gradient/glass panel behind the
        headline + showcase. Base page background stays Alice Blue
        (--background) everywhere — this decorative layer is intentionally
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

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 px-4 pt-20 pb-8 sm:px-6 sm:pt-28 sm:pb-12 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pt-32 lg:pb-16">
        {/* Left: copy + CTAs */}
        {/*
          Glassmorphic copy panel (§7.3): the headline block sits on a frosted
          card so the gradient wash and light-specks behind it stay visible
          through the text rather than being covered by a solid surface.
        */}
        <div className="glass-panel flex flex-col items-center gap-8 p-8 text-center sm:p-10 lg:items-start lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-primary/40 bg-primary/20 px-4 py-1.5 text-xs font-semibold text-foreground clay-depth-press"
          >
            Software delivery, without the guesswork
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-3xl text-5xl leading-[1.1] font-bold tracking-tight text-foreground sm:text-6xl sm:leading-[1.05]"
          >
            One workspace to quote, build, and bill every client project.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl text-lg leading-8 text-muted-foreground"
          >
            CodeHaus brings project delivery, quotations, invoicing, and client collaboration into a
            single, elegant platform — built for software agencies that want to look as good as the
            work they ship.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            {/* Claymorphic CTAs (§7.3): padding-heavy, fully rounded, moulded
                depth that spreads on hover and presses inward on click. */}
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="clay-surface clay-lift h-12 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary"
            >
              Get started free
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              // Clay border, not `--glass-border`: a white translucent border
              // on a cream surface is invisible. Glass fill, clay outline.
              className="glass-panel clay-lift h-12 rounded-full border-2 border-primary/60 px-8 text-base font-semibold text-foreground hover:bg-glass-bg"
            >
              Log in
            </Button>
          </motion.div>
        </div>

        {/* Right: premium product showcase — laptop mockup + floating widgets */}
        <ProductShowcase />
      </div>
    </section>
  );
}
