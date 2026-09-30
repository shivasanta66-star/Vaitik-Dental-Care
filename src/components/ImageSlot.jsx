// Shows a photo when `src` is set. Otherwise it draws a designed stand-in illustration
// (chosen by `variant`) so the page looks finished until the clinic's real photo is uploaded.
const TOOTH = 'M50 6c-9-5-20-3-25 5-4 7-3 16 0 24 3 9 3 22 7 31 2 5 7 5 9 0 2-6 3-13 9-13s7 7 9 13c2 5 7 5 9 0 4-9 4-22 7-31 3-8 4-17 0-24-5-8-16-10-25-5Z';

function Tooth({ x, y, s = 1, fill, stroke, rot = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot} 50 45) scale(${s})`}>
      <path d={TOOTH} fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 18c4-4 10-5 14-3" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
    </g>
  );
}

function Clinic() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="is-c-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0c447c" />
          <stop offset="1" stopColor="#042c53" />
        </linearGradient>
        <linearGradient id="is-c-win" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b5d4f4" />
          <stop offset="1" stopColor="#e6f1fb" />
        </linearGradient>
        <radialGradient id="is-c-glow" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#is-c-bg)" />
      <rect x="250" y="34" width="118" height="110" rx="8" fill="url(#is-c-win)" opacity="0.95" />
      <path d="M309 34v110M250 89h118" stroke="#0c447c" strokeWidth="4" />
      <circle cx="285" cy="64" r="9" fill="#fff" opacity="0.8" />
      <rect y="232" width="400" height="68" fill="#031f3a" />
      <rect y="228" width="400" height="6" fill="#378add" opacity="0.6" />
      <path d="M120 0v46" stroke="#b5d4f4" strokeWidth="5" />
      <path d="M120 46l50 24" stroke="#b5d4f4" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="184" cy="82" rx="40" ry="15" fill="#e6f1fb" />
      <path d="M150 88l68 0-22 130H172Z" fill="url(#is-c-glow)" />
      <path d="M70 224c-6-30 4-64 30-72 20-6 38 4 46 18l70 8c16 2 24 14 16 26-6 10-20 10-30 8l-48-6-8 18h-20l4-20-30-2-8 22Z" fill="#e6f1fb" />
      <path d="M100 150c-14 2-22 20-18 42" stroke="#b5d4f4" strokeWidth="8" strokeLinecap="round" fill="none" />
      <rect x="120" y="208" width="14" height="30" rx="3" fill="#378add" />
      <rect x="92" y="236" width="70" height="8" rx="4" fill="#378add" />
      <Tooth x={318} y={170} s={0.7} fill="#fff" stroke="#b5d4f4" />
    </svg>
  );
}

function Smile({ after }) {
  const g = after ? ['#fff', '#b5d4f4'] : ['#f3e2a4', '#d9bd6a'];
  const xs = [60, 118, 176, 234, 292];
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={'is-s-bg' + (after ? 'a' : 'b')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={after ? '#e6f1fb' : '#dfe6ee'} />
          <stop offset="1" stopColor={after ? '#b5d4f4' : '#c3ccd6'} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#is-s-bg${after ? 'a' : 'b'})`} />
      <path d="M30 120c40-40 300-40 340 0v60c-40 60-300 60-340 0Z" fill="#b5544f" />
      <path d="M60 130c50-24 230-24 280 0v40c-50 44-230 44-280 0Z" fill="#7a2a2f" />
      <g>
        {xs.map((x, i) => (
          <Tooth key={i} x={x - 32 + (after ? 0 : (i % 2) * 6 - 3)} y={after ? 100 : 100 + (i % 2) * 6} s={0.8} rot={after ? 0 : (i - 2) * 5} fill={g[0]} stroke={g[1]} />
        ))}
      </g>
      {!after && [1, 3].map((i) => <circle key={i} cx={xs[i] + 10} cy={135} r="4" fill="#a3741f" opacity="0.5" />)}
      {after && (
        <g fill="#fff">
          <path d="M338 48l6 16 16 6-16 6-6 16-6-16-16-6 16-6Z" />
          <path d="M60 232l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" opacity="0.8" />
        </g>
      )}
    </svg>
  );
}

const ART = { clinic: Clinic, before: () => <Smile />, after: () => <Smile after /> };

export default function ImageSlot({ src, alt, placeholder, variant, className = '' }) {
  if (src) {
    return <img className={'image-slot image-slot--filled ' + className} src={src} alt={alt || placeholder || ''} loading="lazy" />;
  }
  if (variant === 'doctor') {
    const initials = (alt || placeholder || '').replace(/^Dr\.?\s+/i, '').replace(/[\[\]]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
    return (
      <div className={'image-slot image-slot--mono ' + className} role="img" aria-label={alt || placeholder}>
        {initials}
      </div>
    );
  }
  const Art = ART[variant];
  if (Art) {
    return (
      <div className={'image-slot image-slot--art ' + className} role="img" aria-label={alt || placeholder}>
        <Art />
        {variant === 'before' && <span className="image-slot-tag">Before</span>}
        {variant === 'after' && <span className="image-slot-tag image-slot-tag--after">After</span>}
      </div>
    );
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
