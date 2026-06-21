import Link from "next/link";
import { Logo } from "@/components/ui";
import {
  HandHeartIcon, PillIcon, StethoscopeIcon, UsersIcon, ClipboardIcon,
  CalendarIcon, ShieldIcon, HeartIcon, CheckIcon, HomeIcon,
} from "@/components/icons";

const services = [
  { icon: <HandHeartIcon />, tone: "bg-brand-50 text-brand-600", title: "Personal Care", body: "Assistance with bathing, dressing, grooming and more." },
  { icon: <PillIcon />, tone: "bg-amber-50 text-amber-600", title: "Medication Management", body: "Help with reminders and medication administration." },
  { icon: <StethoscopeIcon />, tone: "bg-sky-50 text-sky-600", title: "Skilled Nursing", body: "Professional medical care in the comfort of home." },
  { icon: <UsersIcon />, tone: "bg-violet-50 text-violet-600", title: "Companion Care", body: "Companionship, light housekeeping and errands." },
  { icon: <HeartIcon />, tone: "bg-rose-50 text-rose-500", title: "Therapy Services", body: "Physical, occupational and speech therapy at home." },
];

const help = [
  { icon: <HeartIcon />, tone: "bg-rose-50 text-rose-500", title: "Personalized Care Plans" },
  { icon: <UsersIcon />, tone: "bg-brand-50 text-brand-600", title: "Skilled & Compassionate Caregivers" },
  { icon: <CalendarIcon />, tone: "bg-amber-50 text-amber-600", title: "Flexible Scheduling" },
  { icon: <ShieldIcon />, tone: "bg-sky-50 text-sky-600", title: "Peace of Mind for Families" },
];

const values = [
  { icon: <HeartIcon />, title: "Love", body: "We treat every client like family." },
  { icon: <ShieldIcon />, title: "Responsibility", body: "Your health and safety are our priority." },
  { icon: <HandHeartIcon />, title: "Care", body: "Compassionate support every day." },
  { icon: <HomeIcon />, title: "Reliable", body: "Reliable care, right at home." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-surface-200 bg-surface-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-surface-600 md:flex">
            <a href="#services" className="hover:text-surface-900">Services</a>
            <a href="#help" className="hover:text-surface-900">How We Help</a>
            <a href="#values" className="hover:text-surface-900">Our Values</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="#services" className="btn-primary">Request Care</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2">
        <div>
          <span className="badge-green mb-4">HomeWell-grade care, modern platform</span>
          <h1 className="text-4xl font-semibold leading-tight text-surface-900 md:text-5xl">
            Compassionate care in the comfort of home.
          </h1>
          <p className="mt-4 max-w-md text-surface-600">
            Cura_Sera provides personalized home health care services that promote
            independence, dignity and well-being — backed by a complete agency
            operating system.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#services" className="btn-primary px-6 py-3">Request Care</Link>
            <Link href="#services" className="btn-secondary px-6 py-3">Our Services</Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-surface-500">
            <span className="inline-flex items-center gap-2"><CheckIcon width={16} /> Licensed &amp; insured</span>
            <span className="inline-flex items-center gap-2"><CheckIcon width={16} /> HIPAA compliant</span>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 via-brand-50 to-amber-50 shadow-card">
            <div className="flex h-full flex-col items-center justify-center gap-3 text-brand-700">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/70"><HandHeartIcon width={42} height={42} /></span>
              <p className="text-sm font-medium">Care with heart, at home</p>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 hidden w-44 rounded-2xl border border-surface-200 bg-white p-4 shadow-card sm:block">
            <p className="text-2xl font-semibold text-surface-900">12k+</p>
            <p className="text-xs text-surface-500">visits delivered with care</p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 max-w-xl">
          <h2 className="text-2xl font-semibold text-surface-900">Care tailored to your needs</h2>
          <p className="muted mt-2">
            From daily support to specialized medical care, we&apos;re here for you every step of the way.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.title} className="card card-pad transition-shadow hover:shadow-lg">
              <span className={`icon-chip ${s.tone}`}>{s.icon}</span>
              <h3 className="mt-3 font-semibold text-surface-900">{s.title}</h3>
              <p className="muted mt-1">{s.body}</p>
            </div>
          ))}
          <div className="card card-pad flex flex-col justify-center bg-brand-600 text-white">
            <h3 className="text-lg font-semibold">We care with heart.</h3>
            <p className="mt-1 text-sm text-brand-50">Talk to our care team and build a plan that fits your family.</p>
            <Link href="/login" className="btn-secondary mt-4 w-fit">Get started</Link>
          </div>
        </div>
      </section>

      {/* How we help */}
      <section id="help" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-8 text-2xl font-semibold text-surface-900">How We Help</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {help.map((h) => (
            <div key={h.title} className="card card-pad text-center">
              <span className={`icon-chip mx-auto ${h.tone}`}>{h.icon}</span>
              <p className="mt-3 text-sm font-medium text-surface-800">{h.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values footer band */}
      <section id="values" className="border-t border-surface-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="flex items-start gap-3">
              <span className="icon-chip bg-brand-50 text-brand-600">{v.icon}</span>
              <div>
                <p className="font-semibold text-surface-900">{v.title}</p>
                <p className="muted">{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-surface-200 bg-surface-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-surface-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Cura_Sera Agency. Compassionate care, complete platform.</p>
          <Link href="/login" className="text-brand-600 hover:underline">Staff &amp; Family Portal →</Link>
        </div>
      </footer>
    </div>
  );
}
