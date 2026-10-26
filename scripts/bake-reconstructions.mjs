// Scientific cartography, generated directly from the retained EarthByte GeoJSON.
// No invented paleotopography: these remain reconstructed modern coastlines.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const root=path.resolve('public/geo/reconstruction'), width=4096,height=2048;
const manifest=[];
for(let age=10;age<=250;age+=10){
 const source=await fs.readFile(path.join(root,`coastlines-${age}.json`));
 const data=JSON.parse(source),paths=[];
 for(const feature of data.features){
  const polygons=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates];
  for(const polygon of polygons){
   let d='';
   for(const ring of polygon){
    let previous=ring[0]?.[0]??0;
    ring.forEach(([lon,lat],i)=>{while(lon-previous>180)lon-=360;while(lon-previous< -180)lon+=360;previous=lon;d+=`${i?'L':'M'}${((lon+180)/360*width).toFixed(3)},${((90-lat)/180*height).toFixed(3)}`;});d+='Z';
   }
   for(const shift of [-width,0,width])paths.push(`<path d="${d}" transform="translate(${shift},0)"/>`);
  }
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#16374a"/><g fill="#859779" fill-rule="evenodd" stroke="#c9d4ac" stroke-width="1.2" stroke-linejoin="round">${paths.join('')}</g></svg>`;
 const output=await sharp(Buffer.from(svg),{limitInputPixels:false}).webp({lossless:true,effort:6}).toBuffer();
 await fs.writeFile(path.join(root,`coastlines-${age}-4k.webp`),output);
 manifest.push({ageMa:age,width,height,source:`coastlines-${age}.json`,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),sourceBytes:source.length,texture:`coastlines-${age}-4k.webp`,textureBytes:output.length});
}
await fs.writeFile(path.join(root,'texture-manifest.json'),JSON.stringify({description:'Lossless 4K rasterization of reconstructed modern coastlines. Same longitude unwrapping, polygon holes and color key as the previous in-browser renderer. EarthByte / Müller 2019; see sources.json.',snapshots:manifest},null,2));
console.log(JSON.stringify({snapshots:manifest.length,sourceBytes:manifest.reduce((n,s)=>n+s.sourceBytes,0),textureBytes:manifest.reduce((n,s)=>n+s.textureBytes,0)},null,2));
