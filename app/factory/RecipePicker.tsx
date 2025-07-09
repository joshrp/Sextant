import { ClockIcon } from "@heroicons/react/24/solid";
import { loadMachineData, loadProductData, loadRecipeData, type ProductId, type Recipe, type RecipeId } from "./graph/loadJsonData";

const productData = loadProductData();
const recipeData = loadRecipeData();
const machineData = loadMachineData();

export default function RecipePicker({
  productId,
  productIs = "output",
  selectRecipe,
}: {
  productId: ProductId;
  productIs?: "input" | "output" | "any";
  selectRecipe: (recipeId: RecipeId) => void;
}) {

  const product = productData[productId];
  let recipes: Recipe[] = [];
  if (productIs === "input" || productIs === "any") {
    recipes.concat(product.recipes.input.map(id => recipeData[id]));
  }
  if (productIs === "output" || productIs === "any") {
    recipes = recipes.concat(product.recipes.output.map(id => recipeData[id]));
  }

  if (!product) {
    return <div className="text-red-500">Product not found</div>;
  }

  if (recipes.length === 0) {
    return <div className="text-gray-500">No recipes available for {product.name} {productIs !== "any" ? `as an ${productIs}` : ""}</div>;
  }

  return (<>
    {recipes.map(recipe => {
      const machine = machineData[recipe.machine];

      const inputs = recipe.inputs.map((input, index) => {
        const product = productData[input.id];
        return (<>
          {index > 0 && (<div className="flex-1 p-1 self-center-safe">+</div>)}
          <div key={input.id} className="flex-1 ">
            <img src={'/assets/products/' + product.icon} alt={product.name} className="block mb-2 mx-auto max-w-[60px]" />
            {product.name} <br />
            x {input.quantity}
          </div>
        </>);
      });

      const outputs = recipe.outputs.map((output, index) => {
        const product = productData[output.id];
        return (<>
          {index > 0 && (<div className="flex-1 p-1 self-center-safe">+</div>)}
          <div key={output.id} className="flex-1 justify-self-end-safe">
            <img src={'/assets/products/' + product.icon} alt={product.name} className="block mb-2 mx-auto max-w-[60px]" />
            {product.name}<br />
            x {output.quantity.toPrecision(2)}
          </div>
        </>);
      });

      return (
        <div key={recipe.id} className="flex flex-row p-2 flex-nowrap gap-1 justify-between cursor-pointer rounded text-xs hover:bg-blue-500 " onClick={() => selectRecipe(recipe.id)}>
          {/* Building */}
          <div className="flex-1 max-w-40 items-center-safe">
            <div className="flex gap-1 items-center-safe">
              <div className="flex-3">
                <img src={'/assets/buildings/' + machine.icon} alt={machine.name} className="block" />
                {machine.name}
              </div>
              <div className="flex-1">&rarr;</div>
            </div>
          </div>
          {/* Inputs, Duration, Outputs */}
          <div className={"flex-" + inputs.length + " flex flex-row gap-1 justify-items-end-safe"}>
            {inputs}
          </div>
          <div className="flex-1 self-center-safe text-center align-middle">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-6 inline" viewBox="0 0 10 20" fill="currentColor">
              <path fillRule="evenodd" d="m -8 5 L 11 5 L 11 3 L 14 6 L 11 9 V 7 H -8 Z" clipRule="evenodd" />
            </svg><br/>

            {recipe.duration} <ClockIcon className="inline w-4 pb-1  text-gray-500" />
          </div>
          <div className={"flex-" + outputs.length + " flex flex-row gap-1 justify-items-end-safe"}>
            {outputs}
          </div>
        </div>
      )
    })}
  </>);
}
