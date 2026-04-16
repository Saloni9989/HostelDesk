// frontend/src/pages/LoginPage.jsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SLIDE = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -30 },
  transition: { duration: 0.25 },
};

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep]         = useState('email'); // 'email' | 'otp' | 'success'
  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef([]);

  // ── Send OTP ────────────────────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await authApi.sendOTP(email, name);
      setStep('otp');
      startCountdown();
      toast.success('OTP sent! Check your email.');
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length !== 6) return toast.error('Please enter all 6 digits');
    setLoading(true);
    try {
      const { data } = await authApi.verifyOTP(email, otpStr);
      setStep('success');
      setTimeout(() => login(data.token, data.user), 800);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handlers ──────────────────────────────────────
  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (next.every(d => d) && next.join('').length === 6) {
      setTimeout(() => handleVerifyOTP(), 100);
    }
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOTP(), 100);
    }
  };

  // ── Countdown resend ────────────────────────────────────────
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
    }, 1000);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await authApi.sendOTP(email, name);
      setOtp(['', '', '', '', '', '']);
      startCountdown();
      toast.success('New OTP sent!');
    } catch {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg shadow-primary-200 dark:shadow-primary-900/30 mb-4"
          >
            <span className="text-3xl">📋</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HostelDesk</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Smart Complaint Management</p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-xl shadow-gray-100 dark:shadow-gray-900/50">
          <AnimatePresence mode="wait">

            {/* Step 1: Email */}
            {step === 'email' && (
              <motion.div key="email" {...SLIDE}>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Sign in</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">We'll send a one-time password to your email.</p>
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Name</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Arjun Sharma"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      College Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        className="input pl-9"
                        type="email"
                        placeholder="you@college.edu"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
                    {loading ? 'Sending OTP…' : 'Send OTP'}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <motion.div key="otp" {...SLIDE}>
                <button onClick={() => setStep('email')} className="text-sm text-primary-500 hover:underline mb-4 flex items-center gap-1">
                  ← Back
                </button>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Enter OTP</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Sent to <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>. Valid for 10 minutes.
                </p>
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => otpRefs.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="otp-input"
                      />
                    ))}
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={loading || otp.join('').length !== 6}>
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {loading ? 'Verifying…' : 'Verify & Login'}
                  </button>
                </form>
                <div className="text-center mt-4">
                  {countdown > 0 ? (
                    <p className="text-sm text-gray-400">Resend in {countdown}s</p>
                  ) : (
                    <button onClick={handleResend} className="text-sm text-primary-500 hover:underline">
                      Resend OTP
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <motion.div key="success" {...SLIDE} className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 mb-4"
                >
                  <CheckCircle size={40} />
                </motion.div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Welcome back!</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Logging you in…</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          © {new Date().getFullYear()} HostelDesk · No passwords, ever.
        </p>
      </motion.div>
    </div>
  );
}
