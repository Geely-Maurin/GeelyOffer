import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getStandardEquipment } from './standardEquipment.js';

describe('getStandardEquipment', () => {
  test('returns an empty array for an unknown vehicle name', () => {
    assert.deepEqual(getStandardEquipment('Unknown Model', 'PRO'), []);
  });

  test('PRO and PRO+ get identical equipment lists (no MAX+ extras)', () => {
    const pro = getStandardEquipment('Geely E5', 'PRO');
    const proPlus = getStandardEquipment('Geely E5', 'PRO+');
    assert.deepEqual(pro, proPlus);
  });

  test('MAX+ includes everything PRO+ has, plus extras', () => {
    const proPlus = getStandardEquipment('Geely E5', 'PRO+');
    const maxPlus = getStandardEquipment('Geely E5', 'MAX+');

    const proPlusItemCount = proPlus.reduce((sum, group) => sum + group.items.length, 0);
    const maxPlusItemCount = maxPlus.reduce((sum, group) => sum + group.items.length, 0);
    assert.ok(maxPlusItemCount > proPlusItemCount, 'MAX+ should have strictly more items than PRO+');
  });

  test('E5 MAX+ never lists both 18" and 19" wheels at once (regression test for the contradiction bug)', () => {
    const maxPlus = getStandardEquipment('Geely E5', 'MAX+');
    const allItems = maxPlus.flatMap((group) => group.items);
    assert.ok(!allItems.includes('18" lichtmetalen wielen'), 'MAX+ should not still list the PRO/PRO+ 18" wheels');
    assert.ok(allItems.some((item) => item.includes('19" lichtmetalen wielen')), 'MAX+ should list 19" wheels');
  });

  test('Geely E2 trims each get only their own battery, wheels and audio (per-trim items)', () => {
    const items = (model) => getStandardEquipment('Geely E2', model).flatMap((group) => group.items);
    const pro = items('PRO');
    const max = items('MAX');
    const ultra = items('ULTRA');

    assert.ok(pro.some((i) => i.startsWith('35 kWh batterij')) && !pro.some((i) => i.startsWith('47 kWh batterij')));
    for (const trim of [max, ultra]) {
      assert.ok(trim.some((i) => i.startsWith('47 kWh batterij')) && !trim.some((i) => i.startsWith('35 kWh batterij')));
    }

    for (const trim of [pro, max]) {
      assert.ok(trim.includes('16" stalen velgen met klaverdesign') && !trim.includes('16" lichtmetalen velgen'));
      assert.ok(trim.includes('4-speaker audiosysteem met FM-radio en DAB') && !trim.includes('6-speaker audiosysteem'));
    }
    assert.ok(ultra.includes('16" lichtmetalen velgen') && !ultra.includes('16" stalen velgen met klaverdesign'));
    assert.ok(ultra.includes('6-speaker audiosysteem') && !ultra.includes('4-speaker audiosysteem met FM-radio en DAB'));

    assert.ok(!pro.includes('Verwarmbare voorstoelen en stuurwiel') && max.includes('Verwarmbare voorstoelen en stuurwiel'));
    assert.ok(pro.length < max.length && max.length < ultra.length);
  });

  test('every Geely E2 item has a French translation', () => {
    for (const model of ['PRO', 'MAX', 'ULTRA']) {
      const nl = getStandardEquipment('Geely E2', model).flatMap((group) => group.items);
      const fr = getStandardEquipment('Geely E2', model, 'fr').flatMap((group) => group.items);
      const untranslated = nl.filter((item, i) => fr[i] === item);
      assert.deepEqual(untranslated, [], `untranslated E2 ${model} items`);
    }
  });

  test('every category name is unique within a single result', () => {
    for (const [name, model] of [['Geely E5', 'MAX+'], ['Starray EM-i', 'MAX+'], ['Geely E2', 'ULTRA']]) {
      const categories = getStandardEquipment(name, model).map((g) => g.category);
      assert.equal(new Set(categories).size, categories.length, `${name} ${model} has duplicate category names`);
    }
  });
});
