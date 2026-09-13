import { Map, CalendarDays, Star, Users } from "lucide-react";
import Reveal from "./Reveal";

/**
 * FeatureShowcase — Apple-style alternating image/text rows.
 *
 * Each row's "visual" is a self-contained, asset-free panel (gradient +
 * icon + mock UI skeleton) so no new screenshots are required to ship.
 * When you have real product screenshots, you can swap <VisualPanel /> for
 * an <img> inside the same .lp-visual container and keep all the layout.
 *
 * Rows alternate automatically (visual left, then visual right, ...).
 */
const FEATURES = [
  {
    icon: Map,
    accent: "#1a5c3c",
    soft: "#e8f5ee",
    eyebrow: "Official Directory",
    title: "Every verified spot, in one place",
    desc: "Browse admin-verified tourist spots, historical landmarks, and local enterprises across all 24 municipalities of Bulacan.",
    points: ["Admin-verified listings", "Photos, hours & locations", "Filter by town or category"],
  },
  {
    icon: CalendarDays,
    accent: "#b8760a",
    soft: "#fef3dc",
    eyebrow: "Itinerary Builder",
    title: "Plan the perfect day trip",
    desc: "Add spots to your personal planner, set visit times, and get a complete cost estimate before you ever leave home.",
    points: ["Drag spots into your day", "Automatic cost estimate", "Multi-day trips with Premium"],
  },
  {
    icon: Star,
    accent: "#1a73e8",
    soft: "#e8f0fe",
    eyebrow: "Honest Reviews",
    title: "Real tips from real travelers",
    desc: "Rate the places you've visited from one to five stars and leave practical tips that help the next explorer.",
    points: ["1–5 star ratings", "Traveler photos & tips", "Sort by what matters to you"],
  },
  {
    icon: Users,
    accent: "#c0392b",
    soft: "#fce8f3",
    eyebrow: "Community Feed",
    title: "Share your Bulacan story",
    desc: "Post your travel stories, photos, and hidden-gem discoveries with a growing community of local explorers.",
    points: ["Share photos & stories", "Discover hidden gems", "Follow fellow travelers"],
  },
];

function VisualPanel({ feature }) {
  const Icon = feature.icon;
  return (
    <div className="lp-visual" style={{ "--accent": feature.accent, "--soft": feature.soft }}>
      <div className="lp-visual__glow" />
      <div className="lp-visual__card">
        <div className="lp-visual__icon"><Icon size={26} /></div>
        <div className="lp-visual__lines">
          <span style={{ width: "85%" }} />
          <span style={{ width: "65%" }} />
          <span style={{ width: "75%" }} />
        </div>
        <div className="lp-visual__chips">
          {feature.points.slice(0, 2).map((p) => <em key={p}>{p}</em>)}
        </div>
      </div>
    </div>
  );
}

export default function FeatureShowcase() {
  return (
    <section className="lp-showcase">
      <div className="lp-showcase__head">
        <Reveal from="up">
          <span className="lp-kicker">Features</span>
        </Reveal>
        <Reveal from="up" delay={0.05}>
          <h2 className="lp-section-title">Everything you need to plan your trip</h2>
        </Reveal>
        <Reveal from="up" delay={0.1}>
          <p className="lp-section-sub">
            From browsing verified spots to building your perfect Bulacan adventure.
          </p>
        </Reveal>
      </div>

      {FEATURES.map((f, i) => {
        const reverse = i % 2 === 1;
        return (
          <div className={"lp-row" + (reverse ? " lp-row--reverse" : "")} key={f.eyebrow}>
            <Reveal className="lp-row__visual" from={reverse ? "right" : "left"}>
              <VisualPanel feature={f} />
            </Reveal>

            <Reveal from={reverse ? "left" : "right"} delay={0.08}>
              <div>
                <span className="lp-row__eyebrow" style={{ background: f.soft, color: f.accent }}>
                  {f.eyebrow}
                </span>
                <h3 className="lp-row__title">{f.title}</h3>
                <p className="lp-row__desc">{f.desc}</p>
                <ul className="lp-row__list">
                  {f.points.map((p) => (
                    <li key={p}>
                      <span className="lp-dot" style={{ background: f.accent }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        );
      })}
    </section>
  );
}
