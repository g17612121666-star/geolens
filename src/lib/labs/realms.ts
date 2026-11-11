import REALM_DATA from "./realms.json";
import type { RealmMeta } from "./types";

/**
 * The five realms on their own, so the site header can list them without loading every lab's
 * content.
 */
export const REALMS: RealmMeta[] = REALM_DATA as RealmMeta[];
