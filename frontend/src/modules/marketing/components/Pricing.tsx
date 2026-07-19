import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { cn } from '@/lib/utils';
import { ScrollReveal } from './ScrollReveal';

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
    <section id="pricing" className="relative bg-secondary/40 py-24 sm:py-32">
      <BrandGradientAccent
        intensity="whisper"
        layers={['radial']}
        className="inset-x-0 top-0 -z-10 h-[24rem]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary">
            Pricing
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Start free, upgrade when your agency grows. No hidden fees, cancel
            anytime.
          </p>
        </ScrollReveal>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {TIERS.map((tier, index) => (
            <ScrollReveal key={tier.name} delay={index * 0.08} className={tier.highlighted ? 'relative' : undefined}>
              {tier.highlighted && (
                <BrandGradientAccent
                  intensity="strong"
                  layers={['radial']}
                  className="-inset-4 -z-10 rounded-2xl"
                />
              )}
              <Card
                className={cn(
                  'h-full',
                  tier.highlighted
                    ? 'scale-100 ring-2 ring-primary shadow-xl lg:scale-105'
                    : 'border-transparent shadow-sm ring-1 ring-foreground/8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/15',
                )}
              >
                <CardHeader>
                  {tier.highlighted && (
                    <span className="mb-2 inline-flex w-fit items-center rounded-full bg-gradient-to-r from-primary to-primary-hover px-3 py-1 text-xs font-medium text-primary-foreground">
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
                <CardContent className="flex flex-col gap-6">
                  <ul className="flex flex-col gap-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    variant={tier.highlighted ? 'default' : 'outline'}
                    onClick={() => navigate('/register')}
                  >
                    Get started
                  </Button>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
