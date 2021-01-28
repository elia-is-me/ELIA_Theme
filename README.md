# ELIA's Foobar2K Theme Script

## For

* [foobar2000 audio player](https://www.foobar2000.org/)
* [foo_spider_monkey_panel.dll](https://theqwertiest.github.io/foo_spider_monkey_panel/)

##  Compile

- Install `nodejs (v6.13.4+)`
- cd source folder and install `typescript`, `gulp`, etc:
``` bash
npm install 
```
- `npx gulp`

Output files will be at `./out` folder.

## Use

> NOTE: This theme is in dev status, and may not run normally.

- Make sure foobar2000, `foo_spider_monkey_panel.dll` have been installed; For better experience, install `foo_playcount.dll`, `foo_ui_hacks.dll` too;
- Create a scratchbox and place a foo_spider_monkey_panel in it;
- Click on panel and then import `elia-theme-main.js` in `./out` folder;
- Apply scratchbox to your foobar2000.

### Hide 'menubar' and 'statusbar'
Make sure `foo_ui_hacks.dll` is installed and then hold **SHIFT** and click 'View' menu, check 'Hide menu bar' and 'Hide status bar'.

### Shuffle button
By default, click shuffle btn will toggle on/off fb's `shuffle (tracks)` mode. However if you prefer `Random` or `shuffle (albums)` or `shuffle (folders)`, change playback order through menu command `Playback/Order/shuffle (*) (or Random)`, then shuffle btn will toggle between your selected shuffle mode and `Default` order.


## Care

I can't make it sure that this script could be stable and would never crashed, so if you don't know how to handle it or how to reset your fb2k's ui you'd better be much more careful.

If your foobar's ui crashed and don't know how to recover:
- Close foobar2000;
- Explore your foobar's profile path and delete `theme.fth`;
- Restart foobar and its layout will be reset.

## Thanks

- theophile, ttsping, marc2k3 for their various versions of wsh_panel_mod/plus/jscript_panel component, TheQwertiest for his/her foo_spider_monke_panel;
- Br3tt, kerperlia, etc for their scripts for panels;
- Anybody else whom I take code lines from;
- My friends who gave me help & encourage.
