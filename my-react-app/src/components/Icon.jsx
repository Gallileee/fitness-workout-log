// src/components/Icon.jsx
// Small stroke icons drawn inline, so no icon library is needed.
const PATHS = {
  brand: "M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12",
  home: "M4 10.5 12 4l8 6.5V20h-5v-5.5H9V20H4z",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  calendar: "M4 6h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4",
  settings: "M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M15 5v4M9 10v4M17 15v4",
  plus: "M12 5v14M5 12h14",
  edit: "M5 19h3.5L18.5 9 15 5.5 5 15.5zM13 7.5l3.5 3.5",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10.5 11v5M13.5 11v5",
  close: "M6 6l12 12M18 6 6 18",
  logout: "M10 5H5v14h5M14.5 8l4 4-4 4M18.5 12H9.5",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14",
  filter: "M4 6h16M7 12h10M10 18h4",
  timer: "M10 2.5h4M12 2.5v3M4 13.5a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M12 9.5v4l2.5 2",
}

function Icon({ name, size = 20, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

export default Icon
