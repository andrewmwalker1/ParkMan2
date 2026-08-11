import { supabase } from "./supabaseClient.js";

// Best-effort lookup of a customer's currently sited pitch/caravan, for
// screens (the standalone Customer screen) that don't already have this
// loaded -- used only to fill pitch/caravan letter tags and name the
// letter folder. Takes the first active ownership match; a customer who
// owns more than one sited static is a rare edge case not worth
// surfacing here.
export async function resolveCustomerPitchAndCaravan(customerId) {
  const { data: ownerships } = await supabase
    .from("ownership")
    .select("caravan_id")
    .or(`primary_customer_id.eq.${customerId},secondary_customer_id.eq.${customerId}`)
    .is("end_date", null)
    .limit(1);

  const caravanId = ownerships?.[0]?.caravan_id;
  if (!caravanId) return { pitch: null, caravan: null };

  const { data: caravan } = await supabase.from("caravan").select("*").eq("id", caravanId).single();

  const { data: placement } = await supabase
    .from("placement")
    .select("pitch_id")
    .eq("caravan_id", caravanId)
    .is("end_date", null)
    .maybeSingle();

  if (!placement?.pitch_id) return { pitch: null, caravan: caravan || null };

  const { data: pitch } = await supabase
    .from("pitch")
    .select("id, number, area:area_id(name), type:type_id(name), status:status_id(name)")
    .eq("id", placement.pitch_id)
    .single();

  return { pitch: pitch || null, caravan: caravan || null };
}
