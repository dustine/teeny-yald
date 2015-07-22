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

module.exports = function (Crafty,
  {WIDTH: WIDTH, HEIGHT: HEIGHT, BORDER: BORDER, SPAWN_BORDER: SPAWN_BORDER,
    DESPAWN_BORDER: DESPAWN_BORDER}) {
  const FPS = Crafty.timer.FPS()
  let types = ['White']
  let specials = ['Cyan', 'Lime']
  // let types = ['Debug']
  let initialCount = {
    'White': 0,
    'Cyan': 0,
    'Lime': 0
  }

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
        'Cyan': 0,
        'Lime': 0
      }
      this.limit = {
        'White': 200,
        'Cyan': 2,
        'Lime': 2,
        'Debug': 1000
      }
      this.bind('StartLoop', this.start)
      this.bind('EndLoop', this.reset)
      this._whiteId = 0
    },
    _enterFrame () {
      let spawner = this
      if (!this._frames[this._f]) {
        this._frames[this._f] = this._generate()
      } else {
        this._frames[this._f].forEach((elem) => {
          spawner.count[elem.type]++
        })
      }
      this._spawn(this._frames[this._f++])
    },
    _generate () {
      // TODO: Balance Tachyon spawning
      // TODO: More kinds of Tachyons
      let spawner = this
      let progression = this._f / this._lastFrame

      function canSpawn () {
        return spawner._f >= spawner._spawnFrame
      }

      function createEnergized (number) {
        // check if a type can spawn with the available components
        function canSpawn (type) {
          return spawner.count[type] < spawner.limit[type]
        }

        // the max number allowed of a particle to spawn in a round
        function typeWiseRandomMax (type) {
          let min, randomMax
          switch (type) {
            case 'White':
              min = progression * 10
              randomMax = Math.ceil(scale(Math.random() * Math.pow(progression, 2), [0, 1], [min, min + 5]))
              return randomMax === 0 ? 1 : randomMax
          }
        }

        // fill the spawn thing with the info
        let spawns = []

        types.forEach(function (type) {
          let randomMax = number || typeWiseRandomMax(type)
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
            elem.speed = scale(Math.random(), [0, 1], [3, 5])
            break
          case 'Cyan':
            elem.speed = scale(Math.random(), [0, 1], [3, 5])
            break
          case 'Lime':
            elem.speed = scale(Math.random(), [0, 1], [2, 3])
            elem.summonDist = scale(Math.random(), [0, 1], [0.25, 0.75])
            elem.summonSpeed = scale(Math.random(), [0, 1], [0.25, 1])
            // children tachyon
            let numberTachs = scale(Math.random(), [0, 1], [25, 50])
            elem.tachyons = createEnergized(numberTachs)
            elem.tachyons.forEach((elem) => {
              elem.angle = scale(Math.random(), [0, 1], [-Math.PI, +Math.PI])
            })
            break
          case 'Magenta':
            elem.speed = scale(Math.random(), [0, 1], [5, 6])
        }
      }

      if (!canSpawn()) {
        return []
      }

      // reset spawn counter
      spawner._spawnFrame = spawner._f + scale(Math.random(), [0, 1], [FPS * 0.5, FPS * 1.5])

      // summon normal spawns
      let spawns = createEnergized()
      spawns.forEach((elem) => {
        pickMovement(elem)
      })

      // attempt special spawns
      function canAddSpecial (special) {
        if (special) {
          switch (special.type) {
            default:
              console.log(special.type, spawner.count[special.type], spawner.limit[special.type])
              return spawner.count[special.type] < spawner.limit[special.type]
          }
          return false
        }
        return spawner._specialFrame <= spawner._f
      }

      function addLimitingLogic (special) {
        spawner.count[special.type]++
        console.log(special.type, spawner.count[special.type], spawner.limit[special.type])
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
          console.log(special.type, 'has been spawned')
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
              elem.paradoxy = true
            }
            break
          case 'Lime':
            elem.tachyons.forEach((tach) => {
              if (spawner.killers.indexOf(tach.id) >= 0) {
                tach.paradoxy = true
              }
            })
            break
        }
      }

      frame.forEach(function (elem) {
        addTypeSpawnLogic(elem)
        let tachyon = Crafty.e('Tachyon')
          .type(elem.type)
        let constructor = elem.type.toLowerCase() + 'Tachyon'
        tachyon[constructor](elem)
      })
    },
    spawner (gameDuration) {
      this._lastFrame = gameDuration * Crafty.timer.FPS()
      this.reset()
      return this
    },
    reset () {
      this._f = 0
      this._spawnFrame = 0
      this._specialFrame = FPS * 20
      // this._specialFrame = 0
      this.unbind('EnterFrame')
      // console.log(this.killers)
      return this
    },
    start () {
      this.count = initialCount
      this.bind('EnterFrame', this._enterFrame)
      return this
    }
  })
}
