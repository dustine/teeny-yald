function scale (val, from, to) {
  return (val - from[0]) * (to[1] - to[0]) / (from[1] - from[0]) + to[0]
}

function angleBetween (origin, dest) {
  // y axis is flipped
  return Math.atan2(-(dest[1] - origin[1]), dest[0] - origin[0])
}

function randomAngle (min, max) {
  if (min > max) {
    max += 2 * Math.PI
    let result = Math.random() * (max - min) + min
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
      this.count = {
        'White': 0,
        'Cyan': 0
      }
      this.bind('EndLoop', function () {
        this.reset()
      })
    // this.requires('2D, Persist')
    },
    _enterFrame: function () {
      // console.log(this.count)
      if (!this._frames[this._dt]) {
        this._frames[this._dt] = this._generate()
      }
      this._spawn(this._frames[this._dt++])
    },
    _generate: function () {
      // TODO: Regulate the Tachyon spawning to worsen as the game goes on
      // TODO: More kinds of Tachyons
      let spawnBorder = BORDER / 2
      function shouldSpawn (_this) {
        return _this._dt >= _this._spawnFrame
      }
      function pickTypes (_this) {
        let spawns = []
        let randomMax = Math.random() * 5 + 1
        for (let i = 0; i < randomMax; i++) {
          let id = _this._tachId++
          spawns.push({
            type: 'Cyan',
            id: id,
            // maxSize: 500,
            speed: scale(Math.random(), [0, 1], [1, 1])
          })
        }
        return spawns
      }
      function pickSide (elem) {
        // TODO: Instead of random angle, use random side to random edge point
        // Per example, from the *left* side you pick a point in any edge,
        //  that isn't the *left* edge, and then calculate the angle between
        //  those, which is trivially easy with atan2 (just don't forget to
        //  negate the y axis)
        function topSide (elem) {
          // origin
          elem.x = Math.random() * (WIDTH - (BORDER - spawnBorder) * 2) + (BORDER - spawnBorder)
          elem.y = spawnBorder
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

          // TODO: Redo all these
          // For debug, makes everything spawn inside the viewframe
          // elem.x = range(elem.x, [-spawnRegion, WIDTH + spawnRegion],
          //   [BORDER, WIDTH - BORDER])
          // elem.y = BORDER
        }

        function topEdge (elem) {
          // origin
          elem.x = Math.random() * (WIDTH - BORDER * 2) + BORDER
          elem.y = spawnBorder
          // destination
          pos = [elem.x, elem.y]
          minAngle = angleBetween(pos, corner.topLeft)
          maxAngle = angleBetween(pos, corner.topRight)
          elem.angle = randomAngle(minAngle, maxAngle)
        }

        function rightSide (elem) {
          // origin
          elem.x = WIDTH - spawnBorder
          elem.y = Math.random() * (HEIGHT - (BORDER - spawnBorder) * 2) + (BORDER - spawnBorder)
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
        }

        function rightEdge (elem) {
          // origin
          elem.x = WIDTH - spawnBorder
          elem.y = Math.random() * (HEIGHT - BORDER * 2) + BORDER
          // destination
          pos = [elem.x, elem.y]
          minAngle = angleBetween(pos, corner.topLeft)
          maxAngle = angleBetween(pos, corner.bottomLeft)
          elem.angle = randomAngle(minAngle, maxAngle)
        }

        function bottomSide (elem) {
          // origin
          elem.x = Math.random() * (WIDTH - (BORDER - spawnBorder) * 2) + (BORDER - spawnBorder)
          elem.y = HEIGHT - spawnBorder
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
        }

        function bottomEdge (elem) {
          // origin
          elem.x = Math.random() * (WIDTH - BORDER * 2) + BORDER
          elem.y = HEIGHT - spawnBorder
          // destination
          pos = [elem.x, elem.y]
          minAngle = angleBetween(pos, corner.bottomRight)
          maxAngle = angleBetween(pos, corner.bottomLeft)
          elem.angle = randomAngle(minAngle, maxAngle)
        }

        function leftSide (elem) {
          // origin
          elem.x = BORDER / 2
          elem.y = Math.random() * (HEIGHT - (BORDER - spawnBorder) * 2) + (BORDER - spawnBorder)
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
        }

        function leftEdge (elem) {
          // origin
          elem.x = spawnBorder
          elem.y = Math.random() * (HEIGHT - BORDER * 2) + BORDER
          // destination
          pos = [elem.x, elem.y]
          minAngle = angleBetween(pos, corner.bottomLeft)
          maxAngle = angleBetween(pos, corner.topLeft)
          elem.angle = randomAngle(minAngle, maxAngle)
        }

        let minAngle
        let maxAngle
        let pos
        let corner = {
          'topLeft': [BORDER, BORDER],
          'topRight': [WIDTH - BORDER, BORDER],
          'bottomLeft': [BORDER, HEIGHT - BORDER],
          'bottomRight': [WIDTH - BORDER, HEIGHT - BORDER]
        }
        switch (elem.type) {
          case 'White':
            // origin
            let side = Math.random()
            const spawningWidth = WIDTH + BORDER
            const spawningHeight = HEIGHT + BORDER
            let spawnPerimeter = spawningHeight * 2 + spawningWidth * 2
            if (side < spawningWidth / spawnPerimeter) {
              topSide(elem)
            } else if (side < (spawningWidth + spawningHeight) / spawnPerimeter) {
              rightSide(elem)
            } else if (side < (spawningWidth * 2 + spawningHeight) / spawnPerimeter) {
              bottomSide(elem)
            } else if (side < 1) {
              leftSide(elem)
            } else {
              throw {
                name: 'unknown side',
                value: side
              }
            }
            break
          case 'Cyan':
            // let edge = Math.random()
            let perimeter = WIDTH * 2 + HEIGHT * 2
            let edge = WIDTH / perimeter
            if (edge < WIDTH / perimeter) {
              topEdge(elem)
              if (elem.angle < -Math.PI / 2) {
                // left edge
                let w1 = -(elem.x - corner.topLeft[0] + spawnBorder) / Math.cos(elem.angle)
                // bottom edge
                let w2 = -(HEIGHT - spawnBorder * 2) / Math.sin(elem.angle)
                elem.maxSize = Math.min(w1, w2)
              } else {
                // bottom edge
                let w2 = -(HEIGHT - spawnBorder * 2) / Math.sin(elem.angle)
                // right edge
                let w3 = -(elem.x - corner.topRight[0] - spawnBorder) / Math.cos(elem.angle)
                elem.maxSize = Math.min(w2, w3)
              }
            } else if (edge < (WIDTH + HEIGHT) / perimeter) {
              rightEdge(elem)
              if (elem.angle > 0) {
                // top edge
                let w1 = (elem.y - corner.topRight[1] - spawnBorder) / Math.sin(elem.angle)
                // left edge
                let w2 = -(WIDTH - spawnBorder * 2) / Math.cos(elem.angle)
                console.log(w1, w2)
                elem.maxSize = Math.min(w1, w2)
              } else {
                // left edge
                let w2 = -(WIDTH - spawnBorder * 2) / Math.cos(elem.angle)
                // bottom edge
                let w3 = (elem.y - corner.bottomRight[1] + spawnBorder) / Math.sin(elem.angle)
                elem.maxSize = Math.min(w2, w3)
              }
            } else if (edge < (WIDTH * 2 + HEIGHT) / perimeter) {
              bottomEdge(elem)
            } else if (edge < 1) {
              leftEdge(elem)
            } else {
              throw {
                name: 'unknown edge',
                value: edge
              }
            }
            // console.log(elem.x, elem.y, edge)

            break
        }
      }

      if (!shouldSpawn(this)) {
        return []
      }
      // reset spawner counter
      let maxTimeLimit = scale(this._dt / this._gameEnd, [0, 1], [100, 20])
      this._spawnFrame = this._dt + scale(Math.random(), [0, 1], [maxTimeLimit - 10, maxTimeLimit])
      // console.log('next spawn', this._spawnFrame - this._dt, 'dt', this._dt, 'of', this._dt / this._gameEnd)
      // console.log('maxTimeLimit', maxTimeLimit, 'of', this._dt / this._gameEnd)
      let spawns = pickTypes(this)
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
              .whiteTachyon(elem.x, elem.y, elem.angle, elem.speed, elem.id)
            break
          case 'Cyan':
            Crafty.e('CyanTachyon')
              .cyanTachyon(elem.x, elem.y, elem.angle, elem.speed, elem.maxSize)
            break
        }

      })
      // console.log('whiteTachyons', Crafty('WhiteTachyon').length)
    },
    spawner: function (gameEnd) {
      this._gameEnd = gameEnd * Crafty.timer.FPS()
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
