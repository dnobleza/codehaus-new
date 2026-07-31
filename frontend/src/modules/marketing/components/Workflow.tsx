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
import { ScrollReveal } from './ScrollReveal';

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
    <section id="workflow" className="relative bg-background py-24 sm:py-32">
      <BrandGradientAccent
        intensity="whisper"
        layers={['radial']}
        className="inset-x-0 top-1/2 -z-10 h-[24rem] -translate-y-1/2"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary">
            How it works
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From first quote to final payment
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Every engagement moves through the same clear pipeline — nothing
            falls through the cracks between teams or tools.
          </p>
        </ScrollReveal>

        {/* Desktop: horizontal timeline */}
        <div className="relative mt-20 hidden lg:block">
          <div className="absolute inset-x-0 top-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <ol className="relative grid grid-cols-7 gap-4">
            {STEPS.map((step, index) => (
              <ScrollReveal key={step.title} delay={index * 0.07}>
                <li className="flex flex-col items-center gap-3 text-center">
                  <span className="relative z-10 flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-md ring-1 ring-foreground/8">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </li>
              </ScrollReveal>
            ))}
          </ol>
        </div>

        {/* Mobile / tablet: vertical timeline */}
        <ol className="relative mt-16 flex flex-col gap-8 lg:hidden">
          <div className="absolute top-1 bottom-1 left-6 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          {STEPS.map((step, index) => (
            <ScrollReveal key={step.title} delay={index * 0.06}>
              <li className="relative flex items-start gap-4 pl-0">
                <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-md ring-1 ring-foreground/8">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="pt-2.5 text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </li>
            </ScrollReveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
