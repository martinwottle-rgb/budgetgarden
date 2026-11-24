// Alle Töpfe (SPEC-5): kleine Töpfe für kleine Pflanzen, Kübel für große. Terrakotta ist jeweils der Standard und gratis.
import { TOEPFE_KLEIN } from './toepfe_klein.js';
import { TOEPFE_KUEBEL } from './toepfe_kuebel.js';

export const TOEPFE = { ...TOEPFE_KLEIN, ...TOEPFE_KUEBEL };

export const STANDARD_TOPF = { klein: 'terrakotta', kuebel: 'terrakotta_kuebel' };
