import { FileText, FolderKanban, MessageSquare, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { ScrollReveal } from './ScrollReveal';

type PreviewKind = 'progress' | 'invoice' | 'chart' | 'chat';

interface Service {
  icon: LucideIcon;
  title: string;
  description: string;
  preview: PreviewKind;
}

const SERVICES: Service[] = [
  {
    icon: FolderKanban,
    title: 'Project delivery',
    description:
      'Track every engagement from kickoff to launch with milestones, statuses, and team assignments your clients can actually follow.',
    preview: 'progress',
  },
  {
    icon: FileText,
    title: 'Quotations',
    description:
      'Send polished, itemized quotes in minutes and let clients approve them online — no more back-and-forth over email.',
    preview: 'chart',
  },
  {
    icon: Receipt,
    title: 'Invoicing & payments',
    description:
      'Convert approved quotes into invoices automatically, track outstanding balances, and record payments in one place.',
    preview: 'invoice',
  },
  {
    icon: MessageSquare,
    title: 'Client collaboration',
    description:
      'Keep conversations tied to the project they belong to, with notifications that keep everyone — client and team — in the loop.',
    preview: 'chat',
  },
];

/**
 * Small mocked UI fragment rendered at the bottom of each Services card
 * (design-system.md §7.12 "feature mini-preview"). Purely decorative,
 * hand-rolled with existing tokens — no chart library involved.
 */
function FeatureMiniPreview({ kind }: { kind: PreviewKind }) {
  if (kind === 'progress') {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-secondary/60 p-3 clay-depth-press">
        {[
          { label: 'Storefront revamp', value: 80 },
          { label: 'Mobile app v2', value: 45 },
        ].map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate">{row.label}</span>
              <span>{row.value}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${row.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === 'chart') {
    const bars = [40, 65, 50, 85, 60];
    return (
      <div className="flex h-16 items-end gap-1.5 rounded-2xl bg-secondary/60 p-3 clay-depth-press">
        {bars.map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-primary to-accent/60"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    );
  }

  if (kind === 'invoice') {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-secondary/60 p-3 clay-depth-press">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-foreground">Invoice #1042</span>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-medium text-success">
            Paid
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Nimbus Labs</span>
          <span className="font-semibold text-foreground">$4,250.00</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-secondary/60 p-3 clay-depth-press">
      <div className="max-w-[80%] rounded-lg rounded-bl-sm bg-card px-2.5 py-1.5 text-[10px] text-foreground shadow-sm">
        Quote looks great, approving now.
      </div>
      <div className="ml-auto max-w-[80%] rounded-lg rounded-br-sm bg-primary/90 px-2.5 py-1.5 text-[10px] text-primary-foreground">
        Awesome — kicking off Monday.
      </div>
    </div>
  );
}

export function Services() {
  return (
    <section id="services" className="relative bg-background py-24 sm:py-32">
      <BrandGradientAccent
        intensity="whisper"
        layers={['linear', 'radial', 'grid']}
        className="inset-x-0 top-0 -z-10 h-[28rem]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/40 bg-primary/20 px-4 py-1.5 text-xs font-semibold text-foreground clay-depth-press">
            Platform
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything your agency needs, in one place
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            CodeHaus replaces the spreadsheets, email threads, and disconnected tools with one
            workspace built around how software agencies actually work.
          </p>
        </ScrollReveal>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, index) => (
            <ScrollReveal key={service.title} delay={index * 0.08}>
              {/* The blend the section is built on (§7.4): frosted glass fill
                  and border, clay depth beneath, gentle lift on hover. */}
              <Card className="glass-panel glass-clay clay-lift h-full border-glass-border p-2">
                <CardHeader>
                  {/* Clay puck: icon fill is one of the roles clay IS allowed
                      in — it carries no text, so its 2.10:1 ratio against the
                      page background doesn't apply (§7.20 contrast rules). */}
                  <div className="clay-surface mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/70 text-foreground">
                    <service.icon className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base font-semibold">{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                  <div className="mt-4">
                    <FeatureMiniPreview kind={service.preview} />
                  </div>
                </CardHeader>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
