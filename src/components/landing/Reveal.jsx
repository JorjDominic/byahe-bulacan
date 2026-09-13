import { motion, useReducedMotion } from "framer-motion";

/**
 * Reveal — lightweight scroll-reveal wrapper built on Framer Motion.
 *
 * Fades + slides its children into view the first time they enter the
 * viewport. Fully respects the user's "reduce motion" OS preference: when
 * that is on, children simply render in place with no animation.
 *
 * Props:
 *   from      "up" | "down" | "left" | "right" | "none"   (default "up")
 *   delay     seconds before the animation starts          (default 0)
 *   duration  animation length in seconds                  (default 0.7)
 *   once      only animate the first time it enters view   (default true)
 *   amount    fraction that must be visible to trigger     (default 0.2)
 *   distance  travel distance in px                         (default 40)
 *   className / style  forwarded to the motion element
 */
function getOffset(from, distance) {
  switch (from) {
    case "down":  return { x: 0, y: -distance };
    case "left":  return { x: distance, y: 0 };
    case "right": return { x: -distance, y: 0 };
    case "none":  return { x: 0, y: 0 };
    case "up":
    default:      return { x: 0, y: distance };
  }
}

export default function Reveal({
  children,
  from = "up",
  delay = 0,
  duration = 0.7,
  once = true,
  amount = 0.2,
  distance = 40,
  className,
  style,
}) {
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? { x: 0, y: 0 } : getOffset(from, distance);

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
