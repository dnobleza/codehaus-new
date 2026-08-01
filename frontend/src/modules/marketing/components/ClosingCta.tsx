import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { GlowOrb } from '@/shared/components/common/GlowOrb';
import { Container } from './Container';
import { ScrollReveal } from './ScrollReveal';
import { Section } from './Section';

/**
 * Premium closing CTA band, shown right before the Footer
 * (design-system.md §7.15). Reuses the same glow/CTA-button language as
 * Hero/Navbar for visual consistency at the page's final conversion moment.
 */
export function ClosingCta() {
  const navigate = useNavigate();

  return (
    <Section className="overflow-hidden bg-background">
      <Container>
        {/*
          `--brand-ink` is a warm dark brown at `:root` (index.css), so this
          panel reads as deep clay rather than cold slate. The GlowOrbs below
          derive from the same tokens and re-tint for free.
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
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-brand-ink-foreground/70">
            Build faster with CodeHaus — one workspace for quotes, projects, invoices, and every
            client conversation in between.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="cta" size="cta" onClick={() => navigate('/register')}>
              Get started free
              <ArrowRight data-icon="inline-end" />
            </Button>
            {/* Not `cta-outline`: that variant's clay border and glass fill are
                tuned for the cream page background and disappear on this dark
                panel. Same footprint (`size="cta"`), inverted materials. */}
            {/* `nativeButton={false}`: this renders an anchor, and Base UI
                errors at runtime if it is not told the element is not a real
                <button>. */}
            <Button
              size="cta"
              variant="outline"
              nativeButton={false}
              render={<a href="#contact" />}
              className="clay-lift border-brand-ink-foreground/25 bg-brand-ink-foreground/10 font-semibold text-brand-ink-foreground backdrop-blur-md hover:bg-brand-ink-foreground/20 hover:text-brand-ink-foreground"
            >
              <Calendar data-icon="inline-start" />
              Book a demo
            </Button>
          </div>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
