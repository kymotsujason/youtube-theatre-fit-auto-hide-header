# YouTube Threatre Fit + Auto-hide Headers

[![Install](https://img.shields.io/badge/Install-Tampermonkey-00485B?style=for-the-badge&logo=tampermonkey)](https://github.com/kymotsujason/youtube-theatre-fit-auto-hide-header/raw/refs/heads/master/youtube-theatre-fit-auto-hide-header.user.js)

To use, either click the install button above or create a new script in TamperMonkey and copy in the contents of the script in this repo. This will ensure the YouTube video player takes up the entire viewport while moving the title to the in-player controls. There's also a rotate button and the subtitle, autoplay, default view, and fullscreen buttons are hidden. Quality is set to the best the video offers (including the premium bitrate when your account has it) on every video, so you never get stuck at 360p.

## Config

Edit the consts at the top of the script:

- `FORCE_THEATER` - set to `false` to leave the theatre/default toggle to YouTube.
- `AUTO_QUALITY` - set to `false` to leave quality to YouTube's auto.
- `MAX_QUALITY` - `null` picks the best available. Cap it with `'hd2160'`, `'hd1440'`, `'hd1080'`, or `'hd720'` if the top quality buffers on your connection.
- `DEBUG` - set to `true` to log what the script is doing to the console.