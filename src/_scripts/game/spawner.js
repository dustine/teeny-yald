/* eslint-env node */

function scale (val, from, to) {
  return (val - from[0]) / (from[1] - from[0]) * (to[1] - to[0]) + to[0]
}

function angleBetween (origin, dest) {
  // NOTE: y axis is flipped
  return Math.atan2(-(dest[1] - origin[1]), dest[0] - origin[0])
}

function randomAngle (min, max) {
  if (min > max) {
    max += 2 * Math.PI
    var result = Math.random() * (max - min) + min
    while (result < -Math.PI) {
      result += 2 * Math.PI
    }
    while (result > Math.PI) {
      result -= 2 * Math.PI
    }
    return result
  } else {
    return Math.random() * (max - min) + min
  }
}

module.exports = function (Crafty, WIDTH, HEIGHT, BORDER, SPAWN_BORDER) {
  Crafty.c('Spawner', {
    _dt: 0,
    _gameEnd: 0,
    _tachId: 0,
    init: function () {
      this._spawnFrame = 0
      this._frames = []
    // this.requires('2D, Persist')
    },
    _enterFrame: function () {
      if (!this._frames[this._dt]) {
        this._frames[this._dt] = this._generate()
      }
      this._spawn(this._frames[this._dt++])
    },
    _generate: function () {
      // TODO: Spawn the Tachyons outside the arena
      // TODO: Regulate the Tachyon spawning to worsen as the game goes on
      // TODO: More kinds of Tachyons

      function shouldSpawn (_this) {
        return _this._dt >= _this._spawnFrame
      }
      function pickTypes (_this) {
        var spawns = []
        var randomMax = Math.random() * 5 + 1
        for (var i = 0; i < randomMax; i++) {
          var id = _this._tachId++
          spawns.push({
            type: 'White',
            id: id,
            speed: 4
          })
        }
        return spawns
      }
      function pickSide (elem) {
        function topSide (elem) {
          // origin
          elem.x = Math.random() * (WIDTH + spawnRegion * 2) -
            spawnRegion
          elem.y = -spawnRegion
          // destination
          pos = [elem.x, elem.y]
          if (elem.x <= BORDER) {
            minAngle = angleBetween(pos, corner.bottomLeft)
            maxAngle = angleBetween(pos, corner.topRight)
          } else if (elem.x >= WIDTH - BORDER) {
            minAngle = angleBetween(pos, corner.topLeft)
            maxAngle = angleBetween(pos, corner.bottomRight)
          } else {
            minAngle = angleBetween(pos, corner.topLeft)
            maxAngle = angleBetween(pos, corner.topRight)
          }
          elem.angle = randomAngle(minAngle, maxAngle)

        // // NOTE: For debug, makes everything spawn inside the viewframe
        // elem.x = range(elem.x, [-spawnRegion, WIDTH + spawnRegion],
        //   [BORDER, WIDTH - BORDER])
        // elem.y = BORDER
        }

        function rightSide (elem) {
          // origin
          elem.x = WIDTH + spawnRegion
          elem.y = Math.random() * (HEIGHT + spawnRegion * 2) -
            spawnRegion
          // destination
          pos = [elem.x, elem.y]
          if (elem.y <= BORDER) {
            minAngle = angleBetween(pos, corner.topLeft)
            maxAngle = angleBetween(pos, corner.bottomRight)
          } else if (elem.y >= HEIGHT - BORDER) {
            minAngle = angleBetween(pos, corner.topRight)
            maxAngle = angleBetween(pos, corner.bottomLeft)
          } else {
            minAngle = angleBetween(pos, corner.topLeft)
            maxAngle = angleBetween(pos, corner.bottomLeft)
          }
          elem.angle = randomAngle(minAngle, maxAngle)
          // console.log(elem.angle, elem.angle % (2 * Math.PI))

        // // NOTE: For debug, makes everything spawn inside the viewframe
        // elem.x = WIDTH - BORDER
        // elem.y = range(elem.y, [-spawnRegion, HEIGHT + spawnRegion],
        //   [BORDER, HEIGHT - BORDER])
        }

        function bottomSide (elem) {
          // origin
          elem.x = Math.random() * (WIDTH + spawnRegion * 2) -
            spawnRegion
          elem.y = HEIGHT + spawnRegion
          // destination
          pos = [elem.x, elem.y]
          if (elem.x <= BORDER) {
            minAngle = angleBetween(pos, corner.bottomRight)
            maxAngle = angleBetween(pos, corner.topLeft)
          } else if (elem.x >= WIDTH - BORDER) {
            minAngle = angleBetween(pos, corner.topRight)
            maxAngle = angleBetween(pos, corner.bottomLeft)
          } else {
            minAngle = angleBetween(pos, corner.bottomRight)
            maxAngle = angleBetween(pos, corner.bottomLeft)
          }
          elem.angle = randomAngle(minAngle, maxAngle)

        // // NOTE: For debug, makes everything spawn inside the viewframe
        // elem.x = range(elem.x, [-spawnRegion, WIDTH + spawnRegion],
        //   [BORDER, WIDTH - BORDER])
        // elem.y = HEIGHT - BORDER
        }

        function leftSide (elem) {
          // origin
          elem.x = -spawnRegion
          elem.y = Math.random() * (HEIGHT + spawnRegion * 2) -
            spawnRegion
          // destination
          pos = [elem.x, elem.y]
          if (elem.y <= BORDER) {
            minAngle = angleBetween(pos, corner.bottomLeft)
            maxAngle = angleBetween(pos, corner.topRight)
          } else if (elem.y >= HEIGHT - BORDER) {
            minAngle = angleBetween(pos, corner.bottomRight)
            maxAngle = angleBetween(pos, corner.topLeft)
          } else {
            minAngle = angleBetween(pos, corner.bottomLeft)
            maxAngle = angleBetween(pos, corner.topLeft)
          }
          elem.angle = randomAngle(minAngle, maxAngle)

        // // NOTE: For debug, makes everything spawn inside the viewframe
        // elem.x = BORDER
        // elem.y = range(elem.y, [-spawnRegion, HEIGHT + spawnRegion],
        //   [BORDER, HEIGHT - BORDER])
        }

        var spawnRegion = SPAWN_BORDER * 3 / 4
        var minAngle
        var maxAngle
        var pos
        var corner = {
          'topLeft': [BORDER, BORDER],
          'topRight': [WIDTH - BORDER, BORDER],
          'bottomLeft': [BORDER, HEIGHT - BORDER],
          'bottomRight': [WIDTH - BORDER, HEIGHT - BORDER]
        }
        switch (elem.type) {
          case 'White':
            // origin
            var side = Math.floor(Math.random() * 4)
            switch (side) {
              case 0:
                topSide(elem)
                break
              case 1:
                rightSide(elem)
                break
              case 2:
                bottomSide(elem)
                break
              case 3:
                leftSide(elem)
                break
              default:
                throw {
                  name: 'unknown side',
                  value: side
                }
            }
            break
          case 'Cyan':
            break
        }
      }

      if (!shouldSpawn(this)) {
        return []
      }
      // reset spawner counter
      var maxTimeLimit = scale(this._dt / this._gameEnd, [0, 1], [100, 4])
      this._spawnFrame = this._dt + scale(Math.random(), [0, 1], [4, maxTimeLimit])
      console.log('next spawn', this._spawnFrame - this._dt, 'dt', this._dt, 'of', this._dt / this._gameEnd)
      var spawns = pickTypes(this)
      spawns.forEach(pickSide)
      return spawns
    },
    _spawn: function (frame) {
      frame.forEach(function (elem) {
        // TODO: Add more Tachyon types here too
        // console.log(elem)
        switch (elem.type) {
          case 'White':
            Crafty.e('WhiteTachyon')
              .whiteTachyon(elem.id, elem.x, elem.y, elem.angle, elem.speed)
            break
          case 'Cyan':
            Crafty.e('CyanTachyon')
              .cyanTachyon(elem.x, elem.y, elem.w, elem.angle, elem.speed)
        }
      })
    },
    spawner: function (gameEnd) {
      this._gameEnd = gameEnd
      return this
    },
    reset: function () {
      this._dt = 0
      this.unbind('EnterFrame')
      return this
    },
    start: function () {
      this.bind('EnterFrame', this._enterFrame)
      return this
    }
  })
}
