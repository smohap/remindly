export function AuroraBackground() {
  return (
    <div aria-hidden>
      <div
        className="blob"
        style={{ width: 420, height: 420, background: 'var(--violet)', top: -120, left: -100, animation: 'float1 16s ease-in-out infinite' }}
      />
      <div
        className="blob"
        style={{ width: 380, height: 380, background: 'var(--magenta)', bottom: -140, right: -80, animation: 'float2 19s ease-in-out infinite' }}
      />
      <div
        className="blob"
        style={{ width: 300, height: 300, background: 'var(--cyan)', bottom: '10%', left: '38%', opacity: 0.35, animation: 'float1 14s ease-in-out infinite reverse' }}
      />
    </div>
  )
}
