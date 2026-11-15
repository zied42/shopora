import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppFooter, Button, Input, PageHeader, SectionCard, Select } from '../../components/ui';
import { getWarehouse, saveWarehouse } from '../../lib/warehouses';
import LocationSearch from '../../components/LocationSearch';

export default function AddNewWarehouse() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const existing = editId ? getWarehouse(editId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [phone1, setPhone1] = useState(existing?.phone1 ?? '');
  const [phone2, setPhone2] = useState(existing?.phone2 ?? '');
  const [country, setCountry] = useState(existing?.country ?? 'Tunisia');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [address1, setAddress1] = useState(existing?.address1 ?? '');
  const [address2, setAddress2] = useState(existing?.address2 ?? '');

  const submit = () => {
    if (!name.trim()) return alert('Warehouse name is required');
    if (!phone1.trim()) return alert('Phone 1 is required');
    if (!country) return alert('Country is required');
    if (!location.trim()) return alert('Location is required');
    if (!address1.trim()) return alert('Address 1 is required');
    saveWarehouse({
      id: editId ?? Date.now(),
      name: name.trim(),
      phone1: phone1.trim(),
      phone2: phone2.trim(),
      country,
      location: location.trim(),
      address1: address1.trim(),
      address2: address2.trim(),
    });
    navigate('/fournisseur/warehouses');
  };

  const Label = ({ required = false, children }: { required?: boolean; children: string }) => (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );

  return (
    <div>
      <PageHeader
        title={editId ? 'Edit warehouse' : 'Add new warehouse'}
        subtitle="Warehouses keep your fulfillment center stocked — manage contact and address details below."
      />
      <div className="space-y-5">
        <SectionCard title="Warehouse details" subtitle="Identification and contact numbers.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>Warehouse name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Central warehouse" />
            </div>
            <div>
              <Label required>Phone 1</Label>
              <Input value={phone1} onChange={(e) => setPhone1(e.target.value)} placeholder="Primary contact number" />
            </div>
            <div>
              <Label>Phone 2</Label>
              <Input value={phone2} onChange={(e) => setPhone2(e.target.value)} placeholder="Optional secondary number" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Location & address" subtitle="Where the warehouse is located.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>Country</Label>
              <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="" disabled>Select customer country</option>
                <option value="Tunisia">Tunisia</option>
              </Select>
            </div>
            <div>
              <Label required>Search location</Label>
              <LocationSearch value={location} onChange={setLocation} />
            </div>
            <div>
              <Label required>Address 1</Label>
              <Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Street, building, apartment" />
            </div>
            <div>
              <Label>Address 2</Label>
              <Input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Optional extra address line" />
            </div>
          </div>
        </SectionCard>

        <Button type="button" onClick={submit} className="w-full py-2.5 sm:w-auto sm:min-w-[160px]">
          Submit
        </Button>
      </div>
      <AppFooter />
    </div>
  );
}