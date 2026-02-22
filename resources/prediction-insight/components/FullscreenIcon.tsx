export function FullscreenIcon({ isFullscreen }: { isFullscreen: boolean }) {
  if (isFullscreen) {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 2 6 6 2 6" />
        <polyline points="10 14 10 10 14 10" />
        <line x1="2" y1="2" x2="6" y2="6" />
        <line x1="14" y1="14" x2="10" y2="10" />
      </svg>
    );
  }

  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="10 2 14 2 14 6" />
      <polyline points="6 14 2 14 2 10" />
      <line x1="14" y1="2" x2="10" y2="6" />
      <line x1="2" y1="14" x2="6" y2="10" />
    </svg>
  );
}
