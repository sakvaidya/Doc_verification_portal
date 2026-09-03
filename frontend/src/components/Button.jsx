export default function Button({ variant = 'primary', ...props }) {
  return <button className={`btn btn-${variant}`} {...props} />;
}
