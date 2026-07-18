import type { ReactNode } from 'react';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPHP } from '@/shared/utils/currency';

export interface QuotationLineItem {
  label: string;
  amount: number;
}

interface QuotationSummaryCardProps {
  packageLabel: string;
  basePrice: number;
  addonLines: QuotationLineItem[];
  total: number;
  timelineLabel?: string | null;
  quotationNumber?: string;
  footer?: ReactNode;
}

/**
 * Itemized quotation breakdown reproducing the product spec's worked
 * example layout exactly (base package line, each add-on as its own line,
 * estimated timeline, bold total). Reused for both the live client-side
 * calculator (task brief step 4, computed from the currently-checked
 * add-ons before submission) and the persisted, server-confirmed quotation
 * shown on the project detail page once `sent` — one component, one visual
 * source of truth for both.
 */
export function QuotationSummaryCard({
  packageLabel,
  basePrice,
  addonLines,
  total,
  timelineLabel,
  quotationNumber,
  footer,
}: QuotationSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Quotation</CardTitle>
          {quotationNumber && (
            <span className="text-sm font-medium text-muted-foreground">{quotationNumber}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">Base Package: {packageLabel}</span>
          <span className="font-medium text-foreground">{formatPHP(basePrice)}</span>
        </div>

        {addonLines.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground">Additional Features</p>
            {addonLines.map((line) => (
              <div key={line.label} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{line.label}</span>
                <span className="font-medium text-foreground">{formatPHP(line.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {timelineLabel && (
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Estimated Timeline</span>
            <span className="font-medium text-foreground">{timelineLabel}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-base font-semibold text-foreground">Total</span>
          <span className="text-xl font-bold text-foreground">{formatPHP(total)}</span>
        </div>
      </CardContent>
      {footer && <CardFooter className="justify-end gap-2">{footer}</CardFooter>}
    </Card>
  );
}
