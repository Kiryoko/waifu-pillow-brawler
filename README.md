# Waifu Pillow Brawler

This is a test repo to see how good the newly released GPT-5.4 model from
OpenAI is.

Play online: https://waifu-pillow-brawler.pages.dev/

Open source: https://github.com/Kiryoko/waifu-pillow-brawler

I asked it to create a waifu pillow brawler game using Phaser. It also had to
generate the SVG assets and audio effects from scratch.

After one prompt and about 20 minutes of work, the game was already playable.
Then I gave it a couple of follow-up prompts to improve the commands and fix a
couple of bugs.

After that, I asked it to also record a gameplay video for X and for this
README as a preview. It used Playwright and `ffmpeg` on its own to record the
video.

<video src="./media/waifu-pillow-gameplay.mp4" controls muted playsinline width="960"></video>

If GitHub does not render the player, open the file directly:
[waifu-pillow-gameplay.mp4](./media/waifu-pillow-gameplay.mp4)

## Run it

```bash
pnpm install
pnpm dev
```

## Tech

- Phaser
- TypeScript
- pnpm
- SVG assets generated from scratch
- Audio effects generated from scratch

## Socials

- X: https://x.com/0xKiryoko
