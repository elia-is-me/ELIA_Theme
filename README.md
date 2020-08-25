# ELIA's Scripts

## For

* [foobar2000 audio player](https://www.foobar2000.org/)
* [foo_uie_spider_monkey_panel.dll](https://theqwertiest.github.io/foo_spider_monkey_panel/)

##  Compile

- Install nodejs (v6.13.4)
- cd `ts_elia` folder and install typescript, gulp, etc:
``` bash
npm install --save-dev typescript gulp-cli gulp@4.0.0 gulp-typescript
npm install --save-dev browserify vinyl-source-stream tsify
```
- `npx gulp`

Output files will be at `./out` folder

## Use

- Make sure foobar2000, foo_uie_spider_monkey_panel.dll have been installed. For better experience, install foo_playcount.dll also;
- Create a scratchbox and place spider_monkey_panel in it;
- Click on panel and then import 'elia-theme-main.js' in `./out` folder;
- Apply scratchbox to your foobar2000

## Take Care

I can't make it sure that this script would be stable and never crashed, so you don't know how to handle it or how to reset your fb2k's ui you'd better be much more careful.

## Thanks

- theophile, ttsping, marc2k3 for their various versions of wsh_panel_mod/plus/jscript_panel component, TheQwertiest for his/her foo_spider_monke_panel;
- Br3tt, kerperlia, etc for their scripts for panels;
- Anybody else whom I take code lines from;
- My friends who gave me help & encourage.