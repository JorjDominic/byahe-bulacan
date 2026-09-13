import CountUp from "react-countup";
import { Building2, MapPin, Star, Plane } from "lucide-react";
import Reveal from "./Reveal";

/**
 * StatsSection — four animated counters that tick up the first time the
 * section scrolls into view (react-countup's enableScrollSpy + scrollSpyOnce,
 * so no extra IntersectionObserver dependency is needed).
 *
 * Edit the numbers/labels here to match your real data.
 */
const STATS = [
  { icon: Building2, end: 24,   suffix: "+", label: "Municipalities", color: "#1a5c3c", bg: "#e8f5ee" },
  { icon: MapPin,    end: 150,  suffix: "+", label: "Tourist Spots",  color: "#b8760a", bg: "#fef3dc" },
  { icon: Star,      end: 500,  suffix: "+", label: "Reviews",        color: "#1a73e8", bg: "#e8f0fe" },
  { icon: Plane,     end: 1000, suffix: "+", label: "Travelers",      color: "#c0392b", bg: "#fce8f3" },
];

export default function StatsSection() {
  return (
    <section className="lp-stats">
      <div className="lp-stats__head">
        <Reveal from="up">
          <span className="lp-kicker">By the numbers</span>
        </Reveal>
        <Reveal from="up" delay={0.05}>
          <h2 className="lp-section-title">A growing map of Bulacan</h2>
        </Reveal>
        <Reveal from="up" delay={0.1}>
          <p className="lp-section-sub">
            Every spot is admin-verified and every review comes from a real traveler.
          </p>
        </Reveal>
      </div>

      <div className="lp-stats__grid">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.label} from="up" delay={i * 0.08}>
              <div className="lp-stat-card">
                <span className="lp-stat-card__icon" style={{ background: s.bg, color: s.color }}>
                  <Icon size={24} />
                </span>
                <div className="lp-stat-card__num">
                  <CountUp
                    end={s.end}
                    duration={2.2}
                    separator=","
                    enableScrollSpy
                    scrollSpyOnce
                  />
                  <span className="lp-stat-card__suffix">{s.suffix}</span>
                </div>
                <div className="lp-stat-card__label">{s.label}</div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
