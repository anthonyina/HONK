// NOTE: intentionally NOT importing "server-only" — this module is consumed by a
// Pages Router API route (src/pages/api/submit.ts) where the server-only guard
// throws under Turbopack. It is only ever imported by server code (that handler
// and the /api/honk-clients App Router route), never by a client component, so
// the ATLASSIAN_API_TOKEN is never bundled client-side.
import { HONK_CLIENTS } from "@/app/lib/intake-types";

/**
 * Source of truth for the "HONK account" picker (Jira customfield_10686).
 *
 * The option list lives in Jira and is edited there, so we fetch it live from
 * createmeta rather than hardcoding. Any value sent on submit that is not a
 * current Jira option triggers a 400 "Specify a valid value for HONK account",
 * so both the dropdown and the submit-time guard read from this one function.
 *
 * HONK_CLIENTS (intake-types.ts) is kept only as an offline fallback for when
 * Jira is unreachable or env vars are missing.
 */

const CUSTOM_FIELD_ID = "customfield_10686";
const ISSUE_TYPE_ID = "10034"; // "Idea"
const TTL_MS = 60 * 60 * 1000; // 1h

let cache: { values: string[]; expires: number } | null = null;

function getAuthHeader() {
  const email = process.env.ATLASSIAN_EMAIL!;
  const token = process.env.ATLASSIAN_API_TOKEN!;
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

/**
 * Returns the current valid "HONK account" option values. Cached for an hour.
 * Falls back to the hardcoded HONK_CLIENTS list on any failure so the form
 * still works offline.
 */
export async function getHonkClients(): Promise<string[]> {
  if (cache && cache.expires > Date.now()) return cache.values;

  const siteUrl = process.env.ATLASSIAN_SITE_URL;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  if (!siteUrl || !projectKey) return [...HONK_CLIENTS];

  try {
    const url = `https://${siteUrl}/rest/api/3/issue/createmeta/${projectKey}/issuetypes/${ISSUE_TYPE_ID}`;
    const res = await fetch(url, {
      headers: { Authorization: getAuthHeader(), Accept: "application/json" },
    });
    if (!res.ok) {
      console.error("HONK account options fetch failed", { status: res.status });
      return cache?.values ?? [...HONK_CLIENTS];
    }
    const data = (await res.json()) as {
      fields: { fieldId: string; allowedValues?: { value: string }[] }[];
    };
    const field = data.fields.find((f) => f.fieldId === CUSTOM_FIELD_ID);
    const values = (field?.allowedValues ?? [])
      .map((o) => o.value)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    if (values.length === 0) return cache?.values ?? [...HONK_CLIENTS];

    cache = { values, expires: Date.now() + TTL_MS };
    return values;
  } catch (err) {
    console.error("HONK account options fetch error", err);
    return cache?.values ?? [...HONK_CLIENTS];
  }
}

/** Whether a client name is a currently-valid Jira option. */
export async function isValidHonkClient(name: string): Promise<boolean> {
  const values = await getHonkClients();
  return values.includes(name);
}
