// Label + control. Pass `as="select" | "textarea"` for other controls.
export default function Field({ label, as: Control = 'input', children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <Control className="input" {...props}>{children}</Control>
    </label>
  );
}
