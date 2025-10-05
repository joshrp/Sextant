
import { useMemo } from "react";
import { type RouteConfig, route } from "@react-router/dev/routes";
import { useParams } from "react-router";

const routes = [route("zones/:zone/:factory", "routes/home.tsx", [
   route("settings/:tab?", "components/Settings/FactorySettings.tsx"),
])] satisfies RouteConfig;

export function useStableParam(key: string) {
   const params = useParams();
   
   return useMemo(() => params[key], [params[key]]);
}

export default routes;
