import { Sparkles } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatPHP } from '@/shared/utils/currency';
import { formatTimelineRange } from '@/shared/utils/timeline';
import type { Package } from '@/shared/types/package.types';

interface PackageCardProps {
  pkg: Package;
  isSelected?: boolean;
  onSelect: (pkg: Package) => void;
}

/** Package catalog card (design-system.md §3 package browser). Custom project renders as a distinct card. */
export function PackageCard({ pkg, isSelected, onSelect }: PackageCardProps) {
  const timeline = formatTimelineRange(pkg.estimated_timeline_min_days, pkg.estimated_timeline_max_days);

  return (
    <Card
      className={cn(
        'flex h-full flex-col transition-shadow',
        isSelected && 'ring-2 ring-primary',
      )}
    >
      {pkg.thumbnail_url && (
        <img src={pkg.thumbnail_url} alt="" className="aspect-video w-full object-cover" />
      )}
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{pkg.name}</CardTitle>
          {pkg.is_custom && (
            <Badge variant="primary">
              <Sparkles className="size-3" aria-hidden="true" />
              Custom
            </Badge>
          )}
        </div>
        {pkg.description && <CardDescription>{pkg.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-2xl font-bold text-foreground">
          {pkg.is_custom ? 'Custom pricing' : formatPHP(pkg.base_price)}
        </p>
        {timeline && <p className="text-sm text-muted-foreground">Estimated timeline: {timeline}</p>}

        {pkg.pages.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Included pages</p>
            <p className="mt-1 text-sm text-foreground">
              {pkg.pages.map((page) => page.name).join(', ')}
            </p>
          </div>
        )}

        {pkg.features.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Included features</p>
            <p className="mt-1 text-sm text-foreground">
              {pkg.features.map((feature) => feature.name).join(', ')}
            </p>
          </div>
        )}

        {pkg.is_custom && (
          <p className="text-sm text-muted-foreground">
            Tell us what you need — our team will prepare a tailored quotation for you.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => onSelect(pkg)}>
          {pkg.is_custom ? 'Request custom project' : 'Select this package'}
        </Button>
      </CardFooter>
    </Card>
  );
}
