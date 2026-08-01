import { Award, FolderKanban, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ScrollReveal } from './ScrollReveal';
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

const STATS: Stat[] = [
  { icon: FolderKanban, value: '50+', label: 'Projects delivered' },
  { icon: Users, value: '99%', label: 'Client satisfaction' },
  { icon: Award, value: '7+', label: 'Years of experience' },
];

/**
 * Landing page social-proof band (design-system.md §7.14): a placeholder
 * client-logo row followed by three stat tiles. Testimonials live in the
 * sibling `Testimonials.tsx` component so each concern stays a small,
 * single-purpose file per the module's component-per-file convention.
 */
export function SocialProof() {
  return (
    <section id="social-proof" className="relative bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Trusted by software agencies of every size
          </p>
        </ScrollReveal>

        {/* Soft clay backing strip behind the logo row (§7.5). */}
        <ScrollReveal delay={0.1} className="clay-surface mt-8 px-6 py-6 sm:px-10">
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {CLIENT_LOGOS.map((name) => (
              <li
                key={name}
                className="text-base font-semibold tracking-tight text-muted-foreground/60 grayscale transition-all duration-300 hover:text-foreground hover:opacity-100 hover:grayscale-0"
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
      </div>

      <div className="mt-20">
        <Testimonials />
      </div>
    </section>
  );
}
