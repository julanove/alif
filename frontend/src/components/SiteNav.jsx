import { useAuth } from "../auth.jsx";
import StreakBadge from "./StreakBadge.jsx";
export default function SiteNav() {
  const { user, ready, streak, logout } = useAuth();
  return <nav className="site-nav" aria-label="Tài khoản">{ready && (user ? <><StreakBadge streak={streak} /><span className="site-nav__name" title={user.email}>{user.name}</span><button type="button" className="site-nav__link site-nav__logout" onClick={() => logout().catch(() => {
  })}>
              Đăng xuất
            </button></> : <><a className="site-nav__link site-nav__auth" href="#/login">
              Đăng nhập
            </a><a className="site-nav__link site-nav__login" href="#/register">
              Đăng ký
            </a></>)}</nav>;
}
