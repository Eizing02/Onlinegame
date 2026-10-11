import { notFound } from "next/navigation";
import { AssetPreview } from "./preview";
export default function Page() { if (process.env.NODE_ENV !== "development") notFound(); return <AssetPreview />; }
