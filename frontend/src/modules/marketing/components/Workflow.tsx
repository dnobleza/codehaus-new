import {
  CheckCircle2,
  CreditCard,
  FileCheck,
  FileText,
  FolderKanban,
  ListChecks,
  Receipt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { Container } from './Container';
import { Eyebrow } from './Eyebrow';
import { ScrollReveal } from './ScrollReveal';
import { Section } from './Section';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { icon: FileText, title: 'Quote', description: 'Send an itemized quote in minutes.' },
  { icon: FileCheck, title: 'Proposal', description: 'Client reviews and approves online.' },
  { icon: FolderKanban, title: 'Project', description: 'Kick off with milestones and scope.' },
  { icon: ListChecks, title: 'Task', description: 'Team tracks work to the finish line.' },
  { icon: Receipt, title: 'Invoice', description: 'Approved work becomes an invoice.' },
  { icon: CreditCard, title: 'Payment', description: 'Client pays securely, you get notified.' },
  { icon: CheckCircle2, title: 'Completed', description: 'Delivered, paid, and archived.' },
];

/**
 * Visual step-by-step workflow timeline (design-system.md §7.13): horizontal
 * with a connecting line on desktop, vertical on mobile. Each step fades /
 * slides in on scroll via the shared `ScrollReveal` wrapper.
 */
export function Workflow() {
  return (
    <Section id="workflow" className="bg-background">
      <BrandGradientAccent
        intensity="whisper"
        layers={['radial']}
        className="inset-x-0 top-1/2 -z-10 h-[24rem] -translate-y-1/2"
      />

      <Container>
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="mb-4">How it works</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From first quote to final payment
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Every engagement moves through the same clear pipeline — nothing falls through the
            cracks between teams or tools.
          </p>
        </ScrollReveal>

        {/*
          Both timelines render the reveal AS the `<li>` (`as="li"`) rather
          than wrapping one in a `motion.div`. An `<li>` that is not a direct
          child of its list is not a list item to a screen reader — the step
          count and ordering would be lost. For the same reason the decorative
          connector line lives outside the `<ol>`, in the positioning wrapper.
        */}

        {/* Desktop: horizontal timeline */}
        <div className="relative mt-20 hidden lg:block">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-6 h-px bg-gradient-to-r from-transparent via-border to-transparent"
          />
          <ol className="relative grid grid-cols-7 gap-4">
            {STEPS.map((step, index) => (
              <ScrollReveal
                key={step.title}
                as="li"
                delay={index * 0.07}
                className="flex flex-col items-center gap-3 text-center"
              >
                <span className="relative z-10 clay-surface flex size-12 items-center justify-center rounded-full bg-card text-foreground">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </ScrollReveal>
            ))}
          </ol>
        </div>

        {/* Mobile / tablet: vertical timeline */}
        <div className="relative mt-16 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute top-1 bottom-1 left-6 w-px bg-gradient-to-b from-transparent via-border to-transparent"
          />
          <ol className="relative flex flex-col gap-8">
            {STEPS.map((step, index) => (
              <ScrollReveal
                key={step.title}
                as="li"
                delay={index * 0.06}
                className="relative flex items-start gap-4"
              >
                <span className="clay-surface relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-foreground">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                {/* `pt-2.5` optically centers the two-line label block against
                    the 48px puck; mathematical centering sits it too low. */}
                <div className="pt-2.5">
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
