import SponsorBar from "./SponsorBar.jsx";
import SiteNav from "./SiteNav.jsx";
import logo from "../assets/logo.png";
export default function SiteBanner({ onHome }) {
  return <><header className="site-header"><div className="site-header__inner"><a className="site-header__brand" href="#/" onClick={onHome}><img className="site-header__logo" src={logo} alt="Camel logo" /><span className="site-header__titles"><span className="site-header__title">Từ Điển Ả Rập – Việt</span><span className="site-header__tagline">تعلم العربية بسهولة · Học tiếng Ả Rập để nổ nhanh hơn</span></span></a><SiteNav /></div></header><div className="section section--sponsor"><div className="section__inner"><SponsorBar /></div></div></>;
}
