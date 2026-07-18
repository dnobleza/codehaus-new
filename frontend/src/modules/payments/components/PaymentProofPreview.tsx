import { FileText, ImageOff, Loader2 } from 'lucide-react';

import { useProofImageUrl } from '../api/payments.queries';

interface PaymentProofPreviewProps {
  proofUrl: string | null;
}

/**
 * Renders the authenticated proof-of-payment file. Fetches it as a blob via
 * `useProofImageUrl` (an `<img src>` can't carry the `Authorization` header
 * the proof route requires) and falls back to a generic document link for
 * non-image uploads (PDF receipts are allowed per the backend's upload
 * filter).
 */
export function PaymentProofPreview({ proofUrl }: PaymentProofPreviewProps) {
  const { url, isLoading, error } = useProofImageUrl(proofUrl);

  if (!proofUrl) return null;

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span className="ml-2 text-sm">Loading proof of payment...</span>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted text-muted-foreground">
        <ImageOff className="size-5" aria-hidden="true" />
        <span className="text-sm">Couldn't load proof of payment.</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <img
        src={url}
        alt="Uploaded proof of payment"
        className="max-h-64 w-full object-contain bg-muted"
        onError={(event) => {
          // Non-image (PDF) uploads fail the <img> decode — swap to a document link instead.
          event.currentTarget.style.display = 'none';
        }}
      />
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 border-t border-border bg-card px-3 py-2 text-sm font-medium text-primary hover:underline"
      >
        <FileText className="size-4" aria-hidden="true" />
        Open proof of payment
      </a>
    </div>
  );
}
