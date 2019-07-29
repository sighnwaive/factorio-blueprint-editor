import { GUI, GUIController } from 'dat.gui'
import FD from 'factorio-data'
import actions from './actions'
import G from './common/globals'
import spritesheetsLoader from './spritesheetsLoader'
import { oilOutpostSettings } from './factorio-data/blueprint'

GUI.TEXT_CLOSED = 'Close Settings'
GUI.TEXT_OPEN = 'Open Settings'

export default function initDatGui(): {
    guiBPIndex: GUIController
} {
    const gui = new GUI({
        autoPlace: false,
        hideable: false,
        closeOnTop: true,
        closed: localStorage.getItem('dat.gui.closed') === 'true',
        width: 320
    })

    gui.domElement.style.overflowX = 'hidden'
    gui.domElement.style.overflowY = 'auto'
    gui.domElement.style.maxHeight = `${window.innerHeight}px`
    window.addEventListener('resize', () => {
        gui.domElement.style.maxHeight = `${window.innerHeight}px`
    })

    window.addEventListener('unload', () => localStorage.setItem('dat.gui.closed', String(gui.closed)))

    document.body.appendChild(gui.domElement)

    const guiBPIndex = gui
        .add({ bpIndex: 0 }, 'bpIndex', 0, 0, 1)
        .name('BP Index')
        .onFinishChange((value: number) => {
            if (G.book) {
                G.bp = G.book.getBlueprint(value)
                G.BPC.clearData()
                G.BPC.initBP()
            }
        })

    if (localStorage.getItem('moveSpeed')) {
        G.moveSpeed = Number(localStorage.getItem('moveSpeed'))
    }
    gui.add(G, 'moveSpeed', 5, 20)
        .name('Move Speed')
        .onChange((val: boolean) => localStorage.setItem('moveSpeed', val.toString()))

    if (localStorage.getItem('quickbarRows')) {
        G.quickbarRows = Number(localStorage.getItem('quickbarRows'))
    }
    gui.add(G, 'quickbarRows', 1, 5, 1)
        .name('Quickbar Rows')
        .onChange((rows: number) => {
            localStorage.setItem('quickbarRows', rows.toString())
            G.UI.changeQuickbarRows(rows)
        })

    window.addEventListener('unload', () => {
        localStorage.setItem('quickbarItemNames', JSON.stringify(G.UI.quickbarContainer.serialize()))
    })

    const entitiesQuality = {
        'Low. Res PNG 8 (1.52 MB)': 0,
        'High Res PNG 8 (5.52 MB)': 1,
        'Low. Res PNG 32 (5.55 MB)': 2,
        'High Res PNG 32 (18.20 MB)': 3
    }
    const setQuality = (quality: number): void => {
        G.quality.hr = quality % 2 === 1
        G.quality.compressed = quality < 2
    }

    const gl = document.createElement('canvas').getContext('webgl')
    if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 8192) {
        delete entitiesQuality['High Res PNG 8 (5.52 MB)']
        delete entitiesQuality['High Res PNG 32 (18.20 MB)']
        G.quality.hr = false
    }

    const quality = localStorage.getItem('quality')
        ? Number(localStorage.getItem('quality'))
        : (G.quality.hr ? 1 : 0) + (G.quality.compressed ? 0 : 2)
    setQuality(quality)

    gui.add({ quality }, 'quality', entitiesQuality)
        .name('Entities Quality')
        .onChange((quality: number) => {
            localStorage.setItem('quality', quality.toString())
            setQuality(quality)
            spritesheetsLoader.changeQuality(G.quality.hr, G.quality.compressed)
        })

    G.debug = Boolean(localStorage.getItem('debug'))
    gui.add(G, 'debug')
        .name('Debug')
        .onChange((debug: boolean) => {
            if (debug) {
                localStorage.setItem('debug', 'true')
            } else {
                localStorage.removeItem('debug')
            }
            // TODO: find a nice way to do this
            G.bp.history.logging = debug
            G.UI.showDebuggingLayer = debug
        })

    // Theme folder
    const themeFolder = gui.addFolder('Theme')

    if (localStorage.getItem('darkTheme')) {
        G.colors.darkTheme = localStorage.getItem('darkTheme') === 'true'
    }
    themeFolder
        .add(G.colors, 'darkTheme')
        .name('Dark Mode')
        .onChange((val: boolean) => localStorage.setItem('darkTheme', val.toString()))

    if (localStorage.getItem('pattern')) {
        G.colors.pattern = localStorage.getItem('pattern') as 'checker' | 'grid'
    }
    themeFolder
        .add(G.colors, 'pattern', ['checker', 'grid'])
        .name('Pattern')
        .onChange((val: 'checker' | 'grid') => {
            G.BPC.generateGrid(val)
            localStorage.setItem('pattern', val)
        })

    if (localStorage.getItem('oilOutpostSettings')) {
        const settings = JSON.parse(localStorage.getItem('oilOutpostSettings'))
        Object.keys(oilOutpostSettings).forEach(k => {
            if (settings[k]) {
                const S = oilOutpostSettings as Record<string, string | boolean | number>
                S[k] = settings[k]
            }
        })
    }
    window.addEventListener('unload', () =>
        localStorage.setItem('oilOutpostSettings', JSON.stringify(oilOutpostSettings))
    )

    const oilOutpostFolder = gui.addFolder('Oil Outpost Generator Settings')
    oilOutpostFolder.add(oilOutpostSettings, 'DEBUG').name('Debug')
    oilOutpostFolder.add(oilOutpostSettings, 'PUMPJACK_MODULE', getModulesObjFor('pumpjack')).name('Pumpjack Modules')
    oilOutpostFolder.add(oilOutpostSettings, 'MIN_GAP_BETWEEN_UNDERGROUNDS', 1, 9, 1).name('Min Gap > < UPipes')
    oilOutpostFolder.add(oilOutpostSettings, 'BEACONS').name('Beacons')
    oilOutpostFolder.add(oilOutpostSettings, 'MIN_AFFECTED_ENTITIES', 1, 12, 1).name('Min Affect. Pumpjacks')
    oilOutpostFolder.add(oilOutpostSettings, 'BEACON_MODULE', getModulesObjFor('beacon')).name('Beacon Modules')
    oilOutpostFolder.add(actions.generateOilOutpost, 'call').name('Generate (g)')

    function getModulesObjFor(entityName: string): Record<string, string> {
        return (
            Object.keys(FD.items)
                .map(k => FD.items[k])
                .filter(item => item.type === 'module')
                // filter modules based on entity allowed_effects (ex: beacons don't accept productivity effect)
                .filter(
                    item =>
                        !FD.entities[entityName].allowed_effects ||
                        Object.keys(item.effect).every(effect =>
                            FD.entities[entityName].allowed_effects.includes(effect)
                        )
                )
                .reduce(
                    (obj, item) => {
                        obj[item.ui_name] = item.name
                        return obj
                    },
                    { None: 'none' } as Record<string, string>
                )
        )
    }

    // Keybinds folder
    const keybindsFolder = gui.addFolder('Keybinds')

    actions.forEachAction((action, actionName) => {
        const name = actionName
            .split(/(?=[A-Z1-9])/)
            .join(' ')
            .replace(/(\b\w)/, c => c.toUpperCase())
        if (name.includes('Quickbar')) {
            return
        }
        keybindsFolder
            .add(action, 'keyCombo')
            .name(name)
            .listen()
    })

    const quickbarFolder = keybindsFolder.addFolder('Quickbar')

    actions.forEachAction((action, actionName) => {
        const name = actionName
            .split(/(?=[A-Z1-9])/)
            .join(' ')
            .replace(/(\b\w)/, c => c.toUpperCase())
        if (!name.includes('Quickbar')) {
            return
        }
        quickbarFolder
            .add(action, 'keyCombo')
            .name(name)
            .listen()
    })

    keybindsFolder
        .add(
            {
                resetDefaults: () => actions.forEachAction(action => action.resetKeyCombo())
            },
            'resetDefaults'
        )
        .name('Reset Defaults')

    return {
        guiBPIndex
    }
}