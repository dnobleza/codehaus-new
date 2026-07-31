import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { GlowOrb } from '@/shared/components/common/GlowOrb';
import { ScrollReveal } from './ScrollReveal';

/**
 * Premium closing CTA band, shown right before the Footer
 * (design-system.md §7.15). Reuses the same glow/CTA-button language as
 * Hero/Navbar for visual consistency at the page's final conversion moment.
 */
export function ClosingCta() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/*
          `--brand-ink` is re-tinted to a warm dark brown inside `.theme-clay`
          (index.css), so this panel reads as deep clay rather than the cold
          slate it is app-wide. The GlowOrbs below re-tint for free.
        */}
        <ScrollReveal className="clay-surface relative overflow-hidden bg-brand-ink px-6 py-16 text-center sm:px-12 sm:py-20">
          <BrandGradientAccent
            intensity="strong"
            layers={['radial']}
            className="inset-0 -z-10 rounded-[1.75rem]"
          />
          <GlowOrb color="accent" className="-top-16 -left-16 size-64" />
          <GlowOrb color="primary" className="-right-16 -bottom-16 size-64" />

          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-brand-ink-foreground sm:text-4xl">
            Ready to scale your agency?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-ink-foreground/70">
            Build faster with CodeHaus — one workspace for quotes, projects, invoices, and every
            client conversation in between.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
              render={<a href="#contact" />}
              className="clay-lift h-12 rounded-full border-brand-ink-foreground/25 bg-brand-ink-foreground/10 px-8 text-base font-semibold text-brand-ink-foreground backdrop-blur-md hover:bg-brand-ink-foreground/20 hover:text-brand-ink-foreground"
            >
              <Calendar data-icon="inline-start" />
              Book a demo
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
