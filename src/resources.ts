interface ResourceCashe {
    [url: string]: HTMLImageElement | undefined;
}

export class Resources {
    resourceCache: ResourceCashe = {};

    loading = [];
    readyCallbacks: (() => void)[] = [];

    load = (urlOrArr: string | string[]) => {
        if (urlOrArr instanceof Array) {
            urlOrArr.forEach((url) => {
                this._load(url);
            });
        }
        else {
            this._load(urlOrArr);
        }
    }

    private onLoadImage = (url: string, img: HTMLImageElement) => {
        this.resourceCache[url] = img;
        if (this.isReady()) {
            this.readyCallbacks.forEach((callback) => { callback(); });
        }
    };
    private _load = (url: string) => {
        if (this.resourceCache[url]) {
            return this.resourceCache[url];
        } else {
            const img = new Image();
            img.onload = () => this.onLoadImage(url, img);
            this.resourceCache[url] = undefined;
            img.src = url;
        }
    }

    get = (url: string) => {
        return this.resourceCache[url];
    }

    isReady = (): boolean => {
        let ready = true;
        Object.keys(this.resourceCache).forEach(key => {
            if (this.resourceCache.hasOwnProperty(key) && !this.resourceCache[key]) {
                ready = false;
            }
        })
            
        return ready;
    }

    onReady = (func: () => void) => {
        this.readyCallbacks.push(func);
    }
}
