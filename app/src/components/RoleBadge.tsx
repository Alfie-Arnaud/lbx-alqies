import { Crown, Star, Zap, Infinity, User, Shield, ShieldCheck } from 'lucide-react';

interface RoleBadgeProps {
  role?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const roleConfig: Record<string, {
  label: string;
  icon: any;
  from: string;
  to: string;
  textColor: string;
}> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    from: '#E8C547',
    to: '#00C8FF',
    textColor: '#0a0a0b',
  },
  higher_admin: {
    label: 'Higher Admin',
    icon: ShieldCheck,
    from: '#ff6b6b',
    to: '#ee5a24',
    textColor: '#fff',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    from: '#fd9644',
    to: '#e55039',
    textColor: '#fff',
  },
  lifetime: {
    label: 'Lifetime',
    icon: Infinity,
    from: '#9b59b6',
    to: '#8e44ad',
    textColor: '#fff',
  },
  patron: {
    label: 'Patron',
    icon: Star,
    from: '#E8C547',
    to: '#b89d35',
    textColor: '#0a0a0b',
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    from: '#00C8FF',
    to: '#0088aa',
    textColor: '#0a0a0b',
  },
  free: {
    label: 'Member',
    icon: User,
    from: '',
    to: '',
    textColor: '#9ca3af',
  },
};

const sizeConfig = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-3 py-1',
};

// Roles that get banner feature (in Profile)
export const BANNER_ROLES = ['owner', 'higher_admin', 'admin', 'lifetime'];

export function RoleBadge({ role = 'free', size = 'md', showIcon = false }: RoleBadgeProps) {
  const config = roleConfig[role] || roleConfig.free;
  const Icon = config.icon;
  const sizeClass = sizeConfig[size];

  if (role === 'free') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-gray-700 ${sizeClass}`} style={{ color: config.textColor }}>
        {showIcon && <Icon className="w-3 h-3 inline mr-1" />}
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${sizeClass}`}
      style={{
        background: `linear-gradient(135deg, ${config.from} 0%, ${config.to} 100%)`,
        color: config.textColor,
      }}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}

export default RoleBadge;