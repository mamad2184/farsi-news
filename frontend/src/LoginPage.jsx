import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, Newspaper, UserRound, Sparkles } from 'lucide-react'
import { API_BASE_URL } from './api'
import './LoginPage.css'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isRegister = mode === 'register'

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isRegister) {
        const registerResponse = await fetch(`${API_BASE_URL}/auth/register/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
        })
        const registerData = await registerResponse.json().catch(() => ({}))
        if (!registerResponse.ok) {
          const detail = registerData.username?.[0] || registerData.email?.[0] || registerData.password?.[0] || registerData.detail || registerData.message
          throw new Error(Array.isArray(detail) ? detail[0] : detail || 'ثبت‌نام انجام نشد. اطلاعات را بررسی کنید.')
        }
      }

      const response = await fetch(`${API_BASE_URL}/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.access) {
        const detail = data.detail || 'نام کاربری یا رمز عبور درست نیست.'
        throw new Error(detail)
      }

      localStorage.setItem('farsinews:access-token', data.access)
      if (data.refresh) localStorage.setItem('farsinews:refresh-token', data.refresh)
      localStorage.setItem('farsinews:username', username.trim())
      window.location.hash = ''
      window.location.reload()
    } catch (err) {
      setError(err.message || 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page" dir="rtl">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <a className="auth-back" href="#" aria-label="بازگشت به اخبار">
        <ArrowLeft size={17} />
        بازگشت به خبرها
      </a>

      <section className="auth-shell">
        <aside className="auth-story">
          <div className="auth-brand">
            <span className="auth-brand-icon"><Newspaper size={23} strokeWidth={1.8} /></span>
            <span>خبرنگار<span className="auth-brand-dot">.</span></span>
          </div>
          <div className="auth-story-copy">
            <span className="auth-eyebrow"><Sparkles size={14} /> دنیای خبر، نزدیک‌تر از همیشه</span>
            <h1>خبرها را دنبال کن،<br /><span>با دیدی تازه.</span></h1>
            <p>به جمع خوانندگان آگاه بپیوند و هر روز، تصویری روشن‌تر از اتفاقات جهان بساز.</p>
          </div>
          <div className="auth-story-footer">
            <div className="auth-avatar-stack" aria-hidden="true">
              <span>ن</span><span>م</span><span>آ</span><span>+</span>
            </div>
            <div><strong>برای کنجکاوها ساخته شده</strong><small>یک قدم نزدیک‌تر به آنچه مهم است</small></div>
          </div>
          <div className="auth-decoration" aria-hidden="true">«</div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-mobile-brand">
            <span className="auth-brand-icon"><Newspaper size={22} /></span>
            <strong>خبرنگار<span className="auth-brand-dot">.</span></strong>
          </div>
          <div className="auth-form-heading">
            <span className="auth-form-kicker">{isRegister ? 'شروع یک مسیر تازه' : 'خوش برگشتی'}</span>
            <h2>{isRegister ? 'حساب بساز' : 'ورود به حساب'}</h2>
            <p>{isRegister ? 'چند ثانیه تا ورود به دنیای خبر فاصله داری.' : 'برای ادامه‌ی گشت‌وگذار در خبرها وارد شو.'}</p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="نوع حساب">
            <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setSuccess('') }}>ورود</button>
            <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? 'active' : ''} onClick={() => { setMode('register'); setError(''); setSuccess('') }}>ثبت‌نام</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="auth-username">نام کاربری</label>
            <div className="auth-input-wrap">
              <UserRound size={18} />
              <input id="auth-username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="نام کاربری‌ات را وارد کن" required minLength={3} />
            </div>

            {isRegister && <>
              <label htmlFor="auth-email">ایمیل</label>
              <div className="auth-input-wrap">
                <Mail size={18} />
                <input id="auth-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
            </>}

            <div className="auth-label-row">
              <label htmlFor="auth-password">رمز عبور</label>
              {isRegister && <span>حداقل ۸ کاراکتر</span>}
            </div>
            <div className="auth-input-wrap">
              <LockKeyhole size={18} />
              <input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز عبورت را وارد کن" required minLength={isRegister ? 8 : 1} />
              <button className="auth-show-password" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>

            {error && <p className="auth-message auth-error" role="alert">{error}</p>}
            {success && <p className="auth-message auth-success" role="status">{success}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              <span>{loading ? 'در حال بررسی…' : isRegister ? 'ساخت حساب و ورود' : 'ورود به حساب'}</span>
              {!loading && <ArrowLeft size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'از قبل حساب داری؟' : 'هنوز حساب کاربری نداری؟'}
            <button type="button" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); setSuccess('') }}>{isRegister ? 'وارد شو' : 'ثبت‌نام کن'}</button>
          </p>
          <div className="auth-privacy"><LockKeyhole size={13} /> اطلاعاتت با امنیت پردازش می‌شود.</div>
        </section>
      </section>
      <footer className="auth-copyright">© خبرنگار — آگاه بمان، هر روز.</footer>
    </main>
  )
}
