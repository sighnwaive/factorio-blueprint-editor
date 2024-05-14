import * as PIXI from 'pixi.js'
import { colors } from '../style'
import F from './functions'

export class ItemGrid extends PIXI.Container {
    /** Background Graphic */
    private readonly m_Background: PIXI.Graphics

    constructor(width = 4, height = 4) {
        super()

        this.buttonMode = true
        this.m_Background = F.DrawRectangle(
            width * 40,
            height * 40,
            colors.controls.itemGrid.background.color,
            colors.controls.itemGrid.background.alpha,
            1,
            true
        )
        this.m_Background.position.set(0, 0)

        super.addChild(this.m_Background)

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const slot = F.DrawRectangle(
                    22,
                    22,
                    colors.controls.itemGrid.background.color,
                    colors.controls.itemGrid.background.alpha,
                    1,
                    false
                )
                slot.position.set(1 + (x * 40 + 8), 1 + (y * 40 + 8))
                super.addChild(slot)
            }
        }
    }

    public addChild<T extends PIXI.DisplayObject>(...children: [T, ...PIXI.DisplayObject[]]): T {
        children.forEach(child => {
            child.position.set(3 + child.position.x, 3 + child.position.y)
        })
        return super.addChild(...children)
    }
}
