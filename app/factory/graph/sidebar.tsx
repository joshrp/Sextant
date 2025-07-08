import { loadProductData, type ProductId, type ProductData } from './loadJsonData';
// import { useStore } from '@xyflow/react';

// const transformSelector = (state: any) => state.transform;
const items = loadProductData();

type props = {
  products: ProductData;
  addProduct: (id: ProductId) => void;
};

export default ({ products, addProduct }: props) => {
  // const transform = useStore(transformSelector);

  return (
    <div className='h-full p-2 border-r-2 border-dotted border-gray-300 dark:border-gray-700'>
      <div className="title">Items</div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(50px,4fr))] gap-2 overflow-y-auto">
        {(Object.keys(items) as ProductId[]).map((key) => {
          const item = items[key];
          return (<div key={item.id} className="">
            <div id={"tooltip-"+item.id} role="tooltip" className="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-xs opacity-0 tooltip dark:bg-gray-700">
                {item.name}
                <div className="tooltip-arrow" data-popper-arrow></div>
            </div>
            <button
              data-tooltip-target={"tooltip-"+item.id}
              className="bg-transparent hover:bg-gray-500 hover:border hover:border-black-500 rounded block"
              onClick={() => addProduct(item.id)}
            ><img src={'/assets/products/' + item.icon} alt={item.name} className="inline-block p-2" />
            </button>
          </div>)
        })}
      </div>
    </div>
  );
};
