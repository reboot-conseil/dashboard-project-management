import { format } from "date-fns";
import { fr } from "date-fns/locale";

type DateInput = string | Date;

const d = (v: DateInput) => (v instanceof Date ? v : new Date(v));

/** 01/03/2026 */
export const fmtDate = (v: DateInput) => format(d(v), "dd/MM/yyyy", { locale: fr });

/** 01/03 */
export const fmtJour = (v: DateInput) => format(d(v), "dd/MM", { locale: fr });

/** 1 mars */
export const fmtDateCourt = (v: DateInput) => format(d(v), "d MMM", { locale: fr });

/** 1 mars 2026 */
export const fmtDateLong = (v: DateInput) => format(d(v), "d MMMM yyyy", { locale: fr });

/** mars 2026 */
export const fmtMois = (v: DateInput) => format(d(v), "MMMM yyyy", { locale: fr });

/** Mars 26 (label graphique court) */
export const fmtMoisCourt = (v: DateInput) => format(d(v), "MMM yy", { locale: fr });

/** 2026-03-01 */
export const fmtIso = (v: DateInput) => format(d(v), "yyyy-MM-dd");
