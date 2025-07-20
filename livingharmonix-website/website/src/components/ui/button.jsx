// src/components/ui/button.jsx
import React, { cloneElement } from "react";
import PropTypes from "prop-types";

/**
 * A styled button component with optional polymorphic "asChild" support.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Inner content or component.
 * @param {boolean} [props.asChild] - If true, renders the child element instead of a <button>.
 * @param {string} [props.className] - Additional Tailwind CSS classes.
 * @param {object} [props.rest] - Other props forwarded to the element.
 */
export function Button({ children, asChild = false, className = "", ...rest }) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-2xl px-4 py-2 font-medium shadow-sm hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2";

  if (asChild && React.isValidElement(children)) {
    return cloneElement(children, {
      className:
        `${baseStyles} ${className} ${children.props.className || ""}`.trim(),
      ...rest,
    });
  }

  return (
    <button className={`${baseStyles} ${className}`} {...rest}>
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  asChild: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;
