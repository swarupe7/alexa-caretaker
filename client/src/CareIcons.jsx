/** Simple medical / home-care SVG marks (no emoji). */

const ICONS = {
  pill: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="5" fill="currentColor" />
      <path d="M7 12h10" stroke="#fff" strokeWidth="1.5" opacity="0.55" />
    </>
  ),
  heart: (
    <path
      d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.2a3.8 3.8 0 0 1 7 2.6C19 15.6 12 20 12 20z"
      fill="currentColor"
    />
  ),
  home: (
    <>
      <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z" fill="currentColor" />
      <circle cx="16.5" cy="9" r="2.2" fill="#fff" opacity="0.85" />
      <path d="M16.5 8v2M15.5 9h2" stroke="currentColor" strokeWidth="1.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" fill="currentColor" />
      <path d="M12 8v4.5l3 1.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6.5v5.2c0 4.4 2.9 7.6 7 8.8 4.1-1.2 7-4.4 7-8.8V6.5L12 3z" fill="currentColor" />
      <path d="M9.2 12.2 11 14l3.8-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),
  cross: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" />
      <path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

export function CareIcon({ name, size = 28 }) {
  const mark = ICONS[name] || ICONS.cross;
  return (
    <span className="care-icon" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size}>
        {mark}
      </svg>
    </span>
  );
}
