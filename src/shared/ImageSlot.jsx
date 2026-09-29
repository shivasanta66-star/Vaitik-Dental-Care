// Shows a photo when `src` is set, otherwise a labelled placeholder telling the clinic which photo goes here.
export default function ImageSlot({ src, alt, placeholder, className = '' }) {
  if (src) {
    return <img className={'image-slot image-slot--filled ' + className} src={src} alt={alt || placeholder || ''} loading="lazy" />;
  }
  return (
    <div className={'image-slot image-slot--empty ' + className} role="img" aria-label={alt || placeholder}>
      <svg width="28" height="28" viewBox="0 0 256 256" aria-hidden="true" fill="currentColor">
        <path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm0 16v102.75l-26.07-26.06a16 16 0 0 0-22.63 0l-20 20-44-44a16 16 0 0 0-22.62 0L40 149.37V56ZM40 172l52-52 80 80H40Zm176 28h-21.37l-36-36 20-20L216 181.38V200Zm-72-100a12 12 0 1 1 12 12 12 12 0 0 1-12-12Z" />
      </svg>
      <span>{placeholder}</span>
    </div>
  );
}
