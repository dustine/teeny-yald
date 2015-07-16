/* eslint-env node */

module.exports = function (Crafty) {
  Crafty.c('Ghost', {
    _f: 0,
    init: function () {
      this.requires('Quark, Persist, Tween')
      this.color('grey')
      this.bind('StartLoop', this.start)
      this.bind('EndLoop', this.reset)
      this.bind('PlaybackEnd', this._playbackEnd)
      // this.bind('TweenEnd', function() {
      //   console.log('end tween')
      // })
      this._tachId = 0
      this.z = 100
    },
    _init: function () {
      // this.cancelTween('alpha')
      this._f = this._firstFrame
      this.attr({
        x: this._previousFrames[this._firstFrame].x,
        y: this._previousFrames[this._firstFrame].y,
        z: 100,
        alpha: 1
      })
    },
    _playbackEnd: function () {
      // TODO: Separate Active logic from Ghost
      this.color('rgb(117, 27, 192)')
      this.z = 150
      this.removeComponent('Active')
      this.tween({alpha: 0}, 200)
    },
    Ghost: function (tachId, firstFrame, previousFrames) {
      this._firstFrame = firstFrame
      this._previousFrames = previousFrames
      this._tachId = tachId
      this._init()
    },
    reset: function () {
      this.removeComponent('Active')
      this.color('grey')
      this.cancelTween('alpha')
      this.alpha = 1.0
      this._init()
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
      this.bind('EnterFrame', this._enterFrame)
      // this.one('EndPlayback', this._endRecording)
      this.z = 500
    },
    remove: function () {
      // NOTE: onHit adds the Tachyon thing to EnterFrame
      this.unbind('EnterFrame', this._enterFrame)
      this.ignoreHits('Tachyon')
    },
    _enterFrame: function () {
      var data = this.hit('Tachyon')
      if (data) {
        this._removeStray(data, 'prev')
      }
      if (this._f >= this._previousFrames.length) {
        this.trigger('PlaybackEnd')
        return
      }
      var pos = this._previousFrames[this._f++]
      this.x = pos.x
      this.y = pos.y
      data = this.hit('Tachyon')
      if (data) {
        this._removeStray(data, 'post')
      }
    },
    _removeStray: function (data, text) {
      var _this = this
      console.log(data)
      data.forEach(function (elem) {
        // TODO: Check for paradoxes
        console.log(text, elem.obj.id, _this._tachId)
        elem.obj.destroy()
      })
    }
  })
}
