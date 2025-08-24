import { useRef } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import styles from './style.module.scss';
import Image from 'next/image';

const slider1 = [
    {
        color: "#e3e5e7",
        src: "photo-1485827404703-89b55fcc595e (1).avif"
    },
    {
        color: "#d6d7dc",
        src: "photo-1589254065909-b7086229d08c.avif"
    },
    {
        color: "#e3e3e3",
        src: "photo-1694903089438-bf28d4697d9a.avif"
    },
    {
        color: "#21242b",
        src: "photo-1674027444485-cec3da58eef4.avif"
    }
]

const slider2 = [
    {
        color: "#d4e3ec",
        src: "photo-1697577418970-95d99b5a55cf.avif"
    },
    {
        color: "#e5e0e1",
        src: "photo-1712002641088-9d76f9080889.avif"
    },
    {
        color: "#d7d4cf",
        src: "photo-1716637644831-e046c73be197.avif"
    },
    {
        color: "#e1dad6",
        src: "photo-1737505599162-d9932323a889.avif"
    }
]

export default function index() {

    const container = useRef(null);
    const { scrollYProgress } = useScroll({
        target: container,
        offset: ["start end", "end start"]
    })

    const x1 = useTransform(scrollYProgress, [0, 1], [0, 150])
    const x2 = useTransform(scrollYProgress, [0, 1], [0, -150])
    const height = useTransform(scrollYProgress, [0, 0.9], [50, 0])

    return (
        <div ref={container} className={styles.slidingImages}>
            <motion.div style={{x: x1}} className={styles.slider}>
                    {
                        slider1.map( (project, index) => {
                            return <div key={index} className={styles.project} style={{backgroundColor: project.color}} >
                                <div className={styles.imageContainer}>
                                    <Image 
                                    fill={true}
                                    alt={"image"}
                                    src={`/images/${project.src}`}/>
                                </div>
                            </div>
                        })
                    }
                </motion.div>
                <motion.div style={{x: x2}} className={styles.slider}>
                    {
                        slider2.map( (project, index) => {
                            return <div key={index} className={styles.project} style={{backgroundColor: project.color}} >
                                <div key={index} className={styles.imageContainer}>
                                    <Image 
                                    fill={true}
                                    alt={"image"}
                                    src={`/images/${project.src}`}/>
                                </div>
                            </div>
                        })
                    }
                </motion.div>
                <motion.div style={{height}} className={styles.circleContainer}>
                    <div className={styles.circle}></div>
                </motion.div>
        </div>
    )
}
