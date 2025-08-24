import styles from "./style.module.css";
import { useInView, motion } from "framer-motion";
import { useRef } from "react";
import { slideUp, opacity } from "./animation";
import Rounded from "../../common/RoundedButton";
export default function index() {
  const phrase =
    "Experience our Multi-Agent Debate System where AI agents discuss topics from multiple perspectives. Simple interface designed for maximum ease of use.";
  const description = useRef(null);
  const isInView = useInView(description);
  return (
    <div ref={description} className={styles.description}>
      <div className={styles.body}>
        <p>
          {phrase.split(" ").map((word, index) => {
            return (
              <span key={index} className={styles.mask}>
                <motion.span
                  variants={slideUp}
                  custom={index}
                  animate={isInView ? "open" : "closed"}
                  key={index}
                >
                  {word}
                </motion.span>
              </span>
            );
          })}
        </p>
        <motion.p variants={opacity} animate={isInView ? "open" : "closed"}>
          Just input your topic and watch as our AI agents engage in thoughtful debate, providing diverse viewpoints and balanced analysis.
        </motion.p>
        <div data-scroll data-scroll-speed={0.1}>
          <Rounded className={styles.button}>
            <p>Try Debate Now</p>
          </Rounded>
        </div>
      </div>
    </div>
  );
}
