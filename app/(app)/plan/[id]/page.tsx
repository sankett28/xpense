import { notFound } from "next/navigation";
import { getPlanById } from "@/lib/queries/plans";
import { getCycleResetDay } from "@/lib/queries/profile";
import { listCategories } from "@/lib/queries/categories";
import { PlanEditor } from "@/components/plan/PlanEditor";

// Edit an existing plan. In Next 16 dynamic route params are async.
export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [plan, categories, resetDay] = await Promise.all([
    getPlanById(id),
    listCategories(),
    getCycleResetDay(),
  ]);
  if (!plan) notFound();
  return <PlanEditor plan={plan} categories={categories} resetDay={resetDay} />;
}
