import {
  Activity,
  Award,
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  Building,
  Building2,
  Bus,
  BusFront,
  Calculator,
  Calendar,
  Car,
  ChartArea,
  ChartBar,
  ChartColumn,
  ChartColumnBig,
  ChartColumnIncreasing,
  ChartLine,
  ChartPie,
  ChartSpline,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Coins,
  CreditCard,
  Database,
  DollarSign,
  Factory,
  FileSpreadsheet,
  FileText,
  Fuel,
  Gauge,
  Globe,
  HardHat,
  Headphones,
  Hourglass,
  Landmark,
  LayoutDashboard,
  Layers,
  Leaf,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Navigation,
  Package,
  Percent,
  PiggyBank,
  Presentation,
  Receipt,
  Route,
  Scale,
  Settings,
  Sheet,
  ShieldCheck,
  ShoppingCart,
  Signpost,
  Star,
  Store,
  Table2,
  Target,
  Ticket,
  Timer,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Ícones disponíveis para as páginas (campo `icon` no banco). Importados por
 * nome para não carregar o pacote inteiro do lucide no navegador.
 */
export const PAGE_ICONS: Record<string, LucideIcon> = {
  Activity, Award, Banknote, BarChart3, Boxes, Briefcase, Building, Building2,
  Bus, BusFront, Calculator, Calendar, Car, ChartArea, ChartBar, ChartColumn,
  ChartColumnBig, ChartColumnIncreasing, ChartLine, ChartPie, ChartSpline,
  ClipboardCheck, ClipboardList, Clock, Coins, CreditCard, Database, DollarSign,
  Factory, FileSpreadsheet, FileText, Fuel, Gauge, Globe, HardHat, Headphones,
  Hourglass, Landmark, LayoutDashboard, Layers, Leaf, Map: MapIcon, MapPin, Megaphone,
  Navigation, Package, Percent, PiggyBank, Presentation, Receipt, Route, Scale,
  Settings, Sheet, ShieldCheck, ShoppingCart, Signpost, Star, Store, Table2,
  Target, Ticket, Timer, TrendingDown, TrendingUp, Truck, User, UserCheck,
  Users, Wallet, Warehouse, Wrench,
};

export const PAGE_ICON_NAMES = Object.keys(PAGE_ICONS).sort();

// "chart-column-increasing", "ChartColumnIncreasing" e "chartColumnIncreasing"
// apontam para o mesmo ícone.
const normalize = (name: string) => name.replace(/[-_\s]/g, "").toLowerCase();
const BY_NORMALIZED = new Map(
  Object.entries(PAGE_ICONS).map(([name, icon]) => [normalize(name), icon])
);

export function getPageIcon(name: string | null | undefined): LucideIcon {
  return (name && BY_NORMALIZED.get(normalize(name))) || LayoutDashboard;
}

export function isKnownPageIcon(name: string | null | undefined): boolean {
  return !!name && BY_NORMALIZED.has(normalize(name));
}
