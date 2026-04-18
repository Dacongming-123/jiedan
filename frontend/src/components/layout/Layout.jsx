import TopNav from './TopNav'
import BottomNav from './BottomNav'

export default function Layout({ children, noNav = false, noPadding = false }) {
  return (
    <div className="min-h-screen bg-surface">
      {!noNav && <TopNav />}
      <main className={!noNav && !noPadding ? 'pt-16 pb-20 md:pb-8' : ''}>
        {children}
      </main>
      {!noNav && <BottomNav />}
    </div>
  )
}
