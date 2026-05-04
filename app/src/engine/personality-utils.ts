import type { Personality, PersonalityAffinity, TemporaryModifier } from '../models/types';

/**
 * Clamp a personality value to 0-100
 */
export function clampValue(v: number, min = 0, max = 100): number {
    if (typeof v !== 'number' || isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
}

/**
 * Safe wrapper: fill missing / invalid personality fields with default 50,
 * then clamp to 0-100. Prevents NaN and crashes from legacy data.
 */
export function safePersonality(p: Partial<Personality> | undefined | null): Personality {
    const d = 50;
    if (!p) return { I: d, E: d, S: d, N: d, T: d, F: d, J: d, P: d };
    const safe = (v: unknown): number =>
        typeof v === 'number' && !isNaN(v) ? clampValue(v) : d;
    return {
        I: safe(p.I),
        E: safe(p.E),
        S: safe(p.S),
        N: safe(p.N),
        T: safe(p.T),
        F: safe(p.F),
        J: safe(p.J),
        P: safe(p.P),
    };
}

/**
 * Get effective personality after applying temporary modifiers
 */
export function getEffectivePersonality(
    base: Personality,
    modifiers: TemporaryModifier[]
): Personality {
    const result: Personality = { ...base };
    for (const mod of modifiers) {
        result[mod.trait] = clampValue(result[mod.trait] + mod.value);
    }
    return result;
}

/**
 * Derive MBTI 4-letter label from personality values
 */
export function getMBTILabel(p: Personality): string {
    const ie = p.I >= p.E ? 'I' : 'E';
    const sn = p.S >= p.N ? 'S' : 'N';
    const tf = p.T >= p.F ? 'T' : 'F';
    const jp = p.J >= p.P ? 'J' : 'P';
    return `${ie}${sn}${tf}${jp}`;
}

/**
 * Tick down temporary modifiers and remove expired ones
 */
export function tickModifiers(modifiers: TemporaryModifier[]): TemporaryModifier[] {
    return modifiers
        .map((m) => ({ ...m, remainingTicks: m.remainingTicks - 1 }))
        .filter((m) => m.remainingTicks > 0);
}

// ===== Personality Affinity =====

const AFFINITY_TRAITS: (keyof PersonalityAffinity)[] = ['I', 'E', 'S', 'N', 'T', 'F', 'J', 'P'];

/**
 * Safe getter for affinity value: returns 0 for missing/NaN/Infinity, clamped to [-100, 100].
 */
function safeAffinityValue(v: unknown): number {
    if (typeof v !== 'number' || !isFinite(v)) return 0;
    return Math.max(-100, Math.min(100, v));
}

/**
 * Calculate personality affinity bonus for a content item.
 *
 * Formula per trait:
 *   traitCentered = (effectivePersonality[trait] - 50) / 50   // range [-1, 1]
 *   traitBonus = traitCentered * affinity[trait]               // range [-100, 100]
 *   bonus = sum of all traitBonus
 *
 * - Personality value 50 → centered 0 → no contribution
 * - Personality value 100 & affinity +30 → contribution +30
 * - Personality value 0 & affinity +30 → contribution -30
 *
 * @param effectivePersonality  The character's effective personality (after modifiers)
 * @param affinity              The content item's personality affinity (optional/partial)
 * @returns { bonus, summary } where summary lists non-zero per-trait contributions
 */
export function calculatePersonalityAffinityBonus(
    effectivePersonality: Personality,
    affinity?: Partial<PersonalityAffinity> | null,
): { bonus: number; summary: string } {
    if (!affinity) return { bonus: 0, summary: '' };

    let bonus = 0;
    const parts: string[] = [];

    for (const trait of AFFINITY_TRAITS) {
        const affinityVal = safeAffinityValue(affinity[trait]);
        if (affinityVal === 0) continue;

        const traitCentered = (effectivePersonality[trait] - 50) / 50;
        const traitBonus = traitCentered * affinityVal;

        bonus += traitBonus;
        if (traitBonus !== 0) {
            parts.push(`${trait} ${traitBonus > 0 ? '+' : ''}${traitBonus.toFixed(1)}`);
        }
    }

    return { bonus, summary: parts.join('、') };
}

/**
 * Returns default zero affinity object.
 */
export function defaultPersonalityAffinity(): PersonalityAffinity {
    return { I: 0, E: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
}
