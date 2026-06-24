import { getCycleResetDay } from "@/lib/queries/profile";
import { listCategories } from "@/lib/queries/categories";
import { PlanEditor } from "@/components/plan/PlanEditor";

// Create a brand-new plan (seeded with all categories at ₹0).
export default async function NewPlanPage() {
  const [categories, resetDay] = await Promise.all([
    listCategories(),
    getCycleResetDay(),
  ]);
  return <PlanEditor plan={null} categories={categories} resetDay={resetDay} />;
}
