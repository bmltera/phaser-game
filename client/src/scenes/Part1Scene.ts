import Phaser from "phaser";
import { Room, Client } from "colyseus.js";
import { BACKEND_URL } from "../backend";

export class Part1Scene extends Phaser.Scene {
    room: Room;
    playerEntities: { [sessionId: string]: Phaser.Types.Physics.Arcade.ImageWithDynamicBody } = {};
    debugFPS: Phaser.GameObjects.Text;
    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    inputPayload = {
        left: false,
        right: false,
        up: false,
        down: false,
    };
    targetPosition: Phaser.Math.Vector2 | null = null;

    constructor() {
        super({ key: "part1" });
    }

    async create() {
        this.cursorKeys = this.input.keyboard.createCursorKeys();
        this.debugFPS = this.add.text(4, 4, "", { color: "#ff0000", });

        // connect with the room
        await this.connect();

        this.room.state.players.onAdd((player, sessionId) => {
            const entity = this.physics.add.image(player.x, player.y, 'ship_0001');
            this.playerEntities[sessionId] = entity;

            // listening for server updates
            player.onChange(() => {
                entity.x = player.x;
                entity.y = player.y;
            });
        });

        this.room.state.players.onRemove((player, sessionId) => {
            const entity = this.playerEntities[sessionId];
            if (entity) {
                entity.destroy();
                delete this.playerEntities[sessionId]
            }
        });

        this.cameras.main.setBounds(0, 0, 800, 600);

        // Add mouse click listener
        this.input.on('pointerdown', (pointer) => {
            this.targetPosition = new Phaser.Math.Vector2(pointer.x, pointer.y);
        });
    }

    async connect() {
        const connectionStatusText = this.add
            .text(0, 0, "Trying to connect with the server...")
            .setStyle({ color: "#ff0000" })
            .setPadding(4);

        const client = new Client(BACKEND_URL);

        try {
            this.room = await client.joinOrCreate("part1_room", {});
            connectionStatusText.destroy();
        } catch (e) {
            connectionStatusText.text = "Could not connect with the server.";
        }
    }

    update(time: number, delta: number): void {
        if (!this.room) {
            return; 
        }

        // Handle keyboard input
        this.inputPayload.left = this.cursorKeys.left.isDown;
        this.inputPayload.right = this.cursorKeys.right.isDown;
        this.inputPayload.up = this.cursorKeys.up.isDown;
        this.inputPayload.down = this.cursorKeys.down.isDown;

        // Handle mouse click movement
        if (this.targetPosition) {
            const player = this.playerEntities[this.room.sessionId];
            if (player) {
                const distance = Phaser.Math.Distance.Between(player.x, player.y, this.targetPosition.x, this.targetPosition.y);
                const speed = 200; // pixels per second
                if (distance > 4) {
                    const angle = Phaser.Math.Angle.Between(player.x, player.y, this.targetPosition.x, this.targetPosition.y);
                    player.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                } else {
                    player.setVelocity(0, 0);
                    this.targetPosition = null; // Stop moving when close enough
                }
            }
        }

        this.room.send(0, this.inputPayload);
        this.debugFPS.text = `Frame rate: ${this.game.loop.actualFps}`;
    }
}