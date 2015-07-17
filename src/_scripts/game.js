/* global Crafty */
'use strict'

import $ from 'jquery'

// FIXED: Don't keep debug on!
const DEBUG = false

// HACK: Homemade time formattation, oh my
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
  let progress = $('.timeline > .progress')[0]

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
  let game = $('#animated-sansa')
  const WIDTH = game.width()
  const HEIGHT = game.height()
  const BORDER = 50
  const SPAWN_BORDER = 50
  // in seconds thanks to Crafty.timer.FPS()
  const GAME_LENGTH = 60

  // player constants
  const MAX_SPEED = 8
  const PLAYER_RADIUS = 5

  // tachyons constants
  const TACHYON_SIZE = 4

  // statistics
  let runs = []

  function inGameState () {
    return !Crafty.isPaused() &&
      ['Scratch', 'Loop'].indexOf(Crafty._current) !== -1
  }

  Crafty.init(WIDTH, HEIGHT, 'animated-sansa')

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
      .textFont({family: 'Open Sans', size: '10em'})
    Crafty.e('2D, DOM, Color, PauseScreen')
      .attr({x: 0, y: 0, w: WIDTH, h: HEIGHT, z: 2000})
      .color('rgba(128, 128, 128, 0.5)')
    // forces to redraw the pause screen
    Crafty.trigger('RenderScene')
  })

  Crafty.bind('Unpause', function () {
    Crafty('PauseScreen').each(function () {
      this.destroy()
    })
  })

  Crafty.bind('NewScore', function (score) {
    updateScoreCounters(score)
  })

  function newRun (info) {
    let score = (info && info.score) || player.score
    runs.push({
      score: score,
      // run times are saved in ms
      time: Math.round(clock.time() * 1000)
    })
  }

  Crafty.bind('PlayerScratch', function (info) {
    newRun(info)
    updateTimebarHits(clock.time(), GAME_LENGTH)
    Crafty.trigger('EndLoop')
    // ready the new ghost
    if (info.previousFrames !== []) {
      Crafty.e('Ghost')
        .Ghost(info.tachId, info.firstFrame, info.previousFrames)
    }

    Crafty.scene('Scratch')
  })

  Crafty.bind('PlayerKill', function (info) {
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
      this.collision(
        /* eslint-disable new-cap */
        new Crafty.circle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS)
      /* eslint-enable new-cap */
      )
    }
  })

  require('./game/player')(Crafty, WIDTH, HEIGHT, MAX_SPEED, BORDER)
  require('./game/ghosts')(Crafty)
  require('./game/tachyons')(Crafty, WIDTH, HEIGHT, BORDER, SPAWN_BORDER,
    TACHYON_SIZE)
  require('./game/spawner')(Crafty, WIDTH, HEIGHT, BORDER, SPAWN_BORDER,
    TACHYON_SIZE)

  Crafty.c('GameClock', {
    _f: 0,
    _lastFrame: 0,
    // _dead: false,
    init: function () {
      this.requires('2D, Delay')
    },
    remove: function () {
      // this._dead = true
      this.cancelDelay(this._winGame)
    },
    _enterFrame: function (frame) {
      // if (this._dead) {
      //   return
      // }
      updateTimebarProgress(this._f, this._lastFrame)
      // this._dt += frame.dt
      // update the game frame-wise
      this._f++
    },
    _winGame: function () {
      Crafty.scene('GameWon')
    },
    gameClock: function (gameDuration) {
      this._lastFrame = gameDuration * Crafty.timer.FPS()
      this.bind('EnterFrame', this._enterFrame)
      this.delay(this._winGame, gameDuration * 1000)
      return this
    },
    time: function () {
      // +1 as the clock is always one frame behind
      // FIXME: That's a lie, but not sure how often
      return (this._f + 1) / Crafty.timer.FPS()
    },
    total: function () {
      return this._lastFrame / Crafty.timer.FPS()
    },
    reset: function () {
      this._f = 0
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

  let loops = 1

  Crafty.scene('Menu', function () {
    Crafty.e('2D, DOM, Text')
      .text('Animated Sansa')
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '6em'})
      .attr({w: WIDTH, y: 40})
      .css('text-align', 'center')
    // Crafty.e('2D, DOM, Text')
    //   .text('Score: ' + player.score)
    //   .textColor('#ffffff')
    //   .textFont({'family': 'Open Sans', size:'3em'})
    //   .attr({w: WIDTH, y:240})
    //   .css('text-align', 'center')
    Crafty.e('2D, DOM, Mouse, Keyboard, Text')
      .attr({x: (WIDTH - 400) / 2, y: (HEIGHT - 100) / 2 + 100, w: 400, h: 100})
      // TODO: Move this to the CSS (hint: Components == Classes)
      .css({
        'background': 'linear-gradient(to bottom, rgb(84, 193, 188) 0%, rgb(19, 154, 150) 100%)',
        'border-radius': '0.5em'
      })
      .bind('Click', function () {
        Crafty.scene('Start')
      })
      .bind('KeyDown', function () {
        if (this.isDown('ENTER')) {
          Crafty.scene('Start')
        }
      })
      .text('Start')
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '4em'})
      .css('text-align', 'center')
      .css('line-height', '' + 100 + 'px')
  })

  Crafty.scene('Start', function () {
    // start the game!
    // clear display
    resetTimebar()
    // clear internal logic
    runs = []
    loops = 1
    player = Crafty.e('Player')
    Crafty.scene('Scratch')
  }, function () {
    spawner = Crafty.e('Spawner')
      // TODO: Make this a global constant
      .spawner(GAME_LENGTH)
  })

  Crafty.scene('Loop', function () {
    if (DEBUG) {
      Crafty('Quark').each(function () {
        this.addComponent('WiredHitBox')
      })
    }
    // start the game clock
    clock = Crafty.e('GameClock')
      .gameClock(GAME_LENGTH)
    // and play everyone else's recording
    Crafty.trigger('StartLoop')
    // AAND start the spawn nonsence
    spawner.start()
  }, function () {
    // HACK: A scene change deletes the clock but only after the first frame,
    //       so we have to kill it ahead of time
    // clock.destroy()
  })

  Crafty.scene('Scratch', function () {
    updateLoopCounters(loops++)
    // set timeout for restart of ghosties
    Crafty.e('Delay')
      .delay(function () {
        // TODO: wait for the first frame available ?
        Crafty.scene('Loop')
      }, 2000)
  })

  // TODO: Join the common logic between GameOver and GameWon
  Crafty.scene('GameOver', function () {
    // cleanup
    Crafty('Quark').each(function () {
      this.destroy()
    })
    spawner.destroy()
    // show gameover screen
    Crafty.e('2D, DOM, Text')
      .text('Game Over')
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '10em'})
      .attr({w: WIDTH, y: 40})
      .css('text-align', 'center')
    Crafty.e('2D, DOM, Text')
      .text(function () {
        let latest = runs[runs.length - 1]
        return 'Score: ' + latest.score.toFixed(0) + ', over ' +
          formatTime(latest.time)
      })
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '3em'})
      .attr({w: WIDTH, y: 240})
      .css('text-align', 'center')
    Crafty.e('2D, DOM, Text')
      .text(function () {
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
        return 'Best Score: Attempt ' + (bestScore.i + 1) + ', ' +
          bestScore.score.toFixed(0) + '<br>' +
          'Best Time: Attempt ' + (bestTime.i + 1) + ', ' +
          formatTime(bestTime.time)
      })
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '1.5em'})
      .attr({w: WIDTH, y: 300})
      .css('text-align', 'center')
    Crafty.e('2D, DOM, Mouse, Keyboard, Text')
      .attr({x: (WIDTH - 400) / 2, y: (HEIGHT - 100) / 2 + 200, w: 400, h: 100})
      // TODO: Move this to the CSS (hint: Components == Classes)
      .css({
        'background': 'linear-gradient(to bottom, blue 0%, darkBlue 100%)',
        'border-radius': '0.5em'
      })
      .bind('Click', function () {
        Crafty.scene('Start')
      })
      .bind('KeyDown', function () {
        if (this.isDown('ENTER')) {
          Crafty.scene('Start')
        }
      })
      .text('Restart')
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '4em'})
      .css('text-align', 'center')
      .css('line-height', '' + 100 + 'px')
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
    Crafty.e('2D, DOM, Text')
      .text('You win!')
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '10em'})
      .attr({w: WIDTH, y: 40})
      .css('text-align', 'center')
    Crafty.e('2D, DOM, Text')
      .text(function () {
        let latest = runs[runs.length - 1]
        return 'Score: ' + latest.score.toFixed(0) + ', over ' +
          formatTime(latest.time)
      })
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '3em'})
      .attr({w: WIDTH, y: 240})
      .css('text-align', 'center')
    Crafty.e('2D, DOM, Text')
      .text(function () {
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
        return 'Best Score: Attempt ' + (bestScore.i + 1) + ', ' +
          bestScore.score.toFixed(0) + '<br>' +
          'Best Time: Attempt ' + (bestTime.i + 1) + ', ' +
          formatTime(bestTime.time)
      })
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '1.5em'})
      .attr({w: WIDTH, y: 300})
      .css('text-align', 'center')
    Crafty.e('2D, DOM, Mouse, Keyboard, Text')
      .attr({x: (WIDTH - 400) / 2, y: (HEIGHT - 100) / 2 + 200, w: 400, h: 100})
      // TODO: Move this to the CSS (hint: Components == Classes)
      .css({
        'background': 'linear-gradient(to bottom, skyBlue 0%, cyan 100%)',
        'border-radius': '0.5em'
      })
      .bind('Click', function () {
        Crafty.scene('Start')
      })
      .bind('KeyDown', function () {
        if (this.isDown('ENTER')) {
          Crafty.scene('Start')
        }
      })
      .text('Restart')
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '4em'})
      .css('text-align', 'center')
      .css('line-height', '' + 100 + 'px')
  })

  // # DEBUG
  // Debug commands
  if (DEBUG) {
    Crafty('Quark').each(function () {
      this.addComponent('WiredHitBox')
    })
    // player.addComponent('WiredHitBox')
    player.addComponent('Keyboard')
    player.bind('KeyDown', function (ke) {
      if (ke.key === Crafty.keys.R) {
        this.x = WIDTH / 2 - PLAYER_RADIUS
        this.y = HEIGHT / 2 - PLAYER_RADIUS
      } else if (ke.key === Crafty.keys.Q) {
        console.log(this.x, this.y)
      } else if (ke.key === Crafty.keys.C) {
        if (Crafty._current === 'Loop') {
          Crafty.scene('Scratch')
        }
      }
    })
  }

  // Start the game proper!
  Crafty.scene('Menu')
})
