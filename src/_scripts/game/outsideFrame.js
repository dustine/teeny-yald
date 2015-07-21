'use strict'

import $ from 'jquery'

let $container = $('.timeline')
let display = $('.timeline > .display')[0]
let hits = $('.timeline > .hits')[0]
let progress = $('.timeline > .game-progress')[0]

// add correct border radius to counter digits
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
  let $children = $(elem).children()
  let $digits = $children.filter('.digit')
  $digits.each(function (i, elem) {
    addIntegerBorderRadius($digits.length, i, elem)
  })
})

// initialize canvas
// console.log($container.parent(), $container.parent().height())

let CANVAS_WIDTH = $container.width()
let CANVAS_HEIGHT = $container.parent().height() * 0.8
$container.height(CANVAS_HEIGHT)

display.width = hits.width = progress.width = CANVAS_WIDTH
display.height = hits.height = progress.height = CANVAS_HEIGHT
let context = display.getContext('2d')

context.lineWidth = 1
context.lineCap = 'round'
context.strokeStyle = '#666'
let maxDivider = 32
for (let divider = 2; divider <= maxDivider; divider *= 2) {
  for (let place = 1; place < divider; place++) {
    context.beginPath()
    context.moveTo(
      Math.round(CANVAS_WIDTH / divider * place) + 0.5,
      CANVAS_HEIGHT
    )
    let pointerLimit = Math.log(divider) /
      Math.log(maxDivider * maxDivider)
    context.lineTo(
      Math.round(CANVAS_WIDTH / divider * place) + 0.5,
      Math.round(CANVAS_HEIGHT * pointerLimit +
        CANVAS_HEIGHT * 1 / 4)
    )
    context.stroke()
  }
}
