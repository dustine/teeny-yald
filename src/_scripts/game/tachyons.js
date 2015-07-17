module.exports = function (Crafty, WIDTH, HEIGHT, BORDER, SPAWN_BORDER, SIZE) {
  Crafty.c('Tachyon', {
    init () {
      this.requires('2D, DOM, Color, Tween, Collision')
      this.attr({w: SIZE, h: SIZE, alpha: 0})
      this.z = 300
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
      Crafty('Spawner').get(0).count[this.type]++
      this.color(type)
      // TODO: Make fade-in(/out) time a constant
      this.tween({alpha: 1}, 2000)
      this.addComponent(type + 'Tachyon')
      return this
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
    },
    _enterFrame () {
      // remove far-gone particles
      if (this._x < -SPAWN_BORDER) {
        this.destroy()
        return
      }
      if (this._x > WIDTH - this.w + SPAWN_BORDER) {
        this.destroy()
        return
      }
      if (this._y < -SPAWN_BORDER) {
        this.destroy()
        return
      }
      if (this._y > HEIGHT - this.h + SPAWN_BORDER) {
        this.destroy()
        return
      }

      // move the rest
      this.x += this._movement.x
      this.y += this._movement.y
    },
    whiteTachyon ({x: x, y: y, angle: angle, speed: speed, id: id}) {
      this.id = id
      this._angle = angle
      this._speed = speed
      this.x = x - Math.round(SIZE / 2)
      this.y = y - Math.round(SIZE / 2)
      this._movement.x = Math.cos(angle) * speed
      // NOTE: y axis is flipped
      this._movement.y = -Math.sin(angle) * speed
      this.origin('center')
      this.rotation = (Math.PI - angle) * (180 / Math.PI)
      this.one('TweenEnd', function () {
        this.addComponent('Energized')
        this.bind('EnterFrame', this._enterFrame)
      })
      return this
    }
  })

  // TODO: Get the common code between moving tachyons into a separate component
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
          this.w += this._speed
          if (this._w >= this.maxSize) {
            this.w = this.maxSize
            this.state = 'Pause'
            this.x += Math.cos(this._angle) * (this._w - this.minSize)
            this.y -= Math.sin(this._angle) * (this._w - this.minSize)
            this.rotation += 180
            this.delay(function () {
              this.state = 'Shrinking'
            }, 2000)
            // this.flip('X')
          }
          break
        case 'Shrinking':
          this.w -= this._speed
          if (this._w <= this.minSize) {
            this.unbind('EnterFrame', this._enterFrame)
            this.removeComponent('Deadly')
            this.one('TweenEnd', function () {
              this.destroy()
            })
            this.tween({alpha: 0}, 2000)
          }
          break
      }
    },
    cyanTachyon ({x: x, y: y, angle: angle, speed: speed, maxSize: maxSize}) {
      this.maxSize = maxSize + this._w
      this._angle = angle
      this._speed = speed
      this.x = x - Math.round(SIZE / 2)
      this.y = y - Math.round(SIZE / 2)
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
