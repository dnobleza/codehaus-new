import { ScrollReveal } from './ScrollReveal';

const STATS = [
  { label: 'Agencies onboarded', value: '400+' },
  { label: 'Projects delivered', value: '3,200+' },
  { label: 'Invoiced through CodeHaus', value: '$18M+' },
];

export function About() {
  return (
    <section id="about" className="bg-background py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <ScrollReveal>
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary">
            Our story
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built by people who ran software agencies
          </h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            CodeHaus started as an internal tool for a three-person dev shop
            that was tired of juggling quotes in one app, invoices in another,
            and project updates over email. Today it's the workspace hundreds
            of agencies use to run client work end-to-end — without losing the
            craftsmanship that got them clients in the first place.
          </p>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            We obsess over the same thing our customers do: shipping quality
            work, on time, with clients who trust the process.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-1 lg:gap-8">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-card/70 p-6 shadow-sm ring-1 ring-foreground/8 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:ring-primary/15"
              >
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
