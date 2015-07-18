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

module.exports = function (Crafty, WIDTH, HEIGHT, BORDER, SPAWN_BORDER) {
  const FPS = Crafty.timer.FPS()
  let types = ['White', 'Cyan']
  // let types = ['Debug']

  Crafty.c('Spawner', {
    _f: 0,
    _lastFrame: 0,
    _tachId: 0,
    init () {
      this._spawnFrame = 0
      this._frames = []
      this.count = {
        'White': 0,
        'Cyan': 0
      }
      this.limit = {
        'White': 200,
        'Cyan': 3,
        'Debug': 1000
      }
      this.bind('EndLoop', function () {
        this.reset()
      })
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
      // TODO: Regulate the Tachyon spawning to worsen as the game goes on
      // TODO: More kinds of Tachyons
      let progression = this._f / this._lastFrame

      function shouldSpawn () {
        return this._f >= this._spawnFrame
      }

      // pick the types of spawn
      function pickTypes () {
        let _this = this
        // TODO: Move it upscope so we can add more tests to it
        // check if a type can spawn with the available components
        function canSpawn (type) {
          if (_this.count[type] >= _this.limit[type]) {
            return false
          }
          if (type === 'Cyan') return false
          return true
        }

        // add type-specific
        function addTypeLogic (elem) {
          switch (elem.type) {
            case 'White':
              let id = _this._whiteId++
              elem.id = id
              elem.speed = scale(Math.random(), [0, 1], [4, 6])
              break
            case 'Cyan':
              // elem.maxSize = 500
              elem.speed = scale(Math.random(), [0, 1], [1, 2])
              break
          }
        }

        // fill the spawn thing with the info
        let spawns = []
        types.forEach(function (type, i) {
          // TODO: Take game duration and Tach type into consideration
          let min = progression * 20
          let max = min + 10
          let randomMax = Math.ceil(scale(Math.random() * Math.pow(progression, 2), [0, 1], [min, max]))
          // let randomMax = 100
          for (let i = 0; i < randomMax; i++) {
            if (!canSpawn(type)) break
            let elem = {
              type: type,
              speed: scale(Math.random(), [0, 1], [1, 1])
            }
            addTypeLogic(elem)
            spawns.push(elem)
            _this.count[elem.type]++
          }
        })
        return spawns
      }

      // add location and movement direction data
      function pickSide (elem) {
        const spawnBorder = BORDER / 2

        // NOTE: Sides are inside the border, versus the playing field's edges
        const spawnHeight = HEIGHT - BORDER * 2
        const spawnWidth = WIDTH - BORDER * 2

        function setTopDestination (elem, closeSide = 1) {
          // origin
          elem.origin = {}
          elem.origin.x = Math.random() * (WIDTH - (BORDER - spawnBorder) * 2) + (BORDER - spawnBorder)
          elem.origin.y = spawnBorder
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
          elem.origin.x = WIDTH - spawnBorder
          elem.origin.y = Math.random() * (HEIGHT - (BORDER - spawnBorder) * 2) + (BORDER - spawnBorder)
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
          elem.origin.x = Math.random() * (WIDTH - (BORDER - spawnBorder) * 2) + (BORDER - spawnBorder)
          elem.origin.y = HEIGHT - spawnBorder
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
          elem.origin.y = Math.random() * (HEIGHT - (BORDER - spawnBorder) * 2) + (BORDER - spawnBorder)
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

        // TODO: Abstract, the if statements could be after the switch
        //  The switch only takes into consideration the sideRange on the dest
        switch (elem.type) {
          case 'White':
            // origin
            let perimeter = (HEIGHT + WIDTH) * 2
            let side = Math.random() * perimeter

            if (side < WIDTH) {
              setTopDestination(elem, 0.8)
            } else if (side < WIDTH + HEIGHT) {
              setRightDestination(elem, 0.8)
            } else if (side < WIDTH * 2 + HEIGHT) {
              setBottomDestination(elem, 0.8)
            } else if (side < perimeter) {
              setLeftDestination(elem, 0.8)
            } else {
              throw {
                name: 'unknown side',
                value: side
              }
            }
            break
        }

        // angles
        elem.angle = angleBetween(elem.origin, elem.dest)
      }

      if (!shouldSpawn.call(this)) {
        return []
      }
      // reset spawner counter
      // let minTime = scale(this._f / this._lastFrame, [0, 1], [FPS * 2, FPS])
      // let maxTime = minTime + FPS / 2
      this._spawnFrame = this._f + scale(Math.random(), [0, 1], [FPS * 0.5, FPS * 1.5])
      // console.log('next spawn', this._spawnFrame - this._dt, 'dt', this._dt, 'of', this._dt / this._gameEnd)
      // console.log('maxTimeLimit', maxTimeLimit, 'of', this._dt / this._gameEnd)
      let spawns = pickTypes.call(this)
      spawns.forEach(pickSide)
      return spawns
    },
    _spawn (frame) {
      // var _this = this
      frame.forEach(function (elem) {
        // TODO: Add more Tachyon types here too
        // console.log(elem)
        // if (_this.count[elem.type] < _this.limit[elem.type]) {
        let tachyon = Crafty.e('Tachyon')
          .type(elem.type)
        let constructor = elem.type.toLowerCase() + 'Tachyon'
        tachyon[constructor](elem)
        // } else {
        //   // TODO: Spawn limit
        // }
      })
      // console.log('whiteTachyons', Crafty('WhiteTachyon').length)
    },
    spawner (gameDuration) {
      // this._gameEnd = gameEnd * Crafty.timer.FPS()
      this._lastFrame = gameDuration * Crafty.timer.FPS()
      return this
    },
    reset () {
      this._f = 0
      this._spawnFrame = 0
      this.unbind('EnterFrame')
      return this
    },
    start () {
      this.bind('EnterFrame', this._enterFrame)
      return this
    }
  })
}
