import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";
import { leaveLoginPage } from "../router.js";
import Mascot from "./Mascot.jsx";
const SOCIAL = [
  {
    name: "Google",
    color: "#4285f4",
    icon: "M21.8 10.2H12v3.9h5.6c-.5 2.500-2.700 4.100-5.600 4.100a6.200 6.200 0 1 1 0-12.400c1.600 0 3 .6 4.100 1.500l2.900-2.900A10.200 10.200 0 1 0 22.200 12c0-.6-.1-1.200-.4-1.800z"
  },
  {
    name: "Facebook",
    color: "#1877f2",
    icon: "M14 8.500V6.800c0-.8.5-1 1-1h2.200V2.200L14.300 2.200C11 2.200 10 4.600 10 6.500v2H7.500v3.700H10V22h4v-9.800h2.800l.4-3.700z"
  },
  {
    name: "Zalo",
    color: "#0068ff",
    icon: "M4 5h14v2.500L8.500 17H18v2.500H4V17l9.500-9.500H4z"
  }
];
export default function AuthPage({ initialMode = "login" }) {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";
  useEffect(() => {
    if (user) leaveLoginPage();
  }, [user]);
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  });
  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await (isRegister ? register(form) : login(form));
    } catch (err) {
      setError(err.status ? err.message : "Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  function switchMode(next) {
    setMode(next);
    setError(null);
  }
  return <main className="section section--hero"><div className="section__inner auth"><div className="auth__card"><Mascot name={isRegister ? "cheering" : "okStar"} className="auth__mascot" /><h1 className="auth__title">{isRegister ? "Tạo tài khoản" : "Đăng nhập"}</h1><p className="muted auth__intro">Lưu từ để ôn tập, giữ chuỗi ngày học và lưu điểm thử thách phát âm.</p><div className="auth__tabs" role="tablist"><button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? "auth__tab--on" : ""} onClick={() => switchMode("login")}>
              Đăng nhập
            </button><button type="button" role="tab" aria-selected={isRegister} className={isRegister ? "auth__tab--on" : ""} onClick={() => switchMode("register")}>
              Đăng ký
            </button></div><form className="auth__form" onSubmit={handleSubmit}>{isRegister && <label>
                Tên hiển thị
                <input type="text" autoComplete="name" maxLength={60} {...field("name")} /></label>}<label>
              Email
              <input type="email" autoComplete="email" required {...field("email")} /></label><label>
              Mật khẩu
              <input
    type="password"
    autoComplete={isRegister ? "new-password" : "current-password"}
    required
    minLength={isRegister ? 8 : void 0}
    {...field("password")}
  />{isRegister && <small className="muted">Ít nhất 8 ký tự</small>}</label>{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="auth__submit" disabled={busy}>{busy ? "Đang xử lý..." : isRegister ? "Tạo tài khoản" : "Đăng nhập"}</button></form><div className="auth__divider"><span>hoặc tiếp tục với</span></div><div className="auth__social">{SOCIAL.map((s) => <button
    type="button"
    key={s.name}
    className="auth__social-btn"
    disabled
    title={`Đăng nhập bằng ${s.name}: đang phát triển`}
    aria-label={`Đăng nhập bằng ${s.name}: đang phát triển`}
  ><svg viewBox="0 0 24 24" aria-hidden="true"><path d={s.icon} fill={s.color} /></svg>{s.name}</button>)}</div><p className="muted auth__soon">Đăng nhập bằng Google, Facebook và Zalo đang được phát triển.</p></div></div></main>;
}
