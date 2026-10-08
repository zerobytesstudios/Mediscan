import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { services, errorMessage } from '../../services/api';
import Button from '../../components/Button';
import { Card, CardBody, SectionHeader } from '../../components/Card';
import { Field, Input, TextArea } from '../../components/Input';
import { ErrorMessage } from '../../components/Feedback';

export default function HospitalProfilePage() {
  const [form, setForm] = useState({ name: '', address: '', phone: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    services.hospitals
      .getMyProfile()
      .then((profile) =>
        setForm({
          name: profile.name || '',
          address: profile.address || '',
          phone: profile.phone || '',
          description: profile.description || '',
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
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Hospital name is required.' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await services.hospitals.updateMyProfile({
        name: form.name.trim(),
        address: form.address || null,
        phone: form.phone || null,
        description: form.description || null,
      });
      setMessage({ type: 'success', text: 'Hospital profile saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card p-6 text-sm text-slate-500">Loading hospital profile...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hospital Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Basic details shown to doctors and patients.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardBody>
            <SectionHeader title="Hospital details" />
            <ErrorMessage message={message.type === 'error' ? message.text : ''} />
            {message.type === 'success' && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <Field label="Hospital name" htmlFor="name">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                />
              </Field>
              <Field label="Address" htmlFor="address">
                <Input
                  id="address"
                  placeholder="Street, city, state"
                  value={form.address}
                  onChange={(event) => update('address', event.target.value)}
                />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                />
              </Field>
              <Field label="Description" htmlFor="description">
                <TextArea
                  id="description"
                  rows={4}
                  placeholder="Departments, facilities and other details"
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                />
              </Field>
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
