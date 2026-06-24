import { getActiveTripWithSpend } from "@/lib/queries/trips";
import { listItems } from "@/lib/queries/items";
import { listCategories } from "@/lib/queries/categories";
import { TripView } from "@/components/vacation/TripView";
import { StartTripGate } from "@/components/vacation/StartTripGate";

// /vacation: shows the active trip, or a prompt to start one.
export default async function VacationPage() {
  const trip = await getActiveTripWithSpend();
  if (!trip) return <StartTripGate />;

  const [items, categories] = await Promise.all([listItems(), listCategories()]);

  return <TripView trip={trip} categories={categories} recentItems={items.slice(0, 6)} />;
}
