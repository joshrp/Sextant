import type { Route } from "./+types/home";
import { Factory } from "../factory/factory";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <Factory />;
}
