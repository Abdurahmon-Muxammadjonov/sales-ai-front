/** One stroke weight, one corner treatment, 20px grid — so the sidebar reads as a set. */
const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconHome = () => (
  <svg {...base}>
    <path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1V8.5Z" />
  </svg>
);

export const IconWave = () => (
  <svg {...base}>
    <path d="M3 10h1.5M7 5.5v9M10 3v14M13 6.5v7M16.5 10H18" />
  </svg>
);

export const IconSpeaker = () => (
  <svg {...base}>
    <path d="M4 8v4h2.5L10 15V5L6.5 8H4Z" />
    <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10" />
  </svg>
);

export const IconCode = () => (
  <svg {...base}>
    <path d="M7 6.5 3.5 10 7 13.5M13 6.5 16.5 10 13 13.5M11.5 4l-3 12" />
  </svg>
);

export const IconCall = () => (
  <svg {...base}>
    <path d="M6.2 3.5 8 7l-1.8 1.4a9 9 0 0 0 4.4 4.4L12 11l3.5 1.8v3A1.2 1.2 0 0 1 14.2 17 12.5 12.5 0 0 1 3 5.8 1.2 1.2 0 0 1 4.2 4.5l2-1Z" />
  </svg>
);

export const IconTeam = () => (
  <svg {...base}>
    <circle cx="7.5" cy="7" r="2.6" />
    <path d="M3 16c0-2.3 2-4 4.5-4s4.5 1.7 4.5 4" />
    <path d="M13.5 5.6a2.5 2.5 0 0 1 0 4.8M14.5 12.4c1.6.5 2.5 1.9 2.5 3.6" />
  </svg>
);

export const IconSettings = () => (
  <svg {...base}>
    <path d="M4 6h12M4 10h12M4 14h12" />
    <circle cx="7.5" cy="6" r="1.7" fill="var(--canvas)" />
    <circle cx="12.5" cy="10" r="1.7" fill="var(--canvas)" />
    <circle cx="6.5" cy="14" r="1.7" fill="var(--canvas)" />
  </svg>
);

export const IconHelp = () => (
  <svg {...base}>
    <circle cx="10" cy="10" r="7.2" />
    <path d="M8.2 8a1.9 1.9 0 1 1 2.4 1.9c-.4.1-.6.5-.6.9v.4" />
    <circle cx="10" cy="14" r=".6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChevron = ({ open }: { open?: boolean }) => (
  <svg
    {...base}
    width={14}
    height={14}
    style={{
      transition: "transform 180ms cubic-bezier(.4,0,.2,1)",
      transform: open ? "rotate(90deg)" : "none",
    }}
  >
    <path d="M8 5l4 5-4 5" />
  </svg>
);

export const IconPlus = () => (
  <svg {...base} width={16} height={16} strokeWidth={2}>
    <path d="M10 4.5v11M4.5 10h11" />
  </svg>
);

export const IconSun = () => (
  <svg {...base}>
    <circle cx="10" cy="10" r="3.4" />
    <path d="M10 2.4v1.8M10 15.8v1.8M17.6 10h-1.8M4.2 10H2.4M15.4 4.6l-1.3 1.3M5.9 14.1l-1.3 1.3M15.4 15.4l-1.3-1.3M5.9 5.9 4.6 4.6" />
  </svg>
);

export const IconMoon = () => (
  <svg {...base}>
    <path d="M16.5 12a7 7 0 0 1-8.5-8.5 7 7 0 1 0 8.5 8.5Z" />
  </svg>
);

export const IconMic = () => (
  <svg {...base}>
    <rect x="7.4" y="2.6" width="5.2" height="9" rx="2.6" />
    <path d="M4.6 9.5a5.4 5.4 0 0 0 10.8 0M10 14.9V17.4" />
  </svg>
);

export const IconUpload = () => (
  <svg {...base}>
    <path d="M10 13.5V3.8M6.5 7.3 10 3.8l3.5 3.5" />
    <path d="M3.5 13v2.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V13" />
  </svg>
);

export const IconMenu = () => (
  <svg {...base}>
    <path d="M3 5.5h14M3 10h14M3 14.5h14" />
  </svg>
);
