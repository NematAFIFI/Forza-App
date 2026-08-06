import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function PortalSetup() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerUid, setBuyerUid] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/login');
        return;
      }
      setBuyerEmail(data.session.user.email || '');
      setBuyerUid(data.session.user.id);
      // Link buyer account if not yet linked
      await supabase.rpc('ensure_buyer_linked');
      // Check if password already set (query by buyer_user_id, not email)
      const { data: buyer } = await supabase
        .from('system_clients')
        .select('name, password_set')
        .eq('buyer_user_id', data.session.user.id)
        .maybeSingle();
      if (buyer?.password_set) {
        navigate('/portal/dashboard');
        return;
      }
      setBuyerName(buyer?.name || '');
      setLoading(false);
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'Password must be at least 6 characters'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'));
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      await supabase
        .from('system_clients')
        .update({ password_set: true })
        .eq('buyer_user_id', buyerUid);

      setSuccess(true);
      setTimeout(() => navigate('/portal/dashboard'), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('حدث خطأ أثناء تحديث كلمة المرور', 'An error occurred while updating the password');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400" dir="rtl">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-4 animate-spin text-emerald-500" />
          <p>{t('جارٍ التحميل...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center" dir="rtl">
        <div className="max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Check size={40} />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-emerald-500">{t('تم تفعيل كلمة المرور!', 'Password Activated!')}</h1>
          <p className="mb-2 text-zinc-300">{t('مرحباً ' + buyerName + '، تم تفعيل حسابك في نظام رواق.', 'Hello ' + buyerName + ', your account has been activated')}</p>
          <p className="text-sm text-zinc-500">{t('جارٍ تحويلك إلى لوحة التحكم...', 'Redirecting you to the dashboard...')}</p>
          <Loader2 size={24} className="mx-auto mt-6 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12" dir="rtl">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-emerald-500/20 bg-white/5 p-8 backdrop-blur-xl md:p-10">
          {/* Warning banner */}
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertCircle size={20} className="shrink-0 text-amber-400" />
            <p className="text-sm text-amber-200">
              {t('يجب تعيين كلمة مرور خاصة بك قبل استخدام النظام. هذه الخطوة مطلوبة لمرة واحدة فقط.', 'You must set your own password before using the system. This step is required only once.')}
            </p>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-emerald-500">{t('تعيين كلمة المرور', 'Set Password')}</h1>
            <p className="text-sm text-zinc-400">
              {t('مرحباً ' + buyerName + ' — اختر كلمة مرور للوصول إلى نظامك', 'Hello ' + buyerName + ' — choose a password to access your system')}
            </p>
          </div>

          {/* Buyer info card */}
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Lock size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-200">{buyerEmail}</div>
              <div className="text-xs text-zinc-500">{t('سيتم استخدام هذا البريد لتسجيل الدخول', 'This email will be used for login')}</div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-emerald-500">{t('كلمة المرور', 'Password')}</label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('6 أحرف على الأقل', 'At least 6 characters')}
                  className="w-full rounded-xl border border-emerald-500/20 bg-white/5 py-3 pr-11 pl-11 text-white outline-none transition focus:border-emerald-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-emerald-500">{t('تأكيد كلمة المرور', 'Confirm Password')}</label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('أعد إدخال كلمة المرور', 'Re-enter password')}
                  className="w-full rounded-xl border border-emerald-500/20 bg-white/5 py-3 pr-11 text-white outline-none transition focus:border-emerald-500/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 py-3.5 text-base font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('جارٍ التحديث...', 'Updating...')}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>{t('تفعيل كلمة المرور', 'Activate Password')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
