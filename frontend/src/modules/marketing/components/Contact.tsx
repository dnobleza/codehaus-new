import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { ScrollReveal } from './ScrollReveal';

/**
 * Clay field treatment (§7.20): pressed-in inset instead of a hard border.
 * Applied at these call sites rather than to the shared `Input`/textarea
 * primitives, which are used by app forms that must stay on the blue theme.
 */
const CLAY_FIELD_CLASS =
  'rounded-2xl border-transparent bg-secondary/50 px-4 py-3 shadow-[var(--clay-shadow-press)] hover:border-transparent';

/**
 * UI-only contact form per the brief — does not submit anywhere real yet.
 * Wire to a `contact` module/API when the backend exposes an endpoint.
 */
export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const messageId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    // `overflow-x-clip`: the decorative `-inset-6` accent below extends 24px
    // past the container on each side, which pushed the document 8px wider
    // than the viewport at 360px and produced a horizontal scrollbar.
    <section id="contact" className="overflow-x-clip bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/40 bg-primary/20 px-4 py-1.5 text-xs font-semibold text-foreground shadow-[var(--clay-shadow-press)]">
            Get in touch
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Let's talk
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Questions about CodeHaus? Send us a message and our team will get back to you within one
            business day.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="relative mt-10">
          <BrandGradientAccent
            intensity="subtle"
            layers={['radial']}
            className="-inset-6 -z-10 rounded-3xl"
          />
          <div className="glass-panel glass-clay p-6 sm:p-8">
            {submitted ? (
              <Alert
                variant="success"
                title="Message sent"
                description="Thanks for reaching out — we'll be in touch shortly."
              />
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Name"
                    name="name"
                    placeholder="Ada Lovelace"
                    required
                    className={cn('h-12', CLAY_FIELD_CLASS)}
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="ada@example.com"
                    required
                    className={cn('h-12', CLAY_FIELD_CLASS)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={messageId} className="text-sm font-medium text-foreground">
                    Message
                  </label>
                  <textarea
                    id={messageId}
                    name="message"
                    rows={4}
                    required
                    placeholder="Tell us about your team and what you're looking for."
                    className={cn(
                      'w-full border text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                      CLAY_FIELD_CLASS,
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="clay-surface clay-lift h-12 self-start rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary"
                >
                  Send message
                </Button>
              </form>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
