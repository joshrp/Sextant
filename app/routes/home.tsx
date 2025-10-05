import { XMarkIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { FactoryProvider } from "~/context/FactoryProvider";
import useProductionZone, { useProductionZoneStore } from "~/context/ZoneContext";
import { ProductionZoneProvider } from "~/context/ZoneProvider";
import { loadData } from "~/factory/graph/loadJsonData";
import { useStableParam } from "~/routes";
import { machineIcon, productIcon, uiIcon } from "~/uiUtils";
import { Factory } from "../factory/factory";
import useFactory from "~/factory/FactoryContext";


// eslint-disable-next-line react-refresh/only-export-components
export function meta() {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

const { products, machines } = loadData();

export default function Home() {
  const selectedZone = useStableParam("zone");

  console.log('Home render zone', selectedZone);

  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    const newImg = Array.from(products.values().map(p => productIcon(p.icon)));
    newImg.push(...Array.from(machines.values().map(m => machineIcon(m))));
    newImg.push(uiIcon("Worker"));
    newImg.push(uiIcon("Electricity"));
    newImg.push(uiIcon("Workers"));
    newImg.push(uiIcon("Computing"));
    newImg.push(uiIcon("Maintenance"));
    setImages(newImg);
  }, [products, machines]);

  return useMemo(() => <>
    <ProductionZoneProvider zoneId={selectedZone || "default"}>
      <main className="h-[100vh]">
        <Zone />
        {images.map((img, idx) => (
          <link key={idx} rel="preload" href={img} as="image" />
        ))}
      </main >
    </ProductionZoneProvider>
  </>, [selectedZone, images]);
}

function Zone() {
  const selectedFactoryId = useStableParam("factory");

  if (!selectedFactoryId) throw new Error("No factory selected");
  const baseWeights = useProductionZoneStore(state => state.weights);
  const factories = useProductionZoneStore(state => state.factories);
  const selectedFactory = factories.find(f => f.id === selectedFactoryId);
  const idb = useProductionZone().idb;
  
  return useMemo(() => <>
    <FactoryProvider idb={idb} id={selectedFactoryId} name={selectedFactory?.name || "Default"} weights={baseWeights}>
      <div className="flex flex-col justify-stretch h-full">
        <Header />

        <Factory />

        <Outlet />
      </div>
    </FactoryProvider>
  </>, [selectedFactoryId, baseWeights]);
}

function Header() {
  const nav = useNavigate();
  const selectedFactory = useFactory().id;
  const zoneId = useProductionZone().id;

  const factories = useProductionZoneStore(state => state.factories);
  // const selectedId = useProductionZoneStore(state => state.selected);
  console.log('Header render', { selectedFactory, factories });
  const changeTab = (e: React.MouseEvent<unknown, MouseEvent>, id: string) => {
    nav(`/zones/${zoneId}/${id}`);
    e.preventDefault();
  }
  const addNewFactory = useProductionZoneStore(state => state.newFactory);

  const [inputNewName, setInputNewName] = useState<boolean>(false);

  const [newName, setNewName] = useState<string>("");
  const newFactory = () => {
    addNewFactory(newName || "New Factory");
    setNewName("");
    setInputNewName(false);
  };

  return useMemo(() => <header className="w-full bg-gray-800">
    <div className="max-w-[100vw] p-4">
      Factory
    </div>
    <div className="factoryTabs relative w-full h-15 overflow-hidden ">
      <ul className="flex flex-row gap-2 min-h-10 bottom-0 left-2 absolute w-[100vw] max-h-18 overflow-x-auto">
        {factories.map(f => (
          <li key={f.id} className="first:ml-2">
            <a
              data-is-selected={f.id == selectedFactory || null}
              className="inline-block p-2 bg-black rounded-t text-white 
                border-2 border-black border-b-0 border-double  hover:bg-gray-600 
                data-is-selected:border-amber-500
                data-is-selected:hover:bg-black data-is-selected:cursor-default
                "
              onClick={(e) => changeTab(e, f.id)}
              href={`/factories/${f.id}`}>
              {f.name}</a>
          </li>)
        )}
        <li className="p-2 bg-black rounded-t text-white">
          {inputNewName
            ? <form className="flex flex-row gap-1" onSubmit={newFactory}>
              <XMarkIcon onClick={() => {
                setInputNewName(false);
                setNewName("");
              }} className="h-6 w-6 text-red-500 inline-block cursor-pointer" />
              <input
                type="text"
                className="bg-gray-700 text-white rounded w-40 px-2"
                value={newName}
                onChange={e => {
                  console.log('change', e.target.value)

                  setNewName(e.target.value);
                }}
              />
              <CheckIcon onClick={() => newFactory()} className="h-6 w-6 text-green-500 inline-block cursor-pointer" />
            </form>
            : <span onClick={() => setInputNewName(true)} className="border-0 h-full cursor-pointer text-gray-400 hover:text-white">
              {"+"}
            </span>
          }
        </li>
      </ul>
    </div>

  </header>, [factories, selectedFactory, inputNewName, newName]);
}
