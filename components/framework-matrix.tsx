/**
 * PMBOK process matrix as a COVERAGE map. Rows = the 10 knowledge areas,
 * columns = the 5 process groups (which read left-to-right as the lifecycle).
 * Every process is colour-coded by who owns it in this model — what the AI
 * authors, what it synthesises read-only, what stays in the ERP/scheduler, and
 * what stays human-led. The point is not to claim the tool "does" all 49
 * processes, but to show coverage AND the consume-vs-build boundary at once:
 * the AI footprint concentrates in Planning (authoring) and Monitoring &
 * Controlling (synthesis); Executing stays with the engines and people.
 */

type Own = 'author' | 'synth' | 'engine' | 'human';

const OWN: Record<Own, { label: string; chip: string; dot: string }> = {
  author: { label: 'AI authors / drafts', chip: 'border-violet-200 bg-violet-50 text-violet-900', dot: 'bg-violet-500' },
  synth: { label: 'AI synthesises (read-only)', chip: 'border-emerald-200 bg-emerald-50 text-emerald-900', dot: 'bg-emerald-500' },
  engine: { label: 'Stays in ERP / scheduler', chip: 'border-sky-200 bg-sky-50 text-sky-900', dot: 'bg-sky-500' },
  human: { label: 'Human-led', chip: 'border-slate-200 bg-slate-50 text-slate-700', dot: 'bg-slate-400' },
};

const GROUPS = ['Initiating', 'Planning', 'Executing', 'Monitoring & Controlling', 'Closing'];

type Proc = { p: string; o: Own };
type Row = { ka: string; cells: Proc[][] };

const MATRIX: Row[] = [
  { ka: 'Integration', cells: [
    [{ p: 'Develop Project Charter', o: 'author' }],
    [{ p: 'Develop PM Plan', o: 'author' }],
    [{ p: 'Direct & Manage Work', o: 'human' }, { p: 'Manage Knowledge', o: 'author' }],
    [{ p: 'Monitor & Control Work', o: 'synth' }, { p: 'Integrated Change Control', o: 'synth' }],
    [{ p: 'Close Project', o: 'author' }],
  ] },
  { ka: 'Scope', cells: [
    [],
    [{ p: 'Plan Scope Mgmt', o: 'author' }, { p: 'Collect Requirements', o: 'human' }, { p: 'Define Scope', o: 'author' }, { p: 'Create WBS', o: 'author' }],
    [],
    [{ p: 'Validate Scope', o: 'human' }, { p: 'Control Scope', o: 'synth' }],
    [],
  ] },
  { ka: 'Schedule', cells: [
    [],
    [{ p: 'Plan Schedule Mgmt', o: 'author' }, { p: 'Define Activities', o: 'engine' }, { p: 'Sequence Activities', o: 'engine' }, { p: 'Estimate Durations', o: 'engine' }, { p: 'Develop Schedule', o: 'engine' }],
    [],
    [{ p: 'Control Schedule', o: 'synth' }],
    [],
  ] },
  { ka: 'Cost', cells: [
    [],
    [{ p: 'Plan Cost Mgmt', o: 'author' }, { p: 'Estimate Costs', o: 'author' }, { p: 'Determine Budget', o: 'engine' }],
    [],
    [{ p: 'Control Costs (EV)', o: 'synth' }],
    [],
  ] },
  { ka: 'Quality', cells: [
    [],
    [{ p: 'Plan Quality Mgmt', o: 'human' }],
    [{ p: 'Manage Quality', o: 'human' }],
    [{ p: 'Control Quality', o: 'human' }],
    [],
  ] },
  { ka: 'Resource', cells: [
    [],
    [{ p: 'Plan Resource Mgmt', o: 'author' }, { p: 'Estimate Activity Resources', o: 'engine' }],
    [{ p: 'Acquire Resources', o: 'human' }, { p: 'Develop Team', o: 'human' }, { p: 'Manage Team', o: 'human' }],
    [{ p: 'Control Resources', o: 'synth' }],
    [],
  ] },
  { ka: 'Communications', cells: [
    [],
    [{ p: 'Plan Communications', o: 'author' }],
    [{ p: 'Manage Communications', o: 'human' }],
    [{ p: 'Monitor Communications', o: 'synth' }],
    [],
  ] },
  { ka: 'Risk', cells: [
    [],
    [{ p: 'Plan Risk Mgmt', o: 'author' }, { p: 'Identify Risks', o: 'author' }, { p: 'Qualitative Analysis', o: 'synth' }, { p: 'Quantitative Analysis', o: 'synth' }, { p: 'Plan Risk Responses', o: 'author' }],
    [{ p: 'Implement Risk Responses', o: 'human' }],
    [{ p: 'Monitor Risks', o: 'synth' }],
    [],
  ] },
  { ka: 'Procurement', cells: [
    [],
    [{ p: 'Plan Procurement Mgmt', o: 'author' }],
    [{ p: 'Conduct Procurements', o: 'human' }],
    [{ p: 'Control Procurements', o: 'synth' }],
    [],
  ] },
  { ka: 'Stakeholder', cells: [
    [{ p: 'Identify Stakeholders', o: 'author' }],
    [{ p: 'Plan Stakeholder Engagement', o: 'author' }],
    [{ p: 'Manage Stakeholder Engagement', o: 'human' }],
    [{ p: 'Monitor Stakeholder Engagement', o: 'synth' }],
    [],
  ] },
];

function Chip({ proc }: { proc: Proc }) {
  const s = OWN[proc.o];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${s.chip}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
      {proc.p}
    </span>
  );
}

export function FrameworkMatrix() {
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(OWN) as Own[]).map((o) => (
          <span key={o} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`h-2.5 w-2.5 rounded-full ${OWN[o].dot}`} />
            {OWN[o].label}
          </span>
        ))}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead>
            <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 font-semibold">Knowledge area</th>
              {GROUPS.map((g) => (
                <th key={g} className="px-3 py-2 font-semibold">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {MATRIX.map((row) => (
              <tr key={row.ka} className="align-top">
                <th className="sticky left-0 z-10 bg-card px-3 py-3 text-sm font-semibold">{row.ka}</th>
                {row.cells.map((cell, i) => (
                  <td key={i} className="px-2.5 py-3">
                    {cell.length === 0 ? (
                      <span className="text-muted-foreground/30">—</span>
                    ) : (
                      <div className="flex flex-col flex-wrap gap-1">
                        {cell.map((proc) => (
                          <Chip key={proc.p} proc={proc} />
                        ))}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
