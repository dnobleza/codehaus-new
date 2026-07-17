import { ScrollReveal } from './ScrollReveal';

const STATS = [
  { label: 'Agencies onboarded', value: '400+' },
  { label: 'Projects delivered', value: '3,200+' },
  { label: 'Invoiced through CodeHaus', value: '$18M+' },
];

export function About() {
  return (
    <section id="about" className="bg-background py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <ScrollReveal>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Built by people who ran software agencies
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            CodeHaus started as an internal tool for a three-person dev shop
            that was tired of juggling quotes in one app, invoices in another,
            and project updates over email. Today it's the workspace hundreds
            of agencies use to run client work end-to-end — without losing the
            craftsmanship that got them clients in the first place.
          </p>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            We obsess over the same thing our customers do: shipping quality
            work, on time, with clients who trust the process.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-1 lg:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-secondary/60 p-6">
                <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                <dd className="mt-2 text-3xl font-bold text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </ScrollReveal>
      </div>
    </section>
  );
}
