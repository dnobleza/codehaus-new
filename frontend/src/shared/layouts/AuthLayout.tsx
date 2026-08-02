import { Link, Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import codehausLogo from '@/assets/dashboard.png';

/**
 * Decorative dot matrix, the small punctuation marks in the corners of the auth
 * page. Drawn with a repeating radial-gradient rather than an SVG asset so it
 * follows the clay palette token and costs no request.
 */
function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute size-24 opacity-40 [background-image:radial-gradient(color-mix(in_oklch,var(--color-primary),transparent_35%)_1.5px,transparent_1.5px)] [background-size:14px_14px] ${className ?? ''}`}
    />
  );
}

/**
 * Centered auth shell: the form card sits in the middle of the cream page with
 * the sculpted CodeHaus mark floating over its top edge and a reassurance chip
 * to its right.
 *
 * Layout is a 3-column grid whose outer columns are decorative and collapse
 * below `lg`: on a phone only the card column renders, so the composition never
 * competes with the form for space.
 *
 * The form card comes FIRST in the DOM so keyboard and screen-reader users
 * reach the heading and fields immediately; `lg:order-*` places the decoration
 * around it visually.
 */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Faint app-wide brand accent, same visual language as the marketing
          Hero but toned down for a form surface. Token-driven, so it follows
          the clay palette. */}
      <BrandGradientAccent className="inset-0 -z-20" />

      <DotGrid className="top-24 left-[6%] hidden lg:block" />
      <DotGrid className="right-[6%] bottom-24 hidden lg:block" />

      <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_minmax(0,26rem)_1fr]">
        {/* Form column — first in the DOM, centre column visually. */}
        <div className="relative order-1 mx-auto w-full max-w-[26rem] pt-10 lg:order-2 lg:col-start-2">
          {/*
            The mark floats half-off the card's top edge, so it is positioned
            against this wrapper (which carries the matching `pt-10`) rather
            than against the card itself — a child of the card would be clipped
            by its `overflow-hidden`.

            The sculpted 3D render (`dashboard.png`) replaces the flat SVG mark.
            The artwork is a wide frame with the mark centred in it and its own
            backdrop baked in, so the badge is a circular window: `object-cover`
            crops to the middle of the frame and `rounded-full` clips the
            leftover backdrop into a disc that reads as the badge's own surface.
          */}
          <Link
            to="/"
            aria-label="CodeHaus home"
            className="absolute top-0 left-1/2 z-10 block size-20 -translate-x-1/2 overflow-hidden rounded-full clay-depth transition-transform hover:scale-105"
          >
            <img
              src={codehausLogo}
              alt=""
              width={1536}
              height={1024}
              className="size-full object-cover"
            />
          </Link>

          {/* Frosted card with clay depth (design-system.md §7.20) — the accent
              wash above stays visible through it. */}
          <Card className="glass-panel glass-clay border-glass-border px-2 pt-12 pb-2">
            <Outlet />
          </Card>
        </div>

        {/* Reassurance chip — real content, so it stays readable and is not
            hidden from assistive tech. */}
        <div className="order-2 flex justify-center lg:col-start-3 lg:justify-start">
          <div className="flex max-w-[16rem] items-start gap-3 rounded-2xl bg-secondary/60 px-4 py-3 ring-1 ring-border/60">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-text" />
            <p className="text-sm text-muted-foreground">
              <span className="block font-semibold text-foreground">Your data is safe with us.</span>
              Secure. Reliable. Built for modern teams.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
