import { $, ArxMap, Entity, EntityModel, Polygon, Rotation, Settings, Vector3, Vertex } from 'arx-level-generator'
import { useDelay } from 'arx-level-generator/scripting/hooks'
import { Label, Material } from 'arx-level-generator/scripting/properties'
import { Box3, MathUtils } from 'three'

// ------------------------------------------------
// loading the map

const level15Settings = new Settings({
  levelIdx: 15,
})

const level15 = await ArxMap.fromOriginalLevel(15, level15Settings)

// ------------------------------------------------
// moving the player to the place I work

level15.player.position.add(new Vector3(1450, 350, 3300))
level15.player.orientation.y += MathUtils.degToRad(-90)

const spawnMarker = level15.entities.findByRef('marker_0391')
const spawnMarkerIdx = level15.entities.findIndex((entity) => entity === spawnMarker)
level15.entities.splice(spawnMarkerIdx, 1)

// ------------------------------------------------
// adjusting stuff

const wheelBox = new Box3(new Vector3(7940, 1075, 8825), new Vector3(8050, 1355, 9120))
const wheelSelection = $(level15.polygons)
  .selectWithinBox(wheelBox)
  .selectBy((polygon) => {
    if (polygon.texture === undefined) {
      return true
    }
    const { filename } = polygon.texture
    return !(filename.includes('_ground') || filename.includes('_piece'))
  })

const waterWheelPolygons = wheelSelection.copy().get()

wheelSelection.delete()

const axleBox = new Box3(
  new Vector3(7950 - 27, 1075 + 100, 8825 + 100),
  new Vector3(8045 + 101, 1355 - 100, 9120 - 100),
)
const axleSelection = $(level15.polygons)
  .clearSelection()
  .selectWithinBox(axleBox)
  .selectBy((p) => {
    return !waterWheelPolygons.some((wp) => wp.equals(p))
  })

waterWheelPolygons.push(...axleSelection.copy().get())

axleSelection.delete()

// ----------------

const sizeOfWaterWheel = new Box3()

waterWheelPolygons.forEach((polygon) => {
  for (let i = 0; i < (polygon.isQuad() ? 4 : 3); i++) {
    sizeOfWaterWheel.expandByPoint(polygon.vertices[i])
  }
})

const { max: wwMax, min: wwMin } = sizeOfWaterWheel
const halfX = (wwMax.x - wwMin.x) / 2
const halfY = (wwMax.y - wwMin.y) / 2
const halfZ = (wwMax.z - wwMin.z) / 2
const centerOfWaterWheel = new Vertex(wwMin.x + halfX, wwMin.y + halfY, wwMin.z + halfZ)

const waterWheelCenterPolygon = new Polygon({
  vertices: [
    centerOfWaterWheel.clone().add(new Vector3(1, 0, 0)),
    centerOfWaterWheel.clone().add(new Vector3(1, 0, 1)),
    centerOfWaterWheel.clone().add(new Vector3(0, 0, 1)),
    new Vertex(0, 0, 0),
  ],
  isQuad: false,
})

waterWheelPolygons.unshift(waterWheelCenterPolygon)

const waterWheel = new Entity({
  src: 'fix_inter/water_wheel',
  model: EntityModel.fromPolygons(waterWheelPolygons, {
    filename: 'water_wheel.ftl',
    sourcePath: './entities/water_wheel',
    originIdx: 0,
  }),
  position: new Vector3(8903 - 27 + halfX, 192 - 36 + halfY, 651 - 57 + halfZ),
  orientation: new Rotation(0, MathUtils.degToRad(-90), 0),
})
waterWheel.withScript()
waterWheel.script?.properties.push(new Label('water wheel'), Material.wood)
waterWheel.script?.on('init', () => {
  const { loop } = useDelay()
  const fps = 30
  const fullRevolutionTimeInSec = 3
  return `${loop(1000 / fps, Infinity)} rotate ${-360 / fps / fullRevolutionTimeInSec} 0 0`
})

level15.entities.push(waterWheel)

// ------------------------------------------------
// finalizing

level15.finalize()
await level15.saveToDisk(level15Settings)

console.log('done')
