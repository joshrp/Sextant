import RecipeNode from './factory/graph/RecipeNode';
import type { RecipeNodeData } from './factory/graph/recipeNodeLogic';
import type { RecipeId } from './factory/graph/loadJsonData';
import { createTestFactoryStore, getFactoryWrapper } from './test/helpers/renderHelpers';
import type { NodeProps } from '@xyflow/react';

const createNodeProps = (data: RecipeNodeData, id = 'test-node-1') => ({
  id,
  position: { x: 0, y: 0 },
  type: 'recipe-node',
  data,
  dragging: false,
  zIndex: 100,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  isConnectable: true
});

const factoryId = 'test-factory-1';
const factoryName = 'Test Factory 1';
const testStore = createTestFactoryStore(factoryId, factoryName);

const simpleNode = (props: NodeProps & {data: RecipeNodeData}) => {
  return getFactoryWrapper(
    <div style={{ background: '#1a1a1a', padding: '20px', resize: 'both'}} >
      <RecipeNode {...props} />
    </div>
    , {
      withReactFlow: true,
      store: testStore,
      factoryId,
      factoryName
    })
}

export default {
  'Power Generator': () => simpleNode(createNodeProps({
    recipeId: 'PowerGeneratorT2' as RecipeId,
    ltr: true,
  })),
  'Power Generator Flipped': () => simpleNode(createNodeProps({
    recipeId: 'PowerGeneratorT2' as RecipeId,
    ltr: false,
  })),
  'FBR': () => simpleNode(createNodeProps({
    recipeId: 'FastBreederReactorEnrichment2' as RecipeId,
    ltr: true,
  })),
};
