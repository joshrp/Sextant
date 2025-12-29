import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { useFactoryStore } from "~/factory/FactoryContext";
import { loadData } from "~/factory/graph/loadJsonData";
import type { HighlightProduct } from "~/factory/store";
import { productIcon } from "~/uiUtils";

const products = loadData().products;

export function FactoryOverlayBar() {
  const currentHighlight = useFactoryStore(state => state.highlight);

  const setHighlight = useFactoryStore(state => state.setHighlight);
  if (!currentHighlight) return null;

  const { mode } = currentHighlight;
  let setOptions: (options: HighlightProduct['options']) => void;

  if (mode === "product" && currentHighlight.productId) {
    const productId = currentHighlight.productId;
    const options = currentHighlight.options;

    setOptions = (options: HighlightProduct['options']) => {
      setHighlight({
        mode: "product",
        productId: productId,
        options: options
      });
    };
    const open = true;

    const product = products.get(productId);
    if (!product) return null;
    const productImg = productIcon(product.icon);
    const productName = product.name;

    return (<div data-open={open}
      className="absolute left-1/2 top-4 mx-auto z-[2000]
              min-w-2/5 translate-x-[-50%] data-open:opacity-100 data-open:visible
              opacity-0 invisible
            
              rounded-lg text-white border-2 border-white/20
            bg-zinc-900/70 backdrop-blur-sm"
    >
      <div className="flex flex-row gap-2 items-center justify-center border-b-1 border-gray-500 p-2">
        Viewing product: <img src={productImg} className="h-6 inline -mr-1" title={productName} /> {productName}
      </div>
      <div className="actions-row flex flex-row justify-center">
        <ProductViewOptionButton label="Imports" active={options.imports} onClick={() => { setOptions({ ...options, imports: !options.imports }) }} />
        <ProductViewOptionButton label="Exports" active={options.exports} onClick={() => { setOptions({ ...options, exports: !options.exports }) }} />
        <ProductViewOptionButton label="Inputs" active={options.inputs} onClick={() => { setOptions({ ...options, inputs: !options.inputs }) }} />
        <ProductViewOptionButton label="Outputs" active={options.outputs} onClick={() => { setOptions({ ...options, outputs: !options.outputs }) }} />
        <ProductViewOptionButton label="Connections" active={options.connections} onClick={() => { setOptions({ ...options, connections: !options.connections }) }} />
      </div>
    </div>)
  } else {
    return null;
  }
}

function ProductViewOptionButton(props: {
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return <div
    className={
      "button-inline h-full flex flex-row cursor-pointer items-center-safe transition-colors duration-100 " +
      "py-2 px-3 not-first:border-l-1 border-gray-500 hover:bg-zinc-800 " +
      (props.active ?
        "text-white bg-zinc-800 hover:text-gray-300"
        :
        "text-gray-600 ")
    }
    onClick={props.onClick}
  >
    <div className="mr-1">
      {props.active ? <EyeIcon className="h-4" /> : <EyeSlashIcon className="h-4" />}
    </div>
    <div className="">
      {props.label}
    </div>
  </div>
}
