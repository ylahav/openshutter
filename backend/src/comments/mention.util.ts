/** @handles in comment body — usernames are lowercase in DB */
const MENTION_RE = /@([a-z0-9._-]{2,64})/gi;

export function extractMentionUsernames(body: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, MENTION_RE.flags);
  while ((m = re.exec(body)) !== null) {
    const u = m[1]?.toLowerCase().trim();
    if (u) out.add(u);
  }
  return [...out];
}
