import { useRef, useState, useEffect } from 'react';

export function Squiggle({ height = 8, className = '' }) {
  const containerRef = useRef(null);
  const [segments, setSegments] = useState(8);

  // Match the RSVP squiggle's bump ratio (~2.8:1 width:amplitude)
  // Each bump is height * 2.8px wide to preserve the shape at any size
  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const px = containerRef.current.offsetWidth;
      const bumpWidth = height * 2.8;
      setSegments(Math.max(1, Math.round(px / bumpWidth)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [height]);

  // Quadratic Bézier wave matching the RSVP form's SVG pattern:
  // Q control-x control-y end-x end-y, then T (smooth quadratic) for each bump
  const amp = 6;
  const midY = amp;
  const vbHeight = amp * 2 + 4; // padding for stroke
  const bumpVB = 16.7; // viewBox units per bump (same ratio as RSVP)
  const vbWidth = segments * bumpVB;

  // First bump uses Q, rest use T (smooth reflect)
  const d =
    `M0 ${midY} Q${(bumpVB / 2).toFixed(1)} ${midY - amp} ${bumpVB.toFixed(1)} ${midY}` +
    Array.from({ length: segments - 1 }, (_, i) =>
      ` T${((i + 2) * bumpVB).toFixed(1)} ${midY}`
    ).join('');

  return (
    <div ref={containerRef} className={`squiggle ${className}`} style={{ height: `${height}px` }}>
      <svg
        viewBox={`-2 -2 ${(vbWidth + 4).toFixed(1)} ${vbHeight}`}
        preserveAspectRatio='none'
        overflow='visible'
        fill='none'
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <path
          d={d}
          stroke='currentColor'
          strokeWidth='3'
          strokeLinecap='round'
          vectorEffect='non-scaling-stroke'
        />
      </svg>
    </div>
  );
}
