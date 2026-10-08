import { useEffect, useState } from 'react';
import { Save, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { services, errorMessage } from '../../services/api';
import Button from '../../components/Button';
import { Card, CardBody, SectionHeader } from '../../components/Card';
import { Field, Input, Select, TextArea } from '../../components/Input';
import { ErrorMessage } from '../../components/Feedback';

const EMPTY = {
  date_of_birth: '',
  gender: '',
  blood_group: '',
  address: '',
  emergency_contact: '',
  allergies: '',
  chronic_conditions: '',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PatientProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    services.patients
      .getProfile()
      .then((profile) =>
        setForm({
          date_of_birth: profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : '',
          gender: profile.gender || '',
          blood_group: profile.blood_group || '',
          address: profile.address || '',
          emergency_contact: profile.emergency_contact || '',
          allergies: profile.allergies || '',
          chronic_conditions: profile.chronic_conditions || '',
        })
      )
      .catch((error) => setMessage({ type: 'error', text: errorMessage(error) }))
      .finally(() => setLoading(false));
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await services.patients.updateProfile({
        ...form,
        date_of_birth: form.date_of_birth || null,
      });
      setMessage({ type: 'success', text: 'Profile saved successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card p-6 text-sm text-slate-500">Loading your profile...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Keep these details up to date so doctors have the right context.
        </p>
      </div>

      <Card>
        <CardBody>
          <SectionHeader
            title="Account"
            subtitle="Basic details from registration"
            action={<UserRound className="h-5 w-5 text-slate-400" />}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={user?.full_name || ''} disabled />
            </Field>
            <Field label="Email">
              <Input value={user?.email || ''} disabled />
            </Field>
            <Field label="Phone">
              <Input value={user?.phone || ''} disabled />
            </Field>
            <Field label="Role">
              <Input value={user?.role || ''} disabled />
            </Field>
          </div>
        </CardBody>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardBody>
            <SectionHeader title="Medical profile" subtitle="Used for context during consultations" />
            <ErrorMessage
              message={message.type === 'error' ? message.text : ''}
            />
            {message.type === 'success' && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message.text}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date of birth" htmlFor="dob">
                <Input
                  id="dob"
                  type="date"
                  value={form.date_of_birth}
                  onChange={(event) => update('date_of_birth', event.target.value)}
                />
              </Field>
              <Field label="Gender" htmlFor="gender">
                <Select
                  id="gender"
                  value={form.gender}
                  onChange={(event) => update('gender', event.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Blood group" htmlFor="blood">
                <Select
                  id="blood"
                  value={form.blood_group}
                  onChange={(event) => update('blood_group', event.target.value)}
                >
                  <option value="">Not specified</option>
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Emergency contact" htmlFor="emergency">
                <Input
                  id="emergency"
                  placeholder="+91-9876543210"
                  value={form.emergency_contact}
                  onChange={(event) => update('emergency_contact', event.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address" htmlFor="address">
                  <Input
                    id="address"
                    placeholder="Street, city, state"
                    value={form.address}
                    onChange={(event) => update('address', event.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Known allergies" htmlFor="allergies" hint="Optional">
                  <TextArea
                    id="allergies"
                    rows={3}
                    placeholder="e.g. penicillin, dust"
                    value={form.allergies}
                    onChange={(event) => update('allergies', event.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Chronic conditions" htmlFor="conditions" hint="Optional">
                  <TextArea
                    id="conditions"
                    rows={3}
                    placeholder="e.g. type 2 diabetes, hypertension"
                    value={form.chronic_conditions}
                    onChange={(event) => update('chronic_conditions', event.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="submit" loading={saving}>
                <Save className="h-4 w-4" /> Save profile
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
