import * as PIXI from 'pixi.js'
import G from '../../common/globals'
import { colors, styles } from '../style'
import F from './functions'
import { Panel } from './Panel'
import { Button } from './Button'

/**
 * Base Dialog for usage whenever a dialog shall be shown to the user
 *
 * Per default the dialog
 *  + is not visible (this.visible = false)
 *  + is interactive (this.interactive = true)
 *  + has interactive children (this.interactiveChildren = true)
 *  + automatically executes 'setDialogPosition()' on Browser Resizing
 */
export abstract class Dialog extends Panel {
    /** Stores all open dialogs */
    protected static s_openDialogs: Dialog[] = []

    private m_panel: PIXI.Graphics

    public constructor(width: number, height: number, title?: string, search?: boolean) {
        super(
            width,
            height,
            colors.dialog.trim.color,
            colors.dialog.trim.alpha,
            colors.dialog.trim.border
        )

        this.visible = true
        this.interactive = true
        this.interactiveChildren = true

        if (title !== undefined) {
            this.addLabel(12, 10, title, styles.dialog.title)
        }

        this.addDialogControls(search)

        this.m_panel = F.DrawRectangle(
            width - 20,
            height - 62,
            colors.dialog.background.color,
            colors.dialog.background.alpha,
            colors.dialog.background.border,
            true
        )
        this.m_panel.position.set(10, 44)
        this.addChild(this.m_panel)
        // this.addChild = this.m_panel.addChild
        this.addChild = (...children) => {
            console.log('test')
            return this.m_panel.addChild(...children)
        }

        Dialog.s_openDialogs.push(this)
    }

    /** Closes last open dialog */
    public static closeLast(): void {
        if (Dialog.anyOpen()) {
            Dialog.s_openDialogs[Dialog.s_openDialogs.length - 1].close()
        }
    }

    /** Closes all open dialogs */
    public static closeAll(): void {
        for (const d of Dialog.s_openDialogs) {
            d.close()
        }
    }

    /** @returns True if there is at least one dialog open */
    public static anyOpen(): boolean {
        return Dialog.s_openDialogs.length > 0
    }

    public static isOpen<T extends Dialog>(dialog: T): boolean {
        return !!Dialog.s_openDialogs.find(d => d === dialog)
    }

    /** Capitalize String */
    protected static capitalize(text: string): string {
        return text
            .split('_')
            .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ')
    }

    /** Automatically sets position of dialog to center screen */
    protected setPosition(): void {
        this.position.set(
            G.app.screen.width / 2 - this.width / 2,
            G.app.screen.height / 2 - this.height / 2
        )
    }

    /** Close Dialog */
    public close(): void {
        Dialog.s_openDialogs = Dialog.s_openDialogs.filter(d => d !== this)

        this.emit('close')
        this.destroy()
    }

    /**
     * Add Controls to Dialog - This is the close button in the top right.
     */
    protected addDialogControls(search: boolean) {
        const x = this.width - 28
        const y = 8
        const closeControl: Button = new Button(20, 20, undefined, 1)
        closeControl.position.set(x, y)
        closeControl.on('pointerdown', (e: PIXI.InteractionEvent) => {
            if (e.data.button === 0) {
                this.close()
            }
        })
        this.addChild(closeControl)
        if (search) {
            const searchControl: Button = new Button(20, 20, undefined, 1)
            searchControl.position.set(x - 28, y)
            searchControl.on('pointerdown', (e: PIXI.InteractionEvent) => {
                if (e.data.button === 0) {
                }
            })

            this.addChild(searchControl)
        }
    }

    /**
     * Add Label to Dialog
     * @description Defined in base dialog class so extensions of dialog can use it
     * @param x - Horizontal position of label from top left corner
     * @param y - Vertical position of label from top left corner
     * @param text - Text for label
     * @param style - Style of label
     * @returns Reference to PIXI.Text for further usage
     */
    protected addLabel(x = 140, y = 56, text = 'Recipe:', style = styles.dialog.label): PIXI.Text {
        const label: PIXI.Text = new PIXI.Text(text, style)
        label.position.set(x, y)
        this.addChild(label)

        // Return label in case extension wants to use it
        return label
    }

    /**
     * Add Visual Line to Dialog
     * @description Defined in base dialog class so extensions of dialog can use it
     * @param x - Horizontal position of line from top left corner
     * @param y - Vertical position of line from top left corner
     * @param width - Width from left to right of line
     * @param style - Height from top to bottom of line
     * @returns Reference to PIXI.Graphics for further usage
     */
    protected addLine(
        x: number,
        y: number,
        width: number,
        height: number,
        border: number = colors.dialog.line.background.border
    ): PIXI.Graphics {
        const line: PIXI.Graphics = F.DrawRectangle(
            width,
            height,
            colors.dialog.line.background.color,
            colors.dialog.line.background.alpha,
            border,
            true
        )
        line.position.set(x, y)
        this.addChild(line)

        // Return line in case extension wants to use it
        return line
    }
}
