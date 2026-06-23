import { ensureDefaultPlan, getActivePlan, listPlans } from "@/lib/queries/plans";
import { getCycleResetDay } from "@/lib/queries/profile";
import { listCategories } from "@/lib/queries/categories";
import { PlanEditor } from "@/components/plan/PlanEditor";

// Plan: the centerpiece. The user authors salary + per-category allowances; the
// savings goal is derived live (salary − allowances − buffer).
export default async function PlanPage() {
  await ensureDefaultPlan();
  const [activePlan, plans, categories, resetDay] = await Promise.all([
    getActivePlan(),
    listPlans(),
    listCategories(),
    getCycleResetDay(),
  ]);

  return (
    <PlanEditor
      activePlan={activePlan}
      plans={plans}
      categories={categories}
      resetDay={resetDay}
    />
  );
}
