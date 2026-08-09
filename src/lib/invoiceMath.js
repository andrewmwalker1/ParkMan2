// ParkMan2 -- invoice line VAT math. Andy, 9 Aug 2026: "If i enter a net
// amount and select a vat rate the vat amount and gross should be
// calculated. If it change the gross amount the net and the vat amount
// should be calculated." Net and Gross are the two "drive" fields; VAT is
// always derived, never typed directly.

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcFromNet(net, ratePercent) {
  const vat = round2(net * (ratePercent / 100));
  return { vat, gross: round2(net + vat) };
}

export function calcFromGross(gross, ratePercent) {
  const net = round2(gross / (1 + ratePercent / 100));
  return { net, vat: round2(gross - net) };
}

export function sumLines(lines) {
  return lines.reduce(
    (totals, l) => ({
      totalNet: round2(totals.totalNet + (Number(l.net_amount) || 0)),
      totalVat: round2(totals.totalVat + (Number(l.vat_amount) || 0)),
      totalGross: round2(totals.totalGross + (Number(l.gross_amount) || 0)),
    }),
    { totalNet: 0, totalVat: 0, totalGross: 0 }
  );
}
