'use strict'

let catchphrases = [
  'You Always Live Double, after all!',
  'Sometimes a loss isn\'t all that bad!',
  'Keep your friends close and your enemies closer!',
  'Just try to do paradoxes, I dare you.',
  'Subatomic Rainbow Party!',
  'Of course, don\'t you know anything about SCIENCE!?',
  'Groundhog day, only the groundhog is teeny!',
  'Yes, the name\'s based on YOLO.',
  'Only slightly less confusing than Homestuck!',
  'Music suggestions are appreciated!',
  'Remade at least three times so far!',
  'Coming (probably) never to an iDevice near you!',
  'Fact: Everybody hates Lime Particle!',
  'Still somewhat playable for the colourblind!',
  'No flux capacitor required!',
  'Pointer lock sure was a thing!',
  'Error: ERRPRDX on time.js:413',
  'Crave that energy!',
  // NOTE: Don't forget to fix this as you update
  '\'Only\' 1511 lines of code!'
]

// meta
catchphrases.push(`${catchphrases.length + 1} catchphrases and counting!`)

module.exports = function () {
  return catchphrases[Math.floor(catchphrases.length * Math.random())]
}
