import {Line} from '@react-three/drei';
import {Color} from 'three';
import type {ComponentProps} from 'react';
import {usePreferences} from '@/lib/preferences';

/** Preserve semantic hue while keeping instructional guides visible on daylight canvas. */
export function GuideLine({color='#ffffff',...props}:ComponentProps<typeof Line>){
 const theme=usePreferences(s=>s.resolvedTheme),ink=new Color(color);
 if(theme==='light'){const hsl={h:0,s:0,l:0};ink.getHSL(hsl);ink.setHSL(hsl.h,hsl.s,Math.min(hsl.l,.38));}
 if(theme!=='light'){const hsl={h:0,s:0,l:0};ink.getHSL(hsl);ink.setHSL(hsl.h,hsl.s,Math.max(hsl.l,.55));}
 return <Line {...props} lineWidth={Math.max(props.lineWidth??1,1.35)} opacity={props.transparent?Math.max(props.opacity??1,.55):props.opacity} color={ink}/>;
}
