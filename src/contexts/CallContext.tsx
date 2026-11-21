import { createContext, useContext, ReactNode } from "react";
import { useCall } from "../hooks/useCall";
import CallOverlay from "@/components/CallOverlay";

type CallContextValue = ReturnType<typeof useCall>;
const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const call = useCall();
  return (
    <CallContext.Provider value={call}>
      {children}
      <CallOverlay call={call} />
    </CallContext.Provider>
  );
};

export const useCallContext = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
};

