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
        className="inset-x-0 top-0 -z-10 h-[38rem] rounded-b-[4rem] ring-1 ring-primary/8 sm:h-[42rem]"
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
        <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary"
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
            CodeHaus brings project delivery, quotations, invoicing, and client
            collaboration into a single, elegant platform — built for software
            agencies that want to look as good as the work they ship.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="px-6 shadow-[0_1px_2px_rgba(37,99,235,0.15),0_4px_12px_-2px_rgba(37,99,235,0.35)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_2px_4px_rgba(37,99,235,0.25),0_10px_28px_-4px_rgba(37,99,235,0.55)] active:scale-[0.99]"
            >
              Get started free
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="px-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md active:scale-[0.99]"
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
