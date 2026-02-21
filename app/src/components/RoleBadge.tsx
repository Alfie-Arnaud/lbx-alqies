import { Crown, Star, Zap, Infinity, User } from 'lucide-react';

interface RoleBadgeProps {
  role?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const roleConfig = {
  owner: {
    label: 'Owner',
    icon: Crown,
    className: 'badge-owner',
    gradient: 'from-[#E8C547] to-[#00C8FF]',
  },
  patron: {
    label: 'Patron',
    icon: Star,
    className: 'badge-patron',
    gradient: 'from-[#E8C547] to-[#b89d35]',
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    className: 'badge-pro',
    gradient: 'from-[#00C8FF] to-[#0088aa]',
  },
  lifetime: {
    label: 'Lifetime',
    icon: Infinity,
    className: 'badge-lifetime',
    gradient: 'from-[#9b59b6] to-[#8e44ad]',
  },
  free: {
    label: 'Member',
    icon: User,
    className: 'px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-400',
    gradient: '',
  },
};

const sizeConfig = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-3 py-1',
};

export function RoleBadge({ role = 'free', size = 'md', showIcon = false }: RoleBadgeProps) {
  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.free;
  const Icon = config.icon;
  const sizeClass = sizeConfig[size];

  if (role === 'free') {
    return (
      <span className={`${config.className} ${sizeClass}`}>
        {showIcon && <Icon className="w-3 h-3 inline mr-1" />}
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${sizeClass}`}
      style={{
        background: `linear-gradient(135deg, ${config.gradient.includes('from-[') 
          ? config.gradient.match(/from-\[([^\]]+)\]/)?.[1] || '#666'
          : '#666'} 0%, ${config.gradient.includes('to-[')
          ? config.gradient.match(/to-\[([^\]]+)\]/)?.[1] || '#666'
          : '#666'} 100%)`,
        color: role === 'lifetime' ? 'white' : '#0a0a0b',
      }}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}

export default RoleBadge;
