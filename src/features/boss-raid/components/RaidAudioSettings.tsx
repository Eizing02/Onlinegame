"use client";
import type {RaidAudioControls} from "../hooks/use-raid-audio";
import {AudioControl} from "@/components/audio/audio-control";
export function RaidAudioSettings({audio}:{audio:RaidAudioControls}){
 return <div className="raid-audio-controls"><AudioControl/>{audio.warning&&<p className="raid-audio-warning" role="status">{audio.warning}</p>}</div>;
}
