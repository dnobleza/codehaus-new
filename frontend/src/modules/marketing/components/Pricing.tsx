import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { cn } from '@/lib/utils';
import { Container } from './Container';
import { Eyebrow } from './Eyebrow';
import { ScrollReveal } from './ScrollReveal';
import { Section } from './Section';

interface Tier {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    price: '$0',
    cadence: '/month',
    description: 'For freelancers getting their first clients organized.',
    features: [
      'Up to 3 active projects',
      'Unlimited quotations',
      'Basic invoicing',
      'Email support',
    ],
  },
  {
    name: 'Studio',
    price: '$49',
    cadence: '/month',
    description: 'For small agencies running multiple client engagements.',
    features: [
      'Unlimited projects',
      'Quotations & invoicing',
      'Client collaboration portal',
      'Payment tracking',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Agency',
    price: '$149',
    cadence: '/month',
    description: 'For growing teams that need reporting and role management.',
    features: [
      'Everything in Studio',
      'Team & role management',
      'Advanced reports & analytics',
      'Dedicated account manager',
    ],
  },
];

export function Pricing() {
  const navigate = useNavigate();

  return (
    <Section id="pricing" className="bg-secondary/40">
      <BrandGradientAccent
        intensity="whisper"
        layers={['radial']}
        className="inset-x-0 top-0 -z-10 h-[24rem]"
      />

      <Container>
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="mb-4">Pricing</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Start free, upgrade when your agency grows. No hidden fees, cancel anytime.
          </p>
        </ScrollReveal>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {TIERS.map((tier, index) => (
            <ScrollReveal
              key={tier.name}
              delay={index * 0.08}
              className={tier.highlighted ? 'relative' : undefined}
            >
              {tier.highlighted && (
                <BrandGradientAccent
                  intensity="strong"
                  layers={['radial']}
                  className="-inset-4 -z-10 rounded-2xl"
                />
              )}
              <Card
                className={cn(
                  'glass-panel clay-lift h-full border-glass-border p-2',
                  // The featured tier earns its emphasis from the deepest clay
                  // shadow rather than a colored ring (§7.6) — depth is this
                  // palette's hierarchy tool, not saturation. It rests at the
                  // hover elevation the other tiers only reach on hover, and
                  // still takes `clay-lift` so the page's most important card
                  // is not the one card that ignores the pointer.
                  tier.highlighted ? 'scale-100 clay-depth-hover lg:scale-105' : 'glass-clay',
                )}
              >
                <CardHeader>
                  {tier.highlighted && (
                    <span className="clay-surface mb-2 inline-flex w-fit items-center rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                      Most popular
                    </span>
                  )}
                  <CardTitle className="text-lg font-semibold">{tier.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                    <span className="text-sm text-muted-foreground">{tier.cadence}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </CardHeader>
                {/* `flex-1` + `mt-auto` on the button: tiers have different
                    feature counts, so without this the shorter cards leave
                    dead space under a CTA floating mid-card. */}
                <CardContent className="flex flex-1 flex-col gap-6">
                  <ul className="flex flex-col gap-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-primary-text"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="cta"
                    variant={tier.highlighted ? 'cta' : 'cta-outline'}
                    className="mt-auto"
                    onClick={() => navigate('/register')}
                  >
                    Get started
                  </Button>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
