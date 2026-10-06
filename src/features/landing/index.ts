/**
 * Public API of the `landing` feature — trang chủ (mục II.2) và các trang pháp lý.
 */
export { HomeHero } from './components/home-hero'
export { HomePainPoints } from './components/home-pain-points'
export { HomeStats } from './components/home-stats'
export { HomeTestimonials } from './components/home-testimonials'
export { HeroShowcase } from './components/hero-showcase'
export { HomeJourney } from './components/home-journey'
export { HomeBrands } from './components/home-brands'
export { HomeCta, type HomeCtaResumeProject } from './components/home-cta'
export { HomeDossiers, type HomeTemplateItem, type HomeTemplateFactKind } from './components/home-dossiers'
export { HomeServices } from './components/home-services'
export { LegalPage } from './components/legal-page'
export {
  HERO_CARD_ROWS,
  HOME_BRANDS,
  HOME_DOSSIERS,
  HOME_PAIN_POINTS,
  HOME_JOURNEY_STEPS,
  HOME_SERVICES,
  HOME_STATS,
  SHOWCASE_TABS,
  type HeroCardRow,
  type HomeBrand,
  type HomeDossier,
  type HomePainPoint,
  type HomeJourneyStep,
  type HomeService,
  type HomeStat,
  type ShowcaseTab
} from './constants/landing.constants'
