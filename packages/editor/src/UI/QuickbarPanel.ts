import * as PIXI from 'pixi.js'
import { EditorMode } from '../containers/BlueprintContainer'
import G from '../common/globals'
import { Panel } from './controls/Panel'
import { Slot } from './controls/Slot'
import F from './controls/functions'
import { colors, styles } from './style'
import { ItemGrid } from './controls/ItemGrid'
import { Button } from './controls/Button'

class QuickbarSlot extends Slot {
    public get itemName(): string {
        return this.data as string
    }

    public assignItem(itemName: string): void {
        if (itemName === 'blueprint') return
        this.data = itemName
        this.content = F.CreateIcon(itemName)
    }

    public unassignItem(): void {
        this.data = undefined
        this.content = undefined
    }
}

export class QuickbarPanel extends Panel {
    private iWidth = 442
    private iHeight: number
    private rows: number
    private visibleRows: number

    private slots: QuickbarSlot[]
    private quickbarSelectorSlots: ItemGrid
    private slotsContainer: ItemGrid

    public constructor(rows = 1, itemNames?: string[]) {
        super(
            458,
            12 + 2 * 40,
            colors.quickbar.background.color,
            colors.quickbar.background.alpha,
            colors.quickbar.background.border
        )

        this.rows = rows
        this.visibleRows = 2
        this.iHeight = this.visibleRows * 40
        this.slots = new Array<QuickbarSlot>(rows * 10)

        this.generateSlots(itemNames)
    }

    public generateSlots(itemNames?: string[]): void {
        this.quickbarSelectorSlots = new ItemGrid(1, 2)
        this.quickbarSelectorSlots.position.set(6, 6)
        this.addChild(this.quickbarSelectorSlots)

        this.slotsContainer = new ItemGrid(10, 2)
        this.slotsContainer.position.set(50, 6)
        this.addChild(this.slotsContainer)

        for (let r = 0; r < this.rows; r++) {
            if (r < this.visibleRows) {
                const quickbarSelector = new Button(34, 34, colors.controls.tab.background.color, 1)
                quickbarSelector.position.set(0, r * 40)
                quickbarSelector.content = new PIXI.Text(r.toString(), styles.button.text)
                this.quickbarSelectorSlots.addChild(quickbarSelector)
            }

            for (let i = 0; i < 10; i++) {
                const quickbarSlot = new QuickbarSlot()
                quickbarSlot.position.set((38 + 2) * i, 40 * r)

                if (itemNames && itemNames[r * 10 + i]) {
                    quickbarSlot.assignItem(itemNames[r * 10 + i])
                }

                quickbarSlot.on('pointerdown', (e: PIXI.InteractionEvent) => {
                    // Use Case 1:   Left Click  & Slot=Empty & Mouse=Painting                      >> Assign Mouse Item to Slot
                    // Use Case 2:   Left Click  & Slot=Item  & Mouse=Painting                      >> Assign Slot Item to Mouse
                    // Use Case 2.5: Left Click  & Slot=Item  & Mouse=Painting & Item=PaintingItem  >> Destroy Painting Item
                    // Use Case 3:   Left Click  & Slot=Empty & Mouse=Empty                         >> Assign Slot Item to Selected Inv item
                    // Use Case 4:   Left Click  & Slot=Item  & Mouse=Empty                         >> Assign Slot Item to Mouse
                    // Use Case 5:   Right Click & Slot=*     & Mouse=*                             >> Unassign Slot

                    if (e.data.button === 0) {
                        if (G.BPC.mode === EditorMode.PAINT) {
                            if (quickbarSlot.itemName) {
                                if (quickbarSlot.itemName === G.BPC.paintContainer.getItemName()) {
                                    // UC2.5
                                    G.BPC.paintContainer.destroy()
                                } else {
                                    // UC2
                                    G.BPC.spawnPaintContainer(quickbarSlot.itemName)
                                }
                            } else {
                                // UC1
                                quickbarSlot.assignItem(G.BPC.paintContainer.getItemName())
                            }
                        } else if (quickbarSlot.itemName) {
                            // UC4
                            G.BPC.spawnPaintContainer(quickbarSlot.itemName)
                        } else {
                            // UC3
                            G.UI.createInventory('Inventory', undefined, item =>
                                quickbarSlot.assignItem(item)
                            )
                        }
                    } else if (e.data.button === 2) {
                        // UC5
                        quickbarSlot.unassignItem()
                    }
                })

                this.slots[r * 10 + i] = quickbarSlot
                if (r < this.visibleRows) {
                    this.slotsContainer.addChild(quickbarSlot)
                }
            }
        }
    }

    public bindKeyToSlot(slot: number): void {
        const itemName = this.slots[slot].itemName
        if (!itemName) return

        if (G.BPC.mode === EditorMode.PAINT && G.BPC.paintContainer.getItemName() === itemName) {
            G.BPC.paintContainer.destroy()
            return
        }

        G.BPC.spawnPaintContainer(itemName)
    }

    public changeActiveQuickbar(): void {
        this.slotsContainer.removeChildren()

        let itemNames = this.serialize()
        // Left shift array by 10
        itemNames = itemNames.concat(itemNames.splice(0, 10))
        this.generateSlots(itemNames)
    }

    public serialize(): string[] {
        return this.slots.map(s => s.itemName)
    }

    protected setPosition(): void {
        this.position.set(
            G.app.screen.width / 2 - this.width / 2,
            G.app.screen.height - this.height + 1
        )
    }
}
