/* eslint-env node */
'use strict'

module.exports = function (Crafty, {SCRATCH_LENGTH: SCRATCH_LENGTH}) {
  Crafty.c('Ghost', {
    frame: 0,
    init: function () {
      this.requires('Quark, Persist, Tween')
      this.color('grey')
      this.bind('StartLoop', this.start)
      this.bind('EndLoop', this.reset)
      this.bind('PlaybackEnd', this._playbackEnd)
      // this.bind('TweenEnd', function () {
      //   console.log('end tween')
      // })
      this.frame = 0
      this.tachId = 0
      this.z = 100
    },
    _init: function () {
      this.frame = 0
      this.attr({
        x: this.frames[this.frame].x,
        y: this.frames[this.frame].y,
        z: 100,
        alpha: 0
      })
    },
    _playbackEnd: function () {
      // TODO: Separate Active logic from Ghost
      let ghost = this
      Crafty('Energized').each(function () {
        if (this.id === ghost.tachId) {
          this.destroy()
        }
      })
      this.color('rgb(117, 27, 192)')
      this.z = 150
      this.removeComponent('Active')
      this.tween({alpha: 0}, 200)
    },
    Ghost: function (tachId, frames, score) {
      this.tachId = tachId
      // this._firstFrame = firstFrame
      this.frames = frames
      this.score = score
      this._init()
    },
    reset: function () {
      if (this.__c['Active']) {
        this.removeComponent('Active')
      }
      this.color('grey')
      this._init()
      this.cancelTween('alpha')
      this.tween({alpha: 1}, SCRATCH_LENGTH)
    },
    start: function () {
      this.addComponent('Active')
    }
  })

  Crafty.c('Active', {
    init: function () {
      this.requires('Ghost')
      this.color('red')
      // this.color('rgb(209, 210, 167)')
      this.bind('EnterFrame', this._playRecording)
      this.z = 500
    },
    remove: function () {
      // onHit adds the Tachyon thing to EnterFrame
      this.unbind('EnterFrame', this._playRecording)
    },
    _playRecording: function () {
      if (this.frame >= this.frames.length) {
        this.trigger('PlaybackEnd')
        return
      }
      let pos = this.frames[this.frame++]
      this.x = pos.x
      this.y = pos.y
    }
  })
}
