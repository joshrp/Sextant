import { type RouteConfig, route } from "@react-router/dev/routes";

export default [route("/factories/:selectedId", "routes/home.tsx", [
   route("settings", "components/FactorySettings.tsx"),
])] satisfies RouteConfig;
