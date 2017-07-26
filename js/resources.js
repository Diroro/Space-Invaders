function resources() {
    var resourceCache = {};
    var loading = [];
    var readyCallbacks = [];

    this.load = function (urlOrArr) {
        if (urlOrArr instanceof Array) {
            urlOrArr.forEach(function (url) {
                _load(url);
            });
        }
        else {
            _load(urlOrArr);
        }
    }

    function _load(url) {
        if (resourceCache[url]) {
            return resourceCache[url];
        }
        else {
            var img = new Image();
            img.onload = function () {
                resourceCache[url] = img;

                if (isReady()) {
                    readyCallbacks.forEach(function (func) { func(); });
                }
            };
            resourceCache[url] = false;
            img.src = url;
        }
    }

    this.get = function (url) {
        return resourceCache[url];
    }

    var isReady = function() {
        var ready = true;
        for (var item in resourceCache) {
            if (resourceCache.hasOwnProperty(item) && !resourceCache[item]) {
                ready = false;
            }
        }
        return ready;
    }

    this.onReady = function (func) {
        readyCallbacks.push(func);
    }

    // window.resources = {
    //     load: load,
    //     get: get,
    //     onReady: onReady,
    //     isReady: isReady
    // };
}

module.exports = resources;