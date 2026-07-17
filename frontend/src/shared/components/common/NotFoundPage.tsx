import { Link } from 'react-router-dom';

import { buttonVariants } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you're looking for doesn't exist or may have moved.
      </p>
      {/* Base UI's Button explicitly disallows rendering <a> via its `render`
          prop (links have their own semantics) — style the Link directly
          with buttonVariants instead, per the Button component's own docs. */}
      <Link to="/" className={buttonVariants({ size: 'lg' })}>
        Back to home
      </Link>
    </div>
  );
}
