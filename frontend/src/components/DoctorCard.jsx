import { BadgeCheck, CalendarDays, IndianRupee, MapPin, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import { Badge, Card } from './Card';

export function DoctorAvatar({ name, size = 'h-12 w-12' }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export default function DoctorCard({ doctor }) {
  const navigate = useNavigate();

  return (
    <Card className="flex h-full flex-col p-5 transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <DoctorAvatar name={doctor.full_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-slate-900">{doctor.full_name}</h3>
            {doctor.is_verified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="Verified doctor" />
            )}
          </div>
          <p className="truncate text-sm text-slate-500">
            {doctor.specialization || 'General Medicine'}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {doctor.qualification || 'Qualification not provided'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={doctor.is_verified ? 'green' : 'amber'}>
          {doctor.is_verified ? 'Verified' : 'Pending verification'}
        </Badge>
        <Badge tone="blue">
          <Star className="h-3 w-3" /> {doctor.experience ?? 0} yrs
        </Badge>
        <Badge tone="slate">
          <IndianRupee className="h-3 w-3" /> {doctor.consultation_fee ?? 0}
        </Badge>
      </div>

      {doctor.hospital && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{doctor.hospital.name}</span>
        </p>
      )}

      {doctor.bio && (
        <p className="mt-3 line-clamp-2 text-xs text-slate-500">{doctor.bio}</p>
      )}

      <div className="mt-auto flex gap-2 pt-4">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => navigate(`/patient/doctors/${doctor.id}`)}>
          View Profile
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => navigate(`/patient/doctors/${doctor.id}?book=1`)}
        >
          <CalendarDays className="h-4 w-4" /> Book
        </Button>
      </div>
    </Card>
  );
}
