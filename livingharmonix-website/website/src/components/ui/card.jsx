// src/components/ui/card.jsx
import React from "react";

/**
 * A flexible card container with rounded corners and shadow.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md p-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Header section for the Card, typically contains titles or icons.
 */
export function CardHeader({ children, className = "" }) {
  return (
    <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Content/body section for the Card.
 */
export function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

export default Card;
