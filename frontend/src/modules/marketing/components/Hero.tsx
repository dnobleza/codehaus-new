import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative overflow-hidden bg-background">
      {/*
        Hero accent treatment: bounded gradient/glass panel behind the
        headline + CTA only. Base page background stays Alice Blue
        (--background) everywhere — this decorative layer is intentionally
        scoped and does not extend across the full section.
      */}
      <BrandGradientAccent
        intensity="strong"
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

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8 lg:py-32">
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
            className="px-6 shadow-[0_1px_2px_rgba(37,99,235,0.15),0_4px_12px_-2px_rgba(37,99,235,0.35)] hover:shadow-[0_1px_2px_rgba(37,99,235,0.2),0_6px_16px_-2px_rgba(37,99,235,0.45)]"
          >
            Get started free
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="px-6">
            Log in
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-8 w-full max-w-5xl rounded-xl bg-card p-2 shadow-xl ring-1 ring-foreground/8"
        >
          <div className="flex h-72 w-full items-center justify-center rounded-lg bg-secondary text-sm text-muted-foreground sm:h-96">
            Product preview
          </div>
        </motion.div>
      </div>
    </section>
  );
}
