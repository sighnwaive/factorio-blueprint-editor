import { EventEmitter } from 'eventemitter3'
import Blueprint from './blueprint'

const hashConn = (conn: IConnection) => {
    const firstE = Math.min(conn.entityNumber1, conn.entityNumber2)
    const secondE = Math.max(conn.entityNumber1, conn.entityNumber2)
    const firstS = firstE === conn.entityNumber1 ? conn.entitySide1 : conn.entitySide2
    const secondS = secondE === conn.entityNumber2 ? conn.entitySide2 : conn.entitySide1
    return `${conn.color}-${firstE}-${secondE}-${firstS}-${secondS}`
}

const deserialize = (entityNumber: number, connections: BPS.IConnection) => {
    const parsedConnections: IConnection[] = []

    const addConnSide = (side: string) => {
        if (connections[side]) {
            Object.keys(connections[side]).forEach(color => {
                const conn = connections[side] as BPS.IConnSide
                conn[color].forEach(data => {
                    parsedConnections.push({
                        color,
                        entityNumber1: entityNumber,
                        entityNumber2: data.entity_id,
                        entitySide1: Number(side),
                        entitySide2: data.circuit_id || 1
                    })
                })
            })
        }
    }

    const addCopperConnSide = (side: string, color: string) => {
        if (connections[side]) {
            // For some reason Cu0 and Cu1 are arrays but the switch can only have 1 copper connection
            const data = (connections[side] as BPS.IWireColor[])[0]
            parsedConnections.push({
                color,
                entityNumber1: entityNumber,
                entityNumber2: data.entity_id,
                entitySide1: Number(side.slice(2, 3)) + 1,
                entitySide2: 1
            })
        }
    }

    if (connections) {
        addConnSide('1')
        addConnSide('2')
        // power_switch only connections
        addCopperConnSide('Cu0', 'copper')
        addCopperConnSide('Cu1', 'copper')
    }

    return parsedConnections
}

const serialize = (entityNumber: number, connections: IConnection[]): BPS.IConnection => {
    const serialized: BPS.IConnection = {}

    connections.forEach(connection => {
        const isEntity1 = connection.entityNumber1 === entityNumber
        const side = isEntity1 ? connection.entitySide1 : connection.entitySide2
        const color = connection.color
        const otherEntNr = isEntity1 ? connection.entityNumber2 : connection.entityNumber1

        if (color === 'copper') {
            const SIDE = `Cu${side - 1}`
            if (serialized[SIDE] === undefined) {
                serialized[SIDE] = []
            }
            const c = serialized[SIDE] as BPS.IWireColor[]
            c.push({
                entity_id: otherEntNr
            })
        } else {
            if (serialized[side] === undefined) {
                serialized[side] = {}
            }
            const SIDE = serialized[side] as BPS.IConnSide
            if (SIDE[color] === undefined) {
                SIDE[color] = []
            }
            SIDE[color].push({
                entity_id: otherEntNr
            })
        }
    })

    return serialized
}

class ConnectionMap extends Map<string, IConnection> {
    private entNrToConnHash: Map<number, string[]> = new Map()

    getEntityConnectionHashes(entityNumber: number) {
        return this.entNrToConnHash.get(entityNumber) || []
    }

    set(hash: string, connection: IConnection) {
        const add = (entityNumber: number) => {
            const conn = this.entNrToConnHash.get(entityNumber) || []
            this.entNrToConnHash.set(entityNumber, [...conn, hash])
        }
        add(connection.entityNumber1)
        add(connection.entityNumber2)

        return super.set(hash, connection)
    }

    delete(hash: string) {
        const connection = this.get(hash)
        const rem = (entityNumber: number) => {
            const conn = this.entNrToConnHash.get(entityNumber).filter(h => h !== hash)
            if (conn.length > 0) {
                this.entNrToConnHash.set(entityNumber, conn)
            } else {
                this.entNrToConnHash.delete(entityNumber)
            }
        }
        rem(connection.entityNumber1)
        rem(connection.entityNumber2)

        return super.delete(hash)
    }
}

export class WireConnections extends EventEmitter {
    private bp: Blueprint
    connections: ConnectionMap = new ConnectionMap()

    constructor(bp: Blueprint) {
        super()
        this.bp = bp
    }

    create(connection: IConnection) {
        const hash = hashConn(connection)
        if (this.connections.has(hash)) {
            return
        }

        this.bp.history
            .updateMap(this.connections, hash, connection, 'Connect entities')
            .onDone(this.onCreateOrRemoveConnection.bind(this))
            .commit()
    }

    remove(connection: IConnection) {
        const hash = hashConn(connection)
        if (!this.connections.has(hash)) {
            return
        }

        this.bp.history
            .updateMap(this.connections, hash, undefined, 'Disconnect entities')
            .onDone(this.onCreateOrRemoveConnection.bind(this))
            .commit()
    }

    private onCreateOrRemoveConnection(newValue: IConnection, oldValue: IConnection) {
        if (newValue) {
            this.emit('create', hashConn(newValue), newValue)
        } else if (oldValue) {
            this.emit('remove', hashConn(oldValue), oldValue)
        }
    }

    createEntityConnections(entityNumber: number, connections: BPS.IConnection) {
        deserialize(entityNumber, connections).forEach(c => this.create(c))
    }

    removeEntityConnections(entityNumber: number) {
        this.getEntityConnections(entityNumber).forEach(c => this.remove(c))
    }

    getEntityConnectionHashes(entityNumber: number) {
        return this.connections.getEntityConnectionHashes(entityNumber)
    }

    getEntityConnections(entityNumber: number) {
        return this.getEntityConnectionHashes(entityNumber).reduce((acc: IConnection[], hash) => {
            acc.push(this.connections.get(hash))
            return acc
        }, [])
    }

    serializeConnectionData(entityNumber: number): BPS.IConnection {
        const connections = this.getEntityConnections(entityNumber)
        if (connections.length === 0 || this.bp.entities.get(entityNumber).type === 'electric_pole') {
            return
        }
        return serialize(entityNumber, connections)
    }
}
