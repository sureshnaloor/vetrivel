import { Link } from 'react-router-dom';
import { Shield, Mail, UserCheck } from 'lucide-react';
import DashboardShell from './dashboard/DashboardShell';
import { useTheme } from '../hooks/useTheme';
import { GopuramIcon as Gopuram } from './icons/GopuramIcon';

/** Shown when a signed-in user opens /temple-admin without temple admin access yet. */
export default function TempleAdminOnboarding() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <DashboardShell>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Gopuram className="w-10 h-10 text-[#0D9488]" />
          <h1 className="font-display text-3xl font-semibold">Temple host access</h1>
        </div>

        <p className={`text-lg mb-8 ${isDark ? 'text-white/70' : 'text-[#6E6A63]'}`}>
          Temple booking pages are managed by verified temple hosts—not every signed-in user.
          A platform administrator must grant you the <strong>temple admin</strong> role and link
          your account to a temple on Google Maps.
        </p>

        <ol className="space-y-6 mb-10">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/20 text-[#0D9488] font-semibold text-sm">
              1
            </span>
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" /> Request access
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                Email Vetrivel support with your Google account email, temple name, and Google Maps
                link (or place ID). Small temples without their own booking website are who this
                is for.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/20 text-[#0D9488] font-semibold text-sm">
              2
            </span>
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4" /> Platform admin approves
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                A <strong>platform admin</strong> (Vetrivel operations—not the temple) signs in,
                opens this same page, and uses the yellow &quot;Assign temple admin&quot; form:
                your email + Google place ID + temple name. That grants the role and links the
                temple in one step.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/20 text-[#0D9488] font-semibold text-sm">
              3
            </span>
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> You manage your page
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                After approval, sign in again and return here. You can add photos, puja offerings,
                UPI QR / bank details, and publish your page to the{' '}
                <Link to="/poojas" className="text-[#0D9488] underline">Book directory</Link>.
              </p>
            </div>
          </li>
        </ol>

        <div
          className={`p-5 rounded-2xl border text-sm ${
            isDark ? 'border-white/10 bg-white/5 text-white/70' : 'border-black/10 bg-black/5'
          }`}
        >
          <p className="font-medium text-base mb-2">Who is &quot;platform admin&quot;?</p>
          <p>
            Vetrivel staff accounts configured in the server (e.g. via{' '}
            <code className="text-xs">PLATFORM_ADMIN_EMAIL</code> in .env). They approve temple
            hosts—they are not temple priests or trustees. Each temple still has its own separate
            temple admin for day-to-day page updates.
          </p>
        </div>

        <Link
          to="/poojas"
          className="mt-8 inline-block text-[#0D9488] font-medium hover:underline"
        >
          ← Back to Book directory
        </Link>
      </div>
    </DashboardShell>
  );
}
