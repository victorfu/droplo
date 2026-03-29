import { SVGProps } from 'react';

export default function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" {...props}>
      <path 
        d="M 80 160 L 80 175 M 120 160 L 120 175" 
        stroke="currentColor" 
        strokeWidth="14" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M 100 25 C 145 25 170 60 170 105 C 170 150 140 165 100 165 C 60 165 30 150 30 105 C 30 60 55 25 100 25 Z" 
        fill="currentColor" 
      />
      {/* text-background sets currentColor to the background color, creating the cutout effect */}
      <ellipse cx="85" cy="85" rx="5" ry="10" className="text-background" fill="currentColor" />
      <ellipse cx="115" cy="85" rx="5" ry="10" className="text-background" fill="currentColor" />
    </svg>
  );
}
