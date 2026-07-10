import { useAuth } from '../auth/AuthContext'

export function Avatar({ size = 36 }: { size?: number }) {
  const { user } = useAuth()
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--magenta),var(--violet))] text-[0.8rem] font-bold"
      aria-hidden
    >
      {user?.initials ?? 'PN'}
    </div>
  )
}
