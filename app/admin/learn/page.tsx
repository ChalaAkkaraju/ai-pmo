/**
 * Admin → Learn content. Set who sees each Learn menu item. Admins always see
 * everything; this controls what every other role sees in the menu and can
 * reach by URL (pages guard on the same rules via lib/learn-content).
 */
import { getAllLearnItems } from '@/lib/learn-content';
import { ROLE_TYPES, roleLabel } from '@/lib/roles';
import { setLearnVisibility } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Learn content · AI PMO' };

const ASSIGNABLE = ROLE_TYPES.filter((rt) => rt !== 'admin');

export default async function LearnAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const items = await getAllLearnItems();

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Learn content visibility</h1>
        <p className="text-sm text-muted-foreground">
          Choose who sees each Learn menu item. Admins always see everything. Hidden items are also
          blocked by URL, not just removed from the menu.
        </p>
      </div>

      {sp.ok && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved.</p>
      )}
      {sp.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <form key={item.key} action={setLearnVisibility} className="rounded-lg border bg-card p-4">
            <input type="hidden" name="key" value={item.key} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">/{item.path}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Visibility</label>
                <select
                  name="visibility"
                  defaultValue={item.visibility}
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                >
                  <option value="everyone">Everyone</option>
                  <option value="admin">Admin only</option>
                  <option value="roles">Specific roles</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </div>
            <fieldset className="mt-3 border-t pt-3">
              <legend className="text-[11px] text-muted-foreground">
                Roles (used only when &quot;Specific roles&quot; is selected)
              </legend>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {ASSIGNABLE.map((rt) => (
                  <label key={rt} className="inline-flex items-center gap-1.5 text-xs">
                    <input type="checkbox" name="roles" value={rt} defaultChecked={item.allowed_roles.includes(rt)} />
                    {roleLabel(rt)}
                  </label>
                ))}
              </div>
            </fieldset>
          </form>
        ))}
      </div>
    </div>
  );
}
