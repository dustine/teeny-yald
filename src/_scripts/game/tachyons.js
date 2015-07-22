'use strict'

// function scale (val, from, to) {
//   return (val - from[0]) * (to[1] - to[0]) / (from[1] - from[0]) + to[0]
// }

module.exports = function (Crafty,
  {WIDTH: WIDTH, HEIGHT: HEIGHT, BORDER: BORDER, SPAWN_BORDER: SPAWN_BORDER,
    DESPAWN_BORDER: DESPAWN_BORDER, TACHYON_SIZE: SIZE}) {
  // const FPS = Crafty.timer.FPS()
  const FADE_TIME = 2000

  Crafty.c('Tachyon', {
    init () {
      this.requires('2D, DOM, Color, Tween, Collision')
      this.attr({w: SIZE, h: SIZE, alpha: 0})
      this.z = 400
    },
    remove () {
      // NOTE: Paranoid code (assumes spawner may be gone or type was never declared)
      let spawner = Crafty('Spawner').get(0)
      if (spawner && this.type) {
        spawner.count[this.type]--
      }
    },
    type (type) {
      type = type[0].toUpperCase() + type.substr(1, type.length - 1).toLowerCase()
      this.type = type
      // Crafty('Spawner').get(0).count[this.type]++
      this.color(type)
      this.tween({alpha: 1}, FADE_TIME)
      this.addComponent(type + 'Tachyon')
      return this
    }
  })

  // XXX: Debug code
  Crafty.c('DebugTachyon', {
    init () {
      this.requires('Tachyon')
      this.cancelTween('alpha')
      this.alpha = 0.5
    },
    _init ({origin: origin, angle: angle, color: color}) {
      this._angle = angle
      // this.color('white')
      this.color(color || '#00ff00')
      this.x = origin.x - Math.round(SIZE / 2)
      this.y = origin.y - Math.round(SIZE / 2)
      this.origin('center')
      this.rotation = (Math.PI - angle) * (180 / Math.PI)
      return this
    },
    debugTachyon ({origin: origin, dest: dest, angle: angle, color: color, childColor: childColor}) {
      var child = Crafty.e('Tachyon')
        .type('Debug')
        ._init({
          origin: dest,
          angle,
          color: childColor || '#ffff00'
        })
      // this.attach(child)
      var parent = this._init({origin: origin, angle: angle, color: color})
      this.attach(child)
      return parent
    }
  })

  Crafty.c('WhiteTachyon', {
    _angle: 0,
    _speed: 0,
    init () {
      this.requires('Tachyon')
      this._movement = {
        x: 0,
        y: 0
      }
      this.z = 300
    },
    _enterFrame () {
      // remove far-gone particles
      if (this._x < -DESPAWN_BORDER) {
        this.destroy()
        return
      }
      if (this._x > WIDTH - this.w + DESPAWN_BORDER) {
        this.destroy()
        return
      }
      if (this._y < -DESPAWN_BORDER) {
        this.destroy()
        return
      }
      if (this._y > HEIGHT - this.h + DESPAWN_BORDER) {
        this.destroy()
        return
      }

      // move the rest
      this.x += this._movement.x
      this.y += this._movement.y
    },
    whiteTachyon ({origin: origin, angle: angle, speed: speed, id: id, paradoxy: paradoxy, immediateSpawn: immediateSpawn}) {
      this.id = id
      this._angle = angle
      this._speed = speed
      if (paradoxy) {
        this.addComponent('Paradoxy')
      }
      this.x = origin.x - Math.round(SIZE / 2)
      this.y = origin.y - Math.round(SIZE / 2)
      this._movement.x = Math.cos(angle) * speed
      // NOTE: y axis is flipped
      this._movement.y = -Math.sin(angle) * speed
      this.origin('center')
      this.rotation = (Math.PI - angle) * (180 / Math.PI)
      if (immediateSpawn) {
        this.cancelTween('alpha')
        this.alpha = 1
        this.addComponent('Energized')
        this.bind('EnterFrame', this._enterFrame)
      } else {
        this.one('TweenEnd', function () {
          this.addComponent('Energized')
          this.bind('EnterFrame', this._enterFrame)
        })
      }
      return this
    }
  })

  Crafty.c('Paradoxy', {
    init () {
      // console.log(this._speed, this._angle * 180 / Math.PI)
      let angle = Math.PI - (this._angle + Math.PI * 3 / 2)
      this.requires('Particles')
      this.particles({
        maxParticles: 100,
        size: SIZE * 4,
        sizeRandom: SIZE,
        speed: this._speed / 2,
        speedRandom: 1.2,
        // Lifespan in frames
        lifeSpan: 29,
        lifeSpanRandom: 7,
        // Angle is calculated clockwise: 12pm is 0deg, 3pm is 90deg etc.
        angle: angle * 180 / Math.PI || 0,
        angleRandom: 0,
        startColour: [128, 128, 128, 0.5],
        startColourRandom: [128, 128, 128, 0],
        endColour: [128, 128, 128, 0],
        endColourRandom: [64, 64, 64, 0],
        // Only applies when fastMode is off, specifies how sharp the gradients are drawn
        sharpness: 20,
        sharpnessRandom: 10,
        // Random spread from origin
        spread: 10,
        // How many frames should this last
        duration: -1,
        // Will draw squares instead of circle gradients
        fastMode: false,
        gravity: { x: 0, y: 0 },
        // sensible values are 0-3
        jitter: 0
      })
    }
  })

  Crafty.c('LimeTachyon', {
    _angle: 0,
    _speed: 0,

    init () {
      this.requires('Tachyon, Delay')
      this.attr({w: SIZE * 4, h: SIZE * 4})
      this._movement = {}
      this.state = 'Moving'
    },
    _enterFrame () {
      switch (this.state) {
        case 'Moving':
          // moving to spawning location
          this.dist += this._speed
          if (this.dist >= this.summonDist) {
            // this.w = this.maxSize
            this.state = 'Pause'
            this.delay(function () {
              this.state = 'Spawning'
              this.curTach = 0
              // always spawn the first child right away
              this.spawnFrame = +Infinity
            }, FADE_TIME / 2)
          }
          this.x += this._movement.x
          this.y += this._movement.y
          break

        case 'Spawning':
          // in spawning location
          if (this.curTach >= this.tachyons.length) {
            this.state = 'Fading'
            break
          }
          // rotate
          this.rotation += this._speed * this.summonSpeed
          // time the child spawning
          this.spawnFrame++
          if (this.spawnFrame < 5 * this.summonSpeed) break
          this.spawnFrame = 0
          // spawn the child
          let tachyon = this.tachyons[this.curTach++]
          Crafty.e('Tachyon')
            .type('White')
            .whiteTachyon({
              origin: {
                x: this._x + this._w / 2,
                y: this._y + this._h / 2
              },
              angle: tachyon.angle,
              speed: tachyon.speed,
              id: tachyon.id,
              paradoxy: tachyon.paradoxy,
              immediateSpawn: true
            })
          break

        case 'Fading':
          this.unbind('EnterFrame', this._enterFrame)
          this.removeComponent('Deadly')
          this.one('TweenEnd', function () {
            this.destroy()
          })
          this.tween({alpha: 0}, FADE_TIME / 2)
          break
      }
    },
    _spawn () {

    },
    limeTachyon ({origin: origin, dest: dest, angle: angle, speed: speed, summonDist: summonDist, summonSpeed: summonSpeed, tachyons: tachyons}) {
      this.dist = 0
      this.tachyons = tachyons
      // where to start spawning the white tachs
      this.summonDist = (Math.hypot(
        Math.abs(origin.y - dest.y),
        Math.abs(origin.x - dest.x)
      ) + this.w) * summonDist
      this.summonSpeed = summonSpeed
      this._angle = angle
      this._speed = speed
      this.x = origin.x - Math.round(SIZE / 2)
      this.y = origin.y - Math.round(SIZE / 2)
      this.origin('center')
      this._movement.x = Math.cos(angle) * speed
      // NOTE: y axis is flipped
      this._movement.y = -Math.sin(angle) * speed
      this.rotation = (Math.PI - angle) * (180 / Math.PI)
      this.one('TweenEnd', function () {
        this.addComponent('Deadly')
        this.bind('EnterFrame', this._enterFrame)
      })
      return this
    }
  })

  // TODO: Get more common code between moving tachyons into a separate component
  Crafty.c('CyanTachyon', {
    _angle: 0,
    _speed: 0,

    init () {
      this.requires('Tachyon, Delay')
      // this.addComponent('WiredHitBox')
      this.attr({w: SIZE * 3, h: SIZE * 3})
      this.minSize = this._w
      this.state = 'Growing'
    },
    _enterFrame () {
      switch (this.state) {
        case 'Growing':
          if (this._w + this._speed >= this.maxSize) {
            this.w = this.maxSize
            this.state = 'Pause'
            this.x += Math.cos(this._angle) * (this._w - this.minSize)
            this.y -= Math.sin(this._angle) * (this._w - this.minSize)
            this.rotation += 180
            this.delay(function () {
              this.state = 'Shrinking'
            }, FADE_TIME * 2)
            // this.flip('X')
          } else {
            this.w += this._speed
          }
          break
        case 'Shrinking':
          if (this._w - this._speed <= this.minSize) {
            this.w = this.minSize
            this.unbind('EnterFrame', this._enterFrame)
            this.removeComponent('Deadly')
            this.one('TweenEnd', function () {
              this.destroy()
            })
            this.tween({alpha: 0}, FADE_TIME / 2)
          } else {
            this.w -= this._speed
          }
          break
      }
    },
    cyanTachyon ({origin: origin, dest: dest, angle: angle, speed: speed}) {
      this.maxSize = Math.hypot(
        Math.abs(origin.y - dest.y) + SPAWN_BORDER,
        Math.abs(origin.x - dest.x) + SPAWN_BORDER
      ) + this.w
      this._angle = angle
      this._speed = speed
      this.x = origin.x - Math.round(SIZE / 2)
      this.y = origin.y - Math.round(SIZE / 2)
      this.origin('center')
      // the angle should be backwards so it grows inwards (moving backwards)
      this.rotation = -angle * (180 / Math.PI)
      this.one('TweenEnd', function () {
        this.addComponent('Deadly')
        this.bind('EnterFrame', this._enterFrame)
      })
      return this
    }
  })
}
