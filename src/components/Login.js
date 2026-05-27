'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

/* ── SVG Icons (inline, no extra deps) ─────────────────── */
const IconMail = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconEye = ({ show }) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    {show
      ? <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.4 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.4 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="2" y1="2" x2="22" y2="22"/></>
    }
  </svg>
);

/* ── Input Field with Icon ──────────────────────────────── */
function InputField({ icon: Icon, type, value, onChange, placeholder, required, minLength, id }) {
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === 'password';
  const actualType = isPassword ? (showPwd ? 'text' : 'password') : type;

  return (
    <div style={{ position: 'relative' }}>
      {/* Icon */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '14px',
        transform: 'translateY(-50%)',
        color: focused ? 'var(--primary-light)' : 'rgba(255,255,255,0.28)',
        transition: 'color 0.3s ease',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
      }}>
        <Icon />
      </div>
      <input
        id={id}
        type={actualType}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="input-field"
        style={{
          paddingRight: '46px',
          paddingLeft: isPassword ? '46px' : '14px',
          transition: 'all 0.3s ease',
          boxShadow: focused
            ? '0 0 0 3px rgba(124,58,237,0.18), 0 0 28px rgba(124,58,237,0.1)'
            : 'none',
        }}
      />
      {/* Eye toggle for password */}
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPwd(v => !v)}
          style={{
            position: 'absolute',
            top: '50%',
            left: '12px',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-light)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
        >
          <IconEye show={showPwd} />
        </button>
      )}
    </div>
  );
}

/* ── Main Login Component ───────────────────────────────── */
export default function Login() {
  const [loading, setLoading]               = useState(false);
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [name, setName]                     = useState('');
  const [isSignUp, setIsSignUp]             = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode]   = useState(false);
  const [otpCode, setOtpCode]               = useState('');
  const [error, setError]                   = useState(null);
  const [successMsg, setSuccessMsg]         = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
        setSuccessMsg('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setSuccessMsg('تم إرسال كود التحقق إلى بريدك الإلكتروني.');
      setIsVerifyingCode(true);
      setIsForgotPassword(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'recovery' });
      if (error) throw error;
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccessMsg('تم إعادة تعيين كلمة المرور بنجاح!');
      setIsVerifyingCode(false);
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (isForgotPassword) return 'استعادة كلمة المرور';
    if (isVerifyingCode)  return 'التحقق من الهوية';
    if (isSignUp)         return 'إنشاء حساب جديد';
    return 'مرحباً بعودتك';
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '2rem 1rem',
    }}>

      {/* ── Animated Background Orbs ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        {/* Purple orb */}
        <div style={{
          position: 'absolute', top: '10%', right: '8%',
          width: '380px', height: '380px',
          background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
          filter: 'blur(80px)', opacity: 0.18,
          borderRadius: '50%',
          animation: 'floatX 16s ease-in-out infinite',
        }}/>
        {/* Cyan orb */}
        <div style={{
          position: 'absolute', bottom: '15%', left: '5%',
          width: '320px', height: '320px',
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
          filter: 'blur(90px)', opacity: 0.14,
          borderRadius: '50%',
          animation: 'floatX 20s ease-in-out infinite reverse',
        }}/>
        {/* Gold orb */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '260px', height: '260px',
          background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
          filter: 'blur(100px)', opacity: 0.07,
          borderRadius: '50%',
          animation: 'pulse 12s ease-in-out infinite',
          transform: 'translate(-50%, -50%)',
        }}/>

        {/* Dot Grid Pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.5,
        }}/>
      </div>

      {/* ── Card ── */}
      <div className="glass-panel animate-fade-in" style={{
        padding: '2.8rem 2.5rem',
        width: '100%',
        maxWidth: '460px',
        position: 'relative',
        zIndex: 1,
        border: '1px solid rgba(124,58,237,0.2)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
        animation: 'scaleIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      }}>

        {/* Gradient top border line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--primary), var(--secondary), transparent)',
          borderRadius: '24px 24px 0 0',
        }}/>

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: '2.2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '68px', height: '68px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--secondary-dark) 100%)',
            boxShadow: '0 8px 30px var(--primary-glow), inset 0 1px 0 rgba(255,255,255,0.2)',
            marginBottom: '1rem',
            fontSize: '1.8rem',
            animation: 'pulseFast 3s ease-in-out infinite',
          }}>💎</div>
          <h1 style={{
            fontSize: 'var(--font-5xl)',
            fontWeight: '900',
            lineHeight: 1,
            marginBottom: '0.4rem',
            background: 'linear-gradient(135deg, #fff 0%, var(--primary-light) 50%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            letterSpacing: '-0.04em',
          }}>زركني</h1>
          <p style={{
            fontSize: 'var(--font-sm)',
            color: 'rgba(255,255,255,0.38)',
            fontWeight: '600',
            letterSpacing: '0.04em',
          }}>المنصة المالية الشفافة</p>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4), rgba(6,182,212,0.3), transparent)',
            margin: '1.2rem auto 0',
            width: '70%',
          }}/>
        </div>

        {/* ── Mode Title ── */}
        <div style={{
          fontSize: 'var(--font-md)',
          fontWeight: '800',
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
          marginBottom: '1.5rem',
          letterSpacing: '-0.01em',
        }}>
          {getTitle()}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.2rem',
            fontSize: 'var(--font-sm)',
            fontWeight: '700',
            animation: 'fadeInDown 0.35s ease forwards',
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Success ── */}
        {successMsg && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            color: '#6ee7b7',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.2rem',
            fontSize: 'var(--font-sm)',
            fontWeight: '700',
            animation: 'fadeInDown 0.35s ease forwards',
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── Forgot Password Form ── */}
        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label htmlFor="fp-email" style={labelStyle}>البريد الإلكتروني</label>
              <InputField id="fp-email" icon={IconMail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required />
            </div>
            <SubmitButton loading={loading} label="إرسال كود التحقق" loadingLabel="جاري الإرسال..." />
            <BackButton onClick={() => setIsForgotPassword(false)} label="الرجوع لتسجيل الدخول" />
          </form>

        ) : isVerifyingCode ? (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label htmlFor="otp-code" style={labelStyle}>كود التحقق (OTP)</label>
              <InputField id="otp-code" icon={IconLock} type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="أدخل الكود المُرسل" required />
            </div>
            <div>
              <label htmlFor="new-password" style={labelStyle}>كلمة المرور الجديدة</label>
              <InputField id="new-password" icon={IconLock} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" required minLength={6} />
            </div>
            <SubmitButton loading={loading} label="تأكيد وإعادة التعيين" loadingLabel="جاري المعالجة..." />
            <BackButton onClick={() => setIsVerifyingCode(false)} label="الرجوع" />
          </form>

        ) : (
          <>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {isSignUp && (
                <div style={{ animation: 'fadeInDown 0.3s ease forwards' }}>
                  <label htmlFor="signup-name" style={labelStyle}>الاسم الكامل</label>
                  <InputField id="signup-name" icon={IconUser} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="أدخل اسمك الكامل" required />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" style={labelStyle}>البريد الإلكتروني</label>
                <InputField id="auth-email" icon={IconMail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required />
              </div>
              <div>
                <label htmlFor="auth-password" style={labelStyle}>كلمة المرور</label>
                <InputField id="auth-password" icon={IconLock} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" required minLength={6} />
              </div>

              <SubmitButton
                loading={loading}
                label={isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
                loadingLabel="جاري المعالجة..."
              />
            </form>

            {/* Forgot Password */}
            {!isSignUp && (
              <div style={{ textAlign: 'center', marginTop: '0.9rem' }}>
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(null); }}
                  style={{
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.42)',
                    fontSize: 'var(--font-sm)',
                    fontFamily: 'Cairo, sans-serif',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-light)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.42)'}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            {/* Toggle Sign-In / Sign-Up */}
            <div style={{
              textAlign: 'center',
              marginTop: '1.4rem',
              padding: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              fontSize: 'var(--font-sm)',
              color: 'rgba(255,255,255,0.4)',
            }}>
              {isSignUp ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}
              {' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(v => !v); setError(null); setSuccessMsg(null); }}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--primary-light)',
                  fontWeight: '800',
                  fontFamily: 'Cairo, sans-serif',
                  cursor: 'pointer',
                  fontSize: 'var(--font-sm)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--secondary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--primary-light)'}
              >
                {isSignUp ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Small Shared Sub-components ─────────────────────── */
const labelStyle = {
  display: 'block',
  marginBottom: '0.45rem',
  fontSize: '0.75rem',
  color: 'rgba(255,255,255,0.45)',
  fontWeight: '700',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

function SubmitButton({ loading, label, loadingLabel }) {
  return (
    <button type="submit" className="btn-primary" disabled={loading} style={{
      marginTop: '0.4rem',
      width: '100%',
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.6rem',
      fontSize: '1rem',
    }}>
      {loading ? (
        <>
          <div style={{
            width: '18px', height: '18px',
            border: '2px solid rgba(255,255,255,0.25)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}/>
          {loadingLabel}
        </>
      ) : label}
    </button>
  );
}

function BackButton({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%',
      padding: '13px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 'var(--radius-md)',
      color: 'rgba(255,255,255,0.6)',
      fontFamily: 'Cairo, sans-serif',
      fontWeight: '700',
      fontSize: 'var(--font-lg)',
      cursor: 'pointer',
      transition: 'all 0.25s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
    >
      {label}
    </button>
  );
}
