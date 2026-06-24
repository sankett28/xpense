import { ensureDefaultPlan, getActivePlan, listPlans } from "@/lib/queries/plans";
import { getActiveTrip } from "@/lib/queries/trips";
import { getPlanById } from "@/lib/queries/plans";
import { PlansHub } from "@/components/plan/PlansHub";

// Plans hub: list every saved plan, mark/switch the active one, create / edit /
// delete / duplicate, and start a vacation.
export default async function PlanPage() {
  await ensureDefaultPlan();
  const [plans, activePlan, activeTrip] = await Promise.all([
    listPlans(),
    getActivePlan(),
    getActiveTrip(),
  ]);

  // Sum each plan's allowances for the "saves ₹X" line on its card.
  const allowanceTotals: Record<string, number> = {};
  for (const p of plans) {
    const full = await getPlanById(p.id);
    allowanceTotals[p.id] = (full?.allowances ?? []).reduce(
      (s, a) => s + Number(a.amount),
      0,
    );
  }

  return (
    <PlansHub
      plans={plans}
      activePlan={activePlan}
      allowanceTotals={allowanceTotals}
      activeTrip={activeTrip}
    />
  );
}
