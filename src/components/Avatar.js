export default function Avatar({ initials, bg, size = "md" }) {
  return (
    <div className={`avatar avatar-${size}`} style={{ background: bg || "var(--pri)" }}>
      {initials}
    </div>
  );
}