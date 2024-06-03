import { ArxMap, Settings, Vector3 } from 'arx-level-generator'
import { MathUtils } from 'three'
import { extractWaterWheelAsEntity } from './extractWaterWheelAsEntity.js'

const settings = new Settings()
const map = await ArxMap.fromOriginalLevel(15, settings)

if (settings.mode === 'development') {
  map.player.position.add(new Vector3(1450, 350, 3300))
  map.player.orientation.y += MathUtils.degToRad(-90)

  const spawnMarker = map.entities.findByRef('marker_0391')
  const spawnMarkerIdx = map.entities.findIndex((entity) => entity === spawnMarker)
  map.entities.splice(spawnMarkerIdx, 1)
}

const waterWheel = extractWaterWheelAsEntity(map)
map.entities.push(waterWheel)

map.finalize()
await map.saveToDisk(settings)

console.log('done')
