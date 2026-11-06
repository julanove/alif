import hackathon from "../assets/banners/hackathon-2026.jpg";
import anniversary from "../assets/banners/khoa-arap-30-nam.jpg";
const BANNERS = {
  left: { src: hackathon, width: 476, height: 979, alt: "Ngày hội chất lượng Hackathon 2026, ULIS+ for a smarter university, 05 - 06.11.2026" },
  right: { src: anniversary, width: 600, height: 1065, alt: "Khoa Ngôn ngữ và Văn hóa Ả Rập, Trường Đại học Ngoại ngữ, ĐHQGHN: 30 năm, Khám phá, Chinh phục, Vươn xa" }
};
export default function AdRail({ side }) {
  const { src, width, height, alt } = BANNERS[side];
  return <aside className={`ad-rail ad-rail--${side}`} style={{ "--ratio": width / height }} aria-label="Thông tin sự kiện"><img className="ad-rail__banner" src={src} width={width} height={height} alt={alt} /></aside>;
}
