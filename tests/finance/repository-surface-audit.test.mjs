import test from 'node:test';
import assert from 'node:assert/strict';
import { kind,models,compareSurface } from '../../scripts/audit-system-parity.mjs';
const page='app/(dashboard)/dashboard/campaigns/page.tsx';
const api='app/api/admin/subscriptions/[id]/route.ts';
const cron='app/api/cron/recurring-charges/route.ts';

test('classifies UI/API/Cron and excludes SMS', () => {
  assert.equal(kind(page),'dashboard_page');
  assert.equal(kind(api),'api');
  assert.equal(kind(cron),'cron_api');
  assert.equal(kind('app/api/communication/sms/route.ts'),null);
});
test('a matching route never counts as verified functionality', () => {
  const x=compareSurface([page,api,cron],[page]);
  assert.equal(x.summary.dashboard_page.commonCount,1);
  assert.equal(x.summary.api.missingCount,1);
  assert.equal(x.summary.cron_api.missingCount,1);
  assert.equal(x.rows.find(r=>r.id===page).functionalStatus,'NOT_VERIFIED');
  assert.equal(x.summary.dashboard_page.functionallyVerified,0);
});
test('a missing Prisma field and model are visible', () => {
  const a='model Subscription {\n  id String @id\n  frequency String?\n}\nmodel DonorList {\n  id String @id\n}\n';
  const b='model Subscription {\n  id String @id\n}\n';
  assert.equal(models(a).get('Subscription').size,2);
  const x=compareSurface([],[],a,b);
  assert.equal(x.summary.prisma_model.missingCount,1);
  assert.equal(x.rows.find(r=>r.id==='prisma:model:Subscription').missingSourceFields,1);
});
test('target-only routes are separate from missing source requirements', () => {
  const x=compareSurface([page],[page,api]);
  assert.equal(x.summary.api.targetOnlyCount,1);
  assert.equal(x.summary.api.sourceCount,0);
});
