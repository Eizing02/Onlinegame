import {notFound} from "next/navigation";
import {SceneCalibration} from "./scene-calibration";
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <SceneCalibration/>;}
