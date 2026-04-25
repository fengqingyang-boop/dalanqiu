class UIController {
  private scoreEffectElement: HTMLElement | null = null

  constructor() {}

  showScoreEffect(points: number) {
    // 移除旧的效果元素
    if (this.scoreEffectElement) {
      this.scoreEffectElement.remove()
    }

    // 创建新的效果元素
    const effectElement = document.createElement('div')
    effectElement.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 48px;
      font-weight: bold;
      color: #ffcc00;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 204, 0, 0.5);
      pointer-events: none;
      z-index: 1000;
      animation: scorePopup 1.5s ease-out forwards;
    `

    effectElement.textContent = `+${points}`

    // 添加动画样式
    this.addAnimationStyles()

    // 添加到页面
    document.body.appendChild(effectElement)
    this.scoreEffectElement = effectElement

    // 自动移除
    setTimeout(() => {
      if (effectElement.parentNode) {
        effectElement.remove()
      }
      if (this.scoreEffectElement === effectElement) {
        this.scoreEffectElement = null
      }
    }, 1500)
  }

  private addAnimationStyles() {
    // 检查是否已经添加了样式
    const styleId = 'score-animation-styles'
    if (document.getElementById(styleId)) {
      return
    }

    const styleElement = document.createElement('style')
    styleElement.id = styleId
    styleElement.textContent = `
      @keyframes scorePopup {
        0% {
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 0;
        }
        20% {
          transform: translate(-50%, -50%) scale(1.3);
          opacity: 1;
        }
        40% {
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          transform: translate(-50%, -100%) scale(0.8);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(styleElement)
  }

  updatePowerBar(power: number) {
    const powerBar = document.getElementById('power-bar')
    const powerLabel = document.getElementById('power-label')

    if (powerBar) {
      powerBar.style.width = power + '%'
    }

    if (powerLabel) {
      let label = '蓄力中...'
      if (power < 30) {
        label = '轻投'
      } else if (power < 60) {
        label = '中距离'
      } else if (power < 85) {
        label = '远投'
      } else {
        label = '全力投篮！'
      }
      powerLabel.textContent = label
    }
  }

  showDunkHint(show: boolean) {
    const dunkHint = document.getElementById('dunk-hint')
    if (dunkHint) {
      dunkHint.style.display = show ? 'block' : 'none'
    }
  }

  setScore(score: number) {
    const scoreDisplay = document.getElementById('score')
    if (scoreDisplay) {
      scoreDisplay.textContent = score.toString()
    }
  }
}

export default UIController
