import {
  Utensils,
  ShoppingCart,
  ShoppingBag,
  Car,
  Bus,
  Fuel,
  Home,
  Coffee,
  Pizza,
  Plug,
  Wifi,
  Phone,
  HeartPulse,
  Pill,
  GraduationCap,
  Gift,
  Plane,
  Film,
  Gamepad2,
  Dumbbell,
  Shirt,
  Wallet,
  Banknote,
  CreditCard,
  PiggyBank,
  Receipt,
  Briefcase,
  Dog,
  Baby,
  Wrench,
  Droplet,
  Zap,
  Tag,
  type LucideIcon,
} from "lucide-react";

// A small, curated map of category/item icon names → lucide components.
// Keys are lowercased lucide-ish names; unknown names fall back to a tag.
const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  food: Utensils,
  dining: Utensils,
  groceries: ShoppingCart,
  shoppingcart: ShoppingCart,
  shopping: ShoppingBag,
  shoppingbag: ShoppingBag,
  car: Car,
  bus: Bus,
  transport: Bus,
  fuel: Fuel,
  petrol: Fuel,
  home: Home,
  rent: Home,
  coffee: Coffee,
  pizza: Pizza,
  plug: Plug,
  wifi: Wifi,
  internet: Wifi,
  phone: Phone,
  mobile: Phone,
  health: HeartPulse,
  heartpulse: HeartPulse,
  medical: HeartPulse,
  pill: Pill,
  medicine: Pill,
  education: GraduationCap,
  graduationcap: GraduationCap,
  gift: Gift,
  travel: Plane,
  plane: Plane,
  movie: Film,
  film: Film,
  entertainment: Film,
  games: Gamepad2,
  gamepad2: Gamepad2,
  fitness: Dumbbell,
  dumbbell: Dumbbell,
  gym: Dumbbell,
  clothing: Shirt,
  shirt: Shirt,
  wallet: Wallet,
  cash: Banknote,
  banknote: Banknote,
  salary: Banknote,
  card: CreditCard,
  creditcard: CreditCard,
  savings: PiggyBank,
  piggybank: PiggyBank,
  bills: Receipt,
  receipt: Receipt,
  work: Briefcase,
  briefcase: Briefcase,
  pet: Dog,
  dog: Dog,
  baby: Baby,
  repair: Wrench,
  wrench: Wrench,
  water: Droplet,
  droplet: Droplet,
  electricity: Zap,
  power: Zap,
  zap: Zap,
};

const SIZES = {
  sm: { box: "h-9 w-9 rounded-lg", icon: 16 },
  md: { box: "h-11 w-11 rounded-xl", icon: 20 },
  lg: { box: "h-14 w-14 rounded-2xl", icon: 26 },
} as const;

export interface IconTileProps {
  icon?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

// Square dark icon tile used in transaction rows and tiles.
export function IconTile({ icon, size = "md", className = "" }: IconTileProps) {
  const key = (icon ?? "").toLowerCase().replace(/[\s_-]/g, "");
  const Icon = ICON_MAP[key] ?? Tag;
  const s = SIZES[size];
  return (
    <span
      className={[
        "grid place-items-center bg-dark text-on-dark shrink-0",
        s.box,
        className,
      ].join(" ")}
    >
      <Icon size={s.icon} />
    </span>
  );
}

export default IconTile;
