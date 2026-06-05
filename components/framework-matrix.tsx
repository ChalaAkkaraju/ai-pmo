/**
 * PMBOK process matrix as a COVERAGE map. Rows = the 10 knowledge areas,
 * columns = the 5 process groups (which read left-to-right as the lifecycle).
 * Every process is colour-coded by WHO OWNS IT, using the SAME colour code and
 * legend as the end-to-end process flow on /architecture: green = AI PMO (split
 * into authoring vs read-only synthesis), blue = SAP PS (ERP), amber = the
 * scheduler, violet = human-in-the-loop. The point is not to claim the tool
 * "does" all 49 processes, but to show coverage AND the consume-vs-build
 * boundary at once: the AI footprint concentrates in Planning (authoring) and
 * Monitoring & Controlling (synthesis); Executing stays with the engines/people.
 */

type Own = 'author' | 'synth' | 'erp' | 'scheduler' | 'human';

// Palette matches the swim-lane / process-flow legend exactly.
const OWN: Record<Own, { label: string; bg: string; bd: string; tx: string; dot: string }> = {
  author:    { label: 'AI PMO — authors',                 bg: '#EAF3DE', bd: '#97C459', tx: '#3B6D11', dot: '#3B6D11' },
  synth:     { label: 'AI PMO — synthesises (read-only)', bg: '#F4F9EC', bd: '#BFD89A', tx: '#5C8A1E', dot: '#97C459' },
  erp:       { label: 'SAP PS — ERP',                     bg: '#E6F1FB', bd: '#85B7EB', tx: '#185FA5', dot: '#85B7EB' },
  scheduler: { label: 'Scheduler',                        bg: '#FAEEDA', bd: '#FAC775', tx: '#854F0B', dot: '#E0A23C' },
  human:     { label: 'Human-in-the-loop',                bg: '#EEEDFE', bd: '#AFA9EC', tx: '#534AB7', dot: '#AFA9EC' },
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
    [{ p: 'Plan Schedule Mgmt', o: 'author' }, { p: 'Define Activities', o: 'scheduler' }, { p: 'Sequence Activities', o: 'scheduler' }, { p: 'Estimate Durations', o: 'scheduler' }, { p: 'Develop Schedule', o: 'scheduler' }],
    [],
    [{ p: 'Control Schedule', o: 'synth' }],
    [],
  ] },
  { ka: 'Cost', cells: [
    [],
    [{ p: 'Plan Cost Mgmt', o: 'author' }, { p: 'Estimate Costs', o: 'author' }, { p: 'Determine Budget', o: 'erp' }],
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
    [{ p: 'Plan Resource Mgmt', o: 'author' }, { p: 'Estimate Activity Resources', o: 'scheduler' }],
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
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: s.bg, borderColor: s.bd, color: s.tx }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.dot }} />
      {proc.p}
    </span>
  );
}

export function FrameworkMatrix() {
  return (
    <div className="space-y-4">
      {/* Legend — same colour code as the process flow */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {(Object.keys(OWN) as Own[]).map((o) => (
          <span key={o} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: OWN[o].bd }} />
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
