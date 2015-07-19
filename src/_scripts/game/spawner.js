'use strict'

// XXX: Get a library for this kind of stuff mkay
// Fisher-Yates
function shuffle (array) {
  var m = array.length
  var t, i
  while (m) {
    i = Math.floor(Math.random() * m--)
    t = array[m]
    array[m] = array[i]
    array[i] = t
  }
}

function scale (val, from, to) {
  return (val - from[0]) * (to[1] - to[0]) / (from[1] - from[0]) + to[0]
}

function angleBetween (origin, dest) {
  // y axis is flipped
  return Math.atan2(-(dest.y - origin.y), dest.x - origin.x)
}

// function randomAngle (min, max) {
//   if (min > max) {
//     max += 2 * Math.PI
//     let result = Math.random() * (max - min) + min
//     while (result < -Math.PI) {
//       result += 2 * Math.PI
//     }
//     while (result > Math.PI) {
//       result -= 2 * Math.PI
//     }
//     return result
//   } else {
//     return Math.random() * (max - min) + min
//   }
// }

module.exports = function (Crafty,
  {WIDTH: WIDTH, HEIGHT: HEIGHT, BORDER: BORDER, SPAWN_BORDER: SPAWN_BORDER,
    DESPAWN_BORDER: DESPAWN_BORDER}) {
  const FPS = Crafty.timer.FPS()
  let types = ['White']
  let specials = ['Cyan']
  // let types = ['Debug']

  Crafty.c('Spawner', {
    _f: 0,
    _lastFrame: 0,
    _tachId: 0,
    init () {
      this._spawnFrame = 0
      this._frames = []
      this.killers = []
      this.count = {
        'White': 0,
        'Cyan': 0
      }
      this.limit = {
        'White': 200,
        'Cyan': 3,
        'Debug': 1000
      }
      this.bind('StartLoop', this.start)
      this.bind('EndLoop', this.reset)
      this._whiteId = 0
    // this.requires('2D, Persist')
    },
    _enterFrame () {
      // console.log(this.count)
      if (!this._frames[this._f]) {
        this._frames[this._f] = this._generate()
      }
      this._spawn(this._frames[this._f++])
      // console.log(this.count)
    },
    _generate () {
      // TODO: Balance Tachyon spawning
      // TODO: More kinds of Tachyons
      let spawner = this
      let progression = this._f / this._lastFrame

      function canSpawn () {
        return spawner._f >= spawner._spawnFrame
      }

      function createWhiteTachyons () {
        // check if a type can spawn with the available components
        function canSpawn (type) {
          if (spawner.count[type] >= spawner.limit[type]) return false
          // if (type === 'Cyan') return false
          return true
        }

        // the max number allowed of a particle to spawn in a round
        function typeWiseRandomMax (type) {
          let min, randomMax
          switch (type) {
            case 'White':
              min = progression * 20
              randomMax = Math.ceil(scale(Math.random() * Math.pow(progression, 2), [0, 1], [min, min + 10]))
              return randomMax === 0 ? 1 : randomMax
            // case 'Cyan':
            //   if (progression < 0.25) return 0
            //   min = scale(progression, [0.25, 1], [0, 3])
            //   randomMax = Math.round(Math.random() * min)
            //   console.log(randomMax)
            //   return randomMax
          }
        }

        // fill the spawn thing with the info
        let spawns = []
        types.forEach(function (type) {
          let randomMax = typeWiseRandomMax(type)
          for (let i = 0; i < randomMax; i++) {
            if (!canSpawn(type)) break
            let elem = {type}
            addTypeLogic(elem)
            spawns.push(elem)
            spawner.count[elem.type]++
          }
        })
        return spawns
      }

      // add location and movement direction data
      function pickMovement (elem) {
        // type-wise logic
        let safePerimeter = 0.8
        switch (elem.type) {
          case 'Cyan':
            // origin
            safePerimeter = 0
            break
        }

        // origin, dest
        // NOTE: Sides are inside the border, versus the playing field's edges
        const spawnHeight = HEIGHT - BORDER * 2
        const spawnWidth = WIDTH - BORDER * 2

        function setTopDestination (elem, closeSide = 1) {
          // origin
          elem.origin = {}
          elem.origin.x = Math.random() * (WIDTH - (BORDER - SPAWN_BORDER) * 2) + (BORDER - SPAWN_BORDER)
          elem.origin.y = SPAWN_BORDER
          // destination
          elem.dest = {}
          let perimeter = Math.random() * (spawnHeight * closeSide * 2 + spawnWidth)
          if (perimeter < spawnHeight * closeSide) {
            // left
            elem.dest.x = BORDER
            elem.dest.y = perimeter + BORDER + (spawnHeight * (1 - closeSide))
          } else if (perimeter < spawnHeight * closeSide + spawnWidth) {
            // bottom
            elem.dest.x = (perimeter - spawnHeight * closeSide) + BORDER
            elem.dest.y = HEIGHT - BORDER
          } else if (perimeter < spawnHeight * closeSide * 2 + spawnWidth) {
            // right
            elem.dest.x = WIDTH - BORDER
            elem.dest.y = (HEIGHT - BORDER) - (perimeter - spawnHeight * closeSide - spawnWidth)
          } else {
            throw {
              error: 'perimeter too big',
              perimeter: perimeter,
              elem: elem
            }
          }
        }

        function setRightDestination (elem, closeSide = 1) {
          // origin
          elem.origin = {}
          elem.origin.x = WIDTH - SPAWN_BORDER
          elem.origin.y = Math.random() * (HEIGHT - (BORDER - SPAWN_BORDER) * 2) + (BORDER - SPAWN_BORDER)
          // destination
          elem.dest = {}
          let perimeter = Math.random() * (spawnWidth * closeSide * 2 + spawnHeight)
          if (perimeter < spawnWidth * closeSide) {
            // top
            elem.dest.x = (WIDTH - BORDER) - (perimeter + spawnWidth * (1 - closeSide))
            elem.dest.y = BORDER
          } else if (perimeter < spawnWidth * closeSide + spawnHeight) {
            // left
            elem.dest.x = BORDER
            elem.dest.y = (perimeter - spawnWidth * closeSide) + BORDER
          } else if (perimeter < spawnWidth * closeSide * 2 + spawnHeight) {
            // bottom
            elem.dest.x = (perimeter - spawnWidth * closeSide - spawnHeight) + BORDER
            elem.dest.y = HEIGHT - BORDER
          } else {
            throw {
              error: 'perimeter too big',
              perimeter: perimeter,
              elem: elem
            }
          }
        }

        function setBottomDestination (elem, closeSide = 1) {
          // origin
          elem.origin = {}
          elem.origin.x = Math.random() * (WIDTH - (BORDER - SPAWN_BORDER) * 2) + (BORDER - SPAWN_BORDER)
          elem.origin.y = HEIGHT - SPAWN_BORDER
          // destination
          elem.dest = {}
          let perimeter = Math.random() * (spawnHeight * closeSide * 2 + spawnWidth)
          if (perimeter < spawnHeight * closeSide) {
            // right
            elem.dest.x = WIDTH - BORDER
            elem.dest.y = (HEIGHT - BORDER) - (perimeter + spawnHeight * (1 - closeSide))
          } else if (perimeter < spawnHeight * closeSide + spawnWidth) {
            // top
            elem.dest.x = (WIDTH - BORDER) - (perimeter - spawnHeight * closeSide)
            elem.dest.y = BORDER
          } else if (perimeter < spawnHeight * closeSide * 2 + spawnWidth) {
            // left
            elem.dest.x = BORDER
            elem.dest.y = perimeter + BORDER - (spawnHeight * closeSide + spawnWidth)
          } else {
            throw {
              error: 'perimeter too big',
              perimeter: perimeter,
              elem: elem
            }
          }
        }

        function setLeftDestination (elem, closeSide = 1) {
          // origin
          elem.origin = {}
          elem.origin.x = BORDER / 2
          elem.origin.y = Math.random() * (HEIGHT - (BORDER - SPAWN_BORDER) * 2) + (BORDER - SPAWN_BORDER)
          // destination
          elem.dest = {}
          let perimeter = Math.random() * (spawnWidth * closeSide * 2 + spawnHeight)
          if (perimeter < spawnWidth * closeSide) {
            // bottom
            elem.dest.x = BORDER + (perimeter + spawnWidth * (1 - closeSide))
            elem.dest.y = HEIGHT - BORDER
          } else if (perimeter < spawnWidth * closeSide + spawnHeight) {
            // right
            elem.dest.x = WIDTH - BORDER
            elem.dest.y = (HEIGHT - BORDER) - (perimeter - spawnWidth * closeSide)
          } else if (perimeter < spawnWidth * closeSide * 2 + spawnHeight) {
            // top
            elem.dest.x = (WIDTH - BORDER) - (perimeter - spawnWidth * closeSide - spawnHeight)
            elem.dest.y = BORDER
          } else {
            throw {
              error: 'perimeter too big',
              perimeter: perimeter,
              elem: elem
            }
          }
        }

        let perimeter = (HEIGHT + WIDTH) * 2
        let side = Math.random() * perimeter

        if (side < WIDTH) {
          setTopDestination(elem, safePerimeter)
        } else if (side < WIDTH + HEIGHT) {
          setRightDestination(elem, safePerimeter)
        } else if (side < WIDTH * 2 + HEIGHT) {
          setBottomDestination(elem, safePerimeter)
        } else if (side < perimeter) {
          setLeftDestination(elem, safePerimeter)
        } else {
          throw {
            name: 'unknown side',
            value: side
          }
        }

        // angle
        elem.angle = angleBetween(elem.origin, elem.dest)
      }

      // add type-specific logic
      function addTypeLogic (elem) {
        switch (elem.type) {
          case 'White':
            let id = spawner._whiteId++
            elem.id = id
            elem.speed = scale(Math.random(), [0, 1], [4, 6])
            break
          case 'Cyan':
            // elem.maxSize = 500
            elem.speed = scale(Math.random(), [0, 1], [3, 5])
            break
        }
      }

      if (!canSpawn()) {
        return []
      }

      function resetSpawnCounter () {
        // reset spawner counter
        // let minTime = scale(this._f / this._lastFrame, [0, 1], [FPS * 2, FPS])
        // let maxTime = minTime + FPS / 2
        spawner._spawnFrame = spawner._f + scale(Math.random(), [0, 1], [FPS * 0.5, FPS * 1.5])
      }

      resetSpawnCounter()

      // summon normal spawns
      let spawns = createWhiteTachyons()

      spawns.forEach((elem) => {
        pickMovement(elem)
        addTypeLogic(elem)
      })

      // attempt special spawns
      function canAddSpecial (special) {
        if (special) {
          switch (special.type) {
            case 'Cyan':
              return spawner.count[special.type] < spawner.limit[special.type]
          }
          return false
        }
        return spawner._specialFrame <= spawner._f
      }

      function addLimitingLogic (special) {
        spawner.count[special.type]++
      }

      function resetSpecialCounter () {
        let min = scale(progression, [0, 1], [FPS * 4, FPS * 2])
        let max = min + FPS / 2
        spawner._specialFrame = spawner._f + scale(Math.random(), [0, 1], [min, max])
      }

      if (canAddSpecial()) {
        resetSpecialCounter()
        let special = {}
        // pick random and valid type
        shuffle(specials)
        for (let i = 0; i < specials.length; i++) {
          special.type = specials[i]
          if (canAddSpecial(special)) {
            addLimitingLogic(special)
            break
          }
          special.type = undefined
        }
        // check if there was a type to begin with
        if (special.type) {
          console.log(special.type)
          pickMovement(special)
          addTypeLogic(special)
          spawns.push(special)
        }
      }
      return spawns
    },
    _spawn (frame) {
      let spawner = this

      function addTypeSpawnLogic (elem) {
        switch (elem.type) {
          case 'White':
            // paradox-inducing
            if (spawner.killers.indexOf(elem.id) >= 0) {
              elem.addComponent('Paradoxy')
            }
        }
      }

      frame.forEach(function (elem) {
        let tachyon = Crafty.e('Tachyon')
          .type(elem.type)
        let constructor = elem.type.toLowerCase() + 'Tachyon'
        tachyon[constructor](elem)
        addTypeSpawnLogic(tachyon)
      })
      // console.log('whiteTachyons', Crafty('WhiteTachyon').length)
    },
    spawner (gameDuration) {
      // this._gameEnd = gameEnd * Crafty.timer.FPS()
      this._lastFrame = gameDuration * Crafty.timer.FPS()
      this.reset()
      return this
    },
    reset () {
      this._f = 0
      this._spawnFrame = 0
      this._specialFrame = this._lastFrame / 4
      this.unbind('EnterFrame')
      return this
    },
    start () {
      this.bind('EnterFrame', this._enterFrame)
      return this
    }
  })
}
