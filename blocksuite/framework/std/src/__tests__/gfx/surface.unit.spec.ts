import {
  createAutoIncrementIdGenerator,
  TestWorkspace,
} from '@blocksuite/store/test';
import { describe, expect, test, vi } from 'vitest';

import { effects } from '../../effects.js';
import {
  RootBlockSchemaExtension,
  type SurfaceBlockModel,
  SurfaceBlockSchemaExtension,
} from '../test-schema.js';

effects();

const extensions = [RootBlockSchemaExtension, SurfaceBlockSchemaExtension];

function createTestOptions() {
  const idGenerator = createAutoIncrementIdGenerator();
  return { id: 'test-collection', idGenerator };
}

describe('surface basic', () => {
  const commonSetup = () => {
    const collection = new TestWorkspace(createTestOptions());

    collection.meta.initialize();
    const doc = collection.createDoc('home');
    const store = doc.getStore({ extensions });
    doc.load();

    const rootId = store.addBlock('test:page');
    const surfaceId = store.addBlock('test:surface', {}, rootId);

    const surfaceBlock = store.getBlock(surfaceId)!;

    return {
      surfaceId,
      surfaceModel: surfaceBlock.model as SurfaceBlockModel,
    };
  };

  test('created observer should be called', () => {
    const { surfaceModel } = commonSetup();

    let expectPayload;
    const elementAddedCallback = vi.fn(payload => (expectPayload = payload));

    surfaceModel.elementAdded.subscribe(elementAddedCallback);

    const shapeId = surfaceModel.addElement({
      type: 'testShape',
      rotate: 0,
      xywh: '[0, 0, 10, 10]',
    });

    expect(elementAddedCallback).toHaveBeenCalled();
    expect(expectPayload).toMatchObject({
      id: shapeId,
    });
  });

  test('update and props observer should be called', () => {
    const { surfaceModel } = commonSetup();

    const shapeId = surfaceModel.addElement({
      type: 'testShape',
      rotate: 0,
      xywh: '[0, 0, 10, 10]',
    });
    const shapeModel = surfaceModel.getElementById(shapeId)!;

    let expectPayload;
    const elementUpdatedCallback = vi.fn(payload => (expectPayload = payload));
    let propsUpdatedPayload;
    const propsUpdatedCallback = vi.fn(payload => {
      propsUpdatedPayload = payload;
    });

    surfaceModel.elementUpdated.subscribe(elementUpdatedCallback);
    shapeModel.propsUpdated.subscribe(propsUpdatedCallback);

    surfaceModel.updateElement(shapeId, {
      rotate: 10,
    });

    expect(elementUpdatedCallback).toHaveBeenCalled();
    expect(propsUpdatedCallback).toHaveBeenCalled();
    expect(expectPayload).toMatchObject({
      id: shapeId,
      props: {
        rotate: 10,
      },
      oldValues: {
        rotate: 0,
      },
    });
    expect(propsUpdatedPayload).toMatchObject({
      key: 'rotate',
    });
  });

  test('delete observer should be called', () => {
    const { surfaceModel } = commonSetup();

    const shapeId = surfaceModel.addElement({
      type: 'testShape',
      rotate: 0,
      xywh: '[0, 0, 10, 10]',
    });

    let expectPayload;
    const deletedCallback = vi.fn(payload => (expectPayload = payload));

    surfaceModel.elementRemoved.subscribe(deletedCallback);
    surfaceModel.deleteElement(shapeId);

    expect(deletedCallback).toHaveBeenCalled();
    expect(expectPayload).toMatchObject({
      id: shapeId,
      type: 'testShape',
    });
  });
});
