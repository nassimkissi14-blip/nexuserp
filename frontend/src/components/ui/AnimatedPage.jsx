import { motion } from 'framer-motion';

/* ─── Variants ──────────────────────────────────────────────────────────── */
const pageVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: [0.4, 0, 0.2, 1],
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.28, ease: [0.34, 1.2, 0.64, 1] } },
};

export default function AnimatedPage({ children, style, className }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}
