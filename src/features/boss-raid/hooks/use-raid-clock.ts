"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** A server-synchronized monotonic clock. Polling and local wall-clock edits cannot restart it. */
export function useRaidClock(deadline: string | null, serverNow: string, ended = false) {
 const anchor = useRef({ server: Date.parse(serverNow), local: 0, deadline });
 const [seconds, setSeconds] = useState(() => deadline && !ended ? Math.max(0, Math.ceil((Date.parse(deadline)-Date.parse(serverNow))/1000)) : 0);
 const remaining = useCallback(() => !deadline || ended ? 0 : Math.max(0, Date.parse(deadline)-anchor.current.server-(performance.now()-anchor.current.local)), [deadline, ended]);
 useEffect(() => {
  const local=performance.now(), projected=anchor.current.server+local-anchor.current.local;
  anchor.current={server:anchor.current.local>0&&anchor.current.deadline===deadline?Math.max(projected,Date.parse(serverNow)):Date.parse(serverNow),local,deadline};
  const update=()=>setSeconds(Math.ceil(remaining()/1000));
  update();const interval=setInterval(update,100);return()=>clearInterval(interval);
 },[deadline,serverNow,remaining]);
 return { seconds, remaining };
}
