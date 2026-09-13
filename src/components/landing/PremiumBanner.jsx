import { useApp } from "../../context/AppContext";
import ROUTES from "../../constants/routes";
import { Crown, Check, ArrowRight } from "lucide-react";
import Reveal from "./Reveal";

/**
 * PremiumBanner — the upgrade CTA rebuilt as a glassmorphism card floating
 * over a dark, softly-lit green section. Self-contained: it pulls navigate
 * from your AppContext and routes to ROUTES.PREMIUM, exactly like the
 * original banner did.
 */
const PERKS = [
  "Plan unlimited spots per day",
  "Build weekend getaways & multi-day trips",
  "Lifetime access to future premium features",
];

export default function PremiumBanner() {
  const { navigate } = useApp();

  return (
    <section className="lp-premium">
      <div className="lp-premium__blob lp-premium__blob--gold" />
      <div className="lp-premium__blob lp-premium__blob--green" />

      <div className="lp-premium__wrap">
        <Reveal from="up">
          <div className="lp-glass">
            <div className="lp-glass__left">
              <span className="lp-premium__badge"><Crown size={14} /> Premium</span>
              <h2 className="lp-premium__title">Go Premium for limitless travel</h2>
              <p className="lp-premium__desc">
                Take off the training wheels. Unlock multi-day itineraries, unlimited daily
                stops, and lifetime access to every future premium feature.
              </p>
              <ul className="lp-premium__list">
                {PERKS.map((p) => (
                  <li key={p}>
                    <span className="lp-premium__check"><Check size={14} /></span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lp-glass__right">
              <div className="lp-price">
                <span className="lp-price__label">One-time payment</span>
                <span className="lp-price__amount">₱299</span>
                <span className="lp-price__note">No subscriptions, ever</span>
              </div>
              <button
                className="lp-btn lp-btn--primary lp-btn--lg"
                onClick={() => navigate(ROUTES.PREMIUM)}
              >
                Upgrade to Premium <ArrowRight className="lp-btn__arrow" size={18} />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
