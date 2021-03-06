/* global Crafty */
'use strict'

import $ from 'jquery'

// FIXME: Don't keep debug on!
const DEBUG = false

// XXX: Get a library for this, for pete's sake
function formatTime (ms) {
  function cut (number, fraction) {
    number /= fraction
    return Math.floor(number)
  }
  // milliseconds
  let result = ' s'
  result = (ms % 1000).toFixed(0) + result
  while (result.length < 5) {
    result = '0' + result
  }
  result = '.' + result
  ms = cut(ms, 1000)
  // seconds
  result = ms % 60 + result
  if (ms < 60) {
    return result
  }
  while (result.length < 8) {
    result = '0' + result
  }
  result = ':' + result
  ms = cut(ms, 60)
  // minutes
  return ms + result
}

$(() => {
  require('./game/outsideFrame')

  // let $container = $('.timeline')
  // let display = $('.timeline > .display')[0]
  let hits = $('.timeline > .hits')[0]
  let progress = $('.timeline > .game-progress')[0]

  function resetTimebarHits () {
    let color = 'red'
    let context = hits.getContext('2d')
    // let x = Math.floor(hits.width * (current / total)) - 0.5
    context.clearRect(0, 0, hits.width, hits.height)
    runs.forEach((elem) => {
      context.beginPath()
      let x = Math.floor(hits.width * (elem.time / (GAME_LENGTH * 1000))) - 0.5
      console.log(x)
      let gradient = context.createLinearGradient(0, 0, 0, progress.height)
      gradient.addColorStop(0, 'rgb(121, 0, 0)')
      gradient.addColorStop(0.5, color)
      gradient.addColorStop(1, 'rgb(121, 0, 0)')
      context.strokeStyle = gradient
      context.lineWidth = 1
      context.moveTo(x, 0)
      context.lineTo(x, Math.round(hits.height * 0.75))
      context.stroke()
    })
  }

  function updateTimebarHits (current, total, color) {
    color = color || 'red'
    let context = hits.getContext('2d')
    let x = Math.floor(hits.width * (current / total)) - 0.5
    context.beginPath()
    let gradient = context.createLinearGradient(0, 0, 0, progress.height)
    gradient.addColorStop(0, 'rgb(121, 0, 0)')
    gradient.addColorStop(0.5, color)
    gradient.addColorStop(1, 'rgb(121, 0, 0)')
    context.strokeStyle = gradient
    context.lineWidth = 1
    context.moveTo(x, 0)
    context.lineTo(x, Math.round(hits.height * 0.75))
    context.stroke()
  }

  function updateTimebarProgress (current, total, color) {
    // update bar
    color = color || 'cyan'
    let context = progress.getContext('2d')
    context.clearRect(0, 0, progress.width, progress.height)
    let gradient = context.createLinearGradient(0, 0, 0, progress.height)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'rgb(0, 199, 205)')
    // gradient.addColorStop(1, 'rgb(0, 159, 181)')
    context.fillStyle = gradient
    let length = Math.min(progress.width * (current / total), progress.width)
    context.fillRect(0, 0, length, progress.height)
  }

  function resetTimebar () {
    let context = progress.getContext('2d')
    context.clearRect(0, 0, progress.width, progress.height)
    context = hits.getContext('2d')
    context.clearRect(0, 0, hits.width, hits.height)
  }

  function updateLoopCounters (attempts) {
    let digits = $('.loop-counter .digit')
      .toArray()
    attempts = attempts.toString()
    for (; attempts.length < 4;) {
      attempts = '0' + attempts
    }
    if (attempts.length > 4) {
      attempts = '10k+'
    }
    for (let l = 0; l < 4; ++l) {
      digits[l].innerHTML = attempts[l]
    }
  }

  function updateScoreCounters (score) {
    let digits = $('.score-display .digit')
      .toArray()
    score = score.toFixed(0).toString()
    for (; score.length < digits.length;) {
      score = '0' + score
    }
    if (score.length > digits.length) {
      throw 'score too bong, ' + score
    }
    for (let l = 0; l < digits.length; ++l) {
      digits[l].innerHTML = score[l]
    }
  }

  /* ##########
     Game setup
     ########## */

  // # CONSTANTS
  // global consts
  let game = $('#teeny-yald')
  // game dimensions
  const WIDTH = game.width()
  const HEIGHT = game.height()
  const BORDER = 50
  const SPAWN_BORDER = BORDER / 2
  const DESPAWN_BORDER = BORDER
  // game timings
  // in seconds thanks to Crafty.timer.FPS()
  const GAME_LENGTH = 60 * 3
  const SCRATCH_LENGTH = 2

  // player constants
  const MAX_SPEED = 8
  const PLAYER_RADIUS = 5

  // tachyons constants
  const TACHYON_SIZE = 4

  const CONSTS = {WIDTH, HEIGHT, BORDER, SPAWN_BORDER, DESPAWN_BORDER,
    GAME_LENGTH, SCRATCH_LENGTH, MAX_SPEED, PLAYER_RADIUS, TACHYON_SIZE}
  // statistics
  let runs = []

  function inGameState () {
    return !Crafty.isPaused() &&
      ['Scratch', 'Loop'].indexOf(Crafty._current) !== -1
  }

  Crafty.init(WIDTH, HEIGHT, 'teeny-yald')

  Crafty.settings.modify('autoPause', true)

  Crafty.bind('Pause', function () {
    if (!inGameState()) {
      return
    }
    // pause menu layout
    Crafty.e('2D, DOM, Text, PauseScreen')
      .attr({w: WIDTH, y: 40, z: 2100})
      .css('text-align', 'center')
      .text('Paused')
      .textColor('rgba(0, 0, 0, 0.5)')
      .textFont({size: '10em'})
    Crafty.e('2D, DOM, Color, PauseScreen, Mouse, Keyboard')
      .attr({x: 0, y: 0, w: WIDTH, h: HEIGHT, z: 2000})
      .color('rgba(128, 128, 128, 0.5)')
      .bind('Click', function () {
        Crafty.pause()
      })
      .bind('KeyDown', function () {
        if (this.isDown('ENTER')) {
          Crafty.pause()
        } else if (this.isDown('ESC')) {
          Crafty.pause()
        }
      })
    // forces to redraw the pause screen
    Crafty.trigger('RenderScene')
  })

  Crafty.bind('Unpause', function () {
    Crafty('PauseScreen').each(function () {
      this.destroy()
    })
  })

  Crafty.bind('KeyDown', function (keyEvent) {
    if (keyEvent.key === Crafty.keys.P) {
      if (!Crafty.isPaused()) Crafty.pause()
    }
  })

  Crafty.bind('NewScore', function (score) {
    updateScoreCounters(score)
  })

  function newRun (info) {
    let score = (info && info.score) || player.score
    runs.push({
      id: info.id,
      score: score,
      // run times are saved in ms
      time: Math.round(clock.time() * 1000)
    })
  }

  let ghost = 0

  Crafty.bind('PlayerScratch', function (info) {
    updateTimebarHits(clock.time(), GAME_LENGTH)
    // ready the new ghost
    if (info.frames !== []) {
      Crafty.e('Ghost')
        .Ghost(ghost++, info.tachId, info.frames, info.score)
    }
    info.id = ghost
    // player caused a paradox
    if (spawner.killers.indexOf(info.tachId) >= 0) {
      let doubleDead
      Crafty('Active').each(function () {
        if (this.tachId === info.tachId) {
          doubleDead = this
        }
      })
      player.regenerate(info, doubleDead)
      // remove old run
      runs = runs.filter((elem) => {
        return elem.id !== doubleDead.id
      })
      resetTimebarHits()
      doubleDead.destroy()
    } else {
      newRun(info)
      Crafty.trigger('EndLoop')
      // save tachId in spawner
      spawner.killers.push(info.tachId)
      // TODO: Fix paradoxes (runs and hitcounter)
      Crafty.scene('Scratch')
    }
  })

  Crafty.bind('PlayerKill', function (info) {
    // ready the 'new' ghost (for replays)
    if (info.frames !== []) {
      Crafty.e('Ghost')
        .Ghost(ghost++, info.tachId, info.frames, info.score)
    }
    info.id = ghost
    newRun(info)
    updateTimebarHits(clock.time(), GAME_LENGTH)
    Crafty.scene('GameOver')
  })

  // # CUSTOM COMPONENTS
  Crafty.c('Quark', {
    init: function () {
      this.requires('2D, DOM, Color, Collision')
      this.attr({
        x: WIDTH / 2 - PLAYER_RADIUS,
        y: HEIGHT / 2 - PLAYER_RADIUS,
        w: PLAYER_RADIUS * 2,
        h: PLAYER_RADIUS * 2
      })
      this.css('border-radius', '100%')
      this.origin('center')
      /* eslint-disable new-cap */
      this.collision(
        new Crafty.circle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS)
      )
      /* eslint-enable new-cap */
    }
  })

  require('./game/player')(Crafty, CONSTS)
  require('./game/ghosts')(Crafty, CONSTS)
  require('./game/tachyons')(Crafty, CONSTS)
  require('./game/spawner')(Crafty, CONSTS)

  Crafty.c('GameClock', {
    frame: 0,
    lastFrame: 0,
    init: function () {
      this.requires('2D, Delay')
    },
    remove: function () {
      this.cancelDelay(this._winGame)
    },
    _enterFrame: function (frame) {
      updateTimebarProgress(this.frame, this.lastFrame)
      // this.dt += frame.dt
      // update the game frame-wise
      this.frame++
    },
    _winGame: function () {
      Crafty.scene('GameWon')
    },
    gameClock: function (gameDuration) {
      this.lastFrame = gameDuration * Crafty.timer.FPS()
      this.bind('EnterFrame', this._enterFrame)
      this.delay(this._winGame, gameDuration * 1000)
      return this
    },
    time: function () {
      // +1 as the clock is always one frame behind
      // FIXME: That's a lie, but not sure how often
      return (this.frame + 1) / Crafty.timer.FPS()
    },
    total: function () {
      return this.lastFrame / Crafty.timer.FPS()
    },
    reset: function () {
      this.frame = 0
      return this
    }
  })

  let player
  let clock
  let spawner

  // FIXME: Mouse lock is just too broken to work
  // // mouse lock mechanism
  // game.on('click', function () {
  //   if (!inGameState()) {
  //     return
  //   }
  //   this.requestPointerLock()
  // })
  //
  // let lockOnce = true
  // function lockChange () {
  //   if (document.pointerLockElement === Crafty.stage.elem) {
  //     // enable mouse control, delayed to prevent sudden jump from
  //     //  accepting the pointer lock prompt
  //     if (!lockOnce) {
  //       return
  //     }
  //     lockOnce = false
  //     player.enableMouse()
  //   } else {
  //     // reset back to keyboard control
  //     lockOnce = true
  //     player.enableKeyboard()
  //   }
  // }
  //
  // // TODO(Dustine): Remove or rework this later
  // function lockError () {
  // }
  //
  // $(document).on('pointerlockchange', lockChange)
  // $(document).on('pointerlockerror', lockError)

  // ## update outside GUI
  // TODO(Dustine): Scenes
  Crafty.background('black')

  // GUI
  Crafty.c('gui-text', {
    init () {
      this.requires('2D, DOM, Text, gui')
        .text('gui-text')
        .attr('w', WIDTH)
        .textColor('#ffffff')
        .textFont({size: '4rem'})
    }
  })

  Crafty.c('gui-button', {
    init () {
      this.requires('2D, DOM, Mouse, Keyboard')
      this.bind('Change', this._userChange)
      this.origin('center')
      this._text = Crafty.e('2D, DOM, gui-button-text')
        // .text('gui-button')
        // .attr({w: this.w, h: this.h})
        // MEH: Forces the text to center, alongside the extra css code
        // .css({
        //   height: 'inherit',
        //   width: 'inherit'
        // })
        // .textColor('white')
        // .textFont('size', '4rem')
        // .unselectable()
      this.attach(this._text)
      this.attr({
        x: 0,
        y: 0,
        selected: false,
        colorFrom: 'blue',
        colorTo: 'darkBlue',
        w: 400,
        h: 50,
        action: function () {}
      })
      // console.error(this._text)
      var $text = $(this._text._element)
      $text.html('gui-button')

      let self = this
      this.bind('Click', this._action)
      this.bind('KeyDown', this._keyDown)
      this.bind('MouseOver', () => {
        Crafty.trigger('MouseOverButton', this)
        self.attr('selected', true)
      })
      this.bind('MouseOut', () => {
        // self.attr('selected', false)
      })
      this.bind('MouseOverButton', () => {
        self.attr('selected', false)
      })
    },
    _action () {
      this.action()
    },
    _userChange (changed) {
      // console.log(changed, changed.keys)
      if (changed.hasOwnProperty('colorFrom') ||
        changed.hasOwnProperty('colorTo')) {
        this._setColors(changed.colorFrom, changed.colorTo)
      }
      if (changed.hasOwnProperty('h')) {
        var $text = $(this._text._element)
        $text.css('line-height', changed.h + 'px')
      }
      if (changed.hasOwnProperty('selected')) {
        if (changed.selected) {
          this.addComponent('selected')
        } else {
          this.removeComponent('selected')
        }
      }
      // if(changed.hasOwnProperty('colorFrom'))
    },
    _keyDown (keyEvent) {
      if (keyEvent.key === Crafty.keys.ENTER && this.selected) {
        this._action()
      }
    },
    _setColors (colorFrom, colorTo) {
      colorFrom = colorFrom || this.colorFrom || 'grey'
      colorTo = colorTo || this.colorTo || 'black'
      this.css({
        'background': `linear-gradient(to bottom, ${colorFrom} 0%, ${colorTo} 100%)`
      })
    },
    select () {
      this.attr('selected', !this.selected)
      return this
    },
    text (text) {
      var $text = $(this._text._element)
      $text.html(text)
      return this
    },
    textSize (size) {
      this._text.textFont('size', size)
      return this
    }
  })

  let loops = 1

  Crafty.scene('Menu', function () {
    Crafty.e('gui-text')
      .text('Teeny Yald')
      .textFont({size: '12rem'})
      .attr('y', 60)
    Crafty.e('gui-text')
      .text(require('./game/catchphrases'))
      .textFont({size: '4rem'})
      .attr('y', 200)
    // start
    Crafty.e('gui-button')
      .text('Start')
      .attr({
        x: (WIDTH - 400) / 2,
        y: (HEIGHT - 100) / 2 + 100,
        colorFrom: 'rgb(84, 193, 188)',
        colorTo: 'rgb(19, 154, 150)',
        action: () => {
          Crafty.scene('Start')
        }
      })
      .select()
    Crafty.e('gui-button')
      .text('Hello')
      .attr({
        x: (WIDTH - 400) / 2,
        y: (HEIGHT - 100) / 2 + 175,
        colorFrom: 'rgb(84, 193, 188)',
        colorTo: 'rgb(19, 154, 150)',
        action: () => {
          alert('Hello!')
        }
      })
  })

  Crafty.scene('Start', function () {
    // start the game!
    // clear display
    resetTimebar()
    // clear internal logic
    runs = []
    loops = 1
    ghost = 0
    player = Crafty.e('Player')
    Crafty.scene('Scratch')
  }, function () {
    // # DEBUG
    // Debug commands
    // if (DEBUG) {
    //   Crafty.e('Tachyon')
    //     .type('White')
    //     .whiteTachyon({
    //       id: 0,
    //       speed: 4,
    //       angle: Math.random() * Math.PI * 2 - Math.PI,
    //       origin: {x: WIDTH * 3 / 4, y: HEIGHT * 3 / 4}
    //     })
    //     .addComponent('Paradoxy')
    // }
    spawner = Crafty.e('Spawner')
      .spawner(GAME_LENGTH)
  })

  Crafty.scene('Loop', function () {
    // start the game clock
    clock = Crafty.e('GameClock')
      .gameClock(GAME_LENGTH)

    if (DEBUG) {
      Crafty('Quark').each(function () {
        this.addComponent('WiredHitBox')
      })
    }
    Crafty.trigger('StartLoop')
  }, function () {
    Crafty.trigger('EndLoop')
  })

  Crafty.scene('Scratch', function () {
    updateLoopCounters(loops++)
    // set timeout for restart of ghosties
    Crafty.e('Delay')
      .delay(function () {
        Crafty.scene('Loop')
      }, SCRATCH_LENGTH * 1000)
  })

  function gameOverText () {
    // latest score
    let latest = runs[runs.length - 1]
    let score = 'Score: ' + latest.score.toFixed(0) + ', over ' +
      formatTime(latest.time)
    // best score and time (all around)
    let bestScore = runs[0]
    bestScore.i = 0
    let bestTime = runs[0]
    bestTime.i = 0
    for (let i = 0; i < runs.length; i++) {
      if (runs[i].score > bestScore.score) {
        bestScore = runs[i]
        bestScore.i = i
      }
      if (runs[i].time > bestTime.time) {
        bestTime = runs[i]
        bestTime.i = i
      }
    }
    bestScore = 'Best Score: Run ' + (bestScore.i + 1) + ', ' +
      bestScore.score.toFixed(0)
    bestTime = 'Best Time: Run ' + (bestTime.i + 1) + ', ' +
      formatTime(bestTime.time)

    for (let i = 0; i < 10; i++) {
      runs.push({
        score: Math.random() * 1000000
      })
    }

    // TODO: Highscores from yourself
    runs.sort((a, b) => {
      // backwards to avoid a .reverse()
      if (a.score > b.score) {
        return -1
      }
      if (a.score < b.score) {
        return 1
      }
      return 0
    })
    console.log(runs)

    return {score, bestScore, bestTime}
  }

  // TODO: Join the common logic between GameOver and GameWon
  Crafty.scene('GameOver', function () {
    // cleanup
    Crafty('Quark').each(function () {
      this.destroy()
    })
    spawner.destroy()
    // show gameover screen
    let scores = gameOverText()
    Crafty.e('gui-text')
      .text('Game Over')
      .textFont({size: '10rem'})
      .attr({y: 40})
    Crafty.e('gui-text')
      .text(scores.score)
      .textFont({size: '3rem'})
      .attr({y: 160})
    Crafty.e('gui-text')
      .text(scores.bestScore + '<br>' + scores.bestTime)
      .textFont({size: '2rem'})
      .attr({y: 200})

    Crafty.e('gui-button')
      .text('Restart')
      .attr({
        x: (WIDTH - 400) / 2,
        y: (HEIGHT - 100) / 2 + 150,
        colorFrom: 'darkRed',
        colorTo: '#5d0000',
        action: () => {
          Crafty.scene('Start')
        }
      })
      .select()
    Crafty.e('gui-button')
      .text('Show Replay')
      .attr({
        x: (WIDTH - 400) / 2,
        y: (HEIGHT - 100) / 2 + 225,
        colorFrom: 'darkRed',
        colorTo: '#5d0000',
        action: () => {
        }
      })
  })

  Crafty.scene('GameWon', function () {
    // save final run (no hits!)
    newRun()
    // cleanup
    Crafty('Quark').each(function () {
      this.destroy()
    })
    spawner.destroy()
    updateTimebarProgress(1, 1)
    // show gamewon screen
    let scores = gameOverText()
    Crafty.e('gui-text')
      .text('You Win!')
      .textFont({size: '10rem'})
      .attr({y: 40})
    Crafty.e('gui-text')
      .text(scores.score)
      .textFont({size: '3rem'})
      .attr({y: 240})
    Crafty.e('gui-text')
      .text(scores.bestScore + '<br>' + scores.bestTime)
      .textFont({size: '2rem'})
      .attr({y: 300})

    Crafty.e('gui-button')
      .text('Restart')
      .attr({
        x: (WIDTH - 400) / 2,
        y: (HEIGHT - 100) / 2 + 150,
        colorFrom: 'rgb(84, 193, 188)',
        colorTo: 'rgb(19, 154, 150)',
        action: () => {
          Crafty.scene('Start')
        }
      })
      .select()
    Crafty.e('gui-button')
      .text('Show Replay')
      .attr({
        x: (WIDTH - 400) / 2,
        y: (HEIGHT - 100) / 2 + 225,
        colorFrom: 'rgb(84, 193, 188)',
        colorTo: 'rgb(19, 154, 150)',
        action: () => {
        }
      })
  })

  // Start the game proper!
  Crafty.scene('Menu')
})
