import { ITransposeCalculator } from "../../MusicalScore/Interfaces";
import { Pitch, NoteEnum, AccidentalEnum } from "../../Common/DataObjects";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions";

/** Calculates transposition of individual notes and keys,
 * which is used by multiple OSMD classes to transpose the whole sheet.
 * Note: This class may not look like much, but a lot of thought has gone into the algorithms,
 * and the exact usage within OSMD classes. */
export class TransposeCalculator implements ITransposeCalculator {
    private static keyMapping: number[] = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
    private static noteEnums: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];
    public transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch {
        let transposedFundamentalNote: NoteEnum = NoteEnum.C;
        let transposedOctave: number = 0;
        let transposedAccidental: AccidentalEnum = AccidentalEnum.NONE;

        let {
            halftone: transposedHalfTone,
            overflow: octaveChange
        } = Pitch.CalculateTransposedHalfTone(pitch, halftones);

        for (let i: number = 0; i < TransposeCalculator.noteEnums.length; i++) {
            const currentValue: number = <number>TransposeCalculator.noteEnums[i];
            if (currentValue === transposedHalfTone) {
                const noteIndex: number = i;
                transposedFundamentalNote = TransposeCalculator.noteEnums[noteIndex];
                transposedOctave = <number>(pitch.Octave + octaveChange);
                transposedAccidental = AccidentalEnum.NONE;
                return this.validatePitch(new Pitch(transposedFundamentalNote, transposedOctave, transposedAccidental), currentKeyInstruction);
            } else if (currentValue > transposedHalfTone) {
                break;
            }
        }
        for (let i: number = 0; i < TransposeCalculator.noteEnums.length; i++) {
            const currentValue: number = <number>TransposeCalculator.noteEnums[i];
            if (currentValue > transposedHalfTone) {
                let noteIndex: number = i;
                const accidentalHalfTones: number = Pitch.HalfTonesFromAccidental(pitch.Accidental);

                if (accidentalHalfTones > 0 || (accidentalHalfTones === 0 && currentKeyInstruction.Key >= 0)) {
                    noteIndex--;
                }
                while (noteIndex < 0) {
                    noteIndex += 7;
                    transposedHalfTone += 12;
                    octaveChange--;
                }
                while (noteIndex >= 7) {
                    noteIndex -= 7;
                    transposedHalfTone -= 12;
                    octaveChange++;
                }
                transposedFundamentalNote = TransposeCalculator.noteEnums[noteIndex];
                transposedAccidental = Pitch.AccidentalFromHalfTones(transposedHalfTone - <number>transposedFundamentalNote);
                transposedOctave = <number>(pitch.Octave + octaveChange);
                break;
            }
        }
        return this.validatePitch(new Pitch(transposedFundamentalNote, transposedOctave, transposedAccidental), currentKeyInstruction);
    }
    public transposeKey(keyInstruction: KeyInstruction, transpose: number): void {
        let currentIndex: number = 0;
        let previousKeyType: number = 0;
        for (; currentIndex < TransposeCalculator.keyMapping.length; currentIndex++) {
            previousKeyType = TransposeCalculator.keyMapping[currentIndex];
            if (previousKeyType === keyInstruction.keyTypeOriginal) {
                break;
            }
        }
        let newIndex: number = (currentIndex + transpose);
        while (newIndex >= 12) {
            newIndex -= 12;
        }
        while (newIndex < 0) {
            newIndex += 12;
        }
        keyInstruction.Key = TransposeCalculator.keyMapping[newIndex];
        keyInstruction.isTransposedBy = transpose;
    }
    private validatePitch(pitch: Pitch, keyInstruction: KeyInstruction): Pitch {
        if (keyInstruction.Key > 0 && keyInstruction.willAlterateNote(NoteEnum.E)) {
            if (pitch.FundamentalNote === NoteEnum.F && pitch.Accidental === AccidentalEnum.NONE) {
                return new Pitch(NoteEnum.E, pitch.Octave, AccidentalEnum.SHARP);
            }
        } else if (keyInstruction.Key < 0 && (keyInstruction.willAlterateNote(NoteEnum.B) || keyInstruction.willAlterateNote(NoteEnum.E))) {
            if (pitch.FundamentalNote === NoteEnum.A && pitch.Accidental === AccidentalEnum.SHARP) {
                return new Pitch(NoteEnum.B, pitch.Octave, AccidentalEnum.FLAT);
            }
            if (pitch.FundamentalNote === NoteEnum.D && pitch.Accidental === AccidentalEnum.SHARP) {
                return new Pitch(NoteEnum.E, pitch.Octave, AccidentalEnum.FLAT);
            }
        }
        return pitch;
    }
}
