declare module 'lucide-react-native' {
  import * as React from 'react';
  import { SvgProps } from 'react-native-svg';

  export interface LucideProps extends SvgProps {
    size?: number | string;
    color?: string;
    fill?: string;
    style?: any;
    strokeWidth?: number | string;
  }

  export type LucideIcon = React.FC<LucideProps>;

  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Award: LucideIcon;
  export const Beaker: LucideIcon;
  export const Bell: LucideIcon;
  export const Building: LucideIcon;
  export const Calendar: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Clock: LucideIcon;
  export const Compass: LucideIcon;
  export const CreditCard: LucideIcon;
  export const FileText: LucideIcon;
  export const Heart: LucideIcon;
  export const HeartHandshake: LucideIcon;
  export const History: LucideIcon;
  export const KeyRound: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Phone: LucideIcon;
  export const PhoneOff: LucideIcon;
  export const PlusCircle: LucideIcon;
  export const QrCode: LucideIcon;
  export const Receipt: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Search: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Stethoscope: LucideIcon;
  export const Thermometer: LucideIcon;
  export const Trash2: LucideIcon;
  export const Truck: LucideIcon;
  export const UploadCloud: LucideIcon;
  export const User: LucideIcon;
  export const Users: LucideIcon;
  export const Video: LucideIcon;
  export const Weight: LucideIcon;
  export const X: LucideIcon;

  const icons: Record<string, LucideIcon>;
  export default icons;
}
