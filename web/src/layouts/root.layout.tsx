import { MotionConfig } from 'motion/react'
import Footer from '@/components/custom/footer/footer.component'
import Header from '@/components/custom/header/header.component'
import ScrollManager from '@/components/custom/scroll-manager/scroll-manager.component'
import PageTransition from '@/components/custom/page-transition/page-transition.component'

export default function RootLayout() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-svh bg-background text-foreground">
        <Header />
        <PageTransition />
        <Footer />
      </div>
      <ScrollManager />
    </MotionConfig>
  )
}
