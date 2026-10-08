import { useEffect, useState } from 'react';
import { CalendarDays, Check, ClipboardPlus, X } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { services, errorMessage } from '../../services/api';
import AppointmentCard, { AppointmentAction } from '../../components/AppointmentCard';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { SectionHeader } from '../../components/Card';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { Field, Input, TextArea } from '../../components/Input';

export default function DoctorAppointmentsPage() {
  const { data, loading, error, reload, setData } = useFetch(() =>
    services.appointments.list(true)
  );
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteForm, setNoteForm] = useState({ notes: '', record_title: '', follow_up_date: '' });
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  async function updateStatus(id, status) {
    setBusyId(id);
    setActionError('');
    try {
      const updated = await services.appointments.updateStatus(id, status);
      setData((current) =>
        (current || []).map((item) => (item.id === id ? { ...item, ...updated } : item))
      );
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function openNotes(appointment) {
    setNoteTarget(appointment);
    setNoteForm({
      notes: '',
      record_title: `Consultation ${new Date(appointment.appointment_date).toLocaleDateString()}`,
      follow_up_date: '',
    });
    setNoteError('');
    setNoteOpen(true);
  }

  async function saveNote(event) {
    event.preventDefault();
    if (!noteTarget) return;
    if (noteForm.notes.trim().length < 2) {
      setNoteError('Consultation notes are required.');
      return;
    }
    setSavingNote(true);
    setNoteError('');
    try {
      await services.consultations.create({
        appointment_id: noteTarget.id,
        notes: noteForm.notes.trim(),
        record_title: noteForm.record_title || null,
        follow_up_date: noteForm.follow_up_date
          ? new Date(`${noteForm.follow_up_date}T00:00:00`).toISOString()
          : null,
        create_medical_record: true,
      });
      setNoteOpen(false);
      await reload();
    } catch (err) {
      setNoteError(errorMessage(err));
    } finally {
      setSavingNote(false);
    }
  }

  useEffect(() => undefined, []);

  if (loading) return <PageLoader label="Loading appointments..." />;

  const appointments = data || [];
  const pending = appointments.filter((item) => item.status === 'pending');
  const active = appointments.filter((item) => ['confirmed'].includes(item.status));
  const others = appointments.filter(
    (item) => !['pending', 'confirmed'].includes(item.status)
  );

  function renderList(items, emptyText) {
    if (items.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((appointment) => {
          const actions = [];
          if (appointment.status === 'pending') {
            actions.push(
              <AppointmentAction
                key="confirm"
                onClick={() => updateStatus(appointment.id, 'confirmed')}
                loading={busyId === appointment.id}
              >
                <Check className="h-4 w-4" /> Confirm
              </AppointmentAction>
            );
          }
          if (['pending', 'confirmed'].includes(appointment.status)) {
            actions.push(
              <AppointmentAction
                key="note"
                onClick={() => openNotes(appointment)}
                title="Write consultation notes"
              >
                <ClipboardPlus className="h-4 w-4" /> Notes
              </AppointmentAction>,
              <AppointmentAction
                key="complete"
                onClick={() => updateStatus(appointment.id, 'completed')}
                loading={busyId === appointment.id}
              >
                Complete
              </AppointmentAction>,
              <AppointmentAction
                key="cancel"
                onClick={() => updateStatus(appointment.id, 'cancelled')}
                loading={busyId === appointment.id}
              >
                <X className="h-4 w-4" />
              </AppointmentAction>
            );
          }
          return (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              actions={actions}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Appointments"
        subtitle="Review requests, confirm visits and write consultation notes"
      />

      <ErrorMessage message={error || actionError} onRetry={error ? reload : undefined} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Pending requests
        </h2>
        {renderList(pending, 'No pending requests right now.')}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Confirmed
        </h2>
        {renderList(active, 'No confirmed appointments yet.')}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Completed and cancelled
        </h2>
        {renderList(others, 'Nothing here yet.')}
      </section>

      <Modal
        open={noteOpen}
        onClose={() => !savingNote && setNoteOpen(false)}
        title="Consultation notes"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteOpen(false)} disabled={savingNote}>
              Cancel
            </Button>
            <Button onClick={saveNote} loading={savingNote}>
              {savingNote ? 'Saving...' : 'Save notes'}
            </Button>
          </>
        }
      >
        <form onSubmit={saveNote} className="space-y-4">
          <ErrorMessage message={noteError} />
          {noteTarget && (
            <p className="text-sm text-slate-500">
              Patient appointment on{' '}
              {new Date(noteTarget.appointment_date).toLocaleDateString()} at{' '}
              {noteTarget.appointment_time}
            </p>
          )}
          <Field label="Consultation notes" htmlFor="notes">
            <TextArea
              id="notes"
              rows={6}
              placeholder="Observations, advice given, tests recommended..."
              value={noteForm.notes}
              onChange={(event) => setNoteForm({ ...noteForm, notes: event.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Record title" htmlFor="title">
              <Input
                id="title"
                value={noteForm.record_title}
                onChange={(event) => setNoteForm({ ...noteForm, record_title: event.target.value })}
              />
            </Field>
            <Field label="Follow-up date (optional)" htmlFor="follow">
              <Input
                id="follow"
                type="date"
                value={noteForm.follow_up_date}
                onChange={(event) =>
                  setNoteForm({ ...noteForm, follow_up_date: event.target.value })
                }
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            Saving also adds a medical record for the patient and marks the appointment completed.
          </p>
        </form>
      </Modal>
    </div>
  );
}
