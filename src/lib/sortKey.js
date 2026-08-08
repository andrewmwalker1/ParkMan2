// Suggests a padded sort key from a display Number, e.g. "A16" -> "A0016",
// so pitches sort correctly (A2, A10 rather than A10, A2) without forcing
// the padded form to be the visible number too -- restores real ParkMan
// behaviour that CampManager broke (see PROJECT-BRIEF.md). Editable, not
// enforced -- this is just a starting suggestion.
export function suggestSortKey(number) {
  return (number || "").replace(/\d+/g, (digits) => digits.padStart(4, "0"));
}
