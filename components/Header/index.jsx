"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./style.module.scss";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import Nav from "./nav";
import Rounded from "../../common/RoundedButton";
import { gsap } from "gsap";

export default function Index() {
  const header = useRef(null);
  const button = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isActive) setIsActive(false);
  }, [pathname]);

  // Animate button position with GSAP
  useEffect(() => {
    if (button.current) {
      gsap.to(button.current, {
        x: isActive ? -550 : 0, // move left when active, reset when inactive
        duration: 2,
        ease: "elastic.out(1, 0.3)",
      });
    }
  }, [isActive]);

  // Only show header on homepage ('/'), not on dashboard pages
  const isHomepage = pathname === '/';

  if (!isHomepage) {
    return null;
  }

  return (
    <>
      <div ref={header} className={styles.header}>
        <div className={styles.logo}>
          <p className={styles.copyright}>©</p>
          <div className={styles.name}>
            <p className={styles.dennis}>Multi Agent</p>
          </div>
        </div>
      </div>
      <div ref={button} className={styles.headerButtonContainer}>
        <Rounded onClick={() => setIsActive(!isActive)} className={`${styles.button}`}>
          <div className={`${styles.burger} ${isActive ? styles.burgerActive : ""}`}></div>
        </Rounded>
      </div>
      <AnimatePresence mode="wait">{isActive && <Nav />}</AnimatePresence>
    </>
  );
}
