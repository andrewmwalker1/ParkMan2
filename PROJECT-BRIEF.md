# ParkMan2 — Project Briefing

**Last updated:** 7 Aug 2026 — initial draft, no code written yet

## Who you're talking to

Andy runs Tree Tops Caravan Park (treetops.co.uk), a family-owned holiday
and lodge sales park near Prestatyn/Holywell in North Wales. He's not a
current full-time developer, but has real history here: he wrote the
original ParkMan himself in VB6 roughly 25 years ago, and spent about 20
years doing desktop app development (VB6/VB.NET/SQL/Access) before
stepping back from software. He's picking modern web/cloud concepts back
up as needed — explain those in plain terms, but don't over-explain core
software/data concepts he already knows cold from his own dev background.

## Origin & why this project exists

- Andy wrote **ParkMan** (VB6) around 25 years ago. It managed
  **Customers, Caravans, Pitches, and Billing** (Pitch Fees, Utilities,
  Rates/Water/Refuse). By his account it was fast and efficient — but
  fat-client only (no web skills at the time), so it couldn't grow with
  the business.
- ParkMan was retired in favour of **CampManager**, a commercial
  cloud-based system. CampManager covers the same ground but, in Andy's
  view, is a weaker solution overall: customer records are "odd" and
  pitch fee billing is "funky." Its utilities handling is regarded as
  genuinely better than ParkMan's original approach, though — worth
  learning from, not just replacing wholesale.
- **ParkMan2** is a modern successor: rebuild what ParkMan did well
  (speed, correct/sane billing logic, clean customer records) as a
  proper web app, informed by what CampManager gets right on utilities.

## What this project is

A staff-facing back-office system for Tree Tops Caravan Park. **v1
audience is Andy and office staff only** — not guests, not contractors.
Those come later, if at all, as separate phases (see Roadmap below).

Core domains, mirroring the original ParkMan:
- **Customers**
- **Caravans**
- **Pitches**
- **Billing** — Pitch Fees, Utilities, Rates/Water/Refuse

## Phasing for v1

Deliberately **phased rather than built all at once**, since billing
logic is only as good as the records underneath it:

1. **Phase 1 — Core records:** Customers, Caravans, Pitches. Get the
   data model right and usable first.
2. **Phase 2 — Billing:** Pitch Fees, Utilities, Rates/Water/Refuse,
   once Phase 1 is solid.

## Longer-term roadmap (not in scope for v1 — noted so future sessions know what's coming)

- **Customer portal:** guests/owners eventually able to view their
  bills, and potentially self-report gas/electric meter readings to
  generate bills on demand.
- **Maintenance integration:** pull functionality in from the sister
  [Maintenance app](../treetops-maintenance) so work carried out on
  pitches/caravans can be tracked, quoted, and billed through ParkMan2
  rather than being a separate system.
- **Possible multi-business future:** if other CampManager users show
  interest, each business would get its **own separate Supabase
  project/database** — not shared multi-tenant tables. The app would
  need a config/lookup layer to determine which database a given
  deployment points at. **Not being architected for now** — noted so
  early data-model decisions don't accidentally paint this into a
  corner, but not a design constraint yet.
- **Professional handoff:** Andy's long-term intent is to eventually
  hand this to professional software developers to harden to a
  commercial security standard. This doesn't mean picking an unfamiliar
  stack now — it means building with that bar in mind from day one (see
  Tech stack below), so it's a good foundation to inherit rather than a
  rewrite candidate.

## Tech stack

Same pattern as the sister Hub and Maintenance apps, chosen deliberately
for consistency and because both Andy and this assistant already have a
proven, working setup for it:

- **Frontend:** React + Vite.
- **Backend:** Supabase (Postgres + Auth + Storage).
- **Hosting/deploy:** GitHub Pages, deployed via GitHub Actions on push
  to `main`.

Built with the eventual professional handoff in mind from the start,
not as an afterthought:
- **RLS on every table**, no exceptions.
- **`security definer` Postgres functions** for any privileged write
  path — never grant the anon/authenticated key direct table
  privileges.
- **Real Supabase Auth for staff sign-in** (magic link + OTP code,
  matching the pattern already proven in Hub and Maintenance) — no
  PIN-style shortcuts, even for v1.
- Data model informed by what CampManager does well (particularly
  utilities), not designed for CampManager import compatibility yet —
  that's a separate, later question (see Open questions).

## Repo & hosting

- Local repo: `C:\Users\andy\Documents\GitHub\ParkMan2`
- GitHub: [`andrewmwalker1/ParkMan2`](https://github.com/andrewmwalker1/ParkMan2)
- Supabase project: not yet created.
- No code written yet as of this writing — repo currently contains only
  this file and a placeholder README.

## Data model (draft)

Confirmed so far (Andy's own description, 6 Aug 2026):

- A **Business** owns one or more **Parks**.
- A **Park** has one or more **Pitches**.
- A **Business** has one or more **Customers** — Customer sits at the
  Business level, not the Park level (see "Customer scope" below for
  why).
- A **Pitch** has one or more **Meters**. Each Meter has a **type**:
  currently Gas or Electric, with Water planned. A pitch typically has
  one meter of each type, but the model must allow more than one of the
  same type (e.g. a second electric meter for an EV charger or a hot
  tub) — so Meter is its own table (`pitch_id` + `type`), not a fixed
  set of columns on Pitch.
- **Caravan is its own entity**, not owned inline by a Customer or fixed
  to a Pitch — because ownership and location both change over time and
  need history, not just a current-state column:
  - **Ownership** (`caravan_id, customer_id, start_date, end_date`) —
    a resold caravan is a new Ownership row on the *same* Caravan
    record (old row's `end_date` set); a replaced caravan is a brand
    new Caravan record with its own Ownership rows. Current owner is
    the row with no `end_date`.
  - **Placement** (`caravan_id, location_type, pitch_id` [nullable],
    `start_date, end_date`) — `location_type` is one of Pitch /
    Storage / Display (sale area) / Off-park. Covers pitch moves,
    storage gaps between owners, and caravans on display before being
    sited. Pitch fee billing only applies while a Placement has
    `location_type = 'pitch'` and is current. "What's currently on this
    pitch" is derived from the open Placement row, not a `caravan_id`
    column on Pitch — one source of truth instead of two things that
    could disagree.
  - A Customer having zero current Ownership rows covers both a
    prospective customer and a former customer who has left.

### Areas, Bands & Services (added 6 Aug 2026, from a real Tree Tops pitch-fee sheet)

Parks are commonly split into named sub-areas, and pitch fees vary by a
priced "Band" within each area — confirmed against a real Tree Tops
example (Old Park, Parc Newydd, Orchard Meadow, Ynys Hir, each with
several numbered bands at different prices).

- **Area** (`park_id, name`) — a named sub-area of a Park.
- **PitchBand** (`area_id, code`) — a stable, named pricing tier within
  an Area (e.g. `OM-Band 1`). Multiple bands stay in active use at once
  because existing customers keep whatever Band they joined on —
  **Band only changes if a caravan physically moves to a different
  pitch**, never on a resale/ownership change.
- **PitchBandRate** (`pitch_band_id, year, annual_fee,
  is_target_for_new_customers`) — Band prices are revised most years
  (Tree Tops uses an arbitrary adjustment rather than a fixed formula;
  some parks may use a flat %), so price needs its own year-by-year
  history rather than a single current-price column on Band. Exactly
  one Band per Area is typically flagged
  `is_target_for_new_customers = true` for a given year — the band new
  sign-ups get assigned to; that flag can move to a different Band in
  a later year without touching historical rows.
- **Pitch** gains `pitch_band_id`.

The real Tree Tops sheet also had bands like `PN-Band 3 & Sky` and
`PN-Band Lodge + No Sky` priced independently of their plain
counterparts, which looked at first like Sky TV / no-Sky should be
composable attributes layered on top of a Band. **They're not** — the
pricing doesn't follow any consistent formula (in one case "& Sky" is
cheaper than plain, in another "No Sky" is more expensive than plain),
because they were separate bands created as a workaround for the
original ParkMan being unable to add a billed extra on top of a band.
"No Sky" itself is a dead leftover from an old TV system change, safe
to ignore entirely. **ParkMan2 replaces this properly** — see Services
below — rather than repeating the same workaround.

- **Service** (lookup: e.g. Sky TV, Premium WiFi, future extras like EV
  charging) — a billable extra, independent of Band.
- **ServiceRate** (`service_id, year, price`) — same year-versioned
  pricing pattern as PitchBandRate.
- **PitchService** (`pitch_id, service_id, start_date, end_date`) — the
  subscription record; a pitch can have several active Services at
  once. Billing resolves who pays the same way it resolves Pitch Fee:
  whoever currently holds that pitch's tenancy.

This directly replaces Tree Tops' current manual process of hand-adding
a Premium WiFi charge to each bill every year (more than half of
customers have it) — the annual billing run instead just reads active
`PitchService` rows and generates the line item automatically.

**Resolved (6 Aug 2026, corrected same day):** not uniform across
Services — depends on the Service itself, so `Service` gains a
`follows` attribute with three possible values, not two:
- `follows: pitch` — e.g. **Sky TV**, physically wired to the plot,
  stays behind when a caravan moves (a real "wires come out of the
  ground" constraint). New occupant inherits it or starts fresh.
- `follows: caravan` — e.g. **Premium WiFi**, kit physically bolted to
  the outside of the unit itself, not to the person. Goes wherever
  *that specific Caravan* goes on a pitch move (this is why it looked
  at first like it "follows the customer" — their caravan physically
  relocated, kit went with it) — but stays attached through a resale,
  since it's the same physical Caravan record with a new owner, and
  does **not** carry over to a brand-new replacement Caravan if the old
  unit is taken away.
- `follows: customer` — kept as a supported option for anything that
  might genuinely follow the person rather than any piece of kit,
  though neither Sky nor WiFi actually needs it.

Subscription rows anchor to whichever single thing their Service
follows — `pitch_id` for Sky, `caravan_id` for WiFi — rather than
storing multiple references on every row. "Who currently pays" or
"which pitch it's currently at" for a `follows: caravan` Service is
derived through the Caravan's existing Ownership/Placement chain when a
bill needs to know, not duplicated on the subscription record itself.

Real-world WiFi move/install costs came up alongside this — **£300 for
a new install, £100 to move existing kit**. These are one-off charges,
distinct from the recurring annual `ServiceRate`, and the first concrete
case for the `Bill`/charge-type idea from earlier needing to support
one-off charges (e.g. "Service Install," "Service Move") alongside
recurring ones (Pitch Fee, Utilities). Not fully designed yet — Billing
itself hasn't been built out in detail — but worth keeping in mind once
it is.

**Infrastructure present vs. currently active (6 Aug 2026):** a Pitch
can have a Sky connection wired, or a Caravan can have WiFi kit fitted,
without the current customer wanting it switched on — e.g. a caravan
bought secondhand with WiFi kit already on it that the new owner
doesn't activate. This doesn't need a new column or flag: "has the
infrastructure ever been installed here" is just "has a `PitchService`
row ever existed for this Pitch/Caravan + Service, active or not."
No row has ever existed → never installed → activating means a real
install charge. A row exists with an `end_date` set (previously
deactivated, or inherited un-activated from a resale) → kit's already
there → reactivating just opens a new dated row, no fresh install
charge. The billing logic checks history before deciding whether an
activation triggers an install fee — the data model itself doesn't
change.

### Utilities — reading, rates & billing cycle (added 6 Aug 2026)

**Current process (CampManager), and what's wrong with it:** readings
are collected on a walk-round with a clipboard against a list Andy
prints himself (not from CampManager). CampManager exports a CSV of
last readings, staff stage new readings in Excel to sanity-check them
(catching readings that are implausibly high, implausibly low/zero, or
*lower than the previous reading*) before importing back — because once
committed in CampManager, it's final. Gas and Electric come as two
separate CampManager sheets even though they're read together on the
same walk. **ParkMan2 should replace this properly**, not just port it:

- **Reading Round** — a batch of readings, with a draft → review →
  commit workflow mirroring the rate roll-forward tooling above.
  Automatic validation flags (too high, too low/zero, lower than
  previous) replace the manual Excel staging step. Confirmed against a
  real CampManager screenshot (6 Aug 2026): its batch grid — one row
  per meter, previous reading shown read-only, new reading/date
  editable, Units Used/Total calculated live — is a good shape worth
  keeping; "apart from the fact it posts live" (Andy's words) was the
  *only* complaint, which the draft → review → commit workflow already
  fixes. That screenshot's "Wizard" button turned out to be a
  **bulk default-setter** (sets date, unit cost, and VAT% across every
  row in the batch in one go), not a mobile one-at-a-time flow as first
  assumed — worth keeping as a feature (a faster starting point than
  filling in every row), separate from the point below.
- **Gas + Electric entered together per pitch** — one screen per pitch
  showing both meters, matching how the walk actually happens, not
  CampManager's artificial split.
- **Tablet/phone entry during the walk** — a genuinely wanted
  improvement ("would be lovely"), replacing both the printed list and
  the later Excel re-entry in one go. Same responsive web app approach
  already proven in Hub and Maintenance, no native app needed. The
  system generates the walk-round list too (ordered by Area/pitch,
  matching the physical route) rather than Andy maintaining his own.
  This is a genuinely separate feature from the Wizard bulk-set tool
  above, not the same thing.
- Each `MeterReading` stores its date; bills need to show the **start
  date, end date, and number of days between** the two readings a
  charge covers, not just the total.
- **Lower-than-previous readings can be legitimate** (meter replaced or
  rolled over) — not always an error. *(Open: confirm whether this
  should flag-and-block pending manual override, or just flag for
  review — leaning toward the latter given it's a real, if
  infrequent, occurrence.)*

**Reading Rounds happen for three different reasons, not just one
schedule:**
1. **Scheduled, twice yearly** — roughly July/August (timing is a
   judgment call based on how much usage has accumulated that summer,
   not a fixed date) and the day after the park closes for the season
   (7 December).
2. **Rate change** — whenever a supplier changes prices, a reading
   round and billing run happens immediately **at the old rate**,
   before the new rate takes effect, "to be fair to the customer." This
   is why `UtilityRate` needs a real **effective-from date**, not a
   `year` column like Bands/Services — supplier price changes don't
   follow an annual cycle.
3. **Event-triggered (Join/Leave/Move)** — ties directly to the
   Ownership/Placement history already in the model. A **Leave** closes
   an Ownership row and generates a final bill. A **Move** closes the
   Placement on the old pitch (final reading + bill for that pitch) and
   opens a new Placement on the new pitch with an **opening reading**
   recorded but no bill yet, since nothing's been consumed there. A
   **Join** likely needs an opening reading too, to give future billing
   a genuine starting point. *(Open: confirm this for Join.)*

**Rate structure:** flat cost per unit, no standing charge currently
(Tree Tops used to have a per-day "availability charge," calculated
from days since the last bill — not used now, but worth leaving room
for rather than designing it out). Rate doesn't vary by Area, but *can*
vary by Park within a Business. Electric's profit regulation is
**explicitly out of scope for the system to enforce** — "too many
variables, best left to the accountants" (Andy, 6 Aug 2026); no
validation logic needed here.

**Rate selection is explicit per Reading Round, not auto-detected** —
confirmed 6 Aug 2026 against a real CampManager screenshot. There's a
genuine timing gap between a supplier changing a rate, the reading
actually being taken, and the data reaching the system, so `Reading
Round` (see below) captures its own **unit cost and VAT%** directly as
an editable snapshot — pre-filled as a suggested default from
`UtilityRate`/Park VAT settings, but always overridable — rather
than the Round holding a locked reference back to a rate-history row.
This keeps historical bills accurate forever regardless of what the
"official" rate list says happened at that date.

**VAT is genuinely variable, confirmed 6 Aug 2026:** Tree Tops has HMRC
agreement for **5%** VAT on utility resale under an agreed domestic-use
ruling; a business without that same agreement would have to charge the
standard **20%**. Modelled as a **default VAT rate at the Park level**
(corrected from Business — an HMRC domestic-use agreement is granted
per-site, so a second Park under the same Business isn't guaranteed the
same ruling) as a sensible starting suggestion that any given Reading
Round can override — same mechanism as the unit cost above, not a separate
system.

**Billing cycle:**
- **Pitch Fees** — pitch-fee year starts **1 March**. Batch billed every
  **January** (for the upcoming season) to all existing customers, due
  **February**. Mid-year joiners are **not** part of that batch — they
  get an individual invoice created at the point they join, pro-rated
  to the end of the current pitch-fee year (end of February), then join
  the normal January batch run like everyone else from then on.
- **Utilities** — the two scheduled rounds above (summer, post-closing),
  plus ad-hoc runs whenever a rate change or a Leave/Move forces one.
- **Delivery** — mostly email, but some customers require a paper copy
  — needs a per-customer delivery preference, and the system needs to
  produce a genuinely printable bill, not just an email-shaped one.

### Rates, Water & Refuse (confirmed 6 Aug 2026)

- Calculated externally by the accountant as one supplied figure — not
  something the system calculates independently.
- Runs its own annual cycle, **1 July to 30 June** — a different,
  **offset** calendar from the Pitch Fee year (1 March). These are two
  genuinely separate annual cycles running at once, not one shared
  calendar — worth being deliberate about this in the model so it's
  never accidentally conflated.
- Billed in **June**, due **1 July** — same "bill in advance of the
  period" shape as Pitch Fee's Jan-bill/Feb-due/March-start pattern.
- Mid-cycle joiners are pro-rated from their actual start date to 30
  June — confirms the billing engine needs genuine day-based proration
  as a real, currently-needed capability.
- Does not vary by Area (per Andy, though whether it varies by pitch
  type/size, e.g. Lodge vs standard, wasn't explicitly addressed —
  assumed uniform for now unless corrected).
- Currently shown as **narrative text** on the bill (one combined
  figure described in words), but Andy noted it could instead be shown
  as **three separate line items** (Rates / Water / Refuse) if the
  system supported it — worth capturing as up to three distinct amounts
  even if the bill layout defaults to a combined presentation, so
  itemised display is possible without a data model change later.
- **Configuration, not universal:** some parks roll Rates/Water/Refuse
  into the Pitch Fee bill entirely rather than billing it separately —
  a genuine per-Park/Business choice, not a Tree Tops-specific constant.

**Resolved (6 Aug 2026) — corrects the "welcome invoice" assumption
above:** new-joiner billing is **discretionary and negotiated**, not an
automatic pro-rata invoice. In practice at Tree Tops:
- Pitch Fee for the remainder of the season is typically folded into
  the caravan's purchase price/sale negotiation, rather than billed as
  a separate system charge.
- Rates/Water/Refuse usually isn't billed until the next scheduled
  round, even though pro-rata is technically possible.
- The WiFi install fee (£300) and ongoing usage charge are "often a
  negotiation tool" — may be charged, waived, or deferred to the next
  January round, at staff's discretion, case by case.

**Design implication:** the system must not auto-generate a rigid
invoice the moment someone joins. A joining workflow should instead
**surface the calculated pro-rata figures as a reference/suggestion**
for each charge type (Pitch Fee, RWR, Service fees), while giving staff
full discretion per line to charge now, waive entirely, or defer to the
next scheduled round — matching how sales negotiations actually work.

### A running pattern worth naming

Andy will flag, wherever he has the knowledge, both **"how Tree Tops
does it"** and **"how other parks might do it differently."** Useful
signal throughout this brief: where both are given, treat the behaviour
as genuine per-Park/Business configuration rather than a universal
rule. Already applied to: rate increase method (% vs arbitrary amount),
VAT rate (5% agreed vs 20% standard), and Rates/Water/Refuse billed
separately vs rolled into Pitch Fee.

### Purchase & Licence Agreement — real document reviewed (7 Aug 2026)

Andy shared Tree Tops' actual "Purchase & Licence Agreement" Word
template. Building document generation from templates (this one, plus
an offer-to-purchase letter, transfer-of-ownership document, and both
blank and templated emails) is explicitly **a later feature, for once
customer/pitch/caravan data is in place, tied to a future onboarding
wizard** — not building it now. But the document itself contains real
facts that belong in the data model immediately:

- **Transfer Fee** — a new charge type: 15% of resale price + VAT,
  charged when a caravan is sold on its pitch to a new owner. Waived if
  the new owner is a qualifying **Family Member** (spouse, civil
  partner, parent, grandparent, child, grandchild, sibling, or their
  spouse) — a distinct, fee-free variant of an Ownership transfer.
- **Insurance Check Fee** — another new charge type: £35 + VAT/year,
  but only charged when a customer uses an independent insurer rather
  than one the park introduces. Implies a real **Insurance** concept
  needs tracking per Caravan: insurer, proof/renewal date, £5m minimum
  public liability cover, and whether it's the "independent" path that
  triggers this fee.
- **Licence Agreements have a genuine fixed end date** (the example
  showed a ~27-year term, 2013–2040) — not open-ended until someone
  leaves. Worth reflecting as a real field on Ownership/Placement
  rather than assuming indefinite duration.
- **Pitch Fee Year confirmed as the open season, not 12 months** — 1
  March to 7 December, matching when the park is actually open.
  Billing itself happens in the preceding January — refines, doesn't
  contradict, what's above.
- **A refund scale for early Licence termination** — not simple
  day-count pro-rata. Banded by how many months into the Pitch Fee Year
  the termination falls (80% in month 1, sliding to 0% by month 8, and
  no refund at all after 30 June regardless of month). A distinct rule
  from the day-based utilities proration, needed specifically for the
  Leave/refund case.
- **Rates calculation may be a real formula, not just a handed-over
  figure** — the document states Rates is "the total of these charges
  for the Park for the previous Rates Year, divided by the number of
  occupied pitches at the start of that Rates Year." This appears to
  differ from what Andy described earlier (accountant hands over one
  figure). *(Open: confirm whether that division is the actual current
  process — accountant does the division and hands over the per-pitch
  result — or whether the contract describes the legal basis while
  practice is simpler.)*
- **"Pitch Services" is the contract's umbrella term** for Water,
  Electricity, Gas, Grounds maintenance, Sewerage, Waste management,
  and Wi-Fi — each flagged per-agreement as included in the Pitch Fee,
  an extra charge, or not available. Wider than the Utilities/Services
  split built so far, though the underlying billing *mechanism* still
  needs to differ (metered Reading Rounds vs flat Service subscription)
  regardless of how the contract frames them together.
- **VAT is pervasive** — every charge type in the document carries VAT
  (Pitch Fee, Rates, Transfer Fee, Insurance Check Fee), not just
  Utilities. Reinforces that VAT treatment belongs at the general
  Bill/charge-type level, not narrowly scoped to Utilities alone.

### Billing — rate management tooling (Phase 2)

Real operational requirements, not just data model:

- **Roll-forward tool** — generate next year's `PitchBandRate` /
  `ServiceRate` rows from the current year's, as an editable draft
  rather than starting blank.
- **Bulk update** — apply a flat **%** or flat **£** increase across
  **all** rates at once, with per-row manual override afterward for
  individual bands that need a different figure. (Not scoped to one
  Area or a hand-picked subset — always applies globally, then
  fine-tune individual rows.)
- **CSV export** — pull the draft rate table out to model scenarios in
  Excel.
- **CSV import** ("would be an amazing add-on" — Andy, 6 Aug 2026) — 
  bring the modelled numbers back in to apply directly, rather than
  Excel being read-only for sense-checking. Worth building, but not a
  blocker for Phase 2 being usable — export + manual re-entry works as
  a fallback if import doesn't make the first cut.

### Leads (separate from Customer)

Andy manages a sales pipeline — enquiry → visit → sale — for people who
haven't bought a caravan yet, and is deliberately keeping this **out of
the Customer file**, since lead records may only have partial
information (name/phone, not a full customer record). Planned as its
own lightweight `Lead` entity (status: enquired / visited / sold / lost)
that can convert into a real Customer once a sale completes, rather than
folding prospects into Customer with a bunch of nullable fields. Not
Phase 1 or 2 — noted here so the roadmap accounts for it.

### Resolved modelling questions (6 Aug 2026)

- **Caravan resale on the same pitch:** both cases happen — same
  caravan resold, or old caravan replaced by a new one. Handled by the
  Ownership/Placement split above: same-record resale is a new
  Ownership row; replacement is a new Caravan record.
- **Pitch history:** yes, caravans move pitches, sit in storage between
  owners, and may sit in a display/sale area before being sited —
  covered by Placement's `location_type`.
- **Waiting list:** real need exists (enquiry → visit → sale pipeline),
  but deliberately not part of Customer — see Leads above.
- **Customer scope:** confirmed a person can be a Customer at more than
  one Park (common in bigger groups), including briefly owning at two
  Parks during a transfer between them. Since a Business's Parks,
  Customers, Pitches, and Caravans all live in **one database per
  Business** (confirmed 6 Aug 2026 — not per-Park), Customer sits at
  the Business level, and its link to a specific Park is transitive:
  Customer → Ownership → Caravan → Placement → Pitch → Park. The
  "briefly owns at two parks" case falls out for free as two
  simultaneously-open Ownership/Placement chains — no special-casing
  needed.

## Open questions / not yet decided

- Billing calculation rules — how Pitch Fees, Utilities, and
  Rates/Water/Refuse actually get calculated in practice.
- Whether Ownership/Placement history is needed in full from Phase 1,
  or whether a simpler current-state-only version ships first with
  history added later — a build-sequencing question, not a modelling
  one, to revisit once implementation starts.
- Whether/how to eventually import data from CampManager, and whether
  an onboarding tool for other CampManager users is ever worth building
  (raised as a possibility, not committed to).
- Staff auth specifics (assumed: same magic-link + OTP pattern as Hub —
  to be confirmed once auth is actually built).
