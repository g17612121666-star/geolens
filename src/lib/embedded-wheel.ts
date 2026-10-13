/** Leave ordinary wheel scrolling to the page. Native canvas/map controls only
 * receive Ctrl-wheel (including desktop trackpad pinch events). Do not cancel
 * the browser default here: scrolling must still reach the containing page. */
export function pageScrollUnlessCtrl(event:{ctrlKey:boolean;stopPropagation:()=>void}){
  if(!event.ctrlKey)event.stopPropagation();
}
