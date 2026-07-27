// Generates a richly-styled DOCX: "AI-Assisted Project Management System — Technical Overview & Learnings"
// Theme: Modern teal/slate. Run in outputs dir where `docx` is installed.
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  TabStopType, TabStopPosition,
} = require('docx');
const fs = require('fs');

// ---- Palette (teal/slate) ----
const TEAL = '0F766E';      // primary accent (headings)
const TEAL_LT = '14B8A6';   // bright teal (rules, bullets)
const SLATE = '334155';     // body text
const SLATE_LT = '64748B';  // muted / subheadings secondary
const INK = '0F172A';       // near-black for H1
const BAND = 'F1F5F9';      // light slate band for table header
const ROW_ALT = 'F8FAFC';   // zebra row
const AMBER = 'B45309';     // subtle secondary accent
const FONT = 'Calibri';       // contemporary sans (native in Word; Carlito substitute in PDF)
const FONT_BODY = 'Calibri';

const EMU = 1440; // per inch

function rule(color = TEAL_LT, size = 12, space = 120) {
  return new Paragraph({
    border: { bottom: { color, style: BorderStyle.SINGLE, size, space } },
    spacing: { after: space },
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 80, after: 60 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 40, color: INK })],
  });
}

function subtitle(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, font: FONT, italics: true, size: 22, color: SLATE_LT })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 40 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 28, color: TEAL })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 30 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 22, color: SLATE_LT })],
  });
}

// body paragraph accepts array of {text, bold, italics, color}
function body(runs, opts = {}) {
  const arr = Array.isArray(runs) ? runs : [{ text: runs }];
  return new Paragraph({
    spacing: { after: opts.after ?? 120, line: 276 },
    alignment: opts.align,
    children: arr.map(r => new TextRun({
      text: r.text, bold: r.bold, italics: r.italics,
      font: FONT_BODY, size: r.size ?? 21, color: r.color ?? SLATE,
    })),
  });
}

function bullet(runs, level = 0) {
  const arr = Array.isArray(runs) ? runs : [{ text: runs }];
  return new Paragraph({
    bullet: { level },
    spacing: { after: 80, line: 272 },
    children: arr.map(r => new TextRun({
      text: r.text, bold: r.bold, italics: r.italics,
      font: FONT_BODY, size: 21, color: r.color ?? SLATE,
    })),
  });
}

// numbered learning item: bold lead + rest
function learning(n, lead, rest) {
  return new Paragraph({
    spacing: { after: 130, line: 276 },
    children: [
      new TextRun({ text: `${n}. `, bold: true, font: FONT, size: 21, color: TEAL }),
      new TextRun({ text: lead + '  ', bold: true, font: FONT_BODY, size: 21, color: INK }),
      new TextRun({ text: rest, font: FONT_BODY, size: 21, color: SLATE }),
    ],
  });
}

// ---- Stack table ----
function cellText(text, { bold = false, color = SLATE, header = false } = {}) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, bold, font: FONT_BODY, size: header ? 20 : 20, color })],
  });
}

const COL1 = Math.round(EMU * 2.1);
const COL2 = Math.round(EMU * 4.4);
const TABLE_W = COL1 + COL2;

function stackRow(layer, tools, i) {
  const shade = i % 2 === 0 ? ROW_ALT : 'FFFFFF';
  return new TableRow({
    children: [
      new TableCell({
        width: { size: COL1, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: shade, color: 'auto' },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [cellText(layer, { bold: true, color: TEAL })],
      }),
      new TableCell({
        width: { size: COL2, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: shade, color: 'auto' },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [cellText(tools, { color: SLATE })],
      }),
    ],
  });
}

const stackRows = [
  ['Framework', 'Next.js 16 (App Router), React 19, TypeScript (strict mode)'],
  ['UI / styling', 'Tailwind CSS, Radix UI primitives, lucide-react icons, class-variance-authority, tailwindcss-animate'],
  ['Data & backend', 'Supabase (Postgres, auth, row access) via @supabase/ssr; direct pg access for scripts'],
  ['LLM access', 'OpenRouter through the OpenAI-compatible SDK — model-agnostic, two-tier (capable model for generation, cheap fast model for routing)'],
  ['Validation', 'Zod schemas at the API boundary'],
  ['Content rendering', 'react-markdown + remark-gfm (agent outputs are Markdown)'],
  ['PDF / headless', 'Puppeteer + @sparticuz/chromium for server-side report generation'],
  ['Tooling', 'pnpm, ESLint (Next config), tsx for TypeScript scripts, PostCSS / autoprefixer'],
];

const headerRow = new TableRow({
  tableHeader: true,
  children: [
    new TableCell({
      width: { size: COL1, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: TEAL, color: 'auto' },
      margins: { top: 70, bottom: 70, left: 120, right: 120 },
      children: [cellText('Layer', { bold: true, color: 'FFFFFF', header: true })],
    }),
    new TableCell({
      width: { size: COL2, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: TEAL, color: 'auto' },
      margins: { top: 70, bottom: 70, left: 120, right: 120 },
      children: [cellText('Tools', { bold: true, color: 'FFFFFF', header: true })],
    }),
  ],
});

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const thinBorder = { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' };

const stackTable = new Table({
  columnWidths: [COL1, COL2],
  width: { size: TABLE_W, type: WidthType.DXA },
  borders: {
    top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
    insideHorizontal: thinBorder, insideVertical: thinBorder,
  },
  rows: [headerRow, ...stackRows.map(([l, t], i) => stackRow(l, t, i))],
});

// ---- Document body ----
const children = [
  // Eyebrow
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: 'TECHNICAL OVERVIEW', bold: true, font: FONT, size: 18, color: TEAL_LT, characterSpacing: 40 })],
  }),
  h1('AI-Assisted Project Management System'),
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: 'Technical Overview & Learnings', font: FONT, size: 26, color: TEAL })],
  }),
  subtitle('A personal learning project exploring how large language models can support project and portfolio management in a capital-projects (EPC-style) context.'),
  rule(TEAL_LT, 18, 200),

  h2('What it is'),
  body('A web application that pairs a set of methodology-aware AI agents with a real project/portfolio data model. Instead of one general chatbot, the system exposes a roster of specialist agents — each with a role-specific prompt and a narrow remit (drafting a charter, building a work breakdown structure, analysing cost/schedule variance, reviewing change orders, synthesising lessons learned, producing status reports). A user, identified by a role, asks a question in plain language; the system routes the request to the right specialist, grounds it in live project data, and returns a structured document or a chat-style summary.'),
  body('The point of the build was to learn — to get hands-on with the moving parts of a production-shaped LLM application: model routing, retrieval/grounding, access control, cost tracking, and the integration surface with enterprise systems. It is deliberately end-to-end rather than a toy prototype.'),

  h2('Tools & technology used'),
  body([{ text: 'The core stack, by layer:', italics: true, color: SLATE_LT }], { after: 100 }),
  stackTable,
  new Paragraph({ spacing: { after: 120 }, children: [] }),
  body('The codebase is organised into App Router pages and API route handlers; a lib/ folder of pure domain logic and service wrappers; a component library; and a set of seed/generator scripts that produce realistic synthetic portfolio data for development and demos.'),

  h2('How the pieces fit together'),

  h3('Two-tier model routing'),
  body('When a request comes in as "auto", a lightweight classifier model picks the single most appropriate specialist from the agents that role is allowed to use, then the heavier model does the actual generation. The classifier call is short, temperature-zero, capped at a handful of tokens, and falls back to a safe default if it returns anything unrecognised. This keeps the routing overhead negligible against the cost of the main call.'),

  h3('Grounding, not guessing'),
  body('Each specialist call assembles its context from three sources: the agent’s system prompt, a worked example (a few-shot reference of a good output), and live project or portfolio state pulled from the database. The model reasons over real numbers and records rather than inventing them.'),

  h3('Deterministic math stays deterministic'),
  body('The financial and schedule calculations — earned value (CPI/SPI), expected monetary value for risk exposure, cash-flow phasing, cost-commitment/EAC logic, forecasting — live in plain, testable TypeScript modules. The LLM is used for narrative, judgement, and synthesis; it is not asked to do arithmetic that can be computed exactly.'),

  h3('Access control around agents'),
  body('A role token maps to a role, which maps to a set of allowed agents. Every invocation is permission-checked twice (before and after routing), so the agent roster effectively becomes a set of capabilities gated by role.'),

  h3('Enterprise integration via adapters'),
  body('Ingestion from scheduling and cost systems is handled through an adapter pattern (file-based and mock adapters for the common enterprise tools), with mappers translating external formats into the internal model. Mock adapters mean the app can be developed and demonstrated without a live connection to any external system.'),

  h3('Observability built in'),
  body('Token counts and dollar cost are captured per call — including separate metadata for the routing step — feeding usage and billing views. For an LLM product this telemetry is not optional; it is how you understand behaviour and control spend.'),

  h2('Key learnings'),
  learning(1, 'Specialisation beats a single mega-prompt.', 'Splitting the work into narrow, well-described agents made outputs more consistent and made the routing problem tractable. A cheap classifier picking among clearly-scoped specialists outperformed trying to make one prompt do everything.'),
  learning(2, 'Grounding is where the quality comes from.', 'The jump in usefulness came less from prompt wording and more from feeding the model real, current data plus a concrete worked example. Retrieval and context assembly deserve as much engineering attention as the prompts themselves.'),
  learning(3, 'Separate the generative from the deterministic.', 'The most reliable architecture was hybrid: exact calculations in code, language and reasoning from the model. Having the model compute metrics directly was slower, costlier, and less trustworthy than computing them and letting the model explain them.'),
  learning(4, 'Cost and latency are design constraints, not afterthoughts.', 'The two-tier routing pattern, tight timeouts, token caps on the classifier, and per-call cost tracking were all driven by treating spend and responsiveness as first-class requirements.'),
  learning(5, 'Provider-agnostic access pays off.', 'Talking to models through an OpenAI-compatible layer meant the specific model could be swapped via configuration — and the same code could point at a local, offline endpoint for free development. Avoiding hard coupling to one vendor kept options open.'),
  learning(6, 'Defensive, evolvable data access matters.', 'Small resilience touches — for example, tolerating a not-yet-applied schema migration by retrying a write without the new column — kept the system working through iterative database changes instead of breaking on every migration.'),
  learning(7, 'Realistic synthetic data is worth building.', 'Generator scripts that produce plausible portfolio archetypes and bulk historical outputs made the application demonstrable and testable long before any real data existed, and surfaced edge cases early.'),
  learning(8, 'Security hygiene from day one.', 'Keeping model API keys strictly server-side (never reachable from the browser) and gating every agent call behind role permissions were baked in rather than retrofitted.'),

  h2('Status & framing'),
  body('This is a learning-oriented, end-to-end build rather than a shipped product. Its value has been in exercising the full stack of an LLM application — from the UI down to model routing, grounding, integration adapters, and cost observability — and in surfacing the architectural patterns above through actually building them.'),
  rule(TEAL_LT, 12, 60),
  new Paragraph({
    spacing: { before: 60 },
    children: [new TextRun({ text: 'Prepared as a generic, shareable overview. No proprietary names, identifiers, or endpoints included.', italics: true, font: FONT, size: 16, color: SLATE_LT })],
  }),
];

const doc = new Document({
  creator: 'Project Overview',
  title: 'AI-Assisted Project Management System — Technical Overview & Learnings',
  styles: {
    default: { document: { run: { font: FONT_BODY, size: 21, color: SLATE } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/sessions/focused-trusting-bohr/mnt/outputs/Project_Overview_and_Learnings.docx', buf);
  console.log('DOCX written:', buf.length, 'bytes');
});
