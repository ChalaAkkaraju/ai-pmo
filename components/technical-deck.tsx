'use client';

/**
 * "AI concepts at depth" — the technical companion to the business-friendly
 * Concepts deck, for technical readers + interview prep. Same slide mechanics
 * as ConceptDeck (overview → one concept per screen → capstone), content
 * grounded in this stack's actual engineering choices.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Ruler, SlidersHorizontal, Network, Wrench, Brain, Boxes, Plug, Cpu,
  Sparkles, Check, X, Lightbulb, ChevronLeft, ChevronRight, ArrowRight, type LucideIcon,
} from 'lucide-react';

type Concept = {
  term: string; tagline: string; cat: string; accent: string; Icon: LucideIcon;
  plain: string; means: string[]; notThis: string[]; analogy: string;
  inApp: string; why: string; linkPath?: string; linkLabel?: string;
};

const CONCEPTS: Concept[] = [
  {
    term: 'Tokens & context windows', tagline: 'The unit of everything, and the budget it spends against',
    cat: 'Foundations', accent: '#0ea5e9', Icon: Ruler,
    plain: "Models don't read characters or words — they read tokens, sub-word chunks (roughly 4 characters, about three-quarters of a word in English). Everything is tokens: your prompt, the retrieved data, and the reply all draw on one shared budget called the context window. If that window is, say, 200K tokens, that's the total the model can attend to at once; go past it and the oldest content drops out of view. Cost and latency both scale with tokens in and out, so token economy is a real engineering constraint, not a footnote.",
    means: ['~4 characters ≈ 1 token; a dense page ≈ 500–800 tokens', 'Prompt + grounding + answer all share one window', 'Cost and latency both scale with token count', 'A context window is not memory — nothing persists between calls'],
    notThis: ['Not words — tokens are sub-word pieces', 'Not unlimited — every model has a fixed window', 'Not remembered — each request re-sends everything it needs'],
    analogy: "A whiteboard of fixed size: you can write anything on it, but only so much fits at once, and it is wiped between meetings.",
    inApp: "Every agent call re-assembles the project's canonical facts into the window; EV, risk and margin figures are kept compact on purpose, so the budget is spent on reasoning rather than boilerplate.",
    why: "It is why grounding is selective and long histories get summarised — and a standard interview probe on cost and limits.",
  },
  {
    term: 'Context engineering', tagline: 'Designing what the model sees, not just how you ask',
    cat: 'Engineering', accent: '#6366f1', Icon: SlidersHorizontal,
    plain: "Prompt engineering is wording a question well. Context engineering is the broader discipline of deciding what information enters the window — and in what form, what order, and from where: retrieved facts, tool outputs, prior turns, system rules. For agentic systems this matters more than clever phrasing, because the answer is bounded by what you put in front of the model. Good context engineering assembles the minimum sufficient, well-structured, provenance-tagged context for each task.",
    means: ['About what goes in the window, not only how the question is phrased', 'Selection, formatting, ordering and de-duplication of context', 'The right facts in the right structure beat a longer prompt', 'Increasingly the core skill for production LLM systems'],
    notThis: ['Not the same as prompt engineering (that is a subset)', 'Not "stuff everything in" — noise crowds out signal and costs tokens', 'Not static — context is assembled per request'],
    analogy: "Briefing a barrister: the outcome depends less on how you phrase the question and more on which documents you put in the bundle, and in what order.",
    inApp: "The entire grounding layer is context engineering — assembling computed EV, the WBS, risks and a comparable reference project into each agent's context, structured and labelled by source system.",
    why: "It is the honest answer to 'what does building with LLMs actually involve' — and where most of this project's effort went.",
    linkPath: 'architecture', linkLabel: 'See where the context comes from',
  },
  {
    term: 'Embeddings & vector retrieval', tagline: 'What RAG is actually doing under the hood',
    cat: 'Retrieval', accent: '#8b5cf6', Icon: Network,
    plain: "Retrieval needs a way to find 'similar in meaning', not just 'matching keywords'. An embedding model turns a piece of text into a vector — a list of numbers placing it in a high-dimensional 'meaning space' where related texts sit close together. To retrieve, you embed the query, then find the nearest stored vectors by cosine similarity, usually through a vector index. That is the engine under RAG: embed once, then search by distance.",
    means: ['An embedding is text → a fixed-length vector of meaning', 'Similar meaning ⇒ nearby vectors (cosine distance)', 'A vector index (e.g. pgvector) makes nearest-neighbour search fast', 'Quality depends on the embedding model and the chunking strategy'],
    notThis: ['Not keyword search — it matches meaning, not exact words', 'Not the LLM — a separate, smaller embedding model does this', 'Not guaranteed relevance — weak chunking or model retrieves noise'],
    analogy: "A library shelved by topic similarity rather than alphabetically: to find related material you go to the right region and take the nearest neighbours.",
    inApp: "The rag-sandbox makes this concrete — nomic-embed-text (via Ollama) + pgvector — and the worked-examples table carries an embedding column. In the main app, reference-project pairing is deterministic today, with semantic retrieval as the next step.",
    why: "It demystifies RAG: the 'magic' is nearest-neighbour search over embeddings — a very common interview topic.",
  },
  {
    term: 'Fine-tuning vs prompting + RAG', tagline: 'Why this app changes the input, not the weights',
    cat: 'Engineering', accent: '#d97706', Icon: Wrench,
    plain: "There are three ways to make a model fit your domain: prompt/context engineering (instructions plus retrieved facts at inference), RAG (retrieve then generate), and fine-tuning (continue training the weights on your examples). Fine-tuning bakes style and format into the weights, but it is costly, slow to iterate, hard to update, and an unreliable way to add facts. Prompting + RAG keeps facts fresh, is instantly editable, and traces every answer to a source. For a knowledge- and accuracy-driven app, prompting + RAG usually wins.",
    means: ['Fine-tuning changes weights; prompting/RAG change the input', 'RAG keeps knowledge current and auditable; fine-tuning fixes it in weights', 'Fine-tuning suits a fixed style/format; RAG suits changing facts', 'They combine — fine-tune for form, RAG for facts'],
    notThis: ['Not "fine-tuning teaches it your data" reliably — it shifts behaviour, not a fact store', 'Not free — fine-tuning needs data, compute, and a re-run on every change', 'Not always needed — most enterprise value is prompting + RAG'],
    analogy: "Fine-tuning is sending someone on a training course; RAG is handing them the right handbook for each task. For facts that change weekly, you update the handbook, not re-run the course.",
    inApp: "AI PMO deliberately uses prompting + RAG, not fine-tuning: the 15 agents are system prompts over grounded data, so a rule change is a prompt edit (no retraining) and every figure stays traceable to the canonical model.",
    why: "'Why didn't you fine-tune?' is the classic interview question — the answer is freshness, auditability, and iteration speed.",
    linkPath: 'agents', linkLabel: 'The agents are prompts',
  },
  {
    term: 'Reasoning models', tagline: 'Spending inference to think before answering',
    cat: 'Model behaviour', accent: '#10b981', Icon: Brain,
    plain: "Standard models answer in a single pass. Reasoning models are trained to spend extra inference 'thinking' — generating intermediate steps (a hidden or visible chain of thought) before the final answer — which sharply improves multi-step problems: maths, planning, careful analysis. The trade-off is more tokens, more latency, and more cost. You reach for them where the reasoning is the value, and avoid them for simple, high-volume work.",
    means: ['They allocate extra compute to intermediate steps before answering', 'Large gains on multi-step and analytical tasks', 'The cost is more tokens and more latency', 'Not needed for routine extraction or classification'],
    notThis: ['Not literally "conscious" — it is structured intermediate generation', 'Not always better — overkill and slow for simple tasks', 'Not a fact source — reasoning over wrong inputs still yields wrong answers'],
    analogy: "Showing your working on a hard exam question versus blurting the answer: slower, but far more reliable on the multi-step ones.",
    inApp: "The same tiering logic applies — heavyweight synthesis (variance, risk, lessons) is where deeper reasoning earns its cost, while routing and extraction stay on the fast path.",
    why: "Knowing when reasoning pays off, and when it is wasteful, is exactly the cost/latency judgement interviewers probe.",
  },
  {
    term: 'Mixture-of-experts (MoE)', tagline: 'How huge models stay fast — sparse activation',
    cat: 'Model behaviour', accent: '#f43f5e', Icon: Boxes,
    plain: "Many modern LLMs are internally a mixture of experts. Instead of one dense network where every parameter fires for every token, the model holds many 'expert' sub-networks and a small router activates only a few per token. You get the capacity of a very large model at the compute of a much smaller one, because only a fraction is active at any moment. It is an architecture detail you do not control, but it explains how frontier models stay fast despite enormous parameter counts.",
    means: ['Many expert sub-networks; a router activates a few per token', 'Large total capacity, far lower active compute', 'An internal architecture choice, inside the model', 'Why huge models can still be fast and affordable'],
    notThis: ['Not the multi-agent routing you build — this is inside one model', 'Not something you configure through the API', 'Not "many models in a trench coat" — one model, sparse activation'],
    analogy: "A big firm where each query goes to the two or three relevant specialists, not the entire staff — full expertise on tap, but you only pay for who actually works the case.",
    inApp: "Your system-level tiering (a Haiku router handing off to an Opus specialist) is the same idea one layer up: route each job to the right-sized capacity instead of running everything at full power.",
    why: "It is the 'how do trillion-parameter models run at all' answer — and a neat parallel to your own routing design.",
  },
  {
    term: 'MCP — Model Context Protocol', tagline: 'A standard plug between models and your systems',
    cat: 'Interoperability', accent: '#2563eb', Icon: Plug,
    plain: "MCP is an open standard for connecting models to tools and data through a uniform interface. Instead of hand-wiring each integration, a host (the AI app) talks to MCP servers that expose tools, resources, and prompts in a common shape, so any compliant model can discover and call them. It is effectively a 'USB-C for AI tools' — decoupling what the model can do from how each underlying system is integrated.",
    means: ['A standard interface between AI hosts and tool/data servers', 'Tools, resources and prompts exposed in a common shape', 'Write an integration once; any MCP host can use it', 'Decouples model capability from bespoke integration code'],
    notThis: ['Not a model or a vendor API — it is a protocol/standard', 'Not required to use an LLM — it standardises tool access', 'Not automatic safety — tools still need permissions and guardrails'],
    analogy: "USB-C for AI: one connector standard, so any device plugs into any host without a custom cable for every pairing.",
    inApp: "Not used in the demo today, but it is the natural shape for the integration vision — exposing SAP/scheduler reads (and the one WBS write) as MCP tools so any agent could consume them through a single contract.",
    why: "MCP is the integration story everyone is asking about right now; knowing what it standardises — and what it doesn't — is increasingly expected.",
  },
];

const CHOICES = [
  { g: 'Context over fine-tuning', t: 'Facts stay fresh, editable and traceable; behaviour is a prompt edit, not a retrain.' },
  { g: 'Deterministic over generative for numbers', t: 'Exact figures are computed in code; the model narrates them and never derives them.' },
  { g: 'Right-sized models', t: 'Haiku routes, Opus synthesises, reasoning is used only where it earns its cost.' },
];

const CATS = ['Foundations', 'Engineering', 'Retrieval', 'Model behaviour', 'Interoperability'];

function Slide({ idx, refCb, children }: { idx: number; refCb: (i: number) => (el: HTMLElement | null) => void; children: ReactNode }) {
  return (
    <section data-idx={idx} ref={refCb(idx)} className="h-full min-h-full w-full min-w-full flex-none snap-start overflow-y-auto px-6 py-10">
      <div className="mx-auto flex min-h-full w-full max-w-4xl items-center">
        <div className="w-full">{children}</div>
      </div>
    </section>
  );
}

export function TechnicalDeck({ token }: { token: string }) {
  const slideCount = CONCEPTS.length + 2;
  const capIdx = CONCEPTS.length + 1;
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const activeRef = useRef(0);

  const jumpTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, slideCount - 1));
    slideRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }, [slideCount]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((obs) => {
      obs.forEach((e) => {
        if (e.isIntersecting) {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (!Number.isNaN(idx)) { setActive(idx); activeRef.current = idx; }
        }
      });
    }, { root, threshold: 0.55 });
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [slideCount]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'ArrowDown') { e.preventDefault(); jumpTo(active + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'ArrowUp') { e.preventDefault(); jumpTo(active - 1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, jumpTo]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const panel = slideRefs.current[activeRef.current];
      if (panel) {
        const canDown = panel.scrollHeight - panel.clientHeight - panel.scrollTop > 1;
        const canUp = panel.scrollTop > 1;
        if ((e.deltaY > 0 && canDown) || (e.deltaY < 0 && canUp)) return;
      }
      root!.scrollLeft += e.deltaY;
      e.preventDefault();
    }
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, []);

  const atStart = active === 0;
  const atEnd = active === slideCount - 1;
  const setRef = (i: number) => (el: HTMLElement | null) => { slideRefs.current[i] = el; };

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-none items-center justify-between gap-4 border-b bg-background px-6 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/access/${token}/technical`} className="text-muted-foreground hover:text-foreground">← Technical notes</Link>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">AI concepts at depth</span>
        </div>
        <span className="tabular-nums text-xs font-medium text-muted-foreground">
          {active === 0 ? 'Overview' : active === capIdx ? 'The throughline' : `${active} / ${CONCEPTS.length}`}
        </span>
      </div>

      <div className="h-0.5 flex-none bg-muted">
        <div className="h-full bg-foreground transition-all duration-300" style={{ width: `${(active / (slideCount - 1)) * 100}%` }} />
      </div>

      <div ref={containerRef} className="tech-deck-scroll flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
        {/* Overview */}
        <Slide idx={0} refCb={setRef}>
          <div className="rounded-2xl border p-7" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(14,165,233,0.05))', borderColor: 'rgba(14,165,233,0.25)' }}>
            <div className="mb-2 flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sky-500/15 text-sky-600"><Sparkles size={22} strokeWidth={2} /></span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI PMO · the engineering underneath</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">AI concepts at depth</h1>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-foreground/80 text-justify">
              The technical companion to the business-friendly Concepts deck — for a technical audience and interview prep.
              Each idea gets a precise explanation, the key points, the common misconceptions, an analogy, how it shows up
              (or was deliberately chosen against) in this build, and why it matters. One concept per screen.
            </p>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">The topics, by theme — click to jump</p>
          <div className="mt-2 space-y-1.5">
            {CATS.map((cat) => (
              <div key={cat} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                <div className="w-32 flex-none text-xs font-semibold uppercase tracking-wide text-foreground/70">{cat}</div>
                <div className="flex flex-wrap gap-1.5">
                  {CONCEPTS.map((c, i) => c.cat === cat ? (
                    <button key={c.term} type="button" onClick={() => jumpTo(i + 1)} className="rounded-full px-2.5 py-0.5 text-xs font-medium transition hover:brightness-95" style={{ backgroundColor: `${c.accent}1f`, color: c.accent }}>{c.term.split(' — ')[0].split(' (')[0]}</button>
                  ) : null)}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            The throughline at the end ties them together into the deliberate engineering choices behind AI PMO.
          </p>
        </Slide>

        {/* Concept slides */}
        {CONCEPTS.map((c, idx) => {
          const Icon = c.Icon;
          const i = idx + 1;
          return (
            <Slide key={c.term} idx={i} refCb={setRef}>
              <div className="rounded-2xl border p-7" style={{ background: `linear-gradient(135deg, ${c.accent}1f, ${c.accent}08)`, borderColor: `${c.accent}33` }}>
                <div className="mb-2.5 flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: `${c.accent}26`, color: c.accent }}><Icon size={24} strokeWidth={2} /></span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: `${c.accent}1a`, color: c.accent }}>{c.cat}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{c.term}</h1>
                <p className="mt-1 text-sm text-foreground/70">{c.tagline}</p>
              </div>

              <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">{c.plain}</p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex h-full flex-col rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Key points</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {c.means.map((m, k) => <li key={k} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85"><Check size={17} strokeWidth={2.5} className="mt-0.5 flex-none text-emerald-500" /><span>{m}</span></li>)}
                  </ul>
                </div>
                <div className="flex h-full flex-col rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                  <p className="text-sm font-semibold uppercase tracking-wider text-rose-700">Common misconceptions</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {c.notThis.map((m, k) => <li key={k} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85"><X size={17} strokeWidth={2.5} className="mt-0.5 flex-none text-rose-400" /><span>{m}</span></li>)}
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-xl border-l-4 border-sky-400 bg-sky-50/60 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-sky-700"><Lightbulb size={16} strokeWidth={2.5} />Think of it like</p>
                <p className="mt-1.5 text-base italic leading-relaxed text-foreground/85">{c.analogy}</p>
              </div>

              <div className="mt-3 rounded-xl border-l-4 px-4 py-3" style={{ borderColor: c.accent, backgroundColor: `${c.accent}0d` }}>
                <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: c.accent }}>In AI PMO</p>
                <p className="mt-1.5 text-base leading-relaxed text-foreground/85">{c.inApp}</p>
                {c.linkPath && <Link href={`/access/${token}/${c.linkPath}`} className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: c.accent }}>{c.linkLabel} <ArrowRight size={14} /></Link>}
              </div>

              <p className="mt-4 text-sm text-muted-foreground"><span className="font-semibold uppercase tracking-wider text-foreground/60">Why it matters: </span>{c.why}</p>
            </Slide>
          );
        })}

        {/* Capstone */}
        <Slide idx={capIdx} refCb={setRef}>
          <div className="rounded-2xl border p-7" style={{ background: 'linear-gradient(135deg, #0f766e1f, #0f766e08)', borderColor: '#0f766e33' }}>
            <div className="mb-2.5 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: '#0f766e26', color: '#0f766e' }}><Cpu size={24} strokeWidth={2} /></span>
              <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: '#0f766e1a', color: '#0f766e' }}>The throughline</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Engineering, not magic</h1>
            <p className="mt-1 text-sm text-foreground/70">The deliberate choices these ideas add up to</p>
          </div>

          <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">
            None of this is mysterious. Building with LLMs is a set of deliberate engineering choices: respect the token
            budget, engineer the context rather than the wording, retrieve facts instead of baking them in, size the model
            to the task, and lean on reasoning only where it pays. AI PMO is those choices made explicit.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CHOICES.map((x) => (
              <div key={x.g} className="flex h-full flex-col rounded-xl border bg-card p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-teal-800"><Check size={16} strokeWidth={3} className="text-teal-500" />{x.g}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{x.t}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-base font-medium text-teal-900">That discipline is the difference between a demo and something you would put numbers from in front of a steering committee.</p>
        </Slide>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-full max-w-[64rem] -translate-x-1/2 items-center justify-between lg:flex">
        <button type="button" onClick={() => jumpTo(active - 1)} disabled={atStart} aria-label="Previous" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-600 shadow-lg transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-25"><ChevronLeft size={26} strokeWidth={2.5} /></button>
        <button type="button" onClick={() => jumpTo(active + 1)} disabled={atEnd} aria-label="Next" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-600 shadow-lg transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-25"><ChevronRight size={26} strokeWidth={2.5} /></button>
      </div>

      <nav className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/80 px-3 py-2 shadow-sm backdrop-blur" aria-label="Jump to slide">
        <button type="button" onClick={() => jumpTo(0)} title="Overview" aria-label="Go to overview" className="rounded-full transition-all hover:scale-125" style={{ width: active === 0 ? 11 : 8, height: active === 0 ? 11 : 8, backgroundColor: active === 0 ? '#0ea5e9' : 'rgb(203 213 225)' }} />
        <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
        {CONCEPTS.map((c, idx) => {
          const isActive = idx + 1 === active;
          return <button key={c.term} type="button" onClick={() => jumpTo(idx + 1)} title={c.term} aria-label={`Go to ${c.term}`} className="rounded-full transition-all hover:scale-125" style={{ width: isActive ? 11 : 8, height: isActive ? 11 : 8, backgroundColor: isActive ? c.accent : 'rgb(203 213 225)' }} />;
        })}
        <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
        <button type="button" onClick={() => jumpTo(capIdx)} title="The throughline" aria-label="Go to the throughline" className="rounded-full transition-all hover:scale-125" style={{ width: active === capIdx ? 11 : 8, height: active === capIdx ? 11 : 8, backgroundColor: active === capIdx ? '#0f766e' : 'rgb(203 213 225)' }} />
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `.tech-deck-scroll { scrollbar-width: thin; overscroll-behavior-x: contain; } .tech-deck-scroll::-webkit-scrollbar { height: 8px; }` }} />
    </div>
  );
}
