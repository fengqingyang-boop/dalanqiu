import Game from './Game'

const game = new Game()

// 等待点击开始按钮
const startBtn = document.getElementById('start-btn')
const startHint = document.getElementById('start-hint')

if (startBtn && startHint) {
  startBtn.addEventListener('click', async () => {
    startHint.style.display = 'none'
    await game.init()
    game.start()
  })
}

export default game
