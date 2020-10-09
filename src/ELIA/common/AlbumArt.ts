import { StringFormat, CropImage, TextRenderingHint, drawImage, SmoothingMode, RGB, RGBA, debounce, InterpolationMode, StopReason } from "./common";
import { Component } from "./BasePart";

export class ImageCache {
	private _cacheList: Map<string, { image?: IGdiBitmap; key: string }> = new Map();

	hit(key: string) {
		return this._cacheList.get(key);
	}

	save(key: string, image: IGdiBitmap, force = false) {
		if (!this._cacheList.get(key)?.image || force) {
			this._cacheList.set(key, {
				key: image ? key : "<NO IMAGE>",
				image: image
			});
		}
	}

	clear() {
		this._cacheList.clear();
	}

	reset(key: string) {
		this._cacheList.delete(key);
	}
}

export const enum AlbumArtId {
	Front = 0,
	Back = 1,
	Disc = 2,
	Icon = 3,
	Artist = 4,
}

export const enum ArtworkType {
	Nowplaying,
	Album,
	Artist,
	Playlist,
}

// Create stub images;
let stubImages: IGdiBitmap[] = [];
let font1 = gdi.Font("Segoe UI", 230, 1);
let font2 = gdi.Font("Segoe UI", 120, 1);
let font3 = gdi.Font("Segoe UI", 200, 1);
let font4 = gdi.Font("Segoe UI", 90, 1);

for (let i = 0; i < 3; i++) {
	stubImages[i] = drawImage(500, 500, true, g => {
		g.SetSmoothingMode(SmoothingMode.HighQuality);
		g.FillRoundRect(0, 0, 500, 500, 8, 8, 0x0fffffff);
		g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		g.DrawString("NO", font1, 0x25ffffff, 0, 0, 500, 275, StringFormat.Center);
		g.DrawString(
			["COVER", "PHOTO", "ART"][i],
			font2,
			0x20ffffff,
			2.5,
			175,
			500,
			275,
			StringFormat.Center
		);
		g.FillSolidRect(60, 400, 380, 20, 0x15fffffff);
	});
}

let maskImage = drawImage(500, 500, true, (g: IGdiGraphics) => {
	g.FillSolidRect(0, 0, 500, 500, RGB(255, 255, 255));
	g.SetSmoothingMode(SmoothingMode.HighQuality);
	g.FillEllipse(1, 1, 498, 498, RGBA(0, 0, 0, 255));
});

const tf_album = fb.TitleFormat("[%album artist%]^^%album%");

export class PlaylistArtwork extends Component {
	className = "PlaylistArtwork";
	stubImage: IGdiBitmap = stubImages[2];
	image: IGdiBitmap;
	imageCache = new ImageCache();

	constructor() {
		super({});
	}

	async getArtwork() {
		let metadbs = plman.GetPlaylistItems(plman.ActivePlaylist);

		if (!this.imageCache.hit("-1")?.image) {
			this.imageCache.save("-1", this.processImage(stubImages[0]));
		}

		if (!metadbs || metadbs.Count === 0) {
			this.image = this.imageCache.hit("-1").image;
			this.repaint();
			return;
		}

		let _image = this.imageCache.hit(plman.ActivePlaylist + "")?.image;
		if (_image) {
			this.image = _image;
			this.repaint();
			return
		}

		let albums: IFbMetadb[] = [];
		let albumKeys: string[] = [];
		let compare = "#@!";

		for (let i = 0, len = metadbs.Count; i < len && i < 200; i++) {
			if (!metadbs[i]) {
				break;
			}
			let albumKey = tf_album.EvalWithMetadb(metadbs[i]);
			if (!albums[albums.length - 1] || albumKey !== compare && albumKeys.indexOf(albumKey) === -1) {
				albums.push(metadbs[i]);
				albumKeys.push(albumKey)
				compare = albumKey;
			}
		}

		let images: IGdiBitmap[] = [];

		for (
			let i = 0, len = albums.length;
			i < len && i < 10 && images.length < 4;
			i++
		) {
			let result = await utils.GetAlbumArtAsyncV2(
				window.ID,
				albums[i],
				AlbumArtId.Front
			);
			if (!result || !result.image) {
				result = await utils.GetAlbumArtAsyncV2(
					window.ID,
					albums[i],
					AlbumArtId.Disc
				);
			}
			if (result && result.image) {
				images.push(result.image);
			}
		}

		if (images.length === 0) {
			this.image = null;
		} else if (images.length === 1) {
			this.image = this.processImage(images[0]);
		} else {
			images = images.map(img => CropImage(img, 250, 250));
			if (images.length < 4) {
				let stubimg = CropImage(stubImages[0], 250, 250);
				for (let i = images.length; i < 4; i++) {
					images.push(stubimg);
				}
			}
			let img = gdi.CreateImage(500, 500);
			let g = img.GetGraphics();
			g.DrawImage(images[0], 0, 0, 250, 250, 0, 0, 250, 250);
			g.DrawImage(images[1], 250, 0, 250, 250, 0, 0, 250, 250);
			g.DrawImage(images[2], 0, 250, 250, 250, 0, 0, 250, 250);
			g.DrawImage(images[3], 250, 250, 250, 250, 0, 0, 250, 250);
			img.ReleaseGraphics(g);
			this.image = this.processImage(img);
			this.imageCache.save("" + plman.ActivePlaylist, this.image);
		}

		this.repaint();
	}

	processImage(image: IGdiBitmap) {
		return CropImage(image, this.width, this.height);
	}

	on_init() {
		this.getArtwork();
	}

	on_playlists_changed() {
		this.getArtwork();
	}

	on_playlist_switch() {
		this.getArtwork();
	}

	on_paint(gr: IGdiGraphics) {
		let img = this.image || this.stubImage;
		if (!img) return;
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		this.imageCache.clear();
		this.getArtwork();
	}, 100);
}

export class NowplayingArtwork extends Component {
	image: IGdiBitmap;
	stubImage: IGdiBitmap = stubImages[0];
	trackKey: string = "##@!";
	className = "NowplayingArtwork";

	constructor() {
		super({});
	}

	async getArtwork(metadb?: IFbMetadb) {
		if (metadb) {
			let trackKey = tf_album.EvalWithMetadb(metadb);
			if (trackKey !== this.trackKey || !this.image) {
				let result = await utils.GetAlbumArtAsyncV2(
					window.ID,
					metadb,
					AlbumArtId.Front
				);
				if (!result || !result.image) {
					result = await utils.GetAlbumArtAsyncV2(
						window.ID,
						metadb,
						AlbumArtId.Disc
					);
				}
				if (result && result.image) {
					this.image = this.processImage(result.image);
				} else {
					this.image = null;
				}
				this.trackKey = trackKey;
			} //else {/** */}
		} else {
			this.trackKey = "3@!#@";
			this.image = null;
		}
		this.repaint();
	}

	processImage(image: IGdiBitmap) {
		return CropImage(image, this.width, this.height);
	}

	on_init() {
		this.getArtwork(fb.GetNowPlaying());
	}

	on_playback_new_track() {
		this.getArtwork(fb.GetNowPlaying());
	}

	on_playback_stop(reason: number) {
		if (reason !== StopReason.StartingAnotherTrack) {
			this.getArtwork();
		}
	}

	on_paint(gr: IGdiGraphics) {
		let img = this.image || this.stubImage;
		if (!img) return;

		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		this.stubImage = this.processImage(stubImages[0]);
		this.getArtwork(fb.GetNowPlaying());
	}, 100);
}
