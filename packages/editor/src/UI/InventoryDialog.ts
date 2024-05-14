import * as PIXI from 'pixi.js'
import FD from '../core/factorioData'
import G from '../common/globals'
import F from './controls/functions'
import { Dialog } from './controls/Dialog'
import { Button } from './controls/Button'
import { colors, styles } from './style'
import { ItemGrid } from './controls/ItemGrid'
import { PageTab } from './controls/PageTab'

/*
    Cols
    Space   @ 0     +12              ->12
    Items   @ 12    +(10*(36+2))     ->392
    Space   @ 392   +12              ->404
    Width : 12 + (10 * (36 + 2)) + 12 = 404

    Rows
    Space   @ 0   +10                ->10
    Title   @ 10  +24                ->34
    Space   @ 34  +12                ->46
    Groups  @ 46  +68                ->114
    Space   @ 114 +12                ->126
    Items   @ 126 +(8*(36+2))        ->430
    Space   @ 430 +12                ->442
    Height : 10 + 24 + 12 + 68 + 12 + (8*(36+2)) + 12 = 442

    Space   @ 0   +10                ->10
    R.Label @ 10  +16                ->26
    Space   @ 26  +10                ->36
    R.Data  @ 36  +36                ->72
    Space   @ 8   +8                 ->78
    Height : 10 + 16 + 10 + 36 + 8 = 78
*/

/** Inventory Dialog - Displayed to the user if there is a need to select an item */
export class InventoryDialog extends Dialog {
    private readonly m_ItemGrid: ItemGrid

    /** Container for Inventory Group Buttons */
    private readonly m_InventoryGroups: PIXI.Container

    /** Container for Inventory Group Items */
    private readonly m_InventoryItems: PIXI.Container

    /** Text for Recipe Tooltip */
    private readonly m_RecipeLabel: PIXI.Text

    /** Container for Recipe Tooltip */
    private readonly m_RecipeContainer: PIXI.Container

    /** Hovered item for item pointerout check */
    private m_hoveredItem: string

    public constructor(
        title = 'Inventory',
        itemsFilter?: string[],
        selectedCallBack?: (selectedItem: string) => void
    ) {
        super(438, 514, title, true)

        this.m_ItemGrid = new ItemGrid(10, 9)
        this.m_ItemGrid.position.set(10, 84)
        this.addChild(this.m_ItemGrid)

        this.m_InventoryGroups = new PIXI.Container()
        this.m_InventoryGroups.position.set(0, 2)
        this.addChild(this.m_InventoryGroups)

        this.m_InventoryItems = new PIXI.Container()
        this.m_InventoryItems.position.set(12, 86)
        this.addChild(this.m_InventoryItems)

        let groupIndex = 0
        for (const group of FD.inventoryLayout) {
            // Make creative entities available only in the main inventory
            if (group.name === 'creative' && itemsFilter !== undefined) {
                continue
            }

            const inventoryGroupItems = new PIXI.Container()
            let itemColIndex = 0
            let itemRowIndex = 0

            for (const subgroup of group.subgroups) {
                let subgroupHasItems = false

                for (const item of subgroup.items) {
                    if (itemsFilter === undefined) {
                        const itemData = FD.items[item.name]
                        if (!itemData) continue
                        if (
                            !itemData.place_result &&
                            !itemData.place_as_tile &&
                            !itemData.wire_count
                        )
                            continue
                        // needed for robots/trains/cars
                        if (itemData.place_result && !FD.entities[itemData.place_result]) continue
                    } else {
                        if (!itemsFilter.includes(item.name)) continue
                    }

                    if (itemColIndex === 10) {
                        itemColIndex = 0
                        itemRowIndex += 1
                    }

                    const button: Button = new Button(36, 36)
                    button.position.set(itemColIndex * 40, itemRowIndex * 40)
                    button.content = F.CreateIcon(item.name)
                    button.on('pointerdown', (e: PIXI.InteractionEvent) => {
                        e.stopPropagation()
                        if (e.data.button === 0) {
                            selectedCallBack(item.name)
                            this.close()
                        }
                    })
                    button.on('pointerover', () => {
                        this.m_hoveredItem = item.name
                        this.updateRecipeVisualization(item.name)
                    })
                    button.on('pointerout', () => {
                        // we have to check this because pointerout can fire after pointerover
                        if (this.m_hoveredItem === item.name) {
                            this.m_hoveredItem = undefined
                            this.updateRecipeVisualization(undefined)
                        }
                    })

                    inventoryGroupItems.addChild(button)

                    itemColIndex += 1
                    subgroupHasItems = true
                }

                if (subgroupHasItems) {
                    itemRowIndex += 1
                    itemColIndex = 0
                }
            }

            if (inventoryGroupItems.children.length > 0) {
                inventoryGroupItems.visible = groupIndex === 0
                this.m_InventoryItems.addChild(inventoryGroupItems)

                const page = new PageTab(82, 68, 2)
                page.active = groupIndex === 0
                page.position.set(groupIndex * 84, 0)
                page.content = F.CreateIcon(group.name, group.name === 'creative' ? 32 : 64)
                page.data = inventoryGroupItems
                page.on('pointerdown', (e: PIXI.InteractionEvent) => {
                    if (e.data.button === 0) {
                        if (!page.active) {
                            for (const inventoryGroup of this.m_InventoryGroups
                                .children as PageTab[]) {
                                inventoryGroup.active = inventoryGroup === page
                            }
                        }
                        const buttonData: PIXI.Container = page.data as PIXI.Container
                        if (!buttonData.visible) {
                            for (const inventoryGroupItems of this.m_InventoryItems
                                .children as PIXI.Container[]) {
                                inventoryGroupItems.visible = inventoryGroupItems === buttonData
                                inventoryGroupItems.interactiveChildren =
                                    inventoryGroupItems === buttonData
                            }
                        }
                    }
                })

                this.m_InventoryGroups.addChild(page)

                groupIndex += 1
            }
        }
    }

    /** Override automatically set position of dialog due to additional area for recipe */
    protected setPosition(): void {
        this.position.set(
            G.app.screen.width / 2 - this.width / 2,
            G.app.screen.height / 2 - 520 / 2
        )
    }

    /** Update recipe visualization */
    private updateRecipeVisualization(recipeName?: string): void {
        // Update Recipe Label
        this.m_RecipeLabel.text = undefined

        // Update Recipe Container
        this.m_RecipeContainer.removeChildren()

        if (recipeName === undefined) return

        const item = FD.items[recipeName]
        if (item && item.subgroup === 'creative') {
            this.m_RecipeLabel.text = `[CREATIVE] - ${item.localised_name}`
        }

        const recipe = FD.recipes[recipeName]
        if (recipe === undefined) return
        this.m_RecipeLabel.text = recipe.localised_name

        F.CreateRecipe(
            this.m_RecipeContainer,
            0,
            0,
            recipe.ingredients,
            recipe.results,
            recipe.time
        )
    }
}
