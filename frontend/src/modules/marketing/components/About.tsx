import { Container } from './Container';
import { Eyebrow } from './Eyebrow';
import { ScrollReveal } from './ScrollReveal';
import { Section } from './Section';

const STATS = [
  { label: 'Agencies onboarded', value: '400+' },
  { label: 'Projects delivered', value: '3,200+' },
  { label: 'Invoiced through CodeHaus', value: '$18M+' },
];

export function About() {
  return (
    <Section id="about" className="bg-background">
      <Container className="grid grid-cols-1 gap-16 lg:grid-cols-2">
        <ScrollReveal>
          <Eyebrow className="mb-4">Our story</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built by people who ran software agencies
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            CodeHaus started as an internal tool for a three-person dev shop that was tired of
            juggling quotes in one app, invoices in another, and project updates over email. Today
            it's the workspace hundreds of agencies use to run client work end-to-end — without
            losing the craftsmanship that got them clients in the first place.
          </p>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            We obsess over the same thing our customers do: shipping quality work, on time, with
            clients who trust the process.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-1 lg:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="glass-panel glass-clay clay-lift p-6">
                <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                <dd className="mt-2 text-3xl font-bold text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
