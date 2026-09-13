import { useApp } from "../context/AppContext";

export default function Toast() {
  // No props — reads toast directly from context
  const { toast } = useApp();
  return toast ? <div className="toast show">{toast}</div> : null;
}