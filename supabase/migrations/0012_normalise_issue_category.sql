-- =============================================================================
-- Migration 0012 — roll up issues.category into standard PMO groups
-- =============================================================================
-- The seeded issue log had ~99 highly specific free-text categories. Collapse
-- every value to one of 13 standard buckets, matching lib/issue-category.ts
-- canonicalIssueCategory(). The CASE-arm ORDER below mirrors the helper's rule
-- order exactly (first match wins) and was verified against all 99 distinct
-- categories (100/100). Postgres regex: \y = word boundary, ~* = case-insensitive.
-- Idempotent — already-canonical values fall through to 'Other'-safe arms.
-- =============================================================================

update issues
set category = case
  -- 1. Resource / labour (before commissioning, so "commissioning engineer shortage" -> Resource)
  when category ~* 'attrition|shortage|manpower|staffing|recruit|turnover|\ycraft\y|\ylabou?r\y|personnel'
    then 'Resource & labour'
  -- 2. Permit-to-work is a safety system -> HSE (before generic permit)
  when category ~* 'permit.?to.?work'
    then 'HSE & environmental'
  -- 3. Commissioning / startup / testing
  when category ~* 'commission|startup|start-up|start up|first.?fire|energis|energiz|punch.?list|hand.?over|hydrotest|leak test|refractory|\ycure\y|charging|working.?fluid|membrane fouling|\ytraining\y'
    then 'Commissioning & startup'
  -- 4. HSE / safety / environmental
  when category ~* '\yhse\y|safety|h&s|\yehs\y|incident|injur|near.?miss|spill|environment|marine\s*mammal|wildlife|avian|mortality|\yfish\y|emission|noise|dust|odou?r|ecolog|contaminat|hazardous|\ywaste\y|h2s|turbidity|sediment|stormwater|\ybmp\y|containment'
    then 'HSE & environmental'
  -- 5. Permitting / regulatory
  when category ~* 'permit|regulat|consent|licen[cs]e|statutory|notice to proceed|\yntp\y|usace|title v|cultural resource|archaeolog|railroad|crossing'
    then 'Permitting & regulatory'
  -- 6. Procurement / vendor / logistics
  when category ~* 'procure|vendor|supplier|supply|delivery|lead\s*time|sole.?source|purchase\s*order|expedit|logistic|shipment|customs|transit|transport|\yblade\y'
    then 'Procurement & vendor'
  -- 7. Site / geotechnical / civil
  when category ~* 'geotech|soil|ground\s*condition|excavat|demolition|site\s*condition|condition\s*surprise|civil|foundation|piling|\ypile\y|dewater|earthwork|access\s*road|laydown|trench|\yhdd\y|frac.?out|hdpe|pipe pull|cofferdam|utility strike|\ystrike\y|clearing|gen-tie|wellpad'
    then 'Site & geotechnical'
  -- 8. Quality / NDE / inspection
  when category ~* 'quality|\ynde\y|\yndt\y|non.?conformance|\yncr\y|defect|rework|weld|inspection|qa.?qc|material\s*cert|welder'
    then 'Quality & compliance'
  -- 9. Commercial / change / claims
  when category ~* 'commercial|change\s*order|variation|claim|contract|painshare|liquidated|\yld\y|scope\s*change|baseline\s*change|buy america|domestic content'
    then 'Commercial & change'
  -- 10. Stakeholder / communications
  when category ~* 'stakeholder|communicat|client\s*relation|community|public|engagement|landowner|dispute|complaint'
    then 'Stakeholder & communications'
  -- 11. Technical / engineering
  when category ~* 'technical|engineer|design|\ydcs\y|control\s*system|software|configurat|rotor|turbine|\ygt\y|\ygsu\y|electrical|mechanical|piping|\ypipe\y|coating|tie-?in|tie outage|transmission|instrument|scada|interface|specification|drawing|\yrfi\y|p&id|revision|process\s*safety|\ypsm\y|\ymoc\y|tracker|torque|vibration|\yerd\y|\ypump\y|\yvfd\y|corrosion|cooling|brine|diffuser|insulation|intake|membrane|inverter'
    then 'Technical / engineering'
  -- 12. Weather
  when category ~* 'weather|storm|rain|wind|flood|snow|\yice\y|heat|\ycold\y|climate|seasonal|winter'
    then 'Weather'
  -- 13. Schedule / delays
  when category ~* 'schedul|delay|slip|critical\s*path|float|milestone|sequenc|timing|behind\s*plan|overrun|congestion'
    then 'Schedule & delays'
  else 'Other'
end;
