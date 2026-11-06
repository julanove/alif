import { useCallback, useState } from "react";
import FortuneModal from "./FortuneModal.jsx";
import MagicLamp from "./MagicLamp.jsx";
export default function FortuneCard() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <section className="word-of-day fortune-card"><div className="word-of-day__badge fortune-card__badge">Thông điệp từ dzũ trụ</div><button type="button" className="fortune-card__button" onClick={() => setOpen(true)}><MagicLamp className="fortune-card__lamp" /><span className="fortune-card__ar" dir="rtl" lang="ar">
          رسالة من الكون
        </span><span className="fortune-card__vi">Dzũ trụ có lời nhắn cho bạn hôm nay</span><span className="fortune-card__cta">Xoa đèn thần ✦</span></button>{open && <FortuneModal onClose={close} />}</section>;
}
