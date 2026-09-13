export default function Stars({ rating, size = "sm" }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className={`stars stars-${size}`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}