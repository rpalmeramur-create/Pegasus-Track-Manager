export default function AppLogo({ size = 28, className, style }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      draggable={false}
      className={className}
      style={{ objectFit: 'contain', display: 'block', ...style }}
    />
  )
}
