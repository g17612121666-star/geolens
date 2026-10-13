import type {LabMeta} from './types';
/** A historical-age parameter is already a time control; do not offer a second, idle clock. */
export function hasPlayback(lab:LabMeta,params:Record<string,number>,explode=0){
 return lab.controls.playback!==false&&!['continental-drift','geologic-time'].includes(lab.slug)&&(lab.slug!=='plate-boundaries'||params.section>.5)&&(lab.slug!=='earth-interior'||(params.waves>.5&&explode<=.01));
}
