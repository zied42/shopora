import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryStore } from './memory';
import { isCustomerRole, isSupplierRole } from './roles';

test('restored account roles retain their distinct portal groups', () => {
  for (const role of ['customer', 'dropshipper'] as const) assert.equal(isCustomerRole(role), true);
  for (const role of ['seller', 'fournisseur'] as const) assert.equal(isSupplierRole(role), true);
  for (const role of ['admin', 'support', 'chef', 'stocking', 'confirmateur'] as const) {
    assert.equal(isCustomerRole(role), false);
    assert.equal(isSupplierRole(role), false);
  }
});

test('reservation deposit, supplier decision, refill and scan flow works', async () => {
  const store = createMemoryStore();
  const product = (await store.listProducts({ activeOnly: true })).find((item) => item.stock > 0);
  assert.ok(product, 'demo store should contain an active product with supplier stock');
  const dropshipper = await store.createUser({ name: 'QA Dropshipper', email: 'qa-dropshipper@example.test', password_hash: 'unused', role: 'dropshipper', balance: 100_000 });
  const reservationResult = await store.createReservation({ dropshipper_id: dropshipper.id, product_id: product.id, quantity: 1 });
  assert.equal(reservationResult.balance, dropshipper.balance - reservationResult.reservation.deposit);

  const supplierRows = await store.listReservations({ role: 'fournisseur', userId: product.fournisseur_id });
  assert.ok(supplierRows.some((row) => row.id === reservationResult.reservation.id));
  const accepted = await store.resolveReservation(reservationResult.reservation.id, 'accepted', product.fournisseur_id);
  assert.equal(accepted.status, 'accepted');

  await store.createReservationRefill(accepted.id, 2);
  const received = await store.updateReservationRefill(accepted.id, 2);
  assert.equal(received.available_qty, 2);
  const scanned = await store.scanReservationRefill(accepted.id);
  assert.equal(scanned.available_qty, 1);
  assert.equal((await store.listReservations({ role: 'dropshipper', userId: dropshipper.id })).length, 1);
  assert.equal((await store.listReservations({ role: 'dropshipper', userId: dropshipper.id + 1 })).length, 0);
});

test('cancelling or rejecting a pending reservation refunds its deposit', async () => {
  for (const outcome of ['cancel', 'reject'] as const) {
    const store = createMemoryStore();
    const product = (await store.listProducts({ activeOnly: true })).find((item) => item.stock > 0);
    assert.ok(product);
    const user = await store.createUser({ name: 'QA User', email: `qa-${outcome}@example.test`, password_hash: 'unused', role: 'dropshipper', balance: 100_000 });
    const { reservation, balance } = await store.createReservation({ dropshipper_id: user.id, product_id: product.id, quantity: 1 });
    if (outcome === 'cancel') await store.cancelReservation(reservation.id, user.id);
    else await store.resolveReservation(reservation.id, 'rejected', product.fournisseur_id);
    assert.equal((await store.findUserById(user.id))?.balance, user.balance);
    assert.ok(balance < user.balance);
  }
});

test('reservation creation rejects insufficient balance and a second accepted hold beyond stock', async () => {
  const store = createMemoryStore();
  const product = (await store.listProducts({ activeOnly: true })).find((item) => item.stock > 0);
  assert.ok(product);
  const poor = await store.createUser({ name: 'QA Poor', email: 'qa-poor@example.test', password_hash: 'unused', role: 'dropshipper', balance: 100 });
  await assert.rejects(store.createReservation({ dropshipper_id: poor.id, product_id: product.id, quantity: 1 }));

  const rich = await store.createUser({ name: 'QA Rich', email: 'qa-rich@example.test', password_hash: 'unused', role: 'dropshipper', balance: 1_000_000 });
  const hold = await store.createReservation({ dropshipper_id: rich.id, product_id: product.id, quantity: product.stock });
  await store.resolveReservation(hold.reservation.id, 'accepted', product.fournisseur_id);
  await assert.rejects(store.createReservation({ dropshipper_id: rich.id, product_id: product.id, quantity: 1 }));
});
