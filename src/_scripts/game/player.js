function scale (val, from, to) {
  return (val - from[0]) / (from[1] - from[0]) * (to[1] - to[0]) + to[0]
}

var MAX_DISTANCE = 100
var MAX_SCORE = 50

module.exports = function (Crafty, WIDTH, HEIGHT, MAX_SPEED, BORDER) {
  Crafty.c('PointerWay', {
    init: function () {
      var _this = this
      this._mouseMovement = {
        x: 0,
        y: 0
      }
      this._mouseSpeed = 0
      this._mouseMoveAtPointerLock = function (mouseEvent) {
        _this._mouseMovement.x += mouseEvent.movementX
        _this._mouseMovement.y += mouseEvent.movementY
      }
      Crafty.addEvent(Crafty.stage.elem, Crafty.stage.elem, 'mousemove',
        this._mouseMoveAtPointerLock)
    },
    pointerway: function (speed) {
      this.speed(speed)
      this.bind('EnterFrame', this._enterFrame)
      return this
    },
    remove: function () {
      this.unbind('EnterFrame', this._enterFrame)
      Crafty.removeEvent(Crafty.stage.elem, Crafty.stage.elem, 'mousemove',
        this._mouseMoveAtPointerLock)
    },
    _enterFrame: function () {
      var oldPos = {
        x: this._x,
        y: this._y
      }
      var movX = this._mouseMovement.x
      var movY = this._mouseMovement.y
      this._mouseMovement.x = this._mouseMovement.y = 0
      var movAbs = Math.hypot(movX, movY)
      // HACK: this._speed isn't coeherent with the movement (sin/cos vs absolute)
      if (movAbs > this._speed.x) {
        movX = this._speed.x * (movX / movAbs)
        movY = this._speed.x * (movY / movAbs)
      }
      this.x += movX
      this.y += movY

      if (this.x !== oldPos.x && this.y !== oldPos.y) {
        this.trigger('Moved', oldPos)
      }

      if (this._callback) {
        this._callback()
      }
    },

    callback: function (f) {
      console.log('registering callback', this, f)
      if (typeof f === 'function') {
        this._callback = f.bind(this)
      }

      return this
    },

    speed: function (speed) {
      if (speed.x !== undefined && speed.y !== undefined) {
        this._speed.x = speed.x
        this._speed.y = speed.y
      } else {
        this._speed.x = speed
        this._speed.y = speed
      }
      return this
    }
  })

  Crafty.c('Player', {
    init: function () {
      this.requires('Quark, Fourway, Persist')
      this._previousFrames = []
      this.z = 1000
      this.color('rgb(7, 124, 190)')
      // FIXME: Fourway makes diagonals OP
      this.fourway(MAX_SPEED * 3 / 4)
      this.onHit('Active', function () {
        Crafty.trigger('Hit', this.score)
        Crafty.scene('GameOver')
      })
      this.onHit('Tachyon', function (hitInfo) {
        Crafty.trigger('Hit', this.score)
        this.score = 0
        Crafty.trigger('NewScore', this.score)
        this._tachId = hitInfo[0].obj.id
        hitInfo.forEach(function (elem) {
          elem.obj.destroy()
        })
        Crafty.scene('Scratch')
      })
      this.score = 0
      Crafty.trigger('NewScore', this.score)

      // HACK: adding collision detection to keyboard controls
      this.unbind('EnterFrame', this._enterframe)
      this.bind('EnterFrame', function () {
        this._enterframe()
        if (!this.disableControls) {
          this._collision()
        }
      })

      this.bind('StartLoop', function () {
        this.bind('ExitFrame', this._score)
      })
      this.bind('EndLoop', function () {
        this.unbind('ExitFrame', this._score)
      })
    },
    _collision: function () {
      if (this._x < BORDER) {
        this.x = BORDER
      } else if (this._x > WIDTH - this.w - BORDER) {
        this.x = WIDTH - this.w - BORDER
      }

      if (this._y < BORDER) {
        this.y = BORDER
      } else if (this._y > HEIGHT - this.h - BORDER) {
        this.y = HEIGHT - this.h - BORDER
      }
    },
    _score: function () {
      // get min distance
      var min = []
      var _this = this
      Crafty('WhiteTachyon').each(function () {
        // TODO: Consider centers, not origin (offside to the top left)
        min.push(Math.hypot(
            _this.x + _this.w / 2 - this.x - this.w / 2,
            _this.y + _this.h / 2 - this.y - this.h / 2
          ) - _this.w - this.w)
      })
      min = min.reduce(function (prev, cur) {
        return Math.min(prev, cur)
      }, +Infinity)
      if (min > MAX_DISTANCE) {
        return
      }
      min = min < 0 ? 0 : min
      // turn it into a cumulative score
      // TODO: make it cummulative
      var score = MAX_DISTANCE - min
      score *= score
      score = scale(score, [0, MAX_DISTANCE * MAX_DISTANCE], [0, MAX_SCORE])
      if (score !== 0) {
        this.score += score
        Crafty.trigger('NewScore', this.score)
      // Crafty.trigger('NewScore', score)
      }
    },
    enableKeyboard: function () {
      this.removeComponent('PointerWay')
      this.enableControl()
    },
    enableMouse: function () {
      // only disables Fourway
      var _this = this
      this.disableControl()
      setTimeout(function () {
        _this.addComponent('PointerWay')
          .pointerway(MAX_SPEED)
          .callback(_this._collision)
      }, 50)
    }
  })
}
