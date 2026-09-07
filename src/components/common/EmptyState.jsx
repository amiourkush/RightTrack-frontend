import { isValidElement } from "react";

export default function EmptyState({ icon = null, title = "", text = "", description = "", action = null }) {
  const iconNode = isValidElement(icon) ? icon : null;
  const message = typeof text === "string" ? text : (typeof description === "string" ? description : "");

  return (
    <div className="empty-state">
      {iconNode && <div className="empty-icon">{iconNode}</div>}
      <h3>{typeof title === "string" ? title : ""}</h3>
      {message && <p>{message}</p>}
      {isValidElement(action) && <div className="empty-action">{action}</div>}
    </div>
  );
}
