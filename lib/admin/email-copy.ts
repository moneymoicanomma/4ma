export function buildCommaSeparatedEmailList(emails: readonly string[]) {
  const uniqueEmails = new Set<string>();

  for (const email of emails) {
    const normalized = email.trim().toLowerCase();

    if (normalized && normalized !== "—") {
      uniqueEmails.add(normalized);
    }
  }

  return Array.from(uniqueEmails).join(", ");
}
