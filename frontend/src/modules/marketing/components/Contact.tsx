import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { ScrollReveal } from './ScrollReveal';

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
    <section id="contact" className="bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary">
            Get in touch
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Let's talk</h2>
          <p className="mt-4 text-base text-muted-foreground">
            Questions about CodeHaus? Send us a message and our team will get
            back to you within one business day.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="relative mt-10">
          <BrandGradientAccent
            intensity="subtle"
            layers={['radial']}
            className="-inset-6 -z-10 rounded-3xl"
          />
          <div className="rounded-xl bg-card/95 p-6 shadow-md ring-1 ring-foreground/8 backdrop-blur-sm sm:p-8">
            {submitted ? (
              <Alert
                variant="success"
                title="Message sent"
                description="Thanks for reaching out — we'll be in touch shortly."
              />
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Name" name="name" placeholder="Ada Lovelace" required />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="ada@example.com"
                    required
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
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <Button type="submit" size="lg" className="self-start px-6">
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
