
import { motion, type SVGMotionProps } from 'framer-motion';

export function NIAIcon(props: SVGMotionProps<SVGSVGElement>) {
  const circleVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay: i * 0.2, type: "spring", duration: 1.5, bounce: 0 },
        opacity: { delay: i * 0.2, duration: 0.01 }
      }
    })
  };

  const boltVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { delay: 0.6, duration: 0.3 }
    }
  };

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="hidden"
      animate="visible"
      {...props}
    >
      <motion.circle 
        cx="12" 
        cy="12" 
        r="10" 
        variants={circleVariants}
        custom={1}
        className="stroke-primary"
      />
      <motion.circle 
        cx="12" 
        cy="12" 
        r="6" 
        variants={circleVariants}
        custom={2}
        className="stroke-accent opacity-75"
      />
      <motion.path 
        d="M12 8l-2 4h4l-2 4" 
        variants={boltVariants}
        className="stroke-primary fill-primary"
      />
    </motion.svg>
  );
}
