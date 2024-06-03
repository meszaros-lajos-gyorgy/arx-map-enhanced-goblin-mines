import { $, ArxMap, Entity, EntityModel, Polygon, Polygons, Rotation, Vector3, Vertex } from 'arx-level-generator'
import { useDelay } from 'arx-level-generator/scripting/hooks'
import { Collision, Label, Material, Shadow } from 'arx-level-generator/scripting/properties'
import { circleOfVectors } from 'arx-level-generator/utils'
import { Box3, MathUtils } from 'three'

const extractPolygonsFromMesh = (map: ArxMap) => {
  const a = new Vector3(7940, 1075, 8825)
  const b = new Vector3(8050, 1355, 9120)

  const a2 = a.clone().add(new Vector3(-17, 100, 100))
  const b2 = b.clone().add(new Vector3(96, -100, -100))

  const wheelBox = new Box3(a, b)
  const axleBox = new Box3(a2, b2)

  const waterWheelPolygons = $(map.polygons)
    .selectWithinBox(wheelBox)
    .selectBy((polygon) => {
      if (polygon.texture === undefined) {
        return true
      }

      const { filename } = polygon.texture
      return !(filename.includes('_ground') || filename.includes('_piece'))
    })
    .delete()

  const axlePolygons = $(map.polygons)
    .clearSelection()
    .selectWithinBox(axleBox)
    .selectBy((p) => {
      return !waterWheelPolygons.some((wp) => wp.equals(p))
    })
    .delete()

  waterWheelPolygons.push(...axlePolygons)

  return waterWheelPolygons
}

const addCenterPoint = (polygons: Polygons) => {
  const center = polygons.getCenter()
  const [a, b, c] = circleOfVectors(center, 1, 3)

  const waterWheelCenterPolygon = new Polygon({
    vertices: [new Vertex(a.x, a.y, a.z), new Vertex(b.x, b.y, b.z), new Vertex(c.x, c.y, c.z), new Vertex(0, 0, 0)],
    isQuad: false,
  })

  polygons.unshift(waterWheelCenterPolygon)

  return polygons
}

const toEntity = (polygons: Polygons) => {
  return new Entity({
    src: 'fix_inter/water_wheel',
    model: EntityModel.fromPolygons(polygons, {
      filename: 'water_wheel.ftl',
      sourcePath: './entities/water_wheel',
      originIdx: 0,
    }),
    position: new Vector3(
      8903 - 27 + polygons.getWidth() / 2,
      192 - 36 + polygons.getHeight() / 2,
      651 - 57 + polygons.getDepth() / 2,
    ),
    orientation: new Rotation(0, MathUtils.degToRad(-90), 0),
  })
}

export const extractWaterWheelAsEntity = (map: ArxMap) => {
  const waterWheel = toEntity(addCenterPoint(extractPolygonsFromMesh(map)))

  waterWheel.withScript()

  waterWheel.script?.properties.push(new Label('water wheel'), Material.wood, Collision.on, Shadow.off)

  // TODO: expose Timer class in arx-level-generator
  let timer: ReturnType<ReturnType<typeof useDelay>['loop']>

  waterWheel.script?.on('rotate_start', () => {
    const { loop } = useDelay()
    const fps = 20
    const fullRevolutionTimeInSec = 10
    timer = loop(1000 / fps, Infinity)

    return `${timer} rotate ${-360 / fps / fullRevolutionTimeInSec} 0 0`
  })

  waterWheel.script?.on('rotate_stop', () => {
    timer.off()

    return `${timer}`
  })

  return waterWheel
}
