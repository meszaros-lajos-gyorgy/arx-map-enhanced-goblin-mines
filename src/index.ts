import { $, ArxMap, Entity, EntityModel, Polygon, Rotation, Settings, Vector3, Vertex } from 'arx-level-generator'
import { useDelay } from 'arx-level-generator/scripting/hooks'
import { Collision, Label, Material, Shadow } from 'arx-level-generator/scripting/properties'
import { circleOfVectors } from 'arx-level-generator/utils'
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
// making the water wheel rotate

// 1) extracting the polygons from the mesh

const wheelBox = new Box3(new Vector3(7940, 1075, 8825), new Vector3(8050, 1355, 9120))
const axleBox = new Box3(
  new Vector3(7950 - 27, 1075 + 100, 8825 + 100),
  new Vector3(8045 + 101, 1355 - 100, 9120 - 100),
)

const waterWheelPolygons = $(level15.polygons)
  .selectWithinBox(wheelBox)
  .selectBy((polygon) => {
    if (polygon.texture === undefined) {
      return true
    }

    const { filename } = polygon.texture
    return !(filename.includes('_ground') || filename.includes('_piece'))
  })
  .delete()

const axlePolygons = $(level15.polygons)
  .clearSelection()
  .selectWithinBox(axleBox)
  .selectBy((p) => {
    return !waterWheelPolygons.some((wp) => wp.equals(p))
  })
  .delete()

waterWheelPolygons.push(...axlePolygons)

// 2) adding a center point to the polygons

const centerOfWaterWheel = waterWheelPolygons.getCenter()
const [a, b, c] = circleOfVectors(centerOfWaterWheel, 1, 3)

const waterWheelCenterPolygon = new Polygon({
  vertices: [new Vertex(a.x, a.y, a.z), new Vertex(b.x, b.y, b.z), new Vertex(c.x, c.y, c.z), new Vertex(0, 0, 0)],
  isQuad: false,
})

waterWheelPolygons.unshift(waterWheelCenterPolygon)

// 3) turning the polygons into an entity

const waterWheel = new Entity({
  src: 'fix_inter/water_wheel',
  model: EntityModel.fromPolygons(waterWheelPolygons, {
    filename: 'water_wheel.ftl',
    sourcePath: './entities/water_wheel',
    originIdx: 0,
  }),
  position: new Vector3(
    8903 - 27 + waterWheelPolygons.getWidth() / 2,
    192 - 36 + waterWheelPolygons.getHeight() / 2,
    651 - 57 + waterWheelPolygons.getDepth() / 2,
  ),
  orientation: new Rotation(0, MathUtils.degToRad(-90), 0),
})
waterWheel.withScript()
waterWheel.script?.properties.push(new Label('water wheel'), Material.wood, Collision.off, Shadow.off)

// 4) adding rotation via scripts

waterWheel.script?.on('init', () => {
  const { loop } = useDelay()
  const fps = 30
  const fullRevolutionTimeInSec = 10
  return `${loop(1000 / fps, Infinity)} rotate ${-360 / fps / fullRevolutionTimeInSec} 0 0`
})

level15.entities.push(waterWheel)

// ------------------------------------------------
// finalizing

level15.finalize()
await level15.saveToDisk(level15Settings)

console.log('done')
