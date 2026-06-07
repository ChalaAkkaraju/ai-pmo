'use client';

import { Printer } from 'lucide-react';

/**
 * "Save as PDF" — triggers the browser print dialog (Save as PDF). Lets the
 * education pages double as derived exports. Hidden in the printed output.
 */
export function PrintButton({ label = 'Save as PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-muted print:hidden"
    >
      <Printer size={15} /> {label}
    </button>
  );
}
