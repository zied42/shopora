import { ProductTable } from '../../components/ProductTable';
import { PageHeader } from '../../components/ui';

export default function AdminProducts() {
  return (
    <div>
      <PageHeader title="All products" subtitle="Every product across all suppliers" />
      <ProductTable canManage />
    </div>
  );
}