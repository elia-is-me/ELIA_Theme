/// <reference path="../../typings/foo_spider_monkey_panel.d.ts" />

import {
	CropImage,
	TextRenderingHint,
	createImage,
	SmoothingMode,
	debounce,
	BuildFullPath,
	fso,
	InterpolationMode,
	ThrottledRepaint,
	getOrDefault,
	debugTrace,
} from "./Common";
import { Component } from "./BasePart";
import { StringFormat } from "./String";
import { themeColors } from "./Theme";

export const sanitize = (str: string) => str.replace(/[/\\|:]/g, "_")
	.replace(/\*/g, "_")
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
let coverLoad: number = null;
let coverDone: number = null;
let saveImageSize = window.GetProperty("Global.Save to disk image size", 600);
let tf_comment = fb.TitleFormat("%comment%")
const is163 = (str: string) => str.indexOf("163 key(Don't modify)") > -1;

export class ImageCache {
	private cacheFolder = fb.ProfilePath + "IMG_Cache\\";
	// image size of the image saved in cache item
	private imgSize: number = 0;
	private imgFolder = "";
	private cacheMap: Map<string | number, CacheObj> = new Map();
	private enableDiskCache = false;
	private tf_album = fb.TitleFormat("[%album artist% - ]%album%");
	private tf_key: IFbTitleFormat;
	private cacheType: number = AlbumArtId.Front;
	private stubImg: IGdiBitmap;
	private loadingImg: IGdiBitmap;
	//
	constructor(options?: {
		imageSize?: number;
		enableDiskCache?: boolean;
		cacheType?: number;
	}) {
		this.imgSize = getOrDefault(options, o => o.imageSize, 250);
		if (!Number.isInteger(this.imgSize)) {
			this.imgSize = 250;
			console.log(
				"EliaTheme Warning: Invalid cache image size: ",
				this.imgSize,
				"\nSet cache image size to 250px"
			);
		}
		this.enableDiskCache = getOrDefault(options, o => o.enableDiskCache, false);
		if (this.enableDiskCache) {
			this.imgFolder = this.cacheFolder + saveImageSize + "\\"
			BuildFullPath(this.imgFolder);
		}
		this.cacheType = getOrDefault(options, o => o.cacheType, AlbumArtId.Front);
		this.getStubImg();
		switch (this.cacheType) {
			case AlbumArtId.Front:
				this.tf_key = this.tf_album;
				break;
		}
	}

	private getStubImg() {
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

	hit(metadb: IFbMetadb, art_id: number, options: { force?: boolean; delay?: number; stop?: boolean } = {}) {
		if (!metadb) {
			return this.stubImg;
		}
		let force = (options.force || false);
		let delay = (options.delay || 5);
		let stop = (options.stop || false);
		let cacheKey = sanitize(this.tf_key.EvalWithMetadb(metadb))
			.replace(
				/CD(\s*\d|\.0\d)|CD\s*(One|Two|Three)|Disc\s*\d|Disc\s*(III|II|I|One|Two|Three)\b/gi,
				""
			)
			.replace(/\(\s*\)|\[\s*\]/g, " ")
			.replace(/\s\s+/g, " ")
			.replace(/-\s*$/g, " ")
			.trim();
		let cacheObj = this.cacheMap.get(cacheKey);
		if (!cacheKey) {
			// cacheKey = "?"
			return this.stubImg;
		};
		if (cacheObj && cacheObj.image) {
			return cacheObj.image
		};
		if (cacheObj == null) {
			cacheObj = {
				tid: -1,
				image: null,
				load_request: 0
			};
			this.cacheMap.set(cacheKey, cacheObj);
		};
		// firstly try to load image from cache folder if diskCacheEnabled.
		if (this.enableDiskCache && cacheObj.load_request == 0) {
			(!coverLoad) && (coverLoad = window.SetTimeout(() => {
				cacheObj.tid = gdi.LoadImageAsync(window.ID, this.imgFolder + cacheKey);
				cacheObj.load_request = 1;
				coverLoad && window.ClearTimeout(coverLoad);
				coverLoad = null;
			}, delay));
		}
		// diskCache disabled or failed to get image from cacheFolder.
		if (!this.enableDiskCache || cacheObj.load_request === 2) {
			(!coverLoad) && (coverLoad = window.SetTimeout(() => {
				utils.GetAlbumArtAsync(window.ID, metadb, AlbumArtId.Front, false);
				cacheObj.load_request = 3;
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
		return CropImage(img, this.imgSize, this.imgSize, InterpolationMode.HighQuality);
	}

	loadImageDone(tid: number, image: IGdiBitmap | null, imgPath: string) {
		if (Number.isNaN(this.imgSize) || this.imgSize < 1) {
			console.log("ImageCache, Invalid Value: imgSize ", this.imgSize);
			return;
		}
		let cacheObj: CacheObj;
		if (image) {
		}
		for (let [key, obj] of this.cacheMap) {
			if (obj.tid === tid) {
				cacheObj = obj;
				cacheObj.tid = -1; // reset;
				if (image) {
					cacheObj.image = this.formatImage(image);
				}
				if (cacheObj.load_request >= 2) {
				}
				cacheObj.load_request = 2;
				cacheObj.image_path = imgPath;
				break;
			}
		}
		// TODO: repaint when visible;
		ThrottledRepaint();
	}

	getAlbumArtDone(metadb: IFbMetadb, art_id: number, image: IGdiBitmap | null, image_path: string) {
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
			let cacheKey = sanitize(this.tf_key.EvalWithMetadb(metadb))
				.replace(
					/CD(\s*\d|\.0\d)|CD\s*(One|Two|Three)|Disc\s*\d|Disc\s*(III|II|I|One|Two|Three)\b/gi,
					""
				)
				.replace(/\(\s*\)|\[\s*\]/g, " ")
				.replace(/\s\s+/g, " ")
				.replace(/-\s*$/g, " ")
				.trim();
			let cacheObj: CacheObj = this.cacheMap.get(cacheKey);
			if (cacheObj == null || cacheObj.load_request === 4) {
				return;
			}
			// set cache obj.
			cacheObj.load_request = 4;
			cacheObj.art_id = art_id;
			cacheObj.image = (image ? this.formatImage(image) : this.stubImg);
			cacheObj.image_path = image_path;
			ThrottledRepaint();
			// save image to cache_folder if need.
			window.SetTimeout(() => {
				if (fso.FileExists(this.imgFolder + cacheKey)) {
					// if cacheObj.reset_cache. TODO
				} else {
					// no need to save small images to cache folder.
					if (image && (image.Width > 1000 && image.Height > 1000)) {
						let img = CropImage(image, 600, 600, InterpolationMode.HighQuality);
						let success = img.SaveAs(this.imgFolder + cacheKey);
						if (!success) {
							console.log("WARN: Fail to save image: ", this.imgFolder + cacheKey);
						}
					}
				}
			}, 5);
		}
	}

	static _stubImgs: IGdiBitmap[] = [];
	static get stubImgs() {
		if (ImageCache._stubImgs.length === 0) {
			this.createStubImgs();
		}
		return this._stubImgs;

	}
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
		this._stubImgs = stubImages;
	}
}

export class AlbumArtwork extends Component {
	readonly className = "AlbumArtwork";
	metadb: IFbMetadb;
	private imageCache: ImageCache;
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
		this.imageCache.loadImageDone(tid, image, imagePath);
		this.repaint();
	}

	on_get_album_art_done(metadb: IFbMetadb, artId: number, image: IGdiBitmap, image_path: string) {
		this.imageCache.getAlbumArtDone(metadb, artId, image, image_path);
		this.repaint();
	}

}

export class PlaylistArtwork extends Component {
	readonly className = "PlaylistArtwork";
	readonly stubImage: IGdiBitmap = ImageCache.stubImgs[2];
	image: IGdiBitmap;
	private cacheMap: Map<string | number, IGdiBitmap> = new Map();
	private tf_album = fb.TitleFormat("[%album artist% -]%album%");

	constructor() {
		super({});
	}

	async getArtwork() {
		// Check stub_image;
		let stub = this.cacheMap.get(-1);
		if (!stub) {
			stub = CropImage(this.stubImage, this.width, this.height);
			this.cacheMap.set(-1, stub);
		}

		let metadbs = plman.GetPlaylistItems(plman.ActivePlaylist);

		// No tracks in active playlist;
		if (!metadbs || metadbs.Count === 0) {
			this.image = stub;
			this.repaint();
			return;
		}

		// Image cached already;
		let img = this.cacheMap.get(plman.ActivePlaylist);
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
			let albumKey = this.tf_album.EvalWithMetadb(metadbs[i])
				.replace(
					/CD(\s*\d|\.0\d)|CD\s*(One|Two|Three)|Disc\s*\d|Disc\s*(III|II|I|One|Two|Three)\b/gi,
					""
				)
				.replace(/\(\s*\)|\[\s*\]/g, " ")
				.replace(/\s\s+/g, " ")
				.replace(/-\s*$/g, " ")
				.trim();
			if (albumKey) {
				if (!albums[albums.length - 1] || albumKey !== compare && albumKeys.indexOf(albumKey) === -1) {
					albums.push(metadbs[i]);
					albumKeys.push(albumKey)
					compare = albumKey;
				}
			}
		}

		let resultsArray: { image: IGdiBitmap; path: string }[] = [];
		let imgs: IGdiBitmap[] = [];

		for (
			let i = 0, len = albums.length;
			i < len && i < 10 && resultsArray.length < 4;
			i++
		) {
			let result = await utils.GetAlbumArtAsyncV2(
				window.ID,
				albums[i],
				AlbumArtId.Front
			);
			if (!result || !result.image) {
				if (is163(tf_comment.EvalWithMetadb(albums[i]))) {
					result = await utils.GetAlbumArtAsyncV2(
						window.ID,
						albums[i],
						AlbumArtId.Disc
					);
				}
			}
			if (result && result.image && resultsArray.findIndex(o => o.path === result.path) === -1) {
				resultsArray.push(result);
			}
		}

		if (resultsArray.length === 0) {
			this.image = stub;
			this.cacheMap.set(plman.ActivePlaylist, stub);
		} else if (resultsArray.length < 4) {
			this.image = this.processImage(resultsArray[0].image);
			this.cacheMap.set(plman.ActivePlaylist, this.image)
		} else {
			imgs = resultsArray.map(re => CropImage(re.image, 250, 250));
			let img = gdi.CreateImage(500, 500);
			let g = img.GetGraphics();
			g.DrawImage(imgs[0], 0, 0, 250, 250, 0, 0, 250, 250);
			g.DrawImage(imgs[1], 250, 0, 250, 250, 0, 0, 250, 250);
			g.DrawImage(imgs[2], 0, 250, 250, 250, 0, 0, 250, 250);
			g.DrawImage(imgs[3], 250, 250, 250, 250, 0, 0, 250, 250);
			img.ReleaseGraphics(g);
			this.image = img.Resize(this.width, this.height)
			this.cacheMap.set(plman.ActivePlaylist, this.image);
		}

		this.repaint();
	}

	processImage(image: IGdiBitmap) {
		return CropImage(image, this.width, this.height);
	}

	on_init() {
		this.cacheMap.clear();
		this.getArtwork();
	}

	on_playlists_changed() {
		this.cacheMap.clear();
		this.getArtwork();
	}

	on_playlist_switch() {
		this.getArtwork();
	}

	on_playlist_items_added = debounce(() => {
		this.cacheMap.clear();
		this.getArtwork();
	}, 1000);

	on_playlist_items_removed = debounce(() => {
		this.cacheMap.clear();
		this.getArtwork();
	}, 1000);

	on_paint(gr: IGdiGraphics) {
		let img = this.image || this.stubImage;
		if (!img) return;
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		this.cacheMap.clear();
		try {
			// this.getArtwork();
		} catch (e) {
		}
	}, 200);
}
