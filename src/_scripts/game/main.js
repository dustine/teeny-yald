/* eslint-env node, jquery */
/* global Crafty */
// use strict

// FIXME: Don't keep debug on!
var DEBUG = false

// HACK: Homemade time formattation, oh my
function formatTime (ms) {
  function cut (number, fraction) {
    number /= fraction
    return Math.floor(number)
  }
  // milliseconds
  var result = ' s'
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

$(function () {
  /* ##################
  Exterior canvas setup
  */

  // initialize counters
  (function addCorrectBorderRadiusToDigits () {
    function addIntegerBorderRadius (length, i, elem) {
      i = length - i - 1
      if (i % 3 === 0) {
        $(elem).addClass('-right')
      }
      if ((i + 1) % 3 === 0) {
        $(elem).addClass('-left')
      }
    }

    $('.counter.-separate').each(function (i, elem) {
      var $children = $(elem).children()
      var $digits = $children.filter('.digit')
      $digits.each(function (i, elem) {
        addIntegerBorderRadius($digits.length, i, elem)
      })
    })
  }())

  // initialize canvas
  var $container = $('.timeline')
  var display = $('#tb-display')[0]
  var hits = $('#tb-hits')[0]
  var progress = $('#tb-progress')[0];(function initializeTimelineBar () {
    var CANVAS_WIDTH = $container.width()
    var CANVAS_HEIGHT = $container.parent().height() * 0.8
    $container.height(CANVAS_HEIGHT)

    display.width = hits.width = progress.width = CANVAS_WIDTH
    display.height = hits.height = progress.height = CANVAS_HEIGHT
    var context = display.getContext('2d')

    context.lineWidth = 1
    context.lineCap = 'round'
    context.strokeStyle = '#666'
    var maxDivider = 32
    for (var divider = 2; divider <= maxDivider; divider *= 2) {
      for (var place = 1; place < divider; place++) {
        context.beginPath()
        context.moveTo(
          Math.round(CANVAS_WIDTH / divider * place) + 0.5,
          CANVAS_HEIGHT
        )
        var pointerLimit = Math.log(divider) /
          Math.log(maxDivider * maxDivider)
        context.lineTo(
          Math.round(CANVAS_WIDTH / divider * place) + 0.5,
          Math.round(CANVAS_HEIGHT * pointerLimit +
            CANVAS_HEIGHT * 1 / 4)
        )
        context.stroke()
      }
    }
  }())

  function updateTimebarHits (current, total, color) {
    color = color || 'red'
    var context = hits.getContext('2d')
    var x = Math.floor(hits.width * (current / total)) - 0.5
    context.beginPath()
    var gradient = context.createLinearGradient(0, 0, 0, progress.height)
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
    var context = progress.getContext('2d')
    context.clearRect(0, 0, progress.width, progress.height)
    var gradient = context.createLinearGradient(0, 0, 0, progress.height)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'rgb(0, 199, 205)')
    // gradient.addColorStop(1, 'rgb(0, 159, 181)')
    context.fillStyle = gradient
    var length = Math.min(progress.width * (current / total), progress.width)
    context.fillRect(0, 0, length, progress.height)
  }

  function resetTimebar () {
    var context = progress.getContext('2d')
    context.clearRect(0, 0, progress.width, progress.height)
    context = hits.getContext('2d')
    context.clearRect(0, 0, hits.width, hits.height)
  }

  function updateLoopCounters (attempts) {
    var digits = $('.loop-counter .digit')
      .toArray()
    attempts = attempts.toString()
    for (; attempts.length < 4;) {
      attempts = '0' + attempts
    }
    if (attempts.length > 4) {
      attempts = '10k+'
    }
    for (var l = 0; l < 4; ++l) {
      digits[l].innerHTML = attempts[l]
    }
  }

  function updateScoreCounters (score) {
    var digits = $('.score-display .digit')
      .toArray()
    score = score.toFixed(0).toString()
    for (; score.length < digits.length;) {
      score = '0' + score
    }
    if (score.length > digits.length) {
      throw 'score too bong, ' + score
    }
    for (var l = 0; l < digits.length; ++l) {
      digits[l].innerHTML = score[l]
    }
  }

  /* ##########
     Game setup
     ########## */

  // # CONSTANTS
  // global consts
  var game = $('#animated-sansa')
  var WIDTH = game.width()
  var HEIGHT = game.height()
  var BORDER = 20
  var SPAWN_BORDER = 100
  var GAME_LENGTH = 60 * 1000

  // player constants
  var MAX_SPEED = 8
  var PLAYER_RADIUS = 5

  // tachyons constants
  var TACHYON_SIZE = 4

  // statistics
  var runs = []

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
  Crafty.bind('Hit', function (score) {
    runs.push({
      score: score,
      time: clock._dt
    })
    updateTimebarHits(clock._dt, clock._gameEnd)
  })

  // # CUSTOM COMPONENTS
  require('./player')(Crafty, WIDTH, HEIGHT, MAX_SPEED, BORDER)
  require('./ghosts')(Crafty)
  require('./tachyons')(Crafty, WIDTH, HEIGHT, BORDER, SPAWN_BORDER,
    TACHYON_SIZE)
  require('./spawner')(Crafty, WIDTH, HEIGHT, BORDER, SPAWN_BORDER,
    TACHYON_SIZE)

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

  Crafty.c('GameClock', {
    _dt: 0,
    _gameEnd: 0,
    _dead: false,
    init: function () {
      this.requires('2D, Delay')
    },
    destroy: function () {
      this._dead = true
      this.cancelDelay(this._winGame)
    },
    _enterFrame: function (frame) {
      if (this._dead) {
        return
      }
      updateTimebarProgress(this._dt, this._gameEnd)
      this._dt += frame.dt
    },
    _winGame: function () {
      Crafty.scene('GameWon')
    },
    gameClock: function (gameEnd) {
      this._gameEnd = gameEnd
      this.bind('EnterFrame', this._enterFrame)
      this.delay(this._winGame, gameEnd)
      return this
    },
    reset: function () {
      this._dt = 0
      return this
    }
  })

  var player

  // mouse lock mechanism
  game.on('click', function () {
    if (!inGameState()) {
      return
    }
    this.requestPointerLock()
  })

  var lockOnce = true
  function lockChange () {
    if (document.pointerLockElement === Crafty.stage.elem) {
      // enable mouse control, delayed to prevent sudden jump from
      //  accepting the pointer lock prompt
      if (!lockOnce) {
        return
      }
      lockOnce = false
      player.enableMouse()
    } else {
      // reset back to keyboard control
      lockOnce = true
      player.enableKeyboard()
    }
  }

  // TODO(Dustine): Remove or rework this later
  function lockError () {
  }

  $(document).on('pointerlockchange', lockChange)
  $(document).on('pointerlockerror', lockError)

  // FIXME: This should be in player.js
  // ## Recording location
  function recordFirstFrame (frame) {
    this._firstFrame = frame.frame
  }

  function record (frame) {
    this._previousFrames[frame.frame] = {
      // dt: frame.dt,
      x: this.x,
      y: this.y
    }
  }

  // ## update outside GUI
  // TODO(Dustine): Scenes
  Crafty.background('black')

  var loops = 1
  var clock
  var spawner

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
      .spawner(GAME_LENGTH / Crafty.timer.FPS())
  })

  Crafty.scene('Loop', function () {
    if (DEBUG) {
      Crafty('Quark').each(function () {
        this.addComponent('WiredHitBox')
      })
    }
    // start player's recording
    player.one('ExitFrame', recordFirstFrame)
    player.bind('ExitFrame', record)
    // start the game clock
    clock = Crafty.e('GameClock')
      .gameClock(GAME_LENGTH)
    // and play everyone else's recording
    Crafty.trigger('StartLoop')
    // AAND start the spawn nonsence
    spawner.start()
  }, function () {
    // mark the hit
    // TODO Prevent access to internal variables
    // updateTimebarProgress(clock._dt, clock._gameEnd)
    clock.destroy()
    // updateTimebarHits(clock._dt, clock._gameEnd)
    // clock.reset()
    // stop the spawner
    spawner.reset()
    // stop recording
    player.unbind('ExitFrame', record)
    // save current run's values
    var firstFrame = player._firstFrame || 0
    var previousFrames = player._previousFrames || []
    // reset player
    player._previousFrames = []
    var tachId = player._tachId
    player._tachId = undefined
    // restart old ghosts
    Crafty.trigger('EndLoop')
    // ready the new ghost
    if (previousFrames.length !== 0) {
      Crafty.e('Ghost')
        .Ghost(tachId, firstFrame, previousFrames)
    }
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
        var latest = runs[runs.length - 1]
        return 'Score: ' + latest.score.toFixed(0) + ', over ' +
          formatTime(latest.time)
      })
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '3em'})
      .attr({w: WIDTH, y: 240})
      .css('text-align', 'center')
    Crafty.e('2D, DOM, Text')
      .text(function () {
        var bestScore = runs[0]
        bestScore.i = 0
        var bestTime = runs[0]
        bestTime.i = 0
        for (var i = 0; i < runs.length; i++) {
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
        var latest = runs[runs.length - 1]
        return 'Score: ' + latest.score.toFixed(0) + ', over ' +
          formatTime(latest.time)
      })
      .textColor('#ffffff')
      .textFont({'family': 'Open Sans', size: '3em'})
      .attr({w: WIDTH, y: 240})
      .css('text-align', 'center')
    Crafty.e('2D, DOM, Text')
      .text(function () {
        var bestScore = runs[0]
        bestScore.i = 0
        var bestTime = runs[0]
        bestTime.i = 0
        for (var i = 0; i < runs.length; i++) {
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
      .attr({x: (WIDTH - 400) / 2, y: (HEIGHT - 100) / 2 + 100, w: 400, h: 100})
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
