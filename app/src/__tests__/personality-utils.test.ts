import { describe, it, expect } from 'vitest';
import {
    clampValue,
    getEffectivePersonality,
    getMBTILabel,
    tickModifiers,
} from '../engine/personality-utils';
import type { Personality, TemporaryModifier } from '../models/types';

describe('clampValue', () => {
    it('clamps values below min to min', () => {
        expect(clampValue(-10)).toBe(0);
    });

    it('clamps values above max to max', () => {
        expect(clampValue(150)).toBe(100);
    });

    it('returns value within range unchanged', () => {
        expect(clampValue(50)).toBe(50);
    });

    it('supports custom min/max', () => {
        expect(clampValue(-150, -100, 100)).toBe(-100);
        expect(clampValue(150, -100, 100)).toBe(100);
    });
});

describe('getMBTILabel', () => {
    it('returns INTJ for high I, N, T, J', () => {
        const p: Personality = { I: 80, E: 20, S: 30, N: 70, T: 60, F: 40, J: 75, P: 25 };
        expect(getMBTILabel(p)).toBe('INTJ');
    });

    it('returns ESFP for high E, S, F, P', () => {
        const p: Personality = { I: 20, E: 80, S: 70, N: 30, T: 30, F: 70, J: 25, P: 75 };
        expect(getMBTILabel(p)).toBe('ESFP');
    });

    it('handles ties by choosing I, S, T, J side', () => {
        const p: Personality = { I: 50, E: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
        expect(getMBTILabel(p)).toBe('ISTJ');
    });
});

describe('getEffectivePersonality', () => {
    it('applies modifiers to base personality', () => {
        const base: Personality = { I: 50, E: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
        const mods: TemporaryModifier[] = [
            { id: '1', trait: 'E', value: 20, remainingTicks: 3, source: 'test' },
        ];
        const result = getEffectivePersonality(base, mods);
        expect(result.E).toBe(70);
        expect(result.I).toBe(50); // unchanged
    });

    it('clamps modifier result to 0-100', () => {
        const base: Personality = { I: 90, E: 10, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
        const mods: TemporaryModifier[] = [
            { id: '1', trait: 'I', value: 20, remainingTicks: 1, source: 'test' },
        ];
        const result = getEffectivePersonality(base, mods);
        expect(result.I).toBe(100);
    });
});

describe('tickModifiers', () => {
    it('decrements remaining ticks', () => {
        const mods: TemporaryModifier[] = [
            { id: '1', trait: 'E', value: 10, remainingTicks: 3, source: 'test' },
        ];
        const result = tickModifiers(mods);
        expect(result).toHaveLength(1);
        expect(result[0].remainingTicks).toBe(2);
    });

    it('removes expired modifiers', () => {
        const mods: TemporaryModifier[] = [
            { id: '1', trait: 'E', value: 10, remainingTicks: 1, source: 'test' },
        ];
        const result = tickModifiers(mods);
        expect(result).toHaveLength(0);
    });
});