/**
 * Google Classroom's share page for a link. A signed-in teacher picks a class there and posts the
 * link as an assignment, material, question or announcement; Classroom reads the page's title and
 * preview image itself. Google documents only the `url` parameter for links made this way, so no
 * Google script is loaded and nothing is sent until someone follows the link.
 */
export const CLASSROOM_SHARE = "https://classroom.google.com/share";

export function classroomShareUrl(pageUrl: string): string {
  return `${CLASSROOM_SHARE}?url=${encodeURIComponent(pageUrl)}`;
}
