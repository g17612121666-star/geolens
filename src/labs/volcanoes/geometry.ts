import * as THREE from 'three';
/** Radial drainage incises the flank; the exposed cut profile remains closed. */
export function volcanoHeight(viscosity:number,r:number,phi=0,opening=0){
  const radius=2.1-viscosity*.65,height=.36+viscosity*1.3,v=Math.min(1,r/radius);
  const profile=height*(1-v)**(1.7-viscosity*.6)-height*.22*Math.exp(-((r/.15)**2));
  const edge=opening>.001?Math.sin(Math.PI*(phi-opening/2)/(Math.PI*2-opening))**2:1;
  const gullies=(Math.sin(phi*17+r*1.2)**8*.024+Math.sin(phi*29-r*3)**6*.009)*height;
  return profile-gullies*Math.sin(Math.PI*v)*edge;
}
export function volcanoProfile(viscosity:number){
  const radius=2.1-viscosity*.65,height=.36+viscosity*1.3;
  const points:THREE.Vector2[]=[new THREE.Vector2(0,-.18),new THREE.Vector2(radius,-.18)];
  for(let i=0;i<=96;i++){
    const r=radius*(1-i/96),v=r/radius;
    const y=height*(1-v)**(1.7-viscosity*.6)-height*.22*Math.exp(-((r/.15)**2));
    points.push(new THREE.Vector2(r,y));
  }
  points.push(new THREE.Vector2(0,-.18));return points;
}
export function volcanoGeometry(viscosity:number,opening:number){
  const points=volcanoProfile(viscosity),length=Math.PI*2-opening;
  const body=new THREE.LatheGeometry(points,160,opening/2,length);
  const p=body.attributes.position;
  for(let i=0;i<p.count;i++)if(p.getY(i)>-.179){const r=Math.hypot(p.getX(i),p.getZ(i));let phi=Math.atan2(p.getX(i),p.getZ(i));if(phi<0)phi+=Math.PI*2;p.setY(i,volcanoHeight(viscosity,r,phi,opening));}
  body.computeVertexNormals();body.computeBoundingSphere();
  const shape=new THREE.Shape(points),cap=new THREE.ShapeGeometry(shape,64);
  const caps=[cap.clone(),cap.clone()];
  caps[0].rotateY(Math.PI/2-opening/2);caps[1].rotateY(Math.PI/2-(Math.PI*2-opening/2));
  return {body,caps,height:.36+viscosity*1.3,radius:2.1-viscosity*.65};
}
