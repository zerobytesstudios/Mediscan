import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  FileText,
  HeartPulse,
  Lock,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
} from 'lucide-react';
import Button from '../components/Button';

const features = [
  {
    icon: FileText,
    title: 'Medical Documents',
    text: 'Upload PDFs, images and text reports. Metadata and extracted text are stored securely.',
  },
  {
    icon: BrainCircuit,
    title: 'AI Report Explanation',
    text: 'Get a cautious, plain-language explanation of your report with terms explained.',
  },
  {
    icon: MessageSquareText,
    title: 'Healthcare Assistant',
    text: 'Ask general health education questions and get simple, safe answers.',
  },
  {
    icon: Search,
    title: 'Doctor Discovery',
    text: 'Search doctors by name, specialization, experience and hospital.',
  },
  {
    icon: CalendarDays,
    title: 'Appointments',
    text: 'Book in-person or online appointments and track their status.',
  },
  {
    icon: Lock,
    title: 'Role Based Security',
    text: 'JWT authentication, hashed passwords and ownership checks on every record.',
  },
];

const steps = [
  { title: 'Register', text: 'Create a patient, doctor or hospital account in seconds.' },
  { title: 'Complete your profile', text: 'Add the details that help clinicians understand your context.' },
  { title: 'Upload a report', text: 'Your file is validated, stored and its text extracted.' },
  { title: 'Analyze with AI', text: 'Groq powers a structured, educational explanation of your report.' },
  { title: 'Find a doctor', text: 'Search the directory and review verified profiles.' },
  { title: 'Book and follow up', text: 'Book an appointment and keep your medical history in one place.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-600 p-1.5 text-white">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Mediscan AI</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" /> AI-assisted healthcare platform
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Your Health Information, Simplified.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            Mediscan AI helps you organize medical reports, understand health information with AI
            assistance, and connect with healthcare professionals.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="secondary">
                Explore Features
              </Button>
            </a>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['4', 'User roles'],
              ['10 MB', 'Upload limit'],
              ['Groq', 'AI provider'],
              ['PostgreSQL', 'Database'],
            ].map(([value, label]) => (
              <div key={label} className="card p-4">
                <p className="text-lg font-semibold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Everything you need in one place
          </h2>
          <p className="mt-3 text-slate-600">
            A focused MVP covering reports, AI education, doctor discovery and appointments.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card p-6 transition hover:shadow-md">
              <span className="inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">How it works</h2>
            <p className="mt-3 text-slate-600">Six simple steps from upload to appointment.</p>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="card p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* AI assistance + documents */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-8">
            <span className="inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Cautious AI assistance</h3>
            <p className="mt-2 text-sm text-slate-600">
              The AI never diagnoses, never prescribes and never invents results. Every explanation
              is structured into a summary, key findings, explained terminology, values to discuss,
              questions for your doctor and a safety disclaimer.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {[
                'Structured, plain-language report explanations',
                'Medical terminology explained simply',
                'Healthcare education chatbot for general questions',
                'Emergency guidance included when relevant',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-8">
            <span className="inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600">
              <Upload className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Medical documents</h3>
            <p className="mt-2 text-sm text-slate-600">
              Files are validated, renamed safely and stored outside the public web root. Only
              authenticated users with the right relationship can view or download them.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {[
                ['PDF', 'Text-based reports'],
                ['TXT', 'Plain text reports'],
                ['JPG / PNG', 'Images (OCR optional)'],
                ['10 MB', 'Maximum file size'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-medium text-slate-800">{title}</p>
                  <p className="text-xs text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Doctor discovery + appointments */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <div className="card p-8">
            <span className="inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600">
              <Stethoscope className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Doctor discovery</h3>
            <p className="mt-2 text-sm text-slate-600">
              Filter the directory by name, specialization, experience and hospital. Verified
              profiles are clearly marked so you know who has been reviewed.
            </p>
          </div>
          <div className="card p-8">
            <span className="inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600">
              <CalendarDays className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Appointments</h3>
            <p className="mt-2 text-sm text-slate-600">
              Choose a doctor, date, time, reason and consultation mode. Status moves through
              pending, confirmed, completed or cancelled - and everyone is notified.
            </p>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="card overflow-hidden">
          <div className="grid gap-8 p-8 lg:grid-cols-2 lg:p-10">
            <div>
              <span className="inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">Security by default</h3>
              <p className="mt-2 text-sm text-slate-600">
                Passwords are hashed with bcrypt, API access uses signed JWTs, and every endpoint
                enforces role-based authorization plus ownership checks. AI keys stay on the
                server and are never sent to the browser.
              </p>
            </div>
            <ul className="grid gap-3 text-sm text-slate-600">
              {[
                'bcrypt password hashing',
                'JWT bearer authentication',
                'Role guards for patient, doctor, hospital and admin',
                'Ownership checks on documents and appointments',
                'Validated uploads with safe generated filenames',
                'No API keys exposed to the frontend',
                'Basic audit logging of important actions',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <HeartPulse className="mx-auto h-10 w-10 text-brand-100" />
          <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
            Ready to simplify your health information?
          </h2>
          <p className="mt-3 text-brand-100">
            Create a free account and upload your first report in under a minute.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="border-white bg-white text-brand-700 hover:bg-brand-50">
                Create free account
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                className="bg-brand-700 text-white ring-1 ring-white/30 hover:bg-brand-800"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-600 p-1.5 text-white">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-slate-900">Mediscan AI</span>
          </div>
          <p className="text-center text-xs text-slate-500">
            Demo project. AI output is for educational purposes only and does not replace
            professional medical advice. In an emergency, contact local emergency services.
          </p>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Mediscan AI</p>
        </div>
      </footer>
    </div>
  );
}
