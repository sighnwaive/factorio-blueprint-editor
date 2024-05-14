import { colors } from '../style'
import { Button } from './Button'

/**
 * Base Slot
 */
export class Slot extends Button {
    // Override Rollover Color of Button
    public get hover(): number {
        return colors.controls.slot.hover.color
    }

    // Override Pressed appearance of Button
    public get pressed(): boolean {
        return false
    }

    public constructor(width = 34, height = 34, border = 1) {
        super(width, height, undefined, border)
    }
}
