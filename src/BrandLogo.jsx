export default function BrandLogo({ className = '' }) {
  return (
    <img
      src="/chitchat-logo.png"
      alt="Chitchat"
      className={['brand-logo', className].filter(Boolean).join(' ')}
    />
  );
}
