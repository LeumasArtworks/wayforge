import type { GameObjects, Types } from "phaser"
import { Game, Scene, WEBGL } from "phaser"
import "./style.css"

const canvas = document.getElementById(`game`) as HTMLCanvasElement

class GameScene extends Scene {
	private welcomeMessage: GameObjects.Text | undefined

	public constructor() {
		super(`scene-game`)
	}

	public create() {
		this.welcomeMessage = this.add.text(
			window.innerWidth / 2,
			window.innerHeight / 2,
			`Welcome to Phaser x Vite!`,
			{
				color: `#FFF`,
				fontFamily: `monospace`,
				fontSize: `26px`,
			},
		)

		this.welcomeMessage.setOrigin(0.5, 0.5)
	}

	public update(_: number, delta: number) {
		if (!this.welcomeMessage) {
			return
		}

		this.welcomeMessage.rotation += 0.0005 * delta
	}
}

const config: Types.Core.GameConfig = {
	type: WEBGL,
	width: window.innerWidth,
	height: window.innerHeight,
	canvas,
	physics: {
		default: `arcade`,
		arcade: {
			gravity: { y: 0 },
			debug: true,
		},
	},
	scene: [GameScene],
}

new Game(config)
