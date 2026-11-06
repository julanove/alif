import blankText from "../assets/img_blank_text.png";
import cheering from "../assets/img_cheering.png";
import heart from "../assets/img_heart.png";
import ok from "../assets/img_ok.png";
import okStar from "../assets/img_ok_star.png";
import partyPopper from "../assets/img_party_popper.png";
import question from "../assets/img_question.png";
import questionList from "../assets/img_question_list.png";
import questionPaper from "../assets/img_question_paper.png";
import readingIdea from "../assets/img_reading_idea.png";
import sad from "../assets/img_sad.png";
import search from "../assets/img_search.png";
import searchBar from "../assets/img_search_bar.png";
import sleep from "../assets/img_sleep.png";
import typing from "../assets/img_typing.png";
const IMAGES = {
  blankText,
  cheering,
  heart,
  ok,
  okStar,
  partyPopper,
  question,
  questionList,
  questionPaper,
  readingIdea,
  sad,
  search,
  searchBar,
  sleep,
  typing
};
export default function Mascot({ name, className = "" }) {
  return <img className={`mascot ${className}`} src={IMAGES[name]} alt="" draggable="false" />;
}
export function MascotMessage({ name, large = false, children }) {
  return <div className={`mascot-message ${large ? "mascot-message--large" : ""}`}><Mascot name={name} className="mascot-message__img" /><p className="muted">{children}</p></div>;
}
