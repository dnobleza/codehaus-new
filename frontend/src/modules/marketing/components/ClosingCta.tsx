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
        <ScrollReveal className="relative overflow-hidden rounded-3xl bg-brand-ink px-6 py-16 text-center shadow-2xl sm:px-12 sm:py-20">
          <BrandGradientAccent
            intensity="strong"
            layers={['radial']}
            className="inset-0 -z-10 rounded-3xl"
          />
          <GlowOrb color="accent" className="-top-16 -left-16 size-64" />
          <GlowOrb color="primary" className="-right-16 -bottom-16 size-64" />

          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-brand-ink-foreground sm:text-4xl">
            Ready to scale your agency?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-ink-foreground/70">
            Build faster with CodeHaus — one workspace for quotes, projects,
            invoices, and every client conversation in between.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="px-6 shadow-[0_1px_2px_rgba(37,99,235,0.15),0_4px_12px_-2px_rgba(37,99,235,0.35)] hover:shadow-[0_1px_2px_rgba(37,99,235,0.2),0_6px_16px_-2px_rgba(37,99,235,0.45)]"
            >
              Get started free
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<a href="#contact" />}
              className="border-brand-ink-foreground/20 bg-transparent px-6 text-brand-ink-foreground hover:bg-brand-ink-foreground/10 hover:text-brand-ink-foreground"
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
