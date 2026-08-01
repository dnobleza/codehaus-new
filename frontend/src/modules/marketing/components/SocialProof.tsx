import { Award, Clock, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Container } from './Container';
import { ScrollReveal } from './ScrollReveal';
import { Section } from './Section';
import { Testimonials } from './Testimonials';

const CLIENT_LOGOS = [
  'Nimbus Labs',
  'Vertex Agency',
  'Northwind Devs',
  'Pixelforge',
  'Ionic Works',
  'Fieldstone Studio',
];

interface Stat {
  icon: LucideIcon;
  value: string;
  label: string;
}

/**
 * These must not restate a metric the About section already claims — the two
 * bands used to disagree on the page ("50+ projects delivered" here against
 * "3,200+ projects delivered" in `About.tsx`). About owns the volume figures;
 * this band covers satisfaction, tenure, and responsiveness instead.
 *
 * The response-time figure restates the commitment the Contact section already
 * makes ("within one business day") rather than introducing a new claim.
 */
const STATS: Stat[] = [
  { icon: Users, value: '99%', label: 'Client satisfaction' },
  { icon: Award, value: '7+', label: 'Years of experience' },
  { icon: Clock, value: '< 1 day', label: 'Support response time' },
];

/**
 * Landing page social-proof band (design-system.md §7.14): a placeholder
 * client-logo row followed by three stat tiles. Testimonials live in the
 * sibling `Testimonials.tsx` component so each concern stays a small,
 * single-purpose file per the module's component-per-file convention.
 */
export function SocialProof() {
  return (
    <Section id="social-proof" className="bg-background">
      <Container>
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Trusted by software agencies of every size
          </p>
        </ScrollReveal>

        {/* Soft clay backing strip behind the logo row (§7.5). */}
        <ScrollReveal delay={0.1} className="clay-surface mt-8 px-6 py-6 sm:px-10">
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {/*
              Wordmark placeholders, not links — so they carry no hover
              response. A hover state on a non-interactive element promises a
              click that does not exist. (The previous `grayscale` also stripped
              `--muted-foreground`'s warm brown-gray back to a cold neutral,
              working against the palette rather than with it.)
            */}
            {CLIENT_LOGOS.map((name) => (
              <li
                key={name}
                className="text-base font-semibold tracking-tight text-muted-foreground/70"
              >
                {name}
              </li>
            ))}
          </ul>
        </ScrollReveal>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STATS.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.08}>
              <div className="glass-panel glass-clay clay-lift flex flex-col items-center gap-3 p-8 text-center">
                <span className="clay-surface flex size-12 items-center justify-center rounded-2xl bg-primary/70 text-foreground">
                  <stat.icon className="size-5" aria-hidden="true" />
                </span>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Container>

      <div className="mt-20">
        <Testimonials />
      </div>
    </Section>
  );
}
