import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <section id="contact" className="bg-secondary/40 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Let's talk</h2>
          <p className="mt-4 text-base text-muted-foreground">
            Questions about CodeHaus? Send us a message and our team will get
            back to you within one business day.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="mt-10">
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
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
