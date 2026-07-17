import { FileText, FolderKanban, MessageSquare, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollReveal } from './ScrollReveal';

interface Service {
  icon: LucideIcon;
  title: string;
  description: string;
}

const SERVICES: Service[] = [
  {
    icon: FolderKanban,
    title: 'Project delivery',
    description:
      'Track every engagement from kickoff to launch with milestones, statuses, and team assignments your clients can actually follow.',
  },
  {
    icon: FileText,
    title: 'Quotations',
    description:
      'Send polished, itemized quotes in minutes and let clients approve them online — no more back-and-forth over email.',
  },
  {
    icon: Receipt,
    title: 'Invoicing & payments',
    description:
      'Convert approved quotes into invoices automatically, track outstanding balances, and record payments in one place.',
  },
  {
    icon: MessageSquare,
    title: 'Client collaboration',
    description:
      'Keep conversations tied to the project they belong to, with notifications that keep everyone — client and team — in the loop.',
  },
];

export function Services() {
  return (
    <section id="services" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Everything your agency needs, in one place
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            CodeHaus replaces the spreadsheets, email threads, and disconnected
            tools with one workspace built around how software agencies
            actually work.
          </p>
        </ScrollReveal>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, index) => (
            <ScrollReveal key={service.title} delay={index * 0.08}>
              <Card className="h-full">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <service.icon className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base font-semibold">{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
