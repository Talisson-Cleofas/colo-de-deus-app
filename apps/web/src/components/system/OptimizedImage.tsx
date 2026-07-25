import type { ImgHTMLAttributes } from 'react';
export function OptimizedImage(props:ImgHTMLAttributes<HTMLImageElement>){ return <img loading="lazy" decoding="async" {...props}/>; }
