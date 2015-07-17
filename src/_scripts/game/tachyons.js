module.exports = function (Crafty, WIDTH, HEIGHT, BORDER, SPAWN_BORDER, SIZE) {
  Crafty.c('Tachyon', {
    init: function () {
      this.requires('2D, DOM, Color, Tween, Collision')
      this.attr({w: SIZE, h: SIZE, alpha: 0})
      this.z = 300
      // TODO: Make fade-in(/out) time a constant
      this.tween({alpha: 1}, 2000)
    },
    remove: function () {
      let spawner = Crafty('Spawner').get(0)
      if (spawner && this.type) {
        spawner.count[this.type]--
      }
    }
  })

  Crafty.c('WhiteTachyon', {
    _angle: 0,
    _speed: 0,

    init: function () {
      this.requires('Tachyon')
      this.type = 'White'
      this._movement = {
        x: 0,
        y: 0
      }
      this.color(this.type)
    },
    _enterFrame: function () {
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
    whiteTachyon: function (x, y, angle, speed, id) {
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
  //  make use of the fact we have Babel and use Destructuring, and on the
  //  spawner too
  Crafty.c('CyanTachyon', {
    _angle: 0,
    _speed: 0,

    init: function () {
      this.requires('Tachyon, Delay')
      // this.addComponent('WiredHitBox')
      this.minSize = this._w
      this.state = 'Growing'
      this.type = 'Cyan'
      Crafty('Spawner').get(0).count[this.type]++
      this._movement = {
        x: 0,
        y: 0
      }
      this.color(this.type)
    },
    _enterFrame: function () {
      // remove far-gone particles
      // if (this._x < -SPAWN_BORDER) {
      //   this.destroy()
      //   return
      // }
      // if (this._x > WIDTH - this.w + SPAWN_BORDER) {
      //   this.destroy()
      //   return
      // }
      // if (this._y < -SPAWN_BORDER) {
      //   this.destroy()
      //   return
      // }
      // if (this._y > HEIGHT - this.h + SPAWN_BORDER) {
      //   this.destroy()
      //   return
      // }
      switch (this.state) {
        case 'Growing':
          this.w += this._speed
          if (this._w + this.minSize >= this.maxSize) {
            this.w = this.maxSize
            this.state = 'Pause'
            // this.origin('center')
            this.x += Math.cos(this._angle) * (this._w - this.minSize)
            this.y -= Math.sin(this._angle) * (this._w - this.minSize)
            this.rotation += 180
            this.delay(function () {
              this.state = 'Shrinking'
            }, 2000)
            // NOTE: y axis is flipped
            // this._movement.y = -Math.sin(angle) * speed
            // this.one('EnterFrame', function () {
            //   // this.origin('center')
            //   // this.flip('X')
            //   // this.flip('y')
            //   this.rotation += 180
            // })
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

      // move the rest
      // this.x += this._movement.x
      // this.y += this._movement.y
    },
    cyanTachyon: function (x, y, angle, speed, maxSize) {
      this.maxSize = maxSize
      this._angle = angle
      this._speed = speed
      this.x = x - Math.round(SIZE / 2)
      this.y = y - Math.round(SIZE / 2)
      // this._movement.x = Math.cos(angle) * speed
      // NOTE: y axis is flipped
      // this._movement.y = -Math.sin(angle) * speed
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
