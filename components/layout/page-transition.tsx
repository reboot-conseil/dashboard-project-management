"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { usePathname } from "next/navigation";

const motionVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={shouldReduce ? undefined : motionVariants}
        initial={shouldReduce ? false : "initial"}
        animate={shouldReduce ? undefined : "animate"}
        exit={shouldReduce ? undefined : "exit"}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex-1 min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
