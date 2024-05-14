import * as PIXI from 'pixi.js'
import { colors } from '../style'
import F from './functions'

/**
 * Base Button
 */
export class PageTab extends PIXI.Container {
    /** Background Graphic */
    private readonly m_Background: PIXI.Graphics

    /** Active Graphic */
    private readonly m_Active: PIXI.Graphics

    /** Rollover Graphic */
    private readonly m_Hover: PIXI.Graphics

    /** Content of Control */
    private m_Content: PIXI.DisplayObject

    /** Data of Control */
    private m_Data: unknown

    public constructor(width = 36, height = 36, border = colors.controls.tab.border) {
        super()

        this.interactive = true
        this.buttonMode = true

        this.m_Background = F.DrawRectangle(
            width,
            height,
            this.background,
            colors.controls.tab.background.alpha,
            border,
            this.pressed
        )
        this.m_Background.position.set(0, 0)

        this.m_Active = F.DrawRectangle(
            width + 4,
            height + 4,
            colors.controls.tab.active.color,
            colors.controls.tab.active.alpha,
            false,
            false
        )
        this.m_Active.position.set(-2, -2)
        this.m_Active.visible = false

        this.m_Hover = F.DrawRectangle(
            width,
            height,
            colors.controls.tab.hover.color,
            colors.controls.tab.hover.alpha,
            false
        )
        this.m_Hover.position.set(0, 1)
        this.m_Hover.visible = false

        this.addChild(this.m_Background, this.m_Active, this.m_Hover)

        // Enable Rollover
        this.on('pointerover', () => {
            if (!this.m_Active.visible) {
                this.m_Hover.visible = true
            }
        })
        this.on('pointerout', () => {
            this.m_Hover.visible = false
        })
    }

    /** Is button active */
    public get active(): boolean {
        return this.m_Active.visible
        // this.on()
    }
    public set active(active: boolean) {
        this.m_Active.visible = active
    }

    /** Control Content */
    public get content(): PIXI.DisplayObject {
        return this.m_Content
    }
    public set content(content: PIXI.DisplayObject) {
        if (
            this.m_Content !== undefined ||
            (this.m_Content !== undefined && content === undefined)
        ) {
            this.removeChild(this.m_Content)
            this.m_Content.destroy()
            this.m_Content = undefined
        }

        if (content !== undefined) {
            // Set content for button
            this.m_Content = content
            this.m_Content.position.set(this.width / 2, this.height / 2)

            // Add content to button
            this.addChild(this.m_Content)
        }
    }

    /** Control Data */
    // Need to use any to be able to assign anything
    public get data(): unknown {
        return this.m_Data
    }
    public set data(value: unknown) {
        this.m_Data = value
    }

    /** Background color of the button (can be overriden) */
    protected get background(): number {
        return colors.controls.tab.background.color
    }

    /** Rollover color of the button (can be overriden) */
    protected get hover(): number {
        return colors.controls.tab.hover.color
    }

    /** Shall button be raised or pressed (can be overridden) */
    protected get pressed(): boolean {
        return false
    }
}
