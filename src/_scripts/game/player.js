function scale (val, from, to) {
  return (val - from[0]) * (to[1] - to[0]) / (from[1] - from[0]) + to[0]
}

module.exports = function (Crafty, WIDTH, HEIGHT, MAX_SPEED, BORDER) {
  const MAX_DISTANCE = 100
  const MAX_SCORE = 1000000 / Crafty.timer.FPS()

  let normalColor = {
    // #077CBE
    r: 7,
    g: 124,
    b: 190
  }

  let energizedColor = {
    // rgb(158, 217, 49)
    r: 158,
    g: 217,
    b: 49
  }

  function setColor (color) {
    this.color(`rgb(${color.r}, ${color.g}, ${color.b})`)
  }

  function blendColours (step, colorFrom, colorTo) {
    let result = {
      r: Math.round(scale(step, [0, 1], [colorFrom.r, colorTo.r])),
      g: Math.round(scale(step, [0, 1], [colorFrom.g, colorTo.g])),
      b: Math.round(scale(step, [0, 1], [colorFrom.b, colorTo.b]))
    }
    this.color(`rgb(${result.r}, ${result.g}, ${result.b})`)
  }

  Crafty.c('PointerWay', {
    init: function () {
      let _this = this
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
      let oldPos = {
        x: this._x,
        y: this._y
      }
      let movX = this._mouseMovement.x
      let movY = this._mouseMovement.y
      this._mouseMovement.x = this._mouseMovement.y = 0
      let movAbs = Math.hypot(movX, movY)
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
      setColor.call(this, normalColor)
      // FIXME: Fourway makes diagonals OP
      this.fourway(MAX_SPEED * 3 / 4)
      var die = function () {
        let info = this._info()
        // no reset, we ded
        Crafty.trigger('PlayerKill', info)
      }
      this.onHit('Active', die)
      // NOTE: WhiteTachyons reset, others.... gameover?
      this.onHit('Deadly', die)
      this.onHit('Energized', function (hitInfo) {
        let info = this._info(hitInfo)
        // HACK: Just to avoid some extra hits on the newly created Ghost
        hitInfo[0].obj.destroy()
        this._reset()
        Crafty.trigger('PlayerScratch', info)
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

      // game loop logic
      this.bind('StartLoop', function () {
        this.one('ExitFrame', this._recordFirstFrame)
        this.bind('ExitFrame', this._record)
        this.bind('ExitFrame', this._score)
      })
      this.bind('EndLoop', function () {
        this.unbind('ExitFrame')
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
    _info: function (hitInfo) {
      return {
        score: this.score,
        // only account the first, as that'll be the one that killed us
        tachId: hitInfo && hitInfo[0].obj.id,
        firstFrame: this._firstFrame,
        previousFrames: this._previousFrames
      }
    },
    _score: function () {
      // get min distance
      let min = []
      let _this = this
      Crafty('Energized').each(function () {
        // TODO: Consider centers, not origin (offside to the top left) (done?)
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
      let score = MAX_DISTANCE - min
      score *= score
      score = scale(score, [0, Math.pow(MAX_DISTANCE, 2)], [0, MAX_SCORE])
      if (score !== 0) {
        blendColours.call(this, score / MAX_SCORE, normalColor, energizedColor)
        this.score += score
        Crafty.trigger('NewScore', this.score)
      // Crafty.trigger('NewScore', score)
      } else {
        setColor.call(this, normalColor)
      }
    },
    // ## Recording location
    _recordFirstFrame: function (frame) {
      this._firstFrame = frame.frame
    },
     _record: function (frame) {
      this._previousFrames[frame.frame] = {
        // dt: frame.dt,
        x: this.x,
        y: this.y
      }
    },
    _reset: function () {
      this._firstFrame = 0
      this._previousFrames = []
      // FIXME: Make this an attribute so you can trigger NewScore automatically
      this.score = 0
      Crafty.trigger('NewScore', this.score)
      setColor.call(this, normalColor)
    },
    enableKeyboard: function () {
      this.removeComponent('PointerWay')
      this.enableControl()
    },
    enableMouse: function () {
      // only disables Fourway
      let _this = this
      this.disableControl()
      setTimeout(function () {
        _this.addComponent('PointerWay')
          .pointerway(MAX_SPEED)
          .callback(_this._collision)
      }, 50)
    }
  })
}
