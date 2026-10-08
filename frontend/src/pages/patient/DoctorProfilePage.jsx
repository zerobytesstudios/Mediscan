import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  IndianRupee,
  MapPin,
  MessageSquare,
  Phone,
  Star,
  Stethoscope,
} from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { services, errorMessage } from '../../services/api';
import Button from '../../components/Button';
import { Badge, Card, CardBody, SectionHeader } from '../../components/Card';
import { Field, Input, Select, TextArea } from '../../components/Input';
import Modal from '../../components/Modal';
import { ErrorMessage, PageLoader } from '../../components/Feedback';
import { DoctorAvatar } from '../../components/DoctorCard';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

const EMPTY_FORM = {
  appointment_date: '',
  appointment_time: '',
  consultation_mode: 'in_person',
  reason: '',
};

export default function DoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: doctor, loading, error, reload } = useFetch(() => services.doctors.get(id), [id]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (params.get('book') === '1') setOpen(true);
  }, [params]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleBooking(event) {
    event.preventDefault();
    if (!form.appointment_date || !form.appointment_time) {
      setSubmitError('Choose a date and time.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await services.appointments.create({
        doctor_id: Number(id),
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        consultation_mode: form.consultation_mode,
        reason: form.reason || null,
      });
      setForm(EMPTY_FORM);
      setOpen(false);
      params.delete('book');
      setParams(params, { replace: true });
      navigate('/patient/appointments', { state: { booked: true } });
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader label="Loading doctor profile..." />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorMessage message={error} onRetry={reload} />
        <Button variant="secondary" onClick={() => navigate('/patient/doctors')}>
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Button>
      </div>
    );
  }
  if (!doctor) return null;

  const today = new Date();
  today.setDate(today.getDate() + 1);
  const minDate = today.toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/patient/doctors')}>
        <ArrowLeft className="h-4 w-4" /> Back to doctor search
      </Button>

      <Card>
        <CardBody>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <DoctorAvatar name={doctor.full_name} size="h-20 w-20" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-900">{doctor.full_name}</h1>
                {doctor.is_verified && (
                  <Badge tone="green">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-slate-600">
                {doctor.specialization || 'General Medicine'} · {doctor.qualification || 'N/A'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="blue">
                  <Star className="h-3 w-3" /> {doctor.experience ?? 0} years experience
                </Badge>
                <Badge tone="slate">
                  <IndianRupee className="h-3 w-3" /> {doctor.consultation_fee ?? 0} consultation
                </Badge>
                {!doctor.is_verified && <Badge tone="amber">Pending verification</Badge>}
              </div>

              {doctor.bio && <p className="mt-4 text-sm leading-relaxed text-slate-600">{doctor.bio}</p>}

              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                {doctor.hospital && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" /> {doctor.hospital.name}
                    {doctor.hospital.address ? ` · ${doctor.hospital.address}` : ''}
                  </p>
                )}
                {doctor.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" /> {doctor.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
                <CalendarDays className="h-4 w-4" /> Book Appointment
              </Button>
              {doctor.user_id && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() =>
                      navigate(
                        `/patient/messages?peer=${doctor.user_id}&name=${encodeURIComponent(doctor.full_name)}`
                      )
                    }
                  >
                    <MessageSquare className="h-4 w-4" /> Message
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() =>
                      navigate(
                        `/patient/messages?peer=${doctor.user_id}&name=${encodeURIComponent(doctor.full_name)}&call=1`
                      )
                    }
                  >
                    <Phone className="h-4 w-4" /> Call
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionHeader
            title="Before you book"
            subtitle="What to expect during your visit"
            action={<Stethoscope className="h-5 w-5 text-slate-400" />}
          />
          <ul className="space-y-2 text-sm text-slate-600">
            <li>· Bring a valid photo ID and any recent reports you have.</li>
            <li>· Write down your questions so nothing is missed during the visit.</li>
            <li>· Appointments start as <strong>pending</strong> and are confirmed by the doctor.</li>
            <li>
              · Online appointments are marked as online consultations - start a secure video call
              from the Messages page once the appointment is confirmed.
            </li>
          </ul>
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => !submitting && setOpen(false)}
        title={`Book an appointment with ${doctor.full_name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleBooking} loading={submitting} form="booking-form">
              {submitting ? 'Booking appointment...' : 'Book appointment'}
            </Button>
          </>
        }
      >
        <form id="booking-form" onSubmit={handleBooking} className="space-y-4">
          <ErrorMessage message={submitError} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="date">
              <Input
                id="date"
                type="date"
                min={minDate}
                value={form.appointment_date}
                onChange={(event) => update('appointment_date', event.target.value)}
              />
            </Field>
            <Field label="Time" htmlFor="time">
              <Select
                id="time"
                value={form.appointment_time}
                onChange={(event) => update('appointment_time', event.target.value)}
              >
                <option value="">Select a slot</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Consultation mode" htmlFor="mode">
            <Select
              id="mode"
              value={form.consultation_mode}
              onChange={(event) => update('consultation_mode', event.target.value)}
            >
              <option value="in_person">In-person visit</option>
              <option value="online">Online consultation</option>
            </Select>
          </Field>

          <Field label="Reason for visit" htmlFor="reason" hint="Optional">
            <TextArea
              id="reason"
              rows={3}
              placeholder="Briefly describe what you would like to discuss"
              value={form.reason}
              onChange={(event) => update('reason', event.target.value)}
            />
          </Field>

          <p className="text-xs text-slate-500">
            Consultation fee: {doctor.consultation_fee ?? 0}. No payment is collected in this MVP.
          </p>
        </form>
      </Modal>
    </div>
  );
}
