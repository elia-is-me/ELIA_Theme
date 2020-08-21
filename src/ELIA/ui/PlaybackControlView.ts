// ---------------------
// Playback control bar;
// ---------------------

import { Icon, Repaint, Slider, Textlink, AlbumArtView, Component, SliderThumbImage } from "../common/components";
import { Material, MaterialFont } from "../common/iconCode"
import { scale, imageFromCode, PlaybackOrder, SmoothingMode, blendColors, MeasureString, StringFormat } from "../common/common";
import { IThemeColors, bottomColors } from "./Theme";

function pos2vol(pos: number) {
	return (50 * Math.log(0.99 * pos + 0.01)) / Math.LN10;
}

function vol2pos(v: number) {
	return (Math.pow(10, v / 50) - 0.01) / 0.99;
}

function formatPlaybackTime(sec: number) {
	if (!isFinite(sec)) return '--:--';
	var seconds = sec % 60 >> 0;
	var minutes = (sec / 60) >> 0;
	var pad = function (num: number) {
		if (num < 10) return '0' + num;
		else return '' + num;
	};
	return pad(minutes) + ":" + pad(seconds);
}

type ButtonKeys = "playOrPause" | "next" | "prev" | "love" | "repeat" | "shuffle" | "volume";
type ImageKeys = "pause" | "play" | "next" | "prev" | "heart" | "heart_empty"
	| "repeat_off" | "repeat_on" | "repeat1_on" | "shuffle_off" | "shuffle_on"
	| "volume" | "volume_mute";
type TPlaybackButtons = { [K in ButtonKeys]: Icon };

const createBottomButtons = (themeColors?: IThemeColors) => {
	const colors = bottomColors;
	let iconName = MaterialFont;
	let iconFont = gdi.Font(iconName, scale(22));
	let iconFont2 = gdi.Font(iconName, scale(18));
	let bw_1 = scale(32);
	let bw_2 = scale(32);
	let images: { [K in ImageKeys]: IGdiBitmap } = {
		pause: imageFromCode(Material.pause, iconFont, colors.text, bw_1, bw_1),
		play: imageFromCode(Material.play_arrow, iconFont, colors.text, bw_1, bw_1),
		next: imageFromCode(Material.skip_next, iconFont, colors.text, bw_1, bw_1),
		prev: imageFromCode(Material.skip_prev, iconFont, colors.text, bw_1, bw_1),
		heart: imageFromCode(Material.heart, iconFont2, colors.heart, bw_2, bw_2),
		heart_empty: imageFromCode(Material.heart_empty, iconFont2, colors.text, bw_2, bw_2),
		repeat_off: imageFromCode(Material.repeat, iconFont2, colors.text, bw_2, bw_2),
		repeat_on: imageFromCode(Material.repeat, iconFont2, colors.highlight, bw_2, bw_2),
		repeat1_on: imageFromCode(Material.repeat1, iconFont2, colors.highlight, bw_2, bw_2),
		shuffle_off: imageFromCode(Material.shuffle, iconFont2, colors.text, bw_2, bw_2),
		shuffle_on: imageFromCode(Material.shuffle, iconFont2, colors.highlight, bw_2, bw_2),
		volume: imageFromCode(Material.volume, iconFont2, colors.text, bw_2, bw_2),
		volume_mute: imageFromCode(Material.volume_mute, iconFont2, colors.text, bw_2, bw_2),
	}
	let buttons: TPlaybackButtons = {
		playOrPause: null,
		next: null,
		prev: null,
		love: null,
		repeat: null,
		shuffle: null,
		volume: null
	}

	//
	const CMD_LOVE = 'Playback Statistics/Rating/5';
	const CMD_UNLOVE = 'Playback Statistics/Rating/<not set>';
	const TF_RATING = fb.TitleFormat('%rating%');

	buttons.playOrPause = new Icon({
		image: images.pause,
		on_click: function () {
			fb.PlayOrPause();
			this.on_init();
			Repaint();
		},
		on_init: function () {
			this.setImage(fb.IsPlaying && !fb.IsPaused ? images.pause : images.play);
		},
		on_playback_new_track: function () {
			this.on_init();
			Repaint();
		},
		on_playback_stop: function (reason: number) {
			this.on_init();
			Repaint();
		},
		on_playback_pause: function () {
			this.on_init();
			Repaint();
		}
	});
	buttons.next = new Icon({
		image: images.next,

		on_click: function () {
			fb.Next();
		}
	});

	buttons.prev = new Icon({
		image: images.prev,
		on_click: function () {
			fb.Prev();
		}
	});

	buttons.love = new Icon({
		image: images.heart_empty,
		on_init: function () {
			var metadb = fb.GetNowPlaying();
			if (!metadb || !fb.IsMetadbInMediaLibrary(metadb)) {
				this.setImage(images.heart_empty);
			} else {
				this.setImage(+TF_RATING.EvalWithMetadb(metadb) == 5 ? images.heart : images.heart_empty);
			}
		},
		on_click: function () {
			var metadb = fb.GetNowPlaying();
			if (metadb && fb.IsMetadbInMediaLibrary(metadb)) {
				var loved_ = +TF_RATING.EvalWithMetadb(metadb) == 5;
				fb.RunContextCommandWithMetadb(loved_ ? CMD_UNLOVE : CMD_LOVE, metadb, 8);
			}
			this.on_init();
			Repaint();
		},
		on_playback_new_track: function () {
			this.on_init();
			Repaint();
		},
		on_playback_stop: function (reason: number) {
			if (reason !== 2) {
				this.on_init();
				Repaint();
			}
		},
		on_playback_edited() {
			this.on_init();
			Repaint();
		}
	});

	buttons.repeat = new Icon({
		image: images.repeat_off,
		on_init() {
			switch (plman.PlaybackOrder) {
				case PlaybackOrder.repeat_playlist:
					this.setImage(images.repeat_on);
					break;
				case PlaybackOrder.repeat_track:
					this.setImage(images.repeat1_on);
					break;
				default: // repeat off
					this.setImage(images.repeat_off);
					break;
			}
		},
		on_click() {
			if (plman.PlaybackOrder < 2) {
				plman.PlaybackOrder += 1;
			} else if (plman.PlaybackOrder === 2) {
				plman.PlaybackOrder = 0;
			} else {
				plman.PlaybackOrder = 1;
			}

			this.on_init();
			Repaint();
		},
		on_playback_order_changed() {
			this.on_init();
			Repaint();
		}
	})

	buttons.shuffle = new Icon({
		image: images.shuffle_off,
		on_init() {
			if (plman.PlaybackOrder === 4) {
				this.setImage(images.shuffle_on);
			} else {
				this.setImage(images.shuffle_off);
			}
		},
		on_click() {
			if (plman.PlaybackOrder === 4) {
				plman.PlaybackOrder = 0; // reset to default
			} else {
				plman.PlaybackOrder = 4;
			}
			this.on_init();
		},
		on_playback_order_changed() {
			this.on_init();
			Repaint();
		}
	});

	buttons.volume = new Icon({
		image: images.volume,
		on_init() {
			this.setImage(
				fb.Volume == -100 ? images.volume_mute : images.volume
			);
		},
		on_click() {
			fb.VolumeMute();
		},
		on_volume_change() {
			this.on_init();
			Repaint();
		}
	});

	return buttons;
}



function createThumbImg(colors: IThemeColors): SliderThumbImage {
	let tw = scale(14);
	let thumbImg = gdi.CreateImage(tw, tw);
	let g = thumbImg.GetGraphics();

	g.SetSmoothingMode(SmoothingMode.AntiAlias);
	g.FillEllipse(1, 1, tw - 3, tw - 3, colors.highlight);
	g.FillEllipse(scale(3), scale(3), tw - scale(6) - 1, tw - scale(6) - 1, colors.background);
	thumbImg.ReleaseGraphics(g);

	let downThumbImg = gdi.CreateImage(tw, tw);
	let g2 = downThumbImg.GetGraphics();

	g2.SetSmoothingMode(SmoothingMode.AntiAlias);
	g2.FillEllipse(0, 0, tw - 1, tw - 1, colors.highlight);
	downThumbImg.ReleaseGraphics(g2);

	return { normal: thumbImg, down: downThumbImg };
}

const thumbImages = createThumbImg(bottomColors);
const progressHeight = scale(3);
const slider_secondaryColor = blendColors(bottomColors.text, bottomColors.background, 0.7);
const seekbar = new Slider({
	progressHeight: progressHeight,
	thumbImage: thumbImages.normal,
	pressedThumbImage: thumbImages.down,
	progressColor: bottomColors.highlight,
	secondaryColor: slider_secondaryColor,
	accentColor: bottomColors.highlight,
	getProgress() {
		return fb.PlaybackTime / fb.PlaybackLength;
	},
	setProgress(val: number) {
		fb.PlaybackTime = fb.PlaybackLength * val;
	}
});

const volumebar = new Slider({
	progressHeight: progressHeight,
	thumbImage: thumbImages.normal,
	pressedThumbImage: thumbImages.down,
	progressColor: bottomColors.highlight,
	secondaryColor: slider_secondaryColor,
	accentColor: bottomColors.highlight,
	getProgress() {
		return vol2pos(fb.Volume);
	},
	setProgress(val: number) {
		fb.Volume = pos2vol(val);
	}
});

const TF_TRACK_TITLE = fb.TitleFormat("%title%");
// \u30fb: Middle dot char code.
const TF_ARTIST = fb.TitleFormat("$if2([%artist%],未知艺人)[\u30fb$year(%date%)]");
const artistFont = gdi.Font("Microsoft YaHei", scale(12));

const artistText = new Textlink({
	text: "ARTIST",
	font: artistFont,
	textColor: blendColors(bottomColors.text, bottomColors.background, 0.2),
	textHoverColor: blendColors(bottomColors.text, bottomColors.background, 0.2),
	maxWidth: MeasureString("一二 三四、五六 七八" + "\u30fb0000", artistFont).Width,

	on_init() {
		let metadb = fb.GetNowPlaying();
		this.setText(
			metadb ? TF_ARTIST.EvalWithMetadb(metadb) : "ARTIST"
		);
	},

	on_click() {
		// Show artist page: artistName;
		// NotifyOtherPanels(Messages.showArtistPage, "");
	},

	on_playback_new_track() {
		this.on_init();
		Repaint();
	},

	on_playback_stop(reason: number) {
		if (reason != 2) {
			this.on_init();
			Repaint();
		}
	},

	on_playback_edited() {
		this.on_init();
		Repaint();
	}
});

const albumArt = new AlbumArtView({
	on_init() {
		this.getArtwork(fb.GetNowPlaying());
	},

	on_playback_new_track() {
		this.on_init();
		Repaint();
	},

	on_playback_stop(reason: number) {
		if (reason != 2) {
			this.on_init();
			Repaint();
		}
	},

	on_playback_edited() {
		this.on_init();
		Repaint();
	}
});

export class PlaybackControlView extends Component {
	private timerId: number = -1;
	playbackTime: string = "";
	playbackLength: string = "";
	trackTitle: string = "";
	titleFont = gdi.Font("Segoe UI Semibold", scale(13));
	timeFont = gdi.Font("Segoe UI", scale(12));
	timeWidth = 1;
	volumeWidth = scale(80);
	artworkWidth = scale(55);
	colors: IThemeColors;

	// children;
	volume: Slider;
	seekbar: Slider;
	artwork: AlbumArtView;
	artist: Textlink;
	buttons: TPlaybackButtons;

	constructor(attrs: {
		colors: IThemeColors;
		z?: number;
	}) {
		super(attrs);
		this.colors = attrs.colors;
		this.setChildPanels();
	}

	on_init() {
		let panelRefreshInterval = 1000; // ms;
		let onPlaybackTimer_ = () => {
			if (fb.IsPlaying && !fb.IsPaused && fb.PlaybackLength > 0) {
				this.playbackTime = formatPlaybackTime(fb.PlaybackTime);
				this.playbackLength = formatPlaybackTime(fb.PlaybackLength);
				Repaint();
			} else { }
			window.ClearTimeout(this.timerId);
			this.timerId = window.SetTimeout(onPlaybackTimer_, panelRefreshInterval);
		}

		onPlaybackTimer_();

		let npMetadb = fb.GetNowPlaying();
		this.trackTitle = (
			npMetadb == null ? "NOT PLAYING" : TF_TRACK_TITLE.EvalWithMetadb(npMetadb)
		);
		if (fb.IsPlaying) {
			this.playbackTime = formatPlaybackTime(fb.PlaybackTime);
			this.playbackLength = formatPlaybackTime(fb.PlaybackLength);
		}
		this.timeWidth = MeasureString("+00:00+", this.timeFont).Width;
	}

	setChildPanels() {
		this.buttons = createBottomButtons();
		this.seekbar = seekbar;
		this.volume = volumebar;
		this.artist = artistText;
		this.artwork = albumArt;

		this.addChild(this.seekbar);
		this.addChild(this.volume);
		this.addChild(this.artist);
		this.addChild(this.artwork);
		Object.values(this.buttons).forEach(btn => this.addChild(btn));
	}

	on_size() {
		let { seekbar, volume, buttons, artwork, artist } = this;
		// let buttons = pb_btns2;
		let UI_x = this.x,
			UI_y = this.y,
			UI_w = this.width,
			UI_h = this.height;

		// play_pause button;
		let bw_1 = buttons.playOrPause.width;
		let by_1 = (UI_y + (scale(50) - bw_1) / 2) >> 0;
		let bx_1 = (UI_x + UI_w / 2 - bw_1 / 2) >> 0;
		let pad_1 = scale(12);
		buttons.playOrPause.setSize(bx_1, by_1);

		// prev
		let bx_2 = bx_1 - bw_1 - pad_1;
		buttons.prev.setSize(bx_2, by_1);

		// next;
		let bx_3 = bx_1 + bw_1 + pad_1;
		buttons.next.setSize(bx_3, by_1);

		// repeat
		let bw_2 = buttons.shuffle.width;
		let by_2 = (UI_y + (scale(50) - bw_2) / 2) >> 0;
		let bx_4 = bx_2 - bw_2 - scale(16);
		buttons.repeat.setSize(bx_4, by_2);

		//shuffle;
		let bx_5 = bx_3 + bw_1 + scale(16);
		buttons.shuffle.setSize(bx_5, by_2);

		// volume bar;
		let vol_h = scale(18)
		let vol_w = scale(80);
		let vol_y = UI_y + (UI_h - vol_h) / 2;
		let vol_x = UI_x + UI_w - vol_w - scale(24);
		volume.setSize(vol_x, vol_y, vol_w, vol_h);

		// volume mute button;
		let bx_6 = vol_x - bw_2 - scale(4);
		let by_6 = (UI_y + (UI_h - bw_2) / 2) >> 0;
		buttons.volume.setSize(bx_6, by_6);

		// love;
		buttons.love.setSize(bx_6 - bw_2, by_6);

		// seekbar;
		let seek_max_w = scale(640);
		let seek_min_w = scale(240);
		let ui_min_w = scale(780);
		let seek_w = UI_w * (seek_min_w / ui_min_w);
		if (seek_w < seek_min_w) seek_w = seek_min_w;
		else if (seek_w > seek_max_w) seek_w = seek_max_w;
		let seek_x = UI_x + (UI_w - seek_w) / 2;
		let seek_y = by_1 + bw_1 + scale(8);
		seekbar.setSize(seek_x, seek_y, seek_w, scale(16));

		// art;
		let art_w = scale(48);
		let art_pad = (UI_h - art_w) / 2;
		artwork.setSize(UI_x + art_pad, UI_y + art_pad, art_w, art_w);

		// artist text;
		let artist_x = UI_x + art_pad + art_w + scale(8);
		let artist_y = this.y + (this.height / 2);
		let artist_w = seek_x - bw_2 - scale(8) - artist_x;
		artist.setSize(artist_x, artist_y, artist_w, scale(20));
	}

	on_paint(gr: IGdiGraphics) {
		let { colors, buttons } = this;

		// bg
		gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

		// playback time;
		let pb_time_x = seekbar.x - this.timeWidth - scale(4);
		let pb_time_y = seekbar.y;
		gr.DrawString(this.playbackTime, this.timeFont, colors.text, pb_time_x, pb_time_y, this.timeWidth, seekbar.height, StringFormat.Center);

		// playback length;
		let pb_len_x = seekbar.x + seekbar.width + scale(4);
		gr.DrawString(this.playbackLength, this.timeFont, colors.text, pb_len_x, pb_time_y, this.timeWidth, seekbar.height, StringFormat.Center);

		// track title;
		let title_x = albumArt.x + albumArt.width + scale(8);
		let title_max_w = pb_time_x - buttons.love.width - scale(8) - title_x;
		let title_y = this.y + this.height / 2 - scale(22) - scale(2);
		gr.DrawString(this.trackTitle, this.titleFont, colors.text, title_x, title_y, title_max_w, scale(22), StringFormat.LeftCenter);

	}

	on_playback_new_track() {
		this.playbackTime = "00:00";
		this.playbackLength = "--:--"
		this.trackTitle = TF_TRACK_TITLE.EvalWithMetadb(fb.GetNowPlaying());
		Repaint();
	}

	on_playback_stop(reason: number) {
		if (reason != 2) {
			this.playbackTime = "00:00";
			this.playbackLength = "--:--"
			this.trackTitle = "NOT PLAYING";
			Repaint();
		}
	}

}

