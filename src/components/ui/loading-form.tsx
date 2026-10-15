"use client";
import { createPortal, useFormStatus } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ComponentProps, type MutableRefObject, type ReactNode, type RefObject } from "react";
import { LoadingIndicator } from "./loading-indicator";
function FormBody({ children, label, busy, formRef, lockRef, host }: { children: ReactNode; label: string; busy: boolean; formRef: RefObject<HTMLFormElement|null>; lockRef: MutableRefObject<boolean>; host: Element|null }) {
 const { pending } = useFormStatus();
 useEffect(() => {
  lockRef.current = pending;
  const node=formRef.current;if(!node)return;
  node.inert=busy||pending;node.setAttribute('aria-busy',String(busy||pending));
  return()=>{node.inert=false;};
 },[pending,busy,formRef,lockRef]);
 const indicator=(pending||busy)?<LoadingIndicator overlay label={label}/>:null;
 return <>{children}{indicator&&(host?createPortal(indicator,host):indicator)}</>;
}
export function LoadingForm({ children, loadingLabel = "กำลังบันทึก…", busy = false, onSubmit, ...props }: ComponentProps<"form"> & { loadingLabel?: string; busy?: boolean }) {
 const formRef=useRef<HTMLFormElement|null>(null),lockRef=useRef(false);
 const [host,setHost]=useState<Element|null>(null);
 const attach=useCallback((node:HTMLFormElement|null)=>{formRef.current=node;setHost(node?.closest('dialog')??node?.ownerDocument.body??null);},[]);
 return <form {...props} ref={attach} onSubmit={event=>{if(lockRef.current||busy){event.preventDefault();return;}onSubmit?.(event);if(!event.defaultPrevented&&typeof props.action==='function')lockRef.current=true;}}><FormBody label={loadingLabel} busy={busy} formRef={formRef} lockRef={lockRef} host={host}>{children}</FormBody></form>;
}
