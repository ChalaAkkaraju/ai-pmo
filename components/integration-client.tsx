'use client';

/**
 * Integration / Data Import admin surface (Phase 6). Mirrors the connector
 * pattern: import methods (API live; SFTP/manual as configured channels),
 * Test Connection / Sync Now, last-sync per source, a run-history table, and
 * the exception queue with resolve / ignore actions.
 */

import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

export interface SyncRunRow {
  id: string;
  source_system: string;
  channel: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_inserted: number;
  rows_updated: number;
  exceptions: number;
  message: string | null;
  project_code: string | null;
}
export interface SyncExceptionRow {
  id: string;
  source_system: string;
  kind: string;
  external_id: string | null;
  reason: string;
  created_at: string;
  project_code: string | null;
}
export interface ProjectOption {
  code: string;
  name: string;
  source_system: string | null;
}

function fmtTime(s: string | null): string {
  return s ? new Date(s).toLocaleString() : '—';
}
function statusCls(s: string): string {
  return s === 'failed' ? 'bg-red-100 text-red-800' : s === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
}

export function IntegrationClient({
  token,
  projects,
  runs,
  exceptions,
  lastSyncBySource,
  canWrite,
}: {
  token: string;
  projects: ProjectOption[];
  runs: SyncRunRow[];
  exceptions: SyncExceptionRow[];
  lastSyncBySource: Record<string, string | null>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [projectCode, setProjectCode] = useState(projects[0]?.code ?? '');
  const [source, setSource] = useState<'SAP_PS' | 'DATAVERSE'>('SAP_PS');
  const [uploadProject, setUploadProject] = useState(projects[0]?.code ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  async function testConnection() {
    setBusy('test'); setMsg(null);
    try {
      const res = await fetch('/api/integration/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, source }),
      });
      const j = await res.json();
      setMsg({ tone: j.ok ? 'ok' : 'warn', text: j.message ?? (j.ok ? 'Connection OK' : 'Connection failed') });
    } catch { setMsg({ tone: 'err', text: 'Network error' }); }
    setBusy(null);
  }

  async function syncNow() {
    if (!projectCode) { setMsg({ tone: 'warn', text: 'Pick a project first' }); return; }
    setBusy('sync'); setMsg(null);
    try {
      const res = await fetch('/api/integration/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, projectCode, source }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) setMsg({ tone: 'err', text: j.error ?? j.message ?? 'Sync failed' });
      else { setMsg({ tone: 'ok', text: j.message }); router.refresh(); }
    } catch { setMsg({ tone: 'err', text: 'Network error' }); }
    setBusy(null);
  }

  async function resolveException(id: string, status: 'resolved' | 'ignored') {
    setBusy(id);
    try {
      const res = await fetch('/api/integration/exceptions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, id, status }),
      });
      if (res.ok) router.refresh();
    } catch { /* noop */ }
    setBusy(null);
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!uploadProject) { setUploadMsg({ tone: 'err', text: 'Pick a project first' }); return; }
    setUploading(true); setUploadMsg(null);
    try {
      const csv = await file.text();
      const res = await fetch('/api/integration/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, projectCode: uploadProject, csv }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) setUploadMsg({ tone: 'err', text: j.error ?? j.message ?? 'Import failed' });
      else { setUploadMsg({ tone: 'ok', text: j.message }); router.refresh(); }
    } catch { setUploadMsg({ tone: 'err', text: 'Could not read file' }); }
    setUploading(false);
  }

  const msgCls = msg?.tone === 'ok' ? 'text-emerald-700' : msg?.tone === 'warn' ? 'text-amber-700' : 'text-red-600';

  return (
    <div className="space-y-8">
      {/* Import methods */}
      <section>
        <h2 className="text-base font-semibold">Import methods</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* API — live */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">🔌</span>
              <p className="text-sm font-semibold">API integration</p>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">live</span>
            </div>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Source &amp; endpoint</p>
            {canWrite ? (
              <select value={source} onChange={(e) => setSource(e.target.value as 'SAP_PS' | 'DATAVERSE')} className="mb-1.5 w-full rounded-md border bg-background px-2 py-1.5 text-xs">
                <option value="SAP_PS">SAP PS — WBS &amp; cost</option>
                <option value="DATAVERSE">Dataverse — tasks &amp; resources</option>
              </select>
            ) : null}
            <p className="rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-[11px]">{source === 'DATAVERSE' ? 'Dataverse · msdyn_projecttask (Web API, mock)' : 'SAP S/4HANA · API_ENTERPRISE_PROJECT_SRV (BTP, mock)'}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">Last sync: <span className="font-medium">{fmtTime(lastSyncBySource[source] ?? null)}</span></p>
            {canWrite && (
              <div className="mt-3 space-y-2">
                <select value={projectCode} onChange={(e) => setProjectCode(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs">
                  {projects.map((p) => (
                    <option key={p.code} value={p.code}>{p.code} — {p.name}{p.source_system === 'SAP_PS' ? ' · synced' : ''}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={testConnection} disabled={busy !== null} className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50">
                    {busy === 'test' ? 'Testing…' : 'Test connection'}
                  </button>
                  <button type="button" onClick={syncNow} disabled={busy !== null} className="rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50">
                    {busy === 'sync' ? 'Syncing…' : 'Sync now'}
                  </button>
                </div>
                {msg && <p className={`text-[11px] ${msgCls}`}>{msg.text}</p>}
              </div>
            )}
          </div>

          {/* SFTP — configured channel (scaffold) */}
          <div className="rounded-xl border bg-card p-5 opacity-90">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">🗄️</span>
              <p className="text-sm font-semibold">SFTP / file drop</p>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">configured</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Scheduled flat-file (CSV) extracts — common for SAP cost drops. Same mapper &amp; exception pipeline as the API channel.</p>
            <p className="mt-2 text-[11px] text-muted-foreground">Schedule: <span className="font-medium">Daily 02:00</span> · Path: <span className="font-mono">/data/imports</span></p>
          </div>

          {/* Manual upload — file channel (live) */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">⬆️</span>
              <p className="text-sm font-semibold">Manual upload</p>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">live</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Upload a WBS CSV against the published template — runs through the same mapper &amp; exception pipeline as the API channel.</p>
            <a href="/api/integration/template?source=SAP_PS" className="mt-2 inline-block text-[11px] font-medium text-sky-700 underline underline-offset-2">↓ Download WBS template</a>
            {canWrite && (
              <div className="mt-3 space-y-2">
                <select value={uploadProject} onChange={(e) => setUploadProject(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs">
                  {projects.map((p) => (<option key={p.code} value={p.code}>{p.code} — {p.name}</option>))}
                </select>
                <input type="file" accept=".csv,text/csv" onChange={handleUpload} disabled={uploading}
                  className="block w-full text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-background hover:file:opacity-90" />
                {uploading && <p className="text-[11px] text-muted-foreground">Importing…</p>}
                {uploadMsg && <p className={`text-[11px] ${uploadMsg.tone === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{uploadMsg.text}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sync history */}
      <section>
        <h2 className="text-base font-semibold">Sync history</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">New</th>
                <th className="px-3 py-2 text-right font-medium">Updated</th>
                <th className="px-3 py-2 text-right font-medium">Exceptions</th>
                <th className="px-3 py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runs.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No syncs yet.</td></tr>
              ) : runs.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtTime(r.started_at)}</td>
                  <td className="px-3 py-2 text-xs">{r.source_system} · {r.channel}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.project_code ?? '—'}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCls(r.status)}`}>{r.status}</span></td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.rows_inserted}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.rows_updated}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.exceptions > 0 ? <span className="text-amber-700">{r.exceptions}</span> : 0}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Exception queue */}
      <section>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Exception queue</h2>
          {exceptions.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">{exceptions.length} open</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Records that could not be ingested — unmapped WBS, validation, conflicts. Resolve in the source, then re-sync; or ignore.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">External ID</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                {canWrite && <th className="px-3 py-2 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {exceptions.length === 0 ? (
                <tr><td colSpan={canWrite ? 6 : 5} className="px-3 py-6 text-center text-emerald-700">No open exceptions — all clean.</td></tr>
              ) : exceptions.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtTime(e.created_at)}</td>
                  <td className="px-3 py-2 text-xs font-mono">{e.project_code ?? '—'}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">{e.kind}</span></td>
                  <td className="px-3 py-2 text-xs font-mono">{e.external_id ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">{e.reason}</td>
                  {canWrite && (
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => resolveException(e.id, 'resolved')} disabled={busy === e.id} className="rounded-md border px-2 py-1 text-[11px] font-medium transition hover:bg-muted disabled:opacity-50">Resolve</button>
                        <button type="button" onClick={() => resolveException(e.id, 'ignored')} disabled={busy === e.id} className="rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50">Ignore</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
