import { Quote } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { ScrollReveal } from './ScrollReveal';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'CodeHaus replaced four different tools for us. Quoting to invoicing now takes minutes, not days, and clients love the portal.',
    name: 'Sarah Chen',
    role: 'Founder, Nimbus Labs',
    initials: 'SC',
  },
  {
    quote:
      'Our clients finally see the same polish in our billing as they do in our product work. That alone has paid for itself.',
    name: 'Marcus Reyes',
    role: 'Studio Lead, Vertex Agency',
    initials: 'MR',
  },
  {
    quote:
      'The project-to-invoice pipeline is exactly how we already worked — CodeHaus just made it visible to the whole team.',
    name: 'Priya Nair',
    role: 'Operations Manager, Northwind Devs',
    initials: 'PN',
  },
];

/**
 * Testimonial cards for the landing page social-proof section
 * (design-system.md §7.14). Sibling of `SocialProof.tsx` — kept in its own
 * file since it's a distinct, reusable content block.
 */
export function Testimonials() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial, index) => (
          <ScrollReveal key={testimonial.name} delay={index * 0.08}>
            <Card className="glass-panel glass-clay clay-lift h-full border-glass-border p-2">
              <CardContent className="flex h-full flex-col gap-4">
                {/* Clay-toned quote mark — decorative glyph, not body text. */}
                <Quote className="size-7 text-primary" aria-hidden="true" />
                <p className="flex-1 text-sm leading-6 text-foreground">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3 border-t border-glass-border pt-4">
                  <span className="clay-surface flex size-10 items-center justify-center rounded-full bg-primary/70 text-xs font-semibold text-foreground">
                    {testimonial.initials}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
