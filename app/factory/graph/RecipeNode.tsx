import { TrashIcon } from '@heroicons/react/24/outline';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { useStore } from 'zustand';
import { formatNumber, machineIcon, productIcon } from '~/uiUtils';
import useFactory from '../FactoryContext';
import { loadData, type RecipeId, type RecipeProduct } from './loadJsonData';

const { recipes } = loadData();

export type RecipeNodeData = {
  solution?: {
    solved: true,
    // Mult for the recipe
    runCount: number,
  } | {
    solved: false
  },
  recipeId: RecipeId; // Unique identifier for the recipe
};

const handleStyle: React.CSSProperties = { width: "auto", height: "auto", position: "relative", top: "initial", transform: "initial", left: "initial", right: "initial", bottom: "initial", border: 'none', backgroundColor: 'transparent' }

export type RecipeNode = Node<RecipeNodeData>;

function RecipeNode(props: NodeProps<RecipeNode>) {
  const recipe = recipes.get(props.data.recipeId);
  if (!recipe) {
    console.error("Recipe not found for id:", props.data.recipeId);
    return <div className="recipe-node-error">Recipe not found</div>;
  }

  const solution = props.data.solution;
  let runCount = 1;
  if (solution?.solved && solution.runCount !== undefined) {
    runCount = solution.runCount;
  }
  const getQuantityDisplay = (recipeProd: RecipeProduct) => {
    const amount = recipeProd.quantity * runCount;

    return formatNumber(amount, recipeProd.product.unit);
  }
  const removeNode = useStore(useFactory().store, state => state.removeNode);
  return (
    <div className="recipe-node min-w-10 min-h-20 relative p-2 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
      <div className="recipe-node-title-bar flex justify-between border-white/20 mb-8 pb-2 border-b-2 items-center-safe ">
        <div className="flex-1 text-left p-1"></div>
        <div className="flex-10 text-center text-xl">{recipe.machine.name}</div>
        <div className="flex-1 justify-end-safe text-right ">
          <button className="cursor-pointer text-red-500/50 hover:text-white/80 hover:bg-red-500/50 p-1 rounded" onClick={() => removeNode(props.id)}>
            <TrashIcon className='w-6' />
          </button>
        </div>
      </div>

      <div className="products flex flex-row gap-2 text-xl justify-between mt-4">
        <div className="recipe-inputs flex-2 relative bg-gray-800 items-start -left-2">
          {recipe.inputs.map(input => {
            const productColor = "hsl(from " + input.product.color + " h s calc(l*0.75))";
            return (<div
              style={{ backgroundColor: productColor }}
              className="recipe-input relative pl-2 flex gap-1 mb-4 items-center-safe"
              key={input.product.id} >
              <Handle type="target" position={Position.Left} id={input.product.id} style={handleStyle} className="flex-1 max-w-8 text-center">
                <img src={productIcon(input.product.icon)} alt={input.product.name} className="drop-shadow-lg/30 pointer-events-none inline max-w-8" />
              </Handle>
              <div className="min-w-4 p-2 text-shadow-md/50">
                {getQuantityDisplay(input)}
              </div>
              <div
                style={{
                  backgroundColor: productColor,
                  borderColor: productColor,
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 70% 50%)"
                }}
                className="w-6 top-0 h-full absolute -left-5 border-1  "></div>

            </div>);
          })}
        </div>
        <div className="recipe-machine flex-2 flex-col items-center text-center min-w-30">
          <img src={machineIcon(recipe.machine)} alt={recipe.machine.name}
            className="inline-block w-20 min-w-8 p-1 pointer-events-none
          bg-gray-400/10 shadow-md/20 rounded-lg
          " />
          <div className="w-full mt-1"><span className="text-sm">x</span> {formatNumber(runCount)}</div>

        </div>
        <div className="recipe-outputs flex-2 relative items-end justify-end-safe -right-2 ">
          {recipe.outputs.map(output => {
            const productColor = "hsl(from " + output.product.color + " h s calc(l*0.75))";

            return (<div style={{ backgroundColor: productColor }} key={output.product.id}
              className="recipe-output relative pr-2 flex gap-1 mb-4 items-center-safe justify-end-safe">
              <div
                style={{
                  backgroundColor: productColor,
                  borderColor: productColor,
                  clipPath: "polygon(0 0, 40% 0, 100% 50%, 40% 100%, 0 100%)"
                }}
                className="w-6 top-0 h-full absolute -right-5 border-1"></div>
              <div
                // style={{ background: output.product.color }}
                className="text-right min-w-4 p-2 text-shadow-md/50">
                {getQuantityDisplay(output)}
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={output.product.id}
                style={handleStyle}

                className="flex-1 max-w-8 align-middle text-center">
                <img src={productIcon(output.product.icon)} alt={output.product.name} className="drop-shadow-lg/30 pointer-events-none flex-1 max-w-8" />
              </Handle>

            </div>);
          })}
        </div>
      </div>
    </div>

  );
}

export default memo(RecipeNode);

