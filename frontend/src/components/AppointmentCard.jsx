import { CalendarClock, CheckCircle2, Circle, Video, UserSquare2, XCircle } from 'lucide-react';
import { Badge, Card } from './Card';
import Button from './Button';

const statusTone = {
  pending: 'amber',
  confirmed: 'blue',
  completed: 'green',
  cancelled: 'red',
};

const statusIcon = {
  pending: Circle,
  confirmed: CalendarClock,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export function statusLabel(status) {
  return (status || '').charAt(0).toUpperCase() + (status || '').slice(1);
}

export default function AppointmentCard({ appointment, actions = [], showPerson = true }) {
  const StatusIcon = statusIcon[appointment.status] || Circle;
  const person =
    showPerson && appointment.patient
      ? appointment.patient.full_name
      : appointment.doctor
        ? appointment.doctor.full_name
        : null;

  const date = new Date(appointment.appointment_date);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
            <StatusIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            {person && <p className="text-sm font-semibold text-slate-900">{person}</p>}
            <p className="text-sm text-slate-600">
              {date.toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              <span className="text-slate-400"> · </span>
              {appointment.appointment_time}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              {appointment.consultation_mode === 'online' ? (
                <>
                  <Video className="h-3.5 w-3.5" /> Online
                </>
              ) : (
                <>
                  <UserSquare2 className="h-3.5 w-3.5" /> In-person
                </>
              )}
              {appointment.doctor?.specialization && ` · ${appointment.doctor.specialization}`}
            </p>
            {appointment.reason && (
              <p className="mt-1.5 max-w-md text-xs text-slate-500">{appointment.reason}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge tone={statusTone[appointment.status] || 'slate'}>
            {statusLabel(appointment.status)}
          </Badge>
          {actions.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">{actions}</div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function AppointmentAction({ children, ...props }) {
  return (
    <Button size="sm" variant="secondary" {...props}>
      {children}
    </Button>
  );
}
