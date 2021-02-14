/// <reference path="../../typings/foo_spider_monkey_panel.d.ts" />

import {
	CropImage,
	TextRenderingHint,
	createImage,
	SmoothingMode,
	debounce,
	StopReason,
	BuildFullPath,
	fso,
	InterpolationMode,
	ThrottledRepaint,
	debugTrace,
	getOrDefault,
} from "./Common";
import { Component } from "./BasePart";
import { StringFormat } from "./String";
import { themeColors } from "./Theme";
import { textRenderingHint } from "./Button";

const sanitize = (str: string) => str.replace(/[/\\|:]/g, "-")
	.replace(/\*/g, "x")
	.replace(/"[<>]/g, "_")
	.replace(/\?/g, "")
	.replace(/^\./, "_")
	.replace(/\.+$/, "")
	.replace(/^\s+|[\n\s]+$/g, "")
	.replace(/\^\^/g, "-")

export interface CacheObj {
	art_id?: number;
	image_path?: string;
	image: IGdiBitmap | null;
	load_request: number;
	tid: number;
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

const tf_album = fb.TitleFormat("$directory(%path%)^^%album%");
const tf_crc = fb.TitleFormat("$crc32($directory(%path%)^^%album%)");
let coverLoad: number = null;
let coverDone: number = null;
let saveImageSize = window.GetProperty("Global.Save to disk image size", 600);

class ImageCache {
	private cacheFolder = fb.ProfilePath + "IMG_Cache\\";
	// image size of the image saved in cache item
	private imgSize: number = 0;
	private imgFolder = "";
	private cacheMap: Map<string | number, CacheObj> = new Map();
	private enableDiskCache = false;
	private tf_key: IFbTitleFormat;
	private cacheType: number = AlbumArtId.Front;
	private stubImg: IGdiBitmap;
	private loadingImg: IGdiBitmap;
	//
	constructor(options?: {
		tf_key?: IFbTitleFormat;
		imageSize?: number;
		enableDiskCache?: boolean;
		cacheType?: number;
	}) {
		if (options == null) { options = {} }
		this.imgSize = (options.imageSize || 250);
		if (!Number.isInteger(this.imgSize)) {
			this.imgSize = 250;
			console.log(
				"EliaTheme Warning: Invalid cache image size: ",
				this.imgSize,
				"\nSet cache image size to 250px"
			);
		}
		// options.enableDiskCache || (this.enableDiskCache = options.enableDiskCache);
		this.enableDiskCache = getOrDefault(options, o => o.enableDiskCache, false);
		if (this.enableDiskCache) {
			this.imgFolder = this.cacheFolder + saveImageSize + "\\"
			BuildFullPath(this.imgFolder);
		}
		this.cacheType = (options.cacheType || AlbumArtId.Front);
		this.getStubImg();
		this.tf_key =
			options.tf_key || fb.TitleFormat("%album artist%^^%album%^^%date%");
	}

	getStubImg() {
		if (ImageCache.stubImgs.length === 0) {
			ImageCache.createStubImgs();
		}
		let stubImg: IGdiBitmap;
		switch (this.cacheType) {
			case AlbumArtId.Front:
				stubImg = ImageCache.stubImgs[0]; // no cover;
				break;
			case AlbumArtId.Artist:
				stubImg = ImageCache.stubImgs[1]; // no photo;
				break;
			default:
				stubImg = ImageCache.stubImgs[2];// no art;
				break;
		}
		this.stubImg = stubImg.Resize(this.imgSize, this.imgSize);
		this.loadingImg = ImageCache.stubImgs[3].Resize(this.imgSize, this.imgSize);
	}

	clear() {
		this.cacheMap.clear();
	}

	delete_(key: string) {
		if (this.cacheMap.get(key) != null) {
			this.cacheMap.delete(key);
		}
	}

	hit(metadb: IFbMetadb, art_id: number, options: { force?: boolean; delay?: number; stop?: boolean } = {}) {
		if (!metadb) {
			return this.stubImg;
		}
		let force = (options.force || false);
		let delay = (options.delay || 5);
		let stop = (options.stop || false);
		let cacheKey = sanitize(this.tf_key.EvalWithMetadb(metadb));
		let cacheObj = this.cacheMap.get(cacheKey);
		if (cacheObj && cacheObj.image) return cacheObj.image;
		if (cacheObj == null) {
			cacheObj = {
				tid: -1,
				image: null,
				load_request: 0
			};
			this.cacheMap.set(cacheKey, cacheObj);
		};
		// firstly try to load image from cache folder if diskCacheEnabled.
		if (this.enableDiskCache && cacheObj.load_request === 0) {
			(!coverLoad) && (coverLoad = window.SetTimeout(() => {
				cacheObj.tid = gdi.LoadImageAsync(window.ID, cacheKey);
				coverLoad && window.ClearTimeout(coverLoad);
				coverLoad = null;
			}, delay));
		}
		// diskCache disabled or failed to get image from cacheFolder.
		if (!this.enableDiskCache || cacheObj.load_request === 1) {
			(!coverLoad) && (coverLoad = window.SetTimeout(() => {
				utils.GetAlbumArtAsync(window.ID, metadb, AlbumArtId.Front, false);
				coverLoad && window.ClearTimeout(coverLoad);
				coverLoad = null;
			}, delay));
		}
		return this.loadingImg;
	}

	changeImageSize(size_px: number) {
		if (size_px !== this.imgSize) {
			this.imgSize = size_px;
			this.getStubImg();
			this.clear();
		}
	}

	private formatImage(img: IGdiBitmap) {
		if (!img || Number.isNaN(this.imgSize) || this.imgSize < 1) return;
		return CropImage(img, this.imgSize, this.imgSize);
	}

	on_load_image_done(tid: number, image: IGdiBitmap | null, imgPath: string) {
		if (Number.isNaN(this.imgSize) || this.imgSize < 1) {
			console.log("ImageCache, Invalid Value: imgSize ", this.imgSize);
			return;
		}
		let cacheObj: CacheObj;
		for (let [key, obj] of this.cacheMap) {
			if (obj.tid === tid) {
				cacheObj = obj;
				cacheObj.tid = -1; // reset;
				cacheObj.image = (image ? this.formatImage(image) : null);
				if (cacheObj.load_request >= 1) {
					debugTrace("something wrong, cachObj.load_request == ", cacheObj.load_request)
				}
				cacheObj.load_request = 1;
				cacheObj.image_path = imgPath;
				break;
			}
		}
		// TODO: repaint when visible;
		ThrottledRepaint();
	}

	on_get_album_art_done(metadb: IFbMetadb, art_id: number, image: IGdiBitmap | null, image_path: string) {
		if (!metadb) {
			return;
		}
		if (!image && art_id === AlbumArtId.Front) {
			if (!coverLoad) {
				coverLoad = window.SetTimeout(() => {
					// 网易云下载的音乐会把封面存在 'Disc' 中;
					utils.GetAlbumArtAsync(window.ID, metadb, AlbumArtId.Disc, false);
					coverLoad && window.ClearTimeout(coverLoad);
					coverLoad = null;
				}, 5);
			}
		} else {
			//
			let cacheKey = sanitize(this.tf_key.EvalWithMetadb(metadb));
			let cacheObj: CacheObj = this.cacheMap.get(cacheKey);
			if (cacheObj == null) {
			}
			// set cache obj.
			cacheObj.load_request = 2;
			cacheObj.art_id = art_id;
			cacheObj.image = (image ? this.formatImage(image) : this.stubImg);
			cacheObj.image_path = image_path;
			ThrottledRepaint();
			// save image to cache_folder if need.
			window.SetTimeout(() => {
				if (fso.FileExists(this.cacheFolder + cacheKey)) {
					// if cacheObj.reset_cache. TODO
				} else {
					// no need to save small images to cache folder.
					if (image && (image.Width > 1000 && image.Height > 1000)) {
						let img = CropImage(image, 600, 600, InterpolationMode.HighQuality);
						let success = img.SaveAs(this.imgFolder + cacheKey);

					}
				}
			}, 5);
		}
	}

	static stubImgs: IGdiBitmap[] = [];
	static createStubImgs() {
		let stubImages: IGdiBitmap[] = [];
		let font1 = gdi.Font("Segoe UI", 230, 1);
		let font2 = gdi.Font("Segoe UI", 120, 1);
		let font3 = gdi.Font("Segoe UI", 100, 1);
		let foreColor = themeColors.titleText;
		for (let i = 0; i < 3; i++) {
			stubImages[i] = createImage(500, 500, true, g => {
				g.SetSmoothingMode(SmoothingMode.HighQuality);
				g.FillRoundRect(0, 0, 500, 500, 8, 8, foreColor & 0x0fffffff);
				g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
				g.DrawString("NO", font1, 0x25ffffff & foreColor, 0, 0, 500, 275, StringFormat.Center);
				g.DrawString(
					["COVER", "PHOTO", "ART"][i],
					font2,
					0x20ffffff & foreColor,
					2.5,
					175,
					500,
					275,
					StringFormat.Center
				);
				g.FillSolidRect(60, 400, 380, 20, 0x15fffffff & foreColor);
			});
		}
		stubImages.push(createImage(500, 500, true, g => {
			g.SetSmoothingMode(SmoothingMode.HighQuality);
			g.FillRoundRect(0, 0, 500, 500, 8, 8, foreColor & 0x0fffffff);
			g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
			g.DrawString("LOADING", font3, 0x25ffffff & foreColor, 0, 0, 500, 500, StringFormat.Center);
		}));
		this.stubImgs = stubImages;
	}
}
if (ImageCache.stubImgs.length === 0) {
	ImageCache.createStubImgs();
}

export class PlaylistArtwork extends Component {
	readonly className = "PlaylistArtwork";
	readonly stubImage: IGdiBitmap = ImageCache.stubImgs[2];
	image: IGdiBitmap;
	private _cache: Map<string | number, IGdiBitmap> = new Map();
	private _noCoverKey = "<no-cover>";

	constructor() {
		super({});
	}

	async getArtwork() {
		// Check stub_image;
		let stub = this._cache.get(-1);
		if (!stub) {
			stub = CropImage(this.stubImage, this.width, this.height);
			this._cache.set(-1, stub);
		}

		let metadbs = plman.GetPlaylistItems(plman.ActivePlaylist);

		// No tracks in active playlist;
		if (!metadbs || metadbs.Count === 0) {
			this.image = stub;
			this.repaint();
			return;
		}

		// Image cached already;
		let img = this._cache.get(plman.ActivePlaylist);
		if (img) {
			this.image = img;
			this.repaint();
			return;
		}

		// Create image if not in cache;
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
			this.image = stub;
			this._cache.set(plman.ActivePlaylist, stub);
		} else if (images.length < 4) {
			this.image = this.processImage(images[0]);
			this._cache.set(plman.ActivePlaylist, this.image)
		} else {
			images = images.map(img => CropImage(img, 250, 250));
			let img = gdi.CreateImage(500, 500);
			let g = img.GetGraphics();
			g.DrawImage(images[0], 0, 0, 250, 250, 0, 0, 250, 250);
			g.DrawImage(images[1], 250, 0, 250, 250, 0, 0, 250, 250);
			g.DrawImage(images[2], 0, 250, 250, 250, 0, 0, 250, 250);
			g.DrawImage(images[3], 250, 250, 250, 250, 0, 0, 250, 250);
			img.ReleaseGraphics(g);
			this.image = this.processImage(img);
			this._cache.set(plman.ActivePlaylist, this.image);
		}

		this.repaint();
	}

	processImage(image: IGdiBitmap) {
		return CropImage(image, this.width, this.height);
	}

	on_init() {
		this._cache.clear();
		this.getArtwork();
	}

	on_playlists_changed() {
		this._cache.clear();
		this.getArtwork();
	}

	on_playlist_switch() {
		this._cache.clear();
		this.getArtwork();
	}

	on_playlist_items_added = debounce(() => {
		this._cache.clear();
		this.getArtwork();
	}, 1000);

	on_playlist_items_removed = debounce(() => {
		this._cache.clear();
		this.getArtwork();
	}, 1000);

	on_paint(gr: IGdiGraphics) {
		let img = this.image || this.stubImage;
		if (!img) return;
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		this._cache.clear();
		try {
			// this.getArtwork();
		} catch (e) { 
			debugTrace("error accur on size getArtwork, 421")
		}
	}, 200);
}

export class NowplayingArtwork extends Component {
	readonly className = "NowplayingArtwork";
	readonly stubImage: IGdiBitmap = ImageCache.stubImgs[0];
	image: IGdiBitmap;
	_noCover: IGdiBitmap;
	trackKey: string = "0123456789";
	metadb: IFbMetadb;

	constructor() {
		super({});
	}

	async getArtwork(metadb?: IFbMetadb) {
		// check stub image;
		if (!this._noCover || this._noCover.Width !== this.width) {
			this._noCover = this.processImage(this.stubImage);
		}

		// get album art;
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
		if (!this.width || !this.height) {
			return;
		}
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
		let img = this.image || this._noCover;
		if (!img) return;
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		// this.image
		this.getArtwork(fb.GetNowPlaying());
	}, 200);
}


export class AlbumArtwork extends Component {
	readonly className = "AlbumArtwork";
	metadb: IFbMetadb;
	private imageCache: ImageCache;// = new ImageCache({ enableDiskCache: true });
	artId: number;

	constructor(options: { artworkType?: number; }) {
		super({})
		this.artId = getOrDefault(options, o => o.artworkType, AlbumArtId.Front);
		this.imageCache = new ImageCache({
			cacheType: this.artId,
			enableDiskCache: true, // todo: global property.
		});
	}

	getArtwork(metadb?: IFbMetadb | null) {
		this.metadb = metadb;
	}

	on_init() { }

	on_paint(gr: IGdiGraphics) {
		let img = this.imageCache.hit(this.metadb, this.artId, { delay: 30 });
		if (!img) {
			return;
		}
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		this.imageCache.changeImageSize(this.width);
	}, 200);

	on_load_image_done(tid: number, image: IGdiBitmap, imagePath: string) {
		this.imageCache.on_load_image_done(tid, image, imagePath);
		this.repaint();
	}

	on_get_album_art_done(metadb: IFbMetadb, artId: number, image: IGdiBitmap, image_path: string) {
		this.imageCache.on_get_album_art_done(metadb, artId, image, image_path);
		this.repaint();
	}

}
