import { TriangleAlert, Star, ChevronLeft, Info, Bell, Check, CalendarDays, Calculator, ShieldCheck, MapPin, Users, KeyRound, UsersRound, Euro, Ticket, CreditCard, History, FileText, LifeBuoy, Settings, CircleCheck, X, Repeat, Handshake, Flag, House, MessageCircle, Phone, Navigation, Headphones, IdCard, ChartColumn, Clock, CarFront, Sparkles, type LucideIcon } from "lucide-react";

// Vienodos linijinės ikonos visoje programėlėje (vietoj jaustukų)
const MAP: Record<string, LucideIcon> = {
  alert: TriangleAlert, star: Star, bell: Bell, check: Check, calendar: CalendarDays, calc: Calculator, shield: ShieldCheck, pin: MapPin, family: Users, key: KeyRound,
  group: UsersRound, euro: Euro, ticket: Ticket, card: CreditCard, history: History, file: FileText, help: LifeBuoy, settings: Settings,
  ok: CircleCheck, x: X, repeat: Repeat, meet: Handshake, flag: Flag, home: House, msg: MessageCircle, phone: Phone, go: Navigation,
  support: Headphones, id: IdCard, chart: ChartColumn, clock: Clock, car: CarFront, new: Sparkles, info: Info, back: ChevronLeft,
};
export type IcoName = keyof typeof MAP;

export function Ico({ n, size = 22, className = "", stroke = 1.9 }: { n: string; size?: number; className?: string; stroke?: number }) {
  const I = MAP[n] ?? Check;
  return <I aria-hidden="true" size={size} strokeWidth={stroke} className={className} />;
}
