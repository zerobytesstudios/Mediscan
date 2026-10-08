import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, Stethoscope, X } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import DoctorCard from '../../components/DoctorCard';
import { Field, Input, Select } from '../../components/Input';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { SectionHeader } from '../../components/Card';

const SPECIALIZATIONS = [
  'Cardiology',
  'General Medicine',
  'Endocrinology',
  'Orthopaedics',
  'Dermatology',
  'Paediatrics',
  'Gynaecology',
  'Psychiatry',
];

export default function DoctorSearchPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selects, setSelects] = useState({
    specialization: '',
    min_experience: '',
    hospital_id: '',
  });
  const [hospitals, setHospitals] = useState([]);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const filters = {
    q: debouncedQ || undefined,
    specialization: selects.specialization || undefined,
    min_experience: selects.min_experience || undefined,
    hospital_id: selects.hospital_id || undefined,
  };

  const { data: doctors, loading, error, reload } = useFetch(
    () => services.doctors.list(filters),
    [debouncedQ, selects.specialization, selects.min_experience, selects.hospital_id]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    services.hospitals.list().then(setHospitals).catch(() => setHospitals([]));
  }, []);

  useEffect(() => {
    if (!loading) setLoadedOnce(true);
  }, [loading]);

  const count = (doctors || []).length;
  const showLoader = loading && !loadedOnce;

  function updateSelect(field, value) {
    setSelects((current) => ({ ...current, [field]: value }));
  }

  function clear() {
    setQ('');
    setDebouncedQ('');
    setSelects({ specialization: '', min_experience: '', hospital_id: '' });
    setLoadedOnce(false);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Find Doctors"
        subtitle="Search by name, specialization, experience or hospital"
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setDebouncedQ(q.trim());
        }}
        className="card p-5"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Doctor name or keyword" htmlFor="q">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="q"
                className="pl-9 pr-9"
                placeholder="Type a name or specialty..."
                value={q}
                autoFocus
                onChange={(event) => setQ(event.target.value)}
              />
              {q && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQ('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </Field>

          <Field label="Specialization" htmlFor="spec">
            <Select
              id="spec"
              value={selects.specialization}
              onChange={(event) => updateSelect('specialization', event.target.value)}
            >
              <option value="">Any specialization</option>
              {SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Minimum experience" htmlFor="exp">
            <Select
              id="exp"
              value={selects.min_experience}
              onChange={(event) => updateSelect('min_experience', event.target.value)}
            >
              <option value="">Any experience</option>
              <option value="5">5+ years</option>
              <option value="10">10+ years</option>
              <option value="15">15+ years</option>
            </Select>
          </Field>

          <Field label="Hospital" htmlFor="hospital">
            <Select
              id="hospital"
              value={selects.hospital_id}
              onChange={(event) => updateSelect('hospital_id', event.target.value)}
            >
              <option value="">Any hospital</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4" /> Clear all
          </button>
          <p className="ml-auto text-sm text-slate-400">
            {loading && loadedOnce ? 'Searching…' : 'Results update as you type.'}
          </p>
        </div>
      </form>

      <ErrorMessage message={error} onRetry={reload} />

      {showLoader ? (
        <PageLoader label="Finding doctors..." />
      ) : count === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors match."
          description="Try a different name, a broader keyword or clear the filters."
          actionLabel="Clear all filters"
          onAction={clear}
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {count} doctor{count === 1 ? '' : 's'} found
            {debouncedQ ? ` for “${debouncedQ}”` : ''}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(doctors || []).map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}