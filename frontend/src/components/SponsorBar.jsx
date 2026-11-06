import ulisLogo from "../assets/sponsors/dhnn.jpg";
import Mascot from "./Mascot.jsx";
const SPONSORS = [
  { name: "Trường Đại học Ngoại ngữ – ĐHQGHN (ULIS)", color: "#2b3175", logo: ulisLogo },
  { name: "Trung tâm tiếng Ả Rập Sahara", color: "#1f7a6c" },
  { name: "Học viện Ngôn ngữ Phương Đông", color: "#a84e26" },
  { name: "Quỹ Giao lưu Văn hóa Việt – Ả Rập", color: "#16594e" },
  { name: "Nhà sách Ả Rập Việt", color: "#945516" },
  { name: "Cộng đồng Du học Trung Đông", color: "#2f6690" },
  { name: "Câu lạc bộ Văn hóa Hồi giáo", color: "#7a5c9e" }
];
function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
export default function SponsorBar() {
  const track = [...SPONSORS, ...SPONSORS];
  return <div className="sponsor-bar"><Mascot name="cheering" className="sponsor-bar__mascot" /><span className="sponsor-bar__label">Đồng hành cùng</span><div className="sponsor-marquee"><div className="sponsor-marquee__track">{track.map((s, i) => <div
    className="sponsor-avatar"
    key={i}
    style={{ background: s.color }}
    title={s.name}
    aria-hidden={i >= SPONSORS.length}
  >{s.logo ? <img className="sponsor-avatar__logo" src={s.logo} alt={s.name} /> : initials(s.name)}</div>)}</div></div></div>;
}
