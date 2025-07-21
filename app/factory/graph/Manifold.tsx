import { ExclamationTriangleIcon, LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import useFactory from "../FactoryContext";
import { loadProductData, type Product } from "./loadJsonData";

type ManifoldProps = {
  manifoldId: string
}

type ManifoldRender = Product & {
  amount?: number;
  flexible: boolean;
  inputs: Set<Product>;
  outputs: Set<Product>;
  constraintId: string;
}

const productData = loadProductData();
// const productIcon = (id: string) => `/assets/products/${productData[id].icon}`;


export default function Manifold(props: ManifoldProps) {
  const m = props.manifoldId;
  const useStore = useFactory().useStore;

  const model = useStore(state => state.graph);
  const edges = useStore().edges;
  const solutionUpdateAction = useStore().solutionUpdateAction;
  const freedState = useStore(state => state.freeConstraints);
  const solution = useStore(state => state.solution);
  const setEdgeData = useStore().setEdgeData;

  const freed = new Set(freedState);

  const constraint = model?.constraints[m];
  const amount = solution?.manifolds?.[m];

  const toggleFreed = (id: string) => {
    if (freed.has(id)) {
      useStore.setState(state => ({
        freeConstraints: state.freeConstraints.filter(x => x != id)
      }));
      edgesList.forEach(e => setEdgeData(e, {
        manifoldState: null
      }));
    } else {
      useStore.setState(state => ({
        freeConstraints: [...state.freeConstraints, id]
      }));
      edgesList.forEach(e => setEdgeData(e, {
                manifoldState: "Neutral"

      }));
    }
    solutionUpdateAction();
  }

  if (!constraint) {
    console.error('Constraint not found for manifold', m);
    return;
  }

  const inputs: Set<Product> = new Set();
  const outputs: Set<Product> = new Set();
  const edgesList: Set<string> = new Set();
  Object.keys(constraint.edges).forEach(e => {
    const edge = edges.find(x => x.id == e);
    if (!edge) return
    edgesList.add(e);
    model.graph[edge.source].recipe.inputs.map(p => inputs.add(productData[p.id]));
    model.graph[edge.target].recipe.outputs.map(p => outputs.add(productData[p.id]));
  });

  if (inputs.size == 0 || inputs.size == 0) return;

  const mani: ManifoldRender = {
    amount: amount,
    flexible: freed.has(m),
    ...productData[constraint.productId],
    inputs,
    outputs,
    constraintId: m,
  }

  const mouseEnter = () => {
    edgesList.forEach(e => setEdgeData(e, {
      highlight: true,
    }));
  }
  const mouseLeave = () => {
    edgesList.forEach(e => setEdgeData(e, {
      highlight: false
    }));
  }

  const isOver = mani.amount !== undefined && mani.amount > 0;
  const isUnder = mani.amount !== undefined && mani.amount < 0;
  return <div
    onMouseEnter={mouseEnter}
    onMouseLeave={mouseLeave}
    key={"manifold-" + mani.id}
    data-isOver={isOver || null}
    data-isUnder={isUnder || null}
    className="cursor-pointer my-1 border-2 rounded-sm border-gray-700 p-1 data-isOver:bg-green-800 data-isUnder:bg-amber-800"
    onClick={() => toggleFreed(mani.constraintId)}
  >
    <div className="flex flex-row h-8 mb-1">
      <div className="flex-1">
        <img className="h-full" src={'/assets/products/' + mani.icon} title={mani.name} />
      </div>
      <div className="flex-1 text-xs text-center">
        <span className="flex-1 justify-self-end text-right">{mani.flexible ? mani.amount : ''}</span>

      </div>
      <div className="flex-1 h-5 justify-self-end-safe text-right">
        {(isOver || isUnder) ? <ExclamationTriangleIcon className="h-full text-red-500 inline mt-0.5 mr-1"/> : ''}
        {mani.flexible ? <LockOpenIcon className="h-full text-green-500 inline" /> : <LockClosedIcon className="inline h-full text-gray-500" />}
      </div>
    </div>

    <div className="flex flex-row gap-1 align-middle justify-between">
      <div className="w-[45%] flex flex-wrap gap-1">
        {Array.from(mani.inputs).map(i => <div key={"manifold-input-" + i.id}>
          <img className="w-4" src={'/assets/products/' + i.icon} title={i.name} />
        </div>
        )}
      </div>
      <div className="flex w-[10%]">
        <ArrowRightIcon />
      </div>
      <div className="flex w-[45%] flex-wrap gap-1 justify-end-safe">
        {Array.from(mani.outputs).map(i => <div key={"manifold-output-" + i.id}>
          <img className="w-4" src={'/assets/products/' + i.icon} title={i.name} />
        </div>
        )}
      </div>
    </div>
  </div>

}
