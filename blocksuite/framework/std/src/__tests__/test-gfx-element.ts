import type { SerializedXYWH } from '@blocksuite/global/gfx';

import { field, GfxPrimitiveElementModel } from '../gfx/index.js';

export class TestShapeElement extends GfxPrimitiveElementModel {
  get type() {
    return 'testShape';
  }

  @field()
  accessor rotate: number = 0;

  @field()
  accessor xywh: SerializedXYWH = '[0, 0, 10, 10]';
}
