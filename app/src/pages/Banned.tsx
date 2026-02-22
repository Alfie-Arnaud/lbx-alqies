import { useAuth } from '@/hooks/useAuth';

export function Banned() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const expiresText = user?.banExpiresAt
    ? `Ban expires: ${new Date(user.banExpiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : 'This ban is permanent.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-3xl font-bold text-[#E8E8E8] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Account Suspended
          </h1>
          <p className="text-[#6B7280] text-sm">
            Your account has been suspended from Alfie's Basement.
          </p>
        </div>

        <div className="bg-[#111113] border border-red-500/20 rounded-xl p-6 mb-6 text-left space-y-3">
          <div>
            <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Account</p>
            <p className="text-[#E8E8E8] font-medium">@{user?.username}</p>
          </div>
          {user?.banReason && (
            <div>
              <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Reason</p>
              <p className="text-[#E8E8E8]">{user.banReason}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Duration</p>
            <p className="text-[#E8E8E8]">{expiresText}</p>
          </div>
        </div>

        <p className="text-[#6B7280] text-sm mb-6">
          If you believe this is a mistake, please contact the site administrator.
        </p>

        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-lg bg-[#111113] border border-white/10 text-[#E8E8E8] hover:border-white/20 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}