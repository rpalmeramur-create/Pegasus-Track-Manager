export default function AppLogo({ size = 28, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Stopwatch ring */}
      <circle cx="27" cy="24" r="14" stroke="currentColor" strokeWidth="1.6" opacity="0.38" />

      {/* Crown — two prongs */}
      <path
        d="M24 10 L24 7 M27 9.5 L27 6.5 M30 10 L30 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M23 10 Q27 8.5 31 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Clock hand (~10 o'clock) */}
      <line x1="27" y1="24" x2="19" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <circle cx="27" cy="24" r="1.4" fill="currentColor" opacity="0.65" />

      {/* Wing — three feather sweeps from ankle pivot (~14, 24) */}
      <path
        d="M14 24 C10 18 8 10 11 3 C13 11 13 18 14 23 Z"
        fill="currentColor"
      />
      <path
        d="M14 24 C8 21 5 13 8 6 C10 13 12 19 14 23 Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M14 24 C7 23 5 17 8 11 C10 16 12 21 14 23 Z"
        fill="currentColor"
        opacity="0.28"
      />

      {/* Foot / sandal body */}
      <path
        d="M14 21 Q17 17 22 16 Q27 15 30 17.5 Q33 18 34 21
           Q35 24 33 27 Q31 29 27 29 Q20 29 16 27 Q13 25 14 21 Z"
        fill="currentColor"
      />

      {/* Toe extension */}
      <path
        d="M34 21 Q38.5 22 38.5 25.5 Q38.5 29 34 29 L33 27 Q35.5 25.5 34 21 Z"
        fill="currentColor"
      />

      {/* Strap line on sandal (subtle) */}
      <path
        d="M20 16.5 Q22 22 20 28"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.22"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M25.5 15.5 Q27.5 22 25.5 29"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.22"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
