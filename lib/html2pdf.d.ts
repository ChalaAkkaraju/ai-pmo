/**
 * Minimal type declaration for html2pdf.js.
 *
 * The package doesn't ship its own .d.ts and the community @types package
 * is out of date. We use only the fluent API, so a permissive shim is enough.
 *
 * Real usage:
 *   const html2pdf = (await import('html2pdf.js')).default;
 *   await html2pdf().from(el).set({...}).save();
 */
declare module 'html2pdf.js' {
  interface Html2PdfInstance {
    from(element: HTMLElement | string): Html2PdfInstance;
    set(options: Record<string, unknown>): Html2PdfInstance;
    save(filename?: string): Promise<void>;
    toPdf(): Html2PdfInstance;
    toCanvas(): Html2PdfInstance;
    toImg(): Html2PdfInstance;
    output(type: string, options?: unknown): Promise<unknown>;
    outputPdf(type?: string, options?: unknown): Promise<unknown>;
    outputImg(type?: string, options?: unknown): Promise<unknown>;
    then<T>(onFulfilled: (value: unknown) => T): Promise<T>;
  }

  function html2pdf(): Html2PdfInstance;
  function html2pdf(element: HTMLElement, options?: Record<string, unknown>): Html2PdfInstance;

  export default html2pdf;
}
