import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { services, errorMessage } from '../../services/api';
import Button from '../../components/Button';
import { Card, CardBody, SectionHeader } from '../../components/Card';
import { Field, Input, Select, TextArea } from '../../components/Input';
import { ErrorMessage } from '../../components/Feedback';

const EMPTY = {
  specialization: '',
  qualification: '',
  experience: 0,
  consultation_fee: 0,
  hospital_id: '',
  bio: '',
};

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    Promise.all([services.doctors.getMyProfile(), services.hospitals.list()])
      .then(([profile, hospitalList]) => {
        setHospitals(hospitalList);
        setForm({
          specialization: profile.specialization || '',
          qualification: profile.qualification || '',
          experience: profile.experience ?? 0,
          consultation_fee: profile.consultation_fee ?? 0,
          hospital_id: profile.hospital_id || '',
          bio: profile.bio || '',
        });
      })
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
      await services.doctors.updateMyProfile({
        specialization: form.specialization || null,
        qualification: form.qualification || null,
        experience: Number(form.experience) || 0,
        consultation_fee: Number(form.consultation_fee) || 0,
        hospital_id: form.hospital_id ? Number(form.hospital_id) : null,
        bio: form.bio || null,
      });
      setMessage({ type: 'success', text: 'Profile saved.' });
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
        <h1 className="text-2xl font-semibold text-slate-900">Doctor Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          These details are shown to patients in the doctor directory.
        </p>
      </div>

      <Card>
        <CardBody>
          <SectionHeader title="Account" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={user?.full_name || ''} disabled />
            </Field>
            <Field label="Email">
              <Input value={user?.email || ''} disabled />
            </Field>
          </div>
        </CardBody>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardBody>
            <SectionHeader title="Professional details" />
            <ErrorMessage message={message.type === 'error' ? message.text : ''} />
            {message.type === 'success' && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message.text}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Specialization" htmlFor="spec">
                <Input
                  id="spec"
                  placeholder="e.g. Cardiology"
                  value={form.specialization}
                  onChange={(event) => update('specialization', event.target.value)}
                />
              </Field>
              <Field label="Qualification" htmlFor="qual">
                <Input
                  id="qual"
                  placeholder="e.g. MBBS, MD"
                  value={form.qualification}
                  onChange={(event) => update('qualification', event.target.value)}
                />
              </Field>
              <Field label="Experience (years)" htmlFor="exp">
                <Input
                  id="exp"
                  type="number"
                  min="0"
                  max="80"
                  value={form.experience}
                  onChange={(event) => update('experience', event.target.value)}
                />
              </Field>
              <Field label="Consultation fee" htmlFor="fee">
                <Input
                  id="fee"
                  type="number"
                  min="0"
                  step="50"
                  value={form.consultation_fee}
                  onChange={(event) => update('consultation_fee', event.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Hospital" htmlFor="hospital" hint="Optional">
                  <Select
                    id="hospital"
                    value={form.hospital_id}
                    onChange={(event) => update('hospital_id', event.target.value)}
                  >
                    <option value="">Independent practice</option>
                    {hospitals.map((hospital) => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Bio" htmlFor="bio" hint="Shown on your public profile">
                  <TextArea
                    id="bio"
                    rows={4}
                    placeholder="A short description of your practice and approach"
                    value={form.bio}
                    onChange={(event) => update('bio', event.target.value)}
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
