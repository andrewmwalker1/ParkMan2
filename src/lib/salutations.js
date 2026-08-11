// Builds "Dear ..." and address salutations from a customer record's
// name fields. Shared by CustomerDetail.jsx and UnitDetail.jsx's
// CustomerCard so the two "build from names" buttons behave identically.

export function buildCorrespondenceSalutation(form) {
  const f1 = (form.customer1_first_name || "").trim();
  const f2 = (form.customer2_first_name || "").trim();
  if (!f1) return "";
  return f2 ? `${f1} & ${f2}` : f1;
}

export function buildAddressSalutation(form) {
  const t1 = (form.customer1_title || "").trim();
  const f1 = (form.customer1_first_name || "").trim();
  const s1 = (form.customer1_surname || "").trim();
  const t2 = (form.customer2_title || "").trim();
  const f2 = (form.customer2_first_name || "").trim();
  const s2 = (form.customer2_surname || "").trim();

  if (!s1) return "";
  if (!s2) return [t1, s1].filter(Boolean).join(" ");

  if (s1.toLowerCase() === s2.toLowerCase()) {
    return [[t1, t2].filter(Boolean).join(" & "), s1].filter(Boolean).join(" ");
  }

  const part1 = [t1, f1 ? `${f1[0]}.` : "", s1].filter(Boolean).join(" ");
  const part2 = [t2, f2 ? `${f2[0]}.` : "", s2].filter(Boolean).join(" ");
  return `${part1} & ${part2}`;
}

export function buildMailto(form) {
  const to = (form.customer1_email || "").trim();
  const cc = form.customer2_receives_billing && (form.customer2_email || "").trim() ? form.customer2_email.trim() : "";
  const salutation = (form.correspondence_salutation || "").trim() || buildCorrespondenceSalutation(form);
  const params = new URLSearchParams({ body: `Dear ${salutation || "Sir/Madam"},\n\n` });
  if (cc) params.set("cc", cc);
  return `mailto:${to}?${params.toString()}`;
}
