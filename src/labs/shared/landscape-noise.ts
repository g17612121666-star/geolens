/** Deterministic details: stable while scrubbing, without visible planting / texture grids. */
export const landscapeRandom=(seed:number)=>{const n=Math.sin(seed*73.173+41.7)*43758.5453;return n-Math.floor(n);};
const hash=(x:number,z:number)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
export const landscapeNoise=(x:number,z:number)=>{const a=Math.floor(x),b=Math.floor(z),u=x-a,v=z-b,s=u*u*(3-2*u),t=v*v*(3-2*v);return (hash(a,b)*(1-s)+hash(a+1,b)*s)*(1-t)+(hash(a,b+1)*(1-s)+hash(a+1,b+1)*s)*t;};
